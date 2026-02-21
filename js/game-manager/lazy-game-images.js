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
                const source = String(img.dataset.lazySrc || '').trim();
                if (!source) {
                    markLazyImageLoaded(img);
                    unobserveLazyImage(img);
                    return;
                }

                if (img.dataset.lazyStatus === 'loaded' || img.dataset.lazyStatus === 'loading') {
                    unobserveLazyImage(img);
                    return;
                }

                img.dataset.lazyStatus = 'loading';
                attachLazyImageLoadHandlers(img);
                img.src = source;
                if (img.complete && img.naturalWidth > 0) {
                    markLazyImageLoaded(img);
                }
                unobserveLazyImage(img);
            });
        }, {
            root: gameImageObserverRoot,
            rootMargin: '220px 0px',
            threshold: 0.01
        });

        return gameImageObserver;
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

        const observer = ensureGameImageObserver();
        if (!observer) {
            img.dataset.lazyStatus = 'loading';
            attachLazyImageLoadHandlers(img);
            img.src = source;
            if (img.complete && img.naturalWidth > 0) {
                markLazyImageLoaded(img);
            }
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
