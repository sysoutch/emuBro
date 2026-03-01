export function showAddLanguageDialog({
    i18nRef,
    collectAvailableFlagCodes,
    escapeHtml,
    resolveBundledFlagCode,
    normalizeLanguageCreationPayload,
    languageCodePattern
}) {
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
            'width:min(580px,100%)',
            'background:var(--bg-secondary)',
            'border:1px solid var(--border-color)',
            'border-radius:14px',
            'padding:16px',
            'box-shadow:0 18px 42px rgba(0,0,0,0.45)',
            'display:grid',
            'gap:12px'
        ].join(';');

        const flagOptions = collectAvailableFlagCodes()
            .map((flagCode) => `<option value="${escapeHtml(flagCode)}">${escapeHtml(flagCode.toUpperCase())}</option>`)
            .join('');

        modal.innerHTML = `
            <h3 style="margin:0;font-size:1.05rem;color:var(--accent-color);">${escapeHtml(i18nRef.t('language.addDialogTitle'))}</h3>
            <div style="white-space:pre-wrap;line-height:1.45;color:var(--text-secondary);">${escapeHtml(i18nRef.t('language.addDialogMessage'))}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <label style="display:grid;gap:6px;">
                    <span style="font-size:0.82rem;color:var(--text-secondary);">${escapeHtml(i18nRef.t('language.addDialogNameLabel'))}</span>
                    <input type="text" data-lang-name placeholder="${escapeHtml(i18nRef.t('language.addDialogNamePlaceholder'))}" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-primary);color:var(--text-primary);" />
                </label>
                <label style="display:grid;gap:6px;">
                    <span style="font-size:0.82rem;color:var(--text-secondary);">${escapeHtml(i18nRef.t('language.addDialogCodeLabel'))}</span>
                    <input type="text" data-lang-code placeholder="${escapeHtml(i18nRef.t('language.addDialogCodePlaceholder'))}" maxlength="3" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-primary);color:var(--text-primary);" />
                </label>
                <label style="display:grid;gap:6px;">
                    <span style="font-size:0.82rem;color:var(--text-secondary);">${escapeHtml(i18nRef.t('language.addDialogAbbrLabel'))}</span>
                    <input type="text" data-lang-abbreviation placeholder="${escapeHtml(i18nRef.t('language.addDialogAbbrPlaceholder'))}" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-primary);color:var(--text-primary);" />
                </label>
                <label style="display:grid;gap:6px;">
                    <span style="font-size:0.82rem;color:var(--text-secondary);">${escapeHtml(i18nRef.t('language.addDialogFlagLabel'))}</span>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span data-lang-flag-preview class="fi fi-us" style="font-size:1.15rem;min-width:24px;"></span>
                        <select data-lang-flag style="flex:1;height:40px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-primary);color:var(--text-primary);padding:0 10px;">
                            ${flagOptions}
                        </select>
                    </div>
                </label>
            </div>
            <div data-error-text style="min-height:1em;color:var(--danger-color);font-size:0.85rem;"></div>
            <div style="display:flex;justify-content:flex-end;gap:8px;">
                <button class="action-btn small" type="button" data-dialog-cancel>${escapeHtml(i18nRef.t('buttons.cancel'))}</button>
                <button class="action-btn launch-btn" type="button" data-dialog-confirm>${escapeHtml(i18nRef.t('buttons.create'))}</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const nameInput = modal.querySelector('[data-lang-name]');
        const codeInput = modal.querySelector('[data-lang-code]');
        const abbrInput = modal.querySelector('[data-lang-abbreviation]');
        const flagSelect = modal.querySelector('[data-lang-flag]');
        const flagPreview = modal.querySelector('[data-lang-flag-preview]');
        const errorText = modal.querySelector('[data-error-text]');
        const confirmBtn = modal.querySelector('[data-dialog-confirm]');
        const cancelBtn = modal.querySelector('[data-dialog-cancel]');

        if (flagSelect && flagSelect.querySelector('option[value="us"]')) {
            flagSelect.value = 'us';
        }

        const cleanup = () => {
            document.removeEventListener('keydown', onKeyDown, true);
            overlay.remove();
        };

        const closeWith = (value) => {
            cleanup();
            resolve(value);
        };

        const updateFlagPreview = () => {
            const flagCode = String(flagSelect?.value || 'us').trim().toLowerCase();
            if (!flagPreview) return;
            flagPreview.className = `fi fi-${resolveBundledFlagCode(flagCode, 'us')}`;
        };

        const tryConfirm = () => {
            const payload = normalizeLanguageCreationPayload({
                name: String(nameInput?.value || ''),
                code: String(codeInput?.value || ''),
                abbreviation: String(abbrInput?.value || ''),
                flag: String(flagSelect?.value || '')
            });

            if (!payload.valid) {
                if (errorText) errorText.textContent = payload.message || i18nRef.t('language.createError');
                if (nameInput && !String(nameInput.value || '').trim()) nameInput.focus();
                else if (codeInput && !languageCodePattern.test(String(codeInput.value || '').trim().toLowerCase())) codeInput.focus();
                return;
            }

            closeWith(payload.value);
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
        flagSelect?.addEventListener('change', updateFlagPreview);
        codeInput?.addEventListener('input', () => {
            if (!codeInput) return;
            const cleaned = String(codeInput.value || '').toLowerCase().replace(/[^a-z]/g, '');
            if (codeInput.value !== cleaned) codeInput.value = cleaned;
            if (errorText && errorText.textContent) errorText.textContent = '';
        });
        nameInput?.addEventListener('input', () => {
            if (errorText && errorText.textContent) errorText.textContent = '';
        });
        abbrInput?.addEventListener('input', () => {
            if (errorText && errorText.textContent) errorText.textContent = '';
        });

        document.addEventListener('keydown', onKeyDown, true);
        updateFlagPreview();
        if (nameInput) {
            nameInput.focus();
        }
    });
}

export function showRenameLanguageDialog({
    lang,
    collectAvailableFlagCodes,
    escapeHtml,
    flagCodePattern
}) {
    return new Promise((resolve) => {
        const langInfo = lang?.data?.[lang?.code]?.language || {};
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

        const dialog = document.createElement('div');
        dialog.className = 'glass';
        dialog.style.cssText = [
            'width:min(520px,100%)',
            'max-height:90vh',
            'overflow:auto',
            'background:var(--bg-secondary)',
            'border:1px solid var(--border-color)',
            'border-radius:12px',
            'padding:16px',
            'display:grid',
            'gap:10px'
        ].join(';');

        const flags = collectAvailableFlagCodes();
        const currentFlag = String(langInfo.flag || 'us').trim().toLowerCase();
        const flagOptions = Array.from(new Set([currentFlag, ...flags]))
            .filter((code) => flagCodePattern.test(code))
            .sort((a, b) => a.localeCompare(b))
            .map((code) => `<option value="${escapeHtml(code)}"${code === currentFlag ? ' selected' : ''}>${escapeHtml(code.toUpperCase())}</option>`)
            .join('');

        dialog.innerHTML = `
            <h3 style="margin:0;">Rename Language</h3>
            <label style="display:grid;gap:4px;">
                <span style="font-size:0.85rem;color:var(--text-secondary);">Code (2-3 letters)</span>
                <input id="rename-lang-code" type="text" maxlength="3" value="${escapeHtml(String(lang.code || ''))}" />
            </label>
            <label style="display:grid;gap:4px;">
                <span style="font-size:0.85rem;color:var(--text-secondary);">Name</span>
                <input id="rename-lang-name" type="text" value="${escapeHtml(String(langInfo.name || lang.code || ''))}" />
            </label>
            <label style="display:grid;gap:4px;">
                <span style="font-size:0.85rem;color:var(--text-secondary);">Abbreviation</span>
                <input id="rename-lang-abbrev" type="text" value="${escapeHtml(String(langInfo.abbreviation || lang.code || '').toUpperCase())}" />
            </label>
            <label style="display:grid;gap:4px;">
                <span style="font-size:0.85rem;color:var(--text-secondary);">Flag Code</span>
                <select id="rename-lang-flag">
                    ${flagOptions}
                </select>
            </label>
            <div style="display:flex;justify-content:flex-end;gap:8px;">
                <button type="button" class="action-btn remove-btn" data-cancel>Cancel</button>
                <button type="button" class="action-btn launch-btn" data-confirm>Save</button>
            </div>
        `;

        const close = (payload = null) => {
            overlay.remove();
            resolve(payload);
        };

        dialog.querySelector('[data-cancel]')?.addEventListener('click', () => close(null));
        dialog.querySelector('[data-confirm]')?.addEventListener('click', () => {
            const code = String(dialog.querySelector('#rename-lang-code')?.value || '').trim().toLowerCase();
            const name = String(dialog.querySelector('#rename-lang-name')?.value || '').trim();
            const abbreviation = String(dialog.querySelector('#rename-lang-abbrev')?.value || '').trim();
            const flag = String(dialog.querySelector('#rename-lang-flag')?.value || '').trim().toLowerCase();
            close({ code, name, abbreviation, flag });
        });

        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) close(null);
        });

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
    });
}
