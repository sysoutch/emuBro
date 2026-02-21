import { showTextInputDialog } from '../ui/text-input-dialog';

export function createCategoriesListRenderer(options = {}) {
    const emubro = options.emubro;
    const getGames = typeof options.getGames === 'function' ? options.getGames : () => [];
    const setGames = typeof options.setGames === 'function' ? options.setGames : () => {};
    const setFilteredGames = typeof options.setFilteredGames === 'function' ? options.setFilteredGames : () => {};
    const renderActiveLibraryView = typeof options.renderActiveLibraryView === 'function' ? options.renderActiveLibraryView : async () => {};
    const isLibraryTopSection = typeof options.isLibraryTopSection === 'function' ? options.isLibraryTopSection : () => true;
    const isEmulatorsSection = typeof options.isEmulatorsSection === 'function' ? options.isEmulatorsSection : () => false;
    const showGlassMessageDialog = typeof options.showGlassMessageDialog === 'function' ? options.showGlassMessageDialog : async () => {};
    const normalizeTagCategory = typeof options.normalizeTagCategory === 'function' ? options.normalizeTagCategory : (value) => String(value || 'all').trim().toLowerCase() || 'all';
    const getTagCategoryCounts = typeof options.getTagCategoryCounts === 'function' ? options.getTagCategoryCounts : () => [];
    const getActiveCategorySelectionSet = typeof options.getActiveCategorySelectionSet === 'function' ? options.getActiveCategorySelectionSet : () => new Set();
    const clearCategorySelection = typeof options.clearCategorySelection === 'function' ? options.clearCategorySelection : () => {};
    const setCategorySelectionMode = typeof options.setCategorySelectionMode === 'function' ? options.setCategorySelectionMode : () => {};
    const getCategorySelectionMode = typeof options.getCategorySelectionMode === 'function' ? options.getCategorySelectionMode : () => 'multi';
    const syncCategoryStateFromSelectionSet = typeof options.syncCategoryStateFromSelectionSet === 'function' ? options.syncCategoryStateFromSelectionSet : () => {};
    const escapeHtml = typeof options.escapeHtml === 'function' ? options.escapeHtml : (value) => String(value || '');
    const isLlmHelpersEnabled = typeof options.isLlmHelpersEnabled === 'function' ? options.isLlmHelpersEnabled : () => true;
    const isLlmAllowUnknownTagsEnabled = typeof options.isLlmAllowUnknownTagsEnabled === 'function' ? options.isLlmAllowUnknownTagsEnabled : () => false;
    const loadSuggestionSettings = typeof options.loadSuggestionSettings === 'function' ? options.loadSuggestionSettings : () => ({});
    const normalizeSuggestionProvider = typeof options.normalizeSuggestionProvider === 'function' ? options.normalizeSuggestionProvider : (value) => String(value || 'ollama');
    const openGlobalLlmTaggingSetupModal = typeof options.openGlobalLlmTaggingSetupModal === 'function' ? options.openGlobalLlmTaggingSetupModal : async () => null;
    const createGlobalLlmProgressDialog = typeof options.createGlobalLlmProgressDialog === 'function' ? options.createGlobalLlmProgressDialog : () => ({
        setStatus: () => {},
        log: () => {},
        updateCounters: () => {},
        isCanceled: () => false,
        waitForNextChunk: async () => 'continue',
        complete: () => {}
    });
    const getSectionFilteredGames = typeof options.getSectionFilteredGames === 'function' ? options.getSectionFilteredGames : () => [];
    const getGameTagIds = typeof options.getGameTagIds === 'function' ? options.getGameTagIds : () => [];
    const addFooterNotification = typeof options.addFooterNotification === 'function' ? options.addFooterNotification : () => {};
    const openFooterPanel = typeof options.openFooterPanel === 'function' ? options.openFooterPanel : () => {};
    const applyFilters = typeof options.applyFilters === 'function' ? options.applyFilters : () => {};

    const CATEGORY_VISIBLE_LIMIT = Number.isFinite(Number(options.categoryVisibleLimit))
        ? Math.max(1, Number(options.categoryVisibleLimit))
        : 10;

    let tagLabelMap = new Map(options.initialTagLabelMap instanceof Map ? options.initialTagLabelMap : []);
    let categorySettingsMenuState = null;
    let categoryModePreviewState = null;
    let categoryModeModifierHeld = false;
    let categoryModeModifierForceUntil = 0;
    let categoriesShowAll = !!options.initialCategoriesShowAll;
    const CATEGORY_SORT_MODE_KEY = String(options.categorySortStorageKey || 'emuBro.categorySortMode.v1');
    let categorySortMode = normalizeCategorySortMode(
        options.initialCategorySortMode || localStorage.getItem(CATEGORY_SORT_MODE_KEY) || 'count-desc'
    );

    if (!emubro) {
        return {
            renderCategoriesList: async () => {},
            getCategoriesShowAll: () => categoriesShowAll
        };
    }

function formatTagLabel(tagId) {
    const key = normalizeTagCategory(tagId);
    if (key === 'all') return t('sidebar.all', 'All');
    const mapped = tagLabelMap.get(key);
    if (mapped) return mapped;
    return key
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

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
        if (translated && translated !== key) return applyTemplate(String(translated), data);
    }
    return applyTemplate(String(fallback || key), data);
}

