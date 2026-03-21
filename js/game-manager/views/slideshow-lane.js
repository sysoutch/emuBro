export function updateSlideshowItemOrientationClass(item, imageEl) {
    if (!item || !imageEl) return false;
    const width = Number(imageEl.naturalWidth || 0);
    const height = Number(imageEl.naturalHeight || 0);
    if (!width || !height) return false;

    item.classList.remove(
        'slideshow-cover-orientation-portrait',
        'slideshow-cover-orientation-landscape',
        'slideshow-cover-orientation-square'
    );

    const ratio = width / height;
    if (ratio > 1.04) {
        item.classList.add('slideshow-cover-orientation-landscape');
    } else if (ratio < 0.96) {
        item.classList.add('slideshow-cover-orientation-portrait');
    } else {
        item.classList.add('slideshow-cover-orientation-square');
    }
    return true;
}

export function createSlideshowLane(options = {}) {
    const carousel = options.carousel;
    const track = options.track;
    if (!carousel || !track) {
        throw new Error('createSlideshowLane requires carousel and track elements.');
    }

    const itemSelector = String(options.itemSelector || '.slideshow-item');
    const reduceMotion = Boolean(options.reduceMotion);
    const modeRef = options.modeRef && typeof options.modeRef === 'object'
        ? options.modeRef
        : { mode: 'flat' };
    const renderToken = options.renderToken;
    const getRenderToken = typeof options.getRenderToken === 'function'
        ? options.getRenderToken
        : () => renderToken;
    const onNearestIndexChange = typeof options.onNearestIndexChange === 'function'
        ? options.onNearestIndexChange
        : () => {};
    const onSettledIndexChange = typeof options.onSettledIndexChange === 'function'
        ? options.onSettledIndexChange
        : () => {};
    const onActiveClick = typeof options.onActiveClick === 'function'
        ? options.onActiveClick
        : () => {};
    const onLaneFocus = typeof options.onLaneFocus === 'function'
        ? options.onLaneFocus
        : () => {};
    const onFrameSample = typeof options.onFrameSample === 'function'
        ? options.onFrameSample
        : null;
    const allowVerticalWheelPassThrough = Boolean(options.allowVerticalWheelPassThrough);
    const refreshItems = typeof options.refreshItems === 'function'
        ? options.refreshItems
        : () => false;
    const slightEdgeRotate = Number.isFinite(Number(options.slightEdgeRotate))
        ? Number(options.slightEdgeRotate)
        : 8;
    const fullRotate = Number.isFinite(Number(options.fullRotate))
        ? Number(options.fullRotate)
        : 20;

    let orientationRefreshHandle = 0;
    let transformFrameHandle = 0;
    let metricsDirty = true;
    let cachedLayout = null;
    let cachedMetrics = [];
    let resizeObserver = null;
    let currentIndex = Math.max(0, Number(options.initialIndex || 0));
    let isMoving = false;
    let isPointerDragging = false;
    let scrollX = 0;
    let activeClassIndex = -1;
    let suppressStripClickUntil = 0;
    let wheelDeltaCarry = 0;
    let lastWheelAt = 0;

    function applyStyleIfChanged(item, key, value) {
        if (!item || !item.style) return;
        if (item.style[key] === value) return;
        item.style[key] = value;
    }

    function invalidateLayoutCache() {
        metricsDirty = true;
        cachedLayout = null;
        cachedMetrics = [];
    }

    function scheduleOrientationRefresh() {
        if (orientationRefreshHandle) return;
        orientationRefreshHandle = requestAnimationFrame(() => {
            orientationRefreshHandle = 0;
            const changed = Boolean(refreshItems());
            if (!changed) return;
            invalidateLayoutCache();
            requestAnimationFrame(() => scrollToItem(currentIndex, false));
        });
    }

    function getItems() {
        return Array.from(track.querySelectorAll(itemSelector));
    }

    function getLength() {
        return getItems().length;
    }

    function getLayout() {
        if (!metricsDirty && cachedLayout) return cachedLayout;
        const rect = carousel.getBoundingClientRect();
        const style = window.getComputedStyle(track);
        const gap = parseFloat(style.gap) || 0;
        cachedLayout = {
            center: rect.width / 2,
            gap,
            viewportWidth: rect.width
        };
        return cachedLayout;
    }

    function getItemMetrics() {
        if (!metricsDirty && cachedMetrics.length) return cachedMetrics;
        cachedMetrics = getItems()
            .map((item) => ({
                item,
                index: Number.parseInt(item.dataset.index || '-1', 10),
                left: Number(item.offsetLeft || 0),
                width: Number(item.offsetWidth || 0),
                center: Number(item.offsetLeft || 0) + (Number(item.offsetWidth || 0) / 2)
            }))
            .filter((entry) => Number.isFinite(entry.index) && entry.index >= 0 && entry.width > 0);
        metricsDirty = false;
        return cachedMetrics;
    }

    function scheduleApplyTransforms() {
        if (transformFrameHandle) return;
        transformFrameHandle = requestAnimationFrame(() => {
            transformFrameHandle = 0;
            applyTransforms();
        });
    }

    function applyTransforms() {
        const frameStart = performance.now();
        if (renderToken !== getRenderToken()) return;
        const { center, gap, viewportWidth } = getLayout();
        const metrics = getItemMetrics();
        if (!metrics.length) return;

        const trackWidth = metrics[metrics.length - 1].left + metrics[metrics.length - 1].width;
        const edgeInset = Math.max(20, Math.min(80, viewportWidth * 0.04));
        const desiredTranslate = center - scrollX;
        const maxTranslate = edgeInset;
        const minTranslate = Math.min(maxTranslate, viewportWidth - trackWidth - edgeInset);
        const translateX = Math.max(minTranslate, Math.min(maxTranslate, desiredTranslate));
        const isEdgeLocked = Math.abs(translateX - maxTranslate) < 1 || Math.abs(translateX - minTranslate) < 1;

        track.style.transform = `translate3d(${translateX}px, 0, 0)`;

        let nearestIndex = currentIndex;
        let nearestDistance = Number.POSITIVE_INFINITY;

        const mode = String(modeRef.mode || 'flat');
        const isThreeD = mode === '3d' || mode === '3d-reverse';
        const isReverse = mode === '3d-reverse';
        const scaleBase = isReverse ? 1.08 : 1.15;
        const scaleDrop = isReverse ? 0.24 : 0.3;
        const rotateDirection = isReverse ? 1 : -1;
        const cullDistance = Math.max(viewportWidth * 0.96, (metrics[0]?.width || 0) * 6.2);
        let nearestItem = null;

        metrics.forEach(({ item, index, center: itemCenter, width }) => {
            const focusStep = Math.max(width + gap, 1);
            const diffX = itemCenter - scrollX;
            const distanceToCenter = Math.abs(diffX);
            if (distanceToCenter > cullDistance) {
                if (item.dataset.slideshowCulled !== '1') {
                    item.dataset.slideshowCulled = '1';
                    applyStyleIfChanged(item, 'transform', 'scale(0.8)');
                    applyStyleIfChanged(item, 'opacity', '0');
                    applyStyleIfChanged(item, 'zIndex', '0');
                }
                if (distanceToCenter < nearestDistance) {
                    nearestDistance = distanceToCenter;
                    nearestIndex = index;
                    nearestItem = item;
                }
                return;
            }
            if (item.dataset.slideshowCulled === '1') {
                item.dataset.slideshowCulled = '0';
            }
            const normalizedDist = Math.min(1, Math.abs(diffX) / (focusStep * 2.25));
            const scale = scaleBase - (normalizedDist * scaleDrop);
            const opacity = 1 - (normalizedDist * 0.6);
            const zIndex = Math.round((1 - normalizedDist) * 100);

            let transform = `scale(${scale})`;
            if (isThreeD) {
                const rotateMax = isEdgeLocked ? slightEdgeRotate : fullRotate;
                const rotateY = Math.abs(diffX) < 1
                    ? 0
                    : Math.max(-rotateMax, Math.min(rotateMax, (diffX / focusStep) * rotateMax * rotateDirection));
                const translateZ = isEdgeLocked ? normalizedDist * -68 : normalizedDist * -120;
                transform += ` rotateY(${rotateY}deg) translateZ(${translateZ}px)`;
            }

            applyStyleIfChanged(item, 'transform', transform);
            applyStyleIfChanged(item, 'opacity', String(opacity));
            applyStyleIfChanged(item, 'zIndex', String(zIndex));

            if (distanceToCenter < nearestDistance) {
                nearestDistance = distanceToCenter;
                nearestIndex = index;
                nearestItem = item;
            }
        });

        if (nearestIndex !== activeClassIndex) {
            if (activeClassIndex >= 0) {
                const previous = metrics.find((entry) => entry.index === activeClassIndex);
                previous?.item?.classList.remove('is-active');
            }
            nearestItem?.classList.add('is-active');
            activeClassIndex = nearestIndex;
        }

        if (nearestIndex !== currentIndex) {
            currentIndex = nearestIndex;
            onNearestIndexChange(currentIndex, {
                isMoving,
                isPointerDragging
            });
        }
        if (onFrameSample) {
            const frameMs = performance.now() - frameStart;
            onFrameSample({
                frameMs,
                itemCount: metrics.length,
                isMoving,
                isPointerDragging
            });
        }
    }

    function scrollToItem(targetIndex, smooth = true) {
        const metrics = getItemMetrics();
        const targetMetric = metrics.find((entry) => entry.index === targetIndex);
        if (!targetMetric) return;
        const targetX = targetMetric.center;

        if (!smooth || reduceMotion) {
            scrollX = targetX;
            currentIndex = targetIndex;
            applyTransforms();
            onSettledIndexChange(currentIndex);
            return;
        }

        const startX = scrollX;
        const startTime = performance.now();
        const duration = 300;

        function animate(now) {
            if (renderToken !== getRenderToken()) return;
            const elapsed = now - startTime;
            const t = Math.min(1, elapsed / duration);
            const ease = 1 - Math.pow(1 - t, 4);
            scrollX = startX + (targetX - startX) * ease;
            applyTransforms();

            if (t < 1) {
                requestAnimationFrame(animate);
                return;
            }

            scrollX = targetX;
            currentIndex = targetIndex;
            applyTransforms();
            isMoving = false;
            onSettledIndexChange(currentIndex);
        }

        isMoving = true;
        requestAnimationFrame(animate);
    }

    function activateItem(index) {
        const length = getLength();
        if (!length) return;
        const nextIndex = Math.max(0, Math.min(length - 1, Number(index) || 0));
        if (nextIndex === currentIndex) {
            onActiveClick(currentIndex);
            return;
        }
        scrollToItem(nextIndex);
    }

    function findSlideIndexFromPoint(clientX, clientY) {
        if (typeof document.elementsFromPoint !== 'function') return -1;
        const elements = document.elementsFromPoint(clientX, clientY);
        for (const element of elements) {
            const item = element?.closest?.(itemSelector);
            if (!item || !track.contains(item)) continue;
            const index = Number.parseInt(item.dataset.index || '-1', 10);
            if (Number.isFinite(index) && index >= 0) {
                return index;
            }
        }
        return -1;
    }

    (function initDragHandler() {
        let isArmed = false;
        let isDragging = false;
        let startPointerX = 0;
        let startScrollX = 0;
        let lastPointerX = 0;
        let velocity = 0;
        let lastTimestamp = 0;
        let downItemIndex = -1;

        const onDown = (event) => {
            if (event.pointerType === 'mouse' && event.button !== 0) return;
            onLaneFocus();
            isArmed = true;
            isDragging = false;
            startPointerX = event.clientX;
            lastPointerX = event.clientX;
            startScrollX = scrollX;
            lastTimestamp = performance.now();
            velocity = 0;
            downItemIndex = findSlideIndexFromPoint(event.clientX, event.clientY);
            carousel.setPointerCapture(event.pointerId);
        };

        const onMove = (event) => {
            if (!isArmed) return;
            const dx = event.clientX - startPointerX;
            if (!isDragging && Math.abs(dx) > 5) {
                isDragging = true;
                isPointerDragging = true;
                carousel.classList.add('is-dragging');
            }

            if (!isDragging) return;

            scrollX = startScrollX - dx;
            const now = performance.now();
            const dt = now - lastTimestamp;
            if (dt > 0) {
                velocity = (event.clientX - lastPointerX) / dt;
            }
            lastPointerX = event.clientX;
            lastTimestamp = now;
            scheduleApplyTransforms();
        };

        const onUp = (event) => {
            if (!isArmed) return;
            isArmed = false;
            carousel.classList.remove('is-dragging');
            carousel.releasePointerCapture(event.pointerId);

            if (!isDragging) {
                const upIndex = findSlideIndexFromPoint(event.clientX, event.clientY);
                const targetIndex = upIndex >= 0 ? upIndex : downItemIndex;
                if (performance.now() >= suppressStripClickUntil && targetIndex >= 0) {
                    activateItem(targetIndex);
                }
                downItemIndex = -1;
                return;
            }

            isDragging = false;
            isPointerDragging = false;
            suppressStripClickUntil = performance.now() + 100;
            downItemIndex = -1;

            const metrics = getItemMetrics();
            if (!metrics.length) return;
            let targetIdx = metrics[0].index;
            let targetDistance = Math.abs((metrics[0]?.center ?? 0) - scrollX);
            for (let idx = 1; idx < metrics.length; idx += 1) {
                const entry = metrics[idx];
                const entryDistance = Math.abs((entry?.center ?? 0) - scrollX);
                if (entryDistance < targetDistance) {
                    targetDistance = entryDistance;
                    targetIdx = entry.index;
                }
            }
            if (Math.abs(velocity) > 0.5) {
                targetIdx -= Math.sign(velocity);
            }
            targetIdx = Math.max(0, Math.min(getLength() - 1, targetIdx));
            scrollToItem(targetIdx);
        };

        carousel.addEventListener('pointerdown', onDown);
        carousel.addEventListener('pointermove', onMove);
        carousel.addEventListener('pointerup', onUp);
        carousel.addEventListener('pointercancel', onUp);
    })();

    carousel.addEventListener('wheel', (event) => {
        const length = getLength();
        if (length <= 1) return;
        const verticalIntent = Math.abs(event.deltaY) >= Math.abs(event.deltaX);
        if (allowVerticalWheelPassThrough && verticalIntent && !event.shiftKey) {
            // Let parent grouped slideshow containers keep natural vertical scrolling.
            return;
        }
        onLaneFocus();
        event.preventDefault();
        const dominantDelta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
        const now = performance.now();
        if ((now - lastWheelAt) > 240) {
            wheelDeltaCarry = 0;
        }
        lastWheelAt = now;
        wheelDeltaCarry += dominantDelta;
        if (Math.abs(wheelDeltaCarry) < 28) return;
        const direction = wheelDeltaCarry > 0 ? 1 : -1;
        wheelDeltaCarry = 0;
        scrollToItem(Math.max(0, Math.min(length - 1, currentIndex + direction)));
    }, { passive: false });

    if (typeof ResizeObserver === 'function') {
        resizeObserver = new ResizeObserver(() => {
            if (renderToken !== getRenderToken()) return;
            invalidateLayoutCache();
            scrollToItem(currentIndex, false);
        });
        resizeObserver.observe(carousel);
        resizeObserver.observe(track);
    }

    return {
        getCurrentIndex() {
            return currentIndex;
        },
        scrollToItem,
        activateItem,
        invalidateLayoutCache,
        scheduleOrientationRefresh,
        scheduleApplyTransforms,
        setMode() {
            scheduleApplyTransforms();
        },
        destroy() {
            if (orientationRefreshHandle) {
                cancelAnimationFrame(orientationRefreshHandle);
                orientationRefreshHandle = 0;
            }
            if (transformFrameHandle) {
                cancelAnimationFrame(transformFrameHandle);
                transformFrameHandle = 0;
            }
            if (resizeObserver) {
                try {
                    resizeObserver.disconnect();
                } catch (_error) {}
                resizeObserver = null;
            }
        }
    };
}
