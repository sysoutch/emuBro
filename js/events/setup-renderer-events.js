export function setupRendererEventListeners(options = {}) {
    const setupSidebarRail = typeof options.setupSidebarRail === 'function' ? options.setupSidebarRail : () => {};
    const setAppMode = typeof options.setAppMode === 'function' ? options.setAppMode : () => {};
    const showToolView = typeof options.showToolView === 'function' ? options.showToolView : () => {};
    const showSupportView = typeof options.showSupportView === 'function' ? options.showSupportView : () => {};
    const showCommunityView = typeof options.showCommunityView === 'function' ? options.showCommunityView : () => {};
    const setActiveRailTarget = typeof options.setActiveRailTarget === 'function' ? options.setActiveRailTarget : () => {};
    const openLibraryPathSettingsModal = typeof options.openLibraryPathSettingsModal === 'function' ? options.openLibraryPathSettingsModal : async () => {};
    const openProfileModal = typeof options.openProfileModal === 'function' ? options.openProfileModal : async () => {};
    const setActiveLibrarySection = typeof options.setActiveLibrarySection === 'function' ? options.setActiveLibrarySection : async () => {};
    const getActiveTopSection = typeof options.getActiveTopSection === 'function' ? options.getActiveTopSection : () => 'library';
    const getActiveLibrarySection = typeof options.getActiveLibrarySection === 'function' ? options.getActiveLibrarySection : () => 'all';

    const renderEmulators = typeof options.renderEmulators === 'function' ? options.renderEmulators : () => {};
    const getFilteredEmulatorsForSection = typeof options.getFilteredEmulatorsForSection === 'function' ? options.getFilteredEmulatorsForSection : () => [];
    const getEmulatorRenderOptions = typeof options.getEmulatorRenderOptions === 'function' ? options.getEmulatorRenderOptions : () => ({});
    const applyFilters = typeof options.applyFilters === 'function' ? options.applyFilters : () => {};
    const renderGames = typeof options.renderGames === 'function' ? options.renderGames : () => {};
    const getSectionFilteredGames = typeof options.getSectionFilteredGames === 'function' ? options.getSectionFilteredGames : () => [];
    const renderActiveLibraryView = typeof options.renderActiveLibraryView === 'function' ? options.renderActiveLibraryView : async () => {};
    const refreshEmulatorsState = typeof options.refreshEmulatorsState === 'function' ? options.refreshEmulatorsState : async () => {};

    const gameLanguageFilterSelect = options.gameLanguageFilterSelect || null;
    const gameRegionFilterSelect = options.gameRegionFilterSelect || null;
    const groupFilterSelect = options.groupFilterSelect || null;
    const groupSameNamesToggle = options.groupSameNamesToggle || null;
    const emulatorsInstalledToggle = options.emulatorsInstalledToggle || null;

    const normalizeGroupByMode = typeof options.normalizeGroupByMode === 'function' ? options.normalizeGroupByMode : (value) => String(value || 'none');
    const GROUP_BY_MODE_KEY = String(options.groupByModeKey || 'emuBro.groupByMode');
    const GROUP_SAME_NAMES_KEY = String(options.groupSameNamesKey || 'emuBro.groupSameNamesEnabled');
    const GAME_LANGUAGE_FILTER_KEY = String(options.gameLanguageFilterKey || 'emuBro.gameLanguageFilter');
    const GAME_REGION_FILTER_KEY = String(options.gameRegionFilterKey || 'emuBro.gameRegionFilter');

    const toggleTheme = typeof options.toggleTheme === 'function' ? options.toggleTheme : () => {};
    const invertColors = typeof options.invertColors === 'function' ? options.invertColors : () => {};
    const themeManagerBtn = options.themeManagerBtn || null;
    const openThemeManager = typeof options.openThemeManager === 'function' ? options.openThemeManager : () => {};
    const openLanguageManager = typeof options.openLanguageManager === 'function' ? options.openLanguageManager : () => {};
    const closeThemeManagerBtn = options.closeThemeManagerBtn || null;
    const getHasUnsavedChanges = typeof options.getHasUnsavedChanges === 'function' ? options.getHasUnsavedChanges : () => false;
    const i18n = options.i18n || { t: () => 'Unsaved changes' };
    const themeManagerModal = options.themeManagerModal || null;
    const completelyRemoveFromDock = typeof options.completelyRemoveFromDock === 'function' ? options.completelyRemoveFromDock : () => {};
    const removeFromDock = typeof options.removeFromDock === 'function' ? options.removeFromDock : () => {};
    const hideThemeForm = typeof options.hideThemeForm === 'function' ? options.hideThemeForm : () => {};
    const setHasUnsavedChanges = typeof options.setHasUnsavedChanges === 'function' ? options.setHasUnsavedChanges : () => {};
    const toggleDock = typeof options.toggleDock === 'function' ? options.toggleDock : () => {};

    const applyCornerStyle = typeof options.applyCornerStyle === 'function' ? options.applyCornerStyle : () => {};
    const setTheme = typeof options.setTheme === 'function' ? options.setTheme : () => {};
    const getCurrentTheme = typeof options.getCurrentTheme === 'function' ? options.getCurrentTheme : () => ({});
    const resetThemeForm = typeof options.resetThemeForm === 'function' ? options.resetThemeForm : () => {};
    const setupThemeCustomizationControls = typeof options.setupThemeCustomizationControls === 'function' ? options.setupThemeCustomizationControls : () => {};
    const setupColorPickerListeners = typeof options.setupColorPickerListeners === 'function' ? options.setupColorPickerListeners : () => {};
    const setupBackgroundImageListeners = typeof options.setupBackgroundImageListeners === 'function' ? options.setupBackgroundImageListeners : () => {};
    const saveTheme = typeof options.saveTheme === 'function' ? options.saveTheme : () => {};
    const renderMarketplace = typeof options.renderMarketplace === 'function' ? options.renderMarketplace : () => {};

    const updateViewSizeControlState = typeof options.updateViewSizeControlState === 'function' ? options.updateViewSizeControlState : () => {};
    const gamesContainer = options.gamesContainer || null;

    const renderCategoriesList = typeof options.renderCategoriesList === 'function' ? options.renderCategoriesList : async () => {};
    const getActiveCategorySelectionSet = typeof options.getActiveCategorySelectionSet === 'function' ? options.getActiveCategorySelectionSet : () => new Set();

    const openFooterPanel = typeof options.openFooterPanel === 'function' ? options.openFooterPanel : () => {};
    const normalizeBrowseScope = typeof options.normalizeBrowseScope === 'function' ? options.normalizeBrowseScope : (value) => String(value || 'both');
    const BROWSE_SCOPE_STORAGE_KEY = String(options.browseScopeStorageKey || 'emuBro.browseScope.v1');
    const applyBrowseScopeSelection = typeof options.applyBrowseScopeSelection === 'function' ? options.applyBrowseScopeSelection : () => 'both';
    const runBrowseSearch = typeof options.runBrowseSearch === 'function' ? options.runBrowseSearch : async () => {};
    const getBrowseScopeSelection = typeof options.getBrowseScopeSelection === 'function' ? options.getBrowseScopeSelection : () => 'both';
    const openBrowseDiscoveryModal = typeof options.openBrowseDiscoveryModal === 'function' ? options.openBrowseDiscoveryModal : () => {};

    const openFooterBtn = options.openFooterBtn || null;
    const closeGameDetailsBtn = options.closeGameDetailsBtn || null;
    const gameDetailsFooter = options.gameDetailsFooter || null;
    const pinFooterBtn = options.pinFooterBtn || null;
    const getLockIconMarkup = typeof options.getLockIconMarkup === 'function' ? options.getLockIconMarkup : () => '';
    const getPushpinIconMarkup = typeof options.getPushpinIconMarkup === 'function' ? options.getPushpinIconMarkup : () => '';
    const addFooterNotification = typeof options.addFooterNotification === 'function' ? options.addFooterNotification : () => {};
    const switchFooterTab = typeof options.switchFooterTab === 'function' ? options.switchFooterTab : () => {};
    const updateQuickSearchButtonState = typeof options.updateQuickSearchButtonState === 'function' ? options.updateQuickSearchButtonState : () => {};
    const updateBrowseDiscoveryCardLabels = typeof options.updateBrowseDiscoveryCardLabels === 'function' ? options.updateBrowseDiscoveryCardLabels : () => {};

    const setupDragDropManager = typeof options.setupDragDropManager === 'function' ? options.setupDragDropManager : () => {};
    const emubro = options.emubro || null;
    const escapeHtml = typeof options.escapeHtml === 'function' ? options.escapeHtml : (value) => String(value || '');
    const initializePlatformFilterOptions = typeof options.initializePlatformFilterOptions === 'function' ? options.initializePlatformFilterOptions : () => {};
    const updateLibraryCounters = typeof options.updateLibraryCounters === 'function' ? options.updateLibraryCounters : () => {};
    const setGames = typeof options.setGames === 'function' ? options.setGames : () => {};
    const setFilteredGames = typeof options.setFilteredGames === 'function' ? options.setFilteredGames : () => {};

    const setupWindowResizeHandler = typeof options.setupWindowResizeHandler === 'function' ? options.setupWindowResizeHandler : () => {};
    const recenterManagedModalIfMostlyOutOfView = typeof options.recenterManagedModalIfMostlyOutOfView === 'function' ? options.recenterManagedModalIfMostlyOutOfView : () => {};
    const setupWindowControls = typeof options.setupWindowControls === 'function' ? options.setupWindowControls : () => {};
    const setupHeaderThemeControlsToggle = typeof options.setupHeaderThemeControlsToggle === 'function' ? options.setupHeaderThemeControlsToggle : () => {};
    const themeSelect = options.themeSelect || null;


    setupSidebarRail({
        setAppMode,
        showToolView,
        showSupportView,
        showCommunityView,
        setActiveRailTarget,
        openLibraryPathSettingsModal,
        openProfileModal,
        setActiveLibrarySection,
        getActiveLibrarySection: () => getActiveLibrarySection()
    });

    // Search
    const searchInput = document.querySelector('.search-bar input');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            if (getActiveTopSection() !== 'library') return;

            if (getActiveLibrarySection() === 'emulators') {
                renderEmulators(getFilteredEmulatorsForSection(), getEmulatorRenderOptions());
                return;
            }

            applyFilters(false);
            renderGames(getSectionFilteredGames());
        });
    }

    // Filters
    const platformFilter = document.getElementById('platform-filter');
    if (platformFilter) {
        platformFilter.addEventListener('change', () => {
            if (getActiveLibrarySection() === 'emulators') {
                renderEmulators(getFilteredEmulatorsForSection(), getEmulatorRenderOptions());
                return;
            }
            applyFilters(false);
            renderGames(getSectionFilteredGames());
        });
    }
    
    const sortFilter = document.getElementById('sort-filter');
    if (sortFilter) {
        sortFilter.addEventListener('change', () => {
            if (getActiveLibrarySection() === 'emulators') {
                renderEmulators(getFilteredEmulatorsForSection(), getEmulatorRenderOptions());
                return;
            }
            applyFilters(false);
            renderGames(getSectionFilteredGames());
        });
    }

    if (gameLanguageFilterSelect) {
        gameLanguageFilterSelect.addEventListener('change', () => {
            localStorage.setItem(GAME_LANGUAGE_FILTER_KEY, String(gameLanguageFilterSelect.value || 'all').trim().toLowerCase());
            if (getActiveLibrarySection() === 'emulators') return;
            applyFilters(false);
            renderGames(getSectionFilteredGames());
        });
    }

    if (gameRegionFilterSelect) {
        gameRegionFilterSelect.addEventListener('change', () => {
            localStorage.setItem(GAME_REGION_FILTER_KEY, String(gameRegionFilterSelect.value || 'all').trim().toLowerCase());
            if (getActiveLibrarySection() === 'emulators') return;
            applyFilters(false);
            renderGames(getSectionFilteredGames());
        });
    }

    if (groupFilterSelect) {
        groupFilterSelect.addEventListener('change', () => {
            const normalized = normalizeGroupByMode(groupFilterSelect.value);
            groupFilterSelect.value = normalized;
            localStorage.setItem(GROUP_BY_MODE_KEY, normalized);
            if (getActiveLibrarySection() === 'emulators') return;
            applyFilters(false);
            renderGames(getSectionFilteredGames());
        });
    }

    if (groupSameNamesToggle) {
        groupSameNamesToggle.addEventListener('change', () => {
            localStorage.setItem(GROUP_SAME_NAMES_KEY, groupSameNamesToggle.checked ? 'true' : 'false');
            if (getActiveLibrarySection() === 'emulators') return;
            applyFilters(false);
            renderGames(getSectionFilteredGames());
        });
    }

    if (emulatorsInstalledToggle) {
        emulatorsInstalledToggle.checked = false;
        emulatorsInstalledToggle.addEventListener('change', async () => {
            if (getActiveTopSection() !== 'library' || getActiveLibrarySection() !== 'emulators') return;
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
        setupThemeCustomizationControls();
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
            if (getActiveTopSection() !== 'library') return;
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
            } else if (target === 'support') {
                setAppMode('support');
                showSupportView();
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

    window.addEventListener('emubro:games-updated', async () => {
        await renderCategoriesList();
        if (getActiveTopSection() === 'library' && getActiveLibrarySection() !== 'emulators' && getActiveCategorySelectionSet().size > 0) {
            await renderActiveLibraryView();
        }
    });
    window.addEventListener('emubro:game-tags-updated', async () => {
        await renderCategoriesList();
        if (getActiveTopSection() === 'library' && getActiveLibrarySection() !== 'emulators') {
            await renderActiveLibraryView();
        }
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
            openBrowseDiscoveryModal('archives');
        });
    }

    const zipBtn = document.getElementById('browse-zip-btn');
    if (zipBtn) {
        zipBtn.addEventListener('click', () => {
            openBrowseDiscoveryModal('setup');
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
    updateBrowseDiscoveryCardLabels();

    setupDragDropManager({
        emubro,
        getActiveTopSection: () => getActiveTopSection(),
        escapeHtml,
        addFooterNotification,
        refreshEmulatorsState,
        renderActiveLibraryView,
        initializePlatformFilterOptions,
        updateLibraryCounters,
        setGames,
        setFilteredGames
    });
    setupWindowResizeHandler({
        recenterManagedModalIfMostlyOutOfView
    });
    setupWindowControls({ emubro });
    setupHeaderThemeControlsToggle({ themeSelect });

}
