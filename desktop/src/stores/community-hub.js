import { defineStore } from "pinia";
import { readNativeShellState, writeNativeShellState } from "../utils/shell-state";
import { getShellStorageValue, setShellStorageValue } from "../utils/shell-storage-cache";

const COMMUNITY_DISCORD_OPT_IN_KEY = "emuBro.community.discordInAppOptIn.v1";
const COMMUNITY_ACTIVE_TAB_KEY = "emuBro.community.activeTab.v1";
const COMMUNITY_PLATFORM_QUERY_KEY = "communityPlatform";
const COMMUNITY_STATE_KEY = "community-hub";
const COMMUNITY_FEED_LIMIT = 6;
const COMMUNITY_FEED_TTL_MS = 1000 * 60 * 5;
const COMMUNITY_FEED_CACHE_KEY = "emuBro.community.feedCache.v2";

const COMMUNITY_PLATFORMS = [
  {
    id: "discord",
    label: "Discord",
    blurb: "Real-time support, announcements, and setup sharing.",
    url: "https://discord.com/invite/EtKvZ2F",
    requiresOptIn: true,
    viewKind: "guide",
    viewEyebrow: "Realtime Chat",
    viewTitle: "Discord lounge + support",
    viewDescription: "Use Discord when you want quick troubleshooting, screenshots, and faster back-and-forth than a forum thread.",
    highlightCards: [
      {
        title: "Fastest help",
        copy: "Best place for quick setup questions, screenshots, and real-time troubleshooting."
      },
      {
        title: "Release chatter",
        copy: "Good for testing notes, new feature reactions, and community ping-pong while a build is fresh."
      },
      {
        title: "Browser fallback",
        copy: "If embedded Discord acts weird, open it in your normal browser and keep the shell view as the launch pad."
      }
    ]
  },
  {
    id: "reddit",
    label: "Reddit",
    blurb: "Long-form discussions, showcases, and community threads.",
    url: "https://www.reddit.com/r/emuBro/",
    requiresOptIn: false,
    viewKind: "feed",
    viewEyebrow: "Forum Feed",
    viewTitle: "Latest Reddit threads",
    viewDescription: "Longer-form discussions, screenshots, questions, and release threads from the subreddit."
  },
  {
    id: "youtube",
    label: "YouTube",
    blurb: "Tutorials, updates, and previews from creators.",
    url: "https://www.youtube.com/channel/UC9zQuEiPjnRv2LXVqR57K1Q",
    requiresOptIn: false,
    viewKind: "feed",
    viewEyebrow: "Video Feed",
    viewTitle: "Latest YouTube uploads",
    viewDescription: "Recent uploads from the emuBro channel so the shell can surface videos without dumping you straight into a browser first."
  },
  {
    id: "bluesky",
    label: "Bluesky",
    blurb: "Short updates and release callouts.",
    url: "https://bsky.app/profile/emubro.bsky.social",
    requiresOptIn: false,
    viewKind: "feed",
    viewEyebrow: "Social Feed",
    viewTitle: "Latest Bluesky posts",
    viewDescription: "Quick release notes, screenshots, and short updates from the emuBro Bluesky profile."
  },
  {
    id: "twitter",
    label: "X",
    blurb: "News drops and quick post highlights.",
    url: "https://x.com/emubro",
    requiresOptIn: false,
    viewKind: "limited",
    viewEyebrow: "Quick Links",
    viewTitle: "X / Twitter snapshot",
    viewDescription: "This keeps the profile handy in the shell, but live timeline loading stays limited because public X feeds are unreliable without API auth.",
    highlightCards: [
      {
        title: "Open profile",
        copy: "Jump to the official profile in your normal browser when you want the full timeline."
      },
      {
        title: "Prefer Bluesky here",
        copy: "Bluesky is the better shell-native feed target right now because the public API is friendly."
      },
      {
        title: "Keep the launch pad",
        copy: "Use this view as a quick hub for the profile link and current platform context instead of another blank browser window."
      }
    ]
  }
];

