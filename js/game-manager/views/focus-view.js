export function renderGamesAsFocus(gamesToRender, options = {}) {
    const gamesContainer = document.getElementById('games-container');
    if (!gamesContainer) return;
    const renderToken = options.renderToken;
    const getRenderToken = typeof options.getRenderToken === 'function' ? options.getRenderToken : () => renderToken;
    const setGamesScrollDetach = typeof options.setGamesScrollDetach === 'function'
        ? options.setGamesScrollDetach
        : () => {};
    const buildViewGamePool = typeof options.buildViewGamePool === 'function' ? options.buildViewGamePool : (rows) => rows;
    const maxPoolSize = Number(options.maxPoolSize) || 0;
    const showGameDetails = typeof options.showGameDetails === 'function' ? options.showGameDetails : () => {};
    const cleanupLazyGameImages = typeof options.cleanupLazyGameImages === 'function' ? options.cleanupLazyGameImages : () => {};
    const i18n = options.i18n;
    const t = (key, fallback = 'Unknown') => {
        try {
            if (i18n && typeof i18n.t === 'function') return i18n.t(key);
        } catch (_error) {}
        return fallback;
    };

    const focusContainer = document.createElement('div');
    focusContainer.className = 'focus-container';
    focusContainer.tabIndex = 0;

    const focusGames = buildViewGamePool(gamesToRender, maxPoolSize);
    if (!focusGames || focusGames.length === 0) {
        focusContainer.innerHTML = '<div class="focus-empty">No games to display.</div>';
        gamesContainer.appendChild(focusContainer);
        return;
    }

    function getGameImage(game) {
        let gameImageToUse = game && game.image;
        if (!gameImageToUse && game && game.platformShortName) {
            const platformShortName = game.platformShortName.toLowerCase();
            gameImageToUse = `emubro-resources/platforms/${platformShortName}/covers/default.jpg`;
        }
        return gameImageToUse;
    }

    const backdrop = document.createElement('div');
    backdrop.className = 'focus-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');

    const platformBar = document.createElement('div');
    platformBar.className = 'focus-platform-bar';

    const layout = document.createElement('div');
    layout.className = 'focus-layout';

    const listPanel = document.createElement('div');
    listPanel.className = 'focus-list-panel glass';
    const listHeading = document.createElement('h3');
    listHeading.className = 'focus-list-heading';
    listHeading.textContent = 'Browse Games';
    const listEl = document.createElement('div');
    listEl.className = 'focus-list';
    listEl.setAttribute('role', 'listbox');
    listPanel.appendChild(listHeading);
    listPanel.appendChild(listEl);

    const previewPanel = document.createElement('button');
    previewPanel.type = 'button';
    previewPanel.className = 'focus-preview-panel glass';
    previewPanel.setAttribute('aria-label', 'Open selected game details');
    const previewImageWrap = document.createElement('div');
    previewImageWrap.className = 'focus-preview-image-wrap';
    const previewImage = document.createElement('img');
    previewImage.className = 'focus-preview-image';
    previewImage.alt = '';
    previewImage.loading = 'lazy';
    previewImage.decoding = 'async';
    previewImageWrap.appendChild(previewImage);
    const previewInfo = document.createElement('div');
    previewInfo.className = 'focus-preview-info';
    const previewTitle = document.createElement('h2');
    previewTitle.className = 'focus-preview-title';
    const previewMeta = document.createElement('div');
    previewMeta.className = 'focus-preview-meta';
    const previewDesc = document.createElement('p');
    previewDesc.className = 'focus-preview-desc';
    previewInfo.appendChild(previewTitle);
    previewInfo.appendChild(previewMeta);
    previewInfo.appendChild(previewDesc);
    previewPanel.appendChild(previewImageWrap);
    previewPanel.appendChild(previewInfo);

    layout.appendChild(listPanel);
    layout.appendChild(previewPanel);
    focusContainer.appendChild(backdrop);
    focusContainer.appendChild(platformBar);
    focusContainer.appendChild(layout);
    gamesContainer.appendChild(focusContainer);

    function getPlatformKey(game) {
        return String(game?.platformShortName || game?.platform || 'unknown').trim().toLowerCase();
    }

    function getPlatformLabel(game) {
        const shortName = String(game?.platformShortName || '').trim();
        if (shortName) return shortName.toUpperCase();
        const name = String(game?.platform || '').trim();
        return name || 'Unknown';
    }

    const platformMap = new Map();
    focusGames.forEach((game) => {
        const key = getPlatformKey(game);
        if (!key || platformMap.has(key)) return;
        platformMap.set(key, getPlatformLabel(game));
    });
    const platformOptions = [{ key: 'all', label: 'All Platforms' }]
        .concat(Array.from(platformMap.entries()).map(([key, label]) => ({ key, label })));

    let selectedPlatformKey = 'all';
    let currentFilteredIndex = 0;
    let filteredIndices = [];
    let itemButtons = [];

    function setActiveListItem(filteredIndex, shouldScroll = false) {
        itemButtons.forEach((button, itemIdx) => {
            const isActive = itemIdx === filteredIndex;
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

    function updatePreview(filteredIndex, shouldScroll = false) {
        const sourceIndex = filteredIndices[filteredIndex];
        if (!Number.isFinite(sourceIndex)) return;
        const game = focusGames[sourceIndex];
        if (!game) return;
        const platformName = game.platform || game.platformShortName || t('gameDetails.unknown');
        const ratingText = (game.rating !== undefined && game.rating !== null) ? `${game.rating}` : t('gameDetails.unknown');
        const statusText = game.isInstalled ? 'Installed' : 'Not Installed';
        const imagePath = getGameImage(game);

        currentFilteredIndex = filteredIndex;
        previewTitle.textContent = game.name || '';
        previewImage.src = imagePath || '';
        previewImage.alt = game.name || '';
        previewMeta.innerHTML = `
            <span class="focus-meta-pill">${platformName}</span>
            <span class="focus-meta-pill">Rating: ${ratingText}</span>
            <span class="focus-meta-pill">${statusText}</span>
            <span class="focus-meta-pill">${sourceIndex + 1} / ${focusGames.length}</span>
        `;
        previewDesc.textContent = (game.description && String(game.description).trim().length > 0)
            ? String(game.description).trim()
            : 'No description available for this game yet.';

        backdrop.style.backgroundImage = imagePath ? `url("${imagePath}")` : '';
        setActiveListItem(filteredIndex, shouldScroll);
    }

    function setIndex(nextFilteredIndex, shouldScroll = false) {
        if (renderToken !== getRenderToken()) return;
        if (!focusContainer.isConnected) return;
        if (!filteredIndices.length) return;
        const normalized = (nextFilteredIndex + filteredIndices.length) % filteredIndices.length;
        updatePreview(normalized, shouldScroll);
    }

    function renderPlatformButtons() {
        platformBar.innerHTML = '';
        platformOptions.forEach((entry) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `focus-platform-btn${entry.key === selectedPlatformKey ? ' is-active' : ''}`;
            button.dataset.focusPlatform = entry.key;
            button.textContent = entry.label;
            platformBar.appendChild(button);
        });
    }

    function rebuildList(shouldScroll = false) {
        filteredIndices = focusGames
            .map((game, sourceIndex) => ({ game, sourceIndex }))
            .filter(({ game }) => selectedPlatformKey === 'all' || getPlatformKey(game) === selectedPlatformKey)
            .map(({ sourceIndex }) => sourceIndex);

        listEl.innerHTML = '';
        itemButtons = [];

        filteredIndices.forEach((sourceIndex) => {
            const game = focusGames[sourceIndex];
            const itemBtn = document.createElement('button');
            itemBtn.type = 'button';
            itemBtn.className = 'focus-list-item';
            itemBtn.dataset.focusIndex = String(sourceIndex);
            itemBtn.setAttribute('role', 'option');
            const itemName = document.createElement('span');
            itemName.className = 'focus-list-name';
            itemName.textContent = String(game?.name || 'Unknown game');
            itemBtn.appendChild(itemName);
            itemButtons.push(itemBtn);
            listEl.appendChild(itemBtn);
        });

        if (!filteredIndices.length) {
            previewTitle.textContent = 'No games for this platform';
            previewImage.src = '';
            previewImage.alt = '';
            previewMeta.innerHTML = '';
            previewDesc.textContent = 'Try another platform filter.';
            backdrop.style.backgroundImage = '';
            return;
        }

        if (currentFilteredIndex >= filteredIndices.length) {
            currentFilteredIndex = 0;
        }
        updatePreview(currentFilteredIndex, shouldScroll);
    }

    listEl.addEventListener('click', (event) => {
        const button = event.target.closest('.focus-list-item[data-focus-index]');
        if (!button) return;
        const sourceIndex = Number.parseInt(button.dataset.focusIndex || '-1', 10);
        const filteredIndex = filteredIndices.indexOf(sourceIndex);
        if (!Number.isFinite(filteredIndex) || filteredIndex < 0) return;
        setIndex(filteredIndex);
    });

    listEl.addEventListener('dblclick', (event) => {
        const button = event.target.closest('.focus-list-item[data-focus-index]');
        if (!button) return;
        const sourceIndex = Number.parseInt(button.dataset.focusIndex || '-1', 10);
        if (!Number.isFinite(sourceIndex) || sourceIndex < 0 || sourceIndex >= focusGames.length) return;
        const game = focusGames[sourceIndex];
        if (game) showGameDetails(game);
    });

    previewPanel.addEventListener('click', () => {
        const sourceIndex = filteredIndices[currentFilteredIndex];
        const game = Number.isFinite(sourceIndex) ? focusGames[sourceIndex] : null;
        if (game) showGameDetails(game);
    });

    platformBar.addEventListener('click', (event) => {
        const button = event.target.closest('.focus-platform-btn[data-focus-platform]');
        if (!button) return;
        const nextPlatformKey = String(button.dataset.focusPlatform || 'all');
        if (nextPlatformKey === selectedPlatformKey) return;
        selectedPlatformKey = nextPlatformKey;
        currentFilteredIndex = 0;
        renderPlatformButtons();
        rebuildList(true);
    });

    focusContainer.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setIndex(currentFilteredIndex - 1, true);
            return;
        }
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setIndex(currentFilteredIndex + 1, true);
            return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            const sourceIndex = filteredIndices[currentFilteredIndex];
            const game = Number.isFinite(sourceIndex) ? focusGames[sourceIndex] : null;
            if (game) showGameDetails(game);
        }
    });

    renderPlatformButtons();
    rebuildList(true);
    focusContainer.focus();

    setGamesScrollDetach(() => {
        cleanupLazyGameImages(focusContainer);
    });
}
