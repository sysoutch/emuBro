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
import {
    getGlobalSearchTerm,
    buildGamesRenderSignature,
    buildViewGamePool,
    buildGamesContainerClass,
    getStoredCoverCardMode
} from './game-manager/render-utils';
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
let globalSizeWheelShortcutBound = false;
const gameCoverCacheBusters = new Map();
let cardShineInteractionsBound = false;

function resolveGamesScrollRoot() {
    return document.querySelector('.game-scroll-body')
        || document.querySelector('main.game-grid')
        || document.getElementById('games-container')?.parentElement
        || null;
}

function findClosestVisibleGameAnchor(root) {
    if (!root || typeof root.querySelectorAll !== 'function') return null;
    const rootRect = root.getBoundingClientRect?.();
    if (!rootRect) return null;
    const viewportTop = Number(rootRect.top || 0);
    const viewportBottom = Number(rootRect.bottom || (viewportTop + Number(root.clientHeight || 0)));

    let best = null;
    root.querySelectorAll('[data-game-id]').forEach((node) => {
        if (!(node instanceof Element) || !node.isConnected) return;
        const gameId = Number(node.getAttribute('data-game-id') || 0);
        if (!gameId) return;
        const rect = node.getBoundingClientRect?.();
        if (!rect) return;
        if (rect.bottom < viewportTop || rect.top > viewportBottom) return;
        const offset = rect.top - viewportTop;
        const score = Math.abs(offset);
        if (!best || score < best.score) {
            best = { gameId, offset, score };
        }
    });

    return best ? { gameId: best.gameId, offset: best.offset } : null;
}

function captureGamesScrollPosition(options = {}) {
    const root = resolveGamesScrollRoot();
    if (!root) return null;
    const requestedAnchorId = Number(options?.anchorGameId || 0);
    let anchorGameId = requestedAnchorId > 0 ? requestedAnchorId : 0;
    let anchorOffset = null;

    if (anchorGameId > 0) {
        const anchorEl = root.querySelector(`[data-game-id="${anchorGameId}"]`);
        if (anchorEl && typeof anchorEl.getBoundingClientRect === 'function') {
            const rootRect = root.getBoundingClientRect?.();
            const anchorRect = anchorEl.getBoundingClientRect();
            if (rootRect) {
                anchorOffset = Number(anchorRect.top || 0) - Number(rootRect.top || 0);
            }
        }
    } else {
        const fallbackAnchor = findClosestVisibleGameAnchor(root);
        if (fallbackAnchor?.gameId) {
            anchorGameId = fallbackAnchor.gameId;
            anchorOffset = Number(fallbackAnchor.offset || 0);
        }
    }

    return {
        root,
        top: Number(root.scrollTop || 0),
        left: Number(root.scrollLeft || 0),
        anchorGameId: anchorGameId > 0 ? anchorGameId : 0,
        anchorOffset: Number.isFinite(anchorOffset) ? Number(anchorOffset) : null
    };
}

