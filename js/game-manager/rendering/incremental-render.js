export function renderGamesIncremental(gamesToRender, activeView = 'cover', options = {}) {
    const gamesContainer = document.getElementById('games-container');
    if (!gamesContainer) return;

    const renderToken = options.renderToken;
    const getRenderToken = typeof options.getRenderToken === 'function' ? options.getRenderToken : () => renderToken;
    const setGamesScrollDetach = typeof options.setGamesScrollDetach === 'function'
        ? options.setGamesScrollDetach
        : () => {};
    const gameBatchSizeMap = options.gameBatchSizeMap || {};
    const createGameTableRow = typeof options.createGameTableRow === 'function' ? options.createGameTableRow : () => null;
    const createGameListItem = typeof options.createGameListItem === 'function' ? options.createGameListItem : () => null;
    const createGameCard = typeof options.createGameCard === 'function' ? options.createGameCard : () => null;
    const initializeLazyGameImages = typeof options.initializeLazyGameImages === 'function'
        ? options.initializeLazyGameImages
        : () => {};
    const cleanupLazyGameImages = typeof options.cleanupLazyGameImages === 'function'
        ? options.cleanupLazyGameImages
        : () => {};
    const applyFilters = typeof options.applyFilters === 'function' ? options.applyFilters : () => {};
    const getCurrentSort = typeof options.getCurrentSort === 'function' ? options.getCurrentSort : () => 'name';
    const setCurrentSort = typeof options.setCurrentSort === 'function' ? options.setCurrentSort : () => {};
    const getCurrentSortDir = typeof options.getCurrentSortDir === 'function' ? options.getCurrentSortDir : () => 'asc';
    const setCurrentSortDir = typeof options.setCurrentSortDir === 'function' ? options.setCurrentSortDir : () => {};

    const view = (activeView === 'list' || activeView === 'table') ? activeView : 'cover';
    const resolveBatchSize = () => {
        const baseBatchSize = gameBatchSizeMap[view] || gameBatchSizeMap.cover || 0;
        if (view !== 'cover') return baseBatchSize;

        const rootStyles = getComputedStyle(document.documentElement);
        const rawScale = Number.parseFloat(String(
            rootStyles.getPropertyValue('--view-scale-user')
            || rootStyles.getPropertyValue('--view-scale')
            || '1'
        ).trim());
        const scale = Number.isFinite(rawScale) && rawScale > 0 ? rawScale : 1;
        const minCardWidth = 250 * scale;
        const gap = 20 * scale;
        const containerWidth = Math.max(
            280,
            Number(gamesContainer.clientWidth || gamesContainer.getBoundingClientRect?.().width || 0)
        );
        const columns = Math.max(1, Math.floor((containerWidth + gap) / (minCardWidth + gap)));
        return Math.max(columns, Math.ceil(baseBatchSize / columns) * columns);
    };
    const batchSize = resolveBatchSize();
    const totalGames = Array.isArray(gamesToRender) ? gamesToRender.length : 0;
    const totalChunks = Math.ceil(totalGames / batchSize);
    const minChunksInDom = view === 'cover' ? 1 : 2;
    const hardMaxChunksInDom = view === 'cover' ? 3 : (view === 'table' ? 6 : 6);

    let mountTarget = null;
    let topSpacer = null;
    let bottomSpacer = null;

    if (view === 'table') {
        const table = document.createElement('table');
        table.className = 'games-table';
        
        const makeHeader = (label, key) => {
            const currentSort = getCurrentSort();
            const currentSortDir = getCurrentSortDir();
            const isSort = currentSort === key;
            const dirArrow = isSort ? (currentSortDir === 'asc' ? ' \u2191' : ' \u2193') : '';
            return `<th data-sort-key="${key}" style="cursor:pointer;user-select:none;">${label}${dirArrow}</th>`;
        };

        table.innerHTML = `
            <thead>
                <tr>
                    <th>Cover</th>
                    ${makeHeader('Game', 'name')}
                    ${makeHeader('Genre', 'genre')}
                    ${makeHeader('Rating', 'rating')}
                    ${makeHeader('Platform', 'platform')}
                    ${makeHeader('Status', 'status')}
                </tr>
            </thead>
            <tbody class="games-virtual-host-table"></tbody>
        `;
        
        table.querySelectorAll('th[data-sort-key]').forEach(th => {
            th.addEventListener('click', () => {
                const key = th.dataset.sortKey;
                const currentSort = getCurrentSort();
                const currentSortDir = getCurrentSortDir();
                if (currentSort === key) {
                    setCurrentSortDir(currentSortDir === 'asc' ? 'desc' : 'asc');
                } else {
                    setCurrentSort(key);
                    setCurrentSortDir('asc');
                }
                applyFilters();
            });
        });

        mountTarget = table.querySelector('tbody');
        topSpacer = document.createElement('tr');
        topSpacer.className = 'games-virtual-table-spacer';
        topSpacer.innerHTML = '<td colspan="6"></td>';
        bottomSpacer = document.createElement('tr');
        bottomSpacer.className = 'games-virtual-table-spacer';
        bottomSpacer.innerHTML = '<td colspan="6"></td>';
        mountTarget.appendChild(topSpacer);
        mountTarget.appendChild(bottomSpacer);
        gamesContainer.appendChild(table);
    } else {
        const host = document.createElement('div');
        host.className = `games-virtual-host games-virtual-host-${view}`;
        mountTarget = host;
        topSpacer = document.createElement('div');
        topSpacer.className = 'games-virtual-spacer';
        bottomSpacer = document.createElement('div');
        bottomSpacer.className = 'games-virtual-spacer';
        mountTarget.appendChild(topSpacer);
        mountTarget.appendChild(bottomSpacer);
        if (view === 'list') {
            host.classList.add('games-list');
        }
        gamesContainer.appendChild(host);
    }

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
    const isTableView = view === 'table';
    const renderedChunks = new Map();
    const chunkHeights = new Map();
    let topSpacerHeight = 0;
    let bottomSpacerHeight = 0;
    let loadedTop = 0;
    let loadedBottom = -1;
    let highestLoadedChunk = -1;
    let completedLoadIndicatorShown = false;

    const setSpacerHeight = (spacer, height) => {
        const value = Math.max(0, Number(height) || 0);
        if (!spacer) return;
        if (isTableView) {
            const cell = spacer.querySelector('td');
            if (cell) {
                cell.style.height = `${Math.round(value)}px`;
                cell.style.padding = '0';
                cell.style.border = 'none';
            }
            spacer.style.display = value > 0 ? 'table-row' : 'none';
        } else {
            spacer.style.height = `${Math.round(value)}px`;
            spacer.style.display = value > 0 ? 'block' : 'none';
        }
    };

    setSpacerHeight(topSpacer, 0);
    setSpacerHeight(bottomSpacer, 0);

    const getRenderedChunkCount = () => (loadedBottom >= loadedTop ? (loadedBottom - loadedTop + 1) : 0);
    const getAverageMeasuredChunkHeight = () => {
        const values = Array.from(chunkHeights.values()).filter((value) => Number(value) > 0);
        if (!values.length) return 0;
        return values.reduce((sum, value) => sum + Number(value), 0) / values.length;
    };
    const estimateTypicalChunkHeight = () => {
        const measuredAverage = getAverageMeasuredChunkHeight();
        if (measuredAverage > 0) return measuredAverage;
        return view === 'cover' ? 720 : (view === 'table' ? 640 : 560);
    };
    const getMaxChunksInDom = (viewportHeight = 0) => {
        const vp = Math.max(1, Number(viewportHeight) || 0);
        const estimatedHeight = Math.max(1, estimateTypicalChunkHeight());
        const visibleChunks = Math.max(1, Math.ceil(vp / estimatedHeight));
        const target = Math.max(1, Math.ceil(visibleChunks * 1.5));
        return Math.max(minChunksInDom, Math.min(hardMaxChunksInDom, target));
    };

    const getChunkSlice = (chunkIndex) => {
        const start = chunkIndex * batchSize;
        const end = Math.min(totalGames, start + batchSize);
        return gamesToRender.slice(start, end);
    };

    const createChunk = (chunkIndex) => {
        const rows = getChunkSlice(chunkIndex);
        if (rows.length === 0) return null;

        if (isTableView) {
            return {
                index: chunkIndex,
                rows: rows.map((game) => createGameTableRow(game))
            };
        }

        const chunkEl = document.createElement('div');
        chunkEl.className = `games-virtual-chunk games-virtual-chunk-${view}`;
        const fragment = document.createDocumentFragment();
        rows.forEach((game) => {
            if (view === 'list') {
                fragment.appendChild(createGameListItem(game));
            } else {
                fragment.appendChild(createGameCard(game));
            }
        });
        chunkEl.appendChild(fragment);
        return { index: chunkIndex, el: chunkEl };
    };

    const estimateChunkHeight = (chunk) => {
        if (!chunk) return 0;
        if (isTableView) {
            return (Array.isArray(chunk.rows) ? chunk.rows : []).reduce((sum, row) => {
                return sum + (row?.getBoundingClientRect?.().height || 0);
            }, 0);
        }
        return chunk.el?.getBoundingClientRect?.().height || 0;
    };

    const persistChunkHeight = (chunkIndex, chunk) => {
        const measured = estimateChunkHeight(chunk);
        const fallback = chunkHeights.get(chunkIndex) || 0;
        const height = measured > 0 ? measured : fallback;
        if (height > 0) {
            chunkHeights.set(chunkIndex, height);
        }
        return height;
    };

    const removeChunkNodes = (chunk) => {
        if (!chunk) return;
        if (isTableView) {
            (Array.isArray(chunk.rows) ? chunk.rows : []).forEach((row) => {
                cleanupLazyGameImages(row);
                row?.remove?.();
            });
            return;
        }
        cleanupLazyGameImages(chunk.el);
        chunk.el?.remove?.();
    };

    const insertChunkNodes = (chunk, atTop = false) => {
        if (!chunk) return;
        if (isTableView) {
            const anchor = atTop ? (topSpacer.nextSibling || bottomSpacer) : bottomSpacer;
            (Array.isArray(chunk.rows) ? chunk.rows : []).forEach((row) => {
                mountTarget.insertBefore(row, anchor);
            });
            initializeLazyGameImages(mountTarget);
            return;
        }

        const anchor = atTop ? (topSpacer.nextSibling || bottomSpacer) : bottomSpacer;
        mountTarget.insertBefore(chunk.el, anchor);
        initializeLazyGameImages(chunk.el);
    };

    const updateTopSpacer = (nextHeight) => {
        topSpacerHeight = Math.max(0, Number(nextHeight) || 0);
        setSpacerHeight(topSpacer, topSpacerHeight);
    };

    const updateBottomSpacer = (nextHeight) => {
        bottomSpacerHeight = Math.max(0, Number(nextHeight) || 0);
        setSpacerHeight(bottomSpacer, bottomSpacerHeight);
    };

    const maybeShowProgress = () => {
        if (!showIndicator) return;
        const loadedGames = Math.min(totalGames, (highestLoadedChunk + 1) * batchSize);
        if (highestLoadedChunk >= totalChunks - 1) {
            if (!completedLoadIndicatorShown) {
                completedLoadIndicatorShown = true;
                setIndicator(`All ${totalGames} games loaded`, true);
                if (indicatorTimer) window.clearTimeout(indicatorTimer);
                window.setTimeout(() => indicator.remove(), 2200);
            }
            return;
        }
        const shouldShow = loadedGames >= (batchSize * 2);
        if (shouldShow) {
            setIndicator(`Loaded ${loadedGames} / ${totalGames}`);
        }
    };

    const insertChunkAtBottom = (chunkIndex) => {
        if (chunkIndex < 0 || chunkIndex >= totalChunks) return false;
        if (renderedChunks.has(chunkIndex)) return false;

        const existingHeight = chunkHeights.get(chunkIndex) || 0;
        if (existingHeight > 0 && bottomSpacerHeight > 0) {
            updateBottomSpacer(bottomSpacerHeight - existingHeight);
        }

        const chunk = createChunk(chunkIndex);
        if (!chunk) return false;
        insertChunkNodes(chunk, false);
        renderedChunks.set(chunkIndex, chunk);
        loadedBottom = chunkIndex;
        if (loadedTop > loadedBottom) loadedTop = loadedBottom;
        highestLoadedChunk = Math.max(highestLoadedChunk, chunkIndex);

        requestAnimationFrame(() => {
            if (renderToken !== getRenderToken()) return;
            persistChunkHeight(chunkIndex, chunk);
        });

        return true;
    };

    const insertChunkAtTop = (chunkIndex) => {
        if (chunkIndex < 0 || chunkIndex >= totalChunks) return false;
        if (renderedChunks.has(chunkIndex)) return false;

        const existingHeight = chunkHeights.get(chunkIndex) || 0;
        if (existingHeight > 0 && topSpacerHeight > 0) {
            updateTopSpacer(topSpacerHeight - existingHeight);
        }

        const chunk = createChunk(chunkIndex);
        if (!chunk) return false;
        insertChunkNodes(chunk, true);
        renderedChunks.set(chunkIndex, chunk);
        loadedTop = chunkIndex;
        if (loadedBottom < loadedTop) loadedBottom = loadedTop;

        requestAnimationFrame(() => {
            if (renderToken !== getRenderToken()) return;
            persistChunkHeight(chunkIndex, chunk);
        });

        return true;
    };

    const removeChunkFromTop = () => {
        if (getRenderedChunkCount() <= 0) return false;
        const chunkIndex = loadedTop;
        const chunk = renderedChunks.get(chunkIndex);
        if (!chunk) return false;
        const height = persistChunkHeight(chunkIndex, chunk);
        removeChunkNodes(chunk);
        renderedChunks.delete(chunkIndex);
        loadedTop += 1;
        updateTopSpacer(topSpacerHeight + height);
        return true;
    };

    const removeChunkFromBottom = () => {
        if (getRenderedChunkCount() <= 0) return false;
        const chunkIndex = loadedBottom;
        const chunk = renderedChunks.get(chunkIndex);
        if (!chunk) return false;
        const height = persistChunkHeight(chunkIndex, chunk);
        removeChunkNodes(chunk);
        renderedChunks.delete(chunkIndex);
        loadedBottom -= 1;
        updateBottomSpacer(bottomSpacerHeight + height);
        return true;
    };

    const getChunkHeightEstimateByIndex = (chunkIndex) => {
        const known = Number(chunkHeights.get(chunkIndex) || 0);
        if (known > 0) return known;
        return Math.max(1, estimateTypicalChunkHeight());
    };

    const sumChunkHeights = (startInclusive, endExclusive) => {
        const from = Math.max(0, Number(startInclusive) || 0);
        const to = Math.min(totalChunks, Math.max(from, Number(endExclusive) || 0));
        let sum = 0;
        for (let i = from; i < to; i += 1) {
            sum += getChunkHeightEstimateByIndex(i);
        }
        return Math.max(0, sum);
    };

    const clearRenderedWindow = () => {
        renderedChunks.forEach((chunk) => {
            removeChunkNodes(chunk);
        });
        renderedChunks.clear();
        loadedTop = 0;
        loadedBottom = -1;
    };

    const resetWindowToRange = (startIndex, endIndex) => {
        if (totalChunks <= 0) return;
        const safeStart = Math.max(0, Math.min(totalChunks - 1, Number(startIndex) || 0));
        const safeEnd = Math.max(safeStart, Math.min(totalChunks - 1, Number(endIndex) || safeStart));

        clearRenderedWindow();
        updateTopSpacer(sumChunkHeights(0, safeStart));
        updateBottomSpacer(sumChunkHeights(safeEnd + 1, totalChunks));

        loadedTop = safeStart;
        loadedBottom = safeStart - 1;
        for (let i = safeStart; i <= safeEnd; i += 1) {
            const chunk = createChunk(i);
            if (!chunk) continue;
            insertChunkNodes(chunk, false);
            renderedChunks.set(i, chunk);
            loadedBottom = i;
            highestLoadedChunk = Math.max(highestLoadedChunk, i);
            requestAnimationFrame(() => {
                if (renderToken !== getRenderToken()) return;
                persistChunkHeight(i, chunk);
            });
        }

        maybeShowProgress();
    };

    const stepDown = () => {
        if (loadedBottom >= totalChunks - 1) return false;
        const nextChunk = loadedBottom + 1;
        const inserted = insertChunkAtBottom(nextChunk);
        if (!inserted) return false;
        maybeShowProgress();
        return true;
    };

    const stepUp = () => {
        if (loadedTop <= 0) return false;
        const prevChunk = loadedTop - 1;
        const inserted = insertChunkAtTop(prevChunk);
        if (!inserted) return false;
        return true;
    };

    const initialChunks = Math.min(
        totalChunks,
        view === 'cover'
            ? Math.max(minChunksInDom, Math.min(2, hardMaxChunksInDom))
            : Math.max(minChunksInDom, Math.min(3, hardMaxChunksInDom))
    );
    for (let i = 0; i < initialChunks; i += 1) {
        if (!stepDown()) break;
    }

    if (totalChunks <= initialChunks) {
        maybeShowProgress();
        return;
    }

    const scrollRoot = document.querySelector('.game-scroll-body') || document.querySelector('main.game-grid') || gamesContainer.parentElement || null;
    if (!scrollRoot) return;

    const nearEdgeThreshold = view === 'cover' ? 680 : 420;
    let scrollTicking = false;
    let lastScrollTop = Number(scrollRoot.scrollTop || 0);
    let userScrollIntentUntil = 0;

    const markUserScrollIntent = () => {
        userScrollIntentUntil = Date.now() + 1600;
    };

    const onUserWheelIntent = () => {
        markUserScrollIntent();
    };

    const onUserPointerIntent = () => {
        markUserScrollIntent();
    };

    const onUserTouchIntent = () => {
        markUserScrollIntent();
    };

    const onUserKeyIntent = (event) => {
        const key = String(event?.key || '').toLowerCase();
        if (!key) return;
        if (key === 'arrowup' || key === 'arrowdown' || key === 'pageup' || key === 'pagedown' || key === 'home' || key === 'end' || key === ' ') {
            markUserScrollIntent();
        }
    };

    scrollRoot.addEventListener('wheel', onUserWheelIntent, { passive: true });
    scrollRoot.addEventListener('pointerdown', onUserPointerIntent, { passive: true });
    scrollRoot.addEventListener('touchstart', onUserTouchIntent, { passive: true });
    window.addEventListener('keydown', onUserKeyIntent, true);

    const onWheel = (e) => {
        if (!e.ctrlKey) return;
        e.preventDefault();
        const slider = document.getElementById('view-size-slider');
        if (!slider || slider.disabled) return;
        const current = parseInt(slider.value, 10);
        const next = e.deltaY < 0 ? Math.min(140, current + 5) : Math.max(70, current - 5);
        slider.value = String(next);
        slider.dispatchEvent(new Event('input', { bubbles: true }));
    };
    gamesContainer.addEventListener('wheel', onWheel, { passive: false });

    const getTargetChunkIndexForViewport = (scrollTop, viewportHeight, scrollHeight) => {
        if (totalChunks <= 0) return 0;
        const typical = Math.max(1, estimateTypicalChunkHeight());
        const loadedStart = Math.max(0, topSpacerHeight);
        const loadedEnd = Math.max(loadedStart, scrollHeight - bottomSpacerHeight);
        const viewportBottom = scrollTop + viewportHeight;

        let target = loadedTop;
        if (loadedBottom < loadedTop) {
            target = Math.floor(scrollTop / typical);
        } else if (scrollTop < loadedStart) {
            const missingPx = loadedStart - scrollTop;
            target = loadedTop - Math.ceil(missingPx / typical);
        } else if (viewportBottom > loadedEnd) {
            const missingPx = viewportBottom - loadedEnd;
            target = loadedBottom + Math.ceil(missingPx / typical);
        } else {
            const insideOffsetPx = scrollTop - loadedStart;
            target = loadedTop + Math.floor(insideOffsetPx / typical);
        }

        return Math.max(0, Math.min(totalChunks - 1, target));
    };

    const getRangeAroundChunk = (chunkIndex, desiredCount) => {
        const count = Math.max(
            minChunksInDom,
            Math.min(hardMaxChunksInDom, Math.max(1, Number(desiredCount) || minChunksInDom))
        );
        const half = Math.floor(count / 2);
        const start = Math.max(0, chunkIndex - half);
        const end = Math.min(totalChunks - 1, start + count - 1);
        return { start, end };
    };

    const processScroll = () => {
        if (renderToken !== getRenderToken()) return;
        if (!scrollRoot.isConnected) return;
        const scrollTop = Number(scrollRoot.scrollTop || 0);
        const viewportHeight = Number(scrollRoot.clientHeight || 0);
        const scrollHeight = Number(scrollRoot.scrollHeight || 0);
        const delta = scrollTop - lastScrollTop;
        lastScrollTop = scrollTop;

        const scrollDirection = delta > 0 ? 1 : (delta < 0 ? -1 : 0);

        const distanceToLoadedTop = Math.max(0, scrollTop - topSpacerHeight);
        const distanceToLoadedBottom = Math.max(0, (scrollHeight - bottomSpacerHeight) - (scrollTop + viewportHeight));

        const hardNearTop = scrollTop <= 4;
        const hardNearBottom = (scrollTop + viewportHeight) >= (scrollHeight - 4);

        const nearTop = distanceToLoadedTop <= nearEdgeThreshold;
        const nearBottom = distanceToLoadedBottom <= nearEdgeThreshold;
        const hasUserIntent = Date.now() <= userScrollIntentUntil;
        const underfilledViewport = scrollHeight <= (viewportHeight + 24);

        // Ignore non-user layout/reflow scroll unless we're pinned to a hard edge
        // where we still need to continue incremental loading.
        if (!hasUserIntent && !hardNearTop && !hardNearBottom && !underfilledViewport) {
            return;
        }

        const maxChunksInDom = getMaxChunksInDom(viewportHeight);
        const pruneLimit = Math.max(minChunksInDom, maxChunksInDom);
        const targetChunkIndex = getTargetChunkIndexForViewport(scrollTop, viewportHeight, scrollHeight);
        if (targetChunkIndex < loadedTop || targetChunkIndex > loadedBottom) {
            const { start, end } = getRangeAroundChunk(targetChunkIndex, Math.max(minChunksInDom, maxChunksInDom));
            resetWindowToRange(start, end);
            return;
        }

        // At hard edges, allow loading even when scroll delta is zero (common at the
        // physical bottom/top where extra wheel events no longer move scrollTop).
        const shouldLoadDown = (nearBottom && scrollDirection > 0) || (hardNearBottom && loadedBottom < totalChunks - 1);
        const shouldLoadUp = (nearTop && scrollDirection < 0) || (hardNearTop && loadedTop > 0);

        // Prevent chunk thrashing near boundaries: prefer one direction per tick.
        if (shouldLoadDown && (!shouldLoadUp || scrollDirection > 0 || distanceToLoadedBottom <= distanceToLoadedTop)) {
            stepDown();
        } else if (shouldLoadUp) {
            stepUp();
        }

        while (getRenderedChunkCount() > pruneLimit) {
            if (scrollDirection > 0) {
                if (!removeChunkFromTop()) break;
                continue;
            }
            if (scrollDirection < 0) {
                if (!removeChunkFromBottom()) break;
                continue;
            }
            // No clear direction: prune the farther side first.
            if (distanceToLoadedBottom > distanceToLoadedTop) {
                if (!removeChunkFromBottom()) {
                    if (!removeChunkFromTop()) break;
                }
            } else {
                if (!removeChunkFromTop()) {
                    if (!removeChunkFromBottom()) break;
                }
            }
        }
    };

    const onScroll = () => {
        if (scrollTicking) return;
        scrollTicking = true;
        requestAnimationFrame(() => {
            scrollTicking = false;
            processScroll();
        });
    };

    scrollRoot.addEventListener('scroll', onScroll, { passive: true });
    setGamesScrollDetach(() => {
        scrollRoot.removeEventListener('scroll', onScroll);
        scrollRoot.removeEventListener('wheel', onUserWheelIntent);
        scrollRoot.removeEventListener('pointerdown', onUserPointerIntent);
        scrollRoot.removeEventListener('touchstart', onUserTouchIntent);
        window.removeEventListener('keydown', onUserKeyIntent, true);
        gamesContainer.removeEventListener('wheel', onWheel);
        if (indicatorTimer) {
            window.clearTimeout(indicatorTimer);
            indicatorTimer = null;
        }
        indicator.remove();
    });

    // Run once to fill viewport if initial chunks are not enough.
    processScroll();
}
