/**
 * Simple i18n (Internationalization) system for emuBro
 * Supports multiple languages with fallback to English
 */

class I18n {
    constructor() {
        this.translations = {};
        this.currentLanguage = localStorage.getItem('language') || 'en';
        this.fallbackLanguage = 'en';
        this.listeners = [];
    }

    /**
     * Load translations from an object
     * @param {Object} translations - Object with language codes as keys
     */
    loadTranslations(translations) {
        this.translations = translations;
    }

    /**
     * Set the current language
     * @param {string} language - Language code (e.g., 'en', 'es', 'fr')
     */
    setLanguage(language) {
        if (this.translations[language]) {
            this.currentLanguage = language;
            localStorage.setItem('language', language);
            this.notifyListeners();
        } else {
            console.warn(`Language "${language}" not available. Available: ${Object.keys(this.translations).join(', ')}`);
        }
    }

    /**
     * Get the current language
     * @returns {string} Current language code
     */
    getLanguage() {
        return this.currentLanguage;
    }

    /**
     * Get a translation by key with optional default value
     * @param {string} key - Dot-notation key (e.g., 'header.library')
     * @param {*} defaultValue - Default value if key not found
     * @returns {string} Translated string or default value
     */
    t(key, defaultValue = key) {
        const value = this.getNestedValue(this.translations[this.currentLanguage], key);
        
        if (value === undefined) {
            // Try fallback language
            const fallbackValue = this.getNestedValue(this.translations[this.fallbackLanguage], key);
            return fallbackValue !== undefined ? fallbackValue : defaultValue;
        }
        
        return value;
    }

    /**
     * Get a nested value from an object using dot notation
     * @param {Object} obj - Object to search
     * @param {string} path - Dot-notation path (e.g., 'header.library')
     * @returns {*} Value at the path or undefined
     */
    getNestedValue(obj, path) {
        if (!obj) return undefined;
        
        return path.split('.').reduce((current, prop) => {
            return current && current[prop];
        }, obj);
    }

    /**
     * Get all available languages
     * @returns {string[]} Array of language codes
     */
    getAvailableLanguages() {
        return Object.keys(this.translations);
    }

    /**
     * Register a listener for language changes
     * @param {Function} callback - Function to call when language changes
     */
    onChange(callback) {
        this.listeners.push(callback);
    }

    /**
     * Notify all listeners of language change
     */
    notifyListeners() {
        this.listeners.forEach(callback => callback(this.currentLanguage));
    }

    /**
     * Format a string with parameters
     * @param {string} key - Translation key
     * @param {Object} params - Parameters to replace in the string
     * @returns {string} Formatted translation
     */
    tf(key, params = {}) {
        let text = this.t(key, key);
        Object.keys(params).forEach(param => {
            text = text.replace(`{{${param}}}`, params[param]);
        });
        return text;
    }
}

// Export singleton instance
const i18n = new I18n();