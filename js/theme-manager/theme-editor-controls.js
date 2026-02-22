/**
 * Theme editor control wiring
 */

import { parseColorToHex } from '../ui-utils';
import {
    DEFAULT_TEXT_EFFECT_MODE,
    DEFAULT_TEXT_EFFECT_SPEED,
    DEFAULT_TEXT_EFFECT_INTENSITY,
    DEFAULT_TEXT_EFFECT_ANGLE
} from './presets';
import {
    normalizeTextEffectMode,
    normalizeTextEffectSpeed,
    normalizeTextEffectIntensity,
    normalizeTextEffectAngle
} from './theme-algorithms';
import {
    normalizeGradientAngle,
    setGradientAngleInputFromValue,
    updateGradientAngleValueLabel,
    applyGradientAnglePreview
} from './editor-utils';
import { deriveThemeVisualVars } from './theme-color-utils';
import {
    updateTextEffectSpeedValueLabel,
    updateTextEffectIntensityValueLabel,
    updateTextEffectAngleValueLabel
} from './theme-controls-utils';

export function applyGeneratedThemeToForm(result = {}, options = {}) {
    const {
        applyThemeTextEffectsFromForm,
        updateColorTexts,
        applyColorInputsPreview,
        applyBackgroundImage,
        buildBackgroundConfig,
        setHasUnsavedChanges
    } = options;

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
        if (typeof applyThemeTextEffectsFromForm === 'function') {
            applyThemeTextEffectsFromForm({ markUnsaved: false });
        }
    }

    const baseColorInput = document.getElementById('theme-base-color');
    const accentValue = parseColorToHex(document.getElementById('color-accent')?.value || '');
    if (baseColorInput && accentValue) {
        baseColorInput.value = accentValue;
    }

    if (typeof updateColorTexts === 'function') updateColorTexts();
    if (typeof applyColorInputsPreview === 'function') applyColorInputsPreview();
    if (typeof applyBackgroundImage === 'function' && typeof buildBackgroundConfig === 'function') {
        applyBackgroundImage(buildBackgroundConfig());
    }
    if (typeof setHasUnsavedChanges === 'function') {
        setHasUnsavedChanges(true);
    }
}

export function setupThemeCustomizationControls(options = {}) {
    const {
        emubro,
        getThemeLlmConfig,
        getThemeEditorMode,
        setThemeEditorMode,
        applyBasicPaletteToInputs,
        applyBrandControlsToCurrentInputs,
        applyThemeTextEffectsFromForm,
        applyThemeFontsFromForm,
        updateBasicIntensityValueLabel,
        updateBasicBrandStrengthValueLabel,
        setBasicBrandControlState,
        getBasicBrandModeFromControls,
        updateTextEffectSpeedValueLabel,
        updateTextEffectIntensityValueLabel,
        updateTextEffectAngleValueLabel,
        updateLlmThemeRangeValueLabel,
        getCurrentThemeColorInputsSnapshot
    } = options;

    const form = document.getElementById('theme-form');
    if (!form) return;

    const modeButtons = Array.from(document.querySelectorAll('.theme-mode-btn[data-theme-mode]'));
    modeButtons.forEach((button) => {
        const clone = button.cloneNode(true);
        button.parentNode.replaceChild(clone, button);
        clone.addEventListener('click', () => {
            const nextMode = clone.dataset.themeMode;
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
                }, options);
                setStatus(String(response.summary || 'AI theme applied.'), 'success');
            } catch (error) {
                setStatus(String(error?.message || error || 'Theme generation failed.'), 'error');
            } finally {
                clone.disabled = false;
            }
        });
    }
}