function getDesktopBridge() {
  if (typeof window === "undefined" || !window.emubro) {
    return null;
  }
  return window.emubro;
}

function readStoredBoolean(key, fallback = false) {
  const value = String(getShellStorageValue(key, fallback ? "true" : "false") || "").trim().toLowerCase();
  if (!value) return !!fallback;
  return value === "true" || value === "1";
}

function writeStoredBoolean(key, value) {
  setShellStorageValue(key, value ? "true" : "false");
}

function readStoredText(key, fallback = "") {
  const value = String(getShellStorageValue(key, String(fallback || "")) || "").trim();
  return value || String(fallback || "");
}

function writeStoredText(key, value) {
  setShellStorageValue(key, String(value || "").trim());
}

function getPlatformById(platformId) {
  const id = String(platformId || "").trim().toLowerCase();
  return COMMUNITY_PLATFORMS.find((row) => row.id === id) || COMMUNITY_PLATFORMS[0];
}

function readLocationPlatformId() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const currentUrl = new URL(window.location.href);
    const sectionId = String(currentUrl.searchParams.get("section") || "").trim().toLowerCase();
    if (sectionId !== "community-hub" && sectionId !== "community") {
      return "";
    }
    return getPlatformById(currentUrl.searchParams.get(COMMUNITY_PLATFORM_QUERY_KEY)).id;
  } catch (_error) {
    return "";
  }
}

function syncLocationPlatformId(platformId) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const currentUrl = new URL(window.location.href);
    const sectionId = String(currentUrl.searchParams.get("section") || "").trim().toLowerCase();
    if (sectionId !== "community-hub" && sectionId !== "community") {
      return;
    }

    const normalized = getPlatformById(platformId).id;
    if (normalized === COMMUNITY_PLATFORMS[0].id) {
      currentUrl.searchParams.delete(COMMUNITY_PLATFORM_QUERY_KEY);
    } else {
      currentUrl.searchParams.set(COMMUNITY_PLATFORM_QUERY_KEY, normalized);
    }
    window.history.replaceState({}, "", currentUrl.toString());
  } catch (_error) {}
}

function normalizeCommunityState(raw = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    discordInAppEnabled: !!source.discordInAppEnabled,
    activePlatformId: getPlatformById(source.activePlatformId).id,
    lastOpenedPlatformId: source.lastOpenedPlatformId ? getPlatformById(source.lastOpenedPlatformId).id : ""
  };
}

function buildFallbackFeedSnapshot(platformId) {
  const platform = getPlatformById(platformId);
  return {
    success: true,
    platform: platform.id,
    mode: platform.viewKind,
    fetchedAt: "",
    items: [],
    message: platform.viewDescription
  };
}

