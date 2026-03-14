<script setup>
import { computed, defineAsyncComponent, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useAppStore } from "../stores/app";
import { useHeaderFiltersStore } from "../stores/header-filters";
import { useLibraryCategoriesStore } from "../stores/library-categories";
import { useShellI18nStore } from "../stores/shell-i18n";
import { useSettingsToolsStore } from "../stores/settings-tools";
import { useWorkspaceStore } from "../stores/workspace";
import { applyPaletteFromImage } from "../utils/emulator-visuals";
import { resolveEffectiveEmulatorConfig } from "../utils/emulator-config";
import { loadSelectedLaunchPath } from "../utils/emulator-preferences";
import { buildGameSections, filterEmulatorRows } from "../utils/library-query";
import LazyArtwork from "../components/LazyArtwork.vue";

const EmulatorDetailsModal = defineAsyncComponent(() => import("../components/EmulatorDetailsModal.vue"));
const GameDetailsModal = defineAsyncComponent(() => import("../components/GameDetailsModal.vue"));
const LibraryBrowsePanel = defineAsyncComponent(() => import("../components/LibraryBrowsePanel.vue"));
const LibraryCategoriesPanel = defineAsyncComponent(() => import("../components/LibraryCategoriesPanel.vue"));
const LibraryImmersiveView = defineAsyncComponent(() => import("../components/LibraryImmersiveView.vue"));
const SELECTION_PANEL_DOCKED_KEY = "emubro.desktop.library.selection-panel-docked";

const appStore = useAppStore();
const filtersStore = useHeaderFiltersStore();
const categoriesStore = useLibraryCategoriesStore();
const shellI18nStore = useShellI18nStore();
const settingsToolsStore = useSettingsToolsStore();
const workspaceStore = useWorkspaceStore();

const {
  coverSize,
  emulatorType,
  groupSameNames,
  librarySection,
  librarySectionOptions,
  query,
  selectedGroup,
  selectedLanguage,
  selectedPlatform,
  selectedRegion,
  sortBy,
  summary,
  viewMode
} = storeToRefs(filtersStore);
const { emulators, games, loading, refreshError, stats } = storeToRefs(workspaceStore);
const { activeTagIds, hasSelection } = storeToRefs(categoriesStore);

const selectedGameKey = ref("");
const launchStatus = ref("");
const launchStatusTone = ref("");
const isGameModalOpen = ref(false);

const selectedEmulatorKey = ref("");
const emulatorStatus = ref("");
const emulatorStatusTone = ref("");
const isEmulatorModalOpen = ref(false);
const selectionPanelDocked = ref(readSelectionPanelDockedPreference());

const showEmulatorsView = computed(() => librarySection.value === "emulators");

const visibleSections = computed(() =>
  showEmulatorsView.value
    ? []
    : buildGameSections(games.value, {
        librarySection: librarySection.value,
        query: query.value,
        selectedPlatform: selectedPlatform.value,
        selectedLanguage: selectedLanguage.value,
        selectedRegion: selectedRegion.value,
        selectedGroup: selectedGroup.value,
        activeTagIds: activeTagIds.value,
        sortBy: sortBy.value,
        groupSameNames: groupSameNames.value
      })
);

const filteredEmulators = computed(() =>
  filterEmulatorRows(emulators.value, {
    query: query.value,
    selectedPlatform: selectedPlatform.value,
    emulatorType: emulatorType.value,
    sortBy: sortBy.value
  })
);

const visibleGameCount = computed(() =>
  visibleSections.value.reduce((total, section) => total + section.rows.length, 0)
);

const visibleEmulatorCount = computed(() => filteredEmulators.value.length);
const suggestedGameCount = computed(() => 0);
const recentGameCount = computed(() => games.value.filter((row) => !!row?.lastPlayed).length);
const sectionQuickStats = computed(() => ({
  all: games.value.length,
  suggested: suggestedGameCount.value,
  recent: recentGameCount.value,
  emulators: emulators.value.length
}));

function translateLibrarySection(sectionId, fallback = "") {
  const keyMap = {
    all: "sidebar.allGames",
    suggested: "sidebar.suggested",
    recent: "sidebar.recentlyPlayed",
    emulators: "sidebar.emulators"
  };
  return shellI18nStore.t(keyMap[String(sectionId || "").trim().toLowerCase()], fallback || String(sectionId || ""));
}

const translatedLibrarySectionOptions = computed(() =>
  librarySectionOptions.value.map((option) => ({
    ...option,
    label: translateLibrarySection(option.id, option.label)
  }))
);

const currentLibrarySectionLabel = computed(() => {
  const option = translatedLibrarySectionOptions.value.find((row) => row.id === librarySection.value);
  return option?.label || translateLibrarySection(librarySection.value, summary.value.librarySectionLabel);
});

const sectionDescription = computed(() => {
  switch (librarySection.value) {
    case "suggested":
      return shellI18nStore.t(
        "desktopShell.library.sectionDescriptionSuggested",
        "Suggested Games is reserved for the legacy LLM recommendation flow. The shell section name is restored now; the generator workspace is the next migration step."
      );
    case "recent":
      return shellI18nStore.t(
        "desktopShell.library.sectionDescriptionRecent",
        "Recently played games now resolve from shell state using each game's last-played timestamp."
      );
    case "emulators":
      return shellI18nStore.t(
        "desktopShell.library.sectionDescriptionEmulators",
        "The shell now has a real emulator workspace with type filters and launch/details flows, not just a preview strip."
      );
    case "all":
    default:
      return shellI18nStore.t(
        "desktopShell.library.sectionDescriptionAll",
        "This desktop-owned workspace now covers the core legacy library section model: all games, suggested games, recently played, and emulators."
      );
  }
});

const coverGridStyle = computed(() => ({
  "--desktop-cover-column-width": `${Math.round(138 + coverSize.value * 1.35)}px`
}));

