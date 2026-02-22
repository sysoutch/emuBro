/**
 * Theme library view rendering
 */

export function syncThemeManagerActiveItem(themeId, options = {}) {
    const modal = document.getElementById('theme-manager-modal');
    if (!modal) return;
    const fallbackId = options.currentTheme || '';
    const selectedId = String(themeId || fallbackId).trim();
    modal.querySelectorAll('.theme-item[data-theme-id]').forEach((item) => {
        const itemId = String(item?.dataset?.themeId || '').trim();
        item.classList.toggle('active', itemId === selectedId);
    });
}

export function getThemeDisplayName(themeId, options = {}) {
    const { i18n, getBuiltInPresetTheme } = options;
    const normalizedId = String(themeId || '').toLowerCase();
    if (normalizedId === 'dark') {
        const label = i18n.t('theme.darkTheme');
        return (!label || label === 'theme.darkTheme') ? 'Dark Theme' : label;
    }
    if (normalizedId === 'light') {
        const label = i18n.t('theme.lightTheme');
        return (!label || label === 'theme.lightTheme') ? 'Light Theme' : label;
    }
    const builtIn = getBuiltInPresetTheme(normalizedId);
    if (builtIn?.name) return builtIn.name;
    return String(themeId || '');
}

export function updateThemeSelector(options = {}) {
    const {
        currentTheme,
        getCustomThemes,
        getBuiltInPresetThemes,
        i18n
    } = options;

    const themeSelect = document.getElementById('theme-select');
    if (!themeSelect) return;

    const safeThemeLabel = (key, fallback) => {
        const translated = i18n.t(key);
        if (!translated || translated === key) return fallback;
        return translated;
    };

    const customThemes = getCustomThemes();
    const builtInPresets = getBuiltInPresetThemes();
    const optionsList = [
        { value: 'dark', label: safeThemeLabel('theme.darkTheme', 'Dark Theme') },
        { value: 'light', label: safeThemeLabel('theme.lightTheme', 'Light Theme') },
        ...builtInPresets.map((theme) => ({ value: theme.id, label: theme.name })),
        ...customThemes.map(t => ({ value: t.id, label: t.name }))
    ];

    const currentValue = themeSelect.value;
    themeSelect.innerHTML = '';
    optionsList.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        themeSelect.appendChild(option);
    });
    themeSelect.value = currentValue;
    if (themeSelect.value !== currentValue) {
        themeSelect.value = currentTheme || 'dark';
    }

}

export function renderThemeManager(options = {}) {
    const {
        currentTheme,
        DEFAULT_THEME_FONTS,
        getBuiltInPresetThemes,
        getBuiltInPresetTheme,
        getCustomThemes,
        setTheme,
        deleteCustomTheme,
        editTheme,
        uploadTheme,
        syncThemeManagerActiveItem,
        i18n
    } = options;

    const presetContainer = document.getElementById('preset-themes');
    const customContainer = document.getElementById('custom-themes');
    const customThemes = getCustomThemes();

    if (!presetContainer || !customContainer) return;

    presetContainer.innerHTML = '';
    const presetEntries = [
        {
            id: 'dark',
            name: getThemeDisplayName('dark', { i18n, getBuiltInPresetTheme }),
            data: {
                fonts: DEFAULT_THEME_FONTS,
                colors: {
                    appGradientA: '#0b1528',
                    appGradientB: '#0f2236',
                    accentColor: '#66ccff'
                }
            }
        },
        {
            id: 'light',
            name: getThemeDisplayName('light', { i18n, getBuiltInPresetTheme }),
            data: {
                fonts: DEFAULT_THEME_FONTS,
                colors: {
                    appGradientA: '#dbe9f7',
                    appGradientB: '#e7f3ff',
                    accentColor: '#3db2d6'
                }
            }
        },
        ...getBuiltInPresetThemes().map((theme) => ({
            id: theme.id,
            name: theme.name,
            data: theme
        }))
    ];

    presetEntries.forEach((preset) => {
        const isActive = currentTheme === preset.id;
        const item = createThemeItem({
            id: preset.id,
            name: preset.name,
            type: 'preset',
            isActive,
            themeData: preset.data,
            setTheme,
            syncThemeManagerActiveItem,
            i18n
        });
        presetContainer.appendChild(item);
    });

    customContainer.innerHTML = '';
    customThemes.forEach(theme => {
        const isActive = currentTheme === theme.id;
        const item = createThemeItem({
            id: theme.id,
            name: theme.name,
            type: 'custom',
            isActive,
            themeData: theme,
            setTheme,
            syncThemeManagerActiveItem,
            editTheme,
            uploadTheme,
            deleteCustomTheme,
            i18n
        });
        customContainer.appendChild(item);
    });

}