function normalizeCategorySortMode(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'name-asc') return 'name-asc';
    return 'count-desc';
}

function setCategorySortMode(nextMode, { persist = true } = {}) {
    categorySortMode = normalizeCategorySortMode(nextMode);
    if (persist) {
        localStorage.setItem(CATEGORY_SORT_MODE_KEY, categorySortMode);
    }
}

function sortCategoryRows(rows = []) {
    const list = Array.isArray(rows) ? [...rows] : [];
    if (categorySortMode === 'count-desc') {
        list.sort((a, b) => {
            const countDiff = Number(b?.count || 0) - Number(a?.count || 0);
            if (countDiff !== 0) return countDiff;
            return String(a?.label || a?.id || '').localeCompare(String(b?.label || b?.id || ''));
        });
        return list;
    }
    list.sort((a, b) => String(a?.label || a?.id || '').localeCompare(String(b?.label || b?.id || '')));
    return list;
}

async function loadTagLabelMap() {
    try {
        const result = await emubro.invoke('tags:list');
        const rows = Array.isArray(result?.tags) ? result.tags : [];
        const next = new Map();
        rows.forEach((row) => {
            const id = normalizeTagCategory(row?.id);
            if (id === 'all') return;
            const label = String(row?.label || row?.id || '').trim();
            if (!label) return;
            next.set(id, label);
        });
        tagLabelMap = next;
    } catch (_error) {
        tagLabelMap = new Map();
    }
}

async function loadTagCatalogRows() {
    try {
        const result = await emubro.invoke('tags:list');
        const rows = Array.isArray(result?.tags) ? result.tags : [];
        const out = [];
        const seen = new Set();
        rows.forEach((row) => {
            const id = normalizeTagCategory(row?.id);
            if (id === 'all' || seen.has(id)) return;
            seen.add(id);
            const label = String(row?.label || row?.id || '').trim() || id;
            out.push({ id, label });
        });
        return out;
    } catch (_error) {
        return [];
    }
}

function closeCategorySettingsMenu() {
    if (!categorySettingsMenuState) return;
    document.removeEventListener('pointerdown', categorySettingsMenuState.onPointerDown, true);
    document.removeEventListener('keydown', categorySettingsMenuState.onKeyDown, true);
    window.removeEventListener('resize', categorySettingsMenuState.onResize, true);
    categorySettingsMenuState.menu.remove();
    categorySettingsMenuState = null;
}

function getSelectionModeButtonText({ forceMulti = false } = {}) {
    const isSingle = getCategorySelectionMode() === 'single';
    const forceWindowActive = Date.now() <= categoryModeModifierForceUntil;
    const isMulti = forceMulti || getCategorySelectionMode() === 'multi' || (isSingle && (categoryModeModifierHeld || forceWindowActive));
    return isMulti
        ? t('sidebar.multiSelect', 'Multi Select')
        : t('sidebar.singleSelect', 'Single Select');
}

function clearCategoryModePreviewHandlers() {
    if (!categoryModePreviewState) return;
    document.removeEventListener('keydown', categoryModePreviewState.onKeyDown, true);
    document.removeEventListener('keyup', categoryModePreviewState.onKeyUp, true);
    window.removeEventListener('blur', categoryModePreviewState.onReset, true);
    document.removeEventListener('visibilitychange', categoryModePreviewState.onVisibilityChange, true);
    categoryModePreviewState = null;
}

function setupCategoryModePreviewHandlers(buttonEl) {
    clearCategoryModePreviewHandlers();
    if (!buttonEl) return;

    const updateText = (forceMulti = false) => {
        if (!buttonEl.isConnected) {
            clearCategoryModePreviewHandlers();
            return;
        }
        buttonEl.textContent = getSelectionModeButtonText({ forceMulti });
    };

    const onKeyDown = (event) => {
        if (getCategorySelectionMode() !== 'single') return;
        if (event.ctrlKey || event.metaKey || event.key === 'Control' || event.key === 'Meta') {
            categoryModeModifierHeld = true;
            updateText(true);
        }
    };
    const onKeyUp = (event) => {
        if (event.ctrlKey || event.metaKey) return;
        categoryModeModifierHeld = false;
        updateText(false);
    };
    const onReset = () => {
        categoryModeModifierHeld = false;
        categoryModeModifierForceUntil = 0;
        updateText(false);
    };
    const onVisibilityChange = () => {
        if (document.visibilityState !== 'visible') onReset();
    };

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', onReset, true);
    document.addEventListener('visibilitychange', onVisibilityChange, true);

    categoryModePreviewState = { onKeyDown, onKeyUp, onReset, onVisibilityChange };
}

