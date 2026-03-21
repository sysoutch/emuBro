<script setup>
import { computed, ref, watch } from "vue";
import { useShellI18nStore } from "../stores/shell-i18n";
import EmulatorConfigPanel from "./EmulatorConfigPanel.vue";
import { resolveEffectiveEmulatorConfig } from "../utils/emulator-config";
import {
  getEmulatorDownloadPackageTypeLabel,
  getEmulatorLinuxInstallOptions,
  hasAnyEmulatorDownloadLink,
  normalizeEmulatorDownloadLinks,
  normalizeEmulatorDownloadOsKey
} from "../utils/emulator-downloads";
import {
  loadDownloadedPackagePath,
  loadLinuxInstallPreference,
  loadSelectedLaunchPath,
  saveDownloadedPackagePath,
  saveLinuxInstallPreference,
  saveSelectedLaunchPath
} from "../utils/emulator-preferences";

const props = defineProps({
  emulator: {
    type: Object,
    default: null
  },
  status: {
    type: String,
    default: ""
  },
  statusTone: {
    type: String,
    default: ""
  }
});

const emit = defineEmits(["close", "refresh-emulator"]);
const shellI18nStore = useShellI18nStore();

const selectedLaunchPath = ref("");
const osKey = ref("windows");
const installMethod = ref("download");
const rememberLinuxInstallMethod = ref(false);
const packageOptions = ref([]);
const recommendedPackageType = ref("");
const selectedPackageType = ref("");
const selectedSpecificUrl = ref("");
const manualUrl = ref("");
const waybackUrl = ref("");
const downloadedPackagePath = ref("");
const actionStatus = ref("");
const actionStatusTone = ref("");
const actionBusy = ref("");

const launchPaths = computed(() => {
  const seen = new Set();
  const values = [];
  const push = (rawPath) => {
    const path = String(rawPath || "").trim();
    if (!path) return;
    const key = path.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    values.push(path);
  };

  (Array.isArray(props.emulator?.filePaths) ? props.emulator.filePaths : []).forEach(push);
  push(props.emulator?.filePath);
  return values;
});

const directDownloadLinks = computed(() => normalizeEmulatorDownloadLinks(props.emulator?.downloadLinks));
const hasDownloads = computed(() => hasAnyEmulatorDownloadLink(props.emulator));
const linuxInstallOptions = computed(() => getEmulatorLinuxInstallOptions(props.emulator));
const currentPlatformLabel = computed(() =>
  String(props.emulator?.platform || props.emulator?.platformShortName || t("desktopShell.emulatorDetails.metrics.unknown", "Unknown")).trim()
);
const canLaunchSelected = computed(() => !!selectedLaunchPath.value && !!props.emulator?.installed);
const selectedPackageSummary = computed(() => {
  const match = packageOptions.value.find((row) => String(row?.url || "") === String(selectedSpecificUrl.value || ""));
  if (match) {
    return `${getEmulatorDownloadPackageTypeLabel(match.packageType)}${match.fileName ? `: ${match.fileName}` : ""}`;
  }
  if (selectedPackageType.value) {
    return getEmulatorDownloadPackageTypeLabel(selectedPackageType.value);
  }
  return t("desktopShell.emulatorDetails.download.auto", "Auto");
});

function getCurrentOverrideConfig() {
  return resolveEffectiveEmulatorConfig(props.emulator);
}

function getDesktopBridge() {
  if (typeof window === "undefined" || !window.emubro) {
    return null;
  }
  return window.emubro;
}

function t(key, fallback) {
  return shellI18nStore.t(key, fallback);
}

function tf(key, params, fallback) {
  return shellI18nStore.tf(key, params, fallback);
}

function detectRuntimePlatform() {
  const bridgePlatform = String(window?.emubro?.platform || "").trim().toLowerCase();
  return normalizeEmulatorDownloadOsKey(bridgePlatform || navigator?.platform || "windows");
}