const flattenedVisibleRows = computed(() => visibleSections.value.flatMap((section) => section.rows));
const immersiveRows = computed(() => flattenedVisibleRows.value);
const visibleGameIds = computed(() => flattenedVisibleRows.value.map((row) => row.id).filter((id) => Number.isFinite(Number(id)) && Number(id) > 0));
const allGameIds = computed(() => games.value.map((row) => row.id).filter((id) => Number.isFinite(Number(id)) && Number(id) > 0));
const selectedGame = computed(() => {
  const selected = flattenedVisibleRows.value.find((row) => row.key === selectedGameKey.value);
  return selected || flattenedVisibleRows.value[0] || null;
});

const selectedEmulator = computed(() => {
  const selected = filteredEmulators.value.find((row) => row.key === selectedEmulatorKey.value);
  return selected || filteredEmulators.value[0] || null;
});
const selectedGameTags = computed(() => (Array.isArray(selectedGame.value?.tags) ? selectedGame.value.tags.slice(0, 6) : []));
const selectedEmulatorPaths = computed(() =>
  Array.isArray(selectedEmulator.value?.filePaths) ? selectedEmulator.value.filePaths.slice(0, 4) : []
);
const workspaceLayoutClasses = computed(() => ({
  "has-docked-inspector": selectionPanelDocked.value
}));
const shouldShowDockedInspector = computed(() =>
  selectionPanelDocked.value && (showEmulatorsView.value ? !!selectedEmulator.value : !!selectedGame.value)
);

function readSelectionPanelDockedPreference() {
  if (typeof window === "undefined") {
    return true;
  }
  try {
    const raw = window.localStorage.getItem(SELECTION_PANEL_DOCKED_KEY);
    return raw !== "false";
  } catch (_error) {
    return true;
  }
}

function persistSelectionPanelDockedPreference(value) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(SELECTION_PANEL_DOCKED_KEY, value ? "true" : "false");
  } catch (_error) {}
}

function getDesktopBridge() {
  if (typeof window === "undefined" || !window.emubro) {
    return null;
  }
  return window.emubro;
}

function toggleSelectionPanelDocked() {
  selectionPanelDocked.value = !selectionPanelDocked.value;
  persistSelectionPanelDockedPreference(selectionPanelDocked.value);
}

function applyEmulatorPalette(event) {
  const image = event?.target;
  if (!(image instanceof HTMLImageElement)) {
    return;
  }
  const host = image.closest("[data-emulator-palette-host]");
  if (!host) {
    return;
  }
  applyPaletteFromImage(host, image);
}

function handleArtworkError(event, row, kind = "game") {
  const image = event?.target;
  if (!(image instanceof HTMLImageElement)) {
    return;
  }

  if (image.dataset.fallbackApplied === "1") {
    return;
  }

  const fallback = kind === "emulator" ? "/logo.png" : String(row?.platformLogo || "/logo.png").trim() || "/logo.png";
  image.dataset.fallbackApplied = "1";
  image.classList.add("is-artwork-fallback");
  image.src = fallback;
}

function selectGame(row) {
  if (!row) {
    return;
  }
  selectedGameKey.value = row.key;
}

function openGameDetails(row) {
  selectGame(row);
  isGameModalOpen.value = true;
}

function closeGameDetails() {
  isGameModalOpen.value = false;
}

async function launchGame(row) {
  if (!row) {
    return;
  }

  const bridge = getDesktopBridge();
  if (!bridge || typeof bridge.invoke !== "function") {
    launchStatus.value = shellI18nStore.t("desktopShell.library.desktopBridgeUnavailable", "Desktop bridge unavailable.");
    launchStatusTone.value = "error";
    return;
  }

  const result = await bridge.invoke("launch-game", { gameId: row.id });
  launchStatus.value = String(
    result?.message ||
      (result?.success
        ? shellI18nStore.t("messages.gameLaunched", "Game launched successfully!")
        : shellI18nStore.t("messages.launchFailed", "Launch failed."))
  );
  launchStatusTone.value = result?.success ? "success" : "error";

  if (result?.success) {
    void refreshLibraryMetadata();
  }
}

async function showGameInFolder(row) {
  if (!row?.filePath) {
    launchStatus.value = shellI18nStore.t("desktopShell.library.noGamePath", "No file path is stored for this game.");
    launchStatusTone.value = "error";
    return;
  }

  const bridge = getDesktopBridge();
  if (!bridge || typeof bridge.invoke !== "function") {
    launchStatus.value = shellI18nStore.t("desktopShell.library.desktopBridgeUnavailable", "Desktop bridge unavailable.");
    launchStatusTone.value = "error";
    return;
  }

  const result = await bridge.invoke("show-item-in-folder", row.filePath);
  launchStatus.value = String(
    result?.message ||
      (result?.success
        ? shellI18nStore.t("desktopShell.library.openedGameLocation", "Opened game location.")
        : shellI18nStore.t("desktopShell.library.couldNotOpenGameLocation", "Could not open game location."))
  );
  launchStatusTone.value = result?.success ? "success" : "error";
}

async function createShortcut(row) {
  if (!row) {
    return;
  }

  const bridge = getDesktopBridge();
  if (!bridge || typeof bridge.createGameShortcut !== "function") {
    launchStatus.value = shellI18nStore.t("desktopShell.library.shortcutBridgeUnavailable", "Desktop shortcut bridge unavailable.");
    launchStatusTone.value = "error";
    return;
  }

  const result = await bridge.createGameShortcut(row.id);
  launchStatus.value = String(
    result?.message ||
      (result?.success
        ? shellI18nStore.t("desktopShell.library.shortcutCreated", "Shortcut created.")
        : shellI18nStore.t("desktopShell.library.shortcutFailed", "Could not create shortcut."))
  );
  launchStatusTone.value = result?.success ? "success" : "error";
}

function selectEmulator(row) {
  if (!row) {
    return;
  }
  selectedEmulatorKey.value = row.key;
}

function openEmulatorDetails(row) {
  selectEmulator(row);
  isEmulatorModalOpen.value = true;
}

function closeEmulatorDetails() {
  isEmulatorModalOpen.value = false;
}

