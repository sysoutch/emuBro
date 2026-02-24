import {
    GAMEPAD_BINDING_ACTIONS,
    GAMEPAD_BINDING_LABELS,
    normalizeInputBindingProfile,
    loadPlatformGamepadBindingsMap,
    savePlatformGamepadBindingsMap
} from '../gamepad-binding-utils';

export async function openLibraryPathSettingsModal(options = {}) {
    const emubro = options.emubro;
    const getLibraryPathSettings = typeof options.getLibraryPathSettings === 'function'
        ? options.getLibraryPathSettings
        : async () => ({ scanFolders: [], gameFolders: [], emulatorFolders: [] });
    const saveLibraryPathSettings = typeof options.saveLibraryPathSettings === 'function'
        ? options.saveLibraryPathSettings
        : async () => {};
    const normalizePathList = typeof options.normalizePathList === 'function'
        ? options.normalizePathList
        : (values = []) => Array.from(new Set((Array.isArray(values) ? values : []).map((value) => String(value || '').trim()).filter(Boolean)));
    const normalizeLibrarySection = typeof options.normalizeLibrarySection === 'function'
        ? options.normalizeLibrarySection
        : ((section) => String(section || 'all').trim().toLowerCase() || 'all');
    const getActiveLibrarySection = typeof options.getActiveLibrarySection === 'function'
        ? options.getActiveLibrarySection
        : () => 'all';
    const setActiveLibrarySectionState = typeof options.setActiveLibrarySectionState === 'function'
        ? options.setActiveLibrarySectionState
        : () => {};
    const isLibraryTopSection = typeof options.isLibraryTopSection === 'function'
        ? options.isLibraryTopSection
        : () => true;
    const confirmDisableLlmHelpersFlow = typeof options.confirmDisableLlmHelpersFlow === 'function'
        ? options.confirmDisableLlmHelpersFlow
        : () => true;
    const setLlmHelpersEnabled = typeof options.setLlmHelpersEnabled === 'function'
        ? options.setLlmHelpersEnabled
        : () => {};
    const setLlmAllowUnknownTagsEnabled = typeof options.setLlmAllowUnknownTagsEnabled === 'function'
        ? options.setLlmAllowUnknownTagsEnabled
        : () => {};
    const openThemeManager = typeof options.openThemeManager === 'function' ? options.openThemeManager : () => {};
    const openLanguageManager = typeof options.openLanguageManager === 'function' ? options.openLanguageManager : () => {};
    const openProfileModal = typeof options.openProfileModal === 'function' ? options.openProfileModal : async () => {};
    const runBrowseSearch = typeof options.runBrowseSearch === 'function' ? options.runBrowseSearch : async () => {};
    const getBrowseScopeSelection = typeof options.getBrowseScopeSelection === 'function' ? options.getBrowseScopeSelection : () => 'both';
    const openFooterPanel = typeof options.openFooterPanel === 'function' ? options.openFooterPanel : () => {};
    const addFooterNotification = typeof options.addFooterNotification === 'function' ? options.addFooterNotification : () => {};
    const setActiveViewButton = typeof options.setActiveViewButton === 'function' ? options.setActiveViewButton : () => {};
    const setActiveLibrarySection = typeof options.setActiveLibrarySection === 'function' ? options.setActiveLibrarySection : async () => {};
    const LLM_HELPERS_ENABLED_KEY = String(options.llmHelpersEnabledKey || 'emuBro.llmHelpersEnabled');
    const LLM_ALLOW_UNKNOWN_TAGS_KEY = String(options.llmAllowUnknownTagsKey || 'emuBro.llmAllowUnknownTags');
    const SUGGESTED_SECTION_KEY = String(options.suggestedSectionKey || 'suggested');

    if (!emubro) return;

    let activeLibrarySection = normalizeLibrarySection(getActiveLibrarySection() || 'all');

    const loaded = await getLibraryPathSettings();
    const draft = {
        scanFolders: normalizePathList(loaded.scanFolders),
        gameFolders: normalizePathList(loaded.gameFolders),
        emulatorFolders: normalizePathList(loaded.emulatorFolders)
    };
    const generalDraft = {
        defaultSection: normalizeLibrarySection(localStorage.getItem('emuBro.defaultLibrarySection') || activeLibrarySection || 'all'),
        defaultView: String(localStorage.getItem('emuBro.defaultLibraryView') || (document.querySelector('.view-btn.active')?.dataset.view || 'cover')).toLowerCase(),
        showLoadIndicator: localStorage.getItem('emuBro.showLoadIndicator') !== 'false',
        autoOpenFooter: localStorage.getItem('emuBro.autoOpenFooter') !== 'false',
        llmHelpersEnabled: localStorage.getItem(LLM_HELPERS_ENABLED_KEY) !== 'false',
        llmAllowUnknownTags: localStorage.getItem(LLM_ALLOW_UNKNOWN_TAGS_KEY) === 'true'
    };
    const llmSettings = typeof options.loadSuggestionSettings === 'function' ? options.loadSuggestionSettings() : {};
    const normalizeLlmMode = (value) => String(value || '').trim().toLowerCase() === 'client' ? 'client' : 'host';
    const normalizeRelayAccessMode = (value) => {
        const mode = String(value || '').trim().toLowerCase();
        if (mode === 'whitelist' || mode === 'blacklist') return mode;
        return 'open';
    };
    const normalizeRelayAddressList = (values) => {
        const rows = Array.isArray(values)
            ? values
            : String(values || '')
                .split(/[\r\n,;]+/g)
                .map((row) => String(row || '').trim())
                .filter(Boolean);
        const seen = new Set();
        const out = [];
        rows.forEach((row) => {
            const key = row.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            out.push(row);
        });
        return out;
    };
    const normalizeRelayPort = (value, fallback = 42141) => {
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) return fallback;
        const rounded = Math.round(parsed);
        if (rounded < 1 || rounded > 65535) return fallback;
        return rounded;
    };
    const llmDraft = {
        provider: String(llmSettings.provider || 'ollama'),
        llmMode: normalizeLlmMode(llmSettings.llmMode),
        models: llmSettings.models || {},
        baseUrls: llmSettings.baseUrls || {},
        apiKeys: llmSettings.apiKeys || {},
        relay: {
            hostUrl: String(llmSettings.relay?.hostUrl || '').trim(),
            authToken: String(llmSettings.relay?.authToken || '').trim(),
            port: normalizeRelayPort(llmSettings.relay?.port, 42141),
            enabled: !!llmSettings.relay?.enabled,
            accessMode: normalizeRelayAccessMode(llmSettings.relay?.accessMode),
            whitelist: normalizeRelayAddressList(llmSettings.relay?.whitelist),
            blacklist: normalizeRelayAddressList(llmSettings.relay?.blacklist)
        },
        promptTemplate: llmSettings.promptTemplate || ''
    };
    let llmRelayScanStatus = '';
    let llmRelayScanResults = [];
    let llmRelayHostStatus = null;
    let llmRelayConnections = [];
    if (!generalDraft.llmHelpersEnabled && generalDraft.defaultSection === SUGGESTED_SECTION_KEY) {
        generalDraft.defaultSection = 'all';
    }
    const importDraft = {
        preferCopyExternal: localStorage.getItem('emuBro.preferCopyExternal') !== 'false',
        enableNetworkScan: localStorage.getItem('emuBro.enableNetworkScan') !== 'false',
        launcherStores: {
            steam: localStorage.getItem('emuBro.launcherImportSteam') !== 'false',
            epic: localStorage.getItem('emuBro.launcherImportEpic') === 'true',
            gog: localStorage.getItem('emuBro.launcherImportGog') === 'true'
        },
        launcherDiscoveryMode: String(localStorage.getItem('emuBro.launcherImportMode') || 'filesystem').toLowerCase()
    };
    const platformGamepadDraft = loadPlatformGamepadBindingsMap(localStorage);
    let platformBindingRows = [];
    try {
        const emulatorRows = await emubro.invoke('get-emulators');
        const byPlatform = new Map();
        (Array.isArray(emulatorRows) ? emulatorRows : []).forEach((row) => {
            const shortName = String(row?.platformShortName || '').trim().toLowerCase();
            if (!shortName || byPlatform.has(shortName)) return;
            const displayName = String(row?.platform || '').trim() || shortName.toUpperCase();
            byPlatform.set(shortName, displayName);
        });
        platformBindingRows = [...byPlatform.entries()]
            .map(([shortName, platform]) => ({ shortName, platform }))
            .sort((a, b) => String(a.platform).localeCompare(String(b.platform)));
    } catch (_error) {
        platformBindingRows = [];
    }
    Object.keys(platformGamepadDraft).forEach((shortName) => {
        const key = String(shortName || '').trim().toLowerCase();
        if (!key) return;
        if (platformBindingRows.some((row) => row.shortName === key)) return;
        platformBindingRows.push({ shortName: key, platform: key.toUpperCase() });
    });
    platformBindingRows.sort((a, b) => String(a.platform).localeCompare(String(b.platform)));
    if (platformBindingRows.length === 0) {
        platformBindingRows = Object.keys(platformGamepadDraft)
            .map((shortName) => ({
                shortName,
                platform: shortName.toUpperCase()
            }))
            .sort((a, b) => String(a.platform).localeCompare(String(b.platform)));
    }
    const initialTab = String(options.initialTab || '').trim().toLowerCase();
    const allowedTabs = new Set(['general', 'llm', 'gamepad', 'library-paths', 'import', 'updates']);
    let activeTab = allowedTabs.has(initialTab) ? initialTab : 'general';
    let updateState = {
        checking: false,
        downloading: false,
        downloaded: false,
        available: false,
        currentVersion: '',
        latestVersion: '',
        releaseNotes: '',
        lastMessage: '',
        lastError: '',
        progressPercent: 0,
        autoCheckOnStartup: true,
        autoCheckIntervalMinutes: 60
    };
    let resourcesUpdateState = {
        checking: false,
        installing: false,
        available: false,
        currentVersion: '',
        latestVersion: '',
        manifestUrl: '',
        storagePath: '',
        effectiveStoragePath: '',
        defaultStoragePath: '',
        lastMessage: '',
        lastError: '',
        progressPercent: 0,
        autoCheckOnStartup: true,
        autoCheckIntervalMinutes: 60
    };
    let detachUpdateListener = null;
    let detachResourcesUpdateListener = null;

    const overlay = document.createElement('div');
    overlay.style.cssText = [
        'position:fixed',
        'inset:0',
        'z-index:3600',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'padding:20px',
        'background:rgba(0,0,0,0.58)'
    ].join(';');

    const modal = document.createElement('div');
    modal.className = 'glass';
    modal.style.cssText = [
        'width:min(980px,100%)',
        'max-height:86vh',
        'overflow:auto',
        'background:var(--bg-secondary)',
        'border:1px solid var(--border-color)',
        'border-radius:14px',
        'padding:16px',
        'box-shadow:0 18px 42px rgba(0,0,0,0.45)'
    ].join(';');

    const renderList = (key, items, emptyLabel) => {
        const canRelocate = key === 'gameFolders' || key === 'emulatorFolders';
        if (!items.length) return `<div style="opacity:0.7;font-size:0.92rem;">${emptyLabel}</div>`;
        return `<div style="display:flex;flex-direction:column;gap:8px;">${items.map((p, idx) => `
            <div data-row="${idx}" style="display:flex;gap:8px;align-items:center;">
                <div style="flex:1;font-family:monospace;font-size:12px;padding:8px 10px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-primary);word-break:break-all;">${p}</div>
                ${canRelocate ? `<button type="button" class="action-btn small" data-relocate-index="${idx}" data-relocate-key="${key}">Relocate</button>` : ''}
                <button type="button" class="action-btn remove-btn small" data-remove-index="${idx}">Remove</button>
            </div>
        `).join('')}</div>`;
    };

    const escapeAttr = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const refreshGamesAfterImport = typeof options.refreshGamesAfterImport === 'function'
        ? options.refreshGamesAfterImport
        : async () => {};

    const openLauncherImportModal = async () => {
        const stores = importDraft.launcherStores || {};
        const scanResult = await emubro.invoke('launcher:scan-games', {
            stores: {
                steam: stores.steam !== false,
                epic: !!stores.epic,
                gog: !!stores.gog
            },
            discoveryMode: importDraft.launcherDiscoveryMode || 'filesystem'
        });
        if (!scanResult?.success) {
            alert(scanResult?.message || 'Failed to scan launcher libraries.');
            return;
        }

        const rows = [];
        const addRows = (storeKey, list) => {
            (Array.isArray(list) ? list : []).forEach((entry) => {
                rows.push({ ...entry, launcher: storeKey });
            });
        };
        addRows('steam', scanResult?.stores?.steam);
        addRows('epic', scanResult?.stores?.epic);
        addRows('gog', scanResult?.stores?.gog);

        if (rows.length === 0) {
            alert('No launcher games found for the selected stores.');
            return;
        }

        let existingPaths = new Set();
        try {
            const existingGames = await emubro.invoke('get-games');
            if (Array.isArray(existingGames)) {
                existingPaths = new Set(
                    existingGames
                        .map((game) => String(game?.filePath || '').trim().toLowerCase())
                        .filter(Boolean)
                );
            }
        } catch (_e) {}
        rows.forEach((row) => {
            row.isImported = existingPaths.has(String(row.launchUri || '').trim().toLowerCase());
        });

        const overlay = document.createElement('div');
        overlay.style.cssText = [
            'position:fixed',
            'inset:0',
            'z-index:3700',
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'padding:20px',
            'background:rgba(0,0,0,0.58)'
        ].join(';');

        const modal = document.createElement('div');
        modal.className = 'glass';
        modal.style.cssText = [
            'width:min(860px,100%)',
            'max-height:80vh',
            'overflow:auto',
            'background:var(--bg-secondary)',
            'border:1px solid var(--border-color)',
            'border-radius:14px',
            'padding:16px',
            'box-shadow:0 18px 42px rgba(0,0,0,0.45)',
            'display:grid',
            'gap:12px'
        ].join(';');

        modal.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
                <h3 style="margin:0;font-size:1rem;">Import Launcher Games</h3>
                <button type="button" class="action-btn remove-btn" data-launcher-close>Close</button>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                <button type="button" class="action-btn" data-launcher-select-all>Select All</button>
                <button type="button" class="action-btn" data-launcher-clear>Clear</button>
                <label style="display:flex;align-items:center;gap:6px;font-size:0.85rem;">
                    <input type="checkbox" data-launcher-installed-only />
                    <span>Installed only</span>
                </label>
            </div>
            <div data-launcher-list style="display:grid;gap:8px;max-height:52vh;overflow:auto;padding-right:4px;">
                ${rows.map((row, idx) => `
                    <label data-launcher-row="${idx}" data-launcher-installed="${row.installed ? '1' : '0'}" style="display:flex;gap:10px;align-items:center;border:1px solid var(--border-color);border-radius:10px;padding:8px 10px;background:var(--bg-primary);">
                        <input type="checkbox" data-launcher-pick="${idx}"${row.isImported ? '' : ' checked'} />
                        <div style="display:grid;gap:4px;">
                            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                                <span style="font-weight:600;">${escapeAttr(row.name || 'Unknown')}</span>
                                <span style="font-size:0.72rem;padding:2px 6px;border-radius:999px;background:rgba(255,255,255,0.08);text-transform:uppercase;letter-spacing:0.04em;">${escapeAttr(String(row.launcher || ''))}</span>
                                ${row.isImported ? '<span style="font-size:0.72rem;color:var(--text-secondary);">Already in library</span>' : ''}
                                ${row.installed ? '<span style="font-size:0.72rem;color:var(--text-secondary);">Installed</span>' : ''}
                            </div>
                            <div style="font-size:0.82rem;color:var(--text-secondary);">
                                ${row.installDir ? escapeAttr(row.installDir) : ''}
                            </div>
                        </div>
                    </label>
                `).join('')}
            </div>
            <div style="display:flex;gap:8px;justify-content:flex-end;">
                <button type="button" class="action-btn launch-btn" data-launcher-import>Import Selected</button>
            </div>
        `;

        const close = () => overlay.remove();
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) close();
        });
        modal.querySelector('[data-launcher-close]')?.addEventListener('click', close);
        modal.querySelector('[data-launcher-select-all]')?.addEventListener('click', () => {
            modal.querySelectorAll('[data-launcher-pick]').forEach((input) => {
                input.checked = true;
            });
        });
        modal.querySelector('[data-launcher-clear]')?.addEventListener('click', () => {
            modal.querySelectorAll('[data-launcher-pick]').forEach((input) => {
                input.checked = false;
            });
        });
        modal.querySelector('[data-launcher-installed-only]')?.addEventListener('change', (event) => {
            const enabled = !!event.target.checked;
            modal.querySelectorAll('[data-launcher-row]').forEach((rowEl) => {
                const isInstalled = rowEl.dataset.launcherInstalled === '1';
                rowEl.style.display = enabled && !isInstalled ? 'none' : '';
            });
            const listEl = modal.querySelector('[data-launcher-list]');
            if (listEl) listEl.scrollTop = 0;
        });
        modal.querySelector('[data-launcher-import]')?.addEventListener('click', async () => {
            const picks = [];
            modal.querySelectorAll('[data-launcher-pick]').forEach((input) => {
                if (!input.checked) return;
                const idx = Number(input.dataset.launcherPick);
                if (!Number.isFinite(idx) || !rows[idx]) return;
                picks.push(rows[idx]);
            });
            if (picks.length === 0) {
                alert('Select at least one game to import.');
                return;
            }
            const result = await emubro.invoke('launcher:import-games', { games: picks });
            if (!result?.success) {
                alert(result?.message || 'Failed to import launcher games.');
                return;
            }
            await refreshGamesAfterImport();
            addFooterNotification?.(`Imported ${result.added?.length || 0} games.`, 'success');
            close();
        });

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    };

    const closeModal = () => {
        try {
            if (typeof detachUpdateListener === 'function') detachUpdateListener();
        } catch (_error) {}
        try {
            if (typeof detachResourcesUpdateListener === 'function') detachResourcesUpdateListener();
        } catch (_error) {}
        overlay.remove();
    };

    const applyUpdateState = (payload = {}) => {
        updateState = {
            ...updateState,
            checking: !!payload?.checking,
            downloading: !!payload?.downloading,
            downloaded: !!payload?.downloaded,
            available: !!payload?.available,
            currentVersion: String(payload?.currentVersion || updateState.currentVersion || ''),
            latestVersion: String(payload?.latestVersion || updateState.latestVersion || ''),
            releaseNotes: String(payload?.releaseNotes || updateState.releaseNotes || ''),
            lastMessage: String(payload?.lastMessage || ''),
            lastError: String(payload?.lastError || ''),
            progressPercent: Number.isFinite(Number(payload?.progressPercent))
                ? Number(payload.progressPercent)
                : Number(updateState.progressPercent || 0),
            autoCheckOnStartup: payload?.autoCheckOnStartup !== undefined
                ? payload.autoCheckOnStartup !== false
                : updateState.autoCheckOnStartup,
            autoCheckIntervalMinutes: Number.isFinite(Number(payload?.autoCheckIntervalMinutes))
                ? Math.max(5, Math.min(1440, Math.round(Number(payload.autoCheckIntervalMinutes))))
                : Number(updateState.autoCheckIntervalMinutes || 60)
        };
    };

    const renderUpdateStatusText = () => {
        if (updateState.lastError) return `Error: ${updateState.lastError}`;
        if (updateState.downloading) return `Downloading update... ${Math.round(updateState.progressPercent || 0)}%`;
        if (updateState.downloaded) return 'Update downloaded. Restart app to install.';
        if (updateState.available) return `Update available${updateState.latestVersion ? `: ${updateState.latestVersion}` : ''}`;
        if (updateState.checking) return 'Checking for updates...';
        if (updateState.lastMessage) return updateState.lastMessage;
        return 'Not checked yet.';
    };

    const applyResourcesUpdateState = (payload = {}) => {
        const hasManifestUrl = Object.prototype.hasOwnProperty.call(payload || {}, 'manifestUrl');
        const hasStoragePath = Object.prototype.hasOwnProperty.call(payload || {}, 'storagePath');
        const hasEffectiveStoragePath = Object.prototype.hasOwnProperty.call(payload || {}, 'effectiveStoragePath');
        const hasDefaultStoragePath = Object.prototype.hasOwnProperty.call(payload || {}, 'defaultStoragePath');
        resourcesUpdateState = {
            ...resourcesUpdateState,
            checking: !!payload?.checking,
            installing: !!payload?.installing,
            available: !!payload?.available,
            currentVersion: String(payload?.currentVersion || resourcesUpdateState.currentVersion || ''),
            latestVersion: String(payload?.latestVersion || resourcesUpdateState.latestVersion || ''),
            manifestUrl: hasManifestUrl
                ? String(payload?.manifestUrl || '')
                : String(resourcesUpdateState.manifestUrl || ''),
            storagePath: hasStoragePath
                ? String(payload?.storagePath || '')
                : String(resourcesUpdateState.storagePath || ''),
            effectiveStoragePath: hasEffectiveStoragePath
                ? String(payload?.effectiveStoragePath || '')
                : String(resourcesUpdateState.effectiveStoragePath || ''),
            defaultStoragePath: hasDefaultStoragePath
                ? String(payload?.defaultStoragePath || '')
                : String(resourcesUpdateState.defaultStoragePath || ''),
            lastMessage: String(payload?.lastMessage || ''),
            lastError: String(payload?.lastError || ''),
            progressPercent: Number.isFinite(Number(payload?.progressPercent))
                ? Number(payload.progressPercent)
                : Number(resourcesUpdateState.progressPercent || 0),
            autoCheckOnStartup: payload?.autoCheckOnStartup !== undefined
                ? payload.autoCheckOnStartup !== false
                : resourcesUpdateState.autoCheckOnStartup,
            autoCheckIntervalMinutes: Number.isFinite(Number(payload?.autoCheckIntervalMinutes))
                ? Math.max(5, Math.min(1440, Math.round(Number(payload.autoCheckIntervalMinutes))))
                : Number(resourcesUpdateState.autoCheckIntervalMinutes || 60)
        };
    };

    const renderResourcesUpdateStatusText = () => {
        if (resourcesUpdateState.lastError) return `Error: ${resourcesUpdateState.lastError}`;
        if (resourcesUpdateState.installing) return `Installing resources... ${Math.round(resourcesUpdateState.progressPercent || 0)}%`;
        if (resourcesUpdateState.available) return `Resource update available${resourcesUpdateState.latestVersion ? `: ${resourcesUpdateState.latestVersion}` : ''}`;
        if (resourcesUpdateState.checking) return 'Checking resource updates...';
        if (resourcesUpdateState.lastMessage) return resourcesUpdateState.lastMessage;
        return 'Not checked yet.';
    };

    const section = (key, title, subtitle, placeholder, browseLabel, entries) => `
        <section style="border:1px solid var(--border-color);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:10px;">
            <div>
                <h3 style="margin:0 0 4px 0;font-size:1rem;">${title}</h3>
                <p style="margin:0;color:var(--text-secondary);font-size:0.9rem;">${subtitle}</p>
            </div>
            <div data-list="${key}">${renderList(key, entries, 'No folders added yet.')}</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <input type="text" data-input="${key}" placeholder="${placeholder}" style="flex:1;min-width:260px;" />
                <button type="button" class="action-btn" data-add-manual="${key}">Add Path</button>
                <button type="button" class="action-btn launch-btn" data-add-browse="${key}">${browseLabel}</button>
            </div>
        </section>
    `;

    const renderLlmTab = () => {
        const provider = llmDraft.provider;
        const model = llmDraft.models[provider] || '';
        const baseUrl = llmDraft.baseUrls[provider] || '';
        const apiKey = llmDraft.apiKeys[provider] || '';
        const isOllama = provider === 'ollama';
        const llmMode = normalizeLlmMode(llmDraft.llmMode);
        const relayPort = normalizeRelayPort(llmDraft.relay?.port, 42141);
        const relayHostUrl = String(llmDraft.relay?.hostUrl || '').trim();
        const relayAuthToken = String(llmDraft.relay?.authToken || '').trim();
        const relayEnabled = !!llmDraft.relay?.enabled;
        const relayAccessMode = normalizeRelayAccessMode(llmDraft.relay?.accessMode);
        const relayWhitelist = normalizeRelayAddressList(llmDraft.relay?.whitelist);
        const relayBlacklist = normalizeRelayAddressList(llmDraft.relay?.blacklist);
        const relayWhitelistText = escapeAttr(relayWhitelist.join('\n'));
        const relayBlacklistText = escapeAttr(relayBlacklist.join('\n'));
        const relayHostStatusText = llmRelayHostStatus?.status?.running
            ? `Incoming relay is running on port ${Number(llmRelayHostStatus?.status?.port || relayPort)}.`
            : 'Incoming relay is currently disabled.';
        const relayRows = (Array.isArray(llmRelayScanResults) ? llmRelayScanResults : [])
            .map((row) => {
                const url = escapeAttr(String(row?.url || '').trim());
                const host = escapeAttr(String(row?.hostname || row?.host || '').trim() || 'Unknown host');
                const version = escapeAttr(String(row?.version || '').trim());
                const latency = Number.isFinite(Number(row?.latencyMs)) ? `${Math.round(Number(row.latencyMs))} ms` : '';
                return `
                    <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;padding:8px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-primary);">
                        <div style="min-width:0;">
                            <div style="font-size:0.85rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${host}${version ? ` <span style="opacity:0.75;font-weight:500;">(${version})</span>` : ''}</div>
                            <div style="font-size:0.78rem;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${url}${latency ? ` - ${escapeAttr(latency)}` : ''}</div>
                        </div>
                        <button type="button" class="action-btn small" data-llm-pick-host="${url}">Use</button>
                    </div>
                `;
            })
            .join('');
        const relayConnectionRows = (Array.isArray(llmRelayConnections) ? llmRelayConnections : [])
            .map((row) => {
                const remoteAddress = escapeAttr(String(row?.remoteAddress || '').trim() || 'unknown');
                const clientName = escapeAttr(String(row?.clientName || '').trim() || 'client');
                const lastPath = escapeAttr(String(row?.lastPath || '').trim() || '-');
                const lastSeen = Number.isFinite(Number(row?.lastSeenAt))
                    ? new Date(Number(row.lastSeenAt)).toLocaleString()
                    : '-';
                return `
                    <div style="padding:8px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-primary);display:grid;gap:2px;">
                        <div style="font-size:0.84rem;font-weight:600;">${remoteAddress} <span style="opacity:0.72;font-weight:500;">(${clientName})</span></div>
                        <div style="font-size:0.75rem;color:var(--text-secondary);">last: ${lastPath} | requests: ${Number(row?.requestCount || 0)} | denied: ${Number(row?.deniedCount || 0)} | auth fail: ${Number(row?.authFailCount || 0)}</div>
                        <div style="font-size:0.75rem;color:var(--text-secondary);">seen: ${escapeAttr(lastSeen)}</div>
                    </div>
                `;
            })
            .join('');

        return `
            <section style="display:grid;gap:12px;">
                <section style="border:1px solid var(--border-color);border-radius:12px;padding:12px;display:grid;gap:10px;">
                    <h3 style="margin:0;font-size:1rem;">AI / LLM Configuration</h3>
                    <p style="margin:0;color:var(--text-secondary);font-size:0.85rem;">
                        Configure providers for game suggestions and automated tagging.
                    </p>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;">
                        <label style="display:flex;flex-direction:column;gap:6px;">
                            <span style="font-size:0.82rem;color:var(--text-secondary);">Mode</span>
                            <select data-llm="mode">
                                <option value="host"${llmMode === 'host' ? ' selected' : ''}>Host (default)</option>
                                <option value="client"${llmMode === 'client' ? ' selected' : ''}>Client</option>
                            </select>
                        </label>
                        <label style="display:flex;flex-direction:column;gap:6px;">
                            <span style="font-size:0.82rem;color:var(--text-secondary);">Provider</span>
                            <select data-llm="provider">
                                <option value="ollama"${provider === 'ollama' ? ' selected' : ''}>Ollama (Local)</option>
                                <option value="openai"${provider === 'openai' ? ' selected' : ''}>ChatGPT (OpenAI)</option>
                                <option value="gemini"${provider === 'gemini' ? ' selected' : ''}>Gemini (Google)</option>
                            </select>
                        </label>
                        <label style="display:flex;flex-direction:column;gap:6px;">
                            <span style="font-size:0.82rem;color:var(--text-secondary);">Model Name</span>
                            ${isOllama ? `
                            <div style="display:grid;grid-template-columns:1fr auto;gap:6px;">
                                <select data-llm="model-select">
                                    <option value="${model}" selected>${model || 'Select model...'}</option>
                                </select>
                                <button type="button" class="action-btn small" data-llm="refresh-models">Refresh</button>
                            </div>
                            <input type="text" data-llm="model" value="${model}" style="display:none;" />
                            ` : `
                            <input type="text" data-llm="model" value="${model}" placeholder="e.g. gpt-4o-mini" />
                            `}
                        </label>
                    </div>
                    <label style="display:flex;flex-direction:column;gap:6px;${llmMode === 'client' ? 'opacity:0.72;' : ''}">
                        <span style="font-size:0.82rem;color:var(--text-secondary);">API Base URL</span>
                        <input type="text" data-llm="base-url" value="${baseUrl}" placeholder="${isOllama ? 'http://127.0.0.1:11434' : 'https://api.openai.com/v1'}"${llmMode === 'client' ? ' disabled' : ''} />
                    </label>
                    ${!isOllama ? `
                    <label style="display:flex;flex-direction:column;gap:6px;${llmMode === 'client' ? 'opacity:0.72;' : ''}">
                        <span style="font-size:0.82rem;color:var(--text-secondary);">API Key</span>
                        <input type="password" data-llm="api-key" value="${apiKey}" placeholder="sk-..." autocomplete="off"${llmMode === 'client' ? ' disabled' : ''} />
                    </label>
                    ` : `
                    <div style="font-size:0.8rem;color:var(--text-secondary);opacity:0.8;" data-llm="status"></div>
                    `}
                    <div style="border-top:1px solid var(--border-color);padding-top:10px;display:grid;gap:10px;">
                        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;">
                            <label style="display:flex;flex-direction:column;gap:6px;">
                                <span style="font-size:0.82rem;color:var(--text-secondary);">Relay Port</span>
                                <input type="number" min="1" max="65535" step="1" data-llm="relay-port" value="${relayPort}" />
                            </label>
                            <label style="display:flex;flex-direction:column;gap:6px;">
                                <span style="font-size:0.82rem;color:var(--text-secondary);">Shared Token (optional)</span>
                                <input type="password" data-llm="relay-token" value="${escapeAttr(relayAuthToken)}" placeholder="Leave empty for open LAN access" autocomplete="off" />
                            </label>
                        </div>
                        ${llmMode === 'client' ? `
                        <div style="display:grid;gap:8px;">
                            <label style="display:flex;flex-direction:column;gap:6px;">
                                <span style="font-size:0.82rem;color:var(--text-secondary);">Host URL</span>
                                <input type="text" data-llm="client-host-url" value="${escapeAttr(relayHostUrl)}" placeholder="http://192.168.1.40:42141" />
                            </label>
                            <div style="display:flex;flex-wrap:wrap;gap:8px;">
                                <button type="button" class="action-btn small" data-llm="scan-network">Scan Network</button>
                            </div>
                            <div style="font-size:0.82rem;color:var(--text-secondary);" data-llm="scan-status">${escapeAttr(llmRelayScanStatus || 'Scan your local network for other running emuBro hosts.')}</div>
                            ${relayRows ? `<div style="display:grid;gap:6px;max-height:220px;overflow:auto;">${relayRows}</div>` : ''}
                        </div>
                        ` : `
                        <div style="display:grid;gap:8px;">
                            <label style="display:flex;align-items:center;gap:8px;">
                                <input type="checkbox" data-llm="relay-enabled"${relayEnabled ? ' checked' : ''} />
                                <span>Enable incoming client connections</span>
                            </label>
                            <label style="display:flex;flex-direction:column;gap:6px;${relayEnabled ? '' : 'opacity:0.72;'}">
                                <span style="font-size:0.82rem;color:var(--text-secondary);">Access Mode</span>
                                <select data-llm="relay-access-mode"${relayEnabled ? '' : ' disabled'}>
                                    <option value="open"${relayAccessMode === 'open' ? ' selected' : ''}>Open LAN (token recommended)</option>
                                    <option value="whitelist"${relayAccessMode === 'whitelist' ? ' selected' : ''}>Whitelist only</option>
                                    <option value="blacklist"${relayAccessMode === 'blacklist' ? ' selected' : ''}>Blacklist</option>
                                </select>
                            </label>
                            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;${relayEnabled ? '' : 'opacity:0.72;'}">
                                <label style="display:flex;flex-direction:column;gap:6px;">
                                    <span style="font-size:0.82rem;color:var(--text-secondary);">Whitelist IP/Host (one per line)</span>
                                    <textarea data-llm="relay-whitelist" rows="4"${relayEnabled ? '' : ' disabled'}>${relayWhitelistText}</textarea>
                                </label>
                                <label style="display:flex;flex-direction:column;gap:6px;">
                                    <span style="font-size:0.82rem;color:var(--text-secondary);">Blacklist IP/Host (one per line)</span>
                                    <textarea data-llm="relay-blacklist" rows="4"${relayEnabled ? '' : ' disabled'}>${relayBlacklistText}</textarea>
                                </label>
                            </div>
                            <div style="display:flex;flex-wrap:wrap;gap:8px;">
                                <button type="button" class="action-btn small" data-llm="refresh-connections">Refresh Connected Devices</button>
                            </div>
                            <div style="font-size:0.82rem;color:var(--text-secondary);">${escapeAttr(relayHostStatusText)}</div>
                            ${relayConnectionRows
                                ? `<div style="display:grid;gap:6px;max-height:240px;overflow:auto;">${relayConnectionRows}</div>`
                                : '<div style="font-size:0.82rem;color:var(--text-secondary);">No connected devices recorded yet.</div>'}
                        </div>
                        `}
                    </div>
                </section>
            </section>
        `;
    };

    const refreshRelayHostData = async ({ skipRender = false } = {}) => {
        try {
            const statusResult = await emubro.invoke('suggestions:relay:get-status');
            if (statusResult?.success) {
                llmRelayHostStatus = statusResult;
                if (statusResult?.relay && typeof statusResult.relay === 'object') {
                    llmDraft.relay.enabled = !!statusResult.relay.enabled;
                    llmDraft.relay.port = normalizeRelayPort(statusResult.relay.port, llmDraft.relay.port || 42141);
                    llmDraft.relay.accessMode = normalizeRelayAccessMode(statusResult.relay.accessMode);
                    llmDraft.relay.whitelist = normalizeRelayAddressList(statusResult.relay.whitelist);
                    llmDraft.relay.blacklist = normalizeRelayAddressList(statusResult.relay.blacklist);
                }
            }
            const connectionsResult = await emubro.invoke('suggestions:relay:get-connections');
            if (connectionsResult?.success) {
                llmRelayConnections = Array.isArray(connectionsResult.connections) ? connectionsResult.connections : [];
            }
        } catch (_error) {
            llmRelayHostStatus = null;
            llmRelayConnections = [];
        }
        if (!skipRender) render();
    };

    const renderGeneralTab = () => `
        <section style="display:grid;gap:12px;">
            <section style="border:1px solid var(--border-color);border-radius:12px;padding:12px;display:grid;gap:10px;">
                <h3 style="margin:0;font-size:1rem;">Library Defaults</h3>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;">
                    <label style="display:flex;flex-direction:column;gap:6px;">
                        <span style="font-size:0.82rem;color:var(--text-secondary);">Default Library Section</span>
                        <select data-setting="default-section">
                            <option value="all"${generalDraft.defaultSection === 'all' ? ' selected' : ''}>All Games</option>
                            <option value="favorite"${generalDraft.defaultSection === 'favorite' ? ' selected' : ''}>Favorite</option>
                            <option value="recent"${generalDraft.defaultSection === 'recent' ? ' selected' : ''}>Recently Played</option>
                            ${generalDraft.llmHelpersEnabled ? `<option value="suggested"${generalDraft.defaultSection === 'suggested' ? ' selected' : ''}>Suggested</option>` : ''}
                            <option value="emulators"${generalDraft.defaultSection === 'emulators' ? ' selected' : ''}>Emulators</option>
                        </select>
                    </label>
                    <label style="display:flex;flex-direction:column;gap:6px;">
                        <span style="font-size:0.82rem;color:var(--text-secondary);">Default Library View</span>
                        <select data-setting="default-view">
                            <option value="cover"${generalDraft.defaultView === 'cover' ? ' selected' : ''}>Cover</option>
                            <option value="list"${generalDraft.defaultView === 'list' ? ' selected' : ''}>List</option>
                            <option value="table"${generalDraft.defaultView === 'table' ? ' selected' : ''}>Table</option>
                            <option value="slideshow"${generalDraft.defaultView === 'slideshow' ? ' selected' : ''}>Slideshow</option>
                            <option value="focus"${generalDraft.defaultView === 'focus' ? ' selected' : ''}>Focus</option>
                            <option value="random"${generalDraft.defaultView === 'random' ? ' selected' : ''}>Random</option>
                        </select>
                    </label>
                </div>
                <label style="display:flex;align-items:center;gap:10px;">
                    <input type="checkbox" data-setting="show-load-indicator"${generalDraft.showLoadIndicator ? ' checked' : ''} />
                    <span>Show progressive load indicator when more games are appended</span>
                </label>
                <label style="display:flex;align-items:center;gap:10px;">
                    <input type="checkbox" data-setting="auto-open-footer"${generalDraft.autoOpenFooter ? ' checked' : ''} />
                    <span>Auto-open the bottom panel when selecting a game</span>
                </label>
                <label style="display:flex;align-items:flex-start;gap:10px;">
                    <input type="checkbox" data-setting="llm-helpers-enabled"${generalDraft.llmHelpersEnabled ? ' checked' : ''} />
                    <span>Show AI/LLM helpers in UI (Suggested view, AI tag buttons, global AI tagging)</span>
                </label>
                <label style="display:flex;align-items:flex-start;gap:10px;">
                    <input type="checkbox" data-setting="llm-allow-unknown-tags"${generalDraft.llmAllowUnknownTags ? ' checked' : ''}${generalDraft.llmHelpersEnabled ? '' : ' disabled'} />
                    <span>Allow AI to suggest new tags not in your current tag catalog</span>
                </label>
            </section>
            <section style="border:1px solid var(--border-color);border-radius:12px;padding:12px;display:grid;gap:10px;">
                <h3 style="margin:0;font-size:1rem;">Quick Access</h3>
                <div style="display:flex;flex-wrap:wrap;gap:8px;">
                    <button type="button" class="action-btn" data-settings-open-theme>Open Theme Manager</button>
                    <button type="button" class="action-btn" data-settings-open-language>Open Language Manager</button>
                    <button type="button" class="action-btn launch-btn" data-settings-open-profile>Open Profile</button>
                </div>
            </section>
        </section>
    `;

    const renderImportTab = () => `
        <section style="display:grid;gap:12px;">
            <section style="border:1px solid var(--border-color);border-radius:12px;padding:12px;display:grid;gap:10px;">
                <h3 style="margin:0;font-size:1rem;">Import Behavior</h3>
                <label style="display:flex;align-items:center;gap:10px;">
                    <input type="checkbox" data-setting="prefer-copy-external"${importDraft.preferCopyExternal ? ' checked' : ''} />
                    <span>Prefer copy (instead of move) when importing from external drives</span>
                </label>
                <label style="display:flex;align-items:center;gap:10px;">
                    <input type="checkbox" data-setting="enable-network-scan"${importDraft.enableNetworkScan ? ' checked' : ''} />
                    <span>Allow network share scan targets in quick search</span>
                </label>
            </section>
            <section style="border:1px solid var(--border-color);border-radius:12px;padding:12px;display:grid;gap:10px;">
                <h3 style="margin:0;font-size:1rem;">Scan Shortcuts</h3>
                <div style="display:flex;flex-wrap:wrap;gap:8px;">
                    <button type="button" class="action-btn launch-btn" data-settings-quick-search>Run Quick Search</button>
                    <button type="button" class="action-btn" data-settings-custom-search>Run Custom Search</button>
                    <button type="button" class="action-btn" data-settings-open-browse-tab>Open Browse Computer Tab</button>
                </div>
            </section>
            <section style="border:1px solid var(--border-color);border-radius:12px;padding:12px;display:grid;gap:10px;">
                <h3 style="margin:0;font-size:1rem;">Launcher Imports</h3>
                <div style="display:grid;gap:8px;">
                    <label style="display:flex;align-items:center;gap:10px;">
                        <input type="checkbox" data-launcher-store="steam"${importDraft.launcherStores.steam ? ' checked' : ''} />
                        <span>Steam</span>
                    </label>
                    <label style="display:flex;align-items:center;gap:10px;">
                        <input type="checkbox" data-launcher-store="epic"${importDraft.launcherStores.epic ? ' checked' : ''} />
                        <span>Epic Games</span>
                    </label>
                    <label style="display:flex;align-items:center;gap:10px;">
                        <input type="checkbox" data-launcher-store="gog"${importDraft.launcherStores.gog ? ' checked' : ''} />
                        <span>GOG Galaxy (experimental)</span>
                    </label>
                    <label style="display:flex;align-items:center;gap:10px;">
                        <span style="min-width:130px;">Discovery Mode</span>
                        <select data-launcher-discovery>
                            <option value="filesystem"${importDraft.launcherDiscoveryMode === 'filesystem' ? ' selected' : ''}>Filesystem</option>
                            <option value="api"${importDraft.launcherDiscoveryMode === 'api' ? ' selected' : ''}>API (if available)</option>
                            <option value="both"${importDraft.launcherDiscoveryMode === 'both' ? ' selected' : ''}>Both</option>
                        </select>
                    </label>
                    <div style="display:flex;flex-wrap:wrap;gap:8px;">
                        <button type="button" class="action-btn launch-btn" data-launcher-scan>Scan Launchers</button>
                    </div>
                    <div style="font-size:0.85rem;color:var(--text-secondary);">
                        Imported launcher games will open through their official launcher (Steam/Epic/GOG).
                    </div>
                </div>
            </section>
        </section>
    `;

    const renderUpdatesTab = () => {
        const status = escapeAttr(renderUpdateStatusText());
        const currentVersion = escapeAttr(updateState.currentVersion || '');
        const latestVersion = escapeAttr(updateState.latestVersion || '');
        const notes = String(updateState.releaseNotes || '').trim();
        const canDownload = !!updateState.available && !updateState.downloaded && !updateState.downloading;
        const canInstall = !!updateState.downloaded;
        const resourcesStatus = escapeAttr(renderResourcesUpdateStatusText());
        const resourcesCurrentVersion = escapeAttr(resourcesUpdateState.currentVersion || '');
        const resourcesLatestVersion = escapeAttr(resourcesUpdateState.latestVersion || '');
        const resourcesManifestUrl = escapeAttr(resourcesUpdateState.manifestUrl || '');
        const resourcesStoragePath = escapeAttr(resourcesUpdateState.storagePath || '');
        const resourcesEffectiveStoragePath = escapeAttr(resourcesUpdateState.effectiveStoragePath || resourcesUpdateState.defaultStoragePath || '');
        const resourcesDefaultStoragePath = escapeAttr(resourcesUpdateState.defaultStoragePath || '');
        const canInstallResources = !!resourcesUpdateState.available && !resourcesUpdateState.installing;
        const autoCheckOnStartup = !!(updateState.autoCheckOnStartup && resourcesUpdateState.autoCheckOnStartup);
        const autoCheckIntervalMinutes = Math.max(
            5,
            Math.min(
                1440,
                Math.round(Number(updateState.autoCheckIntervalMinutes || resourcesUpdateState.autoCheckIntervalMinutes || 60))
            )
        );
        return `
            <section style="display:grid;gap:12px;">
                <section style="border:1px solid var(--border-color);border-radius:12px;padding:12px;display:grid;gap:10px;">
                    <h3 style="margin:0;font-size:1rem;">Automatic Update Checks</h3>
                    <label style="display:flex;align-items:center;gap:10px;">
                        <input type="checkbox" data-update-auto-check-startup${autoCheckOnStartup ? ' checked' : ''} />
                        <span>Check for app/resources updates automatically</span>
                    </label>
                    <div style="display:grid;grid-template-columns:minmax(160px,280px) auto;gap:8px;align-items:center;">
                        <input
                            type="number"
                            min="5"
                            max="1440"
                            step="1"
                            data-update-auto-check-interval
                            value="${autoCheckIntervalMinutes}"
                        />
                        <button type="button" class="action-btn" data-update-action="save-auto-config">Save Auto-Check Settings</button>
                    </div>
                    <div style="font-size:0.82rem;color:var(--text-secondary);">Interval is in minutes (5 - 1440).</div>
                </section>
                <section style="border:1px solid var(--border-color);border-radius:12px;padding:12px;display:grid;gap:10px;">
                    <h3 style="margin:0;font-size:1rem;">App Updates</h3>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;">
                        <div style="font-size:0.9rem;"><strong>Current:</strong> ${currentVersion || '-'}</div>
                        <div style="font-size:0.9rem;"><strong>Latest:</strong> ${latestVersion || '-'}</div>
                    </div>
                    <div style="font-size:0.9rem;color:var(--text-secondary);" data-update-status>${status}</div>
                    <div style="font-size:0.82rem;color:var(--text-secondary);">${!updateState.currentVersion && !updateState.latestVersion ? 'If this app is not packaged or no GitHub release artifacts are published yet, check will report that directly.' : ''}</div>
                    <div style="display:flex;flex-wrap:wrap;gap:8px;">
                        <button type="button" class="action-btn" data-update-action="check"${updateState.checking ? ' disabled' : ''}>Check for Updates</button>
                        <button type="button" class="action-btn" data-update-action="download"${canDownload ? '' : ' disabled'}>Download Update</button>
                        <button type="button" class="action-btn launch-btn" data-update-action="install"${canInstall ? '' : ' disabled'}>Install & Restart</button>
                    </div>
                    ${notes ? `<pre style="margin:0;padding:10px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-primary);white-space:pre-wrap;font-family:var(--font-body);font-size:0.85rem;">${escapeAttr(notes)}</pre>` : ''}
                </section>
                <section style="border:1px solid var(--border-color);border-radius:12px;padding:12px;display:grid;gap:10px;">
                    <h3 style="margin:0;font-size:1rem;">emubro-resources Updates</h3>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;">
                        <div style="font-size:0.9rem;"><strong>Current:</strong> ${resourcesCurrentVersion || '-'}</div>
                        <div style="font-size:0.9rem;"><strong>Latest:</strong> ${resourcesLatestVersion || '-'}</div>
                    </div>
                    <div style="font-size:0.9rem;color:var(--text-secondary);" data-resource-update-status>${resourcesStatus}</div>
                    <div style="display:grid;grid-template-columns:minmax(240px,1fr) auto;gap:8px;align-items:center;">
                        <input
                            type="text"
                            data-resource-manifest-url
                            value="${resourcesManifestUrl}"
                            placeholder="https://.../manifest.json"
                            style="min-width:240px;"
                        />
                        <button type="button" class="action-btn" data-resource-update-action="save-config">Save URL + Path</button>
                    </div>
                    <div style="display:grid;grid-template-columns:minmax(240px,1fr) auto auto;gap:8px;align-items:center;">
                        <input
                            type="text"
                            data-resource-storage-path
                            value="${resourcesStoragePath}"
                            placeholder="Leave empty to use default path"
                            style="min-width:240px;"
                        />
                        <button type="button" class="action-btn" data-resource-storage-action="browse">Browse...</button>
                        <button type="button" class="action-btn" data-resource-storage-action="use-default">Use Default</button>
                    </div>
                    <div style="font-size:0.82rem;color:var(--text-secondary);">
                        Active folder: ${resourcesEffectiveStoragePath || '-'}${resourcesDefaultStoragePath ? ` | Default: ${resourcesDefaultStoragePath}` : ''}
                    </div>
                    <div style="display:flex;flex-wrap:wrap;gap:8px;">
                        <button type="button" class="action-btn" data-resource-update-action="check"${resourcesUpdateState.checking ? ' disabled' : ''}>Check Resource Updates</button>
                        <button type="button" class="action-btn launch-btn" data-resource-update-action="install"${canInstallResources ? '' : ' disabled'}>Install Resource Update</button>
                    </div>
                </section>
            </section>
        `;
    };

    const renderGamepadTab = () => {
        const platformSections = platformBindingRows.map((row) => {
            const shortName = String(row?.shortName || '').trim().toLowerCase();
            if (!shortName) return '';
            const displayName = String(row?.platform || shortName.toUpperCase()).trim();
            const current = normalizeInputBindingProfile(platformGamepadDraft[shortName] || {});
            return `
                <details style="border:1px solid var(--border-color);border-radius:12px;padding:10px;background:color-mix(in srgb, var(--bg-primary), transparent 14%);">
                    <summary style="cursor:pointer;font-weight:650;">${escapeAttr(displayName)} (${escapeAttr(shortName)})</summary>
                    <div style="display:grid;gap:8px;margin-top:10px;">
                        <div style="display:grid;grid-template-columns:minmax(120px,220px) minmax(160px,1fr) minmax(160px,1fr);gap:8px;align-items:center;padding:0 0 4px 0;">
                            <span style="font-size:0.8rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.04em;">Action</span>
                            <span style="font-size:0.8rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.04em;">Keyboard</span>
                            <span style="font-size:0.8rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.04em;">Gamepad</span>
                        </div>
                        ${GAMEPAD_BINDING_ACTIONS.map((action) => `
                            <label style="display:grid;grid-template-columns:minmax(120px,220px) minmax(160px,1fr) minmax(160px,1fr);gap:8px;align-items:center;">
                                <span style="font-size:0.85rem;color:var(--text-secondary);">${GAMEPAD_BINDING_LABELS[action] || action}</span>
                                <input
                                    type="text"
                                    data-platform-gamepad-input="${escapeAttr(shortName)}"
                                    data-platform-gamepad-action="${escapeAttr(action)}"
                                    data-platform-gamepad-channel="keyboard"
                                    value="${escapeAttr(current?.keyboard?.[action] || '')}"
                                    placeholder="e.g. key:Space, 37"
                                />
                                <input
                                    type="text"
                                    data-platform-gamepad-input="${escapeAttr(shortName)}"
                                    data-platform-gamepad-action="${escapeAttr(action)}"
                                    data-platform-gamepad-channel="gamepad"
                                    value="${escapeAttr(current?.gamepad?.[action] || '')}"
                                    placeholder="e.g. button0, axis1+, 32776"
                                />
                            </label>
                        `).join('')}
                        <div style="display:flex;justify-content:flex-end;">
                            <button type="button" class="action-btn remove-btn small" data-platform-gamepad-clear="${escapeAttr(shortName)}">Clear ${escapeAttr(displayName)}</button>
                        </div>
                    </div>
                </details>
            `;
        }).join('');

        return `
            <section style="display:grid;gap:12px;">
                <section style="border:1px solid var(--border-color);border-radius:12px;padding:12px;display:grid;gap:10px;">
                    <h3 style="margin:0;font-size:1rem;">Platform Gamepad Profiles</h3>
                    <p style="margin:0;color:var(--text-secondary);font-size:0.9rem;">
                        These bindings apply to all emulators of a platform by default. Emulator-specific overrides can be set in Emulator Edit.
                    </p>
                    <div style="display:grid;gap:8px;">
                        ${platformSections || '<div style="opacity:0.7;font-size:0.92rem;">No platforms available yet.</div>'}
                    </div>
                </section>
            </section>
        `;
    };

    const render = () => {
        let tabContent = '';
        if (activeTab === 'general') {
            tabContent = renderGeneralTab();
        } else if (activeTab === 'llm') {
            tabContent = renderLlmTab();
        } else if (activeTab === 'gamepad') {
            tabContent = renderGamepadTab();
        } else if (activeTab === 'library-paths') {
            tabContent = `
                <div style="display:grid;gap:12px;">
                    ${section(
                        'scanFolders',
                        'Scan Folders',
                        'Scanned when you click Search Games. Supports local folders and network shares.',
                        '\\\\server\\share\\games or D:\\\\ROMS',
                        'Pick Folder',
                        draft.scanFolders
                    )}
                    ${section(
                        'gameFolders',
                        'Managed Game Folders',
                        'Destination folders used when importing from USB/CD/network and choosing Copy/Move.',
                        'D:\\\\EmuLibrary\\\\Games',
                        'Pick Folder',
                        draft.gameFolders
                    )}
                    ${section(
                        'emulatorFolders',
                        'Managed Emulator Folders',
                        'Optional destination folders for emulator executables.',
                        'D:\\\\EmuLibrary\\\\Emulators',
                        'Pick Folder',
                        draft.emulatorFolders
                    )}
                </div>
            `;
        } else {
            tabContent = renderImportTab();
        }
        if (activeTab === 'updates') {
            tabContent = renderUpdatesTab();
        }

        modal.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;">
                <h2 style="margin:0;font-size:1.15rem;">Settings</h2>
                <button type="button" class="close-btn" data-close-modal>&times;</button>
            </div>
            <p style="margin:0 0 12px 0;color:var(--text-secondary);font-size:0.92rem;">
                Configure library behavior, scanning paths, and import defaults.
            </p>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
                <button type="button" class="action-btn${activeTab === 'general' ? ' launch-btn' : ''}" data-settings-tab="general">General</button>
                <button type="button" class="action-btn${activeTab === 'llm' ? ' launch-btn' : ''}" data-settings-tab="llm">AI / LLM</button>
                <button type="button" class="action-btn${activeTab === 'gamepad' ? ' launch-btn' : ''}" data-settings-tab="gamepad">Gamepad</button>
                <button type="button" class="action-btn${activeTab === 'library-paths' ? ' launch-btn' : ''}" data-settings-tab="library-paths">Library Paths</button>
                <button type="button" class="action-btn${activeTab === 'import' ? ' launch-btn' : ''}" data-settings-tab="import">Import & Scan</button>
                <button type="button" class="action-btn${activeTab === 'updates' ? ' launch-btn' : ''}" data-settings-tab="updates">Updates</button>
            </div>
            <div style="display:grid;gap:12px;">
                ${tabContent}
            </div>
            <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:14px;flex-wrap:wrap;">
                <button type="button" class="action-btn" data-close-modal>Cancel</button>
                <button type="button" class="action-btn launch-btn" data-save-settings>Save</button>
            </div>
        `;

        const closeBtns = modal.querySelectorAll('[data-close-modal]');
        closeBtns.forEach((btn) => btn.addEventListener('click', closeModal));

        modal.querySelectorAll('[data-settings-tab]').forEach((btn) => {
            btn.addEventListener('click', () => {
                activeTab = String(btn.dataset.settingsTab || 'general');
                render();
            });
        });

        const defaultSectionSelect = modal.querySelector('[data-setting="default-section"]');
        if (defaultSectionSelect) {
            defaultSectionSelect.addEventListener('change', () => {
                generalDraft.defaultSection = normalizeLibrarySection(defaultSectionSelect.value || 'all');
            });
        }

        const defaultViewSelect = modal.querySelector('[data-setting="default-view"]');
        if (defaultViewSelect) {
            defaultViewSelect.addEventListener('change', () => {
                generalDraft.defaultView = String(defaultViewSelect.value || 'cover').toLowerCase();
            });
        }

        const showIndicatorToggle = modal.querySelector('[data-setting="show-load-indicator"]');
        if (showIndicatorToggle) {
            showIndicatorToggle.addEventListener('change', () => {
                generalDraft.showLoadIndicator = !!showIndicatorToggle.checked;
            });
        }

        const autoOpenFooterToggle = modal.querySelector('[data-setting="auto-open-footer"]');
        if (autoOpenFooterToggle) {
            autoOpenFooterToggle.addEventListener('change', () => {
                generalDraft.autoOpenFooter = !!autoOpenFooterToggle.checked;
            });
        }

        const llmHelpersToggle = modal.querySelector('[data-setting="llm-helpers-enabled"]');
        if (llmHelpersToggle) {
            llmHelpersToggle.addEventListener('change', () => {
                const shouldEnable = !!llmHelpersToggle.checked;
                if (!shouldEnable) {
                    const confirmed = confirmDisableLlmHelpersFlow();
                    if (!confirmed) {
                        llmHelpersToggle.checked = true;
                        generalDraft.llmHelpersEnabled = true;
                        return;
                    }
                }
                generalDraft.llmHelpersEnabled = shouldEnable;
                if (!generalDraft.llmHelpersEnabled && generalDraft.defaultSection === SUGGESTED_SECTION_KEY) {
                    generalDraft.defaultSection = 'all';
                }
                render();
            });
        }

        const llmAllowUnknownTagsToggle = modal.querySelector('[data-setting="llm-allow-unknown-tags"]');
        if (llmAllowUnknownTagsToggle) {
            llmAllowUnknownTagsToggle.addEventListener('change', () => {
                generalDraft.llmAllowUnknownTags = !!llmAllowUnknownTagsToggle.checked;
            });
        }

        const preferCopyToggle = modal.querySelector('[data-setting="prefer-copy-external"]');
        if (preferCopyToggle) {
            preferCopyToggle.addEventListener('change', () => {
                importDraft.preferCopyExternal = !!preferCopyToggle.checked;
            });
        }

        const networkScanToggle = modal.querySelector('[data-setting="enable-network-scan"]');
        if (networkScanToggle) {
            networkScanToggle.addEventListener('change', () => {
                importDraft.enableNetworkScan = !!networkScanToggle.checked;
            });
        }

        modal.querySelectorAll('[data-launcher-store]').forEach((input) => {
            input.addEventListener('change', () => {
                const key = String(input.dataset.launcherStore || '').trim().toLowerCase();
                if (!key) return;
                importDraft.launcherStores[key] = !!input.checked;
            });
        });

        const launcherDiscoverySelect = modal.querySelector('[data-launcher-discovery]');
        if (launcherDiscoverySelect) {
            launcherDiscoverySelect.addEventListener('change', () => {
                importDraft.launcherDiscoveryMode = String(launcherDiscoverySelect.value || 'filesystem').toLowerCase();
            });
        }

        const launcherScanBtn = modal.querySelector('[data-launcher-scan]');
        if (launcherScanBtn) {
            launcherScanBtn.addEventListener('click', async () => {
                await openLauncherImportModal();
            });
        }

        const llmProviderSelect = modal.querySelector('[data-llm="provider"]');
        if (llmProviderSelect) {
            llmProviderSelect.addEventListener('change', () => {
                llmDraft.provider = llmProviderSelect.value;
                render();
            });
        }
        const llmModeSelect = modal.querySelector('[data-llm="mode"]');
        if (llmModeSelect) {
            llmModeSelect.addEventListener('change', () => {
                llmDraft.llmMode = normalizeLlmMode(llmModeSelect.value);
                render();
            });
        }
        const llmModelInput = modal.querySelector('[data-llm="model"]');
        if (llmModelInput) {
            llmModelInput.addEventListener('input', () => {
                llmDraft.models[llmDraft.provider] = llmModelInput.value;
            });
        }
        const llmModelSelect = modal.querySelector('[data-llm="model-select"]');
        if (llmModelSelect) {
            llmModelSelect.addEventListener('change', () => {
                const val = llmModelSelect.value;
                llmDraft.models[llmDraft.provider] = val;
                if (llmModelInput) llmModelInput.value = val;
            });
        }
        const llmBaseUrlInput = modal.querySelector('[data-llm="base-url"]');
        if (llmBaseUrlInput) {
            llmBaseUrlInput.addEventListener('input', () => {
                llmDraft.baseUrls[llmDraft.provider] = llmBaseUrlInput.value;
            });
        }
        const llmApiKeyInput = modal.querySelector('[data-llm="api-key"]');
        if (llmApiKeyInput) {
            llmApiKeyInput.addEventListener('input', () => {
                llmDraft.apiKeys[llmDraft.provider] = llmApiKeyInput.value;
            });
        }
        const llmRelayPortInput = modal.querySelector('[data-llm="relay-port"]');
        if (llmRelayPortInput) {
            llmRelayPortInput.addEventListener('input', () => {
                llmDraft.relay.port = normalizeRelayPort(llmRelayPortInput.value, 42141);
            });
        }
        const llmRelayEnabledInput = modal.querySelector('[data-llm="relay-enabled"]');
        if (llmRelayEnabledInput) {
            llmRelayEnabledInput.addEventListener('change', () => {
                llmDraft.relay.enabled = !!llmRelayEnabledInput.checked;
                render();
            });
        }
        const llmRelayAccessModeInput = modal.querySelector('[data-llm="relay-access-mode"]');
        if (llmRelayAccessModeInput) {
            llmRelayAccessModeInput.addEventListener('change', () => {
                llmDraft.relay.accessMode = normalizeRelayAccessMode(llmRelayAccessModeInput.value);
            });
        }
        const llmRelayTokenInput = modal.querySelector('[data-llm="relay-token"]');
        if (llmRelayTokenInput) {
            llmRelayTokenInput.addEventListener('input', () => {
                llmDraft.relay.authToken = String(llmRelayTokenInput.value || '').trim();
            });
        }
        const llmRelayWhitelistInput = modal.querySelector('[data-llm="relay-whitelist"]');
        if (llmRelayWhitelistInput) {
            llmRelayWhitelistInput.addEventListener('input', () => {
                llmDraft.relay.whitelist = normalizeRelayAddressList(llmRelayWhitelistInput.value);
            });
        }
        const llmRelayBlacklistInput = modal.querySelector('[data-llm="relay-blacklist"]');
        if (llmRelayBlacklistInput) {
            llmRelayBlacklistInput.addEventListener('input', () => {
                llmDraft.relay.blacklist = normalizeRelayAddressList(llmRelayBlacklistInput.value);
            });
        }
        const llmClientHostUrlInput = modal.querySelector('[data-llm="client-host-url"]');
        if (llmClientHostUrlInput) {
            llmClientHostUrlInput.addEventListener('input', () => {
                llmDraft.relay.hostUrl = String(llmClientHostUrlInput.value || '').trim();
            });
        }
        const llmRefreshBtn = modal.querySelector('[data-llm="refresh-models"]');
        if (llmRefreshBtn && llmModelSelect) {
            llmRefreshBtn.addEventListener('click', async () => {
                const statusEl = modal.querySelector('[data-llm="status"]');
                llmRefreshBtn.disabled = true;
                if (statusEl) statusEl.textContent = 'Fetching models...';
                try {
                    const result = await emubro.invoke('suggestions:list-ollama-models', { 
                        baseUrl: llmDraft.baseUrls['ollama'],
                        llmMode: normalizeLlmMode(llmDraft.llmMode),
                        relayHostUrl: String(llmDraft.relay?.hostUrl || '').trim(),
                        relayAuthToken: String(llmDraft.relay?.authToken || '').trim(),
                        relayPort: normalizeRelayPort(llmDraft.relay?.port, 42141)
                    });
                    if (result?.success && Array.isArray(result.models)) {
                        const current = llmDraft.models['ollama'] || '';
                        const deduped = Array.from(new Set(result.models.map(m => String(m).trim()).filter(Boolean)));
                        if (current && !deduped.includes(current)) deduped.unshift(current);
                        
                        llmModelSelect.innerHTML = deduped.map(m => 
                            `<option value="${m}"${m === current ? ' selected' : ''}>${m}</option>`
                        ).join('');
                        
                        if (deduped.length > 0 && !current) {
                            llmDraft.models['ollama'] = deduped[0];
                            if (llmModelInput) llmModelInput.value = deduped[0];
                        }
                        if (statusEl) statusEl.textContent = `Found ${deduped.length} model(s).`;
                    } else {
                        if (statusEl) statusEl.textContent = 'Failed to fetch models.';
                    }
                } catch (e) {
                    if (statusEl) statusEl.textContent = 'Error fetching models.';
                } finally {
                    llmRefreshBtn.disabled = false;
                }
            });
        }

        const llmScanNetworkBtn = modal.querySelector('[data-llm="scan-network"]');
        if (llmScanNetworkBtn) {
            llmScanNetworkBtn.addEventListener('click', async () => {
                llmScanNetworkBtn.disabled = true;
                llmRelayScanStatus = 'Scanning local network...';
                render();
                try {
                    const result = await emubro.invoke('suggestions:relay:scan-network', {
                        port: normalizeRelayPort(llmDraft.relay?.port, 42141),
                        relayAuthToken: String(llmDraft.relay?.authToken || '').trim(),
                        timeoutMs: 280
                    });
                    if (!result?.success) {
                        llmRelayScanStatus = String(result?.message || 'Network scan failed.');
                        llmRelayScanResults = [];
                        render();
                        return;
                    }

                    llmRelayScanResults = Array.isArray(result.hosts) ? result.hosts : [];
                    llmRelayScanStatus = llmRelayScanResults.length
                        ? `Found ${llmRelayScanResults.length} host(s).`
                        : 'No emuBro hosts found on the local network.';
                    render();
                } catch (error) {
                    llmRelayScanStatus = String(error?.message || error || 'Network scan failed.');
                    llmRelayScanResults = [];
                    render();
                } finally {
                    llmScanNetworkBtn.disabled = false;
                }
            });
        }
        const llmRefreshConnectionsBtn = modal.querySelector('[data-llm="refresh-connections"]');
        if (llmRefreshConnectionsBtn) {
            llmRefreshConnectionsBtn.addEventListener('click', async () => {
                llmRefreshConnectionsBtn.disabled = true;
                try {
                    await refreshRelayHostData({ skipRender: false });
                } finally {
                    llmRefreshConnectionsBtn.disabled = false;
                }
            });
        }

        modal.querySelectorAll('[data-llm-pick-host]').forEach((button) => {
            button.addEventListener('click', () => {
                const url = String(button.getAttribute('data-llm-pick-host') || '').trim();
                if (!url) return;
                llmDraft.relay.hostUrl = url;
                llmRelayScanStatus = `Selected host: ${url}`;
                render();
            });
        });

        const openThemeBtn = modal.querySelector('[data-settings-open-theme]');
        if (openThemeBtn) openThemeBtn.addEventListener('click', () => openThemeManager());

        const openLanguageBtn = modal.querySelector('[data-settings-open-language]');
        if (openLanguageBtn) openLanguageBtn.addEventListener('click', () => openLanguageManager());

        const openProfileBtn = modal.querySelector('[data-settings-open-profile]');
        if (openProfileBtn) openProfileBtn.addEventListener('click', () => openProfileModal());

        const quickSearchBtn = modal.querySelector('[data-settings-quick-search]');
        if (quickSearchBtn) quickSearchBtn.addEventListener('click', async () => runBrowseSearch('quick', { scope: getBrowseScopeSelection() }));

        const customSearchBtn = modal.querySelector('[data-settings-custom-search]');
        if (customSearchBtn) customSearchBtn.addEventListener('click', async () => runBrowseSearch('custom', { scope: getBrowseScopeSelection() }));

        const openBrowseTabBtn = modal.querySelector('[data-settings-open-browse-tab]');
        if (openBrowseTabBtn) {
            openBrowseTabBtn.addEventListener('click', () => {
                closeModal();
                openFooterPanel('browse');
            });
        }

        modal.querySelectorAll('[data-update-action]').forEach((button) => {
            button.addEventListener('click', async () => {
                const action = String(button.dataset.updateAction || '').trim().toLowerCase();
                if (!action) return;
                button.disabled = true;
                try {
                    let result = null;
                    if (action === 'save-auto-config') {
                        const startupToggle = modal.querySelector('[data-update-auto-check-startup]');
                        const intervalInput = modal.querySelector('[data-update-auto-check-interval]');
                        const autoCheckOnStartup = !!startupToggle?.checked;
                        const autoCheckIntervalMinutes = Number(intervalInput?.value || 60);
                        const appConfigResult = await emubro.updates?.setConfig?.({
                            autoCheckOnStartup,
                            autoCheckIntervalMinutes
                        });
                        const resourcesConfigResult = await emubro.resourcesUpdates?.setConfig?.({
                            autoCheckOnStartup,
                            autoCheckIntervalMinutes
                        });
                        if (appConfigResult && typeof appConfigResult === 'object') applyUpdateState(appConfigResult);
                        if (resourcesConfigResult && typeof resourcesConfigResult === 'object') applyResourcesUpdateState(resourcesConfigResult);
                        result = { success: true };
                    }
                    if (action === 'check') result = await emubro.updates?.check?.();
                    if (action === 'download') result = await emubro.updates?.download?.();
                    if (action === 'install') result = await emubro.updates?.install?.();
                    if (result && typeof result === 'object') {
                        applyUpdateState(result);
                        if (result.success === false && result.message) {
                            applyUpdateState({ lastError: String(result.message) });
                        }
                    }
                    render();
                } catch (error) {
                    applyUpdateState({ lastError: String(error?.message || error || 'Update action failed') });
                    render();
                } finally {
                    button.disabled = false;
                }
            });
        });

        modal.querySelectorAll('[data-resource-update-action]').forEach((button) => {
            button.addEventListener('click', async () => {
                const action = String(button.dataset.resourceUpdateAction || '').trim().toLowerCase();
                if (!action) return;
                button.disabled = true;
                try {
                    let result = null;
                    if (action === 'save-config') {
                        const urlInput = modal.querySelector('[data-resource-manifest-url]');
                        const storageInput = modal.querySelector('[data-resource-storage-path]');
                        result = await emubro.resourcesUpdates?.setConfig?.({
                            manifestUrl: String(urlInput?.value || '').trim(),
                            storagePath: String(storageInput?.value || '').trim(),
                            autoCheckOnStartup: resourcesUpdateState.autoCheckOnStartup,
                            autoCheckIntervalMinutes: resourcesUpdateState.autoCheckIntervalMinutes
                        });
                    }
                    if (action === 'check') result = await emubro.resourcesUpdates?.check?.();
                    if (action === 'install') result = await emubro.resourcesUpdates?.install?.();
                    if (result && typeof result === 'object') {
                        applyResourcesUpdateState(result);
                        if (result.success === false && result.message) {
                            applyResourcesUpdateState({ lastError: String(result.message) });
                        }
                    }
                    render();
                } catch (error) {
                    applyResourcesUpdateState({ lastError: String(error?.message || error || 'Resource update action failed') });
                    render();
                } finally {
                    button.disabled = false;
                }
            });
        });

        modal.querySelectorAll('[data-resource-storage-action]').forEach((button) => {
            button.addEventListener('click', async () => {
                const action = String(button.dataset.resourceStorageAction || '').trim().toLowerCase();
                if (!action) return;
                const storageInput = modal.querySelector('[data-resource-storage-path]');
                if (!storageInput) return;
                if (action === 'use-default') {
                    storageInput.value = '';
                    return;
                }
                if (action !== 'browse') return;

                const defaultPath = String(
                    storageInput.value
                    || resourcesUpdateState.storagePath
                    || resourcesUpdateState.effectiveStoragePath
                    || resourcesUpdateState.defaultStoragePath
                    || ''
                ).trim();
                const pick = await emubro.invoke('open-file-dialog', {
                    title: 'Select emubro-resources folder',
                    properties: ['openDirectory', 'createDirectory'],
                    defaultPath
                });
                if (!pick || pick.canceled || !Array.isArray(pick.filePaths) || pick.filePaths.length === 0) return;
                storageInput.value = String(pick.filePaths[0] || '').trim();
            });
        });

        modal.querySelectorAll('[data-platform-gamepad-input]').forEach((input) => {
            input.addEventListener('input', () => {
                const platformShortName = String(input.dataset.platformGamepadInput || '').trim().toLowerCase();
                const action = String(input.dataset.platformGamepadAction || '').trim();
                const channel = String(input.dataset.platformGamepadChannel || '').trim().toLowerCase();
                if (!platformShortName || !action || (channel !== 'keyboard' && channel !== 'gamepad')) return;
                const nextBindings = normalizeInputBindingProfile(platformGamepadDraft[platformShortName] || {});
                const value = String(input.value || '').trim();
                if (value) nextBindings[channel][action] = value;
                else delete nextBindings[channel][action];
                platformGamepadDraft[platformShortName] = normalizeInputBindingProfile(nextBindings);
                const nextProfile = platformGamepadDraft[platformShortName];
                const hasKeyboardBindings = Object.keys(nextProfile.keyboard || {}).length > 0;
                const hasGamepadBindings = Object.keys(nextProfile.gamepad || {}).length > 0;
                if (!hasKeyboardBindings && !hasGamepadBindings) {
                    delete platformGamepadDraft[platformShortName];
                }
            });
        });

        modal.querySelectorAll('[data-platform-gamepad-clear]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const platformShortName = String(btn.dataset.platformGamepadClear || '').trim().toLowerCase();
                if (!platformShortName) return;
                delete platformGamepadDraft[platformShortName];
                render();
            });
        });

        const attachSectionHandlers = (key) => {
            const listWrap = modal.querySelector(`[data-list="${key}"]`);
            if (listWrap) {
                listWrap.querySelectorAll('[data-remove-index]').forEach((btn) => {
                    btn.addEventListener('click', () => {
                        const idx = Number(btn.dataset.removeIndex);
                        if (!Number.isFinite(idx) || idx < 0) return;
                        draft[key] = draft[key].filter((_p, i) => i !== idx);
                        render();
                    });
                });
                listWrap.querySelectorAll('[data-relocate-index]').forEach((btn) => {
                    btn.addEventListener('click', async () => {
                        const idx = Number(btn.dataset.relocateIndex);
                        if (!Number.isFinite(idx) || idx < 0) return;
                        const sourcePath = String(draft[key]?.[idx] || '').trim();
                        if (!sourcePath) return;

                        const pick = await emubro.invoke('open-file-dialog', {
                            title: 'Select destination folder',
                            properties: ['openDirectory', 'createDirectory'],
                            defaultPath: sourcePath
                        });
                        if (!pick || pick.canceled || !Array.isArray(pick.filePaths) || pick.filePaths.length === 0) return;

                        const targetPath = String(pick.filePaths[0] || '').trim();
                        if (!targetPath || targetPath.toLowerCase() === sourcePath.toLowerCase()) return;

                        btn.disabled = true;
                        const previousLabel = btn.textContent;
                        btn.textContent = 'Moving...';
                        try {
                            const previewResult = await emubro.invoke('settings:preview-relocate-managed-folder', {
                                kind: key,
                                sourcePath,
                                targetPath
                            });
                            if (!previewResult?.success) {
                                throw new Error(previewResult?.message || 'Failed to preview relocation.');
                            }

                            const confirmResult = await emubro.invoke('settings:confirm-relocate-preview', {
                                kind: key,
                                sourcePath,
                                targetPath,
                                preview: previewResult?.preview || {}
                            });
                            if (!confirmResult?.success) {
                                throw new Error(confirmResult?.message || 'Failed to confirm relocation.');
                            }
                            if (!confirmResult?.proceed) {
                                addFooterNotification('Relocation canceled.', 'warning');
                                return;
                            }

                            const result = await emubro.invoke('settings:relocate-managed-folder', {
                                kind: key,
                                sourcePath,
                                targetPath,
                                conflictPolicy: String(confirmResult?.policy || '').trim()
                            });
                            if (!result?.success) {
                                if (result?.canceled) {
                                    addFooterNotification('Relocation canceled.', 'warning');
                                    return;
                                }
                                throw new Error(result?.message || 'Failed to relocate folder.');
                            }

                            const nextSettings = result?.settings;
                            if (nextSettings && typeof nextSettings === 'object') {
                                draft.scanFolders = normalizePathList(nextSettings.scanFolders);
                                draft.gameFolders = normalizePathList(nextSettings.gameFolders);
                                draft.emulatorFolders = normalizePathList(nextSettings.emulatorFolders);
                            } else {
                                draft[key] = normalizePathList(
                                    draft[key].map((entryPath, entryIndex) => entryIndex === idx ? targetPath : entryPath)
                                );
                            }

                            const stats = result?.stats || {};
                            addFooterNotification(
                                `Relocated folder. Moved: ${Number(stats.moved || 0)}, replaced: ${Number(stats.replaced || 0)}, kept both: ${Number(stats.keptBoth || 0)}, skipped: ${Number(stats.skipped || 0)}.`,
                                'success'
                            );
                            render();
                        } catch (error) {
                            alert(error?.message || 'Failed to relocate managed folder.');
                        } finally {
                            btn.disabled = false;
                            btn.textContent = previousLabel;
                        }
                    });
                });
            }

            const addManualBtn = modal.querySelector(`[data-add-manual="${key}"]`);
            const input = modal.querySelector(`[data-input="${key}"]`);
            if (addManualBtn && input) {
                addManualBtn.addEventListener('click', () => {
                    const val = String(input.value || '').trim();
                    if (!val) return;
                    draft[key] = normalizePathList([...draft[key], val]);
                    render();
                });
            }

            const addBrowseBtn = modal.querySelector(`[data-add-browse="${key}"]`);
            if (addBrowseBtn) {
                addBrowseBtn.addEventListener('click', async () => {
                    const pick = await emubro.invoke('open-file-dialog', {
                        title: 'Select folder',
                        properties: ['openDirectory']
                    });
                    if (!pick || pick.canceled || !Array.isArray(pick.filePaths) || pick.filePaths.length === 0) return;
                    draft[key] = normalizePathList([...draft[key], pick.filePaths[0]]);
                    render();
                });
            }
        };

        attachSectionHandlers('scanFolders');
        attachSectionHandlers('gameFolders');
        attachSectionHandlers('emulatorFolders');

        const saveBtn = modal.querySelector('[data-save-settings]');
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                try {
                    await saveLibraryPathSettings(draft);
                    localStorage.setItem('emuBro.defaultLibrarySection', generalDraft.defaultSection);
                    localStorage.setItem('emuBro.defaultLibraryView', generalDraft.defaultView);
                    localStorage.setItem('emuBro.showLoadIndicator', generalDraft.showLoadIndicator ? 'true' : 'false');
                    localStorage.setItem('emuBro.autoOpenFooter', generalDraft.autoOpenFooter ? 'true' : 'false');
                    setLlmHelpersEnabled(generalDraft.llmHelpersEnabled, { persist: true, rerender: false });
                    setLlmAllowUnknownTagsEnabled(generalDraft.llmAllowUnknownTags, { persist: true });
                    localStorage.setItem('emuBro.preferCopyExternal', importDraft.preferCopyExternal ? 'true' : 'false');
                    localStorage.setItem('emuBro.enableNetworkScan', importDraft.enableNetworkScan ? 'true' : 'false');
                    localStorage.setItem('emuBro.launcherImportSteam', importDraft.launcherStores.steam ? 'true' : 'false');
                    localStorage.setItem('emuBro.launcherImportEpic', importDraft.launcherStores.epic ? 'true' : 'false');
                    localStorage.setItem('emuBro.launcherImportGog', importDraft.launcherStores.gog ? 'true' : 'false');
                    localStorage.setItem('emuBro.launcherImportMode', importDraft.launcherDiscoveryMode || 'filesystem');
                    savePlatformGamepadBindingsMap(platformGamepadDraft, localStorage);
                    
                    if (typeof options.saveSuggestionSettings === 'function') {
                        options.saveSuggestionSettings(llmDraft);
                    }
                    try {
                        const relaySyncResult = await emubro.invoke('suggestions:relay:sync-host-settings', {
                            provider: llmDraft.provider,
                            models: llmDraft.models,
                            baseUrls: llmDraft.baseUrls,
                            apiKeys: llmDraft.apiKeys,
                            relay: {
                                enabled: !!llmDraft.relay?.enabled,
                                port: normalizeRelayPort(llmDraft.relay?.port, 42141),
                                authToken: String(llmDraft.relay?.authToken || '').trim(),
                                accessMode: normalizeRelayAccessMode(llmDraft.relay?.accessMode),
                                whitelist: normalizeRelayAddressList(llmDraft.relay?.whitelist),
                                blacklist: normalizeRelayAddressList(llmDraft.relay?.blacklist)
                            }
                        });
                        if (relaySyncResult?.success) {
                            llmRelayHostStatus = relaySyncResult;
                        }
                    } catch (_error) {}

                    activeLibrarySection = normalizeLibrarySection(generalDraft.defaultSection || 'all');
                    setActiveLibrarySectionState(activeLibrarySection);
                    setActiveViewButton(generalDraft.defaultView || 'cover');
                    if (isLibraryTopSection()) {
                        await setActiveLibrarySection(activeLibrarySection);
                    }
                    closeModal();
                    addFooterNotification('Settings saved.', 'success');
                } catch (error) {
                    alert(error?.message || 'Failed to save settings.');
                }
            });
        }
    };

    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) closeModal();
    });

    try {
        if (typeof emubro?.onUpdateStatus === 'function') {
            detachUpdateListener = emubro.onUpdateStatus((payload = {}) => {
                applyUpdateState(payload);
                if (overlay.isConnected) render();
            });
        }
        if (typeof emubro?.onResourcesUpdateStatus === 'function') {
            detachResourcesUpdateListener = emubro.onResourcesUpdateStatus((payload = {}) => {
                applyResourcesUpdateState(payload);
                if (overlay.isConnected) render();
            });
        }
        const initialUpdateState = await emubro?.updates?.getState?.();
        if (initialUpdateState && typeof initialUpdateState === 'object') {
            applyUpdateState(initialUpdateState);
        }
        const appUpdateConfig = await emubro?.updates?.getConfig?.();
        if (appUpdateConfig && typeof appUpdateConfig === 'object') {
            applyUpdateState(appUpdateConfig);
        }
        const initialResourceUpdateState = await emubro?.resourcesUpdates?.getState?.();
        if (initialResourceUpdateState && typeof initialResourceUpdateState === 'object') {
            applyResourcesUpdateState(initialResourceUpdateState);
        }
        const resourceConfig = await emubro?.resourcesUpdates?.getConfig?.();
        if (resourceConfig && typeof resourceConfig === 'object') {
            applyResourcesUpdateState(resourceConfig);
        }
    } catch (_error) {}

    render();
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    refreshRelayHostData({ skipRender: false }).catch(() => {});
}
