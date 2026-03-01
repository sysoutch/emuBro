export function renderRemoteLibraryTool({ t, escapeHtml, showTextInputDialog, log = console }) {
    const gamesContainer = document.getElementById('games-container');
    if (!gamesContainer) return;

    const toolContent = document.createElement('div');
    toolContent.className = 'tool-content remote-library-tool';
    toolContent.innerHTML = `
        <h3>${escapeHtml(t('tools.remoteLibrary', 'Remote Library'))}</h3>
        <p>${escapeHtml(t('tools.remoteLibraryDesc', 'Discover emuBro hosts on your LAN, pair with a code, then browse and copy games or files.'))}</p>
        <div class="remote-library-grid">
            <section class="remote-library-panel">
                <h4>${escapeHtml(t('tools.remoteLibraryHost', 'Host (This Device)'))}</h4>
                <label class="toggle-row">
                    <input type="checkbox" data-remote-host-enabled />
                    <span>${escapeHtml(t('tools.remoteLibraryEnableHost', 'Enable remote host'))}</span>
                </label>
                <div class="remote-library-inline">
                    <label>${escapeHtml(t('tools.remoteLibraryPort', 'Host Port'))}</label>
                    <input type="number" min="1" max="65535" step="1" data-remote-host-port />
                </div>
                <div class="remote-library-inline">
                    <label>${escapeHtml(t('tools.remoteLibraryDiscoveryPort', 'Discovery Port'))}</label>
                    <input type="number" min="1" max="65535" step="1" data-remote-host-discovery />
                </div>
                <div class="remote-library-inline">
                    <label>${escapeHtml(t('tools.remoteLibraryAllowedRoots', 'Allowed transfer roots'))}</label>
                    <textarea rows="3" data-remote-host-roots placeholder="/mnt/games"></textarea>
                </div>
                <div class="remote-library-inline">
                    <button type="button" class="action-btn" data-remote-host-save>${escapeHtml(t('buttons.save', 'Save'))}</button>
                    <button type="button" class="action-btn" data-remote-host-rotate>${escapeHtml(t('tools.remoteLibraryRotateCode', 'New Pairing Code'))}</button>
                </div>
                <div class="tool-output" data-remote-host-status></div>
                <div class="tool-output" data-remote-host-pairing></div>
            </section>
            <section class="remote-library-panel">
                <h4>${escapeHtml(t('tools.remoteLibraryClient', 'Client (Remote Hosts)'))}</h4>
                <div class="remote-library-inline">
                    <button type="button" class="action-btn" data-remote-scan>${escapeHtml(t('tools.remoteLibraryScan', 'Scan LAN'))}</button>
                    <button type="button" class="action-btn" data-remote-clear>${escapeHtml(t('tools.remoteLibraryClear', 'Clear'))}</button>
                </div>
                <div class="remote-library-hosts" data-remote-hosts></div>
            </section>
        </div>
        <div class="remote-library-panel">
            <h4>${escapeHtml(t('tools.remoteLibraryGames', 'Remote Games'))}</h4>
            <div class="remote-library-actions">
                <button type="button" class="action-btn" data-remote-copy>${escapeHtml(t('tools.remoteLibraryCopy', 'Copy Selected'))}</button>
                <button type="button" class="action-btn" data-remote-copy-run>${escapeHtml(t('tools.remoteLibraryCopyRun', 'Copy + Run'))}</button>
            </div>
            <div class="remote-library-games" data-remote-games></div>
            <div class="remote-library-inline">
                <label>${escapeHtml(t('tools.remoteLibraryManualPath', 'Manual file path'))}</label>
                <input type="text" data-remote-manual-path placeholder="/path/to/file.7z" />
                <button type="button" class="action-btn" data-remote-manual-download>${escapeHtml(t('tools.remoteLibraryDownloadFile', 'Download File'))}</button>
            </div>
            <div class="tool-output" data-remote-status></div>
        </div>
    `;
    gamesContainer.appendChild(toolContent);

    const statusEl = toolContent.querySelector('[data-remote-status]');
    const hostStatusEl = toolContent.querySelector('[data-remote-host-status]');
    const hostPairingEl = toolContent.querySelector('[data-remote-host-pairing]');
    const hostEnabledEl = toolContent.querySelector('[data-remote-host-enabled]');
    const hostPortEl = toolContent.querySelector('[data-remote-host-port]');
    const hostDiscoveryEl = toolContent.querySelector('[data-remote-host-discovery]');
    const hostRootsEl = toolContent.querySelector('[data-remote-host-roots]');
    const hostSaveBtn = toolContent.querySelector('[data-remote-host-save]');
    const hostRotateBtn = toolContent.querySelector('[data-remote-host-rotate]');
    const scanBtn = toolContent.querySelector('[data-remote-scan]');
    const clearBtn = toolContent.querySelector('[data-remote-clear]');
    const hostsEl = toolContent.querySelector('[data-remote-hosts]');
    const gamesEl = toolContent.querySelector('[data-remote-games]');
    const copyBtn = toolContent.querySelector('[data-remote-copy]');
    const copyRunBtn = toolContent.querySelector('[data-remote-copy-run]');
    const manualPathEl = toolContent.querySelector('[data-remote-manual-path]');
    const manualDownloadBtn = toolContent.querySelector('[data-remote-manual-download]');

    let clientHosts = [];
    let activeHost = null;
    let remoteGames = [];

    const setStatus = (message, level = 'info') => {
        if (!statusEl) return;
        statusEl.textContent = String(message || '').trim();
        statusEl.dataset.level = String(level || 'info');
    };

    const setHostStatus = (message) => {
        if (!hostStatusEl) return;
        hostStatusEl.textContent = String(message || '').trim();
    };

    const setHostPairing = (message) => {
        if (!hostPairingEl) return;
        hostPairingEl.textContent = String(message || '').trim();
    };

    const joinPath = (...parts) => {
        return parts
            .map((part) => String(part || '').replace(/[\\/]+$/, ''))
            .filter(Boolean)
            .join('/');
    };

    const sanitizeSegment = (value) => String(value || '')
        .replace(/[<>:"/\\|?*]/g, '_')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 120) || 'remote';

    const renderHosts = () => {
        if (!hostsEl) return;
        if (clientHosts.length === 0) {
            hostsEl.innerHTML = `<div class="remote-host-row is-empty">${escapeHtml(t('tools.remoteLibraryNoHosts', 'No hosts yet. Scan your LAN to discover hosts.'))}</div>`;
            return;
        }
        hostsEl.innerHTML = clientHosts.map((host, idx) => {
            const label = host.name || host.address || host.hostId || 'Host';
            const paired = !!host.token;
            return `
                <div class="remote-host-row ${activeHost && activeHost.hostId === host.hostId ? 'is-active' : ''}">
                    <div>
                        <div class="remote-host-name">${escapeHtml(label)}</div>
                        <div class="remote-host-meta">${escapeHtml(host.url || `http://${host.address}:${host.port}`)}</div>
                    </div>
                    <div class="remote-host-actions">
                        <button type="button" class="action-btn small" data-remote-host-action="pair" data-idx="${idx}">${escapeHtml(paired ? t('tools.remoteLibraryPaired', 'Paired') : t('tools.remoteLibraryPair', 'Pair'))}</button>
                        <button type="button" class="action-btn small" data-remote-host-action="browse" data-idx="${idx}">${escapeHtml(t('tools.remoteLibraryBrowse', 'Browse'))}</button>
                    </div>
                </div>
            `;
        }).join('');

        hostsEl.querySelectorAll('[data-remote-host-action]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const idx = Number(btn.dataset.idx || -1);
                const action = String(btn.dataset.remoteHostAction || '').trim();
                if (!Number.isFinite(idx) || !clientHosts[idx]) return;
                const host = clientHosts[idx];
                if (action === 'pair') {
                    const code = await showTextInputDialog({
                        title: t('tools.remoteLibraryPair', 'Pair'),
                        message: t('tools.remoteLibraryEnterCode', 'Enter pairing code from host:'),
                        placeholder: '123456'
                    });
                    if (!code) return;
                    try {
                        const result = await window.emubro.invoke('remote:client:pair', {
                            hostUrl: host.url || `http://${host.address}:${host.port}`,
                            code,
                            clientName: sanitizeSegment(window.navigator?.userAgent || 'emuBro')
                        });
                        if (!result?.success) {
                            setStatus(result?.message || t('tools.remoteLibraryPairFailed', 'Pairing failed.'), 'error');
                            return;
                        }
                        const token = result?.result?.token || '';
                        if (token) {
                            host.token = token;
                            host.hostId = result?.result?.host?.hostId || host.hostId;
                            await window.emubro.invoke('remote:client:set-hosts', { hosts: clientHosts });
                            setStatus(t('tools.remoteLibraryPairSuccess', 'Paired successfully.'), 'success');
                            renderHosts();
                        }
                    } catch (error) {
                        setStatus(String(error?.message || error || t('tools.remoteLibraryPairFailed', 'Pairing failed.')), 'error');
                    }
                }
                if (action === 'browse') {
                    activeHost = host;
                    await loadRemoteGames();
                }
            });
        });
    };

    const renderGames = () => {
        if (!gamesEl) return;
        if (!activeHost) {
            gamesEl.innerHTML = `<div class="remote-game-row is-empty">${escapeHtml(t('tools.remoteLibrarySelectHost', 'Select a host to browse games.'))}</div>`;
            return;
        }
        if (!remoteGames.length) {
            gamesEl.innerHTML = `<div class="remote-game-row is-empty">${escapeHtml(t('tools.remoteLibraryNoGames', 'No games returned from host.'))}</div>`;
            return;
        }
        gamesEl.innerHTML = remoteGames.map((game, idx) => `
            <label class="remote-game-row">
                <input type="checkbox" data-remote-game-idx="${idx}" />
                <span class="remote-game-title">${escapeHtml(game.title || 'Unknown')}</span>
                <span class="remote-game-meta">${escapeHtml(game.platform || game.platformShortName || '')}</span>
            </label>
        `).join('');
    };

    const loadHostConfig = async () => {
        try {
            const response = await window.emubro.invoke('remote:host:get-config');
            if (response?.success) {
                const cfg = response.config || {};
                if (hostEnabledEl) hostEnabledEl.checked = !!cfg.enabled;
                if (hostPortEl) hostPortEl.value = Number(cfg.port || 0);
                if (hostDiscoveryEl) hostDiscoveryEl.value = Number(cfg.discoveryPort || 0);
                if (hostRootsEl) hostRootsEl.value = Array.isArray(cfg.allowedRoots) ? cfg.allowedRoots.join('\n') : '';
            }
            const status = await window.emubro.invoke('remote:host:get-status');
            if (status?.success) {
                const running = status?.status?.running;
                const port = status?.status?.port;
                setHostStatus(running
                    ? t('tools.remoteLibraryHostRunning', 'Host running on port {{port}}', { port })
                    : t('tools.remoteLibraryHostStopped', 'Host is stopped'));
            }
            const pairing = await window.emubro.invoke('remote:host:get-pairing');
            if (pairing?.success) {
                setHostPairing(t('tools.remoteLibraryPairingCode', 'Pairing code: {{code}}', { code: pairing.pairing.code }));
            }
        } catch (_error) {}
    };

    const saveHostConfig = async () => {
        try {
            const payload = {
                enabled: !!hostEnabledEl?.checked,
                port: Number(hostPortEl?.value || 0),
                discoveryPort: Number(hostDiscoveryEl?.value || 0),
                allowedRoots: String(hostRootsEl?.value || '')
                    .split(/[\r\n]+/)
                    .map((row) => row.trim())
                    .filter(Boolean)
            };
            const response = await window.emubro.invoke('remote:host:set-config', payload);
            if (!response?.success) {
                setStatus(response?.message || t('tools.remoteLibrarySaveFailed', 'Failed to save host settings.'), 'error');
                return;
            }
            await loadHostConfig();
            setStatus(t('tools.remoteLibrarySaveSuccess', 'Host settings saved.'), 'success');
        } catch (error) {
            setStatus(String(error?.message || error || t('tools.remoteLibrarySaveFailed', 'Failed to save host settings.')), 'error');
        }
    };

    const loadClientHosts = async () => {
        try {
            const response = await window.emubro.invoke('remote:client:get-hosts');
            if (response?.success) {
                clientHosts = Array.isArray(response.hosts) ? response.hosts : [];
            }
            renderHosts();
        } catch (_error) {
            clientHosts = [];
            renderHosts();
        }
    };

    const scanHosts = async () => {
        setStatus(t('tools.remoteLibraryScanning', 'Scanning LAN for hosts...'), 'info');
        try {
            const response = await window.emubro.invoke('remote:client:scan');
            if (!response?.success) {
                setStatus(response?.message || t('tools.remoteLibraryScanFailed', 'Scan failed.'), 'error');
                return;
            }
            const discovered = Array.isArray(response.hosts) ? response.hosts : [];
            discovered.forEach((entry) => {
                const url = entry.url || `http://${entry.address}:${entry.port}`;
                const existing = clientHosts.find((row) => row.url === url || row.hostId === entry.hostId);
                if (existing) {
                    existing.address = entry.address;
                    existing.port = entry.port;
                    existing.name = entry.name || existing.name;
                    existing.hostId = entry.hostId || existing.hostId;
                } else {
                    clientHosts.push({
                        hostId: entry.hostId || '',
                        name: entry.name || '',
                        address: entry.address,
                        port: entry.port,
                        url
                    });
                }
            });
            await window.emubro.invoke('remote:client:set-hosts', { hosts: clientHosts });
            renderHosts();
            setStatus(t('tools.remoteLibraryScanDone', 'Scan completed.'), 'success');
        } catch (error) {
            setStatus(String(error?.message || error || t('tools.remoteLibraryScanFailed', 'Scan failed.')), 'error');
        }
    };

    const loadRemoteGames = async () => {
        if (!activeHost || !activeHost.token) {
            setStatus(t('tools.remoteLibrarySelectPaired', 'Select a paired host first.'), 'warning');
            renderGames();
            return;
        }
        setStatus(t('tools.remoteLibraryLoadingGames', 'Loading remote games...'), 'info');
        try {
            const response = await window.emubro.invoke('remote:client:list-games', {
                hostUrl: activeHost.url,
                token: activeHost.token
            });
            if (!response?.success) {
                setStatus(response?.message || t('tools.remoteLibraryLoadFailed', 'Failed to load games.'), 'error');
                return;
            }
            remoteGames = Array.isArray(response.games) ? response.games : [];
            renderGames();
            setStatus(t('tools.remoteLibraryLoaded', 'Loaded {{count}} games.', { count: remoteGames.length }), 'success');
        } catch (error) {
            setStatus(String(error?.message || error || t('tools.remoteLibraryLoadFailed', 'Failed to load games.')), 'error');
        }
    };

    const getSelectedGameRows = () => {
        const selected = [];
        gamesEl?.querySelectorAll?.('input[data-remote-game-idx]:checked').forEach((input) => {
            const idx = Number(input.dataset.remoteGameIdx || -1);
            if (Number.isFinite(idx) && remoteGames[idx]) selected.push(remoteGames[idx]);
        });
        return selected;
    };

    const resolveDownloadRoot = async () => {
        const response = await window.emubro.invoke('settings:get-library-paths');
        const settings = response?.settings || {};
        const gameFolders = Array.isArray(settings?.gameFolders) ? settings.gameFolders : [];
        if (gameFolders.length > 0) return gameFolders[0];
        const pick = await window.emubro.invoke('open-file-dialog', {
            title: t('tools.remoteLibraryPickFolder', 'Select destination folder'),
            properties: ['openDirectory', 'createDirectory']
        });
        if (pick?.canceled || !pick?.filePaths?.length) return '';
        return String(pick.filePaths[0] || '').trim();
    };

    const downloadGames = async (rows = [], launchAfter = false) => {
        if (!activeHost) return;
        if (!rows.length) {
            setStatus(t('tools.remoteLibraryNoSelection', 'Select at least one game.'), 'warning');
            return;
        }
        const baseRoot = await resolveDownloadRoot();
        if (!baseRoot) return;
        const hostFolder = sanitizeSegment(activeHost.name || activeHost.hostId || 'remote-host');
        const downloadRoot = joinPath(baseRoot, 'remote-imports', hostFolder);
        let lastImportedId = 0;

        for (const game of rows) {
            const remotePath = String(game.path || '').trim();
            if (!remotePath) continue;
            const fileName = remotePath.split(/[\\/]/).pop() || sanitizeSegment(game.title);
            const destPath = joinPath(downloadRoot, sanitizeSegment(fileName));
            try {
                setStatus(t('tools.remoteLibraryDownloading', 'Downloading {{name}}...', { name: game.title || fileName }), 'info');
                const result = await window.emubro.invoke('remote:client:download-file', {
                    hostUrl: activeHost.url,
                    token: activeHost.token,
                    remotePath,
                    destinationPath: destPath
                });
                if (!result?.success) {
                    setStatus(result?.message || t('tools.remoteLibraryDownloadFailed', 'Download failed.'), 'error');
                    continue;
                }
                const importResult = await window.emubro.importPaths([destPath], { recursive: false });
                if (Array.isArray(importResult?.addedGames) && importResult.addedGames[0]) {
                    lastImportedId = Number(importResult.addedGames[0].id || 0);
                }
            } catch (error) {
                setStatus(String(error?.message || error || t('tools.remoteLibraryDownloadFailed', 'Download failed.')), 'error');
            }
        }

        if (lastImportedId) {
            try {
                const updatedGames = await window.emubro.invoke('get-games');
                const gameManager = await import('../game-manager.js');
                gameManager.setGames(updatedGames);
                gameManager.applyFilters();
            } catch (error) {
                log.warn('Failed to refresh library view after download:', error);
            }
        }

        if (launchAfter && lastImportedId) {
            await window.emubro.invoke('launch-game', { gameId: lastImportedId });
        }
        setStatus(t('tools.remoteLibraryDownloadComplete', 'Download completed.'), 'success');
    };

    if (hostSaveBtn) hostSaveBtn.addEventListener('click', saveHostConfig);
    if (hostRotateBtn) {
        hostRotateBtn.addEventListener('click', async () => {
            const response = await window.emubro.invoke('remote:host:rotate-pairing');
            if (response?.success) {
                setHostPairing(t('tools.remoteLibraryPairingCode', 'Pairing code: {{code}}', { code: response.pairing.code }));
            }
        });
    }
    if (scanBtn) scanBtn.addEventListener('click', scanHosts);
    if (clearBtn) clearBtn.addEventListener('click', async () => {
        try {
            clientHosts = [];
            await window.emubro.invoke('remote:client:set-hosts', { hosts: clientHosts });
            renderHosts();
            setStatus(t('tools.remoteLibraryCleared', 'Host list cleared.'), 'success');
        } catch (error) {
            setStatus(String(error?.message || error || t('tools.remoteLibraryClearFailed', 'Failed to clear host list.')), 'error');
        }
    });
    if (copyBtn) copyBtn.addEventListener('click', () => downloadGames(getSelectedGameRows(), false));
    if (copyRunBtn) copyRunBtn.addEventListener('click', () => downloadGames(getSelectedGameRows(), true));
    if (manualDownloadBtn) {
        manualDownloadBtn.addEventListener('click', async () => {
            if (!activeHost || !activeHost.token) {
                setStatus(t('tools.remoteLibrarySelectPaired', 'Select a paired host first.'), 'warning');
                return;
            }
            const remotePath = String(manualPathEl?.value || '').trim();
            if (!remotePath) return;
            const baseRoot = await resolveDownloadRoot();
            if (!baseRoot) return;
            const hostFolder = sanitizeSegment(activeHost.name || activeHost.hostId || 'remote-host');
            const fileName = remotePath.split(/[\\/]/).pop() || 'remote-file';
            const destPath = joinPath(baseRoot, 'remote-imports', hostFolder, sanitizeSegment(fileName));
            try {
                await window.emubro.invoke('remote:client:download-file', {
                    hostUrl: activeHost.url,
                    token: activeHost.token,
                    remotePath,
                    destinationPath: destPath
                });
                setStatus(t('tools.remoteLibraryDownloadComplete', 'Download completed.'), 'success');
            } catch (error) {
                setStatus(String(error?.message || error || t('tools.remoteLibraryDownloadFailed', 'Download failed.')), 'error');
            }
        });
    }

    renderHosts();
    renderGames();
    loadHostConfig();
    loadClientHosts();
}
