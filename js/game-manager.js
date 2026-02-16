/**
 * Game Manager
 */

const emubro = window.emubro;
const log = console;

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
        <div class="game-cover" aria-hidden="true">
            <img src="${gameImageToUse}" alt="${game.name}" class="game-image" loading="lazy" decoding="async" fetchpriority="low" />
        </div>
        <div class="game-info">
            <h3 class="game-title">${game.name}</h3>
            <span class="game-platform-badge">
                <img src="${platformIcon}" alt="${game.platformShortName}" class="game-platform-icon" loading="lazy" onerror="this.style.display='none'" />
                <span>${game.platform || game.platformShortName || i18n.t('gameDetails.unknown')}</span>
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
        const result = await emubro.invoke('browse-games-and-emus', driveSelector ? driveSelector.value : '');
        if (result.success) {
            // Avoid renderer-side duplication by always reloading from the persisted DB.
            const updatedGames = await emubro.invoke('get-games');
            setGames(updatedGames);
            setFilteredGames([...updatedGames]);
            renderGames(getFilteredGames());
            initializePlatformFilterOptions();
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
    const result = await emubro.invoke('remove-game', gameId);
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
    const result = await emubro.invoke('launch-game', gameId);
    if (!result.success) {
        alert(i18n.tf('messages.launchFailed', { message: result.message }));
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
            filteredGames.sort((a, b) => (a.platform || a.platformShortName || 'Unknown').localeCompare(b.platform || b.platformShortName || 'Unknown'));
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
                    <td class="table-image-cell"><img src="${gameImageToUse}" alt="${game.name}" class="table-game-image" loading="lazy" decoding="async" fetchpriority="low" /></td>
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
            <img src="${gameImageToUse}" alt="${game.name}" class="list-item-image" loading="lazy" decoding="async" fetchpriority="low" />
            <div class="list-item-info">
                <h3 class="list-item-title">${game.name}</h3>
                <span class="list-item-platform-badge">
                    <img src="${platformIcon}" alt="${game.platformShortName}" class="list-platform-icon" loading="lazy" onerror="this.style.display='none'" />
                    <span>${game.platform || game.platformShortName || i18n.t('gameDetails.unknown')}</span>
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
    slideshowContainer.tabIndex = 0;

    if (!gamesToRender || gamesToRender.length === 0) {
        slideshowContainer.innerHTML = `<div class="slideshow-empty">No games to display.</div>`;
        gamesContainer.appendChild(slideshowContainer);
        return;
    }

    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let currentIndex = 0;
    let isAnimating = false;
    let pendingSteps = 0;
    let suppressClickUntil = 0;

    const backdrops = [document.createElement('div'), document.createElement('div')];
    let activeBackdrop = 0;
    backdrops.forEach((el, i) => {
        el.className = 'slideshow-backdrop' + (i === 0 ? ' is-active' : '');
        el.setAttribute('aria-hidden', 'true');
    });

    const chrome = document.createElement('div');
    chrome.className = 'slideshow-chrome';

    const header = document.createElement('div');
    header.className = 'slideshow-header';
    const heading = document.createElement('h2');
    heading.className = 'slideshow-heading';
    header.appendChild(heading);

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
    const blurbActions = document.createElement('div');
    blurbActions.className = 'slideshow-blurb-actions';
    blurb.appendChild(blurbMeta);
    blurb.appendChild(blurbText);
    blurb.appendChild(blurbActions);

    function getGameImage(game) {
        let gameImageToUse = game && game.image;
        if (!gameImageToUse && game && game.platformShortName) {
            const platformShortName = game.platformShortName.toLowerCase();
            gameImageToUse = `emubro-resources/platforms/${platformShortName}/covers/default.jpg`;
        }
        return gameImageToUse;
    }

    function setBackdropForIndex(idx) {
        const game = gamesToRender[idx];
        const heroImg = getGameImage(game);

        const nextBackdrop = 1 - activeBackdrop;
        backdrops[nextBackdrop].style.backgroundImage = heroImg ? `url("${heroImg}")` : '';
        backdrops[nextBackdrop].classList.add('is-active');
        backdrops[activeBackdrop].classList.remove('is-active');
        activeBackdrop = nextBackdrop;
    }

    function updateHero(idx) {
        const game = gamesToRender[idx];
        heading.textContent = game.name;

        const platformName = game.platform || game.platformShortName || i18n.t('gameDetails.unknown');
        const ratingText = (game.rating !== undefined && game.rating !== null) ? `${game.rating}` : i18n.t('gameDetails.unknown');
        const statusText = game.isInstalled ? 'Installed' : 'Not Installed';

        blurbMeta.innerHTML = `
            <span class="slideshow-meta-pill">${platformName}</span>
            <span class="slideshow-meta-pill">Rating: ${ratingText}</span>
            <span class="slideshow-meta-pill">${statusText}</span>
            <span class="slideshow-meta-pill">${idx + 1} / ${gamesToRender.length}</span>
        `;

        blurbText.textContent = (game.description && String(game.description).trim().length > 0)
            ? String(game.description).trim()
            : 'No description available for this game yet.';

        blurbActions.innerHTML = `
            <button class="action-btn launch-btn" data-game-id="${game.id}" data-action="launch">Launch</button>
            <button class="action-btn remove-btn" data-game-id="${game.id}" data-action="remove">Remove</button>
        `;
        blurbActions.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                handleGameAction(e);
            });
        });

        if (!reduceMotion) {
            chrome.classList.add('is-swapping');
            setTimeout(() => chrome.classList.remove('is-swapping'), 180);
        }

        setBackdropForIndex(idx);
    }

    const len = gamesToRender.length;
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
        const game = gamesToRender[idx];
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

        const durationMs = reduceMotion ? 0 : (slideshowContainer.classList.contains('is-dragging') ? 140 : 360);
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

    function queueShift(steps) {
        if (!steps) return;
        if (len <= 1) return;
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
        const stepPx = 90; // lower = faster scrolling
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
            if (reduceMotion) return;
            if (e.button !== 0) return;
            armed = true;
            dragging = false;
            dragMoved = false;
            startX = e.clientX;
            startY = e.clientY;
            lastMoveX = e.clientX;
            lastMoveT = performance.now();
            lastSentSteps = 0;
            velocity = 0;
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
                queueShift(delta);
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
            if (flick) queueShift(flick);
            velocity = 0;
        };

        carouselWrapper.style.touchAction = 'pan-y';
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
        queueShift(offset);
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

    chrome.appendChild(header);
    chrome.appendChild(carouselWrapper);
    chrome.appendChild(blurb);

    controlsContainer.appendChild(prevBtn);
    controlsContainer.appendChild(nextBtn);
    chrome.appendChild(controlsContainer);

    slideshowContainer.appendChild(chrome);
    gamesContainer.appendChild(slideshowContainer);

    slideshowContainer.focus();
}

