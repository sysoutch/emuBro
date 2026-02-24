export function createMissingGameRecoveryActions(deps = {}) {
    const emubro = deps.emubro || window.emubro;
    const i18n = deps.i18n || window.i18n || { tf: (_k, vars) => String(vars?.message || '') };
    const escapeHtml = deps.escapeHtml || ((value) => String(value ?? ''));
    const reloadGamesFromMainAndRender = deps.reloadGamesFromMainAndRender || (async () => {});
    const buildLaunchPayload = typeof deps.buildLaunchPayload === 'function'
        ? deps.buildLaunchPayload
        : ((gameId) => Number(gameId || 0));
    const alertUser = typeof deps.alertUser === 'function'
        ? deps.alertUser
        : ((message) => window.alert(String(message || '')));
    const launchWarningPrefsKey = 'emuBro.launchWarningsByGame.v1';

    const dedupeWarningTypes = (entries = []) => Array.from(new Set(
        (Array.isArray(entries) ? entries : [])
            .map((entry) => String(entry || '').trim().toLowerCase())
            .filter(Boolean)
    ));

    const loadLaunchWarningPrefs = () => {
        try {
            const raw = localStorage.getItem(launchWarningPrefsKey);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return {};
            return parsed;
        } catch (_error) {
            return {};
        }
    };

    const saveLaunchWarningPrefs = (value) => {
        try {
            localStorage.setItem(launchWarningPrefsKey, JSON.stringify(value && typeof value === 'object' ? value : {}));
        } catch (_error) {}
    };

    const getAllowedWarningsForGame = (gameId) => {
        const targetId = String(Number(gameId || 0) || '');
        if (!targetId) return [];
        const prefs = loadLaunchWarningPrefs();
        return dedupeWarningTypes(prefs[targetId]);
    };

    const rememberWarningForGame = (gameId, warningType) => {
        const targetId = String(Number(gameId || 0) || '');
        const warning = String(warningType || '').trim().toLowerCase();
        if (!targetId || !warning) return;
        const prefs = loadLaunchWarningPrefs();
        const existing = dedupeWarningTypes(prefs[targetId]);
        prefs[targetId] = dedupeWarningTypes([...existing, warning]);
        saveLaunchWarningPrefs(prefs);
    };

    const mergeAllowWarningPayload = (gameId, payload = {}) => {
        const allowedByPrefs = getAllowedWarningsForGame(gameId);
        const allowedByPayload = dedupeWarningTypes(payload?.allowLaunchWarnings || []);
        const merged = dedupeWarningTypes([...allowedByPrefs, ...allowedByPayload]);
        if (merged.length === 0) return payload;
        return {
            ...(payload && typeof payload === 'object' ? payload : {}),
            allowLaunchWarnings: merged
        };
    };

    const invokeLaunch = async (gameId, extraPayload = {}) => {
        const mergedPayload = mergeAllowWarningPayload(gameId, extraPayload);
        const payload = buildLaunchPayload(gameId, mergedPayload);
        return emubro.invoke('launch-game', payload);
    };

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

    function showLaunchWarningDialog(warningResult) {
        return new Promise((resolve) => {
            const gameName = String(warningResult?.gameName || 'Game');
            const warningMessage = String(warningResult?.message || 'Launch warning');
            const warningType = String(warningResult?.warningType || 'warning').trim().toLowerCase();

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
                'width:min(560px,100%)',
                'border:1px solid var(--border-color)',
                'border-radius:14px',
                'background:var(--bg-secondary)',
                'padding:16px',
                'box-shadow:0 16px 34px rgba(0,0,0,0.42)'
            ].join(';');

            modal.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
                    <h3 style="margin:0;font-size:1.05rem;">Launch warning: ${escapeHtml(gameName)}</h3>
                    <button type="button" class="close-btn" aria-label="Close">&times;</button>
                </div>
                <p style="margin:10px 0 10px 0;color:var(--text-secondary);">${escapeHtml(warningMessage)}</p>
                <label style="display:flex;align-items:center;gap:8px;margin:0 0 14px 0;">
                    <input type="checkbox" data-launch-warning-remember />
                    <span>Remember this warning decision for this game</span>
                </label>
                <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;">
                    <button type="button" class="action-btn" data-launch-warning-action="cancel">Cancel</button>
                    <button type="button" class="action-btn launch-btn" data-launch-warning-action="continue">Continue Launch</button>
                </div>
            `;

            const close = (action) => {
                const rememberInput = modal.querySelector('[data-launch-warning-remember]');
                overlay.remove();
                resolve({
                    action: String(action || 'cancel'),
                    remember: !!rememberInput?.checked,
                    warningType
                });
            };

            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) close('cancel');
            });
            modal.querySelector('.close-btn')?.addEventListener('click', () => close('cancel'));
            modal.querySelectorAll('[data-launch-warning-action]').forEach((btn) => {
                btn.addEventListener('click', () => close(btn.getAttribute('data-launch-warning-action') || 'cancel'));
            });

            overlay.appendChild(modal);
            document.body.appendChild(overlay);
        });
    }

    async function handleLaunchWarning(gameId, warningResult) {
        const dialogResult = await showLaunchWarningDialog(warningResult);
        if (dialogResult.action !== 'continue') return false;

        const warningType = String(dialogResult.warningType || warningResult?.warningType || '').trim().toLowerCase();
        if (dialogResult.remember && warningType) {
            rememberWarningForGame(gameId, warningType);
        }

        const allowLaunchWarnings = dedupeWarningTypes([
            warningType,
            ...getAllowedWarningsForGame(gameId)
        ]);
        const retryResult = await invokeLaunch(gameId, { allowLaunchWarnings });
        if (retryResult?.success) {
            await emubro.invoke('update-game-metadata', {
                gameId: Number(gameId),
                lastPlayed: new Date().toISOString()
            });
            await reloadGamesFromMainAndRender();
            return true;
        }

        if (retryResult?.code === 'GAME_FILE_MISSING') {
            await handleMissingGameLaunch(gameId, retryResult);
            return false;
        }

        alertUser(i18n.tf('messages.launchFailed', { message: retryResult?.message || 'Unknown error' }));
        return false;
    }

    async function handleMissingGameLaunch(gameId, missingResult) {
        let currentMissing = missingResult;

        while (true) {
            const action = await showMissingGameDialog(currentMissing);

            if (action === 'remove') {
                const removeResult = await emubro.invoke('remove-game', gameId);
                if (!removeResult?.success) {
                    alertUser(removeResult?.message || 'Failed to remove game.');
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
                    alertUser(searchResult?.message || 'Search failed.');
                    continue;
                }
                if (!searchResult?.found) {
                    alertUser('File not found in that folder.');
                    continue;
                }

                await reloadGamesFromMainAndRender();
                const retryResult = await invokeLaunch(gameId);
                if (retryResult?.success) {
                    await emubro.invoke('update-game-metadata', {
                        gameId: Number(gameId),
                        lastPlayed: new Date().toISOString()
                    });
                    await reloadGamesFromMainAndRender();
                    return true;
                }
                if (retryResult?.code === 'GAME_FILE_MISSING') {
                    currentMissing = retryResult;
                    continue;
                }
                alertUser(i18n.tf('messages.launchFailed', { message: retryResult?.message || 'Unknown error' }));
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
                    alertUser(relinkResult?.message || 'Failed to relink game.');
                    continue;
                }

                await reloadGamesFromMainAndRender();
                const retryResult = await invokeLaunch(gameId);
                if (retryResult?.success) {
                    await emubro.invoke('update-game-metadata', {
                        gameId: Number(gameId),
                        lastPlayed: new Date().toISOString()
                    });
                    await reloadGamesFromMainAndRender();
                    return true;
                }
                if (retryResult?.code === 'GAME_FILE_MISSING') {
                    currentMissing = retryResult;
                    continue;
                }
                alertUser(i18n.tf('messages.launchFailed', { message: retryResult?.message || 'Unknown error' }));
                return false;
            }

            return false;
        }
    }

    async function launchGame(gameId) {
        const result = await invokeLaunch(gameId);
        if (result?.success) {
            await emubro.invoke('update-game-metadata', {
                gameId: Number(gameId),
                lastPlayed: new Date().toISOString()
            });
            await reloadGamesFromMainAndRender();
            return;
        }

        if (result?.code === 'GAME_FILE_MISSING') {
            await handleMissingGameLaunch(gameId, result);
            return;
        }

        if (result?.code === 'PSX_WARNING_CONFIRM_REQUIRED') {
            await handleLaunchWarning(gameId, result);
            return;
        }

        alertUser(i18n.tf('messages.launchFailed', { message: result?.message || 'Unknown error' }));
    }

    return {
        launchGame,
        showMissingGameDialog,
        handleMissingGameLaunch
    };
}