function createThemeItem(options = {}) {
    const {
        id,
        name,
        type,
        isActive,
        themeData,
        setTheme,
        syncThemeManagerActiveItem,
        editTheme,
        uploadTheme,
        deleteCustomTheme,
        i18n
    } = options;

    const item = document.createElement('div');
    item.className = `theme-item ${isActive ? 'active' : ''}`;
    item.dataset.themeId = String(id);

    const preview = document.createElement('div');
    preview.className = 'theme-preview';

    let dots = [];
    if (type === 'preset') {
        if (themeData && themeData.colors) {
            dots = [
                themeData.colors.appGradientA || themeData.colors.bgPrimary || '#1e1e1e',
                themeData.colors.appGradientB || themeData.colors.bgSecondary || '#2d2d2d',
                themeData.colors.accentColor || '#66ccff'
            ];
        } else {
            dots = id === 'dark'
                ? ['#1e1e1e', '#ffffff', '#66ccff']
                : ['#f5f5f5', '#1a1a1a', '#0099cc'];
        }
    } else {
        dots = [
            themeData.colors.appGradientA || themeData.colors.bgPrimary,
            themeData.colors.appGradientB || themeData.colors.bgSecondary,
            themeData.colors.accentColor
        ];
    }

    dots.forEach(color => {
        const dot = document.createElement('div');
        dot.className = 'theme-color-dot';
        dot.style.backgroundColor = color;
        dot.style.boxShadow = `0 0 5px ${color}44`;
        preview.appendChild(dot);
    });

    item.appendChild(preview);

    item.innerHTML += `
        <div class="theme-item-info">
            <span class="theme-item-name">${name}</span>
            <span class="theme-item-type">${type === 'preset' ? i18n.t('theme.official') : i18n.t('theme.custom')}</span>
        </div>
    `;

    item.addEventListener('click', () => {
        setTheme(id);
        localStorage.setItem('theme', id);
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) themeSelect.value = id;
        syncThemeManagerActiveItem(id);
    });

    if (type === 'custom') {
        const actions = document.createElement('div');
        actions.className = 'theme-item-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'action-btn small';
        editBtn.innerHTML = `
            <span class="icon-svg" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                    <path d="M14 4 20 10 11 19H5v-6L14 4Z"></path>
                    <path d="M14 4 17 7"></path>
                </svg>
            </span>
        `;
        editBtn.onclick = (e) => {
            e.stopPropagation();
            editTheme(themeData);
            const formElement = document.getElementById('form-title');
            if (formElement) {
                formElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        };

        const uploadBtn = document.createElement('button');
        uploadBtn.className = 'action-btn small';
        uploadBtn.innerHTML = `
            <span class="icon-svg" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                    <path d="M12 16V6"></path>
                    <path d="m8.5 9.5 3.5-3.5 3.5 3.5"></path>
                    <path d="M5 16.5v1.2A1.3 1.3 0 0 0 6.3 19h11.4a1.3 1.3 0 0 0 1.3-1.3v-1.2"></path>
                </svg>
            </span>
        `;
        uploadBtn.setAttribute('title', i18n.t('theme.upload') || 'Upload Theme');
        uploadBtn.setAttribute('aria-label', i18n.t('theme.upload') || 'Upload Theme');
        uploadBtn.onclick = (e) => {
            e.stopPropagation();
            uploadTheme(themeData);
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-btn remove-btn small icon-only-btn';
        deleteBtn.innerHTML = `
            <span class="icon-svg" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                    <path d="M9.2 5.5h5.6"></path>
                    <path d="M6.5 7h11"></path>
                    <path d="M8 7v11a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7"></path>
                    <path d="M10.5 10.5v5"></path>
                    <path d="M13.5 10.5v5"></path>
                </svg>
            </span>
        `;
        deleteBtn.setAttribute('title', i18n.t('buttons.delete') || 'Delete Theme');
        deleteBtn.setAttribute('aria-label', i18n.t('buttons.delete') || 'Delete Theme');
        deleteBtn.onclick = (e) => { e.stopPropagation(); deleteCustomTheme(id); };

        actions.appendChild(editBtn);
        actions.appendChild(uploadBtn);
        actions.appendChild(deleteBtn);
        item.appendChild(actions);
    }

    return item;
}
