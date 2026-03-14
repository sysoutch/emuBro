<script setup>
import { computed, defineAsyncComponent, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useShellI18nStore } from "../stores/shell-i18n";
import { useToolsWorkspaceStore } from "../stores/tools-workspace";
import { useWorkspaceStore } from "../stores/workspace";

const BiosManagerPanel = defineAsyncComponent(() => import("./BiosManagerPanel.vue"));
const CoverDownloaderPanel = defineAsyncComponent(() => import("./CoverDownloaderPanel.vue"));
const CueMakerPanel = defineAsyncComponent(() => import("./CueMakerPanel.vue"));
const EcmToolPanel = defineAsyncComponent(() => import("./EcmToolPanel.vue"));
const GamepadTesterPanel = defineAsyncComponent(() => import("./GamepadTesterPanel.vue"));
const MemoryCardPanel = defineAsyncComponent(() => import("./MemoryCardPanel.vue"));
const MonitorManagerPanel = defineAsyncComponent(() => import("./MonitorManagerPanel.vue"));
const RemoteLibraryPanel = defineAsyncComponent(() => import("./RemoteLibraryPanel.vue"));
const ToolPluginWorkspacePanel = defineAsyncComponent(() => import("./ToolPluginWorkspacePanel.vue"));

const toolsStore = useToolsWorkspaceStore();
const shellI18nStore = useShellI18nStore();
const workspaceStore = useWorkspaceStore();
const { activeTool, legacyFallbackTools, toolOptions } = storeToRefs(toolsStore);
const { stats } = storeToRefs(workspaceStore);

const nativeToolCount = computed(() => toolOptions.value.filter((entry) => entry.id !== "overview" && entry.id !== "plugins").length);
const pluginToolCount = computed(() => toolOptions.value.filter((entry) => entry.id === "plugins").length);

function translateToolLabel(tool) {
  const keyMap = {
    overview: "desktopShell.tools.overviewLabel",
    memory: "tools.memoryCardEditor",
    bios: "tools.biosManager",
    covers: "tools.coverDownloader",
    cue: "tools.cueMaker",
    ecm: "tools.ecmUnecm",
    gamepad: "tools.gamepadTester",
    monitor: "tools.monitorManager",
    remote: "tools.remoteLibrary",
    plugins: "desktopShell.tools.pluginsLabel"
  };
  return shellI18nStore.t(keyMap[tool?.id], tool?.label || "");
}

function translateToolTitle(tool) {
  const keyMap = {
    overview: "desktopShell.tools.overviewTitle",
    memory: "tools.memoryCardEditor",
    bios: "tools.biosManager",
    covers: "tools.coverDownloader",
    cue: "tools.cueMaker",
    ecm: "tools.ecmUnecm",
    gamepad: "tools.gamepadTester",
    monitor: "tools.monitorManager",
    remote: "tools.remoteLibrary",
    plugins: "desktopShell.tools.pluginsTitle"
  };
  return shellI18nStore.t(keyMap[tool?.id], tool?.title || "");
}

function translateToolEyebrow(tool) {
  const keyMap = {
    overview: "desktopShell.tools.shellToolsEyebrow",
    memory: "desktopShell.tools.nativeBridgeEyebrow",
    bios: "desktopShell.tools.nativeBridgeEyebrow",
    covers: "desktopShell.tools.nativeBridgeEyebrow",
    cue: "desktopShell.tools.nativeBridgeEyebrow",
    ecm: "desktopShell.tools.nativeBridgeEyebrow",
    monitor: "desktopShell.tools.nativeBridgeEyebrow",
    remote: "desktopShell.tools.nativeBridgeEyebrow",
    gamepad: "desktopShell.tools.browserApiEyebrow",
    plugins: "desktopShell.tools.managedFilesEyebrow"
  };
  return shellI18nStore.t(keyMap[tool?.id], tool?.eyebrow || "");
}

function translateToolDescription(tool) {
  const keyMap = {
    overview: "desktopShell.tools.overviewDescription",
    memory: "desktopShell.tools.memoryDescription",
    bios: "desktopShell.tools.biosDescription",
    covers: "desktopShell.tools.coversDescription",
    cue: "desktopShell.tools.cueDescription",
    ecm: "desktopShell.tools.ecmDescription",
    monitor: "desktopShell.tools.monitorDescription",
    gamepad: "desktopShell.tools.gamepadDescription",
    remote: "desktopShell.tools.remoteDescription",
    plugins: "desktopShell.tools.pluginsDescription"
  };
  return shellI18nStore.t(keyMap[tool?.id], tool?.description || "");
}

