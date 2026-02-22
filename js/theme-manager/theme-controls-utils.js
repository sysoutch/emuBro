import {
    FONT_PRESET_STACKS,
    DEFAULT_THEME_FONTS,
    DEFAULT_TEXT_EFFECT_MODE,
    DEFAULT_TEXT_EFFECT_SPEED,
    DEFAULT_TEXT_EFFECT_INTENSITY,
    DEFAULT_TEXT_EFFECT_CUSTOM_COLORS,
    DEFAULT_TEXT_EFFECT_ANGLE
} from './presets';
import {
    normalizeToggleBoolean,
    normalizeTextEffectMode,
    normalizeTextEffectCustomColors,
    normalizeTextEffectAngle,
    normalizeTextEffectSpeed,
    normalizeTextEffectIntensity,
    resolveThemeTextEffectConfig
} from './theme-algorithms';

export function resolveThemeFonts(fonts = null) {
    const resolved = {
        body: typeof fonts?.body === 'string' && fonts.body.trim().length > 0 ? fonts.body : DEFAULT_THEME_FONTS.body,
        heading: typeof fonts?.heading === 'string' && fonts.heading.trim().length > 0 ? fonts.heading : DEFAULT_THEME_FONTS.heading,
        pixelMode: Boolean(fonts?.pixelMode)
    };
    return resolved;
}

export function applyThemeFonts(fonts = null) {
    const root = document.documentElement;
    const resolved = resolveThemeFonts(fonts);
    root.style.setProperty('--font-body', resolved.body);
    root.style.setProperty('--font-heading', resolved.heading);
    root.setAttribute('data-font-pixel', resolved.pixelMode ? 'true' : 'false');
}

export function getFontPresetFromStack(stackValue) {
    const normalized = String(stackValue || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const entries = Object.entries(FONT_PRESET_STACKS);
    for (const [preset, stack] of entries) {
        const normalizedStack = String(stack || '').trim().toLowerCase().replace(/\s+/g, ' ');
        if (normalized === normalizedStack) return preset;
    }
    return 'custom';
}

export function setThemeFontControlState() {
    const bodyPreset = document.getElementById('theme-font-body-preset');
    const headingPreset = document.getElementById('theme-font-heading-preset');
    const bodyCustom = document.getElementById('theme-font-body-custom');
    const headingCustom = document.getElementById('theme-font-heading-custom');
    if (bodyCustom) bodyCustom.disabled = (bodyPreset?.value || 'quicksand') !== 'custom';
    if (headingCustom) headingCustom.disabled = (headingPreset?.value || 'quicksand') !== 'custom';
}

export function setThemeFontControlsFromFonts(fonts = null) {
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

export function getThemeFontsFromForm(fallbackFonts = null) {
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

export function updateTextEffectSpeedValueLabel(speedValue) {
    const label = document.getElementById('theme-textfx-speed-value');
    if (!label) return;
    const normalized = normalizeTextEffectSpeed(speedValue);
    label.textContent = `${normalized}s`;
}

export function updateTextEffectIntensityValueLabel(intensityValue) {
    const label = document.getElementById('theme-textfx-intensity-value');
    if (!label) return;
    const normalized = normalizeTextEffectIntensity(intensityValue);
    label.textContent = `${normalized}%`;
}

export function updateTextEffectAngleValueLabel(angleValue) {
    const label = document.getElementById('theme-textfx-angle-value');
    if (!label) return;
    const normalized = normalizeTextEffectAngle(angleValue);
    label.textContent = `${normalized}deg`;
}

export function setTextEffectControlState(enabledValue, modeValue = null, useColor4Value = false) {
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

export function getTextEffectConfigFromForm() {
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

export function applyThemeTextEffects(themeOrConfig = null) {
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
