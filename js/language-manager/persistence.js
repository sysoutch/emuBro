export async function saveCurrentLanguageDraft({
    currentLangData,
    flattenObject,
    unflattenObject,
    emubro,
    i18nRef
}) {
    if (!currentLangData) return null;

    const inputs = document.querySelectorAll('.lang-input');
    const flatData = {};

    const existingFlat = flattenObject(currentLangData.data[currentLangData.code] || {});
    Object.assign(flatData, existingFlat);

    inputs.forEach((input) => {
        flatData[input.dataset.key] = input.value;
    });

    const newData = unflattenObject(flatData);
    const finalJson = { [currentLangData.code]: newData };

    try {
        await emubro.locales.write(currentLangData.filename, finalJson);
        alert(i18nRef.t('language.saveSuccess'));
        return finalJson;
    } catch (error) {
        alert(i18nRef.t('language.saveError', { message: error?.message }));
        return null;
    }
}

export async function createNewLanguageRecord({
    input,
    normalizeLanguageCreationPayload,
    emubro,
    i18nRef
}) {
    const normalized = normalizeLanguageCreationPayload(
        typeof input === 'string'
            ? { code: input, name: String(input || '').toUpperCase(), abbreviation: String(input || '').toUpperCase(), flag: 'us' }
            : input
    );
    if (!normalized.valid) {
        alert(normalized.message || i18nRef.t('language.createError', { message: 'Invalid input' }));
        return null;
    }

    const { code, name, abbreviation, flag } = normalized.value;
    const filename = `${code}.json`;

    const exists = await emubro.locales.exists(filename);
    if (exists) {
        alert(i18nRef.t('language.alreadyExists'));
        return null;
    }

    const newJson = {
        [code]: {
            language: {
                name,
                abbreviation,
                flag,
                selectLanguage: 'Select Language'
            }
        }
    };

    try {
        await emubro.locales.write(filename, newJson);
        return {
            code,
            filename,
            data: newJson
        };
    } catch (error) {
        alert(i18nRef.t('language.createError', { message: error?.message }));
        return null;
    }
}
