/**
 * Theme Manager
 */

import { 
    parseColorToHex, 
    rgbToHex, 
    hexToRgb, 
    invertHex, 
    rgbToHsl, 
    hslToRgb, 
    flipLightness, 
    darkenHex 
} from './ui-utils';
import { requestDockLayoutRefresh } from './docking-manager';

const emubro = window.emubro;
const log = console;

let remoteCommunityThemes = null;
let currentTheme = 'dark';
let editingThemeId = null;
let hasUnsavedChanges = false;
let shouldUseAccentColorForBrand = true;
let fixedBackgroundTracking = null;
let backgroundLayerDrafts = [];
const THEME_EDITOR_MODE_STORAGE_KEY = 'themeEditorCustomizationMode';
const FONT_STACK_QUICKSAND = "'Quicksand', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
const FONT_STACK_MONTSERRAT = "'Montserrat', 'Quicksand', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
const FONT_STACK_LUCKIEST = "'Luckiest Guy', 'Montserrat', 'Quicksand', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
const FONT_STACK_GAMEBOY = "'Press Start 2P', 'VT323', 'Courier New', monospace";
const DEFAULT_THEME_FONTS = {
    body: FONT_STACK_QUICKSAND,
    heading: FONT_STACK_QUICKSAND,
    pixelMode: false
};
const ARCADE_THEME_FONTS = {
    body: FONT_STACK_MONTSERRAT,
    heading: FONT_STACK_LUCKIEST,
    pixelMode: false
};
const GAMEBOY_THEME_FONTS = {
    body: FONT_STACK_GAMEBOY,
    heading: FONT_STACK_GAMEBOY,
    pixelMode: true
};

const BACKGROUND_LAYER_POSITIONS = [
    { value: 'center center', label: 'Center' },
    { value: 'top center', label: 'Top' },
    { value: 'top right', label: 'Top Right' },
    { value: 'center right', label: 'Right' },
    { value: 'bottom right', label: 'Bottom Right' },
    { value: 'bottom center', label: 'Bottom' },
    { value: 'bottom left', label: 'Bottom Left' },
    { value: 'center left', label: 'Left' },
    { value: 'top left', label: 'Top Left' }
];

const BACKGROUND_LAYER_SIZE_OPTIONS = [
    { value: 'cover', label: 'Cover' },
    { value: 'contain', label: 'Contain' },
    { value: 'auto', label: 'Original' },
    { value: '100% 100%', label: 'Stretch' },
    { value: '100% auto', label: 'Top Banner' }
];

const BACKGROUND_LAYER_REPEAT_OPTIONS = [
    { value: 'no-repeat', label: 'No Repeat' },
    { value: 'repeat', label: 'Repeat' },
    { value: 'repeat-x', label: 'Repeat X' },
    { value: 'repeat-y', label: 'Repeat Y' }
];

const BACKGROUND_LAYER_BEHAVIOR_OPTIONS = [
    { value: 'scroll', label: 'Scroll With View' },
    { value: 'fixed', label: 'Fixed In Window' }
];

const BACKGROUND_LAYER_BLEND_OPTIONS = [
    { value: 'normal', label: 'Normal' },
    { value: 'screen', label: 'Screen' },
    { value: 'overlay', label: 'Overlay' },
    { value: 'multiply', label: 'Multiply' },
    { value: 'soft-light', label: 'Soft Light' },
    { value: 'lighten', label: 'Lighten' }
];

const BUILT_IN_PRESET_THEMES = [
    {
        id: 'spyro',
        name: 'Spyro',
        colors: {
            bgPrimary: '#130d26',
            bgSecondary: '#1d1336',
            bgTertiary: '#281a46',
            bgQuaternary: '#1a1132',
            textPrimary: '#f4e9ff',
            textSecondary: '#c6b1e6',
            accentColor: '#b56dff',
            borderColor: '#5a3a8f',
            bgHeader: '#1f1439',
            bgSidebar: '#281a46',
            bgActionbar: '#1a1132',
            appGradientA: '#1a1134',
            appGradientB: '#2a1b52',
            appGradientC: '#4f2d79',
            appGradientAngle: '155deg',
            successColor: '#5fca81',
            dangerColor: '#ff6d7d'
        },
        background: { image: null, position: 'centered', scale: 'crop', repeat: 'no-repeat', topImage: null },
        cardEffects: { glassEffect: true },
        fonts: ARCADE_THEME_FONTS
    },
    {
        id: 'red_bloody',
        name: 'Red Bloody',
        colors: {
            bgPrimary: '#150709',
            bgSecondary: '#220d12',
            bgTertiary: '#2d1217',
            bgQuaternary: '#1c0a0e',
            textPrimary: '#ffe8ea',
            textSecondary: '#dba6ac',
            accentColor: '#d62d3a',
            borderColor: '#6b2730',
            bgHeader: '#220d12',
            bgSidebar: '#2d1217',
            bgActionbar: '#1c0a0e',
            appGradientA: '#1a090d',
            appGradientB: '#3a0f17',
            appGradientC: '#5a111c',
            appGradientAngle: '160deg',
            successColor: '#6eca88',
            dangerColor: '#ff4f5f'
        },
        background: { image: null, position: 'centered', scale: 'crop', repeat: 'no-repeat', topImage: null },
        cardEffects: { glassEffect: true },
        fonts: DEFAULT_THEME_FONTS
    },
    {
        id: 'crash_bandicoot',
        name: 'Crash Bandicoot',
        colors: {
            bgPrimary: '#16110a',
            bgSecondary: '#24190e',
            bgTertiary: '#342211',
            bgQuaternary: '#1c140b',
            textPrimary: '#fff2df',
            textSecondary: '#e5c392',
            accentColor: '#ff8d2e',
            borderColor: '#7b4c1f',
            bgHeader: '#2a1c0f',
            bgSidebar: '#342211',
            bgActionbar: '#1c140b',
            appGradientA: '#1f140a',
            appGradientB: '#3a230f',
            appGradientC: '#6a3712',
            appGradientAngle: '150deg',
            successColor: '#73d191',
            dangerColor: '#ff6e54'
        },
        background: { image: null, position: 'centered', scale: 'crop', repeat: 'no-repeat', topImage: null },
        cardEffects: { glassEffect: true },
        fonts: ARCADE_THEME_FONTS
    },
    {
        id: 'mario',
        name: 'Mario',
        colors: {
            bgPrimary: '#140b10',
            bgSecondary: '#21111a',
            bgTertiary: '#2d1822',
            bgQuaternary: '#1b0f16',
            textPrimary: '#fff5ef',
            textSecondary: '#e6c4bc',
            accentColor: '#ff4040',
            borderColor: '#7f3441',
            bgHeader: '#22121b',
            bgSidebar: '#2d1822',
            bgActionbar: '#1b0f16',
            appGradientA: '#1a0d14',
            appGradientB: '#3a1d2b',
            appGradientC: '#174ea8',
            appGradientAngle: '150deg',
            successColor: '#73d98f',
            dangerColor: '#ff4e4e'
        },
        background: { image: null, position: 'centered', scale: 'crop', repeat: 'no-repeat', topImage: null },
        cardEffects: { glassEffect: true },
        fonts: ARCADE_THEME_FONTS
    },
    {
        id: 'gameboy',
        name: 'Gameboy',
        colors: {
            bgPrimary: '#0f1711',
            bgSecondary: '#162218',
            bgTertiary: '#1f2d1f',
            bgQuaternary: '#131e14',
            textPrimary: '#d8f2b8',
            textSecondary: '#9ebd7f',
            accentColor: '#7ec850',
            borderColor: '#486538',
            bgHeader: '#19261b',
            bgSidebar: '#1f2d1f',
            bgActionbar: '#131e14',
            appGradientA: '#10190f',
            appGradientB: '#1d2c1a',
            appGradientC: '#32472c',
            appGradientAngle: '158deg',
            successColor: '#8fe267',
            dangerColor: '#cf6f76'
        },
        background: { image: null, position: 'centered', scale: 'crop', repeat: 'no-repeat', topImage: null },
        cardEffects: { glassEffect: true },
        fonts: GAMEBOY_THEME_FONTS
    }
];

// Draggable state
let isDragging = false;
let startX, startY;
let modalInitialX, modalInitialY;

function cloneThemeDefinition(theme) {
    if (!theme) return null;
    try {
        return JSON.parse(JSON.stringify(theme));
    } catch (_e) {
        return null;
    }
}

function getBuiltInPresetTheme(themeId) {
    const normalizedId = String(themeId || '').trim().toLowerCase();
    const found = BUILT_IN_PRESET_THEMES.find((theme) => theme.id === normalizedId);
    return cloneThemeDefinition(found);
}

function getBuiltInPresetThemes() {
    return BUILT_IN_PRESET_THEMES.map((theme) => cloneThemeDefinition(theme)).filter(Boolean);
}

function resolveThemeFonts(fonts = null) {
    const resolved = {
        body: typeof fonts?.body === 'string' && fonts.body.trim().length > 0 ? fonts.body : DEFAULT_THEME_FONTS.body,
        heading: typeof fonts?.heading === 'string' && fonts.heading.trim().length > 0 ? fonts.heading : DEFAULT_THEME_FONTS.heading,
        pixelMode: Boolean(fonts?.pixelMode)
    };
    return resolved;
}

function applyThemeFonts(fonts = null) {
    const root = document.documentElement;
    const resolved = resolveThemeFonts(fonts);
    root.style.setProperty('--font-body', resolved.body);
    root.style.setProperty('--font-heading', resolved.heading);
    root.setAttribute('data-font-pixel', resolved.pixelMode ? 'true' : 'false');
}

function normalizeThemeCustomizationMode(mode) {
    const value = String(mode || '').trim().toLowerCase();
    return value === 'extended' ? 'extended' : 'basic';
}

function normalizeBasicVariant(variant) {
    const value = String(variant || '').trim().toLowerCase();
    if (value === 'dark' || value === 'light') return value;
    return 'auto';
}

function inferBasicVariantFromTheme(theme) {
    const bg = parseColorToHex(theme?.colors?.bgPrimary || '') || '';
    const rgb = bg ? hexToRgb(bg) : null;
    if (!rgb) return 'auto';
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    return hsl.l >= 0.55 ? 'light' : 'dark';
}

function normalizeBasicIntensity(value) {
    const parsed = Number.parseInt(String(value ?? '').trim(), 10);
    if (!Number.isFinite(parsed)) return 100;
    return clampNumber(parsed, 60, 140);
}

function inferUiToneFromColor(color, fallback = 'dark') {
    const parsed = parseColorToHex(color || '');
    const rgb = parsed ? hexToRgb(parsed) : null;
    if (!rgb) return fallback;
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    return hsl.l >= 0.56 ? 'light' : 'dark';
}

function applyThemeToneAttribute(colors = {}) {
    const root = document.documentElement;
    const bgPrimary = parseColorToHex(colors.bgPrimary || '') || '';
    const tone = inferUiToneFromColor(bgPrimary, 'dark');
    root.setAttribute('data-theme', tone);
    return tone;
}

