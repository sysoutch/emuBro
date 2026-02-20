export function showGlassMessageDialog({ title = 'emuBro', message = '', level = 'info' } = {}) {
    const escapeHtml = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

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
            'width:min(640px,100%)',
            'background:var(--bg-secondary)',
            'border:1px solid var(--border-color)',
            'border-radius:14px',
            'padding:16px',
            'box-shadow:0 18px 42px rgba(0,0,0,0.45)',
            'display:grid',
            'gap:12px'
        ].join(';');

        const toneColor = level === 'error'
            ? 'var(--danger-color, #ff4d4f)'
            : (level === 'warning' ? '#e8b84a' : 'var(--accent-color)');

        modal.innerHTML = `
            <h3 style="margin:0;font-size:1.05rem;color:${toneColor};">${escapeHtml(title || 'emuBro')}</h3>
            <div style="white-space:pre-wrap;line-height:1.45;">${escapeHtml(message || '')}</div>
            <div style="display:flex;justify-content:flex-end;">
                <button class="action-btn launch-btn" type="button" data-dialog-ok>OK</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const close = () => {
            overlay.remove();
            resolve();
        };
        overlay.querySelector('[data-dialog-ok]')?.addEventListener('click', close);
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) close();
        });
        const onKeyDown = (event) => {
            if (event.key === 'Escape' || event.key === 'Enter') {
                document.removeEventListener('keydown', onKeyDown, true);
                close();
            }
        };
        document.addEventListener('keydown', onKeyDown, true);
    });
}
