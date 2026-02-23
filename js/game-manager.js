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
import { normalizeRuntimeDataRulesForLaunch } from './game-manager/runtime-data-utils';
import { escapeHtml, normalizeNameKey, getGameCompanyValue } from './game-manager/game-utils';
import {
    normalizeGroupByValue,
    normalizeLanguageFilterValue,
    normalizeRegionFilterValue,
    normalizeSortModeValue,
    getLanguageCodesFromNameBrackets,
    getRegionCodeFromGame,
    getGroupValueForGame,
    compareGamesBySort,
    groupRowsBySameNames
} from './game-manager/filters-utils';
import {
    createLaunchCandidateResolver,
    dedupeLaunchCandidateMembers
} from './game-manager/launch-candidate-utils';
import { showGroupedLaunchPicker } from './game-manager/launch-picker';
import { getGlobalSearchTerm, buildGamesRenderSignature, buildViewGamePool } from './game-manager/render-utils';
import { createGameSearchActions } from './game-manager/game-search';
import { createGameFilters } from './game-manager/game-filters';
import { renderGamesAsSlideshow } from './game-manager/views/slideshow-view';
import { renderGamesAsFocus } from './game-manager/views/focus-view';
import { renderGamesAsRandom } from './game-manager/views/random-view';
import { renderGamesGroupedAccordion } from './game-manager/rendering/grouped-accordion';
import { renderGamesIncremental } from './game-manager/rendering/incremental-render';
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
const MAX_FOCUS_POOL_SIZE = 500;
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
let gameSearchActions = null;
let gameFilterActions = null;
const groupAccordionState = new Map();
let lastRenderSignature = '';
let lastRenderAt = 0;
let lastRenderedView = 'cover';
let launchCandidateResolver = null;

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
            getRuntimePlatform: () => String(emubro?.platform || '').trim().toLowerCase(),
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

function getGameFilterActions() {
    if (!gameFilterActions) {
        gameFilterActions = createGameFilters({
            getGames,
            setFilteredGames,
            renderGames,
            getCurrentFilter: () => currentFilter,
            setCurrentFilter: (value) => { currentFilter = value; },
            getCurrentSort: () => currentSort,
            setCurrentSort: (value) => { currentSort = value; },
            getCurrentSortDir: () => currentSortDir,
            setCurrentSortDir: (value) => { currentSortDir = value; },
            getCurrentGroupBy: () => currentGroupBy,
            setCurrentGroupBy: (value) => { currentGroupBy = value; },
            getCurrentLanguageFilter: () => currentLanguageFilter,
            setCurrentLanguageFilter: (value) => { currentLanguageFilter = value; },
            getCurrentRegionFilter: () => currentRegionFilter,
            setCurrentRegionFilter: (value) => { currentRegionFilter = value; },
            getGroupSameNamesEnabled: () => groupSameNamesEnabled,
            setGroupSameNamesEnabled: (value) => { groupSameNamesEnabled = value; },
            normalizeSortModeValue,
            normalizeGroupByValue,
            normalizeLanguageFilterValue,
            normalizeRegionFilterValue,
            getLanguageCodesFromNameBrackets,
            getRegionCodeFromGame,
            getGroupValueForGame,
            compareGamesBySort,
            groupRowsBySameNames,
            getGameCompanyValue,
            getGlobalSearchTerm
        });
    }
    return gameFilterActions;
}

function getGameSearchActions() {
    if (!gameSearchActions) {
        gameSearchActions = createGameSearchActions({
            emubro,
            log,
            setGames,
            setFilteredGames,
            renderGames,
            initializePlatformFilterOptions: (rows) => getGameFilterActions().initializePlatformFilterOptions(rows),
            alertUser: (message) => alert(message)
        });
    }
    return gameSearchActions;
}

function initializeLazyGameImages(root) {
    getLazyGameImageActions().initialize(root);
}

