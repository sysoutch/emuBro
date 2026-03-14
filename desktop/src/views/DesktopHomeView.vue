<script setup>
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useAppStore } from "../stores/app";
import { useHomeHubStore } from "../stores/home-hub";
import { useShellI18nStore } from "../stores/shell-i18n";
import { useUpdateCenterStore } from "../stores/update-center";
import { useWorkspaceStore } from "../stores/workspace";

defineProps({
  legacyFrameError: {
    type: Boolean,
    default: false
  }
});

const appStore = useAppStore();
const homeHubStore = useHomeHubStore();
const shellI18nStore = useShellI18nStore();
const updateCenterStore = useUpdateCenterStore();
const workspaceStore = useWorkspaceStore();

const { preferredStartupSection, shellSections } = storeToRefs(appStore);
const { actionStatus, docs, docsLoading, docsQuery, error, libraryStats, loading, selectedDoc, selectedDocContent, userInfo } =
  storeToRefs(homeHubStore);
const { appState, resourcesState } = storeToRefs(updateCenterStore);
const { stats } = storeToRefs(workspaceStore);

const desktopSections = computed(() => shellSections.value.filter((section) => section.renderMode === "desktop"));
const preferredStartupLabel = computed(() =>
  shellI18nStore.t(
    preferredStartupSection.value?.titleKey,
    preferredStartupSection.value?.title || "Library and Game View Workspace"
  )
);
const selectedDocMeta = computed(() => ({
  title: String(
    selectedDoc.value?.title ||
      selectedDoc.value?.id ||
      shellI18nStore.t("desktopShell.home.selectSupportDoc", "Select a support doc")
  ),
  preview: String(selectedDoc.value?.preview || selectedDoc.value?.summary || ""),
  category: String(selectedDoc.value?.category || selectedDoc.value?.section || shellI18nStore.t("desktopShell.groups.support.label", "Support"))
}));
const shellOwnedRuntimeRows = computed(() => [
  shellI18nStore.t(
    "desktopShell.home.runtimeOwnedFilters",
    "Library browse, filters, categories, quick-search seeds, and cover download flows are now shell-native."
  ),
  shellI18nStore.t(
    "desktopShell.home.runtimeOwnedDetails",
    "Game and emulator detail workspaces now handle launch, metadata, shortcuts, download/install, and config flows directly."
  ),
  shellI18nStore.t(
    "desktopShell.home.runtimeOwnedSettings",
    "Settings, profile, languages, AI / LLM, tools, updates, support, community, and startup routing now bypass the legacy bootstrap."
  )
]);
const legacyFallbackRows = computed(() => [
  shellI18nStore.t(
    "desktopShell.home.runtimeLegacyCatchAll",
    "The full legacy home still acts as the catch-all fallback for any unmigrated renderer-only surfaces."
  ),
  shellI18nStore.t(
    "desktopShell.home.runtimeLegacySpecialized",
    "Low-frequency legacy popups and renderer-era interactions that are not exposed in the new shell still depend on renderer.js."
  ),
  shellI18nStore.t(
    "desktopShell.home.runtimeLegacyRisk",
    "Default desktop use no longer needs the legacy path first, but it remains the compatibility safety net while migration continues."
  )
]);

function openSection(sectionId) {
  appStore.setActiveSection(sectionId);
}

function useStartupSection(sectionId) {
  appStore.setPreferredStartupSection(sectionId);
}

function useDefaultShellStartup() {
  appStore.clearPreferredStartupSection();
}

function useLegacyStartup() {
  appStore.setPreferredStartupSection("legacy-home");
}

function searchDocs(event) {
  const value = event?.target?.value ?? docsQuery.value;
  void homeHubStore.refreshDocs(value);
}

onMounted(() => {
  void Promise.all([homeHubStore.initialize(), workspaceStore.initialize(), updateCenterStore.initialize()]);
});
</script>

