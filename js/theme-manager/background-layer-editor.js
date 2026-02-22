export function renderBackgroundLayerEditor(options = {}) {
    const list = document.getElementById('bg-layer-list');
    if (!list) return;

    const getBackgroundLayerDrafts = typeof options.getBackgroundLayerDrafts === 'function'
        ? options.getBackgroundLayerDrafts
        : () => [];
    const escapeHtml = typeof options.escapeHtml === 'function'
        ? options.escapeHtml
        : (value) => String(value ?? '');
    const createBackgroundLayerDraft = typeof options.createBackgroundLayerDraft === 'function'
        ? options.createBackgroundLayerDraft
        : (layer) => layer || {};

    const layerPositions = Array.isArray(options.layerPositions) ? options.layerPositions : [];
    const layerSizeOptions = Array.isArray(options.layerSizeOptions) ? options.layerSizeOptions : [];
    const layerRepeatOptions = Array.isArray(options.layerRepeatOptions) ? options.layerRepeatOptions : [];
    const layerBehaviorOptions = Array.isArray(options.layerBehaviorOptions) ? options.layerBehaviorOptions : [];
    const layerBlendOptions = Array.isArray(options.layerBlendOptions) ? options.layerBlendOptions : [];

    const backgroundLayerDrafts = getBackgroundLayerDrafts();
    if (!Array.isArray(backgroundLayerDrafts) || backgroundLayerDrafts.length === 0) {
        list.innerHTML = '<div class="bg-layer-empty">No extra layers yet. Add one to stack more images over your base background.</div>';
        return;
    }

    list.innerHTML = backgroundLayerDrafts.map((layer, index) => {
        const safeLayer = createBackgroundLayerDraft(layer);
        const title = safeLayer.name || `Layer ${index + 1}`;
        const imageName = safeLayer.imageName || (safeLayer.image ? 'Image loaded' : 'No image selected');
        const opacityPercent = Math.round(safeLayer.opacity * 100);
        const collapsed = !!safeLayer.collapsed;
        const preview = safeLayer.image
            ? `<div class="bg-preview"><img src="${escapeHtml(safeLayer.image)}" alt="Layer preview"></div>`
            : '';
        return `
            <div class="bg-layer-card${collapsed ? ' is-collapsed' : ''}" data-layer-index="${index}">
                <div class="bg-layer-card-header">
                    <h6 class="bg-layer-title">${escapeHtml(title)}</h6>
                    <div class="bg-layer-actions">
                        <button type="button" class="action-btn small bg-layer-toggle-btn" data-layer-action="toggle" title="${collapsed ? 'Expand layer' : 'Collapse layer'}">${collapsed ? 'Expand' : 'Collapse'}</button>
                        <button type="button" class="action-btn small" data-layer-action="up" title="Move up">Up</button>
                        <button type="button" class="action-btn small" data-layer-action="down" title="Move down">Down</button>
                        <button type="button" class="action-btn small remove-btn" data-layer-action="remove" title="Remove layer">Remove</button>
                    </div>
                </div>
                <div class="bg-layer-card-body">
                    <div class="form-group">
                        <label>Layer Name:</label>
                        <input type="text" data-layer-field="name" value="${escapeHtml(safeLayer.name)}" placeholder="Optional label">
                    </div>
                    <div class="form-group">
                        <label>Upload Image:</label>
                        <input type="file" accept="image/*" data-layer-field="imageFile">
                        <span class="image-name">${escapeHtml(imageName)}</span>
                    </div>
                    <div class="form-group">
                        <label class="bg-layer-checkbox">
                            <input type="checkbox" data-layer-field="belowTitleBar"${safeLayer.belowTitleBar ? ' checked' : ''}>
                            <span>Below title bar</span>
                        </label>
                    </div>
                    <div class="bg-layer-grid">
                        <div class="form-group">
                            <label>Position:</label>
                            <select data-layer-field="position">${getSelectOptionsMarkup(layerPositions, safeLayer.position, escapeHtml)}</select>
                        </div>
                        <div class="form-group">
                            <label>Offset X (px):</label>
                            <input type="number" step="1" data-layer-field="offsetX" value="${safeLayer.offsetX}">
                        </div>
                        <div class="form-group">
                            <label>Offset Y (px):</label>
                            <input type="number" step="1" data-layer-field="offsetY" value="${safeLayer.offsetY}">
                        </div>
                        <div class="form-group">
                            <label>Scale:</label>
                            <select data-layer-field="size">${getSelectOptionsMarkup(layerSizeOptions, safeLayer.size, escapeHtml)}</select>
                        </div>
                        <div class="form-group">
                            <label>Repeat:</label>
                            <select data-layer-field="repeat">${getSelectOptionsMarkup(layerRepeatOptions, safeLayer.repeat, escapeHtml)}</select>
                        </div>
                        <div class="form-group">
                            <label>Behavior:</label>
                            <select data-layer-field="behavior">${getSelectOptionsMarkup(layerBehaviorOptions, safeLayer.behavior, escapeHtml)}</select>
                        </div>
                        <div class="form-group">
                            <label>Blend:</label>
                            <select data-layer-field="blendMode">${getSelectOptionsMarkup(layerBlendOptions, safeLayer.blendMode, escapeHtml)}</select>
                        </div>
                        <div class="form-group">
                            <label>Opacity:</label>
                            <div class="bg-layer-range-wrap">
                                <input type="range" min="0" max="100" step="1" data-layer-field="opacity" value="${opacityPercent}">
                                <span class="bg-layer-range-value">${opacityPercent}%</span>
                            </div>
                        </div>
                    </div>
                    ${preview}
                </div>
            </div>
        `;
    }).join('');
}

function getSelectOptionsMarkup(options = [], selectedValue = '', escapeHtml) {
    return (Array.isArray(options) ? options : []).map((option) => {
        const value = String(option?.value || '');
        const label = String(option?.label || option?.name || value || '');
        const selected = value === selectedValue ? ' selected' : '';
        return `<option value="${escapeHtml(value)}"${selected}>${escapeHtml(label)}</option>`;
    }).join('');
}
