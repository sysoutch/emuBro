export function createLazyGameImageActions(deps = {}) {
    const lazyPlaceholderSrc = String(deps.lazyPlaceholderSrc || '').trim();
    const resolveObserverRoot = typeof deps.resolveObserverRoot === 'function' ? deps.resolveObserverRoot : () => null;
    const maxConcurrentLoads = Math.max(2, Math.min(16, Number(deps.maxConcurrentLoads) || 8));
    let gameImageObserver = null;
    let gameImageObserverRoot = null;
    let queueDrainScheduled = false;
    let inFlightImageCount = 0;
    const pendingImageQueue = [];

    function unobserveLazyImage(img) {
        if (!img || !gameImageObserver) return;
        try {
            gameImageObserver.unobserve(img);
        } catch (_error) {}
    }

    function markLazyImageLoaded(img) {
        if (!img) return;
        img.dataset.lazyStatus = 'loaded';
        img.classList.remove('is-pending');
        updateCoverOrientationClass(img);
    }

    function updateCoverOrientationClass(img) {
        if (!img) return;
        const width = Number(img.naturalWidth || 0);
        const height = Number(img.naturalHeight || 0);
        if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;

        const cardStack = img.closest('.game-card-stack');
        if (!cardStack) return;

        cardStack.classList.remove(
            'cover-orientation-portrait',
            'cover-orientation-landscape',
            'cover-orientation-square'
        );

        const ratio = width / height;
        if (ratio > 1.04) {
            cardStack.classList.add('cover-orientation-landscape');
        } else if (ratio < 0.96) {
            cardStack.classList.add('cover-orientation-portrait');
        } else {
            cardStack.classList.add('cover-orientation-square');
        }
    }

    function attachLazyImageLoadHandlers(img) {
        if (!img) return;
        let settled = false;
        const onDone = () => {
            if (settled) return;
            settled = true;
            if (img.dataset.lazyStatus === 'loading') {
                markLazyImageLoaded(img);
            }
            img.removeEventListener('load', onDone);
            img.removeEventListener('error', onDone);
            completeLazyImageLoad(img);
        };
        img.addEventListener('load', onDone);
        img.addEventListener('error', onDone);
    }

    function getInFlightImageCount() {
        return Math.max(0, Number(inFlightImageCount) || 0);
    }

    function completeLazyImageLoad(img) {
        if (!img || img.dataset.lazyLoading !== '1') return;
        delete img.dataset.lazyLoading;
        inFlightImageCount = Math.max(0, inFlightImageCount - 1);
        scheduleQueueDrain();
    }

    function sortImagesByViewportProximity(images) {
        if (!Array.isArray(images) || images.length <= 1) return images;
        const root = resolveObserverRoot() || null;
        const rootRect = (root && typeof root.getBoundingClientRect === 'function')
            ? root.getBoundingClientRect()
            : null;
        const viewportCenterY = rootRect
            ? (rootRect.top + (rootRect.height / 2))
            : ((window.innerHeight || document.documentElement.clientHeight || 0) / 2);
        return images.sort((a, b) => {
            const aRect = a.getBoundingClientRect();
            const bRect = b.getBoundingClientRect();
            const aCenter = aRect.top + (aRect.height / 2);
            const bCenter = bRect.top + (bRect.height / 2);
            return Math.abs(aCenter - viewportCenterY) - Math.abs(bCenter - viewportCenterY);
        });
    }

    function scheduleQueueDrain() {
        if (queueDrainScheduled) return;
        queueDrainScheduled = true;
        const run = () => {
            queueDrainScheduled = false;
            drainPendingImageQueue();
        };
        if (typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(run, { timeout: 90 });
            return;
        }
        requestAnimationFrame(run);
    }

    function queueLazyImageLoad(img, urgent = false) {
        if (!img) return;
        if (img.dataset.lazyQueued === '1') return;
        if (img.dataset.lazyStatus === 'loaded' || img.dataset.lazyStatus === 'loading') return;
        img.dataset.lazyQueued = '1';
        if (urgent) {
            pendingImageQueue.unshift(img);
        } else {
            pendingImageQueue.push(img);
        }
        scheduleQueueDrain();
    }

    function drainPendingImageQueue() {
        let inFlight = getInFlightImageCount();
        while (inFlight < maxConcurrentLoads && pendingImageQueue.length > 0) {
            const img = pendingImageQueue.shift();
            if (!img) continue;
            delete img.dataset.lazyQueued;
            if (!img.isConnected) continue;
            if (img.dataset.lazyStatus === 'loaded' || img.dataset.lazyStatus === 'loading') continue;
            loadLazyImageNow(img);
            inFlight = getInFlightImageCount();
        }
    }

    function ensureGameImageObserver() {
        const nextRoot = resolveObserverRoot() || null;
        if (gameImageObserver && gameImageObserverRoot === nextRoot) return gameImageObserver;
        if (typeof IntersectionObserver !== 'function') return null;

        if (gameImageObserver) {
            try {
                gameImageObserver.disconnect();
            } catch (_error) {}
            gameImageObserver = null;
        }
        gameImageObserverRoot = nextRoot;

        gameImageObserver = new IntersectionObserver((entries) => {
            const visibleImages = [];
            entries.forEach((entry) => {
                if (!entry.isIntersecting || !entry.target) return;
                visibleImages.push(entry.target);
            });

            sortImagesByViewportProximity(visibleImages).forEach((img) => {
                queueLazyImageLoad(img, true);
                unobserveLazyImage(img);
            });
        }, {
            root: gameImageObserverRoot,
            rootMargin: '260px 0px',
            threshold: 0
        });

        return gameImageObserver;
    }

    function loadLazyImageNow(img) {
        if (!img) return;
        const source = String(img.dataset.lazySrc || '').trim();
        if (!source) {
            markLazyImageLoaded(img);
            return;
        }

        if (img.dataset.lazyStatus === 'loaded' || img.dataset.lazyStatus === 'loading') {
            return;
        }

        img.dataset.lazyStatus = 'loading';
        img.dataset.lazyLoading = '1';
        inFlightImageCount += 1;
        attachLazyImageLoadHandlers(img);
        img.src = source;
        if (img.complete && img.naturalWidth > 0) {
            markLazyImageLoaded(img);
            completeLazyImageLoad(img);
        }
    }

    function isLikelyVisibleNow(img) {
        if (!img || typeof img.getBoundingClientRect !== 'function') return false;
        const rect = img.getBoundingClientRect();
        const root = resolveObserverRoot() || null;

        if (!root || typeof root.getBoundingClientRect !== 'function') {
            const vpHeight = window.innerHeight || document.documentElement.clientHeight || 0;
            const vpWidth = window.innerWidth || document.documentElement.clientWidth || 0;
            return rect.bottom >= -120 && rect.top <= (vpHeight + 120) && rect.right >= -120 && rect.left <= (vpWidth + 120);
        }

        const rootRect = root.getBoundingClientRect();
        return rect.bottom >= (rootRect.top - 120)
            && rect.top <= (rootRect.bottom + 120)
            && rect.right >= (rootRect.left - 120)
            && rect.left <= (rootRect.right + 120);
    }

    function prepareLazyGameImage(img) {
        if (!img || img.dataset.lazyPrepared === '1') return;
        const source = String(img.dataset.lazySrc || '').trim();
        img.dataset.lazyPrepared = '1';
        img.classList.add('lazy-game-image', 'is-pending');
        img.dataset.lazyStatus = 'pending';
        img.loading = 'lazy';
        img.decoding = 'async';
        if (!img.getAttribute('fetchpriority')) img.setAttribute('fetchpriority', 'low');
        img.src = lazyPlaceholderSrc;

        if (!source) {
            markLazyImageLoaded(img);
            return;
        }

        if (isLikelyVisibleNow(img)) {
            queueLazyImageLoad(img, true);
            return;
        }

        const observer = ensureGameImageObserver();
        if (!observer) {
            queueLazyImageLoad(img, true);
            return;
        }

        observer.observe(img);
    }

    function initialize(root) {
        const scope = root || document;
        if (!scope) return;
        const images = scope.querySelectorAll('img[data-lazy-src]');
        images.forEach((img) => prepareLazyGameImage(img));
    }

    function cleanup(root, options = {}) {
        const scope = root || document;
        if (!scope) return;
        const releaseSources = Boolean(options?.releaseSources);

        if (scope.matches && scope.matches('img[data-lazy-src]')) {
            unobserveLazyImage(scope);
            if (scope.dataset.lazyQueued === '1') {
                delete scope.dataset.lazyQueued;
            }
            completeLazyImageLoad(scope);
            if (releaseSources) {
                scope.removeAttribute('srcset');
                scope.removeAttribute('sizes');
                if (lazyPlaceholderSrc) {
                    scope.src = lazyPlaceholderSrc;
                } else {
                    scope.removeAttribute('src');
                }
                scope.dataset.lazyStatus = 'released';
                scope.classList.add('is-pending');
            }
        }

        const images = scope.querySelectorAll ? scope.querySelectorAll('img[data-lazy-src]') : [];
        images.forEach((img) => {
            unobserveLazyImage(img);
            if (img.dataset.lazyQueued === '1') {
                delete img.dataset.lazyQueued;
            }
            completeLazyImageLoad(img);
            if (!releaseSources) return;
            img.removeAttribute('srcset');
            img.removeAttribute('sizes');
            if (lazyPlaceholderSrc) {
                img.src = lazyPlaceholderSrc;
            } else {
                img.removeAttribute('src');
            }
            img.dataset.lazyStatus = 'released';
            img.classList.add('is-pending');
        });
    }

    function resetObserver() {
        if (gameImageObserver) {
            try {
                gameImageObserver.disconnect();
            } catch (_error) {}
            gameImageObserver = null;
        }
        gameImageObserverRoot = null;
        pendingImageQueue.length = 0;
        queueDrainScheduled = false;
        inFlightImageCount = 0;
    }

    return {
        initialize,
        prepare: prepareLazyGameImage,
        cleanup,
        reset: resetObserver
    };
}
