import { isCustomGameCoverSource } from '../render-utils';
import { createSlideshowLane, updateSlideshowItemOrientationClass } from './slideshow-lane';
import { attachGameCardContextMenu } from '../game-card-context-menu';

export function renderGamesAsSlideshow(gamesToRender, options = {}) {
    const gamesContainer = document.getElementById('games-container');
    if (!gamesContainer) return;
    const normalizedCoverCardMode = String(options.coverCardMode || '').trim().toLowerCase();
    const isCoverOnlyMode = normalizedCoverCardMode === 'cover-only'
        || gamesContainer.classList.contains('cover-mode-cover-only');
    const previousActiveElement = document.activeElement;
    const shouldRestoreViewFocus = (() => {
        if (!previousActiveElement || previousActiveElement === document.body) return true;
        if (!(previousActiveElement instanceof HTMLElement)) return false;
        if (gamesContainer.contains(previousActiveElement)) return true;
        return false;
    })();
    const renderToken = options.renderToken;
    const getRenderToken = typeof options.getRenderToken === 'function' ? options.getRenderToken : () => renderToken;
    const setGamesScrollDetach = typeof options.setGamesScrollDetach === 'function'
        ? options.setGamesScrollDetach
        : () => {};
    const buildViewGamePool = typeof options.buildViewGamePool === 'function' ? options.buildViewGamePool : (rows) => rows;
    const maxPoolSize = Number(options.maxPoolSize) || 0;
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
    const lazyPlaceholderSrc = String(options.lazyPlaceholderSrc || '');
    const i18n = options.i18n;
    const emubro = options.emubro || window.emubro;
    const alertUser = typeof options.alertUser === 'function' ? options.alertUser : (message) => window.alert(String(message || ''));
    const t = (key, fallback = 'Unknown') => {
        try {
            if (i18n && typeof i18n.t === 'function') return i18n.t(key);
        } catch (_error) {}
        return fallback;
    };

    const slideshowContainer = document.createElement('div');
    slideshowContainer.className = 'slideshow-container slideshow-deck-layout';
    slideshowContainer.classList.toggle('is-cover-mode-cover-only', isCoverOnlyMode);
    slideshowContainer.classList.toggle('is-cover-mode-cover-title', !isCoverOnlyMode);
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
    let activeBackdropSource = '';
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

        const safeImage = getGameImage(game);
        item.classList.toggle('is-custom-cover-source', isCustomGameCoverSource(safeImage));
        const src = lazyPlaceholderSrc || safeImage;

        item.innerHTML = `
            <div class="slideshow-item-inner">
                <img class="slideshow-item-image lazy-game-image is-pending" src="${src}" data-lazy-src="${safeImage}" alt="" loading="lazy" decoding="async" />
                <button class="game-cover-play-btn slideshow-play-btn" type="button" aria-label="Play ${escapeHtml(game.name || '')}" title="Play ${escapeHtml(game.name || '')}">
                    <span class="game-cover-play-icon" aria-hidden="true"></span>
                </button>
                <div class="slideshow-item-overlay">
                    <div class="slideshow-item-title">${escapeHtml(game.name)}</div>
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
            const updateOrientationClass = () => {
                if (!updateSlideshowItemOrientationClass(item, imageEl)) return;
                lane?.scheduleOrientationRefresh();
            };
            imageEl.addEventListener('load', updateOrientationClass);
            if (imageEl.complete && imageEl.naturalWidth > 0) {
                requestAnimationFrame(updateOrientationClass);
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

    requestAnimationFrame(() => {
        initializeLazyGameImages(track);
        lane?.scheduleOrientationRefresh();
    });
    window.setTimeout(() => lane?.scheduleOrientationRefresh(), 120);
    window.setTimeout(() => lane?.scheduleOrientationRefresh(), 500);

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
        const nextSource = String(heroImg || '');
        if (nextSource === activeBackdropSource) return;
        const nextBackdrop = 1 - activeBackdrop;
        backdrops[nextBackdrop].style.backgroundImage = heroImg ? `url("${heroImg}")` : '';
        backdrops[nextBackdrop].classList.add('is-active');
        backdrops[activeBackdrop].classList.remove('is-active');
        activeBackdrop = nextBackdrop;
        activeBackdropSource = nextSource;
    }

    const len = slideshowGames.length;
    let activeInfoIndex = -1;

    function forceLoadSlideImage(index, options = {}) {
        const item = track.querySelector(`.slideshow-item[data-index="${index}"]`);
        if (!item) return;
        const imageEl = item.querySelector('.slideshow-item-image');
        if (!imageEl) return;
        const source = String(imageEl.dataset.lazySrc || '').trim();
        if (!source) return;
        const status = String(imageEl.dataset.lazyStatus || '').trim().toLowerCase();
        if (status === 'loaded' || status === 'loading') return;

        if (options.priority === 'high') {
            imageEl.setAttribute('fetchpriority', 'high');
        } else if (!imageEl.getAttribute('fetchpriority')) {
            imageEl.setAttribute('fetchpriority', 'auto');
        }

        imageEl.dataset.lazyStatus = 'loading';
        const settle = () => {
            imageEl.dataset.lazyStatus = 'loaded';
            imageEl.classList.remove('is-pending');
            updateSlideshowItemOrientationClass(item, imageEl);
            lane?.invalidateLayoutCache();
            lane?.scheduleApplyTransforms();
        };
        imageEl.addEventListener('load', settle, { once: true });
        imageEl.addEventListener('error', () => {
            imageEl.classList.remove('is-pending');
        }, { once: true });
        imageEl.src = source;
    }

    function preloadNeighborhood(centerIndex) {
        for (let offset = -2; offset <= 2; offset += 1) {
            const idx = centerIndex + offset;
            if (idx < 0 || idx >= len) continue;
            forceLoadSlideImage(idx, {
                priority: offset === 0 ? 'high' : 'auto'
            });
        }
    }

    function updateInfo(idx) {
        if (idx === activeInfoIndex) {
            preloadNeighborhood(idx);
            return;
        }
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

        activeInfoIndex = idx;
        setBackdropForIndex(idx);
        preloadNeighborhood(idx);
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
        lane?.setMode();
    }
    let lane = createSlideshowLane({
        carousel,
        track,
        itemSelector: '.slideshow-item',
        reduceMotion,
        modeRef: {
            get mode() {
                return slideshowMode;
            }
        },
        renderToken,
        getRenderToken,
        refreshItems() {
            let changed = false;
            track.querySelectorAll('.slideshow-item').forEach((item) => {
                const imageEl = item.querySelector('.slideshow-item-image');
                if (!imageEl) return;
                changed = updateSlideshowItemOrientationClass(item, imageEl) || changed;
            });
            return changed;
        },
        onNearestIndexChange(nextIndex, state) {
            if (!state.isMoving && !state.isPointerDragging) {
                updateInfo(nextIndex);
            }
        },
        onSettledIndexChange(nextIndex) {
            updateInfo(nextIndex);
        },
        onActiveClick(nextIndex) {
            showGameDetails(slideshowGames[nextIndex]);
        }
    });

    carouselControls.addEventListener('click', (event) => {
        const button = event.target.closest('.slideshow-mode-tab[data-slideshow-mode]');
        if (!button) return;
        applySlideshowMode(button.dataset.slideshowMode || 'flat');
    });

    // Keyboard & Controls
    slideshowContainer.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            lane.scrollToItem(Math.max(0, lane.getCurrentIndex() - 1));
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            lane.scrollToItem(Math.min(len - 1, lane.getCurrentIndex() + 1));
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            showGameDetails(slideshowGames[lane.getCurrentIndex()]);
        }
    });

    const onResize = () => {
        if (renderToken !== getRenderToken()) return;
        if (!slideshowContainer.isConnected) {
            window.removeEventListener('resize', onResize);
            return;
        }
        lane.invalidateLayoutCache();
        lane.scheduleOrientationRefresh();
        lane.scrollToItem(lane.getCurrentIndex(), false);
    };
    window.addEventListener('resize', onResize);

    // Initial setup
    applySlideshowMode(slideshowMode, { persist: false });
    requestAnimationFrame(() => {
        if (renderToken !== getRenderToken()) return;
        lane.scrollToItem(0, false);
        updateInfo(0);
        if (shouldRestoreViewFocus && document.activeElement !== slideshowContainer) {
            slideshowContainer.focus();
        }
    });

    setGamesScrollDetach(() => {
        lane?.destroy();
        lane = null;
        window.removeEventListener('resize', onResize);
        cleanupLazyGameImages(slideshowContainer);
    });
}
