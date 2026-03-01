function normalizePathForCompare(inputPath) {
    const normalized = String(inputPath || '').trim();
    if (!normalized) return '';
    return (window?.emubro?.platform === 'win32') ? normalized.toLowerCase() : normalized;
}

function dedupePaths(values = []) {
    const seen = new Set();
    return (Array.isArray(values) ? values : [])
        .map((entry) => String(entry || '').trim())
        .filter(Boolean)
        .filter((entry) => {
            const key = normalizePathForCompare(entry);
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
}

function getFileNameFromPath(filePath) {
    const normalized = String(filePath || '').replace(/\\/g, '/');
    const fileName = normalized.split('/').pop() || '';
    return fileName.trim();
}

export function renderCueMakerTool({ t, escapeHtml }) {
    const gamesContainer = document.getElementById('games-container');
    if (!gamesContainer) return;

    const toolContent = document.createElement('div');
    toolContent.className = 'tool-content cue-maker-tool';
    toolContent.innerHTML = `
        <h3>${escapeHtml(t('tools.cueMaker', 'CUE Maker'))}</h3>
        <p>${escapeHtml(t('tools.cueMakerDesc', 'Inspect BIN files, detect missing CUE sheets, and generate CUE files when needed.'))}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="action-btn" data-cue-action="pick">${escapeHtml(t('tools.cueMakerSelectBins', 'Select BIN Files'))}</button>
            <button type="button" class="action-btn" data-cue-action="inspect">${escapeHtml(t('tools.cueMakerInspect', 'Inspect'))}</button>
            <button type="button" class="action-btn" data-cue-action="generate">${escapeHtml(t('tools.cueMakerGenerateMissing', 'Generate Missing CUE'))}</button>
        </div>
        <p class="tool-output" data-cue-status></p>
        <div class="cover-downloader-results" data-cue-results></div>
    `;
    gamesContainer.appendChild(toolContent);

    const statusEl = toolContent.querySelector('[data-cue-status]');
    const resultsEl = toolContent.querySelector('[data-cue-results]');
    const pickBtn = toolContent.querySelector('[data-cue-action="pick"]');
    const inspectBtn = toolContent.querySelector('[data-cue-action="inspect"]');
    const generateBtn = toolContent.querySelector('[data-cue-action="generate"]');

    let selectedBinPaths = [];
    let inspectedRows = [];

    const setStatus = (message, level = 'info') => {
        if (!statusEl) return;
        statusEl.textContent = String(message || '').trim();
        statusEl.dataset.level = String(level || 'info');
    };

    const setRunning = (running) => {
        const isRunning = !!running;
        if (pickBtn) pickBtn.disabled = isRunning;
        if (inspectBtn) inspectBtn.disabled = isRunning;
        if (generateBtn) generateBtn.disabled = isRunning;
    };

    const renderResults = () => {
        if (!resultsEl) return;
        if (!Array.isArray(inspectedRows) || inspectedRows.length === 0) {
            resultsEl.innerHTML = `<div class="cover-download-row is-empty">${escapeHtml(t('tools.cueMakerNoResults', 'No BIN files loaded yet.'))}</div>`;
            return;
        }
        resultsEl.innerHTML = inspectedRows.map((row) => {
            const binPath = String(row?.binPath || '').trim();
            const cuePath = String(row?.cuePath || '').trim();
            const hasCue = !!row?.hasCue;
            return `
                <div class="cover-download-row" data-level="${hasCue ? 'success' : 'warning'}">
                    <div class="cover-download-game">
                        ${escapeHtml(getFileNameFromPath(binPath) || binPath)}
                        <span>${escapeHtml(binPath)}</span>
                        ${cuePath ? `<span>${escapeHtml(cuePath)}</span>` : ''}
                    </div>
                    <div class="cover-download-status">${escapeHtml(hasCue ? t('tools.cueMakerHasCue', 'CUE found') : t('tools.cueMakerMissingCue', 'CUE missing'))}</div>
                </div>
            `;
        }).join('');
    };

    const inspectPaths = async (paths = null) => {
        const targetPaths = dedupePaths(Array.isArray(paths) ? paths : selectedBinPaths);
        if (targetPaths.length === 0) {
            inspectedRows = [];
            renderResults();
            setStatus(t('tools.cueMakerNoSelection', 'Select one or more BIN files first.'), 'warning');
            return;
        }
        setRunning(true);
        try {
            const response = await window.emubro.invoke('cue:inspect-bin-files', targetPaths);
            if (!response?.success) {
                setStatus(String(response?.message || 'Failed to inspect BIN files.'), 'error');
                return;
            }
            selectedBinPaths = targetPaths;
            inspectedRows = Array.isArray(response?.results) ? response.results : [];
            renderResults();
            const missingCount = inspectedRows.filter((row) => !row?.hasCue).length;
            setStatus(
                missingCount > 0
                    ? `${missingCount} file(s) missing CUE.`
                    : t('tools.cueMakerAllGood', 'All selected BIN files already have CUE files.'),
                missingCount > 0 ? 'warning' : 'success'
            );
        } catch (error) {
            setStatus(String(error?.message || error || 'Failed to inspect BIN files.'), 'error');
        } finally {
            setRunning(false);
        }
    };

    if (pickBtn) {
        pickBtn.addEventListener('click', async () => {
            try {
                const pick = await window.emubro.invoke('open-file-dialog', {
                    title: t('tools.cueMakerSelectBins', 'Select BIN Files'),
                    properties: ['openFile', 'multiSelections'],
                    filters: [
                        { name: 'BIN Files', extensions: ['bin'] },
                        { name: t('tools.fileDialogAllFiles', 'All Files'), extensions: ['*'] }
                    ]
                });
                if (!pick || pick.canceled) return;
                selectedBinPaths = dedupePaths(pick.filePaths);
                await inspectPaths(selectedBinPaths);
            } catch (error) {
                setStatus(String(error?.message || error || 'Failed to select BIN files.'), 'error');
            }
        });
    }

    if (inspectBtn) {
        inspectBtn.addEventListener('click', async () => {
            await inspectPaths();
        });
    }

    if (generateBtn) {
        generateBtn.addEventListener('click', async () => {
            const missing = inspectedRows
                .filter((row) => !row?.hasCue)
                .map((row) => String(row?.binPath || '').trim())
                .filter(Boolean);
            const target = dedupePaths(missing.length > 0 ? missing : selectedBinPaths);
            if (target.length === 0) {
                setStatus(t('tools.cueMakerNoSelection', 'Select one or more BIN files first.'), 'warning');
                return;
            }
            setRunning(true);
            try {
                const result = await window.emubro.invoke('cue:generate-for-bin', target);
                if (!result?.success) {
                    setStatus(String(result?.message || 'Failed to generate CUE files.'), 'error');
                    return;
                }
                const generatedCount = Number(result?.generated?.length || 0);
                const existingCount = Number(result?.existing?.length || 0);
                const failedCount = Number(result?.failed?.length || 0);
                setStatus(
                    t('tools.cueMakerGeneratedSummary', 'Generated {{generated}}, already existed {{existing}}, failed {{failed}}.', {
                        generated: generatedCount,
                        existing: existingCount,
                        failed: failedCount
                    }),
                    failedCount > 0 ? 'warning' : 'success'
                );
                await inspectPaths(selectedBinPaths);
            } catch (error) {
                setStatus(String(error?.message || error || 'Failed to generate CUE files.'), 'error');
            } finally {
                setRunning(false);
            }
        });
    }

    inspectedRows = [];
    renderResults();
}
