import { attachGameCardContextMenu } from '../game-card-context-menu';

const RANDOM_VIEW_MODE_KEY = 'emuBro.randomViewMode';
const RETRO_SLOT_ASSET_BASE = './assets/random';
const RETRO_SLOT_SYMBOLS = [
    { key: 'mushroom-red', label: 'Mushroom', src: `${RETRO_SLOT_ASSET_BASE}/slot-symbol-mushroom.svg`, tone: 'red' },
    { key: 'coin', label: 'Coin', src: `${RETRO_SLOT_ASSET_BASE}/slot-symbol-coin.svg`, tone: 'gold' },
    { key: 'star', label: 'Star', src: `${RETRO_SLOT_ASSET_BASE}/slot-symbol-star.svg`, tone: 'gold' },
    { key: 'mushroom-green', label: 'Mushroom', src: `${RETRO_SLOT_ASSET_BASE}/slot-symbol-mushroom.svg`, tone: 'green' },
    { key: 'question', label: 'Mystery', src: `${RETRO_SLOT_ASSET_BASE}/slot-symbol-question.svg`, tone: 'amber' },
    { key: 'key', label: 'Key', src: `${RETRO_SLOT_ASSET_BASE}/slot-symbol-key.svg`, tone: 'gold' }
];

function normalizeRandomViewMode(value) {
    return String(value || '').trim().toLowerCase() === 'slot' ? 'slot' : 'slider';
}

function readStoredRandomMode() {
    try {
        return normalizeRandomViewMode(window.localStorage?.getItem?.(RANDOM_VIEW_MODE_KEY) || 'slider');
    } catch (_error) {
        return 'slider';
    }
}

function writeStoredRandomMode(mode) {
    try {
        window.localStorage?.setItem?.(RANDOM_VIEW_MODE_KEY, normalizeRandomViewMode(mode));
    } catch (_error) {}
}

function wrapIndex(index, length) {
    if (!Number.isFinite(length) || length <= 0) return 0;
    return ((index % length) + length) % length;
}

function buildRepeatedSequence(items, minLength) {
    if (!Array.isArray(items) || items.length === 0) return [];
    const required = Math.max(items.length, Number(minLength) || items.length);
    const result = [];
    while (result.length < required) {
        result.push(...items);
    }
    return result.slice(0, required);
}

