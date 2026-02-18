/**
 * Game Manager
 */
import { createEmulatorDownloadActions } from './game-manager/emulator-download-actions';

const emubro = window.emubro;
const log = console;

let games = [];
let filteredGames = [];
let emulators = [];
let currentFilter = 'all';
let currentSort = 'name';

const EMULATOR_CONFIG_STORAGE_KEY = 'emuBro.emulatorConfigs.v1';
const EMULATOR_TYPE_TABS = ['standalone', 'core', 'web'];
const LAZY_PLACEHOLDER_SRC = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
const MAX_SLIDESHOW_POOL_SIZE = 500;
const MAX_RANDOM_POOL_SIZE = 120;
const GAMES_BATCH_SIZE = {
    cover: 72,
    list: 48,
    table: 80
};
const GAME_INFO_PIN_STORAGE_KEY = 'emuBro.gameInfoPopupPinned';
const EMULATOR_INFO_PIN_STORAGE_KEY = 'emuBro.emulatorInfoPopupPinned';

let gameImageObserver = null;
let gamesLoadObserver = null;
let gamesRenderToken = 0;
let gameInfoPopup = null;
let gameInfoPopupPinned = localStorage.getItem(GAME_INFO_PIN_STORAGE_KEY) === 'true';
let emulatorInfoPopup = null;
let emulatorInfoPopupPinned = localStorage.getItem(EMULATOR_INFO_PIN_STORAGE_KEY) === 'true';
let gameInfoPlatformsCache = null;
const emulatorIconPaletteCache = new Map();
let emulatorDownloadActions = null;

function getEmulatorDownloadActions() {
    if (!emulatorDownloadActions) {
        emulatorDownloadActions = createEmulatorDownloadActions({
            emubro,
            log,
            escapeHtml,
            normalizeEmulatorDownloadLinks,
            fetchEmulators,
            alertUser: (message) => alert(message)
        });
    }
    return emulatorDownloadActions;
}

function markLazyImageLoaded(img) {
    if (!img) return;
    img.dataset.lazyStatus = 'loaded';
    img.classList.remove('is-pending');
}

function attachLazyImageLoadHandlers(img) {
    if (!img) return;
    const onDone = () => {
        if (img.dataset.lazyStatus !== 'loading') return;
        markLazyImageLoaded(img);
        img.removeEventListener('load', onDone);
        img.removeEventListener('error', onDone);
    };
    img.addEventListener('load', onDone);
    img.addEventListener('error', onDone);
}

function ensureGameImageObserver() {
    if (gameImageObserver) return gameImageObserver;
    if (typeof IntersectionObserver !== 'function') return null;

    gameImageObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const img = entry.target;
            const source = String(img.dataset.lazySrc || '').trim();
            if (!source) {
                markLazyImageLoaded(img);
                gameImageObserver.unobserve(img);
                return;
            }

            if (img.dataset.lazyStatus === 'loaded' || img.dataset.lazyStatus === 'loading') {
                gameImageObserver.unobserve(img);
                return;
            }

            img.dataset.lazyStatus = 'loading';
            attachLazyImageLoadHandlers(img);
            img.src = source;
            if (img.complete && img.naturalWidth > 0) {
                markLazyImageLoaded(img);
            }
            gameImageObserver.unobserve(img);
        });
    }, {
        root: null,
        rootMargin: '220px 0px',
        threshold: 0.01
    });

    return gameImageObserver;
}

function prepareLazyGameImage(img) {
    if (!img || img.dataset.lazyPrepared === '1') return;
    const source = String(img.dataset.lazySrc || '').trim();
    img.dataset.lazyPrepared = '1';
    img.classList.add('lazy-game-image', 'is-pending');
    img.dataset.lazyStatus = 'pending';
    img.loading = 'lazy';
    img.decoding = 'async';
    if (!img.getAttribute('fetchpriority')) img.setAttribute('fetchpriority', 'low');
    img.src = LAZY_PLACEHOLDER_SRC;

    if (!source) {
        markLazyImageLoaded(img);
        return;
    }

    const observer = ensureGameImageObserver();
    if (!observer) {
        img.dataset.lazyStatus = 'loading';
        attachLazyImageLoadHandlers(img);
        img.src = source;
        if (img.complete && img.naturalWidth > 0) {
            markLazyImageLoaded(img);
        }
        return;
    }

    observer.observe(img);
}

function initializeLazyGameImages(root) {
    const scope = root || document;
    if (!scope) return;
    const images = scope.querySelectorAll('img[data-lazy-src]');
    images.forEach((img) => prepareLazyGameImage(img));
}

function clearGamesLoadObserver() {
    if (!gamesLoadObserver) return;
    try {
        gamesLoadObserver.disconnect();
    } catch (_e) {}
    gamesLoadObserver = null;
}

function getGameImagePath(game) {
    let gameImageToUse = game?.image;
    const platformShortName = String(game?.platformShortName || 'unknown').toLowerCase();
    if (!gameImageToUse) {
        gameImageToUse = `emubro-resources/platforms/${platformShortName}/covers/default.jpg`;
    }
    return gameImageToUse;
}

function buildViewGamePool(sourceGames, maxSize) {
    const source = Array.isArray(sourceGames) ? sourceGames : [];
    const cap = Number(maxSize) > 0 ? Number(maxSize) : source.length;
    if (source.length <= cap) return source;

    const sampled = [];
    const step = source.length / cap;
    for (let i = 0; i < cap; i++) {
        const idx = Math.min(source.length - 1, Math.floor(i * step));
        sampled.push(source[idx]);
    }
    return sampled;
}

export function getGames() { return games; }
export function setGames(val) { games = val; }
export function getFilteredGames() { return filteredGames; }
export function setFilteredGames(val) { filteredGames = val; }
export function getEmulators() { return emulators; }
export function setEmulators(val) { emulators = Array.isArray(val) ? val : []; }

export async function fetchEmulators() {
    try {
        const rows = await emubro.invoke('get-emulators');
        setEmulators(rows);
    } catch (error) {
        log.error('Failed to fetch emulators:', error);
        setEmulators([]);
    }
    return emulators;
}

export function renderGames(gamesToRender) {
    const gamesContainer = document.getElementById('games-container');
    if (!gamesContainer) return;

    clearGamesLoadObserver();
    gamesRenderToken += 1;

    const activeViewBtn = document.querySelector('.view-btn.active');
    const activeView = activeViewBtn ? activeViewBtn.dataset.view : 'cover';
    gamesContainer.className = `games-container ${activeView}-view`;

    gamesContainer.innerHTML = '';
    
    if (gamesToRender.length === 0) {
        gamesContainer.innerHTML = `<p>${i18n.t('gameGrid.noGamesFound')}</p>`;
        return;
    }

    if (activeView === 'slideshow') {
        renderGamesAsSlideshow(gamesToRender);
    } else if (activeView === 'random') {
        renderGamesAsRandom(gamesToRender);
    } else {
        renderGamesIncremental(gamesToRender, activeView);
    }

    initializeLazyGameImages(gamesContainer);
}

