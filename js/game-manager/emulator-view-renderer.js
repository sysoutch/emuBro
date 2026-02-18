const DEFAULT_TYPE_TABS = ['standalone', 'core', 'web'];

export function createEmulatorViewRenderer(deps = {}) {
    const i18n = deps.i18n || window.i18n || { t: (key) => String(key || '') };
    const escapeHtml = deps.escapeHtml || ((value) => String(value ?? ''));
    const getEmulatorKey = deps.getEmulatorKey || ((emulator) => String(emulator?.id || emulator?.name || ''));
    const showEmulatorDetails = deps.showEmulatorDetails || (() => {});
    const emulatorTypeTabs = Array.isArray(deps.emulatorTypeTabs) && deps.emulatorTypeTabs.length > 0
        ? deps.emulatorTypeTabs
        : DEFAULT_TYPE_TABS;
    const emulatorIconPaletteCache = new Map();

    function normalizeEmulatorType(type) {
        const value = String(type || '').trim().toLowerCase();
        if (emulatorTypeTabs.includes(value)) return value;
        return '';
    }

    function createEmulatorTypeTabs(activeType, onTypeChange) {
        const tabs = document.createElement('div');
        tabs.className = 'emulator-type-tabs';
        tabs.innerHTML = `
        <button class="emulator-type-tab${activeType === 'standalone' ? ' is-active' : ''}" type="button" data-emulator-type="standalone">Standalone</button>
        <button class="emulator-type-tab${activeType === 'core' ? ' is-active' : ''}" type="button" data-emulator-type="core">Core</button>
        <button class="emulator-type-tab${activeType === 'web' ? ' is-active' : ''}" type="button" data-emulator-type="web">Web</button>
    `;

        if (typeof onTypeChange === 'function') {
            tabs.querySelectorAll('.emulator-type-tab').forEach((button) => {
                button.addEventListener('click', () => {
                    const nextType = normalizeEmulatorType(button.dataset.emulatorType);
                    if (!nextType || nextType === activeType) return;
                    onTypeChange(nextType);
                });
            });
        }

        return tabs;
    }

    function clampColorChannel(value) {
        return Math.max(0, Math.min(255, Number(value) || 0));
    }

    function mixRgbColors(a, b, ratio) {
        const t = Math.max(0, Math.min(1, Number(ratio) || 0));
        return {
            r: Math.round((a.r * (1 - t)) + (b.r * t)),
            g: Math.round((a.g * (1 - t)) + (b.g * t)),
            b: Math.round((a.b * (1 - t)) + (b.b * t))
        };
    }

    function colorDistanceSq(a, b) {
        const dr = a.r - b.r;
        const dg = a.g - b.g;
        const db = a.b - b.b;
        return (dr * dr) + (dg * dg) + (db * db);
    }

    function toRgbaColor(rgb, alpha) {
        return `rgba(${clampColorChannel(rgb.r)}, ${clampColorChannel(rgb.g)}, ${clampColorChannel(rgb.b)}, ${alpha})`;
    }

    function extractPaletteFromPlatformIcon(image) {
        const width = Number(image?.naturalWidth || 0);
        const height = Number(image?.naturalHeight || 0);
        if (!width || !height) return null;

        const maxSize = 42;
        const scale = Math.min(1, maxSize / Math.max(width, height));
        const canvasWidth = Math.max(1, Math.round(width * scale));
        const canvasHeight = Math.max(1, Math.round(height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return null;

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        ctx.drawImage(image, 0, 0, canvasWidth, canvasHeight);

        let data = null;
        try {
            data = ctx.getImageData(0, 0, canvasWidth, canvasHeight).data;
        } catch (_error) {
            return null;
        }
        if (!data || data.length === 0) return null;

        const buckets = new Map();
        for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3];
            if (alpha < 120) continue;

            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            if ((r + g + b) < 54) continue;

            const keyR = Math.round(r / 24) * 24;
            const keyG = Math.round(g / 24) * 24;
            const keyB = Math.round(b / 24) * 24;
            const key = `${keyR},${keyG},${keyB}`;
            buckets.set(key, (buckets.get(key) || 0) + 1);
        }

        const sorted = [...buckets.entries()].sort((a, b) => b[1] - a[1]);
        if (sorted.length === 0) return null;

        const palette = [];
        for (const [bucketKey, count] of sorted) {
            if (palette.length > 0 && count < 2) continue;
            const parts = bucketKey.split(',').map((value) => clampColorChannel(Number(value)));
            if (parts.length !== 3) continue;
            const color = { r: parts[0], g: parts[1], b: parts[2] };
            const tooClose = palette.some((existing) => colorDistanceSq(existing, color) < 2300);
            if (tooClose) continue;
            palette.push(color);
            if (palette.length >= 3) break;
        }

        if (palette.length === 0) return null;
        if (palette.length === 1) {
            palette.push(mixRgbColors(palette[0], { r: 255, g: 255, b: 255 }, 0.34));
        }
        if (palette.length === 2) {
            palette.push(mixRgbColors(palette[0], { r: 16, g: 26, b: 56 }, 0.4));
        }

        return [
            toRgbaColor(palette[0], 0.5),
            toRgbaColor(palette[1], 0.42),
            toRgbaColor(palette[2], 0.38)
        ];
    }

    function applyPaletteToEmulatorCard(card, palette) {
        if (!card || !Array.isArray(palette) || palette.length < 3) return;
        card.style.setProperty('--emulator-glow-1', palette[0]);
        card.style.setProperty('--emulator-glow-2', palette[1]);
        card.style.setProperty('--emulator-glow-3', palette[2]);
    }

    function applyPlatformColorBlurToEmulatorCards(root) {
        if (!root) return;
        const cards = root.querySelectorAll('.emulator-card');
        cards.forEach((card) => {
            const icon = card.querySelector('.emulator-platform-icon');
            if (!icon) return;

            const applyFromIcon = () => {
                const source = String(icon.currentSrc || icon.src || '').trim();
                if (!source) return;

                const cached = emulatorIconPaletteCache.get(source);
                if (cached) {
                    applyPaletteToEmulatorCard(card, cached);
                    return;
                }

                const extracted = extractPaletteFromPlatformIcon(icon);
                if (!extracted) return;
                emulatorIconPaletteCache.set(source, extracted);
                applyPaletteToEmulatorCard(card, extracted);
            };

            if (icon.complete && Number(icon.naturalWidth || 0) > 0) {
                applyFromIcon();
            } else {
                icon.addEventListener('load', applyFromIcon, { once: true });
            }
        });
    }

    function getEmulatorCardHoverIconMarkup(installed) {
        if (installed) {
            return `
            <span class="icon-svg" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9.2"></circle>
                    <path d="M10 8.8v6.4l5.4-3.2L10 8.8Z"></path>
                </svg>
            </span>
        `;
        }
        return `
        <span class="icon-svg" aria-hidden="true">
            <svg viewBox="0 0 24 24">
                <path d="M12 4.6v9.2"></path>
                <path d="m8.7 10.5 3.3 3.3 3.3-3.3"></path>
                <path d="M6 17.5h12"></path>
            </svg>
        </span>
    `;
    }

    function renderEmulatorsAsGrid(emulatorsToRender, options = {}) {
        const gamesContainer = document.getElementById('games-container');
        const container = document.createElement('div');
        container.className = 'emulators-container';

        const grid = document.createElement('div');
        grid.className = 'emulators-grid';
        grid.innerHTML = emulatorsToRender.map((emulator) => {
            const shortName = String(emulator.platformShortName || 'unknown').toLowerCase();
            const platformName = emulator.platform || emulator.platformShortName || i18n.t('gameDetails.unknown');
            const platformIcon = `emubro-resources/platforms/${shortName}/logos/default.png`;
            const safeName = escapeHtml(emulator.name || 'Unknown Emulator');
            const safePlatform = escapeHtml(platformName);
            const installed = !!emulator.isInstalled;
            const safePath = escapeHtml(installed ? (emulator.filePath || '') : 'Not installed yet');
            const statusClass = installed ? 'is-installed' : 'is-missing';
            const statusText = installed ? 'Installed' : 'Not Installed';
            const key = encodeURIComponent(getEmulatorKey(emulator));

            return `
            <article class="emulator-card" data-emu-key="${key}" tabindex="0" role="button" aria-label="Open emulator details for ${safeName}">
                <div class="emulator-card-hero">
                    <header class="emulator-card-header">
                        <h3 class="emulator-title" title="${safeName}">${safeName}</h3>
                        <span class="emulator-platform-badge" title="${safePlatform}" aria-label="${safePlatform}">
                            <img src="${platformIcon}" alt="${safePlatform}" class="emulator-platform-icon" loading="lazy" onerror="this.closest('.emulator-platform-badge').style.display='none'" />
                        </span>
                    </header>
                    <p class="emulator-platform-name">${safePlatform}</p>
                    <p class="emulator-install-status ${statusClass}">${statusText}</p>
                    <p class="emulator-path">${safePath}</p>
                </div>
                <span class="emulator-card-hover-action ${installed ? 'is-play' : 'is-download'}">${getEmulatorCardHoverIconMarkup(installed)}</span>
            </article>
        `;
        }).join('');

        container.appendChild(grid);
        gamesContainer.appendChild(container);
        applyPlatformColorBlurToEmulatorCards(container);
        wireEmulatorCardInteractions(container, emulatorsToRender, options);
    }

    function renderEmulatorsAsList(emulatorsToRender, options = {}) {
        const gamesContainer = document.getElementById('games-container');
        const container = document.createElement('div');
        container.className = 'emulators-container';

        const list = document.createElement('div');
        list.className = 'emulators-list';
        list.innerHTML = emulatorsToRender.map((emulator, idx) => {
            const safeName = escapeHtml(emulator.name || 'Unknown Emulator');
            const safePlatform = escapeHtml(emulator.platform || emulator.platformShortName || i18n.t('gameDetails.unknown'));
            const installed = !!emulator.isInstalled;
            const safePath = escapeHtml(installed ? (emulator.filePath || '') : 'Not installed yet');
            const statusClass = installed ? 'is-installed' : 'is-missing';
            const statusText = installed ? 'Installed' : 'Not Installed';
            const key = encodeURIComponent(getEmulatorKey(emulator));

            return `
            <article class="emulator-list-item" data-emu-key="${key}" tabindex="0" role="button" aria-label="Open emulator details for ${safeName}">
                <div class="emulator-list-main">
                    <h3 class="emulator-title">${safeName}</h3>
                    <div class="emulator-list-meta">
                        <span>${safePlatform}</span>
                        <span class="emulator-install-status ${statusClass}">${statusText}</span>
                        <span>${idx + 1} / ${emulatorsToRender.length}</span>
                    </div>
                    <p class="emulator-path">${safePath}</p>
                </div>
            </article>
        `;
        }).join('');

        container.appendChild(list);
        gamesContainer.appendChild(container);
        wireEmulatorCardInteractions(container, emulatorsToRender, options);
    }

    function renderEmulatorsAsTable(emulatorsToRender, options = {}) {
        const gamesContainer = document.getElementById('games-container');
        const container = document.createElement('div');
        container.className = 'emulators-container';

        const table = document.createElement('table');
        table.className = 'emulators-table';
        table.innerHTML = `
        <thead>
            <tr>
                <th>Name</th>
                <th>Platform</th>
                <th>Path</th>
            </tr>
        </thead>
        <tbody>
            ${emulatorsToRender.map((emulator) => {
                const safeName = escapeHtml(emulator.name || 'Unknown Emulator');
                const safePlatform = escapeHtml(emulator.platform || emulator.platformShortName || i18n.t('gameDetails.unknown'));
                const installed = !!emulator.isInstalled;
                const safePath = escapeHtml(installed ? (emulator.filePath || '') : 'Not installed yet');
                const statusClass = installed ? 'is-installed' : 'is-missing';
                const statusText = installed ? 'Installed' : 'Not Installed';
                const key = encodeURIComponent(getEmulatorKey(emulator));
                return `
                    <tr data-emu-key="${key}" tabindex="0" role="button" aria-label="Open emulator details for ${safeName}">
                        <td>${safeName}</td>
                        <td>
                            ${safePlatform}
                            <div class="emulator-install-status ${statusClass}">${statusText}</div>
                        </td>
                        <td class="emulator-path">${safePath}</td>
                    </tr>
                `;
            }).join('')}
        </tbody>
    `;

        container.appendChild(table);
        gamesContainer.appendChild(container);
        wireEmulatorCardInteractions(container, emulatorsToRender, options);
    }

    function wireEmulatorCardInteractions(root, emulatorsToRender, options = {}) {
        const emulatorByKey = new Map();
        emulatorsToRender.forEach((emulator) => {
            emulatorByKey.set(encodeURIComponent(getEmulatorKey(emulator)), emulator);
        });

        const activate = (el) => {
            const emuKey = String(el?.dataset?.emuKey || '').trim();
            const emulator = emulatorByKey.get(emuKey);
            if (!emulator) return;
            showEmulatorDetails(emulator, options);
        };

        root.querySelectorAll('[data-emu-key]').forEach((item) => {
            item.addEventListener('click', () => activate(item));
            item.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                activate(item);
            });
        });
    }

    function renderEmulators(emulatorsToRender, options = {}) {
        const gamesContainer = document.getElementById('games-container');
        if (!gamesContainer) return;

        const rows = Array.isArray(emulatorsToRender) ? emulatorsToRender : [];
        const activeType = normalizeEmulatorType(options.activeType) || 'standalone';
        const onTypeChange = typeof options.onTypeChange === 'function' ? options.onTypeChange : null;
        const activeViewBtn = document.querySelector('.view-btn.active');
        const activeView = activeViewBtn ? activeViewBtn.dataset.view : 'cover';

        gamesContainer.className = `games-container ${activeView}-view emulators-view`;
        gamesContainer.innerHTML = '';
        gamesContainer.appendChild(createEmulatorTypeTabs(activeType, onTypeChange));

        if (rows.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'emulator-empty';
            empty.textContent = 'No emulators found for this tab.';
            gamesContainer.appendChild(empty);
            return;
        }

        if (activeView === 'table') {
            renderEmulatorsAsTable(rows, options);
            return;
        }

        if (activeView === 'list') {
            renderEmulatorsAsList(rows, options);
            return;
        }

        renderEmulatorsAsGrid(rows, options);
    }

    return {
        normalizeEmulatorType,
        renderEmulators
    };
}