async function refreshAfterTagCatalogMutation() {
    const updatedGames = await emubro.invoke('get-games');
    setGames(updatedGames);
    setFilteredGames([...updatedGames]);
    await renderCategoriesList();
    if (isLibraryTopSection()) {
        await renderActiveLibraryView();
    }
}

async function renameCategoryTag(tagId, currentLabel) {
    const normalizedTag = normalizeTagCategory(tagId);
    if (!normalizedTag || normalizedTag === 'all') return;
    const proposed = await showTextInputDialog({
        title: t('categories.renameTagTitle', 'Rename Tag'),
        message: t('categories.renameTagMessage', 'Enter a new category name.'),
        initialValue: String(currentLabel || formatTagLabel(normalizedTag)),
        confirmLabel: t('tools.rename', 'Rename'),
        cancelLabel: t('buttons.cancel', 'Cancel')
    });
    if (proposed === null) return;
    const nextName = String(proposed || '').trim();
    if (!nextName) {
        await showGlassMessageDialog({
            title: t('categories.renameTagTitle', 'Rename Tag'),
            message: t('categories.tagNameEmpty', 'Tag name cannot be empty.'),
            level: 'warning'
        });
        return;
    }

    const result = await emubro.invoke('tags:rename', {
        oldTagId: normalizedTag,
        newTagName: nextName
    });
    if (!result?.success) {
        await showGlassMessageDialog({
            title: t('categories.renameTagTitle', 'Rename Tag'),
            message: result?.message || t('categories.failedRenameTag', 'Failed to rename tag.'),
            level: 'error'
        });
        return;
    }

    await refreshAfterTagCatalogMutation();
    const mergedSuffix = result?.merged ? `\n${t('categories.matchingTagsMerged', 'Matching tags were merged automatically.')}` : '';
    await showGlassMessageDialog({
        title: t('categories.tagUpdatedTitle', 'Tag Updated'),
        message: t('categories.tagRenamedTo', 'Tag renamed to "{{name}}".', { name: result?.newLabel || nextName }) + mergedSuffix,
        level: 'info'
    });
}

async function deleteCategoryTags(tagIds, labelMap = new Map()) {
    const targetIds = Array.from(new Set(
        (Array.isArray(tagIds) ? tagIds : [tagIds])
            .map((tagId) => normalizeTagCategory(tagId))
            .filter((tagId) => tagId && tagId !== 'all')
    ));
    if (targetIds.length === 0) return;

    const labelPreview = targetIds
        .slice(0, 6)
        .map((tagId) => String(labelMap.get(tagId) || formatTagLabel(tagId)).trim())
        .filter(Boolean);
    const hasMore = targetIds.length > 6 ? ` and ${targetIds.length - 6} more` : '';
    const confirmed = window.confirm(
        t('categories.confirmDeleteTags', 'Delete {{count}} tag(s): {{labels}}{{hasMore}}?\n\nThey will be removed from the library and all assigned games.', {
            count: targetIds.length,
            labels: labelPreview.join(', '),
            hasMore
        })
    );
    if (!confirmed) return;

    const failed = [];
    for (const tagId of targetIds) {
        // eslint-disable-next-line no-await-in-loop
        const result = await emubro.invoke('tags:delete', { tagId });
        if (!result?.success) {
            failed.push(`${tagId}: ${String(result?.message || 'unknown error')}`);
        }
    }

    if (failed.length === targetIds.length) {
        await showGlassMessageDialog({
            title: t('categories.deleteTagTitle', 'Delete Tag'),
            message: failed.join('\n'),
            level: 'error'
        });
        return;
    }

    await refreshAfterTagCatalogMutation();
    if (failed.length > 0) {
        await showGlassMessageDialog({
            title: t('categories.deleteTagTitle', 'Delete Tag'),
            message: t('categories.deleteTagPartial', 'Deleted {{deleted}} tag(s), {{failedCount}} failed.\n{{failedList}}', {
                deleted: targetIds.length - failed.length,
                failedCount: failed.length,
                failedList: failed.join('\n')
            }),
            level: 'warning'
        });
    }
}

async function deleteCategoryTag(tagId, label) {
    const normalizedTag = normalizeTagCategory(tagId);
    if (!normalizedTag || normalizedTag === 'all') return;
    const labelMap = new Map([[normalizedTag, String(label || formatTagLabel(normalizedTag)).trim()]]);
    await deleteCategoryTags([normalizedTag], labelMap);
}

