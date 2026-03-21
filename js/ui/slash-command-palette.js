import { showTextInputDialog } from './text-input-dialog';

function normalizeText(value) {
    return String(value || '').trim();
}

function normalizeLower(value) {
    return normalizeText(value).toLowerCase();
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function waitForNextFrame() {
    return new Promise((resolve) => {
        if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
            window.requestAnimationFrame(() => resolve());
            return;
        }
        window.setTimeout(resolve, 0);
    });
}

function isEditableTarget(target) {
    if (!target || !(target instanceof Element)) return false;
    if (target.closest('.slash-command-palette')) return true;
    if (target.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""], [role="textbox"]')) {
        return true;
    }
    const tagName = String(target.tagName || '').toLowerCase();
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') return true;
    return target.isContentEditable === true;
}

function parseSlashInput(rawValue) {
    const trimmed = normalizeText(rawValue);
    const source = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
    const firstSpace = source.indexOf(' ');
    if (firstSpace === -1) {
        return {
            raw: trimmed,
            command: normalizeLower(source),
            argsText: ''
        };
    }
    return {
        raw: trimmed,
        command: normalizeLower(source.slice(0, firstSpace)),
        argsText: normalizeText(source.slice(firstSpace + 1))
    };
}

function tokenizeArgs(input) {
    const text = normalizeText(input);
    if (!text) return [];
    const tokens = [];
    const pattern = /"([^"]+)"|'([^']+)'|(\S+)/g;
    let match = null;
    while ((match = pattern.exec(text))) {
        const value = normalizeText(match[1] || match[2] || match[3] || '');
        if (value) tokens.push(value);
    }
    return tokens;
}

function normalizePanelTarget(rawValue = '') {
    const value = normalizeLower(rawValue);
    if (!value) return '';
    if (['settings', 'general', 'library settings'].includes(value)) return 'settings';
    if (['library-paths', 'paths', 'library paths'].includes(value)) return 'library-paths';
    if (['import', 'imports', 'launcher-import', 'scan'].includes(value)) return 'import';
    if (['gamepad', 'controller', 'controllers'].includes(value)) return 'gamepad';
    if (['ai', 'llm', 'ai / llm'].includes(value)) return 'ai';
    if (['updates', 'update'].includes(value)) return 'updates';
    if (['languages', 'language', 'locale', 'locales'].includes(value)) return 'languages';
    if (value === 'profile') return 'profile';
    if (['theme', 'theme-manager'].includes(value)) return 'theme';
    if (['help', 'help-docs', 'docs', 'documentation'].includes(value)) return 'help';
    if (value === 'about') return 'about';
    if (['support', 'support-chat', 'chat'].includes(value)) return 'support';
    if (['troubleshoot', 'support-troubleshoot'].includes(value)) return 'troubleshoot';
    if (['community', 'community-hub'].includes(value)) return 'community';
    if (['tools', 'toolbox'].includes(value)) return 'tools';
    if (['overview', 'home', 'desktop-home'].includes(value)) return 'overview';
    if (['library', 'browse', 'library-views'].includes(value)) return 'library';
    if (['emulators', 'library-emulators'].includes(value)) return 'emulators';
    if (['favorites', 'favorite', 'installed'].includes(value)) return 'favorites';
    if (['recent', 'recently-played'].includes(value)) return 'recent';
    if (['suggested', 'wishlist', 'recommendations'].includes(value)) return 'suggested';
    return '';
}

function describePanelTarget(target = '') {
    switch (normalizePanelTarget(target)) {
        case 'settings':
            return 'settings';
        case 'library-paths':
            return 'library paths settings';
        case 'import':
            return 'import and scan settings';
        case 'gamepad':
            return 'gamepad settings';
        case 'ai':
            return 'AI / LLM settings';
        case 'updates':
            return 'updates settings';
        case 'languages':
            return 'language manager';
        case 'profile':
            return 'profile modal';
        case 'theme':
            return 'theme manager';
        case 'help':
            return 'support help docs';
        case 'about':
            return 'about dialog';
        case 'support':
            return 'support chat';
        case 'troubleshoot':
            return 'support troubleshoot';
        case 'community':
            return 'community hub';
        case 'tools':
            return 'tools';
        case 'overview':
            return 'overview';
        case 'library':
            return 'library';
        case 'emulators':
            return 'emulators library';
        case 'favorites':
            return 'favorites library';
        case 'recent':
            return 'recently played library';
        case 'suggested':
            return 'suggested library';
        default:
            return 'requested panel';
    }
}

function pickBestNamedRow(rows, query) {
    const normalizedQuery = normalizeLower(query);
    const list = Array.isArray(rows) ? rows : [];
    if (!normalizedQuery) return list[0] || null;
    const exact = list.find((row) => normalizeLower(row?.name) === normalizedQuery);
    if (exact) return exact;
    const exactKey = list.find((row) => normalizeLower(row?.key) === normalizedQuery);
    if (exactKey) return exactKey;
    const startsWith = list.find((row) => normalizeLower(row?.name).startsWith(normalizedQuery));
    if (startsWith) return startsWith;
    const contains = list.find((row) => normalizeLower(row?.name).includes(normalizedQuery));
    return contains || list[0] || null;
}

function formatSpecsText(result) {
    const direct = normalizeText(result?.specs?.text || result?.text || '');
    if (direct) return direct;
    const specs = result?.specs && typeof result.specs === 'object' ? result.specs : {};
    return [
        specs.platform ? `Platform: ${normalizeText(specs.platform)}` : '',
        specs.arch ? `Architecture: ${normalizeText(specs.arch)}` : '',
        Number.isFinite(Number(specs.cpuCores)) ? `CPU Cores: ${Number(specs.cpuCores)}` : ''
    ].filter(Boolean).join('\n');
}

function formatLibraryRows(rows, label, limit = 12) {
    const list = (Array.isArray(rows) ? rows : []).slice(0, Math.max(1, Number(limit) || 12));
    if (!list.length) return `${label}: none`;
    return `${label}:\n${list.map((row) => {
        const name = normalizeText(row?.name || 'Untitled');
        const platform = normalizeText(row?.platform || row?.platformShortName || '');
        return platform ? `- ${name} (${platform})` : `- ${name}`;
    }).join('\n')}`;
}

function formatHelpDoc(doc = {}) {
    const title = normalizeText(doc?.title || doc?.id || 'Help Doc');
    const body = normalizeText(doc?.text || doc?.preview || '');
    return body ? `${title}\n\n${body}` : title;
}

function formatReleaseDateText(releaseDate = {}, preferredRegions = []) {
    const entries = Object.entries(releaseDate && typeof releaseDate === 'object' ? releaseDate : {})
        .map(([key, value]) => [normalizeLower(key), normalizeText(value)])
        .filter(([key, value]) => key && value);
    if (!entries.length) return '';
    const map = new Map(entries);
    const ordered = preferredRegions.length
        ? preferredRegions.filter((key) => map.has(key)).concat(entries.map(([key]) => key).filter((key) => !preferredRegions.includes(key)))
        : entries.map(([key]) => key);
    const seen = new Set();
    return ordered
        .filter((key) => {
            if (!key || seen.has(key) || !map.has(key)) return false;
            seen.add(key);
            return true;
        })
        .map((key) => `${key.toUpperCase()}: ${map.get(key)}`)
        .join('\n');
}

async function queryPlatforms(emubro) {
    const result = await emubro.invoke('get-platforms');
    return Array.isArray(result) ? result : [];
}

