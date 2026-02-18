import './scss/styles.scss';

const emubro = window.emubro;
const log = console;

if (!emubro) {
    throw new Error('preload API missing: window.emubro is not available');
}

import { initI18n, populateLanguageSelector, updateUILanguage } from './js/i18n-manager';
import { initLanguageManager, openLanguageManager } from './js/language-manager';
import { 
    setTheme, 
    updateThemeSelector, 
    renderMarketplace, 
    toggleTheme, 
    invertColors, 
    saveTheme, 
    hideThemeForm, 
    setupColorPickerListeners, 
    setupBackgroundImageListeners,
    getHasUnsavedChanges,
    setHasUnsavedChanges,
    renderThemeManager,
    resetThemeForm,
    applyCornerStyle,
    getCurrentTheme,
    makeDraggable,
    openThemeManager
} from './js/theme-manager';
import { initDocking, toggleDock, removeFromDock, completelyRemoveFromDock } from './js/docking-manager';
import { 
    getGames, 
    setGames, 
    getFilteredGames, 
    setFilteredGames, 
    getEmulators,
    setEmulators,
    fetchEmulators,
    renderGames, 
    renderEmulators,
    applyFilters, 
    initializePlatformFilterOptions, 
    addPlatformFilterOption,
    searchForGamesAndEmulators
} from './js/game-manager';
import { showToolView } from './js/tools-manager';
import { showCommunityView } from './js/community-manager';

// ===== Global State & Elements =====
const gamesContainer = document.getElementById('games-container');
const totalGamesElement = document.getElementById('total-games');
const totalEmulatorsElement = document.getElementById('total-emulators');
const playTimeElement = document.getElementById('play-time');
const themeSelect = document.getElementById('theme-select');
const themeManagerBtn = document.getElementById('theme-manager-btn');
const themeManagerModal = document.getElementById('theme-manager-modal');
const closeThemeManagerBtn = document.getElementById('close-theme-manager');
const closeGameDetailsBtn = document.getElementById('close-game-details');
const pinFooterBtn = document.getElementById('pin-footer-btn');
const gameDetailsFooter = document.getElementById('game-details-footer');
const openFooterBtn = document.getElementById('open-footer-btn');
const emulatorsInstalledToggle = document.getElementById('emulators-installed-toggle');
const emulatorsInstalledToggleWrap = document.getElementById('emulators-installed-toggle-wrap');

let activeLibrarySection = 'all';
let activeEmulatorTypeTab = 'standalone';
let activeTopSection = 'library';
const QUICK_SEARCH_STATE_KEY = 'emuBro.quickSearchState.v1';
const BROWSE_SCOPE_STORAGE_KEY = 'emuBro.browseScope.v1';

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

function normalizeBrowseScope(scope) {
    const value = String(scope || '').trim().toLowerCase();
    if (value === 'games' || value === 'emulators' || value === 'both') return value;
    return 'both';
}