async function launchEmulator(row) {
  if (!row) {
    return;
  }

  const bridge = getDesktopBridge();
  if (!bridge || typeof bridge.invoke !== "function") {
    emulatorStatus.value = shellI18nStore.t("desktopShell.library.desktopBridgeUnavailable", "Desktop bridge unavailable.");
    emulatorStatusTone.value = "error";
    return;
  }

  const config = resolveEffectiveEmulatorConfig(row);
  const launchPath = loadSelectedLaunchPath(row, Array.isArray(row.filePaths) ? row.filePaths : [row.filePath]) || row.filePath;
  const directLaunchArgs = String(config.launchArgs || "").trim();
  const result = await bridge.invoke("launch-emulator", {
    filePath: launchPath,
    args: directLaunchArgs,
    workingDirectory: config.workingDirectory || row.workingDirectory,
    inputBindings: config.effectiveInputBindings,
    gamepadBindings: config.effectiveGamepadBindings?.gamepad || {},
    runCommandsBefore: config.runCommandsBefore,
    name: row.name
  });
  emulatorStatus.value = String(
    result?.message ||
      (result?.success
        ? shellI18nStore.t("desktopShell.library.emulatorLaunched", "Emulator launched.")
        : shellI18nStore.t("desktopShell.library.emulatorLaunchFailed", "Failed to launch emulator."))
  );
  emulatorStatusTone.value = result?.success ? "success" : "error";
}

async function showEmulatorInFolder(row) {
  const launchPath = loadSelectedLaunchPath(row, Array.isArray(row?.filePaths) ? row.filePaths : [row?.filePath]) || row?.filePath;
  if (!launchPath) {
    emulatorStatus.value = shellI18nStore.t("desktopShell.library.noEmulatorPath", "No emulator path is stored.");
    emulatorStatusTone.value = "error";
    return;
  }

  const bridge = getDesktopBridge();
  if (!bridge || typeof bridge.invoke !== "function") {
    emulatorStatus.value = shellI18nStore.t("desktopShell.library.desktopBridgeUnavailable", "Desktop bridge unavailable.");
    emulatorStatusTone.value = "error";
    return;
  }

  const result = await bridge.invoke("show-item-in-folder", launchPath);
  emulatorStatus.value = String(
    result?.message || (result?.success ? "Opened emulator location." : "Could not open emulator location.")
  );
  emulatorStatusTone.value = result?.success ? "success" : "error";
}

async function openEmulatorWebsite(row) {
  const config = resolveEffectiveEmulatorConfig(row);
  const target = String(config.website || row?.website || "").trim();
  if (!target) {
    emulatorStatus.value = shellI18nStore.t("desktopShell.library.noEmulatorWebsite", "No emulator website is configured.");
    emulatorStatusTone.value = "error";
    return;
  }

  const bridge = getDesktopBridge();
  if (!bridge || typeof bridge.invoke !== "function") {
    emulatorStatus.value = shellI18nStore.t("desktopShell.library.desktopBridgeUnavailable", "Desktop bridge unavailable.");
    emulatorStatusTone.value = "error";
    return;
  }

  const result = await bridge.invoke("open-external-url", target);
  emulatorStatus.value = String(
    result?.message ||
      (result?.success
        ? shellI18nStore.t("desktopShell.library.openedEmulatorWebsite", "Opened emulator website.")
        : shellI18nStore.t("desktopShell.library.couldNotOpenWebsite", "Could not open website."))
  );
  emulatorStatusTone.value = result?.success ? "success" : "error";
}

function setLibraryStartup() {
  appStore.setPreferredStartupSection("library-views");
}

function setLibrarySection(sectionId) {
  filtersStore.updateField("librarySection", sectionId);
}

function openLibraryPathSettings() {
  settingsToolsStore.openPanel("settings");
}

function openAiSettings() {
  settingsToolsStore.openPanel("ai");
}

function openUpdateCenter() {
  settingsToolsStore.openPanel("updates");
}

function openSupportCenter() {
  appStore.setActiveSection("support-center");
}

async function refreshLibraryMetadata() {
  await Promise.all([workspaceStore.refresh(), categoriesStore.refreshCatalog()]);
}

watch(
  () => flattenedVisibleRows.value.map((row) => row.key).join("|"),
  () => {
    if (!flattenedVisibleRows.value.some((row) => row.key === selectedGameKey.value)) {
      selectedGameKey.value = flattenedVisibleRows.value[0]?.key || "";
    }
  },
  { immediate: true }
);

watch(
  () => filteredEmulators.value.map((row) => row.key).join("|"),
  () => {
    if (!filteredEmulators.value.some((row) => row.key === selectedEmulatorKey.value)) {
      selectedEmulatorKey.value = filteredEmulators.value[0]?.key || "";
    }
  },
  { immediate: true }
);

onMounted(() => {
  void Promise.all([
    filtersStore.initialize(),
    workspaceStore.initialize(),
    categoriesStore.initialize(),
    settingsToolsStore.initialize()
  ]);
});
</script>

