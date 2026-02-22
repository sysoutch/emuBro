import {
    normalizeBackgroundLayerPosition,
    normalizeBackgroundLayerSize,
    normalizeBackgroundLayerRepeat,
    normalizeBackgroundLayerOffset,
    normalizeBackgroundSurfaceTarget,
    normalizeBaseBackgroundPosition,
    normalizeBaseBackgroundScale,
    mapLegacyScaleToLayerSize,
    createBackgroundLayerDraft,
    cloneBackgroundLayerDrafts
} from './background-utils';

export function getThemeBackgroundConfigFromForm(overrides = {}, options = {}) {
    const hasImageOverride = Object.prototype.hasOwnProperty.call(overrides, 'image');
    const hasTopImageOverride = Object.prototype.hasOwnProperty.call(overrides, 'topImage');
    const hasTitleImageOverride = Object.prototype.hasOwnProperty.call(overrides, 'titleImage');
    const image = hasImageOverride ? overrides.image : (options.currentBackgroundImage || null);
    const topImage = hasTopImageOverride ? overrides.topImage : (options.currentTopBackgroundImage || null);
    const titleImage = hasTitleImageOverride ? overrides.titleImage : (options.currentTitleBackgroundImage || null);
    const surfaceDraft = options.surfaceDraft || { base: {}, top: {}, title: {}, target: 'base' };
    const basePositionValue = normalizeBaseBackgroundPosition(surfaceDraft.base?.position || 'centered');
    const baseRepeat = normalizeBackgroundLayerRepeat(surfaceDraft.base?.repeat || 'no-repeat');
    const baseScale = normalizeBaseBackgroundScale(surfaceDraft.base?.scale || 'crop');
    const baseOffsetX = normalizeBackgroundLayerOffset(surfaceDraft.base?.offsetX || 0);
    const baseOffsetY = normalizeBackgroundLayerOffset(surfaceDraft.base?.offsetY || 0);
    const baseBehavior = basePositionValue === 'fixed' ? 'fixed' : 'scroll';
    const basePosition = (basePositionValue === 'fixed' || basePositionValue === 'centered')
        ? 'center center'
        : normalizeBackgroundLayerPosition(basePositionValue);

    const topPosition = normalizeBackgroundLayerPosition(surfaceDraft.top?.position || 'top center');
    const topRepeat = normalizeBackgroundLayerRepeat(surfaceDraft.top?.repeat || 'no-repeat');
    const topScale = normalizeBackgroundLayerSize(surfaceDraft.top?.scale || '100% auto');
    const topOffsetX = normalizeBackgroundLayerOffset(surfaceDraft.top?.offsetX || 0);
    const topOffsetY = normalizeBackgroundLayerOffset(surfaceDraft.top?.offsetY || 0);

    const titlePosition = normalizeBackgroundLayerPosition(surfaceDraft.title?.position || 'center center');
    const titleRepeat = normalizeBackgroundLayerRepeat(surfaceDraft.title?.repeat || 'no-repeat');
    const titleScale = normalizeBackgroundLayerSize(surfaceDraft.title?.scale || 'cover');
    const titleOffsetX = normalizeBackgroundLayerOffset(surfaceDraft.title?.offsetX || 0);
    const titleOffsetY = normalizeBackgroundLayerOffset(surfaceDraft.title?.offsetY || 0);

    const layers = [];
    if (image) {
        layers.push(createBackgroundLayerDraft({
            id: 'base',
            image,
            imageName: options.currentBackgroundImageName || '',
            position: basePosition,
            size: mapLegacyScaleToLayerSize(baseScale),
            repeat: baseRepeat,
            behavior: baseBehavior,
            opacity: 1,
            blendMode: 'normal',
            offsetX: baseOffsetX,
            offsetY: baseOffsetY
        }));
    }

    if (topImage) {
        layers.push(createBackgroundLayerDraft({
            id: 'top',
            image: topImage,
            imageName: options.currentTopBackgroundImageName || '',
            position: topPosition,
            size: topScale,
            repeat: topRepeat,
            behavior: 'scroll',
            opacity: 1,
            blendMode: 'normal',
            offsetX: topOffsetX,
            offsetY: topOffsetY
        }));
    }

    const extraLayers = cloneBackgroundLayerDrafts(options.backgroundLayerDrafts || []).map((layer) => {
        const clean = { ...layer };
        delete clean.collapsed;
        return clean;
    });
    layers.push(...extraLayers);

    return {
        image,
        imagePath: null,
        position: baseBehavior === 'fixed' ? 'fixed' : 'centered',
        basePosition,
        baseBehavior,
        scale: baseScale,
        baseScale,
        repeat: baseRepeat,
        baseRepeat,
        baseOffsetX,
        baseOffsetY,
        topImage,
        topHeight: 220,
        topOpacity: 1,
        topScale,
        topRepeat,
        topPosition,
        topOffsetX,
        topOffsetY,
        titleImage,
        titleOpacity: 0.36,
        titleSize: titleScale,
        titleScale,
        titleRepeat,
        titlePosition,
        titleOffsetX,
        titleOffsetY,
        editTarget: normalizeBackgroundSurfaceTarget(surfaceDraft.target),
        layers,
        ...overrides
    };
}
