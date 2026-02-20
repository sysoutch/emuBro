function defaultEscapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function renderSuggestionResults(panel, response, options = {}) {
    const resultsRoot = panel?.querySelector('[data-suggest-results]');
    if (!resultsRoot) return;

    const escapeHtml = typeof options.escapeHtml === 'function' ? options.escapeHtml : defaultEscapeHtml;
    const onSearch = typeof options.onSearch === 'function' ? options.onSearch : (() => {});
    const findInLibraryLabel = String(options.findInLibraryLabel || 'Find in Library');
    const searchLibraryLabel = String(options.searchLibraryLabel || 'Search Library');

    const libraryMatches = Array.isArray(response?.libraryMatches) ? response.libraryMatches : [];
    const missingSuggestions = Array.isArray(response?.missingSuggestions) ? response.missingSuggestions : [];
    const summary = String(response?.summary || '').trim();

    if (libraryMatches.length === 0 && missingSuggestions.length === 0) {
        resultsRoot.innerHTML = '<div class="suggested-result-group"><h4 class="suggested-result-title">No suggestions yet</h4><p class="suggested-result-reason">Try another mood or broaden the scope.</p></div>';
        return;
    }

    const libraryHtml = libraryMatches.length > 0
        ? `
            <section class="suggested-result-group">
                <h4 class="suggested-result-title">From Your Library</h4>
                <ul class="suggested-result-list">
                    ${libraryMatches.map((entry) => {
                        const name = escapeHtml(entry?.name || entry?.title || 'Suggested game');
                        const platform = escapeHtml(entry?.platform ? ` (${entry.platform})` : '');
                        const reason = escapeHtml(entry?.reason || '');
                        const searchKey = escapeHtml(entry?.name || entry?.title || '');
                        return `
                            <li class="suggested-result-item">
                                <div class="suggested-result-meta">
                                    <span class="suggested-result-name">${name}${platform}</span>
                                    <span class="suggested-result-reason">${reason}</span>
                                </div>
                                <div class="suggested-result-actions">
                                    <button class="action-btn small" type="button" data-suggest-search="${searchKey}">${escapeHtml(findInLibraryLabel)}</button>
                                </div>
                            </li>
                        `;
                    }).join('')}
                </ul>
            </section>
        `
        : '';

    const missingHtml = missingSuggestions.length > 0
        ? `
            <section class="suggested-result-group">
                <h4 class="suggested-result-title">Recommended To Add</h4>
                <ul class="suggested-result-list">
                    ${missingSuggestions.map((entry) => {
                        const name = escapeHtml(entry?.name || entry?.title || 'Suggested title');
                        const platform = escapeHtml(entry?.platform ? ` (${entry.platform})` : '');
                        const reason = escapeHtml(entry?.reason || '');
                        const searchKey = escapeHtml(entry?.name || entry?.title || '');
                        return `
                            <li class="suggested-result-item">
                                <div class="suggested-result-meta">
                                    <span class="suggested-result-name">${name}${platform}</span>
                                    <span class="suggested-result-reason">${reason}</span>
                                </div>
                                <div class="suggested-result-actions">
                                    <button class="action-btn small" type="button" data-suggest-search="${searchKey}">${escapeHtml(searchLibraryLabel)}</button>
                                </div>
                            </li>
                        `;
                    }).join('')}
                </ul>
            </section>
        `
        : '';

    const summaryHtml = summary
        ? `<section class="suggested-result-group"><h4 class="suggested-result-title">Summary</h4><p class="suggested-result-reason">${escapeHtml(summary)}</p></section>`
        : '';

    resultsRoot.innerHTML = `${summaryHtml}${libraryHtml}${missingHtml}`;
    resultsRoot.querySelectorAll('[data-suggest-search]').forEach((button) => {
        button.addEventListener('click', () => {
            onSearch(button.dataset.suggestSearch || '');
        });
    });
}
