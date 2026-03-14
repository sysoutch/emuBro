import { defineStore } from "pinia";
import {
  clearPreferredStartupSectionId,
  clearPreferredStartupSectionIdAsync,
  DEFAULT_STARTUP_SECTION_ID,
  getShellSection,
  hasExplicitSectionSelectionInLocation,
  listShellSections,
  readPreferredStartupSectionIdAsync,
  readPreferredStartupSectionId,
  resolveInitialShellSectionId,
  writePreferredStartupSectionId,
  writePreferredStartupSectionIdAsync
} from "../shell/sections";

function getInitialThemeTone() {
  if (typeof document !== "undefined") {
    const attr = String(document.documentElement.getAttribute("data-theme") || "").trim().toLowerCase();
    if (attr === "light" || attr === "dark") return attr;
  }
  return "dark";
}

function getDesktopBridge() {
  if (typeof window === "undefined" || !window.emubro) {
    return null;
  }
  return window.emubro;
}

export const useAppStore = defineStore("app", {
  state: () => ({
    theme: getInitialThemeTone(),
    ready: false,
    legacyEntryUrl: "",
    legacyFrameReady: false,
    legacyFrameError: false,
    shellSections: listShellSections(),
    activeSectionId: resolveInitialShellSectionId(),
    preferredStartupSectionId: readPreferredStartupSectionId(),
    windowMaximized: false,
    windowStateReady: false,
    windowStateBound: false
  }),
  getters: {
    activeSection(state) {
      return getShellSection(state.activeSectionId);
    },
    hasLegacyFrame(state) {
      return (
        getShellSection(state.activeSectionId).renderMode === "legacy" &&
        !!state.legacyEntryUrl &&
        !state.legacyFrameError
      );
    },
    preferredStartupSection(state) {
      return getShellSection(state.preferredStartupSectionId);
    }
  },
  actions: {
    async initializeShell({ legacyEntryUrl = "" } = {}) {
      this.legacyEntryUrl = String(legacyEntryUrl || "").trim();
      this.legacyFrameReady = false;
      this.legacyFrameError = false;
      this.activeSectionId = getShellSection(this.activeSectionId).id;
      this.preferredStartupSectionId = getShellSection(this.preferredStartupSectionId).id;
      if (this.activeSection.renderMode === "legacy" && !this.legacyEntryUrl) {
        this.activeSectionId = DEFAULT_STARTUP_SECTION_ID;
      }
      if (this.preferredStartupSection.renderMode === "legacy" && !this.legacyEntryUrl) {
        this.preferredStartupSectionId = clearPreferredStartupSectionId();
      }
      const preferredStartupSectionId = await readPreferredStartupSectionIdAsync();
      this.preferredStartupSectionId = getShellSection(preferredStartupSectionId).id;
      if (!hasExplicitSectionSelectionInLocation()) {
        this.activeSectionId = this.preferredStartupSectionId;
        if (this.activeSection.renderMode === "legacy" && !this.legacyEntryUrl) {
          this.activeSectionId = DEFAULT_STARTUP_SECTION_ID;
        }
      }
      this.syncSectionToLocation();
    },
    async initializeWindowState() {
      await this.refreshWindowState();
      if (this.windowStateBound) {
        return;
      }

      const bridge = getDesktopBridge();
      if (!bridge || typeof bridge.onWindowMaximizedChanged !== "function") {
        return;
      }

      bridge.onWindowMaximizedChanged((isMaximized) => {
        this.windowMaximized = !!isMaximized;
        this.windowStateReady = true;
      });
      this.windowStateBound = true;
    },
    async refreshWindowState() {
      const bridge = getDesktopBridge();
      if (!bridge || typeof bridge.invoke !== "function") {
        this.windowStateReady = true;
        return;
      }

      try {
        this.windowMaximized = !!(await bridge.invoke("window:is-maximized"));
      } catch (_error) {
        this.windowMaximized = false;
      }
      this.windowStateReady = true;
    },
    markReady() {
      this.ready = true;
    },
    markLegacyFrameReady() {
      this.legacyFrameReady = true;
    },
    markLegacyFrameError() {
      this.legacyFrameError = true;
      if (this.activeSection.renderMode === "legacy") {
        this.activeSectionId = DEFAULT_STARTUP_SECTION_ID;
        this.syncSectionToLocation();
      }
    },
    setActiveSection(sectionId) {
      const nextSection = getShellSection(sectionId);
      if (nextSection.renderMode === "legacy" && !this.legacyEntryUrl) {
        return;
      }
      this.activeSectionId = nextSection.id;
      if (nextSection.renderMode === "legacy") {
        this.legacyFrameError = false;
      }
      this.syncSectionToLocation();
    },
    setPreferredStartupSection(sectionId) {
      const nextSection = getShellSection(sectionId);
      if (nextSection.renderMode === "legacy" && !this.legacyEntryUrl) {
        return;
      }
      this.preferredStartupSectionId = writePreferredStartupSectionId(nextSection.id);
      void writePreferredStartupSectionIdAsync(nextSection.id);
    },
    clearPreferredStartupSection() {
      this.preferredStartupSectionId = clearPreferredStartupSectionId();
      void clearPreferredStartupSectionIdAsync();
    },
    syncSectionToLocation() {
      if (typeof window === "undefined") {
        return;
      }
      try {
        const currentUrl = new URL(window.location.href);
        const clearLibraryKeys = () => {
          [
            "library",
            "view",
            "query",
            "platform",
            "region",
            "language",
            "group",
            "sort",
            "emulatorType"
          ].forEach((key) => currentUrl.searchParams.delete(key));
        };

        if (this.activeSection.id === "legacy-home") {
          currentUrl.searchParams.delete("section");
          currentUrl.searchParams.delete("desktop");
          currentUrl.searchParams.delete("panel");
          currentUrl.searchParams.delete("tool");
          currentUrl.searchParams.delete("supportMode");
          currentUrl.searchParams.delete("communityPlatform");
          clearLibraryKeys();
        } else {
          currentUrl.searchParams.set("section", this.activeSection.id);
          currentUrl.searchParams.delete("desktop");
          if (this.activeSection.id !== "settings-tools") {
            currentUrl.searchParams.delete("panel");
            currentUrl.searchParams.delete("tool");
          }
          if (this.activeSection.id !== "support-center") {
            currentUrl.searchParams.delete("supportMode");
          }
          if (this.activeSection.id !== "community-hub") {
            currentUrl.searchParams.delete("communityPlatform");
          }
          if (this.activeSection.id !== "library-views" && this.activeSection.id !== "header-filters") {
            clearLibraryKeys();
          }
        }
        window.history.replaceState({}, "", currentUrl.toString());
      } catch (_error) {}
    },
    toggleTheme() {
      this.setTheme(this.theme === "dark" ? "light" : "dark");
    },
    setTheme(nextTheme) {
      this.theme = nextTheme === "light" ? "light" : "dark";
      if (typeof document !== "undefined") {
        document.documentElement.setAttribute("data-theme", this.theme);
      }
    },
    async minimizeWindow() {
      const bridge = getDesktopBridge();
      if (!bridge || typeof bridge.invoke !== "function") {
        return;
      }
      await bridge.invoke("window:minimize");
    },
    async maximizeWindow() {
      const bridge = getDesktopBridge();
      if (!bridge || typeof bridge.invoke !== "function") {
        return;
      }
      await bridge.invoke("window:toggle-maximize");
      await this.refreshWindowState();
    },
    async closeWindow() {
      const bridge = getDesktopBridge();
      if (!bridge || typeof bridge.invoke !== "function") {
        return;
      }
      await bridge.invoke("window:close");
    }
  }
});
