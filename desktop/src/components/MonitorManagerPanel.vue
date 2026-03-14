<script setup>
import { onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useMonitorManagerStore } from "../stores/monitor-manager";
import { useShellI18nStore } from "../stores/shell-i18n";

const shellI18nStore = useShellI18nStore();
const monitorStore = useMonitorManagerStore();
const { isWindows, loading, monitors, status, statusTone } = storeToRefs(monitorStore);

onMounted(() => {
  void monitorStore.initialize();
});
</script>

<template>
  <div class="desktop-settings-stack">
    <section class="subcard desktop-tool-surface-card">
      <div class="card-header-row">
        <div>
          <h4>{{ shellI18nStore.t("tools.monitorManager", "Monitor Manager") }}</h4>
          <p class="meta-line">{{ shellI18nStore.t("desktopShell.monitor.description", "Shell-native monitor controls backed by the existing MultiMonitorTool bridge.") }}</p>
        </div>
        <span class="pill">{{ monitors.length }} {{ shellI18nStore.t("desktopShell.monitor.monitorsLabel", "monitors") }}</span>
      </div>

      <div class="button-row">
        <button type="button" class="action-button" :disabled="loading" @click="monitorStore.refresh()">
          {{ loading ? shellI18nStore.t("desktopShell.tools.refreshing", "Refreshing...") : shellI18nStore.t("tools.monitor.refreshMonitors", "Refresh Monitors") }}
        </button>
        <button type="button" class="action-button" :disabled="loading" @click="monitorStore.detect">{{ shellI18nStore.t("tools.monitor.detectMonitors", "Detect Monitors") }}</button>
      </div>

      <p v-if="!isWindows" class="desktop-status-line" data-tone="warning">{{ shellI18nStore.t("desktopShell.monitor.windowsOnly", "Monitor tool is only available on Windows.") }}</p>
      <p v-if="status" class="desktop-status-line" :data-tone="statusTone || 'info'">{{ status }}</p>
    </section>

    <div class="desktop-tool-card-grid">
      <article v-for="monitor in monitors" :key="monitor.key" class="desktop-tool-surface-card">
        <div class="card-header-row">
          <div>
            <h4>{{ monitor.name }}</h4>
            <p class="meta-line">{{ monitor.width }} x {{ monitor.height }} | {{ shellI18nStore.t("tools.monitor.orientation", "orientation") }} {{ monitor.orientation }}</p>
          </div>
          <span class="pill">{{ monitor.isPrimary ? shellI18nStore.t("tools.monitor.primary", "Primary") : (monitor.connected ? shellI18nStore.t("tools.monitor.connected", "Connected") : shellI18nStore.t("tools.monitor.disconnected", "Disconnected")) }}</span>
        </div>

        <div class="desktop-code-block">{{ monitor.deviceId || monitor.id }}</div>

        <div class="form-grid">
          <label class="field">
            <span>{{ shellI18nStore.t("tools.monitor.orientation", "Orientation") }}</span>
            <select :value="String(monitor.orientation)" @change="monitorStore.setOrientation(monitor.index, $event.target.value)">
              <option value="0">{{ shellI18nStore.t("tools.monitor.orientationNormal", "Normal (0deg)") }}</option>
              <option value="90">{{ shellI18nStore.t("tools.monitor.orientationLandscape", "Landscape (90deg)") }}</option>
              <option value="180">{{ shellI18nStore.t("tools.monitor.orientationFlipped", "Flipped (180deg)") }}</option>
              <option value="270">{{ shellI18nStore.t("tools.monitor.orientationPortrait", "Portrait (270deg)") }}</option>
            </select>
          </label>
          <label class="field">
            <span>{{ shellI18nStore.t("tools.monitor.displayState", "Display state") }}</span>
            <select @change="monitorStore.setDisplayState(monitor.index, $event.target.value)">
              <option value="enable">{{ shellI18nStore.t("tools.monitor.enable", "Enable") }}</option>
              <option value="disable">{{ shellI18nStore.t("tools.monitor.disable", "Disable") }}</option>
            </select>
          </label>
        </div>

        <div class="button-row">
          <button type="button" class="action-button" :disabled="!isWindows || monitor.isPrimary" @click="monitorStore.setPrimary(monitor.index)">
            {{ monitor.isPrimary ? shellI18nStore.t("tools.monitor.isPrimary", "Is Primary") : shellI18nStore.t("tools.monitor.setAsPrimary", "Set as Primary") }}
          </button>
        </div>
      </article>
      <div v-if="!monitors.length" class="desktop-tool-empty-state">{{ shellI18nStore.t("tools.monitor.noMonitorsDetected", "No monitor data available yet.") }}</div>
    </div>
  </div>
</template>
