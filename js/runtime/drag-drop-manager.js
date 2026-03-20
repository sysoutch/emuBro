import { getShellStorageValue, removeShellStorageValue } from '../../desktop/src/utils/shell-storage-cache';
import { warnIfEmulatorFolderNotWritable } from '../game-manager/emulator-write-access';

export function setupDragDropManager(options = {}) {
    const emubro = options.emubro;
    if (!emubro) return;

    const getActiveTopSection = typeof options.getActiveTopSection === 'function'
        ? options.getActiveTopSection
        : () => 'library';
    const addFooterNotification = typeof options.addFooterNotification === 'function'
        ? options.addFooterNotification
        : () => {};
    const refreshEmulatorsState = typeof options.refreshEmulatorsState === 'function'
        ? options.refreshEmulatorsState
        : async () => {};
    const renderActiveLibraryView = typeof options.renderActiveLibraryView === 'function'
        ? options.renderActiveLibraryView
        : async () => {};
    const initializePlatformFilterOptions = typeof options.initializePlatformFilterOptions === 'function'
        ? options.initializePlatformFilterOptions
        : () => {};
    const updateLibraryCounters = typeof options.updateLibraryCounters === 'function'
        ? options.updateLibraryCounters
        : () => {};
    const setGames = typeof options.setGames === 'function'
        ? options.setGames
        : () => {};
    const setFilteredGames = typeof options.setFilteredGames === 'function'
        ? options.setFilteredGames
        : () => {};
    const escapeHtml = typeof options.escapeHtml === 'function'
        ? options.escapeHtml
        : (value) => String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

    const mainContent = options.mainContent || document.querySelector('.main-content') || document.querySelector('.shell') || document.body;
    if (!mainContent) return;

    let dragCounter = 0;
    const PENDING_DROP_KEY = 'emuBro.pendingDropPaths.v1';
    const dropDeduper = {
        key: '',
        at: 0
    };
    let pendingNativeDropTimer = null;

    const clearPendingNativeDropTimer = () => {
        if (!pendingNativeDropTimer) return;
        clearTimeout(pendingNativeDropTimer);
        pendingNativeDropTimer = null;
    };

    const schedulePendingNativeDropFallback = ({ fileCount = 0, itemCount = 0 } = {}) => {
        clearPendingNativeDropTimer();
        pendingNativeDropTimer = setTimeout(() => {
            pendingNativeDropTimer = null;
            addFooterNotification(
                fileCount > 0
                    ? `Drop failed: received ${fileCount} file(s) but the desktop shell did not provide readable file path(s).`
                    : `Drop failed: no file path or URL found in dropped content (${itemCount} drop item(s)).`,
                'warning'
            );
        }, 700);
    };

    const shouldSkipDuplicateDrop = (entries) => {
        const now = Date.now();
        const normalized = Array.isArray(entries)
            ? entries.map((row) => String(row || '').trim()).filter(Boolean)
            : [];
        const key = normalized.length
            ? normalized.map((row) => row.toLowerCase()).sort().join('|')
            : '';
        if (!key) return false;
        const recent = dropDeduper.key === key && (now - dropDeduper.at) < 600;
        dropDeduper.key = key;
        dropDeduper.at = now;
        return recent;
    };

    const isLibraryDropContext = () => {
        const section = String(getActiveTopSection() || '').trim().toLowerCase();
        return section === 'library' || section === 'library-views';
    };

    const resolveDroppedFilePath = (file) => {
        const directPath = String(file && file.path ? file.path : '').trim();
        if (directPath) return directPath;

        try {
            if (emubro && typeof emubro.getPathForFile === 'function') {
                const resolved = String(emubro.getPathForFile(file) || '').trim();
                if (resolved) return resolved;
            }
        } catch (_e) {}

        return '';
    };

    const collectDroppedPaths = (dataTransfer) => {
        const out = [];
        const seen = new Set();
        const add = (value) => {
            const p = String(value || '').trim();
            if (!p) return;
            const key = p.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            out.push(p);
        };

        const files = Array.from(dataTransfer?.files || []);
        files.forEach((file) => add(resolveDroppedFilePath(file)));

        if (out.length === 0) {
            const items = Array.from(dataTransfer?.items || []);
            items.forEach((item) => {
                if (!item || item.kind !== 'file') return;
                const file = typeof item.getAsFile === 'function' ? item.getAsFile() : null;
                if (!file) return;
                add(resolveDroppedFilePath(file));
            });
        }

        return out;
    };

    const normalizeDroppedTextEntry = (value) => {
        let raw = String(value || '').trim();
        if (!raw) return '';
        raw = raw.replace(/^\uFEFF/, '').trim();
        if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
            raw = raw.slice(1, -1).trim();
        }
        if (!raw) return '';

        if (/^file:\/\//i.test(raw)) {
            try {
                const parsed = new URL(raw);
                let fsPath = decodeURIComponent(parsed.pathname || '');
                if (/^\/[a-z]:/i.test(fsPath)) {
                    fsPath = fsPath.slice(1);
                }
                return fsPath;
            } catch (_error) {
                return raw.replace(/^file:\/\//i, '');
            }
        }

        return raw;
    };

    const collectDroppedTextEntries = (dataTransfer) => {
        const rows = [];
        const seen = new Set();
        const add = (value) => {
            const normalized = normalizeDroppedTextEntry(value);
            if (!normalized) return;
            const key = normalized.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            rows.push(normalized);
        };

        const consume = (text) => {
            String(text || '')
                .split(/\r?\n/g)
                .map((line) => line.trim())
                .filter(Boolean)
                .forEach((line) => add(line));
        };

        try {
            consume(dataTransfer?.getData?.('text/uri-list') || '');
        } catch (_error) {}
        try {
            consume(dataTransfer?.getData?.('text/plain') || '');
        } catch (_error) {}
        try {
            consume(dataTransfer?.getData?.('text') || '');
        } catch (_error) {}

        return rows;
    };

    const collectDroppedTextEntriesFromItems = async (dataTransfer) => {
        const rows = [];
        const seen = new Set();
        const add = (value) => {
            const normalized = normalizeDroppedTextEntry(value);
            if (!normalized) return;
            const key = normalized.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            rows.push(normalized);
        };
        const consume = (text) => {
            String(text || '')
                .split(/\r?\n/g)
                .map((line) => line.trim())
                .filter(Boolean)
                .forEach((line) => add(line));
        };

        const items = Array.from(dataTransfer?.items || []);
        if (!items.length) return rows;

        const readers = items
            .filter((item) => {
                if (!item || item.kind !== 'string') return false;
                const itemType = String(item.type || '').toLowerCase();
                return itemType.includes('uri-list') || itemType.includes('text/plain') || itemType === 'text';
            })
            .map((item) => new Promise((resolve) => {
                try {
                    item.getAsString((value) => {
                        consume(value);
                        resolve();
                    });
                } catch (_error) {
                    resolve();
                }
            }));

        if (readers.length > 0) {
            await Promise.all(readers);
        }
        return rows;
    };

    const isTextDrag = (e) => {
        const dt = e && e.dataTransfer;
        if (!dt) return false;
        try {
            const types = Array.from(dt.types || []).map((entry) => String(entry || '').toLowerCase());
            if (types.includes('text/plain') || types.includes('text/uri-list') || types.includes('text')) {
                return true;
            }
        } catch (_error) {}
        return false;
    };

    const isFileDrag = (e) => {
        const dt = e && e.dataTransfer;
        if (!dt) return false;

        // Most reliable across OS/file managers: DataTransfer.types contains "Files"
        try {
            const types = Array.from(dt.types || []);
            if (types.includes('Files')) return true;
        } catch (_e) {}

        // Some environments expose file items directly.
        try {
            const items = Array.from(dt.items || []);
            if (items.some(it => it && it.kind === 'file')) return true;
        } catch (_e) {}

        // Fallback: if files list exists, treat as file drag (length can be 0 during dragenter).
        if (dt.files) return true;

        return false;
    };

    const shouldHandleDropGesture = (e) => isFileDrag(e) || isTextDrag(e);

    // Prevent default browser navigation on drop (especially in packaged builds).
    document.addEventListener('dragover', (e) => {
        if (!shouldHandleDropGesture(e)) return;
        e.preventDefault();
    }, true);
    document.addEventListener('drop', (e) => {
        if (!shouldHandleDropGesture(e)) return;
        e.preventDefault();
    }, true);

    const onEnter = (e) => {
        if (!shouldHandleDropGesture(e)) return;
        if (!isLibraryDropContext()) {
            dragCounter = 0;
            mainContent.classList.remove('drag-over');
            return;
        }
        e.preventDefault();
        dragCounter++;
        mainContent.classList.add('drag-over');
    };

    const onLeave = (e) => {
        if (!shouldHandleDropGesture(e)) return;
        if (!isLibraryDropContext()) {
            dragCounter = 0;
            mainContent.classList.remove('drag-over');
            return;
        }
        e.preventDefault();
        dragCounter--;
        if (dragCounter <= 0) {
            dragCounter = 0;
            mainContent.classList.remove('drag-over');
        }
    };

    const onOver = (e) => {
        if (!shouldHandleDropGesture(e)) return;
        e.preventDefault();
    };

    const coerceTauriDropPaths = (payload) => {
        if (Array.isArray(payload)) return payload;
        if (payload && Array.isArray(payload.paths)) return payload.paths;
        if (typeof payload === 'string') return [payload];
        return [];
    };

    const extractTauriEventPayload = (eventOrPayload) => {
        if (!eventOrPayload) return eventOrPayload;
        if (Array.isArray(eventOrPayload)) return eventOrPayload;
        if (typeof eventOrPayload === 'object' && Object.prototype.hasOwnProperty.call(eventOrPayload, 'payload')) {
            return eventOrPayload.payload;
        }
        return eventOrPayload;
    };

    const getTauriEventListen = () => {
        const tauri = window.__TAURI__;
        const globalListen = tauri && tauri.event && typeof tauri.event.listen === 'function' ? tauri.event.listen : null;
        if (typeof globalListen === 'function') return globalListen;

        // Fallback for legacy bundles where `@tauri-apps/api/event` isn't available and
        // `app.withGlobalTauri` may be disabled.
        const internals = window.__TAURI_INTERNALS__;
        if (!internals || typeof internals.invoke !== 'function' || typeof internals.transformCallback !== 'function') {
            return null;
        }

        return (event, handler, options) => {
            const normalizedEvent = String(event || '').trim();
            if (!normalizedEvent) return Promise.resolve(() => {});
            const target = typeof options?.target === 'string'
                ? { kind: 'AnyLabel', label: options.target }
                : (options?.target ?? { kind: 'Any' });

            return internals.invoke('plugin:event|listen', {
                event: normalizedEvent,
                target,
                handler: internals.transformCallback(handler)
            }).then((eventId) => {
                return () => {
                    try {
                        window.__TAURI_EVENT_PLUGIN_INTERNALS__?.unregisterListener?.(normalizedEvent, eventId);
                    } catch (_error) {}
                    return internals.invoke('plugin:event|unlisten', {
                        event: normalizedEvent,
                        eventId
                    }).catch(() => {});
                };
            });
        };
    };

    const handleDroppedEntries = async (rawEntries) => {
        const normalized = dedupePaths((rawEntries || []).map((row) => String(row || '').trim()).filter(Boolean));
        if (normalized.length === 0) {
            alert('Drop failed: no file path or URL found in dropped content.');
            return;
        }
        if (shouldSkipDuplicateDrop(normalized)) return;

        const resolvedWebSources = await resolveWebEmulatorDropSources(normalized);
        if (resolvedWebSources?.canceled) return;
        if (Array.isArray(resolvedWebSources?.imported) && resolvedWebSources.imported.length > 0) {
            const downloadedCount = resolvedWebSources.imported.filter((row) => !!String(row.downloadedTo || '').trim()).length;
            addFooterNotification(
                downloadedCount > 0
                    ? `Imported ${resolvedWebSources.imported.length} web emulator source(s) (${downloadedCount} local copy/copies).`
                    : `Imported ${resolvedWebSources.imported.length} web emulator source(s).`,
                'success'
            );
        }
        let importEntries = dedupePaths(resolvedWebSources?.remainingPaths || normalized);
        const unsupportedUrls = importEntries.filter((entry) => isHttpUrl(entry));
        if (unsupportedUrls.length > 0) {
            importEntries = importEntries.filter((entry) => !isHttpUrl(entry));
            addFooterNotification(
                `Skipped ${unsupportedUrls.length} URL drop entr${unsupportedUrls.length === 1 ? 'y' : 'ies'} (not importable as file path).`,
                'warning'
            );
        }
        if (!importEntries.length) {
            const updatedGames = await emubro.invoke('get-games');
            setGames(updatedGames);
            setFilteredGames([...updatedGames]);
            await refreshEmulatorsState();
            await renderActiveLibraryView();
            initializePlatformFilterOptions();
            updateLibraryCounters();
            return;
        }

        const staged = await promptImportStorageAction(importEntries);
        if (!staged || staged.canceled) return;
        const preparedCuePaths = await prepareCueBinPathsForImport(staged.paths);
        if (!preparedCuePaths || preparedCuePaths.canceled) return;
        const resolvedPaths = dedupePaths(preparedCuePaths.paths);
        if (!resolvedPaths.length) {
            alert('No valid files or folders to import.');
            return;
        }

        // Ask once about recursion if a folder is included.
        let recursive = true;
        try {
            const typeChecks = await Promise.all(resolvedPaths.map(p => emubro.invoke('check-path-type', p)));
            const firstDir = typeChecks.find(t => t && t.isDirectory && t.path)?.path;
            if (firstDir) {
                const prompt = await emubro.promptScanSubfolders(firstDir);
                if (prompt && prompt.canceled) return;
                if (prompt && typeof prompt.recursive === 'boolean') recursive = prompt.recursive;
            }
        } catch (err) {
            console.error('Failed to determine dropped path types:', err);
        }

        // Handle .exe drops with an explicit prompt (emulator/game/both).
        const exePaths = resolvedPaths.filter(p => String(p).toLowerCase().endsWith('.exe'));
        const otherPaths = resolvedPaths.filter(p => !String(p).toLowerCase().endsWith('.exe'));

        try {
            for (const exePath of exePaths) {
                const choice = await promptExeImport(exePath);
                if (choice?.canceled) continue;
                const res = await emubro.invoke('import-exe', {
                    path: exePath,
                    addEmulator: !!choice.addEmulator,
                    emulatorPlatformShortName: choice.emulatorPlatformShortName,
                    addGame: !!choice.addGame,
                    gamePlatformShortName: choice.gamePlatformShortName
                });
                if (!res?.success) {
                    alert(`Import failed for ${exePath}:\n${res?.message || 'Unknown error'}`);
                    continue;
                }
                if (choice?.addEmulator && res?.addedEmulator) {
                    await warnIfEmulatorFolderNotWritable(emubro, res.addedEmulator, alert, 'add');
                }
            }

            if (otherPaths.length > 0) {
                const archiveModeDecision = await resolveArchiveImportModes(otherPaths);
                if (!archiveModeDecision || archiveModeDecision.canceled) return;
                await importAndRefresh(otherPaths, recursive, archiveModeDecision.archiveImportModes || {});
            } else {
                // Still refresh after importing executables.
                const updatedGames = await emubro.invoke('get-games');
                setGames(updatedGames);
                setFilteredGames([...updatedGames]);
                await refreshEmulatorsState();
                await renderActiveLibraryView();
                initializePlatformFilterOptions();
                updateLibraryCounters();
            }
        } catch (err) {
            console.error('Import failed:', err);
            alert(`Import failed: ${err?.message || err}`);
        }
    };

    const parsePendingDropValue = (rawValue) => {
        if (!rawValue) return [];
        if (Array.isArray(rawValue)) return rawValue;
        if (typeof rawValue === 'string') {
            const text = rawValue.trim();
            if (!text) return [];
            try {
                const parsed = JSON.parse(text);
                if (Array.isArray(parsed)) return parsed;
                if (parsed && Array.isArray(parsed.paths)) return parsed.paths;
            } catch (_error) {}
            return [text];
        }
        if (rawValue && Array.isArray(rawValue.paths)) return rawValue.paths;
        return [];
    };

    const consumePendingDrop = async (rawValue) => {
        const parsed = parsePendingDropValue(rawValue);
        if (!parsed.length) return;
        if (shouldSkipDuplicateDrop(parsed)) return;
        await handleDroppedEntries(parsed);
    };

    async function getPlatformsCached() {
        if (window.__emubroPlatforms) return window.__emubroPlatforms;
        const platforms = await emubro.invoke('get-platforms');
        window.__emubroPlatforms = Array.isArray(platforms) ? platforms : [];
        return window.__emubroPlatforms;
    }

    async function getPlatformsByExtension(extension) {
        const ext = String(extension || '').trim();
        if (!ext) return [];
        try {
            const rows = await emubro.invoke('get-platforms-for-extension', ext);
            if (Array.isArray(rows) && rows.length > 0) return rows;
        } catch (_e) {}
        return [];
    }

    async function hasGamelistForPlatform(platformShortName) {
        const psn = String(platformShortName || '').trim();
        if (!psn) return false;
        try {
            const res = await emubro.invoke('gamelist:exists', psn);
            return !!res;
        } catch (_e) {
            return false;
        }
    }

    function normalizePlatformToken(value) {
        return String(value || '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');
    }

    function getPathFolderTokens(value) {
        const parts = String(value || '')
            .replace(/\\/g, '/')
            .split('/')
            .filter(Boolean);
        if (parts.length <= 1) return [];
        const dirs = parts.slice(0, -1);
        return dirs.map((entry) => normalizePlatformToken(entry)).filter(Boolean);
    }

    function inferPlatformFromPaths(paths, platforms) {
        const platformRows = Array.isArray(platforms) ? platforms : [];
        if (!platformRows.length) return '';
        const candidates = platformRows.map((row) => ({
            shortName: String(row?.shortName || '').trim(),
            shortKey: normalizePlatformToken(row?.shortName || ''),
            nameKey: normalizePlatformToken(row?.name || '')
        })).filter((row) => row.shortName && (row.shortKey || row.nameKey));
        if (!candidates.length) return '';

        const scores = new Map();
        (Array.isArray(paths) ? paths : []).forEach((path) => {
            const tokens = getPathFolderTokens(path);
            if (!tokens.length) return;
            for (let idx = tokens.length - 1, depth = 0; idx >= 0; idx -= 1, depth += 1) {
                const token = tokens[idx];
                if (!token) continue;
                const weight = Math.max(1, 6 - depth);
                candidates.forEach((candidate) => {
                    if (token === candidate.shortKey || token === candidate.nameKey) {
                        scores.set(candidate.shortName, (scores.get(candidate.shortName) || 0) + weight);
                    }
                });
            }
        });

        let best = '';
        let bestScore = 0;
        for (const [shortName, score] of scores.entries()) {
            if (score > bestScore) {
                best = shortName;
                bestScore = score;
            }
        }
        return best;
    }

    function createModal({ title, body, buttons }) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.style.cssText = [
                'display:flex',
                'position:fixed',
                'inset:0',
                'background:rgba(0,0,0,0.55)',
                'z-index:3000',
                'align-items:center',
                'justify-content:center',
                'padding:16px'
            ].join(';');

            const content = document.createElement('div');
            content.className = 'glass';
            content.style.cssText = [
                'background:var(--bg-secondary)',
                'border:1px solid var(--border-color)',
                'border-radius:12px',
                'max-width:720px',
                'width:100%',
                'box-shadow:0 8px 24px rgba(0,0,0,0.35)',
                'padding:16px'
            ].join(';');

            const header = document.createElement('div');
            header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;';
            const h = document.createElement('div');
            h.textContent = title || 'emuBro';
            h.style.cssText = 'font-size:18px;font-weight:700;';
            header.appendChild(h);

            const closeBtn = document.createElement('button');
            closeBtn.className = 'close-btn';
            closeBtn.innerHTML = '&times;';
            closeBtn.addEventListener('click', () => {
                overlay.remove();
                resolve({ canceled: true });
            });
            header.appendChild(closeBtn);

            const bodyWrap = document.createElement('div');
            if (body) bodyWrap.appendChild(body);

            const footer = document.createElement('div');
            footer.style.cssText = 'display:flex;justify-content:flex-end;gap:10px;margin-top:14px;flex-wrap:wrap;';
            (buttons || []).forEach((b) => {
                const btn = document.createElement('button');
                btn.className = 'action-btn';
                btn.textContent = b.label;
                if (b.primary) btn.classList.add('launch-btn');
                btn.addEventListener('click', async () => {
                    const val = await (b.onClick ? b.onClick() : null);
                    if (val && val.keepOpen) return;
                    overlay.remove();
                    resolve(val ?? { canceled: false });
                });
                footer.appendChild(btn);
            });

            content.appendChild(header);
            content.appendChild(bodyWrap);
            content.appendChild(footer);
            overlay.appendChild(content);
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.remove();
                    resolve({ canceled: true });
                }
            });
            document.body.appendChild(overlay);
        });
    }

    async function promptPlatformForFiles(filePaths, options = {}) {
        const title = String(options?.title || 'Import Files');
        const heading = String(options?.heading || 'Platform unknown');
        const message = String(options?.message || 'Select the platform for these files and import them.');
        const platforms = Array.isArray(options?.platforms) && options.platforms.length > 0
            ? options.platforms
            : await getPlatformsCached();

        const wrap = document.createElement('div');
        wrap.innerHTML = `
            <div style="margin-bottom:10px;font-weight:600;">${escapeHtml(heading)}</div>
            <div style="opacity:0.9;margin-bottom:10px;">${escapeHtml(message)}</div>
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px;">
                <label style="min-width:120px;">Platform</label>
            </div>
            <div style="max-height:240px;overflow:auto;border:1px solid var(--border-color);border-radius:8px;padding:10px;">
                ${filePaths.map(p => `<div style="font-family:monospace;font-size:12px;opacity:0.9;">${p}</div>`).join('')}
            </div>
        `;

        const select = document.createElement('select');
        select.className = 'glass-dropdown';
        select.style.cssText = 'min-width:260px;';
        select.innerHTML = `<option value="">Select platform...</option>` + platforms.map(p => `<option value="${p.shortName}">${p.name} (${p.shortName})</option>`).join('');
        wrap.children[2].appendChild(select);
        const inferred = inferPlatformFromPaths(filePaths, platforms);
        if (inferred && select.querySelector(`option[value="${inferred}"]`)) {
            select.value = inferred;
        }

        const res = await createModal({
            title,
            body: wrap,
            buttons: [
                { label: 'Cancel', onClick: () => ({ canceled: true }) },
                {
                    label: 'Import',
                    primary: true,
                    onClick: async () => {
                        const psn = String(select.value || '').trim();
                        if (!psn) {
                            alert('Please select a platform.');
                            return { keepOpen: true };
                        }
                        const platform = platforms.find((row) => String(row?.shortName || '').trim() === psn) || null;
                        return { canceled: false, platformShortName: psn, platform };
                    }
                }
            ]
        });

        return res;
    }

    async function promptGameCodeMode({ platformName, fileCount, allowRead, allowGamelist }) {
        const safePlatform = String(platformName || '').trim() || 'selected platform';
        const count = Number(fileCount || 0);
        const largeBatchThreshold = 25;
        const isLargeBatch = count >= largeBatchThreshold;
        const preferFilenameGamelist = allowGamelist && isLargeBatch;
        const body = document.createElement('div');
        body.innerHTML = `
            <div style="display:grid;gap:10px;">
                <div style="font-weight:700;">Game code detection</div>
                <div style="opacity:0.9;">
                    Choose how to set game codes for ${count} file(s) in <b>${escapeHtml(safePlatform)}</b>.
                </div>
                <div style="font-size:12px;opacity:0.8;">
                    ${preferFilenameGamelist ? `Large batch detected (${count} files): filename/gamelist is the fastest first pass. ` : ''}
                    ${allowRead ? 'Read Disc Image tries to detect official serials inside files (slower). ' : ''}
                    ${allowGamelist ? 'Filename/Gamelist is for lookup codes (for covers/metadata) and does not unpack archives. ' : ''}
                    You can always leave codes empty and update later.
                </div>
            </div>
        `;

        const buttons = [
            { label: 'Cancel Import', onClick: () => ({ canceled: true }) }
        ];
        if (allowGamelist) {
            buttons.push({
                label: 'Use Filename/Gamelist',
                primary: preferFilenameGamelist,
                onClick: () => ({ canceled: false, mode: 'gamelist' })
            });
        }
        buttons.push({ label: 'Enter Manually', onClick: () => ({ canceled: false, mode: 'manual' }) });
        buttons.push({ label: 'Skip Game Codes', onClick: () => ({ canceled: false, mode: 'skip' }) });
        if (allowRead) {
            buttons.push({
                label: isLargeBatch ? 'Read Disc Image (Slower)' : 'Read Disc Image',
                primary: !preferFilenameGamelist,
                onClick: () => ({ canceled: false, mode: 'read' })
            });
        }

        const choice = await createModal({
            title: 'Disc Image Game Codes',
            body,
            buttons
        });

        if (!choice || choice.canceled) return { canceled: true, mode: 'skip' };
        return { canceled: false, mode: String(choice.mode || 'skip') };
    }

    async function promptManualGameCodes(paths) {
        const inputPaths = Array.isArray(paths) ? paths : [];
        if (!inputPaths.length) return { canceled: true, codesByPath: {} };

        const body = document.createElement('div');
        body.innerHTML = `
            <div style="display:grid;gap:10px;">
                <div style="font-weight:700;">Manual game codes</div>
                <div style="opacity:0.9;">
                    Enter game codes for the files below. Leave blank to skip a file.
                </div>
                <div id="manual-game-code-list" style="max-height:240px;overflow:auto;border:1px solid var(--border-color);border-radius:8px;padding:10px;display:grid;gap:8px;"></div>
            </div>
        `;
        const list = body.querySelector('#manual-game-code-list');
        const inputRows = [];
        inputPaths.forEach((path) => {
            const safePath = String(path || '').trim();
            if (!safePath) return;
            const row = document.createElement('label');
            row.style.cssText = 'display:grid;gap:6px;';

            const title = document.createElement('span');
            title.style.cssText = 'font-family:monospace;font-size:12px;opacity:0.9;';
            title.textContent = safePath;

            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = 'SLUS-12345';
            input.className = 'glass-input';
            inputRows.push({ path: safePath, input });

            row.appendChild(title);
            row.appendChild(input);
            list.appendChild(row);
        });

        const choice = await createModal({
            title: 'Manual Game Codes',
            body,
            buttons: [
                { label: 'Cancel', onClick: () => ({ canceled: true }) },
                {
                    label: 'Apply Codes',
                    primary: true,
                    onClick: () => {
                        const codesByPath = {};
                        inputRows.forEach(({ path, input }) => {
                            const code = String(input?.value || '').trim();
                            if (path && code) {
                                codesByPath[path] = code;
                            }
                        });
                        return { canceled: false, codesByPath };
                    }
                }
            ]
        });

        if (!choice || choice.canceled) return { canceled: true, codesByPath: {} };
        return { canceled: false, codesByPath: choice.codesByPath || {} };
    }

    async function findPlatformByShortName(platformShortName) {
        const psn = String(platformShortName || '').trim().toLowerCase();
        if (!psn) return null;
        const platforms = await getPlatformsCached();
        return platforms.find((row) => String(row?.shortName || '').trim().toLowerCase() === psn) || null;
    }

    function platformHasGameCodes(platform) {
        return !!(platform?.hasGameCodes || platform?.hasDiscGameCodes || platform?.hasCoverLookupCodes);
    }

    function platformSupportsDiscCodeRead(platform) {
        if (!platform || typeof platform !== 'object') return false;
        if (Object.prototype.hasOwnProperty.call(platform, 'hasDiscGameCodes')) {
            return !!platform.hasDiscGameCodes;
        }
        const short = String(platform?.shortName || '').trim().toLowerCase();
        return short === 'psx' || short === 'ps2' || short === 'ps3' || short === 'psp';
    }

    function platformSupportsCoverLookupCodes(platform) {
        if (!platform || typeof platform !== 'object') return false;
        if (Object.prototype.hasOwnProperty.call(platform, 'hasCoverLookupCodes')) {
            return !!platform.hasCoverLookupCodes;
        }
        return !!platform.hasGameCodes;
    }

    function mergePlatformChoices(rows) {
        const mergedByShortName = new Map();
        (Array.isArray(rows) ? rows : []).forEach((row) => {
            const shortName = String(row?.shortName || '').trim();
            if (!shortName) return;
            const existing = mergedByShortName.get(shortName) || {};
            mergedByShortName.set(shortName, {
                ...existing,
                ...row,
                shortName,
                name: String(row?.name || existing?.name || shortName).trim(),
                hasGameCodes: !!(existing?.hasGameCodes || row?.hasGameCodes),
                hasDiscGameCodes: !!(existing?.hasDiscGameCodes || row?.hasDiscGameCodes),
                hasCoverLookupCodes: !!(existing?.hasCoverLookupCodes || row?.hasCoverLookupCodes)
            });
        });
        return Array.from(mergedByShortName.values());
    }

    async function promptManualFallbackForUnresolved(paths) {
        const unresolved = Array.isArray(paths) ? paths.filter(Boolean) : [];
        if (!unresolved.length) {
            return { canceled: false, useManual: false };
        }
        const body = document.createElement('div');
        body.innerHTML = `
            <div style="display:grid;gap:10px;">
                <div style="font-weight:700;">Some game codes were not found</div>
                <div style="opacity:0.9;">${unresolved.length} file(s) still have no detected code.</div>
                <div style="font-size:12px;opacity:0.8;">Do you want to enter missing codes manually now?</div>
            </div>
        `;
        const choice = await createModal({
            title: 'Missing Game Codes',
            body,
            buttons: [
                { label: 'Continue Without Codes', onClick: () => ({ canceled: false, useManual: false }) },
                { label: 'Enter Manually', primary: true, onClick: () => ({ canceled: false, useManual: true }) }
            ]
        });
        if (!choice || choice.canceled) return { canceled: true, useManual: false };
        return { canceled: false, useManual: !!choice.useManual };
    }

    async function collectGameCodeOverrides(paths, platform, options = {}) {
        const filePaths = dedupePaths(Array.isArray(paths) ? paths : []);
        if (!filePaths.length) return { canceled: false, codesByPath: {} };
        if (!platformHasGameCodes(platform)) return { canceled: false, codesByPath: {} };

        const allowRead = options.allowRead !== false
            && platformSupportsDiscCodeRead(platform)
            && filePaths.some((entry) => /\.(iso|ciso|bin)$/i.test(String(entry || '').trim()));
        const allowGamelist = options.allowGamelist !== false
            && platformSupportsCoverLookupCodes(platform);
        const modePick = await promptGameCodeMode({
            platformName: platform?.name || platform?.shortName || 'Platform',
            fileCount: filePaths.length,
            allowRead,
            allowGamelist
        });
        if (!modePick || modePick.canceled) return { canceled: true, codesByPath: {} };
        if (modePick.mode === 'skip') return { canceled: false, codesByPath: {} };
        if (modePick.mode === 'manual') {
            return promptManualGameCodes(filePaths);
        }

        let detectedCodesByPath = {};
        try {
            const detection = await emubro.invoke('iso:detect-game-codes', filePaths, {
                platformShortName: platform?.shortName,
                readIso: modePick.mode === 'read' && allowRead,
                useGamelistMatch: modePick.mode === 'gamelist' || (modePick.mode === 'read' && allowGamelist),
                useFilenameMatch: true
            });
            detectedCodesByPath = detection?.success && detection?.codesByPath && typeof detection.codesByPath === 'object'
                ? detection.codesByPath
                : {};
        } catch (_error) {
            detectedCodesByPath = {};
        }

        const unresolved = filePaths.filter((entry) => {
            const code = String(detectedCodesByPath[entry] || '').trim();
            return !code;
        });
        if (unresolved.length > 0) {
            const fallback = await promptManualFallbackForUnresolved(unresolved);
            if (fallback.canceled) return { canceled: true, codesByPath: {} };
            if (fallback.useManual) {
                const manual = await promptManualGameCodes(unresolved);
                if (manual.canceled) return { canceled: true, codesByPath: {} };
                detectedCodesByPath = { ...detectedCodesByPath, ...(manual.codesByPath || {}) };
            }
        }

        return { canceled: false, codesByPath: detectedCodesByPath };
    }

    async function promptExeImport(exePath) {
        const det = await emubro.invoke('detect-emulator-exe', exePath);
        const platforms = await getPlatformsCached();

        const wrap = document.createElement('div');
        const fileName = exePath.split(/[\\/]/).pop();

        const emuDefault = det && det.success && det.matched;
        const emuPlatformDefault = det && det.success && det.platformShortName ? String(det.platformShortName) : '';

        wrap.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:10px;">
                <div><strong>File:</strong> <span style="font-family:monospace;">${fileName}</span></div>
                <div style="opacity:0.9;">
                    ${emuDefault ? `Detected as emulator for <strong>${det.platformName}</strong> (${det.platformShortName}).` : `Not sure if this .exe is an emulator or a game.`}
                </div>
                <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;margin-top:6px;">
                    <label style="display:flex;gap:8px;align-items:center;"><input type="checkbox" id="exe-add-emu" /> Add as Emulator</label>
                    <label style="display:flex;gap:8px;align-items:center;"><input type="checkbox" id="exe-add-game" /> Add as Game</label>
                </div>
                <div id="emu-platform-row" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                    <label style="min-width:120px;">Emulator platform</label>
                </div>
                <div id="game-platform-row" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                    <label style="min-width:120px;">Game platform</label>
                </div>
            </div>
        `;

        const addEmu = wrap.querySelector('#exe-add-emu');
        const addGame = wrap.querySelector('#exe-add-game');

        const emuSelect = document.createElement('select');
        emuSelect.className = 'glass-dropdown';
        emuSelect.style.cssText = 'min-width:260px;';
        emuSelect.innerHTML = `<option value="">Select platform...</option>` + platforms.map(p => `<option value="${p.shortName}">${p.name} (${p.shortName})</option>`).join('');
        if (emuPlatformDefault) emuSelect.value = emuPlatformDefault;
        wrap.querySelector('#emu-platform-row').appendChild(emuSelect);

        const gameSelect = document.createElement('select');
        gameSelect.className = 'glass-dropdown';
        gameSelect.style.cssText = 'min-width:260px;';
        gameSelect.innerHTML = platforms.map(p => `<option value="${p.shortName}">${p.name} (${p.shortName})</option>`).join('');
        gameSelect.value = 'pc';
        wrap.querySelector('#game-platform-row').appendChild(gameSelect);

        addEmu.checked = !!emuDefault;
        addGame.checked = false;

        const updateRows = () => {
            wrap.querySelector('#emu-platform-row').style.opacity = addEmu.checked ? '1' : '0.45';
            emuSelect.disabled = !addEmu.checked;
            wrap.querySelector('#game-platform-row').style.opacity = addGame.checked ? '1' : '0.45';
            gameSelect.disabled = !addGame.checked;
        };
        addEmu.addEventListener('change', updateRows);
        addGame.addEventListener('change', updateRows);
        updateRows();

        const res = await createModal({
            title: 'Import .exe',
            body: wrap,
            buttons: [
                { label: 'Cancel', onClick: () => ({ canceled: true }) },
                {
                    label: 'Import',
                    primary: true,
                    onClick: async () => {
                        if (!addEmu.checked && !addGame.checked) {
                            alert('Select Emulator and/or Game.');
                            return { keepOpen: true };
                        }
                        if (addEmu.checked && !String(emuSelect.value || '').trim()) {
                            alert('Select the emulator platform.');
                            return { keepOpen: true };
                        }
                        return {
                            canceled: false,
                            addEmulator: addEmu.checked,
                            emulatorPlatformShortName: String(emuSelect.value || '').trim(),
                            addGame: addGame.checked,
                            gamePlatformShortName: String(gameSelect.value || '').trim() || 'pc'
                        };
                    }
                }
            ]
        });

        return res;
    }

    function dedupePaths(values) {
        const out = [];
        const seen = new Set();
        (Array.isArray(values) ? values : []).forEach((raw) => {
            const p = String(raw || '').trim();
            if (!p) return;
            const key = p.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            out.push(p);
        });
        return out;
    }

    async function promptImportStorageAction(rawPaths) {
        const paths = dedupePaths(rawPaths);
        if (!paths.length) return { canceled: true };

        let analysis = null;
        try {
            analysis = await emubro.invoke('analyze-import-paths', paths);
        } catch (_e) {
            analysis = null;
        }
        if (!analysis?.success || !analysis?.requiresDecision) {
            return { canceled: false, paths };
        }

        const byCategory = {};
        (Array.isArray(analysis.paths) ? analysis.paths : []).forEach((row) => {
            const key = String(row?.mediaLabel || row?.mediaCategory || 'Unknown');
            byCategory[key] = (byCategory[key] || 0) + 1;
        });
        const mediaSummary = Object.entries(byCategory)
            .map(([label, count]) => `${label}: ${count}`)
            .join(' | ');

        const settingsRes = await emubro.invoke('settings:get-library-paths');
        const settings = settingsRes?.settings || { gameFolders: [], emulatorFolders: [] };
        const managedFolders = dedupePaths([
            ...(Array.isArray(settings.gameFolders) ? settings.gameFolders : []),
            ...(Array.isArray(settings.emulatorFolders) ? settings.emulatorFolders : [])
        ]);

        const wrap = document.createElement('div');
        wrap.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:10px;">
                <div style="font-weight:600;">Import source detected as removable/network media</div>
                <div style="opacity:0.9;">${mediaSummary || 'External media detected.'}</div>
                <label style="display:flex;gap:8px;align-items:center;">
                    <input type="radio" name="import-storage-mode" value="keep" checked />
                    <span>Keep paths as-is (may break if media is disconnected)</span>
                </label>
                <label style="display:flex;gap:8px;align-items:center;">
                    <input type="radio" name="import-storage-mode" value="copy" />
                    <span>Copy files to managed folder (recommended)</span>
                </label>
                <label style="display:flex;gap:8px;align-items:center;">
                    <input type="radio" name="import-storage-mode" value="move" />
                    <span>Move files to managed folder</span>
                </label>
                <div id="import-target-row" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;opacity:0.5;">
                    <label style="min-width:120px;">Target folder</label>
                </div>
                <div style="max-height:130px;overflow:auto;border:1px solid var(--border-color);border-radius:8px;padding:8px;">
                    ${paths.map((p) => `<div style="font-family:monospace;font-size:12px;opacity:0.9;">${p}</div>`).join('')}
                </div>
            </div>
        `;

        const targetRow = wrap.querySelector('#import-target-row');
        const targetSelect = document.createElement('select');
        targetSelect.className = 'glass-dropdown';
        targetSelect.style.cssText = 'min-width:300px;flex:1;';
        targetSelect.innerHTML = `<option value="">Select destination...</option>` + managedFolders.map((p) => `<option value="${p}">${p}</option>`).join('');
        targetRow.appendChild(targetSelect);

        const addFolderBtn = document.createElement('button');
        addFolderBtn.type = 'button';
        addFolderBtn.className = 'action-btn';
        addFolderBtn.textContent = 'Add Folder';
        targetRow.appendChild(addFolderBtn);

        addFolderBtn.addEventListener('click', async () => {
            const pick = await emubro.invoke('open-file-dialog', {
                title: 'Select managed library folder',
                properties: ['openDirectory', 'createDirectory']
            });
            if (!pick || pick.canceled || !Array.isArray(pick.filePaths) || pick.filePaths.length === 0) return;

            const selected = String(pick.filePaths[0] || '').trim();
            if (!selected) return;

            if (!managedFolders.some((p) => p.toLowerCase() === selected.toLowerCase())) {
                managedFolders.push(selected);
                targetSelect.innerHTML = `<option value="">Select destination...</option>` + managedFolders.map((p) => `<option value="${p}">${p}</option>`).join('');
            }
            targetSelect.value = selected;
        });

        const modeRadios = Array.from(wrap.querySelectorAll('input[name="import-storage-mode"]'));
        const updateTargetState = () => {
            const mode = String(modeRadios.find((r) => r.checked)?.value || 'keep');
            const enabled = mode === 'copy' || mode === 'move';
            targetRow.style.opacity = enabled ? '1' : '0.5';
            targetSelect.disabled = !enabled;
            addFolderBtn.disabled = !enabled;
        };
        modeRadios.forEach((radio) => radio.addEventListener('change', updateTargetState));
        updateTargetState();

        const prompt = await createModal({
            title: 'Import Storage Strategy',
            body: wrap,
            buttons: [
                { label: 'Cancel', onClick: () => ({ canceled: true }) },
                {
                    label: 'Continue',
                    primary: true,
                    onClick: async () => {
                        const mode = String(modeRadios.find((r) => r.checked)?.value || 'keep');
                        if (mode === 'keep') {
                            return { canceled: false, mode: 'keep' };
                        }
                        const targetDir = String(targetSelect.value || '').trim();
                        if (!targetDir) {
                            alert('Please choose a destination folder.');
                            return { keepOpen: true };
                        }

                        try {
                            await emubro.invoke('settings:set-library-paths', {
                                ...settings,
                                gameFolders: dedupePaths([...(settings.gameFolders || []), targetDir])
                            });
                        } catch (_e) {}

                        return { canceled: false, mode, targetDir };
                    }
                }
            ]
        });

        if (!prompt || prompt.canceled) return { canceled: true };
        if (prompt.mode === 'keep') return { canceled: false, paths };

        const stageRes = await emubro.invoke('stage-import-paths', {
            paths,
            mode: prompt.mode,
            targetDir: prompt.targetDir
        });
        if (!stageRes?.success) {
            alert(stageRes?.message || 'Failed to prepare import files.');
            return { canceled: true };
        }
        if (Array.isArray(stageRes.skipped) && stageRes.skipped.length > 0) {
            console.warn('Some paths were not staged:', stageRes.skipped);
        }
        return { canceled: false, paths: dedupePaths(stageRes.paths) };
    }

    async function prepareCueBinPathsForImport(rawPaths) {
        const paths = dedupePaths(rawPaths);
        const binPaths = paths.filter((p) => String(p || '').toLowerCase().endsWith('.bin'));
        if (binPaths.length === 0) return { canceled: false, paths };

        let inspection = null;
        try {
            inspection = await emubro.invoke('cue:inspect-bin-files', binPaths);
        } catch (_error) {
            inspection = null;
        }
        if (!inspection?.success) return { canceled: false, paths };

        const rows = Array.isArray(inspection.results) ? inspection.results : [];
        const withCue = rows
            .filter((row) => !!row?.hasCue && String(row?.cuePath || '').trim())
            .map((row) => ({
                binPath: String(row.binPath || '').trim(),
                cuePath: String(row.cuePath || '').trim()
            }))
            .filter((row) => row.binPath && row.cuePath);
        const missingCue = rows
            .filter((row) => !row?.hasCue)
            .map((row) => String(row?.binPath || '').trim())
            .filter(Boolean);

        let normalized = [...paths];
        if (withCue.length > 0) {
            const replacementMap = new Map(withCue.map((row) => [row.binPath.toLowerCase(), row.cuePath]));
            normalized = dedupePaths(normalized.map((entry) => {
                const key = String(entry || '').trim().toLowerCase();
                return replacementMap.get(key) || entry;
            }));
            addFooterNotification(`Detected ${withCue.length} BIN file(s) with existing CUE. Using CUE paths.`, 'info');
        }

        if (missingCue.length === 0) {
            return { canceled: false, paths: normalized };
        }

        const wrap = document.createElement('div');
        wrap.innerHTML = `
            <div style="display:grid;gap:10px;">
                <div style="font-weight:700;">Missing CUE files for BIN images</div>
                <div style="opacity:0.9;">Generate CUE files now? This keeps BIN/CUE pairs grouped as one game.</div>
                <div style="max-height:220px;overflow:auto;border:1px solid var(--border-color);border-radius:8px;padding:8px;">
                    ${missingCue.map((p) => `<div style="font-family:monospace;font-size:12px;opacity:0.9;">${escapeHtml(String(p || ''))}</div>`).join('')}
                </div>
            </div>
        `;

        const choice = await createModal({
            title: 'Generate CUE Files',
            body: wrap,
            buttons: [
                { label: 'Cancel', onClick: () => ({ canceled: true }) },
                { label: 'Continue Without CUE', onClick: () => ({ canceled: false, mode: 'skip' }) },
                { label: 'Generate CUE + Continue', primary: true, onClick: () => ({ canceled: false, mode: 'generate' }) }
            ]
        });
        if (!choice || choice.canceled) return { canceled: true, paths: [] };

        if (choice.mode !== 'generate') {
            return { canceled: false, paths: normalized };
        }

        let generation = null;
        try {
            generation = await emubro.invoke('cue:generate-for-bin', missingCue);
        } catch (_error) {
            generation = null;
        }
        if (!generation?.success) {
            alert(generation?.message || 'Failed to generate CUE files.');
            return { canceled: false, paths: normalized };
        }

        const generatedRows = Array.isArray(generation.generated) ? generation.generated : [];
        const existingRows = Array.isArray(generation.existing) ? generation.existing : [];
        const generatedMap = new Map(
            [...generatedRows, ...existingRows]
                .map((row) => [String(row?.binPath || '').trim().toLowerCase(), String(row?.cuePath || '').trim()])
                .filter(([key, cuePath]) => key && cuePath)
        );
        const failedRows = Array.isArray(generation.failed) ? generation.failed : [];

        normalized = dedupePaths(normalized.map((entry) => {
            const key = String(entry || '').trim().toLowerCase();
            return generatedMap.get(key) || entry;
        }));

        if (generatedRows.length > 0) {
            addFooterNotification(`Generated ${generatedRows.length} CUE file(s).`, 'success');
        }
        if (failedRows.length > 0) {
            addFooterNotification(`Failed to generate ${failedRows.length} CUE file(s).`, 'warning');
        }

        return { canceled: false, paths: normalized };
    }

    function pathExtension(filePath) {
        const p = String(filePath || '').trim();
        const idx = p.lastIndexOf('.');
        if (idx < 0) return '';
        return p.slice(idx).toLowerCase();
    }

    function isArchiveCandidatePath(filePath) {
        const ext = pathExtension(filePath);
        return ext === '.zip' || ext === '.rar' || ext === '.7z' || ext === '.iso' || ext === '.ciso';
    }

    async function analyzeDroppedArchives(paths) {
        const archivePaths = dedupePaths((Array.isArray(paths) ? paths : []).filter((entry) => isArchiveCandidatePath(entry)));
        if (!archivePaths.length) return { success: true, archives: [] };
        try {
            const response = await emubro.invoke('import:analyze-archives', archivePaths);
            if (!response?.success) {
                return {
                    success: false,
                    message: String(response?.message || 'Archive analysis failed.'),
                    archives: []
                };
            }
            return {
                success: true,
                archives: Array.isArray(response.archives) ? response.archives : []
            };
        } catch (error) {
            return {
                success: false,
                message: String(error?.message || error || 'Archive analysis failed.'),
                archives: []
            };
        }
    }

    async function promptDirectArchiveMode(archiveRow) {
        const row = archiveRow && typeof archiveRow === 'object' ? archiveRow : {};
        const filePath = String(row.path || '').trim();
        const platformName = String(row.platformName || row.platformShortName || '').trim() || 'Detected platform';
        const extension = String(row.extension || pathExtension(filePath)).trim().toLowerCase();
        const emulators = Array.isArray(row.directArchiveEmulators)
            ? row.directArchiveEmulators.map((entry) => String(entry || '').trim()).filter(Boolean)
            : [];

        const body = document.createElement('div');
        body.innerHTML = `
            <div style="display:grid;gap:10px;">
                <div style="font-weight:700;">Archive import mode</div>
                <div style="opacity:0.92;">Choose how to handle ${escapeHtml(extension || 'this archive')} for <b>${escapeHtml(platformName)}</b>.</div>
                <div style="max-height:180px;overflow:auto;border:1px solid var(--border-color);border-radius:8px;padding:8px;">
                    <div style="font-family:monospace;font-size:12px;opacity:0.9;word-break:break-all;">${escapeHtml(filePath)}</div>
                    ${emulators.length ? `<div style=\"margin-top:8px;font-size:12px;opacity:0.85;\">Direct-run emulators: ${escapeHtml(emulators.join(', '))}</div>` : ''}
                </div>
                <div style="font-size:12px;opacity:0.8;">Keeping direct avoids heavy unpacking by default.</div>
            </div>
        `;

        const choice = await createModal({
            title: 'Archive Import Decision',
            body,
            buttons: [
                { label: 'Cancel Import', onClick: () => ({ canceled: true }) },
                { label: 'Skip This File', onClick: () => ({ canceled: false, mode: 'skip' }) },
                { label: 'Extract + Import', onClick: () => ({ canceled: false, mode: 'extract' }) },
                { label: 'Keep Archive Directly', primary: true, onClick: () => ({ canceled: false, mode: 'direct' }) }
            ]
        });
        if (!choice || choice.canceled) return { canceled: true, mode: 'direct' };
        const normalizedMode = String(choice.mode || '').trim().toLowerCase();
        if (normalizedMode === 'skip') return { canceled: false, mode: 'skip' };
        if (normalizedMode === 'extract') return { canceled: false, mode: 'extract' };
        return { canceled: false, mode: 'direct' };
    }

    async function promptDiscImageMode(archiveRow) {
        const row = archiveRow && typeof archiveRow === 'object' ? archiveRow : {};
        const filePath = String(row.path || '').trim();
        const extension = String(row.extension || pathExtension(filePath)).trim().toLowerCase() || 'disc image';

        const body = document.createElement('div');
        body.innerHTML = `
            <div style="display:grid;gap:10px;">
                <div style="font-weight:700;">Disc image import mode</div>
                <div style="opacity:0.92;">Choose whether to keep ${escapeHtml(extension)} files as disc images or extract them before importing.</div>
                <div style="max-height:180px;overflow:auto;border:1px solid var(--border-color);border-radius:8px;padding:8px;">
                    <div style="font-family:monospace;font-size:12px;opacity:0.9;word-break:break-all;">${escapeHtml(filePath)}</div>
                </div>
                <div style="font-size:12px;opacity:0.8;">Recommended: keep as disc image unless you specifically need extracted files.</div>
            </div>
        `;

        const choice = await createModal({
            title: 'Disc Image Import Decision',
            body,
            buttons: [
                { label: 'Cancel Import', onClick: () => ({ canceled: true }) },
                { label: 'Skip This File', onClick: () => ({ canceled: false, mode: 'skip' }) },
                { label: 'Extract + Import', onClick: () => ({ canceled: false, mode: 'extract' }) },
                { label: 'Keep Disc Image', primary: true, onClick: () => ({ canceled: false, mode: 'direct' }) }
            ]
        });
        if (!choice || choice.canceled) return { canceled: true, mode: 'direct' };
        const normalizedMode = String(choice.mode || '').trim().toLowerCase();
        if (normalizedMode === 'skip') return { canceled: false, mode: 'skip' };
        if (normalizedMode === 'extract') return { canceled: false, mode: 'extract' };
        return { canceled: false, mode: 'direct' };
    }

    async function resolveArchiveImportModes(paths) {
        const archiveModes = {};
        const analysis = await analyzeDroppedArchives(paths);
        if (!analysis?.success) {
            addFooterNotification(analysis?.message || 'Archive analysis failed. Keeping archives direct by default.', 'warning');
            return { canceled: false, archiveImportModes: archiveModes };
        }

        const rows = Array.isArray(analysis.archives) ? analysis.archives : [];
        for (const row of rows) {
            const filePath = String(row?.path || '').trim();
            if (!filePath) continue;
            const extension = String(row?.extension || pathExtension(filePath)).trim().toLowerCase();
            const archiveKind = String(row?.archiveKind || '').trim().toLowerCase();
            const isDiscImage = extension === '.iso' || extension === '.ciso' || archiveKind === 'iso' || archiveKind === 'ciso';
            if (isDiscImage) {
                const choice = await promptDiscImageMode(row);
                if (!choice || choice.canceled) {
                    return { canceled: true, archiveImportModes: archiveModes };
                }
                archiveModes[filePath] = choice.mode || 'direct';
                continue;
            }
            const choice = await promptDirectArchiveMode(row);
            if (!choice || choice.canceled) {
                return { canceled: true, archiveImportModes: archiveModes };
            }
            archiveModes[filePath] = choice.mode || 'direct';
        }

        return { canceled: false, archiveImportModes: archiveModes };
    }

    function isHttpUrl(value) {
        const input = String(value || '').trim();
        if (!input) return false;
        try {
            const parsed = new URL(input);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch (_error) {
            return false;
        }
    }

    function isHtmlSource(value) {
        const input = String(value || '').trim();
        if (!input) return false;
        if (isHttpUrl(input)) {
            try {
                const parsed = new URL(input);
                const pathname = String(parsed.pathname || '').toLowerCase();
                return pathname.endsWith('.html') || pathname.endsWith('.htm');
            } catch (_error) {
                return false;
            }
        }
        const normalized = input.toLowerCase();
        return normalized.endsWith('.html') || normalized.endsWith('.htm');
    }

    function resolveWebMatchSummary(match) {
        const row = match && typeof match === 'object' ? match : {};
        const platform = String(row.platform || row.platformShortName || 'unknown').trim();
        const name = String(row.name || 'Web Emulator').trim();
        return `${name} (${platform})`;
    }

    async function promptWebEmulatorImportSource(source, matches = []) {
        const safeSource = String(source || '').trim();
        const sourceIsUrl = isHttpUrl(safeSource);
        const rows = Array.isArray(matches) ? matches : [];
        const preferred = rows[0] || null;

        const wrap = document.createElement('div');
        wrap.innerHTML = `
            <div style="display:grid;gap:10px;">
                <div style="font-weight:700;">Detected HTML Web Emulator Source</div>
                <div style="opacity:0.9;">Choose how to import this web emulator source.</div>
                <div style="max-height:140px;overflow:auto;border:1px solid var(--border-color);border-radius:8px;padding:8px;">
                    <div style="font-family:monospace;font-size:12px;opacity:0.9;word-break:break-all;">${escapeHtml(safeSource)}</div>
                </div>
                <div id="web-emu-select-row" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                    <label style="min-width:120px;">Known Emulator</label>
                </div>
                <div style="font-size:12px;opacity:0.85;">
                    Save only keeps the original source path/URL. Save + Download stores a local HTML copy and registers that path.
                </div>
            </div>
        `;

        const selectRow = wrap.querySelector('#web-emu-select-row');
        const select = document.createElement('select');
        select.className = 'glass-dropdown';
        select.style.cssText = 'min-width:280px;flex:1;';
        select.innerHTML = rows.map((row, index) => `
            <option value="${index}">${escapeHtml(resolveWebMatchSummary(row))}</option>
        `).join('');
        if (preferred) {
            select.value = '0';
        }
        selectRow.appendChild(select);

        const choice = await createModal({
            title: 'Import Web Emulator',
            body: wrap,
            buttons: [
                { label: 'Skip', onClick: () => ({ canceled: true }) },
                {
                    label: 'Save Only',
                    onClick: () => {
                        const idx = Number.parseInt(String(select.value || '0'), 10);
                        const match = rows[idx] || rows[0] || null;
                        return { canceled: false, mode: 'save', match };
                    }
                },
                {
                    label: sourceIsUrl ? 'Save + Download' : 'Save + Copy Local',
                    primary: true,
                    onClick: () => {
                        const idx = Number.parseInt(String(select.value || '0'), 10);
                        const match = rows[idx] || rows[0] || null;
                        return { canceled: false, mode: 'save_and_download', match };
                    }
                }
            ]
        });

        if (!choice || choice.canceled || !choice.match) {
            return { canceled: true };
        }

        return {
            canceled: false,
            mode: String(choice.mode || 'save').trim().toLowerCase(),
            match: choice.match
        };
    }

    async function resolveWebEmulatorDropSources(paths) {
        const input = dedupePaths(paths);
        if (!input.length) {
            return { canceled: false, remainingPaths: [], imported: [] };
        }

        const imported = [];
        const handled = new Set();

        for (const source of input) {
            if (!isHtmlSource(source)) continue;
            let analysis = null;
            try {
                analysis = await emubro.invoke('import:analyze-web-emulator-source', { source });
            } catch (_error) {
                analysis = null;
            }
            if (!analysis?.success) continue;
            const matches = Array.isArray(analysis.matches) ? analysis.matches : [];
            if (!matches.length) continue;

            const choice = await promptWebEmulatorImportSource(source, matches);
            if (!choice || choice.canceled) continue;

            const saveResult = await emubro.invoke('import:save-web-emulator-source', {
                source,
                action: choice.mode,
                match: choice.match,
                platformShortName: choice?.match?.platformShortName,
                platform: choice?.match?.platform,
                name: choice?.match?.name,
                startParameters: choice?.match?.startParameters,
                website: choice?.match?.website
            });
            if (!saveResult?.success) {
                alert(saveResult?.message || 'Failed to import web emulator source.');
                continue;
            }

            handled.add(source.toLowerCase());
            imported.push({
                source,
                mode: choice.mode,
                emulator: saveResult.emulator || null,
                downloadedTo: String(saveResult.downloadedTo || '').trim()
            });
        }

        const remainingPaths = input.filter((entry) => !handled.has(String(entry || '').trim().toLowerCase()));
        return { canceled: false, remainingPaths, imported };
    }

    async function importAndRefresh(paths, recursive, archiveImportModes = {}) {
        const result = await emubro.importPaths(paths, { recursive, archiveImportModes });

        const warnings = Array.isArray(result?.warnings) ? result.warnings : [];
        if (warnings.length > 0) {
            const preview = warnings
                .slice(0, 3)
                .map((row) => String(row?.message || row?.reason || '').trim())
                .filter(Boolean)
                .join(' | ');
            addFooterNotification(
                preview || `Import completed with ${warnings.length} warning(s).`,
                'warning'
            );
        }

        // Unknown/unmatched: offer platform picker for direct file drops.
        const unmatched = (result?.skipped || []).filter(s => s && s.reason === 'unmatched').map(s => s.path).filter(Boolean);
        if (unmatched.length > 0) {
            const discImageUnmatched = unmatched.filter((p) => /\.(iso|ciso|bin)$/i.test(String(p || '').trim()));
            const nonDiscUnmatched = unmatched.filter((p) => !/\.(iso|ciso|bin)$/i.test(String(p || '').trim()));

            if (discImageUnmatched.length > 0) {
                const isoPlatforms = await getPlatformsByExtension('.iso');
                const cisoPlatforms = await getPlatformsByExtension('.ciso');
                const binPlatforms = await getPlatformsByExtension('.bin');
                const allDiscPlatforms = mergePlatformChoices([
                    ...isoPlatforms,
                    ...cisoPlatforms,
                    ...binPlatforms
                ]);
                const discPick = await promptPlatformForFiles(discImageUnmatched, {
                    title: 'Import Disc Image Files',
                    heading: 'Disc image platform selection',
                    message: 'These ISO/CISO/BIN files can match multiple platforms. Select the target platform.',
                    platforms: allDiscPlatforms
                });
                if (discPick && !discPick.canceled && discPick.platformShortName) {
                    const selectedPlatform = discPick.platform
                        || allDiscPlatforms.find((row) => row.shortName === discPick.platformShortName)
                        || await findPlatformByShortName(discPick.platformShortName);
                    const codeResult = await collectGameCodeOverrides(discImageUnmatched, selectedPlatform, {
                        allowRead: true,
                        allowGamelist: true
                    });
                    if (!codeResult || codeResult.canceled) {
                        // Skip this import group when canceled in code workflow.
                    } else {
                        const detectedCount = Object.keys(codeResult.codesByPath || {}).filter((key) => {
                            return String(codeResult.codesByPath[key] || '').trim().length > 0;
                        }).length;
                        if (detectedCount > 0) {
                            addFooterNotification(`Detected game code for ${detectedCount} file(s).`, 'info');
                        }
                        await emubro.invoke('import-files-as-platform', discImageUnmatched, discPick.platformShortName, {
                            codeOverrides: codeResult.codesByPath || {}
                        });
                    }
                }
            }

            if (nonDiscUnmatched.length > 0) {
                const pick = await promptPlatformForFiles(nonDiscUnmatched);
                if (pick && !pick.canceled && pick.platformShortName) {
                    const selectedPlatform = pick.platform || await findPlatformByShortName(pick.platformShortName);
                    const codeResult = await collectGameCodeOverrides(nonDiscUnmatched, selectedPlatform, {
                        allowRead: false,
                        allowGamelist: true
                    });
                    if (!codeResult || codeResult.canceled) {
                        // Skip this import group when canceled in code workflow.
                    } else {
                        await emubro.invoke('import-files-as-platform', nonDiscUnmatched, pick.platformShortName, {
                            codeOverrides: codeResult.codesByPath || {}
                        });
                    }
                }
            }
        }

        const noMatches = (result?.skipped || []).filter(s => s && s.reason === 'no_matches').map(s => s.path).filter(Boolean);
        if (noMatches.length > 0) {
            alert(`No supported games/emulators found in:\n\n${noMatches.join('\n')}`);
        }

        // Reload library from main process DB.
        const updatedGames = await emubro.invoke('get-games');
        setGames(updatedGames);
        setFilteredGames([...updatedGames]);
        await refreshEmulatorsState();
        await renderActiveLibraryView();
        initializePlatformFilterOptions();
        updateLibraryCounters();

        return result;
    }

    const onDrop = async (e) => {
        if (!shouldHandleDropGesture(e)) return;
        e.preventDefault();
        dragCounter = 0;
        mainContent.classList.remove('drag-over');

        if (!isLibraryDropContext()) {
            // Allow tool-specific drop handlers (e.g. memory card slots)
            // to continue in target/bubble phase without global import.
            return;
        }

        const filePaths = collectDroppedPaths(e.dataTransfer);
        const textEntries = collectDroppedTextEntries(e.dataTransfer);
        const itemTextEntries = await collectDroppedTextEntriesFromItems(e.dataTransfer);
        const rawEntries = dedupePaths([...(filePaths || []), ...(textEntries || []), ...(itemTextEntries || [])]);
        if (rawEntries.length === 0) {
            const droppedFileCount = Number(e?.dataTransfer?.files?.length || 0);
            const droppedItemCount = Number(e?.dataTransfer?.items?.length || 0);
            if (
                (droppedFileCount > 0 || droppedItemCount > 0) &&
                (getTauriEventListen() || typeof emubro?.onFileDrop === 'function')
            ) {
                // In Tauri, the native file-drop event is the reliable way to receive absolute paths.
                schedulePendingNativeDropFallback({ fileCount: droppedFileCount, itemCount: droppedItemCount });
                return;
            }
            alert(
                droppedFileCount > 0
                    ? `Drop failed: received ${droppedFileCount} file(s) but no readable absolute path(s). Try dropping from a file manager window or use Browse.`
                    : `Drop failed: no file path or URL found in dropped content (${droppedItemCount} drop item(s)).`
            );
            return;
        }

        await handleDroppedEntries(rawEntries);
    };

    // Bind to document (capture) so dropping works even if a child element intercepts events.
    document.addEventListener('dragenter', onEnter, true);
    document.addEventListener('dragleave', onLeave, true);
    document.addEventListener('dragover', onOver, true);
    document.addEventListener('drop', onDrop, true);

    // Tauri webviews do not reliably expose absolute paths via DOM `DataTransfer` for security reasons.
    // Bridge native file drop events into the existing import flow so the user still gets the same popups.
    try {
        const setDragOverlay = (active) => {
            dragCounter = active ? 1 : 0;
            mainContent.classList.toggle('drag-over', !!active);
        };

        if (typeof emubro?.onFileDrop === 'function') {
            emubro.onFileDropHover(() => {
                if (!isLibraryDropContext()) return;
                setDragOverlay(true);
            });
            emubro.onFileDropCancelled(() => {
                clearPendingNativeDropTimer();
                setDragOverlay(false);
            });
            emubro.onFileDrop(async (event) => {
                clearPendingNativeDropTimer();
                setDragOverlay(false);
                if (!isLibraryDropContext()) return;
                const payload = extractTauriEventPayload(event);
                const paths = coerceTauriDropPaths(payload);
                await handleDroppedEntries(paths);
            });
            return;
        }

        const tauriListen = getTauriEventListen();
        if (tauriListen) {
            const subscribe = (eventName, handler) => {
                const res = tauriListen(eventName, handler);
                if (res && typeof res.then === 'function') {
                    res.catch(() => {});
                }
            };

            subscribe('tauri://file-drop-hover', () => {
                if (!isLibraryDropContext()) return;
                setDragOverlay(true);
            });
            subscribe('tauri://file-drop-cancelled', () => {
                clearPendingNativeDropTimer();
                setDragOverlay(false);
            });
            subscribe('tauri://file-drop', async (event) => {
                clearPendingNativeDropTimer();
                setDragOverlay(false);
                if (!isLibraryDropContext()) return;
                const payload = extractTauriEventPayload(event);
                const paths = coerceTauriDropPaths(payload);
                await handleDroppedEntries(paths);
            });

            // Tauri v2 drag/drop events (preferred; Windows often does not forward DOM DataTransfer paths).
            subscribe('tauri://drag-enter', () => {
                if (!isLibraryDropContext()) return;
                setDragOverlay(true);
            });
            subscribe('tauri://drag-over', () => {
                if (!isLibraryDropContext()) return;
                setDragOverlay(true);
            });
            subscribe('tauri://drag-leave', () => {
                clearPendingNativeDropTimer();
                setDragOverlay(false);
            });
            subscribe('tauri://drag-drop', async (event) => {
                clearPendingNativeDropTimer();
                setDragOverlay(false);
                if (!isLibraryDropContext()) return;
                const payload = extractTauriEventPayload(event);
                const paths = coerceTauriDropPaths(payload);
                await handleDroppedEntries(paths);
            });
        }
    } catch (_error) {}

    try {
        const initialPending = getShellStorageValue(PENDING_DROP_KEY, null);
        if (initialPending) {
            removeShellStorageValue(PENDING_DROP_KEY);
            void consumePendingDrop(initialPending);
        }
    } catch (_error) {}

    window.addEventListener('storage', (event) => {
        if (!event || event.key !== PENDING_DROP_KEY) return;
        if (!event.newValue) return;
        removeShellStorageValue(PENDING_DROP_KEY);
        void consumePendingDrop(event.newValue);
    });

}
