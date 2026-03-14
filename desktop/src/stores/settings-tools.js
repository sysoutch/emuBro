import { defineStore } from "pinia";
import { useAppStore } from "./app";
import { readNativeShellState, writeNativeShellState } from "../utils/shell-state";
import { getShellStorageValue, setShellStorageValue } from "../utils/shell-storage-cache";

const SETTINGS_PANEL_STORAGE_KEY = "emubro.desktop.settings-tools.panel";
const SETTINGS_PANEL_STATE_KEY = "settings-tools.panel";
const SETTINGS_PANEL_QUERY_KEY = "panel";

const PANEL_IDS = new Set(["settings", "profile", "gamepad", "languages", "ai", "tools", "updates"]);

function normalizePanelId(panelId) {
  const value = String(panelId || "").trim().toLowerCase();
  return PANEL_IDS.has(value) ? value : "settings";
}

function readStoragePanelId() {
  return normalizePanelId(getShellStorageValue(SETTINGS_PANEL_STORAGE_KEY, "settings"));
}

function writeStoragePanelId(panelId) {
  const normalized = normalizePanelId(panelId);
  setShellStorageValue(SETTINGS_PANEL_STORAGE_KEY, normalized);
  return normalized;
}

function readLocationPanelId() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const currentUrl = new URL(window.location.href);
    const sectionId = String(currentUrl.searchParams.get("section") || "").trim().toLowerCase();
    if (sectionId === "languages") {
      return "languages";
    }
    if (sectionId === "gamepad") {
      return "gamepad";
    }
    if (sectionId === "profile") {
      return "profile";
    }
    if (sectionId === "ai") {
      return "ai";
    }
    if (sectionId === "updates") {
      return "updates";
    }
    if (sectionId === "tools") {
      return "tools";
    }
    if (sectionId !== "settings-tools") {
      return "";
    }
    return normalizePanelId(currentUrl.searchParams.get(SETTINGS_PANEL_QUERY_KEY));
  } catch (_error) {
    return "";
  }
}

function syncLocationPanelId(panelId) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const currentUrl = new URL(window.location.href);
    const sectionId = String(currentUrl.searchParams.get("section") || "").trim().toLowerCase();
    if (sectionId !== "settings-tools") {
      return;
    }
    const normalized = normalizePanelId(panelId);
    currentUrl.searchParams.set(SETTINGS_PANEL_QUERY_KEY, normalized);
    if (normalized !== "tools") {
      currentUrl.searchParams.delete("tool");
    }
    window.history.replaceState({}, "", currentUrl.toString());
  } catch (_error) {}
}

export const useSettingsToolsStore = defineStore("settingsTools", {
  state: () => ({
    initialized: false,
    loading: false,
    activePanel: readLocationPanelId() || readStoragePanelId()
  }),
  getters: {
    panelOptions() {
      return [
        {
          id: "settings",
          label: "Settings",
          title: "Library Settings Workspace",
          eyebrow: "Core Settings",
          description: "Manage library defaults, import behavior, launcher imports, and folder paths from the shell.",
          labelKey: "desktopShell.settingsTools.panels.settings.label",
          titleKey: "desktopShell.settingsTools.panels.settings.title",
          eyebrowKey: "desktopShell.settingsTools.panels.settings.eyebrow",
          descriptionKey: "desktopShell.settingsTools.panels.settings.description"
        },
        {
          id: "profile",
          label: "Profile",
          title: "Profile Workspace",
          eyebrow: "Identity",
          description: "Edit the shell-owned local profile, avatar, and linked launcher identities.",
          labelKey: "desktopShell.settingsTools.panels.profile.label",
          titleKey: "desktopShell.settingsTools.panels.profile.title",
          eyebrowKey: "desktopShell.settingsTools.panels.profile.eyebrow",
          descriptionKey: "desktopShell.settingsTools.panels.profile.description"
        },
        {
          id: "gamepad",
          label: "Gamepad",
          title: "Platform Gamepad Profiles",
          eyebrow: "Input Defaults",
          description: "Edit shared keyboard and controller bindings for each platform.",
          labelKey: "desktopShell.settingsTools.panels.gamepad.label",
          titleKey: "desktopShell.settingsTools.panels.gamepad.title",
          eyebrowKey: "desktopShell.settingsTools.panels.gamepad.eyebrow",
          descriptionKey: "desktopShell.settingsTools.panels.gamepad.description"
        },
        {
          id: "languages",
          label: "Languages",
          title: "Language Catalog",
          eyebrow: "Localization",
          description: "Edit installed locales and their JSON payloads.",
          labelKey: "desktopShell.settingsTools.panels.languages.label",
          titleKey: "desktopShell.settingsTools.panels.languages.title",
          eyebrowKey: "desktopShell.settingsTools.panels.languages.eyebrow",
          descriptionKey: "desktopShell.settingsTools.panels.languages.description"
        },
        {
          id: "ai",
          label: "AI / LLM",
          title: "AI And Relay Settings",
          eyebrow: "AI",
          description: "Provider, relay, and prompt settings for shell AI flows.",
          labelKey: "desktopShell.settingsTools.panels.ai.label",
          titleKey: "desktopShell.settingsTools.panels.ai.title",
          eyebrowKey: "desktopShell.settingsTools.panels.ai.eyebrow",
          descriptionKey: "desktopShell.settingsTools.panels.ai.description"
        },
        {
          id: "tools",
          label: "Tools",
          title: "Desktop Tools Workspace",
          eyebrow: "Tools",
          description: "Use shell-native BIOS, covers, gamepad testing, remote library, and plugin workflows.",
          labelKey: "desktopShell.settingsTools.panels.tools.label",
          titleKey: "desktopShell.settingsTools.panels.tools.title",
          eyebrowKey: "desktopShell.settingsTools.panels.tools.eyebrow",
          descriptionKey: "desktopShell.settingsTools.panels.tools.description"
        },
        {
          id: "updates",
          label: "Updates",
          title: "App And Resource Updates",
          eyebrow: "Maintenance",
          description: "Check, download, and install app or resource updates.",
          labelKey: "desktopShell.settingsTools.panels.updates.label",
          titleKey: "desktopShell.settingsTools.panels.updates.title",
          eyebrowKey: "desktopShell.settingsTools.panels.updates.eyebrow",
          descriptionKey: "desktopShell.settingsTools.panels.updates.description"
        }
      ];
    }
  },
  actions: {
    async initialize() {
      if (this.initialized || this.loading) {
        return;
      }

      this.loading = true;
      try {
        const locationPanelId = readLocationPanelId();
        const storedPanelId = normalizePanelId(
          await readNativeShellState(SETTINGS_PANEL_STATE_KEY, readStoragePanelId())
        );
        this.activePanel = locationPanelId || storedPanelId;
        this.initialized = true;
        writeStoragePanelId(this.activePanel);
        syncLocationPanelId(this.activePanel);
        void writeNativeShellState(SETTINGS_PANEL_STATE_KEY, this.activePanel);
      } finally {
        this.loading = false;
      }
    },
    setActivePanel(panelId) {
      this.activePanel = writeStoragePanelId(panelId);
      syncLocationPanelId(this.activePanel);
      void writeNativeShellState(SETTINGS_PANEL_STATE_KEY, this.activePanel);
    },
    openPanel(panelId = "settings") {
      const appStore = useAppStore();
      this.activePanel = writeStoragePanelId(panelId);
      appStore.setActiveSection("settings-tools");
      syncLocationPanelId(this.activePanel);
      void writeNativeShellState(SETTINGS_PANEL_STATE_KEY, this.activePanel);
    }
  }
});
