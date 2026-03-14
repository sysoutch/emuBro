function runAsyncHandler(handler, errorMessage, event) {
    try {
        const result = typeof handler === 'function' ? handler(event) : null;
        if (result && typeof result.then === 'function') {
            result.catch((error) => {
                if (errorMessage) {
                    console.error(errorMessage, error);
                }
            });
        }
    } catch (error) {
        if (errorMessage) {
            console.error(errorMessage, error);
        }
    }
}

export function getLanguageManagerModalElements(documentRef = document) {
    return {
        modal: documentRef.getElementById('language-manager-modal'),
        closeBtn: documentRef.getElementById('close-language-manager'),
        addBtn: documentRef.getElementById('add-language-btn'),
        downloadBtn: documentRef.getElementById('download-languages-btn'),
        backBtn: documentRef.getElementById('back-to-lang-list'),
        saveBtn: documentRef.getElementById('save-lang-btn'),
        exportAllBtn: documentRef.getElementById('export-all-languages-btn'),
        exportCurrentBtn: documentRef.getElementById('export-current-lang-btn'),
        translateBtn: documentRef.getElementById('lang-translate-llm-btn'),
        keysList: documentRef.getElementById('lang-keys-list'),
        translationModeSelect: documentRef.getElementById('lang-translate-llm-mode'),
        retranslateExistingToggle: documentRef.getElementById('lang-translate-llm-retranslate-existing'),
        translationStyleHintInput: documentRef.getElementById('lang-translate-llm-style-hint'),
        translationStyleHintPresets: documentRef.getElementById('lang-translate-llm-style-hint-presets'),
        saveStylePresetBtn: documentRef.getElementById('lang-translate-llm-style-save'),
        deleteStylePresetBtn: documentRef.getElementById('lang-translate-llm-style-delete'),
        translationPromptTemplateInput: documentRef.getElementById('lang-translate-llm-prompt-template'),
        resetPromptTemplateBtn: documentRef.getElementById('lang-translate-llm-prompt-reset'),
        translatePromptTemplateBtn: documentRef.getElementById('lang-translate-llm-prompt-translate'),
        includeExistingInPromptToggle: documentRef.getElementById('lang-translate-llm-include-existing-in-prompt'),
        searchInput: documentRef.getElementById('lang-search-keys'),
        liveEditToggle: documentRef.getElementById('lang-live-edit-toggle')
    };
}

export function bindLanguageManagerModalEvents({
    elements,
    initializeTranslationControls,
    translationControlsConfig = null,
    onClose,
    onBack,
    onSave,
    onExportAll,
    onExportCurrent,
    onTranslate,
    onTranslateKey,
    onSaveStylePreset,
    onDeleteStylePreset,
    onTranslatePromptTemplate,
    onResetPromptTemplate,
    onSearch,
    onLiveEditToggle,
    onAddLanguage,
    onDownloadLanguages
} = {}) {
    const {
        modal,
        closeBtn,
        addBtn,
        downloadBtn,
        backBtn,
        saveBtn,
        exportAllBtn,
        exportCurrentBtn,
        translateBtn,
        keysList,
        translationModeSelect,
        retranslateExistingToggle,
        translationStyleHintInput,
        translationStyleHintPresets,
        saveStylePresetBtn,
        deleteStylePresetBtn,
        translationPromptTemplateInput,
        resetPromptTemplateBtn,
        translatePromptTemplateBtn,
        includeExistingInPromptToggle,
        searchInput,
        liveEditToggle
    } = elements || {};

    if (!modal) return false;

    if (closeBtn) {
        closeBtn.addEventListener('click', () => runAsyncHandler(onClose, null, modal));
    }

    if (backBtn) {
        backBtn.addEventListener('click', () => runAsyncHandler(onBack, null));
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', () => runAsyncHandler(onSave, 'Failed to save language:'));
    }

    if (exportAllBtn) {
        exportAllBtn.addEventListener('click', () => runAsyncHandler(onExportAll, null));
    }

    if (exportCurrentBtn) {
        exportCurrentBtn.addEventListener('click', () => runAsyncHandler(onExportCurrent, null));
    }

    if (translateBtn) {
        translateBtn.addEventListener('click', () => runAsyncHandler(
            (event) => onTranslate?.(event, translateBtn),
            null
        ));
    }

    if (keysList) {
        keysList.addEventListener('click', (event) => {
            const translateKeyButton = event.target?.closest?.('[data-lang-translate-key]');
            if (!translateKeyButton) return;
            runAsyncHandler(
                () => onTranslateKey?.(event, translateKeyButton, String(translateKeyButton.dataset.langTranslateKey || '').trim()),
                null
            );
        });
    }

    if (typeof initializeTranslationControls === 'function') {
        initializeTranslationControls({
            translationModeSelect,
            retranslateExistingToggle,
            translationStyleHintInput,
            translationStyleHintPresets,
            translationPromptTemplateInput,
            includeExistingInPromptToggle,
            ...(translationControlsConfig || {})
        });
    }

    if (saveStylePresetBtn) {
        saveStylePresetBtn.addEventListener('click', () => runAsyncHandler(
            () => onSaveStylePreset?.(),
            null
        ));
    }

    if (deleteStylePresetBtn) {
        deleteStylePresetBtn.addEventListener('click', () => runAsyncHandler(
            () => onDeleteStylePreset?.(),
            null
        ));
    }

    if (resetPromptTemplateBtn) {
        resetPromptTemplateBtn.addEventListener('click', () => runAsyncHandler(
            () => onResetPromptTemplate?.(),
            null
        ));
    }

    if (translatePromptTemplateBtn) {
        translatePromptTemplateBtn.addEventListener('click', () => runAsyncHandler(
            (event) => onTranslatePromptTemplate?.(event, translatePromptTemplateBtn),
            null
        ));
    }

    if (searchInput) {
        searchInput.addEventListener('input', (event) => runAsyncHandler(
            () => onSearch?.(event?.target?.value || ''),
            null
        ));
    }

    if (liveEditToggle) {
        liveEditToggle.checked = false;
        liveEditToggle.addEventListener('change', () => runAsyncHandler(
            () => onLiveEditToggle?.(liveEditToggle.checked),
            null
        ));
    }

    if (addBtn) {
        addBtn.addEventListener('click', () => runAsyncHandler(onAddLanguage, 'Failed to create language:'));
    }

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => runAsyncHandler(onDownloadLanguages, null));
    }

    return true;
}