function openCategorySettingsMenu(buttonEl, { tagId, label }) {
    if (!buttonEl || !tagId) return;
    const normalizedTag = normalizeTagCategory(tagId);
    if (!normalizedTag || normalizedTag === 'all') return;
    closeCategorySettingsMenu();

    const menu = document.createElement('div');
    menu.className = 'category-settings-menu glass';
    menu.innerHTML = `
        <button type="button" class="category-settings-menu-btn" data-action="rename">${t('tools.rename', 'Rename')}</button>
        <button type="button" class="category-settings-menu-btn is-danger" data-action="delete">${t('buttons.delete', 'Delete')}</button>
    `;
    document.body.appendChild(menu);

    const rect = buttonEl.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    let left = rect.right - menuRect.width;
    let top = rect.bottom + 6;
    const maxLeft = window.innerWidth - menuRect.width - 8;
    const maxTop = window.innerHeight - menuRect.height - 8;
    left = Math.max(8, Math.min(left, maxLeft));
    top = Math.max(8, Math.min(top, maxTop));
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;

    menu.querySelector('[data-action="rename"]')?.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeCategorySettingsMenu();
        await renameCategoryTag(normalizedTag, label);
    });
    menu.querySelector('[data-action="delete"]')?.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeCategorySettingsMenu();
        const selected = Array.from(getActiveCategorySelectionSet())
            .map((tagId) => normalizeTagCategory(tagId))
            .filter((tagId) => tagId && tagId !== 'all');
        const targetIds = (getCategorySelectionMode() === 'multi'
            && selected.length > 1
            && selected.includes(normalizedTag))
            ? selected
            : [normalizedTag];
        const labelMap = new Map();
        selected.forEach((tagId) => labelMap.set(tagId, formatTagLabel(tagId)));
        labelMap.set(normalizedTag, String(label || formatTagLabel(normalizedTag)).trim());
        await deleteCategoryTags(targetIds, labelMap);
    });

    const onPointerDown = (event) => {
        if (event.target === buttonEl || buttonEl.contains(event.target)) return;
        if (menu.contains(event.target)) return;
        closeCategorySettingsMenu();
    };
    const onKeyDown = (event) => {
        if (event.key === 'Escape') closeCategorySettingsMenu();
    };
    const onResize = () => closeCategorySettingsMenu();
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('resize', onResize, true);
    categorySettingsMenuState = { menu, onPointerDown, onKeyDown, onResize };
}

function setActiveCategoryLinkState(listRoot) {
    if (!listRoot) return;
    listRoot.querySelectorAll('li').forEach((item) => item.classList.remove('active'));
    listRoot.querySelectorAll('a[data-category-tag]').forEach((link) => link.classList.remove('active'));
    const selected = getActiveCategorySelectionSet();
    if (selected.size === 0) {
        const allLink = listRoot.querySelector('a[data-category-tag="all"]');
        if (allLink && allLink.parentElement) {
            allLink.classList.add('active');
            allLink.parentElement.classList.add('active');
        }
        return;
    }

    listRoot.querySelectorAll('a[data-category-tag]').forEach((link) => {
        const tag = normalizeTagCategory(link.dataset.categoryTag || '');
        if (!selected.has(tag)) return;
        link.classList.add('active');
        if (link.parentElement) link.parentElement.classList.add('active');
    });
}

