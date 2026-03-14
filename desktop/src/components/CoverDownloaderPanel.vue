<script setup>
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useCoverDownloaderStore } from "../stores/cover-downloader";
import { useShellI18nStore } from "../stores/shell-i18n";
import { formatCoverDownloadResult } from "../utils/cover-downloader";

const shellI18nStore = useShellI18nStore();
const coverStore = useCoverDownloaderStore();
const { onlyMissing, overwrite, results, running, sourceOverrides, sourceTemplates, stats, status, statusTone, summary, summaryTone } = storeToRefs(coverStore);

const psxOverridesText = computed(() => sourceOverrides.value.psx.join("\n"));
const ps2OverridesText = computed(() => sourceOverrides.value.ps2.join("\n"));

function setSourceOverride(platform, event) {
  coverStore.setSourceOverride(platform, event?.target?.value || "");
}

onMounted(() => {
  void coverStore.initialize();
});
</script>

<template>
  <div class="desktop-settings-stack">
    <section class="subcard">
      <div class="card-header-row">
        <div>
          <h4>{{ shellI18nStore.t("desktopShell.coverDownloader.title", "Library-wide cover downloads") }}</h4>
          <p class="meta-line">{{ shellI18nStore.t("desktopShell.coverDownloader.description", "PS1 and PS2 cover downloads now run directly through the shell bridge.") }}</p>
        </div>
        <span class="pill">{{ stats.supported }} {{ shellI18nStore.t("desktopShell.coverDownloader.supportedGames", "supported games") }}</span>
      </div>

      <div class="button-row">
        <label class="toolbar-checkbox">
          <input v-model="onlyMissing" type="checkbox" />
          <span>{{ shellI18nStore.t("tools.coverDownloaderOnlyMissing", "Only missing covers") }}</span>
        </label>
        <label class="toolbar-checkbox">
          <input v-model="overwrite" type="checkbox" />
          <span>{{ shellI18nStore.t("tools.coverDownloaderOverwrite", "Overwrite existing files") }}</span>
        </label>
        <button type="button" class="action-button" :disabled="running" @click="coverStore.runDownload()">
          {{ running ? shellI18nStore.t("desktopShell.updates.downloading", "Downloading...") : shellI18nStore.t("tools.coverDownloaderRun", "Download Covers") }}
        </button>
        <button type="button" class="action-button" :disabled="running" @click="coverStore.refreshStats">{{ shellI18nStore.t("desktopShell.coverDownloader.refreshStats", "Refresh Stats") }}</button>
      </div>

      <p class="desktop-status-line" data-tone="info">{{ shellI18nStore.tf("tools.coverDownloaderStats", { supported: stats.supported, withSerial: stats.withSerial }, `PS1/PS2 games: ${stats.supported} | with serial/code: ${stats.withSerial}`) }}</p>
      <p v-if="status" class="desktop-status-line" :data-tone="statusTone || 'info'">{{ status }}</p>
      <p v-if="summary" class="desktop-status-line" :data-tone="summaryTone || 'info'">{{ summary }}</p>
    </section>

    <div class="desktop-cover-source-grid">
      <section class="subcard desktop-tool-surface-card">
        <div class="card-header-row">
          <h4>{{ shellI18nStore.t("tools.coverDownloaderPs1Source", "PS1 sources") }}</h4>
          <span class="pill">{{ sourceTemplates.psx.length }} {{ shellI18nStore.t("desktopShell.coverDownloader.templates", "templates") }}</span>
        </div>
        <div class="desktop-tool-link-list">
          <a v-for="link in sourceTemplates.psx" :key="link" :href="link" target="_blank" rel="noreferrer">{{ link }}</a>
        </div>
        <label class="field">
          <span>{{ shellI18nStore.t("tools.coverDownloaderExtraLinks", "Extra links (one per line)") }}</span>
          <textarea class="desktop-textarea-input" :value="psxOverridesText" rows="4" @input="setSourceOverride('psx', $event)" />
        </label>
      </section>

      <section class="subcard desktop-tool-surface-card">
        <div class="card-header-row">
          <h4>{{ shellI18nStore.t("tools.coverDownloaderPs2Source", "PS2 sources") }}</h4>
          <span class="pill">{{ sourceTemplates.ps2.length }} {{ shellI18nStore.t("desktopShell.coverDownloader.templates", "templates") }}</span>
        </div>
        <div class="desktop-tool-link-list">
          <a v-for="link in sourceTemplates.ps2" :key="link" :href="link" target="_blank" rel="noreferrer">{{ link }}</a>
        </div>
        <label class="field">
          <span>{{ shellI18nStore.t("tools.coverDownloaderExtraLinks", "Extra links (one per line)") }}</span>
          <textarea class="desktop-textarea-input" :value="ps2OverridesText" rows="4" @input="setSourceOverride('ps2', $event)" />
        </label>
      </section>
    </div>

    <section class="subcard">
      <div class="button-row">
        <button type="button" class="action-button" @click="coverStore.saveOverrides">{{ shellI18nStore.t("tools.coverDownloaderSaveLinks", "Save Links") }}</button>
        <button type="button" class="action-button" @click="coverStore.resetOverrides">{{ shellI18nStore.t("tools.coverDownloaderResetLinks", "Reset Extras") }}</button>
      </div>
    </section>

    <section class="subcard">
      <div class="card-header-row">
        <h4>{{ shellI18nStore.t("desktopShell.coverDownloader.latestResults", "Latest results") }}</h4>
        <span class="pill">{{ results.length }} {{ shellI18nStore.t("desktopShell.coverDownloader.rows", "rows") }}</span>
      </div>
      <div class="desktop-tool-list desktop-cover-results-list">
        <div v-for="row in results" :key="`${row.gameId}-${row.status}-${row.sourceUrl || 'none'}`" class="desktop-tool-list-row">
          <div>
            <strong>{{ row.name }}</strong>
            <small>{{ String(row.platformShortName || '').toUpperCase() }}</small>
          </div>
          <div class="desktop-tool-list-row-meta">
            <small>{{ formatCoverDownloadResult(row) }}</small>
            <a v-if="row.sourceUrl" :href="row.sourceUrl" target="_blank" rel="noreferrer">{{ shellI18nStore.t("tools.coverDownloaderOpenSource", "Open source") }}</a>
          </div>
        </div>
        <div v-if="!results.length" class="desktop-tool-empty-state">{{ shellI18nStore.t("tools.coverDownloaderNoResults", "No download results yet. Run the cover download to populate this list.") }}</div>
      </div>
    </section>
  </div>
</template>
