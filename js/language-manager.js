import { makeDraggable } from './theme-manager';
import { updateUILanguage } from './i18n-manager';
import { showTextInputDialog } from './ui/text-input-dialog';
import { loadSuggestionSettings, normalizeSuggestionProvider } from './suggestions-settings';

const emubro = window.emubro;
let baseLanguageCache = null;
let currentLangData = null;
let liveEditEnabled = false;
let liveEditClickHandler = null;
let collapsedEditorGroups = new Set();

const LIVE_EDIT_SELECTOR = '[data-i18n], [data-i18n-placeholder]';
const ROOT_EDITOR_GROUP_KEY = '__root__';
const MAX_EDITOR_ROWS_DEFAULT = 500;
const LLM_TRANSLATION_MODE_STORAGE_KEY = 'emubro.languageManager.llmTranslationMode';
const LLM_TRANSLATION_RETRANSLATE_EXISTING_STORAGE_KEY = 'emubro.languageManager.llmTranslationRetranslateExisting';
const LLM_TRANSLATION_MODE_ONE_BY_ONE = 'one-by-one';
const LLM_TRANSLATION_MODE_ALL_IN_ONE_JSON = 'all-in-one-json';
const LANGUAGE_CODE_PATTERN = /^[a-z]{2,3}$/;
const FLAG_CODE_PATTERN = /^[a-z]{2}$/;
const DEFAULT_FLAG_CODES = [
    'us', 'gb', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'be', 'at', 'ch', 'ie',
    'se', 'no', 'dk', 'fi', 'pl', 'cz', 'sk', 'hu', 'ro', 'bg', 'gr', 'tr',
    'ru', 'ua', 'jp', 'kr', 'cn', 'tw', 'hk', 'in', 'id', 'th', 'vn', 'my',
    'ph', 'sg', 'au', 'nz', 'ca', 'mx', 'br', 'ar', 'cl', 'co', 'za'
];

