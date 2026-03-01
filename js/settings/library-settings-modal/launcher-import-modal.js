export async function openLauncherImportModal({
    emubro,
    importDraft,
    escapeAttr,
    refreshGamesAfterImport = async () => {},
    addFooterNotification = () => {}
}) {
    const stores = importDraft.launcherStores || {};
    const scanResult = await emubro.invoke('launcher:scan-games', {
        stores: {
            steam: stores.steam !== false,
            epic: !!stores.epic,
            gog: !!stores.gog
        },
        discoveryMode: importDraft.launcherDiscoveryMode || 'filesystem'
    });
    if (!scanResult?.success) {
        alert(scanResult?.message || 'Failed to scan launcher libraries.');
        return;
    }

    const rows = [];
    const addRows = (storeKey, list) => {
        (Array.isArray(list) ? list : []).forEach((entry) => {
            rows.push({ ...entry, launcher: storeKey });
        });
    };
    addRows('steam', scanResult?.stores?.steam);
    addRows('epic', scanResult?.stores?.epic);
    addRows('gog', scanResult?.stores?.gog);

    if (rows.length === 0) {
        alert('No launcher games found for the selected stores.');
        return;
    }

    let existingPaths = new Set();
    try {
        const existingGames = await emubro.invoke('get-games');
        if (Array.isArray(existingGames)) {
            existingPaths = new Set(
                existingGames
                    .map((game) => String(game?.filePath || '').trim().toLowerCase())
                    .filter(Boolean)
            );
        }
    } catch (_e) {}
    rows.forEach((row) => {
        row.isImported = existingPaths.has(String(row.launchUri || '').trim().toLowerCase());
    });

    const overlay = document.createElement('div');
    overlay.style.cssText = [
        'position:fixed',
        'inset:0',
        'z-index:3700',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'padding:20px',
        'background:rgba(0,0,0,0.58)'
    ].join(';');

    const modal = document.createElement('div');
    modal.className = 'glass';
    modal.style.cssText = [
        'width:min(860px,100%)',
        'max-height:80vh',
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
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
            <h3 style="margin:0;font-size:1rem;">Import Launcher Games</h3>
            <button type="button" class="action-btn remove-btn" data-launcher-close>Close</button>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            <button type="button" class="action-btn" data-launcher-select-all>Select All</button>
            <button type="button" class="action-btn" data-launcher-clear>Clear</button>
            <label style="display:flex;align-items:center;gap:6px;font-size:0.85rem;">
                <input type="checkbox" data-launcher-installed-only />
                <span>Installed only</span>
            </label>
        </div>
        <div data-launcher-list style="display:grid;gap:8px;max-height:52vh;overflow:auto;padding-right:4px;">
            ${rows.map((row, idx) => `
                <label data-launcher-row="${idx}" data-launcher-installed="${row.installed ? '1' : '0'}" style="display:flex;gap:10px;align-items:center;border:1px solid var(--border-color);border-radius:10px;padding:8px 10px;background:var(--bg-primary);">
                    <input type="checkbox" data-launcher-pick="${idx}"${row.isImported ? '' : ' checked'} />
                    <div style="display:grid;gap:4px;">
                        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                            <span style="font-weight:600;">${escapeAttr(row.name || 'Unknown')}</span>
                            <span style="font-size:0.72rem;padding:2px 6px;border-radius:999px;background:rgba(255,255,255,0.08);text-transform:uppercase;letter-spacing:0.04em;">${escapeAttr(String(row.launcher || ''))}</span>
                            ${row.isImported ? '<span style="font-size:0.72rem;color:var(--text-secondary);">Already in library</span>' : ''}
                            ${row.installed ? '<span style="font-size:0.72rem;color:var(--text-secondary);">Installed</span>' : ''}
                        </div>
                        <div style="font-size:0.82rem;color:var(--text-secondary);">
                            ${row.installDir ? escapeAttr(row.installDir) : ''}
                        </div>
                    </div>
                </label>
            `).join('')}
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button type="button" class="action-btn launch-btn" data-launcher-import>Import Selected</button>
        </div>
    `;

    const close = () => overlay.remove();
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) close();
    });
    modal.querySelector('[data-launcher-close]')?.addEventListener('click', close);
    modal.querySelector('[data-launcher-select-all]')?.addEventListener('click', () => {
        modal.querySelectorAll('[data-launcher-pick]').forEach((input) => {
            input.checked = true;
        });
    });
    modal.querySelector('[data-launcher-clear]')?.addEventListener('click', () => {
        modal.querySelectorAll('[data-launcher-pick]').forEach((input) => {
            input.checked = false;
        });
    });
    modal.querySelector('[data-launcher-installed-only]')?.addEventListener('change', (event) => {
        const enabled = !!event.target.checked;
        modal.querySelectorAll('[data-launcher-row]').forEach((rowEl) => {
            const isInstalled = rowEl.dataset.launcherInstalled === '1';
            rowEl.style.display = enabled && !isInstalled ? 'none' : '';
        });
        const listEl = modal.querySelector('[data-launcher-list]');
        if (listEl) listEl.scrollTop = 0;
    });
    modal.querySelector('[data-launcher-import]')?.addEventListener('click', async () => {
        const picks = [];
        modal.querySelectorAll('[data-launcher-pick]').forEach((input) => {
            if (!input.checked) return;
            const idx = Number(input.dataset.launcherPick);
            if (!Number.isFinite(idx) || !rows[idx]) return;
            picks.push(rows[idx]);
        });
        if (picks.length === 0) {
            alert('Select at least one game to import.');
            return;
        }
        const result = await emubro.invoke('launcher:import-games', { games: picks });
        if (!result?.success) {
            alert(result?.message || 'Failed to import launcher games.');
            return;
        }
        await refreshGamesAfterImport();
        addFooterNotification(`Imported ${result.added?.length || 0} games.`, 'success');
        close();
    });

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}