function normalizeEmulatorType(type) {
    const value = String(type || '').trim().toLowerCase();
    if (EMULATOR_TYPE_TABS.includes(value)) return value;
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

export function renderEmulators(emulatorsToRender = emulators, options = {}) {
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

function normalizeEmulatorDownloadLinks(raw) {
    const links = (raw && typeof raw === 'object') ? raw : {};
    const normalizeUrl = (value) => {
        const rawUrl = String(value || '').trim();
        if (!rawUrl) return '';
        return /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    };
    return {
        windows: normalizeUrl(links.windows || links.win || links.win32 || ''),
        linux: normalizeUrl(links.linux || ''),
        mac: normalizeUrl(links.mac || links.macos || links.darwin || '')
    };
}

function hasAnyDownloadLink(emulator) {
    const links = normalizeEmulatorDownloadLinks(emulator?.downloadLinks);
    const website = String(emulator?.website || '').trim();
    return !!(links.windows || links.linux || links.mac || website);
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

async function launchEmulatorAction(emulator) {
    if (!emulator?.filePath || !emulator?.isInstalled) {
        alert('This emulator is not installed yet.');
        return;
    }

    try {
        const config = getEmulatorConfig(emulator);
        const result = await emubro.invoke('launch-emulator', {
            filePath: emulator.filePath,
            args: config.launchArgs || '',
            workingDirectory: config.workingDirectory || ''
        });

        if (!result?.success) {
            alert(result?.message || 'Failed to launch emulator.');
        }
    } catch (error) {
        log.error('Failed to launch emulator:', error);
        alert('Failed to launch emulator.');
    }
}

async function openEmulatorInExplorerAction(emulator) {
    if (!emulator?.filePath || !emulator?.isInstalled) {
        alert('This emulator is not installed yet.');
        return;
    }

    try {
        const result = await emubro.invoke('show-item-in-folder', emulator.filePath);
        if (!result?.success) {
            alert(result?.message || 'Failed to open folder.');
        }
    } catch (error) {
        log.error('Failed to open emulator in explorer:', error);
        alert('Failed to open folder.');
    }
}

async function openEmulatorWebsiteAction(emulator) {
    try {
        const config = getEmulatorConfig(emulator);
        const website = String(config.website || '').trim();
        const websiteFromConfig = String(emulator.website || '').trim();
        const fallbackSearch = `https://www.google.com/search?q=${encodeURIComponent(`${emulator.name || ''} emulator`)}`;
        const url = website || websiteFromConfig || fallbackSearch;

        const result = await emubro.invoke('open-external-url', url);
        if (!result?.success) {
            alert(result?.message || 'Failed to open website.');
        }
    } catch (error) {
        log.error('Failed to open emulator website:', error);
        alert('Failed to open website.');
    }
}

async function openEmulatorDownloadLinkAction(emulator, osKey = '') {
    try {
        const links = normalizeEmulatorDownloadLinks(emulator?.downloadLinks);
        const normalized = String(osKey || '').toLowerCase();
        const url = normalized === 'windows'
            ? links.windows
            : (normalized === 'linux' ? links.linux : (normalized === 'mac' ? links.mac : ''));
        const fallback = String(emulator?.website || '').trim();
        const target = url || fallback;
        if (!target) {
            alert('No download link available for this emulator.');
            return;
        }

        const result = await emubro.invoke('open-external-url', target);
        if (!result?.success) {
            alert(result?.message || 'Failed to open download link.');
        }
    } catch (error) {
        log.error('Failed to open emulator download link:', error);
        alert('Failed to open download link.');
    }
}

function normalizeDownloadPackageType(packageType) {
    return getEmulatorDownloadActions().normalizeDownloadPackageType(packageType);
}

function getDownloadPackageTypeLabel(packageType) {
    return getEmulatorDownloadActions().getDownloadPackageTypeLabel(packageType);
}

function promptEmulatorDownloadType(emulator, optionsPayload = {}) {
    return getEmulatorDownloadActions().promptEmulatorDownloadType(emulator, optionsPayload);
}

async function downloadAndInstallEmulatorAction(emulator) {
    return getEmulatorDownloadActions().downloadAndInstallEmulatorAction(emulator);
}

async function openEmulatorConfigEditor(emulator) {
    const key = getEmulatorKey(emulator);
    const existing = getEmulatorConfig(emulator);
    const result = await promptEmulatorConfigModal(emulator, existing);
    if (!result) return false;

    if (result.reset) {
        const map = loadEmulatorConfigMap();
        delete map[key];
        saveEmulatorConfigMap(map);
        return true;
    }

    const map = loadEmulatorConfigMap();
    map[key] = {
        website: String(result.website || '').trim(),
        launchArgs: String(result.launchArgs || '').trim(),
        workingDirectory: String(result.workingDirectory || '').trim(),
        notes: String(result.notes || '').trim()
    };
    saveEmulatorConfigMap(map);
    return true;
}

function getEmulatorKey(emulator) {
    const filePath = String(emulator?.filePath || '').trim();
    if (filePath) return filePath.toLowerCase();
    const fallback = String(emulator?.id || emulator?.name || 'emu').trim();
    return fallback.toLowerCase();
}

function loadEmulatorConfigMap() {
    try {
        const raw = localStorage.getItem(EMULATOR_CONFIG_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
    } catch (_e) {}
    return {};
}

function saveEmulatorConfigMap(map) {
    try {
        localStorage.setItem(EMULATOR_CONFIG_STORAGE_KEY, JSON.stringify(map || {}));
    } catch (_e) {}
}

function getEmulatorConfig(emulator) {
    const key = getEmulatorKey(emulator);
    return loadEmulatorConfigMap()[key] || {};
}

function promptEmulatorConfigModal(emulator, existing) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'emulator-config-overlay';

        const modal = document.createElement('div');
        modal.className = 'emulator-config-modal glass';

        const title = document.createElement('h3');
        title.textContent = `Edit Emulator: ${emulator.name || 'Unknown'}`;

        const makeField = (labelText, value, key, multiline = false) => {
            const row = document.createElement('label');
            row.className = 'emulator-config-row';

            const label = document.createElement('span');
            label.className = 'emulator-config-label';
            label.textContent = labelText;

            let input;
            if (multiline) {
                input = document.createElement('textarea');
                input.rows = 3;
            } else {
                input = document.createElement('input');
                input.type = 'text';
            }

            input.className = 'emulator-config-input';
            input.value = String(value || '');
            input.dataset.key = key;

            row.appendChild(label);
            row.appendChild(input);
            return row;
        };

        const form = document.createElement('div');
        form.className = 'emulator-config-form';
        form.appendChild(makeField('Website URL', existing.website, 'website'));
        form.appendChild(makeField('Launch Arguments', existing.launchArgs, 'launchArgs'));
        form.appendChild(makeField('Working Directory', existing.workingDirectory, 'workingDirectory'));
        form.appendChild(makeField('Notes', existing.notes, 'notes', true));

        const actions = document.createElement('div');
        actions.className = 'emulator-config-actions';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'action-btn';
        cancelBtn.textContent = 'Cancel';

        const resetBtn = document.createElement('button');
        resetBtn.className = 'action-btn remove-btn';
        resetBtn.textContent = 'Reset';

        const saveBtn = document.createElement('button');
        saveBtn.className = 'action-btn launch-btn';
        saveBtn.textContent = 'Save';

        actions.appendChild(cancelBtn);
        actions.appendChild(resetBtn);
        actions.appendChild(saveBtn);

        modal.appendChild(title);
        modal.appendChild(form);
        modal.appendChild(actions);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const close = (payload) => {
            overlay.remove();
            resolve(payload);
        };

        cancelBtn.addEventListener('click', () => close(null));
        resetBtn.addEventListener('click', () => close({ reset: true }));
        saveBtn.addEventListener('click', () => {
            const values = {};
            modal.querySelectorAll('.emulator-config-input').forEach((input) => {
                const key = String(input.dataset.key || '').trim();
                if (!key) return;
                values[key] = input.value;
            });
            close(values);
        });

        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) close(null);
        });
    });
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function createGameCard(game) {
    const card = document.createElement('div');
    card.className = 'game-card';
    card.dataset.gameId = game.id;

    let gameImageToUse = game.image;
    const platformShortName = String(game.platformShortName || 'unknown').toLowerCase();
    const platformDisplayName = game.platform || game.platformShortName || i18n.t('gameDetails.unknown');
    if (!gameImageToUse) {
        gameImageToUse = `emubro-resources/platforms/${platformShortName}/covers/default.jpg`;
    }
    const platformIcon = `emubro-resources/platforms/${platformShortName}/logos/default.png`;
    const safeName = escapeHtml(game.name);
    const safePlatformName = escapeHtml(platformDisplayName);
    const safeImagePath = escapeHtml(gameImageToUse);

    card.innerHTML = `
        <div class="game-cover">
            <img src="${LAZY_PLACEHOLDER_SRC}" data-lazy-src="${safeImagePath}" alt="${safeName}" class="game-image lazy-game-image is-pending" loading="lazy" decoding="async" fetchpriority="low" />
            <span class="game-platform-badge" title="${safePlatformName}" aria-label="${safePlatformName}">
                <img src="${platformIcon}" alt="${safePlatformName}" class="game-platform-icon" loading="lazy" onerror="this.closest('.game-platform-badge').style.display='none'" />
            </span>
            <button class="game-cover-play-btn" type="button" aria-label="Play ${safeName}">
                <span class="game-cover-play-icon" aria-hidden="true"></span>
            </button>
        </div>
        <div class="game-info">
            <h3 class="game-title">${safeName}</h3>
        </div>
    `;

    const playBtn = card.querySelector('.game-cover-play-btn');
    if (playBtn) {
        playBtn.addEventListener('click', async (event) => {
            event.stopPropagation();
            await launchGame(game.id);
        });
    }

    card.addEventListener('click', () => {
        showGameDetails(game);
    });

    return card;
}

function normalizeSearchScope(scope) {
    const value = String(scope || '').trim().toLowerCase();
    if (value === 'games' || value === 'emulators' || value === 'both') return value;
    return 'both';
}

export async function searchForGamesAndEmulators(scanTargets = [], options = {}) {
    const searchBtn = document.getElementById('search-games-btn');
    const normalizedScope = normalizeSearchScope(options?.scope);
    if (searchBtn) {
        searchBtn.disabled = true;
        searchBtn.textContent = 'Searching...';
    }
    
    try {
        const rawTargets = Array.isArray(scanTargets) ? scanTargets : [];
        const targets = rawTargets
            .map((v) => String(v || '').trim())
            .filter(Boolean);
        const dedupedTargets = Array.from(new Set(targets.map((v) => v.toLowerCase())))
            .map((key) => targets.find((t) => t.toLowerCase() === key))
            .filter(Boolean);

        // Keep previous behavior when no target is explicitly provided.
        if (dedupedTargets.length === 0) dedupedTargets.push('');

        let totalFoundGames = 0;
        let totalFoundEmulators = 0;
        const foundGamePaths = [];
        const foundEmulatorPaths = [];
        let anySuccess = false;

        for (const target of dedupedTargets) {
            const result = await emubro.invoke('browse-games-and-emus', target, { scope: normalizedScope });
            if (!result?.success) continue;
            anySuccess = true;
            const gamesFound = Array.isArray(result.games) ? result.games : [];
            const emulatorsFound = Array.isArray(result.emulators) ? result.emulators : [];
            totalFoundGames += gamesFound.length;
            totalFoundEmulators += emulatorsFound.length;
            gamesFound.forEach((game) => {
                const filePath = String(game?.filePath || '').trim();
                if (filePath) foundGamePaths.push(filePath);
            });
            emulatorsFound.forEach((emu) => {
                const filePath = String(emu?.filePath || '').trim();
                if (filePath) foundEmulatorPaths.push(filePath);
            });
        }

        if (anySuccess) {
            const updatedGames = await emubro.invoke('get-games');
            setGames(updatedGames);
            setFilteredGames([...updatedGames]);
            renderGames(getFilteredGames());
            initializePlatformFilterOptions();
            alert(`Found ${totalFoundGames} games and ${totalFoundEmulators} emulators.`);
        }

        return {
            success: anySuccess,
            scope: normalizedScope,
            scanTargets: dedupedTargets,
            totalFoundGames,
            totalFoundEmulators,
            foundGamePaths,
            foundEmulatorPaths
        };
    } catch (error) {
        log.error('Search failed:', error);
        return {
            success: false,
            scope: normalizedScope,
            scanTargets: [],
            totalFoundGames: 0,
            totalFoundEmulators: 0,
            foundGamePaths: [],
            foundEmulatorPaths: [],
            error: error?.message || String(error)
        };
    } finally {
        if (searchBtn) {
            searchBtn.disabled = false;
            searchBtn.textContent = 'Search Games';
        }
    }
}

export async function handleGameAction(event) {
    const button = event.currentTarget;
    const gameId = parseInt(button.dataset.gameId);
    const action = button.dataset.action;
    
    try {
        switch (action) {
            case 'uninstall':
            case 'remove':
                await removeGame(gameId);
                break;
            case 'launch':
                await launchGame(gameId);
                break;
        }
    } catch (error) {
        log.error(`Failed to ${action} game ${gameId}:`, error);
        alert(i18n.t('messages.failedToAction', { action: action }));
    }
}

async function removeGame(gameId) {
    const result = await emubro.invoke('remove-game', gameId);
    if (result.success) {
        await reloadGamesFromMainAndRender();
        alert(result.message || 'Game removed from library.');
    } else {
        alert(i18n.tf('messages.removalFailed', { message: result.message }));
    }
}

async function reloadGamesFromMainAndRender() {
    const updatedGames = await emubro.invoke('get-games');
    setGames(updatedGames);

    applyFilters();

    const searchTerm = String(document.querySelector('.search-bar input')?.value || '').trim().toLowerCase();
    if (!searchTerm) return;

    const searched = getFilteredGames().filter((game) => {
        const name = String(game.name || '').toLowerCase();
        const platform = String(game.platform || game.platformShortName || '').toLowerCase();
        return name.includes(searchTerm) || platform.includes(searchTerm);
    });
    setFilteredGames(searched);
    renderGames(searched);
}

