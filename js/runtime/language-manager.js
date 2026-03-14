import { focusManagedModal, makeDraggable } from '../theme-manager';
import { updateUILanguage, populateLanguageSelector, invalidateFlagCache } from '../i18n-manager';
import { showTextInputDialog } from '../ui/text-input-dialog';
import {
    loadSuggestionSettings,
    normalizeSuggestionProvider,
    getSuggestionLlmRoutingSettings
} from '../suggestions-settings';
import {
    showAddLanguageDialog as showAddLanguageDialogModal,
    showRenameLanguageDialog as showRenameLanguageDialogModal
} from '../language-manager/locale-dialogs.js';
import {
    resolveBundledFlagCode,
    applyFlagVisual,
    collectAvailableFlagCodes as collectAvailableFlagCodesFromTranslations
} from '../language-manager/flags.js';
import {
    renderEditorKeysView
} from '../language-manager/editor-view.js';
import {
    renderLanguagesListView
} from '../language-manager/language-list-view.js';
import {
    LLM_TRANSLATION_MODE_ALL_IN_ONE_JSON,
    normalizeLlmTranslationMode,
    translateMissingKeysWithLlm as translateMissingKeysWithLlmWorkflow,
    translateSpecificKeyWithLlm as translateSpecificKeyWithLlmWorkflow
} from '../language-manager/llm-translation.js';
import {
    downloadLanguagesFromRepoFlow as downloadLanguagesFromRepo,
    buildCurrentLanguageDraftJson as buildCurrentLanguageDraftJsonPayload,
    exportLanguageJson as exportLanguageJsonPayload,
    exportCurrentLanguageAsJson as exportCurrentLanguageAsJsonPayload,
    exportAllLanguagesAsJson as exportAllLanguagesAsJsonPayload
} from '../language-manager/repo-export.js';
import {
    createLiveEditController,
    getNestedValue,
    setNestedValue
} from '../language-manager/live-edit.js';
import {
    saveCurrentLanguageDraft,
    createNewLanguageRecord
} from '../language-manager/persistence.js';
import {
    renameLanguage,
    changeLanguageFlag,
    deleteLanguage
} from '../language-manager/language-actions.js';
import {
    flattenObject,
    unflattenObject,
    escapeHtml,
    calculateLanguageProgress
} from '../language-manager/data-utils.js';
import {
    LANGUAGE_CODE_PATTERN,
    FLAG_CODE_PATTERN,
    normalizeLanguageCreationPayload
} from '../language-manager/locale-validation.js';
import {
    createRuntimeStateController
} from '../language-manager/runtime-state.js';
import {
    initializeTranslationControls,
    getSelectedTranslationMode,
    shouldRetranslateExistingTranslations as readRetranslateExistingSetting,
    getTranslationStyleHint as readTranslationStyleHint,
    getTranslationPromptTemplate as readTranslationPromptTemplate,
    resetTranslationPromptTemplate,
    shouldIncludeExistingTranslationsInPrompt as readIncludeExistingTranslationsInPrompt
} from '../language-manager/translation-controls.js';
import {
    getLanguageManagerModalElements,
    bindLanguageManagerModalEvents
} from '../language-manager/modal-events.js';
import {
    refreshLanguageManagerLayout,
    switchLanguageManagerTab
} from '../language-manager/layout.js';
import {
    setLanguageManagerTranslateStatus,
    saveTranslationStylePresetWithStatus,
    deleteTranslationStylePresetWithStatus,
    translatePromptTemplateForCurrentLanguage as translatePromptTemplateForCurrentLanguageUi
} from '../language-manager/translation-ui.js';

const emubro = window.emubro;
let currentLangData = null;
let liveEditEnabled = false;
let collapsedEditorGroups = new Set();

const LIVE_EDIT_SELECTOR = '[data-i18n], [data-i18n-placeholder]';
const MAX_EDITOR_ROWS_DEFAULT = 500;

const runtimeStateController = createRuntimeStateController({
    invalidateFlagCache,
    getTranslationsSnapshot: () => {
        if (typeof allTranslations !== 'undefined' && allTranslations) return allTranslations;
        return window.allTranslations || null;
    },
    setTranslationsSnapshot: (nextTranslations) => {
        window.allTranslations = nextTranslations;
    },
    i18nRef: i18n,
    populateLanguageSelector,
    updateUILanguage
});

const { getBaseLanguage, refreshLanguageRuntimeState } = runtimeStateController;

