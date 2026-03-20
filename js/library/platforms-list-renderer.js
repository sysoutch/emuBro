export function createPlatformsListRenderer(options = {}) {
    const getGames = typeof options.getGames === 'function' ? options.getGames : () => [];
    const getPlatformCountGames = typeof options.getPlatformCountGames === 'function' ? options.getPlatformCountGames : getGames;
    const renderActiveLibraryView = typeof options.renderActiveLibraryView === 'function' ? options.renderActiveLibraryView : async () => {};
    const renderCategoriesList = typeof options.renderCategoriesList === 'function' ? options.renderCategoriesList : async () => {};
    const isLibraryTopSection = typeof options.isLibraryTopSection === 'function' ? options.isLibraryTopSection : () => true;
    const isEmulatorsSection = typeof options.isEmulatorsSection === 'function' ? options.isEmulatorsSection : () => false;
    const escapeHtml = typeof options.escapeHtml === 'function' ? options.escapeHtml : (value) => String(value || '');
    const getPlatformFilterElement = typeof options.getPlatformFilterElement === 'function'
        ? options.getPlatformFilterElement
        : () => document.getElementById('platform-filter');
    const refreshPlatformFilterOptions = typeof options.refreshPlatformFilterOptions === 'function'
        ? options.refreshPlatformFilterOptions
        : () => {};

    const LIST_ROOT_ID = String(options.listRootId || 'platforms-list');
    const SECTION_ID = String(options.sectionId || 'platforms-sidebar-section');
    const VISIBLE_LIMIT = Number.isFinite(Number(options.platformVisibleLimit))
        ? Math.max(1, Number(options.platformVisibleLimit))
        : 10;

    const PLATFORM_SELECTION_MODE_KEY = String(options.selectionModeStorageKey || 'emuBro.platformSelectionMode.v1');
    const PLATFORM_SORT_MODE_KEY = String(options.sortModeStorageKey || 'emuBro.platformSortMode.v1');
    const PLATFORM_SELECTED_KEY = String(options.selectedStorageKey || 'emuBro.selectedPlatforms.v1');

    let platformsShowAll = false;
    let platformSelectionMode = normalizeSelectionMode(localStorage.getItem(PLATFORM_SELECTION_MODE_KEY) || 'single');
    let platformSortMode = normalizeSortMode(localStorage.getItem(PLATFORM_SORT_MODE_KEY) || 'count-desc');
    let selectedPlatforms = loadSelectedPlatforms();
    let platformModePreviewState = null;
    let platformModeModifierHeld = false;
    let platformModeModifierForceUntil = 0;

    function t(key, fallback, data = {}) {
        const i18nRef = window?.i18n && typeof window.i18n.t === 'function' ? window.i18n : null;
        const applyTemplate = (input) => {
            let text = String(input ?? '');
            Object.keys(data || {}).forEach((name) => {
                const value = String(data[name] ?? '');
                text = text
                    .replace(new RegExp(`\\{\\{\\s*${name}\\s*\\}\\}`, 'g'), value)
                    .replace(new RegExp(`\\{\\s*${name}\\s*\\}`, 'g'), value);
            });
            return text;
        };
        if (i18nRef) {
            const translated = i18nRef.t(key);
            if (typeof translated === 'string' && translated && translated !== key) {
                return applyTemplate(translated);
            }
        }
        return applyTemplate(fallback || key);
    }

    function normalizePlatformKey(value) {
        return String(value || '').trim().toLowerCase();
    }

    function normalizeSelectionMode(value) {
        return String(value || '').trim().toLowerCase() === 'multi' ? 'multi' : 'single';
    }

    function normalizeSortMode(value) {
        const normalized = String(value || '').trim().toLowerCase();
        if (normalized === 'name-asc') return 'name-asc';
        if (normalized === 'name-desc') return 'name-desc';
        if (normalized === 'count-asc') return 'count-asc';
        return 'count-desc';
    }

    function loadSelectedPlatforms() {
        const raw = String(localStorage.getItem(PLATFORM_SELECTED_KEY) || '');
        const values = raw.split(',').map((entry) => normalizePlatformKey(entry)).filter(Boolean);
        return new Set(values);
    }

    function persistSelectedPlatforms() {
        const values = Array.from(selectedPlatforms).filter(Boolean);
        localStorage.setItem(PLATFORM_SELECTED_KEY, values.join(','));
    }

    function persistSelectionMode() {
        localStorage.setItem(PLATFORM_SELECTION_MODE_KEY, platformSelectionMode);
    }

    function persistSortMode() {
        localStorage.setItem(PLATFORM_SORT_MODE_KEY, platformSortMode);
    }

    function syncSelectionToDom() {
        const listRoot = document.getElementById(LIST_ROOT_ID);
        if (!listRoot) return;
        listRoot.dataset.selectedPlatforms = Array.from(selectedPlatforms).join(',');
        listRoot.dataset.selectionMode = platformSelectionMode;
    }

    function syncTopPlatformFilter() {
        const platformFilter = getPlatformFilterElement();
        if (!platformFilter) return;
        platformFilter.dataset.selectionMode = platformSelectionMode;
        platformFilter.multiple = false;

        const options = Array.from(platformFilter.options || []);
        const selectedInOptions = Array.from(selectedPlatforms).filter((value) => options.some((option) => option.value === value));
        const allOption = options.find((option) => option.value === 'all');

        if (allOption && platformSelectionMode === 'multi') {
            if (selectedInOptions.length === 1) {
                const selectedOption = options.find((option) => option.value === selectedInOptions[0]);
                allOption.textContent = String(selectedOption?.dataset?.baseLabel || selectedOption?.textContent || t('gameGrid.allPlatforms', 'All Platforms'));
            } else if (selectedInOptions.length > 1) {
                allOption.textContent = `${selectedInOptions.length} Platforms Selected`;
            } else {
                allOption.textContent = String(allOption.dataset.baseLabel || t('gameGrid.allPlatforms', 'All Platforms'));
            }
        } else if (allOption) {
            allOption.textContent = String(allOption.dataset.baseLabel || t('gameGrid.allPlatforms', 'All Platforms'));
        }

        options.forEach((option) => {
            if (option.value === 'all') return;
            const baseLabel = String(option.dataset.baseLabel || option.textContent || '').trim();
            option.textContent = platformSelectionMode === 'multi' && selectedInOptions.includes(option.value)
                ? `* ${baseLabel}`
                : baseLabel;
        });

        platformFilter.title = selectedInOptions.length > 0
            ? selectedInOptions
                .map((value) => {
                    const option = options.find((entry) => entry.value === value);
                    return String(option?.dataset?.baseLabel || option?.textContent || value).replace(/^\*\s*/, '').trim();
                })
                .filter(Boolean)
                .join(', ')
            : String(allOption?.dataset?.baseLabel || t('gameGrid.allPlatforms', 'All Platforms'));

        if (platformSelectionMode === 'multi') {
            platformFilter.value = 'all';
            platformFilter.dispatchEvent(new Event('platform-filter-sync'));
            return;
        }

        if (selectedPlatforms.size === 1) {
            const [selected] = Array.from(selectedPlatforms);
            const hasOption = options.some((option) => option.value === selected);
            platformFilter.value = hasOption ? selected : 'all';
            platformFilter.dispatchEvent(new Event('platform-filter-sync'));
            return;
        }
        platformFilter.value = 'all';
        platformFilter.dispatchEvent(new Event('platform-filter-sync'));
    }

    function formatPlatformLabel(row = {}) {
        const shortName = String(row.shortName || '').trim();
        const displayName = String(row.label || '').trim();
        return displayName || shortName || t('gameGrid.allPlatforms', 'All Platforms');
    }

    function getPlatformRows() {
        const rows = Array.isArray(getPlatformCountGames()) ? getPlatformCountGames() : [];
        const counts = new Map();

        rows.forEach((game) => {
            const shortName = normalizePlatformKey(game?.platformShortName || game?.platform);
            if (!shortName) return;
            const displayName = String(game?.platform || game?.platformShortName || shortName).trim();
            const current = counts.get(shortName) || { id: shortName, shortName, label: displayName, count: 0 };
            current.count += 1;
            if (!current.label && displayName) current.label = displayName;
            counts.set(shortName, current);
        });

        const list = Array.from(counts.values());
        const direction = platformSortMode.endsWith('-asc') ? 1 : -1;
        const sortField = platformSortMode.startsWith('name-') ? 'name' : 'count';
        list.sort((a, b) => {
            if (sortField === 'count') {
                const diff = (Number(a?.count || 0) - Number(b?.count || 0)) * direction;
                if (diff !== 0) return diff;
            }
            return formatPlatformLabel(a).localeCompare(formatPlatformLabel(b)) * direction;
        });
        return list;
    }

    function getRenderableRows() {
        const rows = getPlatformRows();
        selectedPlatforms = new Set(Array.from(selectedPlatforms).filter((id) => rows.some((row) => row.id === id)));
        return rows;
    }

    function getSelectionModeButtonText({ forceMulti = false } = {}) {
        const isSingle = platformSelectionMode === 'single';
        const forceWindowActive = Date.now() <= platformModeModifierForceUntil;
        const isMulti = forceMulti || platformSelectionMode === 'multi' || (isSingle && (platformModeModifierHeld || forceWindowActive));
        return isMulti
            ? t('sidebar.multiSelect', 'Multi Select')
            : t('sidebar.singleSelect', 'Single Select');
    }

    function clearPlatformModePreviewHandlers() {
        if (!platformModePreviewState) return;
        document.removeEventListener('keydown', platformModePreviewState.onKeyDown, true);
        document.removeEventListener('keyup', platformModePreviewState.onKeyUp, true);
        window.removeEventListener('blur', platformModePreviewState.onReset, true);
        document.removeEventListener('visibilitychange', platformModePreviewState.onVisibilityChange, true);
        platformModePreviewState = null;
    }

    function setupPlatformModePreviewHandlers(buttonEl) {
        clearPlatformModePreviewHandlers();
        if (!buttonEl) return;

        const updateText = (forceMulti = false) => {
            if (!buttonEl.isConnected) {
                clearPlatformModePreviewHandlers();
                return;
            }
            buttonEl.textContent = getSelectionModeButtonText({ forceMulti });
        };

        const onKeyDown = (event) => {
            if (platformSelectionMode !== 'single') return;
            if (event.ctrlKey || event.metaKey || event.key === 'Control' || event.key === 'Meta') {
                platformModeModifierHeld = true;
                updateText(true);
            }
        };
        const onKeyUp = (event) => {
            if (event.ctrlKey || event.metaKey) return;
            platformModeModifierHeld = false;
            updateText(false);
        };
        const onReset = () => {
            platformModeModifierHeld = false;
            platformModeModifierForceUntil = 0;
            updateText(false);
        };
        const onVisibilityChange = () => {
            if (document.visibilityState !== 'visible') onReset();
        };

        document.addEventListener('keydown', onKeyDown, true);
        document.addEventListener('keyup', onKeyUp, true);
        window.addEventListener('blur', onReset, true);
        document.addEventListener('visibilitychange', onVisibilityChange, true);

        platformModePreviewState = { onKeyDown, onKeyUp, onReset, onVisibilityChange };
    }

    function buildSortDirectionIcon() {
        return platformSortMode.endsWith('-asc')
            ? `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 12V4"></path><path d="M5 7l3-3 3 3"></path></svg>`
            : `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 4v8"></path><path d="M5 9l3 3 3-3"></path></svg>`;
    }

    async function handlePlatformSelection(platformId, options = {}) {
        const normalized = normalizePlatformKey(platformId);
        const temporaryMultiSelect = !!options.temporaryMultiSelect;
        if (!normalized || normalized === 'all') {
            selectedPlatforms.clear();
        } else if (temporaryMultiSelect && platformSelectionMode === 'single') {
            platformModeModifierForceUntil = Date.now() + 240;
            if (selectedPlatforms.has(normalized)) {
                selectedPlatforms.delete(normalized);
            } else {
                selectedPlatforms.add(normalized);
            }
        } else if (platformSelectionMode === 'single') {
            if (selectedPlatforms.size === 1 && selectedPlatforms.has(normalized)) {
                selectedPlatforms.clear();
            } else {
                selectedPlatforms = new Set([normalized]);
            }
        } else if (selectedPlatforms.has(normalized)) {
            selectedPlatforms.delete(normalized);
        } else {
            selectedPlatforms.add(normalized);
        }

        persistSelectedPlatforms();
        syncSelectionToDom();
        syncTopPlatformFilter();
        await renderPlatformsList();
        await renderCategoriesList();
        if (isLibraryTopSection()) {
            await renderActiveLibraryView();
        }
    }

    function bindPlatformFilterSync() {
        const platformFilter = getPlatformFilterElement();
        if (!platformFilter || platformFilter.dataset.platformSidebarSyncBound === 'true') return;
        platformFilter.dataset.platformSidebarSyncBound = 'true';
        platformFilter.addEventListener('change', () => {
            if (!isLibraryTopSection()) return;
            const selected = normalizePlatformKey(platformFilter.value);
            if (platformSelectionMode === 'multi') {
                if (!selected || selected === 'all') {
                    selectedPlatforms.clear();
                } else if (selectedPlatforms.has(selected)) {
                    selectedPlatforms.delete(selected);
                } else {
                    selectedPlatforms.add(selected);
                }
            } else {
                selectedPlatforms = selected && selected !== 'all' ? new Set([selected]) : new Set();
            }
            persistSelectedPlatforms();
            syncSelectionToDom();
            refreshPlatformFilterOptions();
            void renderPlatformsList();
            void renderCategoriesList();
        }, true);
    }

    async function renderPlatformsList() {
        const sectionEl = document.getElementById(SECTION_ID);
        const listRoot = document.getElementById(LIST_ROOT_ID);
        if (!sectionEl || !listRoot) return;

        const shouldHide = !isLibraryTopSection();
        sectionEl.classList.toggle('is-hidden', shouldHide);
        if (shouldHide) return;

        bindPlatformFilterSync();

        const rows = getRenderableRows();
        if (rows.length <= VISIBLE_LIMIT) {
            platformsShowAll = false;
        }

        let visibleRows = rows;
        if (!platformsShowAll && rows.length > VISIBLE_LIMIT) {
            const firstSlice = rows.slice(0, VISIBLE_LIMIT);
            const selectedOutside = rows.filter((row) => selectedPlatforms.has(row.id) && !firstSlice.some((entry) => entry.id === row.id));
            visibleRows = [...firstSlice, ...selectedOutside];
        }

        const selectionModeMarkup = `
            <li class="categories-llm-row">
                <button class="action-btn small" type="button" data-platform-action="selection-mode">${escapeHtml(getSelectionModeButtonText())}</button>
            </li>
        `;

        const sortMarkup = `
            <li class="categories-llm-row categories-sort-row">
                <label class="categories-sort-label" for="platform-sort-mode">${escapeHtml(t('sidebar.categoriesSortBy', 'Sort by'))}</label>
                <div class="categories-sort-controls">
                    <select id="platform-sort-mode" class="categories-sort-select" data-platform-action="sort-mode">
                        <option value="name"${platformSortMode.startsWith('name-') ? ' selected' : ''}>${escapeHtml(t('sidebar.categoriesSortName', 'Name'))}</option>
                        <option value="count"${platformSortMode.startsWith('count-') ? ' selected' : ''}>${escapeHtml(t('sidebar.categoriesSortGameCount', 'Game Count'))}</option>
                    </select>
                    <button
                        type="button"
                        class="categories-sort-direction-btn"
                        data-platform-action="sort-direction"
                        aria-label="${escapeHtml(platformSortMode.endsWith('-asc') ? t('sidebar.categoriesSortAscending', 'Sort ascending') : t('sidebar.categoriesSortDescending', 'Sort descending'))}"
                        title="${escapeHtml(platformSortMode.endsWith('-asc') ? t('sidebar.categoriesSortAscending', 'Sort ascending') : t('sidebar.categoriesSortDescending', 'Sort descending'))}"
                    >
                        <span class="categories-sort-direction-icon" aria-hidden="true">${buildSortDirectionIcon()}</span>
                    </button>
                </div>
            </li>
        `;

        const rowsMarkup = visibleRows.map((entry) => {
            const isActive = selectedPlatforms.has(entry.id);
            return `
                <li class="category-item platform-item">
                    <a href="#" data-platform-id="${escapeHtml(entry.id)}" class="${isActive ? 'active' : ''}">
                        <span>${escapeHtml(formatPlatformLabel(entry))}</span>
                        <small>${escapeHtml(String(entry.count || 0))}</small>
                    </a>
                </li>
            `;
        }).join('');

        const showMoreMarkup = rows.length > VISIBLE_LIMIT
            ? `
                <li class="categories-llm-row categories-more-row">
                    <button class="action-btn small" type="button" data-platform-action="toggle-more">
                        ${platformsShowAll
                            ? escapeHtml(t('sidebar.categoriesShowLess', 'Show less'))
                            : escapeHtml(t('sidebar.categoriesShowMore', 'Show more ({{count}})', { count: Math.max(0, rows.length - VISIBLE_LIMIT) }))}
                    </button>
                </li>
            `
            : '';

        listRoot.innerHTML = `
            ${sortMarkup}
            ${selectionModeMarkup}
            <li class="platform-item"><a href="#" data-platform-id="all" class="${selectedPlatforms.size === 0 ? 'active' : ''}"><span>${escapeHtml(t('sidebar.all', 'All'))}</span><small>${escapeHtml(String(rows.reduce((sum, row) => sum + Number(row.count || 0), 0)))}</small></a></li>
            ${rowsMarkup}
            ${showMoreMarkup}
        `;

        syncSelectionToDom();
        syncTopPlatformFilter();

        listRoot.querySelectorAll('a[data-platform-id]').forEach((link) => {
            link.addEventListener('click', async (event) => {
                event.preventDefault();
                const temporaryMultiSelect = platformSelectionMode === 'single'
                    && (
                        !!event.ctrlKey
                        || !!event.metaKey
                        || !!event.getModifierState?.('Control')
                        || !!event.getModifierState?.('Meta')
                    );
                await handlePlatformSelection(link.dataset.platformId || 'all', { temporaryMultiSelect });
            });
        });

        const selectionModeBtn = listRoot.querySelector('[data-platform-action="selection-mode"]');
        if (selectionModeBtn) {
            setupPlatformModePreviewHandlers(selectionModeBtn);
            selectionModeBtn.addEventListener('click', async () => {
                platformSelectionMode = platformSelectionMode === 'multi' ? 'single' : 'multi';
                if (platformSelectionMode === 'single' && selectedPlatforms.size > 1) {
                    selectedPlatforms = new Set([Array.from(selectedPlatforms)[0]]);
                    persistSelectedPlatforms();
                }
                persistSelectionMode();
                syncSelectionToDom();
                syncTopPlatformFilter();
                await renderPlatformsList();
                if (isLibraryTopSection()) {
                    await renderActiveLibraryView();
                }
            });
        } else {
            clearPlatformModePreviewHandlers();
        }

        const sortModeSelect = listRoot.querySelector('[data-platform-action="sort-mode"]');
        if (sortModeSelect) {
            sortModeSelect.addEventListener('change', async () => {
                const field = String(sortModeSelect.value || 'count').trim().toLowerCase();
                const direction = platformSortMode.endsWith('-asc') ? 'asc' : 'desc';
                platformSortMode = `${field === 'name' ? 'name' : 'count'}-${direction}`;
                persistSortMode();
                await renderPlatformsList();
            });
        }

        const sortDirectionBtn = listRoot.querySelector('[data-platform-action="sort-direction"]');
        if (sortDirectionBtn) {
            sortDirectionBtn.addEventListener('click', async () => {
                const field = platformSortMode.startsWith('name-') ? 'name' : 'count';
                const direction = platformSortMode.endsWith('-asc') ? 'desc' : 'asc';
                platformSortMode = `${field}-${direction}`;
                persistSortMode();
                await renderPlatformsList();
            });
        }

        const toggleMoreBtn = listRoot.querySelector('[data-platform-action="toggle-more"]');
        if (toggleMoreBtn) {
            toggleMoreBtn.addEventListener('click', async () => {
                platformsShowAll = !platformsShowAll;
                await renderPlatformsList();
            });
        }
    }

    return {
        renderPlatformsList,
        getPlatformsShowAll: () => platformsShowAll,
        dispose: () => {
            clearPlatformModePreviewHandlers();
        }
    };
}
