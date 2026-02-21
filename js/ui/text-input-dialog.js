function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function showTextInputDialog({
    title = 'emuBro',
    message = '',
    initialValue = '',
    placeholder = '',
    confirmLabel = 'OK',
    cancelLabel = 'Cancel',
    validate = null
} = {}) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.cssText = [
            'position:fixed',
            'inset:0',
            'z-index:3950',
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'padding:20px',
            'background:rgba(0,0,0,0.58)'
        ].join(';');

        const modal = document.createElement('div');
        modal.className = 'glass';
        modal.style.cssText = [
            'width:min(560px,100%)',
            'background:var(--bg-secondary)',
            'border:1px solid var(--border-color)',
            'border-radius:14px',
            'padding:16px',
            'box-shadow:0 18px 42px rgba(0,0,0,0.45)',
            'display:grid',
            'gap:12px'
        ].join(';');

        modal.innerHTML = `
            <h3 style="margin:0;font-size:1.05rem;color:var(--accent-color);">${escapeHtml(title || 'emuBro')}</h3>
            <div style="white-space:pre-wrap;line-height:1.45;color:var(--text-secondary);">${escapeHtml(message || '')}</div>
            <input type="text" data-input-field value="${escapeHtml(String(initialValue || ''))}" placeholder="${escapeHtml(String(placeholder || ''))}" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-primary);color:var(--text-primary);" />
            <div data-error-text style="min-height:1em;color:var(--danger-color);font-size:0.85rem;"></div>
            <div style="display:flex;justify-content:flex-end;gap:8px;">
                <button class="action-btn small" type="button" data-dialog-cancel>${escapeHtml(cancelLabel || 'Cancel')}</button>
                <button class="action-btn launch-btn" type="button" data-dialog-confirm>${escapeHtml(confirmLabel || 'OK')}</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const input = modal.querySelector('[data-input-field]');
        const errorText = modal.querySelector('[data-error-text]');
        const confirmBtn = modal.querySelector('[data-dialog-confirm]');
        const cancelBtn = modal.querySelector('[data-dialog-cancel]');

        const cleanup = () => {
            document.removeEventListener('keydown', onKeyDown, true);
            overlay.remove();
        };

        const closeWith = (value) => {
            cleanup();
            resolve(value);
        };

        const runValidation = (value) => {
            if (typeof validate !== 'function') return '';
            try {
                const result = validate(value);
                return typeof result === 'string' ? result.trim() : '';
            } catch (_error) {
                return 'Invalid value.';
            }
        };

        const tryConfirm = () => {
            const rawValue = String(input?.value ?? '');
            const validationError = runValidation(rawValue);
            if (validationError) {
                if (errorText) errorText.textContent = validationError;
                if (input) input.focus();
                return;
            }
            closeWith(rawValue);
        };

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeWith(null);
                return;
            }
            if (event.key === 'Enter') {
                event.preventDefault();
                tryConfirm();
            }
        };

        confirmBtn?.addEventListener('click', tryConfirm);
        cancelBtn?.addEventListener('click', () => closeWith(null));
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) closeWith(null);
        });
        document.addEventListener('keydown', onKeyDown, true);

        if (input) {
            input.focus();
            input.select();
            input.addEventListener('input', () => {
                if (errorText && errorText.textContent) errorText.textContent = '';
            });
        }
    });
}
