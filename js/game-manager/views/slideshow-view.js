export function renderGamesAsSlideshow(gamesToRender, options = {}) {
    const SLIDESHOW_MODE_STORAGE_KEY = 'emuBro.slideshowMode';
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
    const initializeLazyGameImages = typeof options.initializeLazyGameImages === 'function'
        ? options.initializeLazyGameImages
        : () => {};
    const cleanupLazyGameImages = typeof options.cleanupLazyGameImages === 'function'
        ? options.cleanupLazyGameImages
        : () => {};
    const lazyPlaceholderSrc = String(options.lazyPlaceholderSrc || '');
    const i18n = options.i18n;
    const t = (key, fallback = 'Unknown') => {
        try {
            if (i18n && typeof i18n.t === 'function') return i18n.t(key);
        } catch (_error) {}
        return fallback;
    };

    const slideshowContainer = document.createElement('div');
    slideshowContainer.className = 'slideshow-container';
    slideshowContainer.tabIndex = 0;
    const slideshowGames = buildViewGamePool(gamesToRender, maxPoolSize);

    if (!slideshowGames || slideshowGames.length === 0) {
        slideshowContainer.innerHTML = '<div class="slideshow-empty">No games to display.</div>';
        gamesContainer.appendChild(slideshowContainer);
        return;
    }

    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

    const showcase = document.createElement('div');
    showcase.className = 'slideshow-showcase';

    const heroButton = document.createElement('button');
    heroButton.type = 'button';
    heroButton.className = 'slideshow-hero-card';
    heroButton.setAttribute('aria-label', 'Open selected game details');
    const heroImage = document.createElement('img');
    heroImage.className = 'slideshow-hero-image';
    heroImage.alt = '';
    heroImage.loading = 'lazy';
    heroImage.decoding = 'async';
    heroButton.appendChild(heroImage);
    const heroFrame = document.createElement('div');
    heroFrame.className = 'slideshow-hero-frame';
    heroFrame.setAttribute('aria-hidden', 'true');
    heroButton.appendChild(heroFrame);

    const stripPanel = document.createElement('div');
    stripPanel.className = 'slideshow-strip-panel glass';
    const stripHeader = document.createElement('div');
    stripHeader.className = 'slideshow-strip-header';
    const stripTitle = document.createElement('div');
    stripTitle.className = 'slideshow-strip-title';
    stripTitle.textContent = 'Up Next';
    const modeTabs = document.createElement('div');
    modeTabs.className = 'slideshow-mode-tabs';
    modeTabs.innerHTML = `
        <button type="button" class="slideshow-mode-tab" data-slideshow-mode="flat">Flat</button>
        <button type="button" class="slideshow-mode-tab" data-slideshow-mode="3d">3D</button>
    `;
    const stripTrack = document.createElement('div');
    stripTrack.className = 'slideshow-strip-track';
    stripHeader.appendChild(stripTitle);
    stripHeader.appendChild(modeTabs);
    stripPanel.appendChild(stripHeader);
    stripPanel.appendChild(stripTrack);

    showcase.appendChild(heroButton);
    showcase.appendChild(stripPanel);

    const footer = document.createElement('div');
    footer.className = 'slideshow-footer';
    const blurb = document.createElement('div');
    blurb.className = 'slideshow-blurb glass';
    const blurbMeta = document.createElement('div');
    blurbMeta.className = 'slideshow-blurb-meta';
    const blurbText = document.createElement('p');
    blurbText.className = 'slideshow-blurb-text';
    blurb.appendChild(blurbMeta);
    blurb.appendChild(blurbText);

    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'slideshow-controls';
    const prevBtn = document.createElement('button');
    prevBtn.className = 'slideshow-btn prev-btn';
    prevBtn.textContent = 'Previous';
    const nextBtn = document.createElement('button');
    nextBtn.className = 'slideshow-btn next-btn';
    nextBtn.textContent = 'Next';
    controlsContainer.appendChild(prevBtn);
    controlsContainer.appendChild(nextBtn);

    footer.appendChild(titleRow);
    footer.appendChild(blurb);
    footer.appendChild(controlsContainer);

    chrome.appendChild(showcase);
    chrome.appendChild(footer);
    backdrops.forEach((el) => slideshowContainer.appendChild(el));
    slideshowContainer.appendChild(chrome);
    gamesContainer.appendChild(slideshowContainer);

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

    const len = slideshowGames.length;
    let currentIndex = 0;
    const STRIP_VISIBLE_COUNT = 14;
    let slideshowMode = (() => {
        try {
            const stored = String(localStorage.getItem(SLIDESHOW_MODE_STORAGE_KEY) || 'flat').trim().toLowerCase();
            return stored === '3d' ? '3d' : 'flat';
        } catch (_error) {
            return 'flat';
        }
    })();

    const AUTO_ADVANCE_MS = 4600;
    let autoAdvanceTimer = null;
    let autoAdvancePaused = false;
    let suppressStripClickUntil = 0;
    let stripInertiaFrame = null;

    function applySlideshowMode(nextMode, options = {}) {
        const persist = options.persist !== false;
        slideshowMode = nextMode === '3d' ? '3d' : 'flat';
        slideshowContainer.classList.toggle('is-mode-3d', slideshowMode === '3d');
        slideshowContainer.classList.toggle('is-mode-flat', slideshowMode === 'flat');
        modeTabs.querySelectorAll('.slideshow-mode-tab').forEach((button) => {
            const isActive = String(button.dataset.slideshowMode || '') === slideshowMode;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
        if (persist) {
            try {
                localStorage.setItem(SLIDESHOW_MODE_STORAGE_KEY, slideshowMode);
            } catch (_error) {}
        }
    }

    function clearAutoAdvance() {
        if (!autoAdvanceTimer) return;
        window.clearTimeout(autoAdvanceTimer);
        autoAdvanceTimer = null;
    }

    function stopStripInertia() {
        if (!stripInertiaFrame) return;
        window.cancelAnimationFrame(stripInertiaFrame);
        stripInertiaFrame = null;
    }

    function scheduleAutoAdvance() {
        clearAutoAdvance();
        if (len <= 1 || autoAdvancePaused) return;
        if (!slideshowContainer.isConnected) return;
        autoAdvanceTimer = window.setTimeout(() => {
            autoAdvanceTimer = null;
            if (renderToken !== getRenderToken()) return;
            if (!slideshowContainer.isConnected || autoAdvancePaused) {
                scheduleAutoAdvance();
                return;
            }
            setIndex(currentIndex + 1);
        }, AUTO_ADVANCE_MS);
    }

    function getStripIndices(centerIdx) {
        const count = Math.min(len, STRIP_VISIBLE_COUNT);
        const indices = [];
        for (let offset = 0; offset < count; offset += 1) {
            indices.push((centerIdx + offset) % len);
        }
        return indices;
    }

    function renderStrip(centerIdx) {
        const stripIndices = getStripIndices(centerIdx);
        stripTrack.innerHTML = stripIndices.map((gameIdx) => {
            const game = slideshowGames[gameIdx];
            const safeName = escapeHtml(game?.name || '');
            const safeImage = escapeHtml(getGameImage(game) || '');
            const isActive = gameIdx === centerIdx;
            const src = lazyPlaceholderSrc || safeImage;
            return `
                <button
                    type="button"
                    class="slideshow-strip-item${isActive ? ' is-active' : ''}"
                    data-slideshow-index="${gameIdx}"
                    aria-label="${safeName}"
                >
                    <img class="slideshow-strip-image lazy-game-image is-pending" src="${src}" data-lazy-src="${safeImage}" alt="${safeName}" loading="lazy" decoding="async" fetchpriority="low" />
                    <span class="slideshow-strip-name">${safeName}</span>
                </button>
            `;
        }).join('');

        initializeLazyGameImages(stripTrack);
        const activeItem = stripTrack.querySelector('.slideshow-strip-item.is-active');
        if (activeItem && typeof activeItem.scrollIntoView === 'function') {
            activeItem.scrollIntoView({
                behavior: reduceMotion ? 'auto' : 'smooth',
                block: 'nearest',
                inline: 'nearest'
            });
        }
    }

    function updateHero(idx) {
        const game = slideshowGames[idx];
        const safeImage = getGameImage(game);
        const statusText = game.isInstalled ? 'Installed' : 'Not Installed';
        const platformName = game.platform || game.platformShortName || t('gameDetails.unknown');
        const ratingText = (game.rating !== undefined && game.rating !== null) ? `${game.rating}` : t('gameDetails.unknown');

        heading.textContent = game.name;
        heroImage.src = safeImage || '';
        heroImage.alt = game.name || '';
        heroButton.dataset.index = String(idx);
        blurbMeta.innerHTML = `
            <span class="slideshow-meta-pill">${platformName}</span>
            <span class="slideshow-meta-pill">Rating: ${ratingText}</span>
            <span class="slideshow-meta-pill">${statusText}</span>
            <span class="slideshow-meta-pill">${idx + 1} / ${slideshowGames.length}</span>
        `;
        blurbText.textContent = (game.description && String(game.description).trim().length > 0)
            ? String(game.description).trim()
            : 'No description available for this game yet.';

        setBackdropForIndex(idx);
        renderStrip(idx);
    }

    function setIndex(nextIndex) {
        if (renderToken !== getRenderToken()) return;
        if (!slideshowContainer.isConnected) return;
        currentIndex = (nextIndex + len) % len;
        updateHero(currentIndex);
        scheduleAutoAdvance();
    }

    function getNearestStripIndex() {
        const buttons = Array.from(stripTrack.querySelectorAll('.slideshow-strip-item[data-slideshow-index]'));
        if (!buttons.length) return null;
        const trackRect = stripTrack.getBoundingClientRect();
        const targetCenter = trackRect.left + (trackRect.width / 2);
        let bestIdx = null;
        let bestDist = Number.POSITIVE_INFINITY;

        buttons.forEach((button) => {
            const idx = Number.parseInt(button.dataset.slideshowIndex || '-1', 10);
            if (!Number.isFinite(idx) || idx < 0 || idx >= len) return;
            const rect = button.getBoundingClientRect();
            const center = rect.left + (rect.width / 2);
            const dist = Math.abs(center - targetCenter);
            if (dist < bestDist) {
                bestDist = dist;
                bestIdx = idx;
            }
        });

        return bestIdx;
    }

    (function enableStripDragScroll() {
        let armed = false;
        let dragging = false;
        let pointerId = null;
        let startX = 0;
        let startScrollLeft = 0;
        let lastMoveX = 0;
        let lastMoveT = 0;
        let velocityPxMs = 0;

        const dragThreshold = 4;

        const setDraggingState = (isDragging) => {
            stripTrack.classList.toggle('is-dragging', !!isDragging);
        };

        const onPointerDown = (event) => {
            if (event.pointerType === 'mouse' && event.button !== 0) return;
            armed = true;
            dragging = false;
            pointerId = event.pointerId;
            startX = event.clientX;
            startScrollLeft = stripTrack.scrollLeft;
            lastMoveX = event.clientX;
            lastMoveT = performance.now();
            velocityPxMs = 0;
            autoAdvancePaused = true;
            clearAutoAdvance();
            stopStripInertia();
            try { stripTrack.setPointerCapture(pointerId); } catch (_error) {}
        };

        const onPointerMove = (event) => {
            if (!armed || event.pointerId !== pointerId) return;

            const dx = event.clientX - startX;
            if (!dragging && Math.abs(dx) >= dragThreshold) {
                dragging = true;
                setDraggingState(true);
            }
            if (!dragging) return;

            stripTrack.scrollLeft = startScrollLeft - dx;

            const now = performance.now();
            const dt = Math.max(1, now - lastMoveT);
            const instVelocity = (event.clientX - lastMoveX) / dt;
            velocityPxMs = (velocityPxMs * 0.7) + (instVelocity * 0.3);
            lastMoveX = event.clientX;
            lastMoveT = now;
            event.preventDefault();
        };

        const onPointerEnd = (event) => {
            if (!armed || event.pointerId !== pointerId) return;
            armed = false;
            try { stripTrack.releasePointerCapture(pointerId); } catch (_error) {}
            pointerId = null;

            if (!dragging) {
                autoAdvancePaused = false;
                scheduleAutoAdvance();
                return;
            }

            dragging = false;
            setDraggingState(false);
            suppressStripClickUntil = performance.now() + 220;

            let velocity = -velocityPxMs * 18;
            const decay = 0.92;
            const tick = () => {
                velocity *= decay;
                if (Math.abs(velocity) < 0.2) {
                    stripInertiaFrame = null;
                    const nearestIdx = getNearestStripIndex();
                    if (nearestIdx != null) setIndex(nearestIdx);
                    autoAdvancePaused = false;
                    scheduleAutoAdvance();
                    return;
                }
                stripTrack.scrollLeft += velocity;
                stripInertiaFrame = requestAnimationFrame(tick);
            };
            stripInertiaFrame = requestAnimationFrame(tick);
        };

        stripTrack.style.touchAction = 'pan-y';
        stripTrack.addEventListener('pointerdown', onPointerDown);
        stripTrack.addEventListener('pointermove', onPointerMove);
        stripTrack.addEventListener('pointerup', onPointerEnd);
        stripTrack.addEventListener('pointercancel', onPointerEnd);
        stripTrack.addEventListener('lostpointercapture', onPointerEnd);
    })();

    heroButton.addEventListener('click', () => {
        const game = slideshowGames[currentIndex];
        if (game) showGameDetails(game);
    });

    stripTrack.addEventListener('click', (event) => {
        if (performance.now() < suppressStripClickUntil) return;
        const button = event.target.closest('.slideshow-strip-item[data-slideshow-index]');
        if (!button) return;
        const idx = Number.parseInt(button.dataset.slideshowIndex || '-1', 10);
        if (!Number.isFinite(idx) || idx < 0 || idx >= len) return;
        setIndex(idx);
    });

    modeTabs.addEventListener('click', (event) => {
        const button = event.target.closest('.slideshow-mode-tab[data-slideshow-mode]');
        if (!button) return;
        applySlideshowMode(button.dataset.slideshowMode || 'flat');
    });

    prevBtn.addEventListener('click', () => setIndex(currentIndex - 1));
    nextBtn.addEventListener('click', () => setIndex(currentIndex + 1));

    const onWheel = (event) => {
        if (!event.ctrlKey) return;
        event.preventDefault();
        const slider = document.getElementById('view-size-slider');
        if (!slider || slider.disabled) return;
        const current = parseInt(slider.value, 10);
        const next = event.deltaY < 0 ? Math.min(140, current + 5) : Math.max(70, current - 5);
        slider.value = String(next);
        slider.dispatchEvent(new Event('input', { bubbles: true }));
    };
    slideshowContainer.addEventListener('wheel', onWheel, { passive: false });

    slideshowContainer.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            setIndex(currentIndex - 1);
            return;
        }
        if (event.key === 'ArrowRight') {
            event.preventDefault();
            setIndex(currentIndex + 1);
            return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            const game = slideshowGames[currentIndex];
            if (game) showGameDetails(game);
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

    applySlideshowMode(slideshowMode, { persist: false });
    setIndex(currentIndex);
    slideshowContainer.focus();

    setGamesScrollDetach(() => {
        clearAutoAdvance();
        stopStripInertia();
        slideshowContainer.removeEventListener('wheel', onWheel);
        cleanupLazyGameImages(slideshowContainer);
    });
}
