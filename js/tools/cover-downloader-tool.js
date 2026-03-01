const COVER_SOURCE_STORAGE_KEY = 'emuBro.coverDownloader.sources.v1';
const COVER_DEFAULT_SOURCES = Object.freeze({
    psx: 'https://raw.githubusercontent.com/xlenore/psx-covers/main/covers/default/${serial}.jpg',
    ps2: 'https://raw.githubusercontent.com/xlenore/ps2-covers/main/covers/default/${serial}.jpg'
});

function normalizeCoverPlatform(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return '';
    if (raw === 'psx' || raw === 'ps2') return raw;
    if (raw === 'ps1' || raw === 'ps') return 'psx';
    if (raw === 'playstation' || raw === 'playstation-1') return 'psx';
    if (raw === 'playstation2' || raw === 'playstation-2') return 'ps2';
    return '';
}

function hasGameSerial(game) {
    const direct = [
        game?.code,
        game?.productCode,
        game?.serial,
        game?.gameCode
    ];
    if (direct.some((value) => String(value || '').trim())) return true;
    const hay = `${String(game?.name || '')} ${String(game?.filePath || '')}`.toUpperCase();
    return /\b[A-Z]{4}[-_. ]?\d{3,7}\b/.test(hay);
}

function normalizeCoverSourceLine(value) {
    const line = String(value || '').trim();
    if (!line) return '';
    if (!/^https?:\/\//i.test(line)) return '';
    if (!line.includes('${serial}')) return '';
    return line;
}

function parseCoverSourceTextArea(value) {
    const seen = new Set();
    return String(value || '')
        .split(/\r?\n/)
        .map((line) => normalizeCoverSourceLine(line))
        .filter(Boolean)
        .filter((line) => {
            const key = line.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
}

function loadCoverSourceOverrides() {
    try {
        const raw = localStorage.getItem(COVER_SOURCE_STORAGE_KEY);
        if (!raw) return { psx: [], ps2: [] };
        const parsed = JSON.parse(raw);
        return {
            psx: parseCoverSourceTextArea((Array.isArray(parsed?.psx) ? parsed.psx : []).join('\n')),
            ps2: parseCoverSourceTextArea((Array.isArray(parsed?.ps2) ? parsed.ps2 : []).join('\n'))
        };
    } catch (_error) {
        return { psx: [], ps2: [] };
    }
}

function saveCoverSourceOverrides(value) {
    const normalized = {
        psx: parseCoverSourceTextArea((Array.isArray(value?.psx) ? value.psx : []).join('\n')),
        ps2: parseCoverSourceTextArea((Array.isArray(value?.ps2) ? value.ps2 : []).join('\n'))
    };
    localStorage.setItem(COVER_SOURCE_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
}

function formatCoverDownloadResult(row, t) {
    if (!row || typeof row !== 'object') return '';
    const status = String(row.status || '').trim();
    if (status === 'downloaded') return t('tools.coverDownloaderResultDownloaded', 'Downloaded');
    if (status === 'reused_existing_file') return t('tools.coverDownloaderResultReused', 'Reused local cover');
    if (status === 'skipped_existing_cover') return t('tools.coverDownloaderResultSkipped', 'Skipped');
    if (status === 'missing_serial') return t('tools.coverDownloaderNoSerial', 'No serial/code detected for this game.');
    if (status === 'not_found') return t('tools.coverDownloaderNotFound', 'No cover found on source repositories.');
    return String(row.message || t('tools.coverDownloaderResultFailed', 'Failed'));
}

export function renderCoverDownloaderTool({ t, escapeHtml }) {
    const gamesContainer = document.getElementById('games-container');
    if (!gamesContainer) return;

    const toolContent = document.createElement('div');
    toolContent.className = 'tool-content cover-downloader-tool';
    toolContent.innerHTML = `
        <h3>${escapeHtml(t('tools.coverDownloader', 'Cover Downloader'))}</h3>
        <p>${escapeHtml(t('tools.coverDownloaderDesc', 'Download PS1/PS2 covers by serial code and assign them to your games.'))}</p>
        <p class="tool-output cover-downloader-hint">${escapeHtml(t('tools.coverDownloaderSupportedHint', 'Supports PS1 (psx-covers) and PS2 (ps2-covers) using game serials.'))}</p>
        <div class="cover-downloader-sources">
            <div class="cover-source-block">
                <h4>${escapeHtml(t('tools.coverDownloaderPs1Source', 'PS1 Source'))}</h4>
                <div class="cover-source-links" data-cover-default-links="psx"></div>
                <label>${escapeHtml(t('tools.coverDownloaderExtraLinks', 'Extra links (one per line)'))}</label>
                <textarea rows="3" data-cover-source-input="psx" placeholder="https://example.com/ps1/\${serial}.jpg"></textarea>
            </div>
            <div class="cover-source-block">
                <h4>${escapeHtml(t('tools.coverDownloaderPs2Source', 'PS2 Source'))}</h4>
                <div class="cover-source-links" data-cover-default-links="ps2"></div>
                <label>${escapeHtml(t('tools.coverDownloaderExtraLinks', 'Extra links (one per line)'))}</label>
                <textarea rows="3" data-cover-source-input="ps2" placeholder="https://example.com/ps2/\${serial}.jpg"></textarea>
            </div>
        </div>
        <div class="cover-downloader-source-actions">
            <button type="button" class="action-btn small" data-cover-action="save-sources">${escapeHtml(t('tools.coverDownloaderSaveLinks', 'Save Links'))}</button>
            <button type="button" class="action-btn small" data-cover-action="reset-sources">${escapeHtml(t('tools.coverDownloaderResetLinks', 'Reset Extras'))}</button>
        </div>

        <div class="cover-downloader-controls">
            <label class="cover-downloader-toggle">
                <input type="checkbox" data-cover-only-missing checked />
                <span>${escapeHtml(t('tools.coverDownloaderOnlyMissing', 'Only missing covers'))}</span>
            </label>
            <label class="cover-downloader-toggle">
                <input type="checkbox" data-cover-overwrite />
                <span>${escapeHtml(t('tools.coverDownloaderOverwrite', 'Overwrite existing files'))}</span>
            </label>
            <button type="button" class="action-btn" data-cover-action="run">${escapeHtml(t('tools.coverDownloaderRun', 'Download Covers'))}</button>
            <button type="button" class="action-btn" data-cover-action="refresh">${escapeHtml(t('buttons.refresh', 'Refresh'))}</button>
        </div>

        <p class="tool-output" data-cover-status></p>
        <p class="tool-output cover-downloader-stats" data-cover-stats></p>
        <p class="tool-output cover-downloader-summary" data-cover-summary></p>
        <div class="cover-downloader-results" data-cover-results></div>
    `;
    gamesContainer.appendChild(toolContent);

    const statusEl = toolContent.querySelector('[data-cover-status]');
    const statsEl = toolContent.querySelector('[data-cover-stats]');
    const summaryEl = toolContent.querySelector('[data-cover-summary]');
    const resultsEl = toolContent.querySelector('[data-cover-results]');
    const onlyMissingInput = toolContent.querySelector('[data-cover-only-missing]');
    const overwriteInput = toolContent.querySelector('[data-cover-overwrite]');
    const runBtn = toolContent.querySelector('[data-cover-action="run"]');
    const refreshBtn = toolContent.querySelector('[data-cover-action="refresh"]');
    const saveSourcesBtn = toolContent.querySelector('[data-cover-action="save-sources"]');
    const resetSourcesBtn = toolContent.querySelector('[data-cover-action="reset-sources"]');
    const psxSourceInput = toolContent.querySelector('[data-cover-source-input="psx"]');
    const ps2SourceInput = toolContent.querySelector('[data-cover-source-input="ps2"]');
    const psxDefaultLinksEl = toolContent.querySelector('[data-cover-default-links="psx"]');
    const ps2DefaultLinksEl = toolContent.querySelector('[data-cover-default-links="ps2"]');

    const renderSourceLinkList = (element, links = []) => {
        if (!element) return;
        const rows = Array.isArray(links) ? links : [];
        if (!rows.length) {
            element.innerHTML = '';
            return;
        }
        element.innerHTML = rows.map((link) => {
            const safe = String(link || '').trim();
            if (!safe) return '';
            return `<a href="${escapeHtml(safe)}" target="_blank" rel="noopener noreferrer">${escapeHtml(safe)}</a>`;
        }).join('');
    };

    const setStatus = (message, level = 'info') => {
        if (!statusEl) return;
        statusEl.textContent = String(message || '').trim();
        statusEl.dataset.level = level;
    };

    const setSummary = (message, level = 'info') => {
        if (!summaryEl) return;
        summaryEl.textContent = String(message || '').trim();
        summaryEl.dataset.level = level;
    };

    const renderResults = (rows = []) => {
        if (!resultsEl) return;
        const list = Array.isArray(rows) ? rows : [];
        if (!list.length) {
            resultsEl.innerHTML = `<div class="cover-download-row is-empty">${escapeHtml(t('tools.coverDownloaderNoResults', 'No download results yet. Click "Download Covers" to start.'))}</div>`;
            return;
        }
        resultsEl.innerHTML = list.map((row) => {
            const name = String(row?.name || `Game #${row?.gameId || '?'}`).trim();
            const platform = String(row?.platformShortName || '').trim().toUpperCase();
            const label = formatCoverDownloadResult(row, t);
            const level = row?.success ? (row?.downloaded ? 'success' : 'info') : 'error';
            return `
                <div class="cover-download-row" data-level="${escapeHtml(level)}">
                    <div class="cover-download-game">
                        ${escapeHtml(name)} ${platform ? `<span>(${escapeHtml(platform)})</span>` : ''}
                        ${row?.sourceUrl ? `<a href="${escapeHtml(String(row.sourceUrl))}" target="_blank" rel="noopener noreferrer">${escapeHtml(t('tools.coverDownloaderOpenSource', 'Open source'))}</a>` : ''}
                    </div>
                    <div class="cover-download-status">${escapeHtml(label)}</div>
                </div>
            `;
        }).join('');
    };

    const getSourceOverridesFromInputs = () => ({
        psx: parseCoverSourceTextArea(psxSourceInput?.value || ''),
        ps2: parseCoverSourceTextArea(ps2SourceInput?.value || '')
    });

    const applySourceOverridesToInputs = (overrides) => {
        if (psxSourceInput) psxSourceInput.value = Array.isArray(overrides?.psx) ? overrides.psx.join('\n') : '';
        if (ps2SourceInput) ps2SourceInput.value = Array.isArray(overrides?.ps2) ? overrides.ps2.join('\n') : '';
    };

    const loadConfiguredSourceLinks = async () => {
        renderSourceLinkList(psxDefaultLinksEl, [COVER_DEFAULT_SOURCES.psx]);
        renderSourceLinkList(ps2DefaultLinksEl, [COVER_DEFAULT_SOURCES.ps2]);
        try {
            const response = await window.emubro.invoke('covers:get-source-config');
            if (!response?.success) return;
            const links = response?.sources || {};
            renderSourceLinkList(psxDefaultLinksEl, Array.isArray(links.psx) && links.psx.length ? links.psx : [COVER_DEFAULT_SOURCES.psx]);
            renderSourceLinkList(ps2DefaultLinksEl, Array.isArray(links.ps2) && links.ps2.length ? links.ps2 : [COVER_DEFAULT_SOURCES.ps2]);
        } catch (_error) {}
    };

    const refreshStats = async () => {
        try {
            const games = await window.emubro.invoke('get-games');
            const rows = Array.isArray(games) ? games : [];
            const supported = rows.filter((game) => normalizeCoverPlatform(game?.platformShortName || game?.platform)).length;
            const withSerial = rows.filter((game) => {
                if (!normalizeCoverPlatform(game?.platformShortName || game?.platform)) return false;
                return hasGameSerial(game);
            }).length;
            if (statsEl) {
                statsEl.textContent = t('tools.coverDownloaderStats', 'PS1/PS2 games: {{supported}} | with serial/code: {{withSerial}}', {
                    supported,
                    withSerial
                });
            }
        } catch (error) {
            if (statsEl) statsEl.textContent = String(error?.message || error || '');
        }
    };

    const setRunning = (running) => {
        const isRunning = !!running;
        if (runBtn) runBtn.disabled = isRunning;
        if (refreshBtn) refreshBtn.disabled = isRunning;
    };

    if (runBtn) {
        runBtn.addEventListener('click', async () => {
            setRunning(true);
            setStatus(t('tools.status.coverDownloaderRunning', 'Downloading covers...'), 'info');
            try {
                const result = await window.emubro.invoke('covers:download-for-library', {
                    onlyMissing: !!onlyMissingInput?.checked,
                    overwrite: !!overwriteInput?.checked,
                    sourceOverrides: getSourceOverridesFromInputs()
                });
                if (!result?.success) {
                    setStatus(
                        t('tools.status.coverDownloaderFailed', 'Cover download failed: {{message}}', {
                            message: String(result?.message || 'Unknown error')
                        }),
                        'error'
                    );
                    return;
                }
                setStatus('', 'info');
                setSummary(
                    t('tools.coverDownloaderSummary', 'Processed {{total}} game(s): {{downloaded}} downloaded, {{skipped}} skipped, {{failed}} failed.', {
                        total: Number(result?.total || 0),
                        downloaded: Number(result?.downloaded || 0),
                        skipped: Number(result?.skipped || 0),
                        failed: Number(result?.failed || 0)
                    }),
                    Number(result?.failed || 0) > 0 ? 'warning' : 'success'
                );
                renderResults(result?.results || []);
                await refreshStats();
            } catch (error) {
                setStatus(
                    t('tools.status.coverDownloaderFailed', 'Cover download failed: {{message}}', {
                        message: String(error?.message || error || 'Unknown error')
                    }),
                    'error'
                );
            } finally {
                setRunning(false);
            }
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            await refreshStats();
        });
    }

    if (saveSourcesBtn) {
        saveSourcesBtn.addEventListener('click', () => {
            const saved = saveCoverSourceOverrides(getSourceOverridesFromInputs());
            applySourceOverridesToInputs(saved);
            setStatus(t('tools.coverDownloaderLinksSaved', 'Cover source links saved.'), 'success');
        });
    }

    if (resetSourcesBtn) {
        resetSourcesBtn.addEventListener('click', () => {
            const saved = saveCoverSourceOverrides({ psx: [], ps2: [] });
            applySourceOverridesToInputs(saved);
            setStatus(t('tools.coverDownloaderLinksReset', 'Extra cover links reset.'), 'info');
        });
    }

    applySourceOverridesToInputs(loadCoverSourceOverrides());
    void loadConfiguredSourceLinks();
    renderResults([]);
    void refreshStats();
}
