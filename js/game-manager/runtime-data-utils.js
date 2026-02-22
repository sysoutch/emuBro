export function normalizeRuntimeRuleValueList(values = []) {
    const out = [];
    const seen = new Set();
    (Array.isArray(values) ? values : []).forEach((entry) => {
        const value = String(entry || '').trim().toLowerCase();
        if (!value) return;
        if (seen.has(value)) return;
        seen.add(value);
        out.push(value);
    });
    return out;
}

export function normalizeRuntimeExtensionList(values = []) {
    const out = [];
    const seen = new Set();
    (Array.isArray(values) ? values : []).forEach((entry) => {
        let value = String(entry || '').trim().toLowerCase();
        if (!value) return;
        if (!value.startsWith('.')) value = `.${value}`;
        value = value.replace(/\s+/g, '');
        if (!value) return;
        if (seen.has(value)) return;
        seen.add(value);
        out.push(value);
    });
    return out;
}

export function normalizeRuntimeDataRulesForLaunch(input = {}) {
    const source = (input && typeof input === 'object') ? input : {};
    return {
        directoryNames: normalizeRuntimeRuleValueList(source.directoryNames),
        fileExtensions: normalizeRuntimeExtensionList(source.fileExtensions),
        fileNameIncludes: normalizeRuntimeRuleValueList(source.fileNameIncludes)
    };
}