const liveEditController = createLiveEditController({
    liveEditSelector: LIVE_EDIT_SELECTOR,
    showTextInputDialog,
    getCurrentLangData: () => currentLangData,
    getBaseLanguageRoot: () => getBaseLanguage().en || {},
    getI18nRef: () => i18n,
    onRenderEditorKeys: (filter) => renderEditorKeys(filter),
    onUpdateUILanguage: () => updateUILanguage(),
    onSyncAllTranslations: (langCode, keyPath, value) => {
        if (typeof allTranslations === 'undefined') return;
        if (!allTranslations[langCode]) allTranslations[langCode] = {};
        setNestedValue(allTranslations[langCode], keyPath, value);
    }
});

export function initLanguageManager() {
    const elements = getLanguageManagerModalElements(document);
    if (!elements.modal) return;

    bindLanguageManagerModalEvents({
        elements,
        initializeTranslationControls,
        translationControlsConfig: {
            normalizeMode: normalizeLlmTranslationMode,
            defaultMode: LLM_TRANSLATION_MODE_ALL_IN_ONE_JSON,
            storage: localStorage
        },
        onClose: (modal) => closeLanguageManagerModal(modal),
        onBack: () => {
            setLiveEditEnabled(false);
            switchTab('lang-list');
        },
        onSave: () => saveCurrentLanguage(),
        onExportAll: () => exportAllLanguagesAsJson().catch((error) => {
            console.error('Failed to export all languages:', error);
            alert(i18n.t('language.exportError', { message: String(error?.message || error || 'Unknown error') }));
        }),
        onExportCurrent: () => exportCurrentLanguageAsJson().catch((error) => {
            console.error('Failed to export current language:', error);
            alert(i18n.t('language.exportError', { message: String(error?.message || error || 'Unknown error') }));
        }),
        onTranslate: (_event, buttonEl) => translateMissingKeysWithLlm(buttonEl).catch((error) => {
            console.error('LLM translation failed:', error);
            setLlmTranslateStatus(
                i18n.t('language.translateLlmFailed', { message: String(error?.message || error || 'Unknown error') }),
                'error'
            );
        }),
        onTranslateKey: (_event, buttonEl, keyPath) => translateSpecificKeyWithLlm(buttonEl, keyPath).catch((error) => {
            console.error('LLM single-key translation failed:', error);
            setLlmTranslateStatus(
                i18n.t('language.translateLlmFailed', { message: String(error?.message || error || 'Unknown error') }),
                'error'
            );
        }),
        onSaveStylePreset: () => saveTranslationStylePreset(),
        onDeleteStylePreset: () => deleteTranslationStylePreset(),
        onTranslatePromptTemplate: (_event, buttonEl) => translatePromptTemplateForCurrentLanguage(buttonEl).catch((error) => {
            console.error('Prompt template translation failed:', error);
            setLlmTranslateStatus(
                i18n.t('language.translateLlmFailed', { message: String(error?.message || error || 'Unknown error') }),
                'error'
            );
        }),
        onResetPromptTemplate: () => {
            resetTranslationPromptTemplate({
                translationPromptTemplateInput: document.getElementById('lang-translate-llm-prompt-template'),
                storage: localStorage
            });
            setLlmTranslateStatus(i18n.t('language.translatePromptResetDone', 'Translation prompt reset to default.'), 'success');
        },
        onSearch: (value) => filterKeys(value),
        onLiveEditToggle: (enabled) => setLiveEditEnabled(enabled),
        onAddLanguage: async () => {
            const payload = await showAddLanguageDialog();
            if (!payload) return;
            await createNewLanguage(payload);
        },
        onDownloadLanguages: () => downloadLanguagesFromRepoFlow().catch((error) => {
            console.error('Failed to download locales from repo:', error);
            alert(`Failed to download locales: ${String(error?.message || error || 'Unknown error')}`);
        })
    });

    // Close on click outside - REMOVED because it conflicts with resizing
    /*
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
            import('../docking-manager').then(m => m.removeFromDock('language-manager-modal'));
        }
    });
    */
}

function closeLanguageManagerModal(modal) {
    if (!modal) return;

    setLiveEditEnabled(false);
    setLlmTranslateStatus('');
    modal.style.display = 'none';
    modal.classList.remove('active');

    if (modal.classList.contains('docked-right')) {
        import('../docking-manager').then((manager) => manager.completelyRemoveFromDock('language-manager-modal'));
        return;
    }
    import('../docking-manager').then((manager) => manager.removeFromDock('language-manager-modal'));
}

