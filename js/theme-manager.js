/**
 * Theme Manager
 */

import { 
    parseColorToHex, 
    flipLightness,
    darkenHex
} from './ui-utils';
import { requestDockLayoutRefresh } from './docking-manager';
import { updateLlmThemeRangeValueLabel, getThemeLlmConfig } from './theme-manager/llm-utils';
import { fetchCommunityThemes } from './theme-manager/marketplace-utils';
import { uploadTheme } from './theme-manager/theme-share-utils';
import { renderMarketplaceView } from './theme-manager/marketplace-view';
import {
    updateThemeSelector as updateThemeSelectorView,
    renderThemeManager as renderThemeManagerView,
    syncThemeManagerActiveItem as syncThemeManagerActiveItemView
} from './theme-manager/theme-library-view';
import {
    setupThemeCustomizationControls as setupThemeCustomizationControlsView
} from './theme-manager/theme-editor-controls';
import {
    saveTheme as saveThemeAction,
    editTheme as editThemeAction,
    deleteCustomTheme as deleteCustomThemeAction
} from './theme-manager/theme-actions';
import {
    updateColorTexts as updateColorTextsView,
    showThemeForm as showThemeFormView,
    hideThemeForm as hideThemeFormView,
    resetThemeForm as resetThemeFormView,
    setupColorPickerListeners as setupColorPickerListenersView
} from './theme-manager/theme-form-utils';
import { syncSplashThemePreference as syncSplashThemePreferenceView } from './theme-manager/theme-splash-utils';
import {
    toggleThemeColors as toggleThemeColorsView,
    toggleInvertFilter as toggleInvertFilterView,
    getBackgroundImageFromGrid
} from './theme-manager/theme-toggle-utils';
import {
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
    updateBasicBrandStrengthValueLabel,
    getBasicBrandModeFromControls,
    setBasicBrandModeInControls,
    setBasicBrandControlState
} from './theme-manager/brand-controls-utils';
import {
    BACKGROUND_LAYER_POSITIONS,
    BACKGROUND_LAYER_SIZE_OPTIONS,
    BACKGROUND_LAYER_REPEAT_OPTIONS,
    BACKGROUND_LAYER_BEHAVIOR_OPTIONS,
    BACKGROUND_LAYER_BLEND_OPTIONS,
    clampNumber,
    escapeHtml,
    normalizeBackgroundLayerPosition,
    normalizeBackgroundLayerSize,
    normalizeBackgroundLayerRepeat,
    normalizeBackgroundLayerBehavior,
    normalizeBackgroundLayerBlendMode,
    normalizeBackgroundLayerOpacity,
    normalizeBackgroundLayerOffset,
    normalizeBackgroundSurfaceTarget,
    normalizeBaseBackgroundPosition,
    normalizeBaseBackgroundScale,
    createBackgroundLayerDraft,
    extractBackgroundLayers,
    hasThemeBackgroundLayers,
    extractAdditionalLayerDrafts
} from './theme-manager/background-utils';
import {
    normalizeThemeCustomizationMode,
    normalizeBasicVariant,
    inferBasicVariantFromTheme,
    normalizeBasicIntensity,
    normalizeBasicBrandStrength,
    normalizeBasicBrandUseAccent,
    resolveBasicBrandColor,
    resolveBrandEditorConfig,
    normalizeTextEffectMode,
    resolveThemeTextEffectConfig,
    buildBasicPalette,
    resolveBasicVariantForEditor,
    resolveThemeColorsForRuntime,
    buildPaletteMatchedLogoTextEffect
} from './theme-manager/theme-algorithms';
import {
    resolveThemeFonts,
    applyThemeFonts,
    getFontPresetFromStack,
    setThemeFontControlState,
    setThemeFontControlsFromFonts,
    getThemeFontsFromForm,
    updateTextEffectSpeedValueLabel,
    updateTextEffectIntensityValueLabel,
    updateTextEffectAngleValueLabel,
    setTextEffectControlState,
    getTextEffectConfigFromForm,
    applyThemeTextEffects
} from './theme-manager/theme-controls-utils';
import {
    normalizeGradientAngle,
    updateGradientAngleValueLabel,
    setGradientAngleInputFromValue,
    applyGradientAnglePreview,
    updateBasicIntensityValueLabel
} from './theme-manager/editor-utils';
import {
    collectThemeColorsFromInputs,
    applyThemeColorsToRoot,
    deriveThemeVisualVars,
    clearThemeInlineVariables,
    getCurrentThemeColorInputsSnapshot,
    getCurrentThemeColors
} from './theme-manager/theme-color-utils';
import {
    ensureBackgroundSurfaceDraft,
    setBackgroundSurfaceDraftFromConfig,
    syncBackgroundSurfaceControls,
    updateBackgroundSurfaceDraftFromControls,
    setBackgroundLayerDrafts
} from './theme-manager/background-editor-utils';
import { renderBackgroundLayerEditor } from './theme-manager/background-layer-editor';
import { getThemeBackgroundConfigFromForm } from './theme-manager/background-config';
import { applyGlassEffect, applyCornerStyle } from './theme-manager/theme-style-utils';
import { createThemeEditorPreview } from './theme-manager/theme-editor-preview';
import { createThemeEditorMode } from './theme-manager/theme-editor-mode';
import { createThemeModalUtils } from './theme-manager/theme-modal-utils';
import { resolveThemeLogoBrandColor } from './theme-manager/theme-runtime-utils';
import {
    applyBackgroundImage,
    clearGameGridBackgroundLayers,
    disableFixedBackgroundTracking,
    enableFixedBackgroundTracking
} from './theme-manager/theme-background-apply';
import {
    setupBackgroundImageListeners as setupBackgroundImageListenersView,
    clearBackgroundImage as clearBackgroundImageView,
    clearTopBackgroundImage as clearTopBackgroundImageView,
    clearTitleBackgroundImage as clearTitleBackgroundImageView
} from './theme-manager/theme-background-editor';

