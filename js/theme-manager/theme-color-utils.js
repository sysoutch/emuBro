/**
 * Theme color utilities
 */

import {
    parseColorToHex,
    hexToRgb,
    rgbToHsl,
    darkenHex
} from '../ui-utils';
import { shiftColorHsl, inferUiToneFromColor } from './theme-algorithms';
import { normalizeGradientAngle } from './editor-utils';

export function applyThemeToneAttribute(colors = {}) {
    const root = document.documentElement;
    const bgPrimary = parseColorToHex(colors.bgPrimary || '') || '';
    const tone = inferUiToneFromColor(bgPrimary, 'dark');
    root.setAttribute('data-theme', tone);
    return tone;
}

export function collectThemeColorsFromInputs() {
    const pick = (id, fallback = '') => parseColorToHex(document.getElementById(id)?.value) || fallback;
    const gradientAngleInput = document.getElementById('gradient-angle');
    const gradientAngle = normalizeGradientAngle(`${gradientAngleInput?.value || '160'}deg`);
    return {
        bgPrimary: pick('color-bg-primary', '#0b1220'),
        bgSecondary: pick('color-bg-secondary', '#121c2f'),
        bgTertiary: pick('color-bg-tertiary', '#1a263d'),
        bgQuaternary: pick('color-bg-quaternary', '#0f1828'),
        bgHeader: pick('color-bg-header', pick('color-bg-secondary', '#121c2f')),
        bgSidebar: pick('color-bg-sidebar', pick('color-bg-tertiary', '#1a263d')),
        bgActionbar: pick('color-bg-actionbar', pick('color-bg-quaternary', '#0f1828')),
        textPrimary: pick('color-text-primary', '#e7edf8'),
        textSecondary: pick('color-text-secondary', '#b9c7dc'),
        accentColor: pick('color-accent', '#66ccff'),
        borderColor: pick('color-border', '#2f4360'),
        successColor: pick('color-success', '#4caf50'),
        dangerColor: pick('color-danger', '#f44336'),
        textTertiary: pick('color-text-tertiary', ''),
        warningColor: pick('color-warning', ''),
        brandColor: pick('color-brand', ''),
        accentHover: pick('color-accent-hover', ''),
        glassSurface: pick('color-glass-surface', ''),
        glassSurfaceStrong: pick('color-glass-surface-strong', ''),
        glassBorder: pick('color-glass-border', ''),
        appGradientA: pick('color-app-gradient-a', '#0b1528'),
        appGradientB: pick('color-app-gradient-b', '#0f2236'),
        appGradientC: pick('color-app-gradient-c', '#1d2f4a'),
        appGradientAngle: gradientAngle
    };
}

export function applyThemeColorsToRoot(colors = {}) {
    const root = document.documentElement;
    const set = (cssVar, value) => {
        if (value === undefined || value === null || value === '') return;
        root.style.setProperty(cssVar, value);
    };

    set('--bg-primary', parseColorToHex(colors.bgPrimary) || colors.bgPrimary);
    set('--bg-secondary', parseColorToHex(colors.bgSecondary) || colors.bgSecondary);
    set('--bg-tertiary', parseColorToHex(colors.bgTertiary) || colors.bgTertiary);
    set('--bg-quaternary', parseColorToHex(colors.bgQuaternary) || colors.bgQuaternary);
    set('--bg-header', parseColorToHex(colors.bgHeader) || colors.bgHeader);
    set('--bg-sidebar', parseColorToHex(colors.bgSidebar) || colors.bgSidebar);
    set('--bg-actionbar', parseColorToHex(colors.bgActionbar) || colors.bgActionbar);
    set('--text-primary', parseColorToHex(colors.textPrimary) || colors.textPrimary);
    set('--text-secondary', parseColorToHex(colors.textSecondary) || colors.textSecondary);
    set('--border-color', parseColorToHex(colors.borderColor) || colors.borderColor);
    set('--accent-color', parseColorToHex(colors.accentColor) || colors.accentColor);
    set('--success-color', parseColorToHex(colors.successColor) || colors.successColor);
    set('--danger-color', parseColorToHex(colors.dangerColor) || colors.dangerColor);
    set('--logo-brand-color', parseColorToHex(colors.logoBrandColor) || parseColorToHex(colors.brandColor) || colors.brandColor);
    set('--app-gradient-a', parseColorToHex(colors.appGradientA) || colors.appGradientA);
    set('--app-gradient-b', parseColorToHex(colors.appGradientB) || colors.appGradientB);
    set('--app-gradient-c', parseColorToHex(colors.appGradientC) || colors.appGradientC);
    set('--app-gradient-angle', normalizeGradientAngle(colors.appGradientAngle || '160deg'));

    applyThemeToneAttribute(colors);
    applyDerivedThemeVariables(colors);
}

