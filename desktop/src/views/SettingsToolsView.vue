<script setup>
import { computed, defineAsyncComponent, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useShellI18nStore } from "../stores/shell-i18n";
import { useSettingsToolsStore } from "../stores/settings-tools";
import { useWorkspaceStore } from "../stores/workspace";

const GamepadProfilesPanel = defineAsyncComponent(() => import("../components/GamepadProfilesPanel.vue"));
const LibrarySettingsPanel = defineAsyncComponent(() => import("../components/LibrarySettingsPanel.vue"));
const LibraryPathsPanel = defineAsyncComponent(() => import("../components/LibraryPathsPanel.vue"));
const LlmSettingsPanel = defineAsyncComponent(() => import("../components/LlmSettingsPanel.vue"));
const LocaleManagerPanel = defineAsyncComponent(() => import("../components/LocaleManagerPanel.vue"));
const ProfilePanel = defineAsyncComponent(() => import("../components/ProfilePanel.vue"));
const ToolsWorkspacePanel = defineAsyncComponent(() => import("../components/ToolsWorkspacePanel.vue"));
const UpdateCenterPanel = defineAsyncComponent(() => import("../components/UpdateCenterPanel.vue"));

const workspaceStore = useWorkspaceStore();
const shellI18nStore = useShellI18nStore();
const settingsToolsStore = useSettingsToolsStore();
const {
  loading,
  refreshError,
  stats,
  totalLibraryFolders
} = storeToRefs(workspaceStore);
const { activePanel, panelOptions } = storeToRefs(settingsToolsStore);

const translatedPanelOptions = computed(() =>
  panelOptions.value.map((panel) => ({
    ...panel,
    label: shellI18nStore.t(panel.labelKey, panel.label),
    title: shellI18nStore.t(panel.titleKey, panel.title),
    eyebrow: shellI18nStore.t(panel.eyebrowKey, panel.eyebrow),
    description: shellI18nStore.t(panel.descriptionKey, panel.description)
  }))
);

const activePanelMeta = computed(() => {
  const current =
    translatedPanelOptions.value.find((panel) => panel.id === activePanel.value) || translatedPanelOptions.value[0] || null;
  if (!current) {
    return null;
  }
  return current;
});

onMounted(() => {
  void Promise.all([workspaceStore.initialize(), settingsToolsStore.initialize()]);
});
</script>

