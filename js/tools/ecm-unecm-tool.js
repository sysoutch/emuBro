function getFileNameFromPath(filePath) {
    const normalized = String(filePath || '').replace(/\\/g, '/');
    const fileName = normalized.split('/').pop() || '';
    return fileName.trim();
}

function formatBytes(byteCount) {
    const value = Number(byteCount || 0);
    if (!Number.isFinite(value) || value <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = value;
    let index = 0;
    while (size >= 1024 && index < units.length - 1) {
        size /= 1024;
        index += 1;
    }
    const decimals = size >= 100 ? 0 : (size >= 10 ? 1 : 2);
    return `${size.toFixed(decimals)} ${units[index]}`;
}

export function renderEcmUnecmTool({ t, escapeHtml }) {
    const gamesContainer = document.getElementById('games-container');
    if (!gamesContainer) return;

    const toolContent = document.createElement('div');
    toolContent.className = 'tool-content ecm-unecm-tool';
    toolContent.innerHTML = `
        <h3>${escapeHtml(t('tools.ecmUnecm', 'ECM/UNECM'))}</h3>
        <p>${escapeHtml(t('tools.ecmUnecmDesc', 'Download ECM/UNECM from upstream as a separate GPL tool archive (not bundled into emuBro code).'))}</p>
        <p class="tool-output" data-ecm-note>${escapeHtml(t('tools.ecmUnecmLegalNote', 'This tool is provided by upstream under GPL. emuBro only downloads it as an external separate archive.'))}</p>
        <p class="tool-output" data-ecm-source>${escapeHtml(t('tools.ecmUnecmNoSourceSelected', 'Source: not selected'))}</p>
        <p class="tool-output" data-ecm-env>${escapeHtml(t('tools.ecmUnecmEnvUnknown', 'Build environment: not checked'))}</p>
        <div class="ecm-tool-inline-group">
            <label for="ecm-compiler-select">${escapeHtml(t('tools.ecmUnecmCompilerLabel', 'Build compiler'))}</label>
            <select id="ecm-compiler-select" data-ecm-compiler-select></select>
        </div>
        <div class="ecm-tool-inline-group">
            <label for="ecm-compiler-install-select">${escapeHtml(t('tools.ecmUnecmInstallLabel', 'Compiler install option'))}</label>
            <select id="ecm-compiler-install-select" data-ecm-install-select></select>
            <button type="button" class="action-btn" data-ecm-action="install-compiler">${escapeHtml(t('tools.ecmUnecmInstallCompiler', 'Install / Download Compiler'))}</button>
        </div>
        <p class="tool-output" data-ecm-install-hint>${escapeHtml(t('tools.ecmUnecmInstallHintEmpty', 'Compiler install suggestion appears after environment detection.'))}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="action-btn" data-ecm-action="download">${escapeHtml(t('tools.ecmUnecmDownloadZip', 'Download Source ZIP'))}</button>
            <button type="button" class="action-btn" data-ecm-action="pick-source">${escapeHtml(t('tools.ecmUnecmPickSource', 'Select Source Path'))}</button>
            <button type="button" class="action-btn" data-ecm-action="detect-env">${escapeHtml(t('tools.ecmUnecmDetectEnv', 'Detect Build Env'))}</button>
            <button type="button" class="action-btn" data-ecm-action="build">${escapeHtml(t('tools.ecmUnecmBuild', 'Build Binaries'))}</button>
            <button type="button" class="action-btn" data-ecm-action="repo">${escapeHtml(t('tools.ecmUnecmOpenRepo', 'Open Upstream Repo'))}</button>
            <button type="button" class="action-btn" data-ecm-action="source-url">${escapeHtml(t('tools.ecmUnecmOpenZipUrl', 'Open ZIP URL'))}</button>
            <button type="button" class="action-btn" data-ecm-action="show-folder" style="display:none;">${escapeHtml(t('tools.ecmUnecmShowDownload', 'Show Download'))}</button>
            <button type="button" class="action-btn" data-ecm-action="show-build-folder" style="display:none;">${escapeHtml(t('tools.ecmUnecmShowBuild', 'Show Build Output'))}</button>
        </div>
        <p class="tool-output" data-ecm-status aria-live="polite"></p>
        <div class="cover-downloader-results" data-ecm-results></div>
    `;
    gamesContainer.appendChild(toolContent);

    const statusEl = toolContent.querySelector('[data-ecm-status]');
    const resultsEl = toolContent.querySelector('[data-ecm-results]');
    const noteEl = toolContent.querySelector('[data-ecm-note]');
    const sourceEl = toolContent.querySelector('[data-ecm-source]');
    const envEl = toolContent.querySelector('[data-ecm-env]');
    const installHintEl = toolContent.querySelector('[data-ecm-install-hint]');
    const compilerSelectEl = toolContent.querySelector('[data-ecm-compiler-select]');
    const installSelectEl = toolContent.querySelector('[data-ecm-install-select]');
    const downloadBtn = toolContent.querySelector('[data-ecm-action="download"]');
    const pickSourceBtn = toolContent.querySelector('[data-ecm-action="pick-source"]');
    const detectEnvBtn = toolContent.querySelector('[data-ecm-action="detect-env"]');
    const buildBtn = toolContent.querySelector('[data-ecm-action="build"]');
    const installCompilerBtn = toolContent.querySelector('[data-ecm-action="install-compiler"]');
    const repoBtn = toolContent.querySelector('[data-ecm-action="repo"]');
    const sourceUrlBtn = toolContent.querySelector('[data-ecm-action="source-url"]');
    const showFolderBtn = toolContent.querySelector('[data-ecm-action="show-folder"]');
    const showBuildFolderBtn = toolContent.querySelector('[data-ecm-action="show-build-folder"]');

    let lastDownloadedPath = '';
    let selectedSourcePath = '';
    let lastBuildOutputPath = '';
    let info = null;
    let detectedEnvironment = null;
    let compilerInstallOptions = [];

    const setStatus = (message, level = 'info') => {
        if (!statusEl) return;
        statusEl.textContent = String(message || '').trim();
        statusEl.dataset.level = String(level || 'info');
    };

    const setSourcePath = (value) => {
        selectedSourcePath = String(value || '').trim();
        if (!sourceEl) return;
        if (!selectedSourcePath) {
            sourceEl.textContent = t('tools.ecmUnecmNoSourceSelected', 'Source: not selected');
            return;
        }
        sourceEl.textContent = t('tools.ecmUnecmSourceSelected', 'Source: {{path}}', {
            path: selectedSourcePath
        });
    };

    const setEnvironmentSummary = (env) => {
        detectedEnvironment = env && typeof env === 'object' ? env : null;
        if (!envEl) return;
        if (!detectedEnvironment) {
            envEl.textContent = t('tools.ecmUnecmEnvUnknown', 'Build environment: not checked');
            return;
        }
        const compiler = String(detectedEnvironment.recommendedCompiler || '').trim();
        envEl.textContent = compiler
            ? t('tools.ecmUnecmEnvDetected', 'Build environment: compiler {{compiler}} available', { compiler })
            : t('tools.ecmUnecmEnvNoCompiler', 'Build environment detected, but no C compiler found');
    };

    const getSelectedCompilerInstallOption = () => {
        const selectedId = String(installSelectEl?.value || '').trim();
        if (!selectedId) return null;
        return compilerInstallOptions.find((entry) => String(entry?.id || '').trim() === selectedId) || null;
    };

    const refreshCompilerSelect = () => {
        if (!compilerSelectEl) return;
        const compilers = Array.isArray(detectedEnvironment?.compilers)
            ? detectedEnvironment.compilers
            : [];
        const recommended = String(detectedEnvironment?.recommendedCompiler || '').trim();
        const selectedBefore = String(compilerSelectEl.value || '').trim();

        const optionsMarkup = [
            `<option value="">${escapeHtml(t('tools.ecmUnecmCompilerAuto', 'Auto (recommended: {{compiler}})', {
                compiler: recommended || t('tools.none', 'None')
            }))}</option>`
        ];
        compilers.forEach((entry) => {
            const name = String(entry?.name || '').trim();
            if (!name) return;
            const available = !!entry?.available;
            const version = String(entry?.version || '').trim();
            const label = available
                ? `${name}${version ? ` (${version})` : ''}`
                : `${name} (${t('tools.ecmUnecmCompilerMissing', 'not found')})`;
            optionsMarkup.push(`<option value="${escapeHtml(name)}">${escapeHtml(label)}</option>`);
        });
        compilerSelectEl.innerHTML = optionsMarkup.join('');

        const targetValue = selectedBefore && compilers.some((entry) => String(entry?.name || '').trim() === selectedBefore)
            ? selectedBefore
            : '';
        compilerSelectEl.value = targetValue;
    };

    const refreshCompilerInstallOptions = (options = [], preferredId = '') => {
        compilerInstallOptions = Array.isArray(options)
            ? options.filter((entry) => entry && typeof entry === 'object')
            : [];
        if (!installSelectEl) return;
        if (compilerInstallOptions.length === 0) {
            installSelectEl.innerHTML = `<option value="">${escapeHtml(t('tools.ecmUnecmInstallNone', 'No install options detected'))}</option>`;
            installSelectEl.disabled = true;
            if (installCompilerBtn) installCompilerBtn.disabled = true;
            if (installHintEl) installHintEl.textContent = t('tools.ecmUnecmInstallHintEmpty', 'Compiler install suggestion appears after environment detection.');
            return;
        }

        installSelectEl.disabled = false;
        if (installCompilerBtn) installCompilerBtn.disabled = false;
        installSelectEl.innerHTML = compilerInstallOptions.map((entry) => {
            const id = String(entry?.id || '').trim();
            const label = String(entry?.label || id).trim();
            const suffix = entry?.recommended ? ` (${t('tools.recommended', 'Recommended')})` : '';
            return `<option value="${escapeHtml(id)}">${escapeHtml(`${label}${suffix}`)}</option>`;
        }).join('');

        const selectedId = String(preferredId || '').trim();
        const fallbackId = String((compilerInstallOptions.find((entry) => entry?.recommended) || compilerInstallOptions[0] || {}).id || '').trim();
        const targetId = compilerInstallOptions.some((entry) => String(entry?.id || '').trim() === selectedId)
            ? selectedId
            : fallbackId;
        installSelectEl.value = targetId;
        const selected = getSelectedCompilerInstallOption();
        if (installHintEl) {
            installHintEl.textContent = selected
                ? String(selected.description || '').trim()
                : t('tools.ecmUnecmInstallHintEmpty', 'Compiler install suggestion appears after environment detection.');
        }
    };

    const renderResults = (rows = []) => {
        if (!resultsEl) return;
        const list = Array.isArray(rows) ? rows : [];
        if (list.length === 0) {
            resultsEl.innerHTML = `<div class="cover-download-row is-empty">${escapeHtml(t('tools.ecmUnecmNoDownloadsYet', 'No downloads yet.'))}</div>`;
            return;
        }
        resultsEl.innerHTML = list.map((row) => {
            const filePath = String(row?.filePath || '').trim();
            const sizeBytes = Number(row?.sizeBytes || 0);
            const sizeLabel = Number.isFinite(sizeBytes) && sizeBytes > 0 ? formatBytes(sizeBytes) : '';
            const sourceUrl = String(row?.sourceUrl || '').trim();
            return `
                <div class="cover-download-row" data-level="${row?.success ? 'success' : 'error'}">
                    <div class="cover-download-game">
                        ${escapeHtml(getFileNameFromPath(filePath) || filePath || t('tools.unknown', 'Unknown'))}
                        <span>${escapeHtml(filePath || '')}</span>
                        ${sourceUrl ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t('tools.coverDownloaderOpenSource', 'Open source'))}</a>` : ''}
                    </div>
                    <div class="cover-download-status">${escapeHtml(sizeLabel || (row?.success ? t('tools.coverDownloaderResultDownloaded', 'Downloaded') : t('tools.coverDownloaderResultFailed', 'Failed')))}</div>
                </div>
            `;
        }).join('');
    };

    const setRunning = (running) => {
        const isRunning = !!running;
        if (downloadBtn) downloadBtn.disabled = isRunning;
        if (pickSourceBtn) pickSourceBtn.disabled = isRunning;
        if (detectEnvBtn) detectEnvBtn.disabled = isRunning;
        if (buildBtn) buildBtn.disabled = isRunning;
        if (installCompilerBtn) installCompilerBtn.disabled = isRunning || !compilerInstallOptions.length;
        if (compilerSelectEl) compilerSelectEl.disabled = isRunning;
        if (installSelectEl) installSelectEl.disabled = isRunning || !compilerInstallOptions.length;
        if (repoBtn) repoBtn.disabled = isRunning;
        if (sourceUrlBtn) sourceUrlBtn.disabled = isRunning;
    };

    const openUrl = async (url) => {
        const target = String(url || '').trim();
        if (!target) return;
        try {
            await window.emubro.invoke('open-external-url', target);
        } catch (error) {
            setStatus(String(error?.message || error || 'Failed to open URL.'), 'error');
        }
    };

    const loadInfo = async () => {
        try {
            const response = await window.emubro.invoke('tools:ecm:get-download-info');
            if (!response?.success) return;
            info = response;
            if (noteEl) {
                noteEl.textContent = t('tools.ecmUnecmLegalNoteWithLicense', 'License: {{license}}. Downloaded separately from upstream.', {
                    license: String(response?.license || 'GPL')
                });
            }
            const envResponse = await window.emubro.invoke('tools:ecm:detect-build-env');
            if (envResponse?.success) {
                setEnvironmentSummary(envResponse.environment);
                refreshCompilerSelect();
                refreshCompilerInstallOptions(
                    envResponse?.environment?.compilerInstallOptions || [],
                    envResponse?.environment?.recommendedCompilerInstaller || ''
                );
            }
            const installResponse = await window.emubro.invoke('tools:ecm:get-compiler-install-options');
            if (installResponse?.success) {
                refreshCompilerInstallOptions(
                    installResponse?.options || [],
                    installResponse?.recommendedOptionId || installResponse?.environment?.recommendedCompilerInstaller || ''
                );
            }
        } catch (_error) {}
    };

    if (downloadBtn) {
        downloadBtn.addEventListener('click', async () => {
            setRunning(true);
            setStatus(t('tools.status.ecmUnecmDownloadRunning', 'Downloading ECM/UNECM source ZIP...'), 'info');
            try {
                const result = await window.emubro.invoke('tools:ecm:download-source-zip', {});
                if (!result?.success) {
                    if (result?.canceled) {
                        setStatus(t('tools.ecmUnecmDownloadCanceled', 'Download canceled.'), 'warning');
                    } else {
                        setStatus(String(result?.message || t('tools.status.ecmUnecmDownloadFailed', 'Failed to download ECM/UNECM archive.')), 'error');
                    }
                    return;
                }
                lastDownloadedPath = String(result?.filePath || '').trim();
                if (lastDownloadedPath) {
                    setSourcePath(lastDownloadedPath);
                }
                if (showFolderBtn) showFolderBtn.style.display = lastDownloadedPath ? '' : 'none';
                renderResults([result]);
                setStatus(t('tools.status.ecmUnecmDownloadSuccess', 'ECM/UNECM source ZIP downloaded.'), 'success');
            } catch (error) {
                setStatus(String(error?.message || error || t('tools.status.ecmUnecmDownloadFailed', 'Failed to download ECM/UNECM archive.')), 'error');
            } finally {
                setRunning(false);
            }
        });
    }

    if (pickSourceBtn) {
        pickSourceBtn.addEventListener('click', async () => {
            try {
                const pick = await window.emubro.invoke('open-file-dialog', {
                    title: t('tools.ecmUnecmPickSource', 'Select Source Path'),
                    properties: ['openFile', 'openDirectory'],
                    filters: [
                        { name: 'ZIP Archive', extensions: ['zip'] },
                        { name: t('tools.fileDialogAllFiles', 'All Files'), extensions: ['*'] }
                    ]
                });
                if (!pick || pick.canceled || !Array.isArray(pick.filePaths) || pick.filePaths.length === 0) return;
                const selected = String(pick.filePaths[0] || '').trim();
                if (!selected) return;
                setSourcePath(selected);
                setStatus(t('tools.ecmUnecmSourcePicked', 'Source path selected.'), 'success');
            } catch (error) {
                setStatus(String(error?.message || error || t('tools.ecmUnecmPickSourceFailed', 'Failed to select source path.')), 'error');
            }
        });
    }

    if (detectEnvBtn) {
        detectEnvBtn.addEventListener('click', async () => {
            setRunning(true);
            setStatus(t('tools.status.ecmUnecmDetectRunning', 'Detecting build environment...'), 'info');
            try {
                const response = await window.emubro.invoke('tools:ecm:detect-build-env');
                if (!response?.success) {
                    setStatus(String(response?.message || t('tools.status.ecmUnecmDetectFailed', 'Failed to detect build environment.')), 'error');
                    return;
                }
                setEnvironmentSummary(response.environment || null);
                refreshCompilerSelect();
                refreshCompilerInstallOptions(
                    response?.environment?.compilerInstallOptions || [],
                    response?.environment?.recommendedCompilerInstaller || ''
                );
                setStatus(t('tools.status.ecmUnecmDetectSuccess', 'Build environment detected.'), 'success');
            } catch (error) {
                setStatus(String(error?.message || error || t('tools.status.ecmUnecmDetectFailed', 'Failed to detect build environment.')), 'error');
            } finally {
                setRunning(false);
            }
        });
    }

    if (installSelectEl) {
        installSelectEl.addEventListener('change', () => {
            const selected = getSelectedCompilerInstallOption();
            if (installHintEl) {
                installHintEl.textContent = selected
                    ? String(selected.description || '').trim()
                    : t('tools.ecmUnecmInstallHintEmpty', 'Compiler install suggestion appears after environment detection.');
            }
        });
    }

    if (installCompilerBtn) {
        installCompilerBtn.addEventListener('click', async () => {
            const selected = getSelectedCompilerInstallOption();
            if (!selected) {
                setStatus(t('tools.ecmUnecmInstallSelectFirst', 'Select a compiler install option first.'), 'warning');
                return;
            }

            const action = String(selected.action || '').trim().toLowerCase();
            if (action === 'url') {
                await openUrl(String(selected.url || '').trim());
                setStatus(t('tools.ecmUnecmInstallOpenedDownload', 'Opened compiler download page.'), 'success');
                return;
            }

            if (action !== 'command') {
                setStatus(t('tools.ecmUnecmInstallUnsupported', 'Unsupported installer action.'), 'error');
                return;
            }

            setRunning(true);
            setStatus(t('tools.status.ecmUnecmCompilerInstallRunning', 'Installing compiler...'), 'info');
            try {
                let installResult = await window.emubro.invoke('tools:ecm:install-compiler', {
                    optionId: String(selected.id || '').trim(),
                    allowOpenTerminal: false
                });

                if (!installResult?.success && installResult?.needsManual && String(window.emubro?.platform || '').toLowerCase() !== 'win32') {
                    const shouldOpenTerminal = window.confirm(t(
                        'tools.ecmUnecmInstallNeedsTerminal',
                        'Install needs elevated terminal permissions. Open a terminal and run the install command now?'
                    ));
                    if (shouldOpenTerminal) {
                        installResult = await window.emubro.invoke('tools:ecm:install-compiler', {
                            optionId: String(selected.id || '').trim(),
                            allowOpenTerminal: true
                        });
                    }
                }

                if (!installResult?.success) {
                    const message = String(installResult?.message || t('tools.status.ecmUnecmCompilerInstallFailed', 'Compiler install failed.'));
                    setStatus(message, installResult?.needsManual ? 'warning' : 'error');
                    return;
                }

                if (installResult?.environment) {
                    setEnvironmentSummary(installResult.environment);
                    refreshCompilerSelect();
                    refreshCompilerInstallOptions(
                        installResult?.environment?.compilerInstallOptions || [],
                        installResult?.environment?.recommendedCompilerInstaller || ''
                    );
                } else {
                    const envResponse = await window.emubro.invoke('tools:ecm:detect-build-env');
                    if (envResponse?.success) {
                        setEnvironmentSummary(envResponse.environment || null);
                        refreshCompilerSelect();
                        refreshCompilerInstallOptions(
                            envResponse?.environment?.compilerInstallOptions || [],
                            envResponse?.environment?.recommendedCompilerInstaller || ''
                        );
                    }
                }

                setStatus(String(installResult?.message || t('tools.status.ecmUnecmCompilerInstallSuccess', 'Compiler install finished.')), 'success');
            } catch (error) {
                setStatus(String(error?.message || error || t('tools.status.ecmUnecmCompilerInstallFailed', 'Compiler install failed.')), 'error');
            } finally {
                setRunning(false);
            }
        });
    }

    if (buildBtn) {
        buildBtn.addEventListener('click', async () => {
            const sourcePath = String(selectedSourcePath || lastDownloadedPath || '').trim();
            if (!sourcePath) {
                setStatus(t('tools.ecmUnecmNoSourceForBuild', 'Select a source ZIP/folder first.'), 'warning');
                return;
            }
            setRunning(true);
            setStatus(t('tools.status.ecmUnecmBuildRunning', 'Building ECM/UNECM binaries...'), 'info');
            try {
                const selectedCompiler = String(compilerSelectEl?.value || '').trim();
                const result = await window.emubro.invoke('tools:ecm:build-binaries', {
                    sourcePath,
                    compiler: selectedCompiler || String(detectedEnvironment?.recommendedCompiler || '').trim()
                });
                if (!result?.success) {
                    setStatus(String(result?.message || t('tools.status.ecmUnecmBuildFailed', 'Build failed.')), 'error');
                    return;
                }
                const binaries = Array.isArray(result?.binaries) ? result.binaries : [];
                lastBuildOutputPath = String(binaries[0] || result?.outputDir || '').trim();
                if (showBuildFolderBtn) showBuildFolderBtn.style.display = lastBuildOutputPath ? '' : 'none';
                const rows = binaries.map((filePath) => ({
                    success: true,
                    filePath,
                    sizeBytes: 0,
                    sourceUrl: ''
                }));
                renderResults(rows.length > 0 ? rows : [{
                    success: true,
                    filePath: String(result?.outputDir || ''),
                    sizeBytes: 0,
                    sourceUrl: ''
                }]);
                if (result?.environment) {
                    setEnvironmentSummary(result.environment);
                    refreshCompilerSelect();
                    refreshCompilerInstallOptions(
                        result?.environment?.compilerInstallOptions || [],
                        result?.environment?.recommendedCompilerInstaller || ''
                    );
                }
                setStatus(t('tools.status.ecmUnecmBuildSuccess', 'ECM/UNECM binaries built successfully.'), 'success');
            } catch (error) {
                setStatus(String(error?.message || error || t('tools.status.ecmUnecmBuildFailed', 'Build failed.')), 'error');
            } finally {
                setRunning(false);
            }
        });
    }

    if (repoBtn) {
        repoBtn.addEventListener('click', async () => {
            await openUrl(info?.repoUrl || 'https://github.com/qeedquan/ecm/tree/master');
        });
    }

    if (sourceUrlBtn) {
        sourceUrlBtn.addEventListener('click', async () => {
            await openUrl(info?.sourceZipUrl || 'https://codeload.github.com/qeedquan/ecm/zip/refs/heads/master');
        });
    }

    if (showFolderBtn) {
        showFolderBtn.addEventListener('click', async () => {
            if (!lastDownloadedPath) return;
            const result = await window.emubro.invoke('show-item-in-folder', lastDownloadedPath);
            if (!result?.success) {
                setStatus(String(result?.message || t('tools.status.openFolderFailed', 'Failed to open folder.')), 'error');
            }
        });
    }

    if (showBuildFolderBtn) {
        showBuildFolderBtn.addEventListener('click', async () => {
            if (!lastBuildOutputPath) return;
            const result = await window.emubro.invoke('show-item-in-folder', lastBuildOutputPath);
            if (!result?.success) {
                setStatus(String(result?.message || t('tools.status.openFolderFailed', 'Failed to open folder.')), 'error');
            }
        });
    }

    renderResults([]);
    setSourcePath('');
    setEnvironmentSummary(null);
    refreshCompilerSelect();
    refreshCompilerInstallOptions([], '');
    void loadInfo();
}