function restoreGamesScrollPosition(snapshot, attempts = 3) {
    if (!snapshot || !snapshot.root || !snapshot.root.isConnected) return;
    const root = snapshot.root;
    const targetLeft = Math.max(0, Number(snapshot.left || 0));
    const anchorGameId = Number(snapshot.anchorGameId || 0);
    const hasAnchorOffset = Number.isFinite(snapshot.anchorOffset);
    const maxTop = Math.max(0, Number(root.scrollHeight || 0) - Number(root.clientHeight || 0));
    const maxLeft = Math.max(0, Number(root.scrollWidth || 0) - Number(root.clientWidth || 0));
    root.scrollLeft = Math.min(targetLeft, maxLeft);

    let appliedAnchor = false;
    if (anchorGameId > 0 && hasAnchorOffset) {
        const anchorEl = root.querySelector(`[data-game-id="${anchorGameId}"]`);
        if (anchorEl && typeof anchorEl.getBoundingClientRect === 'function') {
            const rootRect = root.getBoundingClientRect?.();
            const anchorRect = anchorEl.getBoundingClientRect();
            if (rootRect) {
                const currentOffset = Number(anchorRect.top || 0) - Number(rootRect.top || 0);
                const delta = currentOffset - Number(snapshot.anchorOffset || 0);
                const nextTop = Math.max(0, Math.min(maxTop, Number(root.scrollTop || 0) + delta));
                root.scrollTop = nextTop;
                appliedAnchor = true;
            }
        }
    }

    if (!appliedAnchor) {
        const targetTop = Math.max(0, Number(snapshot.top || 0));
        root.scrollTop = Math.min(targetTop, maxTop);
    }

    if (attempts <= 1) return;
    window.requestAnimationFrame(() => restoreGamesScrollPosition(snapshot, attempts - 1));
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
            markGameCoverUpdated,
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
            launchEmulatorAction: (emulator) => launchEmulatorAction(emulator),
            downloadAndInstallEmulatorAction: (emulator) => downloadAndInstallEmulatorAction(emulator),
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
            buildLaunchPayload: (gameId, extraPayload = {}) => buildLaunchPayloadForGameId(gameId, extraPayload),
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

function setupGlobalSizeWheelShortcut() {
    if (globalSizeWheelShortcutBound) return;
    globalSizeWheelShortcutBound = true;

    const adjustSizeSliderFromWheel = (deltaY) => {
        const slider = document.getElementById('view-size-slider');
        if (!slider) return false;
        if (slider.disabled) return true;
        const current = Number.parseInt(String(slider.value || ''), 10);
        if (!Number.isFinite(current)) return false;

        const min = Number.parseInt(String(slider.min || '70'), 10);
        const max = Number.parseInt(String(slider.max || '140'), 10);
        const step = Math.max(1, Number.parseInt(String(slider.step || '5'), 10) || 5);
        const direction = deltaY < 0 ? 1 : -1;
        const next = Math.max(min, Math.min(max, current + (direction * step)));
        if (next === current) return true;

        slider.value = String(next);
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
    };

    window.addEventListener('wheel', (event) => {
        if (!event) return;
        if (!(event.ctrlKey || event.metaKey)) return;
        if (!adjustSizeSliderFromWheel(Number(event.deltaY || 0))) return;
        event.preventDefault();
    }, { passive: false, capture: true });
}

function clamp01(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    return Math.max(0, Math.min(1, num));
}

function resolveInteractiveCardElement(target, root) {
    if (!(target instanceof Element)) return null;

    const emulatorCard = target.closest('.emulator-card');
    if (emulatorCard && root.contains(emulatorCard)) return emulatorCard;

    const gameStack = target.closest('.game-card-stack');
    if (gameStack && root.contains(gameStack)) return gameStack;

    const gameCard = target.closest('.game-card');
    if (gameCard && root.contains(gameCard)) return gameCard;

    return null;
}

function getCardVarTargets(card) {
    if (!(card instanceof Element)) return [];
    if (card.classList.contains('game-card-stack')) {
        const inner = card.querySelector('.game-card');
        return inner && inner !== card ? [card, inner] : [card];
    }
    if (card.classList.contains('game-card')) {
        const stack = card.closest('.game-card-stack');
        if (stack && stack !== card) return [stack, card];
    }
    return [card];
}

function resetCardShine(card) {
    const targets = getCardVarTargets(card);
    targets.forEach((target) => {
        if (!target || !target.style) return;
        target.style.removeProperty('--card-pointer-x');
        target.style.removeProperty('--card-pointer-y');
        target.style.removeProperty('--card-shine-dx');
        target.style.removeProperty('--card-shine-dy');
        target.style.removeProperty('--card-tilt-x');
        target.style.removeProperty('--card-tilt-y');
    });
}

function updateCardShine(card, clientX, clientY) {
    if (!card || typeof card.getBoundingClientRect !== 'function') return;
    const rect = card.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;

    const x = clamp01((Number(clientX || 0) - rect.left) / rect.width);
    const y = clamp01((Number(clientY || 0) - rect.top) / rect.height);
    const dx = (x - 0.5) * 14;
    const dy = (y - 0.5) * 10;
    const tiltY = (x - 0.5) * 10;
    const tiltX = (0.5 - y) * 8;

    const targets = getCardVarTargets(card);
    targets.forEach((target) => {
        if (!target || !target.style) return;
        target.style.setProperty('--card-pointer-x', `${(x * 100).toFixed(2)}%`);
        target.style.setProperty('--card-pointer-y', `${(y * 100).toFixed(2)}%`);
        target.style.setProperty('--card-shine-dx', `${dx.toFixed(2)}px`);
        target.style.setProperty('--card-shine-dy', `${dy.toFixed(2)}px`);
        target.style.setProperty('--card-tilt-x', `${tiltX.toFixed(2)}deg`);
        target.style.setProperty('--card-tilt-y', `${tiltY.toFixed(2)}deg`);
    });
}

function bindInteractiveCardShine(root) {
    if (!root || cardShineInteractionsBound) return;
    cardShineInteractionsBound = true;

    let rafId = 0;
    let pendingCard = null;
    let pendingX = 0;
    let pendingY = 0;

    const flushMove = () => {
        rafId = 0;
        if (!pendingCard) return;
        updateCardShine(pendingCard, pendingX, pendingY);
        pendingCard = null;
    };

    root.addEventListener('pointermove', (event) => {
        const card = resolveInteractiveCardElement(event?.target, root);
        if (!card || !root.contains(card)) return;
        pendingCard = card;
        pendingX = Number(event.clientX || 0);
        pendingY = Number(event.clientY || 0);
        if (!rafId) {
            rafId = window.requestAnimationFrame(flushMove);
        }
    }, { passive: true });

    root.addEventListener('pointerout', (event) => {
        const leavingCard = resolveInteractiveCardElement(event?.target, root);
        if (!leavingCard || !root.contains(leavingCard)) return;
        const enteringCard = resolveInteractiveCardElement(event?.relatedTarget, root);
        if (enteringCard && enteringCard === leavingCard) return;
        resetCardShine(leavingCard);
    }, { passive: true });

    root.addEventListener('scroll', () => {
        root.querySelectorAll?.('.game-card-stack, .emulator-card').forEach((card) => {
            resetCardShine(card);
        });
    }, { passive: true });
}

function getGameImagePath(game) {
    let gameImageToUse = game?.image;
    const platformShortName = String(game?.platformShortName || 'unknown').toLowerCase();
    if (!gameImageToUse) {
        gameImageToUse = `emubro-resources/platforms/${platformShortName}/covers/default.jpg`;
    }

    const gameId = Number(game?.id || 0);
    const cacheBuster = gameId ? Number(gameCoverCacheBusters.get(gameId) || 0) : 0;
    if (cacheBuster > 0) {
        const source = String(gameImageToUse || '').trim();
        if (source && !source.startsWith('data:')) {
            const sep = source.includes('?') ? '&' : '?';
            gameImageToUse = `${source}${sep}cb=${cacheBuster}`;
        }
    }

    return gameImageToUse;
}

function markGameCoverUpdated(gameId) {
    const id = Number(gameId || 0);
    if (!id) return;
    gameCoverCacheBusters.set(id, Date.now());
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
    if (gameCoverCacheBusters.size > 0) {
        const validIds = new Set(games.map((row) => Number(row?.id || 0)).filter((id) => id > 0));
        for (const key of gameCoverCacheBusters.keys()) {
            if (!validIds.has(Number(key || 0))) gameCoverCacheBusters.delete(key);
        }
    }
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
    setupGlobalSizeWheelShortcut();

    const gamesContainer = document.getElementById('games-container');
    if (!gamesContainer) return;

    const activeViewBtn = document.querySelector('.view-btn.active');
    const activeView = activeViewBtn ? activeViewBtn.dataset.view : 'cover';
    const coverCardMode = getStoredCoverCardMode(localStorage);
    const rootStyles = getComputedStyle(document.documentElement);
    const viewScaleSignature = String(
        rootStyles.getPropertyValue('--view-scale-user')
        || rootStyles.getPropertyValue('--view-scale')
        || '1'
    ).trim() || '1';
    const now = Date.now();
    const signature = buildGamesRenderSignature({
        rows: gamesToRender,
        view: activeView,
        currentGroupBy,
        currentSort,
        currentSortDir,
        coverCardMode,
        viewScale: viewScaleSignature
    });
    if (signature === lastRenderSignature && (now - lastRenderAt) < 220) {
        return;
    }
    lastRenderSignature = signature;
    lastRenderAt = now;

    clearGamesLoadObserver();
    gamesRenderToken += 1;

    gamesContainer.className = buildGamesContainerClass(activeView, coverCardMode);

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
    bindInteractiveCardShine(gamesContainer);
    lastRenderedView = activeView;
}

export function renderEmulators(emulatorsToRender = emulators, options = {}) {
    getEmulatorViewRenderer().renderEmulators(emulatorsToRender, options);
    const gamesContainer = document.getElementById('games-container');
    bindInteractiveCardShine(gamesContainer);
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

function buildLaunchPayloadForGameId(gameId, extraPayload = {}) {
    const targetId = Number(gameId || 0);
    if (!targetId) return 0;
    const game = getGameById(targetId);
    if (!game) return targetId;

    const emulator = resolveEmulatorForGame(game);
    const config = emulator ? getEmulatorConfig(emulator) : {};
    const mergedRuntimeDataRules = normalizeRuntimeDataRulesForLaunch({
        ...(config?.runtimeDataRules || {}),
        ...((extraPayload && typeof extraPayload === 'object' && extraPayload.runtimeDataRules)
            ? extraPayload.runtimeDataRules
            : {})
    });
    const payload = {
        gameId: targetId,
        runtimeDataRules: mergedRuntimeDataRules
    };

    if (extraPayload && typeof extraPayload === 'object') {
        const allowLaunchWarnings = Array.isArray(extraPayload.allowLaunchWarnings)
            ? Array.from(new Set(
                extraPayload.allowLaunchWarnings
                    .map((entry) => String(entry || '').trim().toLowerCase())
                    .filter(Boolean)
            ))
            : [];
        if (allowLaunchWarnings.length > 0) {
            payload.allowLaunchWarnings = allowLaunchWarnings;
        }
    }

    return payload;
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

async function reloadGamesFromMainAndRender(options = {}) {
    const preserveScroll = Boolean(options?.preserveScroll);
    const anchorGameId = Number(options?.anchorGameId || 0);
    const scrollSnapshot = preserveScroll
        ? captureGamesScrollPosition({ anchorGameId: anchorGameId > 0 ? anchorGameId : 0 })
        : null;
    const updatedGames = await emubro.invoke('get-games');
    setGames(updatedGames);

    applyFilters();
    if (scrollSnapshot) {
        window.requestAnimationFrame(() => restoreGamesScrollPosition(scrollSnapshot, 4));
    }
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
