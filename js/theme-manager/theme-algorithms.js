import {
    parseColorToHex,
    hexToRgb,
    rgbToHex,
    rgbToHsl,
    hslToRgb,
    darkenHex
} from '../ui-utils';
import {
    DEFAULT_BASIC_BRAND_MODE,
    DEFAULT_BASIC_BRAND_STRENGTH,
    DEFAULT_TEXT_EFFECT_MODE,
    DEFAULT_TEXT_EFFECT_SPEED,
    DEFAULT_TEXT_EFFECT_INTENSITY,
    DEFAULT_TEXT_EFFECT_CUSTOM_COLORS,
    DEFAULT_TEXT_EFFECT_ANGLE
} from './presets';

function clampNumber(value, min, max) {
    return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

export function normalizeThemeCustomizationMode(mode) {
    const value = String(mode || '').trim().toLowerCase();
    return value === 'extended' ? 'extended' : 'basic';
}

export function normalizeBasicVariant(variant) {
    const value = String(variant || '').trim().toLowerCase();
    if (value === 'dark' || value === 'light') return value;
    return 'auto';
}

export function inferBasicVariantFromTheme(theme) {
    const bg = parseColorToHex(theme?.colors?.bgPrimary || '') || '';
    const rgb = bg ? hexToRgb(bg) : null;
    if (!rgb) return 'auto';
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    return hsl.l >= 0.55 ? 'light' : 'dark';
}

export function normalizeBasicIntensity(value) {
    const parsed = Number.parseInt(String(value ?? '').trim(), 10);
    if (!Number.isFinite(parsed)) return 100;
    return clampNumber(parsed, 60, 140);
}

export function normalizeBasicBrandMode(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'accent' || normalized === 'darker' || normalized === 'lighter' || normalized === 'custom') return normalized;
    return DEFAULT_BASIC_BRAND_MODE;
}

export function normalizeBasicBrandStrength(value) {
    const parsed = Number.parseInt(String(value ?? '').trim(), 10);
    if (!Number.isFinite(parsed)) return DEFAULT_BASIC_BRAND_STRENGTH;
    return clampNumber(parsed, 0, 80);
}

export function normalizeBasicBrandUseAccent(value) {
    if (typeof value === 'boolean') return value;
    const normalized = String(value ?? '').trim().toLowerCase();
    if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') return false;
    if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') return true;
    return true;
}

export function resolveBasicBrandColor(accentColor, manualBrandColor, options = {}) {
    const accent = parseColorToHex(accentColor || '') || '#66ccff';
    const enabled = normalizeBasicBrandUseAccent(options.enabled);
    const fallbackText = parseColorToHex(options.textSecondary || '') || '#b9c7dc';
    if (!enabled) {
        return fallbackText;
    }

    const mode = normalizeBasicBrandMode(options.mode);
    const strength = normalizeBasicBrandStrength(options.strength);
    if (mode === 'custom') {
        return parseColorToHex(manualBrandColor || '') || accent;
    }
    if (mode === 'accent' || strength === 0) return accent;
    if (mode === 'darker') {
        return shiftColorHsl(accent, {
            lightAdd: -Math.round(strength * 0.72),
            satAdd: Math.round(strength * 0.12)
        });
    }
    return shiftColorHsl(accent, {
        lightAdd: Math.round(strength * 0.6),
        satAdd: -Math.round(strength * 0.08)
    });
}

export function resolveBrandEditorConfig(editor = {}) {
    const source = normalizeBasicBrandMode(
        editor?.basicBrandSource
        || (normalizeBasicBrandUseAccent(editor?.basicUseAccentForBrand ?? true)
            ? (editor?.basicBrandFromAccentMode || DEFAULT_BASIC_BRAND_MODE)
            : 'custom')
    );
    return {
        enabled: normalizeBasicBrandUseAccent(editor?.basicBrandEnabled ?? true),
        source,
        strength: normalizeBasicBrandStrength(editor?.basicBrandStrength ?? editor?.basicBrandFromAccentStrength ?? DEFAULT_BASIC_BRAND_STRENGTH),
        color: parseColorToHex(editor?.basicBrandColor || '') || ''
    };
}

