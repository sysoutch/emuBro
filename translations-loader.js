/**
 * Load all translation files
 * This file combines all language translations and provides them to i18n
 */

// Import all translation files
const enTranslations = require('./locales/en.json');
const esTranslations = require('./locales/es.json');
const frTranslations = require('./locales/fr.json');
const deTranslations = require('./locales/de.json');
const jaTranslations = require('./locales/ja.json');

// Combine all translations
const allTranslations = {
    ...enTranslations,
    ...esTranslations,
    ...frTranslations,
    ...deTranslations,
    ...jaTranslations
};

// Export for use in renderer.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = allTranslations;
}
