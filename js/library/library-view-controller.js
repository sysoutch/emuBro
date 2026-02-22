export function createLibraryViewController(options = {}) {
    const getActiveTopSection = typeof options.getActiveTopSection === 'function'
        ? options.getActiveTopSection
        : () => 'library';
    const getActiveLibrarySection = typeof options.getActiveLibrarySection === 'function'
        ? options.getActiveLibrarySection
        : () => 'all';
    const setActiveLibrarySectionState = typeof options.setActiveLibrarySectionState === 'function'
        ? options.setActiveLibrarySectionState
        : () => {};
    const getActiveEmulatorTypeTab = typeof options.getActiveEmulatorTypeTab === 'function'
        ? options.getActiveEmulatorTypeTab
        : () => 'standalone';
    const setActiveEmulatorTypeTab = typeof options.setActiveEmulatorTypeTab === 'function'
        ? options.setActiveEmulatorTypeTab
        : () => {};
    const getSuggestedCoverGames = typeof options.getSuggestedCoverGames === 'function'
        ? options.getSuggestedCoverGames
        : () => [];

    const getGames = typeof options.getGames === 'function' ? options.getGames : () => [];
    const getFilteredGames = typeof options.getFilteredGames === 'function' ? options.getFilteredGames : () => [];
    const setFilteredGames = typeof options.setFilteredGames === 'function' ? options.setFilteredGames : () => {};
    const getEmulators = typeof options.getEmulators === 'function' ? options.getEmulators : () => [];
    const setEmulators = typeof options.setEmulators === 'function' ? options.setEmulators : () => {};
    const fetchEmulators = typeof options.fetchEmulators === 'function' ? options.fetchEmulators : async () => [];
    const renderGames = typeof options.renderGames === 'function' ? options.renderGames : () => {};
    const renderEmulators = typeof options.renderEmulators === 'function' ? options.renderEmulators : () => {};
    const applyFilters = typeof options.applyFilters === 'function' ? options.applyFilters : () => {};
    const applyCategoryFilter = typeof options.applyCategoryFilter === 'function' ? options.applyCategoryFilter : (rows) => rows;
    const normalizeLibrarySection = typeof options.normalizeLibrarySection === 'function'
        ? options.normalizeLibrarySection
        : (section) => String(section || 'all').trim().toLowerCase() || 'all';
    const setAppMode = typeof options.setAppMode === 'function' ? options.setAppMode : () => {};
    const setActiveSidebarLibraryLink = typeof options.setActiveSidebarLibraryLink === 'function'
        ? options.setActiveSidebarLibraryLink
        : () => {};
    const updateSuggestedPanelVisibility = typeof options.updateSuggestedPanelVisibility === 'function'
        ? options.updateSuggestedPanelVisibility
        : () => {};
    const initializePlatformFilterOptions = typeof options.initializePlatformFilterOptions === 'function'
        ? options.initializePlatformFilterOptions
        : () => {};

    const gamesContainer = options.gamesContainer || document.getElementById('games-container');
    const totalGamesElement = options.totalGamesElement || document.getElementById('total-games');
    const totalEmulatorsElement = options.totalEmulatorsElement || document.getElementById('total-emulators');
    const emulatorsInstalledToggle = options.emulatorsInstalledToggle || document.getElementById('emulators-installed-toggle');
    const emulatorsInstalledToggleWrap = options.emulatorsInstalledToggleWrap || document.getElementById('emulators-installed-toggle-wrap');
    const groupFilterSelect = options.groupFilterSelect || document.getElementById('group-filter');
    const gameLanguageFilterSelect = options.gameLanguageFilterSelect || document.getElementById('game-language-filter');
    const gameRegionFilterSelect = options.gameRegionFilterSelect || document.getElementById('game-region-filter');
    const groupSameNamesToggleWrap = options.groupSameNamesToggleWrap || document.getElementById('group-same-names-toggle-wrap');

    const i18n = options.i18n || { t: () => '' };
    const suggestedSectionKey = String(options.suggestedSectionKey || 'suggested');

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

    function getFilteredEmulatorsForSection(sourceRows = getEmulators()) {
        let rows = Array.isArray(sourceRows) ? [...sourceRows] : [];

        const normalizedType = normalizeEmulatorType(getActiveEmulatorTypeTab()) || 'standalone';
        rows = rows.filter((emu) => inferEmulatorType(emu) === normalizedType);

        if (emulatorsInstalledToggle && emulatorsInstalledToggle.checked) {
            rows = rows.filter((emu) => !!emu.isInstalled);
        }

        const searchTerm = String(document.getElementById('global-game-search')?.value || document.querySelector('.search-bar input')?.value || '').trim().toLowerCase();
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

    function getEmulatorRenderOptions() {
        return {
            activeType: getActiveEmulatorTypeTab(),
            onTypeChange: (nextType) => {
                setActiveEmulatorTypeTab(normalizeEmulatorType(nextType) || 'standalone');
                renderEmulators(getFilteredEmulatorsForSection(), getEmulatorRenderOptions());
            },
            onRefresh: () => {
                renderEmulators(getFilteredEmulatorsForSection(), getEmulatorRenderOptions());
            }
        };
    }

    function updateEmulatorsInstalledToggleVisibility() {
        if (!emulatorsInstalledToggleWrap) return;
        const show = getActiveTopSection() === 'library' && getActiveLibrarySection() === 'emulators';
        emulatorsInstalledToggleWrap.classList.toggle('is-hidden', !show);
    }

    function updateGroupingControlsVisibility() {
        const showForGames = getActiveTopSection() === 'library' && getActiveLibrarySection() !== 'emulators';
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

        if (normalizedSection === suggestedSectionKey) {
            gamesHeader.textContent = 'Suggested Games';
            return;
        }

        gamesHeader.textContent = i18n.t('gameGrid.featuredGames') || 'Featured Games';
    }

    function syncDefaultSortForLibrarySection(section) {
        const sortFilter = document.getElementById('sort-filter');
        if (!sortFilter) return;
        const normalizedSection = normalizeLibrarySection(section);
        const currentValue = String(sortFilter.value || '').trim().toLowerCase();

        if (normalizedSection === 'recent') {
            if (currentValue !== 'recently-played') {
                sortFilter.value = 'recently-played';
            }
            return;
        }

        if (currentValue === 'recently-played') {
            sortFilter.value = 'name';
        }
    }

    function getSectionFilteredGames() {
        const filtered = applyCategoryFilter(getFilteredGames());
        const section = getActiveLibrarySection();

        if (section === 'favorite') {
            const hasRatingField = filtered.some((game) =>
                game && Object.prototype.hasOwnProperty.call(game, 'rating')
            );
            if (!hasRatingField) {
                // Backward compatibility: older databases may not have a rating column yet.
                return filtered;
            }
            return filtered.filter((game) => Number(game?.rating || 0) > 0);
        }

        if (section === 'recent') {
            return [...filtered]
                .filter((game) => !!game.lastPlayed)
                .sort((a, b) => new Date(b.lastPlayed).getTime() - new Date(a.lastPlayed).getTime());
        }

        if (section === suggestedSectionKey) {
            const suggestedRows = Array.isArray(getSuggestedCoverGames()) ? [...getSuggestedCoverGames()] : [];
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
        if (getActiveTopSection() !== 'library') return;
        updateSuggestedPanelVisibility();

        if (getActiveLibrarySection() === 'emulators') {
            if (!getEmulators().length) await refreshEmulatorsState();
            initializePlatformFilterOptions(getEmulators());
            renderEmulators(getFilteredEmulatorsForSection(), getEmulatorRenderOptions());
            return;
        }

        initializePlatformFilterOptions(getGames());
        applyFilters(false);
        if (getActiveLibrarySection() === suggestedSectionKey) {
            const suggestedRows = getSectionFilteredGames();
            if (suggestedRows.length === 0) {
                const activeView = document.querySelector('.view-btn.active')?.dataset?.view || 'cover';
                if (gamesContainer) {
                    gamesContainer.className = `games-container ${activeView}-view`;
                    gamesContainer.innerHTML = '<p class="suggested-empty-state">Generate suggestions to show recommended games here.</p>';
                }
                return;
            }
        }
        renderGames(getSectionFilteredGames());
    }

    async function setActiveLibrarySection(section) {
        setAppMode('library');
        setActiveLibrarySectionState(normalizeLibrarySection(section || 'all'));
        const activeSection = getActiveLibrarySection();
        syncDefaultSortForLibrarySection(activeSection);
        setActiveSidebarLibraryLink(activeSection);
        setGamesHeaderByLibrarySection(activeSection);
        updateEmulatorsInstalledToggleVisibility();
        updateGroupingControlsVisibility();
        updateSuggestedPanelVisibility();
        await renderActiveLibraryView();
    }

    return {
        normalizeEmulatorType,
        inferEmulatorType,
        getEmulatorRenderOptions,
        updateEmulatorsInstalledToggleVisibility,
        updateGroupingControlsVisibility,
        getFilteredEmulatorsForSection,
        setActiveViewButton,
        updateViewSizeControlState,
        setupViewScaleControl,
        setGamesHeaderByLibrarySection,
        getSectionFilteredGames,
        updateLibraryCounters,
        refreshEmulatorsState,
        renderActiveLibraryView,
        setActiveLibrarySection
    };
}
