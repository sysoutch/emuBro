export function createGameFilters(deps = {}) {
    const {
        getGames,
        getPlatformFilterSourceRows = null,
        setFilteredGames,
        renderGames,
        getCurrentFilter,
        setCurrentFilter,
        getCurrentSort,
        setCurrentSort,
        getCurrentSortDir,
        setCurrentSortDir,
        getCurrentGroupBy,
        setCurrentGroupBy,
        getCurrentLanguageFilter,
        setCurrentLanguageFilter,
        getCurrentRegionFilter,
        setCurrentRegionFilter,
        getGroupSameNamesEnabled,
        setGroupSameNamesEnabled,
        normalizeSortModeValue,
        normalizeGroupByValue,
        normalizeLanguageFilterValue,
        normalizeRegionFilterValue,
        getLanguageCodesFromNameBrackets,
        getRegionCodeFromGame,
        getGroupValueForGame,
        compareGamesBySort,
        groupRowsBySameNames,
        getGameCompanyValue,
        getGlobalSearchTerm,
        documentRef = document
    } = deps;

    function buildPlatformLogoPath(platformKey) {
        const normalized = String(platformKey || '').trim().toLowerCase();
        if (!normalized || normalized === 'all') return '';
        return `emubro-resources/platforms/${normalized}/logos/default.png`;
    }

    function getSidebarSelectedPlatforms() {
        const listRoot = documentRef.getElementById('platforms-list');
        const raw = String(listRoot?.dataset?.selectedPlatforms || '').trim();
        if (!raw) return new Set();
        return new Set(
            raw
                .split(',')
                .map((value) => String(value || '').trim().toLowerCase())
                .filter(Boolean)
        );
    }

    function getScopedSidebarSelectedPlatforms() {
        const sidebarSection = documentRef.getElementById('platforms-sidebar-section');
        if (!sidebarSection || sidebarSection.classList.contains('is-hidden')) {
            return new Set();
        }
        return getSidebarSelectedPlatforms();
    }

    function getScopedSidebarSelectionMode() {
        const sidebarSection = documentRef.getElementById('platforms-sidebar-section');
        if (!sidebarSection || sidebarSection.classList.contains('is-hidden')) {
            return 'single';
        }
        const listRoot = documentRef.getElementById('platforms-list');
        return String(listRoot?.dataset?.selectionMode || '').trim().toLowerCase() === 'multi' ? 'multi' : 'single';
    }

    function applyFilters(shouldRender = true, sourceRows = null) {
        let filteredGames = Array.isArray(sourceRows) ? [...sourceRows] : [...getGames()];

        const platformFilter = documentRef.getElementById('platform-filter');
        const groupFilter = documentRef.getElementById('group-filter');
        const sortFilter = documentRef.getElementById('sort-filter');
        const languageFilter = documentRef.getElementById('game-language-filter');
        const regionFilter = documentRef.getElementById('game-region-filter');
        const groupSameNamesToggle = documentRef.getElementById('group-same-names-toggle');

        setCurrentFilter(platformFilter ? platformFilter.value : 'all');
        setCurrentSort(normalizeSortModeValue(sortFilter ? sortFilter.value : getCurrentSort()));
        setCurrentGroupBy(normalizeGroupByValue(groupFilter ? groupFilter.value : 'none'));
        setCurrentLanguageFilter(normalizeLanguageFilterValue(languageFilter ? languageFilter.value : 'all'));
        setCurrentRegionFilter(normalizeRegionFilterValue(regionFilter ? regionFilter.value : 'all'));
        setGroupSameNamesEnabled(!!groupSameNamesToggle?.checked);

        const selectedSidebarPlatforms = getScopedSidebarSelectedPlatforms();

        if (selectedSidebarPlatforms.size > 0) {
            filteredGames = filteredGames.filter((game) => selectedSidebarPlatforms.has(String(game?.platformShortName || '').trim().toLowerCase()));
        } else if (getCurrentFilter() !== 'all') {
            filteredGames = filteredGames.filter(game => game.platformShortName.toLowerCase() === getCurrentFilter());
        }

        if (getCurrentLanguageFilter() !== 'all') {
            filteredGames = filteredGames.filter((game) => getLanguageCodesFromNameBrackets(game).has(getCurrentLanguageFilter()));
        }

        if (getCurrentRegionFilter() !== 'all') {
            filteredGames = filteredGames.filter((game) => getRegionCodeFromGame(game) === getCurrentRegionFilter());
        }

        const searchTerm = getGlobalSearchTerm(documentRef);
        if (searchTerm) {
            filteredGames = filteredGames.filter((game) => {
                const name = String(game?.name || '').toLowerCase();
                const platform = String(game?.platform || game?.platformShortName || '').toLowerCase();
                const company = getGameCompanyValue(game).toLowerCase();
                return name.includes(searchTerm) || platform.includes(searchTerm) || company.includes(searchTerm);
            });
        }

        filteredGames.sort((a, b) => {
            if (getCurrentGroupBy() !== 'none') {
                const aGroup = getGroupValueForGame(a, getCurrentGroupBy());
                const bGroup = getGroupValueForGame(b, getCurrentGroupBy());
                const groupCompare = aGroup.localeCompare(bGroup);
                if (groupCompare !== 0) return groupCompare;
            }
            const sortCompare = compareGamesBySort(a, b, getCurrentSort(), getCurrentSortDir());
            if (sortCompare !== 0) return sortCompare;
            return String(a?.name || '').localeCompare(String(b?.name || ''));
        });

        if (getGroupSameNamesEnabled()) {
            filteredGames = groupRowsBySameNames(filteredGames);
        }

        setFilteredGames(filteredGames);

        if (shouldRender) {
            renderGames(filteredGames);
        }
    }

    function initializePlatformFilterOptions(sourceRows = null) {
        const platformFilter = documentRef.getElementById('platform-filter');
        if (!platformFilter) return;

        const previousValue = String(platformFilter.value || 'all').toLowerCase();
        const selectedSidebarPlatforms = getScopedSidebarSelectedPlatforms();
        const selectionMode = getScopedSidebarSelectionMode();
        const baseRows = Array.isArray(sourceRows)
            ? sourceRows
            : (typeof getPlatformFilterSourceRows === 'function' ? getPlatformFilterSourceRows() : getGames());

        platformFilter.innerHTML = '';
        const platformMap = new Map();
        baseRows.forEach((row) => {
            const shortName = String(row?.platformShortName || '').trim().toLowerCase();
            if (!shortName) return;
            if (platformMap.has(shortName)) return;

            const displayName = String(row?.platform || '').trim();
            platformMap.set(shortName, displayName || (shortName.charAt(0).toUpperCase() + shortName.slice(1)));
        });

        const allOption = documentRef.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'All Platforms';
        allOption.dataset.baseLabel = 'All Platforms';
        allOption.dataset.platformLogo = '';
        platformFilter.appendChild(allOption);

        [...platformMap.keys()].sort((a, b) => a.localeCompare(b)).forEach((platform) => {
            const option = documentRef.createElement('option');
            option.value = String(platform).toLowerCase();
            option.textContent = String(platformMap.get(platform) || platform);
            option.dataset.baseLabel = String(platformMap.get(platform) || platform);
            option.dataset.platformLogo = buildPlatformLogoPath(option.value);
            if (selectionMode === 'multi' && selectedSidebarPlatforms.has(option.value)) {
                option.textContent = `* ${option.dataset.baseLabel}`;
            }
            platformFilter.appendChild(option);
        });

        if (selectionMode === 'multi') {
            const selectedCount = selectedSidebarPlatforms.size;
            if (selectedCount === 1) {
                const [selectedValue] = Array.from(selectedSidebarPlatforms);
                const selectedOption = Array.from(platformFilter.options).find((option) => option.value === selectedValue);
                allOption.textContent = selectedOption?.dataset?.baseLabel || selectedOption?.textContent || 'All Platforms';
            } else if (selectedCount > 1) {
                allOption.textContent = `${selectedCount} Platforms Selected`;
            }
            platformFilter.value = 'all';
            platformFilter.dataset.selectionMode = 'multi';
            platformFilter.dispatchEvent(new Event('platform-filter-sync'));
            return;
        }

        const preferredScopedValue = selectedSidebarPlatforms.size === 1 ? Array.from(selectedSidebarPlatforms)[0] : 'all';
        const hasPrevious = Array.from(platformFilter.options).some((option) => option.value === previousValue);
        platformFilter.dataset.selectionMode = 'single';
        platformFilter.value = selectedSidebarPlatforms.size === 1
            ? preferredScopedValue
            : (hasPrevious ? previousValue : 'all');
        platformFilter.dispatchEvent(new Event('platform-filter-sync'));
    }

    function addPlatformFilterOption(platformShortName) {
        const platformFilter = documentRef.getElementById('platform-filter');
        if (!platformFilter) return;

        const exists = Array.from(platformFilter.options).some(option => option.value === platformShortName.toLowerCase());
        if (!exists) {
            const option = documentRef.createElement('option');
            option.value = platformShortName.toLowerCase();
            option.textContent = platformShortName.charAt(0).toUpperCase() + platformShortName.slice(1);
            option.dataset.baseLabel = option.textContent;
            option.dataset.platformLogo = buildPlatformLogoPath(option.value);
            platformFilter.appendChild(option);
            platformFilter.dispatchEvent(new Event('platform-filter-sync'));
        }
    }

    return {
        applyFilters,
        initializePlatformFilterOptions,
        addPlatformFilterOption
    };
}
