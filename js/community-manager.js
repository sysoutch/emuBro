const emubro = window.emubro;

const COMMUNITY_DISCORD_OPT_IN_KEY = "emuBro.community.discordInAppOptIn.v1";
const COMMUNITY_ACTIVE_TAB_KEY = "emuBro.community.activeTab.v1";
const COMMUNITY_WEBVIEW_PARTITION = "persist:emubro-community";

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
        requiresOptIn: true
    },
    {
        id: "reddit",
        iconKey: "reddit",
        labelKey: "community.tabs.reddit",
        labelFallback: "Reddit",
        blurbKey: "community.cards.reddit.blurb",
        blurbFallback: "Long-form discussions, showcases, and community threads.",
        url: "https://www.reddit.com/r/emubro/",
        externalKey: "community.openRedditExternal",
        externalFallback: "Open Reddit in Browser",
        requiresOptIn: false
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
        requiresOptIn: false
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
        requiresOptIn: false
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
        requiresOptIn: false
    }
];

let activeCommunityCleanup = null;

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
        const translated = i18nRef.t(key, data);
        if (typeof translated === "string" && translated && translated !== key) {
            return translated;
        }
        if (typeof translated === "number" && Number.isFinite(translated)) {
            return String(translated);
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

function readStoredBoolean(key, fallback = false) {
    try {
        const raw = String(localStorage.getItem(key) ?? "").trim().toLowerCase();
        if (!raw) return !!fallback;
        if (raw === "true" || raw === "1") return true;
        if (raw === "false" || raw === "0") return false;
    } catch (_error) {}
    return !!fallback;
}

function writeStoredBoolean(key, value) {
    try {
        localStorage.setItem(key, value ? "true" : "false");
    } catch (_error) {}
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
    if (key === "discord") {
        return `<i class="fa-brands fa-discord" aria-hidden="true"></i>`;
    }
    if (key === "reddit") {
        return `<i class="fa-brands fa-reddit-alien" aria-hidden="true"></i>`;
    }
    if (key === "youtube") {
        return `<i class="fa-brands fa-youtube" aria-hidden="true"></i>`;
    }
    if (key === "bluesky") {
        return `<i class="fa-brands fa-bluesky" aria-hidden="true"></i>`;
    }
    if (key === "twitter" || key === "x") {
        return `<i class="fa-brands fa-x-twitter" aria-hidden="true"></i>`;
    }
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

function buildOverviewCardMarkup(platform) {
    return `
        <button type="button" class="community-overview-card" data-community-open-platform="${platform.id}">
            <span class="community-overview-card-icon">${getCommunityIcon(platform.iconKey)}</span>
            <span class="community-overview-card-title">${escapeHtml(t(platform.labelKey, platform.labelFallback))}</span>
            <span class="community-overview-card-blurb">${escapeHtml(t(platform.blurbKey, platform.blurbFallback))}</span>
        </button>
    `;
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

export function teardownCommunityView() {
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

    const gamesContainer = document.getElementById("games-container");
    const gamesHeader = document.getElementById("games-header");
    if (!gamesContainer) return;

    const defaultPlatformId = COMMUNITY_PLATFORMS[0]?.id || "discord";
    let activePlatformId = getPlatformById(readStoredText(COMMUNITY_ACTIVE_TAB_KEY, defaultPlatformId)).id;
    let discordInAppEnabled = readStoredBoolean(COMMUNITY_DISCORD_OPT_IN_KEY, false);

    if (gamesHeader) gamesHeader.textContent = t("header.community", "Community");

    gamesContainer.className = "games-container community-view";
    gamesContainer.innerHTML = `
        <section class="community-hub-shell">
            <div class="community-overview-view" data-community-overview>
                <article class="community-overview-hero">
                    <div class="community-overview-badge">${escapeHtml(t("community.heroBadge", "Official Hub"))}</div>
                    <h2 class="community-overview-title">${escapeHtml(t("community.heroTitle", "Join the emuBro Community"))}</h2>
                    <p class="community-overview-copy">${escapeHtml(t("community.heroCopy", "Pick a platform to open it fullscreen in-app with quick tabs at the top."))}</p>
                    <div class="community-overview-actions">
                        <button type="button" class="action-btn launch-btn" data-community-open-platform="discord">
                            ${escapeHtml(t("community.joinDiscord", "Join Discord"))}
                        </button>
                        <button type="button" class="action-btn small" data-community-action="open-discord-external">
                            ${escapeHtml(t("community.openDiscordExternal", "Open Discord in Browser"))}
                        </button>
                    </div>
                    <p class="community-overview-note">${escapeHtml(t("community.discordSessionNote", "Discord login stays in Electron's secure persistent session storage for this app."))}</p>
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
                        <button type="button" class="action-btn small" data-community-action="reload-current">
                            ${escapeHtml(t("community.reload", "Reload"))}
                        </button>
                        <button type="button" class="action-btn small" data-community-action="open-external-current">
                            ${escapeHtml(t("community.openExternal", "Open in Browser"))}
                        </button>
                    </div>
                </div>

                <div class="community-browser-shell">
                    <div class="community-browser-loading is-hidden" data-community-loading>
                        ${escapeHtml(t("community.loading", "Loading..."))}
                    </div>
                    <div class="community-browser-overlay community-browser-error is-hidden" data-community-error>
                        <div class="community-overlay-card">
                            <h3 class="community-overlay-title">${escapeHtml(t("community.failedToLoad", "Could not load this platform"))}</h3>
                            <p class="community-overlay-copy">${escapeHtml(t("community.loadErrorHelp", "Try reload, or open it in your browser."))}</p>
                            <div class="community-overlay-actions">
                                <button type="button" class="action-btn small" data-community-action="retry-load">${escapeHtml(t("community.retry", "Retry"))}</button>
                                <button type="button" class="action-btn launch-btn" data-community-action="open-external-current">${escapeHtml(t("community.openExternal", "Open in Browser"))}</button>
                            </div>
                        </div>
                    </div>
                    <div class="community-browser-overlay community-discord-optin is-hidden" data-community-discord-optin>
                        <div class="community-overlay-card">
                            <h3 class="community-overlay-title">${escapeHtml(t("community.discordOptInTitle", "Join Discord in emuBro"))}</h3>
                            <p class="community-overlay-copy">${escapeHtml(t("community.discordOptInCopy", "Use in-app Discord for full-window chat while keeping quick access to the other social tabs."))}</p>
                            <div class="community-overlay-actions">
                                <button type="button" class="action-btn launch-btn" data-community-action="join-discord-in-app">${escapeHtml(t("community.joinDiscordInApp", "Join in App"))}</button>
                                <button type="button" class="action-btn small" data-community-action="open-discord-external">${escapeHtml(t("community.openDiscordExternal", "Open Discord in Browser"))}</button>
                            </div>
                        </div>
                    </div>
                    <div class="community-webview-host" data-community-webview-host></div>
                </div>
            </div>
        </section>
    `;

    const scrollHost = gamesContainer.closest(".game-scroll-body");
    const overviewView = gamesContainer.querySelector("[data-community-overview]");
    const browserView = gamesContainer.querySelector("[data-community-browser-view]");
    const tabs = Array.from(gamesContainer.querySelectorAll(".community-tab-btn[data-community-platform]"));
    const loadingBadge = gamesContainer.querySelector("[data-community-loading]");
    const errorOverlay = gamesContainer.querySelector("[data-community-error]");
    const discordOptInOverlay = gamesContainer.querySelector("[data-community-discord-optin]");
    const webviewHost = gamesContainer.querySelector("[data-community-webview-host]");
    const actionsRow = gamesContainer.querySelector(".community-tab-actions");
    const lifecycle = new AbortController();
    const webviewUnbinders = [];
    let activeWebview = null;

    const setLoading = (loading) => {
        if (!loadingBadge) return;
        loadingBadge.classList.toggle("is-hidden", !loading);
    };

    const setErrorVisible = (visible) => {
        if (!errorOverlay) return;
        errorOverlay.classList.toggle("is-hidden", !visible);
    };

    const setDiscordOverlayVisible = (visible) => {
        if (!discordOptInOverlay) return;
        discordOptInOverlay.classList.toggle("is-hidden", !visible);
    };

    const cleanupWebview = () => {
        while (webviewUnbinders.length > 0) {
            const unbind = webviewUnbinders.pop();
            try {
                if (typeof unbind === "function") unbind();
            } catch (_error) {}
        }
        if (activeWebview) {
            try {
                if (typeof activeWebview.stop === "function") activeWebview.stop();
            } catch (_error) {}
        }
        if (webviewHost) webviewHost.innerHTML = "";
        activeWebview = null;
    };

    const bindWebviewEvent = (view, eventName, handler) => {
        view.addEventListener(eventName, handler);
        webviewUnbinders.push(() => {
            try {
                view.removeEventListener(eventName, handler);
            } catch (_error) {}
        });
    };

    const getCurrentPlatform = () => getPlatformById(activePlatformId);

    const getActiveWebviewUrl = () => {
        if (!activeWebview || typeof activeWebview.getURL !== "function") return "";
        try {
            const url = String(activeWebview.getURL() || "").trim();
            return isHttpUrl(url) ? url : "";
        } catch (_error) {
            return "";
        }
    };

    const updateToolbarText = () => {
        if (!actionsRow) return;
        const current = getCurrentPlatform();
        const openBtn = actionsRow.querySelector('[data-community-action="open-external-current"]');
        if (!openBtn) return;
        openBtn.textContent = t(current.externalKey, current.externalFallback);
    };

    const updateTabState = () => {
        tabs.forEach((tab) => {
            const isActive = String(tab.dataset.communityPlatform || "") === activePlatformId;
            tab.classList.toggle("is-active", isActive);
            tab.setAttribute("aria-selected", isActive ? "true" : "false");
        });
        updateToolbarText();
    };

    const ensureWebview = () => {
        if (activeWebview && activeWebview.isConnected) return activeWebview;
        if (!webviewHost) return null;

        cleanupWebview();
        const view = document.createElement("webview");
        view.className = "community-browser-webview";
        view.setAttribute("partition", COMMUNITY_WEBVIEW_PARTITION);
        view.setAttribute("allowpopups", "true");
        view.setAttribute("webpreferences", "sandbox=yes,contextIsolation=yes");

        bindWebviewEvent(view, "did-start-loading", () => {
            setLoading(true);
            setErrorVisible(false);
        });
        bindWebviewEvent(view, "did-stop-loading", () => {
            setLoading(false);
        });
        bindWebviewEvent(view, "did-fail-load", (event) => {
            if (Number(event?.errorCode) === -3) return;
            setLoading(false);
            setErrorVisible(true);
        });
        bindWebviewEvent(view, "new-window", (event) => {
            if (typeof event?.preventDefault === "function") event.preventDefault();
            void openExternal(event?.url);
        });
        bindWebviewEvent(view, "will-navigate", (event) => {
            const targetUrl = String(event?.url || "").trim();
            if (isHttpUrl(targetUrl)) return;
            if (typeof event?.preventDefault === "function") event.preventDefault();
        });

        webviewHost.replaceChildren(view);
        activeWebview = view;
        return activeWebview;
    };

    const loadCurrentPlatform = ({ forceReload = false } = {}) => {
        const platform = getCurrentPlatform();
        updateTabState();
        writeStoredText(COMMUNITY_ACTIVE_TAB_KEY, platform.id);
        setErrorVisible(false);

        if (platform.requiresOptIn && !discordInAppEnabled) {
            setLoading(false);
            setDiscordOverlayVisible(true);
            return;
        }

        setDiscordOverlayVisible(false);
        const view = ensureWebview();
        if (!view) {
            setErrorVisible(true);
            return;
        }

        const targetUrl = String(platform.url || "").trim();
        if (!isHttpUrl(targetUrl)) {
            setErrorVisible(true);
            return;
        }

        const currentSrc = String(view.getAttribute("src") || "").trim();
        if (forceReload && currentSrc === targetUrl && typeof view.reload === "function") {
            setLoading(true);
            try {
                view.reload();
            } catch (_error) {
                setLoading(false);
                setErrorVisible(true);
            }
            return;
        }

        if (currentSrc !== targetUrl) {
            setLoading(true);
            view.setAttribute("src", targetUrl);
        }
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
            loadCurrentPlatform({ forceReload });
        } else {
            setLoading(false);
            setErrorVisible(false);
            setDiscordOverlayVisible(false);
        }
    };

    const onClick = async (event) => {
        const openPlatformBtn = event.target.closest("[data-community-open-platform]");
        if (openPlatformBtn) {
            const platformId = getPlatformById(openPlatformBtn.dataset.communityOpenPlatform).id;
            setBrowserMode(true, { nextPlatformId: platformId });
            return;
        }

        const tab = event.target.closest(".community-tab-btn[data-community-platform]");
        if (tab) {
            const nextId = getPlatformById(tab.dataset.communityPlatform).id;
            if (nextId !== activePlatformId) {
                activePlatformId = nextId;
                loadCurrentPlatform();
            }
            return;
        }

        const actionBtn = event.target.closest("[data-community-action]");
        if (!actionBtn) return;

        const action = String(actionBtn.dataset.communityAction || "").trim();
        const currentPlatform = getCurrentPlatform();
        const currentUrl = getActiveWebviewUrl() || currentPlatform.url;

        if (action === "back-overview") {
            setBrowserMode(false);
            return;
        }
        if (action === "reload-current" || action === "retry-load") {
            loadCurrentPlatform({ forceReload: true });
            return;
        }
        if (action === "open-external-current") {
            await openExternal(currentUrl);
            return;
        }
        if (action === "join-discord-in-app") {
            discordInAppEnabled = true;
            writeStoredBoolean(COMMUNITY_DISCORD_OPT_IN_KEY, true);
            activePlatformId = "discord";
            loadCurrentPlatform();
            return;
        }
        if (action === "open-discord-external") {
            const discordPlatform = getPlatformById("discord");
            await openExternal(discordPlatform.url);
        }
    };

    gamesContainer.addEventListener("click", onClick, { signal: lifecycle.signal });
    setBrowserMode(false);

    activeCommunityCleanup = () => {
        lifecycle.abort();
        cleanupWebview();
        if (scrollHost) scrollHost.classList.remove("community-scroll-body");
    };
}