function setActionFeedback(message, tone = "") {
  actionStatus.value = String(message || "").trim();
  actionStatusTone.value = tone;
}

function selectPackageOption(option) {
  selectedSpecificUrl.value = String(option?.url || "").trim();
  selectedPackageType.value = String(option?.packageType || "").trim();
}

function buildDownloadPayload() {
  const currentConfig = getCurrentOverrideConfig();
  return {
    name: props.emulator?.name || "",
    platform: props.emulator?.platform || "",
    platformShortName: props.emulator?.platformShortName || "",
    website: currentConfig.website || props.emulator?.website || "",
    downloadUrl: props.emulator?.downloadUrl || "",
    downloadLinks: props.emulator?.downloadLinks || null,
    searchString: currentConfig.searchString || props.emulator?.searchString || "",
    archiveFileMatchWin: props.emulator?.archiveFileMatchWin || "",
    archiveFileMatchLinux: props.emulator?.archiveFileMatchLinux || "",
    archiveFileMatchMac: props.emulator?.archiveFileMatchMac || "",
    setupFileMatchWin: props.emulator?.setupFileMatchWin || "",
    setupFileMatchLinux: props.emulator?.setupFileMatchLinux || "",
    setupFileMatchMac: props.emulator?.setupFileMatchMac || "",
    executableFileMatchWin: props.emulator?.executableFileMatchWin || "",
    executableFileMatchLinux: props.emulator?.executableFileMatchLinux || "",
    executableFileMatchMac: props.emulator?.executableFileMatchMac || "",
    installers: props.emulator?.installers || null,
    startParameters: currentConfig.startParameters || props.emulator?.startParameters || props.emulator?.args || "",
    type: props.emulator?.type || "standalone",
    os: osKey.value
  };
}

async function refreshDownloadOptions() {
  if (installMethod.value !== "download") {
    packageOptions.value = [];
    selectedPackageType.value = "";
    selectedSpecificUrl.value = "";
    recommendedPackageType.value = "";
    manualUrl.value = String(props.emulator?.website || props.emulator?.downloadUrl || "").trim();
    waybackUrl.value = "";
    return;
  }

  const bridge = getDesktopBridge();
  if (!bridge?.invoke) {
    setActionFeedback(t("desktopShell.tools.bridgeUnavailable", "Desktop bridge unavailable."), "error");
    return;
  }

  actionBusy.value = "options";
  setActionFeedback(t("desktopShell.emulatorDetails.download.loadingOptions", "Loading download options..."), "");
  try {
    const result = await bridge.invoke("get-emulator-download-options", buildDownloadPayload());
    if (!result?.success) {
      throw new Error(
        String(result?.message || t("desktopShell.emulatorDetails.errors.loadDownloadOptions", "Failed to load download options."))
      );
    }

    packageOptions.value = Array.isArray(result?.options) ? result.options : [];
    recommendedPackageType.value = String(result?.recommendedType || "").trim();
    manualUrl.value = String(result?.manualUrl || props.emulator?.website || props.emulator?.downloadUrl || "").trim();
    waybackUrl.value = String(result?.waybackUrl || "").trim();

    const recommendedOption = packageOptions.value.find((row) => String(row?.packageType || "") === recommendedPackageType.value);
    if (recommendedOption) {
      selectPackageOption(recommendedOption);
    } else if (packageOptions.value[0]) {
      selectPackageOption(packageOptions.value[0]);
    } else {
      selectedPackageType.value = "";
      selectedSpecificUrl.value = "";
    }

    if (packageOptions.value.length) {
      setActionFeedback(t("desktopShell.emulatorDetails.download.optionsLoaded", "Download options loaded."), "success");
    } else if (manualUrl.value) {
      setActionFeedback(t("desktopShell.emulatorDetails.download.browserFallbackAvailable", "No direct package found. Browser fallback is available."), "");
    } else {
      setActionFeedback(t("desktopShell.emulatorDetails.download.noSources", "No download sources are configured for this emulator."), "error");
    }
  } catch (error) {
    packageOptions.value = [];
    selectedPackageType.value = "";
    selectedSpecificUrl.value = "";
    setActionFeedback(
      error instanceof Error
        ? error.message
        : String(error || t("desktopShell.emulatorDetails.errors.loadDownloadOptions", "Failed to load download options.")),
      "error"
    );
  } finally {
    actionBusy.value = "";
  }
}

