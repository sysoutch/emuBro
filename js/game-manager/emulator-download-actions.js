export function createEmulatorDownloadActions(deps = {}) {
    const emubro = deps.emubro;
    const log = deps.log || console;
    const escapeHtml = deps.escapeHtml || ((v) => String(v ?? ''));
    const normalizeEmulatorDownloadLinks = deps.normalizeEmulatorDownloadLinks || ((raw) => raw || {});
    const fetchEmulators = deps.fetchEmulators || (async () => {});
    const getEmulatorKey = deps.getEmulatorKey || ((emulator) => String(emulator?.id || emulator?.name || ''));
    const localStorageRef = deps.localStorageRef || window.localStorage;
    const alertUser = typeof deps.alertUser === 'function'
        ? deps.alertUser
        : ((msg) => window.alert(String(msg || '')));
    const getRuntimePlatform = typeof deps.getRuntimePlatform === 'function'
        ? deps.getRuntimePlatform
        : () => String(window?.emubro?.platform || '').trim().toLowerCase();
    const DOWNLOADED_EMULATOR_PACKAGES_STORAGE_KEY = 'emuBro.downloadedEmulatorPackages.v1';
    const LINUX_INSTALL_METHOD_KEY = 'emuBro.linuxInstallMethod';
    const LINUX_INSTALL_REMEMBER_KEY = 'emuBro.linuxInstallMethodRemember';

    function loadDownloadedPackageMap() {
        try {
            const raw = localStorageRef.getItem(DOWNLOADED_EMULATOR_PACKAGES_STORAGE_KEY);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') return parsed;
        } catch (_e) {}
        return {};
    }

    function saveDownloadedPackageMap(map) {
        try {
            localStorageRef.setItem(DOWNLOADED_EMULATOR_PACKAGES_STORAGE_KEY, JSON.stringify(map || {}));
        } catch (_e) {}
    }

    function getDownloadedPackagePath(emulator) {
        const key = String(getEmulatorKey(emulator) || '').trim().toLowerCase();
        if (!key) return '';
        const value = loadDownloadedPackageMap()[key];
        return String(value || '').trim();
    }

    function setDownloadedPackagePath(emulator, packagePath) {
        const key = String(getEmulatorKey(emulator) || '').trim().toLowerCase();
        if (!key) return;
        const map = loadDownloadedPackageMap();
        const normalizedPath = String(packagePath || '').trim();
        if (normalizedPath) {
            map[key] = normalizedPath;
        } else {
            delete map[key];
        }
        saveDownloadedPackageMap(map);
    }

    function normalizeDownloadPackageType(packageType) {
        const value = String(packageType || '').trim().toLowerCase();
        if (value === 'setup' || value === 'install') return 'installer';
        if (value === 'exe' || value === 'binary' || value === 'portable') return 'executable';
        if (value === 'installer' || value === 'archive' || value === 'executable') return value;
        return '';
    }

    function getDownloadPackageTypeLabel(packageType) {
        const normalized = normalizeDownloadPackageType(packageType);
        if (normalized === 'installer') return 'Installer';
        if (normalized === 'archive') return 'Archive';
        if (normalized === 'executable') return 'Executable';
        return 'Package';
    }

    function getLinuxInstallerOptions(emulator) {
        const installers = emulator?.installers && typeof emulator.installers === 'object'
            ? emulator.installers
            : null;
        const linux = installers?.linux && typeof installers.linux === 'object' ? installers.linux : null;
        const options = [];
        if (linux?.flatpak) options.push({ method: 'flatpak', label: 'Flatpak (Flathub)' });
        if (linux?.apt) options.push({ method: 'apt', label: 'APT/DEB repo' });
        return options;
    }

    function loadRememberedLinuxInstallMethod() {
        try {
            const remember = localStorageRef.getItem(LINUX_INSTALL_REMEMBER_KEY) === 'true';
            if (!remember) return '';
            return String(localStorageRef.getItem(LINUX_INSTALL_METHOD_KEY) || '').trim().toLowerCase();
        } catch (_e) {
            return '';
        }
    }

    function saveRememberedLinuxInstallMethod(method, remember) {
        try {
            localStorageRef.setItem(LINUX_INSTALL_REMEMBER_KEY, remember ? 'true' : 'false');
            if (remember) {
                localStorageRef.setItem(LINUX_INSTALL_METHOD_KEY, String(method || 'download'));
            }
        } catch (_e) {}
    }

    function promptLinuxInstallMethod(emulator) {
        const runtimePlatform = getRuntimePlatform();
        if (runtimePlatform !== 'linux') return Promise.resolve('download');
        const options = getLinuxInstallerOptions(emulator);
        if (options.length === 0) return Promise.resolve('download');

        const remembered = loadRememberedLinuxInstallMethod();
        if (remembered === 'flatpak' || remembered === 'apt' || remembered === 'download') {
            return Promise.resolve(remembered);
        }

        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'emulator-config-overlay';

            const modal = document.createElement('div');
            modal.className = 'emulator-config-modal glass emulator-download-choice-modal';

            const title = document.createElement('h3');
            title.textContent = `Install on Linux: ${emulator?.name || 'Emulator'}`;

            const hint = document.createElement('p');
            hint.className = 'emulator-download-choice-hint';
            hint.textContent = 'Choose how you want to install this emulator. APT installs may prompt for sudo.';

            const list = document.createElement('div');
            list.className = 'emulator-download-choice-list';

            const directBtn = document.createElement('button');
            directBtn.type = 'button';
            directBtn.className = 'action-btn emulator-download-choice-btn launch-btn';
            directBtn.dataset.installMethod = 'download';
            directBtn.innerHTML = `
                <span class="emulator-download-choice-label">Direct Download (Recommended)</span>
                <span class="emulator-download-choice-file">Use the built-in download/install flow</span>
            `;
            list.appendChild(directBtn);

            options.forEach((entry) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'action-btn emulator-download-choice-btn';
                button.dataset.installMethod = entry.method;
                button.innerHTML = `
                <span class="emulator-download-choice-label">${escapeHtml(entry.label)}</span>
                <span class="emulator-download-choice-file">Install via system package manager</span>
            `;
                list.appendChild(button);
            });

            const rememberRow = document.createElement('label');
            rememberRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:6px;';
            rememberRow.innerHTML = `
                <input type="checkbox" id="linux-install-remember" />
                <span>Remember my choice for Linux installs</span>
            `;

            const actions = document.createElement('div');
            actions.className = 'emulator-config-actions';

            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = 'action-btn remove-btn';
            cancelBtn.textContent = 'Cancel';

            actions.appendChild(cancelBtn);
            modal.appendChild(title);
            modal.appendChild(hint);
            modal.appendChild(list);
            modal.appendChild(rememberRow);
            modal.appendChild(actions);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            const close = (value) => {
                overlay.remove();
                resolve(value || '');
            };

            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) close('');
            });
            cancelBtn.addEventListener('click', () => close(''));
            list.querySelectorAll('[data-install-method]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const method = String(btn.dataset.installMethod || '').trim().toLowerCase();
                    const remember = !!modal.querySelector('#linux-install-remember')?.checked;
                    saveRememberedLinuxInstallMethod(method, remember);
                    close(method);
                });
            });
        });
    }

    function promptEmulatorDownloadType(emulator, optionsPayload = {}) {
        const options = (Array.isArray(optionsPayload?.options) ? optionsPayload.options : [])
            .map((entry) => {
                const type = normalizeDownloadPackageType(entry?.packageType);
                if (!type) return null;
                return {
                    packageType: type,
                    fileName: String(entry?.fileName || '').trim(),
                    source: String(entry?.source || '').trim()
                };
            })
            .filter(Boolean);
        const waybackUrl = String(optionsPayload?.waybackUrl || '').trim();
        const hasWayback = !!waybackUrl;
        const showWaybackFallback = hasWayback && options.length === 0;

        if (options.length === 0 && !showWaybackFallback) return Promise.resolve('');
        if (options.length === 1 && !showWaybackFallback) return Promise.resolve(options[0].packageType);

        return new Promise((resolve) => {
            const recommendedType = normalizeDownloadPackageType(optionsPayload?.recommendedType || '');
            const overlay = document.createElement('div');
            overlay.className = 'emulator-config-overlay';

            const modal = document.createElement('div');
            modal.className = 'emulator-config-modal glass emulator-download-choice-modal';

            const title = document.createElement('h3');
            title.textContent = `Choose package: ${emulator?.name || 'Emulator'}`;

            const hint = document.createElement('p');
            hint.className = 'emulator-download-choice-hint';
            hint.textContent = 'Select the package type you want to download.';

            const list = document.createElement('div');
            list.className = 'emulator-download-choice-list';

            options.forEach((entry) => {
                const button = document.createElement('button');
                const isRecommended = entry.packageType === recommendedType;
                button.type = 'button';
                button.className = `action-btn emulator-download-choice-btn ${isRecommended ? 'launch-btn' : ''}`.trim();
                button.dataset.packageType = entry.packageType;
                button.innerHTML = `
                <span class="emulator-download-choice-label">${escapeHtml(getDownloadPackageTypeLabel(entry.packageType))}${isRecommended ? ' (Recommended)' : ''}</span>
                <span class="emulator-download-choice-file">${escapeHtml(entry.fileName || entry.source || '')}</span>
            `;
                list.appendChild(button);
            });

            if (showWaybackFallback) {
                const waybackButton = document.createElement('button');
                waybackButton.type = 'button';
                waybackButton.className = 'action-btn emulator-download-choice-btn';
                waybackButton.dataset.packageType = 'wayback-fallback';
                waybackButton.innerHTML = `
                <span class="emulator-download-choice-label">Use Wayback Machine</span>
                <span class="emulator-download-choice-file">Open archived snapshots of the download page</span>
            `;
                list.appendChild(waybackButton);
            }

            const actions = document.createElement('div');
            actions.className = 'emulator-config-actions';

            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = 'action-btn remove-btn';
            cancelBtn.textContent = 'Cancel';

            actions.appendChild(cancelBtn);
            modal.appendChild(title);
            modal.appendChild(hint);
            modal.appendChild(list);
            modal.appendChild(actions);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            const close = (value) => {
                overlay.remove();
                resolve(value || '');
            };

            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) close('');
            });
            cancelBtn.addEventListener('click', () => close(''));
            list.querySelectorAll('[data-package-type]').forEach((btn) => {
                btn.addEventListener('click', () => close(String(btn.dataset.packageType || '').trim()));
            });
        });
    }

    async function downloadAndInstallEmulatorAction(emulator) {
        try {
            const linuxInstallChoice = await promptLinuxInstallMethod(emulator);
            if (!linuxInstallChoice) return false;
            const payload = {
                name: emulator?.name || '',
                platform: emulator?.platform || '',
                platformShortName: emulator?.platformShortName || '',
                website: emulator?.website || '',
                downloadUrl: emulator?.downloadUrl || '',
                downloadLinks: normalizeEmulatorDownloadLinks(emulator?.downloadLinks),
                searchString: emulator?.searchString || '',
                archiveFileMatchWin: emulator?.archiveFileMatchWin || '',
                archiveFileMatchLinux: emulator?.archiveFileMatchLinux || '',
                archiveFileMatchMac: emulator?.archiveFileMatchMac || '',
                setupFileMatchWin: emulator?.setupFileMatchWin || '',
                setupFileMatchLinux: emulator?.setupFileMatchLinux || '',
                setupFileMatchMac: emulator?.setupFileMatchMac || '',
                executableFileMatchWin: emulator?.executableFileMatchWin || '',
                executableFileMatchLinux: emulator?.executableFileMatchLinux || '',
                executableFileMatchMac: emulator?.executableFileMatchMac || '',
                installers: emulator?.installers || null,
                installMethod: linuxInstallChoice === 'flatpak' || linuxInstallChoice === 'apt' ? linuxInstallChoice : 'download'
            };

            let selectedPackageType = '';
            let useWaybackFallback = false;
            let waybackSourceUrl = '';
            let waybackUrl = '';
            try {
                if (payload.installMethod !== 'download') {
                    const result = await emubro.invoke('download-install-emulator', {
                        ...payload,
                        packageType: '',
                        useWaybackFallback: false
                    });
                    if (!result?.success) {
                        alertUser(result?.message || 'Failed to install emulator.');
                        return false;
                    }
                    alertUser(result?.message || 'Emulator install finished.');
                    return true;
                }
                const optionsResult = await emubro.invoke('get-emulator-download-options', payload);
                if (optionsResult?.success) {
                    const selection = await promptEmulatorDownloadType(emulator, optionsResult);
                    selectedPackageType = selection === 'wayback-fallback' ? '' : selection;
                    useWaybackFallback = selection === 'wayback-fallback';
                    waybackSourceUrl = String(optionsResult?.manualUrl || emulator?.website || '').trim();
                    waybackUrl = String(optionsResult?.waybackUrl || '').trim();

                    const optionCount = Array.isArray(optionsResult?.options) ? optionsResult.options.length : 0;
                    const hadUserChoice = optionCount > 1 || (optionCount === 0 && !!waybackUrl);
                    if (!selection && hadUserChoice) {
                        return false;
                    }
                }
            } catch (error) {
                log.warn('Failed to fetch emulator download options, using auto mode:', error);
            }

            const result = await emubro.invoke('download-install-emulator', {
                ...payload,
                packageType: selectedPackageType,
                useWaybackFallback,
                waybackSourceUrl,
                waybackUrl
            });

            if (!result?.success) {
                if (result?.manual) {
                    alertUser(result?.message || 'Opened download page.');
                    return false;
                }
                alertUser(result?.message || 'Failed to download emulator.');
                return false;
            }

            if (result?.packagePath) {
                setDownloadedPackagePath(emulator, result.packagePath);
            }

            await fetchEmulators();
            alertUser(result?.message || 'Emulator download finished.');
            return true;
        } catch (error) {
            log.error('Failed to download/install emulator:', error);
            alertUser('Failed to download emulator.');
            return false;
        }
    }

    return {
        normalizeDownloadPackageType,
        getDownloadPackageTypeLabel,
        getDownloadedPackagePath,
        setDownloadedPackagePath,
        promptEmulatorDownloadType,
        downloadAndInstallEmulatorAction
    };
}
