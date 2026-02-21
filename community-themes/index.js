// Dynamically load all theme.json files in subdirectories using Webpack's require.context
const themesContext = require.context('./', true, /\/theme\.json$/);

const themes = themesContext.keys().map(key => {
    const theme = themesContext(key);
    
    // Resolve relative background image paths
    if (theme.background) {
        // key is something like './cyber/theme.json'
        // we want to prepend './community-themes/cyber/' to 'images/9205550.gif'
        const dir = key.substring(0, key.lastIndexOf('/') + 1); // './cyber/'
        const resolveThemePath = (value) => {
            const source = String(value || '');
            if (!source || source.startsWith('http') || source.startsWith('data:')) return source;
            return `./community-themes/${dir.substring(2)}${source}`;
        };

        theme.background.image = resolveThemePath(theme.background.image);
        theme.background.topImage = resolveThemePath(theme.background.topImage);
        theme.background.titleImage = resolveThemePath(theme.background.titleImage);
    }
    
    return theme;
});

module.exports = themes;
