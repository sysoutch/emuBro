export function createThemeEditorMode(deps = {}) {
    const {
        normalizeThemeCustomizationMode,
        storageKey,
        localStorageRef = localStorage,
        documentRef = document
    } = deps;

    function getThemeEditorMode() {
        const form = documentRef.getElementById('theme-form');
        const activeBtn = documentRef.querySelector('.theme-mode-btn.active[data-theme-mode]');
        if (activeBtn && activeBtn.dataset.themeMode) {
            return normalizeThemeCustomizationMode(activeBtn.dataset.themeMode);
        }
        if (!form) return normalizeThemeCustomizationMode(localStorageRef.getItem(storageKey));
        return normalizeThemeCustomizationMode(form.dataset.customizationMode || localStorageRef.getItem(storageKey));
    }

    function setThemeEditorMode(mode, options = {}) {
        const normalizedMode = normalizeThemeCustomizationMode(mode);
        const form = documentRef.getElementById('theme-form');
        if (form) form.dataset.customizationMode = normalizedMode;

        documentRef.querySelectorAll('.theme-mode-btn[data-theme-mode]').forEach((button) => {
            const active = normalizeThemeCustomizationMode(button.dataset.themeMode) === normalizedMode;
            button.classList.toggle('active', active);
            button.setAttribute('aria-selected', active ? 'true' : 'false');
        });

        if (options.persist !== false) {
            localStorageRef.setItem(storageKey, normalizedMode);
        }
        return normalizedMode;
    }

    return {
        getThemeEditorMode,
        setThemeEditorMode
    };
}
