export async function openProfileModalView(options = {}) {
    const emubro = options.emubro;
    const openLibraryPathSettingsModal = typeof options.openLibraryPathSettingsModal === "function"
        ? options.openLibraryPathSettingsModal
        : async () => {};
    if (!emubro) return;
    let userInfo = {
        username: 'Bro',
        avatar: './logo.png',
        level: 1,
        xp: 0,
        friends: 0
    };
    try {
        const loaded = await emubro.invoke('get-user-info');
        if (loaded && typeof loaded === 'object') {
            userInfo = { ...userInfo, ...loaded };
        }
    } catch (_e) {}

    const overlay = document.createElement('div');
    overlay.style.cssText = [
        'position:fixed',
        'inset:0',
        'z-index:3600',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'padding:20px',
        'background:rgba(0,0,0,0.58)'
    ].join(';');

    const modal = document.createElement('div');
    modal.className = 'glass';
    modal.style.cssText = [
        'width:min(520px,100%)',
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
            <h2 style="margin:0;font-size:1.15rem;">Profile</h2>
            <button type="button" class="close-btn" data-close-profile>&times;</button>
        </div>
        <div style="display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:center;">
            <img src="${String(userInfo.avatar || './logo.png')}" alt="Profile avatar" style="width:74px;height:74px;border-radius:50%;object-fit:cover;border:2px solid var(--accent-color);" />
            <div>
                <div style="font-size:1.1rem;font-weight:700;">${String(userInfo.username || 'Bro')}</div>
                <div style="color:var(--text-secondary);font-size:0.9rem;">Level ${Number(userInfo.level || 0)} · ${Number(userInfo.xp || 0)} XP</div>
                <div style="color:var(--text-secondary);font-size:0.9rem;">Friends: ${Number(userInfo.friends || 0)}</div>
            </div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px;">
            <button type="button" class="action-btn" data-open-settings>Settings</button>
            <button type="button" class="action-btn launch-btn" data-close-profile>Close</button>
        </div>
    `;

    modal.querySelectorAll('[data-close-profile]').forEach((btn) => {
        btn.addEventListener('click', () => overlay.remove());
    });

    const openSettingsBtn = modal.querySelector('[data-open-settings]');
    if (openSettingsBtn) {
        openSettingsBtn.addEventListener('click', async () => {
            overlay.remove();
            await openLibraryPathSettingsModal();
        });
    }

    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) overlay.remove();
    });

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}
