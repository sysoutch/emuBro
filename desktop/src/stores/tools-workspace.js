import { defineStore } from "pinia";
import { useSettingsToolsStore } from "./settings-tools";
import { readNativeShellState, writeNativeShellState } from "../utils/shell-state";
import { getShellStorageValue, setShellStorageValue } from "../utils/shell-storage-cache";

const ACTIVE_TOOL_STORAGE_KEY = "emubro.desktop.tools.active-tool";
const ACTIVE_TOOL_STATE_KEY = "tools.active-tool";
const ACTIVE_TOOL_QUERY_KEY = "tool";
const TOOL_IDS = new Set(["overview", "memory", "bios", "covers", "cue", "ecm", "gamepad", "monitor", "remote", "plugins"]);

function normalizeToolId(toolId) {
  const value = String(toolId || "").trim().toLowerCase();
  return TOOL_IDS.has(value) ? value : "overview";
}

function readStorageToolId() {
  return normalizeToolId(getShellStorageValue(ACTIVE_TOOL_STORAGE_KEY, "overview"));
}

function writeStorageToolId(toolId) {
  const normalized = normalizeToolId(toolId);
  setShellStorageValue(ACTIVE_TOOL_STORAGE_KEY, normalized);
  return normalized;
}

function readLocationToolId() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const currentUrl = new URL(window.location.href);
    const sectionId = String(currentUrl.searchParams.get("section") || "").trim().toLowerCase();
    const panelId = String(currentUrl.searchParams.get("panel") || "").trim().toLowerCase();
    const hasToolsRoute = sectionId === "tools" || (sectionId === "settings-tools" && panelId === "tools");
    if (!hasToolsRoute) {
      return "";
    }
    return normalizeToolId(currentUrl.searchParams.get(ACTIVE_TOOL_QUERY_KEY));
  } catch (_error) {
    return "";
  }
}

function syncLocationToolId(toolId) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const currentUrl = new URL(window.location.href);
    const sectionId = String(currentUrl.searchParams.get("section") || "").trim().toLowerCase();
    const panelId = String(currentUrl.searchParams.get("panel") || "").trim().toLowerCase();
    const hasToolsRoute = sectionId === "tools" || (sectionId === "settings-tools" && panelId === "tools");
    if (!hasToolsRoute) {
      return;
    }
    currentUrl.searchParams.set(ACTIVE_TOOL_QUERY_KEY, normalizeToolId(toolId));
    window.history.replaceState({}, "", currentUrl.toString());
  } catch (_error) {}
}

export const useToolsWorkspaceStore = defineStore("toolsWorkspace", {
  state: () => ({
    initialized: false,
    loading: false,
    activeTool: readLocationToolId() || readStorageToolId()
  }),
  getters: {
    toolOptions() {
      return [
        {
          id: "overview",
          label: "Overview",
          title: "Tool Workspace",
          eyebrow: "Shell Tools",
          tone: "workspace",
          description: "A shell-native tools area for BIOS, cover downloads, remote library, and managed plugin workflows."
        },
        {
          id: "memory",
          label: "Memory Card",
          title: "Memory Card Editor",
          eyebrow: "Native Bridge",
          tone: "native",
          description: "Load two memory cards, inspect saves, copy/export/import entries, and manage PS1 card data directly from the shell."
        },
        {
          id: "bios",
          label: "BIOS",
          title: "BIOS Manager",
          eyebrow: "Native Bridge",
          tone: "native",
          description: "Browse platform BIOS folders, add files, and open the managed BIOS directories directly from the shell."
        },
        {
          id: "covers",
          label: "Covers",
          title: "Cover Downloader",
          eyebrow: "Native Bridge",
          tone: "native",
          description: "Run PS1/PS2 cover downloads with the same native channel used by the legacy tool and shell cover actions."
        },
        {
          id: "cue",
          label: "CUE",
          title: "CUE Maker",
          eyebrow: "Native Bridge",
          tone: "native",
          description: "Inspect BIN files, detect missing CUE sheets, and generate CUE files directly from the shell."
        },
        {
          id: "ecm",
          label: "ECM",
          title: "ECM / UNECM",
          eyebrow: "Native Bridge",
          tone: "native",
          description: "Download upstream ECM / UNECM, detect compiler support, and build binaries from the shell."
        },
        {
          id: "monitor",
          label: "Monitor",
          title: "Monitor Manager",
          eyebrow: "Native Bridge",
          tone: "native",
          description: "Control Windows monitor orientation, display state, and primary output from the shell."
        },
        {
          id: "gamepad",
          label: "Gamepad",
          title: "Gamepad Tester",
          eyebrow: "Browser API",
          tone: "native",
          description: "Inspect live controller input, button pressure, axis movement, and mappings without dropping back to the legacy tool."
        },
        {
          id: "remote",
          label: "Remote",
          title: "Remote Library",
          eyebrow: "Native Bridge",
          tone: "native",
          description: "Manage host settings, discover peers, pair, browse remote games, and import them into the shell library."
        },
        {
          id: "plugins",
          label: "Plugins",
          title: "Tool Plugin Workspace",
          eyebrow: "Managed Files",
          tone: "hybrid",
          description: "Create and inspect managed HTML/CSS/JS tool plugin scaffolds from the shell."
        }
      ];
    },
    activeToolMeta(state) {
      return this.toolOptions.find((entry) => entry.id === state.activeTool) || this.toolOptions[0];
    },
    legacyFallbackTools() {
      return [
        {
          id: "rom-ripper",
          label: "ROM Ripper",
          description: "Still placeholder/legacy."
        },
        {
          id: "game-database",
          label: "Game Database",
          description: "Still placeholder/legacy."
        },
        {
          id: "cheat-codes",
          label: "Cheat Codes",
          description: "Still placeholder/legacy."
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
        const locationToolId = readLocationToolId();
        const storedToolId = normalizeToolId(
          await readNativeShellState(ACTIVE_TOOL_STATE_KEY, readStorageToolId())
        );
        this.activeTool = locationToolId || storedToolId;
        this.initialized = true;
        writeStorageToolId(this.activeTool);
        syncLocationToolId(this.activeTool);
        void writeNativeShellState(ACTIVE_TOOL_STATE_KEY, this.activeTool);
      } finally {
        this.loading = false;
      }
    },
    setActiveTool(toolId) {
      this.activeTool = writeStorageToolId(toolId);
      syncLocationToolId(this.activeTool);
      void writeNativeShellState(ACTIVE_TOOL_STATE_KEY, this.activeTool);
    },
    openTool(toolId = "overview") {
      const settingsToolsStore = useSettingsToolsStore();
      settingsToolsStore.openPanel("tools");
      this.setActiveTool(toolId);
    }
  }
});