export function normalizeToggleBoolean(value, fallback = false) {
    if (typeof value === 'boolean') return value;
    const normalized = String(value ?? '').trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') return true;
    if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') return false;
    return Boolean(fallback);
}

export function normalizeTextEffectMode(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'flowy-blood' || normalized === 'burning' || normalized === 'water' || normalized === 'slimey-green' || normalized === 'custom') return normalized;
    return DEFAULT_TEXT_EFFECT_MODE;
}

export function normalizeTextEffectColor(value, fallback) {
    return parseColorToHex(value || '') || parseColorToHex(fallback || '') || '#66d8ff';
}

export function normalizeTextEffectCustomColors(colors = {}, fallbacks = DEFAULT_TEXT_EFFECT_CUSTOM_COLORS) {
    return {
        color1: normalizeTextEffectColor(colors?.color1 || colors?.first || colors?.a || colors?.c1, fallbacks.color1),
        color2: normalizeTextEffectColor(colors?.color2 || colors?.second || colors?.b || colors?.c2, fallbacks.color2),
        color3: normalizeTextEffectColor(colors?.color3 || colors?.third || colors?.c || colors?.c3, fallbacks.color3),
        color4: normalizeTextEffectColor(colors?.color4 || colors?.fourth || colors?.d || colors?.c4, fallbacks.color4 || fallbacks.color3)
    };
}

export function normalizeTextEffectAngle(value) {
    const parsed = Number.parseInt(String(value ?? '').trim(), 10);
    if (!Number.isFinite(parsed)) return DEFAULT_TEXT_EFFECT_ANGLE;
    return clampNumber(parsed, 0, 360);
}

export function normalizeTextEffectSpeed(value) {
    const parsed = Number.parseInt(String(value ?? '').trim(), 10);
    if (!Number.isFinite(parsed)) return DEFAULT_TEXT_EFFECT_SPEED;
    return clampNumber(parsed, 2, 20);
}

export function normalizeTextEffectIntensity(value) {
    const parsed = Number.parseInt(String(value ?? '').trim(), 10);
    if (!Number.isFinite(parsed)) return DEFAULT_TEXT_EFFECT_INTENSITY;
    return clampNumber(parsed, 0, 100);
}

export function resolveThemeTextEffectConfig(themeOrConfig = null) {
    const source = themeOrConfig || {};
    const directLogo = source?.logo || null;
    const directTextEffectsLogo = source?.textEffects?.logo || null;
    const editorTextEffectsLogo = source?.editor?.textEffects?.logo || null;
    const editorTextEffect = source?.editor?.textEffect || null;
    const logo = directTextEffectsLogo || editorTextEffectsLogo || editorTextEffect || directLogo || source;

    const rawMode = logo?.mode ?? source?.editor?.textEffectMode ?? source?.textEffectMode ?? DEFAULT_TEXT_EFFECT_MODE;
    const normalizedMode = normalizeTextEffectMode(rawMode);
    const rawEnabled = logo?.enabled ?? source?.editor?.textEffectEnabled;
    const enabled = normalizeToggleBoolean(rawEnabled, normalizedMode !== DEFAULT_TEXT_EFFECT_MODE);
    const mode = enabled
        ? (normalizedMode === DEFAULT_TEXT_EFFECT_MODE ? 'flowy-blood' : normalizedMode)
        : DEFAULT_TEXT_EFFECT_MODE;

    const editorColorBag = {
        color1: source?.editor?.textEffectColor1 ?? source?.editor?.textEffectCustomColor1,
        color2: source?.editor?.textEffectColor2 ?? source?.editor?.textEffectCustomColor2,
        color3: source?.editor?.textEffectColor3 ?? source?.editor?.textEffectCustomColor3,
        color4: source?.editor?.textEffectColor4 ?? source?.editor?.textEffectCustomColor4
    };
    const rawCustomColors = logo?.customColors || logo?.colors || source?.editor?.textEffectCustomColors || editorColorBag;
    const customColors = normalizeTextEffectCustomColors(rawCustomColors, DEFAULT_TEXT_EFFECT_CUSTOM_COLORS);
    const useColor4 = normalizeToggleBoolean(
        logo?.useColor4 ?? source?.editor?.textEffectUseColor4,
        false
    );
    const applyToLogo = normalizeToggleBoolean(
        logo?.applyToLogo ?? source?.editor?.textEffectApplyToLogo,
        false
    );
    const angle = normalizeTextEffectAngle(
        logo?.angle ?? source?.editor?.textEffectAngle ?? DEFAULT_TEXT_EFFECT_ANGLE
    );

    return {
        enabled: mode !== DEFAULT_TEXT_EFFECT_MODE,
        mode,
        speed: normalizeTextEffectSpeed(logo?.speed ?? source?.editor?.textEffectSpeed ?? DEFAULT_TEXT_EFFECT_SPEED),
        intensity: normalizeTextEffectIntensity(logo?.intensity ?? source?.editor?.textEffectIntensity ?? DEFAULT_TEXT_EFFECT_INTENSITY),
        angle,
        useColor4,
        applyToLogo: mode !== DEFAULT_TEXT_EFFECT_MODE && applyToLogo,
        customColors
    };
}