export function openLanguageManager() {
    const modal = document.getElementById('language-manager-modal');
    if (!modal) return;

    if (modal.classList.contains('docked-right')) {
        // Use toggleDock to "re-dock" and trigger all logic
        import('../docking-manager').then(m => m.toggleDock('language-manager-modal', 'pin-language-manager', true));
    } else {
        modal.style.display = 'flex';
        modal.classList.add('active');
        focusManagedModal(modal);
        
        if (modal.style.top || modal.style.left) {
            modal.classList.add('moved');
        } else {
            modal.classList.remove('moved');
        }
    }

    loadLanguagesList();
    makeDraggable('language-manager-modal', 'language-manager-header');
    refreshLanguageManagerLayout();
}

function switchTab(tabName) {
    switchLanguageManagerTab({
        tabName,
        modal: document.getElementById('language-manager-modal'),
        onReturnToList: (modal) => {
            setLiveEditEnabled(false);
            setLlmTranslateStatus('');
            const editorTab = modal.querySelector('[data-tab="lang-edit"]');
            if (editorTab) editorTab.style.display = 'none';
        },
        onAfterSwitch: () => refreshLanguageManagerLayout()
    });
}

function setLiveEditEnabled(enabled) {
    liveEditEnabled = !!enabled;
    if (liveEditEnabled && currentLangData?.code && i18n.getLanguage() !== currentLangData.code) {
        i18n.setLanguage(currentLangData.code);
    }
    document.body.classList.toggle('live-edit-mode', liveEditEnabled);

    const toggle = document.getElementById('lang-live-edit-toggle');
    if (toggle && toggle.checked !== liveEditEnabled) {
        toggle.checked = liveEditEnabled;
    }

    liveEditController.setEnabled(liveEditEnabled);
}

function calculateProgress(langData, langCode) {
    return calculateLanguageProgress(langData, langCode, getBaseLanguage());
}

function loadLanguagesList() {
    const listContainer = document.getElementById('language-list');
    listContainer.innerHTML = i18n.t('language.loading');

    if (!emubro || !emubro.locales) {
        listContainer.innerHTML = i18n.t('language.loadError');
        return;
    }

    emubro.locales
        .list()
        .then((languages) => {
            renderLanguages(Array.isArray(languages) ? languages : []);
        })
        .catch((err) => {
            console.error('Failed to list locales:', err);
            listContainer.innerHTML = i18n.t('language.loadError');
        });
}

function collectAvailableFlagCodes() {
    return collectAvailableFlagCodesFromTranslations(
        typeof allTranslations !== 'undefined' ? allTranslations : null
    );
}

function normalizeLanguageCreationPayloadForDialog(input = {}) {
    return normalizeLanguageCreationPayload(input, { i18nRef: i18n });
}

function showAddLanguageDialog() {
    return showAddLanguageDialogModal({
        i18nRef: i18n,
        collectAvailableFlagCodes,
        escapeHtml,
        resolveBundledFlagCode,
        normalizeLanguageCreationPayload: normalizeLanguageCreationPayloadForDialog,
        languageCodePattern: LANGUAGE_CODE_PATTERN
    });
}

async function downloadLanguagesFromRepoFlow() {
    await downloadLanguagesFromRepo({
        emubro,
        showTextInputDialog,
        reloadLanguages: loadLanguagesList,
        onRefreshRuntimeState: refreshLanguageRuntimeState
    });
}

function buildCurrentLanguageDraftJson() {
    return buildCurrentLanguageDraftJsonPayload({
        currentLangData,
        flattenObject,
        unflattenObject
    });
}

function exportLanguageJson(lang, { includeEditorDraft = false } = {}) {
    return exportLanguageJsonPayload({
        lang,
        includeEditorDraft,
        currentLangData,
        buildDraftJson: buildCurrentLanguageDraftJson
    });
}

async function exportCurrentLanguageAsJson() {
    return exportCurrentLanguageAsJsonPayload({
        currentLangData,
        buildDraftJson: buildCurrentLanguageDraftJson
    });
}

async function exportAllLanguagesAsJson() {
    return exportAllLanguagesAsJsonPayload({
        emubro,
        currentLangData,
        buildDraftJson: buildCurrentLanguageDraftJson
    });
}

