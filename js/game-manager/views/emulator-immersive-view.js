import { createSlideshowLane } from './slideshow-lane';

const EMULATOR_SLIDESHOW_MODE_STORAGE_KEY = 'emuBro.emulatorSlideshowMode';

function readStoredMode() {
    try {
        const stored = String(localStorage.getItem(EMULATOR_SLIDESHOW_MODE_STORAGE_KEY) || 'flat').trim().toLowerCase();
        return stored === '3d' ? '3d' : 'flat';
    } catch (_error) {
        return 'flat';
    }
}

function writeStoredMode(mode) {
    try {
        localStorage.setItem(EMULATOR_SLIDESHOW_MODE_STORAGE_KEY, mode === '3d' ? '3d' : 'flat');
    } catch (_error) {}
}

function getEmulatorIconSrc(emulator) {
    const shortName = String(emulator?.platformShortName || 'unknown').trim().toLowerCase() || 'unknown';
    return `emubro-resources/platforms/${shortName}/logos/default.png`;
}

function buildEmulatorStatusText(emulator) {
    return emulator?.isInstalled ? 'Installed' : 'Not Installed';
}

function buildLaunchLabel(emulator, i18n) {
    const t = typeof i18n?.t === 'function' ? i18n.t.bind(i18n) : (_key, fallback) => String(fallback || '');
    return emulator?.isInstalled
        ? t('buttons.launch', 'Launch')
        : t('buttons.download', 'Download');
}

function bindQuickAction(button, emulator, deps) {
    if (!(button instanceof HTMLElement) || !emulator) return;
    const launchEmulator = typeof deps.launchEmulator === 'function' ? deps.launchEmulator : null;
    const downloadAndInstallEmulator = typeof deps.downloadAndInstallEmulator === 'function' ? deps.downloadAndInstallEmulator : null;

    button.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (button.disabled) return;
        button.disabled = true;
        button.classList.add('is-busy');
        try {
            if (emulator.isInstalled && launchEmulator) {
                await launchEmulator(emulator);
            } else if (!emulator.isInstalled && downloadAndInstallEmulator) {
                await downloadAndInstallEmulator(emulator);
            }
        } finally {
            button.disabled = false;
            button.classList.remove('is-busy');
        }
    });

    button.addEventListener('pointerdown', (event) => {
        event.stopPropagation();
    });
}

function createEmulatorCardMarkup(emulator, deps) {
    const escapeHtml = deps.escapeHtml || ((value) => String(value ?? ''));
    const safeName = escapeHtml(emulator?.name || 'Unknown Emulator');
    const safePlatform = escapeHtml(emulator?.platform || emulator?.platformShortName || 'Unknown');
    const actionLabel = escapeHtml(buildLaunchLabel(emulator, deps.i18n));
    return `
        <div class="slideshow-item-inner emulator-slideshow-card emulator-card">
            <div class="emulator-slideshow-card-surface">
                <header class="emulator-card-header">
                    <h3 class="emulator-title" title="${safeName}">${safeName}</h3>
                    <span class="emulator-platform-badge" title="${safePlatform}" aria-label="${safePlatform}">
                        <img src="${getEmulatorIconSrc(emulator)}" alt="${safePlatform}" class="emulator-platform-icon" loading="lazy" />
                    </span>
                </header>
                <div class="emulator-slideshow-icon-wrap">
                    <img class="emulator-slideshow-icon" src="${getEmulatorIconSrc(emulator)}" alt="" loading="lazy" />
                </div>
                <div class="emulator-slideshow-status-row">
                    <span class="emulator-install-status ${emulator?.isInstalled ? 'is-installed' : 'is-missing'}">${escapeHtml(buildEmulatorStatusText(emulator))}</span>
                </div>
            </div>
            <button class="emulator-card-hover-action emulator-immersive-action ${emulator?.isInstalled ? 'is-play' : 'is-download'}" type="button" aria-label="${actionLabel}" title="${actionLabel}">
                ${deps.getEmulatorCardHoverIconMarkup ? deps.getEmulatorCardHoverIconMarkup(!!emulator?.isInstalled) : ''}
            </button>
            <div class="slideshow-item-overlay">
                <div class="slideshow-item-title">${safeName}</div>
            </div>
        </div>
    `;
}

