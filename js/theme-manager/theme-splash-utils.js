/**
 * Theme splash screen sync
 */

import { parseColorToHex } from '../ui-utils';

function readThemeColorForSplash(styles, cssVar, fallback) {
    const parsed = parseColorToHex(styles.getPropertyValue(cssVar) || '');
    return parsed || fallback;
}

export function syncSplashThemePreference(themeId, options = {}) {
    const { emubro, DEFAULT_THEME_FONTS } = options;
    if (!emubro || typeof emubro.invoke !== 'function') return;

    const root = document.documentElement;
    const styles = getComputedStyle(root);
    const tone = String(root.getAttribute('data-theme') || '').toLowerCase() === 'light' ? 'light' : 'dark';
    const fallbackDark = {
        bgPrimary: '#0b1220',
        bgSecondary: '#121c2f',
        bgTertiary: '#1a263d',
        textPrimary: '#e7edf8',
        textSecondary: '#b9c7dc',
        accentColor: '#32b8de',
        accentLight: '#8fe6ff'
    };
    const fallbackLight = {
        bgPrimary: '#dfeaf6',
        bgSecondary: '#edf4fb',
        bgTertiary: '#d2e3f5',
        textPrimary: '#17263a',
        textSecondary: '#5d7694',
        accentColor: '#3db2d6',
        accentLight: '#87d8ef'
    };
    const fallback = tone === 'light' ? fallbackLight : fallbackDark;

    const payload = {
        id: String(themeId || 'dark'),
        tone,
        bgPrimary: readThemeColorForSplash(styles, '--bg-primary', fallback.bgPrimary),
        bgSecondary: readThemeColorForSplash(styles, '--bg-secondary', fallback.bgSecondary),
        bgTertiary: readThemeColorForSplash(styles, '--bg-tertiary', fallback.bgTertiary),
        textPrimary: readThemeColorForSplash(styles, '--text-primary', fallback.textPrimary),
        textSecondary: readThemeColorForSplash(styles, '--text-secondary', fallback.textSecondary),
        accentColor: readThemeColorForSplash(styles, '--accent-color', fallback.accentColor),
        accentLight: readThemeColorForSplash(styles, '--accent-light', fallback.accentLight),
        fontBody: String(styles.getPropertyValue('--font-body') || '').trim() || DEFAULT_THEME_FONTS.body,
        appGradientA: readThemeColorForSplash(styles, '--app-gradient-a', fallback.bgPrimary),
        appGradientB: readThemeColorForSplash(styles, '--app-gradient-b', fallback.bgSecondary),
        appGradientC: readThemeColorForSplash(styles, '--app-gradient-c', fallback.bgTertiary)
    };

    try {
        const result = emubro.invoke('settings:set-splash-theme', payload);
        if (result && typeof result.catch === 'function') {
            result.catch(() => {});
        }
    } catch (_e) {}
}
