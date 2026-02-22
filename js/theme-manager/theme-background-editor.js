/**
 * Theme background editor wiring
 */

export function clearBackgroundImage(options = {}) {
    clearBackgroundSlot('base', options);
}

export function clearTopBackgroundImage(options = {}) {
    clearBackgroundSlot('top', options);
}

export function clearTitleBackgroundImage(options = {}) {
    clearBackgroundSlot('title', options);
}

const BACKGROUND_SLOT_META = Object.freeze({
    base: {
        imageProp: 'currentBackgroundImage',
        imageNameProp: 'currentBackgroundImageName',
        inputId: 'bg-image-input',
        previewId: 'bg-preview',
        previewImgId: 'bg-preview-img',
        imageNameId: 'bg-image-name',
        clearBtnId: 'clear-bg-image-btn',
        overrideKey: 'image'
    },
    top: {
        imageProp: 'currentTopBackgroundImage',
        imageNameProp: 'currentTopBackgroundImageName',
        inputId: 'bg-top-image-input',
        previewId: 'bg-top-preview',
        previewImgId: 'bg-top-preview-img',
        imageNameId: 'bg-top-image-name',
        clearBtnId: 'clear-bg-top-image-btn',
        overrideKey: 'topImage'
    },
    title: {
        imageProp: 'currentTitleBackgroundImage',
        imageNameProp: 'currentTitleBackgroundImageName',
        inputId: 'bg-title-image-input',
        previewId: 'bg-title-preview',
        previewImgId: 'bg-title-preview-img',
        imageNameId: 'bg-title-image-name',
        clearBtnId: 'clear-bg-title-image-btn',
        overrideKey: 'titleImage'
    }
});

function getBackgroundSlotMeta(slot) {
    const key = String(slot || '').trim().toLowerCase();
    return BACKGROUND_SLOT_META[key] || BACKGROUND_SLOT_META.base;
}

function writeBackgroundSlotUi(meta, imageData, fileName) {
    const preview = document.getElementById(meta.previewId);
    const previewImg = document.getElementById(meta.previewImgId);
    if (preview && previewImg && imageData) {
        previewImg.src = imageData;
        preview.style.display = 'block';
    } else if (preview) {
        preview.style.display = 'none';
    }

    const name = document.getElementById(meta.imageNameId);
    if (name) {
        name.textContent = fileName ? `Selected: ${fileName}` : '';
    }

    const clearBtn = document.getElementById(meta.clearBtnId);
    if (clearBtn) {
        clearBtn.style.display = imageData ? 'inline-block' : 'none';
    }
}

function clearBackgroundSlot(slot, options) {
    const { applyBackgroundImage, buildBackgroundConfig } = options;
    const meta = getBackgroundSlotMeta(slot);
    window[meta.imageProp] = null;
    window[meta.imageNameProp] = '';

    const input = document.getElementById(meta.inputId);
    if (input) input.value = '';

    writeBackgroundSlotUi(meta, null, '');

    if (typeof applyBackgroundImage === 'function' && typeof buildBackgroundConfig === 'function') {
        applyBackgroundImage(buildBackgroundConfig({ [meta.overrideKey]: null }));
    }
}

function handleBackgroundSlotUpload(event, slot, options) {
    const { applyBackgroundImage, buildBackgroundConfig, setHasUnsavedChanges } = options;
    const file = event?.target?.files?.[0];
    if (!file) return;

    const meta = getBackgroundSlotMeta(slot);
    const reader = new FileReader();
    reader.onload = (e) => {
        const imageData = typeof e?.target?.result === 'string' ? e.target.result : '';
        if (!imageData) return;

        window[meta.imageProp] = imageData;
        window[meta.imageNameProp] = file.name;
        writeBackgroundSlotUi(meta, imageData, file.name);

        if (typeof setHasUnsavedChanges === 'function') {
            setHasUnsavedChanges(true);
        }
        const overrides = { [meta.overrideKey]: imageData };
        if (meta.overrideKey === 'image') {
            overrides.imagePath = file.path || null;
        }
        if (typeof applyBackgroundImage === 'function' && typeof buildBackgroundConfig === 'function') {
            applyBackgroundImage(buildBackgroundConfig(overrides));
        }
    };
    reader.readAsDataURL(file);
}