export function renderEmulatorsAsSlideshow(emulatorsToRender, options = {}) {
    const gamesContainer = document.getElementById('games-container');
    if (!gamesContainer) return;

    const showEmulatorDetails = typeof options.showEmulatorDetails === 'function' ? options.showEmulatorDetails : () => {};
    const launchEmulator = typeof options.launchEmulator === 'function' ? options.launchEmulator : null;
    const downloadAndInstallEmulator = typeof options.downloadAndInstallEmulator === 'function' ? options.downloadAndInstallEmulator : null;
    const applyPlatformColorBlurToEmulatorCards = typeof options.applyPlatformColorBlurToEmulatorCards === 'function'
        ? options.applyPlatformColorBlurToEmulatorCards
        : () => {};
    const getEmulatorPathMarkup = typeof options.getEmulatorPathMarkup === 'function'
        ? options.getEmulatorPathMarkup
        : () => 'Not installed yet';
    const escapeHtml = typeof options.escapeHtml === 'function' ? options.escapeHtml : (value) => String(value ?? '');
    const i18n = options.i18n;

    const container = document.createElement('div');
    container.className = 'slideshow-container slideshow-deck-layout emulator-slideshow-container';
    container.tabIndex = 0;

    if (!Array.isArray(emulatorsToRender) || emulatorsToRender.length === 0) {
        container.innerHTML = '<div class="slideshow-empty">No emulators to display.</div>';
        gamesContainer.appendChild(container);
        return;
    }

    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let mode = readStoredMode();

    const backdrops = [document.createElement('div'), document.createElement('div')];
    let activeBackdrop = 0;
    let activeBackdropSource = '';
    backdrops.forEach((backdrop, index) => {
        backdrop.className = `slideshow-backdrop emulator-slideshow-backdrop${index === 0 ? ' is-active' : ''}`;
        backdrop.setAttribute('aria-hidden', 'true');
        container.appendChild(backdrop);
    });

    const chrome = document.createElement('div');
    chrome.className = 'slideshow-chrome';

    const controls = document.createElement('div');
    controls.className = 'slideshow-carousel-controls';
    controls.innerHTML = `
        <div class="slideshow-mode-tabs">
            <button type="button" class="slideshow-mode-tab" data-slideshow-mode="flat">Flat</button>
            <button type="button" class="slideshow-mode-tab" data-slideshow-mode="3d">3D</button>
        </div>
    `;

    const carousel = document.createElement('div');
    carousel.className = 'slideshow-carousel emulator-slideshow-carousel';
    const track = document.createElement('div');
    track.className = 'slideshow-track';
    carousel.appendChild(track);

    const infoPanel = document.createElement('div');
    infoPanel.className = 'slideshow-info-panel emulator-slideshow-info-panel';
    infoPanel.innerHTML = `
        <h2 class="slideshow-active-title"></h2>
        <div class="slideshow-active-meta"></div>
        <div class="slideshow-active-blurb glass"></div>
    `;

    chrome.appendChild(controls);
    chrome.appendChild(carousel);
    chrome.appendChild(infoPanel);
    container.appendChild(chrome);
    gamesContainer.appendChild(container);

    emulatorsToRender.forEach((emulator, index) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'slideshow-item emulator-slideshow-item';
        item.dataset.index = String(index);
        item.setAttribute('aria-label', String(emulator?.name || 'Unknown Emulator'));
        item.innerHTML = createEmulatorCardMarkup(emulator, {
            escapeHtml,
            i18n,
            getEmulatorCardHoverIconMarkup: options.getEmulatorCardHoverIconMarkup
        });
        const actionButton = item.querySelector('.emulator-immersive-action');
        bindQuickAction(actionButton, emulator, {
            launchEmulator,
            downloadAndInstallEmulator
        });
        track.appendChild(item);
    });

    applyPlatformColorBlurToEmulatorCards(track, {
        enabled: true,
        allowExtraction: true
    });

    function setBackdropForIndex(index) {
        const emulator = emulatorsToRender[index];
        if (!emulator) return;
        const nextSource = getEmulatorIconSrc(emulator);
        if (nextSource === activeBackdropSource) return;
        const nextBackdrop = 1 - activeBackdrop;
        backdrops[nextBackdrop].style.backgroundImage = `url("${String(nextSource).replace(/["\\]/g, '\\$&')}")`;
        backdrops[nextBackdrop].classList.add('is-active');
        backdrops[activeBackdrop].classList.remove('is-active');
        activeBackdrop = nextBackdrop;
        activeBackdropSource = nextSource;
    }

    let activeInfoIndex = -1;
    function updateInfo(index) {
        if (activeInfoIndex === index) return;
        const emulator = emulatorsToRender[index];
        if (!emulator) return;
        activeInfoIndex = index;
        const titleEl = infoPanel.querySelector('.slideshow-active-title');
        const metaEl = infoPanel.querySelector('.slideshow-active-meta');
        const blurbEl = infoPanel.querySelector('.slideshow-active-blurb');
        if (titleEl) titleEl.textContent = String(emulator?.name || 'Unknown Emulator');
        if (metaEl) {
            metaEl.innerHTML = `
                <span class="slideshow-meta-pill">${escapeHtml(emulator?.platform || emulator?.platformShortName || 'Unknown')}</span>
                <span class="slideshow-meta-pill">${escapeHtml(buildEmulatorStatusText(emulator))}</span>
                <span class="slideshow-meta-pill">${index + 1} / ${emulatorsToRender.length}</span>
            `;
        }
        if (blurbEl) {
            blurbEl.innerHTML = getEmulatorPathMarkup(emulator, !!emulator?.isInstalled);
        }
        setBackdropForIndex(index);
    }

    let lane = null;

    function applyMode(nextMode, persist = true) {
        mode = nextMode === '3d' ? '3d' : 'flat';
        container.classList.toggle('is-mode-3d', mode === '3d');
        container.classList.toggle('is-mode-flat', mode !== '3d');
        controls.querySelectorAll('.slideshow-mode-tab').forEach((button) => {
            const isActive = String(button.dataset.slideshowMode || '') === mode;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
        lane?.setMode();
        if (persist) writeStoredMode(mode);
    }

    lane = createSlideshowLane({
        carousel,
        track,
        itemSelector: '.emulator-slideshow-item',
        reduceMotion,
        modeRef: {
            get mode() {
                return mode;
            }
        },
        onNearestIndexChange(nextIndex, state) {
            if (!state.isMoving && !state.isPointerDragging) {
                updateInfo(nextIndex);
            }
        },
        onSettledIndexChange(nextIndex) {
            updateInfo(nextIndex);
        },
        onActiveClick(nextIndex) {
            showEmulatorDetails(emulatorsToRender[nextIndex], options);
        },
        slightEdgeRotate: 7,
        fullRotate: 18
    });

    controls.addEventListener('click', (event) => {
        const button = event.target.closest('.slideshow-mode-tab[data-slideshow-mode]');
        if (!button) return;
        applyMode(button.dataset.slideshowMode || 'flat');
    });

    container.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            lane.scrollToItem(Math.max(0, lane.getCurrentIndex() - 1));
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            lane.scrollToItem(Math.min(emulatorsToRender.length - 1, lane.getCurrentIndex() + 1));
        } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            showEmulatorDetails(emulatorsToRender[lane.getCurrentIndex()], options);
        }
    });

    applyMode(mode, false);
    requestAnimationFrame(() => {
        lane.scrollToItem(0, false);
        updateInfo(0);
        if (document.activeElement !== container) {
            container.focus();
        }
    });
}

