<script setup>
import { computed, onMounted, onBeforeUnmount } from "vue";
import { storeToRefs } from "pinia";
import { useSettingsToolsStore } from "../stores/settings-tools";
import { useGamepadTesterStore } from "../stores/gamepad-tester";
import { useShellI18nStore } from "../stores/shell-i18n";
import { formatAxisValue, formatButtonValue, getAxisName, getButtonName, getGamepadType } from "../utils/gamepad-metadata";

const gamepadStore = useGamepadTesterStore();
const shellI18nStore = useShellI18nStore();
const settingsToolsStore = useSettingsToolsStore();
const { gamepads, running, selectedGamepad, selectedIndex, status, statusTone, supported } = storeToRefs(gamepadStore);

const activeButtons = computed(() => (selectedGamepad.value?.buttons || []).filter((button) => button.pressed || button.value > 0.05));
const activeAxes = computed(() => (selectedGamepad.value?.axes || []).map((value, index) => ({ index, value })).filter((row) => Math.abs(row.value) > 0.05));
const buttonRows = computed(() =>
  (selectedGamepad.value?.buttons || []).map((button) => ({
    ...button,
    label: getButtonName(button.index, selectedGamepad.value?.id),
    percent: Math.max(0, Math.min(100, Math.round(Number(button.value || 0) * 100)))
  }))
);
const axisRows = computed(() =>
  (selectedGamepad.value?.axes || []).map((value, index) => ({
    index,
    label: getAxisName(index, selectedGamepad.value?.id),
    value: Number(value || 0),
    percent: Math.max(0, Math.min(100, Math.round(Math.abs(Number(value || 0)) * 100)))
  }))
);

onMounted(() => {
  gamepadStore.initialize();
  gamepadStore.start();
});

onBeforeUnmount(() => {
  gamepadStore.stop();
});
</script>