async function renderCategoriesList() {
    const listRoot = document.getElementById('categories-list');
    if (!listRoot) return;
    closeCategorySettingsMenu();

    await loadTagLabelMap();
    const categories = sortCategoryRows(getTagCategoryCounts(getGames(), { getLabel: formatTagLabel }));
    const available = new Set(categories.map((entry) => normalizeTagCategory(entry.id)));
    const selectedBeforePrune = getActiveCategorySelectionSet();
    const selectedAfterPrune = new Set(Array.from(selectedBeforePrune).filter((tag) => available.has(tag)));
    syncCategoryStateFromSelectionSet(selectedAfterPrune);

    if (categories.length <= CATEGORY_VISIBLE_LIMIT) {
        categoriesShowAll = false;
    }
    const selectedTags = getActiveCategorySelectionSet();
    let visibleCategories = categories;
    if (!categoriesShowAll && categories.length > CATEGORY_VISIBLE_LIMIT) {
        const firstSlice = categories.slice(0, CATEGORY_VISIBLE_LIMIT);
        if (selectedTags.size === 0) {
            visibleCategories = firstSlice;
        } else {
            const included = new Set(firstSlice.map((entry) => normalizeTagCategory(entry.id)));
            const merged = [...firstSlice];
            categories.forEach((entry) => {
                const id = normalizeTagCategory(entry.id);
                if (!selectedTags.has(id)) return;
                if (included.has(id)) return;
                included.add(id);
                merged.push(entry);
            });
            visibleCategories = merged;
        }
    }

    const categoryItems = visibleCategories.map((entry) => {
        return `
            <li class="category-item" data-category-item="${escapeHtml(entry.id)}">
                <a href="#" data-category-tag="${escapeHtml(entry.id)}">
                    <span>${escapeHtml(entry.label)}</span>
                    <small>${entry.count}</small>
                </a>
                <button
                    class="category-settings-btn"
                    type="button"
                    data-category-settings="${escapeHtml(entry.id)}"
                    data-category-label="${escapeHtml(entry.label)}"
                    aria-label="${escapeHtml(t('categories.categorySettingsFor', 'Category settings for {{label}}', { label: entry.label }))}"
                    title="${escapeHtml(t('categories.categorySettings', 'Category settings'))}"
                >
                    <span class="icon-svg" aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                            <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"></path>
                            <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1 1 0 0 1 0 1.4l-1 1a1 1 0 0 1-1.4 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1 1 0 0 1-1.4 0l-1-1a1 1 0 0 1 0-1.4l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1 1 0 0 1 0-1.4l1-1a1 1 0 0 1 1.4 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1 1 0 0 1 1.4 0l1 1a1 1 0 0 1 0 1.4l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-.2a1 1 0 0 0-.9.6Z"></path>
                        </svg>
                    </span>
                </button>
            </li>
        `;
    }).join('');

    const showMoreMarkup = categories.length > CATEGORY_VISIBLE_LIMIT
        ? `
            <li class="categories-llm-row categories-more-row">
                <button class="action-btn small" type="button" data-category-action="toggle-show-more">
                    ${categoriesShowAll
                        ? t('sidebar.categoriesShowLess', 'Show less')
                        : t('sidebar.categoriesShowMore', 'Show more ({{count}})', { count: Math.max(0, categories.length - CATEGORY_VISIBLE_LIMIT) })}
                </button>
            </li>
        `
        : '';

    listRoot.innerHTML = `
        <li><a href="#" data-category-tag="all">${escapeHtml(t('sidebar.all', 'All'))}</a></li>
        <li class="categories-llm-row categories-sort-row">
            <label class="categories-sort-label" for="category-sort-mode">${escapeHtml(t('sidebar.categoriesSortBy', 'Sort by'))}</label>
            <select id="category-sort-mode" class="categories-sort-select" data-category-action="sort-mode">
                <option value="name-asc"${categorySortMode === 'name-asc' ? ' selected' : ''}>${escapeHtml(t('sidebar.categoriesSortNameAsc', 'Name (A-Z)'))}</option>
                <option value="count-desc"${categorySortMode === 'count-desc' ? ' selected' : ''}>${escapeHtml(t('sidebar.categoriesSortGameCount', 'Game Count'))}</option>
            </select>
        </li>
        <li class="categories-llm-row">
            <button class="action-btn small" type="button" data-category-action="toggle-selection-mode">${escapeHtml(getSelectionModeButtonText())}</button>
        </li>
        ${isLlmHelpersEnabled()
            ? `<li class="categories-llm-row"><button class="action-btn small" type="button" data-category-action="llm-global-tags">${escapeHtml(t('sidebar.addGlobalTagsWithLlm', 'Add Global Tags with LLM'))}</button></li>`
            : ''}
        ${categoryItems}
        ${showMoreMarkup}
    `;

    setActiveCategoryLinkState(listRoot);

    listRoot.querySelectorAll('a[data-category-tag]').forEach((link) => {
        link.addEventListener('click', async (event) => {
            event.preventDefault();
            const nextTag = normalizeTagCategory(link.dataset.categoryTag || 'all');
            const temporaryMultiSelect = getCategorySelectionMode() === 'single' && (
                !!event.ctrlKey
                || !!event.metaKey
                || !!event.getModifierState?.('Control')
                || !!event.getModifierState?.('Meta')
            );
            if (nextTag === 'all') {
                clearCategorySelection();
            } else if (temporaryMultiSelect) {
                categoryModeModifierForceUntil = Date.now() + 240;
                const next = new Set(getActiveCategorySelectionSet());
                if (next.has(nextTag)) next.delete(nextTag);
                else next.add(nextTag);
                syncCategoryStateFromSelectionSet(next);
            } else if (getCategorySelectionMode() === 'single') {
                const currentlySelected = getActiveCategorySelectionSet();
                const shouldClear = currentlySelected.size === 1 && currentlySelected.has(nextTag);
                syncCategoryStateFromSelectionSet(shouldClear ? new Set() : new Set([nextTag]));
            } else {
                const next = new Set(getActiveCategorySelectionSet());
                if (next.has(nextTag)) next.delete(nextTag);
                else next.add(nextTag);
                syncCategoryStateFromSelectionSet(next);
            }
            setActiveCategoryLinkState(listRoot);
            if (isLibraryTopSection() && !isEmulatorsSection()) {
                await renderActiveLibraryView();
            }
        });
    });

    listRoot.querySelectorAll('[data-category-settings]').forEach((button) => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const tagId = String(button.dataset.categorySettings || '').trim();
            const label = String(button.dataset.categoryLabel || '').trim() || formatTagLabel(tagId);
            openCategorySettingsMenu(button, { tagId, label });
        });
    });

    const modeToggleBtn = listRoot.querySelector('[data-category-action="toggle-selection-mode"]');
    if (modeToggleBtn) {
        setupCategoryModePreviewHandlers(modeToggleBtn);
        modeToggleBtn.addEventListener('click', async () => {
            const nextMode = getCategorySelectionMode() === 'single' ? 'multi' : 'single';
            setCategorySelectionMode(nextMode);
            await renderCategoriesList();
            if (isLibraryTopSection() && !isEmulatorsSection()) {
                await renderActiveLibraryView();
            }
        });
    }

    const sortModeSelect = listRoot.querySelector('[data-category-action="sort-mode"]');
    if (sortModeSelect) {
        sortModeSelect.addEventListener('change', async () => {
            setCategorySortMode(sortModeSelect.value);
            await renderCategoriesList();
        });
    }

    const showMoreBtn = listRoot.querySelector('[data-category-action="toggle-show-more"]');
    if (showMoreBtn) {
        showMoreBtn.addEventListener('click', async () => {
            categoriesShowAll = !categoriesShowAll;
            await renderCategoriesList();
        });
    }

    const globalLlmBtn = listRoot.querySelector('[data-category-action="llm-global-tags"]');
    if (globalLlmBtn) {
        globalLlmBtn.addEventListener('click', async () => {
            if (!isLlmHelpersEnabled()) return;
            const settings = loadSuggestionSettings();
            const provider = normalizeSuggestionProvider(settings.provider);
            const model = String(settings.models?.[provider] || '').trim();
            const baseUrl = String(settings.baseUrls?.[provider] || '').trim();
            const apiKey = String(settings.apiKeys?.[provider] || '').trim();
            if (!model || !baseUrl) {
                await showGlassMessageDialog({
                    title: t('categories.globalLlmTaggingTitle', 'Global LLM Tagging'),
                    message: t('categories.configureLlmProviderFirst', 'Configure your LLM provider/model first in Suggested view.'),
                    level: 'warning'
                });
                return;
            }
            if ((provider === 'openai' || provider === 'gemini') && !apiKey) {
                await showGlassMessageDialog({
                    title: t('categories.globalLlmTaggingTitle', 'Global LLM Tagging'),
                    message: t('categories.apiKeyMissingSelectedProvider', 'API key is missing for the selected provider.'),
                    level: 'warning'
                });
                return;
            }

            const tagCatalog = await loadTagCatalogRows();
            if (!tagCatalog.length) {
                await showGlassMessageDialog({
                    title: t('categories.globalLlmTaggingTitle', 'Global LLM Tagging'),
                    message: t('categories.noTagsFound', 'No tags found in emubro-resources/tags.'),
                    level: 'warning'
                });
                return;
            }

            const allSectionGames = getSectionFilteredGames();
            const untaggedSectionGames = allSectionGames.filter((game) => getGameTagIds(game).length === 0);
            if (!allSectionGames.length) {
                await showGlassMessageDialog({
                    title: t('categories.globalLlmTaggingTitle', 'Global LLM Tagging'),
                    message: t('categories.noMatchingGamesToTag', 'No matching games to tag in the current filter/category selection.'),
                    level: 'warning'
                });
                return;
            }

            const plan = await openGlobalLlmTaggingSetupModal({
                totalAll: allSectionGames.length,
                totalUntagged: untaggedSectionGames.length,
                countCalculator: ({ includeAlreadyTagged, skipTaggedCount }) => {
                    if (!includeAlreadyTagged) return untaggedSectionGames.length;
                    if (typeof skipTaggedCount === 'number' && skipTaggedCount >= 0) {
                        return allSectionGames.reduce((acc, game) => {
                            if (getGameTagIds(game).length <= skipTaggedCount) return acc + 1;
                            return acc;
                        }, 0);
                    }
                    return allSectionGames.length;
                }
            });
            if (!plan) return;

            let candidateGames = plan.includeAlreadyTagged ? [...allSectionGames] : [...untaggedSectionGames];
            if (plan.includeAlreadyTagged && plan.skipTaggedCount >= 0) {
                candidateGames = candidateGames.filter((game) => getGameTagIds(game).length <= plan.skipTaggedCount);
            }
            if (!candidateGames.length) {
                await showGlassMessageDialog({
                    title: t('categories.globalLlmTaggingTitle', 'Global LLM Tagging'),
                    message: plan.includeAlreadyTagged
                        ? t('categories.noGamesAvailableForTagging', 'No games available for tagging.')
                        : t('categories.noUntaggedGamesForSelection', 'No untagged games found for this selection.'),
                    level: 'warning'
                });
                return;
            }

            if (plan.processMode !== 'all') {
                candidateGames = candidateGames.slice(0, Math.max(1, Number(plan.nextCount) || 1));
            }
            if (!candidateGames.length) {
                await showGlassMessageDialog({
                    title: t('categories.globalLlmTaggingTitle', 'Global LLM Tagging'),
                    message: t('categories.noGamesAfterRunSettings', 'No games selected after applying your run settings.'),
                    level: 'warning'
                });
                return;
            }

            const chunkValue = Math.max(1, Number(plan.chunkValue) || 1);
            const chunkSize = plan.chunkMode === 'count'
                ? Math.max(1, Math.ceil(candidateGames.length / chunkValue))
                : chunkValue;
            const queueChunks = [];
            for (let idx = 0; idx < candidateGames.length; idx += chunkSize) {
                queueChunks.push(candidateGames.slice(idx, idx + chunkSize));
            }
            if (!queueChunks.length) {
                await showGlassMessageDialog({
                    title: t('categories.globalLlmTaggingTitle', 'Global LLM Tagging'),
                    message: t('categories.unableBuildChunks', 'Unable to build processing chunks from your input.'),
                    level: 'error'
                });
                return;
            }

            const previousLabel = globalLlmBtn.textContent;
            globalLlmBtn.disabled = true;
            globalLlmBtn.textContent = t('categories.taggingProgress', 'Tagging {{done}} / {{total}}...', { done: 0, total: candidateGames.length });

            const progressDialog = createGlobalLlmProgressDialog({
                totalGames: candidateGames.length,
                totalChunks: queueChunks.length,
                confirmEachChunk: !!plan.confirmEachChunk,
                chunkValue: plan.chunkValue,
                chunkMode: plan.chunkMode
            });

            let processed = 0;
            let updated = 0;
            let skipped = 0;
            let failed = 0;
            let stoppedEarly = false;

            progressDialog.setStatus(t('categories.startingChunkStatus', 'Starting chunk 1 / {{totalChunks}}...', { totalChunks: queueChunks.length }));
            progressDialog.log(t('categories.runPlanLog', 'Run plan: {{games}} game(s), {{chunks}} chunk(s), chunk size {{chunkSize}}.', {
                games: candidateGames.length,
                chunks: queueChunks.length,
                chunkSize
            }));

            try {
                let chunkIndex = 0;
                while (chunkIndex < candidateGames.length) {
                    if (progressDialog.isCanceled()) {
                        stoppedEarly = true;
                        progressDialog.log(t('categories.runCanceledByUser', 'Run canceled by user.'), 'warning');
                        break;
                    }
                    const currentChunkSize = progressDialog.getLiveChunkSize(candidateGames.length - chunkIndex);
                    const chunk = candidateGames.slice(chunkIndex, chunkIndex + currentChunkSize);
                    const chunkDisplayIndex = Math.floor(chunkIndex / chunkSize) + 1; // approximated
                    progressDialog.setStatus(`Processing chunk... (${chunk.length} game(s), ${candidateGames.length - chunkIndex} remaining)`);
                    progressDialog.log(t('categories.chunkStarted', 'Chunk: started ({{count}} game(s)).', { count: chunk.length }));
                    let batchResponse = null;
                    try {
                        const batchPayloadGames = chunk.map((game) => ({
                            id: Number(game?.id || 0),
                            name: String(game?.name || ''),
                            platform: String(game?.platform || game?.platformShortName || ''),
                            platformShortName: String(game?.platformShortName || ''),
                            genre: String(game?.genre || ''),
                            description: String(game?.description || ''),
                            tags: getGameTagIds(game)
                        }));
                        progressDialog.log(`Chunk ${chunkIndex + 1}: sending ${batchPayloadGames.length} game(s) in one LLM request...`);
                        batchResponse = await emubro.invoke('suggestions:suggest-tags-for-games-batch', {
                            provider,
                            model,
                            baseUrl,
                            apiKey,
                            maxTags: 6,
                            allowUnknownTags: isLlmAllowUnknownTagsEnabled(),
                            games: batchPayloadGames,
                            availableTags: tagCatalog
                        });
                    } catch (batchError) {
                        batchResponse = {
                            success: false,
                            message: String(batchError?.message || batchError || 'unknown error'),
                            results: []
                        };
                    }

                    if (!batchResponse?.success) {
                        progressDialog.log(t('categories.chunkBatchRequestFailed', 'Chunk: batch request failed ({{message}}).', {
                            message: String(batchResponse?.message || 'unknown error')
                        }), 'error');
                        for (let gameIndex = 0; gameIndex < chunk.length; gameIndex += 1) {
                            processed += 1;
                            failed += 1;
                            progressDialog.updateCounters({ processed, updated, skipped, failed });
                            globalLlmBtn.textContent = t('categories.taggingProgress', 'Tagging {{done}} / {{total}}...', {
                                done: Math.min(processed, candidateGames.length),
                                total: candidateGames.length
                            });
                        }
                        if (progressDialog.isCanceled()) {
                            stoppedEarly = true;
                            progressDialog.log(t('categories.runCanceledByUser', 'Run canceled by user.'), 'warning');
                            break;
                        }
                    } else {
                        const resultRows = Array.isArray(batchResponse?.results) ? batchResponse.results : [];
                        const resultByGameId = new Map();
                        resultRows.forEach((row) => {
                            const gameId = Number(row?.gameId || 0);
                            if (gameId <= 0) return;
                            if (resultByGameId.has(gameId)) return;
                            resultByGameId.set(gameId, row);
                        });
                        progressDialog.log(t('categories.chunkReceivedResults', 'Chunk: received {{count}} result row(s).', { count: resultByGameId.size }));

                        for (let gameIndex = 0; gameIndex < chunk.length; gameIndex += 1) {
                            if (progressDialog.isCanceled()) {
                                stoppedEarly = true;
                                progressDialog.log(t('categories.runCanceledByUser', 'Run canceled by user.'), 'warning');
                                break;
                            }
                            const game = chunk[gameIndex];
                            const gameId = Number(game?.id || 0);
                            const gameName = String(game?.name || `Game ${processed + 1}`);
                            globalLlmBtn.textContent = t('categories.taggingProgress', 'Tagging {{done}} / {{total}}...', {
                                done: processed + 1,
                                total: candidateGames.length
                            });
                            try {
                                const row = resultByGameId.get(gameId);
                                if (!row) {
                                    skipped += 1;
                                    progressDialog.log(`${gameName}: no result returned in batch response.`, 'warning');
                                    continue;
                                }
                                const suggestedTags = (Array.isArray(row?.tags) ? row.tags : [])
                                    .map((tag) => normalizeTagCategory(tag))
                                    .filter((tag) => tag !== 'all');
                                if (!suggestedTags.length) {
                                    skipped += 1;
                                    progressDialog.log(`${gameName}: no usable tags returned.`, 'warning');
                                    continue;
                                }

                                const saveResult = await emubro.invoke('update-game-metadata', {
                                    gameId: Number(gameId),
                                    tags: suggestedTags
                                });
                                if (saveResult?.success) {
                                    updated += 1;
                                } else {
                                    failed += 1;
                                    progressDialog.log(`${gameName}: failed to save tags (${String(saveResult?.message || 'unknown error')}).`, 'error');
                                }
                            } catch (error) {
                                failed += 1;
                                progressDialog.log(`${gameName}: error (${String(error?.message || error || 'unknown')}).`, 'error');
                            } finally {
                                processed += 1;
                                progressDialog.updateCounters({ processed, updated, skipped, failed });
                            }
                        }
                    }
                    if (stoppedEarly) break;

                    chunkIndex += chunk.length;
                    progressDialog.log(t('categories.chunkCompleted', 'Chunk completed.'));
                    if (chunkIndex < candidateGames.length) {
                        const nextChunkSize = progressDialog.getLiveChunkSize(candidateGames.length - chunkIndex);
                        const decision = await progressDialog.waitForNextChunk(
                            Math.floor(chunkIndex / chunkSize) + 2,
                            nextChunkSize
                        );
                        if (decision !== 'continue') {
                            stoppedEarly = true;
                            progressDialog.log(t('categories.runStoppedBeforeNextChunk', 'Run stopped by user before next chunk.'), 'warning');
                            break;
                        }
                    }
                }

                const refreshedGames = await emubro.invoke('get-games');
                setGames(refreshedGames);
                applyFilters(false);
                await renderCategoriesList();
                if (isLibraryTopSection() && !isEmulatorsSection()) {
                    await renderActiveLibraryView();
                }

                const summaryMessage = t(
                    'categories.globalLlmTaggingSummary',
                    'Global LLM tagging {{status}}. Updated: {{updated}}, skipped: {{skipped}}, failed: {{failed}}, processed: {{processed}}.',
                    {
                        status: stoppedEarly
                            ? t('categories.statusStoppedEarly', 'stopped early')
                            : t('categories.statusFinished', 'finished'),
                        updated,
                        skipped,
                        failed,
                        processed
                    }
                );
                progressDialog.complete(summaryMessage, failed > 0 ? 'warning' : 'info');
                addFooterNotification(summaryMessage, failed > 0 ? 'warning' : 'success');
                openFooterPanel('notifications');
            } finally {
                globalLlmBtn.disabled = false;
                globalLlmBtn.textContent = previousLabel;
            }
        });
    }
}

    return {
        renderCategoriesList,
        dispose: () => {
            closeCategorySettingsMenu();
            clearCategoryModePreviewHandlers();
        },
        getCategoriesShowAll: () => categoriesShowAll
    };
}