export {
    getCurrentThemeColors,
    applyGlassEffect,
    applyCornerStyle,
    applyBackgroundImage,
    clearGameGridBackgroundLayers,
    disableFixedBackgroundTracking,
    enableFixedBackgroundTracking
};

const emubro = window.emubro;
const log = console;

let currentTheme = '';
let editingThemeId = null;
let hasUnsavedChanges = false;
let shouldUseAccentColorForBrand = true;
let backgroundLayerDrafts = [];
let backgroundSurfaceDraft = null;
let isApplyingTheme = false;
let queuedThemeApply = null;
let lastAppliedThemeId = '';
let lastAppliedThemeAt = 0;
const THEME_EDITOR_MODE_STORAGE_KEY = 'themeEditorCustomizationMode';
const getBackgroundSurfaceDraft = () => backgroundSurfaceDraft;
const setBackgroundSurfaceDraft = (next) => { backgroundSurfaceDraft = next; };
const setBackgroundLayerDraftsState = (next) => { backgroundLayerDrafts = next; };
const buildBackgroundConfig = (overrides = {}) => getThemeBackgroundConfigFromForm(overrides, {
    currentBackgroundImage: window.currentBackgroundImage || null,
    currentTopBackgroundImage: window.currentTopBackgroundImage || null,
    currentTitleBackgroundImage: window.currentTitleBackgroundImage || null,
    currentBackgroundImageName: window.currentBackgroundImageName || '',
    currentTopBackgroundImageName: window.currentTopBackgroundImageName || '',
    currentTitleBackgroundImageName: window.currentTitleBackgroundImageName || '',
    surfaceDraft: ensureBackgroundSurfaceDraft(getBackgroundSurfaceDraft, setBackgroundSurfaceDraft),
    backgroundLayerDrafts
});

const themeEditorPreview = createThemeEditorPreview({
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
    setHasUnsavedChanges: (value) => { hasUnsavedChanges = value; }
});

const themeEditorMode = createThemeEditorMode({
    normalizeThemeCustomizationMode,
    storageKey: THEME_EDITOR_MODE_STORAGE_KEY
});

