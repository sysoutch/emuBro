/**
 * Game Manager
 */

const { ipcRenderer } = require('electron');
const log = require('electron-log');

let games = [];
let filteredGames = [];
let currentFilter = 'all';
let currentSort = 'name';

export function getGames() { return games; }
export function setGames(val) { games = val; }
export function getFilteredGames() { return filteredGames; }
export function setFilteredGames(val) { filteredGames = val; }

export function renderGames(gamesToRender) {
    const gamesContainer = document.getElementById('games-container');
    if (!gamesContainer) return;

    gamesContainer.innerHTML = '';
    
    if (gamesToRender.length === 0) {
        gamesContainer.innerHTML = `<p>${i18n.t('gameGrid.noGamesFound')}</p>`;
        return;
    }
    
    const activeViewBtn = document.querySelector('.view-btn.active');
    const activeView = activeViewBtn ? activeViewBtn.dataset.view : 'cover';
    
    if (activeView === 'table') {
        renderGamesAsTable(gamesToRender);
    } else if (activeView === 'list') {
        renderGamesAsList(gamesToRender);
    } else if (activeView === 'slideshow') {
        renderGamesAsSlideshow(gamesToRender);
    } else if (activeView === 'random') {
        renderGamesAsRandom(gamesToRender);
    } else {
        gamesToRender.forEach(game => {
            const gameCard = createGameCard(game);
            gamesContainer.appendChild(gameCard);
        });
    }
}

export function createGameCard(game) {
    const card = document.createElement('div');
    card.className = 'game-card';
    card.dataset.gameId = game.id;
    
    let gameImageToUse = game.image;
    const platformShortName = game.platformShortName.toLowerCase();
    if (!gameImageToUse) {
        gameImageToUse = `emubro-resources/platforms/${platformShortName}/covers/default.jpg`;
    }
    const platformIcon = `emubro-resources/platforms/${platformShortName}/logos/default.png`;
    card.innerHTML = `
        <img src="${gameImageToUse}" alt="${game.name}" class="game-image" loading="lazy" />
        <div class="game-info">
            <h3 class="game-title">${game.name}</h3>
            <span class="game-platform-badge">
                <img src="${platformIcon}" alt="${game.platformShortName}" class="game-platform-icon" loading="lazy" onerror="this.style.display='none'" />
                <span>${game.platformName || game.platformShortName || i18n.t('gameDetails.unknown')}</span>
            </span>
            <div class="game-more">
                <div class="game-rating">★ ${game.rating}</div>
                <p class="game-genre">${game.genre}</p>
                <div class="game-actions">
                    <button class="action-btn launch-btn" data-game-id="${game.id}" data-action="launch">Launch</button>
                    <button class="action-btn remove-btn" data-game-id="${game.id}" data-action="remove">Remove</button>
                </div>
            </div>
        </div>
    `;
    
    const buttons = card.querySelectorAll('.action-btn');
    buttons.forEach(button => {
        button.addEventListener('click', handleGameAction);
    });
    
    card.addEventListener('click', () => {
        showGameDetails(game);
    });
    
    return card;
}