<template>
  <div class="stack">
    <section class="desktop-library-workspace-layout" :class="workspaceLayoutClasses">
      <aside class="desktop-library-sidebar">
        <section class="subcard desktop-library-sidebar-card">
          <div class="card-header-row">
            <div>
              <h4>{{ shellI18nStore.t("sidebar.library", "Library") }}</h4>
              <p class="meta-line">
                {{
                  shellI18nStore.t(
                    "desktopShell.library.sidebarDescription",
                    "The shell now mirrors the old library sidebar with section links, stats, and quick actions."
                  )
                }}
              </p>
            </div>
            <span class="pill">{{ currentLibrarySectionLabel }}</span>
          </div>

          <div class="desktop-sidebar-section">
            <div class="desktop-sidebar-group-title">{{ shellI18nStore.t("sidebar.library", "Library") }}</div>
            <div class="desktop-sidebar-link-list">
            <button
              v-for="option in translatedLibrarySectionOptions"
              :key="option.id"
              type="button"
              class="desktop-sidebar-link"
              :class="{ 'is-active': librarySection === option.id }"
              @click="setLibrarySection(option.id)"
            >
              <strong>{{ option.label }}</strong>
              <small>{{ sectionQuickStats[option.id] ?? 0 }}</small>
            </button>
          </div>
          </div>

          <div class="desktop-sidebar-section">
            <div class="desktop-sidebar-group-title">{{ shellI18nStore.t("desktopShell.library.quickActions", "Quick Actions") }}</div>
            <div class="button-row">
              <button type="button" class="action-button" @click="openLibraryPathSettings">
                {{ shellI18nStore.t("desktopShell.library.libraryPaths", "Library Paths") }}
              </button>
              <button type="button" class="action-button" @click="openAiSettings">
                {{ shellI18nStore.t("desktopShell.settingsTools.panels.ai.label", "AI / LLM") }}
              </button>
              <button type="button" class="action-button" @click="openUpdateCenter">
                {{ shellI18nStore.t("desktopShell.header.updates", "Updates") }}
              </button>
              <button type="button" class="action-button" @click="openSupportCenter">
                {{ shellI18nStore.t("desktopShell.groups.support.label", "Support") }}
              </button>
            </div>
          </div>
        </section>

        <LibraryCategoriesPanel v-if="!showEmulatorsView" @open-ai-settings="openAiSettings" />
        <LibraryBrowsePanel :visible-game-ids="visibleGameIds" :all-game-ids="allGameIds" />
      </aside>

      <section class="card desktop-library-main-card">
        <div class="card-header-row">
          <div>
            <h3>
              {{
                showEmulatorsView
                  ? shellI18nStore.t("desktopShell.library.migratedEmulatorWorkspace", "Migrated emulator workspace")
                  : shellI18nStore.t("desktopShell.library.migratedGameWorkspace", "Migrated game workspace")
              }}
            </h3>
            <p class="meta-line">
              {{
                selectionPanelDocked
                  ? shellI18nStore.t("desktopShell.library.dockedPanelDescription", "Selection is docked as a side panel, closer to the old info-panel flow.")
                  : shellI18nStore.t("desktopShell.library.inlinePanelDescription", "Selection is inline in the workspace. Dock it to bring back the old panel feel.")
              }}
            </p>
          </div>
          <div class="button-row">
            <button type="button" class="action-button" @click="toggleSelectionPanelDocked">
              {{
                selectionPanelDocked
                  ? shellI18nStore.t("desktopShell.library.undockPanel", "Undock Panel")
                  : shellI18nStore.t("desktopShell.library.dockPanel", "Dock Panel")
              }}
            </button>
            <button type="button" class="action-button" @click="refreshLibraryMetadata">
              {{ shellI18nStore.t("desktopShell.library.refreshData", "Refresh data") }}
            </button>
          </div>
        </div>
        <p class="meta-line" v-if="refreshError">
          {{ shellI18nStore.t("desktopShell.library.workspaceRefreshFailed", "Workspace refresh failed") }}: {{ refreshError }}
        </p>
        <p class="meta-line" v-else>
          {{
            loading
              ? shellI18nStore.t("desktopShell.library.refreshingWorkspaceData", "Refreshing workspace data...")
              : shellI18nStore.t("desktopShell.library.workspaceDataCurrent", "Workspace data is current.")
          }}
        </p>

        <template v-if="showEmulatorsView">
          <article
            v-if="selectedEmulator && !selectionPanelDocked"
            class="subcard desktop-library-selection-card desktop-library-selection-card-emulator"
          >
            <div class="desktop-library-selection-media desktop-library-selection-media-emulator">
              <LazyArtwork :src="selectedEmulator.icon" :alt="selectedEmulator.name" eager @error="handleArtworkError($event, selectedEmulator, 'emulator')" />
            </div>
            <div class="desktop-library-selection-content">
              <div class="card-header-row">
                <div>
                  <div class="eyebrow">{{ shellI18nStore.t("desktopShell.library.currentSelection", "Current Selection") }}</div>
                  <h4>{{ selectedEmulator.name }}</h4>
                  <p class="meta-line">
                    {{
                      selectedEmulator.installed
                        ? shellI18nStore.t(
                            "desktopShell.library.selectedEmulatorInstalled",
                            "This emulator is ready to launch from the migrated shell workspace."
                          )
                        : shellI18nStore.t(
                            "desktopShell.library.selectedEmulatorMissing",
                            "This emulator is not installed yet, but the shell-native download flow is available."
                          )
                    }}
                  </p>
                </div>
                <span class="pill">
                  {{
                    selectedEmulator.installed
                      ? shellI18nStore.t("gameCard.installed", "Installed")
                      : shellI18nStore.t("gameCard.notInstalled", "Not Installed")
                  }}
                </span>
              </div>

              <div class="pill-row">
                <span class="pill">{{ selectedEmulator.platform }}</span>
                <span class="pill">{{ selectedEmulator.type }}</span>
                <span class="pill">
                  {{
                    shellI18nStore.tf(
                      "desktopShell.library.launchPathCount",
                      { count: selectedEmulatorPaths.length },
                      `${selectedEmulatorPaths.length} launch paths`
                    )
                  }}
                </span>
              </div>

              <div class="button-row">
                <button
                  type="button"
                  class="action-button"
                  @click="selectedEmulator.installed ? launchEmulator(selectedEmulator) : openEmulatorDetails(selectedEmulator)"
                >
                  {{
                    selectedEmulator.installed
                      ? shellI18nStore.t("gameCard.launch", "Launch")
                      : shellI18nStore.t("desktopShell.library.download", "Download")
                  }}
                </button>
                <button type="button" class="action-button" @click="openEmulatorDetails(selectedEmulator)">
                  {{ shellI18nStore.t("desktopShell.library.details", "Details") }}
                </button>
                <button type="button" class="action-button" @click="showEmulatorInFolder(selectedEmulator)">
                  {{ shellI18nStore.t("desktopShell.library.folder", "Folder") }}
                </button>
                <button type="button" class="action-button" @click="openEmulatorWebsite(selectedEmulator)">
                  {{ shellI18nStore.t("desktopShell.library.website", "Website") }}
                </button>
              </div>

              <div class="desktop-library-selection-meta">
                <div class="desktop-library-selection-block">
                  <span class="metric-label">{{ shellI18nStore.t("desktopShell.library.selectedPath", "Selected path") }}</span>
                  <strong>{{ selectedEmulator.filePath || shellI18nStore.t("desktopShell.library.noEmulatorPath", "No emulator path is stored.") }}</strong>
                </div>
                <div v-if="selectedEmulatorPaths.length" class="desktop-library-selection-block">
                  <span class="metric-label">{{ shellI18nStore.t("desktopShell.library.availablePaths", "Available paths") }}</span>
                  <div class="desktop-library-selection-chip-row">
                    <span v-for="path in selectedEmulatorPaths" :key="path" class="pill">{{ path }}</span>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <div v-if="!visibleEmulatorCount" class="desktop-library-empty">
            {{ shellI18nStore.t("desktopShell.library.noEmulatorsMatch", "No emulators match the current migrated shell filters.") }}
          </div>

          <div v-else-if="viewMode === 'cover'" class="desktop-library-cover-grid desktop-emulator-cover-grid" :style="coverGridStyle">
            <article
              v-for="row in filteredEmulators"
              :key="row.key"
              class="desktop-library-card desktop-emulator-card"
              :class="{ 'is-selected': selectedEmulator?.key === row.key }"
              @click="selectEmulator(row)"
              @dblclick="row.installed ? launchEmulator(row) : openEmulatorDetails(row)"
              @focus="selectEmulator(row)"
              @keydown.enter.prevent="row.installed ? launchEmulator(row) : openEmulatorDetails(row)"
              tabindex="0"
              role="button"
              data-emulator-palette-host
            >
              <div class="desktop-library-card-image desktop-emulator-card-image desktop-emulator-card-hero">
                <span class="desktop-platform-badge desktop-platform-badge--emulator">
                  <LazyArtwork
                    :src="row.platformLogo"
                    :alt="row.platform"
                    @load="applyEmulatorPalette"
                    @error="handleArtworkError($event, row, 'emulator')"
                  />
                </span>
                <LazyArtwork class="desktop-emulator-card-icon" :src="row.icon" :alt="row.name" @error="handleArtworkError($event, row, 'emulator')" />
                <button
                  type="button"
                  class="desktop-library-hover-play desktop-library-hover-play--emulator"
                  @click.stop="row.installed ? launchEmulator(row) : openEmulatorDetails(row)"
                >
                  {{ row.installed ? shellI18nStore.t("gameCard.launch", "Launch") : shellI18nStore.t("desktopShell.library.download", "Download") }}
                </button>
              </div>
              <div class="desktop-library-card-body desktop-emulator-card-body">
                <h5>{{ row.name }}</h5>
                <p>{{ row.platform }}</p>
                <span class="desktop-emulator-status-pill" :class="{ 'is-installed': row.installed }">
                  {{ row.installed ? shellI18nStore.t("gameCard.installed", "Installed") : shellI18nStore.t("gameCard.notInstalled", "Not Installed") }}
                </span>
                <div class="desktop-library-card-meta">
                  <span>{{ row.type }}</span>
                  <span v-if="row.filePaths.length > 1">+{{ row.filePaths.length - 1 }}</span>
                </div>
                <p class="desktop-emulator-path-snippet">{{ row.filePath || shellI18nStore.t("desktopShell.library.noEmulatorPath", "No emulator path is stored.") }}</p>
              </div>
            </article>
          </div>

          <div v-else class="desktop-library-list">
            <article
              v-for="row in filteredEmulators"
              :key="row.key"
              class="desktop-library-list-row"
              :class="{ 'is-selected': selectedEmulator?.key === row.key }"
              @click="selectEmulator(row)"
              @dblclick="row.installed ? launchEmulator(row) : openEmulatorDetails(row)"
              @focus="selectEmulator(row)"
              @keydown.enter.prevent="row.installed ? launchEmulator(row) : openEmulatorDetails(row)"
              tabindex="0"
              role="button"
            >
              <LazyArtwork class="desktop-library-list-image desktop-emulator-list-image" :src="row.icon" :alt="row.name" @error="handleArtworkError($event, row, 'emulator')" />
              <div class="desktop-library-list-main">
                <div class="desktop-library-list-head">
                  <h5>{{ row.name }}</h5>
                  <span class="pill">{{ row.platform }}</span>
                </div>
                <p>{{ row.type }} | {{ row.installed ? shellI18nStore.t("gameCard.installed", "Installed") : shellI18nStore.t("gameCard.notInstalled", "Not Installed") }}</p>
                <div class="desktop-library-list-meta">
                  <span v-if="row.filePath">{{ row.filePath }}</span>
                </div>
              </div>
              <div class="desktop-library-list-actions">
                <button type="button" class="action-button" @click.stop="row.installed ? launchEmulator(row) : openEmulatorDetails(row)">
                  {{ row.installed ? shellI18nStore.t("gameCard.launch", "Launch") : shellI18nStore.t("desktopShell.library.download", "Download") }}
                </button>
                <button type="button" class="action-button" @click.stop="openEmulatorDetails(row)">
                  {{ shellI18nStore.t("desktopShell.library.details", "Details") }}
                </button>
                <button type="button" class="action-button" @click.stop="showEmulatorInFolder(row)">
                  {{ shellI18nStore.t("desktopShell.library.folder", "Folder") }}
                </button>
              </div>
            </article>
          </div>

          <p v-if="emulatorStatus" class="meta-line" :class="{ 'meta-line-error': emulatorStatusTone === 'error' }">
            {{ emulatorStatus }}
          </p>
        </template>

        <template v-else>
          <article v-if="selectedGame && !selectionPanelDocked" class="subcard desktop-library-selection-card">
            <div class="desktop-library-selection-media">
              <LazyArtwork :src="selectedGame.image" :alt="selectedGame.name" eager @error="handleArtworkError($event, selectedGame, 'game')" />
            </div>
            <div class="desktop-library-selection-content">
              <div class="card-header-row">
                <div>
                  <div class="eyebrow">{{ shellI18nStore.t("desktopShell.library.currentSelection", "Current Selection") }}</div>
                  <h4>{{ selectedGame.name }}</h4>
                  <p class="meta-line">
                    {{
                      selectedGame.description ||
                        shellI18nStore.t(
                          "desktopShell.library.selectedGameDescriptionFallback",
                          "The migrated shell now handles launch, details, shortcut creation, and metadata flows for the current game."
                        )
                    }}
                  </p>
                </div>
                <span class="pill">{{ selectedGame.platform }}</span>
              </div>

              <div class="pill-row">
                <span class="pill">{{ shellI18nStore.t("gameDetails.rating", "Rating") }} {{ selectedGame.rating }}</span>
                <span v-if="selectedGame.regionCode" class="pill">
                  {{ shellI18nStore.t("desktopShell.library.region", "Region") }} {{ selectedGame.regionCode.toUpperCase() }}
                </span>
                <span v-if="selectedGame.languageCodes.length" class="pill">
                  {{ shellI18nStore.t("desktopShell.library.languages", "Languages") }} {{ selectedGame.languageCodes.join(", ").toUpperCase() }}
                </span>
                <span v-if="selectedGame.groupCount > 1" class="pill">
                  {{ selectedGame.groupCount }} {{ shellI18nStore.t("desktopShell.library.files", "files") }}
                </span>
              </div>

              <div v-if="selectedGameTags.length" class="desktop-library-selection-chip-row">
                <span v-for="tag in selectedGameTags" :key="tag" class="pill">{{ tag }}</span>
              </div>

              <div class="button-row">
                <button type="button" class="action-button" @click="launchGame(selectedGame)">
                  {{ shellI18nStore.t("gameCard.launch", "Launch") }}
                </button>
                <button type="button" class="action-button" @click="openGameDetails(selectedGame)">
                  {{ shellI18nStore.t("desktopShell.library.details", "Details") }}
                </button>
                <button type="button" class="action-button" @click="showGameInFolder(selectedGame)">
                  {{ shellI18nStore.t("desktopShell.library.folder", "Folder") }}
                </button>
                <button type="button" class="action-button" @click="createShortcut(selectedGame)">
                  {{ shellI18nStore.t("desktopShell.library.shortcut", "Shortcut") }}
                </button>
              </div>

              <div class="desktop-library-selection-meta">
                <div class="desktop-library-selection-block">
                  <span class="metric-label">{{ shellI18nStore.t("desktopShell.library.publisher", "Publisher") }}</span>
                  <strong>{{ selectedGame.company }}</strong>
                </div>
                <div class="desktop-library-selection-block">
                  <span class="metric-label">{{ shellI18nStore.t("desktopShell.library.genre", "Genre") }}</span>
                  <strong>{{ selectedGame.genre }}</strong>
                </div>
                <div class="desktop-library-selection-block">
                  <span class="metric-label">{{ shellI18nStore.t("desktopShell.library.lastPlayed", "Last played") }}</span>
                  <strong>{{ selectedGame.lastPlayed || shellI18nStore.t("desktopShell.library.notPlayedYet", "Not played yet") }}</strong>
                </div>
                <div class="desktop-library-selection-block">
                  <span class="metric-label">{{ shellI18nStore.t("desktopShell.library.filePath", "File path") }}</span>
                  <strong>{{ selectedGame.filePath || shellI18nStore.t("desktopShell.library.noGamePath", "No file path is stored for this game.") }}</strong>
                </div>
              </div>
            </div>
          </article>

          <div v-if="librarySection === 'suggested' && !visibleGameCount" class="desktop-library-empty desktop-library-empty-suggested">
            <strong>{{ shellI18nStore.t("sidebar.suggested", "Suggested Games") }}</strong>
            <p>
              {{
                shellI18nStore.t(
                  "desktopShell.library.suggestedPlaceholder",
                  "The section name is restored, but the old suggestion generator and result surface still need to be migrated into the shell."
                )
              }}
            </p>
            <div class="button-row">
              <button type="button" class="action-button" @click="openAiSettings">
                {{ shellI18nStore.t("desktopShell.settingsTools.panels.ai.label", "AI / LLM") }}
              </button>
              <button type="button" class="action-button" @click="setLibrarySection('all')">
                {{ shellI18nStore.t("sidebar.allGames", "All Games") }}
              </button>
            </div>
          </div>

          <div v-else-if="!visibleGameCount" class="desktop-library-empty">
            {{ shellI18nStore.t("gameGrid.noGamesFound", "No games found.") }}
          </div>

          <LibraryImmersiveView
            v-else-if="viewMode === 'focus' || viewMode === 'slideshow' || viewMode === 'random'"
            :mode="viewMode"
            :rows="immersiveRows"
            :selected-key="selectedGameKey"
            @select="selectGame"
            @launch="launchGame"
            @details="openGameDetails"
            @show-folder="showGameInFolder"
            @create-shortcut="createShortcut"
          />

          <div v-for="section in visibleSections" v-else :key="section.id" class="desktop-library-section">
            <div class="desktop-library-section-header">
              <h4>{{ section.label }}</h4>
              <span class="pill">{{ section.rows.length }} {{ shellI18nStore.t("desktopShell.library.items", "items") }}</span>
            </div>

            <div v-if="viewMode === 'cover'" class="desktop-library-cover-grid" :style="coverGridStyle">
              <article
                v-for="row in section.rows"
                :key="row.key"
                class="desktop-library-card"
                :class="{ 'is-selected': selectedGame?.key === row.key }"
                @click="selectGame(row)"
                @dblclick="launchGame(row)"
                @focus="selectGame(row)"
                @keydown.enter.prevent="launchGame(row)"
                tabindex="0"
                role="button"
              >
                <div class="desktop-library-card-image">
                  <LazyArtwork :src="row.image" :alt="row.name" @error="handleArtworkError($event, row, 'game')" />
                  <span class="desktop-platform-badge">
                    <LazyArtwork :src="row.platformLogo" :alt="row.platform" />
                  </span>
                  <button type="button" class="desktop-library-hover-play" @click.stop="launchGame(row)">
                    {{ shellI18nStore.t("gameCard.launch", "Launch") }}
                  </button>
                </div>
                <div class="desktop-library-title-box">
                  <h5>{{ row.name }}</h5>
                  <span v-if="row.groupCount > 1" class="desktop-library-title-count">{{ row.groupCount }}x</span>
                </div>
                <div class="desktop-library-card-meta desktop-library-card-meta--compact">
                  <span>{{ row.platform }}</span>
                  <span>{{ shellI18nStore.t("gameDetails.rating", "Rating") }} {{ row.rating }}</span>
                </div>
              </article>
            </div>

            <div v-else class="desktop-library-list">
              <article
                v-for="row in section.rows"
                :key="row.key"
                class="desktop-library-list-row"
                :class="{ 'is-selected': selectedGame?.key === row.key }"
                @click="selectGame(row)"
                @dblclick="launchGame(row)"
                @focus="selectGame(row)"
                @keydown.enter.prevent="launchGame(row)"
                tabindex="0"
                role="button"
              >
                <LazyArtwork class="desktop-library-list-image" :src="row.image" :alt="row.name" @error="handleArtworkError($event, row, 'game')" />
                <div class="desktop-library-list-main">
                  <div class="desktop-library-list-head">
                    <h5>{{ row.name }}</h5>
                    <span class="pill">{{ row.platform }}</span>
                  </div>
                  <p>{{ row.company }} | {{ row.genre }}</p>
                  <div class="desktop-library-list-meta">
                    <span>{{ shellI18nStore.t("gameDetails.rating", "Rating") }} {{ row.rating }}</span>
                    <span v-if="row.regionCode">{{ shellI18nStore.t("desktopShell.library.region", "Region") }} {{ row.regionCode.toUpperCase() }}</span>
                    <span v-if="row.languageCodes.length">{{ shellI18nStore.t("desktopShell.library.languages", "Languages") }} {{ row.languageCodes.join(", ").toUpperCase() }}</span>
                    <span v-if="row.lastPlayed">{{ shellI18nStore.t("desktopShell.library.lastPlayed", "Last played") }} {{ row.lastPlayed }}</span>
                    <span v-if="row.groupCount > 1">{{ row.groupCount }} {{ shellI18nStore.t("desktopShell.library.files", "files") }}</span>
                  </div>
                </div>
                <div class="desktop-library-list-actions">
                  <button type="button" class="action-button" @click.stop="launchGame(row)">
                    {{ shellI18nStore.t("gameCard.launch", "Launch") }}
                  </button>
                  <button type="button" class="action-button" @click.stop="openGameDetails(row)">
                    {{ shellI18nStore.t("desktopShell.library.details", "Details") }}
                  </button>
                  <button type="button" class="action-button" @click.stop="showGameInFolder(row)">
                    {{ shellI18nStore.t("desktopShell.library.folder", "Folder") }}
                  </button>
                </div>
              </article>
            </div>
          </div>

          <p v-if="launchStatus" class="meta-line" :class="{ 'meta-line-error': launchStatusTone === 'error' }">
            {{ launchStatus }}
          </p>
        </template>
      </section>

      <aside v-if="shouldShowDockedInspector" class="desktop-library-inspector">
        <section class="subcard desktop-library-inspector-shell">
          <div class="card-header-row">
            <div>
              <div class="eyebrow">{{ shellI18nStore.t("desktopShell.library.panelEyebrow", "Docked Panel") }}</div>
              <h4>{{ shellI18nStore.t("desktopShell.library.selectionPanelTitle", "Selection Inspector") }}</h4>
            </div>
            <button type="button" class="action-button" @click="toggleSelectionPanelDocked">
              {{ shellI18nStore.t("desktopShell.library.undockPanel", "Undock Panel") }}
            </button>
          </div>
          <p class="meta-line">
            {{
              showEmulatorsView
                ? shellI18nStore.t("desktopShell.library.selectionPanelEmulatorDescription", "Pinned emulator details, launch paths, and actions stay visible while browsing.")
                : shellI18nStore.t("desktopShell.library.selectionPanelGameDescription", "Pinned game details, launch actions, and metadata stay visible while browsing.")
            }}
          </p>
        </section>

        <article
          v-if="showEmulatorsView && selectedEmulator"
          class="subcard desktop-library-selection-card desktop-library-selection-card--docked desktop-library-selection-card-emulator"
        >
          <div class="desktop-library-selection-media desktop-library-selection-media-emulator">
            <LazyArtwork :src="selectedEmulator.icon" :alt="selectedEmulator.name" eager @error="handleArtworkError($event, selectedEmulator, 'emulator')" />
          </div>
          <div class="desktop-library-selection-content">
            <div class="card-header-row">
              <div>
                <div class="eyebrow">{{ shellI18nStore.t("desktopShell.library.currentSelection", "Current Selection") }}</div>
                <h4>{{ selectedEmulator.name }}</h4>
                <p class="meta-line">
                  {{
                    selectedEmulator.installed
                      ? shellI18nStore.t(
                          "desktopShell.library.selectedEmulatorInstalled",
                          "This emulator is ready to launch from the migrated shell workspace."
                        )
                      : shellI18nStore.t(
                          "desktopShell.library.selectedEmulatorMissing",
                          "This emulator is not installed yet, but the shell-native download flow is available."
                        )
                  }}
                </p>
              </div>
              <span class="pill">
                {{
                  selectedEmulator.installed
                    ? shellI18nStore.t("gameCard.installed", "Installed")
                    : shellI18nStore.t("gameCard.notInstalled", "Not Installed")
                }}
              </span>
            </div>

            <div class="pill-row">
              <span class="pill">{{ selectedEmulator.platform }}</span>
              <span class="pill">{{ selectedEmulator.type }}</span>
            </div>

            <div class="button-row">
              <button
                type="button"
                class="action-button"
                @click="selectedEmulator.installed ? launchEmulator(selectedEmulator) : openEmulatorDetails(selectedEmulator)"
              >
                {{
                  selectedEmulator.installed
                    ? shellI18nStore.t("gameCard.launch", "Launch")
                    : shellI18nStore.t("desktopShell.library.download", "Download")
                }}
              </button>
              <button type="button" class="action-button" @click="openEmulatorDetails(selectedEmulator)">
                {{ shellI18nStore.t("desktopShell.library.details", "Details") }}
              </button>
              <button type="button" class="action-button" @click="showEmulatorInFolder(selectedEmulator)">
                {{ shellI18nStore.t("desktopShell.library.folder", "Folder") }}
              </button>
              <button type="button" class="action-button" @click="openEmulatorWebsite(selectedEmulator)">
                {{ shellI18nStore.t("desktopShell.library.website", "Website") }}
              </button>
            </div>

            <div class="desktop-library-selection-meta">
              <div class="desktop-library-selection-block">
                <span class="metric-label">{{ shellI18nStore.t("desktopShell.library.selectedPath", "Selected path") }}</span>
                <strong>{{ selectedEmulator.filePath || shellI18nStore.t("desktopShell.library.noEmulatorPath", "No emulator path is stored.") }}</strong>
              </div>
              <div v-if="selectedEmulatorPaths.length" class="desktop-library-selection-block">
                <span class="metric-label">{{ shellI18nStore.t("desktopShell.library.availablePaths", "Available paths") }}</span>
                <div class="desktop-library-selection-chip-row">
                  <span v-for="path in selectedEmulatorPaths" :key="path" class="pill">{{ path }}</span>
                </div>
              </div>
            </div>
          </div>
        </article>

        <article
          v-else-if="selectedGame"
          class="subcard desktop-library-selection-card desktop-library-selection-card--docked"
        >
          <div class="desktop-library-selection-media">
            <LazyArtwork :src="selectedGame.image" :alt="selectedGame.name" eager @error="handleArtworkError($event, selectedGame, 'game')" />
          </div>
          <div class="desktop-library-selection-content">
            <div class="card-header-row">
              <div>
                <div class="eyebrow">{{ shellI18nStore.t("desktopShell.library.currentSelection", "Current Selection") }}</div>
                <h4>{{ selectedGame.name }}</h4>
                <p class="meta-line">
                  {{
                    selectedGame.description ||
                      shellI18nStore.t(
                        "desktopShell.library.selectedGameDescriptionFallback",
                        "The migrated shell now handles launch, details, shortcut creation, and metadata flows for the current game."
                      )
                  }}
                </p>
              </div>
              <span class="pill">{{ selectedGame.platform }}</span>
            </div>

            <div class="pill-row">
              <span class="pill">{{ shellI18nStore.t("gameDetails.rating", "Rating") }} {{ selectedGame.rating }}</span>
              <span v-if="selectedGame.regionCode" class="pill">
                {{ shellI18nStore.t("desktopShell.library.region", "Region") }} {{ selectedGame.regionCode.toUpperCase() }}
              </span>
            </div>

            <div v-if="selectedGameTags.length" class="desktop-library-selection-chip-row">
              <span v-for="tag in selectedGameTags" :key="tag" class="pill">{{ tag }}</span>
            </div>

            <div class="button-row">
              <button type="button" class="action-button" @click="launchGame(selectedGame)">
                {{ shellI18nStore.t("gameCard.launch", "Launch") }}
              </button>
              <button type="button" class="action-button" @click="openGameDetails(selectedGame)">
                {{ shellI18nStore.t("desktopShell.library.details", "Details") }}
              </button>
              <button type="button" class="action-button" @click="showGameInFolder(selectedGame)">
                {{ shellI18nStore.t("desktopShell.library.folder", "Folder") }}
              </button>
              <button type="button" class="action-button" @click="createShortcut(selectedGame)">
                {{ shellI18nStore.t("desktopShell.library.shortcut", "Shortcut") }}
              </button>
            </div>

            <div class="desktop-library-selection-meta">
              <div class="desktop-library-selection-block">
                <span class="metric-label">{{ shellI18nStore.t("desktopShell.library.publisher", "Publisher") }}</span>
                <strong>{{ selectedGame.company }}</strong>
              </div>
              <div class="desktop-library-selection-block">
                <span class="metric-label">{{ shellI18nStore.t("desktopShell.library.genre", "Genre") }}</span>
                <strong>{{ selectedGame.genre }}</strong>
              </div>
              <div class="desktop-library-selection-block">
                <span class="metric-label">{{ shellI18nStore.t("desktopShell.library.lastPlayed", "Last played") }}</span>
                <strong>{{ selectedGame.lastPlayed || shellI18nStore.t("desktopShell.library.notPlayedYet", "Not played yet") }}</strong>
              </div>
              <div class="desktop-library-selection-block">
                <span class="metric-label">{{ shellI18nStore.t("desktopShell.library.filePath", "File path") }}</span>
                <strong>{{ selectedGame.filePath || shellI18nStore.t("desktopShell.library.noGamePath", "No file path is stored for this game.") }}</strong>
              </div>
            </div>
          </div>
        </article>
      </aside>
    </section>

    <GameDetailsModal
      v-if="isGameModalOpen && selectedGame"
      :game="selectedGame"
      :status="launchStatus"
      :status-tone="launchStatusTone"
      @close="closeGameDetails"
      @launch="launchGame(selectedGame)"
      @show-folder="showGameInFolder(selectedGame)"
      @create-shortcut="createShortcut(selectedGame)"
      @refresh-game="refreshLibraryMetadata"
      @open-ai-settings="openAiSettings"
    />

    <EmulatorDetailsModal
      v-if="isEmulatorModalOpen && selectedEmulator"
      :emulator="selectedEmulator"
      :status="emulatorStatus"
      :status-tone="emulatorStatusTone"
      @close="closeEmulatorDetails"
      @refresh-emulator="refreshLibraryMetadata"
    />
  </div>
</template>