function normalizeGradientAngle(value, fallback = '160deg') {
    const raw = String(value ?? '').trim();
    const defaultNum = Number.parseInt(String(fallback).replace(/deg$/i, ''), 10);
    const fallbackNum = Number.isFinite(defaultNum) ? defaultNum : 160;
    let num = Number.parseInt(raw.replace(/deg$/i, ''), 10);
    if (!Number.isFinite(num)) num = fallbackNum;
    num = Math.max(0, Math.min(360, num));
    return `${num}deg`;
}

function updateGradientAngleValueLabel(angleText) {
    const label = document.getElementById('gradient-angle-value');
    if (label) label.textContent = angleText;
}

function setGradientAngleInputFromValue(angleText) {
    const input = document.getElementById('gradient-angle');
    if (!input) return;
    const num = Number.parseInt(String(angleText).replace(/deg$/i, ''), 10);
    input.value = String(Number.isFinite(num) ? num : 160);
}

function applyGradientAnglePreview(angleText) {
    document.documentElement.style.setProperty('--app-gradient-angle', normalizeGradientAngle(angleText));
}

function updateBasicIntensityValueLabel(intensityValue) {
    const label = document.getElementById('theme-basic-intensity-value');
    if (!label) return;
    const normalized = normalizeBasicIntensity(intensityValue);
    label.textContent = `${normalized}%`;
}

