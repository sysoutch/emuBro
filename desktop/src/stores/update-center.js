import { defineStore } from "pinia";
import { useShellI18nStore } from "./shell-i18n";

function getDesktopBridge() {
  if (typeof window === "undefined" || !window.emubro) {
    return null;
  }
  return window.emubro;
}

function getDefaultAppState() {
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
    lastMessage: "Not checked yet."
  };
}

function translate(key, fallback, params = null) {
  try {
    const shellI18nStore = useShellI18nStore();
    return params ? shellI18nStore.tf(key, params, fallback) : shellI18nStore.t(key, fallback);
  } catch (_error) {
    if (!params) {
      return fallback;
    }
    return Object.entries(params).reduce(
      (result, [name, value]) => String(result).replaceAll(`{{${name}}}`, String(value ?? "")),
      String(fallback || "")
    );
  }
}

function getDefaultResourcesState() {
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

function getDefaultResourcesConfig() {
  return {
    manifestUrl: "",
    repoUrl: "",
    storagePath: "",
    effectiveStoragePath: "",
    defaultStoragePath: "",
    autoCheckOnStartup: true,
    autoCheckIntervalMinutes: 60
  };
}

function normalizeState(rawState, fallback) {
  if (!rawState || typeof rawState !== "object") {
    return { ...fallback };
  }
  return {
    ...fallback,
    ...rawState
  };
}

export const useUpdateCenterStore = defineStore("updateCenter", {
  state: () => ({
    initialized: false,
    loading: false,
    busyAction: "",
    error: "",
    actionStatus: "",
    appState: getDefaultAppState(),
    resourcesState: getDefaultResourcesState(),
    resourcesConfig: getDefaultResourcesConfig(),
    resourcesStoragePathDraft: "",
    pollingHandle: null
  }),
  getters: {
    appBusy(state) {
      return state.appState.checking || state.appState.downloading || state.appState.installing;
    },
    resourcesBusy(state) {
      return state.resourcesState.checking || state.resourcesState.installing;
    }
  },
  actions: {
    syncPolling() {
      if (typeof window === "undefined") {
        return;
      }

      const shouldPoll = this.appBusy || this.resourcesBusy;
      if (shouldPoll && !this.pollingHandle) {
        this.pollingHandle = window.setInterval(() => {
          void this.refresh();
        }, 1500);
      } else if (!shouldPoll && this.pollingHandle) {
        window.clearInterval(this.pollingHandle);
        this.pollingHandle = null;
      }
    },
    async refresh() {
      const bridge = getDesktopBridge();
      if (!bridge?.updates || !bridge.resourcesUpdates) {
        this.error = translate("desktopShell.updates.bridgeUnavailable", "Desktop update bridge unavailable.");
        return;
      }

      this.loading = true;
      this.error = "";

      try {
        const [appState, resourcesState, resourcesConfig] = await Promise.all([
          bridge.updates.getState(),
          bridge.resourcesUpdates.getState(),
          bridge.resourcesUpdates.getConfig()
        ]);
        this.appState = normalizeState(appState, getDefaultAppState());
        this.resourcesState = normalizeState(resourcesState, getDefaultResourcesState());
        this.resourcesConfig = normalizeState(resourcesConfig, getDefaultResourcesConfig());
        this.resourcesStoragePathDraft = String(this.resourcesConfig.storagePath || "");
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error || "Unknown error");
      } finally {
        this.loading = false;
        this.syncPolling();
      }
    },
    async initialize() {
      if (this.initialized) {
        return;
      }
      await this.refresh();
      this.initialized = true;
    },
    async browseResourcesStoragePath() {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.error = translate("desktopShell.updates.bridgeUnavailable", "Desktop update bridge unavailable.");
        return null;
      }

      const pick = await bridge.invoke("open-file-dialog", {
        title: translate("desktopShell.updates.selectResourcesStorageFolder", "Select resources storage folder"),
        properties: ["openDirectory", "createDirectory"],
        defaultPath: this.resourcesConfig.effectiveStoragePath || undefined
      });
      if (!pick || pick.canceled || !Array.isArray(pick.filePaths) || pick.filePaths.length === 0) {
        return null;
      }

      this.resourcesStoragePathDraft = String(pick.filePaths[0] || "").trim();
      return this.resourcesStoragePathDraft;
    },
    async saveResourcesConfig() {
      const bridge = getDesktopBridge();
      if (!bridge?.resourcesUpdates) {
        this.error = translate("desktopShell.updates.bridgeUnavailable", "Desktop update bridge unavailable.");
        return false;
      }

      this.busyAction = "resources-config";
      this.error = "";

      try {
        const result = await bridge.resourcesUpdates.setConfig({
          ...this.resourcesConfig,
          storagePath: String(this.resourcesStoragePathDraft || "").trim()
        });
        if (!result?.success) {
          throw new Error(result?.message || "Failed to save resources update config.");
        }
        this.actionStatus = translate("desktopShell.updates.savedResourcesSettings", "Saved resources storage settings.");
        await this.refresh();
        return true;
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error || "Unknown error");
        return false;
      } finally {
        this.busyAction = "";
      }
    },
    async checkApp() {
      const bridge = getDesktopBridge();
      if (!bridge?.updates) {
        this.error = translate("desktopShell.updates.bridgeUnavailable", "Desktop update bridge unavailable.");
        return null;
      }

      this.busyAction = "app-check";
      this.error = "";

      try {
        const result = await bridge.updates.check();
        this.actionStatus = String(result?.lastMessage || result?.message || translate("desktopShell.updates.checkedForAppUpdates", "Checked for app updates."));
        await this.refresh();
        return result;
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error || "Unknown error");
        return null;
      } finally {
        this.busyAction = "";
      }
    },
    async downloadApp() {
      const bridge = getDesktopBridge();
      if (!bridge?.updates) {
        this.error = translate("desktopShell.updates.bridgeUnavailable", "Desktop update bridge unavailable.");
        return null;
      }

      this.busyAction = "app-download";
      this.error = "";

      try {
        const result = await bridge.updates.download();
        this.actionStatus = String(result?.lastMessage || result?.message || translate("desktopShell.updates.startedAppDownload", "Started app download."));
        await this.refresh();
        return result;
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error || "Unknown error");
        return null;
      } finally {
        this.busyAction = "";
      }
    },
    async installApp() {
      const bridge = getDesktopBridge();
      if (!bridge?.updates) {
        this.error = translate("desktopShell.updates.bridgeUnavailable", "Desktop update bridge unavailable.");
        return null;
      }

      this.busyAction = "app-install";
      this.error = "";

      try {
        const result = await bridge.updates.install();
        this.actionStatus = String(result?.lastMessage || result?.message || translate("desktopShell.updates.startedAppInstall", "Started app installation."));
        await this.refresh();
        return result;
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error || "Unknown error");
        return null;
      } finally {
        this.busyAction = "";
      }
    },
    async checkResources() {
      const bridge = getDesktopBridge();
      if (!bridge?.resourcesUpdates) {
        this.error = translate("desktopShell.updates.bridgeUnavailable", "Desktop update bridge unavailable.");
        return null;
      }

      this.busyAction = "resources-check";
      this.error = "";

      try {
        const result = await bridge.resourcesUpdates.check();
        this.actionStatus = String(result?.lastMessage || result?.message || translate("desktopShell.updates.checkedResourceUpdates", "Checked resource updates."));
        await this.refresh();
        return result;
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error || "Unknown error");
        return null;
      } finally {
        this.busyAction = "";
      }
    },
    async installResources() {
      const bridge = getDesktopBridge();
      if (!bridge?.resourcesUpdates) {
        this.error = translate("desktopShell.updates.bridgeUnavailable", "Desktop update bridge unavailable.");
        return null;
      }

      this.busyAction = "resources-install";
      this.error = "";

      try {
        const result = await bridge.resourcesUpdates.install();
        this.actionStatus = String(result?.lastMessage || result?.message || translate("desktopShell.updates.startedResourcesInstall", "Started resources install."));
        await this.refresh();
        return result;
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error || "Unknown error");
        return null;
      } finally {
        this.busyAction = "";
      }
    }
  }
});