function renderLanguages(languages) {
    renderLanguagesListView({
        languages,
        i18nRef: i18n,
        getCurrentLanguageCode: () => i18n.getLanguage(),
        calculateProgress,
        resolveBundledFlagCode,
        escapeHtml,
        applyFlagVisual,
        onSelectLanguage: (lang) => {
            const nextCode = String(lang?.code || '').trim().toLowerCase();
            if (!nextCode) return;
            i18n.setLanguage(nextCode);
            loadLanguagesList();
        },
        onOpenEditor: (lang) => openEditor(lang),
        onExportLanguage: (lang) => exportLanguageJson(lang, { includeEditorDraft: false }),
        onChangeFlag: (lang) => changeLanguageFlagFlow(lang),
        onRename: (lang) => renameLanguageFlow(lang),
        onDelete: (lang) => deleteLanguageFlow(lang)
    });
}

function showRenameLanguageDialog(lang) {
    return showRenameLanguageDialogModal({
        lang,
        collectAvailableFlagCodes,
        escapeHtml,
        flagCodePattern: FLAG_CODE_PATTERN
    });
}

async function renameLanguageFlow(lang) {
    return renameLanguage({
        lang,
        showRenameLanguageDialog,
        languageCodePattern: LANGUAGE_CODE_PATTERN,
        flagCodePattern: FLAG_CODE_PATTERN,
        emubro,
        i18nRef: i18n,
        onRefreshRuntimeState: refreshLanguageRuntimeState,
        onReloadList: loadLanguagesList
    });
}

async function changeLanguageFlagFlow(lang) {
    return changeLanguageFlag({
        lang,
        flagCodePattern: FLAG_CODE_PATTERN,
        emubro,
        i18nRef: i18n,
        showTextInputDialog,
        onRefreshRuntimeState: refreshLanguageRuntimeState,
        onReloadList: loadLanguagesList
    });
}

async function deleteLanguageFlow(lang) {
    return deleteLanguage({
        lang,
        emubro,
        i18nRef: i18n,
        onRefreshRuntimeState: refreshLanguageRuntimeState,
        onReloadList: loadLanguagesList
    });
}

function openEditor(lang) {
    setLiveEditEnabled(false);
    setLlmTranslateStatus('');
    currentLangData = lang;
    collapsedEditorGroups = new Set();
    const editorTabBtn = document.querySelector(`[data-tab="lang-edit"]`);
    const title = document.getElementById('editing-lang-name');
    const search = document.getElementById('lang-search-keys');
    
    title.textContent = i18n.t('language.editing', {name: lang.data[lang.code].language?.name || lang.code});
    editorTabBtn.style.display = 'block';
    switchTab('lang-edit');
    search.value = '';

    renderEditorKeys();
    refreshLanguageManagerLayout();
}

function renderEditorKeys(filter = '') {
    renderEditorKeysView({
        currentLangData,
        getBaseLanguage,
        flattenObject,
        filter,
        escapeHtml,
        collapsedEditorGroups,
        maxRows: MAX_EDITOR_ROWS_DEFAULT,
        showingFirstLabel: i18n.t('language.showingFirst'),
        translateLabel: i18n.t('language.translateKeyWithLlm', 'Translate')
    });
    refreshLanguageManagerLayout();
}

function setLlmTranslateStatus(message = '', level = 'info') {
    setLanguageManagerTranslateStatus({
        documentRef: document,
        message,
        level
    });
}

function getLlmTranslationMode() {
    return getSelectedTranslationMode({
        translationModeSelect: document.getElementById('lang-translate-llm-mode'),
        normalizeMode: normalizeLlmTranslationMode,
        defaultMode: LLM_TRANSLATION_MODE_ALL_IN_ONE_JSON
    });
}

function shouldRetranslateExisting() {
    return readRetranslateExistingSetting(
        document.getElementById('lang-translate-llm-retranslate-existing')
    );
}

function getLlmTranslationStyleHint() {
    return readTranslationStyleHint({
        translationStyleHintInput: document.getElementById('lang-translate-llm-style-hint'),
        storage: localStorage
    });
}

function saveTranslationStylePreset() {
    saveTranslationStylePresetWithStatus({
        documentRef: document,
        storage: localStorage,
        i18nRef: i18n,
        onSetStatus: (message, level) => setLlmTranslateStatus(message, level)
    });
}

function deleteTranslationStylePreset() {
    deleteTranslationStylePresetWithStatus({
        documentRef: document,
        storage: localStorage,
        i18nRef: i18n,
        onSetStatus: (message, level) => setLlmTranslateStatus(message, level)
    });
}