function showMissingGameDialog(missingResult) {
    return new Promise((resolve) => {
        const gameName = String(missingResult?.gameName || 'Game');
        const missingPath = String(missingResult?.missingPath || '');
        const parentPath = String(missingResult?.parentPath || '');
        const parentExists = !!missingResult?.parentExists;
        const rootPath = String(missingResult?.rootPath || '');
        const rootExists = missingResult?.rootExists !== false;
        const sourceMedia = String(missingResult?.sourceMedia || '').trim().toLowerCase();

        let rootHint = '';
        if (rootPath && !rootExists) {
            if (sourceMedia === 'removable' || sourceMedia === 'cdrom' || sourceMedia === 'drive') {
                rootHint = `Storage root is unavailable (${escapeHtml(rootPath)}). Connect the media (USB stick, external HDD, or disc), then try launch again.`;
            } else if (sourceMedia === 'network') {
                rootHint = `Network root is unavailable (${escapeHtml(rootPath)}). Reconnect the network share and try again.`;
            } else {
                rootHint = `Storage root is unavailable (${escapeHtml(rootPath)}). Reconnect the source media or remap the path.`;
            }
        }

        const overlay = document.createElement('div');
        overlay.style.cssText = [
            'position:fixed',
            'inset:0',
            'z-index:4000',
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'padding:18px',
            'background:rgba(0,0,0,0.56)'
        ].join(';');

        const modal = document.createElement('div');
        modal.className = 'glass';
        modal.style.cssText = [
            'width:min(760px,100%)',
            'border:1px solid var(--border-color)',
            'border-radius:14px',
            'background:var(--bg-secondary)',
            'padding:16px',
            'box-shadow:0 16px 34px rgba(0,0,0,0.42)'
        ].join(';');

        modal.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
                <h3 style="margin:0;font-size:1.06rem;">Could not launch: ${escapeHtml(gameName)}</h3>
                <button type="button" class="close-btn" aria-label="Close">&times;</button>
            </div>
            <p style="margin:10px 0 6px 0;color:var(--text-secondary);">
                The game file is missing.
            </p>
            <div style="font-family:monospace;font-size:12px;word-break:break-all;padding:10px;border:1px solid var(--border-color);border-radius:10px;background:var(--bg-primary);margin-bottom:8px;">
                ${escapeHtml(missingPath || '(unknown path)')}
            </div>
            <p style="margin:0 0 14px 0;color:var(--text-secondary);font-size:0.92rem;">
                ${parentExists
                    ? `Parent folder exists: ${escapeHtml(parentPath)}.`
                    : `Parent folder is missing: ${escapeHtml(parentPath || '(unknown)')}.`}
            </p>
            ${rootHint ? `<p style="margin:0 0 14px 0;color:var(--warning-color, #ffcc66);font-size:0.92rem;">${rootHint}</p>` : ''}
            <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end;">
                <button type="button" class="action-btn remove-btn" data-missing-action="remove">Remove Game</button>
                <button type="button" class="action-btn" data-missing-action="search">Search Further</button>
                <button type="button" class="action-btn launch-btn" data-missing-action="browse">Browse For File</button>
            </div>
        `;

        const close = (action) => {
            overlay.remove();
            resolve(action);
        };

        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) close('cancel');
        });

        const closeBtn = modal.querySelector('.close-btn');
        if (closeBtn) closeBtn.addEventListener('click', () => close('cancel'));

        modal.querySelectorAll('[data-missing-action]').forEach((btn) => {
            btn.addEventListener('click', () => close(btn.dataset.missingAction || 'cancel'));
        });

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    });
}

async function handleMissingGameLaunch(gameId, missingResult) {
    let currentMissing = missingResult;

    while (true) {
        const action = await showMissingGameDialog(currentMissing);

        if (action === 'remove') {
            const removeResult = await emubro.invoke('remove-game', gameId);
            if (!removeResult?.success) {
                alert(removeResult?.message || 'Failed to remove game.');
                return false;
            }
            await reloadGamesFromMainAndRender();
            return false;
        }

        if (action === 'search') {
            const folderPick = await emubro.invoke('open-file-dialog', {
                title: 'Select a folder to search',
                properties: ['openDirectory']
            });
            if (!folderPick || folderPick.canceled || !Array.isArray(folderPick.filePaths) || folderPick.filePaths.length === 0) {
                continue;
            }

            const searchResult = await emubro.invoke('search-missing-game-file', {
                gameId,
                rootDir: folderPick.filePaths[0],
                maxDepth: 10
            });

            if (!searchResult?.success) {
                alert(searchResult?.message || 'Search failed.');
                continue;
            }
            if (!searchResult?.found) {
                alert('File not found in that folder.');
                continue;
            }

            await reloadGamesFromMainAndRender();
            const retryResult = await emubro.invoke('launch-game', gameId);
            if (retryResult?.success) return true;
            if (retryResult?.code === 'GAME_FILE_MISSING') {
                currentMissing = retryResult;
                continue;
            }
            alert(i18n.tf('messages.launchFailed', { message: retryResult?.message || 'Unknown error' }));
            return false;
        }

        if (action === 'browse') {
            const filePick = await emubro.invoke('open-file-dialog', {
                title: 'Locate game file',
                properties: ['openFile'],
                defaultPath: currentMissing?.parentPath || undefined
            });
            if (!filePick || filePick.canceled || !Array.isArray(filePick.filePaths) || filePick.filePaths.length === 0) {
                continue;
            }

            const relinkResult = await emubro.invoke('relink-game-file', {
                gameId,
                filePath: filePick.filePaths[0]
            });
            if (!relinkResult?.success) {
                alert(relinkResult?.message || 'Failed to relink game.');
                continue;
            }

            await reloadGamesFromMainAndRender();
            const retryResult = await emubro.invoke('launch-game', gameId);
            if (retryResult?.success) return true;
            if (retryResult?.code === 'GAME_FILE_MISSING') {
                currentMissing = retryResult;
                continue;
            }
            alert(i18n.tf('messages.launchFailed', { message: retryResult?.message || 'Unknown error' }));
            return false;
        }

        return false;
    }
}

async function launchGame(gameId) {
    const result = await emubro.invoke('launch-game', gameId);
    if (result?.success) return;

    if (result?.code === 'GAME_FILE_MISSING') {
        await handleMissingGameLaunch(gameId, result);
        return;
    }

    alert(i18n.tf('messages.launchFailed', { message: result?.message || 'Unknown error' }));
}

export function applyFilters() {
    filteredGames = [...games];
    
    const platformFilter = document.getElementById('platform-filter');
    const sortFilter = document.getElementById('sort-filter');
    
    currentFilter = platformFilter ? platformFilter.value : 'all';
    currentSort = sortFilter ? sortFilter.value : 'name';

    if (currentFilter !== 'all') {
        filteredGames = filteredGames.filter(game => game.platformShortName.toLowerCase() === currentFilter);
    }
    
    switch (currentSort) {
        case 'rating':
            filteredGames.sort((a, b) => b.rating - a.rating);
            break;
        case 'price':
            filteredGames.sort((a, b) => a.price - b.price);
            break;
        case 'platform':
            filteredGames.sort((a, b) => (a.platform || a.platformShortName || 'Unknown').localeCompare(b.platform || b.platformShortName || 'Unknown'));
            break;
        default: 
            filteredGames.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    renderGames(filteredGames);
}

export function initializePlatformFilterOptions(sourceRows = games) {
    const platformFilter = document.getElementById('platform-filter');
    if (!platformFilter) return;

    const previousValue = String(platformFilter.value || 'all').toLowerCase();
    platformFilter.innerHTML = '<option value="all">All Platforms</option>';

    const rows = Array.isArray(sourceRows) ? sourceRows : [];
    const platformMap = new Map();
    rows.forEach((row) => {
        const shortName = String(row?.platformShortName || '').trim().toLowerCase();
        if (!shortName) return;
        if (platformMap.has(shortName)) return;

        const displayName = String(row?.platform || '').trim();
        platformMap.set(shortName, displayName || (shortName.charAt(0).toUpperCase() + shortName.slice(1)));
    });

    [...platformMap.keys()].sort((a, b) => a.localeCompare(b)).forEach((platform) => {
        const option = document.createElement('option');
        option.value = String(platform).toLowerCase();
        option.textContent = String(platformMap.get(platform) || platform);
        platformFilter.appendChild(option);
    });

    const hasPrevious = Array.from(platformFilter.options).some((option) => option.value === previousValue);
    platformFilter.value = hasPrevious ? previousValue : 'all';
}

export function addPlatformFilterOption(platformShortName) {
    const platformFilter = document.getElementById('platform-filter');
    if (!platformFilter) return;

    const exists = Array.from(platformFilter.options).some(option => option.value === platformShortName.toLowerCase());
    if (!exists) {
        const option = document.createElement('option');
        option.value = platformShortName.toLowerCase();
        option.textContent = platformShortName.charAt(0).toUpperCase() + platformShortName.slice(1);
        platformFilter.appendChild(option);
    }
}

function createGameTableRow(game) {
    const row = document.createElement('tr');
    const gameImageToUse = getGameImagePath(game);
    const platformShortName = String(game.platformShortName || 'unknown').toLowerCase();
    const platformIcon = `emubro-resources/platforms/${platformShortName}/logos/default.png`;
    const safeName = escapeHtml(game.name);
    const safeGenre = escapeHtml(game.genre || i18n.t('gameDetails.unknown'));
    const safePlatformShort = escapeHtml(game.platformShortName || '');

    row.innerHTML = `
        <td class="table-image-cell"><img src="${LAZY_PLACEHOLDER_SRC}" data-lazy-src="${escapeHtml(gameImageToUse)}" alt="${safeName}" class="table-game-image lazy-game-image is-pending" loading="lazy" decoding="async" fetchpriority="low" /></td>
        <td>${safeName}</td>
        <td>${safeGenre}</td>
        <td>
            <span class="rating-inline">
                <span class="icon-svg rating-star-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                        <path d="m12 3 2.8 5.6 6.2.9-4.5 4.4 1.1 6.2L12 17.2 6.4 20l1.1-6.2L3 9.5l6.2-.9L12 3Z"></path>
                    </svg>
                </span>
                <span>${game.rating}</span>
            </span>
        </td>
        <td class="table-image-cell"><img src="${platformIcon}" alt="${safePlatformShort}" class="table-platform-image" loading="lazy" /></td>
        <td>${game.isInstalled ? 'Installed' : 'Not Installed'}</td>
    `;

    row.classList.add('game-row-clickable');
    row.addEventListener('click', () => showGameDetails(game));

    return row;
}

function createGameListItem(game) {
    const listItem = document.createElement('div');
    listItem.className = 'list-item';

    const gameImageToUse = getGameImagePath(game);
    const platformShortName = String(game.platformShortName || 'unknown').toLowerCase();
    const platformIcon = `emubro-resources/platforms/${platformShortName}/logos/default.png`;
    const safeName = escapeHtml(game.name);
    const safePlatform = escapeHtml(game.platform || game.platformShortName || i18n.t('gameDetails.unknown'));
    const safePlatformShort = escapeHtml(game.platformShortName || '');
    const safeGenre = escapeHtml(game.genre || i18n.t('gameDetails.unknown'));

    listItem.innerHTML = `
        <img src="${LAZY_PLACEHOLDER_SRC}" data-lazy-src="${escapeHtml(gameImageToUse)}" alt="${safeName}" class="list-item-image lazy-game-image is-pending" loading="lazy" decoding="async" fetchpriority="low" />
        <div class="list-item-info">
            <h3 class="list-item-title">${safeName}</h3>
            <span class="list-item-platform-badge">
                <img src="${platformIcon}" alt="${safePlatformShort}" class="list-platform-icon" loading="lazy" onerror="this.style.display='none'" />
                <span>${safePlatform}</span>
            </span>
            <p class="list-item-genre">${safeGenre}</p>
            <div class="list-item-meta">
                <span class="list-item-rating">
                    <span class="rating-inline">
                        <span class="icon-svg rating-star-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                                <path d="m12 3 2.8 5.6 6.2.9-4.5 4.4 1.1 6.2L12 17.2 6.4 20l1.1-6.2L3 9.5l6.2-.9L12 3Z"></path>
                            </svg>
                        </span>
                        <span>${game.rating}</span>
                    </span>
                </span>
                <span class="list-item-status">${game.isInstalled ? 'Installed' : 'Not Installed'}</span>
            </div>
        </div>
    `;

    listItem.classList.add('game-row-clickable');
    listItem.addEventListener('click', () => showGameDetails(game));

    return listItem;
}

function renderGamesIncremental(gamesToRender, activeView = 'cover') {
    const gamesContainer = document.getElementById('games-container');
    if (!gamesContainer) return;

    const view = (activeView === 'list' || activeView === 'table') ? activeView : 'cover';
    const renderToken = gamesRenderToken;
    const batchSize = GAMES_BATCH_SIZE[view] || GAMES_BATCH_SIZE.cover;

    let mountTarget = gamesContainer;
    let tableBody = null;

    if (view === 'table') {
        const table = document.createElement('table');
        table.className = 'games-table';
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
        tableBody = table.querySelector('tbody');
        mountTarget = tableBody;
        gamesContainer.appendChild(table);
    } else if (view === 'list') {
        const listContainer = document.createElement('div');
        listContainer.className = 'games-list';
        mountTarget = listContainer;
        gamesContainer.appendChild(listContainer);
    }

    const sentinel = document.createElement('div');
    sentinel.className = 'games-load-sentinel';
    sentinel.setAttribute('aria-hidden', 'true');
    gamesContainer.appendChild(sentinel);

    const showIndicator = localStorage.getItem('emuBro.showLoadIndicator') !== 'false';
    const indicator = document.createElement('div');
    indicator.className = 'games-load-indicator';
    if (showIndicator) {
        gamesContainer.appendChild(indicator);
    }
    let indicatorTimer = null;

    const setIndicator = (message, isComplete = false) => {
        if (!showIndicator) return;
        indicator.textContent = String(message || '');
        indicator.classList.toggle('is-complete', !!isComplete);
        indicator.classList.add('is-visible');
        if (indicatorTimer) window.clearTimeout(indicatorTimer);
        indicatorTimer = window.setTimeout(() => {
            indicator.classList.remove('is-visible');
        }, isComplete ? 2000 : 1300);
    };

    let cursor = 0;
    let isLoading = false;

    const appendNextChunk = () => {
        if (isLoading || renderToken !== gamesRenderToken) return;
        if (cursor >= gamesToRender.length) return;
        isLoading = true;

        const start = cursor;
        const end = Math.min(gamesToRender.length, cursor + batchSize);
        const chunk = gamesToRender.slice(cursor, end);

        if (view === 'table') {
            const fragment = document.createDocumentFragment();
            chunk.forEach((game) => fragment.appendChild(createGameTableRow(game)));
            tableBody.appendChild(fragment);
            initializeLazyGameImages(tableBody);
        } else if (view === 'list') {
            const fragment = document.createDocumentFragment();
            chunk.forEach((game) => fragment.appendChild(createGameListItem(game)));
            mountTarget.appendChild(fragment);
            initializeLazyGameImages(mountTarget);
        } else {
            const fragment = document.createDocumentFragment();
            chunk.forEach((game) => fragment.appendChild(createGameCard(game)));
            mountTarget.appendChild(fragment);
            initializeLazyGameImages(mountTarget);
        }

        cursor = end;
        isLoading = false;

        const shouldShowProgress = start >= (batchSize * 2);
        if (shouldShowProgress && cursor < gamesToRender.length) {
            setIndicator(`Loaded ${cursor} / ${gamesToRender.length}`);
        }

        if (cursor >= gamesToRender.length) {
            clearGamesLoadObserver();
            sentinel.remove();
            setIndicator(`All ${gamesToRender.length} games loaded`, true);
            if (indicatorTimer) window.clearTimeout(indicatorTimer);
            window.setTimeout(() => indicator.remove(), 2200);
        }
    };

    appendNextChunk();
    if (cursor < gamesToRender.length && gamesToRender.length > batchSize) {
        appendNextChunk();
    }

    if (cursor >= gamesToRender.length) return;

    if (typeof IntersectionObserver !== 'function') {
        const flushRemaining = () => {
            if (renderToken !== gamesRenderToken) return;
            appendNextChunk();
            if (cursor < gamesToRender.length) {
                requestAnimationFrame(flushRemaining);
            }
        };
        requestAnimationFrame(flushRemaining);
        return;
    }

    const scrollRoot = document.querySelector('main.game-grid') || null;
    gamesLoadObserver = new IntersectionObserver((entries) => {
        if (renderToken !== gamesRenderToken) {
            clearGamesLoadObserver();
            return;
        }
        if (!entries.some((entry) => entry.isIntersecting)) return;
        appendNextChunk();
    }, {
        root: scrollRoot,
        rootMargin: '640px 0px',
        threshold: 0.01
    });

    gamesLoadObserver.observe(sentinel);
}

function renderGamesAsTable(gamesToRender) {
    renderGamesIncremental(gamesToRender, 'table');
}

function renderGamesAsList(gamesToRender) {
    renderGamesIncremental(gamesToRender, 'list');
}

function renderGamesAsSlideshow(gamesToRender) {
    const gamesContainer = document.getElementById('games-container');
    const slideshowContainer = document.createElement('div');
    slideshowContainer.className = 'slideshow-container';
    slideshowContainer.tabIndex = 0;
    const slideshowGames = buildViewGamePool(gamesToRender, MAX_SLIDESHOW_POOL_SIZE);

    if (!slideshowGames || slideshowGames.length === 0) {
        slideshowContainer.innerHTML = `<div class="slideshow-empty">No games to display.</div>`;
        gamesContainer.appendChild(slideshowContainer);
        return;
    }

    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let currentIndex = 0;
    let isAnimating = false;
    let pendingSteps = 0;
    let rapidShiftBudget = 0;
    let suppressClickUntil = 0;

    const backdrops = [document.createElement('div'), document.createElement('div')];
    let activeBackdrop = 0;
    backdrops.forEach((el, i) => {
        el.className = 'slideshow-backdrop' + (i === 0 ? ' is-active' : '');
        el.setAttribute('aria-hidden', 'true');
    });

    const chrome = document.createElement('div');
    chrome.className = 'slideshow-chrome';

    const titleRow = document.createElement('div');
    titleRow.className = 'slideshow-title-row';
    const heading = document.createElement('h2');
    heading.className = 'slideshow-heading';
    titleRow.appendChild(heading);

    const carouselWrapper = document.createElement('div');
    carouselWrapper.className = 'slideshow-carousel-wrapper';
    const carouselInner = document.createElement('div');
    carouselInner.className = 'slideshow-carousel-inner';

    const blurb = document.createElement('div');
    blurb.className = 'slideshow-blurb glass';
    const blurbMeta = document.createElement('div');
    blurbMeta.className = 'slideshow-blurb-meta';
    const blurbText = document.createElement('p');
    blurbText.className = 'slideshow-blurb-text';
    blurb.appendChild(blurbMeta);
    blurb.appendChild(blurbText);

    function getGameImage(game) {
        let gameImageToUse = game && game.image;
        if (!gameImageToUse && game && game.platformShortName) {
            const platformShortName = game.platformShortName.toLowerCase();
            gameImageToUse = `emubro-resources/platforms/${platformShortName}/covers/default.jpg`;
        }
        return gameImageToUse;
    }

    function setBackdropForIndex(idx) {
        const game = slideshowGames[idx];
        const heroImg = getGameImage(game);

        const nextBackdrop = 1 - activeBackdrop;
        backdrops[nextBackdrop].style.backgroundImage = heroImg ? `url("${heroImg}")` : '';
        backdrops[nextBackdrop].classList.add('is-active');
        backdrops[activeBackdrop].classList.remove('is-active');
        activeBackdrop = nextBackdrop;
    }

    function updateHero(idx) {
        const game = slideshowGames[idx];
        heading.textContent = game.name;

        const platformName = game.platform || game.platformShortName || i18n.t('gameDetails.unknown');
        const ratingText = (game.rating !== undefined && game.rating !== null) ? `${game.rating}` : i18n.t('gameDetails.unknown');
        const statusText = game.isInstalled ? 'Installed' : 'Not Installed';

        blurbMeta.innerHTML = `
            <span class="slideshow-meta-pill">${platformName}</span>
            <span class="slideshow-meta-pill">Rating: ${ratingText}</span>
            <span class="slideshow-meta-pill">${statusText}</span>
            <span class="slideshow-meta-pill">${idx + 1} / ${slideshowGames.length}</span>
        `;

        blurbText.textContent = (game.description && String(game.description).trim().length > 0)
            ? String(game.description).trim()
            : 'No description available for this game yet.';

        if (!reduceMotion) {
            chrome.classList.add('is-swapping');
            setTimeout(() => chrome.classList.remove('is-swapping'), 180);
        }

        setBackdropForIndex(idx);
    }

    const len = slideshowGames.length;
    let slotOffsets = [-2, -1, 0, 1, 2];
    if (len <= 1) slotOffsets = [0];
    else if (len === 2) slotOffsets = [-1, 0, 1];
    else if (len === 3) slotOffsets = [-1, 0, 1];
    else if (len === 4) slotOffsets = [-2, -1, 0, 1];

    const minOffset = Math.min(...slotOffsets);
    const maxOffset = Math.max(...slotOffsets);

    function applyCardOrientation(card, imgEl) {
        try {
            const w = imgEl?.naturalWidth || 0;
            const h = imgEl?.naturalHeight || 0;
            if (!w || !h) return;
            const ratio = w / h;
            const landscape = ratio >= 1.10;

            card.classList.toggle('is-landscape', landscape);
            card.classList.toggle('is-portrait', !landscape);
        } catch (_e) {}
    }

    function setCardContent(card, idx) {
        const game = slideshowGames[idx];
        const img = card.querySelector('img');
        const src = getGameImage(game);
        img.src = src || '';
        img.alt = game.name;
        card.setAttribute('aria-label', game.name);
        card.dataset.index = String(idx);

        // Set portrait/landscape card shape once the image dimensions are known.
        img.onload = () => applyCardOrientation(card, img);
        if (img.complete) {
            applyCardOrientation(card, img);
        }
    }

    const cards = slotOffsets.map(offset => {
        const idx = (currentIndex + offset + len) % len;
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'slideshow-card';
        card.dataset.offset = String(offset);
        if (offset === 0) card.setAttribute('aria-current', 'true');
        card.innerHTML = `
            <img src="" alt="" class="slideshow-image" loading="lazy" decoding="async" fetchpriority="low" />
            <div class="slideshow-card-frame" aria-hidden="true"></div>
        `;
        setCardContent(card, idx);
        return card;
    });

    function shiftOnce(dir, updateHeroNow = true) {
        if (len <= 1) return;
        isAnimating = true;

        currentIndex = (currentIndex + dir + len) % len;
        if (updateHeroNow) updateHero(currentIndex);

        cards.forEach(card => {
            const oldOffset = parseInt(card.dataset.offset || '0', 10);
            let newOffset = oldOffset - dir;
            let wrapped = false;

            if (newOffset < minOffset) {
                newOffset = maxOffset;
                wrapped = true;
            } else if (newOffset > maxOffset) {
                newOffset = minOffset;
                wrapped = true;
            }

            if (wrapped) {
                const idx = (currentIndex + newOffset + len) % len;
                card.classList.add('no-anim');
                card.dataset.offset = String(newOffset);
                setCardContent(card, idx);
                if (newOffset === 0) card.setAttribute('aria-current', 'true');
                else card.removeAttribute('aria-current');
                void card.offsetHeight;
                requestAnimationFrame(() => card.classList.remove('no-anim'));
            } else {
                card.dataset.offset = String(newOffset);
                if (newOffset === 0) card.setAttribute('aria-current', 'true');
                else card.removeAttribute('aria-current');
            }
        });

        const isDraggingNow = slideshowContainer.classList.contains('is-dragging');
        const fastShift = rapidShiftBudget > 0 || Math.abs(pendingSteps) > 1;
        if (rapidShiftBudget > 0) rapidShiftBudget -= 1;

        const durationMs = reduceMotion ? 0 : (isDraggingNow ? 90 : (fastShift ? 140 : 240));
        if (durationMs === 0) {
            isAnimating = false;
            runQueue();
            return;
        }

        setTimeout(() => {
            isAnimating = false;
            runQueue();
        }, durationMs);
    }

    function runQueue() {
        if (isAnimating || pendingSteps === 0) return;
        const dir = pendingSteps > 0 ? 1 : -1;
        pendingSteps -= dir;
        const updateHeroNow = pendingSteps === 0;
        shiftOnce(dir, updateHeroNow);
    }

    function queueShift(steps, options = {}) {
        if (!steps) return;
        if (len <= 1) return;
        if (options.rapid) rapidShiftBudget += Math.min(8, Math.abs(steps));
        pendingSteps += Math.max(-6, Math.min(6, steps));
        runQueue();
    }

    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'slideshow-controls';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'slideshow-btn prev-btn';
    prevBtn.textContent = 'Previous';
    prevBtn.addEventListener('click', () => queueShift(-1));

    const nextBtn = document.createElement('button');
    nextBtn.className = 'slideshow-btn next-btn';
    nextBtn.textContent = 'Next';
    nextBtn.addEventListener('click', () => queueShift(1));

    // Drag to scroll (fast scrub). Uses discrete steps but feels smooth thanks to the carousel transitions.
    (function enableDragScrub() {
        const stepPx = 70; // lower = faster scrolling
        const dragThreshold = 6;
        let armed = false;
        let dragging = false;
        let dragMoved = false;

        let startX = 0;
        let startY = 0;
        let lastSentSteps = 0;
        let lastMoveX = 0;
        let lastMoveT = 0;
        let velocity = 0; // px/ms

        const setDraggingUi = (on) => {
            slideshowContainer.classList.toggle('is-dragging', !!on);
        };

        const onPointerDown = (e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            armed = true;
            dragging = false;
            dragMoved = false;
            startX = e.clientX;
            startY = e.clientY;
            lastMoveX = e.clientX;
            lastMoveT = performance.now();
            lastSentSteps = 0;
            velocity = 0;
            e.preventDefault();
        };

        const onPointerMove = (e) => {
            if (!armed) return;

            const dx0 = e.clientX - startX;
            const dy0 = e.clientY - startY;

            if (!dragging) {
                if (Math.abs(dx0) < dragThreshold && Math.abs(dy0) < dragThreshold) return;
                dragging = true;
                dragMoved = true;
                setDraggingUi(true);
                try { carouselWrapper.setPointerCapture(e.pointerId); } catch (_e) {}
            }

            const now = performance.now();
            const dx = e.clientX - startX;

            const dt = Math.max(1, now - lastMoveT);
            const instV = (e.clientX - lastMoveX) / dt;
            velocity = (velocity * 0.7) + (instV * 0.3);
            lastMoveX = e.clientX;
            lastMoveT = now;

            // Swipe left (dx negative) => next => +steps. Swipe right => prev => -steps.
            const wantedSteps = Math.trunc((-dx) / stepPx);
            const delta = wantedSteps - lastSentSteps;
            if (delta) {
                queueShift(delta, { rapid: true });
                lastSentSteps = wantedSteps;
            }

            e.preventDefault();
        };

        const end = (e) => {
            if (!armed) return;
            armed = false;

            if (!dragging) return;
            dragging = false;
            setDraggingUi(false);
            try { carouselWrapper.releasePointerCapture(e.pointerId); } catch (_e) {}

            if (dragMoved) {
                suppressClickUntil = performance.now() + 260;
            }

            // Flick inertia: convert velocity into 1..3 extra steps.
            const flick = Math.max(-3, Math.min(3, Math.round((-velocity) * 2.2)));
            if (flick) queueShift(flick, { rapid: true });
            velocity = 0;
        };

        carouselWrapper.style.touchAction = 'none';
        carouselWrapper.addEventListener('pointerdown', onPointerDown);
        carouselWrapper.addEventListener('pointermove', onPointerMove);
        carouselWrapper.addEventListener('pointerup', end);
        carouselWrapper.addEventListener('pointercancel', end);
        carouselWrapper.addEventListener('lostpointercapture', end);
    })();

    carouselInner.addEventListener('click', (e) => {
        if (performance.now() < suppressClickUntil) return;
        const card = e.target.closest('.slideshow-card');
        if (!card) return;
        const offset = parseInt(card.dataset.offset || '0', 10);
        if (offset === 0) {
            const gameIndex = Number.parseInt(card.dataset.index || '-1', 10);
            const game = Number.isFinite(gameIndex) && gameIndex >= 0 ? slideshowGames[gameIndex] : null;
            if (game) showGameDetails(game);
            return;
        }
        queueShift(offset, { rapid: Math.abs(offset) > 1 });
    });

    slideshowContainer.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            queueShift(-1);
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            queueShift(1);
        }
    });

    updateHero(currentIndex);

    backdrops.forEach(el => slideshowContainer.appendChild(el));
    cards.forEach(c => carouselInner.appendChild(c));

    carouselWrapper.appendChild(carouselInner);

    const footer = document.createElement('div');
    footer.className = 'slideshow-footer';

    chrome.appendChild(carouselWrapper);
    chrome.appendChild(titleRow);

    footer.appendChild(blurb);

    controlsContainer.appendChild(prevBtn);
    controlsContainer.appendChild(nextBtn);
    footer.appendChild(controlsContainer);

    chrome.appendChild(footer);

    slideshowContainer.appendChild(chrome);
    gamesContainer.appendChild(slideshowContainer);

    slideshowContainer.focus();
}

function renderGamesAsRandom(gamesToRender) {
    const gamesContainer = document.getElementById('games-container');
    const randomContainer = document.createElement('div');
    randomContainer.className = 'random-container random-container--slot';
    const spinGames = buildViewGamePool(gamesToRender, MAX_RANDOM_POOL_SIZE);

    if (!spinGames || spinGames.length === 0) {
        randomContainer.innerHTML = `<div class="slot-empty">No games to spin.</div>`;
        gamesContainer.appendChild(randomContainer);
        return;
    }

    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let selectedIndex = Math.floor(Math.random() * spinGames.length);

    const machine = document.createElement('div');
    machine.className = 'slot-machine';

    const marquee = document.createElement('div');
    marquee.className = 'slot-marquee';
    marquee.innerHTML = `
        <div class="slot-marquee-title">Lucky Shuffle</div>
        <div class="slot-marquee-sub">Pull the lever. Let fate pick your next game.</div>
    `;

    const cabinet = document.createElement('div');
    cabinet.className = 'slot-cabinet';

    const windowEl = document.createElement('div');
    windowEl.className = 'slot-window';

    const reel = document.createElement('div');
    reel.className = 'slot-reel';

    const reelInner = document.createElement('div');
    reelInner.className = 'slot-reel-inner';

    const payline = document.createElement('div');
    payline.className = 'slot-payline';
    payline.setAttribute('aria-hidden', 'true');

    const controls = document.createElement('div');
    controls.className = 'slot-controls';

    const leverBtn = document.createElement('button');
    leverBtn.type = 'button';
    leverBtn.className = 'action-btn slot-lever';
    leverBtn.textContent = 'PULL';

    const result = document.createElement('div');
    result.className = 'slot-result glass';

    const resultTitle = document.createElement('div');
    resultTitle.className = 'slot-result-title';

    const resultMeta = document.createElement('div');
    resultMeta.className = 'slot-result-meta';

    result.appendChild(resultTitle);
    result.appendChild(resultMeta);
    result.classList.add('slot-result-clickable');
    result.tabIndex = 0;
    result.setAttribute('role', 'button');
    result.setAttribute('aria-label', 'Open selected game details');

    controls.appendChild(leverBtn);

    reel.appendChild(reelInner);
    windowEl.appendChild(reel);
    windowEl.appendChild(payline);
    cabinet.appendChild(windowEl);

    const stage = document.createElement('div');
    stage.className = 'slot-stage';
    stage.appendChild(cabinet);
    stage.appendChild(controls);

    machine.appendChild(marquee);
    machine.appendChild(stage);
    machine.appendChild(result);

    randomContainer.appendChild(machine);
    gamesContainer.appendChild(randomContainer);

    function getGameImage(game) {
        let gameImageToUse = game && game.image;
        if (!gameImageToUse && game && game.platformShortName) {
            const platformShortName = game.platformShortName.toLowerCase();
            gameImageToUse = `emubro-resources/platforms/${platformShortName}/covers/default.jpg`;
        }
        return gameImageToUse;
    }

    function setResult(idx) {
        const game = spinGames[idx];
        const platformName = game.platform || game.platformShortName || i18n.t('gameDetails.unknown');
        const ratingText = (game.rating !== undefined && game.rating !== null) ? `${game.rating}` : i18n.t('gameDetails.unknown');

        resultTitle.textContent = game.name;
        resultMeta.innerHTML = `
            <span class="slot-meta-pill">${platformName}</span>
            <span class="slot-meta-pill">Rating: ${ratingText}</span>
        `;
    }

    const baseLen = spinGames.length;
    const targetReelItems = 96;
    const repeatBlocks = Math.max(3, Math.ceil(targetReelItems / Math.max(1, baseLen)));
    const reelIndexToGameIndex = [];
    for (let b = 0; b < repeatBlocks; b++) {
        for (let i = 0; i < baseLen; i++) {
            reelIndexToGameIndex.push(i);
        }
    }

    reelIndexToGameIndex.forEach((gameIdx) => {
        const game = spinGames[gameIdx];
        const safeName = escapeHtml(game?.name || '');
        const safeImage = escapeHtml(getGameImage(game) || '');
        const item = document.createElement('div');
        item.className = 'slot-item';
        item.innerHTML = `
            <img class="slot-item-image lazy-game-image is-pending" src="${LAZY_PLACEHOLDER_SRC}" data-lazy-src="${safeImage}" alt="${safeName}" loading="lazy" decoding="async" fetchpriority="low" />
            <div class="slot-item-caption">${safeName}</div>
        `;
        reelInner.appendChild(item);
    });

    let metricsReady = false;
    let itemStep = 0;
    let totalHeight = 0;
    let alignOffset = 0;

    let absPos = 0;
    let rafId = null;
    let spinning = false;

    function measure() {
        const first = reelInner.querySelector('.slot-item');
        if (!first) return;
        const rect = first.getBoundingClientRect();
        const cs = window.getComputedStyle(first);
        const mb = parseFloat(cs.marginBottom || '0') || 0;
        itemStep = rect.height + mb;
        totalHeight = itemStep * reelIndexToGameIndex.length;
        const winRect = windowEl.getBoundingClientRect();
        alignOffset = (winRect.height - rect.height) / 2;
        metricsReady = itemStep > 0 && totalHeight > 0;
    }

    function renderPos() {
        if (!metricsReady) return;
        const mod = ((absPos % totalHeight) + totalHeight) % totalHeight;
        reelInner.style.transform = `translate3d(0, ${-mod}px, 0)`;
    }

    function snapToGameIndex(gameIdx) {
        if (!metricsReady) return;
        const block = Math.floor((reelIndexToGameIndex.length / baseLen) / 2);
        const reelIdx = gameIdx + block * baseLen;
        const desired = (reelIdx * itemStep) - alignOffset;
        const desiredMod = ((desired % totalHeight) + totalHeight) % totalHeight;
        absPos = desiredMod;
        renderPos();
    }

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function animateTo(targetAbsPos, durationMs, onDone) {
        const start = performance.now();
        const startPos = absPos;
        const delta = targetAbsPos - startPos;

        function step(ts) {
            const t = Math.min(1, (ts - start) / durationMs);
            const e = easeOutCubic(t);
            absPos = startPos + delta * e;
            renderPos();
            if (t < 1) {
                rafId = requestAnimationFrame(step);
            } else {
                absPos = targetAbsPos;
                renderPos();
                if (typeof onDone === 'function') onDone();
            }
        }

        rafId = requestAnimationFrame(step);
    }

    function stopSpinTo(gameIdx) {
        if (!metricsReady) return;

        const currentMod = ((absPos % totalHeight) + totalHeight) % totalHeight;
        const currentBlock = Math.floor(absPos / (itemStep * baseLen));

        let bestDelta = Infinity;
        for (let b = currentBlock + 1; b <= currentBlock + 8; b++) {
            const reelIdx = gameIdx + b * baseLen;
            const desired = (reelIdx * itemStep) - alignOffset;
            const desiredMod = ((desired % totalHeight) + totalHeight) % totalHeight;
            let delta = desiredMod - currentMod;
            if (delta < 0) delta += totalHeight;
            delta += totalHeight * 2;
            if (delta < bestDelta) bestDelta = delta;
        }

        const target = absPos + bestDelta;
        const duration = reduceMotion ? 0 : 900;

        machine.classList.remove('is-spinning');
        machine.classList.add('is-stopping');
        animateTo(target, duration, () => {
            spinning = false;
            machine.classList.remove('is-stopping');
            leverBtn.disabled = false;
            leverBtn.textContent = 'SPIN';
            setResult(gameIdx);
        });
    }

    function startSpin() {
        if (spinning) return;
        spinning = true;
        leverBtn.disabled = true;
        leverBtn.textContent = 'SPINNING...';
        machine.classList.add('is-spinning');

        if (!metricsReady) measure();
        if (!metricsReady) {
            setTimeout(() => {
                measure();
                startSpin();
            }, 50);
            return;
        }

        if (reduceMotion) {
            selectedIndex = Math.floor(Math.random() * spinGames.length);
            stopSpinTo(selectedIndex);
            return;
        }

        const speed = 2400;
        const spinMs = 1100 + Math.floor(Math.random() * 700);
        const startTs = performance.now();
        let lastTs = startTs;

        function tick(ts) {
            const dt = Math.min(0.05, (ts - lastTs) / 1000);
            lastTs = ts;
            absPos += speed * dt;
            renderPos();

            if (ts - startTs < spinMs) {
                rafId = requestAnimationFrame(tick);
            } else {
                selectedIndex = Math.floor(Math.random() * spinGames.length);
                stopSpinTo(selectedIndex);
            }
        }

        rafId = requestAnimationFrame(tick);
    }

    leverBtn.addEventListener('click', startSpin);
    result.addEventListener('click', () => {
        const game = spinGames[selectedIndex];
        if (game) showGameDetails(game);
    });
    result.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            const game = spinGames[selectedIndex];
            if (game) showGameDetails(game);
        }
    });

    const onWindowResize = () => {
        if (!randomContainer.isConnected) {
            window.removeEventListener('resize', onWindowResize);
            return;
        }

        requestAnimationFrame(() => {
            const wasReady = metricsReady;
            measure();
            if (!metricsReady) return;

            // Keep the current reel animation smooth while spinning.
            if (spinning) {
                if (wasReady) renderPos();
                return;
            }

            // Re-center selected game with new dimensions.
            snapToGameIndex(selectedIndex);
        });
    };
    window.addEventListener('resize', onWindowResize);

    requestAnimationFrame(() => {
        measure();
        snapToGameIndex(selectedIndex);
        setResult(selectedIndex);
    });
}

function getEmulatorInfoPinIconMarkup() {
    return `
        <span class="icon-svg" aria-hidden="true">
            <svg viewBox="0 0 24 24">
                <path d="M8.5 4h7l-1.5 4.8v3.1l1.4 1.5h-6.8l1.4-1.5V8.8L8.5 4Z"></path>
                <path d="M12 13.4V20"></path>
            </svg>
        </span>
    `;
}

function setEmulatorInfoPinnedStorage(pinned) {
    emulatorInfoPopupPinned = !!pinned;
    localStorage.setItem(EMULATOR_INFO_PIN_STORAGE_KEY, emulatorInfoPopupPinned ? 'true' : 'false');
}

function applyEmulatorInfoPinnedState() {
    if (!emulatorInfoPopup) return;
    const pinBtn = emulatorInfoPopup.querySelector('#pin-emulator-info');
    const isDocked = emulatorInfoPopup.classList.contains('docked-right');
    const pinned = !!(isDocked || emulatorInfoPopupPinned);
    emulatorInfoPopup.classList.toggle('is-pinned', pinned);
    if (pinBtn) {
        pinBtn.classList.toggle('active', pinned);
        pinBtn.innerHTML = getEmulatorInfoPinIconMarkup();
        pinBtn.title = pinned ? 'Unpin' : 'Pin';
        pinBtn.setAttribute('aria-label', pinned ? 'Unpin emulator details window' : 'Pin emulator details window');
    }
}

function ensureEmulatorInfoPopup() {
    if (emulatorInfoPopup && emulatorInfoPopup.isConnected) return emulatorInfoPopup;

    emulatorInfoPopup = document.getElementById('emulator-info-modal');
    if (!emulatorInfoPopup) return null;
    if (emulatorInfoPopup.dataset.initialized === '1') return emulatorInfoPopup;

    const closeBtn = emulatorInfoPopup.querySelector('#close-emulator-info');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            emulatorInfoPopup.style.display = 'none';
            emulatorInfoPopup.classList.remove('active');
            if (emulatorInfoPopup.classList.contains('docked-right')) {
                import('./docking-manager').then((m) => m.completelyRemoveFromDock('emulator-info-modal'));
            } else {
                import('./docking-manager').then((m) => m.removeFromDock('emulator-info-modal'));
            }
            setEmulatorInfoPinnedStorage(false);
            applyEmulatorInfoPinnedState();
        });
    }

    const pinBtn = emulatorInfoPopup.querySelector('#pin-emulator-info');
    if (pinBtn) {
        pinBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            const shouldPin = !emulatorInfoPopup.classList.contains('docked-right');
            import('./docking-manager').then((m) => {
                m.toggleDock('emulator-info-modal', 'pin-emulator-info', shouldPin);
                setEmulatorInfoPinnedStorage(shouldPin);
                applyEmulatorInfoPinnedState();
            });
        });
    }

    import('./theme-manager').then((m) => m.makeDraggable('emulator-info-modal', 'emulator-info-header'));
    emulatorInfoPopup.dataset.initialized = '1';
    applyEmulatorInfoPinnedState();
    return emulatorInfoPopup;
}

function getLatestEmulatorRecord(target) {
    const key = getEmulatorKey(target);
    return emulators.find((row) => getEmulatorKey(row) === key) || target;
}

function renderEmulatorDetailsMarkup(container, emulator) {
    if (!container || !emulator) return;
    const shortName = String(emulator.platformShortName || 'unknown').toLowerCase();
    const platformIcon = `emubro-resources/platforms/${shortName}/logos/default.png`;
    const safeName = escapeHtml(emulator.name || 'Unknown Emulator');
    const safePlatform = escapeHtml(emulator.platform || emulator.platformShortName || i18n.t('gameDetails.unknown'));
    const installed = !!emulator.isInstalled;
    const statusClass = installed ? 'is-installed' : 'is-missing';
    const statusText = installed ? 'Installed' : 'Not Installed';
    const safePath = escapeHtml(installed ? (emulator.filePath || '') : 'Not installed yet');
    const links = normalizeEmulatorDownloadLinks(emulator?.downloadLinks);
    const winDisabled = links.windows ? '' : 'disabled';
    const linuxDisabled = links.linux ? '' : 'disabled';
    const macDisabled = links.mac ? '' : 'disabled';
    const canDownload = hasAnyDownloadLink(emulator);
    const downloadDisabled = canDownload ? '' : 'disabled';
    const launchDisabled = installed ? '' : 'disabled';
    const explorerDisabled = installed ? '' : 'disabled';

    container.innerHTML = `
        <div class="emulator-details-info">
            <div class="emulator-detail-media">
                <img src="${escapeHtml(platformIcon)}" alt="${safePlatform}" class="emulator-detail-icon" loading="lazy" onerror="this.style.display='none'" />
            </div>
            <div class="emulator-detail-meta">
                <p><strong>Name:</strong> ${safeName}</p>
                <p><strong>Platform:</strong> ${safePlatform}</p>
                <p><strong>Status:</strong> <span class="emulator-install-status ${statusClass}">${statusText}</span></p>
                <p><strong>Path:</strong> <span class="emulator-detail-path">${safePath}</span></p>
            </div>
            <div class="emulator-detail-download-links">
                <button class="emulator-os-link" type="button" data-emu-download-os="windows" ${winDisabled}>Windows</button>
                <button class="emulator-os-link" type="button" data-emu-download-os="linux" ${linuxDisabled}>Linux</button>
                <button class="emulator-os-link" type="button" data-emu-download-os="mac" ${macDisabled}>Mac</button>
            </div>
            <div class="emulator-detail-actions">
                <button class="action-btn" data-emu-popup-action="download" ${downloadDisabled}>Download</button>
                <button class="action-btn launch-btn" data-emu-popup-action="launch" ${launchDisabled}>Launch</button>
                <button class="action-btn" data-emu-popup-action="explorer" ${explorerDisabled}>Explorer</button>
                <button class="action-btn" data-emu-popup-action="website">Website</button>
                <button class="action-btn" data-emu-popup-action="edit">Edit</button>
            </div>
        </div>
    `;
}

function bindEmulatorDetailsActions(container, emulator, options = {}) {
    if (!container || !emulator) return;

    const refreshAfterChange = async () => {
        await fetchEmulators();
        if (typeof options.onRefresh === 'function') options.onRefresh();
        const latest = getLatestEmulatorRecord(emulator);
        showEmulatorDetails(latest, options);
    };

    const actionButtons = container.querySelectorAll('[data-emu-popup-action]');
    actionButtons.forEach((button) => {
        button.addEventListener('click', async () => {
            const action = String(button.dataset.emuPopupAction || '').trim();
            if (!action) return;
            const originalLabel = button.textContent;
            const isBusyAction = action === 'download';
            if (isBusyAction) {
                button.disabled = true;
                button.textContent = 'Downloading...';
            }
            try {
                if (action === 'download') {
                    const changed = await downloadAndInstallEmulatorAction(emulator);
                    if (changed) await refreshAfterChange();
                    return;
                }
                if (action === 'launch') {
                    await launchEmulatorAction(emulator);
                    return;
                }
                if (action === 'explorer') {
                    await openEmulatorInExplorerAction(emulator);
                    return;
                }
                if (action === 'website') {
                    await openEmulatorWebsiteAction(emulator);
                    return;
                }
                if (action === 'edit') {
                    const changed = await openEmulatorConfigEditor(emulator);
                    if (changed) await refreshAfterChange();
                }
            } finally {
                if (isBusyAction) {
                    button.textContent = originalLabel;
                    button.disabled = false;
                }
            }
        });
    });

    container.querySelectorAll('[data-emu-download-os]').forEach((button) => {
        button.addEventListener('click', async () => {
            const osKey = String(button.dataset.emuDownloadOs || '').trim().toLowerCase();
            await openEmulatorDownloadLinkAction(emulator, osKey);
        });
    });
}

function showEmulatorDetails(emulator, options = {}) {
    if (!emulator) return;
    const popup = ensureEmulatorInfoPopup();
    if (!popup) return;

    const popupTitle = popup.querySelector('#emulator-info-popup-title');
    const popupBody = popup.querySelector('#emulator-info-popup-body');
    if (popupTitle) popupTitle.textContent = emulator.name || 'Emulator Details';
    renderEmulatorDetailsMarkup(popupBody, emulator);
    bindEmulatorDetailsActions(popupBody, emulator, options);

    if (emulatorInfoPopupPinned || popup.classList.contains('docked-right')) {
        import('./docking-manager').then((m) => m.toggleDock('emulator-info-modal', 'pin-emulator-info', true));
        setEmulatorInfoPinnedStorage(true);
    } else {
        const hasManualPosition = !!(popup.style.left || popup.style.top || popup.classList.contains('moved'));
        popup.classList.toggle('moved', hasManualPosition);
        popup.style.display = 'flex';
        popup.classList.add('active');
    }
    applyEmulatorInfoPinnedState();
}

function getGameInfoPinIconMarkup() {
    return `
        <span class="icon-svg" aria-hidden="true">
            <svg viewBox="0 0 24 24">
                <path d="M8.5 4h7l-1.5 4.8v3.1l1.4 1.5h-6.8l1.4-1.5V8.8L8.5 4Z"></path>
                <path d="M12 13.4V20"></path>
            </svg>
        </span>
    `;
}

function setGameInfoPinnedStorage(pinned) {
    gameInfoPopupPinned = !!pinned;
    localStorage.setItem(GAME_INFO_PIN_STORAGE_KEY, gameInfoPopupPinned ? 'true' : 'false');
}

function applyGameInfoPinnedState() {
    if (!gameInfoPopup) return;
    const pinBtn = gameInfoPopup.querySelector('#pin-game-info');
    const isDocked = gameInfoPopup.classList.contains('docked-right');
    const pinned = !!(isDocked || gameInfoPopupPinned);
    gameInfoPopup.classList.toggle('is-pinned', pinned);
    if (pinBtn) {
        pinBtn.classList.toggle('active', pinned);
        pinBtn.innerHTML = getGameInfoPinIconMarkup();
        pinBtn.title = pinned ? 'Unpin' : 'Pin';
        pinBtn.setAttribute('aria-label', pinned ? 'Unpin details window' : 'Pin details window');
    }
}

function ensureGameInfoPopup() {
    if (gameInfoPopup && gameInfoPopup.isConnected) return gameInfoPopup;

    gameInfoPopup = document.getElementById('game-info-modal');
    if (!gameInfoPopup) return null;
    if (gameInfoPopup.dataset.initialized === '1') return gameInfoPopup;

    const closeBtn = gameInfoPopup.querySelector('#close-game-info');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            gameInfoPopup.style.display = 'none';
            gameInfoPopup.classList.remove('active');
            if (gameInfoPopup.classList.contains('docked-right')) {
                import('./docking-manager').then((m) => m.completelyRemoveFromDock('game-info-modal'));
            } else {
                import('./docking-manager').then((m) => m.removeFromDock('game-info-modal'));
            }
            setGameInfoPinnedStorage(false);
            applyGameInfoPinnedState();
        });
    }

    const pinBtn = gameInfoPopup.querySelector('#pin-game-info');
    if (pinBtn) {
        pinBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            const shouldPin = !gameInfoPopup.classList.contains('docked-right');
            import('./docking-manager').then((m) => {
                m.toggleDock('game-info-modal', 'pin-game-info', shouldPin);
                setGameInfoPinnedStorage(shouldPin);
                applyGameInfoPinnedState();
            });
        });
    }

    import('./theme-manager').then((m) => m.makeDraggable('game-info-modal', 'game-info-header'));
    gameInfoPopup.dataset.initialized = '1';
    applyGameInfoPinnedState();
    return gameInfoPopup;
}

function bindCreateShortcutAction(button, game) {
    if (!button || !window.emubro || typeof window.emubro.createGameShortcut !== 'function') return;
    button.addEventListener('click', async (e) => {
        e.preventDefault();
        button.disabled = true;
        try {
            const res = await window.emubro.createGameShortcut(game.id);
            if (res && res.success) {
                alert(`Shortcut created:\n${res.path}`);
            } else {
                alert(`Failed to create shortcut: ${res?.message || 'Unknown error'}`);
            }
        } catch (err) {
            alert(`Failed to create shortcut: ${err?.message || err}`);
        } finally {
            button.disabled = false;
        }
    });
}

async function ensurePopupEmulatorsLoaded() {
    if (Array.isArray(emulators) && emulators.length > 0) return emulators;
    try {
        await fetchEmulators();
    } catch (_error) {}
    return Array.isArray(emulators) ? emulators : [];
}

async function getGameInfoPlatforms() {
    if (Array.isArray(gameInfoPlatformsCache) && gameInfoPlatformsCache.length > 0) {
        return gameInfoPlatformsCache;
    }
    try {
        const rows = await emubro.invoke('get-platforms');
        gameInfoPlatformsCache = Array.isArray(rows) ? rows : [];
    } catch (_error) {
        gameInfoPlatformsCache = [];
    }
    return gameInfoPlatformsCache;
}

function isKnownGamePlatform(game, platforms) {
    const current = String(game?.platformShortName || '').trim().toLowerCase();
    if (!current) return false;
    const rows = Array.isArray(platforms) ? platforms : [];
    return rows.some((platform) => String(platform?.shortName || '').trim().toLowerCase() === current);
}

async function bindShowInExplorerAction(button, game) {
    if (!button || !game) return;
    button.addEventListener('click', async () => {
        const filePath = String(game.filePath || '').trim();
        if (!filePath) {
            alert('Game file path is missing.');
            return;
        }
        const result = await emubro.invoke('show-item-in-folder', filePath);
        if (!result?.success) {
            alert(result?.message || 'Failed to open file location.');
        }
    });
}

async function bindEmulatorOverrideAction(select, game) {
    if (!select || !game) return;

    const rows = await ensurePopupEmulatorsLoaded();
    const installedEmulators = rows
        .filter((emu) => !!emu?.isInstalled && String(emu?.filePath || '').trim().length > 0)
        .sort((a, b) => {
            const p = String(a.platform || a.platformShortName || '').localeCompare(String(b.platform || b.platformShortName || ''));
            if (p !== 0) return p;
            return String(a.name || '').localeCompare(String(b.name || ''));
        });

    const currentOverride = String(game.emulatorOverridePath || '').trim();
    const defaultLabel = `Default (${game.platform || game.platformShortName || 'platform emulator'})`;
    let options = `<option value="">${escapeHtml(defaultLabel)}</option>`;

    options += installedEmulators.map((emu) => {
        const emuPath = String(emu.filePath || '').trim();
        const emuName = String(emu.name || 'Emulator').trim();
        const emuPlatform = String(emu.platformShortName || emu.platform || '').trim();
        const label = emuPlatform ? `${emuName} (${emuPlatform})` : emuName;
        const selected = currentOverride && emuPath.toLowerCase() === currentOverride.toLowerCase() ? ' selected' : '';
        return `<option value="${escapeHtml(emuPath)}"${selected}>${escapeHtml(label)}</option>`;
    }).join('');

    select.innerHTML = options;

    select.addEventListener('change', async () => {
        const nextOverridePath = String(select.value || '').trim();
        const payload = {
            gameId: game.id,
            emulatorOverridePath: nextOverridePath || null
        };
        const result = await emubro.invoke('update-game-metadata', payload);
        if (!result?.success) {
            alert(result?.message || 'Failed to save emulator override.');
            return;
        }
        game.emulatorOverridePath = nextOverridePath || null;
    });
}

async function bindChangePlatformAction(select, button, game) {
    if (!select || !button || !game) return;

    const platforms = await getGameInfoPlatforms();
    const platformOptions = [...platforms]
        .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')))
        .map((platform) => {
            const shortName = String(platform?.shortName || '').trim().toLowerCase();
            const name = String(platform?.name || shortName || 'Unknown').trim();
            if (!shortName) return '';
            const selected = shortName === String(game.platformShortName || '').trim().toLowerCase() ? ' selected' : '';
            return `<option value="${escapeHtml(shortName)}"${selected}>${escapeHtml(name)} (${escapeHtml(shortName)})</option>`;
        })
        .filter(Boolean)
        .join('');

    select.innerHTML = platformOptions || `<option value="">No platforms found</option>`;

    button.addEventListener('click', async () => {
        const nextPlatformShortName = String(select.value || '').trim().toLowerCase();
        const currentPlatformShortName = String(game.platformShortName || '').trim().toLowerCase();
        if (!nextPlatformShortName || nextPlatformShortName === currentPlatformShortName) return;

        if (isKnownGamePlatform(game, platforms)) {
            const proceed = window.confirm('This game already has a recognized platform. Changing it can break emulator matching and metadata. Continue?');
            if (!proceed) return;
        }

        button.disabled = true;
        try {
            const result = await emubro.invoke('update-game-metadata', {
                gameId: game.id,
                platformShortName: nextPlatformShortName
            });
            if (!result?.success) {
                alert(result?.message || 'Failed to change platform.');
                return;
            }

            await reloadGamesFromMainAndRender();
            const refreshedGame = getGames().find((row) => Number(row.id) === Number(game.id));
            if (refreshedGame) {
                showGameDetails(refreshedGame);
            }
        } finally {
            button.disabled = false;
        }
    });
}

function stripBracketedTitleParts(value) {
    let text = String(value || '');
    if (!text) return '';

    // Remove bracketed suffixes like "(USA)", "[v1.1]" or "{Prototype}".
    let previous = '';
    while (previous !== text) {
        previous = text;
        text = text.replace(/\s*[\(\[\{][^()\[\]{}]*[\)\]\}]\s*/g, ' ');
    }
    return text.replace(/\s+/g, ' ').trim();
}

function buildYouTubeSearchQuery(game) {
    const platformShort = String(game?.platformShortName || game?.platform || '').trim();
    const cleanName = stripBracketedTitleParts(game?.name || '');
    return [platformShort, cleanName].filter(Boolean).join(' ').trim();
}

function setYouTubePreviewResult(previewRoot, state) {
    if (!previewRoot || !state) return;

    const titleEl = previewRoot.querySelector('[data-youtube-video-title]');
    const subtitleEl = previewRoot.querySelector('[data-youtube-video-subtitle]');
    const linkEl = previewRoot.querySelector('[data-youtube-video-link]');
    const thumbEl = previewRoot.querySelector('[data-youtube-video-thumb]');
    const countEl = previewRoot.querySelector('[data-youtube-result-count]');
    const copyButtons = [...previewRoot.querySelectorAll('[data-youtube-copy-link]')];
    const nextBtn = previewRoot.querySelector('[data-youtube-next]');
    const searchBtn = previewRoot.querySelector('[data-youtube-open-search]');
    const statusEl = previewRoot.querySelector('[data-youtube-status]');
    const queryEl = previewRoot.querySelector('[data-youtube-query]');
    const loadingEl = previewRoot.querySelector('[data-youtube-loading]');

    const hasResults = Array.isArray(state.results) && state.results.length > 0;
    const current = hasResults ? state.results[state.index] : null;

    if (queryEl) queryEl.textContent = state.query || '';
    if (loadingEl) loadingEl.classList.toggle('is-visible', !!state.loading);
    if (countEl) countEl.textContent = hasResults ? `Result ${state.index + 1} / ${state.results.length}` : 'Result 0 / 0';

    if (statusEl) {
        if (state.loading) {
            statusEl.textContent = 'Searching YouTube...';
        } else if (!hasResults) {
            statusEl.textContent = 'No preview result found.';
        } else {
            statusEl.textContent = '';
        }
    }

    if (!current) {
        if (titleEl) titleEl.textContent = 'No video result';
        if (subtitleEl) subtitleEl.textContent = '';
        if (linkEl) linkEl.removeAttribute('href');
        if (thumbEl) {
            thumbEl.removeAttribute('src');
            thumbEl.alt = 'No preview available';
        }
        copyButtons.forEach((btn) => { btn.disabled = true; });
        if (nextBtn) nextBtn.disabled = true;
        if (searchBtn) searchBtn.disabled = !state.searchUrl;
        return;
    }

    if (titleEl) titleEl.textContent = current.title || 'YouTube Result';
    if (subtitleEl) subtitleEl.textContent = current.channel ? `by ${current.channel}` : '';
    if (linkEl) linkEl.href = current.url || state.searchUrl || '#';
    if (thumbEl) {
        thumbEl.src = current.thumbnail || '';
        thumbEl.alt = current.title || 'YouTube preview thumbnail';
    }
    copyButtons.forEach((btn) => { btn.disabled = !current.url; });
    if (nextBtn) nextBtn.disabled = state.results.length <= 1;
    if (searchBtn) searchBtn.disabled = !state.searchUrl;
}

function bindYouTubePreviewAction(button, container, game) {
    if (!button || !container || !game) return;

    const previewRoot = container.querySelector('[data-game-youtube-preview]');
    if (!previewRoot) return;

    const nextBtn = previewRoot.querySelector('[data-youtube-next]');
    const searchBtn = previewRoot.querySelector('[data-youtube-open-search]');
    const copyButtons = [...previewRoot.querySelectorAll('[data-youtube-copy-link]')];
    const mainLink = previewRoot.querySelector('[data-youtube-video-link]');
    const query = buildYouTubeSearchQuery(game);
    const state = {
        loading: false,
        loaded: false,
        query,
        searchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
        index: 0,
        results: []
    };

    const refresh = () => setYouTubePreviewResult(previewRoot, state);
    refresh();

    const loadResults = async () => {
        if (state.loading) return;
        state.loading = true;
        refresh();
        try {
            const result = await emubro.invoke('youtube:search-videos', { query: state.query, limit: 8 });
            if (!result?.success) {
                throw new Error(result?.message || 'Failed to fetch YouTube results');
            }
            state.results = Array.isArray(result.results) ? result.results : [];
            state.searchUrl = String(result.searchUrl || state.searchUrl || '').trim() || state.searchUrl;
            state.index = 0;
            state.loaded = true;
        } catch (error) {
            state.results = [];
            state.loaded = true;
            const message = String(error?.message || error || 'Failed to fetch YouTube results');
            const statusEl = previewRoot.querySelector('[data-youtube-status]');
            if (statusEl) statusEl.textContent = message;
        } finally {
            state.loading = false;
            refresh();
        }
    };

    button.addEventListener('click', async () => {
        previewRoot.classList.add('is-open');
        if (!state.loaded) {
            await loadResults();
            return;
        }
        refresh();
    });

    if (nextBtn) {
        nextBtn.addEventListener('click', async () => {
            if (!state.loaded) {
                await loadResults();
                return;
            }
            if (!state.results.length) return;
            state.index = (state.index + 1) % state.results.length;
            refresh();
        });
    }

    if (searchBtn) {
        searchBtn.addEventListener('click', async () => {
            const target = state.searchUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(state.query)}`;
            await emubro.invoke('open-external-url', target);
        });
    }

    if (mainLink) {
        mainLink.addEventListener('click', async (event) => {
            event.preventDefault();
            const current = state.results[state.index];
            const target = String(current?.url || state.searchUrl || '').trim();
            if (!target) return;
            await emubro.invoke('open-external-url', target);
        });
    }

    copyButtons.forEach((copyBtn) => {
        copyBtn.addEventListener('click', async () => {
            const current = state.results[state.index];
            const url = String(current?.url || '').trim();
            if (!url) return;
            const oldLabel = copyBtn.textContent;
            try {
                if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(url);
                } else {
                    const helper = document.createElement('textarea');
                    helper.value = url;
                    helper.setAttribute('readonly', '');
                    helper.style.position = 'fixed';
                    helper.style.opacity = '0';
                    document.body.appendChild(helper);
                    helper.select();
                    document.execCommand('copy');
                    helper.remove();
                }
                copyBtn.textContent = 'Link Copied';
                setTimeout(() => {
                    copyBtn.textContent = oldLabel;
                }, 1200);
            } catch (_error) {
                alert('Failed to copy link.');
            }
        });
    });
}

