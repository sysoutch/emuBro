import {
    BACKGROUND_LAYER_POSITIONS,
    BACKGROUND_LAYER_SIZE_OPTIONS,
    BACKGROUND_LAYER_REPEAT_OPTIONS,
    BACKGROUND_SURFACE_TARGET_OPTIONS,
    BASE_BACKGROUND_POSITION_OPTIONS,
    BASE_BACKGROUND_SCALE_OPTIONS,
    normalizeBackgroundLayerPosition,
    normalizeBackgroundLayerSize,
    normalizeBackgroundLayerRepeat,
    normalizeBackgroundLayerOffset,
    normalizeBackgroundSurfaceTarget,
    normalizeBaseBackgroundPosition,
    normalizeBaseBackgroundScale,
    createDefaultBackgroundSurfaceDraft,
    createBackgroundSurfaceDraftFromConfig,
    cloneBackgroundLayerDrafts
} from './background-utils';

export function ensureBackgroundSurfaceDraft(getDraft, setDraft) {
    const existing = getDraft();
    if (existing) return existing;
    const next = createDefaultBackgroundSurfaceDraft();
    setDraft(next);
    return next;
}

export function setBackgroundSurfaceDraftFromConfig(bgConfig = {}, setDraft) {
    setDraft(createBackgroundSurfaceDraftFromConfig(bgConfig));
}

export function getBackgroundSurfaceTargetMeta(target) {
    const normalized = normalizeBackgroundSurfaceTarget(target);
    if (normalized === 'top') {
        return {
            positionOptions: BACKGROUND_LAYER_POSITIONS,
            scaleOptions: BACKGROUND_LAYER_SIZE_OPTIONS,
            repeatOptions: BACKGROUND_LAYER_REPEAT_OPTIONS,
            positionLabel: 'Position:',
            repeatLabel: 'Repeat:',
            scaleLabel: 'Scale Mode:'
        };
    }
    if (normalized === 'title') {
        return {
            positionOptions: BACKGROUND_LAYER_POSITIONS,
            scaleOptions: BACKGROUND_LAYER_SIZE_OPTIONS,
            repeatOptions: BACKGROUND_LAYER_REPEAT_OPTIONS,
            positionLabel: 'Position:',
            repeatLabel: 'Repeat:',
            scaleLabel: 'Scale Mode:'
        };
    }
    return {
        positionOptions: BASE_BACKGROUND_POSITION_OPTIONS,
        scaleOptions: BASE_BACKGROUND_SCALE_OPTIONS,
        repeatOptions: BACKGROUND_LAYER_REPEAT_OPTIONS,
        positionLabel: 'Position / Attachment:',
        repeatLabel: 'Repeat:',
        scaleLabel: 'Scale Mode:'
    };
}

export function syncBackgroundSurfaceControls(getDraft, setDraft) {
    const targetSelect = document.getElementById('bg-target-select');
    const positionSelect = document.getElementById('bg-position');
    const repeatSelect = document.getElementById('bg-background-repeat');
    const scaleSelect = document.getElementById('bg-scale');
    const offsetXInput = document.getElementById('bg-offset-x');
    const offsetYInput = document.getElementById('bg-offset-y');
    if (!targetSelect || !positionSelect || !repeatSelect || !scaleSelect || !offsetXInput || !offsetYInput) return;

    const draft = ensureBackgroundSurfaceDraft(getDraft, setDraft);
    const target = normalizeBackgroundSurfaceTarget(targetSelect.value || draft.target);
    draft.target = target;
    const targetSettings = draft[target] || draft.base;
    const meta = getBackgroundSurfaceTargetMeta(target);

    targetSelect.innerHTML = getSelectOptionsMarkup(BACKGROUND_SURFACE_TARGET_OPTIONS, target);
    positionSelect.innerHTML = getSelectOptionsMarkup(meta.positionOptions, String(targetSettings.position || ''));
    repeatSelect.innerHTML = getSelectOptionsMarkup(meta.repeatOptions, String(targetSettings.repeat || 'no-repeat'));
    scaleSelect.innerHTML = getSelectOptionsMarkup(meta.scaleOptions, String(targetSettings.scale || 'cover'));
    offsetXInput.value = String(normalizeBackgroundLayerOffset(targetSettings.offsetX));
    offsetYInput.value = String(normalizeBackgroundLayerOffset(targetSettings.offsetY));

    const positionLabel = document.getElementById('bg-position-label');
    if (positionLabel) positionLabel.textContent = meta.positionLabel;
    const repeatLabel = document.getElementById('bg-repeat-label');
    if (repeatLabel) repeatLabel.textContent = meta.repeatLabel;
    const scaleLabel = document.getElementById('bg-scale-label');
    if (scaleLabel) scaleLabel.textContent = meta.scaleLabel;
}

export function updateBackgroundSurfaceDraftFromControls(getDraft, setDraft) {
    const targetSelect = document.getElementById('bg-target-select');
    const positionSelect = document.getElementById('bg-position');
    const repeatSelect = document.getElementById('bg-background-repeat');
    const scaleSelect = document.getElementById('bg-scale');
    const offsetXInput = document.getElementById('bg-offset-x');
    const offsetYInput = document.getElementById('bg-offset-y');
    if (!targetSelect || !positionSelect || !repeatSelect || !scaleSelect || !offsetXInput || !offsetYInput) return;

    const draft = ensureBackgroundSurfaceDraft(getDraft, setDraft);
    const target = normalizeBackgroundSurfaceTarget(targetSelect.value || draft.target);
    draft.target = target;
    const offsetX = normalizeBackgroundLayerOffset(offsetXInput.value);
    const offsetY = normalizeBackgroundLayerOffset(offsetYInput.value);

    if (target === 'top' || target === 'title') {
        draft[target].position = normalizeBackgroundLayerPosition(positionSelect.value);
        draft[target].repeat = normalizeBackgroundLayerRepeat(repeatSelect.value);
        draft[target].scale = normalizeBackgroundLayerSize(scaleSelect.value);
        draft[target].offsetX = offsetX;
        draft[target].offsetY = offsetY;
    } else {
        draft.base.position = normalizeBaseBackgroundPosition(positionSelect.value);
        draft.base.repeat = normalizeBackgroundLayerRepeat(repeatSelect.value);
        draft.base.scale = normalizeBaseBackgroundScale(scaleSelect.value);
        draft.base.offsetX = offsetX;
        draft.base.offsetY = offsetY;
    }
}

export function setBackgroundLayerDrafts(layers = [], setDrafts) {
    setDrafts(cloneBackgroundLayerDrafts(layers));
}

function getSelectOptionsMarkup(options = [], selectedValue = '') {
    const selected = String(selectedValue || '').trim().toLowerCase();
    return (Array.isArray(options) ? options : []).map((option) => {
        const value = String(option?.value || option?.id || '').trim();
        const label = String(option?.label || option?.name || value || '').trim();
        const isActive = value.toLowerCase() === selected;
        return `<option value="${value}" ${isActive ? 'selected' : ''}>${label}</option>`;
    }).join('');
}
