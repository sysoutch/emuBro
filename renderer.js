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
import { showSupportView } from './js/support-manager';
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
import { createBrowseFooterController } from './js/library/browse-footer-controller';
import { createLibraryViewController } from './js/library/library-view-controller';

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
const SUPPORTED_LIBRARY_SECTIONS = new Set(['all', 'favorite', 'recent', SUGGESTED_SECTION_KEY, 'emulators']);
let suggestedCoverGames = [];
let categorySelectionMode = normalizeCategorySelectionMode(localStorage.getItem(CATEGORY_SELECTION_MODE_KEY) || 'multi');
let llmHelpersEnabled = localStorage.getItem(LLM_HELPERS_ENABLED_KEY) !== 'false';
let llmAllowUnknownTags = localStorage.getItem(LLM_ALLOW_UNKNOWN_TAGS_KEY) === 'true';
let categoriesShowAll = false;
const CATEGORY_VISIBLE_LIMIT = 10;
let categoriesListRenderer = null;
let suggestionsPanelController = null;
let browseFooterController = null;
let libraryViewController = null;

// Forward declarations for functions that might be used before their full definition due to circular dependencies
// This is a common pattern in large JS files that get refactored into modules
// Declare functions that need to be hoisted and potentially overwritten by local variables
// These are assigned later in the file.
let renderActiveLibraryView;
let setActiveLibrarySection;
let refreshEmulatorsState;
let updateLibraryCounters;

function normalizeCategorySelectionMode(value) {
    const mode = String(value || "").trim().toLowerCase();
    return mode === "multi" ? "multi" : "single";
}

// Redefine functions to ensure they are available before assignments
// (This section should be empty after initial forward declarations)