export function shiftColorHsl(hexColor, options = {}) {
    const parsed = parseColorToHex(hexColor) || '#4f8cff';
    const rgb = hexToRgb(parsed);
    if (!rgb) return parsed;

    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const baseHue = hsl.h * 360;
    const baseSat = hsl.s * 100;
    const baseLight = hsl.l * 100;
    const hueShift = Number(options.hueShift || 0);
    const satMul = Number(options.satMul || 1);
    const satAdd = Number(options.satAdd || 0);
    const lightMul = Number(options.lightMul || 1);
    const lightAdd = Number(options.lightAdd || 0);

    let h = (baseHue + hueShift) % 360;
    if (h < 0) h += 360;
    let s = clampNumber((baseSat * satMul) + satAdd, 0, 100);
    let l = clampNumber((baseLight * lightMul) + lightAdd, 0, 100);

    if (Number.isFinite(options.minSat)) s = Math.max(Number(options.minSat), s);
    if (Number.isFinite(options.maxSat)) s = Math.min(Number(options.maxSat), s);
    if (Number.isFinite(options.minLight)) l = Math.max(Number(options.minLight), l);
    if (Number.isFinite(options.maxLight)) l = Math.min(Number(options.maxLight), l);

    return rgbToHex(...Object.values(hslToRgb(h / 360, s / 100, l / 100)));
}

export function inferUiToneFromColor(color, fallback = 'dark') {
    const parsed = parseColorToHex(color || '');
    if (!parsed) return fallback;
    const rgb = hexToRgb(parsed);
    if (!rgb) return fallback;
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    return hsl.l >= 0.56 ? 'light' : 'dark';
}

