/**
 * Theme background application helpers
 */

import {
    clampNumber,
    normalizeBackgroundLayerSize,
    normalizeBackgroundLayerOffset,
    resolveBackgroundPositionWithOffset,
    extractBackgroundLayers,
    createBackgroundLayerDraft
} from './background-utils';

let lastAppliedBackgroundSignature = '';
let fixedBackgroundTracking = null;

export function disableFixedBackgroundTracking() {
    if (fixedBackgroundTracking && fixedBackgroundTracking.gameGrid) {
        fixedBackgroundTracking.gameGrid.style.backgroundAttachment = 'scroll';
    }
    fixedBackgroundTracking = null;
}

export function enableFixedBackgroundTracking(gameGrid) {
    disableFixedBackgroundTracking();
    gameGrid.style.backgroundAttachment = 'fixed';
    gameGrid.style.backgroundPosition = 'center';
    fixedBackgroundTracking = { gameGrid: gameGrid };
}

export function clearTopBackgroundLayer(gameGrid = null) {
    const grid = gameGrid || document.querySelector('main.game-grid');
    if (!grid) return;
    grid.style.setProperty('--theme-top-bg-image', 'none');
    grid.style.setProperty('--theme-top-bg-size', '100% auto');
    grid.style.setProperty('--theme-top-bg-repeat', 'no-repeat');
    grid.style.setProperty('--theme-top-bg-position', 'top center');
    grid.style.setProperty('--theme-top-bg-height', '0px');
    grid.style.setProperty('--theme-top-bg-opacity', '0');
}

export function clearTitleBackgroundLayer(gameGrid = null) {
    const grid = gameGrid || document.querySelector('main.game-grid');
    if (!grid) return;
    grid.style.setProperty('--theme-title-strip-image', 'none');
    grid.style.setProperty('--theme-title-strip-size', 'cover');
    grid.style.setProperty('--theme-title-strip-repeat', 'no-repeat');
    grid.style.setProperty('--theme-title-strip-position', 'center center');
    grid.style.setProperty('--theme-title-strip-opacity', '0');
}

function isDataImageUrl(value) {
    const text = String(value || '').trim();
    return /^data:image\//i.test(text);
}

function resolveThemeBackgroundAssetUrl(source, urlsInUse = null, dataUrlCache = null) {
    void urlsInUse;
    void dataUrlCache;
    const raw = String(source || '').trim();
    if (!raw) return '';
    return raw;
}

function pruneThemeBackgroundAssetUrls(urlsInUse = null) {
    void urlsInUse;
}

function releaseAllThemeBackgroundAssetUrls() {
    pruneThemeBackgroundAssetUrls(new Set());
}

