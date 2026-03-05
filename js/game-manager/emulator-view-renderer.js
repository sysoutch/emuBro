const DEFAULT_TYPE_TABS = ['standalone', 'core', 'web'];

export function createEmulatorViewRenderer(deps = {}) {
    const i18n = deps.i18n || window.i18n || { t: (key) => String(key || '') };
    const escapeHtml = deps.escapeHtml || ((value) => String(value ?? ''));
    const getEmulatorKey = deps.getEmulatorKey || ((emulator) => String(emulator?.id || emulator?.name || ''));
    const showEmulatorDetails = deps.showEmulatorDetails || (() => {});
    const emulatorTypeTabs = Array.isArray(deps.emulatorTypeTabs) && deps.emulatorTypeTabs.length > 0
        ? deps.emulatorTypeTabs
        : DEFAULT_TYPE_TABS;
    const EMULATOR_ICON_PALETTE_CACHE_KEY = 'emuBro.emulatorIconPaletteCache.v1';
    const EMULATOR_ICON_PALETTE_CACHE_MAX = Math.max(40, Number(deps.emulatorIconPaletteCacheMax) || 160);
    const emulatorIconPaletteCache = new Map();
    let currentSort = 'name';
    let currentSortDir = 'asc';
    const EMULATOR_GRID_PERF_THRESHOLD = Math.max(40, Number(deps.emulatorGridPerfThreshold) || 90);
    let paletteCachePersistTimer = null;

    function normalizePalette(palette) {
        if (!Array.isArray(palette) || palette.length < 3) return null;
        const normalized = palette
            .slice(0, 3)
            .map((entry) => String(entry || '').trim())
            .filter(Boolean);
        if (normalized.length < 3) return null;
        return normalized;
    }

    function trimPaletteCacheToLimit() {
        while (emulatorIconPaletteCache.size > EMULATOR_ICON_PALETTE_CACHE_MAX) {
            const firstKey = emulatorIconPaletteCache.keys().next().value;
            if (!firstKey) break;
            emulatorIconPaletteCache.delete(firstKey);
        }
    }

    function schedulePaletteCachePersist() {
        if (paletteCachePersistTimer) return;
        paletteCachePersistTimer = window.setTimeout(() => {
            paletteCachePersistTimer = null;
            try {
                const rows = [];
                emulatorIconPaletteCache.forEach((palette, source) => {
                    const normalized = normalizePalette(palette);
                    if (!normalized) return;
                    rows.push([String(source), normalized]);
                });
                localStorage.setItem(EMULATOR_ICON_PALETTE_CACHE_KEY, JSON.stringify(rows));
            } catch (_error) {}
        }, 450);
    }

    function setCachedPalette(source, palette) {
        const key = String(source || '').trim();
        const normalized = normalizePalette(palette);
        if (!key || !normalized) return;
        if (emulatorIconPaletteCache.has(key)) {
            emulatorIconPaletteCache.delete(key);
        }
        emulatorIconPaletteCache.set(key, normalized);
        trimPaletteCacheToLimit();
        schedulePaletteCachePersist();
    }

    function getCachedPalette(source) {
        const key = String(source || '').trim();
        if (!key || !emulatorIconPaletteCache.has(key)) return null;
        const palette = normalizePalette(emulatorIconPaletteCache.get(key));
        if (!palette) {
            emulatorIconPaletteCache.delete(key);
            return null;
        }
        emulatorIconPaletteCache.delete(key);
        emulatorIconPaletteCache.set(key, palette);
        return palette;
    }

    function restorePaletteCacheFromStorage() {
        try {
            const raw = localStorage.getItem(EMULATOR_ICON_PALETTE_CACHE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return;
            parsed.forEach((entry) => {
                if (!Array.isArray(entry) || entry.length < 2) return;
                const source = String(entry[0] || '').trim();
                const palette = normalizePalette(entry[1]);
                if (!source || !palette) return;
                emulatorIconPaletteCache.set(source, palette);
            });
            trimPaletteCacheToLimit();
        } catch (_error) {}
    }
    restorePaletteCacheFromStorage();

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

    function hashStringToSeed(value) {
        const text = String(value || '');
        let hash = 0;
        for (let i = 0; i < text.length; i += 1) {
            hash = ((hash << 5) - hash) + text.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash);
    }

    function hslToRgb(h, s, l) {
        const hue = ((Number(h) % 360) + 360) % 360;
        const sat = Math.max(0, Math.min(100, Number(s) || 0)) / 100;
        const light = Math.max(0, Math.min(100, Number(l) || 0)) / 100;
        const c = (1 - Math.abs((2 * light) - 1)) * sat;
        const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
        const m = light - (c / 2);
        let r = 0;
        let g = 0;
        let b = 0;
        if (hue < 60) {
            r = c; g = x; b = 0;
        } else if (hue < 120) {
            r = x; g = c; b = 0;
        } else if (hue < 180) {
            r = 0; g = c; b = x;
        } else if (hue < 240) {
            r = 0; g = x; b = c;
        } else if (hue < 300) {
            r = x; g = 0; b = c;
        } else {
            r = c; g = 0; b = x;
        }
        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255)
        };
    }

    function fallbackPaletteFromSource(source) {
        const seed = hashStringToSeed(source || 'emubro-platform');
        const baseHue = seed % 360;
        const colorA = hslToRgb(baseHue, 68, 56);
        const colorB = hslToRgb((baseHue + 38) % 360, 64, 54);
        const colorC = hslToRgb((baseHue + 320) % 360, 58, 46);
        return [
            toRgbaColor(colorA, 0.48),
            toRgbaColor(colorB, 0.42),
            toRgbaColor(colorC, 0.36)
        ];
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

    function applyPlatformColorBlurToEmulatorCards(root, options = {}) {
        if (options && options.enabled === false) return;
        if (!root) return;
        const cards = root.querySelectorAll('.emulator-card');
        const allowExtraction = options?.allowExtraction !== false;
        const maxSourcesToExtract = Number.isFinite(Number(options?.maxSourcesToExtract))
            ? Math.max(0, Math.round(Number(options.maxSourcesToExtract)))
            : Number.POSITIVE_INFINITY;
        let extractedSources = 0;

        const cardsBySource = new Map();
        cards.forEach((card) => {
            const icon = card.querySelector('.emulator-platform-icon');
            if (!icon) return;
            const source = String(icon.currentSrc || icon.src || icon.getAttribute('src') || '').trim();
            if (!source) return;
            if (!cardsBySource.has(source)) {
                cardsBySource.set(source, []);
            }
            cardsBySource.get(source).push({ card, icon });
        });

        cardsBySource.forEach((items, source) => {
            const cached = getCachedPalette(source);
            if (cached) {
                items.forEach(({ card }) => applyPaletteToEmulatorCard(card, cached));
                return;
            }
            const fallback = fallbackPaletteFromSource(source);
            items.forEach(({ card }) => applyPaletteToEmulatorCard(card, fallback));
            if (!allowExtraction || extractedSources >= maxSourcesToExtract) return;
            extractedSources += 1;

            const applyExtractedPalette = () => {
                const sample = items.find(({ icon }) => Number(icon?.naturalWidth || 0) > 0)?.icon || items[0]?.icon;
                if (!sample) return;
                const extracted = extractPaletteFromPlatformIcon(sample);
                if (!extracted) return;
                setCachedPalette(source, extracted);
                items.forEach(({ card }) => applyPaletteToEmulatorCard(card, extracted));
            };

            const readyIcon = items.find(({ icon }) => icon.complete && Number(icon.naturalWidth || 0) > 0)?.icon || null;
            if (readyIcon) {
                applyExtractedPalette();
                return;
            }
            const firstIcon = items[0]?.icon;
            if (firstIcon) {
                firstIcon.addEventListener('load', applyExtractedPalette, { once: true });
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

    function getEmulatorFilePaths(emulator) {
        const ordered = [];
        const seen = new Set();
        const add = (rawPath) => {
            const value = String(rawPath || '').trim();
            if (!value) return;
            const key = value.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            ordered.push(value);
        };

        if (Array.isArray(emulator?.filePaths)) {
            emulator.filePaths.forEach(add);
        }
        add(emulator?.filePath);
        return ordered;
    }

    function getEmulatorPathMarkup(emulator, installed) {
        if (!installed) return 'Not installed yet';
        const paths = getEmulatorFilePaths(emulator);
        if (paths.length === 0) return 'Not installed yet';
        if (paths.length === 1) return escapeHtml(paths[0]);
        const first = escapeHtml(paths[0]);
        const restCount = paths.length - 1;
        return `${first} <span class="emulator-path-more">(+${restCount} more)</span>`;
    }

    function getEmulatorPathTitle(emulator, installed) {
        if (!installed) return 'Not installed yet';
        const paths = getEmulatorFilePaths(emulator);
        if (paths.length === 0) return 'Not installed yet';
        return paths.join('\n');
    }

    function renderEmulatorsAsGrid(emulatorsToRender, options = {}) {
        const gamesContainer = document.getElementById('games-container');
        const container = document.createElement('div');
        container.className = 'emulators-container';

        const grid = document.createElement('div');
        grid.className = 'emulators-grid';
        const performanceMode = emulatorsToRender.length >= EMULATOR_GRID_PERF_THRESHOLD;
        if (performanceMode) {
            grid.classList.add('is-performance-mode');
            container.classList.add('is-performance-mode');
        }
        grid.innerHTML = emulatorsToRender.map((emulator) => {
            const shortName = String(emulator.platformShortName || 'unknown').toLowerCase();
            const platformName = emulator.platform || emulator.platformShortName || i18n.t('gameDetails.unknown');
            const platformIcon = `emubro-resources/platforms/${shortName}/logos/default.png`;
            const safeName = escapeHtml(emulator.name || 'Unknown Emulator');
            const safePlatform = escapeHtml(platformName);
            const installed = !!emulator.isInstalled;
            const safePath = getEmulatorPathMarkup(emulator, installed);
            const safePathTitle = escapeHtml(getEmulatorPathTitle(emulator, installed));
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
                    <p class="emulator-path" title="${safePathTitle}">${safePath}</p>
                </div>
                <span class="emulator-card-hover-action ${installed ? 'is-play' : 'is-download'}">${getEmulatorCardHoverIconMarkup(installed)}</span>
            </article>
        `;
        }).join('');

        container.appendChild(grid);
        gamesContainer.appendChild(container);
        applyPlatformColorBlurToEmulatorCards(container, {
            enabled: true,
            allowExtraction: true,
            maxSourcesToExtract: performanceMode ? 12 : Number.POSITIVE_INFINITY
        });
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
            const safePath = getEmulatorPathMarkup(emulator, installed);
            const safePathTitle = escapeHtml(getEmulatorPathTitle(emulator, installed));
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
                    <p class="emulator-path" title="${safePathTitle}">${safePath}</p>
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

        // Sort emulators locally for the table view
        const sortedEmulators = [...emulatorsToRender].sort((a, b) => {
            const dir = currentSortDir === 'asc' ? 1 : -1;
            let val = 0;
            switch (currentSort) {
                case 'platform':
                    const pA = String(a.platform || a.platformShortName || '').toLowerCase();
                    const pB = String(b.platform || b.platformShortName || '').toLowerCase();
                    val = pA.localeCompare(pB);
                    break;
                case 'path':
                    const pathA = String(a.filePath || '').toLowerCase();
                    const pathB = String(b.filePath || '').toLowerCase();
                    val = pathA.localeCompare(pathB);
                    break;
                default:
                    const nameA = String(a.name || '').toLowerCase();
                    const nameB = String(b.name || '').toLowerCase();
                    val = nameA.localeCompare(nameB);
            }
            return val * dir;
        });

        const makeHeader = (label, key) => {
            const isSort = currentSort === key;
            const dirArrow = isSort ? (currentSortDir === 'asc' ? ' ↑' : ' ↓') : '';
            return `<th data-sort-key="${key}" style="cursor:pointer;user-select:none;">${label}${dirArrow}</th>`;
        };

        const table = document.createElement('table');
        table.className = 'emulators-table';
        table.innerHTML = `
        <thead>
            <tr>
                ${makeHeader('Name', 'name')}
                ${makeHeader('Platform', 'platform')}
                ${makeHeader('Path', 'path')}
            </tr>
        </thead>
        <tbody>
            ${sortedEmulators.map((emulator) => {
                const safeName = escapeHtml(emulator.name || 'Unknown Emulator');
                const safePlatform = escapeHtml(emulator.platform || emulator.platformShortName || i18n.t('gameDetails.unknown'));
                const installed = !!emulator.isInstalled;
                const safePath = getEmulatorPathMarkup(emulator, installed);
                const safePathTitle = escapeHtml(getEmulatorPathTitle(emulator, installed));
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
                        <td class="emulator-path" title="${safePathTitle}">${safePath}</td>
                    </tr>
                `;
            }).join('')}
        </tbody>
    `;

        table.querySelectorAll('th[data-sort-key]').forEach(th => {
            th.addEventListener('click', () => {
                const key = th.dataset.sortKey;
                if (currentSort === key) {
                    currentSortDir = currentSortDir === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSort = key;
                    currentSortDir = 'asc';
                }
                // Re-render table with new sort
                gamesContainer.innerHTML = '';
                // We need to re-append tabs and everything, or just re-call renderEmulators?
                // Calling renderEmulators again is safest but might flicker. 
                // Since we are inside the module, we can just call renderEmulatorsAsTable again?
                // But we need to clear container first.
                // Actually, renderEmulators clears gamesContainer.
                // We need to pass the original list back or keep it.
                // emulatorsToRender is available in closure.
                // But renderEmulators adds tabs.
                // We should re-call the main render function to keep it consistent.
                // But we don't have access to it easily without circular dependency or passing it.
                // Actually, this function is internal. The public one is renderEmulators.
                // But we are inside the closure of createEmulatorViewRenderer.
                // We can call renderEmulators(emulatorsToRender, options).
                // However, renderEmulators uses emulatorsToRender which is passed in.
                renderEmulators(emulatorsToRender, options);
            });
        });

        container.appendChild(table);
        gamesContainer.appendChild(container);
        wireEmulatorCardInteractions(container, sortedEmulators, options);
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

        root.addEventListener('click', (event) => {
            const item = event?.target?.closest?.('[data-emu-key]');
            if (!item || !root.contains(item)) return;
            activate(item);
        });

        root.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            const item = event?.target?.closest?.('[data-emu-key]');
            if (!item || !root.contains(item)) return;
            event.preventDefault();
            activate(item);
        });
    }

    function renderEmulatorsAsSlideshow(emulatorsToRender, options = {}) {
        const gamesContainer = document.getElementById('games-container');
        const container = document.createElement('div');
        container.className = 'slideshow-container';
        container.tabIndex = 0;

        if (emulatorsToRender.length === 0) {
            container.innerHTML = '<div class="slideshow-empty">No emulators to display.</div>';
            gamesContainer.appendChild(container);
            return;
        }

        let currentIndex = 0;
        const len = emulatorsToRender.length;
        
        const chrome = document.createElement('div');
        chrome.className = 'slideshow-chrome';
        
        const titleRow = document.createElement('div');
        titleRow.className = 'slideshow-title-row';
        const heading = document.createElement('h2');
        heading.className = 'slideshow-heading';
        titleRow.appendChild(heading);

        const wrapper = document.createElement('div');
        wrapper.className = 'slideshow-carousel-wrapper';
        const inner = document.createElement('div');
        inner.className = 'slideshow-carousel-inner';
        wrapper.appendChild(inner);

        const controls = document.createElement('div');
        controls.className = 'slideshow-controls';
        const prevBtn = document.createElement('button');
        prevBtn.className = 'slideshow-btn prev-btn';
        prevBtn.textContent = 'Previous';
        const nextBtn = document.createElement('button');
        nextBtn.className = 'slideshow-btn next-btn';
        nextBtn.textContent = 'Next';
        controls.appendChild(prevBtn);
        controls.appendChild(nextBtn);

        const footer = document.createElement('div');
        footer.className = 'slideshow-footer';
        
        const blurb = document.createElement('div');
        blurb.className = 'slideshow-blurb glass';
        const blurbMeta = document.createElement('div');
        blurbMeta.className = 'slideshow-blurb-meta';
        const blurbText = document.createElement('p');
        blurbText.className = 'slideshow-blurb-text';
        blurb.appendChild(blurbMeta);
        blurb.appendChild(blurbText);

        footer.appendChild(titleRow);
        footer.appendChild(blurb);
        footer.appendChild(controls);

        chrome.appendChild(wrapper);
        chrome.appendChild(footer);
        container.appendChild(chrome);
        gamesContainer.appendChild(container);

        function updateCard(card, idx) {
            const emulator = emulatorsToRender[idx];
            const safeName = escapeHtml(emulator.name || 'Unknown');
            const shortName = String(emulator.platformShortName || 'unknown').toLowerCase();
            const iconSrc = `emubro-resources/platforms/${shortName}/logos/default.png`;
            
            card.innerHTML = `
                <div class="emulator-card slideshow-emu-card" style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--bg-secondary);border-radius:18px;">
                    <img src="${iconSrc}" alt="" style="max-width:64%;max-height:64%;object-fit:contain;" />
                </div>
            `;
            applyPlatformColorBlurToEmulatorCards(card);
        }

        function updateHero(idx) {
            const emulator = emulatorsToRender[idx];
            heading.textContent = emulator.name;
            const platform = emulator.platform || emulator.platformShortName || 'Unknown';
            const installed = !!emulator.isInstalled ? 'Installed' : 'Not Installed';
            const path = getEmulatorPathMarkup(emulator, !!emulator.isInstalled);
            
            blurbMeta.innerHTML = `
                <span class="slideshow-meta-pill">${escapeHtml(platform)}</span>
                <span class="slideshow-meta-pill">${installed}</span>
                <span class="slideshow-meta-pill">${idx + 1} / ${len}</span>
            `;
            blurbText.innerHTML = path;
        }

        let slotOffsets = [-1, 0, 1];
        if (len === 1) slotOffsets = [0];
        
        const cards = slotOffsets.map(offset => {
            const btn = document.createElement('button');
            btn.className = 'slideshow-card';
            btn.dataset.offset = String(offset);
            if (offset === 0) btn.setAttribute('aria-current', 'true');
            const idx = (currentIndex + offset + len) % len;
            updateCard(btn, idx);
            btn.addEventListener('click', () => {
                if (offset !== 0) shift(offset);
                else showEmulatorDetails(emulatorsToRender[currentIndex], options);
            });
            inner.appendChild(btn);
            return btn;
        });

        function shift(dir) {
            currentIndex = (currentIndex + dir + len) % len;
            updateHero(currentIndex);
            
            cards.forEach(card => {
                const oldOffset = parseInt(card.dataset.offset, 10);
                let newOffset = oldOffset - dir;
                
                // Simple wrap logic for 3 cards
                if (newOffset < -1) newOffset = 1;
                if (newOffset > 1) newOffset = -1;
                
                card.dataset.offset = String(newOffset);
                if (newOffset === 0) card.setAttribute('aria-current', 'true');
                else card.removeAttribute('aria-current');
                
                const idx = (currentIndex + newOffset + len) % len;
                updateCard(card, idx);
            });
        }

        prevBtn.addEventListener('click', () => shift(-1));
        nextBtn.addEventListener('click', () => shift(1));
        container.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') shift(-1);
            if (e.key === 'ArrowRight') shift(1);
            if (e.key === 'Enter' || e.key === ' ') showEmulatorDetails(emulatorsToRender[currentIndex], options);
        });

        updateHero(currentIndex);
    }

    function renderEmulatorsAsRandom(emulatorsToRender, options = {}) {
        const gamesContainer = document.getElementById('games-container');
        const container = document.createElement('div');
        container.className = 'random-container random-container--slot';
        
        if (emulatorsToRender.length === 0) {
            container.innerHTML = '<div class="slot-empty">No emulators to spin.</div>';
            gamesContainer.appendChild(container);
            return;
        }

        const machine = document.createElement('div');
        machine.className = 'slot-machine';
        machine.innerHTML = `
            <div class="slot-marquee">
                <div class="slot-marquee-title">Emulator Roulette</div>
            </div>
            <div class="slot-stage">
                <div class="slot-cabinet">
                    <div class="slot-window">
                        <div class="slot-reel"><div class="slot-reel-inner"></div></div>
                        <div class="slot-payline"></div>
                    </div>
                </div>
                <div class="slot-controls">
                    <button type="button" class="action-btn slot-lever">SPIN</button>
                </div>
            </div>
            <div class="slot-result glass" tabindex="0" role="button">
                <div class="slot-result-title"></div>
                <div class="slot-result-meta"></div>
            </div>
        `;

        container.appendChild(machine);
        gamesContainer.appendChild(container);

        const reelInner = machine.querySelector('.slot-reel-inner');
        const resultEl = machine.querySelector('.slot-result');
        const resultTitle = machine.querySelector('.slot-result-title');
        const resultMeta = machine.querySelector('.slot-result-meta');
        const spinBtn = machine.querySelector('.slot-lever');

        // Populate reel
        const pool = emulatorsToRender.length < 20 ? [...emulatorsToRender, ...emulatorsToRender, ...emulatorsToRender] : emulatorsToRender;
        pool.slice(0, 50).forEach(emu => {
            const item = document.createElement('div');
            item.className = 'slot-item';
            const shortName = String(emu.platformShortName || 'unknown').toLowerCase();
            const iconSrc = `emubro-resources/platforms/${shortName}/logos/default.png`;
            item.innerHTML = `
                <img class="slot-item-image" src="${iconSrc}" alt="" style="object-fit:contain;padding:10px;" />
                <div class="slot-item-caption">${escapeHtml(emu.name)}</div>
            `;
            reelInner.appendChild(item);
        });

        let selectedIndex = 0;
        let isSpinning = false;

        function showResult(idx) {
            const emu = emulatorsToRender[idx % emulatorsToRender.length];
            resultTitle.textContent = emu.name;
            resultMeta.textContent = emu.platform || emu.platformShortName;
            selectedIndex = idx % emulatorsToRender.length;
        }

        spinBtn.addEventListener('click', () => {
            if (isSpinning) return;
            isSpinning = true;
            spinBtn.disabled = true;
            machine.classList.add('is-spinning');
            
            // Simple CSS animation simulation
            reelInner.style.transition = 'transform 2s cubic-bezier(0.1, 0.9, 0.2, 1)';
            const itemHeight = 220; // Approx
            const offset = Math.floor(Math.random() * pool.length) * itemHeight;
            reelInner.style.transform = `translateY(-${offset}px)`;

            setTimeout(() => {
                isSpinning = false;
                spinBtn.disabled = false;
                machine.classList.remove('is-spinning');
                const idx = Math.floor(offset / itemHeight);
                showResult(idx);
            }, 2100);
        });

        resultEl.addEventListener('click', () => {
            if (!isSpinning && emulatorsToRender[selectedIndex]) {
                showEmulatorDetails(emulatorsToRender[selectedIndex], options);
            }
        });

        showResult(0);
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

        if (activeView === 'slideshow') {
            renderEmulatorsAsSlideshow(rows, options);
            return;
        }

        if (activeView === 'random') {
            renderEmulatorsAsRandom(rows, options);
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