function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function makeLayerId() {
    return `bg_layer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeBackgroundLayerPosition(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw || raw === 'centered' || raw === 'center') return 'center center';
    if (raw === 'fixed') return 'center center';
    if (raw === 'top') return 'top center';
    if (raw === 'bottom') return 'bottom center';
    if (raw === 'left') return 'center left';
    if (raw === 'right') return 'center right';
    if (raw === 'top-left') return 'top left';
    if (raw === 'top-right') return 'top right';
    if (raw === 'bottom-left') return 'bottom left';
    if (raw === 'bottom-right') return 'bottom right';
    const known = new Set(BACKGROUND_LAYER_POSITIONS.map((item) => item.value));
    if (known.has(raw)) return raw;
    return 'center center';
}

function normalizeBackgroundLayerSize(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return 'cover';
    if (raw === 'crop') return 'cover';
    if (raw === 'zoom') return 'contain';
    if (raw === 'stretch') return '100% 100%';
    if (raw === 'original') return 'auto';
    const known = new Set(BACKGROUND_LAYER_SIZE_OPTIONS.map((item) => item.value.toLowerCase()));
    if (known.has(raw)) {
        if (raw === '100% 100%') return '100% 100%';
        if (raw === '100% auto') return '100% auto';
        return raw;
    }
    return 'cover';
}

function normalizeBackgroundLayerRepeat(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (BACKGROUND_LAYER_REPEAT_OPTIONS.some((item) => item.value === raw)) return raw;
    return 'no-repeat';
}

function normalizeBackgroundLayerBehavior(value) {
    return String(value || '').trim().toLowerCase() === 'fixed' ? 'fixed' : 'scroll';
}

function normalizeBackgroundLayerBlendMode(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (BACKGROUND_LAYER_BLEND_OPTIONS.some((item) => item.value === raw)) return raw;
    return 'normal';
}

function normalizeBackgroundLayerOpacity(value) {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed)) return 1;
    return clampNumber(parsed, 0, 1);
}

function mapLegacyScaleToLayerSize(scale) {
    const value = String(scale || '').trim().toLowerCase();
    if (value === 'original') return 'auto';
    if (value === 'stretch') return '100% 100%';
    if (value === 'zoom') return 'contain';
    if (value === 'crop') return 'cover';
    return normalizeBackgroundLayerSize(value || 'cover');
}

function createBackgroundLayerDraft(overrides = {}) {
    const explicitBehavior = overrides.behavior || overrides.attachment;
    const fallbackBehavior = String(overrides.position || '').trim().toLowerCase() === 'fixed' ? 'fixed' : 'scroll';
    return {
        id: String(overrides.id || makeLayerId()),
        name: String(overrides.name || '').trim(),
        image: typeof overrides.image === 'string' && overrides.image.trim().length > 0 ? overrides.image : null,
        imageName: String(overrides.imageName || overrides.fileName || '').trim(),
        position: normalizeBackgroundLayerPosition(overrides.position || 'center center'),
        size: normalizeBackgroundLayerSize(overrides.size || overrides.scale || 'cover'),
        repeat: normalizeBackgroundLayerRepeat(overrides.repeat || 'no-repeat'),
        behavior: normalizeBackgroundLayerBehavior(explicitBehavior || fallbackBehavior),
        opacity: normalizeBackgroundLayerOpacity(overrides.opacity ?? 1),
        blendMode: normalizeBackgroundLayerBlendMode(overrides.blendMode || 'normal')
    };
}

function cloneBackgroundLayerDrafts(layers = []) {
    return (Array.isArray(layers) ? layers : [])
        .map((layer) => createBackgroundLayerDraft(layer))
        .filter((layer) => layer && layer.image);
}

function extractBackgroundLayers(bgConfig = {}) {
    const config = bgConfig || {};
    if (Array.isArray(config.layers) && config.layers.length > 0) {
        return cloneBackgroundLayerDrafts(config.layers);
    }

    const layers = [];
    if (config.image) {
        layers.push(createBackgroundLayerDraft({
            id: 'legacy_base',
            image: config.image,
            imageName: config.imageName || '',
            position: config.position || 'centered',
            size: mapLegacyScaleToLayerSize(config.scale || 'crop'),
            repeat: config.repeat || 'no-repeat',
            behavior: config.position === 'fixed' ? 'fixed' : 'scroll',
            opacity: 1,
            blendMode: 'normal'
        }));
    }

    const topImage = config.topImage || config.top?.image || null;
    if (topImage) {
        layers.push(createBackgroundLayerDraft({
            id: 'legacy_top',
            image: topImage,
            imageName: config.topImageName || '',
            position: config.topPosition || config.top?.position || 'top center',
            size: config.topScale || config.top?.scale || '100% auto',
            repeat: config.topRepeat || config.top?.repeat || 'no-repeat',
            behavior: config.topBehavior || config.top?.behavior || 'scroll',
            opacity: config.topOpacity ?? config.top?.opacity ?? 1,
            blendMode: config.topBlendMode || config.top?.blendMode || 'normal'
        }));
    }

    return layers;
}

function hasThemeBackgroundLayers(bgConfig = {}) {
    return extractBackgroundLayers(bgConfig).some((layer) => layer.image);
}

function setBackgroundLayerDrafts(layers = []) {
    backgroundLayerDrafts = cloneBackgroundLayerDrafts(layers);
}

function extractAdditionalLayerDrafts(bgConfig = {}, baseImage = null, topImage = null) {
    const allLayers = extractBackgroundLayers(bgConfig);
    if (allLayers.length === 0) return [];

    const extras = [...allLayers];
    const removeFirstByImage = (imageValue) => {
        if (!imageValue) return;
        const idx = extras.findIndex((layer) => layer.image === imageValue);
        if (idx >= 0) extras.splice(idx, 1);
    };

    removeFirstByImage(baseImage || null);
    removeFirstByImage(topImage || null);
    return extras;
}

function shiftColorHsl(hexColor, options = {}) {
    const parsed = parseColorToHex(hexColor) || '#4f8cff';
    const rgb = hexToRgb(parsed);
    if (!rgb) return parsed;

    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    // ui-utils uses normalized HSL (h/s/l in 0..1). Convert to degree/percent space
    // for palette math, then convert back before hslToRgb.
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

function getThemeEditorMode() {
    const form = document.getElementById('theme-form');
    const activeBtn = document.querySelector('.theme-mode-btn.active[data-theme-mode]');
    if (activeBtn && activeBtn.dataset.themeMode) {
        return normalizeThemeCustomizationMode(activeBtn.dataset.themeMode);
    }
    if (!form) return normalizeThemeCustomizationMode(localStorage.getItem(THEME_EDITOR_MODE_STORAGE_KEY));
    return normalizeThemeCustomizationMode(form.dataset.customizationMode || localStorage.getItem(THEME_EDITOR_MODE_STORAGE_KEY));
}

function setThemeEditorMode(mode, options = {}) {
    const normalizedMode = normalizeThemeCustomizationMode(mode);
    const form = document.getElementById('theme-form');
    if (form) form.dataset.customizationMode = normalizedMode;

    document.querySelectorAll('.theme-mode-btn[data-theme-mode]').forEach((button) => {
        const active = normalizeThemeCustomizationMode(button.dataset.themeMode) === normalizedMode;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    if (options.persist !== false) {
        localStorage.setItem(THEME_EDITOR_MODE_STORAGE_KEY, normalizedMode);
    }
    return normalizedMode;
}

function buildBasicPalette(baseColor, requestedVariant = 'auto', intensityValue = 100) {
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

function resolveBasicVariantForEditor(baseColor, requestedVariant) {
    const normalizedRequested = normalizeBasicVariant(requestedVariant);
    if (normalizedRequested !== 'auto') return normalizedRequested;

    // Auto mode should follow the base color intent.
    return inferUiToneFromColor(baseColor, 'dark');
}

function resolveBasicVariantForRuntime(baseColor, requestedVariant) {
    const normalizedRequested = normalizeBasicVariant(requestedVariant);
    if (normalizedRequested === 'auto') {
        return inferUiToneFromColor(baseColor, 'dark');
    }
    return normalizedRequested;
}

function resolveThemeColorsForRuntime(theme) {
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

    // Regenerate core palette for basic mode to avoid stale/broken saved colors.
    const basicColors = {
        ...colors,
        ...generated
    };
    const repairedBasic = looksCorruptedBlackPalette(basicColors)
        ? repairBlackPaletteFromAccent(basicColors, theme)
        : basicColors;
    return normalizePaletteToActiveTone(repairedBasic, theme);
}

function normalizePaletteToActiveTone(colors = {}, theme = null) {
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
    return {
        ...colors,
        ...repaired
    };
}

function isNearBlackHex(hexColor) {
    const parsed = parseColorToHex(hexColor);
    if (!parsed) return false;
    const rgb = hexToRgb(parsed);
    if (!rgb || !Number.isFinite(rgb.r) || !Number.isFinite(rgb.g) || !Number.isFinite(rgb.b)) return false;
    return rgb.r <= 8 && rgb.g <= 8 && rgb.b <= 8;
}

function looksCorruptedBlackPalette(colors = {}) {
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

function repairBlackPaletteFromAccent(colors = {}, theme = null) {
    const baseColor = parseColorToHex(theme?.editor?.basicBaseColor)
        || parseColorToHex(colors.accentColor)
        || '#5aa9ff';
    const activeTone = String(document.documentElement.getAttribute('data-theme') || '').toLowerCase();
    const variant = activeTone === 'light' ? 'light' : 'dark';
    const intensity = normalizeBasicIntensity(theme?.editor?.basicIntensity ?? 100);
    const repaired = buildBasicPalette(baseColor, variant, intensity);
    return {
        ...colors,
        ...repaired
    };
}

function collectThemeColorsFromInputs() {
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
        appGradientA: pick('color-app-gradient-a', '#0b1528'),
        appGradientB: pick('color-app-gradient-b', '#0f2236'),
        appGradientC: pick('color-app-gradient-c', '#1d2f4a'),
        appGradientAngle: gradientAngle
    };
}

function applyThemeColorsToRoot(colors = {}) {
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
    set('--app-gradient-a', parseColorToHex(colors.appGradientA) || colors.appGradientA);
    set('--app-gradient-b', parseColorToHex(colors.appGradientB) || colors.appGradientB);
    set('--app-gradient-c', parseColorToHex(colors.appGradientC) || colors.appGradientC);
    set('--app-gradient-angle', normalizeGradientAngle(colors.appGradientAngle || '160deg'));

    applyThemeToneAttribute(colors);
    applyDerivedThemeVariables(colors);
}

function applyDerivedThemeVariables(colors = {}) {
    const root = document.documentElement;
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

    root.style.setProperty('--text-tertiary', textTertiary);
    root.style.setProperty('--warning-color', warningColor);
    root.style.setProperty('--success-dark', successDark);
    root.style.setProperty('--danger-dark', dangerDark);
    root.style.setProperty('--glass-surface', glassSurface);
    root.style.setProperty('--glass-surface-strong', glassSurfaceStrong);
    root.style.setProperty('--glass-border', glassBorder);
    root.style.setProperty('--glass-shadow', glassShadow);
    root.style.setProperty('--brand-color', brandColor);
    root.style.setProperty('--accent-light', accentColor);
    root.style.setProperty('--accent-hover', accentHover);
    root.style.setProperty('--accent-color-rgb', `${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}`);
    root.style.setProperty('--danger-color-rgb', `${dangerRgb.r}, ${dangerRgb.g}, ${dangerRgb.b}`);
    root.style.setProperty('--success-color-rgb', `${successRgb.r}, ${successRgb.g}, ${successRgb.b}`);
    root.style.setProperty('--prism-cyan', prismCyan);
    root.style.setProperty('--prism-blue', prismBlue);
    root.style.setProperty('--prism-magenta', prismMagenta);
    root.style.setProperty('--prism-orange', prismOrange);
    root.style.setProperty('--prism-yellow', prismYellow);
    root.style.setProperty('--prism-green', prismGreen);
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
    '--prism-green'
];

function clearThemeInlineVariables(root) {
    THEME_INLINE_CSS_VARS.forEach((cssVar) => {
        root.style.removeProperty(cssVar);
    });
}

function applyColorInputsPreview() {
    applyThemeColorsToRoot(collectThemeColorsFromInputs());
}

function applyBasicPaletteToInputs(options = {}) {
    const baseColorInput = document.getElementById('theme-base-color');
    const variantSelect = document.getElementById('theme-basic-variant');
    const intensityInput = document.getElementById('theme-basic-intensity');
    if (!baseColorInput || !variantSelect || !intensityInput) return;

    const intensity = normalizeBasicIntensity(intensityInput.value);
    updateBasicIntensityValueLabel(intensity);
    const resolvedVariant = resolveBasicVariantForEditor(baseColorInput.value, variantSelect.value);
    const palette = buildBasicPalette(baseColorInput.value, resolvedVariant, intensity);
    const assignments = {
        'color-bg-primary': palette.bgPrimary,
        'color-bg-secondary': palette.bgSecondary,
        'color-bg-tertiary': palette.bgTertiary,
        'color-bg-quaternary': palette.bgQuaternary,
        'color-bg-header': palette.bgHeader,
        'color-bg-sidebar': palette.bgSidebar,
        'color-bg-actionbar': palette.bgActionbar,
        'color-text-primary': palette.textPrimary,
        'color-text-secondary': palette.textSecondary,
        'color-accent': palette.accentColor,
        'color-border': palette.borderColor,
        'color-success': palette.successColor,
        'color-danger': palette.dangerColor,
        'color-app-gradient-a': palette.appGradientA,
        'color-app-gradient-b': palette.appGradientB,
        'color-app-gradient-c': palette.appGradientC
    };

    Object.entries(assignments).forEach(([id, value]) => {
        const input = document.getElementById(id);
        if (input) input.value = parseColorToHex(value) || value;
    });

    const angleInput = document.getElementById('gradient-angle');
    if (angleInput) {
        const angleNum = Number.parseInt(String(palette.appGradientAngle).replace(/deg$/i, ''), 10);
        angleInput.value = String(Number.isFinite(angleNum) ? angleNum : 160);
        const normalizedAngle = normalizeGradientAngle(`${angleInput.value}deg`);
        updateGradientAngleValueLabel(normalizedAngle);
        applyGradientAnglePreview(normalizedAngle);
    }

    updateColorTexts();
    applyThemeColorsToRoot(palette);

    if (options.markUnsaved !== false) {
        hasUnsavedChanges = true;
    }
}

export function setupThemeCustomizationControls() {
    const form = document.getElementById('theme-form');
    if (!form) return;

    const modeButtons = Array.from(document.querySelectorAll('.theme-mode-btn[data-theme-mode]'));
    modeButtons.forEach((button) => {
        const clone = button.cloneNode(true);
        button.parentNode.replaceChild(clone, button);
        clone.addEventListener('click', () => {
            const nextMode = normalizeThemeCustomizationMode(clone.dataset.themeMode);
            setThemeEditorMode(nextMode);
            if (nextMode === 'basic') applyBasicPaletteToInputs();
        });
    });

    const variantInput = document.getElementById('theme-basic-variant');
    if (variantInput) {
        const clone = variantInput.cloneNode(true);
        variantInput.parentNode.replaceChild(clone, variantInput);
        clone.addEventListener('change', () => {
            if (getThemeEditorMode() === 'basic') applyBasicPaletteToInputs();
        });
    }

    const intensityInput = document.getElementById('theme-basic-intensity');
    if (intensityInput) {
        const clone = intensityInput.cloneNode(true);
        intensityInput.parentNode.replaceChild(clone, intensityInput);
        const onIntensityChange = () => {
            updateBasicIntensityValueLabel(clone.value);
            if (getThemeEditorMode() === 'basic') applyBasicPaletteToInputs();
        };
        clone.addEventListener('input', onIntensityChange);
        clone.addEventListener('change', onIntensityChange);
        updateBasicIntensityValueLabel(clone.value);
    }

    const savedMode = normalizeThemeCustomizationMode(localStorage.getItem(THEME_EDITOR_MODE_STORAGE_KEY));
    setThemeEditorMode(form.dataset.customizationMode || savedMode, { persist: false });
}

export function makeDraggable(modalId, headerId) {
    const modal = document.getElementById(modalId);
    const header = document.getElementById(headerId);
    
    if (!modal || !header) return;

    header.style.cursor = 'move';

    header.addEventListener('mousedown', (e) => {
        // If user clicked a button or input inside the header, don't drag
        if (e.target.closest('button, input, select, textarea')) return;

        // If it's a collapsed accordion panel, clicking it should expand it
        if (modal.classList.contains('accordion-collapsed')) {
            import('./docking-manager').then(m => m.activatePanel(modalId));
            return;
        }

        // If it's docked, we don't allow dragging/undocking by clicking/moving the header
        if (modal.classList.contains('docked-right')) {
            return;
        }

        isDragging = true;
        
        // Get the current position of the modal
        const rect = modal.getBoundingClientRect();
        
        // If modal has translate(-50%, -50%) and top/left 50%, we need to convert it to absolute pixels
        // to avoid jumping when we start setting left/top
        modal.style.transform = 'none';
        modal.style.top = rect.top + 'px';
        modal.style.left = rect.left + 'px';
        modal.style.margin = '0';
        
        startX = e.clientX;
        startY = e.clientY;
        modalInitialX = rect.left;
        modalInitialY = rect.top;

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        
        e.preventDefault();
    });

    function onMouseMove(e) {
        if (!isDragging) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        modal.style.left = (modalInitialX + dx) + 'px';
        modal.style.top = (modalInitialY + dy) + 'px';
    }

    function onMouseUp() {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
}

function resolveManagedModal(modalOrId) {
    if (!modalOrId) return null;
    if (typeof modalOrId === 'string') return document.getElementById(modalOrId);
    return modalOrId instanceof HTMLElement ? modalOrId : null;
}

export function resetManagedModalPosition(modalOrId, options = {}) {
    const modal = resolveManagedModal(modalOrId);
    if (!modal) return false;

    const smooth = options.smooth !== false;
    if (smooth) modal.classList.add('smooth-reset');

    modal.style.top = '';
    modal.style.left = '';
    modal.style.transform = '';
    modal.classList.remove('moved');

    if (smooth) {
        const duration = Number.isFinite(Number(options.smoothDurationMs))
            ? Math.max(0, Number(options.smoothDurationMs))
            : 800;
        window.setTimeout(() => {
            modal.classList.remove('smooth-reset');
        }, duration);
    }

    return true;
}

export function recenterManagedModalIfMostlyOutOfView(modalOrId, options = {}) {
    const modal = resolveManagedModal(modalOrId);
    if (!modal) return false;
    if (modal.classList.contains('docked-right')) return false;
    if (!options.allowInactive && !modal.classList.contains('active')) return false;

    const rect = modal.getBoundingClientRect();
    if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height) || rect.width <= 0 || rect.height <= 0) {
        return false;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const visibleLeft = Math.max(0, rect.left);
    const visibleRight = Math.min(viewportWidth, rect.right);
    const visibleTop = Math.max(0, rect.top);
    const visibleBottom = Math.min(viewportHeight, rect.bottom);
    const visibleWidth = Math.max(0, visibleRight - visibleLeft);
    const visibleHeight = Math.max(0, visibleBottom - visibleTop);
    const visibleArea = visibleWidth * visibleHeight;
    const totalArea = rect.width * rect.height;
    if (totalArea <= 0) return false;

    const threshold = Number.isFinite(Number(options.visibleThreshold))
        ? clampNumber(Number(options.visibleThreshold), 0, 1)
        : 0.5;

    if (visibleArea >= totalArea * threshold) return false;

    return resetManagedModalPosition(modal, {
        smooth: options.smooth !== false,
        smoothDurationMs: options.smoothDurationMs
    });
}

export async function fetchCommunityThemes(forceRefresh = false) {
    if (remoteCommunityThemes && !forceRefresh) return remoteCommunityThemes;

    try {
        const repoOwner = 'sysoutch';
        const repoName = 'emuBro-themes';
        const themesPath = 'community-themes';
        
        // 1. Get the list of files in the folder
        const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${themesPath}`);
        if (!response.ok) throw new Error('Failed to fetch themes list');
        
        const contents = await response.json();
        
        // 2. Filter for files that end in .json (dynamic names like theme_user.json)
        const themeFiles = contents.filter(item => 
            item.type === 'file' && 
            item.name.endsWith('.json')
        );
        
        const fetchedThemes = [];

        // 3. Fetch each JSON file dynamically
        for (const file of themeFiles) {
            try {
                // Using the download_url provided by the API is safer than manual string building
                const themeRes = await fetch(file.download_url);
                
                if (themeRes.ok) {
                    const theme = await themeRes.json();
                    
                    // 4. Image Logic
                    // Since images are no longer in the repo, we assume the JSON 
                    // contains a full URL. If it's a relative path, it will likely break.
                    if (theme.background?.image) {
                        const img = theme.background.image;
                        // Optional: Validation check to ensure it's a valid remote URL
                        if (!img.startsWith('http') && !img.startsWith('data:')) {
                            console.warn(`Theme ${file.name} has a relative image path which may no longer exist.`);
                        }
                    }
                    
                    fetchedThemes.push(theme);
                }
            } catch (err) {
                log.error(`Failed to fetch theme file ${file.name}:`, err);
            }
        }

        remoteCommunityThemes = fetchedThemes;
        return fetchedThemes;
    } catch (error) {
        log.error('Error fetching community themes:', error);
        return [];
    }
}

