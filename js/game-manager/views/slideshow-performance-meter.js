export function createSlideshowPerformanceMeter(options = {}) {
    const host = options.host instanceof HTMLElement ? options.host : null;
    if (!host) {
        return {
            onRenderSample() {},
            destroy() {}
        };
    }

    const label = String(options.label || 'Slide');
    const meter = document.createElement('div');
    meter.className = 'slideshow-perf-meter';
    meter.setAttribute('role', 'status');
    meter.setAttribute('aria-live', 'polite');
    meter.setAttribute('aria-label', `${label} performance`);
    host.appendChild(meter);

    let rafId = 0;
    let destroyed = false;
    let frameWindowStart = 0;
    let frameCount = 0;
    let fps = 0;

    let lastRenderAt = 0;
    let renderSampleCount = 0;
    let renderSampleTotal = 0;
    let renderWorstMs = 0;
    let renderJankCount = 0;
    let renderAvgMs = 0;
    let lastKnownItemCount = 0;

    function renderLabel() {
        const now = performance.now();
        const isIdle = (now - lastRenderAt) > 1400;
        const fpsText = Number.isFinite(fps) ? Math.max(0, Math.round(fps)) : 0;
        if (isIdle) {
            meter.textContent = `${label} FPS ${fpsText} | Idle`;
            return;
        }
        meter.textContent = `${label} FPS ${fpsText} | Draw ${renderAvgMs.toFixed(1)}ms | Jank ${renderJankCount} | Items ${lastKnownItemCount}`;
    }

    function flushRenderWindow() {
        if (renderSampleCount > 0) {
            renderAvgMs = renderSampleTotal / renderSampleCount;
        } else {
            renderAvgMs = 0;
            renderWorstMs = 0;
            renderJankCount = 0;
        }
        renderSampleCount = 0;
        renderSampleTotal = 0;
        renderWorstMs = 0;
        renderJankCount = 0;
    }

    function onAnimationFrame(now) {
        if (destroyed) return;
        if (!frameWindowStart) frameWindowStart = now;
        frameCount += 1;
        const elapsed = now - frameWindowStart;
        if (elapsed >= 500) {
            fps = (frameCount * 1000) / elapsed;
            frameCount = 0;
            frameWindowStart = now;
            flushRenderWindow();
            renderLabel();
        }
        rafId = requestAnimationFrame(onAnimationFrame);
    }

    rafId = requestAnimationFrame(onAnimationFrame);
    renderLabel();

    return {
        onRenderSample(sample = {}) {
            const ms = Number(sample.frameMs || 0);
            if (!Number.isFinite(ms) || ms <= 0) return;
            lastRenderAt = performance.now();
            renderSampleCount += 1;
            renderSampleTotal += ms;
            renderWorstMs = Math.max(renderWorstMs, ms);
            if (ms >= 18) renderJankCount += 1;
            const count = Number(sample.itemCount || 0);
            if (Number.isFinite(count) && count > 0) {
                lastKnownItemCount = Math.round(count);
            }
        },
        destroy() {
            if (destroyed) return;
            destroyed = true;
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = 0;
            }
            if (meter.isConnected) meter.remove();
        }
    };
}
