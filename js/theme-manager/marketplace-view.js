/**
 * Theme marketplace view rendering
 */

export async function renderMarketplaceView(options = {}) {
    const {
        forceRefresh = false,
        containerId = 'marketplace-list',
        fetchCommunityThemes,
        getCustomThemes,
        deleteCustomTheme,
        saveCustomTheme,
        applyCustomTheme,
        extractBackgroundLayers,
        normalizeGradientAngle,
        i18n
    } = options;

    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `<div class="loading-message" style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">${i18n.t('theme.fetchingThemes')}</div>`;

    const themes = await fetchCommunityThemes(forceRefresh);
    container.innerHTML = '';

    if (themes.length === 0) {
        container.innerHTML = `<div class="error-message" style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--danger-color);">${i18n.t('theme.loadThemesError')}</div>`;
        return;
    }

    const customThemes = getCustomThemes();

    themes.forEach(theme => {
        const card = document.createElement('div');
        card.className = 'marketplace-card';

        const isInstalled = customThemes.some(t => t.name === theme.name && (t.author === theme.author || !t.author));
        const installedTheme = customThemes.find(t => t.name === theme.name && (t.author === theme.author || !t.author));

        const previewLayer = extractBackgroundLayers(theme.background || {})[0] || null;
        const hasBgImage = Boolean(previewLayer && previewLayer.image);
        const gradientAngle = normalizeGradientAngle(theme.colors.appGradientAngle || '145deg');
        const gradientA = theme.colors.appGradientA || theme.colors.bgPrimary;
        const gradientB = theme.colors.appGradientB || theme.colors.bgSecondary;
        const gradientC = theme.colors.appGradientC || theme.colors.bgPrimary;
        const bgPreviewStyle = hasBgImage
            ? `background-image: url('${previewLayer.image}'); background-size: cover; background-position: center;`
            : `background: linear-gradient(${gradientAngle}, ${gradientA}, ${gradientB}, ${gradientC});`;

        card.innerHTML = `
            <div class="marketplace-card-header" style="${bgPreviewStyle} height: 120px; border-radius: 6px; margin-bottom: 10px; position: relative; border: 1px solid var(--border-color); overflow: hidden;">
                <span class="author-tag" style="position: absolute; bottom: 8px; right: 8px; margin: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);">${i18n.t('theme.by', {author: theme.author})}</span>
            </div>
            <div class="theme-item-info">
                <span class="theme-item-name" style="font-weight: bold; font-size: 1.1rem;">${theme.name}</span>
            </div>
            <div class="theme-preview" style="margin: 10px 0;">
                <div class="theme-color-dot" style="background-color: ${gradientA}" title="Gradient A"></div>
                <div class="theme-color-dot" style="background-color: ${gradientB}" title="Gradient B"></div>
                <div class="theme-color-dot" style="background-color: ${theme.colors.accentColor}" title="Accent"></div>
            </div>
            <div style="display: flex; gap: 8px;">
                <button class="action-btn small preview-btn" style="flex: 1; background: var(--bg-tertiary);">${i18n.t('theme.preview')}</button>
                ${isInstalled
                    ? `<button class="action-btn remove-btn small marketplace-remove-btn" data-id="${installedTheme.id}" style="flex: 1;">${i18n.t('theme.remove')}</button>`
                    : `<button class="action-btn launch-btn small add-btn" data-id="${theme.id}" style="flex: 1;">${i18n.t('theme.add')}</button>`
                }
            </div>
        `;

        card.querySelector('.preview-btn').addEventListener('click', () => {
            applyCustomTheme(theme);
        });

        if (isInstalled) {
            card.querySelector('.marketplace-remove-btn').addEventListener('click', () => {
                deleteCustomTheme(installedTheme.id);
                renderMarketplaceView({
                    ...options,
                    forceRefresh: false
                });
            });
        } else {
            card.querySelector('.add-btn').addEventListener('click', () => {
                const newTheme = { ...theme, id: 'custom_' + Date.now() };
                saveCustomTheme(newTheme);
                alert(i18n.t('theme.addedToThemes', {name: theme.name}));
                renderMarketplaceView({
                    ...options,
                    forceRefresh: false
                });
            });
        }

        container.appendChild(card);
    });
}
