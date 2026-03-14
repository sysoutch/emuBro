function getLanguageActionIconMarkup(kind) {
    const iconPaths = {
        export: '<path d="M12 3v10"></path><path d="M8 9l4 4 4-4"></path><path d="M5 16v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"></path>',
        edit: '<path d="M4 20h4l10-10-4-4L4 16v4Z"></path><path d="m12 6 4 4"></path>',
        flag: '<path d="M6 21V4"></path><path d="M8 5h9l-2 3 2 3H8z"></path>',
        rename: '<path d="M5 8h9"></path><path d="m11 4 4 4-4 4"></path><path d="M19 16H10"></path><path d="m13 12-4 4 4 4"></path>',
        delete: '<path d="M4 7h16"></path><path d="M9 7V4h6v3"></path><path d="M8 7l1 12h6l1-12"></path><path d="M10 11v5"></path><path d="M14 11v5"></path>'
    };
    return `
        <span class="lang-action-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
                ${iconPaths[kind] || ''}
            </svg>
        </span>
    `;
}

function getLanguageActionButtonMarkup({
    buttonClass,
    icon,
    label,
    title,
    disabled = false,
    disabledTitle = ''
}) {
    const effectiveTitle = disabled && disabledTitle ? disabledTitle : title;
    return `
        <button class="action-btn small lang-action-btn ${buttonClass}" type="button" aria-label="${title}" title="${effectiveTitle}"${disabled ? ' disabled' : ''}>
            ${getLanguageActionIconMarkup(icon)}
            <span class="lang-action-label">${label}</span>
        </button>
    `;
}

export function renderLanguagesListView({
    languages = [],
    i18nRef,
    getCurrentLanguageCode,
    calculateProgress,
    resolveBundledFlagCode,
    escapeHtml,
    applyFlagVisual,
    onSelectLanguage,
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
        const currentLanguageCode = typeof getCurrentLanguageCode === 'function'
            ? String(getCurrentLanguageCode() || '').trim().toLowerCase()
            : '';
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
        card.className = `language-card is-selectable${currentLanguageCode === String(lang.code || '').trim().toLowerCase() ? ' is-active' : ''}`;
        const exportLabel = escapeHtml(i18nRef.t('language.exportJson'));
        const editLabel = escapeHtml(i18nRef.t('language.editButton'));
        const flagLabel = escapeHtml(i18nRef.t('language.addDialogFlagLabel') || 'Flag');
        const renameLabel = escapeHtml(i18nRef.t('rename') || 'Rename');
        const deleteLabel = escapeHtml(i18nRef.t('buttons.delete') || 'Delete');
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
                ${getLanguageActionButtonMarkup({
                    buttonClass: 'export-btn',
                    icon: 'export',
                    label: exportLabel,
                    title: exportLabel
                })}
                ${getLanguageActionButtonMarkup({
                    buttonClass: 'edit-btn',
                    icon: 'edit',
                    label: editLabel,
                    title: editLabel
                })}
                ${getLanguageActionButtonMarkup({
                    buttonClass: 'flag-btn',
                    icon: 'flag',
                    label: flagLabel,
                    title: flagLabel
                })}
                ${getLanguageActionButtonMarkup({
                    buttonClass: 'rename-btn',
                    icon: 'rename',
                    label: renameLabel,
                    title: renameLabel,
                    disabled: !canRename,
                    disabledTitle: 'Only user-installed languages can be renamed'
                })}
                ${getLanguageActionButtonMarkup({
                    buttonClass: 'remove-btn delete-btn',
                    icon: 'delete',
                    label: deleteLabel,
                    title: deleteLabel,
                    disabled: !canDelete,
                    disabledTitle: 'Only user-installed languages can be deleted'
                })}
            </div>
        `;

        card.addEventListener('click', () => {
            onSelectLanguage?.(lang);
        });

        card.querySelector('.edit-btn')?.addEventListener('click', (event) => {
            event.stopPropagation();
            onOpenEditor?.(lang);
        });
        card.querySelector('.export-btn')?.addEventListener('click', (event) => {
            event.stopPropagation();
            try {
                onExportLanguage?.(lang);
            } catch (error) {
                console.error('Failed to export language:', error);
                alert(i18nRef.t('language.exportError', { message: String(error?.message || error || 'Unknown error') }));
            }
        });
        card.querySelector('.flag-btn')?.addEventListener('click', (event) => {
            event.stopPropagation();
            onChangeFlag?.(lang).catch((error) => {
                console.error('Failed to change language flag:', error);
                alert(`Failed to change flag: ${String(error?.message || error || 'Unknown error')}`);
            });
        });
        card.querySelector('.rename-btn')?.addEventListener('click', (event) => {
            event.stopPropagation();
            if (!canRename) return;
            onRename?.(lang).catch((error) => {
                console.error('Failed to rename language:', error);
                alert(`Failed to rename language: ${String(error?.message || error || 'Unknown error')}`);
            });
        });
        card.querySelector('.delete-btn')?.addEventListener('click', (event) => {
            event.stopPropagation();
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
