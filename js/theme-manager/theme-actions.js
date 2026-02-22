/**
 * Theme actions (save/edit/delete)
 */

export function saveTheme(options = {}) {
    const {
        editingThemeId,
        i18n,
        getCustomThemes,
        saveCustomTheme,
        hideThemeForm,
        resolveThemeFonts,
        getThemeFontsFromForm,
        getTextEffectConfigFromForm,
        buildBackgroundConfig,
        getThemeEditorMode,
        normalizeGradientAngle,
        normalizeBasicVariant,
        normalizeBasicIntensity,
        normalizeBasicBrandUseAccent,
        normalizeBasicBrandStrength,
        DEFAULT_BASIC_BRAND_STRENGTH,
        getBasicBrandModeFromControls,
        setHasUnsavedChanges
    } = options;

    const name = document.getElementById('theme-name')?.value.trim() || '';
    if (!name) {
        alert(i18n.t('messages.enterThemeName'));
        return;
    }

    const existingTheme = editingThemeId ? getCustomThemes().find((t) => t.id === editingThemeId) : null;
    const existingFonts = resolveThemeFonts(existingTheme?.fonts || null);
    const formFonts = getThemeFontsFromForm(existingFonts);
    const backgroundConfig = buildBackgroundConfig();
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
    if (typeof setHasUnsavedChanges === 'function') {
        setHasUnsavedChanges(false);
    }
    if (typeof hideThemeForm === 'function') {
        hideThemeForm();
    }
    alert(i18n.t('theme.saved'));
}

export function deleteCustomTheme(options = {}) {
    const {
        id,
        currentTheme,
        getCustomThemes,
        setTheme,
        updateThemeSelector,
        renderThemeManager,
        i18n
    } = options;

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

export function editTheme(options = {}) {
    const {
        theme,
        i18n,
        setHasUnsavedChanges,
        setEditingThemeId,
        resolveThemeColorsForRuntime,
        deriveThemeVisualVars,
        parseColorToHex,
        normalizeGradientAngle,
        setGradientAngleInputFromValue,
        updateGradientAngleValueLabel,
        setBackgroundSurfaceDraftFromConfig,
        syncBackgroundSurfaceControls,
        getBackgroundSurfaceDraft,
        setBackgroundSurfaceDraft,
        clearBackgroundImage,
        clearTopBackgroundImage,
        clearTitleBackgroundImage,
        extractAdditionalLayerDrafts,
        setBackgroundLayerDrafts,
        getBackgroundLayerDrafts,
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
        normalizeBasicVariant,
        inferBasicVariantFromTheme,
        normalizeBasicIntensity,
        updateBasicIntensityValueLabel,
        resolveBrandEditorConfig,
        setBasicBrandModeInControls,
        updateBasicBrandStrengthValueLabel,
        setBasicBrandControlState,
        resolveThemeTextEffectConfig,
        DEFAULT_TEXT_EFFECT_MODE,
        DEFAULT_TEXT_EFFECT_ANGLE,
        DEFAULT_TEXT_EFFECT_CUSTOM_COLORS,
        setTextEffectControlState,
        updateTextEffectSpeedValueLabel,
        updateTextEffectIntensityValueLabel,
        updateTextEffectAngleValueLabel,
        applyThemeTextEffects,
        setThemeFontControlsFromFonts,
        DEFAULT_THEME_FONTS,
        applyThemeFontsFromForm,
        setThemeEditorMode,
        THEME_EDITOR_MODE_STORAGE_KEY,
        updateColorTexts,
        showThemeForm,
        setupThemeCustomizationControls,
        setupBackgroundImageListeners,
        setupColorPickerListeners
    } = options;

    if (!theme) return;
    if (typeof setHasUnsavedChanges === 'function') {
        setHasUnsavedChanges(false);
    }
    if (typeof setEditingThemeId === 'function') {
        setEditingThemeId(theme.id);
    }
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
        setBackgroundSurfaceDraftFromConfig(theme.background, setBackgroundSurfaceDraft);
        syncBackgroundSurfaceControls(getBackgroundSurfaceDraft, setBackgroundSurfaceDraft);

        if (theme.background.image) {
            window.currentBackgroundImage = theme.background.image;
            if (!theme.background.image.startsWith('data:')) {
                window.currentBackgroundImageName = theme.background.image;
            } else {
                window.currentBackgroundImageName = 'background';
            }

            const previewImg = document.getElementById('bg-preview-img');
            const preview = document.getElementById('bg-preview');
            if (previewImg && preview) {
                previewImg.src = theme.background.image;
                preview.style.display = 'block';
            }
            const name = document.getElementById('bg-image-name');
            if (name) {
                name.textContent = window.currentBackgroundImageName === 'background'
                    ? i18n.t('theme.backgroundImageLoaded')
                    : `${window.currentBackgroundImageName}`;
            }
            const clearBtn = document.getElementById('clear-bg-image-btn');
            if (clearBtn) clearBtn.style.display = 'inline-block';
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
        renderBackgroundLayerEditor({
            getBackgroundLayerDrafts: () => (typeof getBackgroundLayerDrafts === 'function' ? getBackgroundLayerDrafts() : []),
            escapeHtml,
            createBackgroundLayerDraft,
            layerPositions,
            layerSizeOptions,
            layerRepeatOptions,
            layerBehaviorOptions,
            layerBlendOptions
        });
        applyBackgroundImage(buildBackgroundConfig());
    } else {
        setBackgroundSurfaceDraftFromConfig({}, setBackgroundSurfaceDraft);
        syncBackgroundSurfaceControls(getBackgroundSurfaceDraft, setBackgroundSurfaceDraft);
        clearBackgroundImage();
        clearTopBackgroundImage();
        clearTitleBackgroundImage();
        setBackgroundLayerDrafts([]);
        renderBackgroundLayerEditor({
            getBackgroundLayerDrafts: () => (typeof getBackgroundLayerDrafts === 'function' ? getBackgroundLayerDrafts() : []),
            escapeHtml,
            createBackgroundLayerDraft,
            layerPositions,
            layerSizeOptions,
            layerRepeatOptions,
            layerBehaviorOptions,
            layerBlendOptions
        });
        applyBackgroundImage(buildBackgroundConfig());
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
