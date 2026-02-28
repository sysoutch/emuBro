export function renderGamesAsRandom(gamesToRender, options = {}) {
    const gamesContainer = document.getElementById('games-container');
    if (!gamesContainer) return;
    const renderToken = options.renderToken;
    const getRenderToken = typeof options.getRenderToken === 'function' ? options.getRenderToken : () => renderToken;
    const setGamesScrollDetach = typeof options.setGamesScrollDetach === 'function'
        ? options.setGamesScrollDetach
        : () => {};
    const buildViewGamePool = typeof options.buildViewGamePool === 'function' ? options.buildViewGamePool : (rows) => rows;
    const maxPoolSize = Number(options.maxPoolSize) || 0;
    const showGameDetails = typeof options.showGameDetails === 'function' ? options.showGameDetails : () => {};
    const escapeHtml = typeof options.escapeHtml === 'function' ? options.escapeHtml : (value) => String(value ?? '');
    const cleanupLazyGameImages = typeof options.cleanupLazyGameImages === 'function' ? options.cleanupLazyGameImages : () => {};
    const initializeLazyGameImages = typeof options.initializeLazyGameImages === 'function'
        ? options.initializeLazyGameImages
        : () => {};
    const lazyPlaceholderSrc = String(options.lazyPlaceholderSrc || '');
    const i18n = options.i18n;

    const randomContainer = document.createElement('div');
    randomContainer.className = 'random-container random-container--slot';
    const spinGames = buildViewGamePool(gamesToRender, maxPoolSize);

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

    const strip = document.createElement('div');
    strip.className = 'slot-strip glass';
    const stripTrack = document.createElement('div');
    stripTrack.className = 'slot-strip-track';
    strip.appendChild(stripTrack);

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
    machine.appendChild(strip);

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

    function renderSelectionStrip(centerIdx) {
        const radius = 8;
        const preview = [];
        for (let offset = -radius; offset <= radius; offset += 1) {
            const gameIdx = (centerIdx + offset + baseLen) % baseLen;
            preview.push({ offset, gameIdx });
        }

        stripTrack.innerHTML = preview.map(({ offset, gameIdx }) => {
            const game = spinGames[gameIdx];
            const safeName = escapeHtml(game?.name || '');
            const safeImage = escapeHtml(getGameImage(game) || '');
            const isActive = offset === 0;
            const src = lazyPlaceholderSrc || safeImage;
            return `
                <button
                    type="button"
                    class="slot-strip-item${isActive ? ' is-active' : ''}"
                    data-slot-preview-index="${gameIdx}"
                    aria-label="${safeName}"
                >
                    <img class="slot-strip-image lazy-game-image is-pending" src="${src}" data-lazy-src="${safeImage}" alt="${safeName}" loading="lazy" decoding="async" fetchpriority="low" />
                    <span class="slot-strip-name">${safeName}</span>
                </button>
            `;
        }).join('');

        initializeLazyGameImages(stripTrack);
        const activeItem = stripTrack.querySelector('.slot-strip-item.is-active');
        if (activeItem && typeof activeItem.scrollIntoView === 'function') {
            activeItem.scrollIntoView({
                behavior: reduceMotion ? 'auto' : 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
    }

    function setResult(idx, options = {}) {
        const game = spinGames[idx];
        const platformName = game.platform || game.platformShortName || i18n.t('gameDetails.unknown');
        const ratingText = (game.rating !== undefined && game.rating !== null) ? `${game.rating}` : i18n.t('gameDetails.unknown');
        const statusText = game.isInstalled ? 'Installed' : 'Not Installed';

        const immediate = !!options.immediate;

        resultTitle.textContent = game.name;
        resultMeta.innerHTML = `
            <span class="slot-meta-pill">${platformName}</span>
            <span class="slot-meta-pill">Rating: ${ratingText}</span>
            <span class="slot-meta-pill">${statusText}</span>
            <span class="slot-meta-pill">${idx + 1} / ${spinGames.length}</span>
        `;

        if (immediate) {
            result.classList.add('is-visible');
        } else {
            result.classList.remove('is-visible');
            // Small timeout to allow CSS to reset if it was already visible from previous spin
            setTimeout(() => {
                if (spinning) return;
                result.classList.add('is-visible');
            }, 50);
        }

        renderSelectionStrip(idx);
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
        const src = lazyPlaceholderSrc || safeImage;
        item.innerHTML = `
            <img class="slot-item-image lazy-game-image is-pending" src="${src}" data-lazy-src="${safeImage}" alt="${safeName}" loading="lazy" decoding="async" fetchpriority="low" />
            <div class="slot-item-caption">${safeName}</div>
        `;
        reelInner.appendChild(item);
    });
    initializeLazyGameImages(reelInner);

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
        if (renderToken !== getRenderToken()) return;
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
            if (renderToken !== getRenderToken()) return;
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
        
        // Calculate target position in current or next blocks to ensure we always move forward
        const targetReelIdx = gameIdx + (Math.floor(absPos / itemStep) + baseLen * 3);
        const targetAbsPos = (targetReelIdx * itemStep) - alignOffset;
        
        const duration = reduceMotion ? 0 : 2800; // Longer, more natural deceleration

        machine.classList.remove('is-spinning');
        machine.classList.add('is-stopping');

        // Custom easing for smooth deceleration (easeOutQuart-like)
        const start = performance.now();
        const startPos = absPos;
        const delta = targetAbsPos - startPos;

        function step(ts) {
            if (renderToken !== getRenderToken()) return;
            if (!randomContainer.isConnected) return;
            const t = Math.min(1, (ts - start) / duration);
            
            // easeOutQuart
            const e = 1 - Math.pow(1 - t, 4);
            
            absPos = startPos + delta * e;
            renderPos();
            
            if (t < 1) {
                rafId = requestAnimationFrame(step);
            } else {
                absPos = targetAbsPos;
                renderPos();
                spinning = false;
                machine.classList.remove('is-stopping');
                leverBtn.disabled = false;
                leverBtn.textContent = 'SPIN';
                setResult(gameIdx, { immediate: false });
            }
        }

        rafId = requestAnimationFrame(step);
    }

    function startSpin() {
        if (renderToken !== getRenderToken()) return;
        if (!randomContainer.isConnected) return;
        if (spinning) return;
        spinning = true;
        leverBtn.disabled = true;
        leverBtn.textContent = 'SPINNING...';
        machine.classList.add('is-spinning');
        result.classList.remove('is-visible');

        // Visual lever "pull" feedback
        leverBtn.classList.add('is-active');
        setTimeout(() => {
            leverBtn.classList.remove('is-active');
        }, 400);

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
                startSpin();
            }, 50);
            return;
        }

        if (reduceMotion) {
            selectedIndex = Math.floor(Math.random() * spinGames.length);
            stopSpinTo(selectedIndex);
            return;
        }

        // Phase 1: Acceleration
        const maxSpeed = 3200;
        const accelDuration = 800;
        const startTs = performance.now();
        let lastTs = startTs;

        function tick(ts) {
            if (renderToken !== getRenderToken()) return;
            if (!randomContainer.isConnected) return;
            const elapsed = ts - startTs;
            const dt = Math.min(0.05, (ts - lastTs) / 1000);
            lastTs = ts;

            // Smooth acceleration
            const currentSpeed = maxSpeed * Math.min(1, elapsed / accelDuration);
            absPos += currentSpeed * dt;
            renderPos();

            if (elapsed < accelDuration + 400) {
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

    stripTrack.addEventListener('click', (event) => {
        const button = event.target.closest('.slot-strip-item[data-slot-preview-index]');
        if (!button || spinning) return;
        const idx = Number.parseInt(button.dataset.slotPreviewIndex || '-1', 10);
        if (!Number.isFinite(idx) || idx < 0 || idx >= spinGames.length) return;
        selectedIndex = idx;
        setResult(selectedIndex);
        if (metricsReady) snapToGameIndex(selectedIndex);
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
        if (renderToken !== getRenderToken()) return;
        if (!randomContainer.isConnected) return;
        measure();
        snapToGameIndex(selectedIndex);
        setResult(selectedIndex, { immediate: true });
    });

    setGamesScrollDetach(() => {
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
    });
}