function loadQuickSearchState() {
    try {
        const raw = localStorage.getItem(QUICK_SEARCH_STATE_KEY);
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
    localStorage.setItem(QUICK_SEARCH_STATE_KEY, JSON.stringify(payload));
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

function updateQuickSearchButtonState() {
    const quickBtn = document.getElementById('browse-quick-search-btn');
    if (!quickBtn) return;
    const quickState = loadQuickSearchState();
    const enabled = !!quickState.ready;
    quickBtn.disabled = !enabled;
    quickBtn.classList.toggle('is-disabled', !enabled);
    quickBtn.title = enabled
        ? 'Quick Search is ready'
        : 'Run a successful search first to enable Quick Search';
}

function getBrowseScopeSelection() {
    const fromDom = document.querySelector('.browse-scope-btn.is-active')?.dataset?.browseScope;
    if (fromDom) return normalizeBrowseScope(fromDom);
    return normalizeBrowseScope(localStorage.getItem(BROWSE_SCOPE_STORAGE_KEY) || 'both');
}

function applyBrowseScopeSelection(nextScope) {
    const normalized = normalizeBrowseScope(nextScope);
    localStorage.setItem(BROWSE_SCOPE_STORAGE_KEY, normalized);
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
            addFooterNotification('Quick Search is disabled until a previous search found games or emulators.', 'warning');
            openFooterPanel('notifications');
            updateQuickSearchButtonState();
            return;
        }
        targets.push(...getQuickSearchTargetsByScope(normalizedScope));
    } else if (normalizedMode === 'custom') {
        const pick = await emubro.invoke('open-file-dialog', {
            title: 'Select search folder',
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
        addFooterNotification('Quick Search skipped: no common parent folders found yet. Run a full search first.', 'warning');
        openFooterPanel('notifications');
        return;
    }

    try {
        addFooterNotification(`Search started (${normalizedMode}, ${normalizedScope}).`, 'info');
        setAppMode('library');
        const summary = await searchForGamesAndEmulators(deduped, { scope: normalizedScope, mode: normalizedMode });
        if (!summary?.success) {
            addFooterNotification('Search finished without new results.', 'warning');
            updateQuickSearchButtonState();
            openFooterPanel('notifications');
            return;
        }
        updateQuickSearchStateFromSummary(summary, deduped, normalizedScope);
        await refreshEmulatorsState();
        await renderActiveLibraryView();
        updateLibraryCounters();

        const foundGames = Number(summary?.totalFoundGames || 0);
        const foundEmulators = Number(summary?.totalFoundEmulators || 0);
        addFooterNotification(
            `Search complete. ${foundGames} game(s), ${foundEmulators} emulator(s), ${Math.max(1, deduped.length)} location(s).`,
            'success'
        );
        updateQuickSearchButtonState();
        openFooterPanel('notifications');
    } catch (error) {
        addFooterNotification(`Search failed: ${error?.message || error}`, 'error');
        openFooterPanel('notifications');
    }
}

function getPushpinIconMarkup() {
    return `
        <span class="icon-svg" aria-hidden="true">
            <svg viewBox="0 0 24 24">
                <path d="M8.5 4h7l-1.5 4.8v3.1l1.4 1.5h-6.8l1.4-1.5V8.8L8.5 4Z"></path>
                <path d="M12 13.4V20"></path>
            </svg>
        </span>
    `;
}

function getLockIconMarkup() {
    return `
        <span class="icon-svg" aria-hidden="true">
            <svg viewBox="0 0 24 24">
                <rect x="6" y="11" width="12" height="9" rx="2"></rect>
                <path d="M9 11V8a3 3 0 0 1 6 0v3"></path>
            </svg>
        </span>
    `;
}

function setActiveTopNavLink(target) {
    const normalized = String(target || '').trim().toLowerCase();
    const links = document.querySelectorAll('.navigation a[data-nav-target]');
    links.forEach((link) => {
        const active = String(link.dataset.navTarget || '').trim().toLowerCase() === normalized;
        link.classList.toggle('active', active);
    });
}

function setActiveRailTarget(target) {
    const normalized = String(target || '').trim().toLowerCase();
    const railButtons = document.querySelectorAll('.rail-btn.rail-nav[data-rail-target]');
    railButtons.forEach((btn) => {
        const active = String(btn.dataset.railTarget || '').trim().toLowerCase() === normalized;
        btn.classList.toggle('is-active', active);
    });
}

function setAppMode(mode) {
    const normalized = String(mode || 'library').trim().toLowerCase();
    activeTopSection = normalized || 'library';

    const isLibrary = activeTopSection === 'library';
    const viewControls = document.querySelector('.view-controls');
    if (viewControls) {
        viewControls.classList.toggle('is-hidden', !isLibrary);
    }
    if (openFooterBtn) {
        openFooterBtn.classList.toggle('is-hidden', !isLibrary);
    }
    if (!isLibrary && gameDetailsFooter) {
        gameDetailsFooter.style.display = 'none';
    }

    const gameGrid = document.querySelector('main.game-grid');
    if (gameGrid) {
        gameGrid.classList.toggle('non-library-mode', !isLibrary);
    }

    if (isLibrary) {
        setGamesHeaderByLibrarySection(activeLibrarySection);
    }

    setActiveTopNavLink(activeTopSection);

    if (activeTopSection === 'library' || activeTopSection === 'tools' || activeTopSection === 'community') {
        setActiveRailTarget(activeTopSection);
    }

    updateEmulatorsInstalledToggleVisibility();
}

async function getLibraryPathSettings() {
    try {
        const res = await emubro.invoke('settings:get-library-paths');
        if (res?.success && res?.settings) return res.settings;
    } catch (_e) {}
    return { scanFolders: [], gameFolders: [], emulatorFolders: [] };
}

async function saveLibraryPathSettings(settings) {
    const payload = {
        scanFolders: Array.isArray(settings?.scanFolders) ? settings.scanFolders : [],
        gameFolders: Array.isArray(settings?.gameFolders) ? settings.gameFolders : [],
        emulatorFolders: Array.isArray(settings?.emulatorFolders) ? settings.emulatorFolders : []
    };
    const result = await emubro.invoke('settings:set-library-paths', payload);
    if (!result?.success) throw new Error(result?.message || 'Failed to save path settings.');
    return result.settings || payload;
}

function normalizePathList(values) {
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
}

async function openLibraryPathSettingsModal() {
    const loaded = await getLibraryPathSettings();
    const draft = {
        scanFolders: normalizePathList(loaded.scanFolders),
        gameFolders: normalizePathList(loaded.gameFolders),
        emulatorFolders: normalizePathList(loaded.emulatorFolders)
    };
    const generalDraft = {
        defaultSection: String(localStorage.getItem('emuBro.defaultLibrarySection') || activeLibrarySection || 'all').toLowerCase(),
        defaultView: String(localStorage.getItem('emuBro.defaultLibraryView') || (document.querySelector('.view-btn.active')?.dataset.view || 'cover')).toLowerCase(),
        showLoadIndicator: localStorage.getItem('emuBro.showLoadIndicator') !== 'false',
        autoOpenFooter: localStorage.getItem('emuBro.autoOpenFooter') !== 'false'
    };
    const importDraft = {
        preferCopyExternal: localStorage.getItem('emuBro.preferCopyExternal') !== 'false',
        enableNetworkScan: localStorage.getItem('emuBro.enableNetworkScan') !== 'false'
    };
    let activeTab = 'general';

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

    const renderGeneralTab = () => `
        <section style="display:grid;gap:12px;">
            <section style="border:1px solid var(--border-color);border-radius:12px;padding:12px;display:grid;gap:10px;">
                <h3 style="margin:0;font-size:1rem;">Library Defaults</h3>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;">
                    <label style="display:flex;flex-direction:column;gap:6px;">
                        <span style="font-size:0.82rem;color:var(--text-secondary);">Default Library Section</span>
                        <select data-setting="default-section">
                            <option value="all"${generalDraft.defaultSection === 'all' ? ' selected' : ''}>All Games</option>
                            <option value="installed"${generalDraft.defaultSection === 'installed' ? ' selected' : ''}>Installed</option>
                            <option value="recent"${generalDraft.defaultSection === 'recent' ? ' selected' : ''}>Recently Played</option>
                            <option value="wishlist"${generalDraft.defaultSection === 'wishlist' ? ' selected' : ''}>Wishlist</option>
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
        </section>
    `;

    const render = () => {
        const tabContent = activeTab === 'general'
            ? renderGeneralTab()
            : (activeTab === 'library-paths'
                ? `
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
                `
                : renderImportTab());

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
                <button type="button" class="action-btn${activeTab === 'library-paths' ? ' launch-btn' : ''}" data-settings-tab="library-paths">Library Paths</button>
                <button type="button" class="action-btn${activeTab === 'import' ? ' launch-btn' : ''}" data-settings-tab="import">Import & Scan</button>
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
        closeBtns.forEach((btn) => btn.addEventListener('click', () => overlay.remove()));

        modal.querySelectorAll('[data-settings-tab]').forEach((btn) => {
            btn.addEventListener('click', () => {
                activeTab = String(btn.dataset.settingsTab || 'general');
                render();
            });
        });

        const defaultSectionSelect = modal.querySelector('[data-setting="default-section"]');
        if (defaultSectionSelect) {
            defaultSectionSelect.addEventListener('change', () => {
                generalDraft.defaultSection = String(defaultSectionSelect.value || 'all').toLowerCase();
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
                overlay.remove();
                openFooterPanel('browse');
            });
        }

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
                    localStorage.setItem('emuBro.preferCopyExternal', importDraft.preferCopyExternal ? 'true' : 'false');
                    localStorage.setItem('emuBro.enableNetworkScan', importDraft.enableNetworkScan ? 'true' : 'false');

                    activeLibrarySection = generalDraft.defaultSection || 'all';
                    setActiveViewButton(generalDraft.defaultView || 'cover');
                    if (activeTopSection === 'library') {
                        await setActiveLibrarySection(activeLibrarySection);
                    }
                    overlay.remove();
                    addFooterNotification('Settings saved.', 'success');
                } catch (error) {
                    alert(error?.message || 'Failed to save settings.');
                }
            });
        }
    };

    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) overlay.remove();
    });

    render();
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

