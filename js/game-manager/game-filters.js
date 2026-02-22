export function createGameFilters(deps = {}) {
    const {
        getGames,
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

        if (getCurrentFilter() !== 'all') {
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
        platformFilter.innerHTML = '<option value=\"all\">All Platforms</option>';

        const rows = Array.isArray(sourceRows) ? sourceRows : getGames();
        const platformMap = new Map();
        rows.forEach((row) => {
            const shortName = String(row?.platformShortName || '').trim().toLowerCase();
            if (!shortName) return;
            if (platformMap.has(shortName)) return;

            const displayName = String(row?.platform || '').trim();
            platformMap.set(shortName, displayName || (shortName.charAt(0).toUpperCase() + shortName.slice(1)));
        });

        [...platformMap.keys()].sort((a, b) => a.localeCompare(b)).forEach((platform) => {
            const option = documentRef.createElement('option');
            option.value = String(platform).toLowerCase();
            option.textContent = String(platformMap.get(platform) || platform);
            platformFilter.appendChild(option);
        });

        const hasPrevious = Array.from(platformFilter.options).some((option) => option.value === previousValue);
        platformFilter.value = hasPrevious ? previousValue : 'all';
    }

    function addPlatformFilterOption(platformShortName) {
        const platformFilter = documentRef.getElementById('platform-filter');
        if (!platformFilter) return;

        const exists = Array.from(platformFilter.options).some(option => option.value === platformShortName.toLowerCase());
        if (!exists) {
            const option = documentRef.createElement('option');
            option.value = platformShortName.toLowerCase();
            option.textContent = platformShortName.charAt(0).toUpperCase() + platformShortName.slice(1);
            platformFilter.appendChild(option);
        }
    }

    return {
        applyFilters,
        initializePlatformFilterOptions,
        addPlatformFilterOption
    };
}
