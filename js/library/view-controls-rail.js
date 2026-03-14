export function setupViewControlsRail(options = {}) {
    const rail = options.rail instanceof HTMLElement
        ? options.rail
        : document.querySelector('.view-controls');
    if (!rail) return () => {};

    if (typeof rail.__viewControlsRailCleanup === 'function') {
        rail.__viewControlsRailCleanup();
    }

    const edgeFadePx = Number(options.edgeFadePx) > 0 ? Number(options.edgeFadePx) : 22;
    rail.style.setProperty('--view-controls-edge-fade', `${edgeFadePx}px`);

    let rafId = 0;
    let revealRafId = 0;
    let pointerId = null;
    let dragActive = false;
    let dragStartX = 0;
    let dragStartScroll = 0;

    const isInteractiveTarget = (target) => {
        if (!(target instanceof Element)) return false;
        return Boolean(target.closest('button, select, input, label, a, [role="button"], [role="switch"]'));
    };

    const updateState = () => {
        rafId = 0;
        const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
        const scrollLeft = Math.max(0, Number(rail.scrollLeft || 0));
        const isOverflowing = maxScroll > 2;
        rail.classList.toggle('is-overflowing', isOverflowing);
        rail.classList.toggle('is-at-start', !isOverflowing || scrollLeft <= 2);
        rail.classList.toggle('is-at-end', !isOverflowing || scrollLeft >= (maxScroll - 2));
    };

    const scheduleUpdate = () => {
        if (rafId) return;
        rafId = window.requestAnimationFrame(updateState);
    };

    const revealElement = (element) => {
        if (!(element instanceof HTMLElement)) return;
        const railRect = rail.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        if (!railRect.width || !elementRect.width) return;

        const leftPadding = 20;
        const rightPadding = 20;
        const overflowLeft = elementRect.left < (railRect.left + leftPadding);
        const overflowRight = elementRect.right > (railRect.right - rightPadding);
        if (!overflowLeft && !overflowRight) return;

        const nextScrollLeft = rail.scrollLeft + (
            elementRect.left
            - railRect.left
            - (railRect.width - elementRect.width) / 2
        );

        rail.scrollTo({
            left: Math.max(0, nextScrollLeft),
            behavior: dragActive ? 'auto' : 'smooth'
        });
    };

    const scheduleRevealActive = () => {
        if (revealRafId) return;
        revealRafId = window.requestAnimationFrame(() => {
            revealRafId = 0;
            revealElement(rail.querySelector('.view-btn.active'));
        });
    };

    const onScroll = () => {
        scheduleUpdate();
    };

    const onWheel = (event) => {
        const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
        if (maxScroll <= 2) return;
        if (isInteractiveTarget(event.target) && !(event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY))) {
            return;
        }
        const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
        if (!Number.isFinite(delta) || Math.abs(delta) < 0.5) return;
        rail.scrollLeft += delta;
        event.preventDefault();
        scheduleUpdate();
    };

    const onPointerDown = (event) => {
        if (event.button !== 0) return;
        if (isInteractiveTarget(event.target)) return;
        const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
        if (maxScroll <= 2) return;
        pointerId = event.pointerId;
        dragActive = true;
        dragStartX = Number(event.clientX || 0);
        dragStartScroll = Number(rail.scrollLeft || 0);
        rail.classList.add('is-dragging');
        rail.setPointerCapture(pointerId);
    };

    const onPointerMove = (event) => {
        if (!dragActive || pointerId !== event.pointerId) return;
        const deltaX = Number(event.clientX || 0) - dragStartX;
        rail.scrollLeft = dragStartScroll - deltaX;
        scheduleUpdate();
    };

    const endDrag = (event) => {
        if (!dragActive) return;
        if (event && pointerId !== null && event.pointerId !== pointerId) return;
        if (pointerId !== null && rail.hasPointerCapture(pointerId)) {
            rail.releasePointerCapture(pointerId);
        }
        pointerId = null;
        dragActive = false;
        rail.classList.remove('is-dragging');
        scheduleUpdate();
    };

    const onClick = (event) => {
        const button = event.target instanceof Element
            ? event.target.closest('.view-btn')
            : null;
        if (!button) return;
        scheduleRevealActive();
    };

    const mutationObserver = typeof MutationObserver === 'function'
        ? new MutationObserver((mutations) => {
            let shouldUpdate = false;
            let shouldReveal = false;
            for (const mutation of mutations) {
                if (mutation.type === 'attributes') {
                    shouldUpdate = true;
                    if (
                        mutation.target instanceof Element
                        && mutation.target.classList.contains('view-btn')
                        && mutation.attributeName === 'class'
                        && mutation.target.classList.contains('active')
                    ) {
                        shouldReveal = true;
                    }
                } else if (mutation.type === 'childList') {
                    shouldUpdate = true;
                }
            }
            if (shouldUpdate) scheduleUpdate();
            if (shouldReveal) scheduleRevealActive();
        })
        : null;

    const resizeObserver = typeof ResizeObserver === 'function'
        ? new ResizeObserver(() => scheduleUpdate())
        : null;
    resizeObserver?.observe(rail);
    Array.from(rail.children).forEach((child) => resizeObserver?.observe(child));
    mutationObserver?.observe(rail, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['class']
    });

    rail.addEventListener('scroll', onScroll, { passive: true });
    rail.addEventListener('wheel', onWheel, { passive: false });
    rail.addEventListener('click', onClick);
    rail.addEventListener('pointerdown', onPointerDown);
    rail.addEventListener('pointermove', onPointerMove);
    rail.addEventListener('pointerup', endDrag);
    rail.addEventListener('pointercancel', endDrag);
    window.addEventListener('resize', scheduleUpdate, { passive: true });

    scheduleUpdate();
    scheduleRevealActive();

    const cleanup = () => {
        if (rafId) {
            window.cancelAnimationFrame(rafId);
            rafId = 0;
        }
        if (revealRafId) {
            window.cancelAnimationFrame(revealRafId);
            revealRafId = 0;
        }
        resizeObserver?.disconnect();
        mutationObserver?.disconnect();
        rail.removeEventListener('scroll', onScroll);
        rail.removeEventListener('wheel', onWheel);
        rail.removeEventListener('click', onClick);
        rail.removeEventListener('pointerdown', onPointerDown);
        rail.removeEventListener('pointermove', onPointerMove);
        rail.removeEventListener('pointerup', endDrag);
        rail.removeEventListener('pointercancel', endDrag);
        window.removeEventListener('resize', scheduleUpdate);
        rail.classList.remove('is-overflowing', 'is-at-start', 'is-at-end', 'is-dragging');
        delete rail.__viewControlsRailCleanup;
    };

    rail.__viewControlsRailCleanup = cleanup;
    return cleanup;
}
