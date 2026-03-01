export const LLM_TRANSLATION_MODE_STORAGE_KEY = 'emubro.languageManager.llmTranslationMode';
export const LLM_TRANSLATION_RETRANSLATE_EXISTING_STORAGE_KEY = 'emubro.languageManager.llmTranslationRetranslateExisting';
export const LLM_TRANSLATION_STYLE_HINT_STORAGE_KEY = 'emubro.languageManager.llmTranslationStyleHint';

export function initializeTranslationControls({
    translationModeSelect,
    retranslateExistingToggle,
    translationStyleHintInput,
    normalizeMode,
    defaultMode,
    storage = localStorage
} = {}) {
    if (translationModeSelect) {
        const savedMode = normalizeMode?.(
            storage.getItem(LLM_TRANSLATION_MODE_STORAGE_KEY),
            defaultMode
        );
        translationModeSelect.value = savedMode;

        translationModeSelect.addEventListener('change', () => {
            const nextMode = normalizeMode?.(translationModeSelect.value, defaultMode) || defaultMode;
            translationModeSelect.value = nextMode;
            storage.setItem(LLM_TRANSLATION_MODE_STORAGE_KEY, nextMode);
        });
    }

    if (retranslateExistingToggle) {
        const savedValue = String(storage.getItem(LLM_TRANSLATION_RETRANSLATE_EXISTING_STORAGE_KEY) || '').trim();
        retranslateExistingToggle.checked = savedValue === '1';
        retranslateExistingToggle.addEventListener('change', () => {
            storage.setItem(
                LLM_TRANSLATION_RETRANSLATE_EXISTING_STORAGE_KEY,
                retranslateExistingToggle.checked ? '1' : '0'
            );
        });
    }

    if (translationStyleHintInput) {
        translationStyleHintInput.value = String(storage.getItem(LLM_TRANSLATION_STYLE_HINT_STORAGE_KEY) || '');
        translationStyleHintInput.addEventListener('input', () => {
            storage.setItem(LLM_TRANSLATION_STYLE_HINT_STORAGE_KEY, translationStyleHintInput.value || '');
        });
    }
}

export function getSelectedTranslationMode({
    translationModeSelect,
    normalizeMode,
    defaultMode
} = {}) {
    return normalizeMode?.(translationModeSelect?.value, defaultMode) || defaultMode;
}

export function shouldRetranslateExistingTranslations(retranslateExistingToggle) {
    return !!retranslateExistingToggle?.checked;
}

export function getTranslationStyleHint({
    translationStyleHintInput,
    storage = localStorage,
    maxLength = 280
} = {}) {
    const typed = String(translationStyleHintInput?.value || '').trim();
    if (typed) return typed.slice(0, maxLength);
    return String(storage.getItem(LLM_TRANSLATION_STYLE_HINT_STORAGE_KEY) || '').trim().slice(0, maxLength);
}
