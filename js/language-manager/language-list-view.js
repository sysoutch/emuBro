export function renderLanguagesListView({
    languages = [],
    i18nRef,
    calculateProgress,
    resolveBundledFlagCode,
    escapeHtml,
    applyFlagVisual,
    onOpenEditor,
    onExportLanguage,
    onChangeFlag,
    onRename,
    onDelete
}) {
    const listContainer = document.getElementById('language-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    (Array.isArray(languages) ? languages : []).forEach((lang) => {
        const progress = calculateProgress(lang.data, lang.code);
        const langInfo = lang.data[lang.code].language || {};
        const name = String(langInfo.name || lang.code || '');
        const flag = resolveBundledFlagCode(langInfo.flag || '', 'us');
        const abbreviation = String(langInfo.abbreviation || lang.code || '').trim();
        const safeName = escapeHtml(name);
        const safeAbbreviation = escapeHtml(abbreviation || lang.code);
        const safeFlagClass = `fi fi-${flag}`;

        const source = String(lang?.source || '').trim().toLowerCase();
        const canRename = !!lang?.canRename;
        const canDelete = !!lang?.canDelete;

        const card = document.createElement('div');
        card.className = 'language-card';
        card.innerHTML = `
            <div class="lang-info">
                <span class="${safeFlagClass}" data-lang-flag="${escapeHtml(String(langInfo.flag || flag))}"></span>
                <span class="lang-name">${safeName}</span>
                <span class="lang-code">(${safeAbbreviation})</span>
                <span class="lang-source">${escapeHtml(source || 'app')}</span>
            </div>
            <div class="lang-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <span class="progress-text">${progress}%</span>
            </div>
            <div class="lang-actions">
                <button class="action-btn small export-btn" type="button">${escapeHtml(i18nRef.t('language.exportJson'))}</button>
                <button class="action-btn small edit-btn" type="button">${escapeHtml(i18nRef.t('language.editButton'))}</button>
                <button class="action-btn small flag-btn" type="button">Flag</button>
                <button class="action-btn small rename-btn" type="button"${canRename ? '' : ' disabled title="Only user-installed languages can be renamed"'}>Rename</button>
                <button class="action-btn small remove-btn delete-btn" type="button"${canDelete ? '' : ' disabled title="Only user-installed languages can be deleted"'}>Delete</button>
            </div>
        `;

        card.querySelector('.edit-btn')?.addEventListener('click', () => {
            onOpenEditor?.(lang);
        });
        card.querySelector('.export-btn')?.addEventListener('click', () => {
            try {
                onExportLanguage?.(lang);
            } catch (error) {
                console.error('Failed to export language:', error);
                alert(i18nRef.t('language.exportError', { message: String(error?.message || error || 'Unknown error') }));
            }
        });
        card.querySelector('.flag-btn')?.addEventListener('click', () => {
            onChangeFlag?.(lang).catch((error) => {
                console.error('Failed to change language flag:', error);
                alert(`Failed to change flag: ${String(error?.message || error || 'Unknown error')}`);
            });
        });
        card.querySelector('.rename-btn')?.addEventListener('click', () => {
            if (!canRename) return;
            onRename?.(lang).catch((error) => {
                console.error('Failed to rename language:', error);
                alert(`Failed to rename language: ${String(error?.message || error || 'Unknown error')}`);
            });
        });
        card.querySelector('.delete-btn')?.addEventListener('click', () => {
            if (!canDelete) return;
            onDelete?.(lang).catch((error) => {
                console.error('Failed to delete language:', error);
                alert(`Failed to delete language: ${String(error?.message || error || 'Unknown error')}`);
            });
        });

        listContainer.appendChild(card);
        const flagEl = card.querySelector('[data-lang-flag]');
        if (flagEl) {
            void applyFlagVisual(flagEl, langInfo.flag || flag, 'us');
        }
    });
}