export function buildBasicPalette(baseColor, requestedVariant = 'auto', intensityValue = 100) {
    const base = parseColorToHex(baseColor) || '#5aa9ff';
    const rgb = hexToRgb(base);
    const hsl = rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : { h: 210 / 360, s: 0.75, l: 0.6 };
    const variant = normalizeBasicVariant(requestedVariant);
    const intensity = normalizeBasicIntensity(intensityValue) / 100;
    const useLightUi = (variant === 'light') || (variant === 'auto' && hsl.l >= 0.58);

    let palette;
    if (useLightUi) {
        palette = {
            bgPrimary: shiftColorHsl(base, { satMul: 0.16, lightAdd: 88, minLight: 94, maxLight: 99 }),
            bgSecondary: shiftColorHsl(base, { satMul: 0.2, lightAdd: 82, minLight: 90, maxLight: 96 }),
            bgTertiary: shiftColorHsl(base, { satMul: 0.22, lightAdd: 78, minLight: 86, maxLight: 94 }),
            bgQuaternary: shiftColorHsl(base, { satMul: 0.24, lightAdd: 74, minLight: 83, maxLight: 92 }),
            bgHeader: shiftColorHsl(base, { satMul: 0.18, lightAdd: 80, minLight: 88, maxLight: 95 }),
            bgSidebar: shiftColorHsl(base, { satMul: 0.2, lightAdd: 77, minLight: 85, maxLight: 93 }),
            bgActionbar: shiftColorHsl(base, { satMul: 0.22, lightAdd: 73, minLight: 82, maxLight: 91 }),
            textPrimary: '#1D2938',
            textSecondary: shiftColorHsl(base, { satMul: 0.12, lightAdd: 30, minLight: 44, maxLight: 56 }),
            accentColor: shiftColorHsl(base, { satMul: 1.1, satAdd: 4, lightAdd: -6, minLight: 40, maxLight: 58 }),
            borderColor: shiftColorHsl(base, { satMul: 0.24, lightAdd: 58, minLight: 70, maxLight: 84 }),
            appGradientA: shiftColorHsl(base, { satMul: 0.25, lightAdd: 84, minLight: 90, maxLight: 97 }),
            appGradientB: shiftColorHsl(base, { satMul: 0.35, lightAdd: 74, minLight: 82, maxLight: 92 }),
            appGradientC: shiftColorHsl(base, { satMul: 0.55, lightAdd: 58, minLight: 70, maxLight: 86 }),
            appGradientAngle: '145deg',
            successColor: '#2e9f5f',
            dangerColor: '#d45353'
        };
    } else {
        palette = {
            bgPrimary: shiftColorHsl(base, { satMul: 0.42, lightAdd: -58, minLight: 7, maxLight: 16 }),
            bgSecondary: shiftColorHsl(base, { satMul: 0.4, lightAdd: -50, minLight: 10, maxLight: 22 }),
            bgTertiary: shiftColorHsl(base, { satMul: 0.36, lightAdd: -44, minLight: 13, maxLight: 26 }),
            bgQuaternary: shiftColorHsl(base, { satMul: 0.34, lightAdd: -38, minLight: 16, maxLight: 30 }),
            bgHeader: shiftColorHsl(base, { satMul: 0.38, lightAdd: -48, minLight: 12, maxLight: 24 }),
            bgSidebar: shiftColorHsl(base, { satMul: 0.34, lightAdd: -42, minLight: 14, maxLight: 28 }),
            bgActionbar: shiftColorHsl(base, { satMul: 0.32, lightAdd: -36, minLight: 17, maxLight: 32 }),
            textPrimary: '#F2F7FF',
            textSecondary: shiftColorHsl(base, { satMul: 0.2, lightAdd: 34, minLight: 72, maxLight: 86 }),
            accentColor: shiftColorHsl(base, { satMul: 1.15, satAdd: 6, lightAdd: 12, minLight: 52, maxLight: 72 }),
            borderColor: shiftColorHsl(base, { satMul: 0.3, lightAdd: -22, minLight: 22, maxLight: 38 }),
            appGradientA: shiftColorHsl(base, { satMul: 0.65, lightAdd: -34, minLight: 16, maxLight: 28 }),
            appGradientB: shiftColorHsl(base, { satMul: 0.78, lightAdd: -24, minLight: 22, maxLight: 36 }),
            appGradientC: shiftColorHsl(base, { satMul: 0.95, lightAdd: -12, minLight: 30, maxLight: 48 }),
            appGradientAngle: '160deg',
            successColor: '#49c06e',
            dangerColor: '#ff6464'
        };
    }

    const delta = intensity - 1;
    const bgKeys = ['bgPrimary', 'bgSecondary', 'bgTertiary', 'bgQuaternary', 'bgHeader', 'bgSidebar', 'bgActionbar'];
    bgKeys.forEach((key) => {
        if (!palette[key]) return;
        palette[key] = shiftColorHsl(palette[key], {
            satAdd: delta * (useLightUi ? 10 : 14),
            lightAdd: delta * (useLightUi ? 4 : -4)
        });
    });
    palette.accentColor = shiftColorHsl(palette.accentColor, {
        satAdd: delta * 18,
        lightAdd: delta * 5
    });
    palette.borderColor = shiftColorHsl(palette.borderColor, {
        satAdd: delta * 8,
        lightAdd: delta * (useLightUi ? 4 : -3)
    });
    palette.textSecondary = shiftColorHsl(palette.textSecondary, {
        satAdd: delta * 5,
        lightAdd: delta * (useLightUi ? -3 : 3)
    });
    palette.appGradientA = shiftColorHsl(palette.appGradientA, { satAdd: delta * 10, lightAdd: delta * 5 });
    palette.appGradientB = shiftColorHsl(palette.appGradientB, { satAdd: delta * 12, lightAdd: delta * 4 });
    palette.appGradientC = shiftColorHsl(palette.appGradientC, { satAdd: delta * 15, lightAdd: delta * 3 });

    return palette;
}

