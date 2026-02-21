export const BACKGROUND_LAYER_POSITIONS = [
    { value: 'center center', label: 'Center' },
    { value: 'top center', label: 'Top' },
    { value: 'top right', label: 'Top Right' },
    { value: 'center right', label: 'Right' },
    { value: 'bottom right', label: 'Bottom Right' },
    { value: 'bottom center', label: 'Bottom' },
    { value: 'bottom left', label: 'Bottom Left' },
    { value: 'center left', label: 'Left' },
    { value: 'top left', label: 'Top Left' }
];

export const BACKGROUND_LAYER_SIZE_OPTIONS = [
    { value: 'cover', label: 'Cover' },
    { value: 'contain', label: 'Contain' },
    { value: 'auto', label: 'Original' },
    { value: '100% 100%', label: 'Stretch' },
    { value: '100% auto', label: 'Top Banner' }
];

export const BACKGROUND_LAYER_REPEAT_OPTIONS = [
    { value: 'no-repeat', label: 'No Repeat' },
    { value: 'repeat', label: 'Repeat' },
    { value: 'repeat-x', label: 'Repeat X' },
    { value: 'repeat-y', label: 'Repeat Y' }
];

export const BACKGROUND_LAYER_BEHAVIOR_OPTIONS = [
    { value: 'scroll', label: 'Scroll With View' },
    { value: 'fixed', label: 'Fixed In Window' }
];

export const BACKGROUND_LAYER_BLEND_OPTIONS = [
    { value: 'normal', label: 'Normal' },
    { value: 'screen', label: 'Screen' },
    { value: 'overlay', label: 'Overlay' },
    { value: 'multiply', label: 'Multiply' },
    { value: 'soft-light', label: 'Soft Light' },
    { value: 'lighten', label: 'Lighten' }
];

export const BACKGROUND_SURFACE_TARGET_OPTIONS = [
    { value: 'base', label: 'Background' },
    { value: 'top', label: 'Top Banner' },
    { value: 'title', label: 'Top Title Bar' }
];

export const BASE_BACKGROUND_POSITION_OPTIONS = [
    { value: 'centered', label: 'Centered (Scroll)' },
    { value: 'fixed', label: 'Centered (Fixed)' },
    { value: 'top center', label: 'Top' },
    { value: 'top right', label: 'Top Right' },
    { value: 'center right', label: 'Right' },
    { value: 'bottom right', label: 'Bottom Right' },
    { value: 'bottom center', label: 'Bottom' },
    { value: 'bottom left', label: 'Bottom Left' },
    { value: 'center left', label: 'Left' },
    { value: 'top left', label: 'Top Left' }
];

export const BASE_BACKGROUND_SCALE_OPTIONS = [
    { value: 'crop', label: 'Crop (Cover)' },
    { value: 'zoom', label: 'Zoom (Contain)' },
    { value: 'stretch', label: 'Stretch (Fill)' },
    { value: 'original', label: 'Original Size' },
    { value: '100% auto', label: 'Top Banner' }
];