async function openExternalTarget(targetUrl, missingMessage = t("desktopShell.emulatorDetails.actions.noUrl", "No URL configured.")) {
  const target = String(targetUrl || "").trim();
  if (!target) {
    setActionFeedback(missingMessage, "error");
    return;
  }

  const bridge = getDesktopBridge();
  if (!bridge?.invoke) {
    setActionFeedback(t("desktopShell.tools.bridgeUnavailable", "Desktop bridge unavailable."), "error");
    return;
  }

  const result = await bridge.invoke("open-external-url", target);
  setActionFeedback(
    String(
      result?.message ||
        (result?.success
          ? t("desktopShell.emulatorDetails.actions.browserOpened", "Opened browser target.")
          : t("desktopShell.emulatorDetails.actions.browserFailed", "Could not open browser target."))
    ),
    result?.success ? "success" : "error"
  );
}

async function launchSelectedEmulator() {
  if (!canLaunchSelected.value) {
    setActionFeedback(t("desktopShell.emulatorDetails.errors.notInstalled", "This emulator is not installed yet."), "error");
    return;
  }

  const bridge = getDesktopBridge();
  if (!bridge?.invoke) {
    setActionFeedback(t("desktopShell.tools.bridgeUnavailable", "Desktop bridge unavailable."), "error");
    return;
  }

  const currentConfig = getCurrentOverrideConfig();
  const directLaunchArgs = String(currentConfig.launchArgs || "").trim();
  actionBusy.value = "launch";
  try {
    const result = await bridge.invoke("launch-emulator", {
      filePath: selectedLaunchPath.value,
      args: directLaunchArgs,
      workingDirectory: currentConfig.workingDirectory || props.emulator?.workingDirectory || "",
      inputBindings: currentConfig.effectiveInputBindings,
      gamepadBindings: currentConfig.effectiveGamepadBindings?.gamepad || {},
      runCommandsBefore: currentConfig.runCommandsBefore,
      name: props.emulator?.name || ""
    });
    setActionFeedback(
      String(
        result?.message ||
          (result?.success
            ? t("desktopShell.emulatorDetails.actions.launchSuccess", "Emulator launched.")
            : t("desktopShell.emulatorDetails.errors.launchFailed", "Failed to launch emulator."))
      ),
      result?.success ? "success" : "error"
    );
  } finally {
    actionBusy.value = "";
  }
}

async function showTargetInFolder(targetPath, missingMessage) {
  const target = String(targetPath || "").trim();
  if (!target) {
    setActionFeedback(missingMessage, "error");
    return;
  }

  const bridge = getDesktopBridge();
  if (!bridge?.invoke) {
    setActionFeedback(t("desktopShell.tools.bridgeUnavailable", "Desktop bridge unavailable."), "error");
    return;
  }

  const result = await bridge.invoke("show-item-in-folder", target);
  setActionFeedback(
    String(
      result?.message ||
        (result?.success
          ? t("desktopShell.emulatorDetails.actions.folderOpened", "Opened folder location.")
          : t("desktopShell.emulatorDetails.actions.folderFailed", "Could not open folder location."))
    ),
    result?.success ? "success" : "error"
  );
}

