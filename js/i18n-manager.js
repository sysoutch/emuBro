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
                // Clear existing classes
                currentFlagElement.className = 'fi';
                if (langData.flag) {
                     currentFlagElement.classList.add(`fi-${langData.flag}`);
                }
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
            if (langData.flag) {
                flagSpan.classList.add(`fi-${langData.flag}`);
            }
            
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

    // Dropdown toggle logic
    dropdown.addEventListener('click', () => {
        optionsList.classList.toggle('show');
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) {
            optionsList.classList.remove('show');
        }
    });

    updateSelectedLanguageDisplay();
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