export function deriveThemeVisualVars(colors = {}) {
    const bgPrimary = parseColorToHex(colors.bgPrimary) || '#0b1220';
    const bgSecondary = parseColorToHex(colors.bgSecondary) || '#121c2f';
    const textSecondary = parseColorToHex(colors.textSecondary) || '#b9c7dc';
    const accentColor = parseColorToHex(colors.accentColor) || '#66ccff';
    const borderColor = parseColorToHex(colors.borderColor) || '#2f4360';
    const successColor = parseColorToHex(colors.successColor) || '#4caf50';
    const dangerColor = parseColorToHex(colors.dangerColor) || '#f44336';

    const bgRgb = hexToRgb(bgPrimary);
    const bgHsl = bgRgb ? rgbToHsl(bgRgb.r, bgRgb.g, bgRgb.b) : { l: 0.18 };
    const isLightUi = bgHsl.l >= 0.56;

    const textTertiary = parseColorToHex(colors.textTertiary)
        || shiftColorHsl(textSecondary, { satMul: 0.9, lightAdd: isLightUi ? -8 : -6, minLight: isLightUi ? 34 : 58, maxLight: isLightUi ? 62 : 82 });
    const warningColor = parseColorToHex(colors.warningColor)
        || shiftColorHsl(accentColor, { hueShift: 22, satMul: 1.08, lightAdd: isLightUi ? -2 : 8, minLight: 44, maxLight: 72 });
    const successDark = parseColorToHex(colors.successDark) || darkenHex(successColor, 16);
    const dangerDark = parseColorToHex(colors.dangerDark) || darkenHex(dangerColor, 16);
    const glassSurface = parseColorToHex(colors.glassSurface)
        || shiftColorHsl(bgSecondary, { satMul: isLightUi ? 0.65 : 0.9, lightAdd: isLightUi ? 8 : -2, minLight: isLightUi ? 88 : 10, maxLight: isLightUi ? 98 : 28 });
    const glassSurfaceStrong = parseColorToHex(colors.glassSurfaceStrong)
        || shiftColorHsl(bgSecondary, { satMul: isLightUi ? 0.68 : 0.95, lightAdd: isLightUi ? 4 : -6, minLight: isLightUi ? 84 : 8, maxLight: isLightUi ? 96 : 24 });
    const glassBorder = parseColorToHex(colors.glassBorder)
        || shiftColorHsl(borderColor, { satMul: 0.8, lightAdd: isLightUi ? 12 : 8, minLight: isLightUi ? 66 : 30, maxLight: isLightUi ? 90 : 58 });
    const brandColor = parseColorToHex(colors.brandColor) || darkenHex(accentColor, 30);
    const accentHover = parseColorToHex(colors.accentHover)
        || shiftColorHsl(accentColor, { satAdd: isLightUi ? 4 : 6, lightAdd: isLightUi ? -8 : -6 });

    const accentRgb = hexToRgb(accentColor) || { r: 102, g: 204, b: 255 };
    const dangerRgb = hexToRgb(dangerColor) || { r: 244, g: 67, b: 54 };
    const successRgb = hexToRgb(successColor) || { r: 76, g: 175, b: 80 };

    const prismCyan = shiftColorHsl(accentColor, { hueShift: -14, satMul: 1.05, lightAdd: isLightUi ? -2 : 6 });
    const prismBlue = shiftColorHsl(accentColor, { hueShift: 16, satMul: 1.02, lightAdd: isLightUi ? -8 : 0 });
    const prismMagenta = shiftColorHsl(accentColor, { hueShift: 96, satMul: 1.02, lightAdd: isLightUi ? -2 : 8 });
    const prismOrange = shiftColorHsl(accentColor, { hueShift: 144, satMul: 1.04, lightAdd: isLightUi ? -4 : 8 });
    const prismYellow = shiftColorHsl(accentColor, { hueShift: 174, satMul: 0.98, lightAdd: isLightUi ? -2 : 10 });
    const prismGreen = shiftColorHsl(accentColor, { hueShift: -62, satMul: 1.03, lightAdd: isLightUi ? -6 : 8 });
    const glassShadow = isLightUi ? 'rgba(25, 63, 92, 0.18)' : 'rgba(0, 8, 24, 0.46)';

    return {
        textTertiary,
        warningColor,
        successDark,
        dangerDark,
        glassSurface,
        glassSurfaceStrong,
        glassBorder,
        glassShadow,
        brandColor,
        accentLight: accentColor,
        accentHover,
        accentColorRgb: `${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}`,
        dangerColorRgb: `${dangerRgb.r}, ${dangerRgb.g}, ${dangerRgb.b}`,
        successColorRgb: `${successRgb.r}, ${successRgb.g}, ${successRgb.b}`,
        prismCyan,
        prismBlue,
        prismMagenta,
        prismOrange,
        prismYellow,
        prismGreen
    };
}