export async function searchForGamesAndEmulators() {
    const searchBtn = document.getElementById('search-games-btn');
    const driveSelector = document.getElementById('drive-selector');
    if (searchBtn) {
        searchBtn.disabled = true;
        searchBtn.textContent = 'Searching...';
    }
    
    try {
        const result = await ipcRenderer.invoke('browse-games-and-emus', driveSelector ? driveSelector.value : '');
        if (result.success) {
            const newGames = [...getGames(), ...result.games];
            setGames(newGames);
            setFilteredGames(newGames);
            renderGames(newGames);
            result.platforms.forEach(addPlatformFilterOption);
            alert(i18n.t('messages.foundGames', { count: result.games.length }));
        }
    } catch (error) {
        log.error('Search failed:', error);
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
    const result = await ipcRenderer.invoke('remove-game', gameId);
    if (result.success) {
        const gameCard = document.querySelector(`[data-game-id="${gameId}"]`);
        if (gameCard) {
            const actionsContainer = gameCard.querySelector('.game-actions');
            actionsContainer.innerHTML = '';
            
            const installButton = document.createElement('button');
            installButton.className = 'action-btn install-btn';
            installButton.textContent = 'Install';
            installButton.dataset.gameId = gameId;
            installButton.dataset.action = 'install';
            installButton.addEventListener('click', handleGameAction);
            
            actionsContainer.appendChild(installButton);
        }
        
        alert(i18n.t('messages.removalStarted'));
    } else {
        alert(i18n.tf('messages.removalFailed', { message: result.message }));
    }
}

async function launchGame(gameId) {
    const result = await ipcRenderer.invoke('launch-game', gameId);
    if (!result.success) {
        ipcRenderer.send('open-alert', 'messages.launchFailed' + ':' + result.message);
        // alert(i18n.tf('messages.launchFailed', { message: result.message }));
    }
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
            filteredGames.sort((a, b) => (a.platformName || a.platformShortName || 'Unknown').localeCompare(b.platformName || b.platformShortName || 'Unknown'));
            break;
        default: 
            filteredGames.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    renderGames(filteredGames);
}

export function initializePlatformFilterOptions() {
    const platformFilter = document.getElementById('platform-filter');
    if (!platformFilter) return;

    platformFilter.innerHTML = '<option value="all">All Platforms</option>';
    const platforms = new Set(games.map(game => game.platformShortName.toLowerCase()));
    platforms.forEach(platform => {
        const option = document.createElement('option');
        option.value = platform;
        option.textContent = platform.charAt(0).toUpperCase() + platform.slice(1);
        platformFilter.appendChild(option);
    });
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

function renderGamesAsTable(gamesToRender) {
    const gamesContainer = document.getElementById('games-container');
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
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            ${gamesToRender.map(game => {
                let gameImageToUse = game.image;
                const platformShortName = game.platformShortName.toLowerCase();
                if (!gameImageToUse) {
                    gameImageToUse = `emubro-resources/platforms/${platformShortName}/covers/default.jpg`;
                }
                const platformIcon = `emubro-resources/platforms/${platformShortName}/logos/default.png`;
                return `
                <tr>
                    <td class="table-image-cell"><img src="${gameImageToUse}" alt="${game.name}" class="table-game-image" loading="lazy" /></td>
                    <td>${game.name}</td>
                    <td>${game.genre}</td>
                    <td>★ ${game.rating}</td>
                    <td class="table-image-cell"><img src="${platformIcon}" alt="${game.platformShortName}" class="table-platform-image" loading="lazy" /></td>
                    <td>${game.isInstalled ? 'Installed' : 'Not Installed'}</td>
                    <td>
                        <button class="action-btn launch-btn" data-game-id="${game.id}" data-action="launch">Launch</button>
                        <button class="action-btn remove-btn" data-game-id="${game.id}" data-action="remove">Remove</button>
                    </td>
                </tr>
            `;}).join('')}
        </tbody>
    `;
    
    gamesContainer.appendChild(table);
    
    const buttons = table.querySelectorAll('.action-btn');
    buttons.forEach(button => {
        button.addEventListener('click', handleGameAction);
    });
}

function renderGamesAsList(gamesToRender) {
    const gamesContainer = document.getElementById('games-container');
    const listContainer = document.createElement('div');
    listContainer.className = 'games-list';
    
    gamesToRender.forEach(game => {
        const listItem = document.createElement('div');
        listItem.className = 'list-item';
        
        let gameImageToUse = game.image;
        const platformShortName = game.platformShortName.toLowerCase();
        if (!gameImageToUse) {
            gameImageToUse = `emubro-resources/platforms/${platformShortName}/covers/default.jpg`;
        }
        
        const platformIcon = `emubro-resources/platforms/${platformShortName}/logos/default.png`;
        
        listItem.innerHTML = `
            <img src="${gameImageToUse}" alt="${game.name}" class="list-item-image" loading="lazy" />
            <div class="list-item-info">
                <h3 class="list-item-title">${game.name}</h3>
                <span class="list-item-platform-badge">
                    <img src="${platformIcon}" alt="${game.platformShortName}" class="list-platform-icon" loading="lazy" onerror="this.style.display='none'" />
                    <span>${game.platformName || game.platformShortName || i18n.t('gameDetails.unknown')}</span>
                </span>
                <p class="list-item-genre">${game.genre}</p>
                <div class="list-item-meta">
                    <span class="list-item-rating">★ ${game.rating}</span>
                    <span class="list-item-status">${game.isInstalled ? 'Installed' : 'Not Installed'}</span>
                </div>
            </div>
            <div class="list-item-actions">
                <button class="action-btn launch-btn" data-game-id="${game.id}" data-action="launch">Launch</button>
                <button class="action-btn remove-btn" data-game-id="${game.id}" data-action="remove">Remove</button>
            </div>
        `;
        
        const buttons = listItem.querySelectorAll('.action-btn');
        buttons.forEach(button => {
            button.addEventListener('click', handleGameAction);
        });
        
        listContainer.appendChild(listItem);
    });
    
    gamesContainer.appendChild(listContainer);
}

function renderGamesAsSlideshow(gamesToRender) {
    const gamesContainer = document.getElementById('games-container');
    const slideshowContainer = document.createElement('div');
    slideshowContainer.className = 'slideshow-container';
    
    let currentIndex = 0;
    const carouselWrapper = document.createElement('div');
    carouselWrapper.className = 'slideshow-carousel-wrapper';
    const carouselInner = document.createElement('div');
    carouselInner.className = 'slideshow-carousel-inner';
    
    function getGameImage(game) {
        let gameImageToUse = game.image;
        if (!gameImageToUse && game.platformShortName) {
            const platformShortName = game.platformShortName.toLowerCase();
            gameImageToUse = `emubro-resources/platforms/${platformShortName}/covers/default.jpg`;
        }
        return gameImageToUse;
    }
    
    function updateSlideshow() {
        carouselInner.innerHTML = '';
        
        const prevIndex = (currentIndex - 1 + gamesToRender.length) % gamesToRender.length;
        const prevGame = gamesToRender[prevIndex];
        const prevCard = document.createElement('div');
        prevCard.className = 'slideshow-card slideshow-card-prev';
        prevCard.innerHTML = `
            <img src="${getGameImage(prevGame)}" alt="${prevGame.name}" class="slideshow-image" loading="lazy" />
            <div class="slideshow-card-label">Previous</div>
        `;
        carouselInner.appendChild(prevCard);
        
        const game = gamesToRender[currentIndex];
        const platformShortName = game.platformShortName.toLowerCase();
        const platformIcon = `emubro-resources/platforms/${platformShortName}/logos/default.png`;
        const gameCard = document.createElement('div');
        gameCard.className = 'slideshow-card slideshow-card-current';
        gameCard.innerHTML = `
            <img src="${getGameImage(game)}" alt="${game.name}" class="slideshow-image" loading="lazy" />
            <div class="slideshow-info">
                <h2 class="slideshow-title">${game.name}</h2>
                <span class="slideshow-platform-badge">
                    <img src="${platformIcon}" alt="${game.platformShortName}" class="slideshow-platform-icon" loading="lazy" onerror="this.style.display='none'" />
                    <span>${game.platformName || game.platformShortName || i18n.t('gameDetails.unknown')}</span>
                </span>
                <p class="slideshow-genre">${game.genre}</p>
                <div class="slideshow-meta">
                    <span class="slideshow-rating">★ ${game.rating}</span>
                <p class="slideshow-status">${game.isInstalled ? 'Installed' : 'Not Installed'}</p>
                <div class="slideshow-actions">
                    <button class="action-btn launch-btn" data-game-id="${game.id}" data-action="launch">Launch</button>
                    <button class="action-btn remove-btn" data-game-id="${game.id}" data-action="remove">Remove</button>
                </div>
            </div>
            <div class="slideshow-counter">${currentIndex + 1} / ${gamesToRender.length}</div>
        `;
        
        const buttons = gameCard.querySelectorAll('.action-btn');
        buttons.forEach(button => {
            button.addEventListener('click', handleGameAction);
        });
        carouselInner.appendChild(gameCard);
        
        const nextIndex = (currentIndex + 1) % gamesToRender.length;
        const nextGame = gamesToRender[nextIndex];
        const nextCard = document.createElement('div');
        nextCard.className = 'slideshow-card slideshow-card-next';
        nextCard.innerHTML = `
            <img src="${getGameImage(nextGame)}" alt="${nextGame.name}" class="slideshow-image" loading="lazy" />
            <div class="slideshow-card-label">Next</div>
        `;
        carouselInner.appendChild(nextCard);
    }
    
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'slideshow-controls';
    
    const prevBtn = document.createElement('button');
    prevBtn.className = 'slideshow-btn prev-btn';
    prevBtn.textContent = '❮ Previous';
    prevBtn.addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + gamesToRender.length) % gamesToRender.length;
        updateSlideshow();
    });
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'slideshow-btn next-btn';
    nextBtn.textContent = 'Next ❯';
    nextBtn.addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % gamesToRender.length;
        updateSlideshow();
    });
    
    updateSlideshow();
    carouselWrapper.appendChild(carouselInner);
    slideshowContainer.appendChild(carouselWrapper);
    controlsContainer.appendChild(prevBtn);
    controlsContainer.appendChild(nextBtn);
    slideshowContainer.appendChild(controlsContainer);
    gamesContainer.appendChild(slideshowContainer);
}

function renderGamesAsRandom(gamesToRender) {
    const gamesContainer = document.getElementById('games-container');
    const randomContainer = document.createElement('div');
    randomContainer.className = 'random-container';
    
    let currentIndex = 0;
    let isShuffling = false;
    let shuffleInterval = null;
    
    const gameDisplay = document.createElement('div');
    gameDisplay.className = 'random-display';
    
    function updateRandomDisplay() {
        const game = gamesToRender[currentIndex];
        let gameImageToUse = game.image;
        if (!gameImageToUse && game.platformShortName) {
            const platformShortName = game.platformShortName.toLowerCase();
            gameImageToUse = `emubro-resources/platforms/${platformShortName}/covers/default.jpg`;
        }
        
        const platformShortName = game.platformShortName.toLowerCase();
        const platformIcon = `emubro-resources/platforms/${platformShortName}/logos/default.png`;
        
        gameDisplay.innerHTML = `
            <img src="${gameImageToUse}" alt="${game.name}" class="random-image" loading="lazy" />
            <div class="random-info">
                <h2 class="random-title">${game.name}</h2>
                <span class="random-platform-badge">
                    <img src="${platformIcon}" alt="${game.platformShortName}" class="random-platform-icon" loading="lazy" onerror="this.style.display='none'" />
                    <span>${game.platformName || game.platformShortName || i18n.t('gameDetails.unknown')}</span>
                </span>
                <p class="random-genre">${game.genre}</p>
                <div class="random-meta">
                    <span class="random-rating">★ ${game.rating}</span>
            </div>
        `;
    }
    
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'random-controls';
    
    const shuffleBtn = document.createElement('button');
    shuffleBtn.className = 'action-btn random-shuffle-btn';
    shuffleBtn.textContent = '🎲 Shuffle & Suggest';
    shuffleBtn.addEventListener('click', () => {
        if (isShuffling) {
            isShuffling = false;
            shuffleBtn.textContent = '🎲 Shuffle & Suggest';
            clearInterval(shuffleInterval);
        } else {
            isShuffling = true;
            shuffleBtn.textContent = 'Stop ⏹';
            let shuffleCount = 0;
            const maxShuffles = 30;
            
            shuffleInterval = setInterval(() => {
                currentIndex = Math.floor(Math.random() * gamesToRender.length);
                updateRandomDisplay();
                shuffleCount++;
                
                if (shuffleCount >= maxShuffles) {
                    isShuffling = false;
                    shuffleBtn.textContent = '🎲 Shuffle & Suggest';
                    clearInterval(shuffleInterval);
                    
                    const msgEl = document.createElement('p');
                    msgEl.className = 'random-suggestion';
                    msgEl.textContent = `Why not play "${gamesToRender[currentIndex].name}" now?`;
                    randomContainer.appendChild(msgEl);
                    
                    setTimeout(() => {
                        msgEl.remove();
                    }, 3000);
                }
            }, 100);
        }
    });
    
    updateRandomDisplay();
    controlsContainer.appendChild(shuffleBtn);
    
    randomContainer.appendChild(gameDisplay);
    randomContainer.appendChild(controlsContainer);
    gamesContainer.appendChild(randomContainer);
}

export function showGameDetails(game) {
    document.querySelectorAll('.game-more').forEach(el => {
        el.style.display = 'none';
    });
    const gameMore = document.querySelector(`.game-card[data-game-id="${game.id}"] .game-more`);
    if (gameMore) gameMore.style.display = 'block';

    const selectedTitle = document.getElementById('selected-game-title');
    if (selectedTitle) selectedTitle.textContent = game.name;
    
    const detailsInfo = document.getElementById('game-details-info');
    if (detailsInfo) {
        detailsInfo.innerHTML = `
            <div class="game-detail-row">
                <img id="detail-game-image" src="" alt="${game.name}" class="detail-game-image" />
            </div>
            <div class="game-detail-row">
                <p><strong>Platform:</strong> ${game.platformName || game.platformShortName || i18n.t('gameDetails.unknown')}</p>
                <p><strong>Rating:</strong> ${game.rating}</p>
                <p><strong>Genre:</strong> ${game.genre}</p>
                <p><strong>Price:</strong> ${game.price > 0 ? `$${game.price.toFixed(2)}` : 'Free'}</p>
            </div>
        `;
        
        const gameImage = document.getElementById('detail-game-image');
        if (game.image) {
            gameImage.src = game.image;
        } else {
            const platformShortName = game.platformShortName.toLowerCase();
            gameImage.src = `emubro-resources/platforms/${platformShortName}/covers/default.jpg`;
        }
    }
    
    const detailsFooter = document.getElementById('game-details-footer');
    if (detailsFooter) detailsFooter.style.display = 'block';
}
