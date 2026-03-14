<script setup>
import { onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useBiosManagerStore } from "../stores/bios-manager";
import { useShellI18nStore } from "../stores/shell-i18n";

const shellI18nStore = useShellI18nStore();
const biosStore = useBiosManagerStore();
const { loading, platforms, rootPath, status, statusTone } = storeToRefs(biosStore);

function formatBytes(byteCount) {
  const value = Number(byteCount || 0);
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  const decimals = size >= 100 ? 0 : size >= 10 ? 1 : 2;
  return `${size.toFixed(decimals)} ${units[index]}`;
}

onMounted(() => {
  void biosStore.initialize();
});
</script>

<template>
  <div class="desktop-settings-stack">
    <section class="subcard">
      <div class="card-header-row">
        <div>
          <h4>{{ shellI18nStore.t("desktopShell.tools.biosFoldersTitle", "Managed BIOS folders") }}</h4>
          <p class="meta-line">{{ shellI18nStore.t("desktopShell.tools.biosRootLabel", "Root") }}: {{ rootPath || shellI18nStore.t("desktopShell.tools.waitingForNativeBridge", "Waiting for native bridge...") }}</p>
        </div>
        <div class="button-row">
          <button type="button" class="action-button" :disabled="loading" @click="biosStore.refresh">
            {{ loading ? shellI18nStore.t("desktopShell.tools.refreshing", "Refreshing...") : shellI18nStore.t("desktopShell.tools.refresh", "Refresh") }}
          </button>
          <button type="button" class="action-button" @click="biosStore.openFolder('shared')">{{ shellI18nStore.t("tools.openSharedBiosFolder", "Open Shared Folder") }}</button>
        </div>
      </div>
      <p v-if="status" class="desktop-status-line" :data-tone="statusTone || 'info'">{{ status }}</p>
    </section>

    <div class="desktop-tool-card-grid desktop-bios-platform-grid">
      <article v-for="platform in platforms" :key="platform.key" class="subcard desktop-tool-surface-card">
        <div class="card-header-row">
          <div>
            <h4>{{ platform.name }}</h4>
            <p class="meta-line">{{ platform.shortName }}</p>
          </div>
          <span class="pill">{{ platform.fileCount }} {{ shellI18nStore.t("desktopShell.tools.filesLabel", "files") }}</span>
        </div>
        <p class="meta-line">
          {{
            platform.biosRequired
              ? `${shellI18nStore.t("desktopShell.tools.requiredBy", "Required by")}: ${platform.requiredBy.join(", ") || shellI18nStore.t("tools.unknown", "Unknown")}`
              : shellI18nStore.t("tools.biosOptional", "Optional shared BIOS folder")
          }}
        </p>
        <div class="desktop-code-block">{{ platform.folderPath }}</div>
        <div class="button-row">
          <button type="button" class="action-button" @click="biosStore.addFiles(platform.shortName)">{{ shellI18nStore.t("tools.addBiosFiles", "Add BIOS Files") }}</button>
          <button type="button" class="action-button" @click="biosStore.openFolder(platform.shortName)">{{ shellI18nStore.t("tools.openFolder", "Open Folder") }}</button>
        </div>
        <div class="desktop-tool-list">
          <div v-for="file in platform.files" :key="`${platform.key}-${file.name}`" class="desktop-tool-list-row">
            <strong>{{ file.name }}</strong>
            <small>{{ formatBytes(file.size) }}</small>
          </div>
          <div v-if="!platform.files.length" class="desktop-tool-empty-state">{{ shellI18nStore.t("tools.biosNoFiles", "No BIOS files in this folder yet.") }}</div>
        </div>
      </article>
    </div>
  </div>
</template>
