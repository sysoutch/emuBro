import {
    GAMEPAD_BINDING_ACTIONS,
    GAMEPAD_BINDING_LABELS,
    normalizeInputBindingProfile,
    loadPlatformGamepadBindingsMap,
    savePlatformGamepadBindingsMap
} from '../gamepad-binding-utils';
import {
    renderGeneralTab,
    renderImportTab,
    renderUpdatesTab,
    renderGamepadTab,
    renderLlmTab,
    renderPathList,
    renderPathSection
} from './library-settings-modal/tab-renderers.js';
import { openLauncherImportModal as openLauncherImportModalDialog } from './library-settings-modal/launcher-import-modal.js';
import { resolveLibrarySettingsModalOptions } from './library-settings-modal/options-resolver.js';
import {
    normalizeLlmMode,
    normalizeRelayAccessMode,
    normalizeRelayAddressList,
    normalizeRelayPort,
    createInitialLlmDraft
} from './library-settings-modal/llm-utils.js';
import { bindCoreModalHandlers } from './library-settings-modal/core-handlers.js';
import { bindLlmHandlers } from './library-settings-modal/llm-handlers.js';
import { bindUpdateActionHandlers } from './library-settings-modal/update-actions.js';
import { attachPathSectionHandlers } from './library-settings-modal/path-section-handlers.js';
import { bindSaveSettingsHandler } from './library-settings-modal/save-settings.js';

