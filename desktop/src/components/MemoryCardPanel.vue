<script setup>
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useShellI18nStore } from "../stores/shell-i18n";
import { useMemoryCardStore } from "../stores/memory-card";

const shellI18nStore = useShellI18nStore();
const memoryStore = useMemoryCardStore();
const { browseBusy, browseResults, browseRoot, canUndelete, loading, selectedCardPath, selectedSave, selectedSlotId, slots, status, statusTone } = storeToRefs(memoryStore);

const slotRows = computed(() => [slots.value["slot-1"], slots.value["slot-2"]].filter(Boolean));

const canCopyLeft = computed(() => {
  return !!selectedSave.value && !selectedSave.value.isMultiBlock && selectedSlotId.value === "slot-2" && !!slots.value["slot-1"]?.filePath;
});

const canCopyRight = computed(() => {
  return !!selectedSave.value && !selectedSave.value.isMultiBlock && selectedSlotId.value === "slot-1" && !!slots.value["slot-2"]?.filePath;
});

function createIconDataUrl(icon) {
  const frame = Array.isArray(icon?.frames) && icon.frames.length ? icon.frames[0] : icon;
  const pixels = Array.isArray(frame?.pixels) ? frame.pixels : [];
  const width = Number(frame?.width || icon?.width || 16);
  const height = Number(frame?.height || icon?.height || 16);
  if (!pixels.length || typeof document === "undefined") {
    return "";
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return "";
  }

  const imageData = ctx.createImageData(width, height);
  imageData.data.set(new Uint8ClampedArray(pixels));
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

function promptRename() {
  if (!selectedSave.value) {
    return;
  }
  const nextName = window.prompt(shellI18nStore.t("tools.enterNewName", "Enter a new save name."), selectedSave.value.title || "");
  if (nextName === null) {
    return;
  }
  void memoryStore.renameSelectedSave(nextName);
}

function confirmDelete() {
  if (!selectedSave.value) {
    return;
  }
  const ok = window.confirm(
    shellI18nStore.tf("tools.confirmDeleteSave", { name: selectedSave.value.title || shellI18nStore.t("desktopShell.memory.saveLabel", "save") }, 'Are you sure you want to delete "{{name}}"?')
  );
  if (!ok) {
    return;
  }
  void memoryStore.deleteSelectedSave();
}

function confirmFormat(slotId) {
  const slot = slots.value[slotId];
  if (!slot?.filePath) {
    return;
  }
  const ok = window.confirm(shellI18nStore.t("tools.confirmFormatCard", "Format this memory card? All data will be lost."));
  if (!ok) {
    return;
  }
  void memoryStore.formatCard(slotId);
}

function formatModified(value) {
  const stamp = Number(value || 0);
  if (!Number.isFinite(stamp) || stamp <= 0) {
    return "";
  }
  return new Date(stamp).toLocaleString();
}

function formatBytes(value) {
  const size = Number(value || 0);
  if (!Number.isFinite(size) || size <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let current = size;
  let index = 0;
  while (current >= 1024 && index < units.length - 1) {
    current /= 1024;
    index += 1;
  }
  const decimals = current >= 100 ? 0 : current >= 10 ? 1 : 2;
  return `${current.toFixed(decimals)} ${units[index]}`;
}

onMounted(() => {
  memoryStore.initialize();
});
</script>

<template>
  <div class="desktop-settings-stack">
    <section class="subcard desktop-tool-surface-card">
      <div class="card-header-row">
        <div>
          <h4>{{ shellI18nStore.t("tools.memoryCardEditor", "Memory Card Editor") }}</h4>
          <p class="meta-line">
            {{
              shellI18nStore.t(
                "desktopShell.memory.editorDescription",
                "Dual-slot shell editor using the native memory-card bridge instead of the legacy tool renderer."
              )
            }}
          </p>
        </div>
        <span class="pill">{{ selectedSave ? selectedSave.title : shellI18nStore.t("desktopShell.memory.noSaveSelected", "No save selected") }}</span>
      </div>

      <div class="button-row desktop-memory-action-bar">
        <button type="button" class="action-button" :disabled="!selectedSave" @click="confirmDelete">{{ shellI18nStore.t("buttons.delete", "Delete") }}</button>
        <button type="button" class="action-button" :disabled="!selectedSave" @click="promptRename">{{ shellI18nStore.t("tools.rename", "Rename") }}</button>
        <button type="button" class="action-button" :disabled="!selectedSave || selectedSave.isMultiBlock" @click="memoryStore.exportSelectedSave">
          {{ shellI18nStore.t("tools.export", "Export") }}
        </button>
        <button type="button" class="action-button" :disabled="!canUndelete" @click="memoryStore.undeleteLastSave">{{ shellI18nStore.t("tools.undelete", "Undelete") }}</button>
        <button type="button" class="action-button" :disabled="!canCopyLeft" @click="memoryStore.copySelectedSaveTo('slot-1')">{{ shellI18nStore.t("tools.copyToLeft", "Copy To Left") }}</button>
        <button type="button" class="action-button" :disabled="!canCopyRight" @click="memoryStore.copySelectedSaveTo('slot-2')">{{ shellI18nStore.t("tools.copyToRight", "Copy To Right") }}</button>
      </div>

      <p class="meta-line">{{ shellI18nStore.t("desktopShell.memory.selectedCard", "Selected card") }}: {{ selectedCardPath || shellI18nStore.t("desktopShell.community.none", "none") }}</p>
      <p v-if="status" class="desktop-status-line" :data-tone="statusTone || 'info'">{{ status }}</p>
    </section>

    <div class="desktop-memory-grid">
      <section v-for="slot in slotRows" :key="slot.id" class="subcard desktop-memory-slot-card">
        <div class="card-header-row">
          <div>
            <h4>{{ slot.id === 'slot-1' ? shellI18nStore.t("tools.memoryCard1", "Memory Card 1") : shellI18nStore.t("tools.memoryCard2", "Memory Card 2") }}</h4>
            <p class="meta-line">{{ slot.fileName }}</p>
          </div>
          <span class="pill">{{ slot.format || shellI18nStore.t("tools.noCardLoaded", "No card") }}</span>
        </div>

        <p class="meta-line">{{ shellI18nStore.t("tools.freeBlocks", "Free Blocks") }}: {{ slot.freeBlocks }}</p>
        <div v-if="slot.filePath" class="desktop-code-block">{{ slot.filePath }}</div>
        <p v-if="slot.message" class="meta-line">{{ slot.message }}</p>

        <div class="button-row">
          <button type="button" class="action-button" :disabled="loading" @click="memoryStore.openCard(slot.id)">
            {{ loading ? shellI18nStore.t("desktopShell.states.loading", "Loading...") : shellI18nStore.t("tools.openCard", "Open Card") }}
          </button>
          <button type="button" class="action-button" @click="memoryStore.createEmptyCard(slot.id)">{{ shellI18nStore.t("tools.createEmptyCard", "Create Empty") }}</button>
          <button type="button" class="action-button" :disabled="!slot.filePath" @click="confirmFormat(slot.id)">{{ shellI18nStore.t("tools.format", "Format") }}</button>
          <button type="button" class="action-button" :disabled="!slot.filePath" @click="memoryStore.importSaveToSlot(slot.id)">{{ shellI18nStore.t("tools.importSave", "Import Save") }}</button>
          <button type="button" class="action-button" :disabled="!slot.filePath" @click="memoryStore.openCardFolder(slot.id)">{{ shellI18nStore.t("tools.openFolder", "Open Folder") }}</button>
        </div>

        <div class="desktop-memory-save-list">
          <button
            v-for="save in slot.saves"
            :key="save.key"
            type="button"
            class="desktop-memory-save-row"
            :class="{ 'is-selected': selectedSlotId === slot.id && selectedSave?.slot === save.slot }"
            @click="memoryStore.selectSave(slot.id, save)"
          >
            <span class="desktop-memory-save-icon">
              <img v-if="createIconDataUrl(save.icon)" :src="createIconDataUrl(save.icon)" :alt="shellI18nStore.t('tools.saveIconAlt', 'Save Icon')" />
              <i v-else class="fas fa-save"></i>
            </span>
            <span class="desktop-memory-save-main">
              <strong>{{ save.title }}</strong>
              <small>{{ save.productCode || shellI18nStore.t("desktopShell.memory.noCode", "No code") }}</small>
            </span>
            <span class="desktop-memory-save-meta">
              <small>{{ save.blocks }}{{ save.isMultiBlock ? '+' : '' }} {{ shellI18nStore.t("desktopShell.memory.blockLabel", save.blocks === 1 ? "block" : "blocks") }}</small>
            </span>
          </button>
          <div v-if="!slot.saves.length" class="desktop-tool-empty-state">{{ shellI18nStore.t("desktopShell.memory.noSavesInSlot", "No saves loaded in this slot.") }}</div>
        </div>
      </section>
    </div>

    <section class="subcard desktop-tool-surface-card">
      <div class="card-header-row">
        <div>
          <h4>{{ shellI18nStore.t("tools.searchMemoryCards", "Browse memory cards") }}</h4>
          <p class="meta-line">{{ shellI18nStore.t("desktopShell.memory.browseDescription", "Scan a folder for card files and load them into either slot.") }}</p>
        </div>
        <span class="pill">{{ browseResults.length }} {{ shellI18nStore.t("desktopShell.memory.cardsLabel", "cards") }}</span>
      </div>

      <div class="desktop-path-entry-row">
        <input :value="browseRoot" type="text" :placeholder="shellI18nStore.t('desktopShell.memory.searchRootFolder', 'Search root folder')" @input="memoryStore.setBrowseRoot($event.target.value)" />
        <button type="button" class="action-button" :disabled="browseBusy" @click="memoryStore.pickBrowseRoot">{{ shellI18nStore.t("desktopShell.memory.browseRoot", "Browse Root") }}</button>
        <button type="button" class="action-button" :disabled="browseBusy" @click="memoryStore.browseCards()">
          {{ browseBusy ? shellI18nStore.t("desktopShell.memory.scanning", "Scanning...") : shellI18nStore.t("desktopShell.memory.scan", "Scan") }}
        </button>
      </div>

      <div class="desktop-tool-list">
        <div v-for="card in browseResults" :key="card.path" class="desktop-tool-list-row">
          <div>
            <strong>{{ card.name }}</strong>
            <small>{{ card.path }}</small>
            <small>{{ formatBytes(card.size) }}{{ formatModified(card.modified) ? ` | ${formatModified(card.modified)}` : '' }}</small>
          </div>
          <div class="desktop-tool-list-row-meta">
            <button type="button" class="action-button" @click="memoryStore.loadBrowsedCard('slot-1', card.path)">{{ shellI18nStore.t("desktopShell.memory.loadLeft", "Load Left") }}</button>
            <button type="button" class="action-button" @click="memoryStore.loadBrowsedCard('slot-2', card.path)">{{ shellI18nStore.t("desktopShell.memory.loadRight", "Load Right") }}</button>
          </div>
        </div>
        <div v-if="!browseResults.length" class="desktop-tool-empty-state">{{ shellI18nStore.t("tools.noMemoryCards", "No memory cards scanned yet.") }}</div>
      </div>
    </section>
  </div>
</template>
