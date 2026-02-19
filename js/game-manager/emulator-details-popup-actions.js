const EMULATOR_INFO_PIN_STORAGE_KEY = 'emuBro.emulatorInfoPopupPinned';
const EMULATOR_SELECTED_PATHS_STORAGE_KEY = 'emuBro.emulatorPreferredLaunchPath.v1';

export function createEmulatorDetailsPopupActions(deps = {}) {
    const i18n = deps.i18n || window.i18n || { t: (key) => String(key || '') };
    const escapeHtml = deps.escapeHtml || ((value) => String(value ?? ''));
    const getEmulatorKey = deps.getEmulatorKey || ((emulator) => String(emulator?.id || emulator?.name || ''));
    const getEmulators = deps.getEmulators || (() => []);
    const fetchEmulators = deps.fetchEmulators || (async () => []);
    const normalizeEmulatorDownloadLinks = deps.normalizeEmulatorDownloadLinks || ((raw) => raw || {});
    const hasAnyDownloadLink = deps.hasAnyDownloadLink || (() => false);
    const downloadAndInstallEmulatorAction = deps.downloadAndInstallEmulatorAction || (async () => false);
    const getDownloadedPackagePath = deps.getDownloadedPackagePath || (() => '');
    const launchEmulatorAction = deps.launchEmulatorAction || (async () => {});
    const openEmulatorInExplorerAction = deps.openEmulatorInExplorerAction || (async () => {});
    const openDownloadedPackageInExplorerAction = deps.openDownloadedPackageInExplorerAction || (async () => {});
    const openEmulatorWebsiteAction = deps.openEmulatorWebsiteAction || (async () => {});
    const openEmulatorConfigEditor = deps.openEmulatorConfigEditor || (async () => false);
    const openEmulatorDownloadLinkAction = deps.openEmulatorDownloadLinkAction || (async () => {});
    const localStorageRef = deps.localStorageRef || window.localStorage;

    let emulatorInfoPopup = null;
    let emulatorInfoPopupPinned = false;
    try {
        emulatorInfoPopupPinned = localStorageRef.getItem(EMULATOR_INFO_PIN_STORAGE_KEY) === 'true';
    } catch (_e) {
        emulatorInfoPopupPinned = false;
    }

    function getEmulatorInfoPinIconMarkup() {
        return `
        <span class="icon-svg" aria-hidden="true">
            <svg viewBox="0 0 24 24">
                <path d="M8.5 4h7l-1.5 4.8v3.1l1.4 1.5h-6.8l1.4-1.5V8.8L8.5 4Z"></path>
                <path d="M12 13.4V20"></path>
            </svg>
        </span>
    `;
    }

    function setEmulatorInfoPinnedStorage(pinned) {
        emulatorInfoPopupPinned = !!pinned;
        try {
            localStorageRef.setItem(EMULATOR_INFO_PIN_STORAGE_KEY, emulatorInfoPopupPinned ? 'true' : 'false');
        } catch (_e) {}
    }

    function getEmulatorSelectionStorageKey(emulator) {
        const platformKey = String(emulator?.platformShortName || emulator?.platform || '').trim().toLowerCase();
        const nameKey = String(emulator?.name || '').trim().toLowerCase().replace(/[\s._-]+/g, '').replace(/[^a-z0-9]/g, '');
        const fallback = String(getEmulatorKey(emulator) || '').trim().toLowerCase();
        if (platformKey && nameKey) return `${platformKey}::${nameKey}`;
        return fallback || `${platformKey || 'unknown'}::${nameKey || 'emulator'}`;
    }

    function loadSelectedPathMap() {
        try {
            const raw = localStorageRef.getItem(EMULATOR_SELECTED_PATHS_STORAGE_KEY);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') return parsed;
        } catch (_e) {}
        return {};
    }

    function saveSelectedPathMap(map) {
        try {
            localStorageRef.setItem(EMULATOR_SELECTED_PATHS_STORAGE_KEY, JSON.stringify(map || {}));
        } catch (_e) {}
    }

    function setSelectedLaunchPath(emulator, pathValue) {
        const key = getEmulatorSelectionStorageKey(emulator);
        if (!key) return;
        const value = String(pathValue || '').trim();
        const map = loadSelectedPathMap();
        if (value) map[key] = value;
        else delete map[key];
        saveSelectedPathMap(map);
    }

    function applyEmulatorInfoPinnedState() {
        if (!emulatorInfoPopup) return;
        const pinBtn = emulatorInfoPopup.querySelector('#pin-emulator-info');
        const isDocked = emulatorInfoPopup.classList.contains('docked-right');
        const pinned = !!(isDocked || emulatorInfoPopupPinned);
        emulatorInfoPopup.classList.toggle('is-pinned', pinned);
        if (pinBtn) {
            pinBtn.classList.toggle('active', pinned);
            pinBtn.innerHTML = getEmulatorInfoPinIconMarkup();
            pinBtn.title = pinned ? 'Unpin' : 'Pin';
            pinBtn.setAttribute('aria-label', pinned ? 'Unpin emulator details window' : 'Pin emulator details window');
        }
    }

    function ensureEmulatorInfoPopup() {
        if (emulatorInfoPopup && emulatorInfoPopup.isConnected) return emulatorInfoPopup;

        emulatorInfoPopup = document.getElementById('emulator-info-modal');
        if (!emulatorInfoPopup) return null;
        if (emulatorInfoPopup.dataset.initialized === '1') return emulatorInfoPopup;

        const closeBtn = emulatorInfoPopup.querySelector('#close-emulator-info');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                emulatorInfoPopup.style.display = 'none';
                emulatorInfoPopup.classList.remove('active');
                if (emulatorInfoPopup.classList.contains('docked-right')) {
                    import('../docking-manager').then((m) => m.completelyRemoveFromDock('emulator-info-modal'));
                } else {
                    import('../docking-manager').then((m) => m.removeFromDock('emulator-info-modal'));
                }
                setEmulatorInfoPinnedStorage(false);
                applyEmulatorInfoPinnedState();
            });
        }

        const pinBtn = emulatorInfoPopup.querySelector('#pin-emulator-info');
        if (pinBtn) {
            pinBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                const shouldPin = !emulatorInfoPopup.classList.contains('docked-right');
                import('../docking-manager').then((m) => {
                    m.toggleDock('emulator-info-modal', 'pin-emulator-info', shouldPin);
                    setEmulatorInfoPinnedStorage(shouldPin);
                    applyEmulatorInfoPinnedState();
                });
            });
        }

        import('../theme-manager').then((m) => m.makeDraggable('emulator-info-modal', 'emulator-info-header'));
        emulatorInfoPopup.dataset.initialized = '1';
        applyEmulatorInfoPinnedState();
        return emulatorInfoPopup;
    }

    function getLatestEmulatorRecord(target) {
        const key = getEmulatorKey(target);
        const rows = Array.isArray(getEmulators()) ? getEmulators() : [];
        return rows.find((row) => getEmulatorKey(row) === key) || target;
    }

    function getEmulatorFilePaths(emulator) {
        const ordered = [];
        const seen = new Set();
        const add = (rawPath) => {
            const value = String(rawPath || '').trim();
            if (!value) return;
            const key = value.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            ordered.push(value);
        };

        if (Array.isArray(emulator?.filePaths)) {
            emulator.filePaths.forEach(add);
        }
        add(emulator?.filePath);
        return ordered;
    }

    function getSelectedLaunchPath(emulator, filePaths = []) {
        const paths = Array.isArray(filePaths) ? filePaths : [];
        if (paths.length === 0) return '';
        const map = loadSelectedPathMap();
        const storageKey = getEmulatorSelectionStorageKey(emulator);
        const fromStorage = String(map[storageKey] || '').trim();
        if (fromStorage) {
            const match = paths.find((path) => String(path || '').trim().toLowerCase() === fromStorage.toLowerCase());
            if (match) return match;
        }

        const emulatorPath = String(emulator?.filePath || '').trim();
        if (emulatorPath) {
            const pathMatch = paths.find((path) => String(path || '').trim().toLowerCase() === emulatorPath.toLowerCase());
            if (pathMatch) return pathMatch;
        }
        return paths[0];
    }

    function renderEmulatorDetailsMarkup(container, emulator) {
        if (!container || !emulator) return;
        const shortName = String(emulator.platformShortName || 'unknown').toLowerCase();
        const platformIcon = `emubro-resources/platforms/${shortName}/logos/default.png`;
        const safeName = escapeHtml(emulator.name || 'Unknown Emulator');
        const safePlatform = escapeHtml(emulator.platform || emulator.platformShortName || i18n.t('gameDetails.unknown'));
        const installed = !!emulator.isInstalled;
        const filePaths = getEmulatorFilePaths(emulator);
        const selectedLaunchPath = installed ? getSelectedLaunchPath(emulator, filePaths) : '';
        const statusClass = installed ? 'is-installed' : 'is-missing';
        const statusText = installed ? 'Installed' : 'Not Installed';
        const safePathMarkup = installed && filePaths.length > 0
            ? filePaths.map((p) => `<span class="emulator-detail-path-line">${escapeHtml(p)}</span>`).join('')
            : '<span class="emulator-detail-path-line">Not installed yet</span>';
        const launchPathControlMarkup = installed && filePaths.length > 1
            ? `
                <div class="emulator-detail-launch-path-control">
                    <label for="emu-launch-path-select">Launch Path</label>
                    <select id="emu-launch-path-select" data-emu-launch-path>
                        ${filePaths.map((p) => {
                            const selected = String(p).toLowerCase() === String(selectedLaunchPath).toLowerCase() ? 'selected' : '';
                            return `<option value="${escapeHtml(p)}" ${selected}>${escapeHtml(p)}</option>`;
                        }).join('')}
                    </select>
                </div>
            `
            : '';
        const links = normalizeEmulatorDownloadLinks(emulator?.downloadLinks);
        const winDisabled = links.windows ? '' : 'disabled';
        const linuxDisabled = links.linux ? '' : 'disabled';
        const macDisabled = links.mac ? '' : 'disabled';
        const canDownload = hasAnyDownloadLink(emulator);
        const downloadDisabled = canDownload ? '' : 'disabled';
        const downloadedPackagePath = String(getDownloadedPackagePath(emulator) || '').trim();
        const showDownloadedSetupAction = !installed && !!downloadedPackagePath;
        const launchActionMarkup = installed
            ? '<button class="action-btn launch-btn" data-emu-popup-action="launch">Launch</button>'
            : '';
        const explorerActionMarkup = installed
            ? '<button class="action-btn" data-emu-popup-action="explorer">Explorer</button>'
            : '';
        const downloadedSetupActionMarkup = showDownloadedSetupAction
            ? '<button class="action-btn" data-emu-popup-action="downloaded-package">Show Downloaded Setup</button>'
            : '';

        container.innerHTML = `
        <div class="emulator-details-info">
            <div class="emulator-detail-media">
                <img src="${escapeHtml(platformIcon)}" alt="${safePlatform}" class="emulator-detail-icon" loading="lazy" onerror="this.style.display='none'" />
            </div>
            <div class="emulator-detail-meta">
                <p><strong>Name:</strong> ${safeName}</p>
                <p><strong>Platform:</strong> ${safePlatform}</p>
                <p><strong>Status:</strong> <span class="emulator-install-status ${statusClass}">${statusText}</span></p>
                <p><strong>Path:</strong> <span class="emulator-detail-path">${safePathMarkup}</span></p>
                ${launchPathControlMarkup}
            </div>
            <div class="emulator-detail-download-links">
                <button class="emulator-os-link" type="button" data-emu-download-os="windows" ${winDisabled}>Windows</button>
                <button class="emulator-os-link" type="button" data-emu-download-os="linux" ${linuxDisabled}>Linux</button>
                <button class="emulator-os-link" type="button" data-emu-download-os="mac" ${macDisabled}>Mac</button>
            </div>
            <div class="emulator-detail-actions">
                <button class="action-btn" data-emu-popup-action="download" ${downloadDisabled}>Download</button>
                ${launchActionMarkup}
                ${explorerActionMarkup}
                ${downloadedSetupActionMarkup}
                <button class="action-btn" data-emu-popup-action="website">Website</button>
                <button class="action-btn" data-emu-popup-action="edit">Edit</button>
            </div>
        </div>
    `;
    }

    function bindEmulatorDetailsActions(container, emulator, options = {}) {
        if (!container || !emulator) return;
        const installedPaths = getEmulatorFilePaths(emulator);
        let selectedLaunchPath = emulator?.isInstalled ? getSelectedLaunchPath(emulator, installedPaths) : '';

        const launchPathSelect = container.querySelector('[data-emu-launch-path]');
        if (launchPathSelect) {
            launchPathSelect.value = selectedLaunchPath || launchPathSelect.value;
            launchPathSelect.addEventListener('change', () => {
                selectedLaunchPath = String(launchPathSelect.value || '').trim();
                if (selectedLaunchPath) setSelectedLaunchPath(emulator, selectedLaunchPath);
            });
        }

        const refreshAfterChange = async () => {
            await fetchEmulators();
            if (typeof options.onRefresh === 'function') options.onRefresh();
            const latest = getLatestEmulatorRecord(emulator);
            showEmulatorDetails(latest, options);
        };

        const actionButtons = container.querySelectorAll('[data-emu-popup-action]');
        actionButtons.forEach((button) => {
            button.addEventListener('click', async () => {
                const action = String(button.dataset.emuPopupAction || '').trim();
                if (!action) return;
                const originalLabel = button.textContent;
                const isBusyAction = action === 'download';
                if (isBusyAction) {
                    button.disabled = true;
                    button.textContent = 'Downloading...';
                }
                try {
                    if (action === 'download') {
                        const changed = await downloadAndInstallEmulatorAction(emulator);
                        if (changed) await refreshAfterChange();
                        return;
                    }
                    if (action === 'launch') {
                        const targetEmulator = selectedLaunchPath
                            ? { ...emulator, filePath: selectedLaunchPath, isInstalled: true }
                            : emulator;
                        await launchEmulatorAction(targetEmulator);
                        return;
                    }
                    if (action === 'explorer') {
                        const targetEmulator = selectedLaunchPath
                            ? { ...emulator, filePath: selectedLaunchPath, isInstalled: true }
                            : emulator;
                        await openEmulatorInExplorerAction(targetEmulator);
                        return;
                    }
                    if (action === 'downloaded-package') {
                        await openDownloadedPackageInExplorerAction(emulator);
                        return;
                    }
                    if (action === 'website') {
                        await openEmulatorWebsiteAction(emulator);
                        return;
                    }
                    if (action === 'edit') {
                        const changed = await openEmulatorConfigEditor(emulator);
                        if (changed) await refreshAfterChange();
                    }
                } finally {
                    if (isBusyAction) {
                        button.textContent = originalLabel;
                        button.disabled = false;
                    }
                }
            });
        });

        container.querySelectorAll('[data-emu-download-os]').forEach((button) => {
            button.addEventListener('click', async () => {
                const osKey = String(button.dataset.emuDownloadOs || '').trim().toLowerCase();
                await openEmulatorDownloadLinkAction(emulator, osKey);
            });
        });
    }

    function showEmulatorDetails(emulator, options = {}) {
        if (!emulator) return;
        const popup = ensureEmulatorInfoPopup();
        if (!popup) return;

        const popupTitle = popup.querySelector('#emulator-info-popup-title');
        const popupBody = popup.querySelector('#emulator-info-popup-body');
        if (popupTitle) popupTitle.textContent = emulator.name || 'Emulator Details';
        renderEmulatorDetailsMarkup(popupBody, emulator);
        bindEmulatorDetailsActions(popupBody, emulator, options);

        if (emulatorInfoPopupPinned || popup.classList.contains('docked-right')) {
            import('../docking-manager').then((m) => m.toggleDock('emulator-info-modal', 'pin-emulator-info', true));
            setEmulatorInfoPinnedStorage(true);
        } else {
            const hasManualPosition = !!(popup.style.left || popup.style.top || popup.classList.contains('moved'));
            popup.classList.toggle('moved', hasManualPosition);
            popup.style.display = 'flex';
            popup.classList.add('active');
            import('../theme-manager').then((m) => {
                if (typeof m.recenterManagedModalIfMostlyOutOfView === 'function') {
                    m.recenterManagedModalIfMostlyOutOfView('emulator-info-modal', {
                        visibleThreshold: 0.5,
                        smooth: true
                    });
                }
            });
        }
        applyEmulatorInfoPinnedState();
    }

    return {
        showEmulatorDetails
    };
}