<template>
  <div class="stack">
    <section class="card">
      <div class="card-header-row">
        <div>
          <div class="eyebrow">{{ shellI18nStore.t("desktopShell.home.heroEyebrow", "Desktop Shell Hub") }}</div>
          <h2>{{ shellI18nStore.t("desktopShell.home.heroTitle", "Overview and startup control") }}</h2>
        </div>
        <span class="pill">{{ preferredStartupLabel }}</span>
      </div>
      <p>{{ shellI18nStore.t("desktopShell.home.heroDescription", "This is now a real shell home instead of a migration note.") }}</p>
      <div class="metrics">
        <div class="metric">
          <span class="metric-label">{{ shellI18nStore.t("desktopShell.home.libraryMetricLabel", "Library") }}</span>
          <strong>{{ stats.games }} games</strong>
          <small>{{ stats.emulators }} emulators | {{ stats.languages }} locales</small>
        </div>
        <div class="metric">
          <span class="metric-label">{{ shellI18nStore.t("desktopShell.home.supportDocsMetricLabel", "Support Docs") }}</span>
          <strong>{{ docs.length }}</strong>
          <small>
            {{
              docsLoading
                ? shellI18nStore.t("desktopShell.home.docsLoading", "Loading support docs...")
                : shellI18nStore.t("desktopShell.home.docsReady", "Shell-native docs browser ready")
            }}
          </small>
        </div>
        <div class="metric">
          <span class="metric-label">{{ shellI18nStore.t("desktopShell.home.updatesMetricLabel", "Updates") }}</span>
          <strong>
            {{
              appState.available
                ? shellI18nStore.t("desktopShell.states.appUpdateReady", "App update ready")
                : shellI18nStore.t("desktopShell.states.appCurrent", "App current")
            }}
          </strong>
          <small>
            {{
              resourcesState.missingLocalResources
                ? shellI18nStore.t("desktopShell.states.resourcesMissing", "Resources missing locally")
                : resourcesState.lastMessage || shellI18nStore.t("desktopShell.states.resourcesReady", "Resources ready")
            }}
          </small>
        </div>
      </div>
      <p v-if="legacyFrameError" class="legacy-fallback-note">
        {{ shellI18nStore.t("desktopShell.home.legacyFallbackNote", "Legacy UI bootstrap failed previously, so the shell remained active as the fallback runtime.") }}
      </p>
    </section>

    <section class="card">
      <div class="card-header-row">
        <h3>{{ shellI18nStore.t("desktopShell.home.quickNavigation", "Quick navigation") }}</h3>
        <div class="button-row">
          <button type="button" class="action-button" @click="workspaceStore.refresh">
            {{ shellI18nStore.t("desktopShell.actions.refreshWorkspace", "Refresh Workspace") }}
          </button>
          <button type="button" class="action-button" @click="homeHubStore.refreshOverview">
            {{ shellI18nStore.t("desktopShell.actions.refreshHomeData", "Refresh Home Data") }}
          </button>
        </div>
      </div>
      <div class="desktop-section-grid">
        <article v-for="section in desktopSections" :key="section.id" class="desktop-section-card">
          <div>
            <div class="eyebrow">{{ shellI18nStore.t(section.labelKey, section.label) }}</div>
            <h4>{{ shellI18nStore.t(section.titleKey, section.title) }}</h4>
            <p>{{ shellI18nStore.t(section.subtitleKey, section.subtitle) }}</p>
          </div>
          <div class="button-row">
            <button type="button" class="action-button" @click="openSection(section.id)">
              {{ shellI18nStore.t("desktopShell.actions.openSection", "Open Section") }}
            </button>
            <button type="button" class="action-button" @click="useStartupSection(section.id)">
              {{ shellI18nStore.t("desktopShell.actions.useAsStartup", "Use As Startup") }}
            </button>
          </div>
        </article>
      </div>
      <div class="button-row">
        <button type="button" class="action-button" @click="useDefaultShellStartup">
          {{ shellI18nStore.t("desktopShell.actions.useDefaultShellStartup", "Use Default Shell Startup") }}
        </button>
        <button type="button" class="action-button" @click="useLegacyStartup">
          {{ shellI18nStore.t("desktopShell.actions.useLegacyUiAsStartup", "Use Legacy UI As Startup") }}
        </button>
        <span class="pill">{{ shellI18nStore.t("desktopShell.home.currentDefault", "Current default") }}: {{ preferredStartupLabel }}</span>
      </div>
    </section>

    <section class="grid-two">
      <article class="card">
        <div class="card-header-row">
          <h3>{{ shellI18nStore.t("desktopShell.home.workspaceAndProfile", "Workspace and profile") }}</h3>
          <span class="pill">{{ loading ? shellI18nStore.t("desktopShell.states.loading", "Loading...") : userInfo.displayName }}</span>
        </div>
        <div class="metrics metrics-compact">
          <div class="metric">
            <span class="metric-label">{{ shellI18nStore.t("desktopShell.home.userMetricLabel", "User") }}</span>
            <strong>{{ userInfo.displayName }}</strong>
            <small>{{ userInfo.username }} | {{ userInfo.id }}</small>
          </div>
          <div class="metric">
            <span class="metric-label">{{ shellI18nStore.t("desktopShell.home.gamesMetricLabel", "Games") }}</span>
            <strong>{{ libraryStats.totalGames }}</strong>
            <small>{{ shellI18nStore.t("desktopShell.home.totalGamesDescription", "Total games in the persisted library state.") }}</small>
          </div>
          <div class="metric">
            <span class="metric-label">{{ shellI18nStore.t("desktopShell.home.playTimeMetricLabel", "Play Time") }}</span>
            <strong>{{ libraryStats.totalPlayTime }}</strong>
            <small>{{ shellI18nStore.t("desktopShell.home.playTimeDescription", "Current shell-exposed play time snapshot.") }}</small>
          </div>
        </div>
      </article>

      <article class="card">
        <div class="card-header-row">
          <h3>{{ shellI18nStore.t("desktopShell.home.community", "Community") }}</h3>
          <span class="pill">Shell-native</span>
        </div>
        <p>{{ shellI18nStore.t("desktopShell.home.communityDescription", "Community links no longer need the legacy view first.") }}</p>
        <div class="button-row">
          <button
            type="button"
            class="action-button"
            @click="homeHubStore.openCommunityWindow('https://github.com/sysoutch/emuBro', 'emuBro GitHub')"
          >
            {{ shellI18nStore.t("desktopShell.home.githubInApp", "GitHub In-App") }}
          </button>
          <button
            type="button"
            class="action-button"
            @click="homeHubStore.openCommunityWindow('https://discord.com/invite/EtKvZ2F', 'emuBro Community')"
          >
            {{ shellI18nStore.t("desktopShell.home.discordInApp", "Discord In-App") }}
          </button>
          <button
            type="button"
            class="action-button"
            @click="homeHubStore.openExternal('https://github.com/sysoutch/emuBro/releases')"
          >
            {{ shellI18nStore.t("desktopShell.home.releases", "Releases") }}
          </button>
        </div>
        <p v-if="actionStatus" class="meta-line">{{ actionStatus }}</p>
        <p v-if="error" class="legacy-fallback-note">{{ error }}</p>
      </article>
    </section>

    <section class="grid-two">
      <article class="card">
        <div class="card-header-row">
          <h3>{{ shellI18nStore.t("desktopShell.home.runtimeOwnedTitle", "Shell-owned by default") }}</h3>
          <span class="pill">{{ shellI18nStore.t("desktopShell.states.default", "Default") }}</span>
        </div>
        <div class="desktop-checklist">
          <article v-for="row in shellOwnedRuntimeRows" :key="row" class="desktop-checklist-item">
            <strong>{{ shellI18nStore.t("desktopShell.home.runtimeReady", "Ready") }}</strong>
            <p>{{ row }}</p>
          </article>
        </div>
      </article>

      <article class="card">
        <div class="card-header-row">
          <h3>{{ shellI18nStore.t("desktopShell.home.runtimeLegacyTitle", "Legacy still retained for") }}</h3>
          <span class="pill">{{ shellI18nStore.t("desktopShell.home.runtimeFallback", "Fallback") }}</span>
        </div>
        <div class="desktop-checklist">
          <article v-for="row in legacyFallbackRows" :key="row" class="desktop-checklist-item is-warning">
            <strong>{{ shellI18nStore.t("desktopShell.home.runtimeFallbackLabel", "Fallback") }}</strong>
            <p>{{ row }}</p>
          </article>
        </div>
      </article>
    </section>

    <section class="card">
      <div class="card-header-row">
        <h3>{{ shellI18nStore.t("desktopShell.home.supportDocs", "Support docs") }}</h3>
        <span class="pill">{{ docs.length }} results</span>
      </div>
      <div class="desktop-docs-layout">
        <aside class="desktop-docs-sidebar">
          <label class="field">
            <span>{{ shellI18nStore.t("desktopShell.home.searchDocs", "Search docs") }}</span>
            <input
              :value="docsQuery"
              type="text"
              :placeholder="shellI18nStore.t('desktopShell.home.searchDocsPlaceholder', 'Search support docs...')"
              @input="searchDocs"
            />
          </label>
          <div class="desktop-docs-list">
            <button
              v-for="doc in docs"
              :key="doc.id"
              type="button"
              class="desktop-docs-list-item"
              :class="{ 'is-active': selectedDoc?.id === doc.id }"
              @click="homeHubStore.selectDoc(doc.id)"
            >
              <strong>{{ doc.title || doc.id }}</strong>
              <small>{{ doc.preview || doc.summary || shellI18nStore.t("desktopShell.home.noDocPreview", "No preview available.") }}</small>
            </button>
            <div v-if="!docs.length" class="desktop-docs-empty">
              {{ shellI18nStore.t("desktopShell.home.noDocsMatched", "No docs matched the current query.") }}
            </div>
          </div>
        </aside>
        <article class="desktop-docs-viewer">
          <div class="card-header-row">
            <div>
              <h4>{{ selectedDocMeta.title }}</h4>
              <p class="meta-line">{{ selectedDocMeta.category }}</p>
            </div>
            <button type="button" class="action-button" :disabled="docsLoading" @click="homeHubStore.refreshDocs">
              {{
                docsLoading
                  ? shellI18nStore.t("desktopShell.states.loading", "Loading...")
                  : shellI18nStore.t("desktopShell.actions.reloadDocs", "Reload Docs")
              }}
            </button>
          </div>
          <p v-if="selectedDocMeta.preview" class="meta-line">{{ selectedDocMeta.preview }}</p>
          <pre class="desktop-docs-content">
{{ selectedDocContent || shellI18nStore.t("desktopShell.home.selectSupportDoc", "Select a support document to inspect it here.") }}
          </pre>
        </article>
      </div>
    </section>
  </div>
</template>