export function renderEmulatorsAsFocus(emulatorsToRender, options = {}) {
    const gamesContainer = document.getElementById('games-container');
    if (!gamesContainer) return;

    const showEmulatorDetails = typeof options.showEmulatorDetails === 'function' ? options.showEmulatorDetails : () => {};
    const launchEmulator = typeof options.launchEmulator === 'function' ? options.launchEmulator : null;
    const downloadAndInstallEmulator = typeof options.downloadAndInstallEmulator === 'function' ? options.downloadAndInstallEmulator : null;
    const applyPlatformColorBlurToEmulatorCards = typeof options.applyPlatformColorBlurToEmulatorCards === 'function'
        ? options.applyPlatformColorBlurToEmulatorCards
        : () => {};
    const getEmulatorPathMarkup = typeof options.getEmulatorPathMarkup === 'function'
        ? options.getEmulatorPathMarkup
        : () => 'Not installed yet';
    const getEmulatorPathTitle = typeof options.getEmulatorPathTitle === 'function'
        ? options.getEmulatorPathTitle
        : () => 'Not installed yet';
    const escapeHtml = typeof options.escapeHtml === 'function' ? options.escapeHtml : (value) => String(value ?? '');
    const i18n = options.i18n;

    const container = document.createElement('div');
    container.className = 'focus-container emulator-focus-container';
    container.tabIndex = 0;

    if (!Array.isArray(emulatorsToRender) || emulatorsToRender.length === 0) {
        container.innerHTML = '<div class="focus-empty">No emulators to display.</div>';
        gamesContainer.appendChild(container);
        return;
    }

    const backdrop = document.createElement('div');
    backdrop.className = 'focus-backdrop emulator-focus-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');

    const layout = document.createElement('div');
    layout.className = 'focus-layout emulator-focus-layout';

    const listPanel = document.createElement('div');
    listPanel.className = 'focus-list-panel glass';
    listPanel.innerHTML = `
        <h3 class="focus-list-heading">Browse Emulators</h3>
        <div class="focus-list" role="listbox"></div>
    `;

    const previewPanel = document.createElement('button');
    previewPanel.type = 'button';
    previewPanel.className = 'focus-preview-panel emulator-focus-preview glass';
    previewPanel.setAttribute('aria-label', 'Open selected emulator details');
    previewPanel.innerHTML = `
        <div class="focus-preview-image-wrap emulator-focus-image-wrap">
            <div class="emulator-card emulator-focus-card">
                <div class="emulator-slideshow-card-surface">
                    <header class="emulator-card-header">
                        <h3 class="emulator-title"></h3>
                        <span class="emulator-platform-badge">
                            <img class="emulator-platform-icon" alt="" loading="lazy" />
                        </span>
                    </header>
                    <div class="emulator-slideshow-icon-wrap">
                        <img class="emulator-slideshow-icon emulator-focus-icon" alt="" loading="lazy" />
                    </div>
                    <div class="emulator-slideshow-status-row">
                        <span class="emulator-install-status"></span>
                    </div>
                </div>
            </div>
            <button type="button" class="emulator-card-hover-action emulator-immersive-action" aria-label="Launch or download selected emulator" title="Launch or download selected emulator">
                ${options.getEmulatorCardHoverIconMarkup ? options.getEmulatorCardHoverIconMarkup(true) : ''}
            </button>
        </div>
        <div class="focus-preview-info">
            <h2 class="focus-preview-title"></h2>
            <div class="focus-preview-meta"></div>
            <p class="focus-preview-desc"></p>
        </div>
    `;

    layout.appendChild(listPanel);
    layout.appendChild(previewPanel);
    container.appendChild(backdrop);
    container.appendChild(layout);
    gamesContainer.appendChild(container);

    const listEl = listPanel.querySelector('.focus-list');
    const previewTitle = previewPanel.querySelector('.focus-preview-title');
    const previewMeta = previewPanel.querySelector('.focus-preview-meta');
    const previewDesc = previewPanel.querySelector('.focus-preview-desc');
    const previewCard = previewPanel.querySelector('.emulator-focus-card');
    const previewCardTitle = previewPanel.querySelector('.emulator-title');
    const previewBadgeIcon = previewPanel.querySelector('.emulator-platform-icon');
    const previewMainIcon = previewPanel.querySelector('.emulator-focus-icon');
    const previewStatus = previewPanel.querySelector('.emulator-install-status');
    let previewAction = previewPanel.querySelector('.emulator-immersive-action');

    emulatorsToRender.forEach((emulator, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'focus-list-item emulator-focus-list-item';
        button.dataset.focusIndex = String(index);
        button.setAttribute('role', 'option');
        button.innerHTML = `
            <span class="focus-list-name">${escapeHtml(emulator?.name || 'Unknown Emulator')}</span>
            <span class="focus-list-meta-inline">${escapeHtml(emulator?.platform || emulator?.platformShortName || 'Unknown')}</span>
        `;
        listEl.appendChild(button);
    });

    let currentIndex = 0;
    function setActiveListItem(nextIndex, shouldScroll = false) {
        listEl.querySelectorAll('.emulator-focus-list-item').forEach((button, index) => {
            const isActive = index === nextIndex;
            button.classList.toggle('is-active', isActive);
            if (isActive) {
                button.setAttribute('aria-selected', 'true');
                if (shouldScroll && typeof button.scrollIntoView === 'function') {
                    button.scrollIntoView({ block: 'nearest' });
                }
            } else {
                button.removeAttribute('aria-selected');
            }
        });
    }

    function updatePreview(nextIndex, shouldScroll = false) {
        const emulator = emulatorsToRender[nextIndex];
        if (!emulator) return;
        currentIndex = nextIndex;
        const iconSrc = getEmulatorIconSrc(emulator);
        const statusText = buildEmulatorStatusText(emulator);
        if (previewTitle) previewTitle.textContent = String(emulator?.name || 'Unknown Emulator');
        if (previewCardTitle) previewCardTitle.textContent = String(emulator?.name || 'Unknown Emulator');
        if (previewBadgeIcon) {
            previewBadgeIcon.src = iconSrc;
            previewBadgeIcon.alt = String(emulator?.platform || emulator?.platformShortName || 'Unknown');
        }
        if (previewMainIcon) {
            previewMainIcon.src = iconSrc;
            previewMainIcon.alt = '';
        }
        if (previewStatus) {
            previewStatus.textContent = statusText;
            previewStatus.className = `emulator-install-status ${emulator?.isInstalled ? 'is-installed' : 'is-missing'}`;
        }
        if (previewMeta) {
            previewMeta.innerHTML = `
                <span class="focus-meta-pill">${escapeHtml(emulator?.platform || emulator?.platformShortName || 'Unknown')}</span>
                <span class="focus-meta-pill">${escapeHtml(statusText)}</span>
                <span class="focus-meta-pill">${currentIndex + 1} / ${emulatorsToRender.length}</span>
            `;
        }
        if (previewDesc) {
            previewDesc.innerHTML = getEmulatorPathMarkup(emulator, !!emulator?.isInstalled);
            previewDesc.setAttribute('title', getEmulatorPathTitle(emulator, !!emulator?.isInstalled));
        }
        if (previewAction) {
            previewAction.innerHTML = options.getEmulatorCardHoverIconMarkup
                ? options.getEmulatorCardHoverIconMarkup(!!emulator?.isInstalled)
                : '';
            previewAction.setAttribute('aria-label', buildLaunchLabel(emulator, i18n));
            previewAction.setAttribute('title', buildLaunchLabel(emulator, i18n));
            previewAction.replaceWith(previewAction.cloneNode(true));
            previewAction = previewPanel.querySelector('.emulator-immersive-action');
            bindQuickAction(previewAction, emulator, {
                launchEmulator,
                downloadAndInstallEmulator
            });
        }
        backdrop.style.backgroundImage = `url("${String(iconSrc).replace(/["\\]/g, '\\$&')}")`;
        setActiveListItem(nextIndex, shouldScroll);
        applyPlatformColorBlurToEmulatorCards(previewPanel, {
            enabled: true,
            allowExtraction: true,
            maxSourcesToExtract: 1
        });
    }

    listEl.addEventListener('click', (event) => {
        const item = event.target.closest('.emulator-focus-list-item[data-focus-index]');
        if (!item) return;
        const nextIndex = Number.parseInt(item.dataset.focusIndex || '-1', 10);
        if (!Number.isFinite(nextIndex) || nextIndex < 0) return;
        updatePreview(nextIndex);
    });

    listEl.addEventListener('dblclick', (event) => {
        const item = event.target.closest('.emulator-focus-list-item[data-focus-index]');
        if (!item) return;
        const nextIndex = Number.parseInt(item.dataset.focusIndex || '-1', 10);
        if (!Number.isFinite(nextIndex) || nextIndex < 0) return;
        showEmulatorDetails(emulatorsToRender[nextIndex], options);
    });

    previewPanel.addEventListener('click', () => {
        showEmulatorDetails(emulatorsToRender[currentIndex], options);
    });

    container.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            updatePreview((currentIndex - 1 + emulatorsToRender.length) % emulatorsToRender.length, true);
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            updatePreview((currentIndex + 1) % emulatorsToRender.length, true);
        } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            showEmulatorDetails(emulatorsToRender[currentIndex], options);
        }
    });

    updatePreview(0, true);
    if (document.activeElement !== container) {
        container.focus();
    }
}
