<script setup>
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useShellI18nStore } from "../stores/shell-i18n";
import { useUpdateCenterStore } from "../stores/update-center";

const shellI18nStore = useShellI18nStore();
const updateCenterStore = useUpdateCenterStore();
const {
  actionStatus,
  appState,
  busyAction,
  error,
  loading,
  resourcesConfig,
  resourcesState,
  resourcesStoragePathDraft
} = storeToRefs(updateCenterStore);

const appStage = computed(() => {
  if (appState.value.lastError || error.value) return "error";
  if (busyAction.value === "app-install" || appState.value.installing) return "installing";
  if (busyAction.value === "app-download" || appState.value.downloading) return "downloading";
  if (busyAction.value === "app-check" || appState.value.checking) return "checking";
  if (appState.value.downloaded) return "ready";
  if (appState.value.available) return "available";
  return "idle";
});

const resourcesStage = computed(() => {
  if (resourcesState.value.lastError) return "error";
  if (busyAction.value === "resources-install" || resourcesState.value.installing) return "installing";
  if (busyAction.value === "resources-check" || resourcesState.value.checking) return "checking";
  if (resourcesState.value.available || resourcesState.value.missingLocalResources) return "available";
  return "idle";
});

const appStageLabel = computed(() => {
  switch (appStage.value) {
    case "error":
      return shellI18nStore.t("desktopShell.states.error", "Error");
    case "installing":
      return shellI18nStore.t("desktopShell.updates.installing", "Installing...");
    case "downloading":
      return shellI18nStore.t("desktopShell.updates.downloading", "Downloading...");
    case "checking":
      return shellI18nStore.t("desktopShell.states.checking", "Checking...");
    case "ready":
      return shellI18nStore.t("desktopShell.updates.readyToInstall", "Ready to install");
    case "available":
      return shellI18nStore.t("desktopShell.updates.newVersionAvailable", "New version available");
    default:
      return shellI18nStore.t("desktopShell.states.ready", "Ready");
  }
});

const resourcesStageLabel = computed(() => {
  switch (resourcesStage.value) {
    case "error":
      return shellI18nStore.t("desktopShell.states.error", "Error");
    case "installing":
      return shellI18nStore.t("desktopShell.updates.installing", "Installing...");
    case "checking":
      return shellI18nStore.t("desktopShell.states.checking", "Checking...");
    case "available":
      return shellI18nStore.t("desktopShell.updates.resourceAvailable", "Update or redownload available");
    default:
      return shellI18nStore.t("desktopShell.states.ready", "Ready");
  }
});

const appInstallHint = computed(() => {
  if (appStage.value === "ready") {
    return shellI18nStore.t(
      "desktopShell.updates.installHint",
      "The installer is already downloaded. Click install to launch it. On Windows, the installer can open behind emuBro or trigger a separate system prompt."
    );
  }
  if (appStage.value === "installing") {
    return shellI18nStore.t(
      "desktopShell.updates.installingHint",
      "emuBro has handed off to the system installer. Finish the external installer window, then relaunch the app."
    );
  }
  return "";
});

const statusTone = computed(() => {
  if (error.value || appState.value.lastError || resourcesState.value.lastError) return "error";
  if (actionStatus.value) return "success";
  return "neutral";
});

async function openReleasePage() {
  const bridge = typeof window !== "undefined" ? window.emubro : null;
  const target = String(appState.value.releaseUrl || "").trim();
  if (!bridge?.invoke || !target) {
    return;
  }
  await bridge.invoke("open-external-url", target);
}

onMounted(() => {
  void updateCenterStore.initialize();
});
</script>

