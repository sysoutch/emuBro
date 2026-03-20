let activeMenuState = null;

function buildMenuIcon(iconKey) {
    switch (String(iconKey || '').trim()) {
        case 'play':
            return '<svg viewBox="0 0 24 24"><path d="m8 5 11 7-11 7z"></path></svg>';
        case 'details':
            return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M12 10v6"></path><path d="M12 7h.01"></path></svg>';
        case 'folder':
            return '<svg viewBox="0 0 24 24"><path d="M3 7h6l2 2h10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>';
        case 'copy':
            return '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"></rect><rect x="4" y="4" width="11" height="11" rx="2"></rect></svg>';
        case 'link':
            return '<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 1 0-7l1.5-1.5a5 5 0 0 1 7 7L17 13"></path><path d="M14 11a5 5 0 0 1 0 7L12.5 19.5a5 5 0 0 1-7-7L7 11"></path></svg>';
        case 'trash':
            return '<svg viewBox="0 0 24 24"><path d="M5 7h14"></path><path d="M9 7V5h6v2"></path><path d="M8 7l1 12h6l1-12"></path><path d="M10 11v5"></path><path d="M14 11v5"></path></svg>';
        default:
            return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"></circle></svg>';
    }
}

function closeActiveMenu() {
    if (!activeMenuState) return;
    const { menu, onPointerDown, onKeyDown, onResize, onScroll } = activeMenuState;
    try { menu.remove(); } catch (_error) {}
    document.removeEventListener('pointerdown', onPointerDown, true);
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('scroll', onScroll, true);
    activeMenuState = null;
}

async function copyText(text) {
    const value = String(text || '');
    if (!value) return false;
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(value);
            return true;
        }
    } catch (_error) {}

    try {
        const helper = document.createElement('textarea');
        helper.value = value;
        helper.setAttribute('readonly', 'true');
        helper.style.position = 'fixed';
        helper.style.opacity = '0';
        helper.style.pointerEvents = 'none';
        document.body.appendChild(helper);
        helper.select();
        document.execCommand('copy');
        helper.remove();
        return true;
    } catch (_error) {
        return false;
    }
}

function positionMenu(menu, clientX, clientY) {
    const margin = 12;
    const rect = menu.getBoundingClientRect();
    let left = Number(clientX || 0);
    let top = Number(clientY || 0);

    if (left + rect.width > window.innerWidth - margin) {
        left = window.innerWidth - rect.width - margin;
    }
    if (top + rect.height > window.innerHeight - margin) {
        top = window.innerHeight - rect.height - margin;
    }

    left = Math.max(margin, left);
    top = Math.max(margin, top);
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
}

function buildMenuItems(game, deps) {
    const t = (key, fallback) => {
        try {
            const value = deps.i18n?.t?.(key);
            if (typeof value === 'string' && value && value !== key) return value;
        } catch (_error) {}
        return fallback || key;
    };
    const hasFilePath = Boolean(String(game?.filePath || '').trim());
    return [
        {
            id: 'play',
            label: t('buttons.play', 'Play'),
            icon: 'play',
            action: () => deps.launchGame(game)
        },
        {
            id: 'details',
            label: t('gameDetails.title', 'Game Details'),
            icon: 'details',
            action: () => deps.showGameDetails(game)
        },
        { separator: true },
        {
            id: 'shortcut',
            label: t('gameDetails.createShortcut', 'Create Shortcut'),
            icon: 'link',
            disabled: !hasFilePath,
            action: async () => {
                const filePath = String(game?.filePath || '').trim();
                if (!filePath) {
                    deps.alertUser?.('Game file path is missing.');
                    return;
                }
                const result = await deps.emubro.invoke('create-game-shortcut', game.id);
                if (!result?.success) {
                    deps.alertUser?.(result?.message || 'Failed to create shortcut.');
                }
            }
        },
        { separator: true },
        {
            id: 'explorer',
            label: t('gameDetails.showInExplorer', 'Show in Explorer'),
            icon: 'folder',
            disabled: !hasFilePath,
            action: async () => {
                const filePath = String(game?.filePath || '').trim();
                if (!filePath) {
                    deps.alertUser?.('Game file path is missing.');
                    return;
                }
                const result = await deps.emubro.invoke('show-item-in-folder', filePath);
                if (!result?.success) {
                    deps.alertUser?.(result?.message || 'Failed to open file location.');
                }
            }
        },
        {
            id: 'copy-name',
            label: t('buttons.copyName', 'Copy Name'),
            icon: 'copy',
            action: async () => {
                const ok = await copyText(String(game?.name || ''));
                if (!ok) deps.alertUser?.('Failed to copy name.');
            }
        },
        {
            id: 'copy-path',
            label: t('buttons.copyPath', 'Copy File Path'),
            icon: 'link',
            disabled: !hasFilePath,
            action: async () => {
                const ok = await copyText(String(game?.filePath || ''));
                if (!ok) deps.alertUser?.('Failed to copy file path.');
            }
        },
        { separator: true },
        {
            id: 'youtube',
            label: t('gameDetails.searchOnYouTube', 'Search on YouTube'),
            icon: 'link',
            action: () => {
                const query = encodeURIComponent(String(game?.name || '').trim() || '');
                if (!query) {
                    deps.alertUser?.('Game name is missing.');
                    return;
                }
                const url = `https://www.youtube.com/results?search_query=${query}`;
                window.open(url, '_blank', 'noopener');
            }
        },
        { separator: true },
        {
            id: 'remove',
            label: t('gameDetails.removeGameAction', 'Remove Game'),
            icon: 'trash',
            danger: true,
            action: async () => {
                const gameName = String(game?.name || 'this game').trim() || 'this game';
                const confirmed = window.confirm(`Remove "${gameName}" from the library?`);
                if (!confirmed) return;
                await deps.removeGame(game);
            }
        }
    ];
}

