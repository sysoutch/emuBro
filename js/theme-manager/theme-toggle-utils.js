/**
 * Theme toggle helpers
 */

export function toggleThemeColors(options = {}) {
    const {
        getCurrentThemeColors,
        flipLightness,
        applyCustomTheme,
        getComputedBackgroundImage
    } = options;

    const currentColors = getCurrentThemeColors();
    const invertedColors = {};
    const flip = (hex) => flipLightness(hex);

    invertedColors.bgPrimary = flip(currentColors.bgPrimary);
    invertedColors.bgSecondary = flip(currentColors.bgSecondary);
    invertedColors.bgTertiary = flip(currentColors.bgTertiary);
    invertedColors.bgQuaternary = flip(currentColors.bgQuaternary);

    invertedColors.textPrimary = flip(currentColors.textPrimary);
    invertedColors.textSecondary = flip(currentColors.textSecondary);
    invertedColors.textTertiary = flip(currentColors.textTertiary);

    invertedColors.borderColor = flip(currentColors.borderColor);
    invertedColors.accentColor = flip(currentColors.accentColor);
    invertedColors.accentHover = flip(currentColors.accentHover);
    invertedColors.brandColor = flip(currentColors.brandColor);

    invertedColors.bgHeader = flip(currentColors.bgHeader);
    invertedColors.bgSidebar = flip(currentColors.bgSidebar);
    invertedColors.bgActionbar = flip(currentColors.bgActionbar);
    invertedColors.glassSurface = flip(currentColors.glassSurface);
    invertedColors.glassSurfaceStrong = flip(currentColors.glassSurfaceStrong);
    invertedColors.glassBorder = flip(currentColors.glassBorder);
    invertedColors.appGradientA = flip(currentColors.appGradientA);
    invertedColors.appGradientB = flip(currentColors.appGradientB);
    invertedColors.appGradientC = flip(currentColors.appGradientC);
    invertedColors.appGradientAngle = currentColors.appGradientAngle || '160deg';

    invertedColors.successColor = flip(currentColors.successColor);
    invertedColors.dangerColor = flip(currentColors.dangerColor);
    invertedColors.warningColor = flip(currentColors.warningColor);

    let currentBgImage = null;
    if (typeof getComputedBackgroundImage === 'function') {
        currentBgImage = getComputedBackgroundImage();
    }

    const invertedTheme = {
        id: 'temp_inverted',
        name: 'Inverted (Temporary)',
        colors: invertedColors,
        background: {
            image: currentBgImage || null,
            position: 'centered',
            scale: 'crop',
            repeat: 'no-repeat'
        },
        cardEffects: {
            glassEffect: document.documentElement.getAttribute('data-glass-effect') === 'enabled'
        }
    };

    applyCustomTheme(invertedTheme);

    return invertedTheme;
}

export function toggleInvertFilter() {
    const root = document.documentElement;
    const currentFilter = root.style.filter || '';
    if (currentFilter.includes('invert(1)')) {
        root.style.filter = currentFilter.replace('invert(1)', '').trim();
    } else {
        root.style.filter = (currentFilter + ' invert(1)').trim();
    }
}

export function getBackgroundImageFromGrid() {
    const gameGrid = document.querySelector('main.game-grid');
    if (!gameGrid) return null;
    const bgStyle = getComputedStyle(gameGrid).backgroundImage;
    if (!bgStyle || bgStyle === 'none') return null;
    const match = bgStyle.match(/url\(['"]?(.*?)['"]?\)/);
    return match ? match[1] : null;
}
