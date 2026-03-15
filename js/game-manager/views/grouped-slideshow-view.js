import { isCustomGameCoverSource } from '../render-utils';
import { createSlideshowLane, updateSlideshowItemOrientationClass } from './slideshow-lane';
import { attachGameCardContextMenu } from '../game-card-context-menu';

const SLIDESHOW_MODE_STORAGE_KEY = 'emuBro.slideshowMode';

function getGameImage(game) {
    let gameImageToUse = game && game.image;
    if (!gameImageToUse && game && game.platformShortName) {
        const platformShortName = String(game.platformShortName || '').toLowerCase();
        gameImageToUse = `emubro-resources/platforms/${platformShortName}/covers/default.jpg`;
    }
    return gameImageToUse;
}

function getPlatformShortName(game) {
    return String(game?.platformShortName || game?.platform || 'unknown').trim().toLowerCase() || 'unknown';
}

function getPlatformIcon(game) {
    return `emubro-resources/platforms/${getPlatformShortName(game)}/logos/default.png`;
}

function getGroupIdentity(groupBy, group, heroGame) {
    const label = String(group?.label || 'Unknown').trim() || 'Unknown';
    if (groupBy === 'platform') {
        return {
            label,
            iconSrc: heroGame ? getPlatformIcon(heroGame) : '',
            badgeText: '',
            badgeClassName: 'is-platform'
        };
    }

    const tokens = label
        .split(/[\s/&+_-]+/)
        .map((entry) => String(entry || '').trim())
        .filter(Boolean);
    const badgeText = (tokens[0]?.[0] || label[0] || '?').toUpperCase() + (tokens[1]?.[0] || '').toUpperCase();
    return {
        label,
        iconSrc: '',
        badgeText,
        badgeClassName: 'is-company'
    };
}

function readStoredMode() {
    try {
        const stored = String(localStorage.getItem(SLIDESHOW_MODE_STORAGE_KEY) || 'flat').trim().toLowerCase();
        return stored === '3d' ? '3d' : 'flat';
    } catch (_error) {
        return 'flat';
    }
}

function writeStoredMode(mode) {
    try {
        localStorage.setItem(SLIDESHOW_MODE_STORAGE_KEY, mode === '3d' ? '3d' : 'flat');
    } catch (_error) {}
}