export function renderGamesAsRandom(gamesToRender, options = {}) {
    const gamesContainer = document.getElementById('games-container');
    if (!gamesContainer) return;
    const scrollRootCandidates = [
        gamesContainer,
        gamesContainer.parentElement,
        gamesContainer.closest('.game-scroll-body'),
        gamesContainer.closest('main.game-grid'),
        document.scrollingElement,
        document.documentElement,
        document.body
    ];
    let ancestor = gamesContainer.parentElement;
    while (ancestor) {
        scrollRootCandidates.push(ancestor);
        ancestor = ancestor.parentElement;
    }
    const scrollRoots = Array.from(new Set(
        scrollRootCandidates.filter((node) => node && typeof node.scrollLeft !== 'undefined')
    ));

    const renderToken = options.renderToken;
    const getRenderToken = typeof options.getRenderToken === 'function' ? options.getRenderToken : () => renderToken;
    const setGamesScrollDetach = typeof options.setGamesScrollDetach === 'function'
        ? options.setGamesScrollDetach
        : () => {};
    const buildViewGamePool = typeof options.buildViewGamePool === 'function' ? options.buildViewGamePool : (rows) => rows;
    const maxPoolSize = Number(options.maxPoolSize) || 0;
    const showGameDetails = typeof options.showGameDetails === 'function' ? options.showGameDetails : () => {};
    const launchGame = typeof options.launchGame === 'function' ? options.launchGame : (async () => {});
    const removeGame = typeof options.removeGame === 'function' ? options.removeGame : (async () => {});
    const escapeHtml = typeof options.escapeHtml === 'function' ? options.escapeHtml : (value) => String(value ?? '');
    const cleanupLazyGameImages = typeof options.cleanupLazyGameImages === 'function' ? options.cleanupLazyGameImages : () => {};
    const initializeLazyGameImages = typeof options.initializeLazyGameImages === 'function'
        ? options.initializeLazyGameImages
        : () => {};
    const lazyPlaceholderSrc = String(options.lazyPlaceholderSrc || '');
    const i18n = options.i18n;
    const emubro = options.emubro || window.emubro;
    const alertUser = typeof options.alertUser === 'function' ? options.alertUser : (message) => window.alert(String(message || ''));
    const requestRandomModeRerender = typeof options.requestRandomModeRerender === 'function'
        ? options.requestRandomModeRerender
        : () => {};

    const randomViewMode = normalizeRandomViewMode(options.randomViewMode || readStoredRandomMode());
    const isSliderMode = randomViewMode === 'slider';
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const randomContainer = document.createElement('div');
    randomContainer.className = `random-container random-container--${randomViewMode}`;

    const clampOuterScroll = () => {
        scrollRoots.forEach((root) => {
            if (!root || !root.isConnected) return;
            if (Math.abs(Number(root.scrollLeft || 0)) < 0.5) return;
            try {
                root.scrollLeft = 0;
            } catch (_error) {}
        });
    };
    const onScrollRootScroll = () => {
        clampOuterScroll();
    };
    let horizontalClampRafId = null;
    const runHorizontalClampLoop = () => {
        if (renderToken !== getRenderToken()) return;
        if (!randomContainer.isConnected) return;
        clampOuterScroll();
        horizontalClampRafId = window.requestAnimationFrame(runHorizontalClampLoop);
    };
    scrollRoots.forEach((root) => {
        root.classList.add('random-scroll-lock-x');
        root.addEventListener('scroll', onScrollRootScroll, { passive: true });
    });
    clampOuterScroll();
    horizontalClampRafId = window.requestAnimationFrame(runHorizontalClampLoop);

    const spinGames = buildViewGamePool(gamesToRender, maxPoolSize);
    if (!spinGames || spinGames.length === 0) {
        randomContainer.innerHTML = `<div class="slot-empty">No games to spin.</div>`;
        gamesContainer.appendChild(randomContainer);
        return;
    }

    const baseLen = spinGames.length;
    let selectedIndex = Math.floor(Math.random() * baseLen);

    function buildModeToggleMarkup() {
        return `
            <div class="slot-mode-toggle" role="group" aria-label="Random view mode">
                <button type="button" class="slot-mode-btn${isSliderMode ? ' is-active' : ''}" data-random-mode="slider" aria-pressed="${isSliderMode ? 'true' : 'false'}">Slider</button>
                <button type="button" class="slot-mode-btn${!isSliderMode ? ' is-active' : ''}" data-random-mode="slot" aria-pressed="${!isSliderMode ? 'true' : 'false'}">Slot</button>
            </div>
        `;
    }

    function buildLazyImageMarkup({ safeImage, safeName, className }) {
        const src = lazyPlaceholderSrc || safeImage;
        return `<img class="${className} lazy-game-image is-pending" src="${src}" data-lazy-src="${safeImage}" alt="${safeName}" loading="lazy" decoding="async" fetchpriority="low" />`;
    }

    function getGameImage(game) {
        let gameImageToUse = game && game.image;
        if (!gameImageToUse && game && game.platformShortName) {
            const platformShortName = game.platformShortName.toLowerCase();
            gameImageToUse = `emubro-resources/platforms/${platformShortName}/covers/default.jpg`;
        }
        return gameImageToUse;
    }

    function bindContextMenu(target, game) {
        if (!(target instanceof Element) || !game) return;
        attachGameCardContextMenu(target, game, {
            i18n,
            emubro,
            alertUser,
            launchGame,
            showGameDetails,
            removeGame
        });
    }

    function buildSliderItemMarkup(game) {
        const safeName = escapeHtml(game?.name || '');
        const safeImage = escapeHtml(getGameImage(game) || '');
        const safePlatform = escapeHtml(game?.platformShortName || game?.platform || '');
        return `
            ${buildLazyImageMarkup({ safeImage, safeName, className: 'slot-item-image' })}
            <div class="slot-item-caption">
                <span class="slot-item-caption-name">${safeName}</span>
                ${safePlatform ? `<span class="slot-item-caption-platform">${safePlatform}</span>` : ''}
            </div>
        `;
    }

    function buildRetroSymbolMarkup(symbol, itemIndex, activeIndex) {
        const safeLabel = escapeHtml(symbol?.label || '');
        const safeSrc = escapeHtml(symbol?.src || '');
        const isActiveTile = itemIndex === activeIndex;
        return `
            <div class="slot-retro-tile slot-retro-tile--symbol${isActiveTile ? ' is-active' : ''}" aria-label="${safeLabel}">
                <div class="slot-retro-tile-inner">
                    <img class="slot-retro-symbol slot-retro-symbol--${escapeHtml(symbol?.tone || 'gold')}" src="${safeSrc}" alt="${safeLabel}" loading="lazy" decoding="async" />
                </div>
            </div>
        `;
    }

    function buildRetroGameMarkup(game, itemIndex, activeIndex) {
        const safeName = escapeHtml(game?.name || '');
        const safeImage = escapeHtml(getGameImage(game) || '');
        const safePlatform = escapeHtml(game?.platformShortName || game?.platform || '');
        const isActiveTile = itemIndex === activeIndex;
        return `
            <div class="slot-retro-tile slot-retro-tile--game${isActiveTile ? ' is-active' : ''}" data-slot-game-index="${escapeHtml(String(spinGames.indexOf(game)))}">
                <div class="slot-retro-tile-inner">
                    ${buildLazyImageMarkup({ safeImage, safeName, className: 'slot-retro-game-image' })}
                    <div class="slot-retro-game-caption">
                        <span class="slot-retro-game-name">${safeName}</span>
                        ${safePlatform ? `<span class="slot-retro-game-platform">${safePlatform}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    const machine = document.createElement('div');
    machine.className = `slot-machine slot-machine--${randomViewMode}`;

    const marquee = document.createElement('div');
    marquee.className = `slot-marquee${isSliderMode ? '' : ' slot-marquee--slot'}`;
    marquee.innerHTML = isSliderMode
        ? `
            <div class="slot-marquee-title">Lucky Shuffle</div>
            <div class="slot-marquee-sub">Spin to discover your next adventure.</div>
            ${buildModeToggleMarkup()}
        `
        : buildModeToggleMarkup();

    const stage = document.createElement('div');
    stage.className = `slot-stage${isSliderMode ? '' : ' slot-stage--retro'}`;

    const cabinet = document.createElement('div');
    cabinet.className = `slot-cabinet${isSliderMode ? '' : ' slot-cabinet--retro'}`;

    const result = document.createElement('div');
    result.className = 'slot-result glass';
    result.classList.add('slot-result-clickable');
    result.tabIndex = 0;
    result.setAttribute('role', 'button');
    result.setAttribute('aria-label', 'Open selected game details');

    const resultTitle = document.createElement('div');
    resultTitle.className = 'slot-result-title';
    const resultMeta = document.createElement('div');
    resultMeta.className = 'slot-result-meta';
    result.appendChild(resultTitle);
    result.appendChild(resultMeta);

    let windowEl = null;
    let reelInner = null;
    let leverBtn = null;
    let retroHandleBtn = null;
    let retroLeftTrack = null;
    let retroMidTrack = null;
    let retroGameTrack = null;

    if (isSliderMode) {
        windowEl = document.createElement('div');
        windowEl.className = 'slot-window';

        const reel = document.createElement('div');
        reel.className = 'slot-reel';
        reelInner = document.createElement('div');
        reelInner.className = 'slot-reel-inner';

        const payline = document.createElement('div');
        payline.className = 'slot-payline';
        payline.setAttribute('aria-hidden', 'true');

        const controls = document.createElement('div');
        controls.className = 'slot-controls';
        leverBtn = document.createElement('button');
        leverBtn.type = 'button';
        leverBtn.className = 'action-btn slot-lever slot-lever--slider';
        leverBtn.innerHTML = `
            <span class="slot-spin-main">SPIN</span>
            <span class="slot-spin-sub">SPIN AGAIN</span>
        `;

        reel.appendChild(reelInner);
        windowEl.appendChild(reel);
        windowEl.appendChild(payline);
        cabinet.appendChild(windowEl);
        controls.appendChild(leverBtn);

        stage.appendChild(cabinet);
        stage.appendChild(controls);
    } else {
        const retroFrame = document.createElement('div');
        retroFrame.className = 'slot-retro-frame';
        // Keep frame asset path deterministic across bundlers and runtimes.
        retroFrame.style.backgroundImage = `url('${RETRO_SLOT_ASSET_BASE}/slot-cabinet-frame.svg')`;

        const retroShell = document.createElement('div');
        retroShell.className = 'slot-retro-shell';
        retroShell.innerHTML = `
            <div class="slot-retro-sign" aria-hidden="true">
                <div class="slot-retro-sign-main">Lucky Shuffle</div>
                <div class="slot-retro-sign-sub">emuBro Slots</div>
            </div>
            <div class="slot-retro-reels">
                <div class="slot-retro-arrow slot-retro-arrow--left" aria-hidden="true"></div>
                <div class="slot-retro-window slot-retro-window--symbol slot-retro-window--left">
                    <div class="slot-retro-track slot-retro-track--left"></div>
                </div>
                <div class="slot-retro-window slot-retro-window--symbol slot-retro-window--mid">
                    <div class="slot-retro-track slot-retro-track--mid"></div>
                </div>
                <div class="slot-retro-window slot-retro-window--game">
                    <div class="slot-retro-track slot-retro-track--game"></div>
                </div>
                <div class="slot-retro-arrow slot-retro-arrow--right" aria-hidden="true"></div>
            </div>
            <div class="slot-retro-console">
                <button type="button" class="slot-retro-mini-btn" data-slot-console="bet">MAX BET</button>
                <div class="slot-retro-spin-host"></div>
                <button type="button" class="slot-retro-mini-btn slot-retro-mini-btn--art" data-slot-console="art">GAME ART</button>
            </div>
            <div class="slot-retro-footer">
                <div class="slot-retro-credit-panel">Credits: 1,500</div>
            </div>
            <button type="button" class="slot-retro-handle" aria-label="Pull slot lever"></button>
        `;

        retroLeftTrack = retroShell.querySelector('.slot-retro-track--left');
        retroMidTrack = retroShell.querySelector('.slot-retro-track--mid');
        retroGameTrack = retroShell.querySelector('.slot-retro-track--game');
        retroHandleBtn = retroShell.querySelector('.slot-retro-handle');

        leverBtn = document.createElement('button');
        leverBtn.type = 'button';
        leverBtn.className = 'action-btn slot-lever slot-lever--retro';
        leverBtn.innerHTML = `
            <span class="slot-retro-spin-main">SPIN</span>
            <span class="slot-retro-spin-sub">PULL FOR LUCK</span>
        `;
        retroShell.querySelector('.slot-retro-spin-host')?.appendChild(leverBtn);

        const artButton = retroShell.querySelector('[data-slot-console="art"]');
        if (artButton) {
            artButton.addEventListener('click', () => {
                const game = spinGames[selectedIndex];
                if (game) showGameDetails(game);
            });
        }

        cabinet.appendChild(retroFrame);
        cabinet.appendChild(retroShell);
        stage.appendChild(cabinet);
    }

    machine.appendChild(marquee);
    machine.appendChild(stage);
    machine.appendChild(result);

    randomContainer.appendChild(machine);
    gamesContainer.appendChild(randomContainer);

    const modeButtons = Array.from(marquee.querySelectorAll('.slot-mode-btn[data-random-mode]'));
    modeButtons.forEach((button) => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            const nextMode = normalizeRandomViewMode(button.dataset.randomMode || '');
            if (nextMode === randomViewMode) return;
            writeStoredRandomMode(nextMode);
            requestRandomModeRerender();
        });
    });

    let lastShownIndex = -1;
    function setSelectionPreview(idx, previewOptions = {}) {
        if (!Number.isFinite(idx) || idx < 0 || idx >= baseLen) return;
        if (!previewOptions.force && idx === lastShownIndex) return;
        lastShownIndex = idx;

        const game = spinGames[idx];
        const platformName = game.platform || game.platformShortName || i18n.t('gameDetails.unknown');
        const ratingText = (game.rating !== undefined && game.rating !== null) ? `${game.rating}` : i18n.t('gameDetails.unknown');
        const statusText = game.isInstalled ? 'Installed' : 'Not Installed';

        resultTitle.textContent = game?.name || '';
        resultMeta.innerHTML = `
            <span class="slot-meta-pill">${platformName}</span>
            <span class="slot-meta-pill">Rating: ${ratingText}</span>
            <span class="slot-meta-pill">${statusText}</span>
            <span class="slot-meta-pill">${idx + 1} / ${baseLen}</span>
        `;

        bindContextMenu(result, game);
    }

    function setResult(idx, resultOptions = {}) {
        setSelectionPreview(idx, { force: true });
        const immediate = !!resultOptions.immediate;
        const keepVisible = !!resultOptions.keepVisible;

        if (immediate || keepVisible) {
            result.classList.add('is-visible');
            return;
        }

        result.classList.remove('is-visible');
        window.setTimeout(() => {
            if (spinning) return;
            result.classList.add('is-visible');
        }, 50);
    }

    const reelIndexToGameIndex = [];
    const targetReelItems = 96;
    const repeatBlocks = Math.max(3, Math.ceil(targetReelItems / Math.max(1, baseLen)));
    if (isSliderMode && reelInner) {
        for (let b = 0; b < repeatBlocks; b += 1) {
            for (let i = 0; i < baseLen; i += 1) {
                reelIndexToGameIndex.push(i);
            }
        }

        reelIndexToGameIndex.forEach((gameIdx) => {
            const item = document.createElement('div');
            item.className = 'slot-item';
            item.innerHTML = buildSliderItemMarkup(spinGames[gameIdx]);
            reelInner.appendChild(item);
        });
        initializeLazyGameImages(reelInner);
    }

    function getRetroSymbol(offset) {
        return RETRO_SLOT_SYMBOLS[wrapIndex(offset, RETRO_SLOT_SYMBOLS.length)];
    }

    function renderRetroTrack(trackEl, items, markupBuilder, renderOptions = {}) {
        if (!(trackEl instanceof Element)) return;
        const activeIndex = Number.isFinite(renderOptions.activeIndex) ? renderOptions.activeIndex : 1;
        const looping = !!renderOptions.looping;
        trackEl.classList.toggle('is-looping', looping);
        trackEl.innerHTML = items.map((item, index) => markupBuilder(item, index, activeIndex)).join('');

        if (markupBuilder === buildRetroGameMarkup) {
            initializeLazyGameImages(trackEl);
            Array.from(trackEl.querySelectorAll('.slot-retro-tile--game[data-slot-game-index]')).forEach((tile) => {
                const gameIdx = Number.parseInt(tile.dataset.slotGameIndex || '-1', 10);
                if (Number.isFinite(gameIdx) && gameIdx >= 0 && gameIdx < baseLen) {
                    bindContextMenu(tile, spinGames[gameIdx]);
                }
            });
        }
    }

    function renderRetroStaticState(gameIdx) {
        if (isSliderMode) return;
        const leftSymbols = [
            getRetroSymbol(gameIdx),
            getRetroSymbol(gameIdx + 1),
            getRetroSymbol(gameIdx + 2)
        ];
        const midSymbols = [
            getRetroSymbol(gameIdx + 2),
            getRetroSymbol(gameIdx + 3),
            getRetroSymbol(gameIdx + 4)
        ];
        const visibleGames = [
            spinGames[wrapIndex(gameIdx - 1, baseLen)],
            spinGames[wrapIndex(gameIdx, baseLen)],
            spinGames[wrapIndex(gameIdx + 1, baseLen)]
        ];

        renderRetroTrack(retroLeftTrack, leftSymbols, buildRetroSymbolMarkup, { activeIndex: 1 });
        renderRetroTrack(retroMidTrack, midSymbols, buildRetroSymbolMarkup, { activeIndex: 1 });
        renderRetroTrack(retroGameTrack, visibleGames, buildRetroGameMarkup, { activeIndex: 1 });
    }

    function renderRetroSpinningState(seed) {
        if (isSliderMode) return;
        const symbolLoopLeft = buildRepeatedSequence(
            RETRO_SLOT_SYMBOLS.map((_value, index) => getRetroSymbol(seed + index)),
            12
        );
        const symbolLoopMid = buildRepeatedSequence(
            RETRO_SLOT_SYMBOLS.map((_value, index) => getRetroSymbol(seed + index + 2)),
            12
        );
        const gameLoop = [];
        for (let i = 0; i < 12; i += 1) {
            gameLoop.push(spinGames[wrapIndex(seed + i, baseLen)]);
        }

        renderRetroTrack(retroLeftTrack, symbolLoopLeft, buildRetroSymbolMarkup, { activeIndex: -1, looping: true });
        renderRetroTrack(retroMidTrack, symbolLoopMid, buildRetroSymbolMarkup, { activeIndex: -1, looping: true });
        renderRetroTrack(retroGameTrack, gameLoop, buildRetroGameMarkup, { activeIndex: -1, looping: true });
    }

    let metricsReady = false;
    let itemStep = 0;
    let totalSpan = 0;
    let alignOffset = 0;
    let absPos = 0;
    let rafId = null;
    let retrySpinTimer = null;
    let anticipationTimer = null;
    let hitTimer = null;
    let slotStopTimers = [];
    let spinning = false;
    let lastShufflePreviewAt = 0;

    function queueSlotStop(callback, delayMs) {
        const timerId = window.setTimeout(() => {
            slotStopTimers = slotStopTimers.filter((value) => value !== timerId);
            callback();
        }, delayMs);
        slotStopTimers.push(timerId);
    }

    function clearSlotStopTimers() {
        slotStopTimers.forEach((timerId) => window.clearTimeout(timerId));
        slotStopTimers = [];
    }

    function setLeverSpinningState(isSpinning) {
        if (leverBtn) {
            leverBtn.disabled = !!isSpinning;
            leverBtn.classList.toggle('is-spinning', !!isSpinning);
            leverBtn.setAttribute('aria-busy', isSpinning ? 'true' : 'false');
        }
        if (retroHandleBtn) {
            retroHandleBtn.disabled = !!isSpinning;
            retroHandleBtn.classList.toggle('is-spinning', !!isSpinning);
            retroHandleBtn.setAttribute('aria-busy', isSpinning ? 'true' : 'false');
        }
    }

    function measure() {
        if (!isSliderMode) {
            metricsReady = true;
            return;
        }
        const first = reelInner?.querySelector('.slot-item');
        if (!first || !windowEl) return;
        const rect = first.getBoundingClientRect();
        const cs = window.getComputedStyle(first);
        const winRect = windowEl.getBoundingClientRect();
        const mr = parseFloat(cs.marginRight || '0') || 0;
        itemStep = rect.width + mr;
        totalSpan = itemStep * reelIndexToGameIndex.length;
        alignOffset = (winRect.width - rect.width) / 2;
        metricsReady = itemStep > 0 && totalSpan > 0;
    }

    function renderPos() {
        if (!isSliderMode || !reelInner || !metricsReady) return;
        if (renderToken !== getRenderToken()) return;
        if (!randomContainer.isConnected) return;
        const mod = ((absPos % totalSpan) + totalSpan) % totalSpan;
        reelInner.style.transform = `translate3d(${-mod}px, 0, 0)`;
    }

    function snapToGameIndex(gameIdx) {
        if (!Number.isFinite(gameIdx)) return;
        if (!isSliderMode) {
            renderRetroStaticState(gameIdx);
            return;
        }
        if (!metricsReady) return;
        const block = Math.floor((reelIndexToGameIndex.length / baseLen) / 2);
        const reelIdx = gameIdx + block * baseLen;
        const desired = (reelIdx * itemStep) - alignOffset;
        const desiredMod = ((desired % totalSpan) + totalSpan) % totalSpan;
        absPos = desiredMod;
        renderPos();
    }

    function clearMotionTimers() {
        clearSlotStopTimers();
        if (retrySpinTimer) {
            window.clearTimeout(retrySpinTimer);
            retrySpinTimer = null;
        }
        if (anticipationTimer) {
            window.clearTimeout(anticipationTimer);
            anticipationTimer = null;
        }
        if (hitTimer) {
            window.clearTimeout(hitTimer);
            hitTimer = null;
        }
    }

    function triggerHitPulse() {
        machine.classList.remove('is-hit');
        void machine.offsetWidth;
        machine.classList.add('is-hit');
        hitTimer = window.setTimeout(() => {
            machine.classList.remove('is-hit');
            hitTimer = null;
        }, 860);
    }

    function getCurrentPreviewIndexFromPosition() {
        if (!metricsReady || itemStep <= 0) return selectedIndex;
        const raw = Math.round((absPos + alignOffset) / itemStep);
        const reelLen = reelIndexToGameIndex.length;
        const reelIdx = wrapIndex(raw, reelLen);
        const previewIdx = reelIndexToGameIndex[reelIdx];
        return Number.isFinite(previewIdx) ? previewIdx : selectedIndex;
    }

    function maybeUpdateShufflePreview(ts) {
        if (!isSliderMode || !spinning) return;
        if ((ts - lastShufflePreviewAt) < 96) return;
        lastShufflePreviewAt = ts;
        const previewIdx = getCurrentPreviewIndexFromPosition();
        selectedIndex = previewIdx;
        setSelectionPreview(previewIdx, { force: true });
    }

    function stopSliderSpinTo(gameIdx) {
        if (!metricsReady) return;
        const targetReelIdx = gameIdx + (Math.floor(absPos / itemStep) + (baseLen * 4));
        const targetAbsPos = (targetReelIdx * itemStep) - alignOffset;
        const duration = reduceMotion ? 0 : 1450;

        machine.classList.remove('is-spinning');
        machine.classList.add('is-stopping');

        const start = performance.now();
        const startPos = absPos;
        const delta = targetAbsPos - startPos;

        function step(ts) {
            if (renderToken !== getRenderToken()) return;
            if (!randomContainer.isConnected) return;
            const t = Math.min(1, (ts - start) / duration);
            const e = 1 - Math.pow(1 - t, 4);
            absPos = startPos + delta * e;
            renderPos();

            if (t < 1) {
                rafId = requestAnimationFrame(step);
                return;
            }

            absPos = targetAbsPos;
            renderPos();
            spinning = false;
            machine.classList.remove('is-stopping');
            setLeverSpinningState(false);
            setResult(gameIdx, { immediate: false });
            triggerHitPulse();
        }

        rafId = requestAnimationFrame(step);
    }

    function stopRetroSpinTo(gameIdx) {
        const leftSeed = (gameIdx * 2) + 1;
        const midSeed = (gameIdx * 3) + 4;
        machine.classList.add('is-stopping');

        queueSlotStop(() => {
            renderRetroTrack(
                retroLeftTrack,
                [getRetroSymbol(leftSeed), getRetroSymbol(leftSeed + 1), getRetroSymbol(leftSeed + 2)],
                buildRetroSymbolMarkup,
                { activeIndex: 1 }
            );
        }, 760);

        queueSlotStop(() => {
            renderRetroTrack(
                retroMidTrack,
                [getRetroSymbol(midSeed), getRetroSymbol(midSeed + 1), getRetroSymbol(midSeed + 2)],
                buildRetroSymbolMarkup,
                { activeIndex: 1 }
            );
        }, 1040);

        queueSlotStop(() => {
            renderRetroStaticState(gameIdx);
            spinning = false;
            machine.classList.remove('is-spinning');
            machine.classList.remove('is-stopping');
            setLeverSpinningState(false);
            setResult(gameIdx, { immediate: false });
            triggerHitPulse();
        }, reduceMotion ? 80 : 1360);
    }

    function beginSpinCycle() {
        machine.classList.remove('is-primed');
        machine.classList.add('is-spinning');
        leverBtn?.classList.remove('is-active');
        retroHandleBtn?.classList.remove('is-active');

        if (!metricsReady) measure();
        if (!metricsReady) {
            if (retrySpinTimer) {
                window.clearTimeout(retrySpinTimer);
            }
            retrySpinTimer = window.setTimeout(() => {
                retrySpinTimer = null;
                if (renderToken !== getRenderToken()) return;
                if (!randomContainer.isConnected) return;
                measure();
                beginSpinCycle();
            }, 50);
            return;
        }

        if (reduceMotion) {
            selectedIndex = Math.floor(Math.random() * baseLen);
            if (isSliderMode) {
                stopSliderSpinTo(selectedIndex);
            } else {
                renderRetroStaticState(selectedIndex);
                stopRetroSpinTo(selectedIndex);
            }
            return;
        }

        if (isSliderMode) {
            const maxSpeed = 4600;
            const accelDuration = 620;
            const spinTime = 980;
            const startTs = performance.now();
            let lastTs = startTs;

            function tick(ts) {
                if (renderToken !== getRenderToken()) return;
                if (!randomContainer.isConnected) return;
                const elapsed = ts - startTs;
                const dt = Math.min(0.05, (ts - lastTs) / 1000);
                lastTs = ts;
                const currentSpeed = maxSpeed * Math.min(1, elapsed / accelDuration);
                absPos += currentSpeed * dt;
                renderPos();
                maybeUpdateShufflePreview(ts);

                if (elapsed < spinTime) {
                    rafId = requestAnimationFrame(tick);
                    return;
                }

                selectedIndex = Math.floor(Math.random() * baseLen);
                stopSliderSpinTo(selectedIndex);
            }

            rafId = requestAnimationFrame(tick);
            return;
        }

        renderRetroSpinningState(Math.floor(Math.random() * baseLen));
        queueSlotStop(() => {
            selectedIndex = Math.floor(Math.random() * baseLen);
            stopRetroSpinTo(selectedIndex);
        }, 220);
    }

    function startSpin() {
        if (renderToken !== getRenderToken()) return;
        if (!randomContainer.isConnected || spinning) return;

        spinning = true;
        clearMotionTimers();
        machine.classList.remove('is-hit');
        machine.classList.add('is-primed');
        setLeverSpinningState(true);

        if (isSliderMode) {
            result.classList.add('is-visible');
            setSelectionPreview(selectedIndex, { force: true });
            lastShufflePreviewAt = 0;
        } else {
            renderRetroSpinningState(selectedIndex);
            result.classList.remove('is-visible');
        }

        leverBtn?.classList.add('is-active');
        retroHandleBtn?.classList.add('is-active');

        if (reduceMotion) {
            beginSpinCycle();
            return;
        }

        anticipationTimer = window.setTimeout(() => {
            anticipationTimer = null;
            if (renderToken !== getRenderToken()) return;
            if (!randomContainer.isConnected) return;
            beginSpinCycle();
        }, isSliderMode ? 180 : 100);
    }

    leverBtn?.addEventListener('click', startSpin);
    retroHandleBtn?.addEventListener('click', startSpin);

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
        if (renderToken !== getRenderToken()) return;
        if (!randomContainer.isConnected) {
            window.removeEventListener('resize', onWindowResize);
            return;
        }

        requestAnimationFrame(() => {
            const wasReady = metricsReady;
            measure();
            if (!metricsReady) return;
            if (spinning) {
                if (wasReady && isSliderMode) renderPos();
                clampOuterScroll();
                return;
            }
            snapToGameIndex(selectedIndex);
            clampOuterScroll();
        });
    };
    window.addEventListener('resize', onWindowResize);

    requestAnimationFrame(() => {
        if (renderToken !== getRenderToken()) return;
        if (!randomContainer.isConnected) return;
        measure();
        snapToGameIndex(selectedIndex);
        setResult(selectedIndex, { immediate: true });
        setLeverSpinningState(false);
        clampOuterScroll();
    });

    setGamesScrollDetach(() => {
        window.removeEventListener('resize', onWindowResize);
        if (horizontalClampRafId !== null) {
            window.cancelAnimationFrame(horizontalClampRafId);
            horizontalClampRafId = null;
        }
        scrollRoots.forEach((root) => {
            if (!root) return;
            root.classList.remove('random-scroll-lock-x');
            root.removeEventListener('scroll', onScrollRootScroll);
            try {
                root.scrollLeft = 0;
            } catch (_error) {}
        });
        clearSlotStopTimers();
        if (rafId) {
            window.cancelAnimationFrame(rafId);
            rafId = null;
        }
        if (retrySpinTimer) {
            window.clearTimeout(retrySpinTimer);
            retrySpinTimer = null;
        }
        if (anticipationTimer) {
            window.clearTimeout(anticipationTimer);
            anticipationTimer = null;
        }
        if (hitTimer) {
            window.clearTimeout(hitTimer);
            hitTimer = null;
        }
        cleanupLazyGameImages(randomContainer);
    });
}
