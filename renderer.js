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
    setupThemeCustomizationControls,
    applyCornerStyle,
    getCurrentTheme,
    makeDraggable,
    openThemeManager,
    recenterManagedModalIfMostlyOutOfView
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
import { showGlassMessageDialog } from './js/ui/glass-message-dialog';
import { openGlobalLlmTaggingSetupModal, createGlobalLlmProgressDialog } from './js/ui/llm-tagging-dialogs';
import { renderSuggestionResults as renderSuggestionResultsView } from './js/suggested-results-view';
import {
    normalizeSuggestionProvider,
    normalizeSuggestionScope,
    getDefaultSuggestionPromptTemplate,
    loadSuggestionSettings,
    saveSuggestionSettings
} from './js/suggestions-settings';
import {
    buildSuggestionLibraryPayloadFromRows,
    mapSuggestionLibraryMatchesToGames
} from './js/suggestions-core';
import {
    normalizeTagCategory,
    getGameTagIds,
    getTagCategoryCounts
} from './js/tag-categories';
import { setupDragDropManager } from './js/drag-drop-manager';
import { setupWindowControls, setupHeaderThemeControlsToggle, setupSidebarRail, setupWindowResizeHandler } from './js/window-ui-manager';
import { openLibraryPathSettingsModal as openLibraryPathSettingsModalView } from './js/settings/library-settings-modal';
import { setupRendererEventListeners } from './js/events/setup-renderer-events';
import { openProfileModalView } from './js/profile/profile-modal';
import { createCategoriesListRenderer } from './js/library/categories-list-renderer';
import { createSuggestionsPanelController } from './js/suggestions/suggestions-panel-controller';

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
const groupFilterSelect = document.getElementById('group-filter');
const gameLanguageFilterSelect = document.getElementById('game-language-filter');
const gameRegionFilterSelect = document.getElementById('game-region-filter');
const groupSameNamesToggle = document.getElementById('group-same-names-toggle');
const groupSameNamesToggleWrap = document.getElementById('group-same-names-toggle-wrap');

let activeLibrarySection = 'all';
let activeEmulatorTypeTab = 'standalone';
let activeTopSection = 'library';
let activeTagCategory = 'all';
let activeTagCategories = new Set();
const QUICK_SEARCH_STATE_KEY = 'emuBro.quickSearchState.v1';
const BROWSE_SCOPE_STORAGE_KEY = 'emuBro.browseScope.v1';
const CATEGORY_SELECTION_MODE_KEY = 'emuBro.categorySelectionMode.v1';
const LLM_HELPERS_ENABLED_KEY = 'emuBro.llmHelpersEnabled';
const LLM_ALLOW_UNKNOWN_TAGS_KEY = 'emuBro.llmAllowUnknownTags';
const GROUP_BY_MODE_KEY = 'emuBro.groupByMode';
const GROUP_SAME_NAMES_KEY = 'emuBro.groupSameNamesEnabled';
const GAME_LANGUAGE_FILTER_KEY = 'emuBro.gameLanguageFilter';
const GAME_REGION_FILTER_KEY = 'emuBro.gameRegionFilter';
const SUGGESTED_SECTION_KEY = 'suggested';
const SUPPORTED_LIBRARY_SECTIONS = new Set(['all', 'installed', 'recent', SUGGESTED_SECTION_KEY, 'emulators']);
let suggestedCoverGames = [];
let categorySelectionMode = normalizeCategorySelectionMode(localStorage.getItem(CATEGORY_SELECTION_MODE_KEY) || 'single');
let llmHelpersEnabled = localStorage.getItem(LLM_HELPERS_ENABLED_KEY) !== 'false';
let llmAllowUnknownTags = localStorage.getItem(LLM_ALLOW_UNKNOWN_TAGS_KEY) === 'true';
let categoriesShowAll = false;
const CATEGORY_VISIBLE_LIMIT = 10;
let categoriesListRenderer = null;
let suggestionsPanelController = null;
let lastBrowseDiscovery = {
    archives: [],
    setupFiles: [],
    scope: 'both',
    scannedAt: ''
};

