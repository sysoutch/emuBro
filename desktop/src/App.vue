<script setup>
import { computed, defineAsyncComponent, onMounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { useAppStore } from "./stores/app";
import ShellScaffold from "./components/ShellScaffold.vue";
import { useShellThemeStore } from "./stores/shell-theme";
import { setShellStorageValue } from "./utils/shell-storage-cache";

const LegacyFrameHost = defineAsyncComponent(() => import("./components/LegacyFrameHost.vue"));
const LibraryHeaderControls = defineAsyncComponent(() => import("./components/LibraryHeaderControls.vue"));
const DesktopHomeView = defineAsyncComponent(() => import("./views/DesktopHomeView.vue"));
const ThemeWindowView = defineAsyncComponent(() => import("./views/ThemeWindowView.vue"));
const HeaderFiltersView = defineAsyncComponent(() => import("./views/HeaderFiltersView.vue"));
const SettingsToolsView = defineAsyncComponent(() => import("./views/SettingsToolsView.vue"));
const LibraryWorkspaceView = defineAsyncComponent(() => import("./views/LibraryWorkspaceView.vue"));
const SupportCenterView = defineAsyncComponent(() => import("./views/SupportCenterView.vue"));
const CommunityHubView = defineAsyncComponent(() => import("./views/CommunityHubView.vue"));

const appStore = useAppStore();
const shellThemeStore = useShellThemeStore();
const {
  activeSection,
  hasLegacyFrame,
  legacyEntryUrl,
  legacyFrameError,
  legacyFrameReady,
  ready,
  shellSections,
  theme,
  windowMaximized,
  windowStateReady
} = storeToRefs(appStore);

const PENDING_DROP_KEY = "emuBro.pendingDropPaths.v1";
let fileDropBridgeBound = false;

function normalizeFileDropPayload(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.paths)) return payload.paths;
  if (typeof payload === "string") return [payload];
  return [];
}

function queuePendingDrop(paths) {
  const normalized = (Array.isArray(paths) ? paths : [])
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
  if (!normalized.length) return;
  setShellStorageValue(PENDING_DROP_KEY, JSON.stringify(normalized));
}

function bindShellFileDropBridge() {
  if (fileDropBridgeBound || typeof window === "undefined") return;
  const bridge = window.emubro;
  if (!bridge || typeof bridge.onFileDrop !== "function") return;
  fileDropBridgeBound = true;

  bridge.onFileDrop((payload) => {
    const paths = normalizeFileDropPayload(payload);
    if (!paths.length) return;
    if (hasLegacyFrame.value) return;
    if (!legacyEntryUrl.value) return;
    queuePendingDrop(paths);
    if (appStore.activeSectionId !== "legacy-home") {
      appStore.setActiveSection("legacy-home");
    }
  });
}

async function notifyRendererReady() {
  if (!window?.emubro || typeof window.emubro.invoke !== "function") {
    return;
  }
  try {
    await window.emubro.invoke("app:renderer-ready");
  } catch (error) {
    console.warn("[app] renderer-ready notification failed:", error);
  }
}

function onLegacyFrameLoad() {
  appStore.markLegacyFrameReady();
  appStore.markReady();
  void notifyRendererReady();
}

function onLegacyFrameError() {
  appStore.markLegacyFrameError();
  appStore.markReady();
  void notifyRendererReady();
}

onMounted(async () => {
  const legacyEntry =
    typeof __EMUBRO_LEGACY_INDEX__ === "string"
      ? __EMUBRO_LEGACY_INDEX__.trim()
      : "";
  await appStore.initializeShell({ legacyEntryUrl: legacyEntry });
  void shellThemeStore.initialize();
  void appStore.initializeWindowState();
  document.documentElement.setAttribute("data-theme", theme.value);
  if (!appStore.hasLegacyFrame) {
    appStore.markReady();
    void notifyRendererReady();
  }
  bindShellFileDropBridge();
});

watch(theme, (nextTheme) => {
  document.documentElement.setAttribute("data-theme", nextTheme);
});

const shouldShowDesktopShell = computed(() => !hasLegacyFrame.value);

const activeDesktopView = computed(() => {
  switch (activeSection.value.id) {
    case "theme-window":
      return ThemeWindowView;
    case "header-filters":
      return HeaderFiltersView;
    case "settings-tools":
      return SettingsToolsView;
    case "library-views":
      return LibraryWorkspaceView;
    case "support-center":
      return SupportCenterView;
    case "community-hub":
      return CommunityHubView;
    case "desktop-home":
      return DesktopHomeView;
    default:
      return LibraryWorkspaceView;
  }
});

const activeDesktopViewProps = computed(() =>
  activeSection.value.id === "desktop-home" ? { legacyFrameError: legacyFrameError.value } : {}
);

const shouldShowLibraryToolbar = computed(() =>
  activeSection.value.id === "header-filters" || activeSection.value.id === "library-views"
);
</script>

<template>
  <LegacyFrameHost
    v-if="hasLegacyFrame"
    :ready="legacyFrameReady"
    :src="legacyEntryUrl"
    @load="onLegacyFrameLoad"
    @error="onLegacyFrameError"
  />

  <div v-else-if="!ready" class="desktop-shell-loading">
    <div class="desktop-shell-loading-card">
      <div class="desktop-shell-loading-brand">
        <img src="/logo.png" alt="emuBro" />
        <div>
          <h1>EMUBRO</h1>
          <p>Loading library, themes, and tools...</p>
        </div>
      </div>
      <div class="desktop-shell-loading-progress">
        <span class="desktop-shell-loading-progress-bar" />
      </div>
    </div>
  </div>

  <ShellScaffold
    v-else-if="shouldShowDesktopShell"
    :active-section="activeSection"
    :ready="ready"
    :shell-sections="shellSections"
    :theme="theme"
    :window-maximized="windowMaximized"
    :window-state-ready="windowStateReady"
    @select-section="appStore.setActiveSection"
    @toggle-theme="shellThemeStore.toggleTone"
    @minimize-window="appStore.minimizeWindow"
    @maximize-window="appStore.maximizeWindow"
    @close-window="appStore.closeWindow"
  >
    <template v-if="shouldShowLibraryToolbar" #toolbar>
      <LibraryHeaderControls />
    </template>
    <component :is="activeDesktopView" v-bind="activeDesktopViewProps" />
  </ShellScaffold>
</template>