export function applyGlassEffect(enable) {
    if (enable) {
        document.documentElement.setAttribute('data-glass-effect', 'enabled');
    } else {
        document.documentElement.removeAttribute('data-glass-effect');
    }
    log.info(`Glass effect: ${enable ? 'ON' : 'OFF'}`);
}

export function applyCornerStyle(style) {
    const root = document.documentElement;
    if (style === 'sharp') {
        root.style.setProperty('--radius-btn', '0px');
        root.style.setProperty('--radius-btn-top-left', '0px');
        root.style.setProperty('--radius-btn-top-right', '0px');
        root.style.setProperty('--radius-btn-bottom-left', '0px');
        root.style.setProperty('--radius-btn-bottom-right', '0px');

        root.style.setProperty('--radius-input', '0px');
        root.style.setProperty('--radius-input-top-left', '0px');
        root.style.setProperty('--radius-input-top-right', '0px');
        root.style.setProperty('--radius-input-bottom-left', '0px');
        root.style.setProperty('--radius-input-bottom-right', '0px');

        root.style.setProperty('--radius-card', '0px');
        root.style.setProperty('--radius-sm', '0px');
    } else if (style === 'semi-rounded') {
        root.style.setProperty('--radius-btn', '4px');
        root.style.setProperty('--radius-btn-top-left', '4px');
        root.style.setProperty('--radius-btn-top-right', '4px');
        root.style.setProperty('--radius-btn-bottom-left', '4px');
        root.style.setProperty('--radius-btn-bottom-right', '4px');
        
        root.style.setProperty('--radius-input', '4px');
        root.style.setProperty('--radius-input-top-left', '4px');
        root.style.setProperty('--radius-input-top-right', '4px');
        root.style.setProperty('--radius-input-bottom-left', '4px');
        root.style.setProperty('--radius-input-bottom-right', '4px');

        root.style.setProperty('--radius-card', '4px');
        root.style.setProperty('--radius-sm', '2px');
    } else if (style === 'futuristic') {
        root.style.setProperty('--radius-btn', '20px');
        root.style.setProperty('--radius-btn-top-left', '20px');
        root.style.setProperty('--radius-btn-top-right', '0px');
        root.style.setProperty('--radius-btn-bottom-left', '0px');
        root.style.setProperty('--radius-btn-bottom-right', '20px');
        
        root.style.setProperty('--radius-input', '20px');
        root.style.setProperty('--radius-input-top-left', '20px');
        root.style.setProperty('--radius-input-top-right', '0px');
        root.style.setProperty('--radius-input-bottom-left', '0px');
        root.style.setProperty('--radius-input-bottom-right', '20px');

        root.style.setProperty('--radius-card', '12px');
        root.style.setProperty('--radius-sm', '4px');
    } else {
        root.style.setProperty('--radius-btn', '20px');
        root.style.setProperty('--radius-btn-top-left', '20px');
        root.style.setProperty('--radius-btn-top-right', '20px');
        root.style.setProperty('--radius-btn-bottom-left', '20px');
        root.style.setProperty('--radius-btn-bottom-right', '20px');
        
        root.style.setProperty('--radius-input', '20px');
        root.style.setProperty('--radius-input-top-left', '20px');
        root.style.setProperty('--radius-input-top-right', '20px');
        root.style.setProperty('--radius-input-bottom-left', '20px');
        root.style.setProperty('--radius-input-bottom-right', '20px');

        root.style.setProperty('--radius-card', '12px');
        root.style.setProperty('--radius-sm', '4px');
    }
}

export function disableFixedBackgroundTracking() {
    if (fixedBackgroundTracking && fixedBackgroundTracking.gameGrid) {
        fixedBackgroundTracking.gameGrid.style.backgroundAttachment = 'scroll';
    }
    fixedBackgroundTracking = null;
}

export function enableFixedBackgroundTracking(gameGrid) {
    disableFixedBackgroundTracking();
    gameGrid.style.backgroundAttachment = 'fixed';
    gameGrid.style.backgroundPosition = 'center';
    fixedBackgroundTracking = { gameGrid: gameGrid };
}

function clearTopBackgroundLayer(gameGrid = null) {
    const grid = gameGrid || document.querySelector('main.game-grid');
    if (!grid) return;
    grid.style.setProperty('--theme-top-bg-image', 'none');
    grid.style.setProperty('--theme-top-bg-size', '100% auto');
    grid.style.setProperty('--theme-top-bg-repeat', 'no-repeat');
    grid.style.setProperty('--theme-top-bg-position', 'top center');
    grid.style.setProperty('--theme-top-bg-height', '0px');
    grid.style.setProperty('--theme-top-bg-opacity', '0');
}

function applyTopBackgroundLayer(gameGrid, bgConfig = {}) {
    if (!gameGrid) return;
    const topImage = bgConfig.topImage || bgConfig.top?.image || null;
    if (!topImage) {
        clearTopBackgroundLayer(gameGrid);
        return;
    }

    const safeTopImage = String(topImage).replace(/'/g, "\\'");
    const topHeight = clampNumber(Number.parseInt(bgConfig.topHeight ?? bgConfig.top?.height ?? 220, 10), 60, 640);
    const topOpacity = clampNumber(Number.parseFloat(bgConfig.topOpacity ?? bgConfig.top?.opacity ?? 1), 0, 1);
    const topSize = String(bgConfig.topScale ?? bgConfig.top?.scale ?? '100% auto').trim() || '100% auto';
    const topRepeat = String(bgConfig.topRepeat ?? bgConfig.top?.repeat ?? 'no-repeat').trim() || 'no-repeat';
    const topPosition = String(bgConfig.topPosition ?? bgConfig.top?.position ?? 'top center').trim() || 'top center';

    gameGrid.style.setProperty('--theme-top-bg-image', `url('${safeTopImage}')`);
    gameGrid.style.setProperty('--theme-top-bg-size', topSize);
    gameGrid.style.setProperty('--theme-top-bg-repeat', topRepeat);
    gameGrid.style.setProperty('--theme-top-bg-position', topPosition);
    gameGrid.style.setProperty('--theme-top-bg-height', `${topHeight}px`);
    gameGrid.style.setProperty('--theme-top-bg-opacity', String(topOpacity));
}

function clearGameGridBackgroundLayers(gameGrid = null) {
    const grid = gameGrid || document.querySelector('main.game-grid');
    if (!grid) return;
    grid.style.backgroundImage = 'none';
    grid.style.backgroundRepeat = 'no-repeat';
    grid.style.backgroundSize = 'cover';
    grid.style.backgroundPosition = 'center';
    grid.style.backgroundAttachment = 'scroll';
    clearTopBackgroundLayer(grid);
    const host = grid.querySelector('.theme-bg-layer-host');
    if (host) host.innerHTML = '';
}

function ensureThemeBackgroundLayerHost(gameGrid) {
    if (!gameGrid) return null;
    let host = gameGrid.querySelector('.theme-bg-layer-host');
    if (!host) {
        host = document.createElement('div');
        host.className = 'theme-bg-layer-host';
        gameGrid.insertBefore(host, gameGrid.firstChild);
    }
    return host;
}

function resolveLayerSizeCss(sizeValue) {
    const size = normalizeBackgroundLayerSize(sizeValue);
    return size;
}

export function applyBackgroundImage(bgConfig) {
    const gameGrid = document.querySelector('main.game-grid');
    if (!gameGrid) return;
    
    const config = bgConfig || {};
    const layers = extractBackgroundLayers(config);

    disableFixedBackgroundTracking();
    gameGrid.style.backgroundImage = 'none';
    gameGrid.style.backgroundRepeat = 'no-repeat';
    gameGrid.style.backgroundAttachment = 'scroll';
    gameGrid.style.backgroundSize = 'cover';
    gameGrid.style.backgroundPosition = 'center';
    clearTopBackgroundLayer(gameGrid);

    const host = ensureThemeBackgroundLayerHost(gameGrid);
    if (!host) return;
    host.innerHTML = '';

    if (layers.length === 0) {
        return;
    }

    layers.forEach((rawLayer, index) => {
        const layer = createBackgroundLayerDraft(rawLayer);
        if (!layer.image) return;
        const layerEl = document.createElement('div');
        layerEl.className = 'theme-bg-layer';
        layerEl.style.zIndex = String(index);
        layerEl.style.backgroundImage = `url('${String(layer.image).replace(/'/g, "\\'")}')`;
        layerEl.style.backgroundPosition = layer.position;
        layerEl.style.backgroundSize = resolveLayerSizeCss(layer.size);
        layerEl.style.backgroundRepeat = layer.repeat;
        layerEl.style.backgroundAttachment = layer.behavior === 'fixed' ? 'fixed' : 'scroll';
        layerEl.style.mixBlendMode = layer.blendMode;
        layerEl.style.opacity = String(layer.opacity);
        host.appendChild(layerEl);
    });
}

export function applyCustomTheme(theme) {
    const root = document.documentElement;
    const runtimeColors = resolveThemeColorsForRuntime(theme);
    const tertiary = runtimeColors.bgTertiary || runtimeColors.bgSecondary;
    applyThemeColorsToRoot({
        ...runtimeColors,
        bgTertiary: tertiary,
        bgQuaternary: runtimeColors.bgQuaternary || tertiary,
        appGradientA: runtimeColors.appGradientA || runtimeColors.bgPrimary || '#0b1528',
        appGradientB: runtimeColors.appGradientB || runtimeColors.bgSecondary || '#0f2236',
        appGradientC: runtimeColors.appGradientC || tertiary || '#1d2f4a',
        appGradientAngle: normalizeGradientAngle(runtimeColors.appGradientAngle || '160deg')
    });
    if (shouldUseAccentColorForBrand && runtimeColors?.accentColor) {
        root.style.setProperty('--brand-color', darkenHex(runtimeColors.accentColor, 30));
    }
    applyThemeFonts(theme?.fonts || null);
    
    // Check for global background override
    const overrideBg = localStorage.getItem('globalOverrideBackground') === 'true';
    if (!overrideBg && theme.background && hasThemeBackgroundLayers(theme.background)) {
        applyBackgroundImage(theme.background);
    } else {
        disableFixedBackgroundTracking();
        clearGameGridBackgroundLayers();
    }
    
    const enableGlass = !theme.cardEffects || theme.cardEffects.glassEffect !== false;
    applyGlassEffect(enableGlass);

    // Apply global corner style instead of theme-specific one
    const globalStyle = localStorage.getItem('globalCornerStyle') || 'rounded';
    applyCornerStyle(globalStyle);
}

export function getCustomThemes() {
    const themes = localStorage.getItem('customThemes');
    return themes ? JSON.parse(themes) : [];
}

export function saveCustomTheme(theme) {
    const customThemes = getCustomThemes();
    const index = customThemes.findIndex(t => t.id === theme.id);
    
    if (index >= 0) {
        customThemes[index] = theme;
    } else {
        customThemes.push(theme);
    }
    
    localStorage.setItem('customThemes', JSON.stringify(customThemes));
    updateThemeSelector();
    renderThemeManager();
}

export function setTheme(theme) {
    currentTheme = theme;
    const root = document.documentElement;
    const themeManagerModal = document.getElementById('theme-manager-modal');

    clearThemeInlineVariables(root);
    disableFixedBackgroundTracking();
    applyThemeFonts(DEFAULT_THEME_FONTS);

    if (theme === 'dark' || theme === 'light') {
        root.setAttribute('data-theme', theme);
        clearGameGridBackgroundLayers();
    } else {
        const builtInTheme = getBuiltInPresetTheme(theme);
        if (builtInTheme) {
            applyCustomTheme(builtInTheme);
        } else {
            const customThemes = getCustomThemes();
            const customTheme = customThemes.find(t => t.id === theme);
            if (customTheme) {
                applyCustomTheme(customTheme);
            } else {
                root.setAttribute('data-theme', 'dark');
                clearGameGridBackgroundLayers();
            }
        }
    }
    
    if (themeManagerModal && themeManagerModal.classList.contains('active')) {
        renderThemeManager();
    }

    requestDockLayoutRefresh();
    window.setTimeout(() => requestDockLayoutRefresh(), 32);
    window.setTimeout(() => requestDockLayoutRefresh(), 180);

    syncSplashThemePreference(theme);
}

function readThemeColorForSplash(styles, cssVar, fallback) {
    const parsed = parseColorToHex(styles.getPropertyValue(cssVar) || '');
    return parsed || fallback;
}

function syncSplashThemePreference(themeId) {
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

export function openThemeManager() {
    const modal = document.getElementById('theme-manager-modal');
    if (!modal) return;
    
    renderThemeManager();
    
    if (modal.classList.contains('docked-right')) {
        // Use toggleDock to "re-dock" and trigger all logic
        import('./docking-manager').then(m => m.toggleDock('theme-manager-modal', 'pin-theme-manager', true));
    } else {
        modal.classList.add('active');
        modal.style.display = 'flex';
        
        if (modal.style.top || modal.style.left) {
            modal.classList.add('moved');
        } else {
            modal.classList.remove('moved');
        }
    }
    
    makeDraggable('theme-manager-modal', 'theme-manager-header');
}

export function updateThemeSelector() {
    const themeSelect = document.getElementById('theme-select');
    if (!themeSelect) return;

    const safeThemeLabel = (key, fallback) => {
        const translated = i18n.t(key);
        if (!translated || translated === key) return fallback;
        return translated;
    };

    const customThemes = getCustomThemes();
    const builtInPresets = getBuiltInPresetThemes();
    const options = [
        { value: 'dark', label: safeThemeLabel('theme.darkTheme', 'Dark Theme') },
        { value: 'light', label: safeThemeLabel('theme.lightTheme', 'Light Theme') },
        ...builtInPresets.map((theme) => ({ value: theme.id, label: theme.name })),
        ...customThemes.map(t => ({ value: t.id, label: t.name }))
    ];
    
    const currentValue = themeSelect.value;
    themeSelect.innerHTML = '';
    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        themeSelect.appendChild(option);
    });
    themeSelect.value = currentValue;
    if (themeSelect.value !== currentValue) {
        themeSelect.value = currentTheme || 'dark';
    }
}

