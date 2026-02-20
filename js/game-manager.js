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
let currentGroupBy = 'none';
let currentLanguageFilter = 'all';
let currentRegionFilter = 'all';
let groupSameNamesEnabled = false;

const EMULATOR_TYPE_TABS = ['standalone', 'core', 'web'];
const LAZY_PLACEHOLDER_SRC = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
const MAX_SLIDESHOW_POOL_SIZE = 500;
const MAX_RANDOM_POOL_SIZE = 120;
const GAMES_BATCH_SIZE = {
    cover: 72,
    list: 48,
    table: 80
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
            localStorageRef: localStorage
        });
    }
    return emulatorConfigActions;
}

function getLazyGameImageActions() {
    if (!lazyGameImageActions) {
        lazyGameImageActions = createLazyGameImageActions({
            lazyPlaceholderSrc: LAZY_PLACEHOLDER_SRC
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
            alertUser: (message) => alert(message)
        });
    }
    return missingGameRecoveryActions;
}

function initializeLazyGameImages(root) {
    getLazyGameImageActions().initialize(root);
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

    clearGamesLoadObserver();
    gamesRenderToken += 1;

    const activeViewBtn = document.querySelector('.view-btn.active');
    const activeView = activeViewBtn ? activeViewBtn.dataset.view : 'cover';
    gamesContainer.className = `games-container ${activeView}-view`;

    gamesContainer.innerHTML = '';
    
    if (gamesToRender.length === 0) {
        gamesContainer.innerHTML = `<p>${i18n.t('gameGrid.noGamesFound')}</p>`;
        return;
    }

    if (activeView === 'slideshow') {
        renderGamesAsSlideshow(gamesToRender);
    } else if (activeView === 'random') {
        renderGamesAsRandom(gamesToRender);
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

function compareGamesBySort(a, b, sortMode) {
    const sort = String(sortMode || 'name').trim().toLowerCase();
    switch (sort) {
        case 'rating':
            return Number(b?.rating || 0) - Number(a?.rating || 0);
        case 'price':
            return Number(a?.price || 0) - Number(b?.price || 0);
        case 'platform':
            return String(a?.platform || a?.platformShortName || 'Unknown')
                .localeCompare(String(b?.platform || b?.platformShortName || 'Unknown'));
        default:
            return String(a?.name || '').localeCompare(String(b?.name || ''));
    }
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

async function promptGroupedLaunchTarget(game) {
    const members = Array.isArray(game?.__groupMembers) ? game.__groupMembers.filter((row) => Number(row?.id || 0) > 0) : [];
    if (members.length <= 1) {
        return Number(game?.id || members[0]?.id || 0) || 0;
    }

    const options = members.map((member, idx) => {
        const fileName = String(member?.filePath || '').trim().split(/[/\\]/).pop() || 'Unknown file';
        return `${idx + 1}. ${member?.name || 'Unknown'} (${fileName})`;
    }).join('\n');

    const promptMessage = [
        `Choose file to launch for "${game?.__groupDisplayName || game?.name || 'Game'}":`,
        '',
        options,
        '',
        `Enter number (1-${members.length})`
    ].join('\n');

    const raw = window.prompt(promptMessage, '1');
    if (raw === null) return 0;
    const idx = Math.max(1, Math.min(members.length, Number.parseInt(String(raw).trim(), 10) || 0)) - 1;
    const selected = members[idx];
    if (!selected?.id) {
        alert('Invalid selection.');
        return 0;
    }
    return Number(selected.id);
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
    let gameId = 0;
    if (typeof gameOrId === 'object' && gameOrId) {
        if (groupSameNamesEnabled) {
            gameId = await promptGroupedLaunchTarget(gameOrId);
        } else {
            gameId = Number(gameOrId?.id || 0);
        }
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
    currentSort = sortFilter ? sortFilter.value : 'name';
    currentGroupBy = normalizeGroupByValue(groupFilter ? groupFilter.value : 'none');
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
        const sortCompare = compareGamesBySort(a, b, currentSort);
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

    if (!groups.length) {
        gamesContainer.innerHTML = `<p>${i18n.t('gameGrid.noGamesFound')}</p>`;
        return;
    }

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
            const tbody = table.querySelector('tbody');
            (Array.isArray(group.rows) ? group.rows : []).forEach((game) => {
                tbody.appendChild(createGameTableRow(game));
            });
            content.appendChild(table);
        } else if (view === 'list') {
            const list = document.createElement('div');
            list.className = 'games-group-list';
            (Array.isArray(group.rows) ? group.rows : []).forEach((game) => {
                list.appendChild(createGameListItem(game));
            });
            content.appendChild(list);
        } else {
            const grid = document.createElement('div');
            grid.className = 'games-group-grid';
            (Array.isArray(group.rows) ? group.rows : []).forEach((game) => {
                grid.appendChild(createGameCard(game));
            });
            content.appendChild(grid);
        }

        const stateKey = getAccordionStateKey(view, group.label);
        const expanded = groupAccordionState.has(stateKey) ? !!groupAccordionState.get(stateKey) : true;
        section.classList.toggle('is-collapsed', !expanded);
        header.setAttribute('aria-expanded', expanded ? 'true' : 'false');

        header.addEventListener('click', () => {
            const isExpanded = header.getAttribute('aria-expanded') === 'true';
            const nextExpanded = !isExpanded;
            header.setAttribute('aria-expanded', nextExpanded ? 'true' : 'false');
            section.classList.toggle('is-collapsed', !nextExpanded);
            groupAccordionState.set(stateKey, nextExpanded);
        });

        section.appendChild(header);
        section.appendChild(content);
        gamesContainer.appendChild(section);
    });
}

function renderGamesIncremental(gamesToRender, activeView = 'cover') {
    const gamesContainer = document.getElementById('games-container');
    if (!gamesContainer) return;

    const view = (activeView === 'list' || activeView === 'table') ? activeView : 'cover';
    const renderToken = gamesRenderToken;
    const batchSize = GAMES_BATCH_SIZE[view] || GAMES_BATCH_SIZE.cover;
    const totalGames = Array.isArray(gamesToRender) ? gamesToRender.length : 0;
    const totalChunks = Math.ceil(totalGames / batchSize);
    const maxChunksInDom = view === 'cover' ? 6 : (view === 'table' ? 8 : 9);

    let mountTarget = null;
    let topSpacer = null;
    let bottomSpacer = null;

    if (view === 'table') {
        const table = document.createElement('table');
        table.className = 'games-table';
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
            <tbody class="games-virtual-host-table"></tbody>
        `;
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
            (Array.isArray(chunk.rows) ? chunk.rows : []).forEach((row) => row?.remove?.());
            return;
        }
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

    const stepDown = () => {
        if (loadedBottom >= totalChunks - 1) return false;
        const nextChunk = loadedBottom + 1;
        const inserted = insertChunkAtBottom(nextChunk);
        if (!inserted) return false;
        while (getRenderedChunkCount() > maxChunksInDom) {
            if (!removeChunkFromTop()) break;
        }
        maybeShowProgress();
        return true;
    };

    const stepUp = () => {
        if (loadedTop <= 0) return false;
        const prevChunk = loadedTop - 1;
        const inserted = insertChunkAtTop(prevChunk);
        if (!inserted) return false;
        while (getRenderedChunkCount() > maxChunksInDom) {
            if (!removeChunkFromBottom()) break;
        }
        return true;
    };

    const initialChunks = Math.min(totalChunks, Math.max(2, Math.min(4, maxChunksInDom)));
    for (let i = 0; i < initialChunks; i += 1) {
        if (!stepDown()) break;
    }

    if (totalChunks <= initialChunks) {
        maybeShowProgress();
        return;
    }

    const scrollRoot = document.querySelector('.game-scroll-body') || document.querySelector('main.game-grid') || gamesContainer.parentElement || null;
    if (!scrollRoot) return;

    const nearEdgeThreshold = view === 'cover' ? 900 : 520;
    let scrollTicking = false;

    const processScroll = () => {
        if (renderToken !== gamesRenderToken) return;
        const scrollTop = Number(scrollRoot.scrollTop || 0);
        const viewportHeight = Number(scrollRoot.clientHeight || 0);
        const scrollHeight = Number(scrollRoot.scrollHeight || 0);

        if ((scrollHeight - (scrollTop + viewportHeight)) <= nearEdgeThreshold) {
            let guard = 0;
            while (guard < 2 && stepDown()) {
                guard += 1;
            }
        }

        if (scrollTop <= nearEdgeThreshold) {
            let guard = 0;
            while (guard < 2 && stepUp()) {
                guard += 1;
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
    };

    // Run once to fill viewport if initial chunks are not enough.
    processScroll();
}

function renderGamesAsSlideshow(gamesToRender) {
    const gamesContainer = document.getElementById('games-container');
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
            setTimeout(() => chrome.classList.remove('is-swapping'), 180);
        }

        setBackdropForIndex(idx);
    }

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
        clearTimeout(autoAdvanceTimer);
        autoAdvanceTimer = null;
    }

    function scheduleAutoAdvance() {
        clearAutoAdvance();
        if (len <= 1 || autoAdvancePaused) return;
        if (!slideshowContainer.isConnected) return;

        autoAdvanceTimer = setTimeout(() => {
            autoAdvanceTimer = null;
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

        setTimeout(() => {
            isAnimating = false;
            runQueue();
        }, durationMs);
    }

    function runQueue() {
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
}

function renderGamesAsRandom(gamesToRender) {
    const gamesContainer = document.getElementById('games-container');
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
        if (spinning) return;
        spinning = true;
        leverBtn.disabled = true;
        leverBtn.textContent = 'SPINNING...';
        machine.classList.add('is-spinning');

        if (!metricsReady) measure();
        if (!metricsReady) {
            setTimeout(() => {
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
        measure();
        snapToGameIndex(selectedIndex);
        setResult(selectedIndex);
    });
}

function showEmulatorDetails(emulator, options = {}) {
    getEmulatorDetailsPopupActions().showEmulatorDetails(emulator, options);
}

export function showGameDetails(game) {
    getGameDetailsPopupActions().showGameDetails(game);
}
