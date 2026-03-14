import { defineStore } from "pinia";
import { useSettingsToolsStore } from "./settings-tools";
import { useUpdateCenterStore } from "./update-center";

const SOCIAL_LINKS = [
  { id: "discord", label: "Discord", url: "https://discord.com/invite/EtKvZ2F" },
  { id: "reddit", label: "Reddit", url: "https://www.reddit.com/r/emuBro/" },
  { id: "youtube", label: "YouTube", url: "https://www.youtube.com/channel/UC9zQuEiPjnRv2LXVqR57K1Q" },
  { id: "bluesky", label: "Bluesky", url: "https://bsky.app/profile/emubro.bsky.social" },
  { id: "x", label: "X", url: "https://x.com/emubro" },
  { id: "github", label: "GitHub", url: "https://github.com/sysoutch/emuBro" }
];

function getDesktopBridge() {
  if (typeof window === "undefined" || !window.emubro) {
    return null;
  }
  return window.emubro;
}

function normalizeUserInfo(rawUserInfo) {
  return {
    username: String(rawUserInfo?.username || "bro"),
    displayName: String(rawUserInfo?.displayName || rawUserInfo?.username || "Bro"),
    id: String(rawUserInfo?.id || "local"),
    avatarUrl: String(rawUserInfo?.avatarUrl || "/logo.png")
  };
}