const themeModalUtils = createThemeModalUtils({ clampNumber });

const {
    applyThemeFontsFromForm,
    applyThemeTextEffectsFromForm,
    applyLogoBrandColorPreview,
    applyColorInputsPreview,
    applyBasicPaletteToInputs,
    applyBrandControlsToCurrentInputs
} = themeEditorPreview;

const {
    getThemeEditorMode,
    setThemeEditorMode
} = themeEditorMode;

const {
    makeDraggable
} = themeModalUtils;

export { makeDraggable };

export const {
    resetManagedModalPosition,
    recenterManagedModalIfMostlyOutOfView
} = themeModalUtils;

export function setupThemeCustomizationControls() {
    setupThemeCustomizationControlsView({
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
        getCurrentThemeColorInputsSnapshot,
        updateColorTexts,
        applyColorInputsPreview,
        applyBackgroundImage,
        buildBackgroundConfig,
        setHasUnsavedChanges
    });

    const savedMode = normalizeThemeCustomizationMode(localStorage.getItem(THEME_EDITOR_MODE_STORAGE_KEY));
    setThemeEditorMode(document.getElementById('theme-form')?.dataset?.customizationMode || savedMode, { persist: false });
    applyThemeTextEffectsFromForm({ markUnsaved: false });
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
    const runtimeLogoBrand = resolveThemeLogoBrandColor(theme, runtimeColors, {
        parseColorToHex,
        resolveBrandEditorConfig,
        resolveBasicBrandColor
    });
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

        syncSplashThemePreferenceView(nextTheme, { emubro, DEFAULT_THEME_FONTS });

        // Keep theme switching side effects minimal to avoid memory churn.
        lastAppliedThemeId = nextTheme;
        lastAppliedThemeAt = Date.now();
    } finally {
        isApplyingTheme = false;
        queuedThemeApply = null;
    }
}

function syncThemeManagerActiveItem(themeId = currentTheme) {
    syncThemeManagerActiveItemView(themeId, { currentTheme });
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
    updateThemeSelectorView({
        currentTheme,
        getCustomThemes,
        getBuiltInPresetThemes,
        i18n
    });
}

export function deleteCustomTheme(id) {
    deleteCustomThemeAction({
        id,
        currentTheme,
        getCustomThemes,
        setTheme,
        updateThemeSelector,
        renderThemeManager,
        i18n
    });
}

export function renderThemeManager() {
    renderThemeManagerView({
        currentTheme,
        DEFAULT_THEME_FONTS,
        getBuiltInPresetThemes,
        getBuiltInPresetTheme,
        getCustomThemes,
        setTheme,
        deleteCustomTheme,
        editTheme,
        uploadTheme,
        syncThemeManagerActiveItem,
        i18n
    });
}

export function editTheme(theme) {
    editThemeAction({
        theme,
        i18n,
        setHasUnsavedChanges,
        setEditingThemeId: (id) => { editingThemeId = id; },
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
        setBackgroundLayerDrafts: (drafts) => setBackgroundLayerDrafts(drafts, setBackgroundLayerDraftsState),
        getBackgroundLayerDrafts: () => backgroundLayerDrafts,
        renderBackgroundLayerEditor,
        escapeHtml,
        createBackgroundLayerDraft,
        layerPositions: BACKGROUND_LAYER_POSITIONS,
        layerSizeOptions: BACKGROUND_LAYER_SIZE_OPTIONS,
        layerRepeatOptions: BACKGROUND_LAYER_REPEAT_OPTIONS,
        layerBehaviorOptions: BACKGROUND_LAYER_BEHAVIOR_OPTIONS,
        layerBlendOptions: BACKGROUND_LAYER_BLEND_OPTIONS,
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
    });
}

export function updateColorTexts() {
    updateColorTextsView();
}

export function showThemeForm() {
    showThemeFormView();
}

export function hideThemeForm() {
    hideThemeFormView({
        setTheme,
        currentTheme,
        setEditingThemeId: (id) => { editingThemeId = id; }
    });
}