function readFeedCache() {
  const raw = getShellStorageValue(COMMUNITY_FEED_CACHE_KEY, "{}");
  try {
    const parsed = JSON.parse(String(raw || "{}"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function writeFeedCache(cache) {
  setShellStorageValue(COMMUNITY_FEED_CACHE_KEY, JSON.stringify(cache && typeof cache === "object" ? cache : {}));
}

export const useCommunityHubStore = defineStore("communityHub", {
  state: () => ({
    initialized: false,
    loading: false,
    actionBusy: false,
    actionStatus: "",
    error: "",
    discordInAppEnabled: false,
    activePlatformId: COMMUNITY_PLATFORMS[0].id,
    lastOpenedPlatformId: "",
    platformFeeds: {},
    platformFeedErrors: {},
    platformFeedLoading: {}
  }),
  getters: {
    platforms() {
      return COMMUNITY_PLATFORMS;
    },
    activePlatform(state) {
      return getPlatformById(state.activePlatformId);
    },
    lastOpenedPlatform(state) {
      return state.lastOpenedPlatformId ? getPlatformById(state.lastOpenedPlatformId) : null;
    },
    activePlatformFeed(state) {
      return state.platformFeeds[state.activePlatformId] || buildFallbackFeedSnapshot(state.activePlatformId);
    },
    activePlatformFeedItems() {
      return Array.isArray(this.activePlatformFeed?.items) ? this.activePlatformFeed.items : [];
    },
    activePlatformFeedLoading(state) {
      return !!state.platformFeedLoading[state.activePlatformId];
    },
    activePlatformFeedError(state) {
      return String(state.platformFeedErrors[state.activePlatformId] || "").trim();
    }
  },
  actions: {
    persistState() {
      const snapshot = normalizeCommunityState({
        discordInAppEnabled: this.discordInAppEnabled,
        activePlatformId: this.activePlatformId,
        lastOpenedPlatformId: this.lastOpenedPlatformId
      });
      void writeNativeShellState(COMMUNITY_STATE_KEY, snapshot);
    },
    setActivePlatform(platformId) {
      this.activePlatformId = getPlatformById(platformId).id;
      writeStoredText(COMMUNITY_ACTIVE_TAB_KEY, this.activePlatformId);
      syncLocationPlatformId(this.activePlatformId);
      this.persistState();
      void this.loadPlatformFeed(this.activePlatformId);
    },
    setDiscordInAppEnabled(value) {
      this.discordInAppEnabled = !!value;
      writeStoredBoolean(COMMUNITY_DISCORD_OPT_IN_KEY, this.discordInAppEnabled);
      this.persistState();
    },
    async openUrl(url, successMessage = "Opened community link.") {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.error = "Desktop bridge unavailable.";
        return null;
      }

      try {
        const result = await bridge.invoke("open-external-url", url);
        if (!result?.success) {
          throw new Error(String(result?.message || "Could not open community link."));
        }
        this.actionStatus = successMessage;
        this.error = "";
        return result;
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error || "Unknown error");
        return null;
      }
    },
    async openFeedItem(url, label = "community item") {
      return this.openUrl(url, `Opened ${label}.`);
    },
    async loadPlatformFeed(platformId, { force = false, announce = false } = {}) {
      const bridge = getDesktopBridge();
      const platform = getPlatformById(platformId);
      const cached = this.platformFeeds[platform.id];
      const cacheFresh = cached?.cachedAt && Date.now() - Number(cached.cachedAt || 0) < COMMUNITY_FEED_TTL_MS;
      if (!force && cacheFresh) {
        return cached;
      }

      if (!bridge?.invoke) {
        const fallback = buildFallbackFeedSnapshot(platform.id);
        this.platformFeeds = { ...this.platformFeeds, [platform.id]: fallback };
        this.platformFeedErrors = { ...this.platformFeedErrors, [platform.id]: "" };
        return fallback;
      }

      this.platformFeedLoading = { ...this.platformFeedLoading, [platform.id]: true };
      this.platformFeedErrors = { ...this.platformFeedErrors, [platform.id]: "" };

      try {
        const result = await bridge.invoke("community:get-platform-feed", {
          platform: platform.id,
          limit: COMMUNITY_FEED_LIMIT
        });
        if (!result?.success) {
          throw new Error(String(result?.message || `Could not load ${platform.label}.`));
        }

        const snapshot = {
          ...result,
          cachedAt: Date.now()
        };
        this.platformFeeds = {
          ...this.platformFeeds,
          [platform.id]: snapshot
        };
        writeFeedCache(this.platformFeeds);
        if (announce) {
          this.actionStatus = `Updated ${platform.label}.`;
        }
        return snapshot;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error || "Unknown error");
        const existing = this.platformFeeds[platform.id];
        if (existing) {
          this.platformFeedErrors = {
            ...this.platformFeedErrors,
            [platform.id]: ""
          };
          this.actionStatus = `${platform.label} refresh failed, showing the last loaded snapshot instead.`;
          return existing;
        }
        this.platformFeedErrors = {
          ...this.platformFeedErrors,
          [platform.id]: message
        };
        const fallback = {
          ...buildFallbackFeedSnapshot(platform.id),
          message
        };
        this.platformFeeds = {
          ...this.platformFeeds,
          [platform.id]: fallback
        };
        return fallback;
      } finally {
        this.platformFeedLoading = { ...this.platformFeedLoading, [platform.id]: false };
      }
    },
    async refreshActivePlatformFeed() {
      return this.loadPlatformFeed(this.activePlatformId, { force: true, announce: true });
    },
    async openPlatform(platformId, { external = false } = {}) {
      const bridge = getDesktopBridge();
      const platform = getPlatformById(platformId);
      const useExternal = external || (platform.requiresOptIn && !this.discordInAppEnabled);

      this.actionBusy = true;
      this.error = "";

      try {
        if (!bridge?.invoke) {
          throw new Error("Desktop bridge unavailable.");
        }

        const result = useExternal
          ? await bridge.invoke("open-external-url", platform.url)
          : await bridge.invoke("community:open-in-app-window", {
              url: platform.url,
              label: `community-${platform.id}`,
              title: `emuBro Community - ${platform.label}`
            });

        if (!result?.success) {
          this.actionStatus = String(result?.message || "Community action failed.");
          this.error = this.actionStatus;
          return null;
        }

        const openedInBrowser =
          useExternal || String(result?.fallback || "").trim().toLowerCase() === "external-browser";
        this.actionStatus = openedInBrowser
          ? `Opened ${platform.label} in the browser.`
          : `Opened ${platform.label} in the in-app browser.`;
        this.lastOpenedPlatformId = platform.id;
        this.setActivePlatform(platform.id);
        this.persistState();
        return result;
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error || "Unknown error");
        return null;
      } finally {
        this.actionBusy = false;
      }
    },
    async closeCommunityWindows() {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        return null;
      }

      try {
        const result = await bridge.invoke("community:close-in-app-windows");
        this.actionStatus = result?.success
          ? `Closed ${Number(result?.closed || 0)} in-app community window(s).`
          : String(result?.message || "Could not close community windows.");
        return result;
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error || "Unknown error");
        return null;
      }
    },
    async initialize() {
      if (this.initialized || this.loading) {
        return;
      }
      this.loading = true;
      try {
        const persisted = normalizeCommunityState(
          await readNativeShellState(COMMUNITY_STATE_KEY, {
            discordInAppEnabled: readStoredBoolean(COMMUNITY_DISCORD_OPT_IN_KEY, false),
            activePlatformId: readStoredText(COMMUNITY_ACTIVE_TAB_KEY, COMMUNITY_PLATFORMS[0].id),
            lastOpenedPlatformId: ""
          })
        );
        this.discordInAppEnabled = persisted.discordInAppEnabled;
        this.activePlatformId = persisted.activePlatformId;
        this.lastOpenedPlatformId = persisted.lastOpenedPlatformId;
        const feedCache = readFeedCache();
        const hydratedFeeds = {};
        Object.entries(feedCache).forEach(([platformId, snapshot]) => {
          const normalizedId = getPlatformById(platformId).id;
          const cachedAt = Number(snapshot?.cachedAt || 0);
          if (!cachedAt || Date.now() - cachedAt >= COMMUNITY_FEED_TTL_MS) return;
          hydratedFeeds[normalizedId] = {
            ...(snapshot && typeof snapshot === "object" ? snapshot : {}),
            platform: normalizedId
          };
        });
        this.platformFeeds = hydratedFeeds;
        const locationPlatformId = readLocationPlatformId();
        if (locationPlatformId) {
          this.activePlatformId = locationPlatformId;
        }
        syncLocationPlatformId(this.activePlatformId);
        this.persistState();
        await this.loadPlatformFeed(this.activePlatformId);
        this.initialized = true;
      } finally {
        this.loading = false;
      }
    }
  }
});
