export function renderGamesGroupedAccordion(gamesToRender, activeView = 'cover', options = {}) {
    const gamesContainer = document.getElementById('games-container');
    if (!gamesContainer) return;

    const normalizeGroupByValue = typeof options.normalizeGroupByValue === 'function'
        ? options.normalizeGroupByValue
        : (value) => value;
    const getGroupValueForGame = typeof options.getGroupValueForGame === 'function'
        ? options.getGroupValueForGame
        : () => '';
    const currentGroupBy = String(options.currentGroupBy || 'none');
    const groupAccordionState = options.groupAccordionState || new Map();
    const gameBatchSizeMap = options.gameBatchSizeMap || {};
    const createGameTableRow = typeof options.createGameTableRow === 'function' ? options.createGameTableRow : () => null;
    const createGameListItem = typeof options.createGameListItem === 'function' ? options.createGameListItem : () => null;
    const createGameCard = typeof options.createGameCard === 'function' ? options.createGameCard : () => null;
    const initializeLazyGameImages = typeof options.initializeLazyGameImages === 'function'
        ? options.initializeLazyGameImages
        : () => {};
    const setGamesScrollDetach = typeof options.setGamesScrollDetach === 'function'
        ? options.setGamesScrollDetach
        : () => {};
    const i18n = options.i18n;
    const escapeHtml = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const clampColorChannel = (value) => Math.max(0, Math.min(255, Math.round(Number(value) || 0)));
    const colorDistanceSq = (a, b) => {
        const dr = Number(a?.r || 0) - Number(b?.r || 0);
        const dg = Number(a?.g || 0) - Number(b?.g || 0);
        const db = Number(a?.b || 0) - Number(b?.b || 0);
        return (dr * dr) + (dg * dg) + (db * db);
    };
    const mixRgbColors = (a, b, amount = 0.5) => {
        const mix = Math.max(0, Math.min(1, Number(amount) || 0));
        return {
            r: clampColorChannel((Number(a?.r || 0) * (1 - mix)) + (Number(b?.r || 0) * mix)),
            g: clampColorChannel((Number(a?.g || 0) * (1 - mix)) + (Number(b?.g || 0) * mix)),
            b: clampColorChannel((Number(a?.b || 0) * (1 - mix)) + (Number(b?.b || 0) * mix))
        };
    };
    const toRgbaColor = (color, alpha = 1) => {
        return `rgba(${clampColorChannel(color?.r)}, ${clampColorChannel(color?.g)}, ${clampColorChannel(color?.b)}, ${Math.max(0, Math.min(1, Number(alpha) || 0))})`;
    };
    const hashStringToSeed = (value) => {
        const text = String(value || '');
        let hash = 0;
        for (let index = 0; index < text.length; index += 1) {
            hash = ((hash << 5) - hash) + text.charCodeAt(index);
            hash |= 0;
        }
        return Math.abs(hash);
    };
    const hslToRgb = (h, s, l) => {
        const hue = ((((Number(h) || 0) % 360) + 360) % 360) / 360;
        const sat = Math.max(0, Math.min(100, Number(s) || 0)) / 100;
        const light = Math.max(0, Math.min(100, Number(l) || 0)) / 100;
        if (sat === 0) {
            const gray = clampColorChannel(light * 255);
            return { r: gray, g: gray, b: gray };
        }
        const q = light < 0.5 ? light * (1 + sat) : light + sat - (light * sat);
        const p = 2 * light - q;
        const hueToChannel = (t) => {
            let n = t;
            if (n < 0) n += 1;
            if (n > 1) n -= 1;
            if (n < 1 / 6) return p + ((q - p) * 6 * n);
            if (n < 1 / 2) return q;
            if (n < 2 / 3) return p + ((q - p) * (2 / 3 - n) * 6);
            return p;
        };
        return {
            r: clampColorChannel(hueToChannel(hue + 1 / 3) * 255),
            g: clampColorChannel(hueToChannel(hue) * 255),
            b: clampColorChannel(hueToChannel(hue - 1 / 3) * 255)
        };
    };
    const fallbackPaletteFromSource = (source) => {
        const seed = hashStringToSeed(source || 'emubro-group');
        const baseHue = seed % 360;
        const colorA = hslToRgb(baseHue, 68, 56);
        const colorB = hslToRgb((baseHue + 38) % 360, 64, 54);
        const colorC = hslToRgb((baseHue + 320) % 360, 58, 46);
        return [
            toRgbaColor(colorA, 0.52),
            toRgbaColor(colorB, 0.46),
            toRgbaColor(colorC, 0.40)
        ];
    };
    const extractPaletteFromImage = (image) => {
        const width = Number(image?.naturalWidth || 0);
        const height = Number(image?.naturalHeight || 0);
        if (!width || !height) return null;
        const maxSize = 40;
        const scale = Math.min(1, maxSize / Math.max(width, height));
        const canvasWidth = Math.max(1, Math.round(width * scale));
        const canvasHeight = Math.max(1, Math.round(height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) return null;
        try {
            context.drawImage(image, 0, 0, canvasWidth, canvasHeight);
            const data = context.getImageData(0, 0, canvasWidth, canvasHeight).data;
            const buckets = new Map();
            for (let offset = 0; offset < data.length; offset += 16) {
                const alpha = data[offset + 3];
                if (alpha < 72) continue;
                const r = Math.floor(data[offset] / 24) * 24;
                const g = Math.floor(data[offset + 1] / 24) * 24;
                const b = Math.floor(data[offset + 2] / 24) * 24;
                const key = `${r},${g},${b}`;
                buckets.set(key, (buckets.get(key) || 0) + 1);
            }
            const sorted = [...buckets.entries()].sort((a, b) => b[1] - a[1]);
            if (!sorted.length) return null;
            const palette = [];
            for (const [bucketKey, count] of sorted) {
                if (palette.length > 0 && count < 2) continue;
                const parts = bucketKey.split(',').map((value) => clampColorChannel(Number(value)));
                if (parts.length !== 3) continue;
                const color = { r: parts[0], g: parts[1], b: parts[2] };
                const tooClose = palette.some((existing) => colorDistanceSq(existing, color) < 2200);
                if (tooClose) continue;
                palette.push(color);
                if (palette.length >= 3) break;
            }
            if (!palette.length) return null;
            if (palette.length === 1) {
                palette.push(mixRgbColors(palette[0], { r: 255, g: 255, b: 255 }, 0.34));
            }
            if (palette.length === 2) {
                palette.push(mixRgbColors(palette[0], { r: 16, g: 26, b: 56 }, 0.42));
            }
            return [
                toRgbaColor(palette[0], 0.52),
                toRgbaColor(palette[1], 0.46),
                toRgbaColor(palette[2], 0.40)
            ];
        } catch (_error) {
            return null;
        }
    };
    const applyPaletteToGroupSection = (section, palette) => {
        if (!section || !Array.isArray(palette) || palette.length < 3) return;
        section.style.setProperty('--group-glow-1', palette[0]);
        section.style.setProperty('--group-glow-2', palette[1]);
        section.style.setProperty('--group-glow-3', palette[2]);
    };

    const getPlatformShortName = (game) => {
        return String(game?.platformShortName || game?.platform || 'unknown').trim().toLowerCase() || 'unknown';
    };

    const getPlatformIcon = (game) => {
        return `emubro-resources/platforms/${getPlatformShortName(game)}/logos/default.png`;
    };

    const getGroupIdentity = (groupBy, group, heroGame) => {
        const label = String(group?.label || 'Unknown').trim() || 'Unknown';
        if (groupBy === 'platform') {
            return {
                label,
                iconSrc: heroGame ? getPlatformIcon(heroGame) : '',
                badgeText: '',
                badgeClassName: 'is-platform'
            };
        }

        const tokens = label
            .split(/[\s/&+_-]+/)
            .map((entry) => String(entry || '').trim())
            .filter(Boolean);
        const badgeText = (tokens[0]?.[0] || label[0] || '?').toUpperCase() + (tokens[1]?.[0] || '').toUpperCase();
        return {
            label,
            iconSrc: '',
            badgeText,
            badgeClassName: 'is-company'
        };
    };

    const getAccordionGroupRows = (rows = [], groupBy = 'none') => {
        const source = Array.isArray(rows) ? rows : [];
        const mode = normalizeGroupByValue(groupBy);
        if (mode === 'none') return [];

        const grouped = new Map();
        const order = [];
        source.forEach((game) => {
            const label = String(getGroupValueForGame(game, mode) || 'Unknown').trim() || 'Unknown';
            const key = label.toLowerCase();
            if (!grouped.has(key)) {
                grouped.set(key, { label, rows: [] });
                order.push(key);
            }
            grouped.get(key).rows.push(game);
        });
        return order.map((key) => grouped.get(key)).filter(Boolean);
    };

    const getAccordionStateKey = (view, label) => {
        return `${String(view || 'cover').toLowerCase()}::${String(currentGroupBy || 'none').toLowerCase()}::${String(label || 'unknown').toLowerCase()}`;
    };

    const view = (activeView === 'list' || activeView === 'table') ? activeView : 'cover';
    const groups = getAccordionGroupRows(gamesToRender, currentGroupBy);
    const scrollRoot = document.querySelector('.game-scroll-body') || gamesContainer.parentElement || null;
    const baseBatchSize = Number(gameBatchSizeMap[view] || gameBatchSizeMap.cover || 0);
    const groupBatchSize = Math.max(12, Math.floor(baseBatchSize * 0.35));
    const groupLoadObservers = [];

    if (!groups.length) {
        gamesContainer.innerHTML = `<p>${i18n.t('gameGrid.noGamesFound')}</p>`;
        return;
    }

    const setupGroupLazyLoader = (sentinelEl, loadMore, isExpandedRef) => {
        if (!sentinelEl || typeof loadMore !== 'function') return;
        if (!scrollRoot || typeof IntersectionObserver === 'undefined') {
            // Fallback: load everything when observer support/root is unavailable.
            while (loadMore()) {}
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                if (!isExpandedRef()) return;
                let guard = 0;
                while (guard < 2 && loadMore()) {
                    guard += 1;
                }
                if (!loadMore()) {
                    observer.disconnect();
                }
            });
        }, {
            root: scrollRoot,
            rootMargin: '420px 0px',
            threshold: 0.01
        });

        observer.observe(sentinelEl);
        groupLoadObservers.push(observer);
    };

    groups.forEach((group) => {
        const section = document.createElement('section');
        section.className = `games-group-accordion games-group-accordion-${view}`;

        const header = document.createElement('button');
        header.type = 'button';
        header.className = 'games-group-header';
        const groupCount = Array.isArray(group.rows) ? group.rows.length : 0;
        const heroGame = group.rows?.[0] || null;
        const identity = getGroupIdentity(currentGroupBy, group, heroGame);
        const fallbackPalette = fallbackPaletteFromSource(`${String(currentGroupBy || 'none')}:${identity.label}`);
        applyPaletteToGroupSection(section, fallbackPalette);
        header.title = `${identity.label} (${groupCount})`;

        const chevron = document.createElement('span');
        chevron.className = 'games-group-header-chevron';
        chevron.setAttribute('aria-hidden', 'true');

        const headerMain = document.createElement('span');
        headerMain.className = 'games-group-header-main';
        headerMain.innerHTML = `
            <span class="games-group-header-icon-wrap">
                ${identity.iconSrc
                    ? `<img class="games-group-header-icon" src="${escapeHtml(identity.iconSrc)}" alt="" loading="lazy" />`
                    : `<span class="games-group-header-badge ${escapeHtml(String(identity.badgeClassName || ''))}" aria-hidden="true">${escapeHtml(identity.badgeText || '')}</span>`
                }
            </span>
            <span class="games-group-header-title-wrap">
                <span class="games-group-header-title">${escapeHtml(identity.label)}</span>
            </span>
        `;
        const countEl = document.createElement('span');
        countEl.className = 'games-group-header-count';
        countEl.textContent = String(groupCount);
        if (identity.iconSrc) {
            const iconEl = headerMain.querySelector('.games-group-header-icon');
            if (iconEl instanceof HTMLImageElement) {
                const applyPaletteFromIcon = () => {
                    const imagePalette = extractPaletteFromImage(iconEl);
                    if (imagePalette) applyPaletteToGroupSection(section, imagePalette);
                };
                if (iconEl.complete && Number(iconEl.naturalWidth || 0) > 0) {
                    applyPaletteFromIcon();
                } else {
                    iconEl.addEventListener('load', applyPaletteFromIcon, { once: true });
                }
            }
        }

        header.appendChild(headerMain);
        header.appendChild(chevron);
        header.appendChild(countEl);

        const content = document.createElement('div');
        content.className = `games-group-content games-group-content-${view}`;
        const rows = Array.isArray(group.rows) ? group.rows : [];
        let renderedCount = 0;

        const renderBatch = () => {
            if (renderedCount >= rows.length) return false;
            const nextCount = Math.min(rows.length, renderedCount + groupBatchSize);
            const slice = rows.slice(renderedCount, nextCount);
            if (!slice.length) return false;

            if (view === 'table') {
                const tbody = content.querySelector('tbody');
                if (!tbody) return false;
                slice.forEach((game) => {
                    tbody.appendChild(createGameTableRow(game));
                });
                initializeLazyGameImages(tbody);
            } else if (view === 'list') {
                const list = content.querySelector('.games-group-list');
                if (!list) return false;
                slice.forEach((game) => {
                    list.appendChild(createGameListItem(game));
                });
                initializeLazyGameImages(list);
            } else {
                const grid = content.querySelector('.games-group-grid');
                if (!grid) return false;
                slice.forEach((game) => {
                    grid.appendChild(createGameCard(game));
                });
                initializeLazyGameImages(grid);
            }

            renderedCount = nextCount;
            return renderedCount < rows.length;
        };

        if (view === 'table') {
            const table = document.createElement('table');
            table.className = 'games-table games-group-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Cover</th>
                        <th>Game</th>
                        <th>Genre</th>
                        <th>Rating</th>
                        <th>Platform</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            content.appendChild(table);
        } else if (view === 'list') {
            const list = document.createElement('div');
            list.className = 'games-group-list';
            content.appendChild(list);
        } else {
            const grid = document.createElement('div');
            grid.className = 'games-group-grid';
            content.appendChild(grid);
        }

        const sentinel = document.createElement('div');
        sentinel.className = 'games-group-sentinel';
        content.appendChild(sentinel);

        const stateKey = getAccordionStateKey(view, group.label);
        const expanded = groupAccordionState.has(stateKey) ? !!groupAccordionState.get(stateKey) : true;
        section.classList.toggle('is-collapsed', !expanded);
        header.setAttribute('aria-expanded', expanded ? 'true' : 'false');

        if (expanded) {
            renderBatch();
        }
        setupGroupLazyLoader(sentinel, renderBatch, () => header.getAttribute('aria-expanded') === 'true');

        header.addEventListener('click', () => {
            const isExpanded = header.getAttribute('aria-expanded') === 'true';
            const nextExpanded = !isExpanded;
            header.setAttribute('aria-expanded', nextExpanded ? 'true' : 'false');
            section.classList.toggle('is-collapsed', !nextExpanded);
            groupAccordionState.set(stateKey, nextExpanded);
            if (nextExpanded && renderedCount === 0) {
                renderBatch();
            }
        });

        section.appendChild(header);
        section.appendChild(content);
        gamesContainer.appendChild(section);
    });

    setGamesScrollDetach(() => {
        groupLoadObservers.forEach((observer) => {
            try { observer.disconnect(); } catch (_error) {}
        });
    });
}
