const emubro = window.emubro;

const COMMUNITY_ACTIVE_TAB_KEY = "emuBro.community.activeTab.v1";
const COMMUNITY_FEED_LIMIT = 6;
const COMMUNITY_FEED_TTL_MS = 1000 * 60 * 5;
const COMMUNITY_FEED_CACHE_KEY = "emuBro.community.feedCache.v1";

const COMMUNITY_PLATFORMS = [
    {
        id: "discord",
        iconKey: "discord",
        labelKey: "community.tabs.discord",
        labelFallback: "Discord",
        blurbKey: "community.cards.discord.blurb",
        blurbFallback: "Real-time support, announcements, and setup sharing.",
        url: "https://discord.com/invite/EtKvZ2F",
        externalKey: "community.openDiscordExternal",
        externalFallback: "Open Discord in Browser",
        viewKind: "guide",
        viewEyebrow: "Realtime Chat",
        viewTitle: "Discord lounge + support",
        viewDescription: "Use Discord when you want fast back-and-forth, screenshots, setup help, and release chatter without leaving the Community section blind.",
        highlightCards: [
            {
                title: "Fastest help",
                copy: "Best place for quick troubleshooting, screenshots, and rapid setup questions."
            },
            {
                title: "Release chatter",
                copy: "Good for fresh build reactions, testing notes, and feedback while a feature is still hot."
            },
            {
                title: "Browser-first",
                copy: "Discord still opens best in your normal browser here, but this view keeps the context and launch actions inside emuBro."
            }
        ]
    },
    {
        id: "reddit",
        iconKey: "reddit",
        labelKey: "community.tabs.reddit",
        labelFallback: "Reddit",
        blurbKey: "community.cards.reddit.blurb",
        blurbFallback: "Long-form discussions, showcases, and community threads.",
        url: "https://www.reddit.com/r/emuBro/",
        externalKey: "community.openRedditExternal",
        externalFallback: "Open Reddit in Browser",
        viewKind: "feed",
        viewEyebrow: "Forum Feed",
        viewTitle: "Latest Reddit threads",
        viewDescription: "Longer-form discussions, questions, release posts, and showcase threads from the subreddit."
    },
    {
        id: "youtube",
        iconKey: "youtube",
        labelKey: "community.tabs.youtube",
        labelFallback: "YouTube",
        blurbKey: "community.cards.youtube.blurb",
        blurbFallback: "Tutorials, updates, and previews from creators.",
        url: "https://www.youtube.com/channel/UC9zQuEiPjnRv2LXVqR57K1Q",
        externalKey: "community.openYouTubeExternal",
        externalFallback: "Open YouTube in Browser",
        viewKind: "feed",
        viewEyebrow: "Video Feed",
        viewTitle: "Latest YouTube uploads",
        viewDescription: "Recent emuBro videos, tutorials, and previews surfaced directly inside the Community page."
    },
    {
        id: "bluesky",
        iconKey: "bluesky",
        labelKey: "community.tabs.bluesky",
        labelFallback: "Bluesky",
        blurbKey: "community.cards.bluesky.blurb",
        blurbFallback: "Short updates and release callouts.",
        url: "https://bsky.app/profile/emubro.bsky.social",
        externalKey: "community.openBlueskyExternal",
        externalFallback: "Open Bluesky in Browser",
        viewKind: "feed",
        viewEyebrow: "Social Feed",
        viewTitle: "Latest Bluesky posts",
        viewDescription: "Short release notes, screenshots, and quick updates from the emuBro Bluesky profile."
    },
    {
        id: "twitter",
        iconKey: "twitter",
        labelKey: "community.tabs.twitter",
        labelFallback: "X",
        blurbKey: "community.cards.twitter.blurb",
        blurbFallback: "News drops and quick post highlights.",
        url: "https://x.com/emubro",
        externalKey: "community.openTwitterExternal",
        externalFallback: "Open X in Browser",
        viewKind: "guide",
        viewEyebrow: "Quick Links",
        viewTitle: "X / Twitter snapshot",
        viewDescription: "The public X timeline is still annoying to surface cleanly, so this view works as a focused launch pad instead of pretending the feed is reliable.",
        highlightCards: [
            {
                title: "Open profile",
                copy: "Jump to the official profile in your browser when you want the full live timeline."
            },
            {
                title: "Use Bluesky in-app",
                copy: "Bluesky is the cleaner in-app feed target right now, so it gets the live shell/legacy list treatment first."
            },
            {
                title: "Keep context here",
                copy: "This page still keeps the selected platform and Community context in-app instead of dumping you into a blank browser window."
            }
        ]
    }
];