function getThemeDisplayName(themeId) {
    const normalizedId = String(themeId || '').toLowerCase();
    if (normalizedId === 'dark') {
        const label = i18n.t('theme.darkTheme');
        return (!label || label === 'theme.darkTheme') ? 'Dark Theme' : label;
    }
    if (normalizedId === 'light') {
        const label = i18n.t('theme.lightTheme');
        return (!label || label === 'theme.lightTheme') ? 'Light Theme' : label;
    }
    const builtIn = getBuiltInPresetTheme(normalizedId);
    if (builtIn?.name) return builtIn.name;
    return String(themeId || '');
}

export function deleteCustomTheme(id) {
    const customThemes = getCustomThemes();
    const theme = customThemes.find(t => t.id === id);
    const themeName = theme ? theme.name : 'this theme';

    const confirmDelete = confirm(i18n.t('messages.confirmDeleteTheme', { name: themeName }) || `Are you sure you want to delete "${themeName}"?`);
    if (!confirmDelete) return;

    const filtered = customThemes.filter(t => t.id !== id);
    localStorage.setItem('customThemes', JSON.stringify(filtered));
    
    if (currentTheme === id) {
        setTheme('dark');
        localStorage.setItem('theme', 'dark');
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) themeSelect.value = 'dark';
    }

    updateThemeSelector();
    renderThemeManager();
}

export function renderThemeManager() {
    const presetContainer = document.getElementById('preset-themes');
    const customContainer = document.getElementById('custom-themes');
    const customThemes = getCustomThemes();
    
    if (!presetContainer || !customContainer) return;

    // Render preset themes
    presetContainer.innerHTML = '';
    const presetEntries = [
        {
            id: 'dark',
            name: getThemeDisplayName('dark'),
            data: {
                colors: {
                    appGradientA: '#0b1528',
                    appGradientB: '#0f2236',
                    accentColor: '#66ccff'
                }
            }
        },
        {
            id: 'light',
            name: getThemeDisplayName('light'),
            data: {
                colors: {
                    appGradientA: '#dbe9f7',
                    appGradientB: '#e7f3ff',
                    accentColor: '#3db2d6'
                }
            }
        },
        ...getBuiltInPresetThemes().map((theme) => ({
            id: theme.id,
            name: theme.name,
            data: theme
        }))
    ];

    presetEntries.forEach((preset) => {
        const isActive = currentTheme === preset.id;
        const item = createThemeItem(
            preset.id,
            preset.name,
            'preset',
            isActive,
            preset.data
        );
        presetContainer.appendChild(item);
    });
    
    // Render custom themes
    customContainer.innerHTML = '';
    customThemes.forEach(theme => {
        const isActive = currentTheme === theme.id;
        const item = createThemeItem(
            theme.id,
            theme.name,
            'custom',
            isActive,
            theme
        );
        customContainer.appendChild(item);
    });
}

function createThemeItem(id, name, type, isActive, themeData) {
    const item = document.createElement('div');
    item.className = `theme-item ${isActive ? 'active' : ''}`;
    
    const preview = document.createElement('div');
    preview.className = 'theme-preview';
    
    let dots = [];
    if (type === 'preset') {
        if (themeData && themeData.colors) {
            dots = [
                themeData.colors.appGradientA || themeData.colors.bgPrimary || '#1e1e1e',
                themeData.colors.appGradientB || themeData.colors.bgSecondary || '#2d2d2d',
                themeData.colors.accentColor || '#66ccff'
            ];
        } else {
            dots = id === 'dark'
                ? ['#1e1e1e', '#ffffff', '#66ccff']
                : ['#f5f5f5', '#1a1a1a', '#0099cc'];
        }
    } else {
        dots = [
            themeData.colors.appGradientA || themeData.colors.bgPrimary,
            themeData.colors.appGradientB || themeData.colors.bgSecondary,
            themeData.colors.accentColor
        ];
    }
    
    dots.forEach(color => {
        const dot = document.createElement('div');
        dot.className = 'theme-color-dot';
        dot.style.backgroundColor = color;
        dot.style.boxShadow = `0 0 5px ${color}44`; 
        preview.appendChild(dot);
    });
    
    item.appendChild(preview);
    
    item.innerHTML += `
        <div class="theme-item-info">
            <span class="theme-item-name">${name}</span>
            <span class="theme-item-type">${type === 'preset' ? i18n.t('theme.official') : i18n.t('theme.custom')}</span>
        </div>
    `;

    item.addEventListener('click', () => {
        setTheme(id);
        localStorage.setItem('theme', id);
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) themeSelect.value = id;
        renderThemeManager();
    });

    if (type === 'custom') {
        const actions = document.createElement('div');
        actions.className = 'theme-item-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'action-btn small';
        editBtn.innerHTML = `
            <span class="icon-svg" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                    <path d="M14 4 20 10 11 19H5v-6L14 4Z"></path>
                    <path d="M14 4 17 7"></path>
                </svg>
            </span>
        `;
        editBtn.onclick = (e) => {
        e.stopPropagation();
            
            // 1. Load the data into the form
            editTheme(themeData); 
            
            // 2. Scroll smoothly to the form
            const formElement = document.getElementById("form-title");
            if (formElement) {
                formElement.scrollIntoView({ 
                behavior: "smooth", 
                block: "start" 
                });
            }
        };

        const uploadBtn = document.createElement('button');
        uploadBtn.className = 'action-btn small';
        uploadBtn.innerHTML = 'Up'; 
        uploadBtn.onclick = (e) => {
        e.stopPropagation();
            uploadTheme(themeData);
        };
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-btn remove-btn small';
        deleteBtn.innerHTML = 'Ã—'; 
        deleteBtn.onclick = (e) => { e.stopPropagation(); deleteCustomTheme(id); };
        
        actions.appendChild(editBtn);
        actions.appendChild(uploadBtn);
        actions.appendChild(deleteBtn);
        item.appendChild(actions);
    }
    
    return item;
}

async function askForWebhookUrl() {
    // Show the modal
    const modal = document.getElementById('webhook-modal');
    const input = document.getElementById('webhook-input');
    const saveBtn = document.getElementById('webhook-save-btn');
    const cancelBtn = document.getElementById('webhook-cancel-btn');
    
    if (!modal) {
        console.error("Webhook modal not found");
        return null;
    }

    // Reset input
    input.value = '';
    modal.style.display = 'flex';

    // Wait for user interaction
    const webhookUrl = await new Promise((resolve) => {
        const cleanup = () => {
            saveBtn.removeEventListener('click', onSave);
            cancelBtn.removeEventListener('click', onCancel);
        };

        const onSave = () => {
            const url = input.value.trim();
            const webhookDefaultUrl = 'https://discord.com/api/webhooks/';
            if (!url.startsWith(webhookDefaultUrl)) {
                const errorMsg = i18n.t('webhook.invalidUrl', { url: webhookDefaultUrl }) ;
                alert(errorMsg);
                return; // Don't close, let user fix
            }
            localStorage.setItem('discordWebhookUrl', url);
            modal.style.display = 'none';
            cleanup();
            resolve(url);
        };

        const onCancel = () => {
            modal.style.display = 'none';
            cleanup();
            resolve(null);
        };

        saveBtn.addEventListener('click', onSave);
        cancelBtn.addEventListener('click', onCancel);
    });

    return webhookUrl;
}

