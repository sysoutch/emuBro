export function createLazyGameImageActions(deps = {}) {
    const lazyPlaceholderSrc = String(deps.lazyPlaceholderSrc || '').trim();
    let gameImageObserver = null;

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
        if (gameImageObserver) return gameImageObserver;
        if (typeof IntersectionObserver !== 'function') return null;

        gameImageObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const img = entry.target;
                const source = String(img.dataset.lazySrc || '').trim();
                if (!source) {
                    markLazyImageLoaded(img);
                    gameImageObserver.unobserve(img);
                    return;
                }

                if (img.dataset.lazyStatus === 'loaded' || img.dataset.lazyStatus === 'loading') {
                    gameImageObserver.unobserve(img);
                    return;
                }

                img.dataset.lazyStatus = 'loading';
                attachLazyImageLoadHandlers(img);
                img.src = source;
                if (img.complete && img.naturalWidth > 0) {
                    markLazyImageLoaded(img);
                }
                gameImageObserver.unobserve(img);
            });
        }, {
            root: null,
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

    return {
        initialize,
        prepare: prepareLazyGameImage
    };
}