export function attachGameCardContextMenu(target, gameOrGetter, deps = {}) {
    if (!(target instanceof Element) || !gameOrGetter) return;
    const resolveGame = typeof gameOrGetter === 'function' ? gameOrGetter : () => gameOrGetter;
    if (target.dataset.gameContextMenuBound === 'true') {
        target.__gameContextMenuResolver = resolveGame;
        target.__gameContextMenuDeps = deps;
        return;
    }
    target.dataset.gameContextMenuBound = 'true';
    target.__gameContextMenuResolver = resolveGame;
    target.__gameContextMenuDeps = deps;

    target.addEventListener('contextmenu', (event) => {
        const game = typeof target.__gameContextMenuResolver === 'function'
            ? target.__gameContextMenuResolver()
            : null;
        if (!game) return;
        const currentDeps = target.__gameContextMenuDeps || {};
        const emubro = currentDeps.emubro || window.emubro;
        const alertUser = typeof currentDeps.alertUser === 'function'
            ? currentDeps.alertUser
            : (message) => window.alert(String(message || ''));
        const runtimeDeps = {
            ...currentDeps,
            emubro,
            alertUser
        };
        event.preventDefault();
        event.stopPropagation();
        closeActiveMenu();

        const menu = document.createElement('div');
        menu.className = 'game-card-context-menu glass';
        menu.setAttribute('role', 'menu');
        menu.setAttribute('aria-label', `Actions for ${String(game?.name || 'game')}`);

        const items = buildMenuItems(game, runtimeDeps);
        items.forEach((item) => {
            if (item.separator) {
                const separator = document.createElement('div');
                separator.className = 'game-card-context-menu__separator';
                menu.appendChild(separator);
                return;
            }

            const button = document.createElement('button');
            button.type = 'button';
            button.className = `game-card-context-menu__item${item.danger ? ' is-danger' : ''}`;
            button.setAttribute('role', 'menuitem');
            if (item.disabled) {
                button.disabled = true;
            }
            button.innerHTML = `
                <span class="game-card-context-menu__label">${item.label}</span>
                <span class="game-card-context-menu__icon" aria-hidden="true">${buildMenuIcon(item.icon)}</span>
            `;
            button.addEventListener('click', async (clickEvent) => {
                clickEvent.preventDefault();
                clickEvent.stopPropagation();
                closeActiveMenu();
                await item.action?.();
            });
            menu.appendChild(button);
        });

        document.body.appendChild(menu);
        positionMenu(menu, event.clientX, event.clientY);

        const onPointerDown = (pointerEvent) => {
            if (menu.contains(pointerEvent.target)) return;
            closeActiveMenu();
        };
        const onKeyDown = (keyEvent) => {
            if (keyEvent.key === 'Escape') {
                keyEvent.preventDefault();
                closeActiveMenu();
            }
        };
        const onResize = () => closeActiveMenu();
        const onScroll = () => closeActiveMenu();

        activeMenuState = { menu, onPointerDown, onKeyDown, onResize, onScroll };
        document.addEventListener('pointerdown', onPointerDown, true);
        window.addEventListener('keydown', onKeyDown, true);
        window.addEventListener('resize', onResize);
        window.addEventListener('scroll', onScroll, true);
    });
}

export function closeGameCardContextMenu() {
    closeActiveMenu();
}