export function resolveBasicVariantForEditor(baseColor, requestedVariant) {
    const normalizedRequested = normalizeBasicVariant(requestedVariant);
    if (normalizedRequested !== 'auto') return normalizedRequested;
    return inferUiToneFromColor(baseColor, 'dark');
}

export function resolveBasicVariantForRuntime(baseColor, requestedVariant) {
    const normalizedRequested = normalizeBasicVariant(requestedVariant);
    if (normalizedRequested === 'auto') {
        return inferUiToneFromColor(baseColor, 'dark');
    }
    return normalizedRequested;
}

export function isNearBlackHex(hexColor) {
    const parsed = parseColorToHex(hexColor);
    if (!parsed) return false;
    const rgb = hexToRgb(parsed);
    if (!rgb || !Number.isFinite(rgb.r) || !Number.isFinite(rgb.g) || !Number.isFinite(rgb.b)) return false;
    return rgb.r <= 8 && rgb.g <= 8 && rgb.b <= 8;
}

export function looksCorruptedBlackPalette(colors = {}) {
    const keys = [
        'bgPrimary',
        'bgSecondary',
        'bgTertiary',
        'bgHeader',
        'bgSidebar',
        'bgActionbar',
        'appGradientA',
        'appGradientB',
        'appGradientC'
    ];
    let blackCount = 0;
    keys.forEach((key) => {
        if (isNearBlackHex(colors[key])) blackCount += 1;
    });

    const accent = parseColorToHex(colors.accentColor);
    const accentIsDark = isNearBlackHex(accent);
    return blackCount >= 6 && !accentIsDark;
}

export function normalizePaletteToActiveTone(colors = {}, theme = null) {
    const activeTone = String(document.documentElement.getAttribute('data-theme') || '').toLowerCase();
    if (activeTone !== 'light' && activeTone !== 'dark') return colors;

    const bgCandidate = parseColorToHex(colors.bgPrimary) || parseColorToHex(colors.bgSecondary);
    const paletteTone = inferUiToneFromColor(bgCandidate || '#0b1220', 'dark');
    if (paletteTone === activeTone) return colors;

    const baseColor = parseColorToHex(theme?.editor?.basicBaseColor)
        || parseColorToHex(colors.accentColor)
        || '#5aa9ff';
    const intensity = normalizeBasicIntensity(theme?.editor?.basicIntensity ?? 100);
    const repaired = buildBasicPalette(baseColor, activeTone, intensity);
    if (normalizeThemeCustomizationMode(theme?.editor?.customizationMode) === 'basic') {
        const brandEditor = resolveBrandEditorConfig(theme?.editor || {});
        repaired.brandColor = resolveBasicBrandColor(repaired.accentColor, brandEditor.color || colors.brandColor || '', {
            enabled: brandEditor.enabled,
            mode: brandEditor.source,
            strength: brandEditor.strength,
            textSecondary: repaired.textSecondary
        });
    }
    return {
        ...colors,
        ...repaired
    };
}