export function initLanguageManager() {
    const modal = document.getElementById('language-manager-modal');
    const closeBtn = document.getElementById('close-language-manager');
    const addBtn = document.getElementById('add-language-btn');
    const backBtn = document.getElementById('back-to-lang-list');
    const saveBtn = document.getElementById('save-lang-btn');
    const exportAllBtn = document.getElementById('export-all-languages-btn');
    const exportCurrentBtn = document.getElementById('export-current-lang-btn');
    const translateBtn = document.getElementById('lang-translate-llm-btn');
    const translationModeSelect = document.getElementById('lang-translate-llm-mode');
    const retranslateExistingToggle = document.getElementById('lang-translate-llm-retranslate-existing');
    const searchInput = document.getElementById('lang-search-keys');
    const liveEditToggle = document.getElementById('lang-live-edit-toggle');

    if (!modal) return;

    closeBtn.addEventListener('click', () => {
        setLiveEditEnabled(false);
        setLlmTranslateStatus('');
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
        setLiveEditEnabled(false);
        switchTab('lang-list');
    });

    saveBtn.addEventListener('click', () => {
        saveCurrentLanguage().catch((e) => console.error('Failed to save language:', e));
    });

    if (exportAllBtn) {
        exportAllBtn.addEventListener('click', () => {
            exportAllLanguagesAsJson().catch((e) => {
                console.error('Failed to export all languages:', e);
                alert(i18n.t('language.exportError', { message: String(e?.message || e || 'Unknown error') }));
            });
        });
    }

    if (exportCurrentBtn) {
        exportCurrentBtn.addEventListener('click', () => {
            exportCurrentLanguageAsJson().catch((e) => {
                console.error('Failed to export current language:', e);
                alert(i18n.t('language.exportError', { message: String(e?.message || e || 'Unknown error') }));
            });
        });
    }

    if (translateBtn) {
        translateBtn.addEventListener('click', () => {
            translateMissingKeysWithLlm(translateBtn).catch((error) => {
                console.error('LLM translation failed:', error);
                setLlmTranslateStatus(i18n.t('language.translateLlmFailed', { message: String(error?.message || error || 'Unknown error') }), 'error');
            });
        });
    }

    if (translationModeSelect) {
        const savedMode = normalizeLlmTranslationMode(
            localStorage.getItem(LLM_TRANSLATION_MODE_STORAGE_KEY),
            LLM_TRANSLATION_MODE_ALL_IN_ONE_JSON
        );
        translationModeSelect.value = savedMode;

        translationModeSelect.addEventListener('change', () => {
            const nextMode = normalizeLlmTranslationMode(
                translationModeSelect.value,
                LLM_TRANSLATION_MODE_ALL_IN_ONE_JSON
            );
            translationModeSelect.value = nextMode;
            localStorage.setItem(LLM_TRANSLATION_MODE_STORAGE_KEY, nextMode);
        });
    }

    if (retranslateExistingToggle) {
        const savedValue = String(localStorage.getItem(LLM_TRANSLATION_RETRANSLATE_EXISTING_STORAGE_KEY) || '').trim();
        retranslateExistingToggle.checked = savedValue === '1';
        retranslateExistingToggle.addEventListener('change', () => {
            localStorage.setItem(
                LLM_TRANSLATION_RETRANSLATE_EXISTING_STORAGE_KEY,
                retranslateExistingToggle.checked ? '1' : '0'
            );
        });
    }
    
    searchInput.addEventListener('input', (e) => {
        filterKeys(e.target.value);
    });

    if (liveEditToggle) {
        liveEditToggle.checked = false;
        liveEditToggle.addEventListener('change', () => {
            setLiveEditEnabled(liveEditToggle.checked);
        });
    }

    addBtn.addEventListener('click', async () => {
        const payload = await showAddLanguageDialog();
        if (!payload) return;
        createNewLanguage(payload).catch((e) => console.error('Failed to create language:', e));
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
        setLiveEditEnabled(false);
        setLlmTranslateStatus('');
        const editorTab = modal.querySelector(`[data-tab="lang-edit"]`);
        if (editorTab) editorTab.style.display = 'none';
    }
}

function getNestedValue(source, keyPath) {
    if (!source || !keyPath) return '';
    const keys = String(keyPath).split('.');
    let node = source;
    for (const key of keys) {
        if (!node || typeof node !== 'object' || !(key in node)) return '';
        node = node[key];
    }
    return node;
}

function setNestedValue(target, keyPath, value) {
    if (!target || !keyPath) return;
    const keys = String(keyPath).split('.');
    let node = target;
    keys.forEach((key, idx) => {
        if (idx === keys.length - 1) {
            node[key] = value;
            return;
        }
        if (!node[key] || typeof node[key] !== 'object' || Array.isArray(node[key])) {
            node[key] = {};
        }
        node = node[key];
    });
}

function getLiveEditTarget(startNode) {
    const source = startNode instanceof Element
        ? startNode
        : (startNode?.parentElement || null);
    if (!(source instanceof Element)) return null;

    const target = source.closest(LIVE_EDIT_SELECTOR);
    if (!target) return null;

    if (target.id === 'lang-live-edit-toggle') return null;
    if (target.closest('#lang-keys-list')) return null;
    if (target.closest('#lang-live-edit-toggle-wrap')) return null;

    return target;
}

function getTranslationKeyForElement(element) {
    if (!element) return '';
    return String(
        element.getAttribute('data-i18n')
        || element.getAttribute('data-i18n-placeholder')
        || ''
    ).trim();
}

function isPointerInsideLiveEditHotspot(event, element) {
    if (!event || !element || typeof element.getBoundingClientRect !== 'function') return false;
    if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return false;

    const rect = element.getBoundingClientRect();
    // Keep this in sync with the pencil badge geometry from _language-selector.scss.
    // Badge is rendered inside the element bounds (top-right corner).
    const badgeSize = 16;
    const inset = 2;
    const hotspotPadding = 3; // make the hitbox a bit easier to click
    const hotspotLeft = rect.right - inset - badgeSize - hotspotPadding;
    const hotspotRight = rect.right - inset + hotspotPadding;
    const hotspotTop = rect.top + inset - hotspotPadding;
    const hotspotBottom = rect.top + inset + badgeSize + hotspotPadding;

    return event.clientX >= hotspotLeft
        && event.clientX <= hotspotRight
        && event.clientY >= hotspotTop
        && event.clientY <= hotspotBottom;
}

function applyLiveEditValueToElement(element, key, value) {
    if (!element || !key) return;

    if (element.hasAttribute('data-i18n')) {
        element.textContent = value;
        return;
    }

    if (element.hasAttribute('data-i18n-placeholder')) {
        element.placeholder = value;
    }
}

function attachLiveEditHandler() {
    if (liveEditClickHandler) return;
    liveEditClickHandler = async (event) => {
        if (!liveEditEnabled || !currentLangData) return;
        if (event.button !== 0) return;

        const target = getLiveEditTarget(event.target);
        if (!target) return;

        const key = getTranslationKeyForElement(target);
        if (!key) return;

        // Live edit should only trigger when explicitly clicking the pencil hotspot.
        // All other clicks must continue to the element's normal action.
        if (!isPointerInsideLiveEditHotspot(event, target)) return;

        event.preventDefault();
        event.stopPropagation();

        const langRoot = currentLangData.data?.[currentLangData.code] || {};
        const baseRoot = getBaseLanguage().en || {};
        const currentValue = String(getNestedValue(langRoot, key) || '');
        const fallbackValue = String(getNestedValue(baseRoot, key) || '');
        const nextValue = await showTextInputDialog({
            title: i18n.t('language.managerTitle'),
            message: `Edit translation:\n${key}`,
            initialValue: currentValue || fallbackValue,
            confirmLabel: i18n.t('buttons.save'),
            cancelLabel: i18n.t('buttons.cancel')
        });

        if (nextValue === null) return;

        if (!currentLangData.data[currentLangData.code]) {
            currentLangData.data[currentLangData.code] = {};
        }
        setNestedValue(currentLangData.data[currentLangData.code], key, nextValue);

        if (typeof allTranslations !== 'undefined') {
            if (!allTranslations[currentLangData.code]) allTranslations[currentLangData.code] = {};
            setNestedValue(allTranslations[currentLangData.code], key, nextValue);
        }

        applyLiveEditValueToElement(target, key, nextValue);

        const searchValue = String(document.getElementById('lang-search-keys')?.value || '');
        renderEditorKeys(searchValue);

        if (i18n.getLanguage() === currentLangData.code) {
            updateUILanguage();
        }
    };

    document.addEventListener('click', liveEditClickHandler, true);
}

function detachLiveEditHandler() {
    if (!liveEditClickHandler) return;
    document.removeEventListener('click', liveEditClickHandler, true);
    liveEditClickHandler = null;
}

function setLiveEditEnabled(enabled) {
    liveEditEnabled = !!enabled;
    document.body.classList.toggle('live-edit-mode', liveEditEnabled);

    const toggle = document.getElementById('lang-live-edit-toggle');
    if (toggle && toggle.checked !== liveEditEnabled) {
        toggle.checked = liveEditEnabled;
    }

    if (liveEditEnabled) {
        attachLiveEditHandler();
    } else {
        detachLiveEditHandler();
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

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function collectAvailableFlagCodes() {
    const flags = new Set(DEFAULT_FLAG_CODES);

    if (typeof allTranslations !== 'undefined' && allTranslations && typeof allTranslations === 'object') {
        Object.values(allTranslations).forEach((entry) => {
            const flag = String(entry?.language?.flag || '').trim().toLowerCase();
            if (FLAG_CODE_PATTERN.test(flag)) {
                flags.add(flag);
            }
        });
    }

    return Array.from(flags).sort((a, b) => a.localeCompare(b));
}

function normalizeLanguageCreationPayload(input = {}) {
    const code = String(input.code || '').trim().toLowerCase();
    const name = String(input.name || '').trim();
    const abbreviationInput = String(input.abbreviation || '').trim();
    const flag = String(input.flag || '').trim().toLowerCase();

    if (!LANGUAGE_CODE_PATTERN.test(code)) {
        return { valid: false, message: i18n.t('language.invalidCode') };
    }
    if (!name) {
        return { valid: false, message: i18n.t('language.addDialogInvalidName') };
    }
    if (!FLAG_CODE_PATTERN.test(flag)) {
        return { valid: false, message: i18n.t('language.addDialogInvalidFlag') };
    }

    const abbreviation = abbreviationInput || code.toUpperCase();
    return {
        valid: true,
        value: {
            code,
            name,
            abbreviation,
            flag
        }
    };
}

function showAddLanguageDialog() {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.cssText = [
            'position:fixed',
            'inset:0',
            'z-index:3950',
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'padding:20px',
            'background:rgba(0,0,0,0.58)'
        ].join(';');

        const modal = document.createElement('div');
        modal.className = 'glass';
        modal.style.cssText = [
            'width:min(580px,100%)',
            'background:var(--bg-secondary)',
            'border:1px solid var(--border-color)',
            'border-radius:14px',
            'padding:16px',
            'box-shadow:0 18px 42px rgba(0,0,0,0.45)',
            'display:grid',
            'gap:12px'
        ].join(';');

        const flagOptions = collectAvailableFlagCodes()
            .map((flagCode) => `<option value="${escapeHtml(flagCode)}">${escapeHtml(flagCode.toUpperCase())}</option>`)
            .join('');

        modal.innerHTML = `
            <h3 style="margin:0;font-size:1.05rem;color:var(--accent-color);">${escapeHtml(i18n.t('language.addDialogTitle'))}</h3>
            <div style="white-space:pre-wrap;line-height:1.45;color:var(--text-secondary);">${escapeHtml(i18n.t('language.addDialogMessage'))}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <label style="display:grid;gap:6px;">
                    <span style="font-size:0.82rem;color:var(--text-secondary);">${escapeHtml(i18n.t('language.addDialogNameLabel'))}</span>
                    <input type="text" data-lang-name placeholder="${escapeHtml(i18n.t('language.addDialogNamePlaceholder'))}" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-primary);color:var(--text-primary);" />
                </label>
                <label style="display:grid;gap:6px;">
                    <span style="font-size:0.82rem;color:var(--text-secondary);">${escapeHtml(i18n.t('language.addDialogCodeLabel'))}</span>
                    <input type="text" data-lang-code placeholder="${escapeHtml(i18n.t('language.addDialogCodePlaceholder'))}" maxlength="3" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-primary);color:var(--text-primary);" />
                </label>
                <label style="display:grid;gap:6px;">
                    <span style="font-size:0.82rem;color:var(--text-secondary);">${escapeHtml(i18n.t('language.addDialogAbbrLabel'))}</span>
                    <input type="text" data-lang-abbreviation placeholder="${escapeHtml(i18n.t('language.addDialogAbbrPlaceholder'))}" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-primary);color:var(--text-primary);" />
                </label>
                <label style="display:grid;gap:6px;">
                    <span style="font-size:0.82rem;color:var(--text-secondary);">${escapeHtml(i18n.t('language.addDialogFlagLabel'))}</span>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span data-lang-flag-preview class="fi fi-us" style="font-size:1.15rem;min-width:24px;"></span>
                        <select data-lang-flag style="flex:1;height:40px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-primary);color:var(--text-primary);padding:0 10px;">
                            ${flagOptions}
                        </select>
                    </div>
                </label>
            </div>
            <div data-error-text style="min-height:1em;color:var(--danger-color);font-size:0.85rem;"></div>
            <div style="display:flex;justify-content:flex-end;gap:8px;">
                <button class="action-btn small" type="button" data-dialog-cancel>${escapeHtml(i18n.t('buttons.cancel'))}</button>
                <button class="action-btn launch-btn" type="button" data-dialog-confirm>${escapeHtml(i18n.t('buttons.create'))}</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const nameInput = modal.querySelector('[data-lang-name]');
        const codeInput = modal.querySelector('[data-lang-code]');
        const abbrInput = modal.querySelector('[data-lang-abbreviation]');
        const flagSelect = modal.querySelector('[data-lang-flag]');
        const flagPreview = modal.querySelector('[data-lang-flag-preview]');
        const errorText = modal.querySelector('[data-error-text]');
        const confirmBtn = modal.querySelector('[data-dialog-confirm]');
        const cancelBtn = modal.querySelector('[data-dialog-cancel]');

        if (flagSelect && flagSelect.querySelector('option[value="us"]')) {
            flagSelect.value = 'us';
        }

        const cleanup = () => {
            document.removeEventListener('keydown', onKeyDown, true);
            overlay.remove();
        };

        const closeWith = (value) => {
            cleanup();
            resolve(value);
        };

        const updateFlagPreview = () => {
            const flagCode = String(flagSelect?.value || 'us').trim().toLowerCase();
            if (!flagPreview) return;
            flagPreview.className = `fi fi-${FLAG_CODE_PATTERN.test(flagCode) ? flagCode : 'us'}`;
        };

        const tryConfirm = () => {
            const payload = normalizeLanguageCreationPayload({
                name: String(nameInput?.value || ''),
                code: String(codeInput?.value || ''),
                abbreviation: String(abbrInput?.value || ''),
                flag: String(flagSelect?.value || '')
            });

            if (!payload.valid) {
                if (errorText) errorText.textContent = payload.message || i18n.t('language.createError');
                if (nameInput && !String(nameInput.value || '').trim()) nameInput.focus();
                else if (codeInput && !LANGUAGE_CODE_PATTERN.test(String(codeInput.value || '').trim().toLowerCase())) codeInput.focus();
                return;
            }

            closeWith(payload.value);
        };

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeWith(null);
                return;
            }
            if (event.key === 'Enter') {
                event.preventDefault();
                tryConfirm();
            }
        };

        confirmBtn?.addEventListener('click', tryConfirm);
        cancelBtn?.addEventListener('click', () => closeWith(null));
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) closeWith(null);
        });
        flagSelect?.addEventListener('change', updateFlagPreview);
        codeInput?.addEventListener('input', () => {
            if (!codeInput) return;
            const cleaned = String(codeInput.value || '').toLowerCase().replace(/[^a-z]/g, '');
            if (codeInput.value !== cleaned) codeInput.value = cleaned;
            if (errorText && errorText.textContent) errorText.textContent = '';
        });
        nameInput?.addEventListener('input', () => {
            if (errorText && errorText.textContent) errorText.textContent = '';
        });
        abbrInput?.addEventListener('input', () => {
            if (errorText && errorText.textContent) errorText.textContent = '';
        });

        document.addEventListener('keydown', onKeyDown, true);
        updateFlagPreview();
        if (nameInput) {
            nameInput.focus();
        }
    });
}

function sanitizeFilenamePart(value, fallback = 'locale') {
    const normalized = String(value || '').trim().replace(/[^a-z0-9._-]+/gi, '-');
    return normalized || fallback;
}

function triggerJsonDownload(filename, jsonPayload) {
    const jsonText = JSON.stringify(jsonPayload, null, 2);
    const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
}

function buildCurrentLanguageDraftJson() {
    if (!currentLangData) return null;

    const inputs = document.querySelectorAll('.lang-input');
    const flatData = {};

    const existingFlat = flattenObject(currentLangData.data[currentLangData.code] || {});
    Object.assign(flatData, existingFlat);

    inputs.forEach((input) => {
        flatData[input.dataset.key] = input.value;
    });

    const newData = unflattenObject(flatData);
    return { [currentLangData.code]: newData };
}

function getLanguageJsonForExport(lang, { includeEditorDraft = false } = {}) {
    if (!lang || !lang.code) return null;
    if (includeEditorDraft && currentLangData && currentLangData.code === lang.code) {
        const draft = buildCurrentLanguageDraftJson();
        if (draft) return draft;
    }
    if (lang.data && typeof lang.data === 'object') {
        return JSON.parse(JSON.stringify(lang.data));
    }
    return { [lang.code]: {} };
}

function exportLanguageJson(lang, options = {}) {
    const payload = getLanguageJsonForExport(lang, options);
    if (!payload) {
        throw new Error('No language payload available.');
    }
    const filename = `${sanitizeFilenamePart(lang.code || 'locale')}.json`;
    triggerJsonDownload(filename, payload);
}

async function exportCurrentLanguageAsJson() {
    if (!currentLangData) {
        throw new Error('No language is currently open.');
    }
    exportLanguageJson(currentLangData, { includeEditorDraft: true });
}

async function exportAllLanguagesAsJson() {
    if (!emubro || !emubro.locales || typeof emubro.locales.list !== 'function') {
        throw new Error('Locales API is not available.');
    }
    const languages = await emubro.locales.list();
    const allLocales = {};
    (Array.isArray(languages) ? languages : []).forEach((lang) => {
        const code = String(lang?.code || '').trim();
        if (!code) return;
        const payload = getLanguageJsonForExport(lang, { includeEditorDraft: false }) || {};
        allLocales[code] = payload[code] || {};
    });
    triggerJsonDownload('emubro-locales-all.json', allLocales);
}

function getEditorGroupKey(keyPath) {
    const text = String(keyPath || '').trim();
    if (!text || !text.includes('.')) return ROOT_EDITOR_GROUP_KEY;
    const first = text.split('.')[0];
    return first ? first.trim() : ROOT_EDITOR_GROUP_KEY;
}

function getEditorGroupLabel(groupKey) {
    if (groupKey === ROOT_EDITOR_GROUP_KEY) return 'General';
    return String(groupKey || '').trim() || 'General';
}

function buildEditorRowMarkup({ key, baseVal, targetVal }) {
    const safeKey = escapeHtml(key);
    const safeBaseVal = escapeHtml(baseVal);
    const safeTargetVal = escapeHtml(targetVal);
    const missingClass = targetVal ? '' : ' missing';
    return `
        <div class="lang-key-row${missingClass}">
            <div class="key-label" title="${safeKey}">${safeKey}</div>
            <div class="base-value" title="${safeBaseVal}">${safeBaseVal}</div>
            <div class="target-value">
                <textarea class="lang-input" data-key="${safeKey}">${safeTargetVal}</textarea>
            </div>
        </div>
    `;
}

function bindEditorGroupToggles(rootEl) {
    if (!rootEl) return;
    rootEl.querySelectorAll('[data-lang-group-toggle]').forEach((button) => {
        button.addEventListener('click', () => {
            const groupKey = String(button.dataset.langGroupToggle || '').trim();
            if (!groupKey) return;

            const section = button.closest('[data-lang-group]');
            if (!section) return;

            const currentlyCollapsed = section.classList.contains('is-collapsed');
            if (currentlyCollapsed) {
                section.classList.remove('is-collapsed');
                collapsedEditorGroups.delete(groupKey);
                button.setAttribute('aria-expanded', 'true');
            } else {
                section.classList.add('is-collapsed');
                collapsedEditorGroups.add(groupKey);
                button.setAttribute('aria-expanded', 'false');
            }
        });
    });
}

function renderLanguages(languages) {
    const listContainer = document.getElementById('language-list');
    listContainer.innerHTML = '';

    languages.forEach(lang => {
        const progress = calculateProgress(lang.data, lang.code);
        const langInfo = lang.data[lang.code].language || {};
        const name = String(langInfo.name || lang.code || '');
        const rawFlag = String(langInfo.flag || '').trim().toLowerCase();
        const flag = FLAG_CODE_PATTERN.test(rawFlag) ? rawFlag : '';
        const abbreviation = String(langInfo.abbreviation || lang.code || '').trim();
        const safeName = escapeHtml(name);
        const safeAbbreviation = escapeHtml(abbreviation || lang.code);
        const safeFlagClass = flag ? `fi fi-${flag}` : 'fi';

        const card = document.createElement('div');
        card.className = 'language-card';
        card.innerHTML = `
            <div class="lang-info">
                <span class="${safeFlagClass}"></span>
                <span class="lang-name">${safeName}</span>
                <span class="lang-code">(${safeAbbreviation})</span>
            </div>
            <div class="lang-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <span class="progress-text">${progress}%</span>
            </div>
            <div class="lang-actions">
                <button class="action-btn small export-btn" type="button">${escapeHtml(i18n.t('language.exportJson'))}</button>
                <button class="action-btn small edit-btn" type="button">${escapeHtml(i18n.t('language.editButton'))}</button>
            </div>
        `;

        card.querySelector('.edit-btn').addEventListener('click', () => {
            openEditor(lang);
        });
        card.querySelector('.export-btn').addEventListener('click', () => {
            try {
                exportLanguageJson(lang, { includeEditorDraft: false });
            } catch (error) {
                console.error('Failed to export language:', error);
                alert(i18n.t('language.exportError', { message: String(error?.message || error || 'Unknown error') }));
            }
        });

        listContainer.appendChild(card);
    });
}

function openEditor(lang) {
    setLiveEditEnabled(false);
    setLlmTranslateStatus('');
    currentLangData = lang;
    collapsedEditorGroups = new Set();
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
    const normalizedFilter = String(filter || '').trim().toLowerCase();
    const matches = keys.filter((key) => {
        if (!normalizedFilter) return true;
        const baseVal = String(baseFlat[key] || '');
        const targetVal = String(targetFlat[key] || '');
        return key.toLowerCase().includes(normalizedFilter)
            || baseVal.toLowerCase().includes(normalizedFilter)
            || targetVal.toLowerCase().includes(normalizedFilter);
    });

    const visibleKeys = normalizedFilter
        ? matches
        : matches.slice(0, MAX_EDITOR_ROWS_DEFAULT);

    const groupedRows = new Map();
    visibleKeys.forEach((key) => {
        const groupKey = getEditorGroupKey(key);
        if (!groupedRows.has(groupKey)) groupedRows.set(groupKey, []);
        groupedRows.get(groupKey).push({
            key,
            baseVal: String(baseFlat[key] || ''),
            targetVal: String(targetFlat[key] || '')
        });
    });

    const fragment = document.createDocumentFragment();
    groupedRows.forEach((rows, groupKey) => {
        const section = document.createElement('section');
        section.className = 'lang-key-group';
        section.dataset.langGroup = groupKey;

        const isCollapsed = !normalizedFilter && collapsedEditorGroups.has(groupKey);
        if (isCollapsed) section.classList.add('is-collapsed');

        const groupLabel = getEditorGroupLabel(groupKey);
        const rowsMarkup = rows.map((row) => buildEditorRowMarkup(row)).join('');

        section.innerHTML = `
            <button class="lang-key-group-header" type="button" data-lang-group-toggle="${escapeHtml(groupKey)}" aria-expanded="${isCollapsed ? 'false' : 'true'}">
                <span class="lang-key-group-label">${escapeHtml(groupLabel)}</span>
                <span class="lang-key-group-count">${rows.length}</span>
            </button>
            <div class="lang-key-group-body">
                ${rowsMarkup}
            </div>
        `;

        fragment.appendChild(section);
    });

    if (matches.length > MAX_EDITOR_ROWS_DEFAULT && !normalizedFilter) {
        const info = document.createElement('div');
        info.style.textAlign = 'center';
        info.style.padding = '10px';
        info.textContent = i18n.t('language.showingFirst');
        fragment.appendChild(info);
    }

    list.appendChild(fragment);
    bindEditorGroupToggles(list);
}

function setLlmTranslateStatus(message = '', level = 'info') {
    const statusEl = document.getElementById('lang-translate-llm-status');
    if (!statusEl) return;
    statusEl.textContent = String(message || '');
    statusEl.classList.remove('is-success', 'is-error');
    if (level === 'success') statusEl.classList.add('is-success');
    if (level === 'error') statusEl.classList.add('is-error');
}

function getLlmTranslationConfig() {
    const settings = loadSuggestionSettings(localStorage);
    const provider = normalizeSuggestionProvider(settings?.provider);
    const model = String(settings?.models?.[provider] || '').trim();
    const baseUrl = String(settings?.baseUrls?.[provider] || '').trim();
    const apiKey = String(settings?.apiKeys?.[provider] || '').trim();
    return { provider, model, baseUrl, apiKey };
}

function normalizeLlmTranslationMode(mode, fallback = LLM_TRANSLATION_MODE_ALL_IN_ONE_JSON) {
    const value = String(mode || '').trim().toLowerCase();
    if (value === LLM_TRANSLATION_MODE_ONE_BY_ONE || value === LLM_TRANSLATION_MODE_ALL_IN_ONE_JSON) {
        return value;
    }
    return fallback;
}

function getLlmTranslationMode() {
    const select = document.getElementById('lang-translate-llm-mode');
    return normalizeLlmTranslationMode(
        select?.value,
        LLM_TRANSLATION_MODE_ALL_IN_ONE_JSON
    );
}

function shouldRetranslateExistingTranslations() {
    const toggle = document.getElementById('lang-translate-llm-retranslate-existing');
    return !!toggle?.checked;
}

function getTranslationCandidates(options = {}) {
    const includeExisting = !!options.includeExisting;
    if (!currentLangData) return [];
    const baseFlat = flattenObject(getBaseLanguage().en || {});
    const targetFlat = flattenObject(currentLangData.data?.[currentLangData.code] || {});
    const out = [];

    Object.keys(baseFlat).forEach((key) => {
        const sourceRaw = baseFlat[key];
        if (typeof sourceRaw !== 'string') return;
        const sourceText = String(sourceRaw);
        if (!sourceText.trim()) return;
        if (key.endsWith('.flag')) return;

        const targetText = String(targetFlat[key] ?? '');
        const isMissing = !targetText.trim() || targetText.trim() === sourceText.trim();
        if (!includeExisting && !isMissing) return;

        out.push({ key, sourceText });
    });

    return out;
}

function applyTranslatedEntries(entries, translationMap) {
    if (!currentLangData || !Array.isArray(entries)) return 0;
    if (!currentLangData.data[currentLangData.code]) {
        currentLangData.data[currentLangData.code] = {};
    }

    let changed = 0;
    entries.forEach((entry) => {
        const key = String(entry?.key || '').trim();
        if (!key) return;
        const sourceText = String(entry?.sourceText || '');
        const translatedRaw = translationMap ? translationMap[key] : '';
        if (typeof translatedRaw !== 'string') return;
        const nextValue = String(translatedRaw || sourceText);
        const prevValue = String(getNestedValue(currentLangData.data[currentLangData.code], key) || '');
        if (prevValue === nextValue) return;
        setNestedValue(currentLangData.data[currentLangData.code], key, nextValue);
        changed += 1;
    });

    if (typeof allTranslations !== 'undefined') {
        if (!allTranslations[currentLangData.code]) allTranslations[currentLangData.code] = {};
        allTranslations[currentLangData.code] = currentLangData.data[currentLangData.code];
    }

    return changed;
}

async function translateMissingKeysWithLlm(buttonEl) {
    if (!currentLangData) return;
    if (!emubro || typeof emubro.invoke !== 'function') {
        setLlmTranslateStatus(i18n.t('language.translateLlmNoApi'), 'error');
        return;
    }

    const { provider, model, baseUrl, apiKey } = getLlmTranslationConfig();
    if (!model) {
        setLlmTranslateStatus(i18n.t('language.translateLlmNeedModel'), 'error');
        return;
    }
    if (!baseUrl) {
        setLlmTranslateStatus(i18n.t('language.translateLlmNeedBaseUrl'), 'error');
        return;
    }
    if ((provider === 'openai' || provider === 'gemini') && !apiKey) {
        setLlmTranslateStatus(i18n.t('language.translateLlmNeedApiKey'), 'error');
        return;
    }

    const retranslateExisting = shouldRetranslateExistingTranslations();
    const candidates = getTranslationCandidates({ includeExisting: retranslateExisting });
    if (!candidates.length) {
        setLlmTranslateStatus(i18n.t(retranslateExisting ? 'language.translateLlmNothingEligible' : 'language.translateLlmNothingMissing'), 'success');
        return;
    }

    const targetName = String(currentLangData?.data?.[currentLangData.code]?.language?.name || currentLangData.code).trim();
    const total = candidates.length;
    let translatedCount = 0;
    const translationMode = getLlmTranslationMode();
    const progressKey = retranslateExisting ? 'language.translateLlmProgressGeneric' : 'language.translateLlmProgress';
    const progressAllInOneKey = retranslateExisting ? 'language.translateLlmProgressAllInOneGeneric' : 'language.translateLlmProgressAllInOne';

    if (buttonEl) buttonEl.disabled = true;
    try {
        if (translationMode === LLM_TRANSLATION_MODE_ALL_IN_ONE_JSON) {
            setLlmTranslateStatus(i18n.t(progressAllInOneKey, { total }), 'info');
            const response = await emubro.invoke('suggestions:translate-locale-missing', {
                provider,
                mode: translationMode,
                model,
                baseUrl,
                apiKey,
                sourceLanguageCode: 'en',
                targetLanguageCode: currentLangData.code,
                targetLanguageName: targetName,
                retranslateExisting,
                sourceLocaleObject: getBaseLanguage().en || {},
                targetLocaleObject: currentLangData.data?.[currentLangData.code] || {},
                entries: candidates.map((entry) => ({ key: entry.key, text: entry.sourceText }))
            });

            if (!response?.success || !response?.translations || typeof response.translations !== 'object') {
                throw new Error(response?.message || i18n.t('language.translateLlmInvalidResponse'));
            }

            translatedCount += applyTranslatedEntries(candidates, response.translations);
        } else {
            for (let idx = 0; idx < total; idx += 1) {
                const entry = candidates[idx];
                const done = idx + 1;
                setLlmTranslateStatus(i18n.t(progressKey, { done, total }), 'info');

                // eslint-disable-next-line no-await-in-loop
                const response = await emubro.invoke('suggestions:translate-locale-missing', {
                    provider,
                    mode: translationMode,
                    model,
                    baseUrl,
                    apiKey,
                    sourceLanguageCode: 'en',
                    targetLanguageCode: currentLangData.code,
                    targetLanguageName: targetName,
                    retranslateExisting,
                    entries: [{ key: entry.key, text: entry.sourceText }]
                });

                if (!response?.success || !response?.translations || typeof response.translations !== 'object') {
                    throw new Error(response?.message || i18n.t('language.translateLlmInvalidResponse'));
                }

                translatedCount += applyTranslatedEntries([entry], response.translations);
            }
        }

        renderEditorKeys(String(document.getElementById('lang-search-keys')?.value || ''));
        if (i18n.getLanguage() === currentLangData.code) {
            updateUILanguage();
        }

        setLlmTranslateStatus(i18n.t('language.translateLlmDone', { count: translatedCount }), 'success');
    } catch (error) {
        console.error('translateMissingKeysWithLlm failed:', error);
        setLlmTranslateStatus(i18n.t('language.translateLlmFailed', { message: String(error?.message || error) }), 'error');
    } finally {
        if (buttonEl) buttonEl.disabled = false;
    }
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

async function createNewLanguage(input) {
    const normalized = normalizeLanguageCreationPayload(
        typeof input === 'string'
            ? { code: input, name: String(input || '').toUpperCase(), abbreviation: String(input || '').toUpperCase(), flag: 'us' }
            : input
    );
    if (!normalized.valid) {
        alert(normalized.message || i18n.t('language.createError', { message: 'Invalid input' }));
        return;
    }

    const { code, name, abbreviation, flag } = normalized.value;
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
                name,
                abbreviation,
                flag,
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