function normalizeCategorySelectionMode(value) {
    const mode = String(value || '').trim().toLowerCase();
    return mode === 'multi' ? 'multi' : 'single';
}

function getActiveCategorySelectionSet() {
    if (categorySelectionMode === 'multi') {
        return new Set(Array.from(activeTagCategories || []).map((tag) => normalizeTagCategory(tag)).filter((tag) => tag !== 'all'));
    }
    const single = normalizeTagCategory(activeTagCategory);
    return single === 'all' ? new Set() : new Set([single]);
}

function clearCategorySelection() {
    activeTagCategory = 'all';
    activeTagCategories = new Set();
}

function setCategorySelectionMode(mode, { persist = true } = {}) {
    const normalized = normalizeCategorySelectionMode(mode);
    if (normalized === categorySelectionMode) return;

    const selected = Array.from(getActiveCategorySelectionSet());
    categorySelectionMode = normalized;
    if (categorySelectionMode === 'multi') {
        activeTagCategories = new Set(selected);
        activeTagCategory = selected[0] || 'all';
    } else {
        activeTagCategory = selected[0] || 'all';
        activeTagCategories = activeTagCategory === 'all' ? new Set() : new Set([activeTagCategory]);
    }
    if (persist) {
        localStorage.setItem(CATEGORY_SELECTION_MODE_KEY, categorySelectionMode);
    }
}

function setLlmHelpersEnabled(nextValue, { persist = true, rerender = true } = {}) {
    llmHelpersEnabled = !!nextValue;
    if (persist) {
        localStorage.setItem(LLM_HELPERS_ENABLED_KEY, llmHelpersEnabled ? 'true' : 'false');
    }
    document.documentElement.setAttribute('data-llm-helpers', llmHelpersEnabled ? 'enabled' : 'disabled');

    const suggestedLink = document.querySelector('#sidebar-content .sidebar-section a[data-view="suggested"]');
    if (suggestedLink && suggestedLink.parentElement) {
        suggestedLink.parentElement.classList.toggle('is-hidden', !llmHelpersEnabled);
    }

    if (!llmHelpersEnabled && normalizeLibrarySection(activeLibrarySection) === SUGGESTED_SECTION_KEY) {
        activeLibrarySection = 'all';
        setActiveSidebarLibraryLink(activeLibrarySection);
        setGamesHeaderByLibrarySection(activeLibrarySection);
    }

    updateSuggestedPanelVisibility();
    void renderCategoriesList();
    if (rerender && activeTopSection === 'library') {
        void renderActiveLibraryView();
    }
}

function setLlmAllowUnknownTagsEnabled(nextValue, { persist = true } = {}) {
    llmAllowUnknownTags = !!nextValue;
    if (persist) {
        localStorage.setItem(LLM_ALLOW_UNKNOWN_TAGS_KEY, llmAllowUnknownTags ? 'true' : 'false');
    }
}

function confirmDisableLlmHelpersFlow() {
    const stepOne = window.confirm(
        'We understand that AI sucks and you might not want to use it.\n\n' +
        'Before disabling: emuBro can run LLM features fully local (for example with Ollama), we do not call home, and we definitely do not sell your soul.\n\n' +
        'Disable LLM helpers anyway?'
    );
    if (!stepOne) return false;

    const stepTwo = window.confirm(
        'Are you really really sure?\n\n' +
        'LLM helpers can speed up tagging, discovery, and recommendations, and still stay local/private.\n\n' +
        'Proceed with disabling?'
    );
    if (!stepTwo) return false;

    const stepThree = window.confirm(
        'At this point, the user might be upset a bit, do you want me to ....?\n\n' +
        'Final check: disable all LLM helpers in the UI now?'
    );
    if (!stepThree) return false;

    window.alert('LLM helpers are now hidden. If you change your mind, the toggle is waiting for your glorious return.');
    return true;
}