function getActiveCategorySelectionSet() {
    if (categorySelectionMode === 'multi') {
        return new Set(Array.from(activeTagCategories || []).map((tag) => normalizeTagCategory(tag)).filter((tag) => tag !== 'all'));
    }
    if (activeTagCategories instanceof Set && activeTagCategories.size > 1) {
        return new Set(Array.from(activeTagCategories).map((tag) => normalizeTagCategory(tag)).filter((tag) => tag !== 'all'));
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
    if (value === 'installed') return 'favorite';
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
    renderActiveLibraryView: async () => {
        if (typeof renderActiveLibraryView === 'function') {
            await renderActiveLibraryView();
        }
    },
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

browseFooterController = createBrowseFooterController({
    emubro,
    gameDetailsFooter,
    escapeHtml,
    normalizePathList,
    quickSearchStateKey: QUICK_SEARCH_STATE_KEY,
    browseScopeStorageKey: BROWSE_SCOPE_STORAGE_KEY,
    getGames,
    getEmulators,
    getLibraryPathSettings,
    setAppMode,
    searchForGamesAndEmulators,
    refreshEmulatorsState,
    renderActiveLibraryView,
    updateLibraryCounters
});

function switchFooterTab(tabId = 'browse') {
    browseFooterController?.switchFooterTab(tabId);
}

function openFooterPanel(tabId = 'browse') {
    browseFooterController?.openFooterPanel(tabId);
}

function addFooterNotification(message, level = 'info') {
    browseFooterController?.addFooterNotification(message, level);
}

function normalizeBrowseScope(scope) {
    return browseFooterController?.normalizeBrowseScope(scope) || 'both';
}

function updateBrowseDiscoveryCardLabels() {
    browseFooterController?.updateBrowseDiscoveryCardLabels();
}

function openBrowseDiscoveryModal(kind = 'archives') {
    browseFooterController?.openBrowseDiscoveryModal(kind);
}

function updateQuickSearchButtonState() {
    browseFooterController?.updateQuickSearchButtonState();
}

function getBrowseScopeSelection() {
    return browseFooterController?.getBrowseScopeSelection() || 'both';
}

function applyBrowseScopeSelection(nextScope) {
    return browseFooterController?.applyBrowseScopeSelection(nextScope) || 'both';
}

async function runBrowseSearch(mode = 'full', options = {}) {
    if (!browseFooterController) return;
    await browseFooterController.runBrowseSearch(mode, options);
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

    if (activeTopSection === 'library' || activeTopSection === 'tools' || activeTopSection === 'support' || activeTopSection === 'community') {
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
        suggestedSectionKey: SUGGESTED_SECTION_KEY,
        loadSuggestionSettings,
        saveSuggestionSettings
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

    if (normalizedSection === 'favorite') {
        gamesHeader.textContent = 'Favorite Games';
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

    if (activeLibrarySection === 'favorite') {
        return filtered.filter((game) => Number(game?.rating || 0) > 0);
    }

    if (activeLibrarySection === 'recent') {
        return [...filtered]
            .filter((game) => !!game.lastPlayed)
            .sort((a, b) => new Date(b.lastPlayed).getTime() - new Date(a.lastPlayed).getTime());
    }

    if (activeLibrarySection === SUGGESTED_SECTION_KEY) {
        // The suggestions controller is responsible for setting suggestedCoverGames.
        // We just ensure the main grid gets rendered with whatever it has.
        // The `applyFilters` will process `suggestedCoverGames` (if any).
        const currentSuggestedGames = suggestedCoverGames;
        if (!currentSuggestedGames.length) return [];
        // No need to applyFilters here, as renderGames (which calls applyFilters) is called next.
        return applyCategoryFilter(currentSuggestedGames);
    }

    return filtered;
}

libraryViewController = createLibraryViewController({
    getActiveTopSection: () => activeTopSection,
    getActiveLibrarySection: () => activeLibrarySection,
    setActiveLibrarySectionState: (section) => {
        activeLibrarySection = normalizeLibrarySection(section || 'all');
    },
    getActiveEmulatorTypeTab: () => activeEmulatorTypeTab,
    setActiveEmulatorTypeTab: (nextType) => {
        activeEmulatorTypeTab = normalizeEmulatorType(nextType) || 'standalone';
    },
    getSuggestedCoverGames: () => suggestedCoverGames,
    getGames,
    getFilteredGames,
    setFilteredGames,
    getEmulators,
    setEmulators,
    fetchEmulators,
    initializePlatformFilterOptions,
    renderEmulators,
    applyFilters,
    applyCategoryFilter,
    renderGames,
    normalizeLibrarySection,
    setAppMode,
    setActiveSidebarLibraryLink,
    updateSuggestedPanelVisibility,
    gamesContainer,
    totalGamesElement,
    totalEmulatorsElement,
    emulatorsInstalledToggle,
    emulatorsInstalledToggleWrap,
    groupFilterSelect,
    gameLanguageFilterSelect,
    gameRegionFilterSelect,
    groupSameNamesToggleWrap,
    i18n,
    suggestedSectionKey: SUGGESTED_SECTION_KEY,
});

renderActiveLibraryView = async () => {
    await libraryViewController.renderActiveLibraryView();
};

setActiveLibrarySection = async (section) => {
    await libraryViewController.setActiveLibrarySection(section);
};

updateLibraryCounters = () => {
    libraryViewController.updateLibraryCounters();
};

refreshEmulatorsState = async () => {
    return libraryViewController.refreshEmulatorsState();
};

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

function applyLibraryStats(stats) {
    if (!stats || typeof stats !== 'object') return;
    if (totalGamesElement && Number.isFinite(Number(stats.totalGames))) {
        totalGamesElement.textContent = String(stats.totalGames);
    }
    if (playTimeElement && stats.totalPlayTime != null) {
        playTimeElement.textContent = String(stats.totalPlayTime);
    }
}

async function loadInitialLibraryDataInBackground() {
    try {
        const [statsResult, gamesResult] = await Promise.allSettled([
            emubro.invoke('get-library-stats'),
            emubro.invoke('get-games')
        ]);

        if (statsResult.status === 'fulfilled') {
            applyLibraryStats(statsResult.value);
        } else {
            log.error('Failed to load library stats:', statsResult.reason);
        }

        let games = [];
        if (gamesResult.status === 'fulfilled' && Array.isArray(gamesResult.value)) {
            games = gamesResult.value;
        } else if (gamesResult.status === 'rejected') {
            log.error('Failed to load games:', gamesResult.reason);
        }

        setGames(games);
        setFilteredGames([...games]);
        await renderCategoriesList();

        initializePlatformFilterOptions();
        updateLibraryCounters();
        await renderActiveLibraryView();

        // Keep emulator catalog hydration out of the critical path.
        if (!(activeTopSection === 'library' && activeLibrarySection === 'emulators')) {
            void refreshEmulatorsState()
                .then(() => {
                    updateLibraryCounters();
                })
                .catch((error) => {
                    log.error('Failed to refresh emulators during startup:', error);
                });
        }

        log.info('Library data hydration completed');
    } catch (error) {
        log.error('Failed to hydrate startup library data:', error);
    }
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
            if (activeTopSection === 'support') {
                showSupportView();
            } else {
                renderActiveLibraryView();
            }
            renderThemeManager();
        });
        updateUILanguage();
        updateThemeSelector();
        populateLanguageSelector();
        initLanguageManager();
        initDocking();
        setLlmHelpersEnabled(llmHelpersEnabled, { persist: false, rerender: false });

        // Old select listener removed as it is now custom dropdown handled in i18n-manager

        // Restore view settings.
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
        setupViewScaleControl();
        setAppMode('library');

        // Set up listeners before revealing the main window.
        setupEventListeners();
        void setActiveLibrarySection(activeLibrarySection).catch((error) => {
            log.error('Failed to apply initial library section:', error);
        });

        // Reveal as soon as shell UI is ready; data continues loading asynchronously.
        await waitForUiSettle(0);
        await signalRendererReady();

        void loadInitialLibraryDataInBackground();

        log.info('App shell initialized; loading library data in background');
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
        showSupportView,
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
