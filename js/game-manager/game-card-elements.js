export function createGameCardElements(deps = {}) {
    const i18n = deps.i18n || window.i18n || { t: (key) => String(key || '') };
    const escapeHtml = deps.escapeHtml || ((value) => String(value ?? ''));
    const getGameImagePath = deps.getGameImagePath || (() => '');
    const lazyPlaceholderSrc = String(deps.lazyPlaceholderSrc || '').trim();
    const launchGame = deps.launchGame || (async () => {});
    const showGameDetails = deps.showGameDetails || (() => {});

    function createGameCard(game) {
        const card = document.createElement('div');
        card.className = 'game-card';
        card.dataset.gameId = game.id;

        const gameImageToUse = getGameImagePath(game);
        const platformShortName = String(game.platformShortName || 'unknown').toLowerCase();
        const platformDisplayName = game.platform || game.platformShortName || i18n.t('gameDetails.unknown');
        const platformIcon = `emubro-resources/platforms/${platformShortName}/logos/default.png`;
        const safeName = escapeHtml(game.name);
        const safePlatformName = escapeHtml(platformDisplayName);
        const safeImagePath = escapeHtml(gameImageToUse);

        card.innerHTML = `
        <div class="game-cover">
            <img src="${lazyPlaceholderSrc}" data-lazy-src="${safeImagePath}" alt="${safeName}" class="game-image lazy-game-image is-pending" loading="lazy" decoding="async" fetchpriority="low" />
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

    function createGameTableRow(game) {
        const row = document.createElement('tr');
        const gameImageToUse = getGameImagePath(game);
        const platformShortName = String(game.platformShortName || 'unknown').toLowerCase();
        const platformIcon = `emubro-resources/platforms/${platformShortName}/logos/default.png`;
        const safeName = escapeHtml(game.name);
        const safeGenre = escapeHtml(game.genre || i18n.t('gameDetails.unknown'));
        const safePlatformShort = escapeHtml(game.platformShortName || '');

        row.innerHTML = `
        <td class="table-image-cell"><img src="${lazyPlaceholderSrc}" data-lazy-src="${escapeHtml(gameImageToUse)}" alt="${safeName}" class="table-game-image lazy-game-image is-pending" loading="lazy" decoding="async" fetchpriority="low" /></td>
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
        <img src="${lazyPlaceholderSrc}" data-lazy-src="${escapeHtml(gameImageToUse)}" alt="${safeName}" class="list-item-image lazy-game-image is-pending" loading="lazy" decoding="async" fetchpriority="low" />
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

    return {
        createGameCard,
        createGameTableRow,
        createGameListItem
    };
}