async function uploadTheme(theme) {
    let webhookUrl = localStorage.getItem('discordWebhookUrl');
    
    if (!webhookUrl) {
        webhookUrl = await askForWebhookUrl();
        if (!webhookUrl) return; // User cancelled
    }

    const userInfo = await emubro.invoke('get-user-info');

    // Get the image name from the stored property or the UI if available
    let imageName = window.currentBackgroundImageName || 'background';
    let topImageName = window.currentTopBackgroundImageName || 'top-background';
    
    // If it's a generic "background", try to guess the extension from the base64 string
    if (imageName === 'background' && theme.background && theme.background.image && theme.background.image.startsWith('data:')) {
        const mimeType = theme.background.image.split(';base64,')[0].split(':')[1];
        const extension = mimeType.split('/')[1];
        imageName = `background.${extension}`;
    }

    if (topImageName === 'top-background' && theme.background && theme.background.topImage && theme.background.topImage.startsWith('data:')) {
        const topMimeType = theme.background.topImage.split(';base64,')[0].split(':')[1];
        const topExtension = topMimeType.split('/')[1];
        topImageName = `top-background.${topExtension}`;
    }

    // Create a copy of the theme object to modify it without affecting the original
    const themeToUpload = JSON.parse(JSON.stringify(theme));
    if (themeToUpload.background && themeToUpload.background.image) {
        // Replace the base64 image with the image name in the JSON
        themeToUpload.background.image = imageName;
    }
    if (themeToUpload.background && themeToUpload.background.topImage) {
        themeToUpload.background.topImage = topImageName;
    }

    const success = await emubro.invoke('upload-theme', {
        author: userInfo.username,
        name: theme.name, 
        themeObject: themeToUpload, // The JSON with image name
        base64Image: theme.background.image, // The original Base64 string
        topBase64Image: theme.background.topImage || null,
        webhookUrl: webhookUrl
    });

    if (success) {
        console.info("Theme and image uploaded successfully!");
    } else {
        log.error("Theme upload failed. Webhook might be invalid.");
        localStorage.removeItem('discordWebhookUrl');
        alert(i18n.t('webhook.uploadFailed') || "Upload failed. Please check your webhook URL and try again.");
        
        // Ask for a new webhook URL and retry if the user provides one
        const newWebhookUrl = await askForWebhookUrl();
        if (newWebhookUrl) {
            await uploadTheme(theme);
        }
    }
}

export function editTheme(theme) {
    hasUnsavedChanges = false;
    editingThemeId = theme.id;
    document.getElementById('form-title').textContent = i18n.t('theme.editTheme');
    document.getElementById('theme-name').value = theme.name;
    document.getElementById('color-bg-primary').value = theme.colors.bgPrimary;
    document.getElementById('color-text-primary').value = theme.colors.textPrimary;
    document.getElementById('color-text-secondary').value = theme.colors.textSecondary;
    document.getElementById('color-accent').value = theme.colors.accentColor;
    document.getElementById('color-bg-secondary').value = theme.colors.bgSecondary;
    document.getElementById('color-border').value = theme.colors.borderColor;
    
    document.getElementById('color-bg-header').value = theme.colors.bgHeader || theme.colors.bgSecondary;
    document.getElementById('color-bg-sidebar').value = theme.colors.bgSidebar || theme.colors.bgTertiary || theme.colors.bgSecondary;
    document.getElementById('color-bg-actionbar').value = theme.colors.bgActionbar || theme.colors.bgQuaternary || theme.colors.bgSecondary;
    document.getElementById('color-bg-tertiary').value = theme.colors.bgTertiary || theme.colors.bgSecondary;
    document.getElementById('color-bg-quaternary').value = theme.colors.bgQuaternary || theme.colors.bgTertiary || theme.colors.bgSecondary;
    document.getElementById('color-success').value = theme.colors.successColor || '#4caf50';
    document.getElementById('color-danger').value = theme.colors.dangerColor || '#f44336';
    document.getElementById('color-app-gradient-a').value = theme.colors.appGradientA || theme.colors.bgPrimary || '#0b1528';
    document.getElementById('color-app-gradient-b').value = theme.colors.appGradientB || theme.colors.bgSecondary || '#0f2236';
    document.getElementById('color-app-gradient-c').value = theme.colors.appGradientC || theme.colors.bgTertiary || '#1d2f4a';
    const gradientAngle = normalizeGradientAngle(theme.colors.appGradientAngle || '160deg');
    setGradientAngleInputFromValue(gradientAngle);
    updateGradientAngleValueLabel(gradientAngle);

    if (theme.background) {
        document.getElementById('bg-position').value = theme.background.position || 'centered';
        document.getElementById('bg-scale').value = theme.background.scale || 'crop';
        document.getElementById('bg-background-repeat').value = theme.background.repeat || 'no-repeat';
        
        if (theme.background.image) {
            window.currentBackgroundImage = theme.background.image;
            // Try to recover filename if it's not a base64 string
            if (!theme.background.image.startsWith('data:')) {
                window.currentBackgroundImageName = theme.background.image;
            } else {
                window.currentBackgroundImageName = 'background';
            }
            
            document.getElementById('bg-preview-img').src = theme.background.image;
            document.getElementById('bg-preview').style.display = 'block';
            document.getElementById('bg-image-name').textContent = window.currentBackgroundImageName === 'background' ? i18n.t('theme.backgroundImageLoaded') : `${window.currentBackgroundImageName}`;
            document.getElementById('clear-bg-image-btn').style.display = 'inline-block';
        } else {
            clearBackgroundImage();
        }

        if (theme.background.topImage) {
            window.currentTopBackgroundImage = theme.background.topImage;
            if (!theme.background.topImage.startsWith('data:')) {
                window.currentTopBackgroundImageName = theme.background.topImage;
            } else {
                window.currentTopBackgroundImageName = 'top-background';
            }

            const topPreviewImg = document.getElementById('bg-top-preview-img');
            const topPreview = document.getElementById('bg-top-preview');
            if (topPreviewImg && topPreview) {
                topPreviewImg.src = theme.background.topImage;
                topPreview.style.display = 'block';
            }
            const topName = document.getElementById('bg-top-image-name');
            if (topName) topName.textContent = window.currentTopBackgroundImageName;
            const clearTopBtn = document.getElementById('clear-bg-top-image-btn');
            if (clearTopBtn) clearTopBtn.style.display = 'inline-block';
        } else {
            clearTopBackgroundImage();
        }

        const extraLayers = extractAdditionalLayerDrafts(
            theme.background,
            theme.background.image || null,
            theme.background.topImage || theme.background.top?.image || null
        );
        setBackgroundLayerDrafts(extraLayers);
        renderBackgroundLayerEditor();
        applyBackgroundImage(getThemeBackgroundConfigFromForm());
    } else {
        clearBackgroundImage();
        clearTopBackgroundImage();
        setBackgroundLayerDrafts([]);
        renderBackgroundLayerEditor();
        applyBackgroundImage(getThemeBackgroundConfigFromForm());
    }
    
    if (theme.cardEffects) {
        document.getElementById('glass-effect-toggle').checked = theme.cardEffects.glassEffect !== false;
    } else {
        document.getElementById('glass-effect-toggle').checked = true;
    }

    const baseColorInput = document.getElementById('theme-base-color');
    if (baseColorInput) baseColorInput.value = theme?.editor?.basicBaseColor || theme.colors.accentColor || '#5aa9ff';
    const variantInput = document.getElementById('theme-basic-variant');
    if (variantInput) variantInput.value = normalizeBasicVariant(theme?.editor?.basicVariant || inferBasicVariantFromTheme(theme));
    const intensityInput = document.getElementById('theme-basic-intensity');
    if (intensityInput) intensityInput.value = String(normalizeBasicIntensity(theme?.editor?.basicIntensity ?? 100));
    updateBasicIntensityValueLabel(intensityInput?.value || 100);
    setThemeEditorMode(theme?.editor?.customizationMode || localStorage.getItem(THEME_EDITOR_MODE_STORAGE_KEY), { persist: false });
    
    updateColorTexts();
    showThemeForm();
    setupThemeCustomizationControls();
    setupBackgroundImageListeners();
    setupColorPickerListeners();
}

export function updateColorTexts() {
    const pickers = document.querySelectorAll('.color-picker');
    pickers.forEach(picker => {
        const textInput = picker.parentElement.querySelector('.color-text');
        if (textInput) {
            textInput.value = picker.value.toUpperCase();
        }
    });
}

export function showThemeForm() {
    document.getElementById('theme-form').style.display = 'flex';
}

export function hideThemeForm() {
    document.getElementById('theme-form').style.display = 'none';
    editingThemeId = null;
    setTheme(currentTheme); 
}

export function resetThemeForm() {
    const themeNameInput = document.getElementById('theme-name');
    if (themeNameInput) themeNameInput.value = '';
    
    const defaults = {
        'color-bg-primary': '#1e1e1e',
        'color-text-primary': '#ffffff',
        'color-text-secondary': '#cccccc',
        'color-accent': '#66ccff',
        'color-bg-secondary': '#2d2d2d',
        'color-border': '#444444',
        'color-bg-header': '#2d2d2d',
        'color-bg-sidebar': '#333333',
        'color-bg-actionbar': '#252525',
        'color-bg-tertiary': '#333333',
        'color-bg-quaternary': '#2b2b2b',
        'color-success': '#4caf50',
        'color-danger': '#f44336',
        'color-app-gradient-a': '#0b1528',
        'color-app-gradient-b': '#0f2236',
        'color-app-gradient-c': '#1d2f4a'
    };
    for (const [id, val] of Object.entries(defaults)) {
        const el = document.getElementById(id);
        if (el) el.value = val;
    }
    
    const bgPos = document.getElementById('bg-position');
    if (bgPos) bgPos.value = 'centered';
    
    const bgScale = document.getElementById('bg-scale');
    if (bgScale) bgScale.value = 'crop';
    
    const bgRepeat = document.getElementById('bg-background-repeat');
    if (bgRepeat) bgRepeat.value = 'no-repeat';
    
    const glassToggle = document.getElementById('glass-effect-toggle');
    if (glassToggle) glassToggle.checked = true;

    const baseColorInput = document.getElementById('theme-base-color');
    if (baseColorInput) baseColorInput.value = '#5aa9ff';
    const variantInput = document.getElementById('theme-basic-variant');
    if (variantInput) variantInput.value = 'auto';
    const intensityInput = document.getElementById('theme-basic-intensity');
    if (intensityInput) intensityInput.value = '100';
    updateBasicIntensityValueLabel(100);

    setGradientAngleInputFromValue('160deg');
    updateGradientAngleValueLabel('160deg');
    applyGradientAnglePreview('160deg');
    
    clearBackgroundImage();
    clearTopBackgroundImage();
    setBackgroundLayerDrafts([]);
    renderBackgroundLayerEditor();
    applyBackgroundImage(getThemeBackgroundConfigFromForm());

    const startMode = normalizeThemeCustomizationMode(localStorage.getItem(THEME_EDITOR_MODE_STORAGE_KEY));
    setThemeEditorMode(startMode, { persist: false });
    setupThemeCustomizationControls();
    if (startMode === 'basic') {
        applyBasicPaletteToInputs({ markUnsaved: false });
    }
    updateColorTexts();
    applyColorInputsPreview();
}

export function clearBackgroundImage() {
    window.currentBackgroundImage = null;
    window.currentBackgroundImageName = '';
    const bgInput = document.getElementById('bg-image-input');
    if (bgInput) bgInput.value = '';
    
    const bgPreview = document.getElementById('bg-preview');
    if (bgPreview) bgPreview.style.display = 'none';
    
    const bgName = document.getElementById('bg-image-name');
    if (bgName) bgName.textContent = '';
    
    const clearBtn = document.getElementById('clear-bg-image-btn');
    if (clearBtn) clearBtn.style.display = 'none';

    applyBackgroundImage(getThemeBackgroundConfigFromForm({ image: null }));
}