export function applyDerivedThemeVariables(colors = {}) {
    const root = document.documentElement;
    const derived = deriveThemeVisualVars(colors);
    root.style.setProperty('--text-tertiary', derived.textTertiary);
    root.style.setProperty('--warning-color', derived.warningColor);
    root.style.setProperty('--success-dark', derived.successDark);
    root.style.setProperty('--danger-dark', derived.dangerDark);
    root.style.setProperty('--glass-surface', derived.glassSurface);
    root.style.setProperty('--glass-surface-strong', derived.glassSurfaceStrong);
    root.style.setProperty('--glass-border', derived.glassBorder);
    root.style.setProperty('--glass-shadow', derived.glassShadow);
    root.style.setProperty('--brand-color', derived.brandColor);
    root.style.setProperty('--logo-brand-color', parseColorToHex(colors.logoBrandColor) || derived.brandColor);
    root.style.setProperty('--accent-light', derived.accentLight);
    root.style.setProperty('--accent-hover', derived.accentHover);
    root.style.setProperty('--accent-color-rgb', derived.accentColorRgb);
    root.style.setProperty('--danger-color-rgb', derived.dangerColorRgb);
    root.style.setProperty('--success-color-rgb', derived.successColorRgb);
    root.style.setProperty('--prism-cyan', derived.prismCyan);
    root.style.setProperty('--prism-blue', derived.prismBlue);
    root.style.setProperty('--prism-magenta', derived.prismMagenta);
    root.style.setProperty('--prism-orange', derived.prismOrange);
    root.style.setProperty('--prism-yellow', derived.prismYellow);
    root.style.setProperty('--prism-green', derived.prismGreen);
}