function renderGamesAsRandom(gamesToRender) {
    const gamesContainer = document.getElementById('games-container');
    const randomContainer = document.createElement('div');
    randomContainer.className = 'random-container random-container--slot';

    if (!gamesToRender || gamesToRender.length === 0) {
        randomContainer.innerHTML = `<div class="slot-empty">No games to spin.</div>`;
        gamesContainer.appendChild(randomContainer);
        return;
    }

    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let selectedIndex = Math.floor(Math.random() * gamesToRender.length);

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

    const resultActions = document.createElement('div');
    resultActions.className = 'slot-result-actions';

    result.appendChild(resultTitle);
    result.appendChild(resultMeta);
    result.appendChild(resultActions);

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
        const game = gamesToRender[idx];
        const platformName = game.platform || game.platformShortName || i18n.t('gameDetails.unknown');
        const ratingText = (game.rating !== undefined && game.rating !== null) ? `${game.rating}` : i18n.t('gameDetails.unknown');

        resultTitle.textContent = game.name;
        resultMeta.innerHTML = `
            <span class="slot-meta-pill">${platformName}</span>
            <span class="slot-meta-pill">Rating: ${ratingText}</span>
        `;

        resultActions.innerHTML = `
            <button class="action-btn launch-btn" data-game-id="${game.id}" data-action="launch">Launch</button>
            <button class="action-btn remove-btn" data-game-id="${game.id}" data-action="remove">Remove</button>
        `;
        resultActions.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', handleGameAction);
        });
    }

    const baseLen = gamesToRender.length;
    const repeatBlocks = Math.max(10, Math.ceil(60 / Math.max(1, baseLen)));
    const reelIndexToGameIndex = [];
    for (let b = 0; b < repeatBlocks; b++) {
        for (let i = 0; i < baseLen; i++) {
            reelIndexToGameIndex.push(i);
        }
    }

    reelIndexToGameIndex.forEach((gameIdx) => {
        const game = gamesToRender[gameIdx];
        const item = document.createElement('div');
        item.className = 'slot-item';
        item.innerHTML = `
            <img class="slot-item-image" src="${getGameImage(game)}" alt="${game.name}" loading="lazy" decoding="async" fetchpriority="low" />
            <div class="slot-item-caption">${game.name}</div>
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
            selectedIndex = Math.floor(Math.random() * gamesToRender.length);
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
                selectedIndex = Math.floor(Math.random() * gamesToRender.length);
                stopSpinTo(selectedIndex);
            }
        }

        rafId = requestAnimationFrame(tick);
    }

    leverBtn.addEventListener('click', startSpin);

    requestAnimationFrame(() => {
        measure();
        snapToGameIndex(selectedIndex);
        setResult(selectedIndex);
    });
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
                <img id="detail-game-image" src="" alt="${game.name}" class="detail-game-image" loading="lazy" decoding="async" fetchpriority="low" />
            </div>
            <div class="game-detail-row">
                <p><strong>Platform:</strong> ${game.platform || game.platformShortName || i18n.t('gameDetails.unknown')}</p>
                <p><strong>Rating:</strong> ${game.rating}</p>
                <p><strong>Genre:</strong> ${game.genre}</p>
                <p><strong>Price:</strong> ${game.price > 0 ? `$${game.price.toFixed(2)}` : 'Free'}</p>
            </div>
            <div class="game-detail-row" style="display:flex; gap:10px; flex-wrap:wrap; margin-top: 10px;">
                <button id="create-shortcut-btn" class="action-btn">Create Desktop Shortcut</button>
            </div>
        `;
        
        const gameImage = document.getElementById('detail-game-image');
        if (game.image) {
            gameImage.src = game.image;
        } else {
            const platformShortName = game.platformShortName.toLowerCase();
            gameImage.src = `emubro-resources/platforms/${platformShortName}/covers/default.jpg`;
        }

        const createShortcutBtn = document.getElementById('create-shortcut-btn');
        if (createShortcutBtn && window.emubro && typeof window.emubro.createGameShortcut === 'function') {
            createShortcutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                createShortcutBtn.disabled = true;
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
                    createShortcutBtn.disabled = false;
                }
            });
        }
    }
    
    const detailsFooter = document.getElementById('game-details-footer');
    if (detailsFooter) detailsFooter.style.display = 'block';
}
