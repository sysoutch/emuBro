/**
 * Internationalization Manager
 */

const BUNDLED_FLAG_CODES = new Set(['us', 'de', 'es', 'fr', 'it', 'jp', 'nl', 'za']);
const customFlagCache = new Map();
let languageDropdownBound = false;
let languageDropdownDocumentBound = false;

export function invalidateFlagCache(flagCode = '') {
    const code = String(flagCode || '').trim().toLowerCase();
    if (code && /^[a-z]{2}$/.test(code)) {
        customFlagCache.delete(code);
        return;
    }
    customFlagCache.clear();
}

function resolveBundledFlagCode(input, fallback = 'us') {
    const code = String(input || '').trim().toLowerCase();
    if (/^[a-z]{2}$/.test(code) && BUNDLED_FLAG_CODES.has(code)) return code;
    return fallback;
}

async function getCustomFlagDataUrl(flagCode) {
    const code = String(flagCode || '').trim().toLowerCase();
    if (!/^[a-z]{2}$/.test(code)) return '';
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

async function applyFlagVisual(flagElement, rawFlagCode, fallback = 'us') {
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

export function updateUILanguage() {
    // Update elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        element.textContent = i18n.t(key);
    });

    // Update placeholder text
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        element.placeholder = i18n.t(key);
    });

    // Update title attribute
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
        const key = element.getAttribute('data-i18n-title');
        element.setAttribute('title', i18n.t(key));
    });

    // Update aria-label attribute
    document.querySelectorAll('[data-i18n-aria-label]').forEach(element => {
        const key = element.getAttribute('data-i18n-aria-label');
        element.setAttribute('aria-label', i18n.t(key));
    });
    
    // Update selected language display
    updateSelectedLanguageDisplay();
}

function updateSelectedLanguageDisplay() {
    const currentLang = i18n.getLanguage();
    const currentFlagElement = document.getElementById('current-flag');
    const currentNameElement = document.getElementById('current-language-name');
    
    if (typeof allTranslations !== 'undefined' && allTranslations[currentLang]) {
        const langData = allTranslations[currentLang].language;
        if (langData) {
            if (currentFlagElement) {
                void applyFlagVisual(currentFlagElement, langData.flag, 'us');
            }
            if (currentNameElement) {
                currentNameElement.textContent = langData.name || currentLang;
            }
        }
    }
}

export function populateLanguageSelector() {
    const dropdown = document.getElementById('language-dropdown');
    const optionsList = document.getElementById('language-options');
    
    if (!dropdown || !optionsList || typeof allTranslations === 'undefined') return;

    optionsList.innerHTML = '';
    const languages = Object.keys(allTranslations);

    languages.forEach(langCode => {
        const langData = allTranslations[langCode].language;
        if (langData) {
            const li = document.createElement('li');
            li.dataset.value = langCode;
            
            const flagSpan = document.createElement('span');
            flagSpan.className = 'fi';
            void applyFlagVisual(flagSpan, langData.flag, 'us');
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = langData.name || langCode;
            
            li.appendChild(flagSpan);
            li.appendChild(nameSpan);
            
            li.addEventListener('click', (e) => {
                e.stopPropagation();
                i18n.setLanguage(langCode);
                optionsList.classList.remove('show');
            });
            
            optionsList.appendChild(li);
        }
    });

    if (!languageDropdownBound) {
        dropdown.addEventListener('click', () => {
            const currentOptionsList = document.getElementById('language-options');
            currentOptionsList?.classList.toggle('show');
        });
        languageDropdownBound = true;
    }

    if (!languageDropdownDocumentBound) {
        document.addEventListener('click', (e) => {
            const currentDropdown = document.getElementById('language-dropdown');
            const currentOptionsList = document.getElementById('language-options');
            if (!currentDropdown || !currentOptionsList) return;
            if (!currentDropdown.contains(e.target)) {
                currentOptionsList.classList.remove('show');
            }
        });
        languageDropdownDocumentBound = true;
    }

    updateSelectedLanguageDisplay();
}

export async function initI18n(onLanguageChange) {
    // Load translations from a safe source (preload -> main process).
    // Keep `allTranslations` as a global for legacy code paths.
    if (typeof allTranslations === 'undefined') {
        try {
            if (window.emubro && typeof window.emubro.getAllTranslations === 'function') {
                window.allTranslations = await window.emubro.getAllTranslations();
            }
        } catch (e) {
            console.error('Failed to load translations:', e);
        }
    }

    if (typeof allTranslations !== 'undefined') {
        i18n.loadTranslations(allTranslations);
    }

    // Wrap i18n.t to support fallback to English
    const originalT = i18n.t.bind(i18n);
    const interpolate = (text, params) => {
        if (typeof text !== 'string' || !params || typeof params !== 'object' || Array.isArray(params)) {
            return text;
        }
        let nextText = text;
        Object.keys(params).forEach((paramKey) => {
            const value = String(params[paramKey] ?? '');
            nextText = nextText.replaceAll(`{{${paramKey}}}`, value);
            nextText = nextText.replaceAll(`{${paramKey}}`, value);
        });
        return nextText;
    };

    i18n.t = (key, dataOrDefault) => {
        const hasParams = !!dataOrDefault && typeof dataOrDefault === 'object' && !Array.isArray(dataOrDefault);
        const defaultValue = hasParams ? key : dataOrDefault;
        let translation = originalT(key, defaultValue);

        if (translation === key || !translation) {
            const currentLang = i18n.getLanguage();
            if (currentLang !== 'en' && typeof allTranslations !== 'undefined' && allTranslations.en) {
                const keys = key.split('.');
                let result = allTranslations.en;
                for (const k of keys) {
                    if (result && result[k] !== undefined) {
                        result = result[k];
                    } else {
                        result = null;
                        break;
                    }
                }

                if (typeof result === 'string' && result) {
                    return interpolate(result, hasParams ? dataOrDefault : null);
                }
            }
        }

        return interpolate(translation, hasParams ? dataOrDefault : null);
    };

    // Listen for language changes
    i18n.onChange(() => {
        updateUILanguage();
        if (onLanguageChange) onLanguageChange();
    });
}