async function startDownloadInstall(options = {}) {
  if (!hasDownloads.value) {
    setActionFeedback(t("desktopShell.emulatorDetails.download.noSources", "No download sources are configured for this emulator."), "error");
    return;
  }

  const bridge = getDesktopBridge();
  if (!bridge?.invoke) {
    setActionFeedback(t("desktopShell.tools.bridgeUnavailable", "Desktop bridge unavailable."), "error");
    return;
  }

  if (installMethod.value === "download" && !packageOptions.value.length && !manualUrl.value) {
    await refreshDownloadOptions();
  }

  actionBusy.value = options.useWaybackFallback ? "wayback" : "download";
  setActionFeedback(
    options.useWaybackFallback
      ? t("desktopShell.emulatorDetails.download.openingWayback", "Opening Wayback fallback...")
      : t("desktopShell.emulatorDetails.download.downloading", "Downloading emulator..."),
    ""
  );
  try {
    saveLinuxInstallPreference(installMethod.value, rememberLinuxInstallMethod.value);

    const result = await bridge.invoke("download-install-emulator", {
      ...buildDownloadPayload(),
      installMethod: installMethod.value,
      packageType: installMethod.value === "download" ? selectedPackageType.value : "",
      specificUrl: installMethod.value === "download" ? selectedSpecificUrl.value : "",
      useWaybackFallback: !!options.useWaybackFallback,
      waybackSourceUrl: manualUrl.value,
      waybackUrl: waybackUrl.value
    });

    if (!result?.success && !result?.manual) {
      throw new Error(String(result?.message || t("desktopShell.emulatorDetails.errors.downloadFailed", "Failed to download emulator.")));
    }

    if (result?.packagePath) {
      downloadedPackagePath.value = String(result.packagePath || "").trim();
      saveDownloadedPackagePath(props.emulator, downloadedPackagePath.value);
    }

    if (result?.installedPath) {
      selectedLaunchPath.value = String(result.installedPath || "").trim();
      saveSelectedLaunchPath(props.emulator, selectedLaunchPath.value);
    }

    setActionFeedback(
      String(
        result?.message ||
          (result?.manual
            ? t("desktopShell.emulatorDetails.download.manualOpened", "Opened download source in browser.")
            : t("desktopShell.emulatorDetails.download.finished", "Download/install finished."))
      ),
      result?.manual ? "success" : "success"
    );
    emit("refresh-emulator");
  } catch (error) {
    setActionFeedback(
      error instanceof Error ? error.message : String(error || t("desktopShell.emulatorDetails.errors.downloadFailed", "Failed to download emulator.")),
      "error"
    );
  } finally {
    actionBusy.value = "";
  }
}

function handleLaunchPathChange() {
  saveSelectedLaunchPath(props.emulator, selectedLaunchPath.value);
}

watch(
  () => installMethod.value,
  () => {
    if (installMethod.value === "download") {
      void refreshDownloadOptions();
      return;
    }

    packageOptions.value = [];
    selectedPackageType.value = "";
    selectedSpecificUrl.value = "";
    recommendedPackageType.value = "";
  }
);

watch(
  () => props.emulator,
  () => {
    osKey.value = detectRuntimePlatform();
    selectedLaunchPath.value = loadSelectedLaunchPath(props.emulator, launchPaths.value);
    downloadedPackagePath.value = loadDownloadedPackagePath(props.emulator);

    const linuxPref = loadLinuxInstallPreference();
    rememberLinuxInstallMethod.value = linuxPref.remember;
    if (osKey.value === "linux" && linuxInstallOptions.value.some((row) => row.id === linuxPref.method)) {
      installMethod.value = linuxPref.method;
    } else {
      installMethod.value = "download";
    }

    packageOptions.value = [];
    selectedPackageType.value = "";
    selectedSpecificUrl.value = "";
    recommendedPackageType.value = "";
    manualUrl.value = String(props.emulator?.website || props.emulator?.downloadUrl || "").trim();
    waybackUrl.value = "";
    actionStatus.value = "";
    actionStatusTone.value = "";

    if (hasDownloads.value && installMethod.value === "download") {
      void refreshDownloadOptions();
    }
  },
  { immediate: true }
);
</script>