<template>
  <ToolsWorkspacePanel v-if="activePanel === 'tools'" />

  <div v-else class="desktop-settings-layout">
    <aside class="desktop-settings-sidebar">
      <section class="subcard desktop-settings-nav-card">
        <div class="card-header-row">
          <div>
            <div class="eyebrow">{{ shellI18nStore.t("desktopShell.settingsTools.heroEyebrow", "Settings + Tools") }}</div>
            <h4>{{ shellI18nStore.t("desktopShell.settingsTools.heroTitle", "Desktop workspace") }}</h4>
          </div>
          <span class="pill">{{ activePanelMeta?.label || shellI18nStore.t("desktopShell.settingsTools.panels.settings.label", "Settings") }}</span>
        </div>
        <p class="meta-line">
          {{
            shellI18nStore.t(
              "desktopShell.settingsTools.sidebarDescription",
              "The shell now owns this area directly instead of routing everything back through the legacy settings modal."
            )
          }}
        </p>

        <div class="desktop-settings-nav-list">
          <button
            v-for="panel in translatedPanelOptions"
            :key="panel.id"
            type="button"
            class="desktop-settings-nav-button"
            :class="{ 'is-active': activePanel === panel.id }"
            @click="settingsToolsStore.setActivePanel(panel.id)"
          >
            <strong>{{ panel.label }}</strong>
            <small>{{ panel.description }}</small>
          </button>
        </div>

        <div class="button-row">
          <button type="button" class="action-button" @click="workspaceStore.refresh">
            {{ shellI18nStore.t("desktopShell.actions.refreshWorkspace", "Refresh Workspace") }}
          </button>
        </div>
      </section>

      <section class="subcard desktop-settings-nav-card">
        <div class="card-header-row">
          <h4>{{ shellI18nStore.t("desktopShell.settingsTools.workspaceStatus", "Workspace status") }}</h4>
          <span class="pill">{{ loading ? shellI18nStore.t("desktopShell.states.syncing", "Syncing") : shellI18nStore.t("desktopShell.states.ready", "Ready") }}</span>
        </div>
        <div class="desktop-sidebar-stat-list">
          <div class="desktop-sidebar-stat">
            <strong>{{ totalLibraryFolders }}</strong>
            <span>{{ shellI18nStore.t("desktopShell.settingsTools.libraryFolders", "Library folders") }}</span>
          </div>
          <div class="desktop-sidebar-stat">
            <strong>{{ stats.games }}</strong>
            <span>{{ shellI18nStore.t("desktopShell.settingsTools.games", "Games") }}</span>
          </div>
          <div class="desktop-sidebar-stat">
            <strong>{{ stats.emulators }}</strong>
            <span>{{ shellI18nStore.t("desktopShell.settingsTools.emulators", "Emulators") }}</span>
          </div>
          <div class="desktop-sidebar-stat">
            <strong>{{ stats.languages }}</strong>
            <span>{{ shellI18nStore.t("desktopShell.settingsTools.locales", "Locales") }}</span>
          </div>
        </div>
        <p v-if="refreshError" class="legacy-fallback-note">
          {{ shellI18nStore.tf("desktopShell.settingsTools.dataRefreshFailed", { message: refreshError }, `Data refresh failed: ${refreshError}`) }}
        </p>
      </section>
    </aside>

    <section class="desktop-settings-panel-stack">
      <section class="card desktop-settings-overview-card">
        <div class="card-header-row">
          <div>
            <div class="eyebrow">{{ activePanelMeta?.eyebrow || shellI18nStore.t("desktopShell.settingsTools.overviewEyebrow", "Desktop Section") }}</div>
            <h2>{{ activePanelMeta?.title || shellI18nStore.t("desktopShell.settingsTools.heroTitle", "Desktop workspace") }}</h2>
          </div>
          <span class="pill">{{ activePanelMeta?.label || shellI18nStore.t("desktopShell.settingsTools.panels.settings.label", "Settings") }}</span>
        </div>
        <p>{{ activePanelMeta?.description }}</p>
      </section>

      <section v-if="activePanel === 'settings'" class="card">
        <div class="card-header-row">
          <h3>{{ shellI18nStore.t("desktopShell.settingsTools.librarySettingsWorkspace", "Library settings workspace") }}</h3>
          <span class="pill">{{ shellI18nStore.tf("desktopShell.settingsTools.folders", { count: totalLibraryFolders }, `${totalLibraryFolders} folders`) }}</span>
        </div>
        <div class="metrics">
          <div class="metric">
            <span class="metric-label">{{ shellI18nStore.t("desktopShell.settingsTools.libraryFolders", "Library folders") }}</span>
            <strong>{{ totalLibraryFolders }}</strong>
            <small>{{ shellI18nStore.t("desktopShell.settingsTools.libraryFolderDescription", "Managed by the shell settings workspace below.") }}</small>
          </div>
          <div class="metric">
            <span class="metric-label">{{ shellI18nStore.t("desktopShell.settingsTools.games", "Games") }}</span>
            <strong>{{ stats.games }}</strong>
            <small>{{ shellI18nStore.t("desktopShell.settingsTools.gameCountDescription", "Currently loaded into the workspace store.") }}</small>
          </div>
          <div class="metric">
            <span class="metric-label">{{ shellI18nStore.t("desktopShell.settingsTools.emulators", "Emulators") }}</span>
            <strong>{{ stats.emulators }}</strong>
            <small>{{ shellI18nStore.t("desktopShell.settingsTools.gameCountDescription", "Currently loaded into the workspace store.") }}</small>
          </div>
        </div>
        <LibrarySettingsPanel />
        <LibraryPathsPanel />
        <p class="meta-line">
          {{
            loading
              ? shellI18nStore.t("desktopShell.settingsTools.workspaceDataRefreshing", "Refreshing shell workspace data...")
              : shellI18nStore.t("desktopShell.settingsTools.workspaceDataCurrent", "Shell workspace data is current.")
          }}
        </p>
      </section>

      <section v-else-if="activePanel === 'profile'" class="card">
        <div class="card-header-row">
          <h3>{{ shellI18nStore.t("desktopShell.settingsTools.profileWorkspace", "Profile workspace") }}</h3>
          <span class="pill">{{ shellI18nStore.t("desktopShell.settingsTools.shellOwned", "Shell-owned") }}</span>
        </div>
        <p class="meta-line">
          {{ shellI18nStore.t("desktopShell.settingsTools.profileDescription", "The old profile rail target now maps to a direct shell panel instead of forcing the legacy modal flow.") }}
        </p>
        <ProfilePanel />
      </section>

      <section v-else-if="activePanel === 'languages'" class="card">
        <div class="card-header-row">
          <h3>{{ shellI18nStore.t("desktopShell.settingsTools.installedLanguageCatalog", "Installed language catalog") }}</h3>
          <span class="pill">{{ stats.languages }} locales</span>
        </div>
        <p class="meta-line">
          {{ shellI18nStore.t("desktopShell.settingsTools.languagesDescription", "The shell language manager now uses the native locale CRUD bridge instead of a static catalog summary.") }}
        </p>
        <LocaleManagerPanel />
      </section>

      <section v-else-if="activePanel === 'gamepad'" class="card">
        <div class="card-header-row">
          <h3>{{ shellI18nStore.t("desktopShell.settingsTools.platformGamepadDefaults", "Platform gamepad defaults") }}</h3>
          <span class="pill">{{ shellI18nStore.t("desktopShell.settingsTools.shellOwned", "Shell-owned") }}</span>
        </div>
        <p class="meta-line">
          {{ shellI18nStore.t("desktopShell.settingsTools.gamepadDescription", "Shared platform controller profiles now live in the shell instead of only inside the legacy settings modal.") }}
        </p>
        <GamepadProfilesPanel />
      </section>

      <section v-else-if="activePanel === 'ai'" class="card">
        <div class="card-header-row">
          <h3>{{ shellI18nStore.t("desktopShell.settingsTools.aiConfiguration", "AI / LLM configuration") }}</h3>
          <span class="pill">{{ shellI18nStore.t("desktopShell.settingsTools.shellOwned", "Shell-owned") }}</span>
        </div>
        <p class="meta-line">
          {{ shellI18nStore.t("desktopShell.settingsTools.aiDescription", "Provider, relay, and prompt settings now live in the desktop shell instead of only inside the legacy settings modal.") }}
        </p>
        <LlmSettingsPanel />
      </section>

      <section v-else-if="activePanel === 'updates'" class="card">
        <div class="card-header-row">
          <h3>{{ shellI18nStore.t("desktopShell.settingsTools.appAndResourceUpdates", "App and resource updates") }}</h3>
          <span class="pill">{{ shellI18nStore.t("desktopShell.settingsTools.desktopManaged", "Desktop-managed") }}</span>
        </div>
        <p>
          {{ shellI18nStore.t("desktopShell.settingsTools.updatesDescription", "The shell now exposes the native updater state directly, so app and resource update debugging no longer has to stay inside the legacy settings modal.") }}
        </p>
        <UpdateCenterPanel />
      </section>
    </section>
  </div>
</template>
