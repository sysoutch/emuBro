export function sanitizeFilenamePart(value, fallback = 'locale') {
    const normalized = String(value || '').trim().replace(/[^a-z0-9._-]+/gi, '-');
    return normalized || fallback;
}

export function triggerJsonDownload(filename, jsonPayload) {
    const jsonText = JSON.stringify(jsonPayload, null, 2);
    const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
}

export function buildCurrentLanguageDraftJson({ currentLangData, flattenObject, unflattenObject }) {
    if (!currentLangData) return null;

    const inputs = document.querySelectorAll('.lang-input');
    const flatData = {};

    const existingFlat = flattenObject(currentLangData.data[currentLangData.code] || {});
    Object.assign(flatData, existingFlat);

    inputs.forEach((input) => {
        flatData[input.dataset.key] = input.value;
    });

    const newData = unflattenObject(flatData);
    return { [currentLangData.code]: newData };
}

export function getLanguageJsonForExport({
    lang,
    includeEditorDraft = false,
    currentLangData,
    buildDraftJson
}) {
    if (!lang || !lang.code) return null;
    if (includeEditorDraft && currentLangData && currentLangData.code === lang.code) {
        const draft = buildDraftJson();
        if (draft) return draft;
    }
    if (lang.data && typeof lang.data === 'object') {
        return JSON.parse(JSON.stringify(lang.data));
    }
    return { [lang.code]: {} };
}

export function exportLanguageJson({
    lang,
    includeEditorDraft = false,
    currentLangData,
    buildDraftJson
}) {
    const payload = getLanguageJsonForExport({
        lang,
        includeEditorDraft,
        currentLangData,
        buildDraftJson
    });
    if (!payload) {
        throw new Error('No language payload available.');
    }
    const filename = `${sanitizeFilenamePart(lang.code || 'locale')}.json`;
    triggerJsonDownload(filename, payload);
}

export function exportCurrentLanguageAsJson({ currentLangData, buildDraftJson }) {
    if (!currentLangData) {
        throw new Error('No language is currently open.');
    }
    exportLanguageJson({
        lang: currentLangData,
        includeEditorDraft: true,
        currentLangData,
        buildDraftJson
    });
}

export async function exportAllLanguagesAsJson({ emubro, currentLangData, buildDraftJson }) {
    if (!emubro || !emubro.locales || typeof emubro.locales.list !== 'function') {
        throw new Error('Locales API is not available.');
    }
    const languages = await emubro.locales.list();
    const allLocales = {};
    (Array.isArray(languages) ? languages : []).forEach((lang) => {
        const code = String(lang?.code || '').trim();
        if (!code) return;
        const payload = getLanguageJsonForExport({
            lang,
            includeEditorDraft: false,
            currentLangData,
            buildDraftJson
        }) || {};
        allLocales[code] = payload[code] || {};
    });
    triggerJsonDownload('emubro-locales-all.json', allLocales);
}

export async function downloadLanguagesFromRepoFlow({
    emubro,
    showTextInputDialog,
    reloadLanguages
}) {
    if (!emubro || !emubro.locales || typeof emubro.locales.fetchRepoCatalog !== 'function') {
        throw new Error('Locales repository API is not available.');
    }

    const currentCfg = await emubro.locales.getRepoConfig();
    const currentManifestUrl = String(currentCfg?.manifestUrl || '').trim();

    const manifestUrlInput = await showTextInputDialog({
        title: 'Locale Repository',
        message: 'Manifest URL',
        placeholder: 'https://raw.githubusercontent.com/.../manifest.json',
        initialValue: currentManifestUrl
    });
    if (!manifestUrlInput || !String(manifestUrlInput || '').trim()) return;
    const manifestUrl = String(manifestUrlInput || '').trim();

    await emubro.locales.setRepoConfig({ manifestUrl });
    const catalog = await emubro.locales.fetchRepoCatalog({ manifestUrl });
    if (!catalog?.success) {
        throw new Error(String(catalog?.message || 'Failed to fetch locale catalog.'));
    }

    const packages = Array.isArray(catalog.packages) ? catalog.packages : [];
    if (packages.length === 0) {
        alert('No locale packages found in repository catalog.');
        return;
    }

    const codeList = packages.map((entry) => String(entry.code || '').trim().toLowerCase()).filter(Boolean);
    const defaultCodes = codeList.join(', ');

    const codesInput = await showTextInputDialog({
        title: 'Install Languages',
        message: 'Language codes (comma-separated, blank = all)',
        placeholder: defaultCodes,
        initialValue: defaultCodes
    });
    if (!codesInput) return;

    const rawCodes = String(codesInput || '').trim();
    const requestedCodes = rawCodes
        ? rawCodes.split(',').map((value) => String(value || '').trim().toLowerCase()).filter(Boolean)
        : [];

    const result = await emubro.locales.installFromRepo({
        manifestUrl,
        codes: requestedCodes
    });
    if (!result?.success) {
        throw new Error(String(result?.message || 'Failed to install locale packages.'));
    }

    const installedCount = Array.isArray(result.installed) ? result.installed.length : 0;
    const failedCount = Array.isArray(result.failed) ? result.failed.length : 0;
    if (failedCount > 0) {
        const failedDetails = result.failed
            .map((entry) => `${entry.code || 'unknown'}: ${entry.message || 'Unknown error'}`)
            .join('\n');
        alert(`Installed ${installedCount} locale(s), ${failedCount} failed:\n${failedDetails}`);
    } else {
        alert(`Installed ${installedCount} locale(s) from repository.`);
    }

    reloadLanguages();
}