export function setupBackgroundImageListeners(options = {}) {
    const {
        applyBackgroundImage,
        buildBackgroundConfig,
        setHasUnsavedChanges,
        getBackgroundLayerDrafts,
        setBackgroundLayerDrafts,
        createBackgroundLayerDraft,
        renderBackgroundLayerEditor,
        escapeHtml,
        layerPositions,
        layerSizeOptions,
        layerRepeatOptions,
        layerBehaviorOptions,
        layerBlendOptions,
        clampNumber,
        normalizeBackgroundLayerOffset,
        normalizeBackgroundLayerPosition,
        normalizeBackgroundLayerSize,
        normalizeBackgroundLayerRepeat,
        normalizeBackgroundLayerBehavior,
        normalizeBackgroundLayerBlendMode,
        normalizeBackgroundLayerOpacity,
        normalizeBackgroundSurfaceTarget,
        ensureBackgroundSurfaceDraft,
        getBackgroundSurfaceDraft,
        setBackgroundSurfaceDraft,
        updateBackgroundSurfaceDraftFromControls,
        syncBackgroundSurfaceControls
    } = options;

    const bindWithClone = (id, eventName, handler) => {
        const node = document.getElementById(id);
        if (!node || !node.parentNode) return null;
        const clone = node.cloneNode(true);
        node.parentNode.replaceChild(clone, node);
        clone.addEventListener(eventName, handler);
        return clone;
    };

    bindWithClone('bg-image-input', 'change', (event) => handleBackgroundSlotUpload(event, 'base', options));
    bindWithClone('bg-top-image-input', 'change', (event) => handleBackgroundSlotUpload(event, 'top', options));
    bindWithClone('bg-title-image-input', 'change', (event) => handleBackgroundSlotUpload(event, 'title', options));

    bindWithClone('bg-target-select', 'change', () => {
        const targetSelect = document.getElementById('bg-target-select');
        if (targetSelect) {
            ensureBackgroundSurfaceDraft(getBackgroundSurfaceDraft, setBackgroundSurfaceDraft).target = normalizeBackgroundSurfaceTarget(targetSelect.value);
        }
        syncBackgroundSurfaceControls(getBackgroundSurfaceDraft, setBackgroundSurfaceDraft);
    });

    const onSurfaceSettingsChanged = () => {
        updateBackgroundSurfaceDraftFromControls(getBackgroundSurfaceDraft, setBackgroundSurfaceDraft);
        syncBackgroundSurfaceControls(getBackgroundSurfaceDraft, setBackgroundSurfaceDraft);
        if (typeof setHasUnsavedChanges === 'function') {
            setHasUnsavedChanges(true);
        }
        if (typeof applyBackgroundImage === 'function' && typeof buildBackgroundConfig === 'function') {
            applyBackgroundImage(buildBackgroundConfig());
        }
    };
    bindWithClone('bg-position', 'change', onSurfaceSettingsChanged);
    bindWithClone('bg-background-repeat', 'change', onSurfaceSettingsChanged);
    bindWithClone('bg-scale', 'change', onSurfaceSettingsChanged);
    bindWithClone('bg-offset-x', 'input', onSurfaceSettingsChanged);
    bindWithClone('bg-offset-y', 'input', onSurfaceSettingsChanged);

    const addLayerBtn = bindWithClone('add-bg-layer-btn', 'click', () => {
        const drafts = typeof getBackgroundLayerDrafts === 'function' ? getBackgroundLayerDrafts() : [];
        drafts.push(createBackgroundLayerDraft());
        if (typeof setBackgroundLayerDrafts === 'function') {
            setBackgroundLayerDrafts(drafts);
        }
        if (typeof setHasUnsavedChanges === 'function') {
            setHasUnsavedChanges(true);
        }
        renderBackgroundLayerEditor({
            getBackgroundLayerDrafts: () => (typeof getBackgroundLayerDrafts === 'function' ? getBackgroundLayerDrafts() : []),
            escapeHtml,
            createBackgroundLayerDraft,
            layerPositions,
            layerSizeOptions,
            layerRepeatOptions,
            layerBehaviorOptions,
            layerBlendOptions
        });
        if (typeof applyBackgroundImage === 'function' && typeof buildBackgroundConfig === 'function') {
            applyBackgroundImage(buildBackgroundConfig());
        }
    });
    if (addLayerBtn) addLayerBtn.type = 'button';

    const layerList = document.getElementById('bg-layer-list');
    if (layerList && layerList.parentNode) {
        const clone = layerList.cloneNode(true);
        layerList.parentNode.replaceChild(clone, layerList);

        clone.addEventListener('click', (event) => {
            const actionBtn = event.target.closest('[data-layer-action]');
            if (!actionBtn) return;
            const card = actionBtn.closest('[data-layer-index]');
            if (!card) return;
            const index = Number.parseInt(card.dataset.layerIndex, 10);
            const drafts = typeof getBackgroundLayerDrafts === 'function' ? getBackgroundLayerDrafts() : [];
            if (!Number.isInteger(index) || index < 0 || index >= drafts.length) return;

            const action = actionBtn.dataset.layerAction;
            if (action === 'remove') {
                drafts.splice(index, 1);
            } else if (action === 'up' && index > 0) {
                const layer = drafts[index];
                drafts[index] = drafts[index - 1];
                drafts[index - 1] = layer;
            } else if (action === 'down' && index < drafts.length - 1) {
                const layer = drafts[index];
                drafts[index] = drafts[index + 1];
                drafts[index + 1] = layer;
            } else if (action === 'toggle') {
                drafts[index].collapsed = !drafts[index].collapsed;
                if (typeof setBackgroundLayerDrafts === 'function') {
                    setBackgroundLayerDrafts(drafts);
                }
                renderBackgroundLayerEditor({
                    getBackgroundLayerDrafts: () => (typeof getBackgroundLayerDrafts === 'function' ? getBackgroundLayerDrafts() : []),
                    escapeHtml,
                    createBackgroundLayerDraft,
                    layerPositions,
                    layerSizeOptions,
                    layerRepeatOptions,
                    layerBehaviorOptions,
                    layerBlendOptions
                });
                return;
            }

            if (typeof setBackgroundLayerDrafts === 'function') {
                setBackgroundLayerDrafts(drafts);
            }
            if (typeof setHasUnsavedChanges === 'function') {
                setHasUnsavedChanges(true);
            }
            renderBackgroundLayerEditor({
                getBackgroundLayerDrafts: () => (typeof getBackgroundLayerDrafts === 'function' ? getBackgroundLayerDrafts() : []),
                escapeHtml,
                createBackgroundLayerDraft,
                layerPositions,
                layerSizeOptions,
                layerRepeatOptions,
                layerBehaviorOptions,
                layerBlendOptions
            });
            if (typeof applyBackgroundImage === 'function' && typeof buildBackgroundConfig === 'function') {
                applyBackgroundImage(buildBackgroundConfig());
            }
        });

        clone.addEventListener('input', (event) => {
            const field = event.target?.dataset?.layerField;
            if (field !== 'opacity' && field !== 'offsetX' && field !== 'offsetY') return;
            const card = event.target.closest('[data-layer-index]');
            if (!card) return;
            const index = Number.parseInt(card.dataset.layerIndex, 10);
            const drafts = typeof getBackgroundLayerDrafts === 'function' ? getBackgroundLayerDrafts() : [];
            if (!Number.isInteger(index) || index < 0 || index >= drafts.length) return;
            const layer = drafts[index];
            if (!layer) return;

            if (field === 'opacity') {
                const nextOpacity = clampNumber(Number.parseInt(event.target.value, 10) / 100, 0, 1);
                layer.opacity = nextOpacity;
                const valueLabel = card.querySelector('.bg-layer-range-value');
                if (valueLabel) valueLabel.textContent = `${Math.round(nextOpacity * 100)}%`;
            } else if (field === 'offsetX') {
                layer.offsetX = normalizeBackgroundLayerOffset(event.target.value);
            } else if (field === 'offsetY') {
                layer.offsetY = normalizeBackgroundLayerOffset(event.target.value);
            }
            if (typeof setBackgroundLayerDrafts === 'function') {
                setBackgroundLayerDrafts(drafts);
            }
            if (typeof setHasUnsavedChanges === 'function') {
                setHasUnsavedChanges(true);
            }
            if (typeof applyBackgroundImage === 'function' && typeof buildBackgroundConfig === 'function') {
                applyBackgroundImage(buildBackgroundConfig());
            }
        });

        clone.addEventListener('change', (event) => {
            const field = event.target?.dataset?.layerField;
            if (!field) return;
            const card = event.target.closest('[data-layer-index]');
            if (!card) return;
            const index = Number.parseInt(card.dataset.layerIndex, 10);
            const drafts = typeof getBackgroundLayerDrafts === 'function' ? getBackgroundLayerDrafts() : [];
            if (!Number.isInteger(index) || index < 0 || index >= drafts.length) return;

            const layer = drafts[index];
            if (!layer) return;

            if (field === 'imageFile') {
                const file = event.target.files && event.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (readerEvent) => {
                    layer.image = typeof readerEvent?.target?.result === 'string' ? readerEvent.target.result : null;
                    layer.imageName = file.name;
                    if (typeof setBackgroundLayerDrafts === 'function') {
                        setBackgroundLayerDrafts(drafts);
                    }
                    if (typeof setHasUnsavedChanges === 'function') {
                        setHasUnsavedChanges(true);
                    }
                    renderBackgroundLayerEditor({
                        getBackgroundLayerDrafts: () => (typeof getBackgroundLayerDrafts === 'function' ? getBackgroundLayerDrafts() : []),
                        escapeHtml,
                        createBackgroundLayerDraft,
                        layerPositions,
                        layerSizeOptions,
                        layerRepeatOptions,
                        layerBehaviorOptions,
                        layerBlendOptions
                    });
                    if (typeof applyBackgroundImage === 'function' && typeof buildBackgroundConfig === 'function') {
                        applyBackgroundImage(buildBackgroundConfig());
                    }
                };
                reader.readAsDataURL(file);
                return;
            }

            if (field === 'offsetX' || field === 'offsetY' || field === 'opacity') {
                return;
            }

            if (field === 'name') {
                layer.name = String(event.target.value || '').trim();
            } else if (field === 'position') {
                layer.position = normalizeBackgroundLayerPosition(event.target.value);
            } else if (field === 'size') {
                layer.size = normalizeBackgroundLayerSize(event.target.value);
            } else if (field === 'repeat') {
                layer.repeat = normalizeBackgroundLayerRepeat(event.target.value);
            } else if (field === 'behavior') {
                layer.behavior = normalizeBackgroundLayerBehavior(event.target.value);
            } else if (field === 'blendMode') {
                layer.blendMode = normalizeBackgroundLayerBlendMode(event.target.value);
            } else if (field === 'belowTitleBar') {
                layer.belowTitleBar = Boolean(event.target.checked);
                if (typeof setBackgroundLayerDrafts === 'function') {
                    setBackgroundLayerDrafts(drafts);
                }
                if (typeof setHasUnsavedChanges === 'function') {
                    setHasUnsavedChanges(true);
                }
                if (typeof applyBackgroundImage === 'function' && typeof buildBackgroundConfig === 'function') {
                    applyBackgroundImage(buildBackgroundConfig());
                }
                return;
            } else if (field === 'opacity') {
                layer.opacity = normalizeBackgroundLayerOpacity(Number.parseInt(event.target.value, 10) / 100);
            }

            if (typeof setBackgroundLayerDrafts === 'function') {
                setBackgroundLayerDrafts(drafts);
            }
            if (typeof setHasUnsavedChanges === 'function') {
                setHasUnsavedChanges(true);
            }
            renderBackgroundLayerEditor({
                getBackgroundLayerDrafts: () => (typeof getBackgroundLayerDrafts === 'function' ? getBackgroundLayerDrafts() : []),
                escapeHtml,
                createBackgroundLayerDraft,
                layerPositions,
                layerSizeOptions,
                layerRepeatOptions,
                layerBehaviorOptions,
                layerBlendOptions
            });
            if (typeof applyBackgroundImage === 'function' && typeof buildBackgroundConfig === 'function') {
                applyBackgroundImage(buildBackgroundConfig());
            }
        });
    }

    bindWithClone('clear-bg-image-btn', 'click', () => {
        clearBackgroundImage(options);
        if (typeof setHasUnsavedChanges === 'function') {
            setHasUnsavedChanges(true);
        }
    });

    bindWithClone('clear-bg-top-image-btn', 'click', () => {
        clearTopBackgroundImage(options);
        if (typeof setHasUnsavedChanges === 'function') {
            setHasUnsavedChanges(true);
        }
    });

    bindWithClone('clear-bg-title-image-btn', 'click', () => {
        clearTitleBackgroundImage(options);
        if (typeof setHasUnsavedChanges === 'function') {
            setHasUnsavedChanges(true);
        }
    });

    syncBackgroundSurfaceControls(getBackgroundSurfaceDraft, setBackgroundSurfaceDraft);
    renderBackgroundLayerEditor({
        getBackgroundLayerDrafts: () => (typeof getBackgroundLayerDrafts === 'function' ? getBackgroundLayerDrafts() : []),
        escapeHtml,
        createBackgroundLayerDraft,
        layerPositions,
        layerSizeOptions,
        layerRepeatOptions,
        layerBehaviorOptions,
        layerBlendOptions
    });
}