<template>
  <div class="desktop-settings-stack">
    <section class="subcard desktop-tool-surface-card">
      <div class="card-header-row">
        <div>
          <h4>{{ shellI18nStore.t("tools.gamepadTester", "Gamepad Tester") }}</h4>
          <p class="meta-line">{{ shellI18nStore.t("desktopShell.gamepadTester.description", "Shell-native controller polling through the browser Gamepad API.") }}</p>
        </div>
        <span class="pill">{{ gamepads.length }} {{ shellI18nStore.t("desktopShell.gamepadTester.padsLabel", "pads") }}</span>
      </div>

      <div class="button-row">
        <button type="button" class="action-button" :disabled="running || !supported" @click="gamepadStore.start">{{ shellI18nStore.t("tools.gamepad.startTesting", "Start Testing") }}</button>
        <button type="button" class="action-button" :disabled="!running" @click="gamepadStore.stop">{{ shellI18nStore.t("tools.gamepad.stopTesting", "Stop Testing") }}</button>
        <button type="button" class="action-button" :disabled="!supported" @click="gamepadStore.refresh">{{ shellI18nStore.t("tools.gamepad.refreshGamepads", "Refresh") }}</button>
        <button type="button" class="action-button" @click="settingsToolsStore.openPanel('gamepad')">{{ shellI18nStore.t("desktopShell.gamepadTester.openProfiles", "Open Gamepad Profiles") }}</button>
      </div>

      <p v-if="status" class="desktop-status-line" :data-tone="statusTone || 'info'">{{ status }}</p>
    </section>

    <div class="desktop-tool-card-grid desktop-gamepad-grid">
      <article class="subcard desktop-tool-surface-card">
        <div class="card-header-row">
          <h4>{{ shellI18nStore.t("tools.gamepad.connectedGamepads", "Connected gamepads") }}</h4>
          <span class="pill">{{ selectedGamepad ? `${shellI18nStore.t("desktopShell.gamepadTester.pad", "Pad")} ${selectedGamepad.index}` : shellI18nStore.t("desktopShell.community.none", "None") }}</span>
        </div>
        <div class="desktop-tool-list">
          <button
            v-for="pad in gamepads"
            :key="pad.key"
            type="button"
            class="desktop-tool-host-card"
            :class="{ 'is-active': selectedIndex === pad.index }"
            @click="gamepadStore.selectGamepad(pad.index)"
          >
            <div class="card-header-row">
              <strong>{{ pad.id }}</strong>
              <span class="pill">{{ pad.connected ? shellI18nStore.t("tools.gamepad.connectedState", "Connected") : shellI18nStore.t("desktopShell.gamepadTester.disconnected", "Disconnected") }}</span>
            </div>
            <p class="meta-line">{{ shellI18nStore.t("tools.gamepad.index", "Index") }} {{ pad.index }} | {{ shellI18nStore.t("tools.gamepad.mappingLabel", "mapping") }} {{ pad.mapping || shellI18nStore.t("tools.unknown", "unknown") }}</p>
          </button>
          <div v-if="!gamepads.length" class="desktop-tool-empty-state">{{ shellI18nStore.t("tools.gamepad.noGamepadsDetected", "No gamepads detected.") }}</div>
        </div>
      </article>

      <article class="subcard desktop-tool-surface-card">
        <div class="card-header-row">
          <h4>{{ shellI18nStore.t("desktopShell.gamepadTester.selectedGamepad", "Selected gamepad") }}</h4>
          <span class="pill">{{ selectedGamepad ? getGamepadType(selectedGamepad.id) : shellI18nStore.t("desktopShell.gamepadTester.notAvailable", "n/a") }}</span>
        </div>
        <div v-if="selectedGamepad" class="desktop-tool-list">
          <div class="desktop-tool-list-row">
            <div>
              <strong>ID</strong>
              <small>{{ selectedGamepad.id }}</small>
            </div>
            <div class="desktop-tool-list-row-meta"><small>{{ shellI18nStore.t("tools.gamepad.index", "Index") }} {{ selectedGamepad.index }}</small></div>
          </div>
          <div class="desktop-tool-list-row">
            <div>
              <strong>{{ shellI18nStore.t("tools.gamepad.buttons", "Buttons") }}</strong>
              <small>{{ selectedGamepad.buttons.length }} {{ shellI18nStore.t("desktopShell.gamepadTester.total", "total") }}</small>
            </div>
            <div class="desktop-tool-list-row-meta"><small>{{ activeButtons.length }} {{ shellI18nStore.t("desktopShell.gamepadTester.active", "active") }}</small></div>
          </div>
          <div class="desktop-tool-list-row">
            <div>
              <strong>{{ shellI18nStore.t("tools.gamepad.axes", "Axes") }}</strong>
              <small>{{ selectedGamepad.axes.length }} {{ shellI18nStore.t("desktopShell.gamepadTester.total", "total") }}</small>
            </div>
            <div class="desktop-tool-list-row-meta"><small>{{ activeAxes.length }} {{ shellI18nStore.t("desktopShell.gamepadTester.active", "active") }}</small></div>
          </div>
          <div class="desktop-tool-list-row">
            <div>
              <strong>{{ shellI18nStore.t("tools.gamepad.timestamp", "Timestamp") }}</strong>
              <small>{{ shellI18nStore.t("desktopShell.gamepadTester.timestampDescription", "Last browser gamepad state update") }}</small>
            </div>
            <div class="desktop-tool-list-row-meta"><small>{{ selectedGamepad.timestamp || 0 }}</small></div>
          </div>
        </div>
        <div v-else class="desktop-tool-empty-state">{{ shellI18nStore.t("desktopShell.gamepadTester.selectToInspect", "Select a connected gamepad to inspect it.") }}</div>
      </article>
    </div>

    <div class="desktop-gamepad-state-grid">
      <section class="subcard desktop-tool-surface-card">
        <div class="card-header-row">
          <h4>{{ shellI18nStore.t("tools.gamepad.buttons", "Buttons") }}</h4>
          <span class="pill">{{ buttonRows.length }}</span>
        </div>
        <div class="desktop-gamepad-meter-list">
          <div v-for="button in buttonRows" :key="button.index" class="desktop-gamepad-meter-row" :class="{ 'is-active': button.pressed || button.value > 0.05 }">
            <div>
              <div class="desktop-gamepad-meter-label">
                <strong>{{ button.label }}</strong>
                <small>{{ shellI18nStore.t("desktopShell.gamepadTester.button", "Button") }} {{ button.index }}</small>
              </div>
              <div class="desktop-gamepad-meter-track">
                <span class="desktop-gamepad-meter-fill" :style="{ width: `${button.percent}%` }"></span>
              </div>
            </div>
            <div class="desktop-tool-list-row-meta">
              <small>{{ button.pressed ? shellI18nStore.t("desktopShell.gamepadTester.pressed", "Pressed") : (button.touched ? shellI18nStore.t("desktopShell.gamepadTester.touched", "Touched") : shellI18nStore.t("desktopShell.community.idle", "Idle")) }}</small>
              <small>{{ formatButtonValue(button.value) }}</small>
            </div>
          </div>
          <div v-if="!buttonRows.length" class="desktop-tool-empty-state">{{ shellI18nStore.t("desktopShell.gamepadTester.noButtons", "No buttons available for the selected gamepad.") }}</div>
        </div>
      </section>

      <section class="subcard desktop-tool-surface-card">
        <div class="card-header-row">
          <h4>{{ shellI18nStore.t("tools.gamepad.axes", "Axes") }}</h4>
          <span class="pill">{{ axisRows.length }}</span>
        </div>
        <div class="desktop-gamepad-meter-list">
          <div v-for="axis in axisRows" :key="axis.index" class="desktop-gamepad-meter-row" :class="{ 'is-active': Math.abs(axis.value) > 0.05 }">
            <div>
              <div class="desktop-gamepad-meter-label">
                <strong>{{ axis.label }}</strong>
                <small>{{ shellI18nStore.t("desktopShell.gamepadTester.axis", "Axis") }} {{ axis.index }}</small>
              </div>
              <div class="desktop-gamepad-meter-track">
                <span class="desktop-gamepad-meter-fill" :style="{ width: `${axis.percent}%` }"></span>
              </div>
            </div>
            <div class="desktop-tool-list-row-meta"><small>{{ formatAxisValue(axis.value) }}</small></div>
          </div>
          <div v-if="!axisRows.length" class="desktop-tool-empty-state">{{ shellI18nStore.t("desktopShell.gamepadTester.noAxes", "No axes available for the selected gamepad.") }}</div>
        </div>
      </section>
    </div>
  </div>
</template>
