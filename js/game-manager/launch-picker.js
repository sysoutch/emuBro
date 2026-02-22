import { escapeHtml } from './game-utils';
import { dedupeLaunchCandidateMembers } from './launch-candidate-utils';

export function showGroupedLaunchPicker(game, candidates) {
    return new Promise((resolve) => {
        const title = String(game?.__groupDisplayName || game?.name || 'Game').trim() || 'Game';
        const rows = dedupeLaunchCandidateMembers(candidates);
        if (rows.length <= 1) {
            resolve(Number(rows[0]?.id || game?.id || 0) || 0);
            return;
        }

        const overlay = document.createElement('div');
        overlay.style.cssText = [
            'position:fixed',
            'inset:0',
            'z-index:4100',
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
            'max-height:min(78vh,640px)',
            'overflow:auto',
            'border:1px solid var(--border-color)',
            'border-radius:14px',
            'background:var(--bg-secondary)',
            'padding:16px',
            'box-shadow:0 16px 34px rgba(0,0,0,0.42)'
        ].join(';');

        const rowsMarkup = rows.map((member, idx) => {
            const fileName = String(member?.filePath || '').trim().split(/[/\\]/).pop() || 'Unknown file';
            const platformLabel = member?.platform || member?.platformShortName || '';
            return `
                <button type="button" data-launch-candidate-id="${member.id}" style="display:flex;justify-content:space-between;align-items:center;width:100%;text-align:left;border:1px solid var(--border-color);border-radius:10px;background:var(--bg-primary);padding:10px 12px;cursor:pointer;">
                    <span>
                        <strong>${escapeHtml(member?.name || `File ${idx + 1}`)}</strong>
                        <span style="display:block;font-size:0.82rem;color:var(--text-secondary);">${escapeHtml(fileName)}</span>
                    </span>
                    <span style="font-size:0.78rem;color:var(--text-secondary);">${escapeHtml(platformLabel)}</span>
                </button>
            `;
        }).join('');

        modal.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
                <h3 style="margin:0;font-size:1.06rem;">Choose file to launch</h3>
                <button type="button" class="close-btn" aria-label="Close">&times;</button>
            </div>
            <p style="margin:10px 0 12px 0;color:var(--text-secondary);">
                "${escapeHtml(title)}" has multiple launch files. Select which one to start:
            </p>
            <div style="display:grid;gap:8px;">
                ${rowsMarkup}
            </div>
            <div style="display:flex;justify-content:flex-end;margin-top:12px;">
                <button type="button" class="action-btn" data-launch-cancel>Cancel</button>
            </div>
        `;

        const close = (value = 0) => {
            document.removeEventListener('keydown', onKeyDown, true);
            overlay.remove();
            resolve(Number(value || 0) || 0);
        };

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                close(0);
            }
        };

        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) close(0);
        });

        modal.querySelector('.close-btn')?.addEventListener('click', () => close(0));
        modal.querySelector('[data-launch-cancel]')?.addEventListener('click', () => close(0));
        modal.querySelectorAll('[data-launch-candidate-id]').forEach((button) => {
            button.addEventListener('click', () => {
                close(Number(button.getAttribute('data-launch-candidate-id') || 0));
            });
        });

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        document.addEventListener('keydown', onKeyDown, true);
    });
}