export function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function makeLayerId() {
    return `bg_layer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeBackgroundLayerPosition(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw || raw === 'centered' || raw === 'center') return 'center center';
    if (raw === 'fixed') return 'center center';
    if (raw === 'top') return 'top center';
    if (raw === 'bottom') return 'bottom center';
    if (raw === 'left') return 'center left';
    if (raw === 'right') return 'center right';
    if (raw === 'top-left') return 'top left';
    if (raw === 'top-right') return 'top right';
    if (raw === 'bottom-left') return 'bottom left';
    if (raw === 'bottom-right') return 'bottom right';
    const known = new Set(BACKGROUND_LAYER_POSITIONS.map((item) => item.value));
    if (known.has(raw)) return raw;
    return 'center center';
}

export function normalizeBackgroundLayerSize(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return 'cover';
    if (raw === 'crop') return 'cover';
    if (raw === 'zoom') return 'contain';
    if (raw === 'stretch') return '100% 100%';
    if (raw === 'original') return 'auto';
    const known = new Set(BACKGROUND_LAYER_SIZE_OPTIONS.map((item) => item.value.toLowerCase()));
    if (known.has(raw)) {
        if (raw === '100% 100%') return '100% 100%';
        if (raw === '100% auto') return '100% auto';
        return raw;
    }
    return 'cover';
}

export function normalizeBackgroundLayerRepeat(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (BACKGROUND_LAYER_REPEAT_OPTIONS.some((item) => item.value === raw)) return raw;
    return 'no-repeat';
}

export function normalizeBackgroundLayerBehavior(value) {
    return String(value || '').trim().toLowerCase() === 'fixed' ? 'fixed' : 'scroll';
}

export function normalizeBackgroundLayerBlendMode(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (BACKGROUND_LAYER_BLEND_OPTIONS.some((item) => item.value === raw)) return raw;
    return 'normal';
}

export function normalizeBackgroundLayerOpacity(value) {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed)) return 1;
    return clampNumber(parsed, 0, 1);
}

export function normalizeBackgroundLayerOffset(value) {
    const parsed = Number.parseInt(String(value ?? '').trim(), 10);
    if (!Number.isFinite(parsed)) return 0;
    return clampNumber(parsed, -5000, 5000);
}

export function resolveBackgroundPositionWithOffset(positionValue, offsetX = 0, offsetY = 0) {
    const normalized = normalizeBackgroundLayerPosition(positionValue);
    const tokens = normalized.split(/\s+/).filter(Boolean);

    const horizontalTokens = new Set(['left', 'center', 'right']);
    const verticalTokens = new Set(['top', 'center', 'bottom']);
    let horizontal = 'center';
    let vertical = 'center';

    tokens.forEach((token) => {
        const value = String(token || '').trim().toLowerCase();
        if (horizontalTokens.has(value)) horizontal = value;
        if (verticalTokens.has(value) && value !== 'center') vertical = value;
    });

    const xBase = horizontal === 'left' ? '0%' : horizontal === 'right' ? '100%' : '50%';
    const yBase = vertical === 'top' ? '0%' : vertical === 'bottom' ? '100%' : '50%';
    const ox = normalizeBackgroundLayerOffset(offsetX);
    const oy = normalizeBackgroundLayerOffset(offsetY);

    const formatAxis = (base, offset) => {
        if (offset === 0) return base;
        const sign = offset > 0 ? '+' : '-';
        return `calc(${base} ${sign} ${Math.abs(offset)}px)`;
    };

    return `${formatAxis(xBase, ox)} ${formatAxis(yBase, oy)}`;
}

export function normalizeBackgroundLayerBelowTitleBar(value, layerId = '') {
    if (typeof value === 'boolean') return value;

    const raw = String(value ?? '').trim().toLowerCase();
    if (raw === 'true' || raw === '1' || raw === 'yes' || raw === 'on') return true;
    if (raw === 'false' || raw === '0' || raw === 'no' || raw === 'off') return false;

    // Keep legacy base/top layers full-height unless explicitly enabled.
    const normalizedId = String(layerId || '').trim().toLowerCase();
    if (normalizedId === 'base' || normalizedId === 'top' || normalizedId === 'legacy_base' || normalizedId === 'legacy_top') {
        return false;
    }
    return true;
}

export function mapLegacyScaleToLayerSize(scale) {
    const value = String(scale || '').trim().toLowerCase();
    if (value === 'original') return 'auto';
    if (value === 'stretch') return '100% 100%';
    if (value === 'zoom') return 'contain';
    if (value === 'crop') return 'cover';
    return normalizeBackgroundLayerSize(value || 'cover');
}

export function mapLayerSizeToLegacyScale(sizeValue) {
    const normalized = normalizeBackgroundLayerSize(sizeValue);
    if (normalized === 'auto') return 'original';
    if (normalized === '100% 100%') return 'stretch';
    if (normalized === 'contain') return 'zoom';
    if (normalized === '100% auto') return '100% auto';
    return 'crop';
}

export function normalizeBackgroundSurfaceTarget(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (raw === 'top' || raw === 'title') return raw;
    return 'base';
}

export function normalizeBaseBackgroundPosition(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (raw === 'fixed') return 'fixed';
    if (raw === 'centered') return 'centered';
    return normalizeBackgroundLayerPosition(raw || 'center center');
}

export function normalizeBaseBackgroundScale(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (raw === 'original' || raw === 'stretch' || raw === 'crop' || raw === 'zoom') return raw;
    return mapLayerSizeToLegacyScale(raw || 'cover');
}

export function createDefaultBackgroundSurfaceDraft() {
    return {
        target: 'base',
        base: {
            position: 'centered',
            repeat: 'no-repeat',
            scale: 'crop',
            offsetX: 0,
            offsetY: 0
        },
        top: {
            position: 'top center',
            repeat: 'no-repeat',
            scale: '100% auto',
            offsetX: 0,
            offsetY: 0
        },
        title: {
            position: 'center center',
            repeat: 'no-repeat',
            scale: 'cover',
            offsetX: 0,
            offsetY: 0
        }
    };
}

export function createBackgroundSurfaceDraftFromConfig(bgConfig = {}) {
    const config = (bgConfig && typeof bgConfig === 'object') ? bgConfig : {};
    const draft = createDefaultBackgroundSurfaceDraft();

    const basePositionRaw = config.basePosition || config.position || draft.base.position;
    draft.base.position = normalizeBaseBackgroundPosition(basePositionRaw);
    draft.base.repeat = normalizeBackgroundLayerRepeat(config.baseRepeat || config.repeat || draft.base.repeat);
    draft.base.scale = normalizeBaseBackgroundScale(config.baseScale || config.scale || draft.base.scale);
    draft.base.offsetX = normalizeBackgroundLayerOffset(config.baseOffsetX ?? config.offsetX ?? config.base?.offsetX ?? draft.base.offsetX);
    draft.base.offsetY = normalizeBackgroundLayerOffset(config.baseOffsetY ?? config.offsetY ?? config.base?.offsetY ?? draft.base.offsetY);
    if (String(config.baseBehavior || '').trim().toLowerCase() === 'fixed') {
        draft.base.position = 'fixed';
    }

    draft.top.position = normalizeBackgroundLayerPosition(config.topPosition || config.top?.position || draft.top.position);
    draft.top.repeat = normalizeBackgroundLayerRepeat(config.topRepeat || config.top?.repeat || draft.top.repeat);
    draft.top.scale = normalizeBackgroundLayerSize(config.topScale || config.top?.scale || draft.top.scale);
    draft.top.offsetX = normalizeBackgroundLayerOffset(config.topOffsetX ?? config.top?.offsetX ?? draft.top.offsetX);
    draft.top.offsetY = normalizeBackgroundLayerOffset(config.topOffsetY ?? config.top?.offsetY ?? draft.top.offsetY);

    draft.title.position = normalizeBackgroundLayerPosition(config.titlePosition || config.title?.position || draft.title.position);
    draft.title.repeat = normalizeBackgroundLayerRepeat(config.titleRepeat || config.title?.repeat || draft.title.repeat);
    draft.title.scale = normalizeBackgroundLayerSize(
        config.titleSize || config.titleScale || config.title?.size || config.title?.scale || draft.title.scale
    );
    draft.title.offsetX = normalizeBackgroundLayerOffset(config.titleOffsetX ?? config.title?.offsetX ?? draft.title.offsetX);
    draft.title.offsetY = normalizeBackgroundLayerOffset(config.titleOffsetY ?? config.title?.offsetY ?? draft.title.offsetY);

    draft.target = normalizeBackgroundSurfaceTarget(config.editTarget || draft.target);
    return draft;
}

export function createBackgroundLayerDraft(overrides = {}) {
    const explicitBehavior = overrides.behavior || overrides.attachment;
    const fallbackBehavior = String(overrides.position || '').trim().toLowerCase() === 'fixed' ? 'fixed' : 'scroll';
    const layerId = String(overrides.id || makeLayerId());
    return {
        id: layerId,
        name: String(overrides.name || '').trim(),
        image: typeof overrides.image === 'string' && overrides.image.trim().length > 0 ? overrides.image : null,
        imageName: String(overrides.imageName || overrides.fileName || '').trim(),
        position: normalizeBackgroundLayerPosition(overrides.position || 'center center'),
        size: normalizeBackgroundLayerSize(overrides.size || overrides.scale || 'cover'),
        repeat: normalizeBackgroundLayerRepeat(overrides.repeat || 'no-repeat'),
        behavior: normalizeBackgroundLayerBehavior(explicitBehavior || fallbackBehavior),
        opacity: normalizeBackgroundLayerOpacity(overrides.opacity ?? 1),
        blendMode: normalizeBackgroundLayerBlendMode(overrides.blendMode || 'normal'),
        offsetX: normalizeBackgroundLayerOffset(overrides.offsetX ?? 0),
        offsetY: normalizeBackgroundLayerOffset(overrides.offsetY ?? 0),
        belowTitleBar: normalizeBackgroundLayerBelowTitleBar(overrides.belowTitleBar, layerId),
        collapsed: Boolean(overrides.collapsed)
    };
}

export function cloneBackgroundLayerDrafts(layers = []) {
    return (Array.isArray(layers) ? layers : [])
        .map((layer) => createBackgroundLayerDraft(layer))
        .filter((layer) => layer && layer.image);
}

export function extractBackgroundLayers(bgConfig = {}) {
    const config = bgConfig || {};
    if (Array.isArray(config.layers) && config.layers.length > 0) {
        return cloneBackgroundLayerDrafts(config.layers);
    }

    const layers = [];
    if (config.image) {
        const baseBehavior = normalizeBackgroundLayerBehavior(config.baseBehavior || (config.position === 'fixed' ? 'fixed' : 'scroll'));
        const basePosition = normalizeBackgroundLayerPosition(config.basePosition || config.position || 'center center');
        layers.push(createBackgroundLayerDraft({
            id: 'legacy_base',
            image: config.image,
            imageName: config.imageName || '',
            position: basePosition,
            size: mapLegacyScaleToLayerSize(config.baseScale || config.scale || 'crop'),
            repeat: config.repeat || 'no-repeat',
            behavior: baseBehavior,
            opacity: 1,
            blendMode: 'normal',
            offsetX: config.baseOffsetX ?? config.offsetX ?? 0,
            offsetY: config.baseOffsetY ?? config.offsetY ?? 0
        }));
    }

    const topImage = config.topImage || config.top?.image || null;
    if (topImage) {
        layers.push(createBackgroundLayerDraft({
            id: 'legacy_top',
            image: topImage,
            imageName: config.topImageName || '',
            position: config.topPosition || config.top?.position || 'top center',
            size: config.topScale || config.top?.scale || '100% auto',
            repeat: config.topRepeat || config.top?.repeat || 'no-repeat',
            behavior: config.topBehavior || config.top?.behavior || 'scroll',
            opacity: config.topOpacity ?? config.top?.opacity ?? 1,
            blendMode: config.topBlendMode || config.top?.blendMode || 'normal',
            offsetX: config.topOffsetX ?? config.top?.offsetX ?? 0,
            offsetY: config.topOffsetY ?? config.top?.offsetY ?? 0
        }));
    }

    return layers;
}

export function hasThemeBackgroundLayers(bgConfig = {}) {
    const titleImage = bgConfig?.titleImage || bgConfig?.title?.image || null;
    return Boolean(titleImage) || extractBackgroundLayers(bgConfig).some((layer) => layer.image);
}

export function extractAdditionalLayerDrafts(bgConfig = {}, baseImage = null, topImage = null) {
    const allLayers = extractBackgroundLayers(bgConfig);
    if (allLayers.length === 0) return [];

    const extras = [...allLayers];
    const removeFirstByImage = (imageValue) => {
        if (!imageValue) return;
        const idx = extras.findIndex((layer) => layer.image === imageValue);
        if (idx >= 0) extras.splice(idx, 1);
    };

    removeFirstByImage(baseImage || null);
    removeFirstByImage(topImage || null);
    return extras;
}
