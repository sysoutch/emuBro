/**
 * Game Manager
 */
import { createEmulatorDownloadActions } from './game-manager/emulator-download-actions';
import { createGameDetailsPopupActions } from './game-manager/game-details-popup-actions';
import { createEmulatorDetailsPopupActions } from './game-manager/emulator-details-popup-actions';
import { createEmulatorConfigActions } from './game-manager/emulator-config-actions';
import { createLazyGameImageActions } from './game-manager/lazy-game-images';
import { createEmulatorRuntimeActions } from './game-manager/emulator-runtime-actions';
import { createEmulatorViewRenderer } from './game-manager/emulator-view-renderer';
import { createGameCardElements } from './game-manager/game-card-elements';
import { createMissingGameRecoveryActions } from './game-manager/missing-game-recovery';
import {
    normalizeEmulatorDownloadLinks as normalizeEmulatorDownloadLinksUtil,
    hasAnyDownloadLink as hasAnyDownloadLinkUtil
} from './game-manager/emulator-link-utils';

const emubro = window.emubro;
const log = console;

let games = [];
let filteredGames = [];
let emulators = [];
let currentFilter = 'all';
let currentSort = 'name';
let currentSortDir = 'asc';
let currentGroupBy = 'none';
let currentLanguageFilter = 'all';
let currentRegionFilter = 'all';
let groupSameNamesEnabled = false;

const EMULATOR_TYPE_TABS = ['standalone', 'core', 'web'];
const LAZY_PLACEHOLDER_SRC = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
const MAX_SLIDESHOW_POOL_SIZE = 500;
const MAX_RANDOM_POOL_SIZE = 120;
const GAMES_BATCH_SIZE = {
    cover: 24,
    list: 36,
    table: 56
};

let gamesLoadObserver = null;
let gamesScrollDetach = null;
let gamesRenderToken = 0;
let emulatorDownloadActions = null;
let gameDetailsPopupActions = null;
let emulatorDetailsPopupActions = null;
let emulatorConfigActions = null;
let lazyGameImageActions = null;
let emulatorRuntimeActions = null;
let emulatorViewRenderer = null;
let gameCardElements = null;
let missingGameRecoveryActions = null;
const groupAccordionState = new Map();
let lastRenderSignature = '';
let lastRenderAt = 0;

function buildGamesRenderSignature(rows = [], view = 'cover') {
    const list = Array.isArray(rows) ? rows : [];
    const total = list.length;
    const first = total > 0 ? list[0] : null;
    const last = total > 0 ? list[total - 1] : null;
    const firstId = String(first?.id ?? first?.name ?? '');
    const lastId = String(last?.id ?? last?.name ?? '');
    return [
        String(view || 'cover'),
        String(currentGroupBy || 'none'),
        String(currentSort || 'name'),
        String(currentSortDir || 'asc'),
        total,
        firstId,
        lastId
    ].join('|');
}

function getEmulatorDownloadActions() {
    if (!emulatorDownloadActions) {
        emulatorDownloadActions = createEmulatorDownloadActions({
            emubro,
            log,
            escapeHtml,
            getEmulatorKey,
            normalizeEmulatorDownloadLinks,
            fetchEmulators,
            localStorageRef: localStorage,
            alertUser: (message) => alert(message)
        });
    }
    return emulatorDownloadActions;
}

function getGameDetailsPopupActions() {
    if (!gameDetailsPopupActions) {
        gameDetailsPopupActions = createGameDetailsPopupActions({
            emubro,
            i18n,
            log,
            escapeHtml,
            getGames,
            getEmulators,
            fetchEmulators,
            getGameImagePath,
            initializeLazyGameImages,
            reloadGamesFromMainAndRender,
            lazyPlaceholderSrc: LAZY_PLACEHOLDER_SRC,
            isLlmHelpersEnabled: () => {
                try {
                    return localStorage.getItem('emuBro.llmHelpersEnabled') !== 'false';
                } catch (_error) {
                    return true;
                }
            },
            isLlmAllowUnknownTagsEnabled: () => {
                try {
                    return localStorage.getItem('emuBro.llmAllowUnknownTags') === 'true';
                } catch (_error) {
                    return false;
                }
            },
            alertUser: (message) => alert(message),
            confirmUser: (message) => window.confirm(message)
        });
    }
    return gameDetailsPopupActions;
}

function getEmulatorDetailsPopupActions() {
    if (!emulatorDetailsPopupActions) {
        emulatorDetailsPopupActions = createEmulatorDetailsPopupActions({
            i18n,
            escapeHtml,
            getEmulatorKey,
            getEmulators,
            fetchEmulators,
            normalizeEmulatorDownloadLinks,
            hasAnyDownloadLink,
            downloadAndInstallEmulatorAction,
            getDownloadedPackagePath: getDownloadedEmulatorPackagePath,
            launchEmulatorAction,
            openEmulatorInExplorerAction,
            openDownloadedPackageInExplorerAction,
            openEmulatorWebsiteAction,
            openEmulatorConfigEditor,
            openEmulatorDownloadLinkAction
        });
    }
    return emulatorDetailsPopupActions;
}

function getEmulatorConfigActions() {
    if (!emulatorConfigActions) {
        emulatorConfigActions = createEmulatorConfigActions({
            localStorageRef: localStorage,
            emubro,
            i18n,
            log
        });
    }
    return emulatorConfigActions;
}

function getLazyGameImageActions() {
    if (!lazyGameImageActions) {
        lazyGameImageActions = createLazyGameImageActions({
            lazyPlaceholderSrc: LAZY_PLACEHOLDER_SRC,
            resolveObserverRoot: () => document.querySelector('.game-scroll-body') || null
        });
    }
    return lazyGameImageActions;
}

function getEmulatorRuntimeActions() {
    if (!emulatorRuntimeActions) {
        emulatorRuntimeActions = createEmulatorRuntimeActions({
            emubro,
            log,
            getEmulatorConfig,
            normalizeEmulatorDownloadLinks,
            alertUser: (message) => alert(message)
        });
    }
    return emulatorRuntimeActions;
}

function getEmulatorViewRenderer() {
    if (!emulatorViewRenderer) {
        emulatorViewRenderer = createEmulatorViewRenderer({
            i18n,
            escapeHtml,
            getEmulatorKey,
            showEmulatorDetails: (emulator, options) => showEmulatorDetails(emulator, options),
            emulatorTypeTabs: EMULATOR_TYPE_TABS
        });
    }
    return emulatorViewRenderer;
}

function getGameCardElements() {
    if (!gameCardElements) {
        gameCardElements = createGameCardElements({
            i18n,
            escapeHtml,
            getGameImagePath,
            lazyPlaceholderSrc: LAZY_PLACEHOLDER_SRC,
            launchGame: (game) => launchGame(game),
            showGameDetails: (game) => showGameDetails(game)
        });
    }
    return gameCardElements;
}

function getMissingGameRecoveryActions() {
    if (!missingGameRecoveryActions) {
        missingGameRecoveryActions = createMissingGameRecoveryActions({
            emubro,
            i18n,
            escapeHtml,
            reloadGamesFromMainAndRender,
            buildLaunchPayload: (gameId) => buildLaunchPayloadForGameId(gameId),
            alertUser: (message) => alert(message)
        });
    }
    return missingGameRecoveryActions;
}

function initializeLazyGameImages(root) {
    getLazyGameImageActions().initialize(root);
}

function cleanupLazyGameImages(root) {
    try {
        getLazyGameImageActions().cleanup?.(root);
    } catch (_error) {}
}

function clearGamesLoadObserver() {
    if (gamesLoadObserver) {
        try {
            gamesLoadObserver.disconnect();
        } catch (_e) {}
        gamesLoadObserver = null;
    }
    if (typeof gamesScrollDetach === 'function') {
        try {
            gamesScrollDetach();
        } catch (_e) {}
    }
    gamesScrollDetach = null;
    try {
        getLazyGameImageActions().reset?.();
    } catch (_e) {}
}

function getGameImagePath(game) {
    let gameImageToUse = game?.image;
    const platformShortName = String(game?.platformShortName || 'unknown').toLowerCase();
    if (!gameImageToUse) {
        gameImageToUse = `emubro-resources/platforms/${platformShortName}/covers/default.jpg`;
    }
    return gameImageToUse;
}

function buildViewGamePool(sourceGames, maxSize) {
    const source = Array.isArray(sourceGames) ? sourceGames : [];
    const cap = Number(maxSize) > 0 ? Number(maxSize) : source.length;
    if (source.length <= cap) return source;

    const sampled = [];
    const step = source.length / cap;
    for (let i = 0; i < cap; i++) {
        const idx = Math.min(source.length - 1, Math.floor(i * step));
        sampled.push(source[idx]);
    }
    return sampled;
}

export function getGames() { return games; }
function dispatchGamesUpdated(reason = 'updated') {
    try {
        window.dispatchEvent(new CustomEvent('emubro:games-updated', {
            detail: {
                reason: String(reason || 'updated'),
                totalGames: Array.isArray(games) ? games.length : 0
            }
        }));
    } catch (_error) {}
}
export function setGames(val) {
    games = Array.isArray(val) ? val : [];
    dispatchGamesUpdated('set-games');
}
export function getFilteredGames() { return filteredGames; }
export function setFilteredGames(val) { filteredGames = val; }
export function getEmulators() { return emulators; }
export function setEmulators(val) { emulators = Array.isArray(val) ? val : []; }

export async function fetchEmulators() {
    try {
        const rows = await emubro.invoke('get-emulators');
        setEmulators(rows);
    } catch (error) {
        log.error('Failed to fetch emulators:', error);
        setEmulators([]);
    }
    return emulators;
}

export function renderGames(gamesToRender) {
    const gamesContainer = document.getElementById('games-container');
    if (!gamesContainer) return;

    const activeViewBtn = document.querySelector('.view-btn.active');
    const activeView = activeViewBtn ? activeViewBtn.dataset.view : 'cover';
    const now = Date.now();
    const signature = buildGamesRenderSignature(gamesToRender, activeView);
    if (signature === lastRenderSignature && (now - lastRenderAt) < 220) {
        return;
    }
    lastRenderSignature = signature;
    lastRenderAt = now;

    clearGamesLoadObserver();
    gamesRenderToken += 1;

    gamesContainer.className = `games-container ${activeView}-view`;

    cleanupLazyGameImages(gamesContainer);
    gamesContainer.innerHTML = '';
    
    if (gamesToRender.length === 0) {
        gamesContainer.innerHTML = `<p>${i18n.t('gameGrid.noGamesFound')}</p>`;
        return;
    }

    if (activeView === 'slideshow') {
        renderGamesAsSlideshow(gamesToRender);
        return;
    } else if (activeView === 'random') {
        renderGamesAsRandom(gamesToRender);
        return;
    } else if (currentGroupBy !== 'none') {
        renderGamesGroupedAccordion(gamesToRender, activeView);
    } else {
        renderGamesIncremental(gamesToRender, activeView);
    }

    initializeLazyGameImages(gamesContainer);
}

export function renderEmulators(emulatorsToRender = emulators, options = {}) {
    getEmulatorViewRenderer().renderEmulators(emulatorsToRender, options);
}

function normalizeEmulatorDownloadLinks(raw) {
    return normalizeEmulatorDownloadLinksUtil(raw);
}

function hasAnyDownloadLink(emulator) {
    return hasAnyDownloadLinkUtil(emulator);
}

async function launchEmulatorAction(emulator) {
    return getEmulatorRuntimeActions().launchEmulatorAction(emulator);
}

async function openEmulatorInExplorerAction(emulator) {
    return getEmulatorRuntimeActions().openEmulatorInExplorerAction(emulator);
}

async function openEmulatorWebsiteAction(emulator) {
    return getEmulatorRuntimeActions().openEmulatorWebsiteAction(emulator);
}

function getDownloadedEmulatorPackagePath(emulator) {
    return getEmulatorDownloadActions().getDownloadedPackagePath(emulator);
}

async function openDownloadedPackageInExplorerAction(emulator) {
    const packagePath = getDownloadedEmulatorPackagePath(emulator);
    if (!packagePath) {
        alert('No downloaded setup file found yet.');
        return false;
    }
    return getEmulatorRuntimeActions().openPathInExplorerAction(packagePath, 'Downloaded setup file was not found.');
}