function cleanupLazyGameImages(root, options = null) {
    try {
        getLazyGameImageActions().cleanup?.(root, options || undefined);
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
    const signature = buildGamesRenderSignature({
        rows: gamesToRender,
        view: activeView,
        currentGroupBy,
        currentSort,
        currentSortDir
    });
    if (signature === lastRenderSignature && (now - lastRenderAt) < 220) {
        return;
    }
    lastRenderSignature = signature;
    lastRenderAt = now;

    clearGamesLoadObserver();
    gamesRenderToken += 1;

    const previousView = String(lastRenderedView || '').trim().toLowerCase();
    const nextView = String(activeView || '').trim().toLowerCase();
    const isLeavingCover = previousView === 'cover' && nextView !== 'cover';
    if (isLeavingCover) {
        cleanupLazyGameImages(gamesContainer, { releaseSources: true });
    }

    gamesContainer.className = `games-container ${activeView}-view`;

    cleanupLazyGameImages(gamesContainer);
    gamesContainer.innerHTML = '';
    
    if (gamesToRender.length === 0) {
        gamesContainer.innerHTML = `<p>${i18n.t('gameGrid.noGamesFound')}</p>`;
        lastRenderedView = activeView;
        return;
    }

    if (activeView === 'slideshow') {
        lastRenderedView = activeView;
        renderGamesAsSlideshow(gamesToRender, {
            renderToken: gamesRenderToken,
            getRenderToken: () => gamesRenderToken,
            setGamesScrollDetach: (detach) => {
                gamesScrollDetach = detach;
            },
            buildViewGamePool,
            maxPoolSize: MAX_SLIDESHOW_POOL_SIZE,
            showGameDetails,
            escapeHtml,
            initializeLazyGameImages,
            cleanupLazyGameImages,
            lazyPlaceholderSrc: LAZY_PLACEHOLDER_SRC,
            i18n
        });
        return;
    } else if (activeView === 'focus') {
        lastRenderedView = activeView;
        renderGamesAsFocus(gamesToRender, {
            renderToken: gamesRenderToken,
            getRenderToken: () => gamesRenderToken,
            setGamesScrollDetach: (detach) => {
                gamesScrollDetach = detach;
            },
            buildViewGamePool,
            maxPoolSize: MAX_FOCUS_POOL_SIZE,
            showGameDetails,
            escapeHtml,
            initializeLazyGameImages,
            cleanupLazyGameImages,
            lazyPlaceholderSrc: LAZY_PLACEHOLDER_SRC,
            i18n
        });
        return;
    } else if (activeView === 'random') {
        lastRenderedView = activeView;
        renderGamesAsRandom(gamesToRender, {
            renderToken: gamesRenderToken,
            getRenderToken: () => gamesRenderToken,
            setGamesScrollDetach: (detach) => {
                gamesScrollDetach = detach;
            },
            buildViewGamePool,
            maxPoolSize: MAX_RANDOM_POOL_SIZE,
            showGameDetails,
            escapeHtml,
            cleanupLazyGameImages,
            initializeLazyGameImages,
            lazyPlaceholderSrc: LAZY_PLACEHOLDER_SRC,
            i18n
        });
        return;
    } else if (currentGroupBy !== 'none') {
        renderGamesGroupedAccordion(gamesToRender, activeView, {
            currentGroupBy,
            groupAccordionState,
            gameBatchSizeMap: GAMES_BATCH_SIZE,
            createGameTableRow,
            createGameListItem,
            createGameCard,
            initializeLazyGameImages,
            normalizeGroupByValue,
            getGroupValueForGame,
            i18n,
            setGamesScrollDetach: (detach) => {
                gamesScrollDetach = detach;
            }
        });
    } else {
        renderGamesIncremental(gamesToRender, activeView, {
            renderToken: gamesRenderToken,
            getRenderToken: () => gamesRenderToken,
            setGamesScrollDetach: (detach) => {
                gamesScrollDetach = detach;
            },
            gameBatchSizeMap: GAMES_BATCH_SIZE,
            createGameTableRow,
            createGameListItem,
            createGameCard,
            initializeLazyGameImages,
            cleanupLazyGameImages,
            applyFilters,
            getCurrentSort: () => currentSort,
            setCurrentSort: (value) => { currentSort = value; },
            getCurrentSortDir: () => currentSortDir,
            setCurrentSortDir: (value) => { currentSortDir = value; }
        });
    }

    initializeLazyGameImages(gamesContainer);
    lastRenderedView = activeView;
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

function getLaunchCandidatesForGame(game) {
    if (!launchCandidateResolver) {
        launchCandidateResolver = createLaunchCandidateResolver({ getGames, normalizeNameKey });
    }
    return launchCandidateResolver.getLaunchCandidatesForGame(game);
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

export async function searchForGamesAndEmulators(scanTargets = [], options = {}) {
    return getGameSearchActions().searchForGamesAndEmulators(scanTargets, options);
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
    return getGameFilterActions().applyFilters(shouldRender, sourceRows);
}

export function initializePlatformFilterOptions(sourceRows = games) {
    return getGameFilterActions().initializePlatformFilterOptions(sourceRows);
}

export function addPlatformFilterOption(platformShortName) {
    return getGameFilterActions().addPlatformFilterOption(platformShortName);
}

function createGameTableRow(game) {
    return getGameCardElements().createGameTableRow(game);
}

function createGameListItem(game) {
    return getGameCardElements().createGameListItem(game);
}

function showEmulatorDetails(emulator, options = {}) {
    getEmulatorDetailsPopupActions().showEmulatorDetails(emulator, options);
}

export function showGameDetails(game) {
    getGameDetailsPopupActions().showGameDetails(game);
}