const THEME_INLINE_CSS_VARS = [
    '--bg-primary',
    '--bg-secondary',
    '--bg-tertiary',
    '--bg-quaternary',
    '--bg-header',
    '--bg-sidebar',
    '--bg-actionbar',
    '--text-primary',
    '--text-secondary',
    '--border-color',
    '--accent-color',
    '--success-color',
    '--danger-color',
    '--app-gradient-a',
    '--app-gradient-b',
    '--app-gradient-c',
    '--app-gradient-angle',
    '--text-tertiary',
    '--warning-color',
    '--success-dark',
    '--danger-dark',
    '--glass-surface',
    '--glass-surface-strong',
    '--glass-border',
    '--glass-shadow',
    '--brand-color',
    '--logo-brand-color',
    '--accent-light',
    '--accent-hover',
    '--accent-color-rgb',
    '--danger-color-rgb',
    '--success-color-rgb',
    '--prism-cyan',
    '--prism-blue',
    '--prism-magenta',
    '--prism-orange',
    '--prism-yellow',
    '--prism-green',
    '--logo-text-effect-speed',
    '--logo-text-effect-intensity',
    '--logo-text-effect-color-1',
    '--logo-text-effect-color-2',
    '--logo-text-effect-color-3',
    '--logo-text-effect-color-4',
    '--logo-text-effect-angle'
];

export function clearThemeInlineVariables(root) {
    THEME_INLINE_CSS_VARS.forEach((cssVar) => {
        root.style.removeProperty(cssVar);
    });
}

export function getCurrentThemeColorInputsSnapshot() {
    const keyToInputId = {
        bgPrimary: 'color-bg-primary',
        bgSecondary: 'color-bg-secondary',
        bgTertiary: 'color-bg-tertiary',
        bgQuaternary: 'color-bg-quaternary',
        textPrimary: 'color-text-primary',
        textSecondary: 'color-text-secondary',
        accentColor: 'color-accent',
        borderColor: 'color-border',
        bgHeader: 'color-bg-header',
        bgSidebar: 'color-bg-sidebar',
        bgActionbar: 'color-bg-actionbar',
        brandColor: 'color-brand',
        appGradientA: 'color-app-gradient-a',
        appGradientB: 'color-app-gradient-b',
        appGradientC: 'color-app-gradient-c',
        successColor: 'color-success',
        dangerColor: 'color-danger'
    };
    const snapshot = {};
    Object.entries(keyToInputId).forEach(([key, inputId]) => {
        const value = parseColorToHex(document.getElementById(inputId)?.value || '');
        if (value) snapshot[key] = value;
    });
    snapshot.appGradientAngle = normalizeGradientAngle(
        `${String(document.getElementById('gradient-angle')?.value || '160')}deg`
    );
    return snapshot;
}

export function getCurrentThemeColors() {
    const root = document.documentElement;
    const styles = getComputedStyle(root);

    const getVar = (name) => {
        const val = styles.getPropertyValue(name).trim();
        return parseColorToHex(val) || '#000000';
    };

    return {
        bgPrimary: getVar('--bg-primary'),
        textPrimary: getVar('--text-primary'),
        bgSecondary: getVar('--bg-secondary'),
        textSecondary: getVar('--text-secondary'),
        textTertiary: getVar('--text-tertiary'),
        accentColor: getVar('--accent-color'),
        accentHover: getVar('--accent-hover'),
        brandColor: getVar('--brand-color'),
        borderColor: getVar('--border-color'),
        bgTertiary: getVar('--bg-tertiary'),
        bgQuaternary: getVar('--bg-quaternary'),
        bgHeader: getVar('--bg-header'),
        bgSidebar: getVar('--bg-sidebar'),
        bgActionbar: getVar('--bg-actionbar'),
        appGradientA: getVar('--app-gradient-a'),
        appGradientB: getVar('--app-gradient-b'),
        appGradientC: getVar('--app-gradient-c'),
        appGradientAngle: normalizeGradientAngle(styles.getPropertyValue('--app-gradient-angle').trim() || '160deg'),
        successColor: getVar('--success-color'),
        dangerColor: getVar('--danger-color'),
        warningColor: getVar('--warning-color'),
        glassSurface: getVar('--glass-surface'),
        glassSurfaceStrong: getVar('--glass-surface-strong'),
        glassBorder: getVar('--glass-border')
    };
}
