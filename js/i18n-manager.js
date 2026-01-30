/**
 * Internationalization Manager
 */

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

    // Update option elements in selects
    document.querySelectorAll('option[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        element.textContent = i18n.t(key);
    });
}

export function populateLanguageSelector() {
    const languageSelect = document.getElementById('language-select');
    if (!languageSelect || typeof allTranslations === 'undefined') return;

    languageSelect.innerHTML = '';
    const languages = Object.keys(allTranslations);

    languages.forEach(langCode => {
        const langData = allTranslations[langCode].language;
        if (langData) {
            const option = document.createElement('option');
            option.value = langCode;
            const flag = langData.flag || '';
            const name = langData.name || langCode;
            option.textContent = `${flag} ${name}`.trim();
            languageSelect.appendChild(option);
        }
    });

    languageSelect.value = i18n.getLanguage();
}

export function initI18n(onLanguageChange) {
    // Load translations from the global scope (set by translations-loader.js)
    if (typeof allTranslations !== 'undefined') {
        i18n.loadTranslations(allTranslations);
    }

    // Listen for language changes
    i18n.onChange(() => {
        updateUILanguage();
        if (onLanguageChange) onLanguageChange();
    });
}
