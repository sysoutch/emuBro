const ROOT_EDITOR_GROUP_KEY = '__root__';

function getEditorGroupKey(keyPath) {
    const text = String(keyPath || '').trim();
    if (!text || !text.includes('.')) return ROOT_EDITOR_GROUP_KEY;
    const first = text.split('.')[0];
    return first ? first.trim() : ROOT_EDITOR_GROUP_KEY;
}

function getEditorGroupLabel(groupKey) {
    if (groupKey === ROOT_EDITOR_GROUP_KEY) return 'General';
    return String(groupKey || '').trim() || 'General';
}

function buildEditorRowMarkup({ key, baseVal, targetVal, escapeHtml }) {
    const safeKey = escapeHtml(key);
    const safeBaseVal = escapeHtml(baseVal);
    const safeTargetVal = escapeHtml(targetVal);
    const missingClass = targetVal ? '' : ' missing';
    return `
        <div class="lang-key-row${missingClass}">
            <div class="key-label" title="${safeKey}">${safeKey}</div>
            <div class="base-value" title="${safeBaseVal}">${safeBaseVal}</div>
            <div class="target-value">
                <textarea class="lang-input" data-key="${safeKey}">${safeTargetVal}</textarea>
            </div>
        </div>
    `;
}

function bindEditorGroupToggles(rootEl, collapsedEditorGroups) {
    if (!rootEl) return;
    rootEl.querySelectorAll('[data-lang-group-toggle]').forEach((button) => {
        button.addEventListener('click', () => {
            const groupKey = String(button.dataset.langGroupToggle || '').trim();
            if (!groupKey) return;

            const section = button.closest('[data-lang-group]');
            if (!section) return;

            const currentlyCollapsed = section.classList.contains('is-collapsed');
            if (currentlyCollapsed) {
                section.classList.remove('is-collapsed');
                collapsedEditorGroups.delete(groupKey);
                button.setAttribute('aria-expanded', 'true');
            } else {
                section.classList.add('is-collapsed');
                collapsedEditorGroups.add(groupKey);
                button.setAttribute('aria-expanded', 'false');
            }
        });
    });
}

export function renderEditorKeysView({
    currentLangData,
    getBaseLanguage,
    flattenObject,
    filter = '',
    escapeHtml,
    collapsedEditorGroups,
    maxRows = 500,
    showingFirstLabel = 'Showing first rows'
}) {
    const list = document.getElementById('lang-keys-list');
    if (!list || !currentLangData) return;
    list.innerHTML = '';

    const base = getBaseLanguage();
    const baseFlat = flattenObject(base.en || {});
    const targetFlat = flattenObject(currentLangData.data[currentLangData.code] || {});

    const keys = Object.keys(baseFlat).sort();
    const normalizedFilter = String(filter || '').trim().toLowerCase();
    const matches = keys.filter((key) => {
        if (!normalizedFilter) return true;
        const baseVal = String(baseFlat[key] || '');
        const targetVal = String(targetFlat[key] || '');
        return key.toLowerCase().includes(normalizedFilter)
            || baseVal.toLowerCase().includes(normalizedFilter)
            || targetVal.toLowerCase().includes(normalizedFilter);
    });

    const visibleKeys = normalizedFilter
        ? matches
        : matches.slice(0, maxRows);

    const groupedRows = new Map();
    visibleKeys.forEach((key) => {
        const groupKey = getEditorGroupKey(key);
        if (!groupedRows.has(groupKey)) groupedRows.set(groupKey, []);
        groupedRows.get(groupKey).push({
            key,
            baseVal: String(baseFlat[key] || ''),
            targetVal: String(targetFlat[key] || '')
        });
    });

    const fragment = document.createDocumentFragment();
    groupedRows.forEach((rows, groupKey) => {
        const section = document.createElement('section');
        section.className = 'lang-key-group';
        section.dataset.langGroup = groupKey;

        const isCollapsed = !normalizedFilter && collapsedEditorGroups.has(groupKey);
        if (isCollapsed) section.classList.add('is-collapsed');

        const groupLabel = getEditorGroupLabel(groupKey);
        const rowsMarkup = rows
            .map((row) => buildEditorRowMarkup({ ...row, escapeHtml }))
            .join('');

        section.innerHTML = `
            <button class="lang-key-group-header" type="button" data-lang-group-toggle="${escapeHtml(groupKey)}" aria-expanded="${isCollapsed ? 'false' : 'true'}">
                <span class="lang-key-group-label">${escapeHtml(groupLabel)}</span>
                <span class="lang-key-group-count">${rows.length}</span>
            </button>
            <div class="lang-key-group-body">
                ${rowsMarkup}
            </div>
        `;

        fragment.appendChild(section);
    });

    if (matches.length > maxRows && !normalizedFilter) {
        const info = document.createElement('div');
        info.style.textAlign = 'center';
        info.style.padding = '10px';
        info.textContent = showingFirstLabel;
        fragment.appendChild(info);
    }

    list.appendChild(fragment);
    bindEditorGroupToggles(list, collapsedEditorGroups);
}
