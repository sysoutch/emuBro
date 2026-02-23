export function createLazyGameImageActions(deps = {}) {
    const lazyPlaceholderSrc = String(deps.lazyPlaceholderSrc || '').trim();
    const resolveObserverRoot = typeof deps.resolveObserverRoot === 'function' ? deps.resolveObserverRoot : () => null;
    let gameImageObserver = null;
    let gameImageObserverRoot = null;

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
    }

    function attachLazyImageLoadHandlers(img) {
        if (!img) return;
        const onDone = () => {
            if (img.dataset.lazyStatus !== 'loading') return;
            markLazyImageLoaded(img);
            img.removeEventListener('load', onDone);
            img.removeEventListener('error', onDone);
        };
        img.addEventListener('load', onDone);
        img.addEventListener('error', onDone);
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
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const img = entry.target;
                loadLazyImageNow(img);
                unobserveLazyImage(img);
            });
        }, {
            root: gameImageObserverRoot,
            rootMargin: '360px 0px',
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
        attachLazyImageLoadHandlers(img);
        img.src = source;
        if (img.complete && img.naturalWidth > 0) {
            markLazyImageLoaded(img);
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
            loadLazyImageNow(img);
            return;
        }

        const observer = ensureGameImageObserver();
        if (!observer) {
            loadLazyImageNow(img);
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
        if (!gameImageObserver) return;
        try {
            gameImageObserver.disconnect();
        } catch (_error) {}
        gameImageObserver = null;
        gameImageObserverRoot = null;
    }

    return {
        initialize,
        prepare: prepareLazyGameImage,
        cleanup,
        reset: resetObserver
    };
}
