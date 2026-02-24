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

    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    let dragCounter = 0;

    const isLibraryDropContext = () => {
        return String(getActiveTopSection() || '').trim().toLowerCase() === 'library';
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
                        return { canceled: false, platformShortName: psn };
                    }
                }
            ]
        });

        return res;
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
        return ext === '.zip' || ext === '.rar' || ext === '.7z';
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
                <div style="opacity:0.92;">This archive matches <b>${escapeHtml(platformName)}</b>. Some emulator(s) can launch ${escapeHtml(extension || 'this archive type')} directly.</div>
                <div style="max-height:180px;overflow:auto;border:1px solid var(--border-color);border-radius:8px;padding:8px;">
                    <div style="font-family:monospace;font-size:12px;opacity:0.9;word-break:break-all;">${escapeHtml(filePath)}</div>
                    ${emulators.length ? `<div style=\"margin-top:8px;font-size:12px;opacity:0.85;\">Direct-run emulators: ${escapeHtml(emulators.join(', '))}</div>` : ''}
                </div>
                <div style="font-size:12px;opacity:0.8;">Recommended: extract and import actual files for better compatibility and metadata.</div>
            </div>
        `;

        const choice = await createModal({
            title: 'Archive Import Decision',
            body,
            buttons: [
                { label: 'Cancel Import', onClick: () => ({ canceled: true }) },
                { label: 'Keep Archive Directly', onClick: () => ({ canceled: false, mode: 'direct' }) },
                { label: 'Extract + Import', primary: true, onClick: () => ({ canceled: false, mode: 'extract' }) }
            ]
        });
        if (!choice || choice.canceled) return { canceled: true, mode: 'extract' };
        return { canceled: false, mode: choice.mode === 'direct' ? 'direct' : 'extract' };
    }

    async function resolveArchiveImportModes(paths) {
        const archiveModes = {};
        const analysis = await analyzeDroppedArchives(paths);
        if (!analysis?.success) {
            addFooterNotification(analysis?.message || 'Archive analysis failed. Using extraction fallback.', 'warning');
            return { canceled: false, archiveImportModes: archiveModes };
        }

        const rows = Array.isArray(analysis.archives) ? analysis.archives : [];
        for (const row of rows) {
            const filePath = String(row?.path || '').trim();
            if (!filePath) continue;
            if (!row?.directArchiveSupported) {
                archiveModes[filePath] = 'extract';
                continue;
            }
            const choice = await promptDirectArchiveMode(row);
            if (!choice || choice.canceled) {
                return { canceled: true, archiveImportModes: archiveModes };
            }
            archiveModes[filePath] = choice.mode || 'extract';
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
            const discImageUnmatched = unmatched.filter((p) => /\.(iso|ciso)$/i.test(String(p || '').trim()));
            const nonDiscUnmatched = unmatched.filter((p) => !/\.(iso|ciso)$/i.test(String(p || '').trim()));

            if (discImageUnmatched.length > 0) {
                const isoPlatforms = await getPlatformsByExtension('.iso');
                const cisoPlatforms = await getPlatformsByExtension('.ciso');
                const allDiscPlatforms = dedupePaths([
                    ...isoPlatforms.map((row) => `${row.shortName}::${row.name}`),
                    ...cisoPlatforms.map((row) => `${row.shortName}::${row.name}`)
                ]).map((entry) => {
                    const parts = String(entry || '').split('::');
                    return { shortName: String(parts[0] || '').trim(), name: String(parts[1] || '').trim() };
                });
                const discPick = await promptPlatformForFiles(discImageUnmatched, {
                    title: 'Import Disc Image Files',
                    heading: 'Disc image platform selection',
                    message: 'These ISO/CISO files match multiple platforms. Select the target platform.',
                    platforms: allDiscPlatforms
                });
                if (discPick && !discPick.canceled && discPick.platformShortName) {
                    let detectedCodesByPath = {};
                    try {
                        const onlyIso = discImageUnmatched.filter((entry) => String(entry || '').toLowerCase().endsWith('.iso'));
                        const detection = await emubro.invoke('iso:detect-game-codes', onlyIso);
                        detectedCodesByPath = detection?.success && detection?.codesByPath && typeof detection.codesByPath === 'object'
                            ? detection.codesByPath
                            : {};
                        const detectedCount = Object.keys(detectedCodesByPath).length;
                        if (detectedCount > 0) {
                            addFooterNotification(`Detected ISO game code for ${detectedCount} file(s).`, 'info');
                        }
                    } catch (_e) {}

                    await emubro.invoke('import-files-as-platform', discImageUnmatched, discPick.platformShortName, {
                        codeOverrides: detectedCodesByPath
                    });
                }
            }

            if (nonDiscUnmatched.length > 0) {
                const pick = await promptPlatformForFiles(nonDiscUnmatched);
                if (pick && !pick.canceled && pick.platformShortName) {
                    await emubro.invoke('import-files-as-platform', nonDiscUnmatched, pick.platformShortName);
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
        const rawEntries = dedupePaths([...(filePaths || []), ...(textEntries || [])]);
        if (rawEntries.length === 0) {
            alert('Drop failed: no file path or URL found in dropped content.');
            return;
        }

        const resolvedWebSources = await resolveWebEmulatorDropSources(rawEntries);
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
        let importEntries = dedupePaths(resolvedWebSources?.remainingPaths || rawEntries);
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

    // Bind to document (capture) so dropping works even if a child element intercepts events.
    document.addEventListener('dragenter', onEnter, true);
    document.addEventListener('dragleave', onLeave, true);
    document.addEventListener('dragover', onOver, true);
    document.addEventListener('drop', onDrop, true);

}