<template>
  <div v-if="emulator" class="desktop-modal-backdrop" @mousedown.self="$emit('close')">
    <section class="desktop-modal-card desktop-emulator-details-modal">
      <div class="card-header-row">
        <div>
          <h3>{{ emulator.name }}</h3>
          <p class="meta-line">{{ emulator.platform }} | {{ emulator.type }}</p>
        </div>
        <button type="button" class="action-button" @click="$emit('close')">
          {{ shellI18nStore.t("buttons.close", "Close") }}
        </button>
      </div>

      <div class="desktop-modal-layout desktop-modal-layout-compact">
        <div class="desktop-modal-cover desktop-modal-cover-icon">
          <img :src="emulator.icon" :alt="emulator.name" loading="lazy" />
        </div>
        <div class="desktop-modal-content">
          <div class="metrics">
            <div class="metric">
              <span class="metric-label">{{ shellI18nStore.t("desktopShell.emulatorDetails.metrics.installed", "Installed") }}</span>
              <strong>{{ emulator.installed ? shellI18nStore.t("common.yes", "Yes") : shellI18nStore.t("common.no", "No") }}</strong>
              <small>{{ currentPlatformLabel }}</small>
            </div>
            <div class="metric">
              <span class="metric-label">{{ shellI18nStore.t("desktopShell.emulatorDetails.metrics.launchPaths", "Launch Paths") }}</span>
              <strong>{{ launchPaths.length }}</strong>
              <small>{{ selectedLaunchPath || shellI18nStore.t("desktopShell.emulatorDetails.metrics.noLaunchPath", "No launch path selected") }}</small>
            </div>
            <div class="metric">
              <span class="metric-label">{{ shellI18nStore.t("desktopShell.emulatorDetails.metrics.downloadFlow", "Download Flow") }}</span>
              <strong>{{ hasDownloads ? shellI18nStore.t("desktopShell.emulatorDetails.metrics.available", "Available") : shellI18nStore.t("desktopShell.emulatorDetails.metrics.missing", "Missing") }}</strong>
              <small>{{ installMethod === "download" ? selectedPackageSummary : installMethod }}</small>
            </div>
          </div>

          <article class="subcard desktop-modal-editor-section">
            <div class="card-header-row">
              <div>
                <h4>{{ shellI18nStore.t("desktopShell.emulatorDetails.launch.title", "Launch Control") }}</h4>
                <p class="meta-line">
                  {{ shellI18nStore.t("desktopShell.emulatorDetails.launch.description", "Choose which executable to launch when multiple paths are available.") }}
                </p>
              </div>
            </div>
            <label class="field">
              <span>{{ shellI18nStore.t("desktopShell.emulatorDetails.launch.selectedPath", "Selected Launch Path") }}</span>
              <select v-model="selectedLaunchPath" :disabled="!launchPaths.length" @change="handleLaunchPathChange">
                <option v-if="!launchPaths.length" value="">
                  {{ shellI18nStore.t("desktopShell.emulatorDetails.launch.noExecutablePath", "No executable path available") }}
                </option>
                <option v-for="path in launchPaths" :key="path" :value="path">{{ path }}</option>
              </select>
            </label>
            <div class="button-row">
              <button type="button" class="action-button" :disabled="actionBusy === 'launch' || !canLaunchSelected" @click="launchSelectedEmulator">
                {{
                  actionBusy === "launch"
                    ? shellI18nStore.t("desktopShell.emulatorDetails.launch.launching", "Launching...")
                    : shellI18nStore.t("desktopShell.emulatorDetails.launch.launchButton", "Launch Emulator")
                }}
              </button>
              <button
                type="button"
                class="action-button"
                :disabled="!selectedLaunchPath"
                @click="showTargetInFolder(selectedLaunchPath, shellI18nStore.t('desktopShell.emulatorDetails.launch.noStoredPath', 'No emulator path is stored.'))"
              >
                {{ shellI18nStore.t("desktopShell.emulatorDetails.actions.showInFolder", "Show In Folder") }}
              </button>
              <button
                type="button"
                class="action-button"
                @click="openExternalTarget(getCurrentOverrideConfig().website || emulator.website, shellI18nStore.t('desktopShell.emulatorDetails.actions.noWebsite', 'No emulator website is configured.'))"
              >
                {{ shellI18nStore.t("desktopShell.emulatorDetails.actions.openWebsite", "Open Website") }}
              </button>
            </div>
          </article>

          <EmulatorConfigPanel :emulator="emulator" :selected-launch-path="selectedLaunchPath" />

          <article class="subcard desktop-modal-editor-section">
            <div class="card-header-row">
              <div>
                <h4>{{ shellI18nStore.t("desktopShell.emulatorDetails.download.title", "Download and Install") }}</h4>
                <p class="meta-line">
                  {{ shellI18nStore.t("desktopShell.emulatorDetails.download.description", "Shell-native emulator download flow using the same migration bridge as the legacy popup.") }}
                </p>
              </div>
              <button type="button" class="action-button" :disabled="actionBusy === 'options' || !hasDownloads" @click="refreshDownloadOptions">
                {{
                  actionBusy === "options"
                    ? shellI18nStore.t("desktopShell.emulatorDetails.download.refreshing", "Refreshing...")
                    : shellI18nStore.t("desktopShell.emulatorDetails.download.refreshButton", "Refresh Packages")
                }}
              </button>
            </div>

            <div class="form-grid">
              <label class="field">
                <span>{{ shellI18nStore.t("desktopShell.emulatorDetails.download.runtimeOs", "Runtime OS") }}</span>
                <select v-model="osKey">
                  <option value="windows">{{ shellI18nStore.t("common.windows", "Windows") }}</option>
                  <option value="linux">{{ shellI18nStore.t("common.linux", "Linux") }}</option>
                  <option value="mac">{{ shellI18nStore.t("common.mac", "Mac") }}</option>
                </select>
              </label>
              <label class="field">
                <span>{{ shellI18nStore.t("desktopShell.emulatorDetails.download.installMethod", "Install Method") }}</span>
                <select v-model="installMethod">
                  <option value="download">{{ shellI18nStore.t("desktopShell.emulatorDetails.download.directDownload", "Direct Download") }}</option>
                  <option v-for="option in linuxInstallOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
                </select>
              </label>
            </div>

            <label v-if="osKey === 'linux' && linuxInstallOptions.length" class="checkbox-field">
              <input v-model="rememberLinuxInstallMethod" type="checkbox" />
              <span>{{ shellI18nStore.t("desktopShell.emulatorDetails.download.rememberLinuxMethod", "Remember Linux install method") }}</span>
            </label>

            <div class="desktop-emulator-os-links">
              <button
                type="button"
                class="action-button"
                :disabled="!directDownloadLinks.windows"
                @click="openExternalTarget(directDownloadLinks.windows, shellI18nStore.t('desktopShell.emulatorDetails.download.noWindowsLink', 'No Windows download link is configured.'))"
              >
                {{ shellI18nStore.t("desktopShell.emulatorDetails.download.windowsLink", "Windows Link") }}
              </button>
              <button
                type="button"
                class="action-button"
                :disabled="!directDownloadLinks.linux"
                @click="openExternalTarget(directDownloadLinks.linux, shellI18nStore.t('desktopShell.emulatorDetails.download.noLinuxLink', 'No Linux download link is configured.'))"
              >
                {{ shellI18nStore.t("desktopShell.emulatorDetails.download.linuxLink", "Linux Link") }}
              </button>
              <button
                type="button"
                class="action-button"
                :disabled="!directDownloadLinks.mac"
                @click="openExternalTarget(directDownloadLinks.mac, shellI18nStore.t('desktopShell.emulatorDetails.download.noMacLink', 'No Mac download link is configured.'))"
              >
                {{ shellI18nStore.t("desktopShell.emulatorDetails.download.macLink", "Mac Link") }}
              </button>
            </div>

            <div v-if="installMethod === 'download' && packageOptions.length" class="desktop-download-option-grid">
              <button
                v-for="option in packageOptions"
                :key="`${option.url}:${option.packageType}`"
                type="button"
                class="desktop-download-option"
                :class="{ 'is-active': selectedSpecificUrl === option.url }"
                @click="selectPackageOption(option)"
              >
                <strong>
                  {{ getEmulatorDownloadPackageTypeLabel(option.packageType) }}
                  <span v-if="option.packageType === recommendedPackageType">
                    {{ shellI18nStore.t("desktopShell.emulatorDetails.download.recommended", "(Recommended)") }}
                  </span>
                </strong>
                <small>{{ option.fileName || option.source || option.url }}</small>
              </button>
            </div>

            <p v-else-if="installMethod === 'download'" class="meta-line">
              {{
                hasDownloads
                  ? shellI18nStore.t("desktopShell.emulatorDetails.download.noDirectPackages", "No direct package options detected yet.")
                  : shellI18nStore.t("desktopShell.emulatorDetails.download.noSources", "No download sources are configured for this emulator.")
              }}
            </p>

            <div class="button-row">
              <button
                type="button"
                class="action-button"
                :disabled="actionBusy === 'download' || actionBusy === 'options' || !hasDownloads"
                @click="startDownloadInstall()"
              >
                {{
                  actionBusy === "download"
                    ? shellI18nStore.t("desktopShell.emulatorDetails.download.downloadingShort", "Downloading...")
                    : installMethod === "download"
                      ? shellI18nStore.t("desktopShell.emulatorDetails.download.installButton", "Download / Install")
                      : shellI18nStore.tf("desktopShell.emulatorDetails.download.runMethod", { method: installMethod }, `Run ${installMethod}`)
                }}
              </button>
              <button
                v-if="waybackUrl && installMethod === 'download'"
                type="button"
                class="action-button"
                :disabled="actionBusy === 'wayback'"
                @click="startDownloadInstall({ useWaybackFallback: true })"
              >
                {{
                  actionBusy === "wayback"
                    ? shellI18nStore.t("desktopShell.emulatorDetails.download.openingShort", "Opening...")
                    : shellI18nStore.t("desktopShell.emulatorDetails.download.waybackButton", "Use Wayback Machine")
                }}
              </button>
              <button
                v-if="downloadedPackagePath"
                type="button"
                class="action-button"
                @click="showTargetInFolder(downloadedPackagePath, shellI18nStore.t('desktopShell.emulatorDetails.download.noRecordedPackage', 'No downloaded package has been recorded yet.'))"
              >
                {{ shellI18nStore.t("desktopShell.emulatorDetails.download.showDownloadedPackage", "Show Downloaded Package") }}
              </button>
            </div>
          </article>

          <article class="subcard">
            <h4>{{ shellI18nStore.t("desktopShell.emulatorDetails.paths.title", "Stored Paths") }}</h4>
            <div class="desktop-emulator-path-list">
              <span v-for="path in launchPaths" :key="path" class="pill">{{ path }}</span>
              <span v-if="!launchPaths.length" class="pill">
                {{ shellI18nStore.t("desktopShell.emulatorDetails.paths.none", "No executable path recorded.") }}
              </span>
            </div>
          </article>

          <p
            v-if="actionStatus"
            class="meta-line"
            :class="{
              'meta-line-error': actionStatusTone === 'error',
              'meta-line-success': actionStatusTone === 'success'
            }"
          >
            {{ actionStatus }}
          </p>

          <p v-if="status" class="meta-line" :class="{ 'meta-line-error': statusTone === 'error' }">
            {{ status }}
          </p>
        </div>
      </div>
    </section>
  </div>
</template>