export function repairBlackPaletteFromAccent(colors = {}, theme = null) {
    const baseColor = parseColorToHex(theme?.editor?.basicBaseColor)
        || parseColorToHex(colors.accentColor)
        || '#5aa9ff';
    const activeTone = String(document.documentElement.getAttribute('data-theme') || '').toLowerCase();
    const variant = activeTone === 'light' ? 'light' : 'dark';
    const intensity = normalizeBasicIntensity(theme?.editor?.basicIntensity ?? 100);
    const repaired = buildBasicPalette(baseColor, variant, intensity);
    if (normalizeThemeCustomizationMode(theme?.editor?.customizationMode) === 'basic') {
        const brandEditor = resolveBrandEditorConfig(theme?.editor || {});
        repaired.brandColor = resolveBasicBrandColor(repaired.accentColor, brandEditor.color || colors.brandColor || '', {
            enabled: brandEditor.enabled,
            mode: brandEditor.source,
            strength: brandEditor.strength,
            textSecondary: repaired.textSecondary
        });
    }
    return {
        ...colors,
        ...repaired
    };
}

export function resolveThemeColorsForRuntime(theme) {
    const colors = theme?.colors || {};
    const mode = normalizeThemeCustomizationMode(theme?.editor?.customizationMode);
    if (mode !== 'basic') {
        const repairedExtended = looksCorruptedBlackPalette(colors)
            ? repairBlackPaletteFromAccent(colors, theme)
            : colors;
        return normalizePaletteToActiveTone(repairedExtended, theme);
    }

    const baseColor = parseColorToHex(theme?.editor?.basicBaseColor)
        || parseColorToHex(colors.accentColor)
        || '#5aa9ff';
    const variant = resolveBasicVariantForRuntime(baseColor, theme?.editor?.basicVariant || 'auto');
    const intensity = normalizeBasicIntensity(theme?.editor?.basicIntensity ?? 100);
    const generated = buildBasicPalette(baseColor, variant, intensity);
    const brandEditor = resolveBrandEditorConfig(theme?.editor || {});
    generated.brandColor = resolveBasicBrandColor(generated.accentColor, brandEditor.color || colors.brandColor || '', {
        enabled: brandEditor.enabled,
        mode: brandEditor.source,
        strength: brandEditor.strength,
        textSecondary: generated.textSecondary
    });

    const basicColors = {
        ...colors,
        ...generated
    };
    const repairedBasic = looksCorruptedBlackPalette(basicColors)
        ? repairBlackPaletteFromAccent(basicColors, theme)
        : basicColors;
    return normalizePaletteToActiveTone(repairedBasic, theme);
}

export function buildPaletteMatchedLogoTextEffect(colors = {}, options = {}) {
    const accent = parseColorToHex(colors?.accentColor || '') || '#66ccff';
    const brand = parseColorToHex(colors?.brandColor || '') || darkenHex(accent, 24);
    const bgPrimary = parseColorToHex(colors?.bgPrimary || '') || '#0b1220';
    const tone = String(options.tone || inferUiToneFromColor(bgPrimary, 'dark')).toLowerCase() === 'light' ? 'light' : 'dark';
    const intensity = tone === 'light' ? 66 : 76;

    const color1 = shiftColorHsl(accent, { satMul: 0.9, lightAdd: tone === 'light' ? -10 : 14, minLight: 40, maxLight: 84 });
    const color2 = accent;
    const color3 = shiftColorHsl(brand, { satMul: 1.02, lightAdd: tone === 'light' ? -16 : -8, minLight: 22, maxLight: 58 });
    const color4 = shiftColorHsl(bgPrimary, { satMul: 0.88, lightAdd: tone === 'light' ? -24 : 12, minLight: 12, maxLight: 42 });

    return {
        enabled: true,
        mode: 'custom',
        speed: 7,
        intensity,
        angle: 140,
        useColor4: true,
        applyToLogo: true,
        customColors: {
            color1,
            color2,
            color3,
            color4
        }
    };
}