function bindGameDetailsActions(container, game) {
    bindCreateShortcutAction(container.querySelector('[data-create-shortcut]'), game);
    bindShowInExplorerAction(container.querySelector('[data-show-in-explorer]'), game);
    bindEmulatorOverrideAction(container.querySelector('[data-game-emulator-override]'), game);
    bindChangePlatformAction(
        container.querySelector('[data-game-platform-select]'),
        container.querySelector('[data-change-platform]'),
        game
    );
    bindYouTubePreviewAction(container.querySelector('[data-youtube-preview]'), container, game);
}

function renderGameDetailsMarkup(container, game) {
    if (!container || !game) return;
    const safeName = escapeHtml(game.name || 'Unknown Game');
    const platformText = escapeHtml(game.platform || game.platformShortName || i18n.t('gameDetails.unknown'));
    const ratingText = escapeHtml(game.rating !== undefined && game.rating !== null ? String(game.rating) : i18n.t('gameDetails.unknown'));
    const genreText = escapeHtml(game.genre || i18n.t('gameDetails.unknown'));
    const priceText = escapeHtml(game.price > 0 ? `$${Number(game.price).toFixed(2)}` : (i18n.t('gameDetails.free') || 'Free'));
    const platformLabel = escapeHtml(i18n.t('gameDetails.platform') || 'Platform');
    const ratingLabel = escapeHtml(i18n.t('gameDetails.rating') || 'Rating');
    const genreLabel = escapeHtml(i18n.t('gameDetails.genre') || 'Genre');
    const priceLabel = escapeHtml(i18n.t('gameDetails.price') || 'Price');

    container.innerHTML = `
        <div class="game-detail-row game-detail-media">
            <img src="${LAZY_PLACEHOLDER_SRC}" data-lazy-src="${escapeHtml(getGameImagePath(game))}" alt="${safeName}" class="detail-game-image lazy-game-image is-pending" loading="lazy" decoding="async" fetchpriority="low" />
        </div>
        <div class="game-detail-row game-detail-meta">
            <p><strong>${platformLabel}:</strong> ${platformText}</p>
            <p><strong>${ratingLabel}:</strong> ${ratingText}</p>
            <p><strong>${genreLabel}:</strong> ${genreText}</p>
            <p><strong>${priceLabel}:</strong> ${priceText}</p>
        </div>
        <div class="game-detail-row game-detail-emulator-control">
            <label for="game-emulator-override-${Number(game.id)}">Emulator</label>
            <select id="game-emulator-override-${Number(game.id)}" data-game-emulator-override>
                <option value="">Loading emulators...</option>
            </select>
        </div>
        <div class="game-detail-row game-detail-platform-control">
            <label for="game-platform-select-${Number(game.id)}">Platform</label>
            <div class="game-detail-platform-inline">
                <select id="game-platform-select-${Number(game.id)}" data-game-platform-select>
                    <option value="">Loading platforms...</option>
                </select>
                <button class="action-btn" data-change-platform>Change Platform</button>
            </div>
        </div>
        <div class="game-detail-row game-detail-actions">
            <button class="action-btn" data-create-shortcut>Create Desktop Shortcut</button>
            <button class="action-btn" data-show-in-explorer>Show in Explorer</button>
            <button class="action-btn youtube-preview-btn" data-youtube-preview>
                <span class="youtube-preview-btn-icon" aria-hidden="true"></span>
                <span>YouTube Preview</span>
            </button>
        </div>
        <div class="game-detail-row game-detail-youtube-preview" data-game-youtube-preview>
            <div class="game-youtube-preview-header">
                <h4>Video Preview</h4>
                <div class="game-youtube-preview-header-right">
                    <span class="game-youtube-preview-query" data-youtube-query></span>
                    <button class="action-btn small" type="button" data-youtube-copy-link>Copy Link</button>
                </div>
            </div>
            <a class="game-youtube-preview-media" href="#" data-youtube-video-link>
                <img class="game-youtube-preview-thumb" data-youtube-video-thumb alt="YouTube preview" />
                <span class="game-youtube-preview-overlay">
                    <span class="game-youtube-preview-title" data-youtube-video-title>Waiting for result...</span>
                    <span class="game-youtube-preview-subtitle" data-youtube-video-subtitle></span>
                </span>
                <span class="game-youtube-preview-play" aria-hidden="true"></span>
            </a>
            <div class="game-youtube-preview-toolbar">
                <button class="action-btn small" type="button" data-youtube-next>Try Next Result</button>
                <button class="action-btn small" type="button" data-youtube-open-search>Open Search on YouTube</button>
                <span class="game-youtube-preview-result-count" data-youtube-result-count>Result 0 / 0</span>
                <button class="action-btn small" type="button" data-youtube-copy-link>Copy Link</button>
            </div>
            <p class="game-youtube-preview-status" data-youtube-status></p>
            <p class="game-youtube-preview-loading" data-youtube-loading>Loading preview...</p>
            <div class="game-youtube-preview-note">
                YouTube preview results can be temporarily rate-limited. If previews fail, open the search link in browser.
            </div>
        </div>
    `;

    initializeLazyGameImages(container);
    bindGameDetailsActions(container, game);
}

export function showGameDetails(game) {
    if (!game) return;

    const popup = ensureGameInfoPopup();
    if (!popup) return;
    const popupTitle = popup.querySelector('#game-info-popup-title');
    const popupBody = popup.querySelector('#game-info-popup-body');
    if (popupTitle) popupTitle.textContent = game.name || 'Game Details';
    renderGameDetailsMarkup(popupBody, game);

    if (gameInfoPopupPinned || popup.classList.contains('docked-right')) {
        import('./docking-manager').then((m) => m.toggleDock('game-info-modal', 'pin-game-info', true));
        setGameInfoPinnedStorage(true);
    } else {
        const hasManualPosition = !!(popup.style.left || popup.style.top || popup.classList.contains('moved'));
        popup.classList.toggle('moved', hasManualPosition);
        popup.style.display = 'flex';
        popup.classList.add('active');
    }
    applyGameInfoPinnedState();
}