const translatedToolOptions = computed(() =>
  toolOptions.value.map((tool) => ({
    ...tool,
    label: translateToolLabel(tool),
    title: translateToolTitle(tool),
    eyebrow: translateToolEyebrow(tool),
    description: translateToolDescription(tool)
  }))
);

const translatedActiveToolMeta = computed(
  () => translatedToolOptions.value.find((entry) => entry.id === activeTool.value) || translatedToolOptions.value[0]
);

const translatedLegacyFallbackTools = computed(() =>
  legacyFallbackTools.value.map((tool) => ({
    ...tool,
    label: shellI18nStore.t(`desktopShell.tools.legacy.${tool.id}.label`, tool.label),
    description: shellI18nStore.t(`desktopShell.tools.legacy.${tool.id}.description`, tool.description)
  }))
);

const TOOL_ICON_MARKUP = Object.freeze({
  overview: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
    </svg>
  `,
  memory: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 8h12v8H6z" />
      <path d="M8 6v2M12 6v2M16 6v2M8 16v2M12 16v2M16 16v2" />
    </svg>
  `,
  covers: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="m7 15 3-3 3 2 4-5 2 3" />
      <circle cx="9" cy="9" r="1.2" />
    </svg>
  `,
  cue: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 3h6l4 4v14H8z" />
      <path d="M14 3v5h4" />
      <path d="M10 12h6M10 16h6" />
    </svg>
  `,
  ecm: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4v10" />
      <path d="m8.5 10.5 3.5 3.5 3.5-3.5" />
      <path d="M5 19h14" />
    </svg>
  `,
  remote: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="7" height="5" rx="1.5" />
      <rect x="14" y="5" width="7" height="5" rx="1.5" />
      <rect x="8.5" y="14" width="7" height="5" rx="1.5" />
      <path d="M10 7.5h4M12 10v4" />
    </svg>
  `,
  gamepad: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 16.5c-1.8 0-3.3-1.3-3.7-3l-.6-2.4C2.2 9 3.5 7 5.7 7h12.6c2.2 0 3.5 2 3 4.1l-.6 2.4c-.4 1.7-1.9 3-3.7 3-.9 0-1.7-.3-2.4-.9l-1.2-1.1c-.8-.7-2-.7-2.8 0l-1.2 1.1c-.7.6-1.5.9-2.4.9z" />
      <path d="M7.5 11h3M9 9.5v3" />
      <path d="M15.8 10.7h.01M18 12.4h.01" />
    </svg>
  `,
  monitor: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5" width="16" height="11" rx="1.8" />
      <path d="M10 19h4M12 16v3" />
    </svg>
  `,
  bios: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="8" y="8" width="8" height="8" rx="1.2" />
      <path d="M10 4v2M14 4v2M10 18v2M14 18v2M4 10h2M4 14h2M18 10h2M18 14h2" />
    </svg>
  `,
  plugins: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 7V5a2 2 0 1 1 4 0v2" />
      <path d="M7 10h10v8a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z" />
      <path d="M10 14h4" />
    </svg>
  `,
  "rom-ripper": `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  `,
  "game-database": `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <ellipse cx="12" cy="6.5" rx="6.5" ry="2.5" />
      <path d="M5.5 6.5v5c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5v-5" />
      <path d="M5.5 11.5v5c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5v-5" />
    </svg>
  `,
  "cheat-codes": `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m8 16 8-8" />
      <path d="m9.5 6.5 2 2" />
      <path d="m12.5 9.5 2 2" />
      <path d="M6 18l3.5-.5L18 9l-3-3-8.5 8.5z" />
    </svg>
  `
});

const OVERVIEW_ORDER = Object.freeze([
  "memory",
  "covers",
  "cue",
  "ecm",
  "remote",
  "gamepad",
  "monitor",
  "bios",
  "plugins"
]);

