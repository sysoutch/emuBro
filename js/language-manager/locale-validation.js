export const LANGUAGE_CODE_PATTERN = /^[a-z]{2,3}$/;
export const FLAG_CODE_PATTERN = /^[a-z]{2}$/;

export function normalizeLanguageCreationPayload(input = {}, { i18nRef } = {}) {
    const code = String(input.code || '').trim().toLowerCase();
    const name = String(input.name || '').trim();
    const abbreviationInput = String(input.abbreviation || '').trim();
    const flag = String(input.flag || '').trim().toLowerCase();

    if (!LANGUAGE_CODE_PATTERN.test(code)) {
        return { valid: false, message: i18nRef?.t('language.invalidCode') || 'Invalid language code.' };
    }

    if (!name) {
        return { valid: false, message: i18nRef?.t('language.addDialogInvalidName') || 'Language name is required.' };
    }

    if (!FLAG_CODE_PATTERN.test(flag)) {
        return { valid: false, message: i18nRef?.t('language.addDialogInvalidFlag') || 'Invalid flag code.' };
    }

    return {
        valid: true,
        value: {
            code,
            name,
            abbreviation: abbreviationInput || code.toUpperCase(),
            flag
        }
    };
}