function createPlatformLane({
    group,
    groupIndex,
    groupBy,
    modeRef,
    reduceMotion,
    escapeHtml,
    launchGame,
    showGameDetails,
    removeGame,
    initializeLazyGameImages,
    lazyPlaceholderSrc,
    i18n,
    emubro,
    alertUser,
    onSelectLane,
    renderToken,
    getRenderToken
}) {
    const heroGame = group.rows[0] || null;
    const initialIndex = Math.min(group.rows.length - 1, group.rows.length > 4 ? 2 : 1);
    const identity = getGroupIdentity(groupBy, group, heroGame);
    const section = document.createElement('section');
    section.className = 'slideshow-platform-section glass';
    section.dataset.groupIndex = String(groupIndex);

    const header = document.createElement('div');
    header.className = 'slideshow-platform-header';
    header.innerHTML = `
        <button type="button" class="slideshow-platform-side" aria-label="Focus ${escapeHtml(group.label)} row" title="${escapeHtml(group.label)}">
            <span class="slideshow-platform-icon-wrap">
                ${identity.iconSrc
                    ? `<img class="slideshow-platform-icon" src="${escapeHtml(identity.iconSrc)}" alt="" loading="lazy" />`
                    : `<span class="slideshow-platform-badge ${escapeHtml(identity.badgeClassName)}" aria-hidden="true">${escapeHtml(identity.badgeText)}</span>`
                }
            </span>
            <span class="slideshow-platform-title-wrap">
                <h3 class="slideshow-platform-title">${escapeHtml(identity.label)}</h3>
                <span class="slideshow-platform-count">${group.rows.length}</span>
            </span>
        </button>
        <div class="slideshow-platform-actions">
            <button type="button" class="slideshow-platform-nav" data-direction="-1" aria-label="Previous ${escapeHtml(group.label)} games" title="Previous">
                <span aria-hidden="true">&#8249;</span>
            </button>
            <button type="button" class="slideshow-platform-nav" data-direction="1" aria-label="Next ${escapeHtml(group.label)} games" title="Next">
                <span aria-hidden="true">&#8250;</span>
            </button>
        </div>
    `;

    const carousel = document.createElement('div');
    carousel.className = 'slideshow-platform-carousel';
    carousel.innerHTML = `
        <div class="slideshow-platform-backdrop"></div>
        <div class="slideshow-platform-veil"></div>
    `;

    const track = document.createElement('div');
    track.className = 'slideshow-platform-track';
    carousel.appendChild(track);
    section.appendChild(header);
    section.appendChild(carousel);

    let lane = null;
    let activeIndex = Math.max(0, initialIndex);

    function updateRowBackdrop(index) {
        const game = group.rows[Math.max(0, Math.min(group.rows.length - 1, Number(index) || 0))] || null;
        const image = game ? getGameImage(game) : '';
        const backdrop = carousel.querySelector('.slideshow-platform-backdrop');
        if (!backdrop) return;
        if (image) {
            const safeImage = String(image).replace(/["\\]/g, '\\$&');
            backdrop.style.backgroundImage = `url("${safeImage}")`;
            backdrop.classList.add('is-active');
        } else {
            backdrop.style.backgroundImage = '';
            backdrop.classList.remove('is-active');
        }
    }

    group.rows.forEach((game, index) => {
        const safeImage = getGameImage(game);
        const src = lazyPlaceholderSrc || safeImage;
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'slideshow-item slideshow-platform-item';
        item.dataset.index = String(index);
        item.setAttribute('aria-label', game.name || '');
        item.classList.toggle('is-custom-cover-source', isCustomGameCoverSource(safeImage));
        item.innerHTML = `
            <div class="slideshow-item-inner">
                <img class="slideshow-item-image lazy-game-image is-pending" src="${src}" data-lazy-src="${safeImage}" alt="" loading="lazy" decoding="async" />
                <button class="game-cover-play-btn slideshow-play-btn" type="button" aria-label="Play ${escapeHtml(game.name || '')}" title="Play ${escapeHtml(game.name || '')}">
                    <span class="game-cover-play-icon" aria-hidden="true"></span>
                </button>
                <div class="slideshow-item-overlay">
                    <div class="slideshow-item-title">${escapeHtml(game.name || '')}</div>
                </div>
            </div>
        `;

        const imageEl = item.querySelector('.slideshow-item-image');
        const playBtn = item.querySelector('.slideshow-play-btn');
        if (playBtn) {
            playBtn.addEventListener('click', async (event) => {
                event.preventDefault();
                event.stopPropagation();
                await launchGame(game);
            });
            playBtn.addEventListener('pointerdown', (event) => {
                event.stopPropagation();
            });
        }
        if (imageEl) {
            const applyOrientation = () => {
                if (!updateSlideshowItemOrientationClass(item, imageEl)) return;
                lane?.scheduleOrientationRefresh();
            };
            imageEl.addEventListener('load', applyOrientation);
            if (imageEl.complete && imageEl.naturalWidth > 0) {
                requestAnimationFrame(applyOrientation);
            }
        }
        attachGameCardContextMenu(item, game, {
            i18n,
            emubro,
            alertUser,
            launchGame,
            showGameDetails,
            removeGame
        });
        track.appendChild(item);
    });

    lane = createSlideshowLane({
        carousel,
        track,
        itemSelector: '.slideshow-platform-item',
        reduceMotion,
        modeRef,
        renderToken,
        getRenderToken,
        initialIndex: activeIndex,
        refreshItems() {
            let changed = false;
            track.querySelectorAll('.slideshow-platform-item').forEach((item) => {
                const imageEl = item.querySelector('.slideshow-item-image');
                if (!imageEl) return;
                changed = updateSlideshowItemOrientationClass(item, imageEl) || changed;
            });
            return changed;
        },
        onLaneFocus() {
            onSelectLane(groupIndex);
        },
        onNearestIndexChange(nextIndex) {
            activeIndex = nextIndex;
            updateRowBackdrop(activeIndex);
        },
        onSettledIndexChange(nextIndex) {
            activeIndex = nextIndex;
            updateRowBackdrop(activeIndex);
        },
        onActiveClick(activeIndex) {
            showGameDetails(group.rows[activeIndex]);
        }
    });

    requestAnimationFrame(() => {
        initializeLazyGameImages(track);
        updateRowBackdrop(activeIndex);
        lane.scheduleOrientationRefresh();
        lane.scrollToItem(activeIndex, false);
    });
    window.setTimeout(() => lane?.scheduleOrientationRefresh(), 120);
    window.setTimeout(() => lane?.scheduleOrientationRefresh(), 500);

    header.querySelectorAll('.slideshow-platform-nav').forEach((button) => {
        button.addEventListener('click', () => {
            onSelectLane(groupIndex);
            const direction = Number(button.dataset.direction || 0);
            lane.scrollToItem(Math.max(0, Math.min(group.rows.length - 1, lane.getCurrentIndex() + direction)));
        });
    });

    const sideButton = header.querySelector('.slideshow-platform-side');
    sideButton?.addEventListener('click', () => {
        onSelectLane(groupIndex);
    });

    return {
        section,
        getActiveIndex() {
            return activeIndex;
        },
        setMode() {
            lane?.setMode();
        },
        destroy() {
            lane?.destroy();
            lane = null;
        }
    };
}

export function renderGamesAsGroupedSlideshow(gamesToRender, options = {}) {
    const gamesContainer = document.getElementById('games-container');
    if (!gamesContainer) return;

    const launchGame = typeof options.launchGame === 'function' ? options.launchGame : (async () => {});
    const showGameDetails = typeof options.showGameDetails === 'function' ? options.showGameDetails : () => {};
    const removeGame = typeof options.removeGame === 'function' ? options.removeGame : (async () => {});
    const escapeHtml = typeof options.escapeHtml === 'function' ? options.escapeHtml : (value) => String(value ?? '');
    const initializeLazyGameImages = typeof options.initializeLazyGameImages === 'function'
        ? options.initializeLazyGameImages
        : () => {};
    const cleanupLazyGameImages = typeof options.cleanupLazyGameImages === 'function'
        ? options.cleanupLazyGameImages
        : () => {};
    const setGamesScrollDetach = typeof options.setGamesScrollDetach === 'function'
        ? options.setGamesScrollDetach
        : () => {};
    const lazyPlaceholderSrc = String(options.lazyPlaceholderSrc || '');
    const normalizeGroupByValue = typeof options.normalizeGroupByValue === 'function'
        ? options.normalizeGroupByValue
        : (value) => value;
    const getGroupValueForGame = typeof options.getGroupValueForGame === 'function'
        ? options.getGroupValueForGame
        : (game) => String(game?.platform || game?.platformShortName || 'Unknown').trim() || 'Unknown';
    const buildViewGamePool = typeof options.buildViewGamePool === 'function' ? options.buildViewGamePool : (rows) => rows;
    const maxPoolSize = Number(options.maxPoolSize) || 0;
    const renderToken = options.renderToken;
    const getRenderToken = typeof options.getRenderToken === 'function' ? options.getRenderToken : () => renderToken;
    const i18n = options.i18n;
    const emubro = options.emubro || window.emubro;
    const alertUser = typeof options.alertUser === 'function' ? options.alertUser : (message) => window.alert(String(message || ''));
    const groupBy = normalizeGroupByValue(options.groupBy || 'platform');

    const groupsMap = new Map();
    (Array.isArray(gamesToRender) ? gamesToRender : []).forEach((game) => {
        const label = String(getGroupValueForGame(game, groupBy) || 'Unknown').trim() || 'Unknown';
        const key = label.toLowerCase();
        if (!groupsMap.has(key)) {
            groupsMap.set(key, { label, rows: [] });
        }
        groupsMap.get(key).rows.push(game);
    });

    const groups = Array.from(groupsMap.values()).map((group) => ({
        label: group.label,
        rows: buildViewGamePool(group.rows, maxPoolSize)
    })).filter((group) => group.rows.length > 0);

    if (!groups.length) {
        gamesContainer.innerHTML = '<p>No games to display.</p>';
        return;
    }

    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const modeRef = { mode: readStoredMode() };
    const root = document.createElement('div');
    root.className = 'slideshow-grouped-platforms';
    root.classList.toggle('is-mode-3d', modeRef.mode === '3d');
    root.classList.toggle('is-mode-flat', modeRef.mode !== '3d');

    const controls = document.createElement('div');
    controls.className = 'slideshow-grouped-controls';
    controls.innerHTML = `
        <div class="slideshow-mode-tabs">
            <button type="button" class="slideshow-mode-tab${modeRef.mode === 'flat' ? ' is-active' : ''}" data-slideshow-mode="flat">Flat</button>
            <button type="button" class="slideshow-mode-tab${modeRef.mode === '3d' ? ' is-active' : ''}" data-slideshow-mode="3d">3D</button>
        </div>
    `;
    root.appendChild(controls);

    const lanesHost = document.createElement('div');
    lanesHost.className = 'slideshow-grouped-stack';
    root.appendChild(lanesHost);

    const lanes = [];
    let activeGroupIndex = groups.length > 1 ? 1 : 0;

    function updateGroupFocusState() {
        const lastIndex = Math.max(0, lanes.length - 1);
        const visible = new Set([activeGroupIndex]);
        if (activeGroupIndex <= 0) {
            visible.add(1);
            visible.add(2);
        } else if (activeGroupIndex >= lastIndex) {
            visible.add(lastIndex - 1);
            visible.add(lastIndex - 2);
        } else {
            visible.add(activeGroupIndex - 1);
            visible.add(activeGroupIndex + 1);
        }

        lanes.forEach((lane, index) => {
            const distance = Math.abs(index - activeGroupIndex);
            const isVisible = visible.has(index);
            lane.section.classList.toggle('is-selected', index === activeGroupIndex);
            lane.section.classList.toggle('is-neighbor', isVisible && index !== activeGroupIndex);
            lane.section.classList.toggle('is-far-neighbor', isVisible && distance > 1);
            lane.section.classList.toggle('is-hidden', !isVisible);
        });
    }

    function applyMode(nextMode, persist = true) {
        modeRef.mode = nextMode === '3d' ? '3d' : 'flat';
        root.classList.toggle('is-mode-3d', modeRef.mode === '3d');
        root.classList.toggle('is-mode-flat', modeRef.mode !== '3d');
        controls.querySelectorAll('.slideshow-mode-tab').forEach((button) => {
            const isActive = String(button.dataset.slideshowMode || '') === modeRef.mode;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
        lanes.forEach((lane) => lane.setMode());
        if (persist) writeStoredMode(modeRef.mode);
    }

    groups.forEach((group, groupIndex) => {
        const lane = createPlatformLane({
            group,
            groupIndex,
            groupBy,
            modeRef,
            reduceMotion,
            escapeHtml,
            launchGame,
            showGameDetails,
            removeGame,
            initializeLazyGameImages,
            lazyPlaceholderSrc,
            i18n,
            emubro,
            alertUser,
            renderToken,
            getRenderToken,
            onSelectLane(nextIndex) {
                activeGroupIndex = nextIndex;
                updateGroupFocusState();
            }
        });
        lanes.push(lane);
        lanesHost.appendChild(lane.section);
    });

    controls.addEventListener('click', (event) => {
        const button = event.target.closest('.slideshow-mode-tab[data-slideshow-mode]');
        if (!button) return;
        applyMode(button.dataset.slideshowMode || 'flat');
    });

    gamesContainer.appendChild(root);
    applyMode(modeRef.mode, false);
    updateGroupFocusState();

    setGamesScrollDetach(() => {
        lanes.forEach((lane) => lane.destroy());
        cleanupLazyGameImages(root);
    });
}
