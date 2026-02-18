export function createGameDetailsPopupActions(deps = {}) {
    const emubro = deps.emubro || window.emubro;
    const i18n = deps.i18n || window.i18n || { t: (key) => String(key || '') };
    const localStorageRef = deps.localStorage || window.localStorage;
    const escapeHtml = deps.escapeHtml || ((value) => String(value ?? ''));
    const getGames = deps.getGames || (() => []);
    const getEmulators = deps.getEmulators || (() => []);
    const fetchEmulators = deps.fetchEmulators || (async () => []);
    const getGameImagePath = deps.getGameImagePath || (() => '');
    const initializeLazyGameImages = deps.initializeLazyGameImages || (() => {});
    const reloadGamesFromMainAndRender = deps.reloadGamesFromMainAndRender || (async () => {});
    const lazyPlaceholderSrc = String(deps.lazyPlaceholderSrc || '').trim();
    const alertUser = typeof deps.alertUser === 'function'
        ? deps.alertUser
        : ((message) => window.alert(String(message || '')));
    const confirmUser = typeof deps.confirmUser === 'function'
        ? deps.confirmUser
        : ((message) => window.confirm(String(message || '')));

    const GAME_INFO_PIN_STORAGE_KEY = 'emuBro.gameInfoPopupPinned';
    let gameInfoPopup = null;
    let gameInfoPlatformsCache = null;
    let gameInfoPopupPinned = false;
    try {
        gameInfoPopupPinned = localStorageRef.getItem(GAME_INFO_PIN_STORAGE_KEY) === 'true';
    } catch (_e) {
        gameInfoPopupPinned = false;
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
        try {
            localStorageRef.setItem(GAME_INFO_PIN_STORAGE_KEY, gameInfoPopupPinned ? 'true' : 'false');
        } catch (_e) {}
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
                    import('../docking-manager').then((m) => m.completelyRemoveFromDock('game-info-modal'));
                } else {
                    import('../docking-manager').then((m) => m.removeFromDock('game-info-modal'));
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
                import('../docking-manager').then((m) => {
                    m.toggleDock('game-info-modal', 'pin-game-info', shouldPin);
                    setGameInfoPinnedStorage(shouldPin);
                    applyGameInfoPinnedState();
                });
            });
        }

        import('../theme-manager').then((m) => m.makeDraggable('game-info-modal', 'game-info-header'));
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
                    alertUser(`Shortcut created:\n${res.path}`);
                } else {
                    alertUser(`Failed to create shortcut: ${res?.message || 'Unknown error'}`);
                }
            } catch (err) {
                alertUser(`Failed to create shortcut: ${err?.message || err}`);
            } finally {
                button.disabled = false;
            }
        });
    }

    async function ensurePopupEmulatorsLoaded() {
        const current = Array.isArray(getEmulators()) ? getEmulators() : [];
        if (current.length > 0) return current;
        try {
            await fetchEmulators();
        } catch (_error) {}
        return Array.isArray(getEmulators()) ? getEmulators() : [];
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
                alertUser('Game file path is missing.');
                return;
            }
            const result = await emubro.invoke('show-item-in-folder', filePath);
            if (!result?.success) {
                alertUser(result?.message || 'Failed to open file location.');
            }
        });
    }

    async function bindEmulatorOverrideAction(select, game) {
        if (!select || !game) return;

        const rows = await ensurePopupEmulatorsLoaded();
        const gamePlatformShortName = String(game.platformShortName || '').trim().toLowerCase();
        const installedEmulators = rows
            .filter((emu) => {
                if (!emu?.isInstalled) return false;
                const emuPath = String(emu?.filePath || '').trim();
                if (!emuPath) return false;
                if (!gamePlatformShortName) return true;
                const emuPlatformShortName = String(emu?.platformShortName || emu?.platform || '').trim().toLowerCase();
                return emuPlatformShortName === gamePlatformShortName;
            })
            .sort((a, b) => {
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

        if (installedEmulators.length === 0) {
            options += '<option value="" disabled>No installed emulator found for this platform</option>';
        }

        select.innerHTML = options;

        select.addEventListener('change', async () => {
            const nextOverridePath = String(select.value || '').trim();
            const payload = {
                gameId: game.id,
                emulatorOverridePath: nextOverridePath || null
            };
            const result = await emubro.invoke('update-game-metadata', payload);
            if (!result?.success) {
                alertUser(result?.message || 'Failed to save emulator override.');
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

        select.innerHTML = platformOptions || '<option value="">No platforms found</option>';

        button.addEventListener('click', async () => {
            const nextPlatformShortName = String(select.value || '').trim().toLowerCase();
            const currentPlatformShortName = String(game.platformShortName || '').trim().toLowerCase();
            if (!nextPlatformShortName || nextPlatformShortName === currentPlatformShortName) return;

            if (isKnownGamePlatform(game, platforms)) {
                const proceed = confirmUser('This game already has a recognized platform. Changing it can break emulator matching and metadata. Continue?');
                if (!proceed) return;
            }

            button.disabled = true;
            try {
                const result = await emubro.invoke('update-game-metadata', {
                    gameId: game.id,
                    platformShortName: nextPlatformShortName
                });
                if (!result?.success) {
                    alertUser(result?.message || 'Failed to change platform.');
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
                    alertUser('Failed to copy link.');
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
            <img src="${lazyPlaceholderSrc}" data-lazy-src="${escapeHtml(getGameImagePath(game))}" alt="${safeName}" class="detail-game-image lazy-game-image is-pending" loading="lazy" decoding="async" fetchpriority="low" />
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

    function showGameDetails(game) {
        if (!game) return;

        const popup = ensureGameInfoPopup();
        if (!popup) return;
        const popupTitle = popup.querySelector('#game-info-popup-title');
        const popupBody = popup.querySelector('#game-info-popup-body');
        if (popupTitle) popupTitle.textContent = game.name || 'Game Details';
        renderGameDetailsMarkup(popupBody, game);

        if (gameInfoPopupPinned || popup.classList.contains('docked-right')) {
            import('../docking-manager').then((m) => m.toggleDock('game-info-modal', 'pin-game-info', true));
            setGameInfoPinnedStorage(true);
        } else {
            const hasManualPosition = !!(popup.style.left || popup.style.top || popup.classList.contains('moved'));
            popup.classList.toggle('moved', hasManualPosition);
            popup.style.display = 'flex';
            popup.classList.add('active');
            import('../theme-manager').then((m) => {
                if (typeof m.recenterManagedModalIfMostlyOutOfView === 'function') {
                    m.recenterManagedModalIfMostlyOutOfView('game-info-modal', {
                        visibleThreshold: 0.5,
                        smooth: true
                    });
                }
            });
        }
        applyGameInfoPinnedState();
    }

    return {
        showGameDetails
    };
}
