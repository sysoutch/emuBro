import {
    GAMEPAD_BINDING_ACTIONS,
    GAMEPAD_BINDING_LABELS,
    normalizeInputBindingProfile,
    getPlatformGamepadBindings,
    loadPlatformGamepadBindingsMap,
    setPlatformGamepadBindings,
    buildEffectiveGamepadBindings
} from '../gamepad-binding-utils';

const DEFAULT_STORAGE_KEY = 'emuBro.emulatorConfigs.v1';

const CFG_KV = 'keyvalue';
const CFG_JSON = 'json';
const CFG_XML = 'xml';
const CFG_UNKNOWN = 'unknown';
const BINDING_KEY_RE = /(bind|binding|input|key|hotkey|button|controller|gamepad|pad|joy|axis|trigger)/i;
const CONTROLS_SECTION_RE = /^(controls?|input|keyboard|gamepad|controller|pad)/i;
const TRUE_RE = /^(1|true|yes|on|enabled)$/i;
const FALSE_RE = /^(0|false|no|off|disabled)$/i;
const CONTROL_PRESET_KEYBOARD = Object.freeze({
    left: '37',
    right: '39',
    up: '38',
    down: '40',
    left_up: '0',
    left_down: '0',
    right_up: '0',
    right_down: '0',
    start: '13',
    select: '161',
    lid: '0',
    debug: '0',
    a: '88',
    b: '90',
    x: '83',
    y: '65',
    l: '81',
    r: '87'
});
const CONTROL_PRESET_GAMEPAD = Object.freeze({
    left: '32772',
    right: '32773',
    up: '32774',
    down: '32775',
    left_up: '0',
    left_down: '0',
    right_up: '0',
    right_down: '0',
    start: '32783',
    select: '32782',
    lid: '0',
    debug: '0',
    a: '32776',
    b: '32777',
    x: '32778',
    y: '32779',
    l: '32780',
    r: '32781'
});

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function dirFromPath(filePath) {
    const value = String(filePath || '').trim();
    if (!value) return '';
    const i = Math.max(value.lastIndexOf('/'), value.lastIndexOf('\\'));
    return i > 0 ? value.slice(0, i) : '';
}

function normalizeRuntimeRuleList(values = []) {
    const out = [];
    const seen = new Set();
    (Array.isArray(values) ? values : []).forEach((entry) => {
        const value = String(entry || '').trim().toLowerCase();
        if (!value) return;
        if (seen.has(value)) return;
        seen.add(value);
        out.push(value);
    });
    return out;
}

function normalizeRuntimeExtensionList(values = []) {
    const out = [];
    const seen = new Set();
    (Array.isArray(values) ? values : []).forEach((entry) => {
        let value = String(entry || '').trim().toLowerCase();
        if (!value) return;
        if (!value.startsWith('.')) value = `.${value}`;
        value = value.replace(/\s+/g, '');
        if (!value) return;
        if (seen.has(value)) return;
        seen.add(value);
        out.push(value);
    });
    return out;
}

function parseRuntimeRuleText(rawText) {
    return String(rawText || '')
        .split(/[\r\n,;]+/g)
        .map((entry) => String(entry || '').trim())
        .filter(Boolean);
}

function normalizeRuntimeDataRules(input = {}) {
    const source = (input && typeof input === 'object') ? input : {};
    return {
        directoryNames: normalizeRuntimeRuleList(source.directoryNames),
        fileExtensions: normalizeRuntimeExtensionList(source.fileExtensions),
        fileNameIncludes: normalizeRuntimeRuleList(source.fileNameIncludes)
    };
}

function detectConfigFormat(configPath, rawText = '') {
    const p = String(configPath || '').trim().toLowerCase();
    if (/\.(json|json5)$/i.test(p)) return CFG_JSON;
    if (/\.(xml|xaml|plist)$/i.test(p)) return CFG_XML;
    if (/\.(ini|cfg|conf|properties|txt|toml|yaml|yml)$/i.test(p)) return CFG_KV;
    const t = String(rawText || '').trim();
    if (!t) return CFG_UNKNOWN;
    if (t.startsWith('{') || t.startsWith('[')) return CFG_JSON;
    if (t.startsWith('<')) return CFG_XML;
    return CFG_KV;
}

function pathLabel(segments) {
    let out = '';
    segments.forEach((seg) => {
        if (typeof seg === 'number') out += `[${seg}]`;
        else out += out ? `.${seg}` : String(seg);
    });
    return out;
}

function normalizeControlKey(rawKey) {
    const base = String(rawKey || '')
        .trim()
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    if (!base) return '';
    const aliases = {
        leftup: 'left_up',
        leftdown: 'left_down',
        rightup: 'right_up',
        rightdown: 'right_down'
    };
    if (aliases[base]) return aliases[base];
    return base;
}

function flattenJsonBindings(node, segments = [], out = []) {
    if (Array.isArray(node)) {
        node.forEach((v, i) => flattenJsonBindings(v, [...segments, i], out));
        return out;
    }
    if (node && typeof node === 'object') {
        Object.keys(node).forEach((k) => flattenJsonBindings(node[k], [...segments, k], out));
        return out;
    }
    if (!segments.length) return out;
    const label = pathLabel(segments);
    if (!BINDING_KEY_RE.test(label)) return out;
    out.push({
        id: `json:${label}`,
        displayKey: label,
        pathSegments: segments,
        value: String(node ?? ''),
        valueType: node === null ? 'null' : typeof node,
        sourceFormat: CFG_JSON
    });
    return out;
}

