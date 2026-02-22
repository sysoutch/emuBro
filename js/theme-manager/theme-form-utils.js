/**
 * Theme form utilities
 */

import {
    updateBasicIntensityValueLabel,
    updateGradientAngleValueLabel,
    setGradientAngleInputFromValue,
    applyGradientAnglePreview
} from './editor-utils';
import {
    DEFAULT_TEXT_EFFECT_SPEED,
    DEFAULT_TEXT_EFFECT_INTENSITY,
    DEFAULT_TEXT_EFFECT_ANGLE,
    DEFAULT_BASIC_BRAND_MODE,
    DEFAULT_BASIC_BRAND_STRENGTH
} from './presets';
import {
    updateTextEffectSpeedValueLabel,
    updateTextEffectIntensityValueLabel,
    updateTextEffectAngleValueLabel
} from './theme-controls-utils';

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
    const form = document.getElementById('theme-form');
    if (form) form.style.display = 'flex';
}

export function hideThemeForm(options = {}) {
    const { setTheme, currentTheme, setEditingThemeId } = options;
    const form = document.getElementById('theme-form');
    if (form) form.style.display = 'none';
    if (typeof setEditingThemeId === 'function') {
        setEditingThemeId(null);
    }
    if (typeof setTheme === 'function') {
        setTheme(currentTheme, { force: true, allowSameForce: true });
    }
}

export function resetThemeForm(options = {}) {
    const {
        setBackgroundSurfaceDraftFromConfig,
        syncBackgroundSurfaceControls,
        getBackgroundSurfaceDraft,
        setBackgroundSurfaceDraft,
        clearBackgroundImage,
        clearTopBackgroundImage,
        clearTitleBackgroundImage,
        setBackgroundLayerDrafts,
        renderBackgroundLayerEditor,
        escapeHtml,
        createBackgroundLayerDraft,
        layerPositions,
        layerSizeOptions,
        layerRepeatOptions,
        layerBehaviorOptions,
        layerBlendOptions,
        applyBackgroundImage,
        buildBackgroundConfig,
        setThemeFontControlsFromFonts,
        DEFAULT_THEME_FONTS,
        applyThemeFontsFromForm,
        normalizeThemeCustomizationMode,
        THEME_EDITOR_MODE_STORAGE_KEY,
        setThemeEditorMode,
        setupThemeCustomizationControls,
        applyBasicPaletteToInputs,
        applyColorInputsPreview,
        setBasicBrandModeInControls,
        setBasicBrandControlState,
        setTextEffectControlState,
        applyThemeTextEffects,
        DEFAULT_TEXT_EFFECT_MODE,
        DEFAULT_TEXT_EFFECT_CUSTOM_COLORS,
        updateLlmThemeRangeValueLabel
    } = options;

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

    setBackgroundSurfaceDraftFromConfig({}, setBackgroundSurfaceDraft);
    syncBackgroundSurfaceControls(getBackgroundSurfaceDraft, setBackgroundSurfaceDraft);

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

    updateColorTexts();

    setGradientAngleInputFromValue('160deg');
    updateGradientAngleValueLabel('160deg');
    applyGradientAnglePreview('160deg');

    clearBackgroundImage();
    clearTopBackgroundImage();
    clearTitleBackgroundImage();
    setBackgroundLayerDrafts([]);
    renderBackgroundLayerEditor({
        getBackgroundLayerDrafts: () => (typeof options.getBackgroundLayerDrafts === 'function' ? options.getBackgroundLayerDrafts() : []),
        escapeHtml,
        createBackgroundLayerDraft,
        layerPositions,
        layerSizeOptions,
        layerRepeatOptions,
        layerBehaviorOptions,
        layerBlendOptions
    });
    applyBackgroundImage(buildBackgroundConfig());
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

export function setupColorPickerListeners(options = {}) {
    const {
        updateColorTexts,
        applyColorInputsPreview,
        applyBasicPaletteToInputs,
        applyBrandControlsToCurrentInputs,
        getThemeEditorMode,
        normalizeGradientAngle,
        updateGradientAngleValueLabel,
        applyGradientAnglePreview,
        setGradientAngleInputFromValue,
        setHasUnsavedChanges
    } = options;

    const root = document.documentElement;
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
            if (typeof updateColorTexts === 'function') updateColorTexts();
            if (typeof setHasUnsavedChanges === 'function') setHasUnsavedChanges(true);
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
            if (typeof setHasUnsavedChanges === 'function') setHasUnsavedChanges(true);
        };

        replacement.addEventListener('input', handleAngleUpdate);
        replacement.addEventListener('change', handleAngleUpdate);

        const currentAngle = normalizeGradientAngle(`${replacement.value || '160'}deg`);
        setGradientAngleInputFromValue(currentAngle);
        updateGradientAngleValueLabel(currentAngle);
        applyGradientAnglePreview(currentAngle);
    }

}