async function openEmulatorDownloadLinkAction(emulator, osKey = '') {
    return getEmulatorRuntimeActions().openEmulatorDownloadLinkAction(emulator, osKey);
}

async function downloadAndInstallEmulatorAction(emulator) {
    return getEmulatorDownloadActions().downloadAndInstallEmulatorAction(emulator);
}

function getEmulatorKey(emulator) {
    return getEmulatorConfigActions().getEmulatorKey(emulator);
}

function getEmulatorConfig(emulator) {
    return getEmulatorConfigActions().getEmulatorConfig(emulator);
}

function normalizeRuntimeRuleValueList(values = []) {
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

function normalizeRuntimeDataRulesForLaunch(input = {}) {
    const source = (input && typeof input === 'object') ? input : {};
    return {
        directoryNames: normalizeRuntimeRuleValueList(source.directoryNames),
        fileExtensions: normalizeRuntimeExtensionList(source.fileExtensions),
        fileNameIncludes: normalizeRuntimeRuleValueList(source.fileNameIncludes)
    };
}

function getGameById(gameId) {
    const targetId = Number(gameId || 0);
    if (!targetId) return null;
    return (Array.isArray(games) ? games : []).find((row) => Number(row?.id || 0) === targetId) || null;
}

function resolveEmulatorForGame(game) {
    const rows = Array.isArray(emulators) ? emulators : [];
    if (!game || rows.length === 0) return null;

    const overridePath = String(game?.emulatorOverridePath || '').trim().toLowerCase();
    if (overridePath) {
        const directMatch = rows.find((emu) => String(emu?.filePath || '').trim().toLowerCase() === overridePath);
        if (directMatch) return directMatch;
    }

    const platformShortName = String(game?.platformShortName || '').trim().toLowerCase();
    if (!platformShortName) return null;
    return rows.find((emu) => String(emu?.platformShortName || '').trim().toLowerCase() === platformShortName) || null;
}

function buildLaunchPayloadForGameId(gameId) {
    const targetId = Number(gameId || 0);
    if (!targetId) return 0;
    const game = getGameById(targetId);
    if (!game) return targetId;

    const emulator = resolveEmulatorForGame(game);
    if (!emulator) return targetId;
    const config = getEmulatorConfig(emulator);
    const runtimeDataRules = normalizeRuntimeDataRulesForLaunch(config?.runtimeDataRules || {});
    return {
        gameId: targetId,
        runtimeDataRules
    };
}

async function openEmulatorConfigEditor(emulator) {
    return getEmulatorConfigActions().openEmulatorConfigEditor(emulator);
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function stripBracketedTitleParts(value) {
    let text = String(value || '').trim();
    if (!text) return '';
    let previous = '';
    while (previous !== text) {
        previous = text;
        text = text.replace(/\s*[\(\[\{][^()\[\]{}]*[\)\]\}]\s*/g, ' ');
    }
    return text.replace(/\s+/g, ' ').trim();
}

function normalizeNameKey(value) {
    return stripBracketedTitleParts(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function getGameCompanyValue(game) {
    const raw = game?.company || game?.publisher || game?.developer || game?.studio || game?.manufacturer;
    const text = String(raw || '').trim();
    return text || 'Unknown';
}

function normalizeGroupByValue(value) {
    const key = String(value || '').trim().toLowerCase();
    if (key === 'platform' || key === 'company') return key;
    return 'none';
}

function normalizeLanguageFilterValue(value) {
    const key = String(value || '').trim().toLowerCase();
    if (
        key === 'en'
        || key === 'de'
        || key === 'fr'
        || key === 'es'
        || key === 'it'
        || key === 'jp'
        || key === 'pt'
        || key === 'nl'
        || key === 'sv'
        || key === 'no'
        || key === 'da'
        || key === 'fi'
        || key === 'pl'
        || key === 'ru'
        || key === 'tr'
        || key === 'cs'
        || key === 'hu'
        || key === 'ko'
        || key === 'zh'
    ) {
        return key;
    }
    return 'all';
}

function normalizeRegionFilterValue(value) {
    const key = String(value || '').trim().toLowerCase();
    if (key === 'eu' || key === 'us' || key === 'jp') return key;
    return 'all';
}

function getBracketedNameSegments(value) {
    const text = String(value || '');
    if (!text) return [];
    const segments = [];
    const regex = /[\(\[\{]([^()\[\]{}]+)[\)\]\}]/g;
    let match = null;
    while ((match = regex.exec(text)) !== null) {
        const segment = String(match[1] || '').trim();
        if (segment) segments.push(segment);
    }
    return segments;
}

const LANGUAGE_TOKEN_TO_CODE = new Map([
    ['english', 'en'],
    ['eng', 'en'],
    ['en', 'en'],
    ['german', 'de'],
    ['deutsch', 'de'],
    ['ger', 'de'],
    ['deu', 'de'],
    ['de', 'de'],
    ['french', 'fr'],
    ['fra', 'fr'],
    ['fre', 'fr'],
    ['francais', 'fr'],
    ['fr', 'fr'],
    ['spanish', 'es'],
    ['espanol', 'es'],
    ['spa', 'es'],
    ['esp', 'es'],
    ['es', 'es'],
    ['italian', 'it'],
    ['ita', 'it'],
    ['it', 'it'],
    ['japanese', 'jp'],
    ['jpn', 'jp'],
    ['jp', 'jp'],
    ['ja', 'jp'],
    ['portuguese', 'pt'],
    ['por', 'pt'],
    ['pt', 'pt'],
    ['dutch', 'nl'],
    ['nederlands', 'nl'],
    ['nld', 'nl'],
    ['nl', 'nl'],
    ['swedish', 'sv'],
    ['svenska', 'sv'],
    ['swe', 'sv'],
    ['sv', 'sv'],
    ['norwegian', 'no'],
    ['norsk', 'no'],
    ['nor', 'no'],
    ['no', 'no'],
    ['danish', 'da'],
    ['dansk', 'da'],
    ['dan', 'da'],
    ['da', 'da'],
    ['finnish', 'fi'],
    ['suomi', 'fi'],
    ['fin', 'fi'],
    ['fi', 'fi'],
    ['polish', 'pl'],
    ['polski', 'pl'],
    ['pol', 'pl'],
    ['pl', 'pl'],
    ['russian', 'ru'],
    ['russkiy', 'ru'],
    ['rus', 'ru'],
    ['ru', 'ru'],
    ['turkish', 'tr'],
    ['turkce', 'tr'],
    ['tur', 'tr'],
    ['tr', 'tr'],
    ['czech', 'cs'],
    ['cesky', 'cs'],
    ['cze', 'cs'],
    ['ces', 'cs'],
    ['cs', 'cs'],
    ['hungarian', 'hu'],
    ['magyar', 'hu'],
    ['hun', 'hu'],
    ['hu', 'hu'],
    ['korean', 'ko'],
    ['kor', 'ko'],
    ['ko', 'ko'],
    ['chinese', 'zh'],
    ['chi', 'zh'],
    ['zho', 'zh'],
    ['zh', 'zh'],
    ['cn', 'zh']
]);

function getLanguageCodesFromNameBrackets(game) {
    const segments = getBracketedNameSegments(game?.name);
    const out = new Set();
    segments.forEach((segment) => {
        const normalized = String(segment || '')
            .toLowerCase()
            .replace(/[-_/|,;+&]+/g, ' ')
            .replace(/[^a-z0-9\s]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        if (!normalized) return;
        normalized.split(' ').forEach((token) => {
            const code = LANGUAGE_TOKEN_TO_CODE.get(token);
            if (code) out.add(code);
        });
    });
    return out;
}

const REGION_PREFIX_TO_CODE = new Map([
    ['SLES', 'eu'],
    ['SCES', 'eu'],
    ['BLES', 'eu'],
    ['BCES', 'eu'],
    ['NPEB', 'eu'],
    ['NLES', 'eu'],
    ['ULES', 'eu'],
    ['SLUS', 'us'],
    ['SCUS', 'us'],
    ['BLUS', 'us'],
    ['BCUS', 'us'],
    ['NPUB', 'us'],
    ['NPUA', 'us'],
    ['ULUS', 'us'],
    ['SLPS', 'jp'],
    ['SCPS', 'jp'],
    ['BLJS', 'jp'],
    ['BCJS', 'jp'],
    ['NPJB', 'jp'],
    ['ULJM', 'jp'],
    ['SLPM', 'jp']
]);

function inferGameCodeForRegion(game) {
    const direct = game?.code || game?.productCode || game?.serial || game?.gameCode;
    if (direct) return String(direct).trim();

    const fileName = String(game?.filePath || '').trim().split(/[/\\]/).pop() || '';
    const hay = `${String(game?.name || '')} ${fileName}`.toUpperCase();
    const match = hay.match(/\b([A-Z]{4})[-_ ]?(\d{3})[.\-_ ]?(\d{2})\b|\b([A-Z]{4})[-_ ]?(\d{5})\b/);
    if (!match) return '';
    if (match[1] && match[2] && match[3]) return `${match[1]}-${match[2]}${match[3]}`;
    if (match[4] && match[5]) return `${match[4]}-${match[5]}`;
    return '';
}

function getRegionCodeFromGame(game) {
    const code = inferGameCodeForRegion(game);
    if (code) {
        const letters = String(code).toUpperCase().replace(/[^A-Z]/g, '');
        const prefix = letters.slice(0, 4);
        const mapped = REGION_PREFIX_TO_CODE.get(prefix);
        if (mapped) return mapped;
    }

    const segments = getBracketedNameSegments(game?.name);
    for (const segment of segments) {
        const normalized = String(segment || '')
            .toLowerCase()
            .replace(/[_/|,;+&-]+/g, ' ')
            .replace(/[^a-z0-9\s]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (!normalized) continue;
        if (normalized === 'e' || normalized === 'eu') return 'eu';
        if (normalized === 'u' || normalized === 'us' || normalized === 'usa') return 'us';
        if (normalized === 'j' || normalized === 'jp') return 'jp';
        if (/\b(europe|eur|eu|pal)\b/.test(normalized)) return 'eu';
        if (/\b(usa|us|north america|na|ntsc u|ntscu)\b/.test(normalized)) return 'us';
        if (/\b(japan|jpn|jp|ntsc j|ntscj)\b/.test(normalized)) return 'jp';
    }

    return '';
}

function getGroupValueForGame(game, groupBy) {
    if (groupBy === 'platform') return String(game?.platform || game?.platformShortName || 'Unknown').trim() || 'Unknown';
    if (groupBy === 'company') return getGameCompanyValue(game);
    return '';
}

function compareGamesBySort(a, b, sortMode, direction = 'asc') {
    const sort = String(sortMode || 'name').trim().toLowerCase();
    const dir = direction === 'desc' ? -1 : 1;
    let val = 0;

    switch (sort) {
        case 'rating':
            val = Number(a?.rating || 0) - Number(b?.rating || 0);
            break;
        case 'price':
            val = Number(a?.price || 0) - Number(b?.price || 0);
            break;
        case 'platform':
            val = String(a?.platform || a?.platformShortName || 'Unknown')
                .localeCompare(String(b?.platform || b?.platformShortName || 'Unknown'));
            break;
        case 'genre':
            val = String(a?.genre || 'Unknown').localeCompare(String(b?.genre || 'Unknown'));
            break;
        case 'status':
            val = Number(!!a?.isInstalled) - Number(!!b?.isInstalled);
            break;
        default:
            val = String(a?.name || '').localeCompare(String(b?.name || ''));
    }
    return val * dir;
}

function groupRowsBySameNames(rows) {
    const source = Array.isArray(rows) ? rows : [];
    const groupedMap = new Map();
    const order = [];

    source.forEach((game) => {
        const normalizedName = normalizeNameKey(game?.name || '');
        const platformShort = String(game?.platformShortName || '').trim().toLowerCase();
        const groupKey = `${normalizedName || String(game?.name || '').toLowerCase()}::${platformShort}`;
        if (!groupedMap.has(groupKey)) {
            groupedMap.set(groupKey, []);
            order.push(groupKey);
        }
        groupedMap.get(groupKey).push(game);
    });

    return order.map((groupKey) => {
        const members = groupedMap.get(groupKey) || [];
        const base = members[0] || {};
        const cleanName = stripBracketedTitleParts(base?.name || '') || String(base?.name || '');
        const mergedTags = new Set();
        members.forEach((row) => {
            (Array.isArray(row?.tags) ? row.tags : []).forEach((tag) => {
                const normalized = String(tag || '').trim().toLowerCase();
                if (normalized) mergedTags.add(normalized);
            });
        });
        const representative = {
            ...base,
            __groupDisplayName: cleanName || String(base?.name || ''),
            __groupCount: members.length,
            tags: Array.from(mergedTags),
            isInstalled: members.some((row) => !!row?.isInstalled),
            __groupMembers: members.map((row) => ({
                id: Number(row?.id || 0),
                name: String(row?.name || ''),
                filePath: String(row?.filePath || ''),
                platform: String(row?.platform || ''),
                platformShortName: String(row?.platformShortName || '')
            }))
        };
        return representative;
    });
}

function normalizeLaunchCandidateMember(row = {}) {
    return {
        id: Number(row?.id || 0),
        name: String(row?.name || '').trim(),
        filePath: String(row?.filePath || '').trim(),
        platform: String(row?.platform || '').trim(),
        platformShortName: String(row?.platformShortName || '').trim().toLowerCase()
    };
}

function dedupeLaunchCandidateMembers(rows = []) {
    const out = [];
    const seen = new Set();
    (Array.isArray(rows) ? rows : []).forEach((row) => {
        const candidate = normalizeLaunchCandidateMember(row);
        if (!candidate.id) return;
        if (seen.has(candidate.id)) return;
        seen.add(candidate.id);
        out.push(candidate);
    });
    return out;
}

function getLaunchCandidatesForGame(game) {
    if (!game || typeof game !== 'object') return [];

    const directMembers = dedupeLaunchCandidateMembers(game?.__groupMembers);
    if (directMembers.length > 1) return directMembers;

    const normalizedName = normalizeNameKey(game?.__groupDisplayName || game?.name || '');
    const platformShort = String(game?.platformShortName || '').trim().toLowerCase();
    if (!normalizedName || !platformShort) return directMembers;

    const fromLibrary = dedupeLaunchCandidateMembers(
        (Array.isArray(games) ? games : []).filter((row) => {
            if (!row || Number(row?.id || 0) <= 0) return false;
            const rowName = normalizeNameKey(row?.name || '');
            const rowPlatform = String(row?.platformShortName || '').trim().toLowerCase();
            return rowName === normalizedName && rowPlatform === platformShort;
        })
    );

    if (fromLibrary.length > 1) return fromLibrary;
    return directMembers;
}

function showGroupedLaunchPicker(game, candidates) {
    return new Promise((resolve) => {
        const title = String(game?.__groupDisplayName || game?.name || 'Game').trim() || 'Game';
        const rows = dedupeLaunchCandidateMembers(candidates);
        if (rows.length <= 1) {
            resolve(Number(rows[0]?.id || game?.id || 0) || 0);
            return;
        }

        const overlay = document.createElement('div');
        overlay.style.cssText = [
            'position:fixed',
            'inset:0',
            'z-index:4100',
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'padding:18px',
            'background:rgba(0,0,0,0.56)'
        ].join(';');

        const modal = document.createElement('div');
        modal.className = 'glass';
        modal.style.cssText = [
            'width:min(760px,100%)',
            'max-height:min(78vh,640px)',
            'overflow:auto',
            'border:1px solid var(--border-color)',
            'border-radius:14px',
            'background:var(--bg-secondary)',
            'padding:16px',
            'box-shadow:0 16px 34px rgba(0,0,0,0.42)'
        ].join(';');

        const rowsMarkup = rows.map((member, idx) => {
            const fileName = String(member?.filePath || '').trim().split(/[/\\]/).pop() || 'Unknown file';
            const platformLabel = member?.platform || member?.platformShortName || '';
            return `
                <button type="button" data-launch-candidate-id="${member.id}" style="display:flex;justify-content:space-between;align-items:center;width:100%;text-align:left;border:1px solid var(--border-color);border-radius:10px;background:var(--bg-primary);padding:10px 12px;cursor:pointer;">
                    <span>
                        <strong>${escapeHtml(member?.name || `File ${idx + 1}`)}</strong>
                        <span style="display:block;font-size:0.82rem;color:var(--text-secondary);">${escapeHtml(fileName)}</span>
                    </span>
                    <span style="font-size:0.78rem;color:var(--text-secondary);">${escapeHtml(platformLabel)}</span>
                </button>
            `;
        }).join('');

        modal.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
                <h3 style="margin:0;font-size:1.06rem;">Choose file to launch</h3>
                <button type="button" class="close-btn" aria-label="Close">&times;</button>
            </div>
            <p style="margin:10px 0 12px 0;color:var(--text-secondary);">
                "${escapeHtml(title)}" has multiple launch files. Select which one to start:
            </p>
            <div style="display:grid;gap:8px;">
                ${rowsMarkup}
            </div>
            <div style="display:flex;justify-content:flex-end;margin-top:12px;">
                <button type="button" class="action-btn" data-launch-cancel>Cancel</button>
            </div>
        `;

        const close = (value = 0) => {
            document.removeEventListener('keydown', onKeyDown, true);
            overlay.remove();
            resolve(Number(value || 0) || 0);
        };

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                close(0);
            }
        };

        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) close(0);
        });

        modal.querySelector('.close-btn')?.addEventListener('click', () => close(0));
        modal.querySelector('[data-launch-cancel]')?.addEventListener('click', () => close(0));
        modal.querySelectorAll('[data-launch-candidate-id]').forEach((button) => {
            button.addEventListener('click', () => {
                close(Number(button.getAttribute('data-launch-candidate-id') || 0));
            });
        });

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        document.addEventListener('keydown', onKeyDown, true);
    });
}

async function promptGroupedLaunchTarget(game, candidates = null) {
    const members = Array.isArray(candidates) ? dedupeLaunchCandidateMembers(candidates) : getLaunchCandidatesForGame(game);
    if (members.length <= 1) {
        return Number(game?.id || members[0]?.id || 0) || 0;
    }
    return showGroupedLaunchPicker(game, members);
}

export function createGameCard(game) {
    return getGameCardElements().createGameCard(game);
}

function normalizeSearchScope(scope) {
    const value = String(scope || '').trim().toLowerCase();
    if (value === 'games' || value === 'emulators' || value === 'both') return value;
    return 'both';
}

export async function searchForGamesAndEmulators(scanTargets = [], options = {}) {
    const searchBtn = document.getElementById('search-games-btn');
    const normalizedScope = normalizeSearchScope(options?.scope);
    if (searchBtn) {
        searchBtn.disabled = true;
        searchBtn.textContent = 'Searching...';
    }
    
    try {
        const rawTargets = Array.isArray(scanTargets) ? scanTargets : [];
        const targets = rawTargets
            .map((v) => String(v || '').trim())
            .filter(Boolean);
        const dedupedTargets = Array.from(new Set(targets.map((v) => v.toLowerCase())))
            .map((key) => targets.find((t) => t.toLowerCase() === key))
            .filter(Boolean);

        // Keep previous behavior when no target is explicitly provided.
        if (dedupedTargets.length === 0) dedupedTargets.push('');

        let totalFoundGames = 0;
        let totalFoundEmulators = 0;
        const foundGamePaths = [];
        const foundEmulatorPaths = [];
        const foundArchives = [];
        const foundSetupFiles = [];
        let anySuccess = false;

        for (const target of dedupedTargets) {
            const result = await emubro.invoke('browse-games-and-emus', target, { scope: normalizedScope });
            if (!result?.success) continue;
            anySuccess = true;
            const gamesFound = Array.isArray(result.games) ? result.games : [];
            const emulatorsFound = Array.isArray(result.emulators) ? result.emulators : [];
            totalFoundGames += gamesFound.length;
            totalFoundEmulators += emulatorsFound.length;
            gamesFound.forEach((game) => {
                const filePath = String(game?.filePath || '').trim();
                if (filePath) foundGamePaths.push(filePath);
            });
            emulatorsFound.forEach((emu) => {
                const filePath = String(emu?.filePath || '').trim();
                if (filePath) foundEmulatorPaths.push(filePath);
            });
            (Array.isArray(result.archives) ? result.archives : []).forEach((archivePath) => {
                const filePath = String(archivePath || '').trim();
                if (filePath) foundArchives.push(filePath);
            });
            (Array.isArray(result.setupFiles) ? result.setupFiles : []).forEach((setupPath) => {
                const filePath = String(setupPath || '').trim();
                if (filePath) foundSetupFiles.push(filePath);
            });
        }

        if (anySuccess) {
            const updatedGames = await emubro.invoke('get-games');
            setGames(updatedGames);
            setFilteredGames([...updatedGames]);
            renderGames(getFilteredGames());
            initializePlatformFilterOptions();
            alert(`Found ${totalFoundGames} games and ${totalFoundEmulators} emulators.`);
        }

        return {
            success: anySuccess,
            scope: normalizedScope,
            scanTargets: dedupedTargets,
            totalFoundGames,
            totalFoundEmulators,
            foundGamePaths,
            foundEmulatorPaths,
            foundArchives: Array.from(new Set(foundArchives.map((entry) => entry.toLowerCase()))).map((key) => foundArchives.find((entry) => entry.toLowerCase() === key)).filter(Boolean),
            foundSetupFiles: Array.from(new Set(foundSetupFiles.map((entry) => entry.toLowerCase()))).map((key) => foundSetupFiles.find((entry) => entry.toLowerCase() === key)).filter(Boolean)
        };
    } catch (error) {
        log.error('Search failed:', error);
        return {
            success: false,
            scope: normalizedScope,
            scanTargets: [],
            totalFoundGames: 0,
            totalFoundEmulators: 0,
            foundGamePaths: [],
            foundEmulatorPaths: [],
            foundArchives: [],
            foundSetupFiles: [],
            error: error?.message || String(error)
        };
    } finally {
        if (searchBtn) {
            searchBtn.disabled = false;
            searchBtn.textContent = 'Search Games';
        }
    }
}

export async function handleGameAction(event) {
    const button = event.currentTarget;
    const gameId = parseInt(button.dataset.gameId);
    const action = button.dataset.action;
    
    try {
        switch (action) {
            case 'uninstall':
            case 'remove':
                await removeGame(gameId);
                break;
            case 'launch':
                await launchGame(gameId);
                break;
        }
    } catch (error) {
        log.error(`Failed to ${action} game ${gameId}:`, error);
        alert(i18n.t('messages.failedToAction', { action: action }));
    }
}

async function removeGame(gameId) {
    const result = await emubro.invoke('remove-game', gameId);
    if (result.success) {
        await reloadGamesFromMainAndRender();
        alert(result.message || 'Game removed from library.');
    } else {
        alert(i18n.tf('messages.removalFailed', { message: result.message }));
    }
}

async function reloadGamesFromMainAndRender() {
    const updatedGames = await emubro.invoke('get-games');
    setGames(updatedGames);

    applyFilters();
}

async function launchGame(gameOrId) {
    const gameRef = (typeof gameOrId === 'object' && gameOrId)
        ? gameOrId
        : getGameById(gameOrId);
    const candidates = gameRef ? getLaunchCandidatesForGame(gameRef) : [];

    let gameId = 0;
    if (candidates.length > 1) {
        gameId = await promptGroupedLaunchTarget(gameRef, candidates);
    } else if (gameRef && typeof gameRef === 'object') {
        gameId = Number(gameRef?.id || 0);
    } else {
        gameId = Number(gameOrId || 0);
    }

    if (!gameId) return { success: false, message: 'No game selected to launch.' };
    return getMissingGameRecoveryActions().launchGame(gameId);
}

export function applyFilters(shouldRender = true, sourceRows = null) {
    filteredGames = Array.isArray(sourceRows) ? [...sourceRows] : [...games];
    
    const platformFilter = document.getElementById('platform-filter');
    const sortFilter = document.getElementById('sort-filter');
    const groupFilter = document.getElementById('group-filter');
    const languageFilter = document.getElementById('game-language-filter');
    const regionFilter = document.getElementById('game-region-filter');
    const groupSameNamesToggle = document.getElementById('group-same-names-toggle');
    
    currentFilter = platformFilter ? platformFilter.value : 'all';
    currentGroupBy = normalizeGroupByValue(groupFilter ? groupFilter.value : 'none');
    // Only update currentSort from dropdown if it wasn't set by header click recently?
    // Actually, we should keep them in sync. If dropdown changes, reset dir to asc.
    // But how do we know if dropdown changed or we are re-rendering?
    // Let's assume dropdown is the source of truth unless overridden.
    // Better: update dropdown value when header is clicked.
    // For now, let's read from dropdown if it matches known values, but respect global state if custom column.
    const dropdownSort = sortFilter ? sortFilter.value : 'name';
    // If the dropdown value is different from currentSort, implies user changed dropdown.
    // But we need to be careful not to overwrite a custom sort like 'genre' which isn't in dropdown.
    // Let's rely on event listeners to set currentSort/currentSortDir.
    // Here we just use the variables.
    // But wait, initially applyFilters reads from dropdown.
    // If we want dropdown to control it, we need to know when it changed.
    // Let's stick to reading dropdown for standard sorts if currentSort is standard.
    if (['name', 'rating', 'price', 'platform'].includes(dropdownSort) && ['name', 'rating', 'price', 'platform'].includes(currentSort)) {
         // If dropdown changed, we might need to sync?
         // Let's keep it simple: the dropdown change event will trigger applyFilters, which reads the value.
         // But if we clicked a header, currentSort might be 'genre'. Dropdown might still be 'name'.
         // We should prioritize the variable if it was set explicitly.
    }
    // Actually, simple approach:
    // If the function is called from the dropdown event, we should use the dropdown value.
    // If called from header click, use the header value.
    // But applyFilters is called generically.
    // Let's make applyFilters rely on the global variables, and have the dropdown listener update the global variables.
    // But wait, the dropdown listener in renderer.js just calls applyFilters.
    // So applyFilters must read the dropdown.
    // Modify: if sortFilter value matches currentSort, use it. If not, use sortFilter value and reset dir?
    // This is tricky without knowing the source.
    // Let's change how applyFilters works: it shouldn't read DOM for sort if we want custom sorts.
    // We will update the renderer.js listener to update currentSort before calling applyFilters.
    currentLanguageFilter = normalizeLanguageFilterValue(languageFilter ? languageFilter.value : 'all');
    currentRegionFilter = normalizeRegionFilterValue(regionFilter ? regionFilter.value : 'all');
    groupSameNamesEnabled = !!groupSameNamesToggle?.checked;

    if (currentFilter !== 'all') {
        filteredGames = filteredGames.filter(game => game.platformShortName.toLowerCase() === currentFilter);
    }

    if (currentLanguageFilter !== 'all') {
        filteredGames = filteredGames.filter((game) => getLanguageCodesFromNameBrackets(game).has(currentLanguageFilter));
    }

    if (currentRegionFilter !== 'all') {
        filteredGames = filteredGames.filter((game) => getRegionCodeFromGame(game) === currentRegionFilter);
    }

    const searchTerm = String(document.querySelector('.search-bar input')?.value || '').trim().toLowerCase();
    if (searchTerm) {
        filteredGames = filteredGames.filter((game) => {
            const name = String(game?.name || '').toLowerCase();
            const platform = String(game?.platform || game?.platformShortName || '').toLowerCase();
            const company = getGameCompanyValue(game).toLowerCase();
            return name.includes(searchTerm) || platform.includes(searchTerm) || company.includes(searchTerm);
        });
    }

    filteredGames.sort((a, b) => {
        if (currentGroupBy !== 'none') {
            const aGroup = getGroupValueForGame(a, currentGroupBy);
            const bGroup = getGroupValueForGame(b, currentGroupBy);
            const groupCompare = aGroup.localeCompare(bGroup);
            if (groupCompare !== 0) return groupCompare;
        }
        const sortCompare = compareGamesBySort(a, b, currentSort, currentSortDir);
        if (sortCompare !== 0) return sortCompare;
        return String(a?.name || '').localeCompare(String(b?.name || ''));
    });

    if (groupSameNamesEnabled) {
        filteredGames = groupRowsBySameNames(filteredGames);
    }
    
    if (shouldRender) {
        renderGames(filteredGames);
    }
}

export function initializePlatformFilterOptions(sourceRows = games) {
    const platformFilter = document.getElementById('platform-filter');
    if (!platformFilter) return;

    const previousValue = String(platformFilter.value || 'all').toLowerCase();
    platformFilter.innerHTML = '<option value="all">All Platforms</option>';

    const rows = Array.isArray(sourceRows) ? sourceRows : [];
    const platformMap = new Map();
    rows.forEach((row) => {
        const shortName = String(row?.platformShortName || '').trim().toLowerCase();
        if (!shortName) return;
        if (platformMap.has(shortName)) return;

        const displayName = String(row?.platform || '').trim();
        platformMap.set(shortName, displayName || (shortName.charAt(0).toUpperCase() + shortName.slice(1)));
    });

    [...platformMap.keys()].sort((a, b) => a.localeCompare(b)).forEach((platform) => {
        const option = document.createElement('option');
        option.value = String(platform).toLowerCase();
        option.textContent = String(platformMap.get(platform) || platform);
        platformFilter.appendChild(option);
    });

    const hasPrevious = Array.from(platformFilter.options).some((option) => option.value === previousValue);
    platformFilter.value = hasPrevious ? previousValue : 'all';
}

export function addPlatformFilterOption(platformShortName) {
    const platformFilter = document.getElementById('platform-filter');
    if (!platformFilter) return;

    const exists = Array.from(platformFilter.options).some(option => option.value === platformShortName.toLowerCase());
    if (!exists) {
        const option = document.createElement('option');
        option.value = platformShortName.toLowerCase();
        option.textContent = platformShortName.charAt(0).toUpperCase() + platformShortName.slice(1);
        platformFilter.appendChild(option);
    }
}

function createGameTableRow(game) {
    return getGameCardElements().createGameTableRow(game);
}

function createGameListItem(game) {
    return getGameCardElements().createGameListItem(game);
}

function getAccordionGroupRows(rows = [], groupBy = 'none') {
    const source = Array.isArray(rows) ? rows : [];
    const mode = normalizeGroupByValue(groupBy);
    if (mode === 'none') return [];

    const grouped = new Map();
    const order = [];
    source.forEach((game) => {
        const label = String(getGroupValueForGame(game, mode) || 'Unknown').trim() || 'Unknown';
        const key = label.toLowerCase();
        if (!grouped.has(key)) {
            grouped.set(key, { label, rows: [] });
            order.push(key);
        }
        grouped.get(key).rows.push(game);
    });
    return order.map((key) => grouped.get(key)).filter(Boolean);
}

function getAccordionStateKey(view, label) {
    return `${String(view || 'cover').toLowerCase()}::${String(currentGroupBy || 'none').toLowerCase()}::${String(label || 'unknown').toLowerCase()}`;
}

function renderGamesGroupedAccordion(gamesToRender, activeView = 'cover') {
    const gamesContainer = document.getElementById('games-container');
    if (!gamesContainer) return;

    const view = (activeView === 'list' || activeView === 'table') ? activeView : 'cover';
    const groups = getAccordionGroupRows(gamesToRender, currentGroupBy);
    const scrollRoot = document.querySelector('.game-scroll-body') || gamesContainer.parentElement || null;
    const groupBatchSize = Math.max(12, Math.floor((GAMES_BATCH_SIZE[view] || GAMES_BATCH_SIZE.cover) * 0.35));
    const groupLoadObservers = [];

    if (!groups.length) {
        gamesContainer.innerHTML = `<p>${i18n.t('gameGrid.noGamesFound')}</p>`;
        return;
    }

    const setupGroupLazyLoader = (sentinelEl, loadMore, isExpandedRef) => {
        if (!sentinelEl || typeof loadMore !== 'function') return;
        if (!scrollRoot || typeof IntersectionObserver === 'undefined') {
            // Fallback: load everything when observer support/root is unavailable.
            while (loadMore()) {}
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                if (!isExpandedRef()) return;
                let guard = 0;
                while (guard < 2 && loadMore()) {
                    guard += 1;
                }
                if (!loadMore()) {
                    observer.disconnect();
                }
            });
        }, {
            root: scrollRoot,
            rootMargin: '420px 0px',
            threshold: 0.01
        });

        observer.observe(sentinelEl);
        groupLoadObservers.push(observer);
    };

    groups.forEach((group) => {
        const section = document.createElement('section');
        section.className = `games-group-accordion games-group-accordion-${view}`;

        const header = document.createElement('button');
        header.type = 'button';
        header.className = 'games-group-header';

        const title = document.createElement('span');
        title.className = 'games-group-header-title';
        title.textContent = String(group.label || 'Unknown');

        const count = document.createElement('span');
        count.className = 'games-group-header-count';
        count.textContent = `${Array.isArray(group.rows) ? group.rows.length : 0}`;

        const chevron = document.createElement('span');
        chevron.className = 'games-group-header-chevron';
        chevron.setAttribute('aria-hidden', 'true');

        header.appendChild(title);
        header.appendChild(count);
        header.appendChild(chevron);

        const content = document.createElement('div');
        content.className = `games-group-content games-group-content-${view}`;
        const rows = Array.isArray(group.rows) ? group.rows : [];
        let renderedCount = 0;

        const renderBatch = () => {
            if (renderedCount >= rows.length) return false;
            const nextCount = Math.min(rows.length, renderedCount + groupBatchSize);
            const slice = rows.slice(renderedCount, nextCount);
            if (!slice.length) return false;

            if (view === 'table') {
                const tbody = content.querySelector('tbody');
                if (!tbody) return false;
                slice.forEach((game) => {
                    tbody.appendChild(createGameTableRow(game));
                });
                initializeLazyGameImages(tbody);
            } else if (view === 'list') {
                const list = content.querySelector('.games-group-list');
                if (!list) return false;
                slice.forEach((game) => {
                    list.appendChild(createGameListItem(game));
                });
                initializeLazyGameImages(list);
            } else {
                const grid = content.querySelector('.games-group-grid');
                if (!grid) return false;
                slice.forEach((game) => {
                    grid.appendChild(createGameCard(game));
                });
                initializeLazyGameImages(grid);
            }

            renderedCount = nextCount;
            return renderedCount < rows.length;
        };

        if (view === 'table') {
            const table = document.createElement('table');
            table.className = 'games-table games-group-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Cover</th>
                        <th>Game</th>
                        <th>Genre</th>
                        <th>Rating</th>
                        <th>Platform</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            content.appendChild(table);
        } else if (view === 'list') {
            const list = document.createElement('div');
            list.className = 'games-group-list';
            content.appendChild(list);
        } else {
            const grid = document.createElement('div');
            grid.className = 'games-group-grid';
            content.appendChild(grid);
        }

        const sentinel = document.createElement('div');
        sentinel.className = 'games-group-sentinel';
        content.appendChild(sentinel);

        const stateKey = getAccordionStateKey(view, group.label);
        const expanded = groupAccordionState.has(stateKey) ? !!groupAccordionState.get(stateKey) : true;
        section.classList.toggle('is-collapsed', !expanded);
        header.setAttribute('aria-expanded', expanded ? 'true' : 'false');

        if (expanded) {
            renderBatch();
        }
        setupGroupLazyLoader(sentinel, renderBatch, () => header.getAttribute('aria-expanded') === 'true');

        header.addEventListener('click', () => {
            const isExpanded = header.getAttribute('aria-expanded') === 'true';
            const nextExpanded = !isExpanded;
            header.setAttribute('aria-expanded', nextExpanded ? 'true' : 'false');
            section.classList.toggle('is-collapsed', !nextExpanded);
            groupAccordionState.set(stateKey, nextExpanded);
            if (nextExpanded && renderedCount === 0) {
                renderBatch();
            }
        });

        section.appendChild(header);
        section.appendChild(content);
        gamesContainer.appendChild(section);
    });

    gamesScrollDetach = () => {
        groupLoadObservers.forEach((observer) => {
            try { observer.disconnect(); } catch (_error) {}
        });
    };
}

function renderGamesIncremental(gamesToRender, activeView = 'cover') {
    const gamesContainer = document.getElementById('games-container');
    if (!gamesContainer) return;

    const view = (activeView === 'list' || activeView === 'table') ? activeView : 'cover';
    const renderToken = gamesRenderToken;
    const resolveBatchSize = () => {
        const baseBatchSize = GAMES_BATCH_SIZE[view] || GAMES_BATCH_SIZE.cover;
        if (view !== 'cover') return baseBatchSize;

        const rootStyles = getComputedStyle(document.documentElement);
        const rawScale = Number.parseFloat(String(
            rootStyles.getPropertyValue('--view-scale-user')
            || rootStyles.getPropertyValue('--view-scale')
            || '1'
        ).trim());
        const scale = Number.isFinite(rawScale) && rawScale > 0 ? rawScale : 1;
        const minCardWidth = 250 * scale;
        const gap = 20 * scale;
        const containerWidth = Math.max(
            280,
            Number(gamesContainer.clientWidth || gamesContainer.getBoundingClientRect?.().width || 0)
        );
        const columns = Math.max(1, Math.floor((containerWidth + gap) / (minCardWidth + gap)));
        return Math.max(columns, Math.ceil(baseBatchSize / columns) * columns);
    };
    const batchSize = resolveBatchSize();
    const totalGames = Array.isArray(gamesToRender) ? gamesToRender.length : 0;
    const totalChunks = Math.ceil(totalGames / batchSize);
    const minChunksInDom = view === 'cover' ? 1 : 2;
    const hardMaxChunksInDom = view === 'cover' ? 2 : (view === 'table' ? 6 : 6);

    let mountTarget = null;
    let topSpacer = null;
    let bottomSpacer = null;

    if (view === 'table') {
        const table = document.createElement('table');
        table.className = 'games-table';
        
        const makeHeader = (label, key) => {
             const isSort = currentSort === key;
             const dirArrow = isSort ? (currentSortDir === 'asc' ? ' ↑' : ' ↓') : '';
             return `<th data-sort-key="${key}" style="cursor:pointer;user-select:none;">${label}${dirArrow}</th>`;
        };

        table.innerHTML = `
            <thead>
                <tr>
                    <th>Cover</th>
                    ${makeHeader('Game', 'name')}
                    ${makeHeader('Genre', 'genre')}
                    ${makeHeader('Rating', 'rating')}
                    ${makeHeader('Platform', 'platform')}
                    ${makeHeader('Status', 'status')}
                </tr>
            </thead>
            <tbody class="games-virtual-host-table"></tbody>
        `;
        
        table.querySelectorAll('th[data-sort-key]').forEach(th => {
            th.addEventListener('click', () => {
                const key = th.dataset.sortKey;
                if (currentSort === key) {
                    currentSortDir = currentSortDir === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSort = key;
                    currentSortDir = 'asc';
                }
                applyFilters();
            });
        });

        mountTarget = table.querySelector('tbody');
        topSpacer = document.createElement('tr');
        topSpacer.className = 'games-virtual-table-spacer';
        topSpacer.innerHTML = '<td colspan="6"></td>';
        bottomSpacer = document.createElement('tr');
        bottomSpacer.className = 'games-virtual-table-spacer';
        bottomSpacer.innerHTML = '<td colspan="6"></td>';
        mountTarget.appendChild(topSpacer);
        mountTarget.appendChild(bottomSpacer);
        gamesContainer.appendChild(table);
    } else {
        const host = document.createElement('div');
        host.className = `games-virtual-host games-virtual-host-${view}`;
        mountTarget = host;
        topSpacer = document.createElement('div');
        topSpacer.className = 'games-virtual-spacer';
        bottomSpacer = document.createElement('div');
        bottomSpacer.className = 'games-virtual-spacer';
        mountTarget.appendChild(topSpacer);
        mountTarget.appendChild(bottomSpacer);
        if (view === 'list') {
            host.classList.add('games-list');
        }
        gamesContainer.appendChild(host);
    }

    const showIndicator = localStorage.getItem('emuBro.showLoadIndicator') !== 'false';
    const indicator = document.createElement('div');
    indicator.className = 'games-load-indicator';
    if (showIndicator) {
        gamesContainer.appendChild(indicator);
    }
    let indicatorTimer = null;

    const setIndicator = (message, isComplete = false) => {
        if (!showIndicator) return;
        indicator.textContent = String(message || '');
        indicator.classList.toggle('is-complete', !!isComplete);
        indicator.classList.add('is-visible');
        if (indicatorTimer) window.clearTimeout(indicatorTimer);
        indicatorTimer = window.setTimeout(() => {
            indicator.classList.remove('is-visible');
        }, isComplete ? 2000 : 1300);
    };
    const isTableView = view === 'table';
    const renderedChunks = new Map();
    const chunkHeights = new Map();
    let topSpacerHeight = 0;
    let bottomSpacerHeight = 0;
    let loadedTop = 0;
    let loadedBottom = -1;
    let highestLoadedChunk = -1;
    let completedLoadIndicatorShown = false;

    const setSpacerHeight = (spacer, height) => {
        const value = Math.max(0, Number(height) || 0);
        if (!spacer) return;
        if (isTableView) {
            const cell = spacer.querySelector('td');
            if (cell) {
                cell.style.height = `${Math.round(value)}px`;
                cell.style.padding = '0';
                cell.style.border = 'none';
            }
            spacer.style.display = value > 0 ? 'table-row' : 'none';
        } else {
            spacer.style.height = `${Math.round(value)}px`;
            spacer.style.display = value > 0 ? 'block' : 'none';
        }
    };

    setSpacerHeight(topSpacer, 0);
    setSpacerHeight(bottomSpacer, 0);

    const getRenderedChunkCount = () => (loadedBottom >= loadedTop ? (loadedBottom - loadedTop + 1) : 0);
    const getAverageMeasuredChunkHeight = () => {
        const values = Array.from(chunkHeights.values()).filter((value) => Number(value) > 0);
        if (!values.length) return 0;
        return values.reduce((sum, value) => sum + Number(value), 0) / values.length;
    };
    const estimateTypicalChunkHeight = () => {
        const measuredAverage = getAverageMeasuredChunkHeight();
        if (measuredAverage > 0) return measuredAverage;
        return view === 'cover' ? 720 : (view === 'table' ? 640 : 560);
    };
    const getMaxChunksInDom = (viewportHeight = 0) => {
        const vp = Math.max(1, Number(viewportHeight) || 0);
        const estimatedHeight = Math.max(1, estimateTypicalChunkHeight());
        const visibleChunks = Math.max(1, Math.ceil(vp / estimatedHeight));
        const target = Math.max(1, Math.ceil(visibleChunks * 1.5));
        return Math.max(minChunksInDom, Math.min(hardMaxChunksInDom, target));
    };

    const getChunkSlice = (chunkIndex) => {
        const start = chunkIndex * batchSize;
        const end = Math.min(totalGames, start + batchSize);
        return gamesToRender.slice(start, end);
    };

    const createChunk = (chunkIndex) => {
        const rows = getChunkSlice(chunkIndex);
        if (rows.length === 0) return null;

        if (isTableView) {
            return {
                index: chunkIndex,
                rows: rows.map((game) => createGameTableRow(game))
            };
        }

        const chunkEl = document.createElement('div');
        chunkEl.className = `games-virtual-chunk games-virtual-chunk-${view}`;
        const fragment = document.createDocumentFragment();
        rows.forEach((game) => {
            if (view === 'list') {
                fragment.appendChild(createGameListItem(game));
            } else {
                fragment.appendChild(createGameCard(game));
            }
        });
        chunkEl.appendChild(fragment);
        return { index: chunkIndex, el: chunkEl };
    };

    const estimateChunkHeight = (chunk) => {
        if (!chunk) return 0;
        if (isTableView) {
            return (Array.isArray(chunk.rows) ? chunk.rows : []).reduce((sum, row) => {
                return sum + (row?.getBoundingClientRect?.().height || 0);
            }, 0);
        }
        return chunk.el?.getBoundingClientRect?.().height || 0;
    };

    const persistChunkHeight = (chunkIndex, chunk) => {
        const measured = estimateChunkHeight(chunk);
        const fallback = chunkHeights.get(chunkIndex) || 0;
        const height = measured > 0 ? measured : fallback;
        if (height > 0) {
            chunkHeights.set(chunkIndex, height);
        }
        return height;
    };

    const removeChunkNodes = (chunk) => {
        if (!chunk) return;
        if (isTableView) {
            (Array.isArray(chunk.rows) ? chunk.rows : []).forEach((row) => {
                cleanupLazyGameImages(row);
                row?.remove?.();
            });
            return;
        }
        cleanupLazyGameImages(chunk.el);
        chunk.el?.remove?.();
    };

    const insertChunkNodes = (chunk, atTop = false) => {
        if (!chunk) return;
        if (isTableView) {
            const anchor = atTop ? (topSpacer.nextSibling || bottomSpacer) : bottomSpacer;
            (Array.isArray(chunk.rows) ? chunk.rows : []).forEach((row) => {
                mountTarget.insertBefore(row, anchor);
            });
            initializeLazyGameImages(mountTarget);
            return;
        }

        const anchor = atTop ? (topSpacer.nextSibling || bottomSpacer) : bottomSpacer;
        mountTarget.insertBefore(chunk.el, anchor);
        initializeLazyGameImages(chunk.el);
    };

    const updateTopSpacer = (nextHeight) => {
        topSpacerHeight = Math.max(0, Number(nextHeight) || 0);
        setSpacerHeight(topSpacer, topSpacerHeight);
    };

    const updateBottomSpacer = (nextHeight) => {
        bottomSpacerHeight = Math.max(0, Number(nextHeight) || 0);
        setSpacerHeight(bottomSpacer, bottomSpacerHeight);
    };

    const maybeShowProgress = () => {
        if (!showIndicator) return;
        const loadedGames = Math.min(totalGames, (highestLoadedChunk + 1) * batchSize);
        if (highestLoadedChunk >= totalChunks - 1) {
            if (!completedLoadIndicatorShown) {
                completedLoadIndicatorShown = true;
                setIndicator(`All ${totalGames} games loaded`, true);
                if (indicatorTimer) window.clearTimeout(indicatorTimer);
                window.setTimeout(() => indicator.remove(), 2200);
            }
            return;
        }
        const shouldShow = loadedGames >= (batchSize * 2);
        if (shouldShow) {
            setIndicator(`Loaded ${loadedGames} / ${totalGames}`);
        }
    };

    const insertChunkAtBottom = (chunkIndex) => {
        if (chunkIndex < 0 || chunkIndex >= totalChunks) return false;
        if (renderedChunks.has(chunkIndex)) return false;

        const existingHeight = chunkHeights.get(chunkIndex) || 0;
        if (existingHeight > 0 && bottomSpacerHeight > 0) {
            updateBottomSpacer(bottomSpacerHeight - existingHeight);
        }

        const chunk = createChunk(chunkIndex);
        if (!chunk) return false;
        insertChunkNodes(chunk, false);
        renderedChunks.set(chunkIndex, chunk);
        loadedBottom = chunkIndex;
        if (loadedTop > loadedBottom) loadedTop = loadedBottom;
        highestLoadedChunk = Math.max(highestLoadedChunk, chunkIndex);

        requestAnimationFrame(() => {
            if (renderToken !== gamesRenderToken) return;
            persistChunkHeight(chunkIndex, chunk);
        });

        return true;
    };

    const insertChunkAtTop = (chunkIndex) => {
        if (chunkIndex < 0 || chunkIndex >= totalChunks) return false;
        if (renderedChunks.has(chunkIndex)) return false;

        const existingHeight = chunkHeights.get(chunkIndex) || 0;
        if (existingHeight > 0 && topSpacerHeight > 0) {
            updateTopSpacer(topSpacerHeight - existingHeight);
        }

        const chunk = createChunk(chunkIndex);
        if (!chunk) return false;
        insertChunkNodes(chunk, true);
        renderedChunks.set(chunkIndex, chunk);
        loadedTop = chunkIndex;
        if (loadedBottom < loadedTop) loadedBottom = loadedTop;

        requestAnimationFrame(() => {
            if (renderToken !== gamesRenderToken) return;
            persistChunkHeight(chunkIndex, chunk);
        });

        return true;
    };

    const removeChunkFromTop = () => {
        if (getRenderedChunkCount() <= 0) return false;
        const chunkIndex = loadedTop;
        const chunk = renderedChunks.get(chunkIndex);
        if (!chunk) return false;
        const height = persistChunkHeight(chunkIndex, chunk);
        removeChunkNodes(chunk);
        renderedChunks.delete(chunkIndex);
        loadedTop += 1;
        updateTopSpacer(topSpacerHeight + height);
        return true;
    };

    const removeChunkFromBottom = () => {
        if (getRenderedChunkCount() <= 0) return false;
        const chunkIndex = loadedBottom;
        const chunk = renderedChunks.get(chunkIndex);
        if (!chunk) return false;
        const height = persistChunkHeight(chunkIndex, chunk);
        removeChunkNodes(chunk);
        renderedChunks.delete(chunkIndex);
        loadedBottom -= 1;
        updateBottomSpacer(bottomSpacerHeight + height);
        return true;
    };

    const getChunkHeightEstimateByIndex = (chunkIndex) => {
        const known = Number(chunkHeights.get(chunkIndex) || 0);
        if (known > 0) return known;
        return Math.max(1, estimateTypicalChunkHeight());
    };

    const sumChunkHeights = (startInclusive, endExclusive) => {
        const from = Math.max(0, Number(startInclusive) || 0);
        const to = Math.min(totalChunks, Math.max(from, Number(endExclusive) || 0));
        let sum = 0;
        for (let i = from; i < to; i += 1) {
            sum += getChunkHeightEstimateByIndex(i);
        }
        return Math.max(0, sum);
    };

    const clearRenderedWindow = () => {
        renderedChunks.forEach((chunk) => {
            removeChunkNodes(chunk);
        });
        renderedChunks.clear();
        loadedTop = 0;
        loadedBottom = -1;
    };

    const resetWindowToRange = (startIndex, endIndex) => {
        if (totalChunks <= 0) return;
        const safeStart = Math.max(0, Math.min(totalChunks - 1, Number(startIndex) || 0));
        const safeEnd = Math.max(safeStart, Math.min(totalChunks - 1, Number(endIndex) || safeStart));

        clearRenderedWindow();
        updateTopSpacer(sumChunkHeights(0, safeStart));
        updateBottomSpacer(sumChunkHeights(safeEnd + 1, totalChunks));

        loadedTop = safeStart;
        loadedBottom = safeStart - 1;
        for (let i = safeStart; i <= safeEnd; i += 1) {
            const chunk = createChunk(i);
            if (!chunk) continue;
            insertChunkNodes(chunk, false);
            renderedChunks.set(i, chunk);
            loadedBottom = i;
            highestLoadedChunk = Math.max(highestLoadedChunk, i);
            requestAnimationFrame(() => {
                if (renderToken !== gamesRenderToken) return;
                persistChunkHeight(i, chunk);
            });
        }

        maybeShowProgress();
    };

    const stepDown = () => {
        if (loadedBottom >= totalChunks - 1) return false;
        const nextChunk = loadedBottom + 1;
        const inserted = insertChunkAtBottom(nextChunk);
        if (!inserted) return false;
        maybeShowProgress();
        return true;
    };

    const stepUp = () => {
        if (loadedTop <= 0) return false;
        const prevChunk = loadedTop - 1;
        const inserted = insertChunkAtTop(prevChunk);
        if (!inserted) return false;
        return true;
    };

    const initialChunks = Math.min(
        totalChunks,
        view === 'cover'
            ? Math.max(minChunksInDom, Math.min(1, hardMaxChunksInDom))
            : Math.max(minChunksInDom, Math.min(3, hardMaxChunksInDom))
    );
    for (let i = 0; i < initialChunks; i += 1) {
        if (!stepDown()) break;
    }

    if (totalChunks <= initialChunks) {
        maybeShowProgress();
        return;
    }

    const scrollRoot = document.querySelector('.game-scroll-body') || document.querySelector('main.game-grid') || gamesContainer.parentElement || null;
    if (!scrollRoot) return;

    const nearEdgeThreshold = view === 'cover' ? 680 : 420;
    let scrollTicking = false;
    let lastScrollTop = Number(scrollRoot.scrollTop || 0);
    let userScrollIntentUntil = 0;

    const markUserScrollIntent = () => {
        userScrollIntentUntil = Date.now() + 1600;
    };

    const onUserWheelIntent = () => {
        markUserScrollIntent();
    };

    const onUserPointerIntent = () => {
        markUserScrollIntent();
    };

    const onUserTouchIntent = () => {
        markUserScrollIntent();
    };

    const onUserKeyIntent = (event) => {
        const key = String(event?.key || '').toLowerCase();
        if (!key) return;
        if (key === 'arrowup' || key === 'arrowdown' || key === 'pageup' || key === 'pagedown' || key === 'home' || key === 'end' || key === ' ') {
            markUserScrollIntent();
        }
    };

    scrollRoot.addEventListener('wheel', onUserWheelIntent, { passive: true });
    scrollRoot.addEventListener('pointerdown', onUserPointerIntent, { passive: true });
    scrollRoot.addEventListener('touchstart', onUserTouchIntent, { passive: true });
    window.addEventListener('keydown', onUserKeyIntent, true);

    const onWheel = (e) => {
        if (!e.ctrlKey) return;
        e.preventDefault();
        const slider = document.getElementById('view-size-slider');
        if (!slider || slider.disabled) return;
        const current = parseInt(slider.value, 10);
        const next = e.deltaY < 0 ? Math.min(140, current + 5) : Math.max(70, current - 5);
        slider.value = String(next);
        slider.dispatchEvent(new Event('input', { bubbles: true }));
    };
    gamesContainer.addEventListener('wheel', onWheel, { passive: false });

    const getTargetChunkIndexForViewport = (scrollTop, viewportHeight, scrollHeight) => {
        if (totalChunks <= 0) return 0;
        const typical = Math.max(1, estimateTypicalChunkHeight());
        const loadedStart = Math.max(0, topSpacerHeight);
        const loadedEnd = Math.max(loadedStart, scrollHeight - bottomSpacerHeight);
        const viewportBottom = scrollTop + viewportHeight;

        let target = loadedTop;
        if (loadedBottom < loadedTop) {
            target = Math.floor(scrollTop / typical);
        } else if (scrollTop < loadedStart) {
            const missingPx = loadedStart - scrollTop;
            target = loadedTop - Math.ceil(missingPx / typical);
        } else if (viewportBottom > loadedEnd) {
            const missingPx = viewportBottom - loadedEnd;
            target = loadedBottom + Math.ceil(missingPx / typical);
        } else {
            const insideOffsetPx = scrollTop - loadedStart;
            target = loadedTop + Math.floor(insideOffsetPx / typical);
        }

        return Math.max(0, Math.min(totalChunks - 1, target));
    };

    const getRangeAroundChunk = (chunkIndex, desiredCount) => {
        const count = Math.max(
            minChunksInDom,
            Math.min(hardMaxChunksInDom, Math.max(1, Number(desiredCount) || minChunksInDom))
        );
        let start = Math.max(0, Math.min(totalChunks - 1, chunkIndex) - Math.floor(count / 2));
        let end = start + count - 1;
        if (end >= totalChunks) {
            end = totalChunks - 1;
            start = Math.max(0, end - count + 1);
        }
        return { start, end };
    };

    const processScroll = () => {
        if (renderToken !== gamesRenderToken) return;
        const scrollTop = Number(scrollRoot.scrollTop || 0);
        const viewportHeight = Number(scrollRoot.clientHeight || 0);
        const scrollHeight = Number(scrollRoot.scrollHeight || 0);
        const scrollDelta = scrollTop - lastScrollTop;
        const scrollDirection = scrollDelta > 0 ? 1 : (scrollDelta < 0 ? -1 : 0);
        lastScrollTop = scrollTop;
        const distanceToLoadedTop = Math.max(0, scrollTop - topSpacerHeight);
        const distanceToLoadedBottom = Math.max(0, (scrollHeight - bottomSpacerHeight) - (scrollTop + viewportHeight));
        const maxChunksInDom = getMaxChunksInDom(viewportHeight);
        const pruneLimit = Math.max(minChunksInDom, maxChunksInDom + 1);

        // Ignore layout-only scroll events (e.g. theme/font reflow). Mutating chunks
        // on zero-delta events can cause continuous mount/unmount churn.
        if (scrollDirection === 0) {
            return;
        }
        if (Date.now() > userScrollIntentUntil) {
            return;
        }

        const targetChunkIndex = getTargetChunkIndexForViewport(scrollTop, viewportHeight, scrollHeight);
        if (targetChunkIndex < loadedTop || targetChunkIndex > loadedBottom) {
            const { start, end } = getRangeAroundChunk(targetChunkIndex, Math.max(minChunksInDom, maxChunksInDom));
            resetWindowToRange(start, end);
            return;
        }

        const hardNearTop = distanceToLoadedTop <= Math.max(180, Math.round(nearEdgeThreshold * 0.28));
        const hardNearBottom = distanceToLoadedBottom <= Math.max(180, Math.round(nearEdgeThreshold * 0.28));
        const nearTop = distanceToLoadedTop <= nearEdgeThreshold;
        const nearBottom = distanceToLoadedBottom <= nearEdgeThreshold;

        // Prevent idle chunk churn: only load by direction when the user actually scrolls.
        const shouldLoadDown = nearBottom && scrollDirection > 0;
        const shouldLoadUp = nearTop && scrollDirection < 0;

        // Prevent chunk thrashing near boundaries: prefer one direction per tick.
        if (shouldLoadDown && (!shouldLoadUp || scrollDirection > 0 || distanceToLoadedBottom <= distanceToLoadedTop)) {
            stepDown();
        } else if (shouldLoadUp) {
            stepUp();
        }

        while (getRenderedChunkCount() > pruneLimit) {
            if (scrollDirection > 0) {
                if (!removeChunkFromTop()) break;
                continue;
            }
            if (scrollDirection < 0) {
                if (!removeChunkFromBottom()) break;
                continue;
            }
            // No clear direction: prune the farther side first.
            if (distanceToLoadedBottom > distanceToLoadedTop) {
                if (!removeChunkFromBottom()) {
                    if (!removeChunkFromTop()) break;
                }
            } else {
                if (!removeChunkFromTop()) {
                    if (!removeChunkFromBottom()) break;
                }
            }
        }
    };

    const onScroll = () => {
        if (scrollTicking) return;
        scrollTicking = true;
        requestAnimationFrame(() => {
            scrollTicking = false;
            processScroll();
        });
    };

    scrollRoot.addEventListener('scroll', onScroll, { passive: true });
    gamesScrollDetach = () => {
        scrollRoot.removeEventListener('scroll', onScroll);
        scrollRoot.removeEventListener('wheel', onUserWheelIntent);
        scrollRoot.removeEventListener('pointerdown', onUserPointerIntent);
        scrollRoot.removeEventListener('touchstart', onUserTouchIntent);
        window.removeEventListener('keydown', onUserKeyIntent, true);
        gamesContainer.removeEventListener('wheel', onWheel);
        if (indicatorTimer) {
            window.clearTimeout(indicatorTimer);
            indicatorTimer = null;
        }
        indicator.remove();
    };

    // Run once to fill viewport if initial chunks are not enough.
    processScroll();
}

function renderGamesAsSlideshow(gamesToRender) {
    const gamesContainer = document.getElementById('games-container');
    if (!gamesContainer) return;
    const renderToken = gamesRenderToken;
    const slideshowContainer = document.createElement('div');
    slideshowContainer.className = 'slideshow-container';
    slideshowContainer.tabIndex = 0;
    const slideshowGames = buildViewGamePool(gamesToRender, MAX_SLIDESHOW_POOL_SIZE);

    if (!slideshowGames || slideshowGames.length === 0) {
        slideshowContainer.innerHTML = `<div class="slideshow-empty">No games to display.</div>`;
        gamesContainer.appendChild(slideshowContainer);
        return;
    }

    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let swapClassTimer = null;
    let shiftTimer = null;

    let currentIndex = 0;
    let isAnimating = false;
    let pendingSteps = 0;
    let rapidShiftBudget = 0;
    let suppressClickUntil = 0;

    const backdrops = [document.createElement('div'), document.createElement('div')];
    let activeBackdrop = 0;
    backdrops.forEach((el, i) => {
        el.className = 'slideshow-backdrop' + (i === 0 ? ' is-active' : '');
        el.setAttribute('aria-hidden', 'true');
    });

    const chrome = document.createElement('div');
    chrome.className = 'slideshow-chrome';

    const titleRow = document.createElement('div');
    titleRow.className = 'slideshow-title-row';
    const heading = document.createElement('h2');
    heading.className = 'slideshow-heading';
    titleRow.appendChild(heading);

    const carouselWrapper = document.createElement('div');
    carouselWrapper.className = 'slideshow-carousel-wrapper';
    const carouselInner = document.createElement('div');
    carouselInner.className = 'slideshow-carousel-inner';

    const blurb = document.createElement('div');
    blurb.className = 'slideshow-blurb glass';
    const blurbMeta = document.createElement('div');
    blurbMeta.className = 'slideshow-blurb-meta';
    const blurbText = document.createElement('p');
    blurbText.className = 'slideshow-blurb-text';
    blurb.appendChild(blurbMeta);
    blurb.appendChild(blurbText);

    function getGameImage(game) {
        let gameImageToUse = game && game.image;
        if (!gameImageToUse && game && game.platformShortName) {
            const platformShortName = game.platformShortName.toLowerCase();
            gameImageToUse = `emubro-resources/platforms/${platformShortName}/covers/default.jpg`;
        }
        return gameImageToUse;
    }

    function setBackdropForIndex(idx) {
        const game = slideshowGames[idx];
        const heroImg = getGameImage(game);

        const nextBackdrop = 1 - activeBackdrop;
        backdrops[nextBackdrop].style.backgroundImage = heroImg ? `url("${heroImg}")` : '';
        backdrops[nextBackdrop].classList.add('is-active');
        backdrops[activeBackdrop].classList.remove('is-active');
        activeBackdrop = nextBackdrop;
    }

    function updateHero(idx) {
        const game = slideshowGames[idx];
        heading.textContent = game.name;

        const platformName = game.platform || game.platformShortName || i18n.t('gameDetails.unknown');
        const ratingText = (game.rating !== undefined && game.rating !== null) ? `${game.rating}` : i18n.t('gameDetails.unknown');
        const statusText = game.isInstalled ? 'Installed' : 'Not Installed';

        blurbMeta.innerHTML = `
            <span class="slideshow-meta-pill">${platformName}</span>
            <span class="slideshow-meta-pill">Rating: ${ratingText}</span>
            <span class="slideshow-meta-pill">${statusText}</span>
            <span class="slideshow-meta-pill">${idx + 1} / ${slideshowGames.length}</span>
        `;

        blurbText.textContent = (game.description && String(game.description).trim().length > 0)
            ? String(game.description).trim()
            : 'No description available for this game yet.';

        if (!reduceMotion) {
            chrome.classList.add('is-swapping');
            if (swapClassTimer) {
                window.clearTimeout(swapClassTimer);
            }
            swapClassTimer = window.setTimeout(() => {
                swapClassTimer = null;
                if (renderToken !== gamesRenderToken) return;
                chrome.classList.remove('is-swapping');
            }, 180);
        }

        setBackdropForIndex(idx);
    }

    const onWheel = (e) => {
        if (!e.ctrlKey) return;
        e.preventDefault();
        const slider = document.getElementById('view-size-slider');
        if (!slider || slider.disabled) return;
        const current = parseInt(slider.value, 10);
        const next = e.deltaY < 0 ? Math.min(140, current + 5) : Math.max(70, current - 5);
        slider.value = String(next);
        slider.dispatchEvent(new Event('input', { bubbles: true }));
    };
    slideshowContainer.addEventListener('wheel', onWheel, { passive: false });

    const len = slideshowGames.length;
    let slotOffsets = [-2, -1, 0, 1, 2];
    if (len <= 1) {
        slotOffsets = [0];
    } else if (len === 2) {
        slotOffsets = [-1, 0];
    } else if (len === 3) {
        slotOffsets = [-1, 0, 1];
    } else if (len === 4) {
        slotOffsets = [-2, -1, 0, 1];
    }

    const minOffset = Math.min(...slotOffsets);
    const maxOffset = Math.max(...slotOffsets);

    function setCardContent(card, idx) {
        const game = slideshowGames[idx];
        const img = card.querySelector('img');
        const src = getGameImage(game);
        img.src = src || '';
        img.alt = game.name;
        card.setAttribute('aria-label', game.name);
        card.dataset.index = String(idx);
    }

    const cards = slotOffsets.map(offset => {
        const idx = (currentIndex + offset + len) % len;
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'slideshow-card';
        card.dataset.offset = String(offset);
        if (offset === 0) card.setAttribute('aria-current', 'true');
        card.innerHTML = `
            <img src="" alt="" class="slideshow-image" loading="lazy" decoding="async" fetchpriority="low" />
            <div class="slideshow-card-frame" aria-hidden="true"></div>
        `;
        setCardContent(card, idx);
        return card;
    });

    const AUTO_ADVANCE_MS = 4200;
    let autoAdvanceTimer = null;
    let autoAdvancePaused = false;

    function clearAutoAdvance() {
        if (!autoAdvanceTimer) return;
        window.clearTimeout(autoAdvanceTimer);
        autoAdvanceTimer = null;
    }

    function scheduleAutoAdvance() {
        clearAutoAdvance();
        if (len <= 1 || autoAdvancePaused) return;
        if (!slideshowContainer.isConnected) return;

        autoAdvanceTimer = window.setTimeout(() => {
            autoAdvanceTimer = null;
            if (renderToken !== gamesRenderToken) return;
            if (!slideshowContainer.isConnected || autoAdvancePaused || isAnimating || pendingSteps !== 0) {
                scheduleAutoAdvance();
                return;
            }
            queueShift(1, { auto: true });
        }, AUTO_ADVANCE_MS);
    }

    function shiftOnce(dir, updateHeroNow = true) {
        if (len <= 1) return;
        isAnimating = true;

        currentIndex = (currentIndex + dir + len) % len;
        if (updateHeroNow) updateHero(currentIndex);

        cards.forEach(card => {
            const oldOffset = parseInt(card.dataset.offset || '0', 10);
            let newOffset = oldOffset - dir;
            let wrapped = false;

            if (newOffset < minOffset) {
                newOffset = maxOffset;
                wrapped = true;
            } else if (newOffset > maxOffset) {
                newOffset = minOffset;
                wrapped = true;
            }

            if (wrapped) {
                const idx = (currentIndex + newOffset + len) % len;
                card.classList.add('no-anim');
                card.dataset.offset = String(newOffset);
                setCardContent(card, idx);
                if (newOffset === 0) card.setAttribute('aria-current', 'true');
                else card.removeAttribute('aria-current');
                void card.offsetHeight;
                requestAnimationFrame(() => card.classList.remove('no-anim'));
            } else {
                card.dataset.offset = String(newOffset);
                if (newOffset === 0) card.setAttribute('aria-current', 'true');
                else card.removeAttribute('aria-current');
            }
        });

        const isDraggingNow = slideshowContainer.classList.contains('is-dragging');
        const fastShift = rapidShiftBudget > 0 || Math.abs(pendingSteps) > 1;
        if (rapidShiftBudget > 0) rapidShiftBudget -= 1;

        const durationMs = reduceMotion ? 0 : (isDraggingNow ? 64 : (fastShift ? 100 : 170));
        if (durationMs === 0) {
            isAnimating = false;
            runQueue();
            return;
        }

        if (shiftTimer) {
            window.clearTimeout(shiftTimer);
        }
        shiftTimer = window.setTimeout(() => {
            shiftTimer = null;
            if (renderToken !== gamesRenderToken) return;
            isAnimating = false;
            runQueue();
        }, durationMs);
    }

    function runQueue() {
        if (renderToken !== gamesRenderToken) return;
        if (!slideshowContainer.isConnected) return;
        if (isAnimating) return;
        if (pendingSteps === 0) {
            scheduleAutoAdvance();
            return;
        }
        const dir = pendingSteps > 0 ? 1 : -1;
        pendingSteps -= dir;
        const updateHeroNow = pendingSteps === 0;
        shiftOnce(dir, updateHeroNow);
    }

    function queueShift(steps, options = {}) {
        if (renderToken !== gamesRenderToken) return;
        if (!slideshowContainer.isConnected) return;
        if (!steps) return;
        if (len <= 1) return;
        if (options.rapid) rapidShiftBudget += Math.min(10, Math.abs(steps));
        if (!options.auto) scheduleAutoAdvance();
        pendingSteps += Math.max(-12, Math.min(12, steps));
        runQueue();
    }

    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'slideshow-controls';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'slideshow-btn prev-btn';
    prevBtn.textContent = 'Previous';
    prevBtn.addEventListener('click', () => queueShift(-1));

    const nextBtn = document.createElement('button');
    nextBtn.className = 'slideshow-btn next-btn';
    nextBtn.textContent = 'Next';
    nextBtn.addEventListener('click', () => queueShift(1));

    // Drag to scroll (fast scrub). Uses discrete steps but feels smooth thanks to the carousel transitions.
    (function enableDragScrub() {
        const stepPx = 54; // lower = faster scrolling
        const dragThreshold = 6;
        let armed = false;
        let dragging = false;
        let dragMoved = false;

        let startX = 0;
        let startY = 0;
        let lastSentSteps = 0;
        let lastMoveX = 0;
        let lastMoveT = 0;
        let velocity = 0; // px/ms

        const setDraggingUi = (on) => {
            slideshowContainer.classList.toggle('is-dragging', !!on);
        };

        const onPointerDown = (e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            armed = true;
            dragging = false;
            dragMoved = false;
            autoAdvancePaused = true;
            clearAutoAdvance();
            startX = e.clientX;
            startY = e.clientY;
            lastMoveX = e.clientX;
            lastMoveT = performance.now();
            lastSentSteps = 0;
            velocity = 0;
            e.preventDefault();
        };

        const onPointerMove = (e) => {
            if (!armed) return;

            const dx0 = e.clientX - startX;
            const dy0 = e.clientY - startY;

            if (!dragging) {
                if (Math.abs(dx0) < dragThreshold && Math.abs(dy0) < dragThreshold) return;
                dragging = true;
                dragMoved = true;
                setDraggingUi(true);
                try { carouselWrapper.setPointerCapture(e.pointerId); } catch (_e) {}
            }

            const now = performance.now();
            const dx = e.clientX - startX;

            const dt = Math.max(1, now - lastMoveT);
            const instV = (e.clientX - lastMoveX) / dt;
            velocity = (velocity * 0.7) + (instV * 0.3);
            lastMoveX = e.clientX;
            lastMoveT = now;

            // Swipe left (dx negative) => next => +steps. Swipe right => prev => -steps.
            const wantedSteps = Math.trunc((-dx) / stepPx);
            const delta = wantedSteps - lastSentSteps;
            if (delta) {
                queueShift(delta, { rapid: true });
                lastSentSteps = wantedSteps;
            }

            e.preventDefault();
        };

        const end = (e) => {
            if (!armed) return;
            armed = false;

            if (!dragging) return;
            dragging = false;
            setDraggingUi(false);
            try { carouselWrapper.releasePointerCapture(e.pointerId); } catch (_e) {}

            if (dragMoved) {
                suppressClickUntil = performance.now() + 260;
            }

            // Flick inertia: convert velocity into 1..3 extra steps.
            const flick = Math.max(-3, Math.min(3, Math.round((-velocity) * 2.2)));
            if (flick) queueShift(flick, { rapid: true });
            velocity = 0;
            autoAdvancePaused = false;
            scheduleAutoAdvance();
        };

        carouselWrapper.style.touchAction = 'none';
        carouselWrapper.addEventListener('pointerdown', onPointerDown);
        carouselWrapper.addEventListener('pointermove', onPointerMove);
        carouselWrapper.addEventListener('pointerup', end);
        carouselWrapper.addEventListener('pointercancel', end);
        carouselWrapper.addEventListener('lostpointercapture', end);
    })();

    carouselInner.addEventListener('click', (e) => {
        if (performance.now() < suppressClickUntil) return;
        scheduleAutoAdvance();
        const card = e.target.closest('.slideshow-card');
        if (!card) return;
        const offset = parseInt(card.dataset.offset || '0', 10);
        if (offset === 0) {
            const gameIndex = Number.parseInt(card.dataset.index || '-1', 10);
            const game = Number.isFinite(gameIndex) && gameIndex >= 0 ? slideshowGames[gameIndex] : null;
            if (game) showGameDetails(game);
            return;
        }
        queueShift(offset, { rapid: Math.abs(offset) > 1 });
    });

    slideshowContainer.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            queueShift(-1);
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            queueShift(1);
        }
    });

    slideshowContainer.addEventListener('mouseenter', () => {
        autoAdvancePaused = true;
        clearAutoAdvance();
    });

    slideshowContainer.addEventListener('mouseleave', () => {
        autoAdvancePaused = false;
        scheduleAutoAdvance();
    });

    updateHero(currentIndex);
    scheduleAutoAdvance();

    backdrops.forEach(el => slideshowContainer.appendChild(el));
    cards.forEach(c => carouselInner.appendChild(c));

    carouselWrapper.appendChild(carouselInner);

    const footer = document.createElement('div');
    footer.className = 'slideshow-footer';

    chrome.appendChild(carouselWrapper);
    footer.appendChild(titleRow);
    footer.appendChild(blurb);

    controlsContainer.appendChild(prevBtn);
    controlsContainer.appendChild(nextBtn);
    footer.appendChild(controlsContainer);

    chrome.appendChild(footer);

    slideshowContainer.appendChild(chrome);
    gamesContainer.appendChild(slideshowContainer);

    slideshowContainer.focus();

    gamesScrollDetach = () => {
        slideshowContainer.removeEventListener('wheel', onWheel);
        clearAutoAdvance();
        if (swapClassTimer) {
            window.clearTimeout(swapClassTimer);
            swapClassTimer = null;
        }
        if (shiftTimer) {
            window.clearTimeout(shiftTimer);
            shiftTimer = null;
        }
    };
}

function renderGamesAsRandom(gamesToRender) {
    const gamesContainer = document.getElementById('games-container');
    if (!gamesContainer) return;
    const renderToken = gamesRenderToken;
    const randomContainer = document.createElement('div');
    randomContainer.className = 'random-container random-container--slot';
    const spinGames = buildViewGamePool(gamesToRender, MAX_RANDOM_POOL_SIZE);

    if (!spinGames || spinGames.length === 0) {
        randomContainer.innerHTML = `<div class="slot-empty">No games to spin.</div>`;
        gamesContainer.appendChild(randomContainer);
        return;
    }

    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let selectedIndex = Math.floor(Math.random() * spinGames.length);

    const machine = document.createElement('div');
    machine.className = 'slot-machine';

    const marquee = document.createElement('div');
    marquee.className = 'slot-marquee';
    marquee.innerHTML = `
        <div class="slot-marquee-title">Lucky Shuffle</div>
        <div class="slot-marquee-sub">Pull the lever. Let fate pick your next game.</div>
    `;

    const cabinet = document.createElement('div');
    cabinet.className = 'slot-cabinet';

    const windowEl = document.createElement('div');
    windowEl.className = 'slot-window';

    const reel = document.createElement('div');
    reel.className = 'slot-reel';

    const reelInner = document.createElement('div');
    reelInner.className = 'slot-reel-inner';

    const payline = document.createElement('div');
    payline.className = 'slot-payline';
    payline.setAttribute('aria-hidden', 'true');

    const controls = document.createElement('div');
    controls.className = 'slot-controls';

    const leverBtn = document.createElement('button');
    leverBtn.type = 'button';
    leverBtn.className = 'action-btn slot-lever';
    leverBtn.textContent = 'PULL';

    const result = document.createElement('div');
    result.className = 'slot-result glass';

    const resultTitle = document.createElement('div');
    resultTitle.className = 'slot-result-title';

    const resultMeta = document.createElement('div');
    resultMeta.className = 'slot-result-meta';

    result.appendChild(resultTitle);
    result.appendChild(resultMeta);
    result.classList.add('slot-result-clickable');
    result.tabIndex = 0;
    result.setAttribute('role', 'button');
    result.setAttribute('aria-label', 'Open selected game details');

    controls.appendChild(leverBtn);

    reel.appendChild(reelInner);
    windowEl.appendChild(reel);
    windowEl.appendChild(payline);
    cabinet.appendChild(windowEl);

    const stage = document.createElement('div');
    stage.className = 'slot-stage';
    stage.appendChild(cabinet);
    stage.appendChild(controls);

    machine.appendChild(marquee);
    machine.appendChild(stage);
    machine.appendChild(result);

    randomContainer.appendChild(machine);
    gamesContainer.appendChild(randomContainer);

    function getGameImage(game) {
        let gameImageToUse = game && game.image;
        if (!gameImageToUse && game && game.platformShortName) {
            const platformShortName = game.platformShortName.toLowerCase();
            gameImageToUse = `emubro-resources/platforms/${platformShortName}/covers/default.jpg`;
        }
        return gameImageToUse;
    }

    function setResult(idx) {
        const game = spinGames[idx];
        const platformName = game.platform || game.platformShortName || i18n.t('gameDetails.unknown');
        const ratingText = (game.rating !== undefined && game.rating !== null) ? `${game.rating}` : i18n.t('gameDetails.unknown');

        resultTitle.textContent = game.name;
        resultMeta.innerHTML = `
            <span class="slot-meta-pill">${platformName}</span>
            <span class="slot-meta-pill">Rating: ${ratingText}</span>
        `;
    }

    const baseLen = spinGames.length;
    const targetReelItems = 96;
    const repeatBlocks = Math.max(3, Math.ceil(targetReelItems / Math.max(1, baseLen)));
    const reelIndexToGameIndex = [];
    for (let b = 0; b < repeatBlocks; b++) {
        for (let i = 0; i < baseLen; i++) {
            reelIndexToGameIndex.push(i);
        }
    }

    reelIndexToGameIndex.forEach((gameIdx) => {
        const game = spinGames[gameIdx];
        const safeName = escapeHtml(game?.name || '');
        const safeImage = escapeHtml(getGameImage(game) || '');
        const item = document.createElement('div');
        item.className = 'slot-item';
        item.innerHTML = `
            <img class="slot-item-image lazy-game-image is-pending" src="${LAZY_PLACEHOLDER_SRC}" data-lazy-src="${safeImage}" alt="${safeName}" loading="lazy" decoding="async" fetchpriority="low" />
            <div class="slot-item-caption">${safeName}</div>
        `;
        reelInner.appendChild(item);
    });

    let metricsReady = false;
    let itemStep = 0;
    let totalHeight = 0;
    let alignOffset = 0;

    let absPos = 0;
    let rafId = null;
    let retrySpinTimer = null;
    let spinning = false;

    function measure() {
        const first = reelInner.querySelector('.slot-item');
        if (!first) return;
        const rect = first.getBoundingClientRect();
        const cs = window.getComputedStyle(first);
        const mb = parseFloat(cs.marginBottom || '0') || 0;
        itemStep = rect.height + mb;
        totalHeight = itemStep * reelIndexToGameIndex.length;
        const winRect = windowEl.getBoundingClientRect();
        alignOffset = (winRect.height - rect.height) / 2;
        metricsReady = itemStep > 0 && totalHeight > 0;
    }

    function renderPos() {
        if (renderToken !== gamesRenderToken) return;
        if (!randomContainer.isConnected) return;
        if (!metricsReady) return;
        const mod = ((absPos % totalHeight) + totalHeight) % totalHeight;
        reelInner.style.transform = `translate3d(0, ${-mod}px, 0)`;
    }

    function snapToGameIndex(gameIdx) {
        if (!metricsReady) return;
        const block = Math.floor((reelIndexToGameIndex.length / baseLen) / 2);
        const reelIdx = gameIdx + block * baseLen;
        const desired = (reelIdx * itemStep) - alignOffset;
        const desiredMod = ((desired % totalHeight) + totalHeight) % totalHeight;
        absPos = desiredMod;
        renderPos();
    }

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function animateTo(targetAbsPos, durationMs, onDone) {
        const start = performance.now();
        const startPos = absPos;
        const delta = targetAbsPos - startPos;

        function step(ts) {
            if (renderToken !== gamesRenderToken) return;
            if (!randomContainer.isConnected) return;
            const t = Math.min(1, (ts - start) / durationMs);
            const e = easeOutCubic(t);
            absPos = startPos + delta * e;
            renderPos();
            if (t < 1) {
                rafId = requestAnimationFrame(step);
            } else {
                absPos = targetAbsPos;
                renderPos();
                if (typeof onDone === 'function') onDone();
            }
        }

        rafId = requestAnimationFrame(step);
    }

    function stopSpinTo(gameIdx) {
        if (!metricsReady) return;

        const currentMod = ((absPos % totalHeight) + totalHeight) % totalHeight;
        const currentBlock = Math.floor(absPos / (itemStep * baseLen));

        let bestDelta = Infinity;
        for (let b = currentBlock + 1; b <= currentBlock + 8; b++) {
            const reelIdx = gameIdx + b * baseLen;
            const desired = (reelIdx * itemStep) - alignOffset;
            const desiredMod = ((desired % totalHeight) + totalHeight) % totalHeight;
            let delta = desiredMod - currentMod;
            if (delta < 0) delta += totalHeight;
            delta += totalHeight * 2;
            if (delta < bestDelta) bestDelta = delta;
        }

        const target = absPos + bestDelta;
        const duration = reduceMotion ? 0 : 900;

        machine.classList.remove('is-spinning');
        machine.classList.add('is-stopping');
        animateTo(target, duration, () => {
            spinning = false;
            machine.classList.remove('is-stopping');
            leverBtn.disabled = false;
            leverBtn.textContent = 'SPIN';
            setResult(gameIdx);
        });
    }

    function startSpin() {
        if (renderToken !== gamesRenderToken) return;
        if (!randomContainer.isConnected) return;
        if (spinning) return;
        spinning = true;
        leverBtn.disabled = true;
        leverBtn.textContent = 'SPINNING...';
        machine.classList.add('is-spinning');

        if (!metricsReady) measure();
        if (!metricsReady) {
            if (retrySpinTimer) {
                window.clearTimeout(retrySpinTimer);
            }
            retrySpinTimer = window.setTimeout(() => {
                retrySpinTimer = null;
                if (renderToken !== gamesRenderToken) return;
                if (!randomContainer.isConnected) return;
                measure();
                startSpin();
            }, 50);
            return;
        }

        if (reduceMotion) {
            selectedIndex = Math.floor(Math.random() * spinGames.length);
            stopSpinTo(selectedIndex);
            return;
        }

        const speed = 2400;
        const spinMs = 1100 + Math.floor(Math.random() * 700);
        const startTs = performance.now();
        let lastTs = startTs;

        function tick(ts) {
            if (renderToken !== gamesRenderToken) return;
            if (!randomContainer.isConnected) return;
            const dt = Math.min(0.05, (ts - lastTs) / 1000);
            lastTs = ts;
            absPos += speed * dt;
            renderPos();

            if (ts - startTs < spinMs) {
                rafId = requestAnimationFrame(tick);
            } else {
                selectedIndex = Math.floor(Math.random() * spinGames.length);
                stopSpinTo(selectedIndex);
            }
        }

        rafId = requestAnimationFrame(tick);
    }

    leverBtn.addEventListener('click', startSpin);
    result.addEventListener('click', () => {
        const game = spinGames[selectedIndex];
        if (game) showGameDetails(game);
    });
    result.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            const game = spinGames[selectedIndex];
            if (game) showGameDetails(game);
        }
    });

    const onWindowResize = () => {
        if (renderToken !== gamesRenderToken) return;
        if (!randomContainer.isConnected) {
            window.removeEventListener('resize', onWindowResize);
            return;
        }

        requestAnimationFrame(() => {
            const wasReady = metricsReady;
            measure();
            if (!metricsReady) return;

            // Keep the current reel animation smooth while spinning.
            if (spinning) {
                if (wasReady) renderPos();
                return;
            }

            // Re-center selected game with new dimensions.
            snapToGameIndex(selectedIndex);
        });
    };
    window.addEventListener('resize', onWindowResize);

    requestAnimationFrame(() => {
        if (renderToken !== gamesRenderToken) return;
        if (!randomContainer.isConnected) return;
        measure();
        snapToGameIndex(selectedIndex);
        setResult(selectedIndex);
    });

    gamesScrollDetach = () => {
        window.removeEventListener('resize', onWindowResize);
        if (rafId) {
            window.cancelAnimationFrame(rafId);
            rafId = null;
        }
        if (retrySpinTimer) {
            window.clearTimeout(retrySpinTimer);
            retrySpinTimer = null;
        }
        cleanupLazyGameImages(randomContainer);
    };
}

function showEmulatorDetails(emulator, options = {}) {
    getEmulatorDetailsPopupActions().showEmulatorDetails(emulator, options);
}

export function showGameDetails(game) {
    getGameDetailsPopupActions().showGameDetails(game);
}
