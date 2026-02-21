/**
 * Theme Manager
 */

import { 
    parseColorToHex, 
    hexToRgb, 
    invertHex, 
    rgbToHsl, 
    flipLightness, 
    darkenHex 
} from './ui-utils';
import { requestDockLayoutRefresh } from './docking-manager';
import { loadSuggestionSettings, normalizeSuggestionProvider } from './suggestions-settings';
import {
    FONT_PRESET_STACKS,
    DEFAULT_THEME_FONTS,
    DEFAULT_BASIC_BRAND_MODE,
    DEFAULT_BASIC_BRAND_STRENGTH,
    DEFAULT_TEXT_EFFECT_MODE,
    DEFAULT_TEXT_EFFECT_SPEED,
    DEFAULT_TEXT_EFFECT_INTENSITY,
    DEFAULT_TEXT_EFFECT_CUSTOM_COLORS,
    DEFAULT_TEXT_EFFECT_ANGLE,
    getBuiltInPresetTheme,
    getBuiltInPresetThemes
} from './theme-manager/presets';
import {
    BACKGROUND_LAYER_POSITIONS,
    BACKGROUND_LAYER_SIZE_OPTIONS,
    BACKGROUND_LAYER_REPEAT_OPTIONS,
    BACKGROUND_LAYER_BEHAVIOR_OPTIONS,
    BACKGROUND_LAYER_BLEND_OPTIONS,
    BACKGROUND_SURFACE_TARGET_OPTIONS,
    BASE_BACKGROUND_POSITION_OPTIONS,
    BASE_BACKGROUND_SCALE_OPTIONS,
    clampNumber,
    escapeHtml,
    normalizeBackgroundLayerPosition,
    normalizeBackgroundLayerSize,
    normalizeBackgroundLayerRepeat,
    normalizeBackgroundLayerBehavior,
    normalizeBackgroundLayerBlendMode,
    normalizeBackgroundLayerOpacity,
    normalizeBackgroundLayerOffset,
    resolveBackgroundPositionWithOffset,
    mapLegacyScaleToLayerSize,
    normalizeBackgroundSurfaceTarget,
    normalizeBaseBackgroundPosition,
    normalizeBaseBackgroundScale,
    createDefaultBackgroundSurfaceDraft,
    createBackgroundSurfaceDraftFromConfig,
    createBackgroundLayerDraft,
    cloneBackgroundLayerDrafts,
    extractBackgroundLayers,
    hasThemeBackgroundLayers,
    extractAdditionalLayerDrafts
} from './theme-manager/background-utils';
import {
    normalizeThemeCustomizationMode,
    normalizeBasicVariant,
    inferBasicVariantFromTheme,
    normalizeBasicIntensity,
    normalizeBasicBrandMode,
    normalizeBasicBrandStrength,
    normalizeBasicBrandUseAccent,
    resolveBasicBrandColor,
    resolveBrandEditorConfig,
    normalizeToggleBoolean,
    normalizeTextEffectMode,
    normalizeTextEffectColor,
    normalizeTextEffectCustomColors,
    normalizeTextEffectAngle,
    normalizeTextEffectSpeed,
    normalizeTextEffectIntensity,
    resolveThemeTextEffectConfig,
    shiftColorHsl,
    buildBasicPalette,
    resolveBasicVariantForEditor,
    resolveBasicVariantForRuntime,
    isNearBlackHex,
    looksCorruptedBlackPalette,
    normalizePaletteToActiveTone,
    repairBlackPaletteFromAccent,
    resolveThemeColorsForRuntime,
    buildPaletteMatchedLogoTextEffect,
    inferUiToneFromColor
} from './theme-manager/theme-algorithms';

const emubro = window.emubro;
const log = console;

let remoteCommunityThemes = null;
let currentTheme = '';
let editingThemeId = null;
let hasUnsavedChanges = false;
let shouldUseAccentColorForBrand = true;
let fixedBackgroundTracking = null;
let backgroundLayerDrafts = [];
let backgroundSurfaceDraft = null;
let lastAppliedBackgroundSignature = '';
let isApplyingTheme = false;
let queuedThemeApply = null;
let lastAppliedThemeId = '';
let lastAppliedThemeAt = 0;
const THEME_EDITOR_MODE_STORAGE_KEY = 'themeEditorCustomizationMode';

// Draggable state
let isDragging = false;
let startX, startY;
let modalInitialX, modalInitialY;

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