let activeCommunityCleanup = null;
const communityFeedCache = new Map();

function readStoredJson(key, fallback = null) {
    try {
        const raw = String(localStorage.getItem(key) ?? "").trim();
        if (!raw) return fallback;
        return JSON.parse(raw);
    } catch (_error) {
        return fallback;
    }
}

function writeStoredJson(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (_error) {}
}

function applyTemplate(input, data = {}) {
    let text = String(input ?? "");
    Object.keys(data || {}).forEach((key) => {
        const value = String(data[key] ?? "");
        text = text
            .replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"), value)
            .replace(new RegExp(`\\{\\s*${key}\\s*\\}`, "g"), value);
    });
    return text;
}

function t(key, fallback, data = {}) {
    const i18nRef = (typeof i18n !== "undefined" && i18n && typeof i18n.t === "function")
        ? i18n
        : (window?.i18n && typeof window.i18n.t === "function" ? window.i18n : null);
    if (i18nRef && typeof i18nRef.t === "function") {
        const translated = i18nRef.t(key);
        if (typeof translated === "string" && translated && translated !== key) {
            return applyTemplate(translated, data);
        }
        if (typeof translated === "number" && Number.isFinite(translated)) {
            return applyTemplate(String(translated), data);
        }
    }
    return applyTemplate(String(fallback || key), data);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function readStoredText(key, fallback = "") {
    try {
        const raw = String(localStorage.getItem(key) ?? "").trim();
        return raw || String(fallback || "");
    } catch (_error) {
        return String(fallback || "");
    }
}

function writeStoredText(key, value) {
    try {
        localStorage.setItem(key, String(value || "").trim());
    } catch (_error) {}
}

function getCommunityIcon(name) {
    const key = String(name || "").toLowerCase();
    if (key === "discord") return `<i class="fa-brands fa-discord" aria-hidden="true"></i>`;
    if (key === "reddit") return `<i class="fa-brands fa-reddit-alien" aria-hidden="true"></i>`;
    if (key === "youtube") return `<i class="fa-brands fa-youtube" aria-hidden="true"></i>`;
    if (key === "bluesky") return `<i class="fa-brands fa-bluesky" aria-hidden="true"></i>`;
    if (key === "twitter" || key === "x") return `<i class="fa-brands fa-x-twitter" aria-hidden="true"></i>`;
    return "";
}

function isHttpUrl(value) {
    try {
        const parsed = new URL(String(value || "").trim());
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch (_error) {
        return false;
    }
}

function getPlatformById(id) {
    const normalized = String(id || "").trim().toLowerCase();
    return COMMUNITY_PLATFORMS.find((platform) => platform.id === normalized) || COMMUNITY_PLATFORMS[0];
}

function clearCommunityScrollHosts() {
    document.querySelectorAll(".game-scroll-body.community-scroll-body").forEach((el) => {
        el.classList.remove("community-scroll-body");
    });
}

function normalizeFeedSnapshot(platform, snapshot) {
    const source = snapshot && typeof snapshot === "object" ? snapshot : {};
    return {
        success: !!source.success,
        platform: platform.id,
        mode: String(source.mode || platform.viewKind || "guide").trim(),
        message: String(source.message || platform.viewDescription || "").trim(),
        items: Array.isArray(source.items) ? source.items : [],
        cachedAt: Number(source.cachedAt || 0)
    };
}

function buildFallbackSnapshot(platform) {
    return normalizeFeedSnapshot(platform, {
        success: true,
        platform: platform.id,
        mode: platform.viewKind || "guide",
        message: platform.viewDescription,
        items: [],
        cachedAt: Date.now()
    });
}

function readPersistedFeedCache() {
    const rawCache = readStoredJson(COMMUNITY_FEED_CACHE_KEY, {});
    const rows = rawCache && typeof rawCache === "object" ? rawCache : {};
    COMMUNITY_PLATFORMS.forEach((platform) => {
        const snapshot = normalizeFeedSnapshot(platform, rows[platform.id]);
        if (snapshot.cachedAt > 0 && (Date.now() - snapshot.cachedAt) < COMMUNITY_FEED_TTL_MS) {
            communityFeedCache.set(platform.id, snapshot);
        }
    });
}

function persistFeedCache() {
    const payload = {};
    COMMUNITY_PLATFORMS.forEach((platform) => {
        const snapshot = communityFeedCache.get(platform.id);
        if (!snapshot || !snapshot.cachedAt) return;
        payload[platform.id] = snapshot;
    });
    writeStoredJson(COMMUNITY_FEED_CACHE_KEY, payload);
}

async function openExternal(url) {
    const target = String(url || "").trim();
    if (!target || !isHttpUrl(target)) return;

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

async function closeCommunityInAppWindows() {
    if (!emubro || typeof emubro.invoke !== "function") return;
    try {
        await emubro.invoke("community:close-in-app-windows");
    } catch (_error) {}
}

function formatFeedTime(value) {
    if (value === null || value === undefined || value === "") return "";
    let parsed = NaN;
    if (typeof value === "number" && Number.isFinite(value)) {
        parsed = value > 1000000000000 ? value : value * 1000;
    } else {
        const text = String(value || "").trim();
        if (/^\d+$/.test(text)) {
            const numeric = Number(text);
            parsed = numeric > 1000000000000 ? numeric : numeric * 1000;
        } else {
            parsed = Date.parse(text);
        }
    }
    if (!Number.isFinite(parsed)) return "";
    try {
        return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(parsed));
    } catch (_error) {
        return "";
    }
}

function buildOverviewCardMarkup(platform) {
    return `
        <button type="button" class="community-overview-card" data-community-open-platform="${platform.id}">
            <span class="community-overview-card-icon">${getCommunityIcon(platform.iconKey)}</span>
            <span class="community-overview-card-title">${escapeHtml(t(platform.labelKey, platform.labelFallback))}</span>
            <span class="community-overview-card-blurb">${escapeHtml(t(platform.blurbKey, platform.blurbFallback))}</span>
        </button>
    `;
}

function buildFeedItemMarkup(item, platformLabel) {
    const title = escapeHtml(String(item?.title || platformLabel || "Community item"));
    const excerpt = escapeHtml(String(item?.excerpt || "").trim() || "Open this item in your browser for the full details.");
    const thumbnail = String(item?.thumbnail || "").trim();
    const badge = escapeHtml(String(item?.badge || platformLabel || "Item"));
    const author = String(item?.author || "").trim();
    const publishedAt = formatFeedTime(item?.publishedAt);
    const stats = Array.isArray(item?.stats) ? item.stats.map((row) => String(row || "").trim()).filter(Boolean) : [];
    const url = escapeHtml(String(item?.url || "").trim());
    const hasMedia = !!thumbnail;
    return `
        <article class="community-feed-item ${hasMedia ? "has-media" : "no-media"}">
            ${thumbnail ? `
                <div class="community-feed-item-media">
                    <img src="${escapeHtml(thumbnail)}" alt="${title}" loading="lazy" />
                </div>
            ` : `
                <div class="community-feed-item-media is-placeholder">
                    <div class="community-feed-item-media-copy">
                        <span class="community-feed-item-media-kicker">${badge}</span>
                        <strong>${escapeHtml(t("community.noPreviewImage", "No Preview Image"))}</strong>
                    </div>
                </div>
            `}
            <div class="community-feed-item-body">
                <div class="community-feed-item-header">
                    <div>
                        <div class="community-feed-item-badge">${badge}</div>
                        <h4>${title}</h4>
                    </div>
                    ${publishedAt ? `<span class="community-feed-item-time">${escapeHtml(publishedAt)}</span>` : ""}
                </div>
                <p>${excerpt}</p>
                ${(author || stats.length) ? `
                    <div class="community-feed-item-meta">
                        ${author ? `<span class="community-feed-pill">${escapeHtml(author)}</span>` : ""}
                        ${stats.map((row) => `<span class="community-feed-pill">${escapeHtml(row)}</span>`).join("")}
                    </div>
                ` : ""}
                <div class="community-feed-item-actions">
                    <button type="button" class="action-btn small" data-community-feed-open="${url}" data-community-feed-label="${title}">
                        ${escapeHtml(t("community.openExternal", "Open in Browser"))}
                    </button>
                </div>
            </div>
        </article>
    `;
}

function buildGuideCardMarkup(card) {
    return `
        <article class="community-guide-card">
            <h4>${escapeHtml(String(card?.title || "Community"))}</h4>
            <p>${escapeHtml(String(card?.copy || ""))}</p>
        </article>
    `;
}

function buildPlatformStageMarkup(platform, state) {
    const platformLabel = t(platform.labelKey, platform.labelFallback);
    const mode = String(state?.snapshot?.mode || platform.viewKind || "guide").trim();
    const message = String(state?.snapshot?.message || platform.viewDescription || "").trim();
    const items = Array.isArray(state?.snapshot?.items) ? state.snapshot.items : [];
    const loading = !!state?.loading;
    const error = String(state?.error || "").trim();
    const updated = formatFeedTime(state?.snapshot?.cachedAt || "");
    return `
        <div class="community-platform-shell" data-community-platform-shell="${platform.id}">
            <div class="community-platform-hero">
                <div>
                    <div class="community-platform-eyebrow">${escapeHtml(platform.viewEyebrow || platformLabel)}</div>
                    <h3 class="community-platform-title">${escapeHtml(platform.viewTitle || platformLabel)}</h3>
                    <p class="community-platform-copy">${escapeHtml(platform.viewDescription || platform.blurbFallback || "")}</p>
                </div>
                <div class="community-platform-hero-actions">
                    <button type="button" class="action-btn small" data-community-action="open-external-current">
                        ${escapeHtml(t(platform.externalKey, platform.externalFallback))}
                    </button>
                    ${platform.viewKind === "feed" ? `
                        <button type="button" class="action-btn small" data-community-action="refresh-feed">
                            ${escapeHtml(loading ? t("community.loading", "Loading...") : "Refresh Feed")}
                        </button>
                    ` : ""}
                </div>
            </div>
            <div class="community-platform-layout">
                <div class="community-platform-main">
                    ${loading ? `
                        <div class="community-feed-empty">
                            ${escapeHtml(t("community.loading", "Loading..."))}
                        </div>
                    ` : error ? `
                        <div class="community-feed-empty is-error">
                            ${escapeHtml(error)}
                        </div>
                    ` : mode === "feed" && items.length ? `
                        <div class="community-feed-list">
                            ${items.map((item) => buildFeedItemMarkup(item, platformLabel)).join("")}
                        </div>
                    ` : mode === "feed" ? `
                        <div class="community-feed-empty">
                            ${escapeHtml(message || "No recent items yet.")}
                        </div>
                    ` : `
                        <div class="community-guide-grid">
                            ${(Array.isArray(platform.highlightCards) ? platform.highlightCards : []).map((card) => buildGuideCardMarkup(card)).join("")}
                        </div>
                    `}
                </div>
                <aside class="community-platform-side">
                    <article class="community-side-card">
                        <div class="community-side-card-label">${escapeHtml(t("community.status", "Status"))}</div>
                        <h4>${escapeHtml(platformLabel)}</h4>
                        <p>${escapeHtml(message || platform.viewDescription || "")}</p>
                        <ul class="community-side-list">
                            <li><strong>${escapeHtml(t("community.url", "URL"))}:</strong> ${escapeHtml(platform.url)}</li>
                            <li><strong>${escapeHtml(t("community.type", "Type"))}:</strong> ${escapeHtml(mode === "feed" ? "Feed" : "Hub")}</li>
                            ${updated ? `<li><strong>${escapeHtml(t("community.updated", "Updated"))}:</strong> ${escapeHtml(updated)}</li>` : ""}
                            ${items.length ? `<li><strong>${escapeHtml(t("community.items", "Items"))}:</strong> ${escapeHtml(String(items.length))}</li>` : ""}
                        </ul>
                    </article>
                </aside>
            </div>
        </div>
    `;
}

async function requestPlatformFeed(platform, { force = false } = {}) {
    const cacheEntry = communityFeedCache.get(platform.id);
    if (!force && cacheEntry && (Date.now() - Number(cacheEntry.cachedAt || 0) < COMMUNITY_FEED_TTL_MS)) {
        return cacheEntry;
    }

    if (!emubro || typeof emubro.invoke !== "function") {
        const fallback = buildFallbackSnapshot(platform);
        communityFeedCache.set(platform.id, fallback);
        return fallback;
    }

    const result = await emubro.invoke("community:get-platform-feed", {
        platform: platform.id,
        limit: COMMUNITY_FEED_LIMIT
    });
    if (!result?.success) {
        throw new Error(String(result?.message || `Could not load ${platform.labelFallback}.`));
    }

    const snapshot = normalizeFeedSnapshot(platform, {
        ...result,
        cachedAt: Date.now()
    });
    communityFeedCache.set(platform.id, snapshot);
    persistFeedCache();
    return snapshot;
}

export function teardownCommunityView() {
    void closeCommunityInAppWindows();
    if (typeof activeCommunityCleanup === "function") {
        try {
            activeCommunityCleanup();
        } catch (_error) {}
    }
    activeCommunityCleanup = null;
    clearCommunityScrollHosts();
}

export function showCommunityView() {
    teardownCommunityView();
    readPersistedFeedCache();

    const gamesContainer = document.getElementById("games-container");
    const gamesHeader = document.getElementById("games-header");
    if (!gamesContainer) return;

    const defaultPlatformId = COMMUNITY_PLATFORMS[0]?.id || "discord";
    let activePlatformId = getPlatformById(readStoredText(COMMUNITY_ACTIVE_TAB_KEY, defaultPlatformId)).id;
    let platformStates = {};

    if (gamesHeader) gamesHeader.textContent = t("header.community", "Community");

    gamesContainer.className = "games-container community-view";
    gamesContainer.innerHTML = `
        <section class="community-hub-shell">
            <div class="community-overview-view" data-community-overview>
                <article class="community-overview-hero">
                    <div class="community-overview-badge">${escapeHtml(t("community.heroBadge", "Official Hub"))}</div>
                    <h2 class="community-overview-title">${escapeHtml(t("community.heroTitle", "Join the emuBro Community"))}</h2>
                    <p class="community-overview-copy">${escapeHtml(t("community.heroCopy", "Discord is our main place for updates, feedback, quick support, and sharing setups."))}</p>
                    <div class="community-overview-actions">
                        <button type="button" class="action-btn launch-btn" data-community-open-platform="discord">
                            ${escapeHtml(t("community.joinDiscord", "Join Discord"))}
                        </button>
                        <button type="button" class="action-btn small" data-community-action="open-discord-external">
                            ${escapeHtml(t("community.openDiscordExternal", "Open Discord in Browser"))}
                        </button>
                    </div>
                </article>

                <div class="community-overview-grid">
                    ${COMMUNITY_PLATFORMS.map((platform) => buildOverviewCardMarkup(platform)).join("")}
                </div>
            </div>

            <div class="community-browser-view is-hidden" data-community-browser-view>
                <div class="community-tabs-row">
                    <button type="button" class="action-btn small" data-community-action="back-overview">
                        ${escapeHtml(t("buttons.back", "Back"))}
                    </button>
                    <div class="community-tabs" role="tablist" aria-label="${escapeHtml(t("community.socialTabs", "Social platforms"))}">
                        ${COMMUNITY_PLATFORMS.map((platform) => `
                            <button
                                type="button"
                                class="community-tab-btn"
                                role="tab"
                                aria-selected="false"
                                data-community-platform="${platform.id}"
                            >
                                <span class="community-tab-icon">${getCommunityIcon(platform.iconKey)}</span>
                                <span>${escapeHtml(t(platform.labelKey, platform.labelFallback))}</span>
                            </button>
                        `).join("")}
                    </div>
                    <div class="community-tab-actions">
                        <span class="community-feed-updated is-hidden" data-community-last-updated>
                            ${escapeHtml(t("community.updated", "Updated"))}: -
                        </span>
                        <button type="button" class="action-btn small" data-community-action="refresh-feed">
                            ${escapeHtml("Refresh")}
                        </button>
                        <button type="button" class="action-btn small" data-community-action="open-external-current">
                            ${escapeHtml(t("community.openExternal", "Open in Browser"))}
                        </button>
                    </div>
                </div>

                <div class="community-platform-stage" data-community-platform-stage></div>
            </div>
        </section>
    `;

    const scrollHost = gamesContainer.closest(".game-scroll-body");
    const overviewView = gamesContainer.querySelector("[data-community-overview]");
    const browserView = gamesContainer.querySelector("[data-community-browser-view]");
    const stageHost = gamesContainer.querySelector("[data-community-platform-stage]");
    const tabs = Array.from(gamesContainer.querySelectorAll(".community-tab-btn[data-community-platform]"));
    const tabActions = gamesContainer.querySelector(".community-tab-actions");
    const lifecycle = new AbortController();
    let requestToken = 0;

    const getCurrentPlatform = () => getPlatformById(activePlatformId);
    const getPlatformState = (platformId) => {
        const platform = getPlatformById(platformId);
        return platformStates[platform.id] || {
            loading: false,
            error: "",
            snapshot: buildFallbackSnapshot(platform)
        };
    };
    const setPlatformState = (platformId, patch = {}) => {
        const platform = getPlatformById(platformId);
        platformStates = {
            ...platformStates,
            [platform.id]: {
                ...getPlatformState(platform.id),
                ...patch
            }
        };
    };
    const updateTabState = () => {
        const currentPlatform = getCurrentPlatform();
        tabs.forEach((tab) => {
            const isActive = String(tab.dataset.communityPlatform || "") === activePlatformId;
            tab.classList.toggle("is-active", isActive);
            tab.setAttribute("aria-selected", isActive ? "true" : "false");
        });
        if (tabActions) {
            const refreshBtn = tabActions.querySelector('[data-community-action="refresh-feed"]');
            const openBtn = tabActions.querySelector('[data-community-action="open-external-current"]');
            const updatedLabel = tabActions.querySelector("[data-community-last-updated]");
            if (refreshBtn) {
                const isFeed = currentPlatform.viewKind === "feed";
                refreshBtn.classList.toggle("is-hidden", !isFeed);
                refreshBtn.disabled = !!getPlatformState(currentPlatform.id).loading;
                refreshBtn.textContent = getPlatformState(currentPlatform.id).loading
                    ? t("community.loading", "Loading...")
                    : "Refresh";
            }
            if (openBtn) {
                openBtn.textContent = t(currentPlatform.externalKey, currentPlatform.externalFallback);
            }
            if (updatedLabel) {
                const currentState = getPlatformState(currentPlatform.id);
                const isFeed = currentPlatform.viewKind === "feed";
                const updatedText = formatFeedTime(currentState?.snapshot?.cachedAt || "");
                updatedLabel.classList.toggle("is-hidden", !isFeed);
                updatedLabel.textContent = `${t("community.updated", "Updated")}: ${updatedText || "-"}`;
            }
        }
    };
    const renderCurrentPlatformStage = () => {
        if (!stageHost) return;
        const platform = getCurrentPlatform();
        stageHost.innerHTML = buildPlatformStageMarkup(platform, getPlatformState(platform.id));
        updateTabState();
        writeStoredText(COMMUNITY_ACTIVE_TAB_KEY, platform.id);
    };
    const loadPlatformStage = async (platformId, { force = false } = {}) => {
        const platform = getPlatformById(platformId);
        const nextToken = ++requestToken;
        const currentState = getPlatformState(platform.id);
        if (platform.viewKind !== "feed") {
            setPlatformState(platform.id, {
                loading: false,
                error: "",
                snapshot: currentState.snapshot || buildFallbackSnapshot(platform)
            });
            renderCurrentPlatformStage();
            return;
        }

        setPlatformState(platform.id, { loading: true, error: "" });
        renderCurrentPlatformStage();
        try {
            const snapshot = await requestPlatformFeed(platform, { force });
            if (nextToken !== requestToken || platform.id !== activePlatformId) return;
            setPlatformState(platform.id, { loading: false, error: "", snapshot });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error || "Unknown error");
            if (nextToken !== requestToken || platform.id !== activePlatformId) return;
            const existingSnapshot = getPlatformState(platform.id).snapshot || buildFallbackSnapshot(platform);
            setPlatformState(platform.id, {
                loading: false,
                error: message,
                snapshot: existingSnapshot
            });
        }
        renderCurrentPlatformStage();
    };
    const setBrowserMode = (enabled, { nextPlatformId = "", forceReload = false } = {}) => {
        const browserEnabled = !!enabled;
        if (nextPlatformId) {
            activePlatformId = getPlatformById(nextPlatformId).id;
        }

        if (overviewView) overviewView.classList.toggle("is-hidden", browserEnabled);
        if (browserView) browserView.classList.toggle("is-hidden", !browserEnabled);
        if (scrollHost) scrollHost.classList.toggle("community-scroll-body", browserEnabled);

        if (browserEnabled) {
            renderCurrentPlatformStage();
            void loadPlatformStage(activePlatformId, { force: forceReload });
        }
    };

    const onClick = async (event) => {
        const openPlatformBtn = event.target.closest("[data-community-open-platform]");
        if (openPlatformBtn) {
            const platformId = getPlatformById(openPlatformBtn.dataset.communityOpenPlatform).id;
            activePlatformId = platformId;
            setBrowserMode(true, { nextPlatformId: platformId });
            return;
        }

        const tab = event.target.closest(".community-tab-btn[data-community-platform]");
        if (tab) {
            const nextId = getPlatformById(tab.dataset.communityPlatform).id;
            if (nextId !== activePlatformId) {
                activePlatformId = nextId;
                setBrowserMode(true, { nextPlatformId: nextId });
            }
            return;
        }

        const feedOpenButton = event.target.closest("[data-community-feed-open]");
        if (feedOpenButton) {
            await openExternal(feedOpenButton.dataset.communityFeedOpen || "");
            return;
        }

        const actionBtn = event.target.closest("[data-community-action]");
        if (!actionBtn) return;

        const action = String(actionBtn.dataset.communityAction || "").trim();
        const currentPlatform = getCurrentPlatform();

        if (action === "back-overview") {
            setBrowserMode(false);
            return;
        }
        if (action === "refresh-feed") {
            await loadPlatformStage(currentPlatform.id, { force: true });
            return;
        }
        if (action === "open-external-current" || action === "open-discord-external") {
            await openExternal(currentPlatform.id === "discord" && action === "open-discord-external"
                ? getPlatformById("discord").url
                : currentPlatform.url);
        }
    };

    gamesContainer.addEventListener("click", onClick, { signal: lifecycle.signal });
    setBrowserMode(false);

    activeCommunityCleanup = () => {
        lifecycle.abort();
        if (scrollHost) scrollHost.classList.remove("community-scroll-body");
    };
}
