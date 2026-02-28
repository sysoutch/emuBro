export function renderGamesAsSlideshow(gamesToRender, options = {}) {
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
    slideshowContainer.className = 'slideshow-container slideshow-deck-layout';
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

    const SLIDESHOW_MODE_STORAGE_KEY = 'emuBro.slideshowMode';
    let slideshowMode = (() => {
        try {
            const stored = String(localStorage.getItem(SLIDESHOW_MODE_STORAGE_KEY) || 'flat').trim().toLowerCase();
            return stored === '3d' ? '3d' : 'flat';
        } catch (_error) {
            return 'flat';
        }
    })();

    const chrome = document.createElement('div');
    chrome.className = 'slideshow-chrome';

    const carouselControls = document.createElement('div');
    carouselControls.className = 'slideshow-carousel-controls';
    carouselControls.innerHTML = `
        <div class="slideshow-mode-tabs">
            <button type="button" class="slideshow-mode-tab" data-slideshow-mode="flat">Flat</button>
            <button type="button" class="slideshow-mode-tab" data-slideshow-mode="3d">3D</button>
        </div>
    `;

    const carousel = document.createElement('div');
    carousel.className = 'slideshow-carousel';
    
    const track = document.createElement('div');
    track.className = 'slideshow-track';

    slideshowGames.forEach((game, idx) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'slideshow-item';
        item.dataset.index = String(idx);
        item.setAttribute('aria-label', game.name || '');

        // Click handler for direct selection
        item.addEventListener('click', (e) => {
            // Only handle click if we weren't just dragging
            if (performance.now() < suppressStripClickUntil) return;
            const targetIdx = parseInt(item.dataset.index);
            if (targetIdx === currentIndex) {
                showGameDetails(slideshowGames[targetIdx]);
            } else {
                scrollToItem(targetIdx);
            }
        });

        const safeImage = getGameImage(game);
        const src = lazyPlaceholderSrc || safeImage;

        item.innerHTML = `
            <div class="slideshow-item-inner">
                <img class="slideshow-item-image lazy-game-image is-pending" src="${src}" data-lazy-src="${safeImage}" alt="" loading="lazy" decoding="async" />
                <div class="slideshow-item-overlay">
                    <div class="slideshow-item-title">${escapeHtml(game.name)}</div>
                </div>
            </div>
        `;
        track.appendChild(item);
    });

    carousel.appendChild(track);

    const infoPanel = document.createElement('div');
    infoPanel.className = 'slideshow-info-panel';
    infoPanel.innerHTML = `
        <h2 class="slideshow-active-title"></h2>
        <div class="slideshow-active-meta"></div>
        <div class="slideshow-active-blurb glass"></div>
    `;

    chrome.appendChild(carouselControls);
    chrome.appendChild(carousel);
    chrome.appendChild(infoPanel);

    backdrops.forEach((el) => slideshowContainer.appendChild(el));
    slideshowContainer.appendChild(chrome);
    gamesContainer.appendChild(slideshowContainer);

    initializeLazyGameImages(track);

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
        if (!game) return;
        const heroImg = getGameImage(game);
        const nextBackdrop = 1 - activeBackdrop;
        backdrops[nextBackdrop].style.backgroundImage = heroImg ? `url("${heroImg}")` : '';
        backdrops[nextBackdrop].classList.add('is-active');
        backdrops[activeBackdrop].classList.remove('is-active');
        activeBackdrop = nextBackdrop;
    }

    const len = slideshowGames.length;
    let currentIndex = 0;
    let isMoving = false;
    let scrollX = 0;
    let suppressStripClickUntil = 0;

    function updateInfo(idx) {
        const game = slideshowGames[idx];
        if (!game) return;
        const titleEl = infoPanel.querySelector('.slideshow-active-title');
        const metaEl = infoPanel.querySelector('.slideshow-active-meta');
        const blurbEl = infoPanel.querySelector('.slideshow-active-blurb');

        const statusText = game.isInstalled ? 'Installed' : 'Not Installed';
        const platformName = game.platform || game.platformShortName || t('gameDetails.unknown');
        const ratingText = (game.rating !== undefined && game.rating !== null) ? `${game.rating}` : t('gameDetails.unknown');

        if (titleEl) titleEl.textContent = game.name;
        if (metaEl) {
            metaEl.innerHTML = `
                <span class="slideshow-meta-pill">${platformName}</span>
                <span class="slideshow-meta-pill">Rating: ${ratingText}</span>
                <span class="slideshow-meta-pill">${statusText}</span>
                <span class="slideshow-meta-pill">${idx + 1} / ${len}</span>
            `;
        }
        if (blurbEl) {
            blurbEl.textContent = (game.description && String(game.description).trim().length > 0)
                ? String(game.description).trim()
                : 'No description available for this game yet.';
        }

        setBackdropForIndex(idx);
    }

    function getLayout() {
        const carouselRect = carousel.getBoundingClientRect();
        const firstItem = track.querySelector('.slideshow-item');
        if (!firstItem) return { center: 0, itemWidth: 0, gap: 0 };
        // Use offsetWidth to get unscaled dimensions
        const itemWidth = firstItem.offsetWidth;
        const style = window.getComputedStyle(track);
        const gap = parseFloat(style.gap) || 0;
        return {
            center: carouselRect.width / 2,
            itemWidth: itemWidth,
            gap: gap
        };
    }

    function applySlideshowMode(nextMode, options = {}) {
        const persist = options.persist !== false;
        slideshowMode = nextMode === '3d' ? '3d' : 'flat';
        slideshowContainer.classList.toggle('is-mode-3d', slideshowMode === '3d');
        slideshowContainer.classList.toggle('is-mode-flat', slideshowMode === 'flat');
        carouselControls.querySelectorAll('.slideshow-mode-tab').forEach((button) => {
            const isActive = String(button.dataset.slideshowMode || '') === slideshowMode;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
        if (persist) {
            try {
                localStorage.setItem(SLIDESHOW_MODE_STORAGE_KEY, slideshowMode);
            } catch (_error) {}
        }
        applyTransforms();
    }

    function applyTransforms() {
        if (renderToken !== getRenderToken()) return;
        const { center, itemWidth, gap } = getLayout();
        if (itemWidth === 0) return;

        const items = track.querySelectorAll('.slideshow-item');
        const fullStep = itemWidth + gap;

        // Current offset based on scrollX
        track.style.transform = `translate3d(${center - (itemWidth / 2) - scrollX}px, 0, 0)`;

        items.forEach((item, i) => {
            const itemX = i * fullStep;
            const diffX = itemX - scrollX;
            const dist = Math.abs(diffX);
            
            // Normalized distance: 0 at center, 1 at edges of focus range
            const normalizedDist = Math.min(1, dist / (fullStep * 2.5));
            
            // Steam-like scaling: center is 1.15, edges are 0.85
            const scale = 1.15 - (normalizedDist * 0.3);
            const opacity = 1.0 - (normalizedDist * 0.6);
            const zIndex = Math.round((1 - normalizedDist) * 100);

            let transform = `scale(${scale})`;
            if (slideshowMode === '3d') {
                // Precision: ensure that when dist is very small, we snap to 0 deg
                const rotateY = dist < 1 ? 0 : Math.max(-45, Math.min(45, (diffX / fullStep) * -20));
                const translateZ = normalizedDist * -120;
                transform += ` rotateY(${rotateY}deg) translateZ(${translateZ}px)`;
            }

            item.style.transform = transform;
            item.style.opacity = String(opacity);
            item.style.zIndex = String(zIndex);
            
            // Update active state based on proximity to center
            const isActive = dist < (fullStep / 2);
            item.classList.toggle('is-active', isActive);
            if (isActive && i !== currentIndex) {
                currentIndex = i;
                updateInfo(currentIndex);
            }
        });
    }

    function scrollToItem(idx, smooth = true) {
        const { itemWidth, gap } = getLayout();
        const targetX = idx * (itemWidth + gap);
        
        if (!smooth || reduceMotion) {
            scrollX = targetX;
            currentIndex = idx;
            applyTransforms();
            updateInfo(currentIndex);
            return;
        }

        const startX = scrollX;
        const startTime = performance.now();
        const duration = 450;

        function animate(now) {
            if (renderToken !== getRenderToken()) return;
            const elapsed = now - startTime;
            const t = Math.min(1, elapsed / duration);
            const ease = 1 - Math.pow(1 - t, 4); // easeOutQuart
            
            scrollX = startX + (targetX - startX) * ease;
            applyTransforms();

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                scrollX = targetX;
                currentIndex = idx;
                applyTransforms();
                updateInfo(currentIndex);
                isMoving = false;
            }
        }

        isMoving = true;
        requestAnimationFrame(animate);
    }

    // Drag / Swipe Logic
    (function initDragHandler() {
        let isArmed = false;
        let isDragging = false;
        let startPointerX = 0;
        let startScrollX = 0;
        let lastPointerX = 0;
        let velocity = 0;
        let lastTimestamp = 0;

        const onDown = (e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            isArmed = true;
            isDragging = false;
            startPointerX = e.clientX;
            lastPointerX = e.clientX;
            startScrollX = scrollX;
            lastTimestamp = performance.now();
            velocity = 0;
            carousel.setPointerCapture(e.pointerId);
        };

        const onMove = (e) => {
            if (!isArmed) return;
            const dx = e.clientX - startPointerX;
            if (!isDragging && Math.abs(dx) > 5) {
                isDragging = true;
                carousel.classList.add('is-dragging');
            }

            if (isDragging) {
                scrollX = startScrollX - dx;
                
                const now = performance.now();
                const dt = now - lastTimestamp;
                if (dt > 0) {
                    velocity = (e.clientX - lastPointerX) / dt;
                }
                lastPointerX = e.clientX;
                lastTimestamp = now;

                applyTransforms();
            }
        };

        const onUp = (e) => {
            if (!isArmed) return;
            isArmed = false;
            carousel.classList.remove('is-dragging');
            carousel.releasePointerCapture(e.pointerId);

            if (!isDragging) {
                return;
            }

            isDragging = false;
            suppressStripClickUntil = performance.now() + 100;
            
            // Magnetic snap with velocity assistance
            const { itemWidth, gap } = getLayout();
            const step = itemWidth + gap;
            
            let targetIdx = Math.round(scrollX / step);
            if (Math.abs(velocity) > 0.5) {
                targetIdx -= Math.sign(velocity);
            }
            
            targetIdx = Math.max(0, Math.min(len - 1, targetIdx));
            scrollToItem(targetIdx);
        };

        carousel.addEventListener('pointerdown', onDown);
        carousel.addEventListener('pointermove', onMove);
        carousel.addEventListener('pointerup', onUp);
        carousel.addEventListener('pointercancel', onUp);
    })();

    carouselControls.addEventListener('click', (event) => {
        const button = event.target.closest('.slideshow-mode-tab[data-slideshow-mode]');
        if (!button) return;
        applySlideshowMode(button.dataset.slideshowMode || 'flat');
    });

    // Keyboard & Controls
    slideshowContainer.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            scrollToItem(Math.max(0, currentIndex - 1));
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            scrollToItem(Math.min(len - 1, currentIndex + 1));
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            showGameDetails(slideshowGames[currentIndex]);
        }
    });

    const onResize = () => {
        if (renderToken !== getRenderToken()) return;
        if (!slideshowContainer.isConnected) {
            window.removeEventListener('resize', onResize);
            return;
        }
        scrollToItem(currentIndex, false);
    };
    window.addEventListener('resize', onResize);

    // Initial setup
    applySlideshowMode(slideshowMode, { persist: false });
    requestAnimationFrame(() => {
        if (renderToken !== getRenderToken()) return;
        scrollToItem(0, false);
        slideshowContainer.focus();
    });

    setGamesScrollDetach(() => {
        window.removeEventListener('resize', onResize);
        cleanupLazyGameImages(slideshowContainer);
    });
}
