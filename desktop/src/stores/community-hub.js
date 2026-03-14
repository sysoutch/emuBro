import { defineStore } from "pinia";
import { readNativeShellState, writeNativeShellState } from "../utils/shell-state";
import { getShellStorageValue, setShellStorageValue } from "../utils/shell-storage-cache";

const COMMUNITY_DISCORD_OPT_IN_KEY = "emuBro.community.discordInAppOptIn.v1";
const COMMUNITY_ACTIVE_TAB_KEY = "emuBro.community.activeTab.v1";
const COMMUNITY_PLATFORM_QUERY_KEY = "communityPlatform";
const COMMUNITY_STATE_KEY = "community-hub";

const COMMUNITY_PLATFORMS = [
  {
    id: "discord",
    label: "Discord",
    blurb: "Real-time support, announcements, and setup sharing.",
    url: "https://discord.com/invite/EtKvZ2F",
    requiresOptIn: true
  },
  {
    id: "reddit",
    label: "Reddit",
    blurb: "Long-form discussions, showcases, and community threads.",
    url: "https://www.reddit.com/r/emuBro/",
    requiresOptIn: false
  },
  {
    id: "youtube",
    label: "YouTube",
    blurb: "Tutorials, updates, and previews from creators.",
    url: "https://www.youtube.com/channel/UC9zQuEiPjnRv2LXVqR57K1Q",
    requiresOptIn: false
  },
  {
    id: "bluesky",
    label: "Bluesky",
    blurb: "Short updates and release callouts.",
    url: "https://bsky.app/profile/emubro.bsky.social",
    requiresOptIn: false
  },
  {
    id: "twitter",
    label: "X",
    blurb: "News drops and quick post highlights.",
    url: "https://x.com/emubro",
    requiresOptIn: false
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

export const useCommunityHubStore = defineStore("communityHub", {
  state: () => ({
    initialized: false,
    loading: false,
    actionBusy: false,
    actionStatus: "",
    error: "",
    discordInAppEnabled: false,
    activePlatformId: COMMUNITY_PLATFORMS[0].id,
    lastOpenedPlatformId: ""
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
    },
    setDiscordInAppEnabled(value) {
      this.discordInAppEnabled = !!value;
      writeStoredBoolean(COMMUNITY_DISCORD_OPT_IN_KEY, this.discordInAppEnabled);
      this.persistState();
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
        const locationPlatformId = readLocationPlatformId();
        if (locationPlatformId) {
          this.activePlatformId = locationPlatformId;
        }
        syncLocationPlatformId(this.activePlatformId);
        this.persistState();
        this.initialized = true;
      } finally {
        this.loading = false;
      }
    }
  }
});
