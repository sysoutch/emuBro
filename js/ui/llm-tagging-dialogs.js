export function openGlobalLlmTaggingSetupModal({ totalAll = 0, totalUntagged = 0 } = {}) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.cssText = [
            'position:fixed',
            'inset:0',
            'z-index:3800',
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'padding:20px',
            'background:rgba(0,0,0,0.58)'
        ].join(';');

        const modal = document.createElement('div');
        modal.className = 'glass';
        modal.style.cssText = [
            'width:min(760px,100%)',
            'max-height:88vh',
            'overflow:auto',
            'background:var(--bg-secondary)',
            'border:1px solid var(--border-color)',
            'border-radius:14px',
            'padding:16px',
            'box-shadow:0 18px 42px rgba(0,0,0,0.45)',
            'display:grid',
            'gap:12px'
        ].join(';');

        modal.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
                <h3 style="margin:0;font-size:1.1rem;color:var(--accent-color);">Global LLM Tagging</h3>
                <button type="button" class="close-btn" data-close>&times;</button>
            </div>
            <p style="margin:0;color:var(--text-secondary);">
                Tag many games at once with your configured LLM provider.
            </p>
            <div style="display:grid;gap:10px;border:1px solid var(--border-color);border-radius:10px;padding:12px;">
                <label style="display:flex;align-items:center;gap:10px;">
                    <input type="checkbox" data-input="include-tagged" />
                    <span>Include games that already have tags</span>
                </label>
                <div style="display:grid;grid-template-columns:1fr 180px;gap:10px;align-items:center;">
                    <label style="display:flex;align-items:center;gap:10px;">
                        <input type="radio" name="llm-tag-scope" value="next" checked />
                        <span>Tag next X games</span>
                    </label>
                    <input type="number" min="1" step="1" data-input="next-count" value="${Math.max(1, Math.min(120, Number(totalUntagged || totalAll || 1)))}" />
                </div>
                <label style="display:flex;align-items:center;gap:10px;">
                    <input type="radio" name="llm-tag-scope" value="all" />
                    <span>Tag all matching games</span>
                </label>
                <div style="display:grid;grid-template-columns:1fr 180px;gap:10px;align-items:center;">
                    <label for="llm-chunk-mode">Chunk by</label>
                    <select id="llm-chunk-mode" data-input="chunk-mode">
                        <option value="size">Games per chunk</option>
                        <option value="count">Number of chunks</option>
                    </select>
                </div>
                <div style="display:grid;grid-template-columns:1fr 180px;gap:10px;align-items:center;">
                    <label data-label="chunk-value-label">Games per chunk</label>
                    <input type="number" min="1" step="1" data-input="chunk-value" value="25" />
                </div>
                <label style="display:flex;align-items:center;gap:10px;">
                    <input type="checkbox" data-input="confirm-each-chunk" checked />
                    <span>Ask before sending each next chunk</span>
                </label>
            </div>
            <div data-summary style="display:grid;gap:6px;border:1px solid var(--border-color);border-radius:10px;padding:10px;"></div>
            <div style="display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;">
                <button type="button" class="action-btn" data-cancel>Cancel</button>
                <button type="button" class="action-btn launch-btn" data-start>Start Tagging</button>
            </div>
        `;

        const includeTagged = modal.querySelector('[data-input="include-tagged"]');
        const nextCountInput = modal.querySelector('[data-input="next-count"]');
        const chunkModeSelect = modal.querySelector('[data-input="chunk-mode"]');
        const chunkValueInput = modal.querySelector('[data-input="chunk-value"]');
        const confirmEachChunk = modal.querySelector('[data-input="confirm-each-chunk"]');
        const summaryBox = modal.querySelector('[data-summary]');
        const chunkValueLabel = modal.querySelector('[data-label="chunk-value-label"]');

        const getScope = () => modal.querySelector('input[name="llm-tag-scope"]:checked')?.value === 'all' ? 'all' : 'next';
        const getBaseCount = () => includeTagged?.checked ? Number(totalAll || 0) : Number(totalUntagged || 0);
        const getNextCount = () => Math.max(1, Number.parseInt(String(nextCountInput?.value || '1'), 10) || 1);
        const getChunkValue = () => Math.max(1, Number.parseInt(String(chunkValueInput?.value || '1'), 10) || 1);

        const refreshSummary = () => {
            const baseCount = getBaseCount();
            const scope = getScope();
            const estimated = scope === 'all' ? baseCount : Math.min(baseCount, getNextCount());
            const chunkMode = String(chunkModeSelect?.value || 'size');
            const chunkValue = getChunkValue();
            const chunkSize = chunkMode === 'count'
                ? Math.max(1, Math.ceil(estimated / chunkValue))
                : chunkValue;
            const chunkCount = estimated > 0 ? Math.max(1, Math.ceil(estimated / Math.max(1, chunkSize))) : 0;
            const warnLarge = estimated > 250;

            if (chunkValueLabel) {
                chunkValueLabel.textContent = chunkMode === 'count' ? 'Number of chunks' : 'Games per chunk';
            }
            summaryBox.innerHTML = `
                <div><strong>Matching games:</strong> ${baseCount}</div>
                <div><strong>Planned run:</strong> ${estimated} game(s) in ${chunkCount} chunk(s)${chunkCount > 0 ? ` that's ${chunkSize} game(s) per chunk` : ''}</div>
                <div><strong>Execution:</strong> ${confirmEachChunk?.checked ? 'Pause for confirmation after each chunk' : 'Run chunks continuously'}</div>
                ${warnLarge ? '<div style="color:#e8b84a;"><strong>Warning:</strong> Large batch for the current category selection. Consider smaller chunks to avoid long wait times.</div>' : ''}
            `;
        };

        modal.querySelectorAll('input[name="llm-tag-scope"]').forEach((radio) => {
            radio.addEventListener('change', () => {
                const nextMode = getScope();
                if (nextCountInput) nextCountInput.disabled = nextMode === 'all';
                refreshSummary();
            });
        });
        [includeTagged, nextCountInput, chunkModeSelect, chunkValueInput, confirmEachChunk].forEach((control) => {
            control?.addEventListener('input', refreshSummary);
            control?.addEventListener('change', refreshSummary);
        });

        const close = (value = null) => {
            overlay.remove();
            resolve(value);
        };

        modal.querySelector('[data-close]')?.addEventListener('click', () => close(null));
        modal.querySelector('[data-cancel]')?.addEventListener('click', () => close(null));
        modal.querySelector('[data-start]')?.addEventListener('click', () => {
            const baseCount = getBaseCount();
            if (baseCount <= 0) {
                summaryBox.innerHTML = '<div style="color:#e8b84a;">No matching games for this selection.</div>';
                return;
            }
            const scope = getScope();
            const nextCount = getNextCount();
            const selectedCount = scope === 'all' ? baseCount : Math.min(baseCount, nextCount);
            if (selectedCount <= 0) {
                summaryBox.innerHTML = '<div style="color:#e8b84a;">Please select at least one game.</div>';
                return;
            }
            close({
                includeAlreadyTagged: !!includeTagged?.checked,
                processMode: scope,
                nextCount: selectedCount,
                chunkMode: String(chunkModeSelect?.value || 'size') === 'count' ? 'count' : 'size',
                chunkValue: getChunkValue(),
                confirmEachChunk: !!confirmEachChunk?.checked
            });
        });

        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) close(null);
        });

        refreshSummary();
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    });
}

export function createGlobalLlmProgressDialog({ totalGames = 0, totalChunks = 0, confirmEachChunk = true } = {}) {
    const overlay = document.createElement('div');
    overlay.style.cssText = [
        'position:fixed',
        'inset:0',
        'z-index:3900',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'padding:20px',
        'background:rgba(0,0,0,0.6)'
    ].join(';');

    const modal = document.createElement('div');
    modal.className = 'glass';
    modal.style.cssText = [
        'width:min(860px,100%)',
        'max-height:90vh',
        'overflow:auto',
        'background:var(--bg-secondary)',
        'border:1px solid var(--border-color)',
        'border-radius:14px',
        'padding:16px',
        'box-shadow:0 18px 42px rgba(0,0,0,0.45)',
        'display:grid',
        'gap:12px'
    ].join(';');

    modal.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
            <h3 style="margin:0;font-size:1.05rem;color:var(--accent-color);">Global LLM Tagging Progress</h3>
            <button type="button" class="close-btn" data-close>&times;</button>
        </div>
        <p data-progress-status style="margin:0;color:var(--text-secondary);">Preparing...</p>
        <div style="height:10px;background:rgba(255,255,255,0.08);border:1px solid var(--border-color);border-radius:999px;overflow:hidden;">
            <div data-progress-fill style="height:100%;width:0%;background:var(--accent-color);transition:width 0.2s ease;"></div>
        </div>
        <div data-progress-metrics style="display:flex;gap:12px;flex-wrap:wrap;font-size:0.9rem;color:var(--text-secondary);"></div>
        <div data-progress-logs style="max-height:280px;overflow:auto;border:1px solid var(--border-color);border-radius:10px;padding:10px;display:grid;gap:6px;font-size:0.86rem;"></div>
        <div data-progress-controls style="display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;">
            <button type="button" class="action-btn" data-stop style="display:none;">Stop Here</button>
            <button type="button" class="action-btn launch-btn" data-next style="display:none;">Continue Next Chunk</button>
            <button type="button" class="action-btn launch-btn" data-close-final style="display:none;">Close</button>
        </div>
    `;

    const statusEl = modal.querySelector('[data-progress-status]');
    const fillEl = modal.querySelector('[data-progress-fill]');
    const metricsEl = modal.querySelector('[data-progress-metrics]');
    const logsEl = modal.querySelector('[data-progress-logs]');
    const stopBtn = modal.querySelector('[data-stop]');
    const nextBtn = modal.querySelector('[data-next]');
    const closeBtn = modal.querySelector('[data-close]');
    const closeFinalBtn = modal.querySelector('[data-close-final]');

    let processed = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    let continueResolver = null;
    let completed = false;
    let canceled = false;

    const addLog = (message, level = 'info') => {
        const row = document.createElement('div');
        row.style.color = level === 'error'
            ? 'var(--danger-color, #ff4d4f)'
            : (level === 'warning' ? '#e8b84a' : 'var(--text-primary)');
        row.textContent = String(message || '');
        logsEl.prepend(row);
    };

    const renderMetrics = () => {
        const percent = totalGames > 0 ? Math.min(100, Math.round((processed / totalGames) * 100)) : 0;
        if (fillEl) fillEl.style.width = `${percent}%`;
        if (metricsEl) {
            metricsEl.innerHTML = `
                <span><strong>Processed:</strong> ${processed} / ${totalGames}</span>
                <span><strong>Updated:</strong> ${updated}</span>
                <span><strong>Skipped:</strong> ${skipped}</span>
                <span><strong>Failed:</strong> ${failed}</span>
                <span><strong>Chunks:</strong> ${totalChunks}</span>
            `;
        }
    };

    const closeDialog = () => {
        canceled = true;
        overlay.remove();
        if (continueResolver) {
            const resolve = continueResolver;
            continueResolver = null;
            resolve('stop');
        }
    };

    closeBtn?.addEventListener('click', () => {
        if (!completed) {
            const proceed = window.confirm('Stop global LLM tagging now?');
            if (!proceed) return;
        }
        closeDialog();
    });
    closeFinalBtn?.addEventListener('click', closeDialog);
    overlay.addEventListener('click', (event) => {
        if (event.target !== overlay) return;
        if (!completed) return;
        closeDialog();
    });

    renderMetrics();
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    return {
        setStatus(text) {
            if (statusEl) statusEl.textContent = String(text || '');
        },
        updateCounters(next = {}) {
            if (Number.isFinite(Number(next.processed))) processed = Number(next.processed);
            if (Number.isFinite(Number(next.updated))) updated = Number(next.updated);
            if (Number.isFinite(Number(next.skipped))) skipped = Number(next.skipped);
            if (Number.isFinite(Number(next.failed))) failed = Number(next.failed);
            renderMetrics();
        },
        log(text, level = 'info') {
            addLog(text, level);
        },
        async waitForNextChunk(chunkIndex, chunkSize) {
            if (!confirmEachChunk) return 'continue';
            if (statusEl) statusEl.textContent = `Chunk ${chunkIndex - 1} completed. Next chunk ${chunkIndex} will process ${chunkSize} game(s).`;
            if (nextBtn) nextBtn.style.display = 'inline-flex';
            if (stopBtn) stopBtn.style.display = 'inline-flex';
            return new Promise((resolve) => {
                const onNext = () => {
                    nextBtn?.removeEventListener('click', onNext);
                    stopBtn?.removeEventListener('click', onStop);
                    if (nextBtn) nextBtn.style.display = 'none';
                    if (stopBtn) stopBtn.style.display = 'none';
                    continueResolver = null;
                    resolve('continue');
                };
                const onStop = () => {
                    nextBtn?.removeEventListener('click', onNext);
                    stopBtn?.removeEventListener('click', onStop);
                    if (nextBtn) nextBtn.style.display = 'none';
                    if (stopBtn) stopBtn.style.display = 'none';
                    continueResolver = null;
                    resolve('stop');
                };
                continueResolver = resolve;
                nextBtn?.addEventListener('click', onNext);
                stopBtn?.addEventListener('click', onStop);
            });
        },
        complete(summaryText, level = 'info') {
            completed = true;
            this.setStatus(summaryText);
            this.log(summaryText, level);
            if (nextBtn) nextBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = 'none';
            if (closeFinalBtn) closeFinalBtn.style.display = 'inline-flex';
        },
        isCanceled() {
            return canceled;
        },
        close: closeDialog
    };
}
