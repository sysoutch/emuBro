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
    const i18n = options.i18n;

    const slideshowContainer = document.createElement('div');
    slideshowContainer.className = 'slideshow-container';
    slideshowContainer.tabIndex = 0;
    const slideshowGames = buildViewGamePool(gamesToRender, maxPoolSize);

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
                if (renderToken !== getRenderToken()) return;
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
            if (renderToken !== getRenderToken()) return;
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
            if (renderToken !== getRenderToken()) return;
            isAnimating = false;
            runQueue();
        }, durationMs);
    }

    function runQueue() {
        if (renderToken !== getRenderToken()) return;
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
        if (renderToken !== getRenderToken()) return;
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

    setGamesScrollDetach(() => {
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
    });
}