const overviewCards = computed(() => {
  const nativeCards = OVERVIEW_ORDER.map((id) => translatedToolOptions.value.find((tool) => tool.id === id))
    .filter(Boolean)
    .map((tool) => ({
      ...tool,
      iconMarkup: TOOL_ICON_MARKUP[tool.id] || TOOL_ICON_MARKUP.overview,
      actionLabel: shellI18nStore.t("desktopShell.tools.openTool", "Open Tool"),
      isLegacy: false
    }));

  const legacyCards = translatedLegacyFallbackTools.value.map((tool) => ({
    ...tool,
    iconMarkup: TOOL_ICON_MARKUP[tool.id] || TOOL_ICON_MARKUP.overview,
    actionLabel: shellI18nStore.t("desktopShell.tools.legacyLabel", "Legacy"),
    isLegacy: true
  }));

  return [...nativeCards, ...legacyCards];
});

const currentComponent = computed(() => {
  switch (activeTool.value) {
    case "memory":
      return MemoryCardPanel;
    case "bios":
      return BiosManagerPanel;
    case "covers":
      return CoverDownloaderPanel;
    case "cue":
      return CueMakerPanel;
    case "ecm":
      return EcmToolPanel;
    case "gamepad":
      return GamepadTesterPanel;
    case "monitor":
      return MonitorManagerPanel;
    case "remote":
      return RemoteLibraryPanel;
    case "plugins":
      return ToolPluginWorkspacePanel;
    case "overview":
    default:
      return null;
  }
});

onMounted(() => {
  toolsStore.initialize();
});
</script>

<template>
  <div class="desktop-tools-workspace">
    <section class="desktop-tools-toolbar card">
      <div class="desktop-tools-toolbar-main">
        <div>
          <div class="eyebrow">{{ shellI18nStore.t("desktopShell.tools.workspaceEyebrow", "Tools Workspace") }}</div>
          <h2>{{ translatedActiveToolMeta?.title || shellI18nStore.t("desktopShell.tools.overviewTitle", "Tool Workspace") }}</h2>
          <p>{{ translatedActiveToolMeta?.description }}</p>
        </div>
        <div class="desktop-tools-summary">
          <span class="desktop-tools-summary-pill">
            <strong>{{ nativeToolCount }}</strong>
            {{ shellI18nStore.t("desktopShell.tools.nativeTools", "Native tools") }}
          </span>
          <span class="desktop-tools-summary-pill">
            <strong>{{ legacyFallbackTools.length }}</strong>
            {{ shellI18nStore.t("desktopShell.tools.legacyOnlyTools", "Legacy-only tools") }}
          </span>
          <span class="desktop-tools-summary-pill">
            <strong>{{ stats.games }}</strong>
            {{ shellI18nStore.t("desktopShell.tools.loadedGames", "Loaded games") }}
          </span>
        </div>
      </div>

      <div class="desktop-tools-tab-strip">
        <button
          v-for="tool in translatedToolOptions"
          :key="tool.id"
          type="button"
          class="desktop-tools-tab"
          :class="{ 'is-active': activeTool === tool.id }"
          @click="toolsStore.setActiveTool(tool.id)"
        >
          {{ tool.label }}
        </button>
      </div>
    </section>

    <template v-if="activeTool === 'overview'">
      <section class="desktop-tools-home card">
        <div class="desktop-tool-overview-grid">
          <article
            v-for="tool in overviewCards"
            :key="tool.id"
            class="desktop-tool-overview-card"
            :class="{ 'is-legacy': tool.isLegacy }"
          >
            <div class="desktop-tool-overview-icon" aria-hidden="true" v-html="tool.iconMarkup"></div>
            <div class="desktop-tool-overview-copy">
              <h3>{{ tool.title || tool.label }}</h3>
              <p>{{ tool.description }}</p>
            </div>
            <button
              type="button"
              class="desktop-tool-overview-action"
              :class="{ 'is-legacy': tool.isLegacy }"
              :disabled="tool.isLegacy"
              @click="!tool.isLegacy && toolsStore.setActiveTool(tool.id)"
            >
              {{ tool.isLegacy ? shellI18nStore.t("desktopShell.tools.legacyLabel", "Legacy") : tool.actionLabel }}
            </button>
          </article>
        </div>
      </section>
    </template>

    <section v-else class="desktop-tools-active">
      <component :is="currentComponent" />
    </section>
  </div>
</template>