export function resetThemeForm() {
    resetThemeFormView({
        setBackgroundSurfaceDraftFromConfig,
        syncBackgroundSurfaceControls,
        getBackgroundSurfaceDraft,
        setBackgroundSurfaceDraft,
        clearBackgroundImage,
        clearTopBackgroundImage,
        clearTitleBackgroundImage,
        setBackgroundLayerDrafts: (drafts) => setBackgroundLayerDrafts(drafts, setBackgroundLayerDraftsState),
        getBackgroundLayerDrafts: () => backgroundLayerDrafts,
        renderBackgroundLayerEditor,
        escapeHtml,
        createBackgroundLayerDraft,
        layerPositions: BACKGROUND_LAYER_POSITIONS,
        layerSizeOptions: BACKGROUND_LAYER_SIZE_OPTIONS,
        layerRepeatOptions: BACKGROUND_LAYER_REPEAT_OPTIONS,
        layerBehaviorOptions: BACKGROUND_LAYER_BEHAVIOR_OPTIONS,
        layerBlendOptions: BACKGROUND_LAYER_BLEND_OPTIONS,
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
    });
}

export function setupColorPickerListeners() {
    setupThemeCustomizationControls();
    setupColorPickerListenersView({
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
    });
}

export function clearBackgroundImage() {
    clearBackgroundImageView({ applyBackgroundImage, buildBackgroundConfig });
}

export function clearTopBackgroundImage() {
    clearTopBackgroundImageView({ applyBackgroundImage, buildBackgroundConfig });
}

export function clearTitleBackgroundImage() {
    clearTitleBackgroundImageView({ applyBackgroundImage, buildBackgroundConfig });
}

export function setupBackgroundImageListeners() {
    setupBackgroundImageListenersView({
        applyBackgroundImage,
        buildBackgroundConfig,
        setHasUnsavedChanges,
        getBackgroundLayerDrafts: () => backgroundLayerDrafts,
        setBackgroundLayerDrafts: (next) => { backgroundLayerDrafts = next; },
        createBackgroundLayerDraft,
        renderBackgroundLayerEditor,
        escapeHtml,
        layerPositions: BACKGROUND_LAYER_POSITIONS,
        layerSizeOptions: BACKGROUND_LAYER_SIZE_OPTIONS,
        layerRepeatOptions: BACKGROUND_LAYER_REPEAT_OPTIONS,
        layerBehaviorOptions: BACKGROUND_LAYER_BEHAVIOR_OPTIONS,
        layerBlendOptions: BACKGROUND_LAYER_BLEND_OPTIONS,
        clampNumber,
        normalizeBackgroundLayerOffset,
        normalizeBackgroundLayerPosition,
        normalizeBackgroundLayerSize,
        normalizeBackgroundLayerRepeat,
        normalizeBackgroundLayerBehavior,
        normalizeBackgroundLayerBlendMode,
        normalizeBackgroundLayerOpacity,
        normalizeBackgroundSurfaceTarget,
        ensureBackgroundSurfaceDraft,
        getBackgroundSurfaceDraft,
        setBackgroundSurfaceDraft,
        updateBackgroundSurfaceDraftFromControls,
        syncBackgroundSurfaceControls
    });
}

export function saveTheme() {
    saveThemeAction({
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
    });
}

export async function renderMarketplace(forceRefresh = false) {
    await renderMarketplaceView({
        forceRefresh,
        fetchCommunityThemes,
        getCustomThemes,
        deleteCustomTheme,
        saveCustomTheme,
        applyCustomTheme,
        extractBackgroundLayers,
        normalizeGradientAngle,
        i18n
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
    const invertedTheme = toggleThemeColorsView({
        getCurrentThemeColors,
        flipLightness,
        applyCustomTheme,
        getComputedBackgroundImage: () => window.currentBackgroundImage || getBackgroundImageFromGrid()
    });
    currentTheme = invertedTheme?.id || 'temp_inverted';
}

export function invertColors() {
    toggleInvertFilterView();
}
