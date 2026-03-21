import { isCustomGameCoverSource } from '../render-utils';
import { createSlideshowLane, updateSlideshowItemOrientationClass } from './slideshow-lane';
import { createSlideshowPerformanceMeter } from './slideshow-performance-meter';
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

function clampColorChannel(value) {
    return Math.max(0, Math.min(255, Math.round(Number(value) || 0)));
}

function colorDistanceSq(a, b) {
    const dr = Number(a?.r || 0) - Number(b?.r || 0);
    const dg = Number(a?.g || 0) - Number(b?.g || 0);
    const db = Number(a?.b || 0) - Number(b?.b || 0);
    return (dr * dr) + (dg * dg) + (db * db);
}

function mixRgbColors(a, b, amount = 0.5) {
    const mix = Math.max(0, Math.min(1, Number(amount) || 0));
    return {
        r: clampColorChannel((Number(a?.r || 0) * (1 - mix)) + (Number(b?.r || 0) * mix)),
        g: clampColorChannel((Number(a?.g || 0) * (1 - mix)) + (Number(b?.g || 0) * mix)),
        b: clampColorChannel((Number(a?.b || 0) * (1 - mix)) + (Number(b?.b || 0) * mix))
    };
}

function toRgbaColor(color, alpha = 1) {
    return `rgba(${clampColorChannel(color?.r)}, ${clampColorChannel(color?.g)}, ${clampColorChannel(color?.b)}, ${Math.max(0, Math.min(1, Number(alpha) || 0))})`;
}

function hashStringToSeed(value) {
    const text = String(value || '');
    let hash = 0;
    for (let index = 0; index < text.length; index += 1) {
        hash = ((hash << 5) - hash) + text.charCodeAt(index);
        hash |= 0;
    }
    return Math.abs(hash);
}

function hslToRgb(h, s, l) {
    const hue = ((((Number(h) || 0) % 360) + 360) % 360) / 360;
    const sat = Math.max(0, Math.min(100, Number(s) || 0)) / 100;
    const light = Math.max(0, Math.min(100, Number(l) || 0)) / 100;

    if (sat === 0) {
        const gray = clampColorChannel(light * 255);
        return { r: gray, g: gray, b: gray };
    }

    const q = light < 0.5 ? light * (1 + sat) : light + sat - (light * sat);
    const p = 2 * light - q;
    const hueToChannel = (t) => {
        let n = t;
        if (n < 0) n += 1;
        if (n > 1) n -= 1;
        if (n < 1 / 6) return p + ((q - p) * 6 * n);
        if (n < 1 / 2) return q;
        if (n < 2 / 3) return p + ((q - p) * (2 / 3 - n) * 6);
        return p;
    };

    return {
        r: clampColorChannel(hueToChannel(hue + 1 / 3) * 255),
        g: clampColorChannel(hueToChannel(hue) * 255),
        b: clampColorChannel(hueToChannel(hue - 1 / 3) * 255)
    };
}

function fallbackPaletteFromSource(source) {
    const seed = hashStringToSeed(source || 'emubro-group');
    const baseHue = seed % 360;
    const colorA = hslToRgb(baseHue, 68, 56);
    const colorB = hslToRgb((baseHue + 38) % 360, 64, 54);
    const colorC = hslToRgb((baseHue + 320) % 360, 58, 46);
    return [
        toRgbaColor(colorA, 0.46),
        toRgbaColor(colorB, 0.4),
        toRgbaColor(colorC, 0.36)
    ];
}

function extractPaletteFromImage(image) {
    const width = Number(image?.naturalWidth || 0);
    const height = Number(image?.naturalHeight || 0);
    if (!width || !height) return null;

    const maxSize = 40;
    const scale = Math.min(1, maxSize / Math.max(width, height));
    const canvasWidth = Math.max(1, Math.round(width * scale));
    const canvasHeight = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;

    try {
        context.drawImage(image, 0, 0, canvasWidth, canvasHeight);
        const data = context.getImageData(0, 0, canvasWidth, canvasHeight).data;
        const buckets = new Map();
        for (let offset = 0; offset < data.length; offset += 16) {
            const alpha = data[offset + 3];
            if (alpha < 72) continue;
            const r = Math.floor(data[offset] / 24) * 24;
            const g = Math.floor(data[offset + 1] / 24) * 24;
            const b = Math.floor(data[offset + 2] / 24) * 24;
            const key = `${r},${g},${b}`;
            buckets.set(key, (buckets.get(key) || 0) + 1);
        }

        const sorted = [...buckets.entries()].sort((a, b) => b[1] - a[1]);
        if (!sorted.length) return null;

        const palette = [];
        for (const [bucketKey, count] of sorted) {
            if (palette.length > 0 && count < 2) continue;
            const parts = bucketKey.split(',').map((value) => clampColorChannel(Number(value)));
            if (parts.length !== 3) continue;
            const color = { r: parts[0], g: parts[1], b: parts[2] };
            const tooClose = palette.some((existing) => colorDistanceSq(existing, color) < 2200);
            if (tooClose) continue;
            palette.push(color);
            if (palette.length >= 3) break;
        }

        if (!palette.length) return null;
        if (palette.length === 1) {
            palette.push(mixRgbColors(palette[0], { r: 255, g: 255, b: 255 }, 0.34));
        }
        if (palette.length === 2) {
            palette.push(mixRgbColors(palette[0], { r: 16, g: 26, b: 56 }, 0.42));
        }

        return [
            toRgbaColor(palette[0], 0.48),
            toRgbaColor(palette[1], 0.42),
            toRgbaColor(palette[2], 0.36)
        ];
    } catch (_error) {
        return null;
    }
}