function applyTopBackgroundLayer(gameGrid, bgConfig = {}, assetUrlsInUse = null, dataUrlCache = null) {
    if (!gameGrid) return;
    const topImage = bgConfig.topImage || bgConfig.top?.image || null;
    if (!topImage) {
        clearTopBackgroundLayer(gameGrid);
        return;
    }

    const safeTopImage = String(resolveThemeBackgroundAssetUrl(topImage, assetUrlsInUse, dataUrlCache)).replace(/'/g, "\\'");
    const topHeight = clampNumber(Number.parseInt(bgConfig.topHeight ?? bgConfig.top?.height ?? 220, 10), 60, 640);
    const topOpacity = clampNumber(Number.parseFloat(bgConfig.topOpacity ?? bgConfig.top?.opacity ?? 1), 0, 1);
    const topSize = normalizeBackgroundLayerSize(String(bgConfig.topScale ?? bgConfig.top?.scale ?? '100% auto').trim() || '100% auto');
    const topRepeat = String(bgConfig.topRepeat ?? bgConfig.top?.repeat ?? 'no-repeat').trim() || 'no-repeat';
    const topPositionRaw = String(bgConfig.topPosition ?? bgConfig.top?.position ?? 'top center').trim() || 'top center';
    const topOffsetX = normalizeBackgroundLayerOffset(bgConfig.topOffsetX ?? bgConfig.top?.offsetX ?? 0);
    const topOffsetY = normalizeBackgroundLayerOffset(bgConfig.topOffsetY ?? bgConfig.top?.offsetY ?? 0);
    const topPosition = resolveBackgroundPositionWithOffset(topPositionRaw, topOffsetX, topOffsetY);

    gameGrid.style.setProperty('--theme-top-bg-image', `url('${safeTopImage}')`);
    gameGrid.style.setProperty('--theme-top-bg-size', topSize);
    gameGrid.style.setProperty('--theme-top-bg-repeat', topRepeat);
    gameGrid.style.setProperty('--theme-top-bg-position', topPosition);
    gameGrid.style.setProperty('--theme-top-bg-height', `${topHeight}px`);
    gameGrid.style.setProperty('--theme-top-bg-opacity', String(topOpacity));
}

function applyTitleBackgroundLayer(gameGrid, bgConfig = {}, assetUrlsInUse = null, dataUrlCache = null) {
    if (!gameGrid) return;
    const titleImage = bgConfig.titleImage || bgConfig.title?.image || null;
    if (!titleImage) {
        clearTitleBackgroundLayer(gameGrid);
        return;
    }

    const safeTitleImage = String(resolveThemeBackgroundAssetUrl(titleImage, assetUrlsInUse, dataUrlCache)).replace(/'/g, "\\'");
    const titleOpacity = clampNumber(Number.parseFloat(bgConfig.titleOpacity ?? bgConfig.title?.opacity ?? 0.36), 0, 1);
    const titleSize = normalizeBackgroundLayerSize(String(bgConfig.titleSize ?? bgConfig.title?.size ?? 'cover').trim() || 'cover');
    const titleRepeat = String(bgConfig.titleRepeat ?? bgConfig.title?.repeat ?? 'no-repeat').trim() || 'no-repeat';
    const titlePositionRaw = String(bgConfig.titlePosition ?? bgConfig.title?.position ?? 'center center').trim() || 'center center';
    const titleOffsetX = normalizeBackgroundLayerOffset(bgConfig.titleOffsetX ?? bgConfig.title?.offsetX ?? 0);
    const titleOffsetY = normalizeBackgroundLayerOffset(bgConfig.titleOffsetY ?? bgConfig.title?.offsetY ?? 0);

    const headerOffsets = getGameHeaderOffsets(gameGrid);
    const headerHeight = Math.max(0, Number.parseInt((headerOffsets.bottom ?? 0) - (headerOffsets.top ?? 0), 10) || 0);
    const effectiveTitleOffsetY = normalizeBackgroundLayerOffset(titleOffsetY + headerHeight);
    const titlePosition = resolveBackgroundPositionWithOffset(titlePositionRaw, titleOffsetX, effectiveTitleOffsetY);

    gameGrid.style.setProperty('--theme-title-strip-image', `url('${safeTitleImage}')`);
    gameGrid.style.setProperty('--theme-title-strip-size', titleSize);
    gameGrid.style.setProperty('--theme-title-strip-repeat', titleRepeat);
    gameGrid.style.setProperty('--theme-title-strip-position', titlePosition);
    gameGrid.style.setProperty('--theme-title-strip-opacity', String(titleOpacity));
}

export function clearGameGridBackgroundLayers(gameGrid = null) {
    const grid = gameGrid || document.querySelector('main.game-grid');
    if (!grid) return;
    lastAppliedBackgroundSignature = '';
    grid.style.backgroundImage = 'none';
    grid.style.backgroundRepeat = 'no-repeat';
    grid.style.backgroundSize = 'cover';
    grid.style.backgroundPosition = 'center';
    grid.style.backgroundAttachment = 'scroll';
    clearTopBackgroundLayer(grid);
    clearTitleBackgroundLayer(grid);
    const host = grid.querySelector('.theme-bg-layer-host');
    if (host) host.innerHTML = '';
    releaseAllThemeBackgroundAssetUrls();
}

function ensureThemeBackgroundLayerHost(gameGrid) {
    if (!gameGrid) return null;
    let host = gameGrid.querySelector('.theme-bg-layer-host');
    if (!host) {
        host = document.createElement('div');
        host.className = 'theme-bg-layer-host';
        gameGrid.insertBefore(host, gameGrid.firstChild);
    }
    return host;
}

function getGameHeaderOffsets(gameGrid) {
    if (!gameGrid) {
        return { top: 0, bottom: 0 };
    }
    const gameHeader = gameGrid.querySelector('.game-header');
    if (!gameHeader) {
        return { top: 0, bottom: 0 };
    }
    const gridRect = gameGrid.getBoundingClientRect();
    const headerRect = gameHeader.getBoundingClientRect();
    const topOffset = Number.parseFloat((headerRect?.top ?? 0) - (gridRect?.top ?? 0));
    const bottomOffset = Number.parseFloat((headerRect?.bottom ?? 0) - (gridRect?.top ?? 0));
    return {
        top: Number.isFinite(topOffset) ? Math.max(0, topOffset) : 0,
        bottom: Number.isFinite(bottomOffset) ? Math.max(0, bottomOffset) : 0
    };
}

function resolveLayerSizeCss(sizeValue) {
    const size = normalizeBackgroundLayerSize(sizeValue);
    return size;
}

function describeBackgroundAssetForSignature(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (!isDataImageUrl(raw)) return raw;
    return `data:${raw.length}:${raw.slice(0, 24)}:${raw.slice(-24)}`;
}

function buildBackgroundApplySignature(config = {}, layers = []) {
    const titleImage = config?.titleImage || config?.title?.image || '';
    const titlePart = [
        describeBackgroundAssetForSignature(titleImage),
        Number(config?.titleOpacity ?? config?.title?.opacity ?? 0.36),
        String(config?.titleSize ?? config?.title?.size ?? 'cover'),
        String(config?.titleRepeat ?? config?.title?.repeat ?? 'no-repeat'),
        String(config?.titlePosition ?? config?.title?.position ?? 'center center'),
        Number(config?.titleOffsetX ?? config?.title?.offsetX ?? 0),
        Number(config?.titleOffsetY ?? config?.title?.offsetY ?? 0)
    ].join('|');
    const layerParts = (Array.isArray(layers) ? layers : []).map((layer) => [
        describeBackgroundAssetForSignature(layer?.image || ''),
        String(layer?.position || ''),
        String(layer?.size || ''),
        String(layer?.repeat || ''),
        String(layer?.behavior || ''),
        String(layer?.blendMode || ''),
        Number(layer?.opacity ?? 1),
        Number(layer?.offsetX ?? 0),
        Number(layer?.offsetY ?? 0),
        layer?.belowTitleBar ? '1' : '0'
    ].join('|'));
    return `${titlePart}||${layerParts.join('||')}`;
}

export function applyBackgroundImage(bgConfig) {
    const gameGrid = document.querySelector('main.game-grid');
    if (!gameGrid) return;

    const config = bgConfig || {};
    const layers = extractBackgroundLayers(config);
    const applySignature = buildBackgroundApplySignature(config, layers);
    if (applySignature && applySignature === lastAppliedBackgroundSignature) {
        return;
    }
    lastAppliedBackgroundSignature = applySignature;
    const assetUrlsInUse = new Set();
    const dataUrlCache = new Map();
    pruneThemeBackgroundAssetUrls(new Set());

    disableFixedBackgroundTracking();
    gameGrid.style.backgroundImage = 'none';
    gameGrid.style.backgroundRepeat = 'no-repeat';
    gameGrid.style.backgroundAttachment = 'scroll';
    gameGrid.style.backgroundSize = 'cover';
    gameGrid.style.backgroundPosition = 'center';
    clearTopBackgroundLayer(gameGrid);
    clearTitleBackgroundLayer(gameGrid);
    applyTitleBackgroundLayer(gameGrid, config, assetUrlsInUse, dataUrlCache);

    const host = ensureThemeBackgroundLayerHost(gameGrid);
    if (!host) {
        pruneThemeBackgroundAssetUrls(assetUrlsInUse);
        return;
    }
    host.innerHTML = '';

    if (layers.length === 0) {
        pruneThemeBackgroundAssetUrls(assetUrlsInUse);
        return;
    }

    const headerOffsets = getGameHeaderOffsets(gameGrid);
    const seamOverlapPx = 1;
    layers.forEach((rawLayer, index) => {
        const layer = createBackgroundLayerDraft(rawLayer);
        if (!layer.image) return;
        const layerEl = document.createElement('div');
        layerEl.className = 'theme-bg-layer';
        layerEl.style.zIndex = String(index);
        const layerImageUrl = resolveThemeBackgroundAssetUrl(layer.image, assetUrlsInUse, dataUrlCache);
        layerEl.style.backgroundImage = `url('${String(layerImageUrl).replace(/'/g, "\\'")}')`;
        layerEl.style.backgroundPosition = resolveBackgroundPositionWithOffset(layer.position, layer.offsetX, layer.offsetY);
        layerEl.style.backgroundSize = resolveLayerSizeCss(layer.size);
        layerEl.style.backgroundRepeat = layer.repeat;
        layerEl.style.backgroundAttachment = layer.behavior === 'fixed' ? 'fixed' : 'scroll';
        layerEl.style.mixBlendMode = layer.blendMode;
        layerEl.style.opacity = String(layer.opacity);
        layerEl.style.inset = '0';

        const clipTop = layer.belowTitleBar
            ? Math.max(0, headerOffsets.bottom - seamOverlapPx)
            : Math.max(0, headerOffsets.top);
        if (clipTop > 0) {
            const clipValue = `inset(${clipTop}px 0 0 0)`;
            layerEl.style.clipPath = clipValue;
            layerEl.style.webkitClipPath = clipValue;
        } else {
            layerEl.style.clipPath = 'none';
            layerEl.style.webkitClipPath = 'none';
        }
        host.appendChild(layerEl);
    });

    pruneThemeBackgroundAssetUrls(assetUrlsInUse);
}
