export function createBrowseFooterController(options = {}) {
    const emubro = options.emubro;
    const gameDetailsFooter = options.gameDetailsFooter || document.getElementById('game-details-footer');
    const escapeHtml = typeof options.escapeHtml === 'function'
        ? options.escapeHtml
        : (value) => String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    const normalizePathList = typeof options.normalizePathList === 'function'
        ? options.normalizePathList
        : (values = []) => {
            const out = [];
            const seen = new Set();
            (Array.isArray(values) ? values : []).forEach((raw) => {
                const value = String(raw || '').trim();
                if (!value) return;
                const key = value.toLowerCase();
                if (seen.has(key)) return;
                seen.add(key);
                out.push(value);
            });
            return out;
        };
    const quickSearchStateKey = String(options.quickSearchStateKey || 'emuBro.quickSearchState.v1');
    const browseScopeStorageKey = String(options.browseScopeStorageKey || 'emuBro.browseScope.v1');
    const getGames = typeof options.getGames === 'function' ? options.getGames : () => [];
    const getEmulators = typeof options.getEmulators === 'function' ? options.getEmulators : () => [];
    const getLibraryPathSettings = typeof options.getLibraryPathSettings === 'function'
        ? options.getLibraryPathSettings
        : async () => ({ scanFolders: [], gameFolders: [], emulatorFolders: [] });
    const setAppMode = typeof options.setAppMode === 'function' ? options.setAppMode : () => {};
    const searchForGamesAndEmulators = typeof options.searchForGamesAndEmulators === 'function'
        ? options.searchForGamesAndEmulators
        : async () => ({ success: false });
    const refreshEmulatorsState = typeof options.refreshEmulatorsState === 'function' ? options.refreshEmulatorsState : async () => {};
    const renderActiveLibraryView = typeof options.renderActiveLibraryView === 'function' ? options.renderActiveLibraryView : async () => {};
    const updateLibraryCounters = typeof options.updateLibraryCounters === 'function' ? options.updateLibraryCounters : () => {};

    function applyTemplate(input, data = {}) {
        let text = String(input ?? '');
        Object.keys(data || {}).forEach((key) => {
            const value = String(data[key] ?? '');
            text = text
                .replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), value)
                .replace(new RegExp(`\\{\\s*${key}\\s*\\}`, 'g'), value);
        });
        return text;
    }

    function t(key, fallback, data = {}) {
        const i18nRef = (typeof i18n !== 'undefined' && i18n && typeof i18n.t === 'function')
            ? i18n
            : (window?.i18n && typeof window.i18n.t === 'function' ? window.i18n : null);
        if (i18nRef && typeof i18nRef.t === 'function') {
            const translated = i18nRef.t(key, data);
            if (translated && translated !== key) return String(translated);
        }
        return applyTemplate(String(fallback || key), data);
    }

    let lastBrowseDiscovery = {
        archives: [],
        setupFiles: [],
        scope: 'both',
        scannedAt: ''
    };

    function normalizeBrowseScope(scope) {
        const value = String(scope || '').trim().toLowerCase();
        if (value === 'games' || value === 'emulators' || value === 'both') return value;
        return 'both';
    }

    function switchFooterTab(tabId = 'browse') {
        const target = String(tabId || 'browse').trim().toLowerCase();
        document.querySelectorAll('.game-details-tab[data-footer-tab]').forEach((tabBtn) => {
            const active = String(tabBtn.dataset.footerTab || '').toLowerCase() === target;
            tabBtn.classList.toggle('is-active', active);
            tabBtn.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        document.querySelectorAll('.game-details-tab-panel[data-footer-panel]').forEach((panel) => {
            const active = String(panel.dataset.footerPanel || '').toLowerCase() === target;
            panel.classList.toggle('is-active', active);
        });
    }

    function openFooterPanel(tabId = 'browse') {
        if (gameDetailsFooter) gameDetailsFooter.style.display = 'block';
        switchFooterTab(tabId);
    }

    function addFooterNotification(message, level = 'info') {
        const list = document.getElementById('footer-notifications-list');
        if (!list) return;

        const item = document.createElement('article');
        item.className = `footer-notification level-${String(level || 'info').toLowerCase()}`;
        const stamp = new Date().toLocaleString();
        const time = document.createElement('span');
        time.className = 'footer-notification-time';
        time.textContent = stamp;
        const body = document.createElement('p');
        body.textContent = String(message || '');
        item.appendChild(time);
        item.appendChild(body);
        list.prepend(item);
    }

    function loadQuickSearchState() {
        try {
            const raw = localStorage.getItem(quickSearchStateKey);
            if (!raw) return { ready: false, gameFolders: [], emulatorFolders: [], lastSuccessAt: '' };
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') {
                return { ready: false, gameFolders: [], emulatorFolders: [], lastSuccessAt: '' };
            }
            return {
                ready: !!parsed.ready,
                gameFolders: normalizePathList(parsed.gameFolders),
                emulatorFolders: normalizePathList(parsed.emulatorFolders),
                lastSuccessAt: String(parsed.lastSuccessAt || '')
            };
        } catch (_e) {
            return { ready: false, gameFolders: [], emulatorFolders: [], lastSuccessAt: '' };
        }
    }

    function saveQuickSearchState(nextState) {
        const payload = {
            ready: !!nextState?.ready,
            gameFolders: normalizePathList(nextState?.gameFolders),
            emulatorFolders: normalizePathList(nextState?.emulatorFolders),
            lastSuccessAt: String(nextState?.lastSuccessAt || '')
        };
        localStorage.setItem(quickSearchStateKey, JSON.stringify(payload));
    }

    function getPathParentFolder(filePath) {
        const value = String(filePath || '').trim();
        if (!value) return '';
        const normalized = value.replace(/[\\/]+$/g, '');
        const idx = Math.max(normalized.lastIndexOf('\\'), normalized.lastIndexOf('/'));
        if (idx <= 0) return '';
        return normalized.slice(0, idx);
    }

    function deriveCommonParentFolders(filePaths = []) {
        const parents = (Array.isArray(filePaths) ? filePaths : [])
            .map((entry) => getPathParentFolder(entry))
            .filter(Boolean);
        if (!parents.length) return [];

        const countMap = new Map();
        parents.forEach((folder) => {
            const key = folder.toLowerCase();
            countMap.set(key, (countMap.get(key) || 0) + 1);
        });

        const repeatedParents = Array.from(countMap.entries())
            .filter(([, count]) => count >= 2)
            .map(([folderKey]) => parents.find((folder) => folder.toLowerCase() === folderKey) || '');

        if (repeatedParents.length > 0) return normalizePathList(repeatedParents);
        return normalizePathList(parents).slice(0, 20);
    }

    function normalizeDiscoveredPaths(values = []) {
        return normalizePathList(values);
    }

    function setLastBrowseDiscovery(summary, scope = 'both') {
        lastBrowseDiscovery = {
            archives: normalizeDiscoveredPaths(summary?.foundArchives),
            setupFiles: normalizeDiscoveredPaths(summary?.foundSetupFiles),
            scope: normalizeBrowseScope(scope),
            scannedAt: new Date().toISOString()
        };
        updateBrowseDiscoveryCardLabels();
    }

    function updateBrowseDiscoveryCardLabels() {
        const archivesSubtitle = document.querySelector('#browse-archives-btn .browse-action-subtitle');
        const setupSubtitle = document.querySelector('#browse-zip-btn .browse-action-subtitle');
        if (archivesSubtitle) {
            const count = Number(lastBrowseDiscovery?.archives?.length || 0);
            archivesSubtitle.textContent = count > 0
                ? t('browseFooter.archivesFoundLatestScan', 'Found {{count}} archive file(s) in the latest scan.', { count })
                : t('browseFooter.archivesLatestSearchHint', 'Browse archive files in your latest search results.');
        }
        if (setupSubtitle) {
            const count = Number(lastBrowseDiscovery?.setupFiles?.length || 0);
            setupSubtitle.textContent = count > 0
                ? t('browseFooter.setupFoundLatestScan', 'Found {{count}} setup file(s) matching platform config patterns.', { count })
                : t('browseFooter.setupLatestSearchHint', 'Show setup/install files detected from config setupFileMatch patterns.');
        }
    }

    function openBrowseDiscoveryModal(kind = 'archives') {
        const normalizedKind = String(kind || 'archives').trim().toLowerCase() === 'setup' ? 'setup' : 'archives';
        const paths = normalizedKind === 'setup'
            ? (Array.isArray(lastBrowseDiscovery?.setupFiles) ? lastBrowseDiscovery.setupFiles : [])
            : (Array.isArray(lastBrowseDiscovery?.archives) ? lastBrowseDiscovery.archives : []);
        if (!paths.length) {
            addFooterNotification(
                normalizedKind === 'setup'
                    ? t('browseFooter.noSetupFilesDetected', 'No setup files were detected in the latest search.')
                    : t('browseFooter.noArchiveFilesDetected', 'No archive files were detected in the latest search.'),
                'warning'
            );
            openFooterPanel('notifications');
            return;
        }

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
            'width:min(900px,100%)',
            'max-height:min(78vh,760px)',
            'background:var(--bg-secondary)',
            'border:1px solid var(--border-color)',
            'border-radius:14px',
            'padding:16px',
            'box-shadow:0 18px 42px rgba(0,0,0,0.45)',
            'display:grid',
            'gap:12px'
        ].join(';');

        const title = normalizedKind === 'setup'
            ? t('browseFooter.detectedSetupFiles', 'Detected Setup Files')
            : t('browseFooter.detectedArchives', 'Detected Archives');
        modal.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
                <h2 style="margin:0;font-size:1.15rem;">${title}</h2>
                <button type="button" class="close-btn" data-close-browse-results>&times;</button>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
                <div style="color:var(--text-secondary);font-size:0.9rem;">
                    ${t('browseFooter.filesFromLatestScan', '{{count}} file(s) from latest {{scope}} scan.', {
                        count: paths.length,
                        scope: escapeHtml(String(lastBrowseDiscovery.scope || 'both'))
                    })}
                </div>
                <button type="button" class="action-btn" data-open-folder-all>${t('browseFooter.openFirstInExplorer', 'Open first in Explorer')}</button>
            </div>
            <div style="border:1px solid var(--border-color);border-radius:10px;max-height:56vh;overflow:auto;padding:8px;background:color-mix(in srgb,var(--bg-primary),transparent 14%);">
                ${paths.map((p, idx) => `
                    <div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:8px 6px;border-bottom:1px solid color-mix(in srgb,var(--border-color),transparent 40%);">
                        <div style="font-family:monospace;font-size:12px;word-break:break-all;">${escapeHtml(String(p || ''))}</div>
                        <button type="button" class="action-btn small" data-open-item="${idx}">${t('browseFooter.showItem', 'Show')}</button>
                    </div>
                `).join('')}
            </div>
        `;

        const close = () => overlay.remove();
        modal.querySelectorAll('[data-close-browse-results]').forEach((btn) => btn.addEventListener('click', close));
        modal.querySelector('[data-open-folder-all]')?.addEventListener('click', async () => {
            const first = String(paths[0] || '').trim();
            if (!first || !emubro) return;
            try {
                await emubro.invoke('show-item-in-folder', first);
            } catch (_e) {}
        });
        modal.querySelectorAll('[data-open-item]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const idx = Number(btn.getAttribute('data-open-item') || -1);
                const target = idx >= 0 ? String(paths[idx] || '').trim() : '';
                if (!target || !emubro) return;
                try {
                    await emubro.invoke('show-item-in-folder', target);
                } catch (_e) {}
            });
        });

        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) close();
        });
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }

    function updateQuickSearchButtonState() {
        const quickBtn = document.getElementById('browse-quick-search-btn');
        if (!quickBtn) return;
        const quickState = loadQuickSearchState();
        const enabled = !!quickState.ready;
        quickBtn.disabled = !enabled;
        quickBtn.classList.toggle('is-disabled', !enabled);
        quickBtn.title = enabled
            ? t('browseFooter.quickSearchReady', 'Quick Search is ready')
            : t('browseFooter.quickSearchNeedInitialRun', 'Run a successful search first to enable Quick Search');
    }

    function getBrowseScopeSelection() {
        const fromDom = document.querySelector('.browse-scope-btn.is-active')?.dataset?.browseScope;
        if (fromDom) return normalizeBrowseScope(fromDom);
        return normalizeBrowseScope(localStorage.getItem(browseScopeStorageKey) || 'both');
    }

    function applyBrowseScopeSelection(nextScope) {
        const normalized = normalizeBrowseScope(nextScope);
        localStorage.setItem(browseScopeStorageKey, normalized);
        document.querySelectorAll('.browse-scope-btn[data-browse-scope]').forEach((btn) => {
            const active = String(btn.dataset.browseScope || '').toLowerCase() === normalized;
            btn.classList.toggle('is-active', active);
        });
        return normalized;
    }

    function getQuickSearchTargetsByScope(scope) {
        const quickState = loadQuickSearchState();
        const normalized = normalizeBrowseScope(scope);
        if (normalized === 'games') return normalizePathList(quickState.gameFolders);
        if (normalized === 'emulators') return normalizePathList(quickState.emulatorFolders);
        return normalizePathList([
            ...quickState.gameFolders,
            ...quickState.emulatorFolders
        ]);
    }

    function updateQuickSearchStateFromSummary(summary, scannedTargets = [], scope = 'both') {
        const totalGames = Number(summary?.totalFoundGames || 0);
        const totalEmulators = Number(summary?.totalFoundEmulators || 0);
        const normalizedScope = normalizeBrowseScope(scope);
        const hasGamesInLibrary = Array.isArray(getGames()) && getGames().some((game) => String(game?.filePath || '').trim().length > 0);
        const hasEmulatorsInLibrary = Array.isArray(getEmulators()) && getEmulators().some((emu) => String(emu?.filePath || '').trim().length > 0);
        const hasScopeData = normalizedScope === 'games'
            ? hasGamesInLibrary
            : (normalizedScope === 'emulators' ? hasEmulatorsInLibrary : (hasGamesInLibrary || hasEmulatorsInLibrary));
        if (totalGames <= 0 && totalEmulators <= 0 && !hasScopeData) return;

        const current = loadQuickSearchState();
        const next = { ...current, ready: true, lastSuccessAt: new Date().toISOString() };

        const gamePaths = (Array.isArray(summary?.foundGamePaths) && summary.foundGamePaths.length > 0)
            ? summary.foundGamePaths
            : getGames().map((game) => game?.filePath).filter(Boolean);
        const emulatorPaths = (Array.isArray(summary?.foundEmulatorPaths) && summary.foundEmulatorPaths.length > 0)
            ? summary.foundEmulatorPaths
            : getEmulators().map((emu) => emu?.filePath).filter(Boolean);
        const gameFolders = deriveCommonParentFolders(gamePaths);
        const emulatorFolders = deriveCommonParentFolders(emulatorPaths);
        const scanned = normalizePathList(scannedTargets);
        const gameSeedFolders = gameFolders.length > 0 ? gameFolders : scanned;
        const emulatorSeedFolders = emulatorFolders.length > 0 ? emulatorFolders : scanned;

        if (normalizedScope !== 'emulators') {
            next.gameFolders = normalizePathList([
                ...next.gameFolders,
                ...gameSeedFolders
            ]);
        }

        if (normalizedScope !== 'games') {
            next.emulatorFolders = normalizePathList([
                ...next.emulatorFolders,
                ...emulatorSeedFolders
            ]);
        }

        saveQuickSearchState(next);
    }

    async function runBrowseSearch(mode = 'full', options = {}) {
        const normalizedMode = String(mode || 'full').toLowerCase();
        const normalizedScope = normalizeBrowseScope(options?.scope || getBrowseScopeSelection());
        const settings = await getLibraryPathSettings();
        const allowNetwork = localStorage.getItem('emuBro.enableNetworkScan') !== 'false';
        const baseTargets = (Array.isArray(settings.scanFolders) ? settings.scanFolders : [])
            .map((v) => String(v || '').trim())
            .filter(Boolean)
            .filter((target) => allowNetwork || !target.startsWith('\\\\'));
        const targets = [];

        if (normalizedMode === 'quick') {
            const quickState = loadQuickSearchState();
            if (!quickState.ready) {
                addFooterNotification(t('browseFooter.quickSearchDisabled', 'Quick Search is disabled until a previous search found games or emulators.'), 'warning');
                openFooterPanel('notifications');
                updateQuickSearchButtonState();
                return;
            }
            targets.push(...getQuickSearchTargetsByScope(normalizedScope));
        } else if (normalizedMode === 'custom') {
            const pick = await emubro.invoke('open-file-dialog', {
                title: t('browseFooter.selectSearchFolder', 'Select search folder'),
                properties: ['openDirectory']
            });
            if (!pick || pick.canceled || !Array.isArray(pick.filePaths) || pick.filePaths.length === 0) return;
            targets.push(...pick.filePaths.map((p) => String(p || '').trim()).filter(Boolean));
            targets.push(...baseTargets);
        } else {
            targets.push(...baseTargets);
            targets.push('');
        }

        const deduped = normalizePathList(targets);
        if (normalizedMode === 'quick' && deduped.length === 0) {
            addFooterNotification(t('browseFooter.quickSearchSkippedNoCommonParents', 'Quick Search skipped: no common parent folders found yet. Run a full search first.'), 'warning');
            openFooterPanel('notifications');
            return;
        }

        try {
            addFooterNotification(t('browseFooter.searchStarted', 'Search started ({{mode}}, {{scope}}).', {
                mode: normalizedMode,
                scope: normalizedScope
            }), 'info');
            setAppMode('library');
            const summary = await searchForGamesAndEmulators(deduped, { scope: normalizedScope, mode: normalizedMode });
            if (!summary?.success) {
                addFooterNotification(t('browseFooter.searchFinishedNoResults', 'Search finished without new results.'), 'warning');
                updateQuickSearchButtonState();
                openFooterPanel('notifications');
                return;
            }
            setLastBrowseDiscovery(summary, normalizedScope);
            updateQuickSearchStateFromSummary(summary, deduped, normalizedScope);
            await refreshEmulatorsState();
            await renderActiveLibraryView();
            updateLibraryCounters();

            const foundGames = Number(summary?.totalFoundGames || 0);
            const foundEmulators = Number(summary?.totalFoundEmulators || 0);
            const foundArchives = Number(Array.isArray(summary?.foundArchives) ? summary.foundArchives.length : 0);
            const foundSetupFiles = Number(Array.isArray(summary?.foundSetupFiles) ? summary.foundSetupFiles.length : 0);
            addFooterNotification(
                t(
                    'browseFooter.searchCompleteSummary',
                    'Search complete. {{games}} game(s), {{emulators}} emulator(s), {{archives}} archive(s), {{setup}} setup file(s), {{locations}} location(s).',
                    {
                        games: foundGames,
                        emulators: foundEmulators,
                        archives: foundArchives,
                        setup: foundSetupFiles,
                        locations: Math.max(1, deduped.length)
                    }
                ),
                'success'
            );
            updateQuickSearchButtonState();
            openFooterPanel('notifications');
        } catch (error) {
            addFooterNotification(t('browseFooter.searchFailed', 'Search failed: {{message}}', { message: error?.message || error }), 'error');
            openFooterPanel('notifications');
        }
    }

    return {
        switchFooterTab,
        openFooterPanel,
        addFooterNotification,
        normalizeBrowseScope,
        getBrowseScopeSelection,
        applyBrowseScopeSelection,
        updateQuickSearchButtonState,
        updateBrowseDiscoveryCardLabels,
        openBrowseDiscoveryModal,
        runBrowseSearch
    };
}