function buildPlatformSearchKeys(platformRow = {}) {
    const rawValues = [
        platformRow?.name,
        platformRow?.shortName,
        platformRow?.platformDir,
        platformRow?.companyName
    ];
    const baseKeys = rawValues
        .map((value) => normalizeLower(value))
        .filter(Boolean);
    const normalizedBase = baseKeys.map((value) => value.replace(/[^a-z0-9]+/g, ''));
    const aliasMap = {
        snes: ['super nintendo entertainment system', 'super nintendo', 'super nes'],
        nes: ['nintendo entertainment system', 'famicom'],
        psx: ['playstation', 'sony playstation', 'sony playstation 1', 'playstation 1', 'ps1'],
        ps2: ['playstation 2', 'sony playstation 2'],
        ps3: ['playstation 3', 'sony playstation 3'],
        psp: ['playstation portable', 'sony playstation portable'],
        gcn: ['gamecube', 'nintendo gamecube'],
        n64: ['nintendo64', 'nintendo 64'],
        nds: ['ds', 'nintendo ds', 'nintendo dual screen'],
        gba: ['gameboyadvance', 'game boy advance'],
        gameboy: ['gb', 'game boy'],
        '3ds': ['nintendo 3ds', '3ds'],
        'wii-u': ['wii u', 'nintendo wii u'],
        xbox: ['original xbox', 'microsoft xbox'],
        xbox360: ['xbox 360', 'microsoft xbox 360'],
        pc: ['windows', 'microsoft windows', 'windows pc', 'pc']
    };
    const aliasKeys = [];
    normalizedBase.forEach((value) => {
        const aliases = aliasMap[value] || [];
        aliases.forEach((alias) => aliasKeys.push(normalizeLower(alias)));
    });
    const seen = new Set();
    return baseKeys.concat(aliasKeys).filter((value) => {
        const normalized = normalizeLower(value);
        if (!normalized || seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
    });
}

function resolvePlatformRow(platformRows, query) {
    const rows = Array.isArray(platformRows) ? platformRows : [];
    const normalizedQuery = normalizeLower(query);
    const normalizedCompactQuery = normalizedQuery.replace(/[^a-z0-9]+/g, '');
    if (!normalizedQuery) return rows[0] || null;
    const decorated = rows.map((row) => ({
        ...row,
        name: normalizeText(row?.name || row?.shortName || row?.platformDir),
        key: normalizeText(row?.shortName || row?.platformDir)
    }));
    const exact = decorated.find((row) => {
        const keys = buildPlatformSearchKeys(row);
        return keys.includes(normalizedQuery) || keys.some((value) => value.replace(/[^a-z0-9]+/g, '') === normalizedCompactQuery);
    });
    if (exact) return exact;
    const contains = decorated.find((row) => {
        const haystack = buildPlatformSearchKeys(row).join(' ');
        return haystack.includes(normalizedQuery) || haystack.replace(/[^a-z0-9]+/g, '').includes(normalizedCompactQuery);
    });
    if (contains) return contains;
    return pickBestNamedRow(decorated, query);
}

function buildDownloadPayload(emulatorRow = {}, currentOs = 'windows') {
    return {
        name: normalizeText(emulatorRow?.name),
        platform: normalizeText(emulatorRow?.platform),
        platformShortName: normalizeText(emulatorRow?.platformShortName),
        website: normalizeText(emulatorRow?.website),
        downloadUrl: normalizeText(emulatorRow?.downloadUrl),
        downloadLinks: emulatorRow?.downloadLinks || null,
        searchString: normalizeText(emulatorRow?.searchString),
        archiveFileMatchWin: normalizeText(emulatorRow?.archiveFileMatchWin),
        archiveFileMatchLinux: normalizeText(emulatorRow?.archiveFileMatchLinux),
        archiveFileMatchMac: normalizeText(emulatorRow?.archiveFileMatchMac),
        setupFileMatchWin: normalizeText(emulatorRow?.setupFileMatchWin),
        setupFileMatchLinux: normalizeText(emulatorRow?.setupFileMatchLinux),
        setupFileMatchMac: normalizeText(emulatorRow?.setupFileMatchMac),
        executableFileMatchWin: normalizeText(emulatorRow?.executableFileMatchWin),
        executableFileMatchLinux: normalizeText(emulatorRow?.executableFileMatchLinux),
        executableFileMatchMac: normalizeText(emulatorRow?.executableFileMatchMac),
        installers: emulatorRow?.installers || null,
        startParameters: normalizeText(emulatorRow?.startParameters || emulatorRow?.args),
        type: normalizeText(emulatorRow?.type || 'standalone') || 'standalone',
        os: normalizeLower(currentOs || 'windows')
    };
}

function createAppPanelController(options = {}) {
    const setAppMode = typeof options.setAppMode === 'function' ? options.setAppMode : () => {};
    const setActiveLibrarySection = typeof options.setActiveLibrarySection === 'function' ? options.setActiveLibrarySection : async () => {};
    const showSupportView = typeof options.showSupportView === 'function' ? options.showSupportView : () => {};
    const showCommunityView = typeof options.showCommunityView === 'function' ? options.showCommunityView : () => {};
    const showToolView = typeof options.showToolView === 'function' ? options.showToolView : () => {};
    const openLibraryPathSettingsModal = typeof options.openLibraryPathSettingsModal === 'function'
        ? options.openLibraryPathSettingsModal
        : async () => {};
    const openThemeManager = typeof options.openThemeManager === 'function' ? options.openThemeManager : () => {};
    const openLanguageManager = typeof options.openLanguageManager === 'function' ? options.openLanguageManager : () => {};
    const openProfileModal = typeof options.openProfileModal === 'function' ? options.openProfileModal : async () => {};
    const openAboutDialog = typeof options.openAboutDialog === 'function' ? options.openAboutDialog : async () => {};

    const openSupportMode = async (mode = 'chat') => {
        setAppMode('support');
        showSupportView();
        await waitForNextFrame();
        await waitForNextFrame();
        const normalized = normalizePanelTarget(mode) === 'help'
            ? 'help'
            : (normalizePanelTarget(mode) === 'troubleshoot' ? 'troubleshoot' : 'chat');
        const trigger = document.querySelector(`[data-support-mode="${normalized}"]`);
        if (trigger instanceof HTMLElement) {
            trigger.click();
        }
    };

    const openLibrarySection = async (section = 'all') => {
        setAppMode('library');
        await setActiveLibrarySection(section);
    };

    const openTarget = async (rawTarget = '') => {
        const target = normalizePanelTarget(rawTarget);
        if (!target) {
            throw new Error('Unsupported panel target.');
        }

        switch (target) {
            case 'settings':
                await openLibraryPathSettingsModal({ initialTab: 'general' });
                break;
            case 'library-paths':
                await openLibraryPathSettingsModal({ initialTab: 'library-paths' });
                break;
            case 'import':
                await openLibraryPathSettingsModal({ initialTab: 'import' });
                break;
            case 'gamepad':
                await openLibraryPathSettingsModal({ initialTab: 'gamepad' });
                break;
            case 'ai':
                await openLibraryPathSettingsModal({ initialTab: 'llm' });
                break;
            case 'updates':
                await openLibraryPathSettingsModal({ initialTab: 'updates' });
                break;
            case 'languages':
                await Promise.resolve(openLanguageManager());
                break;
            case 'profile':
                await Promise.resolve(openProfileModal());
                break;
            case 'theme':
                await Promise.resolve(openThemeManager());
                break;
            case 'about':
                await Promise.resolve(openAboutDialog());
                break;
            case 'support':
                await openSupportMode('chat');
                break;
            case 'troubleshoot':
                await openSupportMode('troubleshoot');
                break;
            case 'help':
                await openSupportMode('help');
                break;
            case 'community':
                setAppMode('community');
                showCommunityView();
                break;
            case 'tools':
                setAppMode('tools');
                showToolView();
                break;
            case 'overview':
            case 'library':
                await openLibrarySection('all');
                break;
            case 'emulators':
                await openLibrarySection('emulators');
                break;
            case 'favorites':
                await openLibrarySection('favorite');
                break;
            case 'recent':
                await openLibrarySection('recent');
                break;
            case 'suggested':
                await openLibrarySection('suggested');
                break;
            default:
                throw new Error('Unsupported panel target.');
        }

        return target;
    };

    return {
        openTarget,
        normalizeTarget: normalizePanelTarget,
        describeTarget: describePanelTarget
    };
}

async function promptForValue(config) {
    const value = await showTextInputDialog(config);
    return value === null ? '' : normalizeText(value);
}

async function queryLibrary(emubro, payload = {}) {
    const response = await emubro.invoke('support:query-library', payload);
    if (!response?.success) {
        throw new Error(normalizeText(response?.message || 'Failed to query the local library.'));
    }
    return response;
}

async function getTagRows(emubro) {
    const response = await emubro.invoke('tags:list');
    return Array.isArray(response?.tags) ? response.tags : [];
}

function findMatchingTags(rows, query = '') {
    const normalized = normalizeLower(query);
    if (!normalized) return Array.isArray(rows) ? rows : [];
    return (Array.isArray(rows) ? rows : []).filter((row) => {
        const haystack = `${normalizeText(row?.id)} ${normalizeText(row?.name || row?.label)}`.toLowerCase();
        return haystack.includes(normalized);
    });
}

async function resolveLibraryRow(emubro, query, kind) {
    const response = await queryLibrary(emubro, {
        query,
        kind,
        limit: 60
    });
    const rows = kind === 'emulators' ? response.emulators : response.games;
    const best = pickBestNamedRow(rows, query);
    if (!best) {
        throw new Error(`No matching ${kind === 'emulators' ? 'emulator' : 'game'} was found for "${query}".`);
    }
    return { response, row: best };
}

const EMULATOR_CONFIG_STORAGE_KEY = 'emuBro.emulatorConfigs.v1';

function getEmulatorConfigStorageKey(emulatorRow = {}) {
    const filePath = normalizeLower(emulatorRow?.filePath);
    if (filePath) return filePath;
    return normalizeLower(emulatorRow?.id || emulatorRow?.name || 'emu');
}

function readStoredEmulatorConfigMap() {
    try {
        const raw = window.localStorage.getItem(EMULATOR_CONFIG_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_error) {
        return {};
    }
}

function writeStoredEmulatorConfigMap(nextMap = {}) {
    try {
        window.localStorage.setItem(EMULATOR_CONFIG_STORAGE_KEY, JSON.stringify(nextMap || {}));
    } catch (_error) {}
}

function normalizeStoredEmulatorConfigPatch(input = {}) {
    const source = input && typeof input === 'object' ? input : {};
    return {
        website: normalizeText(source.website),
        launchArgs: normalizeText(source.launchArgs),
        workingDirectory: normalizeText(source.workingDirectory),
        configFilePath: normalizeText(source.configFilePath),
        runCommandsBefore: normalizeText(source.runCommandsBefore)
    };
}

function updateStoredEmulatorConfig(emulatorRow = {}, patch = {}) {
    const key = getEmulatorConfigStorageKey(emulatorRow);
    if (!key) {
        throw new Error('No emulator storage key could be resolved.');
    }
    const map = readStoredEmulatorConfigMap();
    map[key] = {
        ...normalizeStoredEmulatorConfigPatch(map[key]),
        ...normalizeStoredEmulatorConfigPatch(patch)
    };
    writeStoredEmulatorConfigMap(map);
    return map[key];
}

function resolveStoredEmulatorConfig(emulatorRow = {}) {
    const key = getEmulatorConfigStorageKey(emulatorRow);
    const map = readStoredEmulatorConfigMap();
    return normalizeStoredEmulatorConfigPatch(map[key]);
}

function clearStoredEmulatorConfigFields(emulatorRow = {}, fields = []) {
    const normalizedFields = Array.isArray(fields) ? fields.map((value) => normalizeLower(value)) : [];
    const clearAll = !normalizedFields.length || normalizedFields.includes('all');
    if (clearAll) {
        return updateStoredEmulatorConfig(emulatorRow, {
            website: '',
            launchArgs: '',
            workingDirectory: '',
            configFilePath: '',
            runCommandsBefore: ''
        });
    }
    const aliasMap = {
        website: 'website',
        'launch-args': 'launchArgs',
        args: 'launchArgs',
        'working-directory': 'workingDirectory',
        workingdir: 'workingDirectory',
        'config-path': 'configFilePath',
        'config-file-path': 'configFilePath',
        config: 'configFilePath',
        'run-commands-before': 'runCommandsBefore',
        runcommandsbefore: 'runCommandsBefore',
        prelaunch: 'runCommandsBefore'
    };
    const patch = {};
    normalizedFields.forEach((field) => {
        const mapped = aliasMap[field];
        if (mapped) patch[mapped] = '';
    });
    return updateStoredEmulatorConfig(emulatorRow, patch);
}

function parseCommaList(input) {
    return normalizeText(input)
        .split(',')
        .map((value) => normalizeText(value))
        .filter(Boolean);
}

function parseTaggedGameCommandArgs(argsText = '') {
    const text = normalizeText(argsText);
    if (!text) {
        return { gameQuery: '', tags: [] };
    }

    const quoted = text.match(/^(?:"([^"]+)"|'([^']+)')\s+(.+)$/);
    if (quoted) {
        return {
            gameQuery: normalizeText(quoted[1] || quoted[2] || ''),
            tags: parseCommaList(quoted[3] || '')
        };
    }

    const delimited = text.match(/^(.+?)(?:\s*(?:::|\|)\s*)(.+)$/);
    if (delimited) {
        return {
            gameQuery: normalizeText(delimited[1] || ''),
            tags: parseCommaList(delimited[2] || '')
        };
    }

    return {
        gameQuery: '',
        tags: []
    };
}

function parseNamedValueCommandArgs(argsText = '') {
    const text = normalizeText(argsText);
    if (!text) {
        return { nameQuery: '', value: '' };
    }
    const quoted = text.match(/^(?:"([^"]+)"|'([^']+)')\s+([\s\S]+)$/);
    if (quoted) {
        return {
            nameQuery: normalizeText(quoted[1] || quoted[2] || ''),
            value: normalizeText(quoted[3] || '')
        };
    }
    const delimited = text.match(/^(.+?)(?:\s*(?:::|\|)\s*)(.+)$/);
    if (delimited) {
        return {
            nameQuery: normalizeText(delimited[1] || ''),
            value: normalizeText(delimited[2] || '')
        };
    }
    return { nameQuery: '', value: text };
}

function buildSlashResultState(input = {}) {
    const source = input && typeof input === 'object' ? input : {};
    return {
        status: normalizeLower(source.status) || 'success',
        tone: normalizeLower(source.tone) || 'info',
        title: normalizeText(source.title || 'Slash Command'),
        summary: normalizeText(source.summary || ''),
        stats: Array.isArray(source.stats)
            ? source.stats
                .map((entry) => ({
                    label: normalizeText(entry?.label),
                    value: normalizeText(entry?.value),
                    tone: normalizeLower(entry?.tone || '')
                }))
                .filter((entry) => entry.label && entry.value)
            : [],
        sections: Array.isArray(source.sections)
            ? source.sections
                .map((section) => ({
                    title: normalizeText(section?.title),
                    kind: normalizeLower(section?.kind || 'list') || 'list',
                    body: normalizeText(section?.body || ''),
                    items: Array.isArray(section?.items)
                        ? section.items.map((item) => normalizeText(item)).filter(Boolean)
                        : [],
                    empty: normalizeText(section?.empty || '')
                }))
                .filter((section) => section.title || section.body || section.items.length)
            : [],
        message: normalizeText(source.message || ''),
        commandName: normalizeText(source.commandName || ''),
        detail: normalizeText(source.detail || '')
    };
}

function buildSpecsResultState(result) {
    const specs = result?.specs && typeof result.specs === 'object' ? result.specs : {};
    const specsText = formatSpecsText(result);
    return buildSlashResultState({
        tone: 'success',
        title: 'System Specs',
        summary: 'Fetched local system specs from this machine.',
        stats: [
            specs.platform ? { label: 'Platform', value: normalizeText(specs.platform) } : null,
            specs.arch ? { label: 'Architecture', value: normalizeText(specs.arch) } : null,
            Number.isFinite(Number(specs.cpuCores)) ? { label: 'CPU Cores', value: String(Number(specs.cpuCores)) } : null
        ].filter(Boolean),
        sections: [
            {
                title: 'Specs Output',
                kind: 'code',
                body: specsText || 'No formatted specs output was returned.'
            }
        ]
    });
}

function buildLibraryResultState(result, query = '', title = '') {
    const response = result && typeof result === 'object' ? result : {};
    const catalog = response.catalog && typeof response.catalog === 'object' ? response.catalog : {};
    const games = Array.isArray(response.games) ? response.games : [];
    const emulators = Array.isArray(response.emulators) ? response.emulators : [];
    return buildSlashResultState({
        tone: 'success',
        title: title || (query ? `Library: ${query}` : 'Library Totals'),
        summary: query
            ? `Loaded live local matches for "${query}".`
            : 'Loaded whole-library totals and current catalog context.',
        stats: [
            { label: 'Catalog Games', value: String(Number(catalog.gameTotal || 0)) },
            { label: 'Catalog Emulators', value: String(Number(catalog.emulatorTotal || 0)) },
            {
                label: 'Matching Games',
                value: response.gameRowsTruncated
                    ? `${Number(response.gameCount || 0)} total, showing ${Number(response.gameRowsReturned || games.length || 0)}`
                    : String(Number(response.gameCount || 0))
            },
            {
                label: 'Matching Emulators',
                value: response.emulatorRowsTruncated
                    ? `${Number(response.emulatorCount || 0)} total, showing ${Number(response.emulatorRowsReturned || emulators.length || 0)}`
                    : String(Number(response.emulatorCount || 0))
            }
        ],
        sections: [
            {
                title: 'Games',
                kind: 'list',
                items: games.slice(0, 16).map((row) => {
                    const name = normalizeText(row?.name || 'Untitled');
                    const platform = normalizeText(row?.platform || row?.platformShortName || '');
                    return platform ? `${name} (${platform})` : name;
                }),
                empty: 'No matching game rows were returned.'
            },
            {
                title: 'Emulators',
                kind: 'list',
                items: emulators.slice(0, 16).map((row) => {
                    const name = normalizeText(row?.name || 'Untitled');
                    const platform = normalizeText(row?.platform || row?.platformShortName || '');
                    return platform ? `${name} (${platform})` : name;
                }),
                empty: 'No matching emulator rows were returned.'
            }
        ]
    });
}

function buildTagsResultState(rows, query = '') {
    const tags = Array.isArray(rows) ? rows : [];
    return buildSlashResultState({
        tone: 'success',
        title: query ? `Tags: ${query}` : 'Available Tags',
        summary: query ? `Loaded matching local tags for "${query}".` : 'Loaded the local tag catalog.',
        stats: [
            { label: 'Tag Count', value: String(tags.length) }
        ],
        sections: [
            {
                title: 'Tags',
                kind: 'list',
                items: tags.map((row) => `${normalizeText(row?.name || row?.label || 'Untitled')} (${normalizeText(row?.id || '')})`),
                empty: 'No matching tags were found.'
            }
        ]
    });
}

function buildHelpDocListResultState(rows, query = '') {
    const docs = Array.isArray(rows) ? rows : [];
    return buildSlashResultState({
        tone: 'success',
        title: query ? `Help Docs: ${query}` : 'Help Docs',
        summary: query ? `Loaded help docs for "${query}".` : 'Loaded available help docs.',
        stats: [
            { label: 'Doc Count', value: String(docs.length) }
        ],
        sections: [
            {
                title: 'Help Docs',
                kind: 'list',
                items: docs.map((row) => {
                    const title = normalizeText(row?.title || row?.id || 'Help Doc');
                    const preview = normalizeText(row?.preview || row?.snippet || '');
                    return preview ? `${title} - ${preview}` : title;
                }),
                empty: 'No matching help docs were found.'
            }
        ]
    });
}

function buildHelpDocResultState(doc = {}) {
    return buildSlashResultState({
        tone: 'success',
        title: normalizeText(doc?.title || doc?.id || 'Help Doc'),
        summary: 'Opened a local help document.',
        sections: [
            {
                title: 'Document',
                kind: 'text',
                body: formatHelpDoc(doc)
            }
        ]
    });
}

function buildActionResultState(title, summary, detail = '') {
    return buildSlashResultState({
        tone: 'success',
        title,
        summary,
        detail,
        sections: detail ? [{ title: 'Details', kind: 'text', body: detail }] : []
    });
}

function getSlashCommandChips(command) {
    const name = normalizeLower(command?.name || '');
    switch (name) {
        case 'read_library':
            return [
                { label: 'Whole Library', value: '', description: 'Load catalog totals and current rows.' },
                { label: 'Spyro', value: 'spyro', description: 'Search your local Spyro matches.' },
                { label: 'RetroArch', value: 'retroarch', description: 'Inspect emulator entries.' }
            ];
        case 'release_date':
            return [
                { label: 'PS1', value: 'psx', description: 'Look up PlayStation release dates.' },
                { label: 'SNES', value: 'snes', description: 'Look up Super Nintendo release dates.' },
                { label: 'Switch', value: 'switch', description: 'Look up Nintendo Switch release dates.' }
            ];
        case 'game_release_date':
            return [
                { label: 'Spyro 2', value: 'Spyro 2', description: 'Resolve a local match first.' },
                { label: 'Super Metroid', value: 'Super Metroid', description: 'Check for local game metadata.' }
            ];
        case 'fetch_game_cover':
            return [
                { label: 'Spyro 2', value: 'Spyro 2', description: 'Try the current/local cover first.' },
                { label: 'Crash Team Racing', value: 'Crash Team Racing', description: 'Load cover info for CTR.' }
            ];
        case 'add_game_cover':
            return [
                { label: 'Spyro 2 URL', value: '/add_game_cover "Spyro 2" https://example.com/spyro2-cover.jpg', mode: 'replace' },
                { label: 'CTR URL', value: '/add_game_cover "Crash Team Racing" https://example.com/ctr-cover.jpg', mode: 'replace' }
            ];
        case 'run_game':
            return [
                { label: 'Spyro the Dragon', value: 'Spyro the Dragon' },
                { label: 'Crash Team Racing', value: 'Crash Team Racing' },
                { label: 'Super Metroid', value: 'Super Metroid' }
            ];
        case 'run_emulator':
            return [
                { label: 'RetroArch', value: 'RetroArch' },
                { label: 'DuckStation', value: 'DuckStation' },
                { label: 'PCSX2', value: 'PCSX2' }
            ];
        case 'download_emulator':
            return [
                { label: 'DuckStation', value: 'DuckStation' },
                { label: 'RPCS3', value: 'RPCS3' },
                { label: 'melonDS', value: 'melonDS' }
            ];
        case 'open_game_details':
            return [
                { label: 'Spyro the Dragon', value: 'Spyro the Dragon' },
                { label: 'Crash Team Racing', value: 'Crash Team Racing' }
            ];
        case 'open_emulator_details':
            return [
                { label: 'RetroArch', value: 'RetroArch' },
                { label: 'DuckStation', value: 'DuckStation' }
            ];
        case 'change_emulator_website':
            return [
                { label: 'bsnes site', value: '/change_emulator_website "bsnes" https://bsnes.dev', mode: 'replace' },
                { label: 'RetroArch site', value: '/change_emulator_website "RetroArch" https://www.retroarch.com/', mode: 'replace' }
            ];
        case 'change_emulator_launch_args':
            return [
                { label: 'DuckStation fullscreen', value: '/change_emulator_launch_args "DuckStation" --fullscreen', mode: 'replace' },
                { label: 'PCSX2 batch', value: '/change_emulator_launch_args "PCSX2" --nogui', mode: 'replace' }
            ];
        case 'change_emulator_working_directory':
            return [
                { label: 'RetroArch folder', value: '/change_emulator_working_directory "RetroArch" D:\\Emulators\\RetroArch', mode: 'replace' }
            ];
        case 'change_emulator_config_path':
            return [
                { label: 'xemu config', value: '/change_emulator_config_path "xemu" C:\\Emulators\\xemu\\xemu.toml', mode: 'replace' }
            ];
        case 'change_emulator_run_commands_before':
            return [
                { label: 'JoyToKey before launch', value: '/change_emulator_run_commands_before "PCSX2" start /min joytokey.exe', mode: 'replace' }
            ];
        case 'clear_emulator_override_fields':
            return [
                { label: 'RetroArch args', value: '/clear_emulator_override_fields "RetroArch" launch-args', mode: 'replace' },
                { label: 'RetroArch all', value: '/clear_emulator_override_fields "RetroArch" all', mode: 'replace' }
            ];
        case 'list_tags':
            return [
                { label: 'All Tags', value: '' },
                { label: 'favorite', value: 'favorite' },
                { label: 'racing', value: 'racing' }
            ];
        case 'add_tags':
            return [
                { label: 'Spyro + favorite', value: '/add_tags "Spyro the Dragon" favorite', mode: 'replace' },
                { label: 'CTR + racing, favorite', value: '/add_tags "Crash Team Racing" racing,favorite', mode: 'replace' }
            ];
        case 'remove_tags':
            return [
                { label: 'Spyro - favorite', value: '/remove_tags "Spyro the Dragon" favorite', mode: 'replace' },
                { label: 'CTR - racing', value: '/remove_tags "Crash Team Racing" racing', mode: 'replace' }
            ];
        case 'list_help_docs':
            return [
                { label: 'BIOS', value: 'bios' },
                { label: 'controller', value: 'controller' },
                { label: 'audio', value: 'audio' }
            ];
        case 'read_help_doc':
            return [
                { label: 'bios', value: 'bios' },
                { label: 'controller setup', value: 'controller setup' }
            ];
        case 'youtube_preview':
            return [
                { label: 'Spyro', value: 'Spyro the Dragon' },
                { label: 'Crash Team Racing', value: 'Crash Team Racing' }
            ];
        case 'open_url':
            return [
                { label: 'retroarch.com', value: 'https://www.retroarch.com/' },
                { label: 'pcsx2.net', value: 'https://pcsx2.net/' }
            ];
        case 'open_panel':
            return [
                { label: 'Theme', value: 'theme' },
                { label: 'Help', value: 'help' },
                { label: 'AI Settings', value: 'ai' },
                { label: 'Community', value: 'community' }
            ];
        default:
            return [];
    }
}

function getSlashCommandInlineHint(command) {
    const name = normalizeLower(command?.name || '');
    switch (name) {
        case 'add_tags':
        case 'remove_tags':
            return 'Inline format: /add_tags "Game Title" favorite,racing';
        case 'read_library':
            return 'Leave the argument blank to load whole-library totals.';
        case 'release_date':
            return 'Inline format: /release_date psx or /release_date "Sony Playstation 1"';
        case 'game_release_date':
            return 'Inline format: /game_release_date "Game Title"';
        case 'fetch_game_cover':
            return 'Inline format: /fetch_game_cover "Game Title"';
        case 'add_game_cover':
            return 'Inline format: /add_game_cover "Game Title" https://image-url';
        case 'open_panel':
            return 'Try targets like theme, help, ai, community, library, or emulators.';
        case 'change_emulator_website':
        case 'change_emulator_launch_args':
        case 'change_emulator_working_directory':
        case 'change_emulator_config_path':
        case 'change_emulator_run_commands_before':
        case 'clear_emulator_override_fields':
            return 'Inline format: /command "Emulator Name" value';
        default:
            return '';
    }
}

function shouldCloseSlashPaletteOnSuccess(command) {
    const name = normalizeLower(command?.name || '');
    return [
        'run_game',
        'run_emulator',
        'download_emulator',
        'open_game_details',
        'open_emulator_details',
        'youtube_preview',
        'open_url',
        'open_panel',
        'open_settings',
        'open_theme',
        'open_languages',
        'open_profile',
        'open_about',
        'open_support',
        'open_troubleshoot',
        'open_help',
        'open_community',
        'open_tools',
        'open_library',
        'open_emulators',
        'open_favorites',
        'open_recent',
        'open_suggested',
        'open_overview'
    ].includes(name);
}

function resolveSelectedSlashCommand(commands, filteredCommands, activeIndex, inputValue) {
    const parsed = parseSlashInput(inputValue);
    const exactNeedle = normalizeLower(parsed.command || '');
    if (exactNeedle) {
        const exact = commands.find((entry) => {
            if (normalizeLower(entry?.name || '') === exactNeedle) return true;
            return Array.isArray(entry?.aliases) && entry.aliases.some((alias) => normalizeLower(alias) === exactNeedle);
        });
        if (exact) return exact;
    }
    return filteredCommands[activeIndex] || filteredCommands[0] || commands[0] || null;
}

function renderSlashResultPanel(resultState = null) {
    if (!resultState) {
        return `
            <div class="slash-command-placeholder">
                <strong>Ready</strong>
                <span>Select a command, use the chips to fill arguments, and run it here.</span>
            </div>
        `;
    }

    const normalized = buildSlashResultState(resultState);
    const statsHtml = normalized.stats.length
        ? `
            <div class="slash-command-result-stats">
                ${normalized.stats.map((entry) => `
                    <div class="slash-command-stat${entry.tone ? ` is-${escapeHtml(entry.tone)}` : ''}">
                        <small>${escapeHtml(entry.label)}</small>
                        <strong>${escapeHtml(entry.value)}</strong>
                    </div>
                `).join('')}
            </div>
        `
        : '';
    const sectionsHtml = normalized.sections.map((section) => {
        if (section.kind === 'code') {
            return `
                <section class="slash-command-result-section">
                    <h4>${escapeHtml(section.title)}</h4>
                    <pre>${escapeHtml(section.body || section.empty || '')}</pre>
                </section>
            `;
        }
        if (section.kind === 'text') {
            return `
                <section class="slash-command-result-section">
                    <h4>${escapeHtml(section.title)}</h4>
                    <div class="slash-command-result-text">${escapeHtml(section.body || section.empty || '')}</div>
                </section>
            `;
        }
        return `
            <section class="slash-command-result-section">
                <h4>${escapeHtml(section.title)}</h4>
                ${section.items.length
                    ? `<ul>${section.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
                    : `<div class="slash-command-result-empty">${escapeHtml(section.empty || 'No items.')}</div>`}
            </section>
        `;
    }).join('');

    return `
        <div class="slash-command-result-card is-${escapeHtml(normalized.tone)}">
            <div class="slash-command-result-head">
                <div>
                    <strong>${escapeHtml(normalized.title)}</strong>
                    ${normalized.summary ? `<span>${escapeHtml(normalized.summary)}</span>` : ''}
                </div>
                <em>${escapeHtml(normalized.status)}</em>
            </div>
            ${statsHtml}
            ${normalized.message ? `<div class="slash-command-result-text">${escapeHtml(normalized.message)}</div>` : ''}
            ${sectionsHtml}
        </div>
    `;
}

function createPanelShortcutCommand(name, target, description, aliases = []) {
    return {
        name,
        aliases,
        description,
        usage: `/${name}`,
        keywords: [target, description, 'panel', 'workspace', 'open'],
        closeOnSuccess: true,
        async run(context) {
            const opened = await context.appPanels.openTarget(target);
            context.notify(`Opened ${context.appPanels.describeTarget(opened)}.`, 'success');
        }
    };
}

function createSlashCommands(context) {
    const {
        emubro,
        appPanels,
        showGameDetails = () => {},
        showEmulatorDetails = () => {}
    } = context;

    const commands = [
        {
            name: 'fetch_specs',
            aliases: ['specs', 'system_specs'],
            description: 'Fetch local system specs from this machine.',
            usage: '/fetch_specs',
            keywords: ['hardware', 'wmic', 'regedit', 'pc'],
            async run(commandContext) {
                const result = await emubro.invoke('system:get-specs');
                if (!result?.success) {
                    throw new Error(normalizeText(result?.message || 'Failed to fetch local system specs.'));
                }
                commandContext.showResult(buildSpecsResultState(result));
                commandContext.notify('Fetched local system specs.', 'success');
            }
        },
        {
            name: 'read_library',
            aliases: ['library', 'query_library'],
            description: 'Query the local library or show whole-library totals.',
            usage: '/read_library spyro',
            keywords: ['games', 'emulators', 'database', 'catalog', 'count'],
            async run(commandContext) {
                let query = normalizeText(commandContext.argsText);
                if (!query && commandContext.promptIfNeeded) {
                    query = await promptForValue({
                        title: 'Read Library',
                        message: 'Enter a game/emulator title to search for, or leave it blank to load whole-library totals.',
                        initialValue: '',
                        placeholder: 'Spyro, RetroArch, or blank for all'
                    });
                }
                const result = await queryLibrary(emubro, {
                    query,
                    kind: 'all',
                    limit: 1200
                });
                commandContext.showResult(buildLibraryResultState(result, query));
                commandContext.notify(query ? `Queried local library for "${query}".` : 'Loaded library totals.', 'success');
            }
        },
        {
            name: 'refresh_library',
            aliases: ['reload_library'],
            description: 'Refresh library context and totals from live state.',
            usage: '/refresh_library',
            keywords: ['reload', 'database', 'catalog'],
            async run(commandContext) {
                const result = await queryLibrary(emubro, {
                    query: '',
                    kind: 'all',
                    limit: 1200
                });
                commandContext.showResult(buildLibraryResultState(result, '', 'Library Refreshed'));
                commandContext.notify('Refreshed local library context.', 'success');
            }
        },
        {
            name: 'release_date',
            aliases: ['platform_release_date', 'get_release_date'],
            description: 'Read a platform release date from local platform config.',
            usage: '/release_date psx',
            keywords: ['platform', 'release date', 'launch year', 'console date'],
            async run(commandContext) {
                const query = normalizeText(commandContext.argsText) || await promptForValue({
                    title: 'Platform Release Date',
                    message: 'Enter the platform name or short name to look up.',
                    placeholder: 'psx'
                });
                if (!query) return;
                const rows = await queryPlatforms(emubro);
                const row = resolvePlatformRow(rows, query);
                if (!row) {
                    throw new Error(`No platform config was found for "${query}".`);
                }
                const detail = formatReleaseDateText(row?.releaseDate || {});
                if (!detail) {
                    throw new Error(`No local release date is recorded in platform config for ${normalizeText(row?.name || query)}.`);
                }
                commandContext.showResult(buildActionResultState(
                    'Platform Release Date',
                    `Loaded the local release date config for ${normalizeText(row?.name || query)}.`,
                    detail
                ));
                commandContext.notify(`Loaded release date for ${normalizeText(row?.name || query)}.`, 'success');
            }
        },
        {
            name: 'game_release_date',
            aliases: ['get_game_release_date', 'read_game_release_date'],
            description: 'Resolve a game from the local library and show any locally recorded release date.',
            usage: '/game_release_date "Spyro 2"',
            keywords: ['game', 'release date', 'game date', 'launch year'],
            async run(commandContext) {
                const query = normalizeText(commandContext.argsText) || await promptForValue({
                    title: 'Game Release Date',
                    message: 'Enter the game title to look up.',
                    placeholder: 'Spyro 2'
                });
                if (!query) return;
                const { row } = await resolveLibraryRow(emubro, query, 'games');
                const values = [
                    normalizeText(row?.releaseDate),
                    normalizeText(row?.release_date),
                    normalizeText(row?.releaseYear),
                    normalizeText(row?.release_year),
                    normalizeText(row?.year),
                    normalizeText(row?.date),
                    normalizeText(row?.metadata?.releaseDate),
                    normalizeText(row?.metadata?.release_date),
                    normalizeText(row?.metadata?.releaseYear),
                    normalizeText(row?.metadata?.release_year),
                    normalizeText(row?.metadata?.year),
                    normalizeText(row?.metadata?.date)
                ].filter(Boolean);
                const detail = values.find((value) => /\d{4}/.test(value)) || values[0] || '';
                if (!detail) {
                    throw new Error(`No local release date is recorded for ${normalizeText(row?.name || query)}. Use support chat if you want fallback reasoning for the game's release date.`);
                }
                commandContext.showResult(buildActionResultState(
                    'Game Release Date',
                    `Loaded a locally recorded release date for ${normalizeText(row?.name || query)}.`,
                    detail
                ));
                commandContext.notify(`Loaded game release date for ${normalizeText(row?.name || query)}.`, 'success');
            }
        },
        {
            name: 'fetch_game_cover',
            aliases: ['show_game_cover', 'get_game_cover'],
            description: 'Resolve or fetch a game cover and show the selected image URL.',
            usage: '/fetch_game_cover "Spyro 2"',
            keywords: ['cover', 'artwork', 'box art', 'image'],
            async run(commandContext) {
                const query = normalizeText(commandContext.argsText) || await promptForValue({
                    title: 'Fetch Game Cover',
                    message: 'Enter the game title to fetch the cover for.',
                    placeholder: 'Spyro 2'
                });
                if (!query) return;
                const { row } = await resolveLibraryRow(emubro, query, 'games');
                let imageUrl = normalizeText(row?.image || row?.coverImage);
                let source = imageUrl ? 'library' : '';
                if (!imageUrl) {
                    const response = await emubro.invoke('covers:download-for-game', {
                        gameId: Number(row?.id || 0),
                        overwrite: false,
                        onlyMissing: true
                    });
                    if (response?.success) {
                        imageUrl = normalizeText(response?.imageUrl || response?.thumbnailUrl);
                        source = 'download';
                    }
                }
                if (!imageUrl) {
                    throw new Error(`No usable cover image was found for ${normalizeText(row?.name || 'that game')}.`);
                }
                commandContext.showResult(buildActionResultState(
                    'Game Cover',
                    `Resolved a cover for ${normalizeText(row?.name || 'game')}.`,
                    `Source: ${source || 'unknown'}\n${imageUrl}`
                ));
                commandContext.notify(`Fetched cover for ${normalizeText(row?.name || 'game')}.`, 'success');
            }
        },
        {
            name: 'add_game_cover',
            aliases: ['apply_game_cover', 'set_game_cover'],
            description: 'Apply a specific cover image URL to a library game.',
            usage: '/add_game_cover "Spyro 2" https://image-url',
            keywords: ['cover', 'apply cover', 'save cover', 'metadata'],
            async run(commandContext) {
                const parsed = parseNamedValueCommandArgs(commandContext.argsText);
                const gameQuery = parsed.nameQuery || await promptForValue({
                    title: 'Add Game Cover',
                    message: 'Enter the game title to update.',
                    placeholder: 'Spyro 2'
                });
                if (!gameQuery) return;
                const imageUrl = parsed.value || await promptForValue({
                    title: 'Add Game Cover',
                    message: 'Enter the cover image URL to apply.',
                    placeholder: 'https://example.com/spyro2-cover.jpg'
                });
                if (!normalizeText(imageUrl)) return;
                const { row } = await resolveLibraryRow(emubro, gameQuery, 'games');
                const updateResult = await emubro.invoke('update-game-metadata', {
                    gameId: Number(row?.id || 0),
                    image: normalizeText(imageUrl)
                });
                if (!updateResult?.success) {
                    throw new Error(normalizeText(updateResult?.message || 'Failed to apply the selected cover.'));
                }
                commandContext.showResult(buildActionResultState(
                    'Game Cover Applied',
                    `Applied the provided cover to ${normalizeText(row?.name || 'game')}.`,
                    normalizeText(imageUrl)
                ));
                commandContext.notify(`Applied cover to ${normalizeText(row?.name || 'game')}.`, 'success');
            }
        },
        {
            name: 'run_game',
            aliases: ['play_game', 'launch_game'],
            description: 'Launch a game from your local library.',
            usage: '/run_game Spyro the Dragon',
            keywords: ['play', 'launch', 'library game'],
            closeOnSuccess: true,
            async run(commandContext) {
                const query = normalizeText(commandContext.argsText) || await promptForValue({
                    title: 'Run Game',
                    message: 'Enter the game title to launch.',
                    placeholder: 'Spyro the Dragon'
                });
                if (!query) return;
                const { row } = await resolveLibraryRow(emubro, query, 'games');
                const result = await emubro.invoke('launch-game', { gameId: Number(row?.id || 0) });
                if (!result?.success) {
                    throw new Error(normalizeText(result?.message || `Failed to launch ${normalizeText(row?.name || 'the game')}.`));
                }
                commandContext.notify(normalizeText(result?.message || `Launched ${normalizeText(row?.name || 'game')}.`), 'success');
            }
        },
        {
            name: 'run_emulator',
            aliases: ['launch_emulator', 'open_emulator'],
            description: 'Launch an emulator application.',
            usage: '/run_emulator RetroArch',
            keywords: ['emulator', 'open', 'launch'],
            closeOnSuccess: true,
            async run(commandContext) {
                const query = normalizeText(commandContext.argsText) || await promptForValue({
                    title: 'Run Emulator',
                    message: 'Enter the emulator name to launch.',
                    placeholder: 'RetroArch'
                });
                if (!query) return;
                const { row } = await resolveLibraryRow(emubro, query, 'emulators');
                const overrides = resolveStoredEmulatorConfig(row);
                const filePath = normalizeText(row?.filePath || (Array.isArray(row?.filePaths) ? row.filePaths[0] : ''));
                if (!filePath) {
                    throw new Error(`No launch path is recorded for ${normalizeText(row?.name || 'this emulator')}.`);
                }
                const result = await emubro.invoke('launch-emulator', {
                    filePath,
                    args: normalizeText(overrides.launchArgs || row?.launchArgs || row?.args),
                    workingDirectory: normalizeText(overrides.workingDirectory || row?.workingDirectory),
                    runAsAdmin: !!row?.runAsAdmin,
                    runAsUser: normalizeText(row?.runAsUser),
                    inputBindings: row?.inputBindings || null,
                    gamepadBindings: row?.gamepadBindings || {},
                    runCommandsBefore: normalizeText(overrides.runCommandsBefore)
                        ? normalizeText(overrides.runCommandsBefore).split(/\r?\n+/g).map((value) => normalizeText(value)).filter(Boolean)
                        : (Array.isArray(row?.runCommandsBefore) ? row.runCommandsBefore : []),
                    name: normalizeText(row?.name || 'Emulator')
                });
                if (!result?.success) {
                    throw new Error(normalizeText(result?.message || `Failed to launch ${normalizeText(row?.name || 'the emulator')}.`));
                }
                commandContext.notify(normalizeText(result?.message || `Launched ${normalizeText(row?.name || 'emulator')}.`), 'success');
            }
        },
        {
            name: 'open_game_details',
            aliases: ['game_details', 'show_game_details'],
            description: 'Open the game details popup for a local library game.',
            usage: '/open_game_details Spyro the Dragon',
            keywords: ['details', 'game modal', 'inspect game'],
            closeOnSuccess: true,
            async run(commandContext) {
                const query = normalizeText(commandContext.argsText) || await promptForValue({
                    title: 'Open Game Details',
                    message: 'Enter the game title to open in the details popup.',
                    placeholder: 'Spyro the Dragon'
                });
                if (!query) return;
                const { row } = await resolveLibraryRow(emubro, query, 'games');
                showGameDetails(row);
                commandContext.notify(`Opened game details for ${normalizeText(row?.name || 'game')}.`, 'success');
            }
        },
        {
            name: 'open_emulator_details',
            aliases: ['emulator_details', 'show_emulator_details'],
            description: 'Open the emulator details popup for a local emulator.',
            usage: '/open_emulator_details RetroArch',
            keywords: ['details', 'emulator modal', 'inspect emulator'],
            closeOnSuccess: true,
            async run(commandContext) {
                const query = normalizeText(commandContext.argsText) || await promptForValue({
                    title: 'Open Emulator Details',
                    message: 'Enter the emulator name to open in the details popup.',
                    placeholder: 'RetroArch'
                });
                if (!query) return;
                const { row } = await resolveLibraryRow(emubro, query, 'emulators');
                showEmulatorDetails(row);
                commandContext.notify(`Opened emulator details for ${normalizeText(row?.name || 'emulator')}.`, 'success');
            }
        },
        {
            name: 'download_emulator',
            aliases: ['install_emulator', 'download_install_emulator'],
            description: 'Download and install a configured emulator.',
            usage: '/download_emulator DuckStation',
            keywords: ['install', 'setup', 'emulator'],
            closeOnSuccess: true,
            async run(commandContext) {
                const query = normalizeText(commandContext.argsText) || await promptForValue({
                    title: 'Download Emulator',
                    message: 'Enter the emulator name to download and install.',
                    placeholder: 'DuckStation'
                });
                if (!query) return;
                const { row } = await resolveLibraryRow(emubro, query, 'emulators');
                const payload = buildDownloadPayload(row, window?.emubro?.platform || 'windows');
                const result = await emubro.invoke('download-install-emulator', payload);
                if (!result?.success && !result?.manual) {
                    throw new Error(normalizeText(result?.message || `Failed to download ${normalizeText(row?.name || 'the emulator')}.`));
                }
                commandContext.showResult(buildActionResultState(
                    'Emulator Download',
                    result?.manual
                        ? `Opened the download source for ${normalizeText(row?.name || 'emulator')}.`
                        : `Started download/install for ${normalizeText(row?.name || 'emulator')}.`,
                    normalizeText(result?.message || '')
                ));
                commandContext.notify(
                    normalizeText(
                        result?.message
                        || (result?.manual
                            ? `Opened download source for ${normalizeText(row?.name || 'emulator')}.`
                            : `Started install for ${normalizeText(row?.name || 'emulator')}.`)
                    ),
                    'success'
                );
            }
        },
        {
            name: 'change_emulator_website',
            aliases: ['set_emulator_website'],
            description: 'Change the stored website override for an emulator.',
            usage: '/change_emulator_website "bsnes" https://bsnes.dev',
            keywords: ['emulator config', 'website', 'override'],
            async run(commandContext) {
                const parsed = parseNamedValueCommandArgs(commandContext.argsText);
                const emulatorQuery = parsed.nameQuery || await promptForValue({
                    title: 'Change Emulator Website',
                    message: 'Enter the emulator name to update.',
                    placeholder: 'bsnes'
                });
                if (!emulatorQuery) return;
                const value = parsed.value || await promptForValue({
                    title: 'Change Emulator Website',
                    message: 'Enter the website URL to store.',
                    placeholder: 'https://bsnes.dev'
                });
                const { row } = await resolveLibraryRow(emubro, emulatorQuery, 'emulators');
                updateStoredEmulatorConfig(row, { website: value });
                commandContext.showResult(buildActionResultState('Emulator Website Updated', `Updated the website override for ${normalizeText(row?.name || 'emulator')}.`, value));
                commandContext.notify(`Updated website override for ${normalizeText(row?.name || 'emulator')}.`, 'success');
            }
        },
        {
            name: 'change_emulator_launch_args',
            aliases: ['set_emulator_launch_args'],
            description: 'Change stored launch arguments for an emulator.',
            usage: '/change_emulator_launch_args "DuckStation" --fullscreen',
            keywords: ['emulator config', 'launch args', 'override'],
            async run(commandContext) {
                const parsed = parseNamedValueCommandArgs(commandContext.argsText);
                const emulatorQuery = parsed.nameQuery || await promptForValue({
                    title: 'Change Emulator Launch Args',
                    message: 'Enter the emulator name to update.',
                    placeholder: 'DuckStation'
                });
                if (!emulatorQuery) return;
                const value = parsed.value || await promptForValue({
                    title: 'Change Emulator Launch Args',
                    message: 'Enter the launch arguments to store.',
                    placeholder: '--fullscreen'
                });
                const { row } = await resolveLibraryRow(emubro, emulatorQuery, 'emulators');
                updateStoredEmulatorConfig(row, { launchArgs: value });
                commandContext.showResult(buildActionResultState('Emulator Launch Args Updated', `Updated launch arguments for ${normalizeText(row?.name || 'emulator')}.`, value));
                commandContext.notify(`Updated launch arguments for ${normalizeText(row?.name || 'emulator')}.`, 'success');
            }
        },
        {
            name: 'change_emulator_working_directory',
            aliases: ['set_emulator_working_directory'],
            description: 'Change the stored working directory override for an emulator.',
            usage: '/change_emulator_working_directory "RetroArch" D:\\Emulators\\RetroArch',
            keywords: ['emulator config', 'working directory', 'override'],
            async run(commandContext) {
                const parsed = parseNamedValueCommandArgs(commandContext.argsText);
                const emulatorQuery = parsed.nameQuery || await promptForValue({
                    title: 'Change Emulator Working Directory',
                    message: 'Enter the emulator name to update.',
                    placeholder: 'RetroArch'
                });
                if (!emulatorQuery) return;
                const value = parsed.value || await promptForValue({
                    title: 'Change Emulator Working Directory',
                    message: 'Enter the working directory path to store.',
                    placeholder: 'D:\\Emulators\\RetroArch'
                });
                const { row } = await resolveLibraryRow(emubro, emulatorQuery, 'emulators');
                updateStoredEmulatorConfig(row, { workingDirectory: value });
                commandContext.showResult(buildActionResultState('Emulator Working Directory Updated', `Updated the working directory for ${normalizeText(row?.name || 'emulator')}.`, value));
                commandContext.notify(`Updated working directory for ${normalizeText(row?.name || 'emulator')}.`, 'success');
            }
        },
        {
            name: 'change_emulator_config_path',
            aliases: ['set_emulator_config_path', 'set_emulator_config_file_path'],
            description: 'Change the stored config file path override for an emulator.',
            usage: '/change_emulator_config_path "xemu" C:\\Emulators\\xemu\\xemu.toml',
            keywords: ['emulator config', 'config path', 'override'],
            async run(commandContext) {
                const parsed = parseNamedValueCommandArgs(commandContext.argsText);
                const emulatorQuery = parsed.nameQuery || await promptForValue({
                    title: 'Change Emulator Config Path',
                    message: 'Enter the emulator name to update.',
                    placeholder: 'xemu'
                });
                if (!emulatorQuery) return;
                const value = parsed.value || await promptForValue({
                    title: 'Change Emulator Config Path',
                    message: 'Enter the config file path to store.',
                    placeholder: 'C:\\Emulators\\xemu\\xemu.toml'
                });
                const { row } = await resolveLibraryRow(emubro, emulatorQuery, 'emulators');
                updateStoredEmulatorConfig(row, { configFilePath: value });
                commandContext.showResult(buildActionResultState('Emulator Config Path Updated', `Updated the config file path for ${normalizeText(row?.name || 'emulator')}.`, value));
                commandContext.notify(`Updated config path for ${normalizeText(row?.name || 'emulator')}.`, 'success');
            }
        },
        {
            name: 'change_emulator_run_commands_before',
            aliases: ['set_emulator_run_commands_before'],
            description: 'Change stored pre-launch commands for an emulator.',
            usage: '/change_emulator_run_commands_before "PCSX2" start /min joytokey.exe',
            keywords: ['emulator config', 'pre-launch', 'run commands before'],
            async run(commandContext) {
                const parsed = parseNamedValueCommandArgs(commandContext.argsText);
                const emulatorQuery = parsed.nameQuery || await promptForValue({
                    title: 'Change Emulator Pre-Launch Commands',
                    message: 'Enter the emulator name to update.',
                    placeholder: 'PCSX2'
                });
                if (!emulatorQuery) return;
                const value = parsed.value || await promptForValue({
                    title: 'Change Emulator Pre-Launch Commands',
                    message: 'Enter the commands to run before launch.',
                    placeholder: 'start /min joytokey.exe'
                });
                const { row } = await resolveLibraryRow(emubro, emulatorQuery, 'emulators');
                updateStoredEmulatorConfig(row, { runCommandsBefore: value });
                commandContext.showResult(buildActionResultState('Emulator Pre-Launch Commands Updated', `Updated pre-launch commands for ${normalizeText(row?.name || 'emulator')}.`, value));
                commandContext.notify(`Updated pre-launch commands for ${normalizeText(row?.name || 'emulator')}.`, 'success');
            }
        },
        {
            name: 'clear_emulator_override_fields',
            aliases: ['clear_emulator_overrides', 'reset_emulator_overrides'],
            description: 'Clear one or more stored emulator override fields.',
            usage: '/clear_emulator_override_fields "RetroArch" launch-args,working-directory',
            keywords: ['emulator config', 'clear override', 'reset override'],
            async run(commandContext) {
                const parsed = parseNamedValueCommandArgs(commandContext.argsText);
                const emulatorQuery = parsed.nameQuery || await promptForValue({
                    title: 'Clear Emulator Override Fields',
                    message: 'Enter the emulator name to update.',
                    placeholder: 'RetroArch'
                });
                if (!emulatorQuery) return;
                const fieldsInput = parsed.value || await promptForValue({
                    title: 'Clear Emulator Override Fields',
                    message: 'Enter fields to clear, separated by commas, or use all.',
                    placeholder: 'launch-args,working-directory'
                });
                const fields = parseCommaList(fieldsInput || 'all');
                const { row } = await resolveLibraryRow(emubro, emulatorQuery, 'emulators');
                clearStoredEmulatorConfigFields(row, fields);
                commandContext.showResult(buildActionResultState('Emulator Overrides Cleared', `Cleared override fields for ${normalizeText(row?.name || 'emulator')}.`, fields.join(', ') || 'all'));
                commandContext.notify(`Cleared emulator overrides for ${normalizeText(row?.name || 'emulator')}.`, 'success');
            }
        }
    ];

    commands.push(
        {
            name: 'list_tags',
            aliases: ['tags', 'show_tags'],
            description: 'List available local tags.',
            usage: '/list_tags platform',
            keywords: ['metadata', 'categories', 'labels'],
            async run(commandContext) {
                const query = normalizeText(commandContext.argsText);
                const tagRows = findMatchingTags(await getTagRows(emubro), query);
                commandContext.showResult(buildTagsResultState(tagRows, query));
                commandContext.notify(query ? `Loaded matching tags for "${query}".` : 'Loaded local tags.', 'success');
            }
        },
        {
            name: 'add_tags',
            aliases: ['tag_game'],
            description: 'Add tags to a game in the local library.',
            usage: '/add_tags',
            keywords: ['metadata', 'game tags', 'assign'],
            async run(commandContext) {
                const parsedArgs = parseTaggedGameCommandArgs(commandContext.argsText);
                const gameQuery = parsedArgs.gameQuery || await promptForValue({
                    title: 'Add Tags',
                    message: 'Enter the game title to update.',
                    placeholder: 'Spyro the Dragon'
                });
                if (!gameQuery) return;
                const tagInput = parsedArgs.tags.length ? parsedArgs.tags.join(',') : await promptForValue({
                    title: 'Add Tags',
                    message: 'Enter one or more tag names, separated by commas.',
                    placeholder: 'favorite, platformer'
                });
                const requestedTags = parsedArgs.tags.length ? parsedArgs.tags : parseCommaList(tagInput);
                if (!requestedTags.length) return;

                const { row } = await resolveLibraryRow(emubro, gameQuery, 'games');
                const tagRows = await getTagRows(emubro);
                const tagByName = new Map();
                tagRows.forEach((tag) => {
                    const key = normalizeLower(tag?.name || tag?.label);
                    const id = normalizeText(tag?.id);
                    if (key && id && !tagByName.has(key)) {
                        tagByName.set(key, id);
                    }
                });
                const merged = new Set((Array.isArray(row?.tags) ? row.tags : []).map((value) => normalizeText(value)).filter(Boolean));
                requestedTags.forEach((value) => {
                    const normalized = normalizeLower(value);
                    const mapped = normalizeText(tagByName.get(normalized) || value);
                    if (mapped) merged.add(mapped);
                });
                const updateResult = await emubro.invoke('update-game-metadata', {
                    gameId: Number(row?.id || 0),
                    tags: Array.from(merged)
                });
                if (!updateResult?.success) {
                    throw new Error(normalizeText(updateResult?.message || 'Failed to update game tags.'));
                }
                commandContext.showResult(buildActionResultState(
                    'Tags Applied',
                    `Applied ${requestedTags.length} tag${requestedTags.length === 1 ? '' : 's'} to ${normalizeText(row?.name || 'game')}.`,
                    `Tags: ${requestedTags.join(', ')}`
                ));
                commandContext.notify(`Applied tags to ${normalizeText(row?.name || 'game')}.`, 'success');
            }
        },
        {
            name: 'remove_tags',
            aliases: ['untag_game'],
            description: 'Remove tags from a game in the local library.',
            usage: '/remove_tags',
            keywords: ['metadata', 'game tags', 'delete'],
            async run(commandContext) {
                const parsedArgs = parseTaggedGameCommandArgs(commandContext.argsText);
                const gameQuery = parsedArgs.gameQuery || await promptForValue({
                    title: 'Remove Tags',
                    message: 'Enter the game title to update.',
                    placeholder: 'Crash Team Racing'
                });
                if (!gameQuery) return;
                const tagInput = parsedArgs.tags.length ? parsedArgs.tags.join(',') : await promptForValue({
                    title: 'Remove Tags',
                    message: 'Enter one or more tags to remove, separated by commas.',
                    placeholder: 'racing, favorite'
                });
                const requestedTags = parsedArgs.tags.length ? parsedArgs.tags : parseCommaList(tagInput);
                if (!requestedTags.length) return;

                const { row } = await resolveLibraryRow(emubro, gameQuery, 'games');
                const tagRows = await getTagRows(emubro);
                const resolvedIds = new Set();
                requestedTags.forEach((value) => {
                    const exact = findMatchingTags(tagRows, value).find((tag) => {
                        const name = normalizeLower(tag?.name || tag?.label);
                        const id = normalizeLower(tag?.id);
                        const needle = normalizeLower(value);
                        return name === needle || id === needle;
                    });
                    resolvedIds.add(normalizeText(exact?.id || value));
                });
                const nextTags = (Array.isArray(row?.tags) ? row.tags : [])
                    .map((value) => normalizeText(value))
                    .filter((value) => value && !resolvedIds.has(value));
                const updateResult = await emubro.invoke('update-game-metadata', {
                    gameId: Number(row?.id || 0),
                    tags: nextTags
                });
                if (!updateResult?.success) {
                    throw new Error(normalizeText(updateResult?.message || 'Failed to update game tags.'));
                }
                commandContext.showResult(buildActionResultState(
                    'Tags Removed',
                    `Removed ${requestedTags.length} tag${requestedTags.length === 1 ? '' : 's'} from ${normalizeText(row?.name || 'game')}.`,
                    `Tags: ${requestedTags.join(', ')}`
                ));
                commandContext.notify(`Removed tags from ${normalizeText(row?.name || 'game')}.`, 'success');
            }
        },
        {
            name: 'list_help_docs',
            aliases: ['help_docs', 'search_help'],
            description: 'Search local help docs.',
            usage: '/list_help_docs bios',
            keywords: ['help', 'docs', 'manual'],
            async run(commandContext) {
                const query = normalizeText(commandContext.argsText);
                const result = await emubro.invoke('help:docs:list', {
                    query,
                    limit: 30
                });
                if (!result?.success) {
                    throw new Error(normalizeText(result?.message || 'Failed to load help docs.'));
                }
                const docs = Array.isArray(result.docs) ? result.docs : [];
                commandContext.showResult(buildHelpDocListResultState(docs, query));
                commandContext.notify(query ? `Loaded help docs for "${query}".` : 'Loaded help docs.', 'success');
            }
        },
        {
            name: 'read_help_doc',
            aliases: ['open_help_doc'],
            description: 'Open a specific local help doc.',
            usage: '/read_help_doc bios',
            keywords: ['help', 'docs', 'article'],
            async run(commandContext) {
                const query = normalizeText(commandContext.argsText) || await promptForValue({
                    title: 'Read Help Doc',
                    message: 'Enter a help-doc id or title.',
                    placeholder: 'bios'
                });
                if (!query) return;
                const listResult = await emubro.invoke('help:docs:list', { query, limit: 20 });
                if (!listResult?.success) {
                    throw new Error(normalizeText(listResult?.message || 'Failed to search help docs.'));
                }
                const docs = Array.isArray(listResult.docs) ? listResult.docs : [];
                const doc = pickBestNamedRow(docs.map((row) => ({
                    ...row,
                    name: normalizeText(row?.title || row?.id)
                })), query);
                if (!doc) {
                    throw new Error(`No help doc was found for "${query}".`);
                }
                const result = await emubro.invoke('help:docs:get', { id: normalizeText(doc?.id) });
                if (!result?.success || !result?.doc) {
                    throw new Error(normalizeText(result?.message || 'Failed to load help doc.'));
                }
                commandContext.showResult(buildHelpDocResultState(result.doc));
                commandContext.notify(`Opened help doc ${normalizeText(result.doc?.title || result.doc?.id || 'Help Doc')}.`, 'success');
            }
        },
        {
            name: 'youtube_preview',
            aliases: ['open_youtube_preview', 'youtube'],
            description: 'Open a YouTube preview or search for a game.',
            usage: '/youtube_preview Spyro the Dragon',
            keywords: ['video', 'trailer', 'preview'],
            closeOnSuccess: true,
            async run(commandContext) {
                let query = normalizeText(commandContext.argsText);
                if (!query) {
                    query = await promptForValue({
                        title: 'YouTube Preview',
                        message: 'Enter a game title or YouTube URL.',
                        placeholder: 'Spyro the Dragon'
                    });
                }
                if (!query) return;
                const target = /^https?:\/\//i.test(query)
                    ? query
                    : `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
                const result = await emubro.invoke('open-external-url', target);
                if (!result?.success) {
                    throw new Error(normalizeText(result?.message || 'Failed to open YouTube.'));
                }
                commandContext.showResult(buildActionResultState(
                    'YouTube Preview',
                    'Opened the YouTube search or preview target.',
                    target
                ));
                commandContext.notify('Opened YouTube preview.', 'success');
            }
        },
        {
            name: 'open_url',
            aliases: ['open_external_url', 'browse'],
            description: 'Open an external URL in the browser.',
            usage: '/open_url https://retroarch.com',
            keywords: ['url', 'website', 'link'],
            closeOnSuccess: true,
            async run(commandContext) {
                let target = normalizeText(commandContext.argsText);
                if (!target) {
                    target = await promptForValue({
                        title: 'Open URL',
                        message: 'Enter the URL to open.',
                        placeholder: 'https://www.retroarch.com/'
                    });
                }
                if (!target) return;
                if (/^www\./i.test(target)) {
                    target = `https://${target}`;
                }
                const result = await emubro.invoke('open-external-url', target);
                if (!result?.success) {
                    throw new Error(normalizeText(result?.message || 'Failed to open the URL.'));
                }
                commandContext.showResult(buildActionResultState(
                    'External URL',
                    'Opened the external URL in the browser.',
                    target
                ));
                commandContext.notify(`Opened ${target}.`, 'success');
            }
        },
        {
            name: 'open_panel',
            aliases: ['panel', 'open_workspace'],
            description: 'Open a local workspace, modal, or app section.',
            usage: '/open_panel theme',
            keywords: ['settings', 'support', 'community', 'theme', 'library'],
            closeOnSuccess: true,
            async run(commandContext) {
                let target = normalizeText(commandContext.argsText);
                if (!target) {
                    target = await promptForValue({
                        title: 'Open Panel',
                        message: 'Enter a panel target like settings, theme, languages, support, help, community, library, or emulators.',
                        placeholder: 'theme'
                    });
                }
                if (!target) return;
                const opened = await appPanels.openTarget(target);
                commandContext.showResult(buildActionResultState(
                    'Local Panel',
                    `Opened ${appPanels.describeTarget(opened)}.`,
                    normalizeText(target)
                ));
                commandContext.notify(`Opened ${appPanels.describeTarget(opened)}.`, 'success');
            }
        }
    );

    commands.push(
        createPanelShortcutCommand('open_settings', 'settings', 'Open the main settings workspace.', ['settings']),
        createPanelShortcutCommand('open_theme', 'theme', 'Open the theme manager.', ['theme']),
        createPanelShortcutCommand('open_languages', 'languages', 'Open the language manager.', ['languages']),
        createPanelShortcutCommand('open_profile', 'profile', 'Open the profile modal.', ['profile']),
        createPanelShortcutCommand('open_about', 'about', 'Open the about dialog.', ['about']),
        createPanelShortcutCommand('open_support', 'support', 'Open support chat.', ['support']),
        createPanelShortcutCommand('open_troubleshoot', 'troubleshoot', 'Open support troubleshoot mode.', ['troubleshoot']),
        createPanelShortcutCommand('open_help', 'help', 'Open support help docs.', ['help']),
        createPanelShortcutCommand('open_community', 'community', 'Open the community hub.', ['community']),
        createPanelShortcutCommand('open_tools', 'tools', 'Open the tools section.', ['tools']),
        createPanelShortcutCommand('open_library', 'library', 'Open the main library view.', ['library']),
        createPanelShortcutCommand('open_emulators', 'emulators', 'Open the emulators library section.', ['emulators']),
        createPanelShortcutCommand('open_favorites', 'favorites', 'Open the favorites library section.', ['favorites']),
        createPanelShortcutCommand('open_recent', 'recent', 'Open the recently played library section.', ['recent']),
        createPanelShortcutCommand('open_suggested', 'suggested', 'Open the suggested library section.', ['suggested']),
        createPanelShortcutCommand('open_overview', 'overview', 'Open the app overview/home section.', ['overview', 'home'])
    );

    return commands;
}