export function clearTopBackgroundImage() {
    window.currentTopBackgroundImage = null;
    window.currentTopBackgroundImageName = '';
    const topBgInput = document.getElementById('bg-top-image-input');
    if (topBgInput) topBgInput.value = '';

    const topPreview = document.getElementById('bg-top-preview');
    if (topPreview) topPreview.style.display = 'none';

    const topName = document.getElementById('bg-top-image-name');
    if (topName) topName.textContent = '';

    const clearTopBtn = document.getElementById('clear-bg-top-image-btn');
    if (clearTopBtn) clearTopBtn.style.display = 'none';

    applyBackgroundImage(getThemeBackgroundConfigFromForm({ topImage: null }));
}

export function setupColorPickerListeners() {
    const root = document.documentElement;
    setupThemeCustomizationControls();
    const colorMap = {
        'color-bg-primary': '--bg-primary',
        'color-text-primary': '--text-primary',
        'color-text-secondary': '--text-secondary',
        'color-accent': '--accent-color',
        'color-bg-secondary': '--bg-secondary',
        'color-border': '--border-color',
        'color-bg-header': '--bg-header',
        'color-bg-sidebar': '--bg-sidebar',
        'color-bg-actionbar': '--bg-actionbar',
        'color-bg-tertiary': '--bg-tertiary',
        'color-bg-quaternary': '--bg-quaternary',
        'color-success': '--success-color',
        'color-danger': '--danger-color',
        'color-app-gradient-a': '--app-gradient-a',
        'color-app-gradient-b': '--app-gradient-b',
        'color-app-gradient-c': '--app-gradient-c'
    };

    document.querySelectorAll('.color-picker').forEach(picker => {
        const newPicker = picker.cloneNode(true);
        picker.parentNode.replaceChild(newPicker, picker);
        
        const handleUpdate = (e) => {
            updateColorTexts();
            hasUnsavedChanges = true;
            const color = e.target.value;
            const id = newPicker.id;

            if (id === 'theme-base-color') {
                if (getThemeEditorMode() === 'basic') {
                    applyBasicPaletteToInputs();
                    return;
                }
            }
            
            if (colorMap[id]) {
                root.style.setProperty(colorMap[id], color);
                if (id === 'color-accent') {
                    root.style.setProperty('--brand-color', darkenHex(color, 30));
                }
            }

            applyColorInputsPreview();
        };

        newPicker.addEventListener('change', handleUpdate);
        newPicker.addEventListener('input', handleUpdate);
    });

    const gradientAngleInput = document.getElementById('gradient-angle');
    if (gradientAngleInput) {
        const replacement = gradientAngleInput.cloneNode(true);
        gradientAngleInput.parentNode.replaceChild(replacement, gradientAngleInput);

        const handleAngleUpdate = (event) => {
            const angle = normalizeGradientAngle(`${event.target.value}deg`);
            updateGradientAngleValueLabel(angle);
            applyGradientAnglePreview(angle);
            hasUnsavedChanges = true;
        };

        replacement.addEventListener('input', handleAngleUpdate);
        replacement.addEventListener('change', handleAngleUpdate);

        const currentAngle = normalizeGradientAngle(`${replacement.value || '160'}deg`);
        setGradientAngleInputFromValue(currentAngle);
        updateGradientAngleValueLabel(currentAngle);
        applyGradientAnglePreview(currentAngle);
    }
}

export function setupBackgroundImageListeners() {
    const bindWithClone = (id, eventName, handler) => {
        const node = document.getElementById(id);
        if (!node || !node.parentNode) return null;
        const clone = node.cloneNode(true);
        node.parentNode.replaceChild(clone, node);
        clone.addEventListener(eventName, handler);
        return clone;
    };

    bindWithClone('bg-image-input', 'change', handleBackgroundImageUpload);
    bindWithClone('bg-top-image-input', 'change', handleTopBackgroundImageUpload);

    const addLayerBtn = bindWithClone('add-bg-layer-btn', 'click', () => {
        backgroundLayerDrafts.push(createBackgroundLayerDraft());
        hasUnsavedChanges = true;
        renderBackgroundLayerEditor();
        applyBackgroundImage(getThemeBackgroundConfigFromForm());
    });
    if (addLayerBtn) addLayerBtn.type = 'button';

    const layerList = document.getElementById('bg-layer-list');
    if (layerList && layerList.parentNode) {
        const clone = layerList.cloneNode(true);
        layerList.parentNode.replaceChild(clone, layerList);

        clone.addEventListener('click', (event) => {
            const actionBtn = event.target.closest('[data-layer-action]');
            if (!actionBtn) return;
            const card = actionBtn.closest('[data-layer-index]');
            if (!card) return;
            const index = Number.parseInt(card.dataset.layerIndex, 10);
            if (!Number.isInteger(index) || index < 0 || index >= backgroundLayerDrafts.length) return;

            const action = actionBtn.dataset.layerAction;
            if (action === 'remove') {
                backgroundLayerDrafts.splice(index, 1);
            } else if (action === 'up' && index > 0) {
                const layer = backgroundLayerDrafts[index];
                backgroundLayerDrafts[index] = backgroundLayerDrafts[index - 1];
                backgroundLayerDrafts[index - 1] = layer;
            } else if (action === 'down' && index < backgroundLayerDrafts.length - 1) {
                const layer = backgroundLayerDrafts[index];
                backgroundLayerDrafts[index] = backgroundLayerDrafts[index + 1];
                backgroundLayerDrafts[index + 1] = layer;
            }

            hasUnsavedChanges = true;
            renderBackgroundLayerEditor();
            applyBackgroundImage(getThemeBackgroundConfigFromForm());
        });

        clone.addEventListener('input', (event) => {
            const field = event.target?.dataset?.layerField;
            if (field !== 'opacity') return;
            const card = event.target.closest('[data-layer-index]');
            if (!card) return;
            const index = Number.parseInt(card.dataset.layerIndex, 10);
            if (!Number.isInteger(index) || index < 0 || index >= backgroundLayerDrafts.length) return;
            const nextOpacity = clampNumber(Number.parseInt(event.target.value, 10) / 100, 0, 1);
            backgroundLayerDrafts[index].opacity = nextOpacity;
            const valueLabel = card.querySelector('.bg-layer-range-value');
            if (valueLabel) valueLabel.textContent = `${Math.round(nextOpacity * 100)}%`;
            hasUnsavedChanges = true;
            applyBackgroundImage(getThemeBackgroundConfigFromForm());
        });

        clone.addEventListener('change', (event) => {
            const field = event.target?.dataset?.layerField;
            if (!field) return;
            const card = event.target.closest('[data-layer-index]');
            if (!card) return;
            const index = Number.parseInt(card.dataset.layerIndex, 10);
            if (!Number.isInteger(index) || index < 0 || index >= backgroundLayerDrafts.length) return;

            const layer = backgroundLayerDrafts[index];
            if (!layer) return;

            if (field === 'imageFile') {
                const file = event.target.files && event.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (readerEvent) => {
                    layer.image = typeof readerEvent?.target?.result === 'string' ? readerEvent.target.result : null;
                    layer.imageName = file.name;
                    hasUnsavedChanges = true;
                    renderBackgroundLayerEditor();
                    applyBackgroundImage(getThemeBackgroundConfigFromForm());
                };
                reader.readAsDataURL(file);
                return;
            }

            if (field === 'name') {
                layer.name = String(event.target.value || '').trim();
            } else if (field === 'position') {
                layer.position = normalizeBackgroundLayerPosition(event.target.value);
            } else if (field === 'size') {
                layer.size = normalizeBackgroundLayerSize(event.target.value);
            } else if (field === 'repeat') {
                layer.repeat = normalizeBackgroundLayerRepeat(event.target.value);
            } else if (field === 'behavior') {
                layer.behavior = normalizeBackgroundLayerBehavior(event.target.value);
            } else if (field === 'blendMode') {
                layer.blendMode = normalizeBackgroundLayerBlendMode(event.target.value);
            } else if (field === 'opacity') {
                layer.opacity = normalizeBackgroundLayerOpacity(Number.parseInt(event.target.value, 10) / 100);
            }

            hasUnsavedChanges = true;
            renderBackgroundLayerEditor();
            applyBackgroundImage(getThemeBackgroundConfigFromForm());
        });
    }

    bindWithClone('clear-bg-image-btn', 'click', () => {
        clearBackgroundImage();
        hasUnsavedChanges = true;
    });

    bindWithClone('clear-bg-top-image-btn', 'click', () => {
        clearTopBackgroundImage();
        hasUnsavedChanges = true;
    });

    renderBackgroundLayerEditor();
}

function getSelectOptionsMarkup(options = [], selectedValue = '') {
    return options.map((option) => {
        const selected = option.value === selectedValue ? ' selected' : '';
        return `<option value="${escapeHtml(option.value)}"${selected}>${escapeHtml(option.label)}</option>`;
    }).join('');
}

function renderBackgroundLayerEditor() {
    const list = document.getElementById('bg-layer-list');
    if (!list) return;

    if (!Array.isArray(backgroundLayerDrafts) || backgroundLayerDrafts.length === 0) {
        list.innerHTML = `<div class="bg-layer-empty">No extra layers yet. Add one to stack more images over your base background.</div>`;
        return;
    }

    list.innerHTML = backgroundLayerDrafts.map((layer, index) => {
        const safeLayer = createBackgroundLayerDraft(layer);
        const title = safeLayer.name || `Layer ${index + 1}`;
        const imageName = safeLayer.imageName || (safeLayer.image ? 'Image loaded' : 'No image selected');
        const opacityPercent = Math.round(safeLayer.opacity * 100);
        const preview = safeLayer.image
            ? `<div class="bg-preview"><img src="${escapeHtml(safeLayer.image)}" alt="Layer preview"></div>`
            : '';
        return `
            <div class="bg-layer-card" data-layer-index="${index}">
                <div class="bg-layer-card-header">
                    <h6 class="bg-layer-title">${escapeHtml(title)}</h6>
                    <div class="bg-layer-actions">
                        <button type="button" class="action-btn small" data-layer-action="up" title="Move up">Up</button>
                        <button type="button" class="action-btn small" data-layer-action="down" title="Move down">Down</button>
                        <button type="button" class="action-btn small remove-btn" data-layer-action="remove" title="Remove layer">Remove</button>
                    </div>
                </div>
                <div class="form-group">
                    <label>Layer Name:</label>
                    <input type="text" data-layer-field="name" value="${escapeHtml(safeLayer.name)}" placeholder="Optional label">
                </div>
                <div class="form-group">
                    <label>Upload Image:</label>
                    <input type="file" accept="image/*" data-layer-field="imageFile">
                    <span class="image-name">${escapeHtml(imageName)}</span>
                </div>
                <div class="bg-layer-grid">
                    <div class="form-group">
                        <label>Position:</label>
                        <select data-layer-field="position">${getSelectOptionsMarkup(BACKGROUND_LAYER_POSITIONS, safeLayer.position)}</select>
                    </div>
                    <div class="form-group">
                        <label>Scale:</label>
                        <select data-layer-field="size">${getSelectOptionsMarkup(BACKGROUND_LAYER_SIZE_OPTIONS, safeLayer.size)}</select>
                    </div>
                    <div class="form-group">
                        <label>Repeat:</label>
                        <select data-layer-field="repeat">${getSelectOptionsMarkup(BACKGROUND_LAYER_REPEAT_OPTIONS, safeLayer.repeat)}</select>
                    </div>
                    <div class="form-group">
                        <label>Behavior:</label>
                        <select data-layer-field="behavior">${getSelectOptionsMarkup(BACKGROUND_LAYER_BEHAVIOR_OPTIONS, safeLayer.behavior)}</select>
                    </div>
                    <div class="form-group">
                        <label>Blend:</label>
                        <select data-layer-field="blendMode">${getSelectOptionsMarkup(BACKGROUND_LAYER_BLEND_OPTIONS, safeLayer.blendMode)}</select>
                    </div>
                    <div class="form-group">
                        <label>Opacity:</label>
                        <div class="bg-layer-range-wrap">
                            <input type="range" min="0" max="100" step="1" data-layer-field="opacity" value="${opacityPercent}">
                            <span class="bg-layer-range-value">${opacityPercent}%</span>
                        </div>
                    </div>
                </div>
                ${preview}
            </div>
        `;
    }).join('');
}

