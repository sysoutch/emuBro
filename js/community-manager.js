const emubro = window.emubro;

function applyTemplate(input, data = {}) {
    let text = String(input ?? '');
    Object.keys(data || {}).forEach((key) => {
        const value = String(data[key] ?? '');
        text = text
            .replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), value)
            .replace(new RegExp(`\\{\\s*${key}\\s*\\}`, 'g'), value);
    });
    return text;
}

function t(key, fallback, data = {}) {
    const i18nRef = (typeof i18n !== 'undefined' && i18n && typeof i18n.t === 'function')
        ? i18n
        : (window?.i18n && typeof window.i18n.t === 'function' ? window.i18n : null);
    if (i18nRef && typeof i18nRef.t === 'function') {
        const translated = i18nRef.t(key, data);
        if (translated && translated !== key) return String(translated);
    }
    return applyTemplate(String(fallback || key), data);
}

function getCommunityIcon(name) {
    const key = String(name || '').toLowerCase();
    if (key === 'discord') {
        return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.956 2.42-2.157 2.42zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.946 2.42-2.157 2.42z"/></svg>`;
    }
    if (key === 'reddit') {
        return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm5.74-6.19c.9-.92.9-2.41 0-3.33-.9-.92-2.35-.92-3.3 0l-.13.13-.14-.13a2.36 2.36 0 0 0-3.3 0c-.9.92-.9 2.41 0 3.33l1.8 1.83 1.8 1.83 1.79-1.83 1.48-1.83z"/></svg>`; // Simplified generic
    }
    if (key === 'youtube') {
        return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`;
    }
    if (key === 'bluesky') {
        return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 10.8c-1.087-2.5-4-5.5-6-5.5S2 7.5 2 11c0 3 3.5 5 5 5 1.5 0 4-2.5 5-4.2 1 1.7 3.5 4.2 5 4.2 1.5 0 5-2 5-5 0-3.5-4-6.5-6-6.5s-4.913 3-6 5.5z"/></svg>`; // Simplified butterfly shape
    }
    if (key === 'twitter' || key === 'x') {
        return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`;
    }
    return '';
}

function makeCommunityCard({ iconKey, name, blurb, url, cta }) {
    const icon = getCommunityIcon(iconKey || name);
    return `
        <article class="community-card">
            <div class="community-card-icon">${icon}</div>
            <h3 class="community-card-title">${name}</h3>
            <p class="community-card-blurb">${blurb}</p>
            <button class="action-btn community-link-btn" type="button" data-community-url="${url}">${cta}</button>
        </article>
    `;
}

async function openExternal(url) {
    const target = String(url || "").trim();
    if (!target) return;

    try {
        if (emubro && typeof emubro.invoke === "function") {
            const result = await emubro.invoke("open-external-url", target);
            if (result?.success) return;
        }
    } catch (_e) {}

    try {
        window.open(target, "_blank", "noopener,noreferrer");
    } catch (_e) {}
}

export function showCommunityView() {
    const gamesContainer = document.getElementById("games-container");
    const gamesHeader = document.getElementById("games-header");
    if (!gamesContainer) return;

    if (gamesHeader) gamesHeader.textContent = t('header.community', 'Community');

    gamesContainer.className = "games-container community-view";
    gamesContainer.innerHTML = `
        <section class="community-view-shell">
            <div class="community-hero">
                <div class="community-hero-badge">${t('community.heroBadge', 'Official Hub')}</div>
                <h2 class="community-hero-title">${t('community.heroTitle', 'Join the emuBro Community')}</h2>
                <p class="community-hero-copy">
                    ${t('community.heroCopy', 'Discord is our main place for updates, feedback, quick support, and sharing setups.')}
                </p>
                <button class="action-btn launch-btn community-link-btn community-discord-btn" type="button" data-community-url="https://discord.gg/EtKvZ2F">
                    ${t('community.joinDiscord', 'Join Discord')}
                </button>
            </div>

            <div class="community-grid">
                ${makeCommunityCard({
                    iconKey: 'reddit',
                    name: t('community.cards.reddit.name', 'Reddit'),
                    blurb: t('community.cards.reddit.blurb', 'Long-form discussions, showcases, and community threads.'),
                    url: "https://www.reddit.com/",
                    cta: t('community.cards.reddit.open', 'Open Reddit')
                })}
                ${makeCommunityCard({
                    iconKey: 'youtube',
                    name: t('community.cards.youtube.name', 'YouTube'),
                    blurb: t('community.cards.youtube.blurb', 'Tutorials, updates, and previews from creators.'),
                    url: "https://www.youtube.com/",
                    cta: t('community.cards.youtube.open', 'Open YouTube')
                })}
                ${makeCommunityCard({
                    iconKey: 'bluesky',
                    name: t('community.cards.bluesky.name', 'Bluesky'),
                    blurb: t('community.cards.bluesky.blurb', 'Follow short updates and announcements.'),
                    url: "https://bsky.app/",
                    cta: t('community.cards.bluesky.open', 'Open Bluesky')
                })}
                ${makeCommunityCard({
                    iconKey: 'twitter',
                    name: t('community.cards.twitter.name', 'Twitter'),
                    blurb: t('community.cards.twitter.blurb', 'News drops, quick posts, and release callouts.'),
                    url: "https://x.com/",
                    cta: t('community.cards.twitter.open', 'Open Twitter')
                })}
            </div>
        </section>
    `;

    gamesContainer.querySelectorAll(".community-link-btn").forEach((btn) => {
        btn.addEventListener("click", async (event) => {
            event.preventDefault();
            event.stopPropagation();
            await openExternal(btn.dataset.communityUrl);
        });
    });
}
