import { makeDraggable } from './theme-manager';

const emubro = window.emubro;
let baseLanguageCache = null;

export function initLanguageManager() {
    const modal = document.getElementById('language-manager-modal');
    const closeBtn = document.getElementById('close-language-manager');
    const addBtn = document.getElementById('add-language-btn');
    const backBtn = document.getElementById('back-to-lang-list');
    const saveBtn = document.getElementById('save-lang-btn');
    const searchInput = document.getElementById('lang-search-keys');

    if (!modal) return;

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        modal.classList.remove('active');
        
        // If it was docked, completely remove it from the dock Set as well
        if (modal.classList.contains('docked-right')) {
            import('./docking-manager').then(m => m.completelyRemoveFromDock('language-manager-modal'));
        } else {
            import('./docking-manager').then(m => m.removeFromDock('language-manager-modal'));
        }
    });

    backBtn.addEventListener('click', () => {
        switchTab('lang-list');
    });

    saveBtn.addEventListener('click', () => {
        saveCurrentLanguage().catch((e) => console.error('Failed to save language:', e));
    });
    
    searchInput.addEventListener('input', (e) => {
        filterKeys(e.target.value);
    });

    addBtn.addEventListener('click', () => {
        const langCode = prompt(i18n.t('language.enterCode'));
        if (langCode && /^[a-z]{2,3}$/.test(langCode)) {
            createNewLanguage(langCode).catch((e) => console.error('Failed to create language:', e));
        } else if (langCode) {
            alert(i18n.t('language.invalidCode'));
        }
    });

    // Close on click outside - REMOVED because it conflicts with resizing
    /*
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
            import('./docking-manager').then(m => m.removeFromDock('language-manager-modal'));
        }
    });
    */
}

export function openLanguageManager() {
    const modal = document.getElementById('language-manager-modal');
    if (!modal) return;

    if (modal.classList.contains('docked-right')) {
        // Use toggleDock to "re-dock" and trigger all logic
        import('./docking-manager').then(m => m.toggleDock('language-manager-modal', 'pin-language-manager', true));
    } else {
        modal.style.display = 'flex';
        modal.classList.add('active');
        
        if (modal.style.top || modal.style.left) {
            modal.classList.add('moved');
        } else {
            modal.classList.remove('moved');
        }
    }

    loadLanguagesList();
    makeDraggable('language-manager-modal', 'language-manager-header');
}

function switchTab(tabName) {
    const modal = document.getElementById('language-manager-modal');
    const contents = modal.querySelectorAll('.tab-content');
    const tabs = modal.querySelectorAll('.tab-btn');

    contents.forEach(c => c.style.display = 'none');
    tabs.forEach(t => t.classList.remove('active'));

    const targetContent = document.getElementById(`${tabName}-view`);
    const targetTab = modal.querySelector(`[data-tab="${tabName}"]`);

    if (targetContent) targetContent.style.display = 'block';
    if (targetTab) targetTab.classList.add('active');
    
    // If going back to list, hide the editor tab
    if (tabName === 'lang-list') {
        const editorTab = modal.querySelector(`[data-tab="lang-edit"]`);
        if (editorTab) editorTab.style.display = 'none';
    }
}

function getBaseLanguage() {
    if (baseLanguageCache) return baseLanguageCache;

    // Prefer already-loaded translations from i18n initialization.
    if (typeof allTranslations !== 'undefined' && allTranslations && allTranslations['en']) {
        baseLanguageCache = { en: allTranslations['en'] };
        return baseLanguageCache;
    }

    baseLanguageCache = { en: {} };
    return baseLanguageCache;
}

function flattenObject(obj, prefix = '') {
    return Object.keys(obj).reduce((acc, k) => {
        const pre = prefix.length ? prefix + '.' : '';
        if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
            Object.assign(acc, flattenObject(obj[k], pre + k));
        } else {
            acc[pre + k] = obj[k];
        }
        return acc;
    }, {});
}

function calculateProgress(langData, langCode) {
    const base = getBaseLanguage();
    // Assuming structure is { "en": { ... } }
    const baseFlat = flattenObject(base['en'] || {});
    const targetFlat = flattenObject(langData[langCode] || {});

    const totalKeys = Object.keys(baseFlat).length;
    let translatedKeys = 0;

    Object.keys(baseFlat).forEach(key => {
        if (targetFlat[key]) translatedKeys++;
    });

    return totalKeys === 0 ? 0 : Math.round((translatedKeys / totalKeys) * 100);
}

function loadLanguagesList() {
    const listContainer = document.getElementById('language-list');
    listContainer.innerHTML = i18n.t('language.loading');

    if (!emubro || !emubro.locales) {
        listContainer.innerHTML = i18n.t('language.loadError');
        return;
    }

    emubro.locales
        .list()
        .then((languages) => {
            renderLanguages(Array.isArray(languages) ? languages : []);
        })
        .catch((err) => {
            console.error('Failed to list locales:', err);
            listContainer.innerHTML = i18n.t('language.loadError');
        });
}

