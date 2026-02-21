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
        return `<i class="fa-brands fa-discord" aria-hidden="true"></i>`;
    }
    if (key === 'reddit') {
        return `<i class="fa-brands fa-reddit-alien" aria-hidden="true"></i>`;
    }
    if (key === 'youtube') {
        return `<i class="fa-brands fa-youtube" aria-hidden="true"></i>`;
    }
    if (key === 'bluesky') {
        return `<i class="fa-brands fa-bluesky" aria-hidden="true"></i>`;
    }
    if (key === 'twitter' || key === 'x') {
        return `<i class="fa-brands fa-x-twitter" aria-hidden="true"></i>`;
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
