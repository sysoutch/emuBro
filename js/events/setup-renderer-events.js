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
    const openAboutDialog = typeof options.openAboutDialog === 'function' ? options.openAboutDialog : async () => {};
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

    const getGlobalSearchInput = () => (
        document.getElementById('global-game-search')
        || document.querySelector('.global-search-bar input')
        || document.querySelector('.search-bar input')
    );

    // Search
    const searchInput = getGlobalSearchInput();
    const clearSearchBtn = document.getElementById('global-search-clear-btn');
    const syncSearchClearVisibility = () => {
        if (!searchInput || !clearSearchBtn) return;
        const hasValue = String(searchInput.value || '').trim().length > 0;
        clearSearchBtn.classList.toggle('is-visible', hasValue);
        clearSearchBtn.disabled = !hasValue;
    };
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            syncSearchClearVisibility();
            if (getActiveTopSection() !== 'library') return;

            if (getActiveLibrarySection() === 'emulators') {
                renderEmulators(getFilteredEmulatorsForSection(), getEmulatorRenderOptions());
                return;
            }

            applyFilters(false);
            renderGames(getSectionFilteredGames());
        });
    }
    if (clearSearchBtn && searchInput) {
        clearSearchBtn.addEventListener('click', () => {
            if (!searchInput.value) return;
            searchInput.value = '';
            syncSearchClearVisibility();
            searchInput.focus();
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        });
        syncSearchClearVisibility();
    }

    document.addEventListener('keydown', (event) => {
        const isFindShortcut = (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && String(event.key || '').toLowerCase() === 'f';
        if (!isFindShortcut) return;
        const targetSearch = getGlobalSearchInput();
        if (!targetSearch) return;
        event.preventDefault();
        targetSearch.focus();
        targetSearch.select();
    });

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
    const normalizeGroupFilterOptionLabels = () => {
        if (!groupFilterSelect) return;
        Array.from(groupFilterSelect.options || []).forEach((option) => {
            const current = String(option.textContent || '').trim();
            if (!current) return;
            const cleaned = current.replace(/^\s*group\s*:\s*/i, '').trim();
            if (cleaned && cleaned !== current) {
                option.textContent = cleaned;
            }
        });
    };
    normalizeGroupFilterOptionLabels();
    if (groupFilterSelect && typeof MutationObserver !== 'undefined') {
        const observer = new MutationObserver(() => {
            normalizeGroupFilterOptionLabels();
        });
        observer.observe(groupFilterSelect, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

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

    const contentWidthHost = document.querySelector('.game-content-wrapper')
        || document.querySelector('.game-grid')
        || document.querySelector('.game-header')
        || document.body;
    const createElementWidthQuery = (maxWidthPx, hostEl) => {
        const target = hostEl || document.body;
        const listeners = new Set();
        let matches = false;
        let observer = null;
        let evaluateFrame = null;

        const evaluate = () => {
            const rectWidth = Number(target?.getBoundingClientRect?.().width || 0);
            const width = Number(rectWidth || target?.clientWidth || window.innerWidth || 0);
            const nextMatches = width <= maxWidthPx;
            if (nextMatches === matches) return;
            matches = nextMatches;
            const event = { matches };
            listeners.forEach((listener) => {
                try {
                    listener(event);
                } catch (_error) {}
            });
        };

        const scheduleEvaluate = () => {
            if (evaluateFrame !== null) return;
            evaluateFrame = window.requestAnimationFrame(() => {
                evaluateFrame = null;
                evaluate();
            });
        };

        if (typeof ResizeObserver !== 'undefined' && target) {
            observer = new ResizeObserver(() => scheduleEvaluate());
            observer.observe(target);
        }

        window.addEventListener('resize', scheduleEvaluate);
        window.addEventListener('emubro:layout-width-changed', scheduleEvaluate);
        scheduleEvaluate();

        return {
            get matches() {
                return matches;
            },
            addEventListener(type, listener) {
                if (type !== 'change' || typeof listener !== 'function') return;
                listeners.add(listener);
            },
            removeEventListener(type, listener) {
                if (type !== 'change' || typeof listener !== 'function') return;
                listeners.delete(listener);
            },
            addListener(listener) {
                if (typeof listener !== 'function') return;
                listeners.add(listener);
            },
            removeListener(listener) {
                if (typeof listener !== 'function') return;
                listeners.delete(listener);
            },
            dispose() {
                if (observer) {
                    try {
                        observer.disconnect();
                    } catch (_error) {}
                    observer = null;
                }
                if (evaluateFrame !== null) {
                    window.cancelAnimationFrame(evaluateFrame);
                    evaluateFrame = null;
                }
                window.removeEventListener('resize', scheduleEvaluate);
                window.removeEventListener('emubro:layout-width-changed', scheduleEvaluate);
                listeners.clear();
            }
        };
    };

    const initCompactFilterPair = ({
        wrapperSelector,
        toggleId,
        panelId,
        compactSelectIds = [],
        closeOnChangeElements = [],
        compactQuery
    }) => {
        const wrapper = document.querySelector(wrapperSelector);
        const toggleBtn = document.getElementById(toggleId);
        if (!wrapper || !toggleBtn) return { close: () => {}, isOpen: () => false };
        if (!compactQuery) return { close: () => {}, isOpen: () => false };

        let floatingMenuEl = null;

        const destroyFloatingMenu = () => {
            if (!floatingMenuEl) return;
            try {
                floatingMenuEl.remove();
            } catch (_error) {}
            floatingMenuEl = null;
        };

        const positionFloatingMenu = () => {
            if (!floatingMenuEl) return;
            const rect = toggleBtn.getBoundingClientRect();
            const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
            const margin = 8;

            const maxWidth = Math.max(220, viewportWidth - (margin * 2));
            const preferredWidth = Math.max(240, Math.min(560, Math.round(rect.width + 220)));
            floatingMenuEl.style.width = `${Math.min(preferredWidth, maxWidth)}px`;
            floatingMenuEl.style.maxWidth = `${maxWidth}px`;

            // First-pass placement
            floatingMenuEl.style.left = `${Math.max(margin, rect.left)}px`;
            floatingMenuEl.style.top = `${Math.max(margin, rect.bottom + 6)}px`;

            // Clamp after measuring
            const menuRect = floatingMenuEl.getBoundingClientRect();
            let left = rect.left;
            if (left + menuRect.width > viewportWidth - margin) {
                left = viewportWidth - margin - menuRect.width;
            }
            if (left < margin) left = margin;

            let top = rect.bottom + 6;
            if (top + menuRect.height > viewportHeight - margin) {
                top = rect.top - menuRect.height - 6;
            }
            if (top < margin) top = margin;

            floatingMenuEl.style.left = `${Math.round(left)}px`;
            floatingMenuEl.style.top = `${Math.round(top)}px`;
        };

        const setOpenState = (open) => {
            const shouldOpen = !!open && compactQuery.matches;
            wrapper.classList.toggle('is-open', shouldOpen);
            toggleBtn.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
            if (shouldOpen) {
                renderCompactMenu();
            } else {
                destroyFloatingMenu();
            }
        };
        const close = () => setOpenState(false);
        const isOpen = () => wrapper.classList.contains('is-open');
        const getCompactLabel = (selectId) => {
            if (selectId === 'game-region-filter') return 'Region';
            if (selectId === 'game-language-filter') return 'Language';
            if (selectId === 'group-filter') return 'Group';
            if (selectId === 'sort-filter') return 'Sort';
            return 'Filter';
        };
        const renderCompactMenu = () => {
            if (!compactQuery.matches) return;
            destroyFloatingMenu();
            const menu = document.createElement('div');
            menu.className = 'filter-pair-floating-menu';
            menu.setAttribute('role', 'dialog');
            menu.setAttribute('aria-label', 'Compact filters');

            compactSelectIds.forEach((selectId) => {
                const selectEl = document.getElementById(selectId);
                if (!selectEl || selectEl.classList.contains('is-hidden')) return;

                const block = document.createElement('div');
                block.className = 'filter-pair-compact-block';

                const label = document.createElement('div');
                label.className = 'filter-pair-compact-label';
                label.textContent = getCompactLabel(selectId);
                block.appendChild(label);

                const optionsWrap = document.createElement('div');
                optionsWrap.className = 'filter-pair-compact-options';

                Array.from(selectEl.options || []).forEach((optionEl) => {
                    const value = String(optionEl.value || '');
                    const text = String(optionEl.textContent || '').trim();
                    if (!text) return;

                    const optionBtn = document.createElement('button');
                    optionBtn.type = 'button';
                    optionBtn.className = 'filter-pair-compact-option';
                    if (selectEl.value === value) optionBtn.classList.add('is-active');
                    optionBtn.textContent = text;
                    optionBtn.dataset.value = value;
                    optionBtn.addEventListener('click', () => {
                        if (selectEl.value === value) {
                            close();
                            return;
                        }
                        selectEl.value = value;
                        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
                    });
                    optionsWrap.appendChild(optionBtn);
                });

                block.appendChild(optionsWrap);
                menu.appendChild(block);
            });

            document.body.appendChild(menu);
            floatingMenuEl = menu;
            positionFloatingMenu();
        };

        toggleBtn.addEventListener('click', (event) => {
            if (!compactQuery.matches) return;
            event.preventDefault();
            event.stopPropagation();
            setOpenState(!isOpen());
        });

        document.addEventListener('click', (event) => {
            if (!compactQuery.matches || !isOpen()) return;
            if (wrapper.contains(event.target)) return;
            if (floatingMenuEl && floatingMenuEl.contains(event.target)) return;
            close();
        });

        closeOnChangeElements.forEach((el) => {
            el?.addEventListener('change', close);
            el?.addEventListener('change', () => {
                if (isOpen()) renderCompactMenu();
            });
        });

        window.addEventListener('resize', () => {
            if (!isOpen()) return;
            if (!compactQuery.matches) {
                close();
                return;
            }
            positionFloatingMenu();
        });

        window.addEventListener('scroll', () => {
            if (!isOpen()) return;
            positionFloatingMenu();
        }, true);

        return { close, isOpen, setOpenState, compactQuery };
    };

    const superCompactQuery = createElementWidthQuery(850, contentWidthHost);
    const filtersCompactQuery = createElementWidthQuery(1500, contentWidthHost);
    const regionLanguageCompactQuery = createElementWidthQuery(1500, contentWidthHost);
    const groupSortCompactQuery = createElementWidthQuery(1200, contentWidthHost);
    const gameHeaderEl = document.querySelector('.game-header');
    const filtersEl = document.querySelector('.game-header .filters');

    const applyFilterCompactClasses = () => {
        const superCompact = !!superCompactQuery.matches;
        const anyCompact = !!filtersCompactQuery.matches;
        const regionCompact = !!regionLanguageCompactQuery.matches;
        const groupCompact = !!groupSortCompactQuery.matches;

        if (gameHeaderEl) {
            gameHeaderEl.classList.toggle('is-content-compact', anyCompact);
        }
        if (filtersEl) {
            filtersEl.classList.toggle('is-super-compact', superCompact);
            filtersEl.classList.toggle('is-content-compact', anyCompact);
            filtersEl.classList.toggle('is-region-language-compact', regionCompact);
            filtersEl.classList.toggle('is-group-sort-compact', groupCompact);
        }
    };

    const regionLanguagePair = initCompactFilterPair({
        wrapperSelector: '.filter-pair-wrapper-region-language',
        toggleId: 'filters-region-language-toggle',
        panelId: 'filters-region-language-content',
        compactSelectIds: ['game-region-filter', 'game-language-filter'],
        closeOnChangeElements: [gameRegionFilterSelect, gameLanguageFilterSelect],
        compactQuery: regionLanguageCompactQuery
    });
    const groupSortPair = initCompactFilterPair({
        wrapperSelector: '.filter-pair-wrapper-group-sort',
        toggleId: 'filters-group-sort-toggle',
        panelId: 'filters-group-sort-content',
        compactSelectIds: ['group-filter', 'sort-filter'],
        closeOnChangeElements: [groupFilterSelect, sortFilter],
        compactQuery: groupSortCompactQuery
    });

    const regionLanguageToggleBtn = document.getElementById('filters-region-language-toggle');
    const groupSortToggleBtn = document.getElementById('filters-group-sort-toggle');
    if (regionLanguageToggleBtn) {
        regionLanguageToggleBtn.addEventListener('click', () => {
            if (!regionLanguageCompactQuery.matches) return;
            if (regionLanguagePair.isOpen()) groupSortPair.close();
        });
    }
    if (groupSortToggleBtn) {
        groupSortToggleBtn.addEventListener('click', () => {
            if (!groupSortCompactQuery.matches) return;
            if (groupSortPair.isOpen()) regionLanguagePair.close();
        });
    }

    const syncCompactFilterPairs = () => {
        applyFilterCompactClasses();
        if (!regionLanguageCompactQuery.matches || !filtersCompactQuery.matches) regionLanguagePair.close();
        if (!groupSortCompactQuery.matches || !filtersCompactQuery.matches) groupSortPair.close();
    };

    applyFilterCompactClasses();

    const queries = [
        superCompactQuery,
        filtersCompactQuery,
        regionLanguagePair.compactQuery,
        groupSortPair.compactQuery
    ].filter(Boolean);
    queries.forEach((mq) => {
        if (typeof mq.addEventListener === 'function') {
            mq.addEventListener('change', syncCompactFilterPairs);
        } else if (typeof mq.addListener === 'function') {
            mq.addListener(syncCompactFilterPairs);
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        regionLanguagePair.close();
        groupSortPair.close();
    });

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
            setTheme(getCurrentTheme(), { force: true, allowSameForce: true });
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
    // Intentionally no library rerender/scroll sync on theme apply.
    // Theme updates are CSS-driven; forcing game-grid work here caused RAM churn.

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
    setupWindowControls({ emubro, openLibraryPathSettingsModal, openAboutDialog });
    setupHeaderThemeControlsToggle({ themeSelect });

    // Library Filters Popup (for expanded sidebar mode)
    const filtersPopupBtn = document.getElementById('library-filters-popup-btn');
    let filtersFloatingMenuEl = null;

    const destroyFiltersFloatingMenu = () => {
        if (!filtersFloatingMenuEl) return;
        filtersFloatingMenuEl.remove();
        filtersFloatingMenuEl = null;
        filtersPopupBtn?.classList.remove('is-open');
    };

    const positionFiltersFloatingMenu = () => {
        if (!filtersFloatingMenuEl || !filtersPopupBtn) return;
        const rect = filtersPopupBtn.getBoundingClientRect();
        const margin = 8;
        
        filtersFloatingMenuEl.style.left = `${Math.max(margin, rect.left)}px`;
        filtersFloatingMenuEl.style.top = `${rect.bottom + 6}px`;
        
        const menuRect = filtersFloatingMenuEl.getBoundingClientRect();
        if (menuRect.right > window.innerWidth - margin) {
            filtersFloatingMenuEl.style.left = `${window.innerWidth - menuRect.width - margin}px`;
        }
    };

    const renderFiltersPopup = () => {
        destroyFiltersFloatingMenu();
        const menu = document.createElement('div');
        menu.className = 'filter-pair-floating-menu library-filters-floating-menu';
        
        const createBlock = (title, content) => {
            const block = document.createElement('div');
            block.className = 'filter-pair-compact-block';
            const label = document.createElement('div');
            label.className = 'filter-pair-compact-label';
            label.textContent = title;
            block.appendChild(label);
            block.appendChild(content);
            return block;
        };

        // Platform Filter
        if (platformFilter) {
            const clone = platformFilter.cloneNode(true);
            clone.style.display = 'block';
            clone.style.width = '100%';
            clone.value = platformFilter.value;
            clone.addEventListener('change', (e) => {
                platformFilter.value = e.target.value;
                platformFilter.dispatchEvent(new Event('change', { bubbles: true }));
            });
            menu.appendChild(createBlock('Platform', clone));
        }

        // Region Filter
        if (gameRegionFilterSelect) {
            const clone = gameRegionFilterSelect.cloneNode(true);
            clone.style.display = 'block';
            clone.style.width = '100%';
            clone.value = gameRegionFilterSelect.value;
            clone.addEventListener('change', (e) => {
                gameRegionFilterSelect.value = e.target.value;
                gameRegionFilterSelect.dispatchEvent(new Event('change', { bubbles: true }));
            });
            menu.appendChild(createBlock('Region', clone));
        }

        // Language Filter
        if (gameLanguageFilterSelect) {
            const clone = gameLanguageFilterSelect.cloneNode(true);
            clone.style.display = 'block';
            clone.style.width = '100%';
            clone.value = gameLanguageFilterSelect.value;
            clone.addEventListener('change', (e) => {
                gameLanguageFilterSelect.value = e.target.value;
                gameLanguageFilterSelect.dispatchEvent(new Event('change', { bubbles: true }));
            });
            menu.appendChild(createBlock('Language', clone));
        }

        // Group Filter
        if (groupFilterSelect) {
            const clone = groupFilterSelect.cloneNode(true);
            clone.style.display = 'block';
            clone.style.width = '100%';
            clone.value = groupFilterSelect.value;
            clone.addEventListener('change', (e) => {
                groupFilterSelect.value = e.target.value;
                groupFilterSelect.dispatchEvent(new Event('change', { bubbles: true }));
            });
            menu.appendChild(createBlock('Group By', clone));
        }

        // Sort Filter
        if (sortFilter) {
            const clone = sortFilter.cloneNode(true);
            clone.style.display = 'block';
            clone.style.width = '100%';
            clone.value = sortFilter.value;
            clone.addEventListener('change', (e) => {
                sortFilter.value = e.target.value;
                sortFilter.dispatchEvent(new Event('change', { bubbles: true }));
            });
            menu.appendChild(createBlock('Sort By', clone));
        }

        // Group Same Names Toggle
        if (groupSameNamesToggle) {
            const label = document.createElement('label');
            label.className = 'group-same-names-toggle';
            label.style.width = '100%';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = groupSameNamesToggle.checked;
            checkbox.addEventListener('change', (e) => {
                groupSameNamesToggle.checked = e.target.checked;
                groupSameNamesToggle.dispatchEvent(new Event('change', { bubbles: true }));
            });
            const span = document.createElement('span');
            span.textContent = 'Group same names';
            label.appendChild(checkbox);
            label.appendChild(span);
            menu.appendChild(createBlock('Options', label));
        }

        document.body.appendChild(menu);
        filtersFloatingMenuEl = menu;
        filtersPopupBtn?.classList.add('is-open');
        positionFiltersFloatingMenu();
    };

    filtersPopupBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (filtersFloatingMenuEl) destroyFiltersFloatingMenu();
        else renderFiltersPopup();
    });

    document.addEventListener('click', (e) => {
        if (filtersFloatingMenuEl && !filtersFloatingMenuEl.contains(e.target) && e.target !== filtersPopupBtn) {
            destroyFiltersFloatingMenu();
        }
    });

    window.addEventListener('resize', () => {
        if (filtersFloatingMenuEl) positionFiltersFloatingMenu();
        // Hide popup if sidebar is no longer expanded? 
        // Actually the button itself will disappear via CSS, so the popup might stay floating.
        // Let's hide it if the button is hidden.
        if (filtersPopupBtn && window.getComputedStyle(filtersPopupBtn).display === 'none') {
            destroyFiltersFloatingMenu();
        }
    });

    window.addEventListener('emubro:layout-width-changed', () => {
        destroyFiltersFloatingMenu();
    });
}
