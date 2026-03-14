export const LLM_TRANSLATION_MODE_STORAGE_KEY = 'emubro.languageManager.llmTranslationMode';
export const LLM_TRANSLATION_RETRANSLATE_EXISTING_STORAGE_KEY = 'emubro.languageManager.llmTranslationRetranslateExisting';
export const LLM_TRANSLATION_STYLE_HINT_STORAGE_KEY = 'emubro.languageManager.llmTranslationStyleHint';
export const LLM_TRANSLATION_STYLE_PRESETS_STORAGE_KEY = 'emubro.languageManager.llmTranslationStylePresets';
export const LLM_TRANSLATION_PROMPT_TEMPLATE_STORAGE_KEY = 'emubro.languageManager.llmTranslationPromptTemplate';
export const LLM_TRANSLATION_INCLUDE_EXISTING_IN_PROMPT_STORAGE_KEY = 'emubro.languageManager.llmTranslationIncludeExistingInPrompt';

const DEFAULT_LLM_TRANSLATION_STYLE_PRESETS = [
    'Keep it natural and concise for UI text.',
    'Formal but clear, suited for settings and system messages.',
    'Casual and compact, friendly but readable.'
];

const DEFAULT_LLM_TRANSLATION_PROMPT_TEMPLATE = [
    'Translate the following emuBro locale strings from {{sourceLanguageCode}} to {{targetLanguageCode}} ({{targetLanguageName}}).',
    'Keep the tone natural for UI text and keep it concise.',
    '{{styleHintBlock}}',
    'Preserve keys exactly.',
    'Preserve placeholders exactly, including {{name}}, {{count}}, {name}, %s, %d, $1, HTML tags, escaped newlines, and punctuation/spacing intent.',
    'If a product name, emulator name, or brand should stay unchanged, keep it unchanged.',
    'Return JSON only in this exact shape: {"translations":{"some.key":"translated text"}}',
    '',
    'Entries to translate:',
    '{{entriesJson}}',
    '',
    '{{sourceLocaleContextBlock}}',
    '{{targetLocaleContextBlock}}'
].join('\n');

export function getDefaultLlmTranslationPromptTemplate() {
    return DEFAULT_LLM_TRANSLATION_PROMPT_TEMPLATE;
}

function normalizeStylePresetList(input) {
    const seen = new Set();
    return (Array.isArray(input) ? input : [])
        .map((item) => String(item || '').trim())
        .filter((item) => {
            if (!item || seen.has(item)) return false;
            seen.add(item);
            return true;
        })
        .slice(0, 24);
}

export function getDefaultLlmTranslationStylePresets() {
    return [...DEFAULT_LLM_TRANSLATION_STYLE_PRESETS];
}

export function getTranslationStylePresets(storage = localStorage) {
    try {
        const raw = String(storage.getItem(LLM_TRANSLATION_STYLE_PRESETS_STORAGE_KEY) || '').trim();
        if (!raw) return getDefaultLlmTranslationStylePresets();
        const parsed = JSON.parse(raw);
        const normalized = normalizeStylePresetList(parsed);
        return normalized.length ? normalized : getDefaultLlmTranslationStylePresets();
    } catch (_error) {
        return getDefaultLlmTranslationStylePresets();
    }
}

