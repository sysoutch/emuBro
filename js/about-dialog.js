function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const SOCIAL_LINKS = [
    { id: 'discord', label: 'Discord', url: 'https://discord.com/invite/EtKvZ2F' },
    { id: 'reddit', label: 'Reddit', url: 'https://www.reddit.com/r/emubro/' },
    { id: 'youtube', label: 'YouTube', url: 'https://www.youtube.com/channel/UC9zQuEiPjnRv2LXVqR57K1Q' },
    { id: 'bluesky', label: 'Bluesky', url: 'https://bsky.app/profile/emubro.bsky.social' },
    { id: 'x', label: 'X', url: 'https://x.com/emubro' },
    { id: 'github', label: 'GitHub', url: 'https://github.com/sysoutch/emuBro' }
];

async function openExternal(emubro, url) {
    if (!emubro || typeof emubro.invoke !== 'function') return;
    try {
        await emubro.invoke('open-external-url', String(url || '').trim());
    } catch (_error) {}
}

async function readUpdateState(emubro) {
    try {
        const result = await emubro?.updates?.getState?.();
        return (result && typeof result === 'object') ? result : {};
    } catch (_error) {
        return {};
    }
}

async function readResourcesUpdateState(emubro) {
    try {
        const result = await emubro?.resourcesUpdates?.getState?.();
        return (result && typeof result === 'object') ? result : {};
    } catch (_error) {
        return {};
    }
}

function ensureSingleOverlay() {
    const existing = document.querySelector('.about-dialog-overlay');
    if (existing) {
        existing.remove();
    }
}

export async function openAboutDialog(options = {}) {
    const emubro = options.emubro || window.emubro;
    if (!emubro) return;

    ensureSingleOverlay();

    const [appUpdateState, resourcesState] = await Promise.all([
        readUpdateState(emubro),
        readResourcesUpdateState(emubro)
    ]);
    const appVersion = String(appUpdateState?.currentVersion || '').trim() || 'Unknown';
    const latestVersion = String(appUpdateState?.latestVersion || '').trim();
    const resourcesVersion = String(resourcesState?.currentVersion || '').trim() || 'Unknown';
    const releaseNotes = String(appUpdateState?.releaseNotes || '').trim();
    const platform = String(emubro.platform || '').trim() || 'unknown';

    const overlay = document.createElement('div');
    overlay.className = 'about-dialog-overlay';

    const modal = document.createElement('div');
    modal.className = 'about-dialog glass';
    modal.innerHTML = `
        <button type="button" class="action-btn remove-btn about-close-btn" data-about-close>Close</button>
        <div class="about-dialog-header">
            <img src="./logo.png" alt="emuBro Logo" class="about-logo" />
            <div class="about-dialog-title-wrap">
                <h2>emuBro</h2>
                <div class="about-version-line">Version ${escapeHtml(appVersion)}</div>
                <div class="about-sub-line">Platform: ${escapeHtml(platform)} | Resources: ${escapeHtml(resourcesVersion)}</div>
                ${latestVersion ? `<div class="about-sub-line">Latest release: ${escapeHtml(latestVersion)}</div>` : ''}
            </div>
        </div>
        <div class="about-dialog-actions">
            <button type="button" class="action-btn" data-about-toggle-changelog>${releaseNotes ? 'Show Changelog' : 'Open Releases Page'}</button>
            <button type="button" class="action-btn" data-about-open-releases>Open GitHub Releases</button>
        </div>
        <pre class="about-changelog" data-about-changelog hidden>${escapeHtml(releaseNotes || 'No release notes available for this build.')}</pre>
        <div class="about-social-title">Community</div>
        <div class="about-social-grid">
            ${SOCIAL_LINKS.map((entry) => `
                <button type="button" class="action-btn small" data-about-social="${escapeHtml(entry.id)}">${escapeHtml(entry.label)}</button>
            `).join('')}
        </div>
    `;

    const onEsc = (event) => {
        if (event.key !== 'Escape') return;
        close();
    };
    const close = () => {
        window.removeEventListener('keydown', onEsc);
        overlay.remove();
    };
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) close();
    });
    modal.querySelector('[data-about-close]')?.addEventListener('click', close);
    window.addEventListener('keydown', onEsc);

    const changelogEl = modal.querySelector('[data-about-changelog]');
    modal.querySelector('[data-about-toggle-changelog]')?.addEventListener('click', async () => {
        if (!releaseNotes) {
            await openExternal(emubro, 'https://github.com/sysoutch/emuBro/releases');
            return;
        }
        const hidden = changelogEl.hasAttribute('hidden');
        if (hidden) {
            changelogEl.removeAttribute('hidden');
        } else {
            changelogEl.setAttribute('hidden', 'hidden');
        }
    });
    modal.querySelector('[data-about-open-releases]')?.addEventListener('click', async () => {
        await openExternal(emubro, 'https://github.com/sysoutch/emuBro/releases');
    });

    modal.querySelectorAll('[data-about-social]').forEach((button) => {
        button.addEventListener('click', async () => {
            const id = String(button.dataset.aboutSocial || '').trim().toLowerCase();
            const entry = SOCIAL_LINKS.find((row) => row.id === id);
            if (!entry) return;
            await openExternal(emubro, entry.url);
        });
    });

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}
