const fs = require('fs');
const path = require('path');

const allTranslations = {};
const localesDir = path.join(__dirname, 'locales');

try {
    if (fs.existsSync(localesDir)) {
        const files = fs.readdirSync(localesDir);
        files.forEach(file => {
            if (file.endsWith('.json')) {
                const filePath = path.join(localesDir, file);
                const content = fs.readFileSync(filePath, 'utf8');
                const translation = JSON.parse(content);
                Object.assign(allTranslations, translation);
            }
        });
    }
} catch (err) {
    console.error('Error loading translations:', err);
}

// Export for use in renderer.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = allTranslations;
} else {
    window.allTranslations = allTranslations;
}
