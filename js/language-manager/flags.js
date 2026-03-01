const FLAG_CODE_PATTERN = /^[a-z]{2}$/;
const BUNDLED_FLAG_CODES = new Set(['us', 'de', 'es', 'fr', 'it', 'jp', 'nl', 'za']);
const DEFAULT_FLAG_CODES = ['us', 'de', 'es', 'fr', 'it', 'jp', 'nl', 'za'];
const customFlagCache = new Map();

export function resolveBundledFlagCode(input, fallback = 'us') {
    const code = String(input || '').trim().toLowerCase();
    if (FLAG_CODE_PATTERN.test(code) && BUNDLED_FLAG_CODES.has(code)) return code;
    return fallback;
}

export async function getCustomFlagDataUrl(flagCode) {
    const code = String(flagCode || '').trim().toLowerCase();
    if (!FLAG_CODE_PATTERN.test(code)) return '';
    if (customFlagCache.has(code)) return customFlagCache.get(code) || '';
    try {
        const result = await window?.emubro?.locales?.getFlagDataUrl?.(code);
        const dataUrl = String(result?.dataUrl || '').trim();
        customFlagCache.set(code, dataUrl);
        return dataUrl;
    } catch (_error) {
        customFlagCache.set(code, '');
        return '';
    }
}

export async function applyFlagVisual(flagElement, rawFlagCode, fallback = 'us') {
    if (!flagElement) return;
    const rawCode = String(rawFlagCode || '').trim().toLowerCase();
    const bundledCode = resolveBundledFlagCode(rawCode, fallback);
    flagElement.className = 'fi';
    flagElement.style.removeProperty('background-image');
    flagElement.style.removeProperty('background-size');
    flagElement.style.removeProperty('background-position');
    flagElement.style.removeProperty('background-repeat');

    const customDataUrl = await getCustomFlagDataUrl(rawCode);
    if (customDataUrl) {
        flagElement.style.backgroundImage = `url("${customDataUrl}")`;
        flagElement.style.backgroundSize = 'cover';
        flagElement.style.backgroundPosition = 'center';
        flagElement.style.backgroundRepeat = 'no-repeat';
        return;
    }
    flagElement.classList.add(`fi-${bundledCode}`);
}

export function collectAvailableFlagCodes(allTranslations) {
    const flags = new Set(DEFAULT_FLAG_CODES);

    if (allTranslations && typeof allTranslations === 'object') {
        Object.values(allTranslations).forEach((entry) => {
            const flag = resolveBundledFlagCode(entry?.language?.flag || '', '');
            if (flag) {
                flags.add(flag);
            }
        });
    }

    return Array.from(flags).sort((a, b) => a.localeCompare(b));
}
