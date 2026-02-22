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

        const title = document.createElement('span');
        title.className = 'games-group-header-title';
        title.textContent = String(group.label || 'Unknown');

        const count = document.createElement('span');
        count.className = 'games-group-header-count';
        count.textContent = `${Array.isArray(group.rows) ? group.rows.length : 0}`;

        const chevron = document.createElement('span');
        chevron.className = 'games-group-header-chevron';
        chevron.setAttribute('aria-hidden', 'true');

        header.appendChild(title);
        header.appendChild(count);
        header.appendChild(chevron);

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