function extractBindings(rawText, format) {
    if (format === CFG_JSON) {
        try {
            const parsed = JSON.parse(String(rawText || ''));
            return { entries: flattenJsonBindings(parsed), editable: true, message: '' };
        } catch (e) {
            return { entries: [], editable: false, message: `JSON parse error: ${e?.message || String(e)}` };
        }
    }
    if (format === CFG_KV) {
        const lines = String(rawText || '').split(/\r?\n/g);
        const counts = new Map();
        const entries = [];
        let currentSection = '';
        lines.forEach((line) => {
            const sectionMatch = line.match(/^\s*\[([^\]]+)\]\s*$/);
            if (sectionMatch) {
                currentSection = String(sectionMatch[1] || '').trim().toLowerCase();
                return;
            }
            const m = line.match(/^(\s*)([^#;][^=:\r\n]*?)(\s*)([=:])(\s*)(.*)$/);
            if (!m) return;
            const key = String(m[2] || '').trim();
            if (!key) return;
            const controlKey = normalizeControlKey(key);
            const looksLikeControl = Object.prototype.hasOwnProperty.call(CONTROL_PRESET_KEYBOARD, controlKey);
            const looksLikeBinding = BINDING_KEY_RE.test(key)
                || looksLikeControl
                || CONTROLS_SECTION_RE.test(currentSection);
            if (!looksLikeBinding) return;
            const keyLower = key.toLowerCase();
            const idx = (counts.get(keyLower) || 0) + 1;
            counts.set(keyLower, idx);
            entries.push({
                id: `kv:${keyLower}:${idx}`,
                displayKey: idx > 1 ? `${key} [${idx}]` : key,
                key,
                keyLower,
                section: currentSection,
                controlKey: looksLikeControl ? controlKey : '',
                value: String(m[6] ?? ''),
                valueType: 'string',
                sourceFormat: CFG_KV
            });
        });
        return { entries, editable: true, message: '' };
    }
    if (format === CFG_XML) {
        return { entries: [], editable: false, message: 'Binding editor is not available for XML yet. Use the Config File tab.' };
    }
    return { entries: [], editable: false, message: 'Binding editor supports key=value and JSON configs.' };
}

function setJsonPathValue(root, pathSegments, value) {
    let node = root;
    for (let i = 0; i < pathSegments.length; i += 1) {
        const seg = pathSegments[i];
        const last = i === pathSegments.length - 1;
        if (last) {
            node[seg] = value;
            return;
        }
        const nextSeg = pathSegments[i + 1];
        const shouldArray = typeof nextSeg === 'number';
        if (!node[seg] || typeof node[seg] !== 'object') node[seg] = shouldArray ? [] : {};
        node = node[seg];
    }
}

function typedJsonValue(nextRaw, type, currentRaw) {
    const text = String(nextRaw ?? '');
    if (type === 'number') {
        const n = Number(text);
        if (Number.isFinite(n)) return n;
        const fallback = Number(currentRaw);
        return Number.isFinite(fallback) ? fallback : 0;
    }
    if (type === 'boolean') {
        if (TRUE_RE.test(text)) return true;
        if (FALSE_RE.test(text)) return false;
        return !!currentRaw;
    }
    if (type === 'null') return text.trim() ? text : null;
    return text;
}

function applyBindingEdits(rawText, format, entries) {
    const list = Array.isArray(entries) ? entries : [];
    const source = String(rawText || '');
    if (!list.length) return source;

    if (format === CFG_KV) {
        const updatesById = new Map();
        list.forEach((e) => {
            const id = String(e?.id || '').trim();
            if (!id.startsWith('kv:')) return;
            updatesById.set(id, String(e?.value ?? ''));
        });
        if (!updatesById.size) return source;

        const eol = source.includes('\r\n') ? '\r\n' : '\n';
        const lines = source.split(/\r?\n/g);
        const seenCounts = new Map();
        return lines.map((line) => {
            const m = line.match(/^(\s*)([^#;][^=:\r\n]*?)(\s*)([=:])(\s*)(.*)$/);
            if (!m) return line;
            const keyLower = String(m[2] || '').trim().toLowerCase();
            if (!keyLower) return line;
            const idx = (seenCounts.get(keyLower) || 0) + 1;
            seenCounts.set(keyLower, idx);
            const entryId = `kv:${keyLower}:${idx}`;
            if (!updatesById.has(entryId)) return line;
            return `${m[1]}${m[2]}${m[3]}${m[4]}${m[5]}${updatesById.get(entryId)}`;
        }).join(eol);
    }

    if (format === CFG_JSON) {
        const parsed = JSON.parse(source || '{}');
        list.forEach((entry) => {
            if (!Array.isArray(entry?.pathSegments) || !entry.pathSegments.length) return;
            const next = typedJsonValue(entry.value, entry.valueType, entry.value);
            setJsonPathValue(parsed, entry.pathSegments, next);
        });
        return JSON.stringify(parsed, null, 2);
    }

    return source;
}

export function createEmulatorConfigActions(deps = {}) {
    const localStorageRef = deps.localStorageRef || window.localStorage;
    const emubroRef = deps.emubro || window.emubro;
    const i18nRef = deps.i18n || window.i18n;
    const log = deps.log || console;
    const storageKey = String(deps.storageKey || DEFAULT_STORAGE_KEY).trim() || DEFAULT_STORAGE_KEY;

    const t = (key, fallback, data) => {
        try {
            if (i18nRef && typeof i18nRef.t === 'function') {
                const translated = i18nRef.t(key, data);
                if (translated && translated !== key) return translated;
            }
        } catch (_e) {}
        return String(fallback || key || '');
    };

    function getEmulatorKey(emulator) {
        const filePath = String(emulator?.filePath || '').trim();
        if (filePath) return filePath.toLowerCase();
        const fallback = String(emulator?.id || emulator?.name || 'emu').trim();
        return fallback.toLowerCase();
    }

    function loadEmulatorConfigMap() {
        try {
            const raw = localStorageRef.getItem(storageKey);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') return parsed;
        } catch (_e) {}
        return {};
    }

    function saveEmulatorConfigMap(map) {
        try {
            localStorageRef.setItem(storageKey, JSON.stringify(map || {}));
        } catch (_e) {}
    }

    function getPlatformGamepadBindingMap() {
        return loadPlatformGamepadBindingsMap(localStorageRef);
    }

    function getPlatformGamepadBindingOverrides(platformShortName) {
        return getPlatformGamepadBindings(platformShortName, localStorageRef);
    }

    function savePlatformGamepadBindingOverrides(platformShortName, bindings = {}) {
        setPlatformGamepadBindings(platformShortName, bindings, localStorageRef);
    }

    function normalizeEditorConfig(input = {}) {
        return {
            website: String(input?.website || '').trim(),
            startParameters: String(input?.startParameters || '').trim(),
            launchArgs: String(input?.launchArgs || '').trim(),
            workingDirectory: String(input?.workingDirectory || '').trim(),
            configFilePath: String(input?.configFilePath || '').trim(),
            searchString: String(input?.searchString || '').trim(),
            runCommandsBefore: String(input?.runCommandsBefore || '').trim(),
            notes: String(input?.notes || ''),
            gamepadBindings: normalizeInputBindingProfile(input?.gamepadBindings || {}),
            runtimeDataRules: normalizeRuntimeDataRules(input?.runtimeDataRules || {})
        };
    }

    function normalizeStoredEditorConfig(input = {}) {
        if (!input || typeof input !== 'object') return {};
        const out = {};
        if (Object.prototype.hasOwnProperty.call(input, 'website')) out.website = String(input.website || '').trim();
        if (Object.prototype.hasOwnProperty.call(input, 'startParameters')) out.startParameters = String(input.startParameters || '').trim();
        if (Object.prototype.hasOwnProperty.call(input, 'launchArgs')) out.launchArgs = String(input.launchArgs || '').trim();
        if (Object.prototype.hasOwnProperty.call(input, 'workingDirectory')) out.workingDirectory = String(input.workingDirectory || '').trim();
        if (Object.prototype.hasOwnProperty.call(input, 'configFilePath')) out.configFilePath = String(input.configFilePath || '').trim();
        if (Object.prototype.hasOwnProperty.call(input, 'searchString')) out.searchString = String(input.searchString || '').trim();
        if (Object.prototype.hasOwnProperty.call(input, 'runCommandsBefore')) out.runCommandsBefore = String(input.runCommandsBefore || '').trim();
        if (Object.prototype.hasOwnProperty.call(input, 'notes')) out.notes = String(input.notes || '');
        if (Object.prototype.hasOwnProperty.call(input, 'gamepadBindings')) out.gamepadBindings = normalizeInputBindingProfile(input.gamepadBindings || {});
        if (Object.prototype.hasOwnProperty.call(input, 'runtimeDataRules')) out.runtimeDataRules = normalizeRuntimeDataRules(input.runtimeDataRules || {});
        return out;
    }

    function defaultEditorConfig(emulator) {
        return {
            website: String(emulator?.website || '').trim(),
            startParameters: String(emulator?.startParameters || '').trim(),
            launchArgs: '',
            workingDirectory: dirFromPath(emulator?.filePath),
            configFilePath: String(emulator?.configFilePath || '').trim(),
            searchString: String(emulator?.searchString || '').trim(),
            runCommandsBefore: Array.isArray(emulator?.runCommandsBefore)
                ? emulator.runCommandsBefore.map((cmd) => String(cmd || '').trim()).filter(Boolean).join(' ')
                : '',
            notes: '',
            gamepadBindings: normalizeInputBindingProfile({}),
            runtimeDataRules: normalizeRuntimeDataRules({})
        };
    }

    function getStoredEmulatorConfig(emulator) {
        const key = getEmulatorKey(emulator);
        return normalizeStoredEditorConfig(loadEmulatorConfigMap()[key] || {});
    }

    function mergeConfigWithDefaults(emulator, overrides = {}) {
        const defaults = defaultEditorConfig(emulator);
        const merged = {
            ...defaults,
            ...normalizeStoredEditorConfig(overrides)
        };

        // Old local override entries can contain empty values for fields that come from config.json.
        // When that happens, keep the platform config default instead of showing a blank field.
        ['startParameters', 'searchString', 'configFilePath', 'runCommandsBefore'].forEach((key) => {
            if (!String(merged[key] || '').trim() && String(defaults[key] || '').trim()) {
                merged[key] = defaults[key];
            }
        });

        return normalizeEditorConfig(merged);
    }

    function getEmulatorConfig(emulator) {
        const merged = mergeConfigWithDefaults(emulator, getStoredEmulatorConfig(emulator));
        const platformBindings = getPlatformGamepadBindingOverrides(emulator?.platformShortName);
        const effectiveBindings = buildEffectiveGamepadBindings(platformBindings, merged.gamepadBindings);
        return {
            ...merged,
            platformGamepadBindings: platformBindings,
            effectiveGamepadBindings: effectiveBindings,
            effectiveInputBindings: effectiveBindings
        };
    }

    async function readConfigFile(emulatorPath, configFilePath) {
        if (!emubroRef || typeof emubroRef.invoke !== 'function') {
            return { success: false, exists: false, message: 'App API is unavailable.', resolvedPath: '', text: '' };
        }
        try {
            const response = await emubroRef.invoke('emulator:read-config-file', { emulatorPath, configFilePath });
            return response && typeof response === 'object'
                ? response
                : { success: false, exists: false, message: 'Invalid response.', resolvedPath: '', text: '' };
        } catch (error) {
            log.error('Failed to read emulator config file:', error);
            return { success: false, exists: false, message: error?.message || String(error), resolvedPath: '', text: '' };
        }
    }

    async function writeConfigFile(emulatorPath, configFilePath, contents) {
        if (!emubroRef || typeof emubroRef.invoke !== 'function') {
            return { success: false, message: 'App API is unavailable.', resolvedPath: '' };
        }
        try {
            const response = await emubroRef.invoke('emulator:write-config-file', { emulatorPath, configFilePath, contents });
            return response && typeof response === 'object'
                ? response
                : { success: false, message: 'Invalid response.', resolvedPath: '' };
        } catch (error) {
            log.error('Failed to write emulator config file:', error);
            return { success: false, message: error?.message || String(error), resolvedPath: '' };
        }
    }

    async function promptEmulatorConfigModal(emulator, existing = {}) {
        const base = mergeConfigWithDefaults(emulator, existing);
        const emulatorPath = String(emulator?.filePath || '').trim();
        const emulatorInstalled = !!(emulatorPath && emulator?.isInstalled);

        let loadedCfgPath = String(base.configFilePath || '').trim();
        let loadedRaw = '';
        let loadedFormat = CFG_UNKNOWN;
        let loadedResolvedPath = '';
        let loadedReadSuccess = false;
        let bindingEntries = [];
        let bindingEditable = false;
        let bindingMessage = '';
        let loadMessage = '';

        async function loadSnapshot(configFilePath) {
            const cfgPath = String(configFilePath || '').trim();
            loadedCfgPath = cfgPath;
            if (!cfgPath) {
                loadedRaw = '';
                loadedFormat = CFG_UNKNOWN;
                loadedResolvedPath = '';
                loadedReadSuccess = false;
                bindingEntries = [];
                bindingEditable = false;
                bindingMessage = t('emulator.edit.bindingsNoConfigPath', 'Set a config file path to enable bindings editing.');
                loadMessage = t('emulator.edit.cfgNoPath', 'No config file path configured.');
                return;
            }
            if (!emulatorInstalled) {
                loadedRaw = '';
                loadedFormat = detectConfigFormat(cfgPath, '');
                loadedResolvedPath = '';
                loadedReadSuccess = false;
                bindingEntries = [];
                bindingEditable = false;
                bindingMessage = t('emulator.edit.bindingsNeedsInstall', 'Install the emulator first to read and edit bindings.');
                loadMessage = t('emulator.edit.cfgNeedsInstall', 'Install the emulator first to load the config file.');
                return;
            }

            const readResult = await readConfigFile(emulatorPath, cfgPath);
            loadedRaw = String(readResult?.text || '');
            loadedFormat = detectConfigFormat(cfgPath, loadedRaw);
            loadedResolvedPath = String(readResult?.resolvedPath || '');
            loadedReadSuccess = !!readResult?.success;
            const bindingResult = extractBindings(loadedRaw, loadedFormat);
            bindingEntries = Array.isArray(bindingResult?.entries) ? bindingResult.entries : [];
            bindingEditable = !!bindingResult?.editable && loadedReadSuccess;
            bindingMessage = String(bindingResult?.message || '');

            if (readResult?.success) loadMessage = t('emulator.edit.cfgLoaded', 'Config loaded.');
            else if (readResult?.exists === false) loadMessage = t('emulator.edit.cfgNotFound', 'Config file not found. Saving can create it.');
            else loadMessage = String(readResult?.message || t('emulator.edit.cfgLoadFailed', 'Failed to load config file.'));
        }

        await loadSnapshot(loadedCfgPath);

        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'emulator-config-overlay';

            const modal = document.createElement('div');
            modal.className = 'emulator-config-modal glass emulator-config-modal--wide';
            modal.innerHTML = `
                <h3>${escapeHtml(t('emulator.edit.title', `Edit Emulator: ${emulator?.name || 'Unknown'}`, { name: emulator?.name || 'Unknown' }))}</h3>
                <p class="emulator-config-subtitle">${escapeHtml(t('emulator.edit.subtitle', 'Configure launch values, bindings, and config file content.'))}</p>
                <div class="emulator-config-tabs">
                    <button class="emulator-config-tab-btn active" type="button" data-tab-target="general">${escapeHtml(t('emulator.edit.tabGeneral', 'General'))}</button>
                    <button class="emulator-config-tab-btn" type="button" data-tab-target="bindings">${escapeHtml(t('emulator.edit.tabBindings', 'Bindings'))}</button>
                    <button class="emulator-config-tab-btn" type="button" data-tab-target="config">${escapeHtml(t('emulator.edit.tabConfig', 'Config File'))}</button>
                    <button class="emulator-config-tab-btn" type="button" data-tab-target="gamepad">${escapeHtml(t('emulator.edit.tabGamepad', 'Gamepad'))}</button>
                    <button class="emulator-config-tab-btn" type="button" data-tab-target="runtime">${escapeHtml(t('emulator.edit.tabRuntime', 'Runtime Backup'))}</button>
                </div>
                <div class="emulator-config-tab-panel is-active" data-tab-panel="general"></div>
                <div class="emulator-config-tab-panel" data-tab-panel="bindings"></div>
                <div class="emulator-config-tab-panel" data-tab-panel="config"></div>
                <div class="emulator-config-tab-panel" data-tab-panel="gamepad"></div>
                <div class="emulator-config-tab-panel" data-tab-panel="runtime"></div>
                <div class="emulator-config-error" data-config-error></div>
                <div class="emulator-config-actions">
                    <button class="action-btn" type="button" data-dialog-cancel>${escapeHtml(t('buttons.cancel', 'Cancel'))}</button>
                    <button class="action-btn remove-btn" type="button" data-dialog-reset>${escapeHtml(t('buttons.reset', 'Reset'))}</button>
                    <button class="action-btn launch-btn" type="button" data-dialog-save>${escapeHtml(t('buttons.saveChanges', 'Save'))}</button>
                </div>
            `;

            const panelGeneral = modal.querySelector('[data-tab-panel="general"]');
            const panelBindings = modal.querySelector('[data-tab-panel="bindings"]');
            const panelConfig = modal.querySelector('[data-tab-panel="config"]');
            const panelGamepad = modal.querySelector('[data-tab-panel="gamepad"]');
            const panelRuntime = modal.querySelector('[data-tab-panel="runtime"]');
            const errorEl = modal.querySelector('[data-config-error]');
            const saveBtn = modal.querySelector('[data-dialog-save]');
            const cancelBtn = modal.querySelector('[data-dialog-cancel]');
            const resetBtn = modal.querySelector('[data-dialog-reset]');
            const tabButtons = Array.from(modal.querySelectorAll('[data-tab-target]'));

            const makeField = (label, value, key, multiline = false) => {
                const row = document.createElement('label');
                row.className = 'emulator-config-row';
                const labelEl = document.createElement('span');
                labelEl.className = 'emulator-config-label';
                labelEl.textContent = label;
                const input = multiline ? document.createElement('textarea') : document.createElement('input');
                if (!multiline) input.type = 'text';
                if (multiline) input.rows = 3;
                input.className = 'emulator-config-input';
                input.dataset.key = key;
                input.value = String(value || '');
                row.appendChild(labelEl);
                row.appendChild(input);
                return { row, input };
            };

            const form = document.createElement('div');
            form.className = 'emulator-config-form';
            const installInfo = document.createElement('div');
            installInfo.className = 'emulator-config-inline-note';
            installInfo.innerHTML = `<strong>${escapeHtml(t('emulator.edit.executablePath', 'Executable Path'))}:</strong> <span>${escapeHtml(emulatorPath || t('emulator.edit.notInstalled', 'Not installed'))}</span>`;
            form.appendChild(installInfo);

            const websiteField = makeField(t('emulator.edit.website', 'Website URL'), base.website, 'website');
            const startField = makeField(t('emulator.edit.startParameters', 'Start Parameters (from platform config)'), base.startParameters, 'startParameters');
            const launchField = makeField(t('emulator.edit.launchArgs', 'Launch Arguments (launch emulator now)'), base.launchArgs, 'launchArgs');
            const cwdField = makeField(t('emulator.edit.workingDirectory', 'Working Directory'), base.workingDirectory, 'workingDirectory');
            const cfgField = makeField(t('emulator.edit.configFilePath', 'Config File Path'), base.configFilePath, 'configFilePath');
            const searchField = makeField(t('emulator.edit.searchPattern', 'Search Pattern (Regex)'), base.searchString, 'searchString');
            const runBeforeField = makeField(t('emulator.edit.runBefore', 'Run Commands Before'), base.runCommandsBefore, 'runCommandsBefore', true);
            const notesField = makeField(t('emulator.edit.notes', 'Notes'), base.notes, 'notes', true);

            [websiteField, startField, launchField, cwdField, cfgField, searchField, runBeforeField, notesField].forEach((field) => form.appendChild(field.row));
            panelGeneral.appendChild(form);

            const bindingsHint = document.createElement('div');
            bindingsHint.className = 'emulator-config-inline-note';
            panelBindings.appendChild(bindingsHint);
            const bindingsToolbar = document.createElement('div');
            bindingsToolbar.className = 'emulator-config-bindings-toolbar';
            panelBindings.appendChild(bindingsToolbar);
            const bindingsList = document.createElement('div');
            bindingsList.className = 'emulator-config-bindings-list';
            panelBindings.appendChild(bindingsList);

            const configMeta = document.createElement('div');
            configMeta.className = 'emulator-config-inline-note';
            panelConfig.appendChild(configMeta);
            const reloadBtn = document.createElement('button');
            reloadBtn.className = 'action-btn small';
            reloadBtn.type = 'button';
            reloadBtn.textContent = t('emulator.edit.reloadConfig', 'Reload Config File');
            panelConfig.appendChild(reloadBtn);
            const rawArea = document.createElement('textarea');
            rawArea.className = 'emulator-config-input emulator-config-raw-text';
            rawArea.rows = 18;
            rawArea.spellcheck = false;
            rawArea.value = loadedRaw;
            panelConfig.appendChild(rawArea);

            const platformShortName = String(emulator?.platformShortName || '').trim().toLowerCase();
            const platformName = String(emulator?.platform || emulator?.platformShortName || '').trim() || 'Unknown';
            const platformGamepadBindings = normalizeInputBindingProfile(getPlatformGamepadBindingOverrides(platformShortName));
            const emulatorGamepadOverrides = normalizeInputBindingProfile(base?.gamepadBindings || {});
            const gamepadHints = document.createElement('div');
            gamepadHints.className = 'emulator-config-inline-note';
            gamepadHints.textContent = t(
                'emulator.edit.gamepadHint',
                `Platform defaults are configured in Settings > Gamepad Profiles. Emulator overrides below win over ${platformName} defaults.`
            );
            panelGamepad.appendChild(gamepadHints);

            const gamepadGrid = document.createElement('div');
            gamepadGrid.className = 'emulator-config-gamepad-grid';
            const gamepadHeader = document.createElement('div');
            gamepadHeader.className = 'emulator-config-gamepad-header';
            gamepadHeader.innerHTML = `
                <span>${escapeHtml(t('emulator.edit.gamepadAction', 'Action'))}</span>
                <span>${escapeHtml(t('emulator.edit.gamepadKeyboard', 'Keyboard'))}</span>
                <span>${escapeHtml(t('emulator.edit.gamepadController', 'Gamepad'))}</span>
            `;
            gamepadGrid.appendChild(gamepadHeader);
            GAMEPAD_BINDING_ACTIONS.forEach((action) => {
                const row = document.createElement('div');
                row.className = 'emulator-config-gamepad-row';
                const labelEl = document.createElement('span');
                labelEl.className = 'emulator-config-gamepad-action';
                labelEl.textContent = t(`gamepad.bind.${action}`, GAMEPAD_BINDING_LABELS[action] || action);
                const makeChannelCell = (channel) => {
                    const cell = document.createElement('label');
                    cell.className = 'emulator-config-gamepad-cell';
                    const input = document.createElement('input');
                    input.className = 'emulator-config-input emulator-config-gamepad-input';
                    input.type = 'text';
                    input.dataset.gamepadAction = action;
                    input.dataset.gamepadChannel = channel;
                    const platformValue = String(platformGamepadBindings?.[channel]?.[action] || '').trim();
                    input.placeholder = platformValue || t('emulator.edit.gamepadOverridePlaceholder', 'Override (optional)');
                    input.value = String(emulatorGamepadOverrides?.[channel]?.[action] || '').trim();
                    const hint = document.createElement('span');
                    hint.className = 'emulator-config-gamepad-platform';
                    hint.textContent = platformValue
                        ? `${platformName}: ${platformValue}`
                        : t('emulator.edit.gamepadNoPlatformDefault', 'No platform default');
                    cell.appendChild(input);
                    cell.appendChild(hint);
                    return cell;
                };
                const keyboardCell = makeChannelCell('keyboard');
                const gamepadCell = makeChannelCell('gamepad');
                row.appendChild(labelEl);
                row.appendChild(keyboardCell);
                row.appendChild(gamepadCell);
                gamepadGrid.appendChild(row);
            });
            panelGamepad.appendChild(gamepadGrid);

            const clearGamepadBtn = document.createElement('button');
            clearGamepadBtn.className = 'action-btn remove-btn small';
            clearGamepadBtn.type = 'button';
            clearGamepadBtn.textContent = t('emulator.edit.clearGamepadOverrides', 'Clear Emulator Gamepad Overrides');
            panelGamepad.appendChild(clearGamepadBtn);

            const runtimeNote = document.createElement('div');
            runtimeNote.className = 'emulator-config-inline-note';
            runtimeNote.textContent = t(
                'emulator.edit.runtimeHint',
                'These rules decide which runtime save/state/config files are copied into periodic backups while this emulator is running.'
            );
            panelRuntime.appendChild(runtimeNote);

            const runtimeForm = document.createElement('div');
            runtimeForm.className = 'emulator-config-form';

            const runtimeDirectoryField = makeField(
                t('emulator.edit.runtimeDirectoryNames', 'Directory Names'),
                (Array.isArray(base?.runtimeDataRules?.directoryNames) ? base.runtimeDataRules.directoryNames : []).join('\n'),
                'runtimeDirectoryNames',
                true
            );
            runtimeDirectoryField.input.rows = 4;

            const runtimeExtensionsField = makeField(
                t('emulator.edit.runtimeFileExtensions', 'File Extensions'),
                (Array.isArray(base?.runtimeDataRules?.fileExtensions) ? base.runtimeDataRules.fileExtensions : []).join('\n'),
                'runtimeFileExtensions',
                true
            );
            runtimeExtensionsField.input.rows = 4;

            const runtimeIncludesField = makeField(
                t('emulator.edit.runtimeFileNameIncludes', 'File Name Contains'),
                (Array.isArray(base?.runtimeDataRules?.fileNameIncludes) ? base.runtimeDataRules.fileNameIncludes : []).join('\n'),
                'runtimeFileNameIncludes',
                true
            );
            runtimeIncludesField.input.rows = 4;

            [runtimeDirectoryField, runtimeExtensionsField, runtimeIncludesField].forEach((field) => {
                runtimeForm.appendChild(field.row);
            });
            panelRuntime.appendChild(runtimeForm);

            const setError = (msg = '') => {
                if (!errorEl) return;
                errorEl.textContent = String(msg || '');
                errorEl.classList.toggle('is-visible', !!msg);
            };

            const setActiveTab = (target) => {
                const tab = String(target || 'general');
                tabButtons.forEach((btn) => btn.classList.toggle('active', String(btn.dataset.tabTarget || '') === tab));
                modal.querySelectorAll('[data-tab-panel]').forEach((panel) => {
                    panel.classList.toggle('is-active', String(panel.dataset.tabPanel || '') === tab);
                });
            };

            const updateConfigMeta = () => {
                const cfgPath = String(cfgField.input.value || '').trim();
                const parts = [];
                parts.push(`${t('emulator.edit.format', 'Format')}: ${loadedFormat}`);
                if (loadedResolvedPath) parts.push(`${t('emulator.edit.resolvedPath', 'Resolved Path')}: ${loadedResolvedPath}`);
                else if (cfgPath) parts.push(`${t('emulator.edit.path', 'Path')}: ${cfgPath}`);
                if (loadMessage) parts.push(loadMessage);
                configMeta.textContent = parts.join('  |  ');
            };

            const renderBindings = () => {
                bindingsToolbar.innerHTML = '';
                bindingsList.innerHTML = '';
                const cfgPath = String(cfgField.input.value || '').trim();
                if (!cfgPath) {
                    bindingsHint.textContent = t('emulator.edit.bindingsNoConfigPath', 'Set a config file path to enable bindings editing.');
                    return;
                }
                if (!emulatorInstalled) {
                    bindingsHint.textContent = t('emulator.edit.bindingsNeedsInstall', 'Install the emulator first to read and edit bindings.');
                    return;
                }
                if (!loadedReadSuccess && !loadedRaw) {
                    bindingsHint.textContent = loadMessage || t('emulator.edit.cfgLoadFailed', 'Failed to load config file.');
                    return;
                }
                if (!bindingEditable) {
                    bindingsHint.textContent = bindingMessage || t('emulator.edit.bindingsNotSupported', 'Binding editor is not supported for this config format.');
                    return;
                }
                if (!bindingEntries.length) {
                    bindingsHint.textContent = t('emulator.edit.bindingsNoneFound', 'No binding-like entries were detected in this file.');
                    return;
                }

                const controlEntries = bindingEntries.filter((entry) => !!String(entry?.controlKey || '').trim());
                const numericControlValues = controlEntries
                    .map((entry) => Number.parseInt(String(entry?.value || '').trim(), 10))
                    .filter((value) => Number.isFinite(value));
                const looksGamepadCodes = numericControlValues.some((value) => value >= 32768);
                const looksKeyboardCodes = numericControlValues.some((value) => value > 0 && value < 32768);
                const hints = [`${bindingEntries.length} ${t('emulator.edit.bindingsDetected', 'binding entries detected')}.`];
                if (controlEntries.length > 0) {
                    hints.push(t('emulator.edit.controlsDetected', 'Controls section detected.'));
                    if (looksGamepadCodes) hints.push(t('emulator.edit.controlsLooksGamepad', 'Current values look like gamepad codes.'));
                    else if (looksKeyboardCodes) hints.push(t('emulator.edit.controlsLooksKeyboard', 'Current values look like keyboard key codes.'));
                }
                bindingsHint.textContent = hints.join('  ');

                if (controlEntries.length > 0) {
                    const applyPreset = (presetMap) => {
                        const preset = (presetMap && typeof presetMap === 'object') ? presetMap : {};
                        const bindingInputs = Array.from(bindingsList.querySelectorAll('[data-binding-id]'));
                        bindingEntries.forEach((entry) => {
                            const controlKey = String(entry?.controlKey || '').trim().toLowerCase();
                            if (!controlKey) return;
                            if (!Object.prototype.hasOwnProperty.call(preset, controlKey)) return;
                            const input = bindingInputs.find((node) => String(node?.dataset?.bindingId || '') === String(entry.id || ''));
                            if (!input) return;
                            input.value = String(preset[controlKey] || '');
                        });
                    };

                    const keyboardBtn = document.createElement('button');
                    keyboardBtn.type = 'button';
                    keyboardBtn.className = 'action-btn small';
                    keyboardBtn.textContent = t('emulator.edit.applyKeyboardPreset', 'Apply Keyboard Preset');
                    keyboardBtn.addEventListener('click', () => applyPreset(CONTROL_PRESET_KEYBOARD));
                    bindingsToolbar.appendChild(keyboardBtn);

                    const gamepadBtn = document.createElement('button');
                    gamepadBtn.type = 'button';
                    gamepadBtn.className = 'action-btn small';
                    gamepadBtn.textContent = t('emulator.edit.applyGamepadPreset', 'Apply Gamepad Preset');
                    gamepadBtn.addEventListener('click', () => applyPreset(CONTROL_PRESET_GAMEPAD));
                    bindingsToolbar.appendChild(gamepadBtn);
                }

                bindingEntries.forEach((entry) => {
                    const row = document.createElement('label');
                    row.className = 'emulator-config-binding-row';
                    const keyEl = document.createElement('span');
                    keyEl.className = 'emulator-config-binding-key';
                    keyEl.textContent = entry.displayKey;
                    const valueEl = document.createElement('input');
                    valueEl.className = 'emulator-config-input emulator-config-binding-input';
                    valueEl.type = 'text';
                    valueEl.value = String(entry.value || '');
                    valueEl.dataset.bindingId = entry.id;
                    row.appendChild(keyEl);
                    row.appendChild(valueEl);
                    bindingsList.appendChild(row);
                });
            };

            const collectGeneral = () => {
                const values = {};
                modal.querySelectorAll('.emulator-config-input[data-key]').forEach((input) => {
                    const key = String(input.dataset.key || '').trim();
                    if (key) values[key] = input.value;
                });
                return normalizeEditorConfig(values);
            };

            const collectGamepadBindings = () => {
                const next = {
                    keyboard: {},
                    gamepad: {}
                };
                panelGamepad.querySelectorAll('[data-gamepad-action]').forEach((input) => {
                    const action = String(input.dataset.gamepadAction || '').trim();
                    const channel = String(input.dataset.gamepadChannel || '').trim().toLowerCase();
                    if (!action || (channel !== 'keyboard' && channel !== 'gamepad')) return;
                    const value = String(input.value || '').trim();
                    if (!value) return;
                    next[channel][action] = value;
                });
                return normalizeInputBindingProfile(next);
            };

            const collectRuntimeDataRules = () => {
                const directoryNames = parseRuntimeRuleText(runtimeDirectoryField.input.value);
                const fileExtensions = parseRuntimeRuleText(runtimeExtensionsField.input.value);
                const fileNameIncludes = parseRuntimeRuleText(runtimeIncludesField.input.value);
                return normalizeRuntimeDataRules({
                    directoryNames,
                    fileExtensions,
                    fileNameIncludes
                });
            };

            const collectBindingEntries = () => {
                const map = new Map();
                bindingsList.querySelectorAll('[data-binding-id]').forEach((input) => {
                    const id = String(input.dataset.bindingId || '').trim();
                    if (id) map.set(id, String(input.value ?? ''));
                });
                if (!map.size) return [];
                return bindingEntries.filter((entry) => map.has(entry.id)).map((entry) => ({ ...entry, value: map.get(entry.id) }));
            };

            const close = (payload) => {
                document.removeEventListener('keydown', onKeyDown, true);
                overlay.remove();
                resolve(payload);
            };

            const save = () => {
                setError('');
                const values = collectGeneral();
                values.gamepadBindings = collectGamepadBindings();
                values.runtimeDataRules = collectRuntimeDataRules();
                const cfgPath = String(values.configFilePath || '').trim();
                let finalRaw = String(rawArea.value || '');
                const format = detectConfigFormat(cfgPath, finalRaw);
                const updatedBindings = collectBindingEntries();
                if (updatedBindings.length) {
                    try {
                        finalRaw = applyBindingEdits(finalRaw, format, updatedBindings);
                    } catch (error) {
                        setError(error?.message || String(error));
                        setActiveTab('config');
                        return;
                    }
                }
                const shouldWrite = !!(emulatorInstalled && cfgPath) && (finalRaw !== loadedRaw || cfgPath !== loadedCfgPath);
                close({
                    ...values,
                    externalConfig: {
                        shouldWrite,
                        configFilePath: cfgPath,
                        text: finalRaw
                    }
                });
            };

            const reload = async () => {
                setError('');
                reloadBtn.disabled = true;
                reloadBtn.textContent = t('emulator.edit.reloading', 'Reloading...');
                try {
                    await loadSnapshot(cfgField.input.value);
                    rawArea.value = loadedRaw;
                    updateConfigMeta();
                    renderBindings();
                } finally {
                    reloadBtn.disabled = false;
                    reloadBtn.textContent = t('emulator.edit.reloadConfig', 'Reload Config File');
                }
            };

            const onKeyDown = (event) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    close(null);
                    return;
                }
                if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
                    event.preventDefault();
                    save();
                }
            };

            cancelBtn?.addEventListener('click', () => close(null));
            resetBtn?.addEventListener('click', () => close({ reset: true }));
            saveBtn?.addEventListener('click', save);
            reloadBtn?.addEventListener('click', () => reload().catch((e) => setError(e?.message || String(e))));
            clearGamepadBtn?.addEventListener('click', () => {
                panelGamepad.querySelectorAll('[data-gamepad-action]').forEach((input) => {
                    input.value = '';
                });
            });
            cfgField.input.addEventListener('input', updateConfigMeta);
            tabButtons.forEach((btn) => btn.addEventListener('click', () => setActiveTab(btn.dataset.tabTarget)));
            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) close(null);
            });
            document.addEventListener('keydown', onKeyDown, true);

            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            updateConfigMeta();
            renderBindings();
            websiteField.input.focus();
        });
    }

    async function openEmulatorConfigEditor(emulator) {
        const key = getEmulatorKey(emulator);
        const result = await promptEmulatorConfigModal(emulator, getStoredEmulatorConfig(emulator));
        if (!result) return false;

        if (result.reset) {
            const map = loadEmulatorConfigMap();
            delete map[key];
            saveEmulatorConfigMap(map);
            return true;
        }

        const normalized = normalizeEditorConfig(result);
        const externalConfig = result?.externalConfig && typeof result.externalConfig === 'object'
            ? result.externalConfig
            : null;

        if (externalConfig?.shouldWrite) {
            const writeResult = await writeConfigFile(
                String(emulator?.filePath || '').trim(),
                String(externalConfig.configFilePath || ''),
                String(externalConfig.text ?? '')
            );
            if (!writeResult?.success) {
                window.alert(`Failed to save emulator config file: ${writeResult?.message || 'Unknown error'}`);
                return false;
            }
        }

        const map = loadEmulatorConfigMap();
        map[key] = normalized;
        saveEmulatorConfigMap(map);
        return true;
    }

    return {
        getEmulatorKey,
        loadEmulatorConfigMap,
        saveEmulatorConfigMap,
        getPlatformGamepadBindingMap,
        getPlatformGamepadBindingOverrides,
        savePlatformGamepadBindingOverrides,
        getEmulatorConfig,
        promptEmulatorConfigModal,
        openEmulatorConfigEditor
    };
}