function normalizePlatformLabel(rawPlatform) {
  const value = String(rawPlatform || "").trim().toLowerCase();
  if (!value) return "Desktop";
  if (value.includes("win")) return "Windows";
  if (value.includes("linux")) return "Linux";
  if (value.includes("darwin") || value.includes("mac")) return "macOS";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function createDefaultAppState() {
  return {
    available: false,
    checking: false,
    downloading: false,
    installing: false,
    downloaded: false,
    progressPercent: 0,
    currentVersion: "",
    latestVersion: "",
    releaseNotes: "",
    releaseUrl: "",
    downloadUrl: "",
    lastError: "",
    lastMessage: ""
  };
}

function createDefaultResourcesState() {
  return {
    available: false,
    checking: false,
    installing: false,
    downloaded: false,
    progressPercent: 0,
    currentVersion: "",
    latestVersion: "",
    missingLocalResources: false,
    lastError: "",
    lastMessage: ""
  };
}

function countAvailableUpdates(appState, resourcesState) {
  let count = 0;
  if (appState?.available || appState?.downloaded) {
    count += 1;
  }
  if (resourcesState?.available || resourcesState?.downloaded || resourcesState?.missingLocalResources) {
    count += 1;
  }
  return count;
}

function buildUpdateLabel(appState, resourcesState) {
  const appUpdate = !!(appState?.available || appState?.downloaded);
  const resourcesUpdate = !!(resourcesState?.available || resourcesState?.downloaded || resourcesState?.missingLocalResources);

  if (appUpdate && resourcesUpdate) {
    return "App and resources updates available";
  }
  if (appUpdate) {
    return appState?.downloaded ? "App update downloaded" : "App update available";
  }
  if (resourcesUpdate) {
    return resourcesState?.missingLocalResources ? "Resources missing locally" : "Resources update available";
  }
  return "Updates current";
}

function buildActivityLabel(appState, resourcesState) {
  if (appState?.installing) return "Installing app update";
  if (resourcesState?.installing) return "Installing resources";
  if (appState?.downloading) {
    const percent = Math.max(0, Math.round(Number(appState?.progressPercent || 0)));
    return percent > 0 ? `Downloading app ${percent}%` : "Downloading app update";
  }
  if (appState?.checking || resourcesState?.checking) {
    return "Checking for updates";
  }
  return buildUpdateLabel(appState, resourcesState);
}

export const useWindowChromeStore = defineStore("windowChrome", {
  state: () => ({
    initialized: false,
    initializing: false,
    eventBindingsReady: false,
    aboutOpen: false,
    changelogOpen: false,
    error: "",
    actionStatus: "",
    appState: createDefaultAppState(),
    resourcesState: createDefaultResourcesState(),
    userInfo: normalizeUserInfo(null),
    platformLabel: normalizePlatformLabel(typeof navigator !== "undefined" ? navigator.platform : "desktop"),
    socialLinks: SOCIAL_LINKS
  }),
  getters: {
    availableUpdateCount(state) {
      return countAvailableUpdates(state.appState, state.resourcesState);
    },
    hasAvailableUpdates(state) {
      return countAvailableUpdates(state.appState, state.resourcesState) > 0;
    },
    updateLabel(state) {
      return buildUpdateLabel(state.appState, state.resourcesState);
    },
    updateActivityLabel(state) {
      return buildActivityLabel(state.appState, state.resourcesState);
    },
    aboutReleaseNotes(state) {
      const notes = String(state.appState.releaseNotes || "").trim();
      return notes || "No release notes available for this build.";
    },
    aboutVersionLine(state) {
      return String(state.appState.currentVersion || "").trim() || "Unknown";
    },
    latestVersionLine(state) {
      return String(state.appState.latestVersion || "").trim() || "Unknown";
    },
    resourcesVersionLine(state) {
      return String(state.resourcesState.currentVersion || "").trim() || "Unknown";
    }
  },
  actions: {
    syncFromUpdateCenter() {
      const updateCenterStore = useUpdateCenterStore();
      this.appState = {
        ...createDefaultAppState(),
        ...(updateCenterStore.appState || {})
      };
      this.resourcesState = {
        ...createDefaultResourcesState(),
        ...(updateCenterStore.resourcesState || {})
      };
    },
    async refresh({ force = true } = {}) {
      const bridge = getDesktopBridge();
      const updateCenterStore = useUpdateCenterStore();

      this.initializing = true;
      this.error = "";

      try {
        if (!updateCenterStore.initialized) {
          await updateCenterStore.initialize();
        } else if (force) {
          await updateCenterStore.refresh();
        }

        this.syncFromUpdateCenter();

        if (bridge?.invoke) {
          const userInfo = await bridge.invoke("get-user-info");
          this.userInfo = normalizeUserInfo(userInfo);
        }

        this.platformLabel = normalizePlatformLabel(bridge?.platform || navigator?.platform || "desktop");
        this.initialized = true;
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error || "Failed to refresh shell chrome state.");
      } finally {
        this.initializing = false;
      }
    },
    bindUpdateEvents() {
      if (this.eventBindingsReady) {
        return;
      }

      const bridge = getDesktopBridge();
      if (!bridge) {
        return;
      }

      if (typeof bridge.onUpdateStatus === "function") {
        bridge.onUpdateStatus(() => {
          void this.refresh({ force: true });
        });
      }

      if (typeof bridge.onResourcesUpdateStatus === "function") {
        bridge.onResourcesUpdateStatus(() => {
          void this.refresh({ force: true });
        });
      }

      this.eventBindingsReady = true;
    },
    async initialize() {
      await this.refresh({ force: true });
      this.bindUpdateEvents();
    },
    async openAbout() {
      if (!this.initialized) {
        await this.initialize();
      } else {
        await this.refresh({ force: true });
      }
      this.aboutOpen = true;
    },
    closeAbout() {
      this.aboutOpen = false;
      this.changelogOpen = false;
      this.actionStatus = "";
    },
    toggleChangelog() {
      this.changelogOpen = !this.changelogOpen;
    },
    openUpdatesPanel() {
      const settingsToolsStore = useSettingsToolsStore();
      settingsToolsStore.openPanel("updates");
    },
    async openExternal(url) {
      const bridge = getDesktopBridge();
      const target = String(url || "").trim();
      if (!target) {
        this.actionStatus = "Missing URL.";
        return null;
      }

      if (!bridge?.invoke) {
        this.actionStatus = "Desktop bridge unavailable.";
        return null;
      }

      try {
        const result = await bridge.invoke("open-external-url", target);
        this.actionStatus = String(result?.message || (result?.success ? "Opened external link." : "Could not open link."));
        return result;
      } catch (error) {
        this.actionStatus = error instanceof Error ? error.message : String(error || "Could not open link.");
        return null;
      }
    }
  }
});
