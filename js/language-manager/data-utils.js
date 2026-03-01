export function flattenObject(obj, prefix = '') {
    return Object.keys(obj || {}).reduce((acc, key) => {
        const pathPrefix = prefix.length ? `${prefix}.` : '';
        const value = obj[key];
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            Object.assign(acc, flattenObject(value, pathPrefix + key));
        } else {
            acc[pathPrefix + key] = value;
        }
        return acc;
    }, {});
}

export function unflattenObject(flatData) {
    const result = {};
    Object.keys(flatData || {}).forEach((path) => {
        const keys = String(path).split('.');
        keys.reduce((accumulator, key, index) => (
            accumulator[key] || (accumulator[key] = (
                index + 1 === keys.length ? flatData[path] : {}
            ))
        ), result);
    });
    return result;
}

export function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function calculateLanguageProgress(langData, langCode, baseLanguageData) {
    const baseFlat = flattenObject((baseLanguageData && baseLanguageData.en) || {});
    const targetFlat = flattenObject((langData && langData[langCode]) || {});

    const totalKeys = Object.keys(baseFlat).length;
    if (totalKeys === 0) return 0;

    let translatedKeys = 0;
    Object.keys(baseFlat).forEach((key) => {
        if (targetFlat[key]) translatedKeys += 1;
    });

    return Math.round((translatedKeys / totalKeys) * 100);
}
