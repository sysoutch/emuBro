// Dynamically load all theme.json files in subdirectories using Webpack's require.context
const themesContext = require.context('./', true, /\/theme\.json$/);

const themes = themesContext.keys().map(key => {
    const theme = themesContext(key);
    
    // Resolve relative background image path
    if (theme.background && theme.background.image && !theme.background.image.startsWith('http') && !theme.background.image.startsWith('data:')) {
        // key is something like './cyber/theme.json'
        // we want to prepend './community-themes/cyber/' to 'images/9205550.gif'
        const dir = key.substring(0, key.lastIndexOf('/') + 1); // './cyber/'
        theme.background.image = `./community-themes/${dir.substring(2)}${theme.background.image}`;
    }
    
    return theme;
});

module.exports = themes;