function applyPaletteToGroupSection(section, palette) {
    if (!section || !Array.isArray(palette) || palette.length < 3) return;
    section.style.setProperty('--group-glow-1', palette[0]);
    section.style.setProperty('--group-glow-2', palette[1]);
    section.style.setProperty('--group-glow-3', palette[2]);
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
        if (stored === '3d' || stored === '3d-reverse') return stored;
        return 'flat';
    } catch (_error) {
        return 'flat';
    }
}

function writeStoredMode(mode) {
    try {
        localStorage.setItem(SLIDESHOW_MODE_STORAGE_KEY, (mode === '3d' || mode === '3d-reverse') ? mode : 'flat');
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
    getRenderToken,
    onFrameSample
}) {
    const heroGame = group.rows[0] || null;
    const initialIndex = Math.min(group.rows.length - 1, group.rows.length > 4 ? 2 : 1);
    const identity = getGroupIdentity(groupBy, group, heroGame);
    const section = document.createElement('section');
    section.className = 'slideshow-platform-section glass';
    section.dataset.groupIndex = String(groupIndex);
    applyPaletteToGroupSection(section, fallbackPaletteFromSource(
        groupBy === 'platform'
            ? (heroGame?.platformShortName || heroGame?.platform || identity.label)
            : identity.label
    ));

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
        allowVerticalWheelPassThrough: true,
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
        },
        onFrameSample(sample) {
            onFrameSample?.(sample);
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
    const iconEl = header.querySelector('.slideshow-platform-icon');
    sideButton?.addEventListener('click', () => {
        onSelectLane(groupIndex);
    });

    if (iconEl) {
        const applyExtractedPalette = () => {
            const palette = extractPaletteFromImage(iconEl);
            if (!palette) return;
            applyPaletteToGroupSection(section, palette);
        };
        if (iconEl.complete && Number(iconEl.naturalWidth || 0) > 0) {
            requestAnimationFrame(applyExtractedPalette);
        } else {
            iconEl.addEventListener('load', applyExtractedPalette, { once: true });
        }
    }

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
    gamesContainer.classList.add('slideshow-grouped-mode');

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
    root.classList.toggle('is-mode-3d-reverse', modeRef.mode === '3d-reverse');
    root.classList.toggle('is-mode-flat', modeRef.mode === 'flat');

    const controls = document.createElement('div');
    controls.className = 'slideshow-grouped-controls';
    controls.innerHTML = `
        <div class="slideshow-mode-tabs">
            <button type="button" class="slideshow-mode-tab${modeRef.mode === 'flat' ? ' is-active' : ''}" data-slideshow-mode="flat">Flat</button>
            <button type="button" class="slideshow-mode-tab${modeRef.mode === '3d' ? ' is-active' : ''}" data-slideshow-mode="3d">3D</button>
            <button type="button" class="slideshow-mode-tab${modeRef.mode === '3d-reverse' ? ' is-active' : ''}" data-slideshow-mode="3d-reverse">3D Reverse</button>
        </div>
    `;
    const perfMeter = createSlideshowPerformanceMeter({
        host: controls,
        label: 'Lanes'
    });
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
        const normalized = String(nextMode || '').trim().toLowerCase();
        modeRef.mode = (normalized === '3d' || normalized === '3d-reverse') ? normalized : 'flat';
        root.classList.toggle('is-mode-3d', modeRef.mode === '3d');
        root.classList.toggle('is-mode-3d-reverse', modeRef.mode === '3d-reverse');
        root.classList.toggle('is-mode-flat', modeRef.mode === 'flat');
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
            onFrameSample: (sample) => perfMeter.onRenderSample(sample),
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
        perfMeter.destroy();
    });
}
