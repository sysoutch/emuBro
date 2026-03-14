<script setup>
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useEcmToolStore } from "../stores/ecm-tool";
import { useShellI18nStore } from "../stores/shell-i18n";

const shellI18nStore = useShellI18nStore();
const ecmStore = useEcmToolStore();
const {
  buildRows,
  compilerOptions,
  info,
  installOptions,
  recommendedCompiler,
  running,
  selectedCompiler,
  selectedInstallOption,
  selectedInstallOptionId,
  selectedSourcePath,
  lastBuildOutputPath,
  lastDownloadedPath,
  status,
  statusTone
} = storeToRefs(ecmStore);

const environmentSummary = computed(() => {
  if (!ecmStore.environment) {
    return shellI18nStore.t("tools.ecmUnecmEnvUnknown", "Build environment: not checked");
  }
  if (recommendedCompiler.value) {
    return shellI18nStore.tf("tools.ecmUnecmEnvDetected", { compiler: recommendedCompiler.value }, `Build environment: compiler ${recommendedCompiler.value} available`);
  }
  return shellI18nStore.t("tools.ecmUnecmEnvNoCompiler", "Build environment detected, but no C compiler found");
});

onMounted(() => {
  void ecmStore.initialize();
});
</script>

<template>
  <div class="desktop-settings-stack">
    <section class="subcard desktop-tool-surface-card">
      <div class="card-header-row">
        <div>
          <h4>{{ shellI18nStore.t("desktopShell.ecm.title", "External ECM / UNECM workflow") }}</h4>
          <p class="meta-line">{{ shellI18nStore.t("desktopShell.ecm.description", "Downloaded separately as an external GPL tool archive, then built through native shell channels.") }}</p>
        </div>
        <span class="pill">{{ recommendedCompiler || shellI18nStore.t("desktopShell.ecm.noCompiler", "No compiler") }}</span>
      </div>

      <p class="meta-line">{{ shellI18nStore.t("desktopShell.ecm.license", "License") }}: {{ info?.license || 'GPL-2.0-or-later' }}. {{ shellI18nStore.t("desktopShell.ecm.sourceZip", "Source ZIP") }}: {{ info?.defaultFileName || 'ecm.zip' }}</p>
      <p class="meta-line">{{ environmentSummary }}</p>
      <p class="meta-line">{{ shellI18nStore.t("desktopShell.ecm.source", "Source") }}: {{ selectedSourcePath || shellI18nStore.t("tools.ecmUnecmNoSourceSelected", "not selected") }}</p>
      <p v-if="status" class="desktop-status-line" :data-tone="statusTone || 'info'">{{ status }}</p>

      <div class="form-grid">
        <label class="field">
          <span>{{ shellI18nStore.t("tools.ecmUnecmCompilerLabel", "Build compiler") }}</span>
          <select :value="selectedCompiler" @change="ecmStore.setSelectedCompiler($event.target.value)">
            <option value="">{{ shellI18nStore.tf("tools.ecmUnecmCompilerAuto", { compiler: recommendedCompiler || shellI18nStore.t("desktopShell.community.none", "None") }, `Auto (recommended: ${recommendedCompiler || "None"})`) }}</option>
            <option v-for="compiler in compilerOptions" :key="compiler.name" :value="compiler.name">
              {{ compiler.name }}{{ compiler.version ? ` (${compiler.version})` : '' }}{{ compiler.available ? '' : ` (${shellI18nStore.t("tools.ecmUnecmCompilerMissing", "not found")})` }}
            </option>
          </select>
        </label>
        <label class="field">
          <span>{{ shellI18nStore.t("tools.ecmUnecmInstallLabel", "Compiler install option") }}</span>
          <select :value="selectedInstallOptionId" @change="ecmStore.setSelectedInstallOption($event.target.value)">
            <option v-if="!installOptions.length" value="">{{ shellI18nStore.t("tools.ecmUnecmInstallNone", "No install options detected") }}</option>
            <option v-for="option in installOptions" :key="option.id" :value="option.id">
              {{ option.label }}{{ option.recommended ? ` (${shellI18nStore.t("desktopShell.ecm.recommended", "Recommended")})` : '' }}
            </option>
          </select>
        </label>
      </div>

      <p class="meta-line">{{ selectedInstallOption?.description || shellI18nStore.t("tools.ecmUnecmInstallHintEmpty", "Compiler install suggestion appears after environment detection.") }}</p>

      <div class="button-row">
        <button type="button" class="action-button" :disabled="running" @click="ecmStore.downloadSourceZip">
          {{ running ? shellI18nStore.t("desktopShell.tools.working", "Working...") : shellI18nStore.t("tools.ecmUnecmDownloadZip", "Download Source ZIP") }}
        </button>
        <button type="button" class="action-button" :disabled="running" @click="ecmStore.pickSourcePath">{{ shellI18nStore.t("tools.ecmUnecmPickSource", "Select Source Path") }}</button>
        <button type="button" class="action-button" :disabled="running" @click="ecmStore.detectEnvironment">{{ shellI18nStore.t("tools.ecmUnecmDetectEnv", "Detect Build Env") }}</button>
        <button type="button" class="action-button" :disabled="running || !installOptions.length" @click="ecmStore.installCompiler">{{ shellI18nStore.t("tools.ecmUnecmInstallCompiler", "Install / Download Compiler") }}</button>
        <button type="button" class="action-button" :disabled="running || !selectedSourcePath" @click="ecmStore.buildBinaries">{{ shellI18nStore.t("tools.ecmUnecmBuild", "Build Binaries") }}</button>
      </div>

      <div class="button-row">
        <button type="button" class="action-button" @click="window.emubro.invoke('open-external-url', info?.repoUrl)">{{ shellI18nStore.t("tools.ecmUnecmOpenRepo", "Open Upstream Repo") }}</button>
        <button type="button" class="action-button" @click="window.emubro.invoke('open-external-url', info?.sourceZipUrl)">{{ shellI18nStore.t("tools.ecmUnecmOpenZipUrl", "Open ZIP URL") }}</button>
        <button type="button" class="action-button" :disabled="!lastDownloadedPath" @click="ecmStore.showPathInFolder(lastDownloadedPath)">{{ shellI18nStore.t("tools.ecmUnecmShowDownload", "Show Download") }}</button>
        <button type="button" class="action-button" :disabled="!lastBuildOutputPath" @click="ecmStore.showPathInFolder(lastBuildOutputPath)">{{ shellI18nStore.t("tools.ecmUnecmShowBuild", "Show Build Output") }}</button>
      </div>
    </section>

    <section class="subcard desktop-tool-surface-card">
      <div class="card-header-row">
        <h4>{{ shellI18nStore.t("desktopShell.ecm.resultsTitle", "Build results") }}</h4>
        <span class="pill">{{ buildRows.length }} {{ shellI18nStore.t("desktopShell.coverDownloader.rows", "rows") }}</span>
      </div>
      <div class="desktop-tool-list">
        <div v-for="row in buildRows" :key="row.key" class="desktop-tool-list-row">
          <div>
            <strong>{{ row.target || row.source || shellI18nStore.t("desktopShell.ecm.buildStep", "Build step") }}</strong>
            <small v-if="row.source">{{ row.source }}</small>
            <small v-if="row.stderr">{{ row.stderr }}</small>
          </div>
          <div class="desktop-tool-list-row-meta">
            <small>{{ row.ok ? shellI18nStore.t("desktopShell.ecm.ok", "OK") : shellI18nStore.t("desktopShell.ecm.failed", "Failed") }}</small>
          </div>
        </div>
        <div v-if="!buildRows.length" class="desktop-tool-empty-state">{{ shellI18nStore.t("desktopShell.ecm.noActivityYet", "No ECM activity yet.") }}</div>
      </div>
    </section>
  </div>
</template>