function normalizeLibrarySection(section) {
    const value = String(section || '').trim().toLowerCase();
    if ((value === 'wishlist' || value === SUGGESTED_SECTION_KEY) && !llmHelpersEnabled) return 'all';
    if (value === 'wishlist') return SUGGESTED_SECTION_KEY;
    if (SUPPORTED_LIBRARY_SECTIONS.has(value)) return value;
    return 'all';
}

function normalizeGroupByMode(value) {
    const mode = String(value || '').trim().toLowerCase();
    if (mode === 'platform' || mode === 'company') return mode;
    return 'none';
}

function restoreSelectValueFromStorage(selectEl, storageKey, fallback = 'all') {
    if (!selectEl) return;
    const stored = String(localStorage.getItem(storageKey) || fallback).trim().toLowerCase();
    const hasStored = Array.from(selectEl.options || []).some((option) => String(option.value || '').trim().toLowerCase() === stored);
    selectEl.value = hasStored ? stored : fallback;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}



function syncCategoryStateFromSelectionSet(selectedSet) {
    const normalized = new Set(Array.from(selectedSet || []).map((tag) => normalizeTagCategory(tag)).filter((tag) => tag !== 'all'));
    activeTagCategories = normalized;
    activeTagCategory = normalized.size > 0 ? Array.from(normalized)[0] : 'all';
}

categoriesListRenderer = createCategoriesListRenderer({
    emubro,
    getGames,
    setGames,
    setFilteredGames,
    renderActiveLibraryView,
    isLibraryTopSection: () => activeTopSection === 'library',
    isEmulatorsSection: () => activeLibrarySection === 'emulators',
    showGlassMessageDialog,
    normalizeTagCategory,
    getTagCategoryCounts,
    getActiveCategorySelectionSet,
    clearCategorySelection,
    setCategorySelectionMode,
    getCategorySelectionMode: () => categorySelectionMode,
    syncCategoryStateFromSelectionSet,
    escapeHtml,
    isLlmHelpersEnabled: () => llmHelpersEnabled,
    isLlmAllowUnknownTagsEnabled: () => llmAllowUnknownTags,
    loadSuggestionSettings,
    normalizeSuggestionProvider,
    openGlobalLlmTaggingSetupModal,
    createGlobalLlmProgressDialog,
    getSectionFilteredGames,
    getGameTagIds,
    addFooterNotification,
    openFooterPanel,
    applyFilters,
    categoryVisibleLimit: CATEGORY_VISIBLE_LIMIT,
    initialTagLabelMap: new Map(),
    initialCategoriesShowAll: categoriesShowAll
});

async function renderCategoriesList() {
    if (!categoriesListRenderer) return;
    await categoriesListRenderer.renderCategoriesList();
    categoriesShowAll = !!categoriesListRenderer.getCategoriesShowAll();
}




function applyCategoryFilter(rows) {
    const source = Array.isArray(rows) ? rows : [];
    const selected = getActiveCategorySelectionSet();
    if (selected.size === 0) return source;
    return source.filter((game) => getGameTagIds(game).some((tag) => selected.has(tag)));
}

suggestionsPanelController = createSuggestionsPanelController({
    emubro,
    getGames,
    setSuggestedCoverGames: (rows) => {
        suggestedCoverGames = Array.isArray(rows) ? rows : [];
    },
    renderGames,
    getSectionFilteredGames,
    getActiveTopSection: () => activeTopSection,
    getActiveLibrarySection: () => activeLibrarySection,
    isLlmHelpersEnabled: () => llmHelpersEnabled,
    suggestedSectionKey: SUGGESTED_SECTION_KEY,
    escapeHtml
});