export async function openLibraryPathSettingsModal(options = {}) {
    const resolved = resolveLibrarySettingsModalOptions(options);
    const {
        emubro,
        getLibraryPathSettings,
        saveLibraryPathSettings,
        normalizePathList,
        normalizeLibrarySection,
        getActiveLibrarySection,
        setActiveLibrarySectionState,
        isLibraryTopSection,
        confirmDisableLlmHelpersFlow,
        setLlmHelpersEnabled,
        setLlmAllowUnknownTagsEnabled,
        openThemeManager,
        openLanguageManager,
        openProfileModal,
        runBrowseSearch,
        getBrowseScopeSelection,
        openFooterPanel,
        addFooterNotification,
        setActiveViewButton,
        setActiveLibrarySection,
        loadSuggestionSettings,
        saveSuggestionSettings,
        refreshGamesAfterImport,
        initialTab,
        LLM_HELPERS_ENABLED_KEY,
        LLM_ALLOW_UNKNOWN_TAGS_KEY,
        SUGGESTED_SECTION_KEY
    } = resolved;

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
    const llmSettings = loadSuggestionSettings();
    const llmDraft = createInitialLlmDraft(llmSettings);
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
    const allowedTabs = new Set(['general', 'llm', 'gamepad', 'library-paths', 'import', 'updates']);
    let activeTab = allowedTabs.has(initialTab) ? initialTab : 'general';
    let updateState = {
        checking: false,
        downloading: false,
        installing: false,
        downloaded: false,
        available: false,
        currentVersion: '',
        latestVersion: '',
        releaseNotes: '',
        downloadFileName: '',
        downloadedFilePath: '',
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
        missingLocalResources: false,
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
    let stopLiveUpdateStatePolling = null;

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

    const renderList = (key, items, emptyLabel) => renderPathList({ key, items, emptyLabel });

    const escapeAttr = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const openLauncherImportModal = async () => {
        await openLauncherImportModalDialog({
            emubro,
            importDraft,
            escapeAttr,
            refreshGamesAfterImport,
            addFooterNotification
        });
    };

    const closeModal = () => {
        try {
            if (typeof detachUpdateListener === 'function') detachUpdateListener();
        } catch (_error) {}
        try {
            if (typeof detachResourcesUpdateListener === 'function') detachResourcesUpdateListener();
        } catch (_error) {}
        try {
            if (typeof stopLiveUpdateStatePolling === 'function') stopLiveUpdateStatePolling();
        } catch (_error) {}
        overlay.remove();
    };

    const applyUpdateState = (payload = {}) => {
        const hasChecking = Object.prototype.hasOwnProperty.call(payload || {}, 'checking');
        const hasDownloading = Object.prototype.hasOwnProperty.call(payload || {}, 'downloading');
        const hasInstalling = Object.prototype.hasOwnProperty.call(payload || {}, 'installing');
        const hasDownloaded = Object.prototype.hasOwnProperty.call(payload || {}, 'downloaded');
        const hasAvailable = Object.prototype.hasOwnProperty.call(payload || {}, 'available');
        const hasDownloadFileName = Object.prototype.hasOwnProperty.call(payload || {}, 'downloadFileName');
        const hasDownloadedFilePath = Object.prototype.hasOwnProperty.call(payload || {}, 'downloadedFilePath');
        updateState = {
            ...updateState,
            checking: hasChecking ? !!payload?.checking : !!updateState.checking,
            downloading: hasDownloading ? !!payload?.downloading : !!updateState.downloading,
            installing: hasInstalling ? !!payload?.installing : !!updateState.installing,
            downloaded: hasDownloaded ? !!payload?.downloaded : !!updateState.downloaded,
            available: hasAvailable ? !!payload?.available : !!updateState.available,
            currentVersion: String(payload?.currentVersion || updateState.currentVersion || ''),
            latestVersion: String(payload?.latestVersion || updateState.latestVersion || ''),
            releaseNotes: String(payload?.releaseNotes || updateState.releaseNotes || ''),
            downloadFileName: hasDownloadFileName
                ? String(payload?.downloadFileName || '')
                : String(updateState.downloadFileName || ''),
            downloadedFilePath: hasDownloadedFilePath
                ? String(payload?.downloadedFilePath || '')
                : String(updateState.downloadedFilePath || ''),
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
        if (updateState.installing) return 'Opening installer...';
        if (updateState.downloading) return `Downloading update... ${Math.round(updateState.progressPercent || 0)}%`;
        if (updateState.downloaded) return 'Update downloaded. Click "Install & Restart".';
        if (updateState.available) return `Update available${updateState.latestVersion ? `: ${updateState.latestVersion}` : ''}`;
        if (updateState.checking) return 'Checking for updates...';
        if (updateState.lastMessage) return updateState.lastMessage;
        return 'Not checked yet.';
    };

    const startLiveUpdateStatePolling = () => {
        let stopped = false;
        let timer = null;
        let appSignature = '';
        let resourcesSignature = '';

        const schedule = () => {
            if (stopped || !overlay.isConnected) return;
            timer = window.setTimeout(tick, 1000);
        };

        const tick = async () => {
            if (stopped || !overlay.isConnected) return;
            try {
                const [appState, resourcesState] = await Promise.all([
                    emubro?.updates?.getState?.(),
                    emubro?.resourcesUpdates?.getState?.()
                ]);

                let changed = false;
                if (appState && typeof appState === 'object') {
                    applyUpdateState(appState);
                    const next = JSON.stringify({
                        checking: !!appState.checking,
                        downloading: !!appState.downloading,
                        installing: !!appState.installing,
                        downloaded: !!appState.downloaded,
                        available: !!appState.available,
                        progressPercent: Number(appState.progressPercent || 0),
                        latestVersion: String(appState.latestVersion || ''),
                        downloadedFilePath: String(appState.downloadedFilePath || ''),
                        lastError: String(appState.lastError || ''),
                        lastMessage: String(appState.lastMessage || '')
                    });
                    if (next !== appSignature) {
                        appSignature = next;
                        changed = true;
                    }
                }

                if (resourcesState && typeof resourcesState === 'object') {
                    applyResourcesUpdateState(resourcesState);
                    const next = JSON.stringify({
                        checking: !!resourcesState.checking,
                        installing: !!resourcesState.installing,
                        available: !!resourcesState.available,
                        missingLocalResources: !!resourcesState.missingLocalResources,
                        progressPercent: Number(resourcesState.progressPercent || 0),
                        latestVersion: String(resourcesState.latestVersion || ''),
                        lastError: String(resourcesState.lastError || ''),
                        lastMessage: String(resourcesState.lastMessage || '')
                    });
                    if (next !== resourcesSignature) {
                        resourcesSignature = next;
                        changed = true;
                    }
                }

                if (changed && overlay.isConnected) {
                    render();
                }
            } catch (_error) {}
            schedule();
        };

        schedule();
        return () => {
            stopped = true;
            if (timer) {
                window.clearTimeout(timer);
                timer = null;
            }
        };
    };

    const applyResourcesUpdateState = (payload = {}) => {
        const hasManifestUrl = Object.prototype.hasOwnProperty.call(payload || {}, 'manifestUrl');
        const hasStoragePath = Object.prototype.hasOwnProperty.call(payload || {}, 'storagePath');
        const hasEffectiveStoragePath = Object.prototype.hasOwnProperty.call(payload || {}, 'effectiveStoragePath');
        const hasDefaultStoragePath = Object.prototype.hasOwnProperty.call(payload || {}, 'defaultStoragePath');
        const hasMissingLocalResources = Object.prototype.hasOwnProperty.call(payload || {}, 'missingLocalResources');
        resourcesUpdateState = {
            ...resourcesUpdateState,
            checking: !!payload?.checking,
            installing: !!payload?.installing,
            available: !!payload?.available,
            missingLocalResources: hasMissingLocalResources
                ? !!payload?.missingLocalResources
                : !!resourcesUpdateState.missingLocalResources,
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
        if (resourcesUpdateState.missingLocalResources) return 'Resources folder is missing. Click "Install Resource Update" to download again.';
        if (resourcesUpdateState.available) return `Resource update available${resourcesUpdateState.latestVersion ? `: ${resourcesUpdateState.latestVersion}` : ''}`;
        if (resourcesUpdateState.checking) return 'Checking resource updates...';
        if (resourcesUpdateState.lastMessage) return resourcesUpdateState.lastMessage;
        return 'Not checked yet.';
    };

    const section = (key, title, subtitle, placeholder, browseLabel, entries) => renderPathSection({
        key,
        title,
        subtitle,
        placeholder,
        browseLabel,
        entries,
        renderList: ({ key: listKey, items, emptyLabel }) => renderList(listKey, items, emptyLabel)
    });

    const renderLlmTabContent = () => renderLlmTab({
        llmDraft,
        llmRelayScanStatus,
        llmRelayScanResults,
        llmRelayHostStatus,
        llmRelayConnections,
        normalizeLlmMode,
        normalizeRelayPort,
        normalizeRelayAccessMode,
        normalizeRelayAddressList,
        escapeAttr
    });

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

    const renderGeneralTabContent = () => renderGeneralTab({ generalDraft });

    const renderImportTabContent = () => renderImportTab({ importDraft });

    const renderUpdatesTabContent = () => renderUpdatesTab({
        updateState,
        resourcesUpdateState,
        escapeAttr,
        renderUpdateStatusText,
        renderResourcesUpdateStatusText
    });

    const renderGamepadTabContent = () => renderGamepadTab({
        platformBindingRows,
        platformGamepadDraft,
        normalizeInputBindingProfile,
        escapeAttr,
        gamepadBindingActions: GAMEPAD_BINDING_ACTIONS,
        gamepadBindingLabels: GAMEPAD_BINDING_LABELS
    });

    const render = () => {
        let tabContent = '';
        if (activeTab === 'general') {
            tabContent = renderGeneralTabContent();
        } else if (activeTab === 'llm') {
            tabContent = renderLlmTabContent();
        } else if (activeTab === 'gamepad') {
            tabContent = renderGamepadTabContent();
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
            tabContent = renderImportTabContent();
        }

        if (activeTab === 'updates') {
            tabContent = renderUpdatesTabContent();
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

        bindCoreModalHandlers({
            modal,
            closeModal,
            setActiveTab: (tabName) => {
                activeTab = tabName;
            },
            render,
            generalDraft,
            importDraft,
            normalizeLibrarySection,
            confirmDisableLlmHelpersFlow,
            suggestedSectionKey: SUGGESTED_SECTION_KEY,
            openThemeManager,
            openLanguageManager,
            openProfileModal,
            runBrowseSearch,
            getBrowseScopeSelection,
            openFooterPanel,
            openLauncherImportModal,
            normalizeInputBindingProfile,
            platformGamepadDraft
        });

        bindLlmHandlers({
            modal,
            llmDraft,
            normalizeLlmMode,
            normalizeRelayPort,
            normalizeRelayAccessMode,
            normalizeRelayAddressList,
            emubro,
            render,
            refreshRelayHostData,
            setLlmRelayScanStatus: (value) => {
                llmRelayScanStatus = String(value || '');
            },
            setLlmRelayScanResults: (value) => {
                llmRelayScanResults = Array.isArray(value) ? value : [];
            }
        });

        bindUpdateActionHandlers({
            modal,
            emubro,
            applyUpdateState,
            applyResourcesUpdateState,
            render,
            getResourcesUpdateState: () => resourcesUpdateState
        });

        attachPathSectionHandlers({
            modal,
            key: 'scanFolders',
            draft,
            normalizePathList,
            render,
            emubro,
            addFooterNotification
        });
        attachPathSectionHandlers({
            modal,
            key: 'gameFolders',
            draft,
            normalizePathList,
            render,
            emubro,
            addFooterNotification
        });
        attachPathSectionHandlers({
            modal,
            key: 'emulatorFolders',
            draft,
            normalizePathList,
            render,
            emubro,
            addFooterNotification
        });

        bindSaveSettingsHandler({
            modal,
            saveLibraryPathSettings,
            draft,
            generalDraft,
            importDraft,
            llmDraft,
            platformGamepadDraft,
            savePlatformGamepadBindingsMap,
            saveSuggestionSettings,
            emubro,
            normalizeRelayPort,
            normalizeRelayAccessMode,
            normalizeRelayAddressList,
            normalizeLibrarySection,
            setActiveLibrarySectionState,
            setActiveViewButton,
            isLibraryTopSection,
            setActiveLibrarySection,
            closeModal,
            addFooterNotification,
            setLlmHelpersEnabled,
            setLlmAllowUnknownTagsEnabled,
            onRelaySyncResult: (relaySyncResult) => {
                llmRelayHostStatus = relaySyncResult;
            }
        });
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
    stopLiveUpdateStatePolling = startLiveUpdateStatePolling();
    refreshRelayHostData({ skipRender: false }).catch(() => {});
}