function getFontPresetFromStack(stackValue) {
    const normalized = String(stackValue || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const entries = Object.entries(FONT_PRESET_STACKS);
    for (const [preset, stack] of entries) {
        const normalizedStack = String(stack || '').trim().toLowerCase().replace(/\s+/g, ' ');
        if (normalized === normalizedStack) return preset;
    }
    return 'custom';
}

function setThemeFontControlState() {
    const bodyPreset = document.getElementById('theme-font-body-preset');
    const headingPreset = document.getElementById('theme-font-heading-preset');
    const bodyCustom = document.getElementById('theme-font-body-custom');
    const headingCustom = document.getElementById('theme-font-heading-custom');
    if (bodyCustom) bodyCustom.disabled = (bodyPreset?.value || 'quicksand') !== 'custom';
    if (headingCustom) headingCustom.disabled = (headingPreset?.value || 'quicksand') !== 'custom';
}

function setThemeFontControlsFromFonts(fonts = null) {
    const resolved = resolveThemeFonts(fonts);
    const bodyPreset = document.getElementById('theme-font-body-preset');
    const headingPreset = document.getElementById('theme-font-heading-preset');
    const bodyCustom = document.getElementById('theme-font-body-custom');
    const headingCustom = document.getElementById('theme-font-heading-custom');
    const pixelModeInput = document.getElementById('theme-font-pixel-mode');
    if (bodyPreset) bodyPreset.value = getFontPresetFromStack(resolved.body);
    if (headingPreset) headingPreset.value = getFontPresetFromStack(resolved.heading);
    if (bodyCustom) bodyCustom.value = resolved.body;
    if (headingCustom) headingCustom.value = resolved.heading;
    if (pixelModeInput) pixelModeInput.checked = Boolean(resolved.pixelMode);
    setThemeFontControlState();
}

function getThemeFontsFromForm(fallbackFonts = null) {
    const fallback = resolveThemeFonts(fallbackFonts);
    const bodyPreset = String(document.getElementById('theme-font-body-preset')?.value || '').trim().toLowerCase();
    const headingPreset = String(document.getElementById('theme-font-heading-preset')?.value || '').trim().toLowerCase();
    const bodyCustom = String(document.getElementById('theme-font-body-custom')?.value || '').trim();
    const headingCustom = String(document.getElementById('theme-font-heading-custom')?.value || '').trim();
    const pixelModeInput = document.getElementById('theme-font-pixel-mode');

    const resolvedBody = bodyPreset === 'custom'
        ? (bodyCustom || fallback.body)
        : (FONT_PRESET_STACKS[bodyPreset] || fallback.body);
    const resolvedHeading = headingPreset === 'custom'
        ? (headingCustom || fallback.heading)
        : (FONT_PRESET_STACKS[headingPreset] || fallback.heading);

    return resolveThemeFonts({
        body: resolvedBody,
        heading: resolvedHeading,
        pixelMode: Boolean(pixelModeInput?.checked)
    });
}

function applyThemeFontsFromForm(options = {}) {
    const fonts = getThemeFontsFromForm(DEFAULT_THEME_FONTS);
    applyThemeFonts(fonts);
    setThemeFontControlState();
    if (options.markUnsaved !== false) {
        hasUnsavedChanges = true;
    }
}

function updateBasicBrandStrengthValueLabel(strengthValue) {
    const label = document.getElementById('theme-basic-brand-strength-value');
    if (!label) return;
    const normalized = normalizeBasicBrandStrength(strengthValue);
    label.textContent = `${normalized}%`;
}

function getBasicBrandModeFromControls() {
    const selected = document.querySelector('input[name="theme-basic-brand-mode"]:checked');
    return normalizeBasicBrandMode(selected?.value || DEFAULT_BASIC_BRAND_MODE);
}

function setBasicBrandModeInControls(modeValue) {
    const mode = normalizeBasicBrandMode(modeValue);
    const radios = document.querySelectorAll('input[name="theme-basic-brand-mode"]');
    if (!radios || radios.length === 0) return;
    radios.forEach((radio) => {
        radio.checked = normalizeBasicBrandMode(radio.value) === mode;
    });
}

function setBasicBrandControlState(useAccentValue, modeValue = null) {
    const useAccent = normalizeBasicBrandUseAccent(useAccentValue);
    const mode = normalizeBasicBrandMode(modeValue || getBasicBrandModeFromControls());
    const modeInputs = document.querySelectorAll('input[name="theme-basic-brand-mode"]');
    const strengthInput = document.getElementById('theme-basic-brand-strength');
    const colorInput = document.getElementById('theme-basic-brand-color');

    modeInputs.forEach((input) => {
        input.disabled = !useAccent;
    });
    if (strengthInput) {
        strengthInput.disabled = !useAccent || mode === 'accent' || mode === 'custom';
    }
    if (colorInput) {
        colorInput.disabled = !useAccent || mode !== 'custom';
    }
}


function updateTextEffectSpeedValueLabel(speedValue) {
    const label = document.getElementById('theme-textfx-speed-value');
    if (!label) return;
    const normalized = normalizeTextEffectSpeed(speedValue);
    label.textContent = `${normalized}s`;
}

function updateTextEffectIntensityValueLabel(intensityValue) {
    const label = document.getElementById('theme-textfx-intensity-value');
    if (!label) return;
    const normalized = normalizeTextEffectIntensity(intensityValue);
    label.textContent = `${normalized}%`;
}

function updateTextEffectAngleValueLabel(angleValue) {
    const label = document.getElementById('theme-textfx-angle-value');
    if (!label) return;
    const normalized = normalizeTextEffectAngle(angleValue);
    label.textContent = `${normalized}deg`;
}

function setTextEffectControlState(enabledValue, modeValue = null, useColor4Value = false) {
    const enabled = normalizeToggleBoolean(enabledValue, false);
    const mode = normalizeTextEffectMode(modeValue || document.getElementById('theme-textfx-mode')?.value || DEFAULT_TEXT_EFFECT_MODE);
    const useColor4 = normalizeToggleBoolean(
        useColor4Value ?? document.getElementById('theme-textfx-use-color-4')?.checked ?? false,
        false
    );
    const modeInput = document.getElementById('theme-textfx-mode');
    const speedInput = document.getElementById('theme-textfx-speed');
    const intensityInput = document.getElementById('theme-textfx-intensity');
    const angleInput = document.getElementById('theme-textfx-angle');
    const applyToLogoInput = document.getElementById('theme-textfx-apply-logo');
    const useColor4Input = document.getElementById('theme-textfx-use-color-4');
    const color1Input = document.getElementById('theme-textfx-color-1');
    const color2Input = document.getElementById('theme-textfx-color-2');
    const color3Input = document.getElementById('theme-textfx-color-3');
    const color4Input = document.getElementById('theme-textfx-color-4');

    if (modeInput) modeInput.disabled = !enabled;
    if (speedInput) speedInput.disabled = !enabled;
    if (intensityInput) intensityInput.disabled = !enabled;
    if (applyToLogoInput) applyToLogoInput.disabled = !enabled;
    const customEnabled = enabled && mode === 'custom';
    if (angleInput) angleInput.disabled = !customEnabled;
    if (useColor4Input) useColor4Input.disabled = !customEnabled;
    const colorsEnabled = customEnabled;
    if (color1Input) color1Input.disabled = !colorsEnabled;
    if (color2Input) color2Input.disabled = !colorsEnabled;
    if (color3Input) color3Input.disabled = !colorsEnabled;
    if (color4Input) color4Input.disabled = !colorsEnabled || !useColor4;
}

function getTextEffectConfigFromForm() {
    const enabledInput = document.getElementById('theme-textfx-enabled');
    const applyToLogoInput = document.getElementById('theme-textfx-apply-logo');
    const modeInput = document.getElementById('theme-textfx-mode');
    const speedInput = document.getElementById('theme-textfx-speed');
    const intensityInput = document.getElementById('theme-textfx-intensity');
    const angleInput = document.getElementById('theme-textfx-angle');
    const useColor4Input = document.getElementById('theme-textfx-use-color-4');
    const color1Input = document.getElementById('theme-textfx-color-1');
    const color2Input = document.getElementById('theme-textfx-color-2');
    const color3Input = document.getElementById('theme-textfx-color-3');
    const color4Input = document.getElementById('theme-textfx-color-4');

    const enabled = normalizeToggleBoolean(enabledInput?.checked ?? false, false);
    const mode = enabled ? normalizeTextEffectMode(modeInput?.value || 'flowy-blood') : DEFAULT_TEXT_EFFECT_MODE;
    const speed = normalizeTextEffectSpeed(speedInput?.value ?? DEFAULT_TEXT_EFFECT_SPEED);
    const intensity = normalizeTextEffectIntensity(intensityInput?.value ?? DEFAULT_TEXT_EFFECT_INTENSITY);
    const angle = normalizeTextEffectAngle(angleInput?.value ?? DEFAULT_TEXT_EFFECT_ANGLE);
    const useColor4 = enabled && mode === 'custom'
        ? normalizeToggleBoolean(useColor4Input?.checked ?? false, false)
        : false;
    const customColors = normalizeTextEffectCustomColors({
        color1: color1Input?.value || '',
        color2: color2Input?.value || '',
        color3: color3Input?.value || '',
        color4: color4Input?.value || ''
    }, DEFAULT_TEXT_EFFECT_CUSTOM_COLORS);

    return {
        enabled: mode !== DEFAULT_TEXT_EFFECT_MODE,
        mode,
        speed,
        intensity,
        angle,
        useColor4,
        applyToLogo: enabled ? normalizeToggleBoolean(applyToLogoInput?.checked ?? false, false) : false,
        customColors
    };
}

function applyThemeTextEffects(themeOrConfig = null) {
    const root = document.documentElement;
    const config = resolveThemeTextEffectConfig(themeOrConfig);
    const effectiveColor4 = config.useColor4 ? config.customColors.color4 : config.customColors.color3;
    root.style.setProperty('--logo-text-effect-speed', `${config.speed}s`);
    root.style.setProperty('--logo-text-effect-intensity', String(config.intensity));
    root.style.setProperty('--logo-text-effect-angle', `${config.angle}deg`);
    root.style.setProperty('--logo-text-effect-color-1', config.customColors.color1);
    root.style.setProperty('--logo-text-effect-color-2', config.customColors.color2);
    root.style.setProperty('--logo-text-effect-color-3', config.customColors.color3);
    root.style.setProperty('--logo-text-effect-color-4', effectiveColor4);
    root.setAttribute('data-logo-effect-apply-logo', config.applyToLogo ? 'true' : 'false');
    if (config.mode === DEFAULT_TEXT_EFFECT_MODE) {
        root.removeAttribute('data-logo-text-effect');
    } else {
        root.setAttribute('data-logo-text-effect', config.mode);
    }
    return config;
}

function applyThemeTextEffectsFromForm(options = {}) {
    const enabledInput = document.getElementById('theme-textfx-enabled');
    const applyToLogoInput = document.getElementById('theme-textfx-apply-logo');
    const modeInput = document.getElementById('theme-textfx-mode');
    const speedInput = document.getElementById('theme-textfx-speed');
    const intensityInput = document.getElementById('theme-textfx-intensity');
    const angleInput = document.getElementById('theme-textfx-angle');
    const useColor4Input = document.getElementById('theme-textfx-use-color-4');
    const color1Input = document.getElementById('theme-textfx-color-1');
    const color2Input = document.getElementById('theme-textfx-color-2');
    const color3Input = document.getElementById('theme-textfx-color-3');
    const color4Input = document.getElementById('theme-textfx-color-4');
    if (!enabledInput || !applyToLogoInput || !modeInput || !speedInput || !intensityInput || !angleInput || !useColor4Input || !color1Input || !color2Input || !color3Input || !color4Input) return null;

    const config = getTextEffectConfigFromForm();
    const uiMode = config.mode === DEFAULT_TEXT_EFFECT_MODE
        ? (() => {
            const currentMode = normalizeTextEffectMode(modeInput.value || 'flowy-blood');
            return currentMode === DEFAULT_TEXT_EFFECT_MODE ? 'flowy-blood' : currentMode;
        })()
        : config.mode;
    enabledInput.checked = config.enabled;
    modeInput.value = uiMode;
    speedInput.value = String(config.speed);
    intensityInput.value = String(config.intensity);
    angleInput.value = String(config.angle);
    useColor4Input.checked = config.useColor4;
    applyToLogoInput.checked = config.applyToLogo;
    color1Input.value = config.customColors.color1;
    color2Input.value = config.customColors.color2;
    color3Input.value = config.customColors.color3;
    color4Input.value = config.customColors.color4;
    updateTextEffectSpeedValueLabel(config.speed);
    updateTextEffectIntensityValueLabel(config.intensity);
    updateTextEffectAngleValueLabel(config.angle);
    setTextEffectControlState(config.enabled, uiMode, config.useColor4);
    applyThemeTextEffects({ logo: config });
    updateColorTexts();

    if (options.markUnsaved !== false) {
        hasUnsavedChanges = true;
    }
    return config;
}

function updateLlmThemeRangeValueLabel(inputId, valueId) {
    const input = document.getElementById(inputId);
    const value = document.getElementById(valueId);
    if (!input || !value) return;
    const parsed = clampNumber(Number.parseInt(String(input.value || '0'), 10), 0, 100);
    value.textContent = `${parsed}%`;
}

function getThemeLlmConfig() {
    const settings = loadSuggestionSettings(localStorage);
    const provider = normalizeSuggestionProvider(settings?.provider);
    const model = String(settings?.models?.[provider] || '').trim();
    const baseUrl = String(settings?.baseUrls?.[provider] || '').trim();
    const apiKey = String(settings?.apiKeys?.[provider] || '').trim();
    return { provider, model, baseUrl, apiKey };
}

function getCurrentThemeColorInputsSnapshot() {
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

function applyGeneratedThemeToForm(result = {}) {
    const colors = result?.colors && typeof result.colors === 'object' ? result.colors : {};
    const colorMap = {
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

    Object.entries(colorMap).forEach(([key, inputId]) => {
        const input = document.getElementById(inputId);
        if (!input) return;
        const nextValue = parseColorToHex(colors[key] || '');
        if (!nextValue) return;
        input.value = nextValue;
    });
    const gradientAngle = normalizeGradientAngle(String(colors.appGradientAngle || '160deg'));
    setGradientAngleInputFromValue(gradientAngle);
    updateGradientAngleValueLabel(gradientAngle);
    applyGradientAnglePreview(gradientAngle);

    const coreForDerive = {
        bgPrimary: parseColorToHex(document.getElementById('color-bg-primary')?.value || '') || '#0b1220',
        bgSecondary: parseColorToHex(document.getElementById('color-bg-secondary')?.value || '') || '#121c2f',
        textSecondary: parseColorToHex(document.getElementById('color-text-secondary')?.value || '') || '#b9c7dc',
        accentColor: parseColorToHex(document.getElementById('color-accent')?.value || '') || '#66ccff',
        borderColor: parseColorToHex(document.getElementById('color-border')?.value || '') || '#2f4360',
        successColor: parseColorToHex(document.getElementById('color-success')?.value || '') || '#4caf50',
        dangerColor: parseColorToHex(document.getElementById('color-danger')?.value || '') || '#f44336'
    };
    const derived = deriveThemeVisualVars(coreForDerive);
    const derivedInputMap = {
        'color-text-tertiary': derived.textTertiary,
        'color-warning': derived.warningColor,
        'color-brand': derived.brandColor,
        'color-accent-hover': derived.accentHover,
        'color-glass-surface': derived.glassSurface,
        'color-glass-surface-strong': derived.glassSurfaceStrong,
        'color-glass-border': derived.glassBorder
    };
    Object.entries(derivedInputMap).forEach(([id, value]) => {
        const input = document.getElementById(id);
        if (!input) return;
        const normalized = parseColorToHex(value || '');
        if (!normalized) return;
        input.value = normalized;
    });

    const textEffect = result?.textEffect && typeof result.textEffect === 'object' ? result.textEffect : null;
    if (textEffect) {
        const enabledInput = document.getElementById('theme-textfx-enabled');
        const modeInput = document.getElementById('theme-textfx-mode');
        const applyLogoInput = document.getElementById('theme-textfx-apply-logo');
        const speedInput = document.getElementById('theme-textfx-speed');
        const intensityInput = document.getElementById('theme-textfx-intensity');
        const angleInput = document.getElementById('theme-textfx-angle');
        const useColor4Input = document.getElementById('theme-textfx-use-color-4');
        const color1Input = document.getElementById('theme-textfx-color-1');
        const color2Input = document.getElementById('theme-textfx-color-2');
        const color3Input = document.getElementById('theme-textfx-color-3');
        const color4Input = document.getElementById('theme-textfx-color-4');
        const normalizedMode = normalizeTextEffectMode(textEffect.mode || DEFAULT_TEXT_EFFECT_MODE);
        const enabled = !!textEffect.enabled && normalizedMode !== DEFAULT_TEXT_EFFECT_MODE;
        const customColors = textEffect.customColors && typeof textEffect.customColors === 'object'
            ? textEffect.customColors
            : {};

        if (enabledInput) enabledInput.checked = enabled;
        if (modeInput) modeInput.value = enabled ? normalizedMode : 'flowy-blood';
        if (applyLogoInput) applyLogoInput.checked = enabled && !!textEffect.applyToLogo;
        if (speedInput) speedInput.value = String(normalizeTextEffectSpeed(textEffect.speed ?? DEFAULT_TEXT_EFFECT_SPEED));
        if (intensityInput) intensityInput.value = String(normalizeTextEffectIntensity(textEffect.intensity ?? DEFAULT_TEXT_EFFECT_INTENSITY));
        if (angleInput) angleInput.value = String(normalizeTextEffectAngle(textEffect.angle ?? DEFAULT_TEXT_EFFECT_ANGLE));
        if (useColor4Input) useColor4Input.checked = !!textEffect.useColor4;
        if (color1Input && parseColorToHex(customColors.color1 || '')) color1Input.value = parseColorToHex(customColors.color1);
        if (color2Input && parseColorToHex(customColors.color2 || '')) color2Input.value = parseColorToHex(customColors.color2);
        if (color3Input && parseColorToHex(customColors.color3 || '')) color3Input.value = parseColorToHex(customColors.color3);
        if (color4Input && parseColorToHex(customColors.color4 || '')) color4Input.value = parseColorToHex(customColors.color4);
        updateTextEffectSpeedValueLabel(speedInput?.value || DEFAULT_TEXT_EFFECT_SPEED);
        updateTextEffectIntensityValueLabel(intensityInput?.value || DEFAULT_TEXT_EFFECT_INTENSITY);
        updateTextEffectAngleValueLabel(angleInput?.value || DEFAULT_TEXT_EFFECT_ANGLE);
        applyThemeTextEffectsFromForm({ markUnsaved: false });
    }

    const baseColorInput = document.getElementById('theme-base-color');
    const accentValue = parseColorToHex(document.getElementById('color-accent')?.value || '');
    if (baseColorInput && accentValue) {
        baseColorInput.value = accentValue;
    }

    updateColorTexts();
    applyColorInputsPreview();
    applyBackgroundImage(getThemeBackgroundConfigFromForm());
    hasUnsavedChanges = true;
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

function ensureBackgroundSurfaceDraft() {
    if (!backgroundSurfaceDraft) {
        backgroundSurfaceDraft = createDefaultBackgroundSurfaceDraft();
    }
    return backgroundSurfaceDraft;
}

function setBackgroundSurfaceDraftFromConfig(bgConfig = {}) {
    backgroundSurfaceDraft = createBackgroundSurfaceDraftFromConfig(bgConfig);
}

function getBackgroundSurfaceTargetMeta(target) {
    const normalized = normalizeBackgroundSurfaceTarget(target);
    if (normalized === 'top') {
        return {
            positionOptions: BACKGROUND_LAYER_POSITIONS,
            scaleOptions: BACKGROUND_LAYER_SIZE_OPTIONS,
            repeatOptions: BACKGROUND_LAYER_REPEAT_OPTIONS,
            positionLabel: 'Position:',
            repeatLabel: 'Repeat:',
            scaleLabel: 'Scale Mode:'
        };
    }
    if (normalized === 'title') {
        return {
            positionOptions: BACKGROUND_LAYER_POSITIONS,
            scaleOptions: BACKGROUND_LAYER_SIZE_OPTIONS,
            repeatOptions: BACKGROUND_LAYER_REPEAT_OPTIONS,
            positionLabel: 'Position:',
            repeatLabel: 'Repeat:',
            scaleLabel: 'Scale Mode:'
        };
    }
    return {
        positionOptions: BASE_BACKGROUND_POSITION_OPTIONS,
        scaleOptions: BASE_BACKGROUND_SCALE_OPTIONS,
        repeatOptions: BACKGROUND_LAYER_REPEAT_OPTIONS,
        positionLabel: 'Position / Attachment:',
        repeatLabel: 'Repeat:',
        scaleLabel: 'Scale Mode:'
    };
}

function syncBackgroundSurfaceControls() {
    const targetSelect = document.getElementById('bg-target-select');
    const positionSelect = document.getElementById('bg-position');
    const repeatSelect = document.getElementById('bg-background-repeat');
    const scaleSelect = document.getElementById('bg-scale');
    const offsetXInput = document.getElementById('bg-offset-x');
    const offsetYInput = document.getElementById('bg-offset-y');
    if (!targetSelect || !positionSelect || !repeatSelect || !scaleSelect || !offsetXInput || !offsetYInput) return;

    const draft = ensureBackgroundSurfaceDraft();
    const target = normalizeBackgroundSurfaceTarget(targetSelect.value || draft.target);
    draft.target = target;
    const targetSettings = draft[target] || draft.base;
    const meta = getBackgroundSurfaceTargetMeta(target);

    targetSelect.innerHTML = getSelectOptionsMarkup(BACKGROUND_SURFACE_TARGET_OPTIONS, target);
    positionSelect.innerHTML = getSelectOptionsMarkup(meta.positionOptions, String(targetSettings.position || ''));
    repeatSelect.innerHTML = getSelectOptionsMarkup(meta.repeatOptions, String(targetSettings.repeat || 'no-repeat'));
    scaleSelect.innerHTML = getSelectOptionsMarkup(meta.scaleOptions, String(targetSettings.scale || 'cover'));
    offsetXInput.value = String(normalizeBackgroundLayerOffset(targetSettings.offsetX));
    offsetYInput.value = String(normalizeBackgroundLayerOffset(targetSettings.offsetY));

    const positionLabel = document.getElementById('bg-position-label');
    if (positionLabel) positionLabel.textContent = meta.positionLabel;
    const repeatLabel = document.getElementById('bg-repeat-label');
    if (repeatLabel) repeatLabel.textContent = meta.repeatLabel;
    const scaleLabel = document.getElementById('bg-scale-label');
    if (scaleLabel) scaleLabel.textContent = meta.scaleLabel;
}

function updateBackgroundSurfaceDraftFromControls() {
    const targetSelect = document.getElementById('bg-target-select');
    const positionSelect = document.getElementById('bg-position');
    const repeatSelect = document.getElementById('bg-background-repeat');
    const scaleSelect = document.getElementById('bg-scale');
    const offsetXInput = document.getElementById('bg-offset-x');
    const offsetYInput = document.getElementById('bg-offset-y');
    if (!targetSelect || !positionSelect || !repeatSelect || !scaleSelect || !offsetXInput || !offsetYInput) return;

    const draft = ensureBackgroundSurfaceDraft();
    const target = normalizeBackgroundSurfaceTarget(targetSelect.value || draft.target);
    draft.target = target;
    const offsetX = normalizeBackgroundLayerOffset(offsetXInput.value);
    const offsetY = normalizeBackgroundLayerOffset(offsetYInput.value);

    if (target === 'top' || target === 'title') {
        draft[target].position = normalizeBackgroundLayerPosition(positionSelect.value);
        draft[target].repeat = normalizeBackgroundLayerRepeat(repeatSelect.value);
        draft[target].scale = normalizeBackgroundLayerSize(scaleSelect.value);
        draft[target].offsetX = offsetX;
        draft[target].offsetY = offsetY;
    } else {
        draft.base.position = normalizeBaseBackgroundPosition(positionSelect.value);
        draft.base.repeat = normalizeBackgroundLayerRepeat(repeatSelect.value);
        draft.base.scale = normalizeBaseBackgroundScale(scaleSelect.value);
        draft.base.offsetX = offsetX;
        draft.base.offsetY = offsetY;
    }
}

function setBackgroundLayerDrafts(layers = []) {
    backgroundLayerDrafts = cloneBackgroundLayerDrafts(layers);
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
    set('--logo-brand-color', parseColorToHex(colors.logoBrandColor) || parseColorToHex(colors.brandColor) || colors.brandColor);
    set('--app-gradient-a', parseColorToHex(colors.appGradientA) || colors.appGradientA);
    set('--app-gradient-b', parseColorToHex(colors.appGradientB) || colors.appGradientB);
    set('--app-gradient-c', parseColorToHex(colors.appGradientC) || colors.appGradientC);
    set('--app-gradient-angle', normalizeGradientAngle(colors.appGradientAngle || '160deg'));

    applyThemeToneAttribute(colors);
    applyDerivedThemeVariables(colors);
}

function deriveThemeVisualVars(colors = {}) {
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

function applyDerivedThemeVariables(colors = {}) {
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

function clearThemeInlineVariables(root) {
    THEME_INLINE_CSS_VARS.forEach((cssVar) => {
        root.style.removeProperty(cssVar);
    });
}

function applyLogoBrandColorPreview(options = {}) {
    const root = document.documentElement;
    const accentInput = document.getElementById('color-accent');
    const textSecondaryInput = document.getElementById('color-text-secondary');
    const brandInput = document.getElementById('color-brand');
    const brandUseAccentInput = document.getElementById('theme-basic-brand-use-accent');
    const brandStrengthInput = document.getElementById('theme-basic-brand-strength');
    const basicBrandColorInput = document.getElementById('theme-basic-brand-color');

    const brandEnabled = normalizeBasicBrandUseAccent(brandUseAccentInput?.checked ?? true);
    const brandMode = getBasicBrandModeFromControls();
    const brandStrength = normalizeBasicBrandStrength(brandStrengthInput?.value ?? DEFAULT_BASIC_BRAND_STRENGTH);
    const manualBrandColor = parseColorToHex(basicBrandColorInput?.value || '') || '';
    const logoBrandColor = resolveBasicBrandColor(accentInput?.value || '', manualBrandColor || brandInput?.value || '', {
        enabled: brandEnabled,
        mode: brandMode,
        strength: brandStrength,
        textSecondary: textSecondaryInput?.value || ''
    });

    root.style.setProperty('--logo-brand-color', parseColorToHex(logoBrandColor) || logoBrandColor);
    if (options.markUnsaved !== false) {
        hasUnsavedChanges = true;
    }
}

function themeHasBrandEditorOverrides(theme) {
    const editor = theme?.editor || {};
    const overrideKeys = ['basicBrandEnabled', 'basicBrandSource', 'basicBrandStrength', 'basicBrandColor', 'basicUseAccentForBrand', 'basicBrandFromAccentMode', 'basicBrandFromAccentStrength'];
    return overrideKeys.some((key) => editor[key] !== undefined && editor[key] !== null && String(editor[key]).trim() !== '');
}

function resolveThemeLogoBrandColor(theme, runtimeColors = {}) {
    if (!themeHasBrandEditorOverrides(theme)) {
        return parseColorToHex(runtimeColors.brandColor || '') || parseColorToHex(runtimeColors.accentColor || '') || '#2f9ec0';
    }
    const brandEditor = resolveBrandEditorConfig(theme?.editor || {});
    return resolveBasicBrandColor(runtimeColors.accentColor, brandEditor.color || runtimeColors.brandColor || '', {
        enabled: brandEditor.enabled,
        mode: brandEditor.source,
        strength: brandEditor.strength,
        textSecondary: runtimeColors.textSecondary
    });
}

function applyColorInputsPreview() {
    applyThemeColorsToRoot(collectThemeColorsFromInputs());
    applyLogoBrandColorPreview({ markUnsaved: false });
    const themeForm = document.getElementById('theme-form');
    if (themeForm && themeForm.style.display !== 'none') {
        applyThemeTextEffectsFromForm({ markUnsaved: false });
    }
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

    const brandUseAccentInput = document.getElementById('theme-basic-brand-use-accent');
    const brandStrengthInput = document.getElementById('theme-basic-brand-strength');
    const basicBrandColorInput = document.getElementById('theme-basic-brand-color');
    const brandEnabled = normalizeBasicBrandUseAccent(brandUseAccentInput?.checked ?? true);
    const brandMode = getBasicBrandModeFromControls();
    const brandStrength = normalizeBasicBrandStrength(brandStrengthInput?.value ?? DEFAULT_BASIC_BRAND_STRENGTH);
    const manualBrandColor = parseColorToHex(basicBrandColorInput?.value || '') || '';

    if (brandUseAccentInput) brandUseAccentInput.checked = brandEnabled;
    setBasicBrandModeInControls(brandMode);
    if (brandStrengthInput) brandStrengthInput.value = String(brandStrength);
    updateBasicBrandStrengthValueLabel(brandStrength);
    setBasicBrandControlState(brandEnabled, brandMode);

    const logoBrandColor = resolveBasicBrandColor(palette.accentColor, manualBrandColor, {
        enabled: brandEnabled,
        mode: brandMode,
        strength: brandStrength,
        textSecondary: palette.textSecondary
    });
    palette.logoBrandColor = logoBrandColor;
    const globalBrandColor = parseColorToHex(palette.brandColor) || parseColorToHex(deriveThemeVisualVars(palette).brandColor) || '#2f9ec0';
    if (basicBrandColorInput && brandEnabled && brandMode === 'custom') {
        basicBrandColorInput.value = parseColorToHex(manualBrandColor || logoBrandColor) || logoBrandColor;
    }

    const derived = deriveThemeVisualVars(palette);
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
        'color-text-tertiary': derived.textTertiary,
        'color-warning': derived.warningColor,
        'color-brand': globalBrandColor,
        'color-accent-hover': derived.accentHover,
        'color-glass-surface': derived.glassSurface,
        'color-glass-surface-strong': derived.glassSurfaceStrong,
        'color-glass-border': derived.glassBorder,
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

function applyBrandControlsToCurrentInputs(options = {}) {
    const brandUseAccentInput = document.getElementById('theme-basic-brand-use-accent');
    const brandStrengthInput = document.getElementById('theme-basic-brand-strength');
    const basicBrandColorInput = document.getElementById('theme-basic-brand-color');
    const accentInput = document.getElementById('color-accent');
    const textSecondaryInput = document.getElementById('color-text-secondary');
    const brandInput = document.getElementById('color-brand');
    if (!brandInput) return;

    const brandEnabled = normalizeBasicBrandUseAccent(brandUseAccentInput?.checked ?? true);
    const brandMode = getBasicBrandModeFromControls();
    const brandStrength = normalizeBasicBrandStrength(brandStrengthInput?.value ?? DEFAULT_BASIC_BRAND_STRENGTH);
    const manualBrandColor = parseColorToHex(basicBrandColorInput?.value || '') || '';

    if (brandUseAccentInput) brandUseAccentInput.checked = brandEnabled;
    setBasicBrandModeInControls(brandMode);
    if (brandStrengthInput) brandStrengthInput.value = String(brandStrength);
    updateBasicBrandStrengthValueLabel(brandStrength);
    setBasicBrandControlState(brandEnabled, brandMode);

    const nextLogoBrandColor = resolveBasicBrandColor(accentInput?.value || '', manualBrandColor || brandInput.value || '', {
        enabled: brandEnabled,
        mode: brandMode,
        strength: brandStrength,
        textSecondary: textSecondaryInput?.value || ''
    });
    document.documentElement.style.setProperty('--logo-brand-color', parseColorToHex(nextLogoBrandColor) || nextLogoBrandColor);
    if (basicBrandColorInput && brandEnabled && brandMode === 'custom') {
        basicBrandColorInput.value = parseColorToHex(manualBrandColor || nextLogoBrandColor) || nextLogoBrandColor;
    }

    updateColorTexts();
    if (options.applyPreview !== false) {
        applyColorInputsPreview();
    }
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

    const basicBrandUseAccentInput = document.getElementById('theme-basic-brand-use-accent');
    if (basicBrandUseAccentInput) {
        const clone = basicBrandUseAccentInput.cloneNode(true);
        basicBrandUseAccentInput.parentNode.replaceChild(clone, basicBrandUseAccentInput);
        const onUseAccentChanged = (markUnsaved = true) => {
            const mode = getBasicBrandModeFromControls();
            setBasicBrandControlState(clone.checked, mode);
            if (getThemeEditorMode() === 'basic') {
                applyBasicPaletteToInputs({ markUnsaved });
            } else {
                applyBrandControlsToCurrentInputs({ markUnsaved });
            }
        };
        clone.addEventListener('change', () => onUseAccentChanged(true));
        onUseAccentChanged(false);
    } else {
        setBasicBrandControlState(true, getBasicBrandModeFromControls());
    }

    document.querySelectorAll('input[name="theme-basic-brand-mode"]').forEach((input) => {
        const clone = input.cloneNode(true);
        input.parentNode.replaceChild(clone, input);
        clone.addEventListener('change', () => {
            setBasicBrandControlState(document.getElementById('theme-basic-brand-use-accent')?.checked ?? true, clone.value);
            if (getThemeEditorMode() === 'basic') {
                applyBasicPaletteToInputs();
            } else {
                applyBrandControlsToCurrentInputs();
            }
        });
    });

    const basicBrandStrengthInput = document.getElementById('theme-basic-brand-strength');
    if (basicBrandStrengthInput) {
        const clone = basicBrandStrengthInput.cloneNode(true);
        basicBrandStrengthInput.parentNode.replaceChild(clone, basicBrandStrengthInput);
        const onStrengthChanged = () => {
            updateBasicBrandStrengthValueLabel(clone.value);
            if (getThemeEditorMode() === 'basic') {
                applyBasicPaletteToInputs();
            } else {
                applyBrandControlsToCurrentInputs();
            }
        };
        clone.addEventListener('input', onStrengthChanged);
        clone.addEventListener('change', onStrengthChanged);
        updateBasicBrandStrengthValueLabel(clone.value);
    }

    const textFxEnabledInput = document.getElementById('theme-textfx-enabled');
    if (textFxEnabledInput) {
        const clone = textFxEnabledInput.cloneNode(true);
        textFxEnabledInput.parentNode.replaceChild(clone, textFxEnabledInput);
        clone.addEventListener('change', () => {
            applyThemeTextEffectsFromForm();
        });
    }

    const textFxApplyLogoInput = document.getElementById('theme-textfx-apply-logo');
    if (textFxApplyLogoInput) {
        const clone = textFxApplyLogoInput.cloneNode(true);
        textFxApplyLogoInput.parentNode.replaceChild(clone, textFxApplyLogoInput);
        clone.addEventListener('change', () => {
            applyThemeTextEffectsFromForm();
        });
    }

    const textFxModeInput = document.getElementById('theme-textfx-mode');
    if (textFxModeInput) {
        const clone = textFxModeInput.cloneNode(true);
        textFxModeInput.parentNode.replaceChild(clone, textFxModeInput);
        clone.addEventListener('change', () => {
            applyThemeTextEffectsFromForm();
        });
    }

    const textFxSpeedInput = document.getElementById('theme-textfx-speed');
    if (textFxSpeedInput) {
        const clone = textFxSpeedInput.cloneNode(true);
        textFxSpeedInput.parentNode.replaceChild(clone, textFxSpeedInput);
        const handleTextFxSpeed = () => {
            updateTextEffectSpeedValueLabel(clone.value);
            applyThemeTextEffectsFromForm();
        };
        clone.addEventListener('input', handleTextFxSpeed);
        clone.addEventListener('change', handleTextFxSpeed);
        updateTextEffectSpeedValueLabel(clone.value);
    }

    const textFxIntensityInput = document.getElementById('theme-textfx-intensity');
    if (textFxIntensityInput) {
        const clone = textFxIntensityInput.cloneNode(true);
        textFxIntensityInput.parentNode.replaceChild(clone, textFxIntensityInput);
        const handleTextFxIntensity = () => {
            updateTextEffectIntensityValueLabel(clone.value);
            applyThemeTextEffectsFromForm();
        };
        clone.addEventListener('input', handleTextFxIntensity);
        clone.addEventListener('change', handleTextFxIntensity);
        updateTextEffectIntensityValueLabel(clone.value);
    }

    const textFxAngleInput = document.getElementById('theme-textfx-angle');
    if (textFxAngleInput) {
        const clone = textFxAngleInput.cloneNode(true);
        textFxAngleInput.parentNode.replaceChild(clone, textFxAngleInput);
        const handleTextFxAngle = () => {
            updateTextEffectAngleValueLabel(clone.value);
            applyThemeTextEffectsFromForm();
        };
        clone.addEventListener('input', handleTextFxAngle);
        clone.addEventListener('change', handleTextFxAngle);
        updateTextEffectAngleValueLabel(clone.value);
    }

    const textFxUseColor4Input = document.getElementById('theme-textfx-use-color-4');
    if (textFxUseColor4Input) {
        const clone = textFxUseColor4Input.cloneNode(true);
        textFxUseColor4Input.parentNode.replaceChild(clone, textFxUseColor4Input);
        clone.addEventListener('change', () => {
            applyThemeTextEffectsFromForm();
        });
    }

    const fontBodyPresetInput = document.getElementById('theme-font-body-preset');
    if (fontBodyPresetInput) {
        const clone = fontBodyPresetInput.cloneNode(true);
        fontBodyPresetInput.parentNode.replaceChild(clone, fontBodyPresetInput);
        clone.addEventListener('change', () => {
            applyThemeFontsFromForm();
        });
    }

    const fontHeadingPresetInput = document.getElementById('theme-font-heading-preset');
    if (fontHeadingPresetInput) {
        const clone = fontHeadingPresetInput.cloneNode(true);
        fontHeadingPresetInput.parentNode.replaceChild(clone, fontHeadingPresetInput);
        clone.addEventListener('change', () => {
            applyThemeFontsFromForm();
        });
    }

    const fontBodyCustomInput = document.getElementById('theme-font-body-custom');
    if (fontBodyCustomInput) {
        const clone = fontBodyCustomInput.cloneNode(true);
        fontBodyCustomInput.parentNode.replaceChild(clone, fontBodyCustomInput);
        clone.addEventListener('input', () => {
            applyThemeFontsFromForm();
        });
        clone.addEventListener('change', () => {
            applyThemeFontsFromForm();
        });
    }

    const fontHeadingCustomInput = document.getElementById('theme-font-heading-custom');
    if (fontHeadingCustomInput) {
        const clone = fontHeadingCustomInput.cloneNode(true);
        fontHeadingCustomInput.parentNode.replaceChild(clone, fontHeadingCustomInput);
        clone.addEventListener('input', () => {
            applyThemeFontsFromForm();
        });
        clone.addEventListener('change', () => {
            applyThemeFontsFromForm();
        });
    }

    const fontPixelModeInput = document.getElementById('theme-font-pixel-mode');
    if (fontPixelModeInput) {
        const clone = fontPixelModeInput.cloneNode(true);
        fontPixelModeInput.parentNode.replaceChild(clone, fontPixelModeInput);
        clone.addEventListener('change', () => {
            applyThemeFontsFromForm();
        });
    }

    const llmEnergyInput = document.getElementById('theme-llm-energy');
    if (llmEnergyInput) {
        const clone = llmEnergyInput.cloneNode(true);
        llmEnergyInput.parentNode.replaceChild(clone, llmEnergyInput);
        const onUpdate = () => updateLlmThemeRangeValueLabel('theme-llm-energy', 'theme-llm-energy-value');
        clone.addEventListener('input', onUpdate);
        clone.addEventListener('change', onUpdate);
        onUpdate();
    }

    const llmSaturationInput = document.getElementById('theme-llm-saturation');
    if (llmSaturationInput) {
        const clone = llmSaturationInput.cloneNode(true);
        llmSaturationInput.parentNode.replaceChild(clone, llmSaturationInput);
        const onUpdate = () => updateLlmThemeRangeValueLabel('theme-llm-saturation', 'theme-llm-saturation-value');
        clone.addEventListener('input', onUpdate);
        clone.addEventListener('change', onUpdate);
        onUpdate();
    }

    const llmGenerateBtn = document.getElementById('theme-llm-generate-btn');
    if (llmGenerateBtn) {
        const clone = llmGenerateBtn.cloneNode(true);
        llmGenerateBtn.parentNode.replaceChild(clone, llmGenerateBtn);
        clone.addEventListener('click', async () => {
            const statusEl = document.getElementById('theme-llm-status');
            const setStatus = (message = '', level = 'info') => {
                if (!statusEl) return;
                statusEl.textContent = String(message || '');
                statusEl.classList.remove('is-success', 'is-error');
                if (level === 'success') statusEl.classList.add('is-success');
                if (level === 'error') statusEl.classList.add('is-error');
            };

            if (!emubro || typeof emubro.invoke !== 'function') {
                setStatus('App API is unavailable in this window.', 'error');
                return;
            }

            const llm = getThemeLlmConfig();
            if (!llm.model) {
                setStatus('Set an AI model first in Settings -> AI / LLM.', 'error');
                return;
            }
            if (!llm.baseUrl) {
                setStatus('Set an AI provider URL first in Settings -> AI / LLM.', 'error');
                return;
            }
            if ((llm.provider === 'openai' || llm.provider === 'gemini') && !llm.apiKey) {
                setStatus('API key is missing for the selected provider.', 'error');
                return;
            }

            const payload = {
                provider: llm.provider,
                model: llm.model,
                baseUrl: llm.baseUrl,
                apiKey: llm.apiKey,
                mood: String(document.getElementById('theme-llm-mood')?.value || 'balanced'),
                style: String(document.getElementById('theme-llm-style')?.value || 'arcade'),
                energy: Number.parseInt(String(document.getElementById('theme-llm-energy')?.value || '60'), 10),
                saturation: Number.parseInt(String(document.getElementById('theme-llm-saturation')?.value || '65'), 10),
                notes: String(document.getElementById('theme-llm-notes')?.value || '').trim(),
                extraPrompt: String(document.getElementById('theme-llm-prompt')?.value || '').trim(),
                preferTextEffect: !!document.getElementById('theme-llm-prefer-textfx')?.checked,
                applyEffectToLogo: !!document.getElementById('theme-llm-apply-logo')?.checked,
                variationSeed: `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
                temperature: 1.2,
                currentColors: getCurrentThemeColorInputsSnapshot()
            };

            clone.disabled = true;
            setStatus('Generating theme...');
            try {
                const response = await emubro.invoke('suggestions:generate-theme', payload);
                if (!response?.success) {
                    throw new Error(response?.message || 'Theme generation failed.');
                }
                applyGeneratedThemeToForm({
                    colors: response.colors,
                    textEffect: response.textEffect
                });
                setStatus(String(response.summary || 'AI theme applied.'), 'success');
            } catch (error) {
                setStatus(String(error?.message || error || 'Theme generation failed.'), 'error');
            } finally {
                clone.disabled = false;
            }
        });
    }

    const savedMode = normalizeThemeCustomizationMode(localStorage.getItem(THEME_EDITOR_MODE_STORAGE_KEY));
    setThemeEditorMode(form.dataset.customizationMode || savedMode, { persist: false });
    applyThemeTextEffectsFromForm({ markUnsaved: false });
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

function clearTitleBackgroundLayer(gameGrid = null) {
    const grid = gameGrid || document.querySelector('main.game-grid');
    if (!grid) return;
    grid.style.setProperty('--theme-title-strip-image', 'none');
    grid.style.setProperty('--theme-title-strip-size', 'cover');
    grid.style.setProperty('--theme-title-strip-repeat', 'no-repeat');
    grid.style.setProperty('--theme-title-strip-position', 'center center');
    grid.style.setProperty('--theme-title-strip-opacity', '0');
}

function isDataImageUrl(value) {
    const text = String(value || '').trim();
    return /^data:image\//i.test(text);
}

function dataUrlToBlob(dataUrl) {
    const raw = String(dataUrl || '').trim();
    const match = raw.match(/^data:([^;,]+)?(;base64)?,(.*)$/i);
    if (!match) return null;
    const mimeType = String(match[1] || 'application/octet-stream').trim() || 'application/octet-stream';
    const isBase64 = Boolean(match[2]);
    const payload = String(match[3] || '');
    try {
        if (isBase64) {
            const binary = atob(payload);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i += 1) {
                bytes[i] = binary.charCodeAt(i);
            }
            return new Blob([bytes], { type: mimeType });
        }
        return new Blob([decodeURIComponent(payload)], { type: mimeType });
    } catch (_error) {
        return null;
    }
}

function resolveThemeBackgroundAssetUrl(source, urlsInUse = null, dataUrlCache = null) {
    const raw = String(source || '').trim();
    if (!raw) return '';
    return raw;
}

function pruneThemeBackgroundAssetUrls(urlsInUse = null) {
    void urlsInUse;
}

function releaseAllThemeBackgroundAssetUrls() {
    pruneThemeBackgroundAssetUrls(new Set());
}

function applyTopBackgroundLayer(gameGrid, bgConfig = {}, assetUrlsInUse = null, dataUrlCache = null) {
    if (!gameGrid) return;
    const topImage = bgConfig.topImage || bgConfig.top?.image || null;
    if (!topImage) {
        clearTopBackgroundLayer(gameGrid);
        return;
    }

    const safeTopImage = String(resolveThemeBackgroundAssetUrl(topImage, assetUrlsInUse, dataUrlCache)).replace(/'/g, "\\'");
    const topHeight = clampNumber(Number.parseInt(bgConfig.topHeight ?? bgConfig.top?.height ?? 220, 10), 60, 640);
    const topOpacity = clampNumber(Number.parseFloat(bgConfig.topOpacity ?? bgConfig.top?.opacity ?? 1), 0, 1);
    const topSize = normalizeBackgroundLayerSize(String(bgConfig.topScale ?? bgConfig.top?.scale ?? '100% auto').trim() || '100% auto');
    const topRepeat = String(bgConfig.topRepeat ?? bgConfig.top?.repeat ?? 'no-repeat').trim() || 'no-repeat';
    const topPositionRaw = String(bgConfig.topPosition ?? bgConfig.top?.position ?? 'top center').trim() || 'top center';
    const topOffsetX = normalizeBackgroundLayerOffset(bgConfig.topOffsetX ?? bgConfig.top?.offsetX ?? 0);
    const topOffsetY = normalizeBackgroundLayerOffset(bgConfig.topOffsetY ?? bgConfig.top?.offsetY ?? 0);
    const topPosition = resolveBackgroundPositionWithOffset(topPositionRaw, topOffsetX, topOffsetY);

    gameGrid.style.setProperty('--theme-top-bg-image', `url('${safeTopImage}')`);
    gameGrid.style.setProperty('--theme-top-bg-size', topSize);
    gameGrid.style.setProperty('--theme-top-bg-repeat', topRepeat);
    gameGrid.style.setProperty('--theme-top-bg-position', topPosition);
    gameGrid.style.setProperty('--theme-top-bg-height', `${topHeight}px`);
    gameGrid.style.setProperty('--theme-top-bg-opacity', String(topOpacity));
}

function applyTitleBackgroundLayer(gameGrid, bgConfig = {}, assetUrlsInUse = null, dataUrlCache = null) {
    if (!gameGrid) return;
    const titleImage = bgConfig.titleImage || bgConfig.title?.image || null;
    if (!titleImage) {
        clearTitleBackgroundLayer(gameGrid);
        return;
    }

    const safeTitleImage = String(resolveThemeBackgroundAssetUrl(titleImage, assetUrlsInUse, dataUrlCache)).replace(/'/g, "\\'");
    const titleOpacity = clampNumber(Number.parseFloat(bgConfig.titleOpacity ?? bgConfig.title?.opacity ?? 0.36), 0, 1);
    const titleSize = normalizeBackgroundLayerSize(String(bgConfig.titleSize ?? bgConfig.title?.size ?? 'cover').trim() || 'cover');
    const titleRepeat = String(bgConfig.titleRepeat ?? bgConfig.title?.repeat ?? 'no-repeat').trim() || 'no-repeat';
    const titlePositionRaw = String(bgConfig.titlePosition ?? bgConfig.title?.position ?? 'center center').trim() || 'center center';
    const titleOffsetX = normalizeBackgroundLayerOffset(bgConfig.titleOffsetX ?? bgConfig.title?.offsetX ?? 0);
    const titleOffsetY = normalizeBackgroundLayerOffset(bgConfig.titleOffsetY ?? bgConfig.title?.offsetY ?? 0);

    // Keep title-strip alignment consistent with the scroll-body background start:
    // a user-entered Y offset of 0 maps to roughly the header height (old +62 behavior).
    const headerOffsets = getGameHeaderOffsets(gameGrid);
    const headerHeight = Math.max(0, Number.parseInt((headerOffsets.bottom ?? 0) - (headerOffsets.top ?? 0), 10) || 0);
    const effectiveTitleOffsetY = normalizeBackgroundLayerOffset(titleOffsetY + headerHeight);
    const titlePosition = resolveBackgroundPositionWithOffset(titlePositionRaw, titleOffsetX, effectiveTitleOffsetY);

    gameGrid.style.setProperty('--theme-title-strip-image', `url('${safeTitleImage}')`);
    gameGrid.style.setProperty('--theme-title-strip-size', titleSize);
    gameGrid.style.setProperty('--theme-title-strip-repeat', titleRepeat);
    gameGrid.style.setProperty('--theme-title-strip-position', titlePosition);
    gameGrid.style.setProperty('--theme-title-strip-opacity', String(titleOpacity));
}

function clearGameGridBackgroundLayers(gameGrid = null) {
    const grid = gameGrid || document.querySelector('main.game-grid');
    if (!grid) return;
    lastAppliedBackgroundSignature = '';
    grid.style.backgroundImage = 'none';
    grid.style.backgroundRepeat = 'no-repeat';
    grid.style.backgroundSize = 'cover';
    grid.style.backgroundPosition = 'center';
    grid.style.backgroundAttachment = 'scroll';
    clearTopBackgroundLayer(grid);
    clearTitleBackgroundLayer(grid);
    const host = grid.querySelector('.theme-bg-layer-host');
    if (host) host.innerHTML = '';
    releaseAllThemeBackgroundAssetUrls();
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

function getGameHeaderOffsets(gameGrid) {
    if (!gameGrid) {
        return { top: 0, bottom: 0 };
    }
    const gameHeader = gameGrid.querySelector('.game-header');
    if (!gameHeader) {
        return { top: 0, bottom: 0 };
    }
    const gridRect = gameGrid.getBoundingClientRect();
    const headerRect = gameHeader.getBoundingClientRect();
    const topOffset = Number.parseFloat((headerRect?.top ?? 0) - (gridRect?.top ?? 0));
    const bottomOffset = Number.parseFloat((headerRect?.bottom ?? 0) - (gridRect?.top ?? 0));
    return {
        top: Number.isFinite(topOffset) ? Math.max(0, topOffset) : 0,
        bottom: Number.isFinite(bottomOffset) ? Math.max(0, bottomOffset) : 0
    };
}

function resolveLayerSizeCss(sizeValue) {
    const size = normalizeBackgroundLayerSize(sizeValue);
    return size;
}

function describeBackgroundAssetForSignature(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (!isDataImageUrl(raw)) return raw;
    return `data:${raw.length}:${raw.slice(0, 24)}:${raw.slice(-24)}`;
}

function buildBackgroundApplySignature(config = {}, layers = []) {
    const titleImage = config?.titleImage || config?.title?.image || '';
    const titlePart = [
        describeBackgroundAssetForSignature(titleImage),
        Number(config?.titleOpacity ?? config?.title?.opacity ?? 0.36),
        String(config?.titleSize ?? config?.title?.size ?? 'cover'),
        String(config?.titleRepeat ?? config?.title?.repeat ?? 'no-repeat'),
        String(config?.titlePosition ?? config?.title?.position ?? 'center center'),
        Number(config?.titleOffsetX ?? config?.title?.offsetX ?? 0),
        Number(config?.titleOffsetY ?? config?.title?.offsetY ?? 0)
    ].join('|');
    const layerParts = (Array.isArray(layers) ? layers : []).map((layer) => [
        describeBackgroundAssetForSignature(layer?.image || ''),
        String(layer?.position || ''),
        String(layer?.size || ''),
        String(layer?.repeat || ''),
        String(layer?.behavior || ''),
        String(layer?.blendMode || ''),
        Number(layer?.opacity ?? 1),
        Number(layer?.offsetX ?? 0),
        Number(layer?.offsetY ?? 0),
        layer?.belowTitleBar ? '1' : '0'
    ].join('|'));
    return `${titlePart}||${layerParts.join('||')}`;
}

export function applyBackgroundImage(bgConfig) {
    const gameGrid = document.querySelector('main.game-grid');
    if (!gameGrid) return;
    
    const config = bgConfig || {};
    const layers = extractBackgroundLayers(config);
    const applySignature = buildBackgroundApplySignature(config, layers);
    if (applySignature && applySignature === lastAppliedBackgroundSignature) {
        return;
    }
    lastAppliedBackgroundSignature = applySignature;
    const assetUrlsInUse = new Set();
    const dataUrlCache = new Map();
    // Drop stale object URLs immediately so each theme switch starts from a clean slate.
    pruneThemeBackgroundAssetUrls(new Set());

    disableFixedBackgroundTracking();
    gameGrid.style.backgroundImage = 'none';
    gameGrid.style.backgroundRepeat = 'no-repeat';
    gameGrid.style.backgroundAttachment = 'scroll';
    gameGrid.style.backgroundSize = 'cover';
    gameGrid.style.backgroundPosition = 'center';
    clearTopBackgroundLayer(gameGrid);
    clearTitleBackgroundLayer(gameGrid);
    applyTitleBackgroundLayer(gameGrid, config, assetUrlsInUse, dataUrlCache);

    const host = ensureThemeBackgroundLayerHost(gameGrid);
    if (!host) {
        pruneThemeBackgroundAssetUrls(assetUrlsInUse);
        return;
    }
    host.innerHTML = '';

    if (layers.length === 0) {
        pruneThemeBackgroundAssetUrls(assetUrlsInUse);
        return;
    }

    const headerOffsets = getGameHeaderOffsets(gameGrid);
    const seamOverlapPx = 1;
    layers.forEach((rawLayer, index) => {
        const layer = createBackgroundLayerDraft(rawLayer);
        if (!layer.image) return;
        const layerEl = document.createElement('div');
        layerEl.className = 'theme-bg-layer';
        layerEl.style.zIndex = String(index);
        const layerImageUrl = resolveThemeBackgroundAssetUrl(layer.image, assetUrlsInUse, dataUrlCache);
        layerEl.style.backgroundImage = `url('${String(layerImageUrl).replace(/'/g, "\\'")}')`;
        layerEl.style.backgroundPosition = resolveBackgroundPositionWithOffset(layer.position, layer.offsetX, layer.offsetY);
        layerEl.style.backgroundSize = resolveLayerSizeCss(layer.size);
        layerEl.style.backgroundRepeat = layer.repeat;
        layerEl.style.backgroundAttachment = layer.behavior === 'fixed' ? 'fixed' : 'scroll';
        layerEl.style.mixBlendMode = layer.blendMode;
        layerEl.style.opacity = String(layer.opacity);
        layerEl.style.inset = '0';

        // Keep full-size rendering so "cover/contain" doesn't rescale when toggling,
        // then clip from top to control where the layer starts.
        const clipTop = layer.belowTitleBar
            ? Math.max(0, headerOffsets.bottom - seamOverlapPx)
            : Math.max(0, headerOffsets.top);
        if (clipTop > 0) {
            const clipValue = `inset(${clipTop}px 0 0 0)`;
            layerEl.style.clipPath = clipValue;
            layerEl.style.webkitClipPath = clipValue;
        } else {
            layerEl.style.clipPath = 'none';
            layerEl.style.webkitClipPath = 'none';
        }
        host.appendChild(layerEl);
    });

    pruneThemeBackgroundAssetUrls(assetUrlsInUse);
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
    if (shouldUseAccentColorForBrand && runtimeColors?.accentColor && !parseColorToHex(runtimeColors?.brandColor || '')) {
        root.style.setProperty('--brand-color', darkenHex(runtimeColors.accentColor, 30));
    }
    const runtimeLogoBrand = resolveThemeLogoBrandColor(theme, runtimeColors);
    root.style.setProperty('--logo-brand-color', parseColorToHex(runtimeLogoBrand) || runtimeLogoBrand);
    applyThemeFonts(theme?.fonts || null);
    const isBuiltInPreset = !!getBuiltInPresetTheme(theme?.id);
    if (isBuiltInPreset) {
        applyThemeTextEffects({ logo: buildPaletteMatchedLogoTextEffect(runtimeColors) });
    } else {
        applyThemeTextEffects(theme);
    }
    
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
    const raw = localStorage.getItem('customThemes');
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((theme) => theme && typeof theme === 'object') : [];
    } catch (_error) {
        return [];
    }
}

export function saveCustomTheme(theme) {
    const customThemes = [...getCustomThemes()];
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

export function setTheme(theme, options = {}) {
    const nextTheme = String(theme || 'dark').trim() || 'dark';
    const force = options && options.force === true;
    const allowSameForce = options && options.allowSameForce === true;
    const now = Date.now();
    if (!force && nextTheme === currentTheme) {
        const themeManagerModal = document.getElementById('theme-manager-modal');
        if (themeManagerModal && themeManagerModal.classList.contains('active')) {
            syncThemeManagerActiveItem(nextTheme);
        }
        return;
    }
    // Hard guard against accidental re-application loops.
    if (nextTheme === lastAppliedThemeId) {
        if (!force) return;
        if (force && !allowSameForce) return;
    }
    if (nextTheme === currentTheme && (now - lastAppliedThemeAt) < 400) return;
    if (isApplyingTheme) {
        queuedThemeApply = null;
        return;
    }
    isApplyingTheme = true;
    currentTheme = nextTheme;
    const root = document.documentElement;
    const themeManagerModal = document.getElementById('theme-manager-modal');

    try {
        clearThemeInlineVariables(root);
        disableFixedBackgroundTracking();
        applyThemeFonts(DEFAULT_THEME_FONTS);
        applyThemeTextEffects(null);

        if (nextTheme === 'dark' || nextTheme === 'light') {
            root.setAttribute('data-theme', nextTheme);
            clearGameGridBackgroundLayers();
            const styles = getComputedStyle(root);
            const matched = buildPaletteMatchedLogoTextEffect({
                bgPrimary: styles.getPropertyValue('--bg-primary'),
                accentColor: styles.getPropertyValue('--accent-color'),
                brandColor: styles.getPropertyValue('--brand-color')
            }, { tone: nextTheme });
            applyThemeTextEffects({ logo: matched });
        } else {
            const builtInTheme = getBuiltInPresetTheme(nextTheme);
            if (builtInTheme) {
                applyCustomTheme(builtInTheme);
            } else {
                const customTheme = getCustomThemes().find((entry) => String(entry?.id || '').trim() === nextTheme);
                if (customTheme) {
                    applyCustomTheme(customTheme);
                } else {
                    root.setAttribute('data-theme', 'dark');
                    clearGameGridBackgroundLayers();
                }
            }
        }

        if (themeManagerModal && themeManagerModal.classList.contains('active')) {
            syncThemeManagerActiveItem(nextTheme);
        }

        syncSplashThemePreference(nextTheme);

        // Keep theme switching side effects minimal to avoid memory churn.
        lastAppliedThemeId = nextTheme;
        lastAppliedThemeAt = Date.now();
    } finally {
        isApplyingTheme = false;
        queuedThemeApply = null;
    }
}

function syncThemeManagerActiveItem(themeId = currentTheme) {
    const modal = document.getElementById('theme-manager-modal');
    if (!modal) return;
    const selectedId = String(themeId || '').trim();
    modal.querySelectorAll('.theme-item[data-theme-id]').forEach((item) => {
        const itemId = String(item?.dataset?.themeId || '').trim();
        item.classList.toggle('active', itemId === selectedId);
    });
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
    const customThemes = [...getCustomThemes()];
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
                fonts: DEFAULT_THEME_FONTS,
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
                fonts: DEFAULT_THEME_FONTS,
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
    item.dataset.themeId = String(id);
    
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
        syncThemeManagerActiveItem(id);
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
        uploadBtn.innerHTML = `
            <span class="icon-svg" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                    <path d="M12 16V6"></path>
                    <path d="m8.5 9.5 3.5-3.5 3.5 3.5"></path>
                    <path d="M5 16.5v1.2A1.3 1.3 0 0 0 6.3 19h11.4a1.3 1.3 0 0 0 1.3-1.3v-1.2"></path>
                </svg>
            </span>
        `;
        uploadBtn.setAttribute('title', i18n.t('theme.upload') || 'Upload Theme');
        uploadBtn.setAttribute('aria-label', i18n.t('theme.upload') || 'Upload Theme');
        uploadBtn.onclick = (e) => {
        e.stopPropagation();
            uploadTheme(themeData);
        };
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-btn remove-btn small icon-only-btn';
        deleteBtn.innerHTML = `
            <span class="icon-svg" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                    <path d="M9.2 5.5h5.6"></path>
                    <path d="M6.5 7h11"></path>
                    <path d="M8 7v11a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7"></path>
                    <path d="M10.5 10.5v5"></path>
                    <path d="M13.5 10.5v5"></path>
                </svg>
            </span>
        `;
        deleteBtn.setAttribute('title', i18n.t('buttons.delete') || 'Delete Theme');
        deleteBtn.setAttribute('aria-label', i18n.t('buttons.delete') || 'Delete Theme');
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
    const runtimeColors = resolveThemeColorsForRuntime(theme);
    const runtimeDerived = deriveThemeVisualVars(runtimeColors);
    const setColorInputValue = (id, value, fallback = '#000000') => {
        const input = document.getElementById(id);
        if (!input) return;
        input.value = parseColorToHex(value) || parseColorToHex(fallback) || '#000000';
    };

    setColorInputValue('color-bg-primary', theme.colors.bgPrimary, runtimeColors.bgPrimary);
    setColorInputValue('color-text-primary', theme.colors.textPrimary, runtimeColors.textPrimary);
    setColorInputValue('color-text-secondary', theme.colors.textSecondary, runtimeColors.textSecondary);
    setColorInputValue('color-accent', theme.colors.accentColor, runtimeColors.accentColor);
    setColorInputValue('color-bg-secondary', theme.colors.bgSecondary, runtimeColors.bgSecondary);
    setColorInputValue('color-border', theme.colors.borderColor, runtimeColors.borderColor);

    setColorInputValue('color-bg-header', theme.colors.bgHeader, runtimeColors.bgHeader || runtimeColors.bgSecondary);
    setColorInputValue('color-bg-sidebar', theme.colors.bgSidebar, runtimeColors.bgSidebar || runtimeColors.bgTertiary || runtimeColors.bgSecondary);
    setColorInputValue('color-bg-actionbar', theme.colors.bgActionbar, runtimeColors.bgActionbar || runtimeColors.bgQuaternary || runtimeColors.bgSecondary);
    setColorInputValue('color-bg-tertiary', theme.colors.bgTertiary, runtimeColors.bgTertiary || runtimeColors.bgSecondary);
    setColorInputValue('color-bg-quaternary', theme.colors.bgQuaternary, runtimeColors.bgQuaternary || runtimeColors.bgTertiary || runtimeColors.bgSecondary);
    setColorInputValue('color-success', theme.colors.successColor, '#4caf50');
    setColorInputValue('color-danger', theme.colors.dangerColor, '#f44336');
    setColorInputValue('color-text-tertiary', theme.colors.textTertiary, runtimeDerived.textTertiary);
    setColorInputValue('color-warning', theme.colors.warningColor, runtimeDerived.warningColor);
    setColorInputValue('color-brand', theme.colors.brandColor, runtimeDerived.brandColor);
    setColorInputValue('color-accent-hover', theme.colors.accentHover, runtimeDerived.accentHover);
    setColorInputValue('color-glass-surface', theme.colors.glassSurface, runtimeDerived.glassSurface);
    setColorInputValue('color-glass-surface-strong', theme.colors.glassSurfaceStrong, runtimeDerived.glassSurfaceStrong);
    setColorInputValue('color-glass-border', theme.colors.glassBorder, runtimeDerived.glassBorder);
    setColorInputValue('color-app-gradient-a', theme.colors.appGradientA, runtimeColors.appGradientA || runtimeColors.bgPrimary || '#0b1528');
    setColorInputValue('color-app-gradient-b', theme.colors.appGradientB, runtimeColors.appGradientB || runtimeColors.bgSecondary || '#0f2236');
    setColorInputValue('color-app-gradient-c', theme.colors.appGradientC, runtimeColors.appGradientC || runtimeColors.bgTertiary || '#1d2f4a');
    const gradientAngle = normalizeGradientAngle(theme.colors.appGradientAngle || '160deg');
    setGradientAngleInputFromValue(gradientAngle);
    updateGradientAngleValueLabel(gradientAngle);

    if (theme.background) {
        setBackgroundSurfaceDraftFromConfig(theme.background);
        syncBackgroundSurfaceControls();
        
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

        const titleImage = theme.background.titleImage || theme.background.title?.image || null;
        if (titleImage) {
            window.currentTitleBackgroundImage = titleImage;
            if (!titleImage.startsWith('data:')) {
                window.currentTitleBackgroundImageName = titleImage;
            } else {
                window.currentTitleBackgroundImageName = 'title-background';
            }

            const titlePreviewImg = document.getElementById('bg-title-preview-img');
            const titlePreview = document.getElementById('bg-title-preview');
            if (titlePreviewImg && titlePreview) {
                titlePreviewImg.src = titleImage;
                titlePreview.style.display = 'block';
            }
            const titleName = document.getElementById('bg-title-image-name');
            if (titleName) titleName.textContent = window.currentTitleBackgroundImageName;
            const clearTitleBtn = document.getElementById('clear-bg-title-image-btn');
            if (clearTitleBtn) clearTitleBtn.style.display = 'inline-block';
        } else {
            clearTitleBackgroundImage();
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
        setBackgroundSurfaceDraftFromConfig({});
        syncBackgroundSurfaceControls();
        clearBackgroundImage();
        clearTopBackgroundImage();
        clearTitleBackgroundImage();
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
    const brandEditor = resolveBrandEditorConfig(theme?.editor || {});
    const basicBrandUseAccentInput = document.getElementById('theme-basic-brand-use-accent');
    if (basicBrandUseAccentInput) {
        basicBrandUseAccentInput.checked = brandEditor.enabled;
    }
    setBasicBrandModeInControls(brandEditor.source);
    const basicBrandStrengthInput = document.getElementById('theme-basic-brand-strength');
    if (basicBrandStrengthInput) {
        basicBrandStrengthInput.value = String(brandEditor.strength);
        updateBasicBrandStrengthValueLabel(basicBrandStrengthInput.value);
    }
    const basicBrandColorInput = document.getElementById('theme-basic-brand-color');
    if (basicBrandColorInput) {
        basicBrandColorInput.value = brandEditor.color || parseColorToHex(theme?.colors?.brandColor || '') || '#2f9ec0';
    }
    setBasicBrandControlState(brandEditor.enabled, brandEditor.source);

    const textFx = resolveThemeTextEffectConfig(theme);
    const textFxEnabledInput = document.getElementById('theme-textfx-enabled');
    if (textFxEnabledInput) {
        textFxEnabledInput.checked = textFx.enabled;
    }
    const textFxApplyLogoInput = document.getElementById('theme-textfx-apply-logo');
    if (textFxApplyLogoInput) {
        textFxApplyLogoInput.checked = textFx.applyToLogo;
    }
    const textFxModeInput = document.getElementById('theme-textfx-mode');
    if (textFxModeInput) {
        textFxModeInput.value = textFx.mode === DEFAULT_TEXT_EFFECT_MODE ? 'flowy-blood' : textFx.mode;
    }
    const textFxSpeedInput = document.getElementById('theme-textfx-speed');
    if (textFxSpeedInput) {
        textFxSpeedInput.value = String(textFx.speed);
        updateTextEffectSpeedValueLabel(textFx.speed);
    }
    const textFxIntensityInput = document.getElementById('theme-textfx-intensity');
    if (textFxIntensityInput) {
        textFxIntensityInput.value = String(textFx.intensity);
        updateTextEffectIntensityValueLabel(textFx.intensity);
    }
    const textFxAngleInput = document.getElementById('theme-textfx-angle');
    if (textFxAngleInput) {
        textFxAngleInput.value = String(textFx.angle ?? DEFAULT_TEXT_EFFECT_ANGLE);
        updateTextEffectAngleValueLabel(textFxAngleInput.value);
    }
    const textFxUseColor4Input = document.getElementById('theme-textfx-use-color-4');
    if (textFxUseColor4Input) {
        textFxUseColor4Input.checked = Boolean(textFx.useColor4);
    }
    const textFxColor1Input = document.getElementById('theme-textfx-color-1');
    if (textFxColor1Input) {
        textFxColor1Input.value = textFx.customColors?.color1 || DEFAULT_TEXT_EFFECT_CUSTOM_COLORS.color1;
    }
    const textFxColor2Input = document.getElementById('theme-textfx-color-2');
    if (textFxColor2Input) {
        textFxColor2Input.value = textFx.customColors?.color2 || DEFAULT_TEXT_EFFECT_CUSTOM_COLORS.color2;
    }
    const textFxColor3Input = document.getElementById('theme-textfx-color-3');
    if (textFxColor3Input) {
        textFxColor3Input.value = textFx.customColors?.color3 || DEFAULT_TEXT_EFFECT_CUSTOM_COLORS.color3;
    }
    const textFxColor4Input = document.getElementById('theme-textfx-color-4');
    if (textFxColor4Input) {
        textFxColor4Input.value = textFx.customColors?.color4 || DEFAULT_TEXT_EFFECT_CUSTOM_COLORS.color4;
    }
    setTextEffectControlState(textFx.enabled, textFx.mode, textFx.useColor4);
    applyThemeTextEffects({ logo: textFx });
    setThemeFontControlsFromFonts(theme?.fonts || DEFAULT_THEME_FONTS);
    applyThemeFontsFromForm({ markUnsaved: false });

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
    setTheme(currentTheme, { force: true, allowSameForce: true }); 
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
        'color-text-tertiary': '#9fb0c9',
        'color-warning': '#ffcc00',
        'color-brand': '#2f9ec0',
        'color-accent-hover': '#2aa7cc',
        'color-glass-surface': '#11213a',
        'color-glass-surface-strong': '#102037',
        'color-glass-border': '#4f6380',
        'color-app-gradient-a': '#0b1528',
        'color-app-gradient-b': '#0f2236',
        'color-app-gradient-c': '#1d2f4a'
    };
    for (const [id, val] of Object.entries(defaults)) {
        const el = document.getElementById(id);
        if (el) el.value = val;
    }
    
    setBackgroundSurfaceDraftFromConfig({});
    syncBackgroundSurfaceControls();
    
    const glassToggle = document.getElementById('glass-effect-toggle');
    if (glassToggle) glassToggle.checked = true;

    const baseColorInput = document.getElementById('theme-base-color');
    if (baseColorInput) baseColorInput.value = '#5aa9ff';
    const variantInput = document.getElementById('theme-basic-variant');
    if (variantInput) variantInput.value = 'auto';
    const intensityInput = document.getElementById('theme-basic-intensity');
    if (intensityInput) intensityInput.value = '100';
    updateBasicIntensityValueLabel(100);
    const basicBrandUseAccentInput = document.getElementById('theme-basic-brand-use-accent');
    if (basicBrandUseAccentInput) basicBrandUseAccentInput.checked = true;
    setBasicBrandModeInControls(DEFAULT_BASIC_BRAND_MODE);
    const basicBrandStrengthInput = document.getElementById('theme-basic-brand-strength');
    if (basicBrandStrengthInput) basicBrandStrengthInput.value = String(DEFAULT_BASIC_BRAND_STRENGTH);
    updateBasicBrandStrengthValueLabel(DEFAULT_BASIC_BRAND_STRENGTH);
    const basicBrandColorInput = document.getElementById('theme-basic-brand-color');
    if (basicBrandColorInput) basicBrandColorInput.value = '#2f9ec0';
    setBasicBrandControlState(true, DEFAULT_BASIC_BRAND_MODE);

    const textFxEnabledInput = document.getElementById('theme-textfx-enabled');
    if (textFxEnabledInput) textFxEnabledInput.checked = false;
    const textFxApplyLogoInput = document.getElementById('theme-textfx-apply-logo');
    if (textFxApplyLogoInput) textFxApplyLogoInput.checked = false;
    const textFxModeInput = document.getElementById('theme-textfx-mode');
    if (textFxModeInput) textFxModeInput.value = 'flowy-blood';
    const textFxSpeedInput = document.getElementById('theme-textfx-speed');
    if (textFxSpeedInput) textFxSpeedInput.value = String(DEFAULT_TEXT_EFFECT_SPEED);
    updateTextEffectSpeedValueLabel(DEFAULT_TEXT_EFFECT_SPEED);
    const textFxIntensityInput = document.getElementById('theme-textfx-intensity');
    if (textFxIntensityInput) textFxIntensityInput.value = String(DEFAULT_TEXT_EFFECT_INTENSITY);
    updateTextEffectIntensityValueLabel(DEFAULT_TEXT_EFFECT_INTENSITY);
    const textFxAngleInput = document.getElementById('theme-textfx-angle');
    if (textFxAngleInput) textFxAngleInput.value = String(DEFAULT_TEXT_EFFECT_ANGLE);
    updateTextEffectAngleValueLabel(DEFAULT_TEXT_EFFECT_ANGLE);
    const textFxUseColor4Input = document.getElementById('theme-textfx-use-color-4');
    if (textFxUseColor4Input) textFxUseColor4Input.checked = false;
    const textFxColor1Input = document.getElementById('theme-textfx-color-1');
    if (textFxColor1Input) textFxColor1Input.value = DEFAULT_TEXT_EFFECT_CUSTOM_COLORS.color1;
    const textFxColor2Input = document.getElementById('theme-textfx-color-2');
    if (textFxColor2Input) textFxColor2Input.value = DEFAULT_TEXT_EFFECT_CUSTOM_COLORS.color2;
    const textFxColor3Input = document.getElementById('theme-textfx-color-3');
    if (textFxColor3Input) textFxColor3Input.value = DEFAULT_TEXT_EFFECT_CUSTOM_COLORS.color3;
    const textFxColor4Input = document.getElementById('theme-textfx-color-4');
    if (textFxColor4Input) textFxColor4Input.value = DEFAULT_TEXT_EFFECT_CUSTOM_COLORS.color4;
    setTextEffectControlState(false, DEFAULT_TEXT_EFFECT_MODE, false);
    applyThemeTextEffects({
        logo: {
            mode: DEFAULT_TEXT_EFFECT_MODE,
            speed: DEFAULT_TEXT_EFFECT_SPEED,
            intensity: DEFAULT_TEXT_EFFECT_INTENSITY,
            angle: DEFAULT_TEXT_EFFECT_ANGLE,
            useColor4: false,
            applyToLogo: false,
            customColors: { ...DEFAULT_TEXT_EFFECT_CUSTOM_COLORS }
        }
    });

    const llmMoodInput = document.getElementById('theme-llm-mood');
    if (llmMoodInput) llmMoodInput.value = 'balanced';
    const llmStyleInput = document.getElementById('theme-llm-style');
    if (llmStyleInput) llmStyleInput.value = 'arcade';
    const llmEnergyInput = document.getElementById('theme-llm-energy');
    if (llmEnergyInput) llmEnergyInput.value = '60';
    const llmSaturationInput = document.getElementById('theme-llm-saturation');
    if (llmSaturationInput) llmSaturationInput.value = '65';
    const llmNotesInput = document.getElementById('theme-llm-notes');
    if (llmNotesInput) llmNotesInput.value = '';
    const llmPromptInput = document.getElementById('theme-llm-prompt');
    if (llmPromptInput) llmPromptInput.value = '';
    const llmPreferTextFxInput = document.getElementById('theme-llm-prefer-textfx');
    if (llmPreferTextFxInput) llmPreferTextFxInput.checked = true;
    const llmApplyLogoInput = document.getElementById('theme-llm-apply-logo');
    if (llmApplyLogoInput) llmApplyLogoInput.checked = true;
    const llmStatus = document.getElementById('theme-llm-status');
    if (llmStatus) {
        llmStatus.textContent = '';
        llmStatus.classList.remove('is-success', 'is-error');
    }
    updateLlmThemeRangeValueLabel('theme-llm-energy', 'theme-llm-energy-value');
    updateLlmThemeRangeValueLabel('theme-llm-saturation', 'theme-llm-saturation-value');

    setGradientAngleInputFromValue('160deg');
    updateGradientAngleValueLabel('160deg');
    applyGradientAnglePreview('160deg');
    
    clearBackgroundImage();
    clearTopBackgroundImage();
    clearTitleBackgroundImage();
    setBackgroundLayerDrafts([]);
    renderBackgroundLayerEditor();
    applyBackgroundImage(getThemeBackgroundConfigFromForm());
    setThemeFontControlsFromFonts(DEFAULT_THEME_FONTS);
    applyThemeFontsFromForm({ markUnsaved: false });

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
    clearBackgroundSlot('base');
}

export function clearTopBackgroundImage() {
    clearBackgroundSlot('top');
}

export function clearTitleBackgroundImage() {
    clearBackgroundSlot('title');
}

const BACKGROUND_SLOT_META = Object.freeze({
    base: {
        imageProp: 'currentBackgroundImage',
        imageNameProp: 'currentBackgroundImageName',
        inputId: 'bg-image-input',
        previewId: 'bg-preview',
        previewImgId: 'bg-preview-img',
        imageNameId: 'bg-image-name',
        clearBtnId: 'clear-bg-image-btn',
        overrideKey: 'image'
    },
    top: {
        imageProp: 'currentTopBackgroundImage',
        imageNameProp: 'currentTopBackgroundImageName',
        inputId: 'bg-top-image-input',
        previewId: 'bg-top-preview',
        previewImgId: 'bg-top-preview-img',
        imageNameId: 'bg-top-image-name',
        clearBtnId: 'clear-bg-top-image-btn',
        overrideKey: 'topImage'
    },
    title: {
        imageProp: 'currentTitleBackgroundImage',
        imageNameProp: 'currentTitleBackgroundImageName',
        inputId: 'bg-title-image-input',
        previewId: 'bg-title-preview',
        previewImgId: 'bg-title-preview-img',
        imageNameId: 'bg-title-image-name',
        clearBtnId: 'clear-bg-title-image-btn',
        overrideKey: 'titleImage'
    }
});

function getBackgroundSlotMeta(slot) {
    const key = String(slot || '').trim().toLowerCase();
    return BACKGROUND_SLOT_META[key] || BACKGROUND_SLOT_META.base;
}

function writeBackgroundSlotUi(meta, imageData, fileName) {
    const preview = document.getElementById(meta.previewId);
    const previewImg = document.getElementById(meta.previewImgId);
    if (preview && previewImg && imageData) {
        previewImg.src = imageData;
        preview.style.display = 'block';
    } else if (preview) {
        preview.style.display = 'none';
    }

    const name = document.getElementById(meta.imageNameId);
    if (name) {
        name.textContent = fileName ? `Selected: ${fileName}` : '';
    }

    const clearBtn = document.getElementById(meta.clearBtnId);
    if (clearBtn) {
        clearBtn.style.display = imageData ? 'inline-block' : 'none';
    }
}

function clearBackgroundSlot(slot) {
    const meta = getBackgroundSlotMeta(slot);
    window[meta.imageProp] = null;
    window[meta.imageNameProp] = '';

    const input = document.getElementById(meta.inputId);
    if (input) input.value = '';

    writeBackgroundSlotUi(meta, null, '');

    applyBackgroundImage(getThemeBackgroundConfigFromForm({ [meta.overrideKey]: null }));
}

function handleBackgroundSlotUpload(event, slot) {
    const file = event?.target?.files?.[0];
    if (!file) return;

    const meta = getBackgroundSlotMeta(slot);
    const reader = new FileReader();
    reader.onload = (e) => {
        const imageData = typeof e?.target?.result === 'string' ? e.target.result : '';
        if (!imageData) return;

        window[meta.imageProp] = imageData;
        window[meta.imageNameProp] = file.name;
        writeBackgroundSlotUi(meta, imageData, file.name);

        hasUnsavedChanges = true;
        const overrides = { [meta.overrideKey]: imageData };
        if (meta.overrideKey === 'image') {
            overrides.imagePath = file.path || null;
        }
        applyBackgroundImage(getThemeBackgroundConfigFromForm(overrides));
    };
    reader.readAsDataURL(file);
}

export function setupColorPickerListeners() {
    const root = document.documentElement;
    setupThemeCustomizationControls();
    const colorMap = {
        'color-bg-primary': '--bg-primary',
        'color-text-primary': '--text-primary',
        'color-text-secondary': '--text-secondary',
        'color-text-tertiary': '--text-tertiary',
        'color-accent': '--accent-color',
        'color-accent-hover': '--accent-hover',
        'color-brand': '--brand-color',
        'color-bg-secondary': '--bg-secondary',
        'color-border': '--border-color',
        'color-bg-header': '--bg-header',
        'color-bg-sidebar': '--bg-sidebar',
        'color-bg-actionbar': '--bg-actionbar',
        'color-bg-tertiary': '--bg-tertiary',
        'color-bg-quaternary': '--bg-quaternary',
        'color-success': '--success-color',
        'color-danger': '--danger-color',
        'color-warning': '--warning-color',
        'color-glass-surface': '--glass-surface',
        'color-glass-surface-strong': '--glass-surface-strong',
        'color-glass-border': '--glass-border',
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

            if (id === 'theme-basic-brand-color') {
                if (getThemeEditorMode() === 'basic') {
                    applyBasicPaletteToInputs();
                    return;
                }
                applyBrandControlsToCurrentInputs();
                return;
            }

            if (id === 'color-accent' || id === 'color-text-secondary') {
                if (getThemeEditorMode() !== 'basic') {
                    applyBrandControlsToCurrentInputs({ markUnsaved: false });
                    return;
                }
            }
            
            if (colorMap[id]) {
                root.style.setProperty(colorMap[id], color);
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
    bindWithClone('bg-title-image-input', 'change', handleTitleBackgroundImageUpload);

    bindWithClone('bg-target-select', 'change', () => {
        const targetSelect = document.getElementById('bg-target-select');
        if (targetSelect) {
            ensureBackgroundSurfaceDraft().target = normalizeBackgroundSurfaceTarget(targetSelect.value);
        }
        syncBackgroundSurfaceControls();
    });

    const onSurfaceSettingsChanged = () => {
        updateBackgroundSurfaceDraftFromControls();
        syncBackgroundSurfaceControls();
        hasUnsavedChanges = true;
        applyBackgroundImage(getThemeBackgroundConfigFromForm());
    };
    bindWithClone('bg-position', 'change', onSurfaceSettingsChanged);
    bindWithClone('bg-background-repeat', 'change', onSurfaceSettingsChanged);
    bindWithClone('bg-scale', 'change', onSurfaceSettingsChanged);
    bindWithClone('bg-offset-x', 'input', onSurfaceSettingsChanged);
    bindWithClone('bg-offset-y', 'input', onSurfaceSettingsChanged);

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
            } else if (action === 'toggle') {
                backgroundLayerDrafts[index].collapsed = !backgroundLayerDrafts[index].collapsed;
                renderBackgroundLayerEditor();
                return;
            }

            hasUnsavedChanges = true;
            renderBackgroundLayerEditor();
            applyBackgroundImage(getThemeBackgroundConfigFromForm());
        });

        clone.addEventListener('input', (event) => {
            const field = event.target?.dataset?.layerField;
            if (field !== 'opacity' && field !== 'offsetX' && field !== 'offsetY') return;
            const card = event.target.closest('[data-layer-index]');
            if (!card) return;
            const index = Number.parseInt(card.dataset.layerIndex, 10);
            if (!Number.isInteger(index) || index < 0 || index >= backgroundLayerDrafts.length) return;
            const layer = backgroundLayerDrafts[index];
            if (!layer) return;

            if (field === 'opacity') {
                const nextOpacity = clampNumber(Number.parseInt(event.target.value, 10) / 100, 0, 1);
                layer.opacity = nextOpacity;
                const valueLabel = card.querySelector('.bg-layer-range-value');
                if (valueLabel) valueLabel.textContent = `${Math.round(nextOpacity * 100)}%`;
            } else if (field === 'offsetX') {
                layer.offsetX = normalizeBackgroundLayerOffset(event.target.value);
            } else if (field === 'offsetY') {
                layer.offsetY = normalizeBackgroundLayerOffset(event.target.value);
            }
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

            if (field === 'offsetX' || field === 'offsetY' || field === 'opacity') {
                // Handled live in the input listener for immediate repaint.
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
            } else if (field === 'belowTitleBar') {
                layer.belowTitleBar = Boolean(event.target.checked);
                hasUnsavedChanges = true;
                applyBackgroundImage(getThemeBackgroundConfigFromForm());
                return;
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

    bindWithClone('clear-bg-title-image-btn', 'click', () => {
        clearTitleBackgroundImage();
        hasUnsavedChanges = true;
    });

    syncBackgroundSurfaceControls();
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
        const collapsed = !!safeLayer.collapsed;
        const preview = safeLayer.image
            ? `<div class="bg-preview"><img src="${escapeHtml(safeLayer.image)}" alt="Layer preview"></div>`
            : '';
        return `
            <div class="bg-layer-card${collapsed ? ' is-collapsed' : ''}" data-layer-index="${index}">
                <div class="bg-layer-card-header">
                    <h6 class="bg-layer-title">${escapeHtml(title)}</h6>
                    <div class="bg-layer-actions">
                        <button type="button" class="action-btn small bg-layer-toggle-btn" data-layer-action="toggle" title="${collapsed ? 'Expand layer' : 'Collapse layer'}">${collapsed ? 'Expand' : 'Collapse'}</button>
                        <button type="button" class="action-btn small" data-layer-action="up" title="Move up">Up</button>
                        <button type="button" class="action-btn small" data-layer-action="down" title="Move down">Down</button>
                        <button type="button" class="action-btn small remove-btn" data-layer-action="remove" title="Remove layer">Remove</button>
                    </div>
                </div>
                <div class="bg-layer-card-body">
                    <div class="form-group">
                        <label>Layer Name:</label>
                        <input type="text" data-layer-field="name" value="${escapeHtml(safeLayer.name)}" placeholder="Optional label">
                    </div>
                    <div class="form-group">
                        <label>Upload Image:</label>
                        <input type="file" accept="image/*" data-layer-field="imageFile">
                        <span class="image-name">${escapeHtml(imageName)}</span>
                    </div>
                    <div class="form-group">
                        <label class="bg-layer-checkbox">
                            <input type="checkbox" data-layer-field="belowTitleBar"${safeLayer.belowTitleBar ? ' checked' : ''}>
                            <span>Below title bar</span>
                        </label>
                    </div>
                    <div class="bg-layer-grid">
                        <div class="form-group">
                            <label>Position:</label>
                            <select data-layer-field="position">${getSelectOptionsMarkup(BACKGROUND_LAYER_POSITIONS, safeLayer.position)}</select>
                        </div>
                        <div class="form-group">
                            <label>Offset X (px):</label>
                            <input type="number" step="1" data-layer-field="offsetX" value="${safeLayer.offsetX}">
                        </div>
                        <div class="form-group">
                            <label>Offset Y (px):</label>
                            <input type="number" step="1" data-layer-field="offsetY" value="${safeLayer.offsetY}">
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
            </div>
        `;
    }).join('');
}

function getThemeBackgroundConfigFromForm(overrides = {}) {
    const hasImageOverride = Object.prototype.hasOwnProperty.call(overrides, 'image');
    const hasTopImageOverride = Object.prototype.hasOwnProperty.call(overrides, 'topImage');
    const hasTitleImageOverride = Object.prototype.hasOwnProperty.call(overrides, 'titleImage');
    const image = hasImageOverride ? overrides.image : (window.currentBackgroundImage || null);
    const topImage = hasTopImageOverride ? overrides.topImage : (window.currentTopBackgroundImage || null);
    const titleImage = hasTitleImageOverride ? overrides.titleImage : (window.currentTitleBackgroundImage || null);
    const surfaceDraft = ensureBackgroundSurfaceDraft();
    const basePositionValue = normalizeBaseBackgroundPosition(surfaceDraft.base?.position || 'centered');
    const baseRepeat = normalizeBackgroundLayerRepeat(surfaceDraft.base?.repeat || 'no-repeat');
    const baseScale = normalizeBaseBackgroundScale(surfaceDraft.base?.scale || 'crop');
    const baseOffsetX = normalizeBackgroundLayerOffset(surfaceDraft.base?.offsetX || 0);
    const baseOffsetY = normalizeBackgroundLayerOffset(surfaceDraft.base?.offsetY || 0);
    const baseBehavior = basePositionValue === 'fixed' ? 'fixed' : 'scroll';
    const basePosition = (basePositionValue === 'fixed' || basePositionValue === 'centered')
        ? 'center center'
        : normalizeBackgroundLayerPosition(basePositionValue);

    const topPosition = normalizeBackgroundLayerPosition(surfaceDraft.top?.position || 'top center');
    const topRepeat = normalizeBackgroundLayerRepeat(surfaceDraft.top?.repeat || 'no-repeat');
    const topScale = normalizeBackgroundLayerSize(surfaceDraft.top?.scale || '100% auto');
    const topOffsetX = normalizeBackgroundLayerOffset(surfaceDraft.top?.offsetX || 0);
    const topOffsetY = normalizeBackgroundLayerOffset(surfaceDraft.top?.offsetY || 0);

    const titlePosition = normalizeBackgroundLayerPosition(surfaceDraft.title?.position || 'center center');
    const titleRepeat = normalizeBackgroundLayerRepeat(surfaceDraft.title?.repeat || 'no-repeat');
    const titleScale = normalizeBackgroundLayerSize(surfaceDraft.title?.scale || 'cover');
    const titleOffsetX = normalizeBackgroundLayerOffset(surfaceDraft.title?.offsetX || 0);
    const titleOffsetY = normalizeBackgroundLayerOffset(surfaceDraft.title?.offsetY || 0);

    const layers = [];
    if (image) {
        layers.push(createBackgroundLayerDraft({
            id: 'base',
            image,
            imageName: window.currentBackgroundImageName || '',
            position: basePosition,
            size: mapLegacyScaleToLayerSize(baseScale),
            repeat: baseRepeat,
            behavior: baseBehavior,
            opacity: 1,
            blendMode: 'normal',
            offsetX: baseOffsetX,
            offsetY: baseOffsetY
        }));
    }

    if (topImage) {
        layers.push(createBackgroundLayerDraft({
            id: 'top',
            image: topImage,
            imageName: window.currentTopBackgroundImageName || '',
            position: topPosition,
            size: topScale,
            repeat: topRepeat,
            behavior: 'scroll',
            opacity: 1,
            blendMode: 'normal',
            offsetX: topOffsetX,
            offsetY: topOffsetY
        }));
    }

    const extraLayers = cloneBackgroundLayerDrafts(backgroundLayerDrafts).map((layer) => {
        const clean = { ...layer };
        delete clean.collapsed;
        return clean;
    });
    layers.push(...extraLayers);

    return {
        image,
        imagePath: null,
        position: baseBehavior === 'fixed' ? 'fixed' : 'centered',
        basePosition,
        baseBehavior,
        scale: baseScale,
        baseScale,
        repeat: baseRepeat,
        baseRepeat,
        baseOffsetX,
        baseOffsetY,
        topImage,
        topHeight: 220,
        topOpacity: 1,
        topScale,
        topRepeat,
        topPosition,
        topOffsetX,
        topOffsetY,
        titleImage,
        titleOpacity: 0.36,
        titleSize: titleScale,
        titleScale,
        titleRepeat,
        titlePosition,
        titleOffsetX,
        titleOffsetY,
        editTarget: normalizeBackgroundSurfaceTarget(surfaceDraft.target),
        layers,
        ...overrides
    };
}

function handleBackgroundImageUpload(event) {
    handleBackgroundSlotUpload(event, 'base');
}

function handleTopBackgroundImageUpload(event) {
    handleBackgroundSlotUpload(event, 'top');
}

function handleTitleBackgroundImageUpload(event) {
    handleBackgroundSlotUpload(event, 'title');
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

export function saveTheme() {
    const name = document.getElementById('theme-name').value.trim();
    if (!name) {
        alert(i18n.t('messages.enterThemeName'));
        return;
    }

    const existingTheme = editingThemeId ? getCustomThemes().find((t) => t.id === editingThemeId) : null;
    const existingFonts = resolveThemeFonts(existingTheme?.fonts || null);
    const formFonts = getThemeFontsFromForm(existingFonts);
    const backgroundConfig = getThemeBackgroundConfigFromForm();
    const textFxConfig = getTextEffectConfigFromForm();
    
    const theme = {
        id: editingThemeId || 'custom_' + Date.now(),
        name: name,
        colors: {
            bgPrimary: document.getElementById('color-bg-primary').value,
            textPrimary: document.getElementById('color-text-primary').value,
            textSecondary: document.getElementById('color-text-secondary').value,
            textTertiary: document.getElementById('color-text-tertiary')?.value || '',
            accentColor: document.getElementById('color-accent').value,
            accentHover: document.getElementById('color-accent-hover')?.value || '',
            brandColor: document.getElementById('color-brand')?.value || '',
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
            dangerColor: document.getElementById('color-danger').value,
            warningColor: document.getElementById('color-warning')?.value || '',
            glassSurface: document.getElementById('color-glass-surface')?.value || '',
            glassSurfaceStrong: document.getElementById('color-glass-surface-strong')?.value || '',
            glassBorder: document.getElementById('color-glass-border')?.value || ''
        },
        background: backgroundConfig,
        cardEffects: {
            glassEffect: document.getElementById('glass-effect-toggle').checked
        },
        fonts: {
            body: formFonts.body,
            heading: formFonts.heading,
            pixelMode: formFonts.pixelMode
        },
        textEffects: {
            logo: {
                enabled: textFxConfig.enabled,
                mode: textFxConfig.mode,
                speed: textFxConfig.speed,
                intensity: textFxConfig.intensity,
                angle: textFxConfig.angle,
                useColor4: textFxConfig.useColor4,
                applyToLogo: textFxConfig.applyToLogo,
                customColors: {
                    color1: textFxConfig.customColors.color1,
                    color2: textFxConfig.customColors.color2,
                    color3: textFxConfig.customColors.color3,
                    color4: textFxConfig.customColors.color4
                }
            }
        },
        editor: {
            customizationMode: getThemeEditorMode(),
            basicBaseColor: document.getElementById('theme-base-color')?.value || '#5aa9ff',
            basicVariant: normalizeBasicVariant(document.getElementById('theme-basic-variant')?.value || 'auto'),
            basicIntensity: normalizeBasicIntensity(document.getElementById('theme-basic-intensity')?.value || 100),
            basicBrandEnabled: normalizeBasicBrandUseAccent(document.getElementById('theme-basic-brand-use-accent')?.checked ?? true),
            basicBrandSource: getBasicBrandModeFromControls(),
            basicBrandStrength: normalizeBasicBrandStrength(document.getElementById('theme-basic-brand-strength')?.value || DEFAULT_BASIC_BRAND_STRENGTH),
            basicBrandColor: document.getElementById('theme-basic-brand-color')?.value || '',
            textEffectEnabled: textFxConfig.enabled,
            textEffectMode: textFxConfig.mode,
            textEffectSpeed: textFxConfig.speed,
            textEffectIntensity: textFxConfig.intensity,
            textEffectAngle: textFxConfig.angle,
            textEffectUseColor4: textFxConfig.useColor4,
            textEffectApplyToLogo: textFxConfig.applyToLogo,
            textEffectColor1: textFxConfig.customColors.color1,
            textEffectColor2: textFxConfig.customColors.color2,
            textEffectColor3: textFxConfig.customColors.color3,
            textEffectColor4: textFxConfig.customColors.color4
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