function getThemeBackgroundConfigFromForm(overrides = {}) {
    const hasImageOverride = Object.prototype.hasOwnProperty.call(overrides, 'image');
    const hasTopImageOverride = Object.prototype.hasOwnProperty.call(overrides, 'topImage');
    const image = hasImageOverride ? overrides.image : (window.currentBackgroundImage || null);
    const topImage = hasTopImageOverride ? overrides.topImage : (window.currentTopBackgroundImage || null);
    const position = document.getElementById('bg-position')?.value || 'centered';
    const scale = document.getElementById('bg-scale')?.value || 'crop';
    const repeat = document.getElementById('bg-background-repeat')?.value || 'no-repeat';

    const layers = [];
    if (image) {
        layers.push(createBackgroundLayerDraft({
            id: 'base',
            image,
            imageName: window.currentBackgroundImageName || '',
            position: normalizeBackgroundLayerPosition('center center'),
            size: mapLegacyScaleToLayerSize(scale),
            repeat,
            behavior: position === 'fixed' ? 'fixed' : 'scroll',
            opacity: 1,
            blendMode: 'normal'
        }));
    }

    if (topImage) {
        layers.push(createBackgroundLayerDraft({
            id: 'top',
            image: topImage,
            imageName: window.currentTopBackgroundImageName || '',
            position: 'top center',
            size: '100% auto',
            repeat: 'no-repeat',
            behavior: 'scroll',
            opacity: 1,
            blendMode: 'normal'
        }));
    }

    layers.push(...cloneBackgroundLayerDrafts(backgroundLayerDrafts));

    return {
        image,
        imagePath: null,
        position,
        scale,
        repeat,
        topImage,
        topHeight: 220,
        topOpacity: 1,
        topScale: '100% auto',
        topRepeat: 'no-repeat',
        topPosition: 'top center',
        layers,
        ...overrides
    };
}

function handleBackgroundImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const imageData = e.target.result;
        window.currentBackgroundImage = imageData;
        window.currentBackgroundImageName = file.name;
        
        const preview = document.getElementById('bg-preview');
        const previewImg = document.getElementById('bg-preview-img');
        if (preview && previewImg) {
            previewImg.src = imageData;
            preview.style.display = 'block';
        }
        
        const name = document.getElementById('bg-image-name');
        if (name) name.textContent = `Selected: ${file.name}`;
        const clearBtn = document.getElementById('clear-bg-image-btn');
        if (clearBtn) clearBtn.style.display = 'inline-block';

        hasUnsavedChanges = true;
        applyBackgroundImage(getThemeBackgroundConfigFromForm({ image: imageData, imagePath: file.path || null }));
    };
    reader.readAsDataURL(file);
}

function handleTopBackgroundImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const imageData = e.target.result;
        window.currentTopBackgroundImage = imageData;
        window.currentTopBackgroundImageName = file.name;

        const preview = document.getElementById('bg-top-preview');
        const previewImg = document.getElementById('bg-top-preview-img');
        if (preview && previewImg) {
            previewImg.src = imageData;
            preview.style.display = 'block';
        }

        const name = document.getElementById('bg-top-image-name');
        if (name) name.textContent = `Selected: ${file.name}`;
        const clearBtn = document.getElementById('clear-bg-top-image-btn');
        if (clearBtn) clearBtn.style.display = 'inline-block';

        hasUnsavedChanges = true;
        applyBackgroundImage(getThemeBackgroundConfigFromForm({ topImage: imageData }));
    };
    reader.readAsDataURL(file);
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
        accentColor: getVar('--accent-color'),
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
        dangerColor: getVar('--danger-color')
    };
}

export function saveTheme() {
    const name = document.getElementById('theme-name').value.trim();
    if (!name) {
        alert(i18n.t('messages.enterThemeName'));
        return;
    }

    const existingTheme = editingThemeId ? getCustomThemes().find((t) => t.id === editingThemeId) : null;
    const existingFonts = resolveThemeFonts(existingTheme?.fonts || null);
    const backgroundConfig = getThemeBackgroundConfigFromForm();
    
    const theme = {
        id: editingThemeId || 'custom_' + Date.now(),
        name: name,
        colors: {
            bgPrimary: document.getElementById('color-bg-primary').value,
            textPrimary: document.getElementById('color-text-primary').value,
            textSecondary: document.getElementById('color-text-secondary').value,
            accentColor: document.getElementById('color-accent').value,
            bgSecondary: document.getElementById('color-bg-secondary').value,
            borderColor: document.getElementById('color-border').value,
            bgHeader: document.getElementById('color-bg-header').value,
            bgSidebar: document.getElementById('color-bg-sidebar').value,
            bgActionbar: document.getElementById('color-bg-actionbar').value,
            bgTertiary: document.getElementById('color-bg-tertiary').value,
            bgQuaternary: document.getElementById('color-bg-quaternary').value,
            appGradientA: document.getElementById('color-app-gradient-a').value,
            appGradientB: document.getElementById('color-app-gradient-b').value,
            appGradientC: document.getElementById('color-app-gradient-c').value,
            appGradientAngle: normalizeGradientAngle(`${document.getElementById('gradient-angle').value}deg`),
            successColor: document.getElementById('color-success').value,
            dangerColor: document.getElementById('color-danger').value
        },
        background: backgroundConfig,
        cardEffects: {
            glassEffect: document.getElementById('glass-effect-toggle').checked
        },
        fonts: {
            body: existingFonts.body,
            heading: existingFonts.heading,
            pixelMode: existingFonts.pixelMode
        },
        editor: {
            customizationMode: getThemeEditorMode(),
            basicBaseColor: document.getElementById('theme-base-color')?.value || '#5aa9ff',
            basicVariant: normalizeBasicVariant(document.getElementById('theme-basic-variant')?.value || 'auto'),
            basicIntensity: normalizeBasicIntensity(document.getElementById('theme-basic-intensity')?.value || 100)
        }
    };
    
    saveCustomTheme(theme);
    hasUnsavedChanges = false;
    hideThemeForm();
    alert(i18n.t('theme.saved'));
}

export async function renderMarketplace(forceRefresh = false) {
    const container = document.getElementById('marketplace-list');
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
        
        // Check if theme with same name and author is already installed
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
                renderMarketplace(); // Refresh marketplace to show "Add" button again
            });
        } else {
            card.querySelector('.add-btn').addEventListener('click', () => {
                const newTheme = { ...theme, id: 'custom_' + Date.now() };
                saveCustomTheme(newTheme);
                alert(i18n.t('theme.addedToThemes', {name: theme.name}));
                renderMarketplace(); // Refresh marketplace to show "Remove" button
            });
        }

        container.appendChild(card);
    });
}

export function getCurrentTheme() {
    return currentTheme;
}

export function getEditingThemeId() {
    return editingThemeId;
}

export function getHasUnsavedChanges() {
    return hasUnsavedChanges;
}

export function setHasUnsavedChanges(val) {
    hasUnsavedChanges = val;
}

export function toggleTheme() {
    const currentColors = getCurrentThemeColors();
    const invertedColors = {};
    const flip = (hex) => flipLightness(hex);

    invertedColors.bgPrimary = flip(currentColors.bgPrimary);
    invertedColors.bgSecondary = flip(currentColors.bgSecondary);
    invertedColors.bgTertiary = flip(currentColors.bgTertiary);
    invertedColors.bgQuaternary = flip(currentColors.bgQuaternary);
    
    invertedColors.textPrimary = flip(currentColors.textPrimary);
    invertedColors.textSecondary = flip(currentColors.textSecondary);
    
    invertedColors.borderColor = flip(currentColors.borderColor);
    invertedColors.accentColor = flip(currentColors.accentColor);
    
    invertedColors.bgHeader = flip(currentColors.bgHeader);
    invertedColors.bgSidebar = flip(currentColors.bgSidebar);
    invertedColors.bgActionbar = flip(currentColors.bgActionbar);
    invertedColors.appGradientA = flip(currentColors.appGradientA);
    invertedColors.appGradientB = flip(currentColors.appGradientB);
    invertedColors.appGradientC = flip(currentColors.appGradientC);
    invertedColors.appGradientAngle = currentColors.appGradientAngle || '160deg';
    
    invertedColors.successColor = flip(currentColors.successColor);
    invertedColors.dangerColor = flip(currentColors.dangerColor);

    // Try to preserve background image
    let currentBgImage = window.currentBackgroundImage;
    if (!currentBgImage) {
        const gameGrid = document.querySelector('main.game-grid');
        if (gameGrid) {
            const bgStyle = getComputedStyle(gameGrid).backgroundImage;
            if (bgStyle && bgStyle !== 'none') {
                const match = bgStyle.match(/url\(['"]?(.*?)['"]?\)/);
                if (match) {
                    currentBgImage = match[1];
                }
            }
        }
    }

    // Create temporary theme object
    const invertedTheme = {
        id: 'temp_inverted',
        name: 'Inverted (Temporary)',
        colors: invertedColors,
        background: {
             image: currentBgImage || null,
             position: 'centered', // Defaults
             scale: 'crop',
             repeat: 'no-repeat'
        },
        cardEffects: {
             glassEffect: document.documentElement.getAttribute('data-glass-effect') === 'enabled'
        }
    };
    
    // Apply without saving to localStorage (temporal)
    applyCustomTheme(invertedTheme);
    
    // Update currentTheme locally so we know state changed, but don't persist it
    currentTheme = 'temp_inverted';
}

export function invertColors() {
    const root = document.documentElement;
    const currentFilter = root.style.filter || '';
    if (currentFilter.includes('invert(1)')) {
        root.style.filter = currentFilter.replace('invert(1)', '').trim();
    } else {
        root.style.filter = (currentFilter + ' invert(1)').trim();
    }
}