function filterCommands(commands, inputValue) {
    const { command, argsText, raw } = parseSlashInput(inputValue);
    const needle = normalizeLower(command || raw.replace(/^\//, ''));
    if (!needle) {
        return commands.slice();
    }
    return commands.filter((entry) => {
        const haystack = [
            entry.name,
            ...(Array.isArray(entry.aliases) ? entry.aliases : []),
            entry.description,
            ...(Array.isArray(entry.keywords) ? entry.keywords : [])
        ].map((value) => normalizeLower(value)).join(' ');
        if (haystack.includes(needle)) return true;
        if (argsText && normalizeLower(entry.name) === needle) return true;
        return false;
    });
}

export function setupSlashCommandPalette(options = {}) {
    const emubro = options.emubro || window.emubro;
    if (!emubro || typeof emubro.invoke !== 'function') {
        return () => {};
    }

    const notify = typeof options.addFooterNotification === 'function'
        ? options.addFooterNotification
        : () => {};
    const appPanels = createAppPanelController(options);
    const commands = createSlashCommands({ emubro, appPanels });

    let overlayEl = null;
    let inputEl = null;
    let listEl = null;
    let chipRowEl = null;
    let detailEl = null;
    let resultEl = null;
    let activeIndex = 0;
    let filteredCommands = commands.slice();
    let resultState = null;

    const closePalette = () => {
        if (overlayEl) {
            overlayEl.remove();
        }
        overlayEl = null;
        inputEl = null;
        listEl = null;
        chipRowEl = null;
        detailEl = null;
        resultEl = null;
        activeIndex = 0;
        filteredCommands = commands.slice();
        resultState = null;
    };

    const renderChipButtons = (command) => {
        const chips = getSlashCommandChips(command);
        if (!chips.length) {
            return '';
        }
        return chips.map((chip) => {
            const value = normalizeText(chip?.value || '');
            const mode = normalizeLower(chip?.mode || '');
            const label = normalizeText(chip?.label || value || 'Chip');
            const description = normalizeText(chip?.description || '');
            return `
                <button
                    type="button"
                    class="slash-command-chip"
                    data-slash-chip-value="${escapeHtml(value)}"
                    data-slash-chip-mode="${escapeHtml(mode)}"
                    data-slash-chip-command="${escapeHtml(normalizeText(command?.name || ''))}"
                >
                    <strong>${escapeHtml(label)}</strong>
                    ${description ? `<span>${escapeHtml(description)}</span>` : ''}
                </button>
            `;
        }).join('');
    };

    const setResult = (nextValue) => {
        resultState = nextValue ? buildSlashResultState(nextValue) : null;
        if (resultEl) {
            resultEl.innerHTML = renderSlashResultPanel(resultState);
        }
    };

    const renderDetailPanel = (command) => {
        if (!detailEl) return;
        if (!command) {
            detailEl.innerHTML = `
                <div class="slash-command-placeholder">
                    <strong>No command selected</strong>
                    <span>Start typing after <code>/</code> to narrow down commands.</span>
                </div>
            `;
            return;
        }
        const aliases = Array.isArray(command.aliases) ? command.aliases.filter(Boolean) : [];
        const hint = getSlashCommandInlineHint(command);
        const parsed = parseSlashInput(inputEl?.value || '');
        const currentArgs = normalizeLower(parsed.command) === normalizeLower(command.name)
            || aliases.some((alias) => normalizeLower(alias) === normalizeLower(parsed.command))
            ? normalizeText(parsed.argsText)
            : '';

        detailEl.innerHTML = `
            <div class="slash-command-detail-card">
                <div class="slash-command-detail-head">
                    <div>
                        <strong>/${escapeHtml(command.name)}</strong>
                        <span>${escapeHtml(command.description || '')}</span>
                    </div>
                    <em>${escapeHtml(shouldCloseSlashPaletteOnSuccess(command) ? 'action' : 'inspect')}</em>
                </div>
                <div class="slash-command-detail-meta">
                    <span><strong>Usage</strong> ${escapeHtml(command.usage || `/${command.name}`)}</span>
                    ${aliases.length ? `<span><strong>Aliases</strong> ${aliases.map((alias) => `/${escapeHtml(alias)}`).join(', ')}</span>` : ''}
                    ${currentArgs ? `<span><strong>Current Args</strong> ${escapeHtml(currentArgs)}</span>` : ''}
                </div>
                ${hint ? `<div class="slash-command-inline-hint">${escapeHtml(hint)}</div>` : ''}
                ${getSlashCommandChips(command).length ? `
                    <div class="slash-command-detail-chips">
                        <div class="slash-command-detail-label">Argument chips</div>
                        <div class="slash-command-chip-row slash-command-chip-row--detail">
                            ${renderChipButtons(command)}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    };

    const syncSelectedCommandUi = () => {
        const selectedCommand = resolveSelectedSlashCommand(commands, filteredCommands, activeIndex, inputEl?.value || '');
        if (chipRowEl) {
            const chipsHtml = selectedCommand && getSlashCommandChips(selectedCommand).length
                ? renderChipButtons(selectedCommand)
                : '';
            chipRowEl.innerHTML = chipsHtml || '<span class="slash-command-chip-empty">No inline argument chips for this command yet.</span>';
            chipRowEl.classList.toggle('is-empty', !chipsHtml);
        }
        renderDetailPanel(selectedCommand);
    };

    const renderList = () => {
        if (!listEl || !inputEl) return;
        filteredCommands = filterCommands(commands, inputEl.value);
        if (!filteredCommands.length) {
            activeIndex = 0;
            listEl.innerHTML = `
                <div class="slash-command-empty">
                    <strong>No matching commands</strong>
                    <span>Try commands like <code>/fetch_specs</code>, <code>/run_game</code>, or <code>/open_theme</code>.</span>
                </div>
            `;
            syncSelectedCommandUi();
            return;
        }
        if (activeIndex >= filteredCommands.length) {
            activeIndex = 0;
        }
        listEl.innerHTML = filteredCommands.map((command, index) => {
            const aliases = Array.isArray(command.aliases) && command.aliases.length
                ? command.aliases.map((alias) => `/${escapeHtml(alias)}`).join(', ')
                : '';
            return `
                <button type="button" class="slash-command-item${index === activeIndex ? ' is-active' : ''}" data-slash-index="${index}">
                    <div class="slash-command-item-top">
                        <strong>/${escapeHtml(command.name)}</strong>
                        <span>${escapeHtml(command.usage || `/${command.name}`)}</span>
                    </div>
                    <div class="slash-command-item-body">${escapeHtml(command.description || '')}</div>
                    ${aliases ? `<div class="slash-command-item-meta">Aliases: ${aliases}</div>` : ''}
                </button>
            `;
        }).join('');
        syncSelectedCommandUi();
    };

    const executeCommand = async (command) => {
        if (!command) return;
        const args = parseSlashInput(inputEl?.value || '');
        setResult({
            status: 'running',
            tone: 'info',
            title: `Running /${command.name}`,
            summary: normalizeText(args.argsText)
                ? `Executing with arguments: ${normalizeText(args.argsText)}`
                : 'Executing command...'
        });
        try {
            await command.run({
                emubro,
                argsText: normalizeText(args.argsText),
                promptIfNeeded: true,
                notify: (message, level = 'info') => notify(message, level),
                showResult: (nextValue) => setResult(nextValue),
                setResult,
                closePalette,
                appPanels
            });
            if (!resultState || resultState.status === 'running') {
                setResult(buildActionResultState(
                    `/${command.name}`,
                    'Command completed successfully.'
                ));
            }
            if (command.closeOnSuccess || shouldCloseSlashPaletteOnSuccess(command)) {
                closePalette();
                return;
            }
            renderList();
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error || 'Unknown error');
            notify(message, 'error');
            setResult({
                status: 'error',
                tone: 'error',
                title: `/${command.name} failed`,
                summary: message,
                sections: [
                    {
                        title: 'Error',
                        kind: 'text',
                        body: message
                    }
                ]
            });
            renderList();
        }
    };

    const moveSelection = (delta) => {
        if (!filteredCommands.length) return;
        activeIndex = (activeIndex + delta + filteredCommands.length) % filteredCommands.length;
        renderList();
        const activeEl = listEl?.querySelector(`.slash-command-item[data-slash-index="${activeIndex}"]`);
        activeEl?.scrollIntoView({ block: 'nearest' });
    };

    const openPalette = async () => {
        if (overlayEl) return;
        overlayEl = document.createElement('div');
        overlayEl.className = 'slash-command-overlay';
        overlayEl.innerHTML = `
            <div class="slash-command-palette glass" role="dialog" aria-modal="true" aria-label="Slash commands">
                <div class="slash-command-main">
                    <div class="slash-command-head">
                        <div>
                            <strong>Slash Commands</strong>
                            <span>Run local self tasks and open app workspaces without the LLM.</span>
                        </div>
                        <kbd>/</kbd>
                    </div>
                    <div class="slash-command-input-wrap">
                        <input type="text" class="slash-command-input" spellcheck="false" autocomplete="off" placeholder="/fetch_specs or /run_game Spyro the Dragon" />
                    </div>
                    <div class="slash-command-chip-row slash-command-chip-row--inline is-empty"></div>
                    <div class="slash-command-results"></div>
                    <div class="slash-command-hints">
                        <span><kbd>Enter</kbd> run</span>
                        <span><kbd>Up</kbd>/<kbd>Down</kbd> move</span>
                        <span><kbd>Esc</kbd> close</span>
                    </div>
                </div>
                <aside class="slash-command-side">
                    <div class="slash-command-detail"></div>
                    <div class="slash-command-result"></div>
                </aside>
            </div>
        `;
        document.body.appendChild(overlayEl);
        inputEl = overlayEl.querySelector('.slash-command-input');
        chipRowEl = overlayEl.querySelector('.slash-command-chip-row--inline');
        listEl = overlayEl.querySelector('.slash-command-results');
        detailEl = overlayEl.querySelector('.slash-command-detail');
        resultEl = overlayEl.querySelector('.slash-command-result');
        activeIndex = 0;
        setResult(null);
        renderList();

        overlayEl.addEventListener('mousedown', (event) => {
            if (event.target === overlayEl) {
                closePalette();
            }
        });

        listEl?.addEventListener('mousemove', (event) => {
            const item = event.target instanceof Element ? event.target.closest('.slash-command-item[data-slash-index]') : null;
            if (!item) return;
            const nextIndex = Number(item.getAttribute('data-slash-index'));
            if (!Number.isFinite(nextIndex) || nextIndex === activeIndex) return;
            activeIndex = nextIndex;
            renderList();
        });

        listEl?.addEventListener('click', (event) => {
            const item = event.target instanceof Element ? event.target.closest('.slash-command-item[data-slash-index]') : null;
            if (!item) return;
            const nextIndex = Number(item.getAttribute('data-slash-index'));
            const command = filteredCommands[nextIndex];
            void executeCommand(command);
        });

        overlayEl.addEventListener('click', (event) => {
            const chip = event.target instanceof Element ? event.target.closest('[data-slash-chip-value]') : null;
            if (!chip || !inputEl) return;
            const commandName = normalizeText(chip.getAttribute('data-slash-chip-command') || '');
            const command = commands.find((entry) => normalizeLower(entry?.name || '') === normalizeLower(commandName))
                || resolveSelectedSlashCommand(commands, filteredCommands, activeIndex, inputEl.value || '');
            if (!command) return;
            const value = normalizeText(chip.getAttribute('data-slash-chip-value') || '');
            const mode = normalizeLower(chip.getAttribute('data-slash-chip-mode') || '');
            inputEl.value = mode === 'replace'
                ? (value.startsWith('/') ? value : `/${command.name}${value ? ` ${value}` : ''}`)
                : `/${command.name}${value ? ` ${value}` : ''}`;
            activeIndex = 0;
            renderList();
            inputEl.focus();
            inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length);
        });

        inputEl?.addEventListener('input', () => {
            activeIndex = 0;
            renderList();
        });

        inputEl?.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                closePalette();
                return;
            }
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                moveSelection(1);
                return;
            }
            if (event.key === 'ArrowUp') {
                event.preventDefault();
                moveSelection(-1);
                return;
            }
            if (event.key === 'Enter') {
                event.preventDefault();
                const command = filteredCommands[activeIndex] || null;
                if (command) {
                    void executeCommand(command);
                }
            }
        });

        await waitForNextFrame();
        if (inputEl) {
            inputEl.value = '/';
            inputEl.focus();
            inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length);
            renderList();
        }
    };

    const onGlobalKeyDown = (event) => {
        if (event.defaultPrevented) return;
        if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
        if (overlayEl) return;
        if (isEditableTarget(event.target)) return;
        event.preventDefault();
        void openPalette();
    };

    const onOpenPanelRequest = (event) => {
        const target = normalizeText(event?.detail?.target || event?.detail?.panel || '');
        if (!target) return;
        void appPanels.openTarget(target).then((opened) => {
            notify(`Opened ${appPanels.describeTarget(opened)}.`, 'success');
        }).catch((error) => {
            const message = error instanceof Error ? error.message : String(error || 'Failed to open panel.');
            notify(message, 'error');
        });
    };

    window.addEventListener('keydown', onGlobalKeyDown, true);
    window.addEventListener('emubro:open-app-panel', onOpenPanelRequest);

    return () => {
        closePalette();
        window.removeEventListener('keydown', onGlobalKeyDown, true);
        window.removeEventListener('emubro:open-app-panel', onOpenPanelRequest);
    };
}
