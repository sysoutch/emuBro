<script setup>
import { onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useCueMakerStore } from "../stores/cue-maker";
import { useShellI18nStore } from "../stores/shell-i18n";

const shellI18nStore = useShellI18nStore();
const cueStore = useCueMakerStore();
const { inspectedRows, missingCount, running, selectedBinPaths, status, statusTone } = storeToRefs(cueStore);

function getFileName(path) {
  return String(path || "").replace(/\\/g, "/").split("/").pop() || String(path || "");
}

onMounted(() => {
  cueStore.initialize();
});
</script>

<template>
  <div class="desktop-settings-stack">
    <section class="subcard desktop-tool-surface-card">
      <div class="card-header-row">
        <div>
          <h4>{{ shellI18nStore.t("desktopShell.cueMaker.title", "Inspect BIN files and repair missing CUE sheets") }}</h4>
          <p class="meta-line">{{ shellI18nStore.t("desktopShell.cueMaker.description", "This now runs through the native cue channels instead of the legacy tools renderer.") }}</p>
        </div>
        <span class="pill">{{ missingCount }} {{ shellI18nStore.t("desktopShell.cueMaker.missingLabel", "missing") }}</span>
      </div>

      <div class="button-row">
        <button type="button" class="action-button" :disabled="running" @click="cueStore.pickFiles">
          {{ running ? shellI18nStore.t("desktopShell.tools.working", "Working...") : shellI18nStore.t("tools.cueMakerSelectBins", "Select BIN Files") }}
        </button>
        <button type="button" class="action-button" :disabled="running || !selectedBinPaths.length" @click="cueStore.inspect()">{{ shellI18nStore.t("tools.cueMakerInspect", "Inspect") }}</button>
        <button type="button" class="action-button" :disabled="running || !selectedBinPaths.length" @click="cueStore.generateMissing()">
          {{ shellI18nStore.t("tools.cueMakerGenerateMissing", "Generate Missing CUE") }}
        </button>
      </div>

      <p class="meta-line">{{ shellI18nStore.t("desktopShell.cueMaker.selectedBinPaths", "Selected BIN paths") }}: {{ selectedBinPaths.length }}</p>
      <p v-if="status" class="desktop-status-line" :data-tone="statusTone || 'info'">{{ status }}</p>
    </section>

    <section class="subcard desktop-tool-surface-card">
      <div class="card-header-row">
        <h4>{{ shellI18nStore.t("desktopShell.cueMaker.resultsTitle", "Inspection results") }}</h4>
        <span class="pill">{{ inspectedRows.length }} {{ shellI18nStore.t("desktopShell.coverDownloader.rows", "rows") }}</span>
      </div>
      <div class="desktop-tool-list">
        <div v-for="row in inspectedRows" :key="row.binPath" class="desktop-tool-list-row">
          <div>
            <strong>{{ getFileName(row.binPath) }}</strong>
            <small>{{ row.binPath }}</small>
            <small v-if="row.cuePath">{{ row.cuePath }}</small>
          </div>
          <div class="desktop-tool-list-row-meta">
            <small>{{ row.hasCue ? shellI18nStore.t("tools.cueMakerHasCue", "CUE found") : shellI18nStore.t("tools.cueMakerMissingCue", "CUE missing") }}</small>
          </div>
        </div>
        <div v-if="!inspectedRows.length" class="desktop-tool-empty-state">{{ shellI18nStore.t("tools.cueMakerNoResults", "No BIN files loaded yet.") }}</div>
      </div>
    </section>
  </div>
</template>
