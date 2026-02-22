export function createThemeEditorPreview(deps = {}) {
    const {
        DEFAULT_THEME_FONTS,
        DEFAULT_TEXT_EFFECT_MODE,
        DEFAULT_TEXT_EFFECT_CUSTOM_COLORS,
        getThemeFontsFromForm,
        applyThemeFonts,
        setThemeFontControlState,
        getTextEffectConfigFromForm,
        normalizeTextEffectMode,
        updateTextEffectSpeedValueLabel,
        updateTextEffectIntensityValueLabel,
        updateTextEffectAngleValueLabel,
        setTextEffectControlState,
        applyThemeTextEffects,
        updateColorTexts,
        collectThemeColorsFromInputs,
        applyThemeColorsToRoot,
        parseColorToHex,
        resolveBasicBrandColor,
        normalizeBasicBrandUseAccent,
        getBasicBrandModeFromControls,
        normalizeBasicBrandStrength,
        DEFAULT_BASIC_BRAND_STRENGTH,
        setBasicBrandModeInControls,
        updateBasicBrandStrengthValueLabel,
        setBasicBrandControlState,
        normalizeBasicIntensity,
        updateBasicIntensityValueLabel,
        resolveBasicVariantForEditor,
        buildBasicPalette,
        deriveThemeVisualVars,
        normalizeGradientAngle,
        updateGradientAngleValueLabel,
        applyGradientAnglePreview,
        setHasUnsavedChanges,
        documentRef = document
    } = deps;

    const markUnsaved = (options = {}) => {
        if (options.markUnsaved === false) return;
        if (typeof setHasUnsavedChanges === 'function') setHasUnsavedChanges(true);
    };

    function applyThemeFontsFromForm(options = {}) {
        const fonts = getThemeFontsFromForm(DEFAULT_THEME_FONTS);
        applyThemeFonts(fonts);
        setThemeFontControlState();
        markUnsaved(options);
    }

    function applyThemeTextEffectsFromForm(options = {}) {
        const enabledInput = documentRef.getElementById('theme-textfx-enabled');
        const applyToLogoInput = documentRef.getElementById('theme-textfx-apply-logo');
        const modeInput = documentRef.getElementById('theme-textfx-mode');
        const speedInput = documentRef.getElementById('theme-textfx-speed');
        const intensityInput = documentRef.getElementById('theme-textfx-intensity');
        const angleInput = documentRef.getElementById('theme-textfx-angle');
        const useColor4Input = documentRef.getElementById('theme-textfx-use-color-4');
        const color1Input = documentRef.getElementById('theme-textfx-color-1');
        const color2Input = documentRef.getElementById('theme-textfx-color-2');
        const color3Input = documentRef.getElementById('theme-textfx-color-3');
        const color4Input = documentRef.getElementById('theme-textfx-color-4');
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

        markUnsaved(options);
        return config;
    }

    function applyLogoBrandColorPreview(options = {}) {
        const root = documentRef.documentElement;
        const accentInput = documentRef.getElementById('color-accent');
        const textSecondaryInput = documentRef.getElementById('color-text-secondary');
        const brandInput = documentRef.getElementById('color-brand');
        const brandUseAccentInput = documentRef.getElementById('theme-basic-brand-use-accent');
        const brandStrengthInput = documentRef.getElementById('theme-basic-brand-strength');
        const basicBrandColorInput = documentRef.getElementById('theme-basic-brand-color');

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
        markUnsaved(options);
    }

    function applyColorInputsPreview() {
        applyThemeColorsToRoot(collectThemeColorsFromInputs());
        applyLogoBrandColorPreview({ markUnsaved: false });
        const themeForm = documentRef.getElementById('theme-form');
        if (themeForm && themeForm.style.display !== 'none') {
            applyThemeTextEffectsFromForm({ markUnsaved: false });
        }
    }

    function applyBasicPaletteToInputs(options = {}) {
        const baseColorInput = documentRef.getElementById('theme-base-color');
        const variantSelect = documentRef.getElementById('theme-basic-variant');
        const intensityInput = documentRef.getElementById('theme-basic-intensity');
        if (!baseColorInput || !variantSelect || !intensityInput) return;

        const intensity = normalizeBasicIntensity(intensityInput.value);
        updateBasicIntensityValueLabel(intensity);
        const resolvedVariant = resolveBasicVariantForEditor(baseColorInput.value, variantSelect.value);
        const palette = buildBasicPalette(baseColorInput.value, resolvedVariant, intensity);

        const brandUseAccentInput = documentRef.getElementById('theme-basic-brand-use-accent');
        const brandStrengthInput = documentRef.getElementById('theme-basic-brand-strength');
        const basicBrandColorInput = documentRef.getElementById('theme-basic-brand-color');
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
            const input = documentRef.getElementById(id);
            if (input) input.value = parseColorToHex(value) || value;
        });

        const angleInput = documentRef.getElementById('gradient-angle');
        if (angleInput) {
            const angleNum = Number.parseInt(String(palette.appGradientAngle).replace(/deg$/i, ''), 10);
            angleInput.value = String(Number.isFinite(angleNum) ? angleNum : 160);
            const normalizedAngle = normalizeGradientAngle(`${angleInput.value}deg`);
            updateGradientAngleValueLabel(normalizedAngle);
            applyGradientAnglePreview(normalizedAngle);
        }

        updateColorTexts();
        applyThemeColorsToRoot(palette);
        markUnsaved(options);
    }

    function applyBrandControlsToCurrentInputs(options = {}) {
        const brandUseAccentInput = documentRef.getElementById('theme-basic-brand-use-accent');
        const brandStrengthInput = documentRef.getElementById('theme-basic-brand-strength');
        const basicBrandColorInput = documentRef.getElementById('theme-basic-brand-color');
        const accentInput = documentRef.getElementById('color-accent');
        const textSecondaryInput = documentRef.getElementById('color-text-secondary');
        const brandInput = documentRef.getElementById('color-brand');
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
        if (basicBrandColorInput && brandEnabled && brandMode === 'custom') {
            basicBrandColorInput.value = parseColorToHex(manualBrandColor || nextLogoBrandColor) || nextLogoBrandColor;
        }

        documentRef.documentElement.style.setProperty('--logo-brand-color', parseColorToHex(nextLogoBrandColor) || nextLogoBrandColor);
        updateColorTexts();
        if (options.applyPreview !== false) {
            applyColorInputsPreview();
        }
        markUnsaved(options);
    }

    return {
        applyThemeFontsFromForm,
        applyThemeTextEffectsFromForm,
        applyLogoBrandColorPreview,
        applyColorInputsPreview,
        applyBasicPaletteToInputs,
        applyBrandControlsToCurrentInputs
    };
}