function persistTranslationStylePresets(presets, storage = localStorage) {
    const normalized = normalizeStylePresetList(presets);
    storage.setItem(LLM_TRANSLATION_STYLE_PRESETS_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
}

function renderTranslationStylePresetOptions(translationStyleHintPresets, presets) {
    if (!translationStyleHintPresets) return;
    translationStyleHintPresets.innerHTML = '';
    presets.forEach((preset) => {
        const option = document.createElement('option');
        option.value = preset;
        translationStyleHintPresets.appendChild(option);
    });
}

export function initializeTranslationControls({
    translationModeSelect,
    retranslateExistingToggle,
    translationStyleHintInput,
    translationStyleHintPresets,
    translationPromptTemplateInput,
    includeExistingInPromptToggle,
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
        renderTranslationStylePresetOptions(
            translationStyleHintPresets,
            getTranslationStylePresets(storage)
        );
        translationStyleHintInput.value = String(storage.getItem(LLM_TRANSLATION_STYLE_HINT_STORAGE_KEY) || '');
        translationStyleHintInput.addEventListener('input', () => {
            storage.setItem(LLM_TRANSLATION_STYLE_HINT_STORAGE_KEY, translationStyleHintInput.value || '');
        });
    }

    if (translationPromptTemplateInput) {
        const savedTemplate = String(storage.getItem(LLM_TRANSLATION_PROMPT_TEMPLATE_STORAGE_KEY) || '').trim();
        translationPromptTemplateInput.value = savedTemplate || getDefaultLlmTranslationPromptTemplate();
        translationPromptTemplateInput.addEventListener('input', () => {
            storage.setItem(
                LLM_TRANSLATION_PROMPT_TEMPLATE_STORAGE_KEY,
                String(translationPromptTemplateInput.value || '')
            );
        });
    }

    if (includeExistingInPromptToggle) {
        const savedValue = String(storage.getItem(LLM_TRANSLATION_INCLUDE_EXISTING_IN_PROMPT_STORAGE_KEY) || '').trim();
        includeExistingInPromptToggle.checked = savedValue === '' ? true : savedValue === '1';
        includeExistingInPromptToggle.addEventListener('change', () => {
            storage.setItem(
                LLM_TRANSLATION_INCLUDE_EXISTING_IN_PROMPT_STORAGE_KEY,
                includeExistingInPromptToggle.checked ? '1' : '0'
            );
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

export function saveTranslationStylePreset({
    translationStyleHintInput,
    translationStyleHintPresets,
    storage = localStorage,
    maxLength = 280
} = {}) {
    const typed = String(translationStyleHintInput?.value || '').trim().slice(0, maxLength);
    if (!typed) return { ok: false, reason: 'empty', presets: getTranslationStylePresets(storage) };
    const current = getTranslationStylePresets(storage);
    const next = persistTranslationStylePresets([...current, typed], storage);
    renderTranslationStylePresetOptions(translationStyleHintPresets, next);
    storage.setItem(LLM_TRANSLATION_STYLE_HINT_STORAGE_KEY, typed);
    if (translationStyleHintInput) {
        translationStyleHintInput.value = typed;
    }
    return { ok: true, reason: current.includes(typed) ? 'existing' : 'saved', presets: next, value: typed };
}

export function deleteTranslationStylePreset({
    translationStyleHintInput,
    translationStyleHintPresets,
    storage = localStorage,
    maxLength = 280
} = {}) {
    const typed = String(translationStyleHintInput?.value || '').trim().slice(0, maxLength);
    if (!typed) return { ok: false, reason: 'empty', presets: getTranslationStylePresets(storage) };
    const current = getTranslationStylePresets(storage);
    if (!current.includes(typed)) {
        return { ok: false, reason: 'missing', presets: current, value: typed };
    }
    const next = persistTranslationStylePresets(current.filter((preset) => preset !== typed), storage);
    renderTranslationStylePresetOptions(translationStyleHintPresets, next);
    return { ok: true, reason: 'deleted', presets: next, value: typed };
}

export function getTranslationPromptTemplate({
    translationPromptTemplateInput,
    storage = localStorage
} = {}) {
    const typed = String(translationPromptTemplateInput?.value || '').trim();
    if (typed) return typed;
    const stored = String(storage.getItem(LLM_TRANSLATION_PROMPT_TEMPLATE_STORAGE_KEY) || '').trim();
    if (stored) return stored;
    return getDefaultLlmTranslationPromptTemplate();
}

export function resetTranslationPromptTemplate({
    translationPromptTemplateInput,
    storage = localStorage
} = {}) {
    const nextValue = getDefaultLlmTranslationPromptTemplate();
    if (translationPromptTemplateInput) {
        translationPromptTemplateInput.value = nextValue;
    }
    storage.setItem(LLM_TRANSLATION_PROMPT_TEMPLATE_STORAGE_KEY, nextValue);
    return nextValue;
}

export function shouldIncludeExistingTranslationsInPrompt(includeExistingInPromptToggle, storage = localStorage) {
    if (includeExistingInPromptToggle) return !!includeExistingInPromptToggle.checked;
    const savedValue = String(storage.getItem(LLM_TRANSLATION_INCLUDE_EXISTING_IN_PROMPT_STORAGE_KEY) || '').trim();
    return savedValue === '' ? true : savedValue === '1';
}