function updateSuggestedPanelVisibility() {
    if (!suggestionsPanelController) return;
    suggestionsPanelController.updateSuggestedPanelVisibility();
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
            ? `Found ${count} archive file(s) in the latest scan.`
            : 'Browse archive files in your latest search results.';
    }
    if (setupSubtitle) {
        const count = Number(lastBrowseDiscovery?.setupFiles?.length || 0);
        setupSubtitle.textContent = count > 0
            ? `Found ${count} setup file(s) matching platform config patterns.`
            : 'Show setup/install files detected from config setupFileMatch patterns.';
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
                ? 'No setup files were detected in the latest search.'
                : 'No archive files were detected in the latest search.',
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

    const title = normalizedKind === 'setup' ? 'Detected Setup Files' : 'Detected Archives';
    modal.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
            <h2 style="margin:0;font-size:1.15rem;">${title}</h2>
            <button type="button" class="close-btn" data-close-browse-results>&times;</button>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
            <div style="color:var(--text-secondary);font-size:0.9rem;">
                ${paths.length} file(s) from latest ${escapeHtml(String(lastBrowseDiscovery.scope || 'both'))} scan.
            </div>
            <button type="button" class="action-btn" data-open-folder-all>Open first in Explorer</button>
        </div>
        <div style="border:1px solid var(--border-color);border-radius:10px;max-height:56vh;overflow:auto;padding:8px;background:color-mix(in srgb,var(--bg-primary),transparent 14%);">
            ${paths.map((p, idx) => `
                <div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:8px 6px;border-bottom:1px solid color-mix(in srgb,var(--border-color),transparent 40%);">
                    <div style="font-family:monospace;font-size:12px;word-break:break-all;">${escapeHtml(String(p || ''))}</div>
                    <button type="button" class="action-btn small" data-open-item="${idx}">Show</button>
                </div>
            `).join('')}
        </div>
    `;

    const close = () => overlay.remove();
    modal.querySelectorAll('[data-close-browse-results]').forEach((btn) => btn.addEventListener('click', close));
    modal.querySelector('[data-open-folder-all]')?.addEventListener('click', async () => {
        const first = String(paths[0] || '').trim();
        if (!first) return;
        try {
            await emubro.invoke('show-item-in-folder', first);
        } catch (_e) {}
    });
    modal.querySelectorAll('[data-open-item]').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const idx = Number(btn.getAttribute('data-open-item') || -1);
            const target = idx >= 0 ? String(paths[idx] || '').trim() : '';
            if (!target) return;
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
            `Search complete. ${foundGames} game(s), ${foundEmulators} emulator(s), ${foundArchives} archive(s), ${foundSetupFiles} setup file(s), ${Math.max(1, deduped.length)} location(s).`,
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
    updateGroupingControlsVisibility();
    updateSuggestedPanelVisibility();
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
    await openLibraryPathSettingsModalView({
        emubro,
        getLibraryPathSettings,
        saveLibraryPathSettings,
        normalizePathList,
        normalizeLibrarySection,
        getActiveLibrarySection: () => activeLibrarySection,
        setActiveLibrarySectionState: (section) => {
            activeLibrarySection = normalizeLibrarySection(section || 'all');
        },
        isLibraryTopSection: () => activeTopSection === 'library',
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
        llmHelpersEnabledKey: LLM_HELPERS_ENABLED_KEY,
        llmAllowUnknownTagsKey: LLM_ALLOW_UNKNOWN_TAGS_KEY,
        suggestedSectionKey: SUGGESTED_SECTION_KEY
    });
}

async function openProfileModal() {
    await openProfileModalView({
        emubro,
        openLibraryPathSettingsModal
    });
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

function updateGroupingControlsVisibility() {
    const showForGames = activeTopSection === 'library' && activeLibrarySection !== 'emulators';
    if (groupFilterSelect) {
        groupFilterSelect.classList.toggle('is-hidden', !showForGames);
    }
    if (gameLanguageFilterSelect) {
        gameLanguageFilterSelect.classList.toggle('is-hidden', !showForGames);
    }
    if (gameRegionFilterSelect) {
        gameRegionFilterSelect.classList.toggle('is-hidden', !showForGames);
    }
    if (groupSameNamesToggleWrap) {
        groupSameNamesToggleWrap.classList.toggle('is-hidden', !showForGames);
    }
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
    const isLocked = activeView === 'random';

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
        document.documentElement.style.setProperty('--view-scale-user', String(scale));
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
    const normalizedSection = normalizeLibrarySection(section);

    if (normalizedSection === 'emulators') {
        gamesHeader.textContent = 'Emulators';
        return;
    }

    if (normalizedSection === 'installed') {
        gamesHeader.textContent = 'Installed Games';
        return;
    }

    if (normalizedSection === 'recent') {
        gamesHeader.textContent = 'Recently Played';
        return;
    }

    if (normalizedSection === SUGGESTED_SECTION_KEY) {
        gamesHeader.textContent = 'Suggested Games';
        return;
    }

    gamesHeader.textContent = i18n.t('gameGrid.featuredGames') || 'Featured Games';
}

function getSectionFilteredGames() {
    const filtered = applyCategoryFilter(getFilteredGames());

    if (activeLibrarySection === 'installed') {
        return filtered.filter((game) => !!game.isInstalled);
    }

    if (activeLibrarySection === 'recent') {
        return [...filtered]
            .filter((game) => !!game.lastPlayed)
            .sort((a, b) => new Date(b.lastPlayed).getTime() - new Date(a.lastPlayed).getTime());
    }

    if (activeLibrarySection === SUGGESTED_SECTION_KEY) {
        const suggestedRows = Array.isArray(suggestedCoverGames) ? [...suggestedCoverGames] : [];
        if (!suggestedRows.length) return [];
        applyFilters(false, suggestedRows);
        return applyCategoryFilter(getFilteredGames());
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
    updateSuggestedPanelVisibility();

    if (activeLibrarySection === 'emulators') {
        if (!getEmulators().length) await refreshEmulatorsState();
        initializePlatformFilterOptions(getEmulators());
        renderEmulators(getFilteredEmulatorsForSection(), getEmulatorRenderOptions());
        return;
    }

    initializePlatformFilterOptions(getGames());
    applyFilters(false);
    if (activeLibrarySection === SUGGESTED_SECTION_KEY) {
        const suggestedRows = getSectionFilteredGames();
        if (suggestedRows.length === 0) {
            const activeView = document.querySelector('.view-btn.active')?.dataset?.view || 'cover';
            gamesContainer.className = `games-container ${activeView}-view`;
            gamesContainer.innerHTML = '<p class="suggested-empty-state">Generate suggestions to show recommended games here.</p>';
            return;
        }
    }
    renderGames(getSectionFilteredGames());
}

async function setActiveLibrarySection(section) {
    setAppMode('library');
    activeLibrarySection = normalizeLibrarySection(section || 'all');
    setActiveSidebarLibraryLink(activeLibrarySection);
    setGamesHeaderByLibrarySection(activeLibrarySection);
    updateEmulatorsInstalledToggleVisibility();
    updateGroupingControlsVisibility();
    updateSuggestedPanelVisibility();
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
        setLlmHelpersEnabled(llmHelpersEnabled, { persist: false, rerender: false });

        // Old select listener removed as it is now custom dropdown handled in i18n-manager

        // Load data
        const userInfo = await emubro.invoke('get-user-info');
        const savedDefaultSection = normalizeLibrarySection(localStorage.getItem('emuBro.defaultLibrarySection') || 'all');
        if (savedDefaultSection) activeLibrarySection = savedDefaultSection;
        setActiveViewButton(localStorage.getItem('emuBro.defaultLibraryView') || 'cover');
        if (groupFilterSelect) {
            groupFilterSelect.value = normalizeGroupByMode(localStorage.getItem(GROUP_BY_MODE_KEY) || 'none');
        }
        restoreSelectValueFromStorage(gameLanguageFilterSelect, GAME_LANGUAGE_FILTER_KEY, 'all');
        restoreSelectValueFromStorage(gameRegionFilterSelect, GAME_REGION_FILTER_KEY, 'all');
        if (groupSameNamesToggle) {
            groupSameNamesToggle.checked = localStorage.getItem(GROUP_SAME_NAMES_KEY) === 'true';
        }
        
        const stats = await emubro.invoke('get-library-stats');
        if (totalGamesElement) totalGamesElement.textContent = stats.totalGames;
        if (playTimeElement) playTimeElement.textContent = stats.totalPlayTime;
        
        const games = await emubro.invoke('get-games');
        setGames(games);
        setFilteredGames([...games]);
        await renderCategoriesList();
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
    setupRendererEventListeners({
        setupSidebarRail,
        setAppMode,
        showToolView,
        showCommunityView,
        setActiveRailTarget,
        openLibraryPathSettingsModal,
        openProfileModal,
        setActiveLibrarySection,
        getActiveTopSection: () => activeTopSection,
        getActiveLibrarySection: () => activeLibrarySection,

        renderEmulators,
        getFilteredEmulatorsForSection,
        getEmulatorRenderOptions,
        applyFilters,
        renderGames,
        getSectionFilteredGames,
        renderActiveLibraryView,
        refreshEmulatorsState,

        gameLanguageFilterSelect,
        gameRegionFilterSelect,
        groupFilterSelect,
        groupSameNamesToggle,
        emulatorsInstalledToggle,

        normalizeGroupByMode,
        groupByModeKey: GROUP_BY_MODE_KEY,
        groupSameNamesKey: GROUP_SAME_NAMES_KEY,
        gameLanguageFilterKey: GAME_LANGUAGE_FILTER_KEY,
        gameRegionFilterKey: GAME_REGION_FILTER_KEY,

        toggleTheme,
        invertColors,
        themeManagerBtn,
        openThemeManager,
        openLanguageManager,
        closeThemeManagerBtn,
        getHasUnsavedChanges,
        i18n,
        themeManagerModal,
        completelyRemoveFromDock,
        removeFromDock,
        hideThemeForm,
        setHasUnsavedChanges,
        toggleDock,

        applyCornerStyle,
        setTheme,
        getCurrentTheme,
        resetThemeForm,
        setupThemeCustomizationControls,
        setupColorPickerListeners,
        setupBackgroundImageListeners,
        saveTheme,
        renderMarketplace,

        updateViewSizeControlState,
        gamesContainer,

        renderCategoriesList,
        getActiveCategorySelectionSet,

        openFooterPanel,
        normalizeBrowseScope,
        browseScopeStorageKey: BROWSE_SCOPE_STORAGE_KEY,
        applyBrowseScopeSelection,
        runBrowseSearch,
        getBrowseScopeSelection,
        openBrowseDiscoveryModal,

        openFooterBtn,
        closeGameDetailsBtn,
        gameDetailsFooter,
        pinFooterBtn,
        getLockIconMarkup,
        getPushpinIconMarkup,
        addFooterNotification,
        switchFooterTab,
        updateQuickSearchButtonState,
        updateBrowseDiscoveryCardLabels,

        setupDragDropManager,
        emubro,
        escapeHtml,
        initializePlatformFilterOptions,
        updateLibraryCounters,
        setGames,
        setFilteredGames,

        setupWindowResizeHandler,
        recenterManagedModalIfMostlyOutOfView,
        setupWindowControls,
        setupHeaderThemeControlsToggle,
        themeSelect
    });
}


document.addEventListener('DOMContentLoaded', initializeApp);