function getLlmTranslationPromptTemplate() {
    return readTranslationPromptTemplate({
        translationPromptTemplateInput: document.getElementById('lang-translate-llm-prompt-template'),
        storage: localStorage
    });
}

function shouldIncludeExistingTranslationInPrompt() {
    return readIncludeExistingTranslationsInPrompt(
        document.getElementById('lang-translate-llm-include-existing-in-prompt'),
        localStorage
    );
}

function syncAllTranslationsEntry(langCode, localeData) {
    if (typeof allTranslations === 'undefined') return;
    if (!allTranslations[langCode]) allTranslations[langCode] = {};
    allTranslations[langCode] = localeData;
}

async function translateMissingKeysWithLlm(buttonEl) {
    await translateMissingKeysWithLlmWorkflow({
        buttonEl,
        currentLangData,
        emubro,
        i18nRef: i18n,
        localStorageRef: localStorage,
        loadSuggestionSettings,
        normalizeSuggestionProvider,
        getSuggestionLlmRoutingSettings,
        getBaseLanguage,
        flattenObject,
        getNestedValue,
        setNestedValue,
        onRenderEditorKeys: (filter) => renderEditorKeys(filter),
        onUpdateUILanguage: () => updateUILanguage(),
        onSetStatus: (message, level) => setLlmTranslateStatus(message, level),
        onSyncAllTranslations: syncAllTranslationsEntry,
        getTranslationMode: () => getLlmTranslationMode(),
        shouldRetranslateExistingTranslations: () => shouldRetranslateExisting(),
        getTranslationStyleHint: () => getLlmTranslationStyleHint(),
        getTranslationPromptTemplate: () => getLlmTranslationPromptTemplate(),
        shouldIncludeExistingTranslationsInPrompt: () => shouldIncludeExistingTranslationInPrompt()
    });
}

async function translateSpecificKeyWithLlm(buttonEl, keyPath) {
    await translateSpecificKeyWithLlmWorkflow({
        buttonEl,
        key: keyPath,
        currentLangData,
        emubro,
        i18nRef: i18n,
        localStorageRef: localStorage,
        loadSuggestionSettings,
        normalizeSuggestionProvider,
        getSuggestionLlmRoutingSettings,
        getBaseLanguage,
        flattenObject,
        getNestedValue,
        setNestedValue,
        onRenderEditorKeys: (filter) => renderEditorKeys(filter),
        onUpdateUILanguage: () => updateUILanguage(),
        onSetStatus: (message, level) => setLlmTranslateStatus(message, level),
        onSyncAllTranslations: syncAllTranslationsEntry,
        getTranslationMode: () => getLlmTranslationMode(),
        shouldRetranslateExistingTranslations: () => shouldRetranslateExisting(),
        getTranslationStyleHint: () => getLlmTranslationStyleHint(),
        getTranslationPromptTemplate: () => getLlmTranslationPromptTemplate(),
        shouldIncludeExistingTranslationsInPrompt: () => shouldIncludeExistingTranslationInPrompt()
    });
}

async function translatePromptTemplateForCurrentLanguage(buttonEl) {
    await translatePromptTemplateForCurrentLanguageUi({
        buttonEl,
        currentLangData,
        documentRef: document,
        emubro,
        i18nRef: i18n,
        localStorageRef: localStorage,
        loadSuggestionSettings,
        normalizeSuggestionProvider,
        getSuggestionLlmRoutingSettings,
        getTranslationPromptTemplate: () => getLlmTranslationPromptTemplate(),
        onSetStatus: (message, level) => setLlmTranslateStatus(message, level)
    });
}

function filterKeys(text) {
    renderEditorKeys(text);
}

async function saveCurrentLanguage() {
    const finalJson = await saveCurrentLanguageDraft({
        currentLangData,
        flattenObject,
        unflattenObject,
        emubro,
        i18nRef: i18n
    });
    if (!finalJson || !currentLangData) return;

    currentLangData.data = finalJson;
    if (confirm(i18n.t('language.reloadPrompt'))) {
        location.reload();
    }
}

async function createNewLanguage(input) {
    const created = await createNewLanguageRecord({
        input,
        normalizeLanguageCreationPayload: normalizeLanguageCreationPayloadForDialog,
        emubro,
        i18nRef: i18n
    });
    if (!created) return;
    loadLanguagesList();
    openEditor(created);
}
