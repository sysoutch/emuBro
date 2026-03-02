/**
 * Theme toggle helpers
 */

export function toggleThemeColors(options = {}) {
    const {
        getCurrentThemeColors,
        flipLightness,
        applyCustomTheme,
        getComputedBackgroundImage,
        getCurrentThemeFonts,
        getCurrentLogoTextEffect
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
    const currentFonts = typeof getCurrentThemeFonts === 'function'
        ? (getCurrentThemeFonts() || null)
        : null;
    const currentLogoTextEffect = typeof getCurrentLogoTextEffect === 'function'
        ? (getCurrentLogoTextEffect() || null)
        : null;

    const invertedTheme = {
        id: 'temp_inverted',
        name: 'Inverted (Temporary)',
        colors: invertedColors,
        fonts: currentFonts || undefined,
        textEffects: currentLogoTextEffect
            ? { logo: currentLogoTextEffect }
            : undefined,
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

export function toggleThemeHue(options = {}) {
    const {
        getCurrentThemeColors,
        rotateHue,
        applyCustomTheme,
        getComputedBackgroundImage,
        getCurrentThemeFonts,
        getCurrentLogoTextEffect,
        degrees = 45
    } = options;

    const currentColors = getCurrentThemeColors();
    const shiftedColors = {};
    const shift = (hex) => rotateHue(hex, degrees);

    shiftedColors.bgPrimary = shift(currentColors.bgPrimary);
    shiftedColors.bgSecondary = shift(currentColors.bgSecondary);
    shiftedColors.bgTertiary = shift(currentColors.bgTertiary);
    shiftedColors.bgQuaternary = shift(currentColors.bgQuaternary);

    shiftedColors.textPrimary = shift(currentColors.textPrimary);
    shiftedColors.textSecondary = shift(currentColors.textSecondary);
    shiftedColors.textTertiary = shift(currentColors.textTertiary);

    shiftedColors.borderColor = shift(currentColors.borderColor);
    shiftedColors.accentColor = shift(currentColors.accentColor);
    shiftedColors.accentHover = shift(currentColors.accentHover);
    shiftedColors.brandColor = shift(currentColors.brandColor);

    shiftedColors.bgHeader = shift(currentColors.bgHeader);
    shiftedColors.bgSidebar = shift(currentColors.bgSidebar);
    shiftedColors.bgActionbar = shift(currentColors.bgActionbar);
    shiftedColors.glassSurface = shift(currentColors.glassSurface);
    shiftedColors.glassSurfaceStrong = shift(currentColors.glassSurfaceStrong);
    shiftedColors.glassBorder = shift(currentColors.glassBorder);
    shiftedColors.appGradientA = shift(currentColors.appGradientA);
    shiftedColors.appGradientB = shift(currentColors.appGradientB);
    shiftedColors.appGradientC = shift(currentColors.appGradientC);
    shiftedColors.appGradientAngle = currentColors.appGradientAngle || '160deg';

    shiftedColors.successColor = shift(currentColors.successColor);
    shiftedColors.dangerColor = shift(currentColors.dangerColor);
    shiftedColors.warningColor = shift(currentColors.warningColor);

    let currentBgImage = null;
    if (typeof getComputedBackgroundImage === 'function') {
        currentBgImage = getComputedBackgroundImage();
    }
    const currentFonts = typeof getCurrentThemeFonts === 'function'
        ? (getCurrentThemeFonts() || null)
        : null;
    const currentLogoTextEffect = typeof getCurrentLogoTextEffect === 'function'
        ? (getCurrentLogoTextEffect() || null)
        : null;

    const shiftedTheme = {
        id: 'temp_hue_rotated',
        name: 'Hue Rotated (Temporary)',
        colors: shiftedColors,
        fonts: currentFonts || undefined,
        textEffects: currentLogoTextEffect
            ? { logo: currentLogoTextEffect }
            : undefined,
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

    applyCustomTheme(shiftedTheme);

    return shiftedTheme;
}

export function toggleInvertFilter() {
    const root = document.documentElement;
    const currentFilter = String(root.style.filter || '').trim();
    const hasInvert = /\binvert\(1\)/.test(currentFilter);
    if (hasInvert) {
        const nextFilter = currentFilter
            .replace(/\binvert\(1\)/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        if (nextFilter) {
            root.style.filter = nextFilter;
        } else {
            root.style.removeProperty('filter');
        }
        root.removeAttribute('data-invert-filter-active');
        return;
    }

    root.style.filter = currentFilter ? `${currentFilter} invert(1)` : 'invert(1)';
    root.setAttribute('data-invert-filter-active', '1');
}

export function toggleHueRotateColors() {
    const root = document.documentElement;
    const currentFilter = String(root.style.filter || '').trim();
    const hasHueRotate = /\bhue-rotate\(180deg\)/.test(currentFilter);
    if (hasHueRotate) {
        const nextFilter = currentFilter
            .replace(/\bhue-rotate\(180deg\)/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        if (nextFilter) {
            root.style.filter = nextFilter;
        }
        else {
            root.style.removeProperty('filter');
        }
        root.removeAttribute('data-hue-rotate-active');
        return;
    }
    
    root.style.filter = currentFilter ? `${currentFilter} hue-rotate(180deg)` : 'hue-rotate(180deg)';
    root.setAttribute('data-hue-rotate-active', '1');
}

export function getBackgroundImageFromGrid() {
    const gameGrid = document.querySelector('main.game-grid');
    if (!gameGrid) return null;
    const bgStyle = getComputedStyle(gameGrid).backgroundImage;
    if (!bgStyle || bgStyle === 'none') return null;
    const match = bgStyle.match(/url\(['"]?(.*?)['"]?\)/);
    return match ? match[1] : null;
}