<template>
  <div class="desktop-settings-stack">
    <section class="subcard">
      <div class="card-header-row">
        <h4>{{ shellI18nStore.t("desktopShell.updates.appUpdates", "App updates") }}</h4>
        <span class="pill">{{ appState.currentVersion || shellI18nStore.t("desktopShell.updates.unknownVersion", "unknown version") }}</span>
      </div>
      <div class="desktop-update-state-strip" :class="`is-${appStage}`">
        <strong>{{ appStageLabel }}</strong>
        <span>{{ appState.lastMessage || shellI18nStore.t("desktopShell.updates.noAppActionYet", "No app update action yet.") }}</span>
      </div>
      <div class="metrics metrics-compact">
        <div class="metric">
          <span class="metric-label">{{ shellI18nStore.t("desktopShell.states.current", "Current") }}</span>
          <strong>{{ appState.currentVersion || shellI18nStore.t("tools.unknown", "Unknown") }}</strong>
          <small>{{ appState.available ? shellI18nStore.t("desktopShell.updates.newVersionAvailable", "New version available") : shellI18nStore.t("desktopShell.updates.noNewVersion", "No new version detected") }}</small>
        </div>
        <div class="metric">
          <span class="metric-label">{{ shellI18nStore.t("desktopShell.updates.latest", "Latest") }}</span>
          <strong>{{ appState.latestVersion || shellI18nStore.t("desktopShell.updates.notChecked", "Not checked") }}</strong>
          <small>{{ appState.downloaded ? shellI18nStore.t("desktopShell.updates.installerDownloaded", "Installer downloaded locally") : shellI18nStore.t("desktopShell.updates.noInstallerDownloaded", "No installer downloaded yet") }}</small>
        </div>
        <div class="metric">
          <span class="metric-label">{{ shellI18nStore.t("desktopShell.updates.download", "Download") }}</span>
          <strong>{{ Number(appState.progressPercent || 0) }}%</strong>
          <small>{{ appState.lastMessage || shellI18nStore.t("desktopShell.states.ready", "Ready") }}</small>
        </div>
      </div>
      <div class="desktop-update-progress" :class="`is-${appStage}`">
        <div class="desktop-update-progress-bar" :style="{ width: `${Number(appState.progressPercent || 0)}%` }"></div>
      </div>
      <div class="button-row">
        <button type="button" class="action-button" :disabled="loading" @click="updateCenterStore.checkApp">
          {{ shellI18nStore.t("desktopShell.updates.checkAppUpdate", "Check App Update") }}
        </button>
        <button
          type="button"
          class="action-button"
          :disabled="busyAction === 'app-download' || !appState.available || !appState.downloadUrl"
          @click="updateCenterStore.downloadApp"
        >
          {{ busyAction === "app-download" ? shellI18nStore.t("desktopShell.updates.downloading", "Downloading...") : shellI18nStore.t("desktopShell.updates.downloadUpdate", "Download Update") }}
        </button>
        <button
          type="button"
          class="action-button"
          :disabled="busyAction === 'app-install' || appState.downloading || (!appState.downloaded && !appState.available)"
          @click="updateCenterStore.installApp"
        >
          {{ busyAction === "app-install" ? shellI18nStore.t("desktopShell.updates.installing", "Installing...") : shellI18nStore.t("desktopShell.updates.installDownloadedUpdate", "Install Downloaded Update") }}
        </button>
        <button type="button" class="action-button" :disabled="!appState.releaseUrl" @click="openReleasePage">
          {{ shellI18nStore.t("desktopShell.updates.openReleasePage", "Open Release Page") }}
        </button>
      </div>
      <p class="meta-line">{{ appState.lastMessage || shellI18nStore.t("desktopShell.updates.noAppActionYet", "No app update action yet.") }}</p>
      <p v-if="appState.downloadedFilePath" class="meta-line" style="word-break: break-all;">
        Downloaded file: {{ appState.downloadedFilePath }}
      </p>
      <p v-if="appInstallHint" class="meta-line meta-line-success">{{ appInstallHint }}</p>
      <p v-if="appState.lastError" class="legacy-fallback-note">{{ appState.lastError }}</p>
      <details v-if="appState.releaseNotes" class="desktop-update-notes">
        <summary>{{ shellI18nStore.t("desktopShell.updates.releaseNotes", "Release notes") }}</summary>
        <pre>{{ appState.releaseNotes }}</pre>
      </details>
    </section>

    <section class="subcard">
      <div class="card-header-row">
        <h4>{{ shellI18nStore.t("desktopShell.updates.resourceUpdates", "Resource updates") }}</h4>
        <span class="pill">{{ resourcesState.currentVersion || shellI18nStore.t("desktopShell.updates.missing", "missing") }}</span>
      </div>
      <div class="desktop-update-state-strip" :class="`is-${resourcesStage}`">
        <strong>{{ resourcesStageLabel }}</strong>
        <span>{{ resourcesState.lastMessage || shellI18nStore.t("desktopShell.updates.noResourceActionYet", "No resource update action yet.") }}</span>
      </div>
      <div class="metrics metrics-compact">
        <div class="metric">
          <span class="metric-label">{{ shellI18nStore.t("desktopShell.states.current", "Current") }}</span>
          <strong>{{ resourcesState.currentVersion || shellI18nStore.t("desktopShell.updates.missingCapitalized", "Missing") }}</strong>
          <small>{{ resourcesState.missingLocalResources ? shellI18nStore.t("desktopShell.updates.localResourcesMissing", "Local resources not found") : shellI18nStore.t("desktopShell.updates.localResourcesDetected", "Local resources detected") }}</small>
        </div>
        <div class="metric">
          <span class="metric-label">{{ shellI18nStore.t("desktopShell.updates.latest", "Latest") }}</span>
          <strong>{{ resourcesState.latestVersion || shellI18nStore.t("desktopShell.updates.notChecked", "Not checked") }}</strong>
          <small>{{ resourcesState.available ? shellI18nStore.t("desktopShell.updates.resourceAvailable", "Update or redownload available") : shellI18nStore.t("desktopShell.updates.noResourceUpdateQueued", "No update queued") }}</small>
        </div>
        <div class="metric">
          <span class="metric-label">{{ shellI18nStore.t("desktopShell.updates.storage", "Storage") }}</span>
          <strong>{{ resourcesConfig.effectiveStoragePath || shellI18nStore.t("desktopShell.updates.defaultStorage", "Default") }}</strong>
          <small>{{ Number(resourcesState.progressPercent || 0) }}% {{ shellI18nStore.t("desktopShell.updates.progress", "progress") }}</small>
        </div>
      </div>
      <div class="desktop-update-progress" :class="`is-${resourcesStage}`">
        <div class="desktop-update-progress-bar" :style="{ width: `${Number(resourcesState.progressPercent || 0)}%` }"></div>
      </div>
      <div class="desktop-path-entry-row">
        <input
          v-model="resourcesStoragePathDraft"
          type="text"
          :placeholder="shellI18nStore.t('desktopShell.updates.resourcesPathPlaceholder', 'Leave empty to use default resources path')"
        />
        <button type="button" class="action-button" @click="updateCenterStore.browseResourcesStoragePath">{{ shellI18nStore.t("footer.browse", "Browse") }}</button>
        <button
          type="button"
          class="action-button"
          :disabled="busyAction === 'resources-config'"
          @click="updateCenterStore.saveResourcesConfig"
        >
          {{ busyAction === "resources-config" ? shellI18nStore.t("desktopShell.themeWindow.saving", "Saving...") : shellI18nStore.t("desktopShell.updates.savePath", "Save Path") }}
        </button>
      </div>
      <div class="button-row">
        <button type="button" class="action-button" :disabled="loading" @click="updateCenterStore.checkResources">
          {{ shellI18nStore.t("desktopShell.updates.checkResourceUpdate", "Check Resource Update") }}
        </button>
        <button
          type="button"
          class="action-button"
          :disabled="busyAction === 'resources-install'"
          @click="updateCenterStore.installResources"
        >
          {{
            busyAction === "resources-install"
              ? shellI18nStore.t("desktopShell.updates.installing", "Installing...")
              : resourcesState.missingLocalResources
                ? shellI18nStore.t("desktopShell.updates.redownloadResources", "Redownload Resources")
                : shellI18nStore.t("desktopShell.updates.installResourceUpdate", "Install Resource Update")
          }}
        </button>
      </div>
      <p class="meta-line">{{ resourcesState.lastMessage || shellI18nStore.t("desktopShell.updates.noResourceActionYet", "No resource update action yet.") }}</p>
      <p v-if="resourcesState.lastError" class="legacy-fallback-note">{{ resourcesState.lastError }}</p>
    </section>

    <section v-if="actionStatus || error" class="subcard">
      <h4>{{ shellI18nStore.t("desktopShell.updates.statusTitle", "Update center status") }}</h4>
      <p v-if="actionStatus" class="meta-line" :class="{ 'meta-line-success': statusTone === 'success' }">{{ actionStatus }}</p>
      <p v-if="error" class="legacy-fallback-note">{{ error }}</p>
    </section>
  </div>
</template>