async function openProfileModal() {
    let userInfo = {
        username: 'Bro',
        avatar: './logo.png',
        level: 1,
        xp: 0,
        friends: 0
    };
    try {
        const loaded = await emubro.invoke('get-user-info');
        if (loaded && typeof loaded === 'object') {
            userInfo = { ...userInfo, ...loaded };
        }
    } catch (_e) {}

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
        'width:min(520px,100%)',
        'background:var(--bg-secondary)',
        'border:1px solid var(--border-color)',
        'border-radius:14px',
        'padding:16px',
        'box-shadow:0 18px 42px rgba(0,0,0,0.45)',
        'display:grid',
        'gap:12px'
    ].join(';');

    modal.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
            <h2 style="margin:0;font-size:1.15rem;">Profile</h2>
            <button type="button" class="close-btn" data-close-profile>&times;</button>
        </div>
        <div style="display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:center;">
            <img src="${String(userInfo.avatar || './logo.png')}" alt="Profile avatar" style="width:74px;height:74px;border-radius:50%;object-fit:cover;border:2px solid var(--accent-color);" />
            <div>
                <div style="font-size:1.1rem;font-weight:700;">${String(userInfo.username || 'Bro')}</div>
                <div style="color:var(--text-secondary);font-size:0.9rem;">Level ${Number(userInfo.level || 0)} · ${Number(userInfo.xp || 0)} XP</div>
                <div style="color:var(--text-secondary);font-size:0.9rem;">Friends: ${Number(userInfo.friends || 0)}</div>
            </div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px;">
            <button type="button" class="action-btn" data-open-settings>Settings</button>
            <button type="button" class="action-btn launch-btn" data-close-profile>Close</button>
        </div>
    `;

    modal.querySelectorAll('[data-close-profile]').forEach((btn) => {
        btn.addEventListener('click', () => overlay.remove());
    });

    const openSettingsBtn = modal.querySelector('[data-open-settings]');
    if (openSettingsBtn) {
        openSettingsBtn.addEventListener('click', async () => {
            overlay.remove();
            await openLibraryPathSettingsModal();
        });
    }

    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) overlay.remove();
    });

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

function normalizeEmulatorType(type) {
    const value = String(type || '').trim().toLowerCase();
    if (value === 'standalone' || value === 'core' || value === 'web') return value;
    return '';
}

function inferEmulatorType(emulator) {
    const explicitType = normalizeEmulatorType(
        emulator?.type
        || emulator?.emulatorType
        || emulator?.kind
        || emulator?.category
    );
    if (explicitType) return explicitType;

    const startParameters = String(emulator?.startParameters || '').toLowerCase();
    if (startParameters.includes('cores\\') || startParameters.includes('/cores/') || startParameters.includes('libretro')) {
        return 'core';
    }

    const name = String(emulator?.name || '').toLowerCase();
    if (name.includes('(core)') || /\bcore\b/.test(name)) {
        return 'core';
    }

    return 'standalone';
}

function getEmulatorRenderOptions() {
    return {
        activeType: activeEmulatorTypeTab,
        onTypeChange: (nextType) => {
            activeEmulatorTypeTab = normalizeEmulatorType(nextType) || 'standalone';
            renderEmulators(getFilteredEmulatorsForSection(), getEmulatorRenderOptions());
        },
        onRefresh: () => {
            renderEmulators(getFilteredEmulatorsForSection(), getEmulatorRenderOptions());
        }
    };
}

function updateEmulatorsInstalledToggleVisibility() {
    if (!emulatorsInstalledToggleWrap) return;
    const show = activeTopSection === 'library' && activeLibrarySection === 'emulators';
    emulatorsInstalledToggleWrap.classList.toggle('is-hidden', !show);
}

function getFilteredEmulatorsForSection(sourceRows = getEmulators()) {
    let rows = Array.isArray(sourceRows) ? [...sourceRows] : [];

    const normalizedType = normalizeEmulatorType(activeEmulatorTypeTab) || 'standalone';
    rows = rows.filter((emu) => inferEmulatorType(emu) === normalizedType);

    if (emulatorsInstalledToggle && emulatorsInstalledToggle.checked) {
        rows = rows.filter((emu) => !!emu.isInstalled);
    }

    const searchTerm = String(document.querySelector('.search-bar input')?.value || '').trim().toLowerCase();
    if (searchTerm) {
        rows = rows.filter((emu) => {
            const name = String(emu.name || '').toLowerCase();
            const platform = String(emu.platform || emu.platformShortName || '').toLowerCase();
            const filePath = String(emu.filePath || '').toLowerCase();
            return name.includes(searchTerm) || platform.includes(searchTerm) || filePath.includes(searchTerm);
        });
    }

    const platformFilter = document.getElementById('platform-filter');
    const selectedPlatform = String(platformFilter?.value || 'all').trim().toLowerCase();
    if (selectedPlatform && selectedPlatform !== 'all') {
        rows = rows.filter((emu) => String(emu?.platformShortName || '').trim().toLowerCase() === selectedPlatform);
    }

    const sortFilter = document.getElementById('sort-filter');
    const selectedSort = String(sortFilter?.value || 'name').trim().toLowerCase();
    switch (selectedSort) {
        case 'platform':
            rows.sort((a, b) => {
                const aPlatform = String(a?.platform || a?.platformShortName || '');
                const bPlatform = String(b?.platform || b?.platformShortName || '');
                const platformCompare = aPlatform.localeCompare(bPlatform);
                if (platformCompare !== 0) return platformCompare;
                return String(a?.name || '').localeCompare(String(b?.name || ''));
            });
            break;
        case 'rating':
            rows.sort((a, b) => {
                const installedCompare = Number(!!b?.isInstalled) - Number(!!a?.isInstalled);
                if (installedCompare !== 0) return installedCompare;
                return String(a?.name || '').localeCompare(String(b?.name || ''));
            });
            break;
        default:
            rows.sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
    }

    return rows;
}

function setActiveViewButton(viewId) {
    const normalized = String(viewId || '').trim().toLowerCase();
    if (!normalized) return false;
    const targetBtn = document.querySelector(`.view-btn[data-view="${normalized}"]`);
    if (!targetBtn) return false;

    document.querySelectorAll('.view-btn').forEach((btn) => btn.classList.remove('active'));
    targetBtn.classList.add('active');
    if (gamesContainer) gamesContainer.className = `games-container ${normalized}-view`;
    updateViewSizeControlState();
    return true;
}

function updateViewSizeControlState() {
    const slider = document.getElementById('view-size-slider');
    if (!slider) return;

    const activeView = document.querySelector('.view-btn.active')?.dataset?.view || 'cover';
    const isLocked = activeView === 'slideshow' || activeView === 'random';

    slider.disabled = isLocked;
    const wrapper = slider.closest('.view-size-control');
    if (wrapper) wrapper.classList.toggle('is-locked', isLocked);
}

function setupViewScaleControl() {
    const slider = document.getElementById('view-size-slider');
    const valueEl = document.getElementById('view-size-value');
    if (!slider || !valueEl) return;

    const applyScale = (raw, persist = true) => {
        const clamped = Math.max(70, Math.min(140, Number(raw) || 100));
        const scale = clamped / 100;
        document.documentElement.style.setProperty('--view-scale', String(scale));
        slider.value = String(clamped);
        valueEl.textContent = `${clamped}%`;
        if (persist) localStorage.setItem('emuBro.viewScalePercent', String(clamped));
    };

    const stored = localStorage.getItem('emuBro.viewScalePercent');
    applyScale(stored || slider.value || 100, false);

    slider.addEventListener('input', (e) => {
        applyScale(e.target.value, true);
    });

    updateViewSizeControlState();
}

function setActiveSidebarLibraryLink(view) {
    const links = document.querySelectorAll('#sidebar-content .sidebar-section a[data-view]');
    links.forEach((link) => {
        const active = link.dataset.view === view;
        link.classList.toggle('active', active);
        if (link.parentElement) link.parentElement.classList.toggle('active', active);
    });
}

function setGamesHeaderByLibrarySection(section) {
    const gamesHeader = document.getElementById('games-header');
    if (!gamesHeader) return;

    if (section === 'emulators') {
        gamesHeader.textContent = 'Emulators';
        return;
    }

    if (section === 'installed') {
        gamesHeader.textContent = 'Installed Games';
        return;
    }

    if (section === 'recent') {
        gamesHeader.textContent = 'Recently Played';
        return;
    }

    if (section === 'wishlist') {
        gamesHeader.textContent = 'Wishlist';
        return;
    }

    gamesHeader.textContent = i18n.t('gameGrid.featuredGames') || 'Featured Games';
}

function getSectionFilteredGames() {
    const filtered = getFilteredGames();

    if (activeLibrarySection === 'installed') {
        return filtered.filter((game) => !!game.isInstalled);
    }

    if (activeLibrarySection === 'recent') {
        return [...filtered]
            .filter((game) => !!game.lastPlayed)
            .sort((a, b) => new Date(b.lastPlayed).getTime() - new Date(a.lastPlayed).getTime());
    }

    if (activeLibrarySection === 'wishlist') {
        return filtered.filter((game) => !!(game.isWishlist || game.wishlist || game.inWishlist));
    }

    return filtered;
}

function updateLibraryCounters() {
    if (totalGamesElement) totalGamesElement.textContent = String(getGames().length);
    if (totalEmulatorsElement) totalEmulatorsElement.textContent = String(getEmulators().length);
}

async function refreshEmulatorsState() {
    const rows = await fetchEmulators();
    setEmulators(rows);
    updateLibraryCounters();
    return rows;
}

async function renderActiveLibraryView() {
    if (activeTopSection !== 'library') return;

    if (activeLibrarySection === 'emulators') {
        if (!getEmulators().length) await refreshEmulatorsState();
        initializePlatformFilterOptions(getEmulators());
        renderEmulators(getFilteredEmulatorsForSection(), getEmulatorRenderOptions());
        return;
    }

    initializePlatformFilterOptions(getGames());
    renderGames(getSectionFilteredGames());
}

async function setActiveLibrarySection(section) {
    setAppMode('library');
    activeLibrarySection = section || 'all';
    setActiveSidebarLibraryLink(activeLibrarySection);
    setGamesHeaderByLibrarySection(activeLibrarySection);
    updateEmulatorsInstalledToggleVisibility();
    await renderActiveLibraryView();
}

// ===== IPC Listeners (via preload) =====
emubro.onWindowMoved((position, screenGoal) => {
    const { x, y } = position;
    const { screenGoalX, screenGoalY } = screenGoal;
    const gameGrid = document.querySelector('main.game-grid');
    if (gameGrid) {
        const bgX = screenGoalX - x - (window.innerWidth / 2);
        const bgY = screenGoalY - y - (window.innerHeight / 2);
        gameGrid.style.backgroundPosition = `${bgX}px ${bgY}px`;
    }
});

async function waitForUiSettle(ms = 650) {
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    if (ms > 0) {
        await new Promise((resolve) => setTimeout(resolve, ms));
    }
}

async function signalRendererReady() {
    try {
        await emubro.invoke('app:renderer-ready');
    } catch (_e) {}
}

// ===== Initialization =====
async function initializeApp() {
    try {
        // Let CSS target OS-specific chrome effects (frameless window frame, etc).
        if (emubro.platform) {
            document.documentElement.setAttribute('data-os', String(emubro.platform));
        }

        // Deep-link launches (emubro://launch?...)
        emubro.onLaunch((data) => {
            console.log('Launch game request:', data);
            // TODO: map {platform,name,code} to an installed game and trigger launch.
        });

        // Initialize theme
        const savedTheme = localStorage.getItem('theme') || 'dark';
        setTheme(savedTheme);
        updateThemeSelector();
        if (themeSelect) {
            themeSelect.value = savedTheme;
            themeSelect.addEventListener('change', (e) => {
                setTheme(e.target.value);
                localStorage.setItem('theme', e.target.value);
            });
        }

        // Initialize i18n
        await initI18n(() => {
            updateThemeSelector();
            renderActiveLibraryView();
            renderThemeManager();
        });
        updateUILanguage();
        updateThemeSelector();
        populateLanguageSelector();
        initLanguageManager();
        initDocking();

        // Old select listener removed as it is now custom dropdown handled in i18n-manager

        // Load data
        const userInfo = await emubro.invoke('get-user-info');
        const savedDefaultSection = String(localStorage.getItem('emuBro.defaultLibrarySection') || 'all').trim().toLowerCase();
        if (savedDefaultSection) activeLibrarySection = savedDefaultSection;
        setActiveViewButton(localStorage.getItem('emuBro.defaultLibraryView') || 'cover');
        
        const stats = await emubro.invoke('get-library-stats');
        if (totalGamesElement) totalGamesElement.textContent = stats.totalGames;
        if (playTimeElement) playTimeElement.textContent = stats.totalPlayTime;
        
        const games = await emubro.invoke('get-games');
        setGames(games);
        setFilteredGames([...games]);
        setupViewScaleControl();
        setAppMode('library');
        await refreshEmulatorsState();
        await renderActiveLibraryView();
        initializePlatformFilterOptions();
        updateLibraryCounters();
        
        // Set up event listeners
        setupEventListeners();
        await setActiveLibrarySection(activeLibrarySection);
        await waitForUiSettle(650);
        await signalRendererReady();
        
        log.info('App initialized successfully');
    } catch (error) {
        log.error('Failed to initialize app:', error);
        await signalRendererReady();
    }
}

function setupEventListeners() {
    setupSidebarRail();

    // Search
    const searchInput = document.querySelector('.search-bar input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            if (activeTopSection !== 'library') return;

            const searchTerm = e.target.value.toLowerCase();

            if (activeLibrarySection === 'emulators') {
                renderEmulators(getFilteredEmulatorsForSection(), getEmulatorRenderOptions());
                return;
            }

            const filtered = getGames().filter((game) => {
                const name = String(game.name || '').toLowerCase();
                const platform = String(game.platform || game.platformShortName || '').toLowerCase();
                return name.includes(searchTerm) || platform.includes(searchTerm);
            });
            setFilteredGames(filtered);
            renderGames(getSectionFilteredGames());
        });
    }

    // Filters
    const platformFilter = document.getElementById('platform-filter');
    if (platformFilter) {
        platformFilter.addEventListener('change', () => {
            if (activeLibrarySection === 'emulators') {
                renderEmulators(getFilteredEmulatorsForSection(), getEmulatorRenderOptions());
                return;
            }
            applyFilters();
            renderGames(getSectionFilteredGames());
        });
    }
    
    const sortFilter = document.getElementById('sort-filter');
    if (sortFilter) {
        sortFilter.addEventListener('change', () => {
            if (activeLibrarySection === 'emulators') {
                renderEmulators(getFilteredEmulatorsForSection(), getEmulatorRenderOptions());
                return;
            }
            applyFilters();
            renderGames(getSectionFilteredGames());
        });
    }

    if (emulatorsInstalledToggle) {
        emulatorsInstalledToggle.checked = false;
        emulatorsInstalledToggle.addEventListener('change', async () => {
            if (activeTopSection !== 'library' || activeLibrarySection !== 'emulators') return;
            await renderActiveLibraryView();
        });
    }

    // Theme Actions
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);

    const invertBtn = document.getElementById('invert-colors-btn');
    if (invertBtn) invertBtn.addEventListener('click', invertColors);
    
    if (themeManagerBtn) themeManagerBtn.addEventListener('click', () => {
        openThemeManager();
    });

    const languageManagerBtn = document.getElementById('language-manager-btn');
    if (languageManagerBtn) {
        languageManagerBtn.addEventListener('click', () => {
            openLanguageManager();
        });
    }
    
    if (closeThemeManagerBtn) closeThemeManagerBtn.addEventListener('click', () => {
        if (getHasUnsavedChanges()) {
            if (!confirm(i18n.t('messages.unsavedChanges'))) return;
        }
        themeManagerModal.classList.remove('active');
        themeManagerModal.style.display = 'none';
        
        // If it was docked, completely remove it from the dock Set as well
        if (themeManagerModal.classList.contains('docked-right')) {
            completelyRemoveFromDock('theme-manager-modal');
        } else {
            removeFromDock('theme-manager-modal');
        }
        
        hideThemeForm();
        setHasUnsavedChanges(false);
    });

    const pinThemeManagerBtn = document.getElementById('pin-theme-manager');
    if (pinThemeManagerBtn) {
        pinThemeManagerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDock('theme-manager-modal', 'pin-theme-manager');
        });
    }

    const pinLanguageManagerBtn = document.getElementById('pin-language-manager');
    if (pinLanguageManagerBtn) {
        pinLanguageManagerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDock('language-manager-modal', 'pin-language-manager');
        });
    }

    if (themeManagerModal) {
        themeManagerModal.addEventListener('click', (e) => {
            if (e.target === themeManagerModal) {
                if (getHasUnsavedChanges()) {
                    if (!confirm(i18n.t('messages.unsavedChanges'))) return;
                }
                themeManagerModal.classList.remove('active');
                hideThemeForm();
                setHasUnsavedChanges(false);
            }
        });
    }

    // Global Theme Settings
    const globalCornerStyle = document.getElementById('global-corner-style');
    if (globalCornerStyle) {
        globalCornerStyle.value = localStorage.getItem('globalCornerStyle') || 'rounded';
        globalCornerStyle.addEventListener('change', (e) => {
            const style = e.target.value;
            localStorage.setItem('globalCornerStyle', style);
            applyCornerStyle(style);
        });
    }

    const globalOverrideBg = document.getElementById('global-override-background');
    if (globalOverrideBg) {
        globalOverrideBg.checked = localStorage.getItem('globalOverrideBackground') === 'true';
        globalOverrideBg.addEventListener('change', (e) => {
            localStorage.setItem('globalOverrideBackground', e.target.checked);
            // Re-apply current theme to respect new override setting
            setTheme(getCurrentTheme());
        });
    }

    // Theme Form Actions
    const createThemeBtn = document.getElementById('create-theme-btn');
    if (createThemeBtn) createThemeBtn.addEventListener('click', () => {
        document.getElementById('form-title').textContent = i18n.t('theme.createTitle');
        resetThemeForm();
        document.getElementById('theme-form').style.display = 'flex';
        setupColorPickerListeners();
        setupBackgroundImageListeners();
    });

    const saveThemeBtn = document.getElementById('save-theme-btn');
    if (saveThemeBtn) saveThemeBtn.addEventListener('click', saveTheme);

    const cancelThemeBtn = document.getElementById('cancel-theme-btn');
    if (cancelThemeBtn) cancelThemeBtn.addEventListener('click', hideThemeForm);

    const refreshThemesBtn = document.getElementById('refresh-themes-btn');
    if (refreshThemesBtn) {
        refreshThemesBtn.addEventListener('click', () => {
            renderMarketplace(true);
        });
    }

    // Marketplace Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.target.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            if (target === 'marketplace') {
                document.getElementById('local-themes-view').style.display = 'none';
                document.getElementById('marketplace-view').style.display = 'block';
                renderMarketplace();
            } else {
                document.getElementById('local-themes-view').style.display = 'block';
                document.getElementById('marketplace-view').style.display = 'none';
            }
        });
    });

    // View Toggles
    document.querySelectorAll('.view-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
            e.currentTarget.classList.add('active');
            updateViewSizeControlState();
            gamesContainer.className = 'games-container ' + e.currentTarget.dataset.view + '-view';
            if (activeTopSection !== 'library') return;
            await renderActiveLibraryView();
        });
    });

    // Header Navigation
    const navLinks = document.querySelectorAll('.navigation a');
    navLinks.forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const target = String(e.currentTarget.dataset.navTarget || e.currentTarget.textContent || '').trim().toLowerCase();
            if (target === 'tools') {
                setAppMode('tools');
                showToolView(); // Show overview
            } else if (target === 'community') {
                setAppMode('community');
                showCommunityView();
            } else if (target === 'library') {
                setAppMode('library');
                await renderActiveLibraryView();
            }
        });
    });

    // Sidebar library sections
    document.querySelectorAll('#sidebar-content a[data-view]').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            setAppMode('library');
            await setActiveLibrarySection(e.currentTarget.dataset.view || 'all');
        });
    });

    // Tools
    document.querySelectorAll('[data-tool]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            setAppMode('tools');
            showToolView(e.currentTarget.dataset.tool);
        });
    });

    document.querySelectorAll('.game-details-tab[data-footer-tab]').forEach((tabBtn) => {
        tabBtn.addEventListener('click', () => {
            openFooterPanel(tabBtn.dataset.footerTab || 'browse');
        });
    });

    const initialBrowseScope = normalizeBrowseScope(localStorage.getItem(BROWSE_SCOPE_STORAGE_KEY) || 'both');
    applyBrowseScopeSelection(initialBrowseScope);
    document.querySelectorAll('.browse-scope-btn[data-browse-scope]').forEach((button) => {
        button.addEventListener('click', () => {
            const selectedScope = normalizeBrowseScope(button.dataset.browseScope || 'both');
            applyBrowseScopeSelection(selectedScope);
        });
    });

    const quickSearchBtn = document.getElementById('browse-quick-search-btn');
    if (quickSearchBtn) {
        quickSearchBtn.addEventListener('click', async () => {
            await runBrowseSearch('quick', { scope: getBrowseScopeSelection() });
        });
    }

    const customSearchBtn = document.getElementById('browse-search-games-btn');
    if (customSearchBtn) {
        customSearchBtn.addEventListener('click', async () => {
            await runBrowseSearch('custom', { scope: getBrowseScopeSelection() });
        });
    }

    const archivesBtn = document.getElementById('browse-archives-btn');
    if (archivesBtn) {
        archivesBtn.addEventListener('click', () => {
            addFooterNotification('Archive browser will be expanded in a future update.', 'info');
            openFooterPanel('notifications');
        });
    }

    const zipBtn = document.getElementById('browse-zip-btn');
    if (zipBtn) {
        zipBtn.addEventListener('click', () => {
            addFooterNotification('ZIP setup scanning is not fully wired yet. Use Quick Search for now.', 'warning');
            openFooterPanel('notifications');
        });
    }

    if (openFooterBtn) {
        openFooterBtn.addEventListener('click', () => {
            openFooterPanel('browse');
        });
    }

    if (closeGameDetailsBtn) {
        closeGameDetailsBtn.addEventListener('click', () => {
            if (gameDetailsFooter) gameDetailsFooter.style.display = 'none';
        });
    }

    if (pinFooterBtn) {
        pinFooterBtn.addEventListener('click', () => {
            const footer = document.getElementById('game-details-footer');
            const isPinned = footer.classList.toggle('pinned');
            if (isPinned) {
                footer.classList.remove('glass');
                pinFooterBtn.classList.add('active');
                pinFooterBtn.innerHTML = getLockIconMarkup();
            } else {
                footer.classList.add('glass');
                pinFooterBtn.classList.remove('active');
                pinFooterBtn.innerHTML = getPushpinIconMarkup();
            }
        });
    }

    addFooterNotification('Welcome to emuBro. Browse and launch your games from the library.', 'info');
    addFooterNotification('Use the "Browse Computer" tab to scan games and emulators.', 'info');
    switchFooterTab('browse');
    updateQuickSearchButtonState();

    setupDragDrop();
    setupWindowResizeHandler();
    setupWindowControls();
}

function setupWindowControls() {
    const minBtn = document.getElementById('win-min-btn');
    const maxBtn = document.getElementById('win-max-btn');
    const closeBtn = document.getElementById('win-close-btn');
    const header = document.querySelector('header.header');

    // If the build uses native frame, these buttons can be hidden via CSS later.
    if (minBtn) minBtn.addEventListener('click', () => emubro.invoke('window:minimize'));
    if (closeBtn) closeBtn.addEventListener('click', () => emubro.invoke('window:close'));
    if (maxBtn) maxBtn.addEventListener('click', async () => {
        await emubro.invoke('window:toggle-maximize');
        updateMaxIcon();
    });

    const setWindowStateAttr = (isMax) => {
        try {
            document.documentElement.setAttribute('data-window-state', isMax ? 'maximized' : 'normal');
        } catch (_e) {}
    };

    const updateMaxIcon = async (forcedIsMax) => {
        if (!maxBtn) return;
        try {
            const isMax = (typeof forcedIsMax === 'boolean')
                ? forcedIsMax
                : await emubro.invoke('window:is-maximized');
            maxBtn.textContent = isMax ? '❐' : '▢';
            maxBtn.title = isMax ? 'Restore' : 'Maximize';
            maxBtn.setAttribute('aria-label', isMax ? 'Restore' : 'Maximize');
            setWindowStateAttr(isMax);
        } catch (_e) {}
    };

    updateMaxIcon();

    // Update state when OS changes maximize (Win+Up, dragging to top, etc).
    if (typeof emubro.onWindowMaximizedChanged === 'function') {
        emubro.onWindowMaximizedChanged((isMax) => updateMaxIcon(!!isMax));
    }

    // Double click the header background to toggle maximize (common Windows behavior).
    if (header) {
        header.addEventListener('dblclick', async (e) => {
            // Ignore dblclick on interactive controls
            if (e.target.closest('button, input, select, textarea, a, .custom-select, .options-list')) return;
            await emubro.invoke('window:toggle-maximize');
            updateMaxIcon();
        });
    }
}

function setupSidebarRail() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');
    if (!sidebar || !toggleBtn) return;

    const stored = localStorage.getItem('emuBro.sidebarExpanded');
    const initialExpanded = stored === null ? false : stored === 'true';

    const setExpanded = (expanded) => {
        sidebar.classList.toggle('sidebar--expanded', expanded);
        sidebar.classList.toggle('sidebar--collapsed', !expanded);
        toggleBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        toggleBtn.title = expanded ? 'Collapse sidebar' : 'Expand sidebar';
        localStorage.setItem('emuBro.sidebarExpanded', expanded ? 'true' : 'false');
    };

    setExpanded(initialExpanded);

    toggleBtn.addEventListener('click', () => {
        const expanded = sidebar.classList.contains('sidebar--expanded');
        setExpanded(!expanded);
    });

    const railButtons = document.querySelectorAll('.rail-btn.rail-nav[data-rail-target]');
    railButtons.forEach(btn => {
        btn.addEventListener('click', async () => {
            const target = btn.dataset.railTarget;
            if (target === 'tools') {
                setAppMode('tools');
                showToolView();
                return;
            }

            if (target === 'community') {
                setAppMode('community');
                showCommunityView();
                return;
            }

            if (target === 'settings') {
                setActiveRailTarget('settings');
                await openLibraryPathSettingsModal();
                return;
            }

            if (target === 'profile') {
                setActiveRailTarget('profile');
                await openProfileModal();
                return;
            }

            // Default: return to library view
            setAppMode('library');
            await setActiveLibrarySection(activeLibrarySection || 'all');
        });
    });
}

let lastWindowWidth = window.innerWidth;
let lastWindowHeight = window.innerHeight;

function setupWindowResizeHandler() {
    window.addEventListener('resize', () => {
        const currentWidth = window.innerWidth;
        const currentHeight = window.innerHeight;

        // Check if window is getting smaller (width or height decreased)
        const isGettingSmaller = currentWidth < lastWindowWidth || currentHeight < lastWindowHeight;
        
        // Update last dimensions
        lastWindowWidth = currentWidth;
        lastWindowHeight = currentHeight;

        // Only proceed if getting smaller
        if (!isGettingSmaller) return;

        const modals = ['theme-manager-modal', 'language-manager-modal'];
        
        modals.forEach(id => {
            const modal = document.getElementById(id);
            if (!modal || !modal.classList.contains('active') || modal.classList.contains('docked-right')) {
                return;
            }

            const rect = modal.getBoundingClientRect();
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;

            // Calculate overlap area
            const visibleLeft = Math.max(0, rect.left);
            const visibleRight = Math.min(windowWidth, rect.right);
            const visibleTop = Math.max(0, rect.top);
            const visibleBottom = Math.min(windowHeight, rect.bottom);

            const visibleWidth = Math.max(0, visibleRight - visibleLeft);
            const visibleHeight = Math.max(0, visibleBottom - visibleTop);
            
            const totalArea = rect.width * rect.height;
            const visibleArea = visibleWidth * visibleHeight;

            // If more than 50% is outside (visible area < 50%)
            if (visibleArea < totalArea * 0.5) {
                // Add smooth class
                modal.classList.add('smooth-reset');
                
                // Reset to center
                modal.style.top = '';
                modal.style.left = '';
                modal.style.transform = ''; // Remove inline transform (if any from drag)
                modal.classList.remove('moved');
                
                // Remove smooth class after transition
                setTimeout(() => {
                    modal.classList.remove('smooth-reset');
                }, 800);
            }
        });
    });
}

function setupDragDrop() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    let dragCounter = 0;

    const isLibraryDropContext = () => {
        return activeTopSection === 'library';
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

    // Prevent default browser navigation on drop (especially in packaged builds).
    document.addEventListener('dragover', (e) => {
        if (!isFileDrag(e)) return;
        e.preventDefault();
    }, true);
    document.addEventListener('drop', (e) => {
        if (!isFileDrag(e)) return;
        e.preventDefault();
    }, true);

    const onEnter = (e) => {
        if (!isFileDrag(e)) return;
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
        if (!isFileDrag(e)) return;
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
        if (!isFileDrag(e)) return;
        e.preventDefault();
    };

    async function getPlatformsCached() {
        if (window.__emubroPlatforms) return window.__emubroPlatforms;
        const platforms = await emubro.invoke('get-platforms');
        window.__emubroPlatforms = Array.isArray(platforms) ? platforms : [];
        return window.__emubroPlatforms;
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

    async function promptPlatformForFiles(filePaths) {
        const platforms = await getPlatformsCached();

        const wrap = document.createElement('div');
        wrap.innerHTML = `
            <div style="margin-bottom:10px;font-weight:600;">Platform unknown</div>
            <div style="opacity:0.9;margin-bottom:10px;">Select the platform for these files and import them.</div>
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
            title: 'Import Files',
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

    async function importAndRefresh(paths, recursive) {
        const result = await emubro.importPaths(paths, { recursive });

        // Unknown/unmatched: offer platform picker for direct file drops.
        const unmatched = (result?.skipped || []).filter(s => s && s.reason === 'unmatched').map(s => s.path).filter(Boolean);
        if (unmatched.length > 0) {
            const pick = await promptPlatformForFiles(unmatched);
            if (pick && !pick.canceled && pick.platformShortName) {
                await emubro.invoke('import-files-as-platform', unmatched, pick.platformShortName);
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
        if (!isFileDrag(e)) return;
        e.preventDefault();
        dragCounter = 0;
        mainContent.classList.remove('drag-over');

        if (!isLibraryDropContext()) {
            // Allow tool-specific drop handlers (e.g. memory card slots)
            // to continue in target/bubble phase without global import.
            return;
        }

        const rawPaths = collectDroppedPaths(e.dataTransfer);
        if (rawPaths.length === 0) {
            alert('Drop failed: no filesystem paths found. Try dropping from Explorer directly.');
            return;
        }

        const staged = await promptImportStorageAction(rawPaths);
        if (!staged || staged.canceled) return;
        const resolvedPaths = dedupePaths(staged.paths);
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
                await importAndRefresh(otherPaths, recursive);
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

document.addEventListener('DOMContentLoaded', initializeApp);