function renderLanguages(languages) {
    const listContainer = document.getElementById('language-list');
    listContainer.innerHTML = '';

    languages.forEach(lang => {
        const progress = calculateProgress(lang.data, lang.code);
        const langInfo = lang.data[lang.code].language || {};
        const name = langInfo.name || lang.code;
        const flag = langInfo.flag || '';

        const card = document.createElement('div');
        card.className = 'language-card';
        card.innerHTML = `
            <div class="lang-info">
                <span class="fi fi-${flag}"></span>
                <span class="lang-name">${name}</span>
                <span class="lang-code">(${lang.code})</span>
            </div>
            <div class="lang-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <span class="progress-text">${progress}%</span>
            </div>
            <div class="lang-actions">
                <button class="action-btn small edit-btn">Edit</button>
            </div>
        `;

        card.querySelector('.edit-btn').addEventListener('click', () => {
            openEditor(lang);
        });

        listContainer.appendChild(card);
    });
}

let currentLangData = null;

function openEditor(lang) {
    currentLangData = lang;
    const editorTab = document.getElementById('lang-edit-view');
    const editorTabBtn = document.querySelector(`[data-tab="lang-edit"]`);
    const title = document.getElementById('editing-lang-name');
    const list = document.getElementById('lang-keys-list');
    const search = document.getElementById('lang-search-keys');
    
    title.textContent = i18n.t('language.editing', {name: lang.data[lang.code].language?.name || lang.code});
    editorTabBtn.style.display = 'block';
    switchTab('lang-edit');
    search.value = '';

    renderEditorKeys();
}

function renderEditorKeys(filter = '') {
    const list = document.getElementById('lang-keys-list');
    list.innerHTML = '';
    
    const base = getBaseLanguage();
    const baseFlat = flattenObject(base['en'] || {});
    const targetFlat = flattenObject(currentLangData.data[currentLangData.code] || {});
    
    const keys = Object.keys(baseFlat).sort();
    
    const fragment = document.createDocumentFragment();
    let count = 0;

    keys.forEach(key => {
        const baseVal = baseFlat[key];
        const targetVal = targetFlat[key] || '';
        
        if (filter && !key.toLowerCase().includes(filter.toLowerCase()) && 
            !String(baseVal).toLowerCase().includes(filter.toLowerCase()) && 
            !String(targetVal).toLowerCase().includes(filter.toLowerCase())) {
            return;
        }
        
        // Don't limit to 100 if searching, but maybe lazy load? 
        // For simplicity, just render all (might be slow if thousands)
        // Optimization: render first 500
        if (count > 500 && filter === '') return; 
        
        const row = document.createElement('div');
        row.className = 'lang-key-row';
        if (!targetVal) row.classList.add('missing');
        
        row.innerHTML = `
            <div class="key-label" title="${key}">${key}</div>
            <div class="base-value" title="${baseVal}">${baseVal}</div>
            <div class="target-value">
                <textarea class="lang-input" data-key="${key}">${targetVal}</textarea>
            </div>
        `;
        
        fragment.appendChild(row);
        count++;
    });
    
    if (keys.length > 500 && filter === '') {
        const info = document.createElement('div');
        info.style.textAlign = 'center';
        info.style.padding = '10px';
        info.textContent = i18n.t('language.showingFirst');
        fragment.appendChild(info);
    }

    list.appendChild(fragment);
}

function filterKeys(text) {
    renderEditorKeys(text);
}

function unflattenObject(data) {
    const result = {};
    for (const i in data) {
        const keys = i.split('.');
        keys.reduce((acc, value, index) => {
            return acc[value] || (acc[value] = (index + 1 === keys.length ? data[i] : {}));
        }, result);
    }
    return result;
}

async function saveCurrentLanguage() {
    if (!currentLangData) return;
    
    const inputs = document.querySelectorAll('.lang-input');
    const flatData = {};
    
    // Re-read existing flat data to keep keys that might be hidden by search/limit
    const existingFlat = flattenObject(currentLangData.data[currentLangData.code] || {});
    Object.assign(flatData, existingFlat);

    inputs.forEach(input => {
        flatData[input.dataset.key] = input.value;
    });
    
    // Remove empty keys if desired? Or keep them empty string?
    // User wants to edit.
    
    const newData = unflattenObject(flatData);
    const finalJson = { [currentLangData.code]: newData };
    
    // Preserve language metadata if it was overwritten
    // Actually unflattenObject reconstructs it.
    
    try {
        await emubro.locales.write(currentLangData.filename, finalJson);
        alert(i18n.t('language.saveSuccess'));
        
        // Update current data in memory
        currentLangData.data = finalJson;
        
        // Reload i18n?
        // We need to tell i18n-manager to reload, or reload app.
        if (confirm(i18n.t('language.reloadPrompt'))) {
            location.reload();
        }
    } catch (e) {
        alert(i18n.t('language.saveError', {message: e.message}));
    }
}

async function createNewLanguage(code) {
    const filename = `${code}.json`;

    // The file is written via the main process into a writable locales directory.
    const exists = await emubro.locales.exists(filename);
    if (exists) {
        alert(i18n.t('language.alreadyExists'));
        return;
    }

    // Create minimal structure
    const newJson = {
        [code]: {
            language: {
                name: code.toUpperCase(),
                flag: "",
                selectLanguage: "Select Language"
            }
        }
    };

    try {
        await emubro.locales.write(filename, newJson);
        loadLanguagesList();

        // Automatically open editor
        const lang = {
            code: code,
            data: newJson,
            filename: filename
        };
        openEditor(lang);
    } catch (e) {
        alert(i18n.t('language.createError', { message: e.message }));
    }
}
