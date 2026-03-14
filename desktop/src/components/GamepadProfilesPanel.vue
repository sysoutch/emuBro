<script setup>
import { computed, onMounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { GAMEPAD_BINDING_ACTIONS, GAMEPAD_BINDING_LABELS } from "../utils/gamepad-bindings";
import { useGamepadProfilesStore } from "../stores/gamepad-profiles";
import { useShellI18nStore } from "../stores/shell-i18n";
import { useToolsWorkspaceStore } from "../stores/tools-workspace";
import { useWorkspaceStore } from "../stores/workspace";

const workspaceStore = useWorkspaceStore();
const gamepadProfilesStore = useGamepadProfilesStore();
const shellI18nStore = useShellI18nStore();
const toolsWorkspaceStore = useToolsWorkspaceStore();

const {
  activePlatformId,
  activeBindings,
  configuredProfileCount,
  hasDraftChanges,
  saving,
  status,
  statusTone
} = storeToRefs(gamepadProfilesStore);
const { platforms } = storeToRefs(workspaceStore);

const platformOptions = computed(() =>
  (platforms.value || []).map((platform, index) => ({
    id: String(platform?.shortName || platform?.id || `platform-${index + 1}`)
      .trim()
      .toLowerCase(),
    label: String(platform?.label || platform?.platform || platform?.name || `Platform ${index + 1}`).trim()
  }))
);

const activePlatform = computed(() => platformOptions.value.find((platform) => platform.id === activePlatformId.value) || null);
const keyboardBindingCount = computed(() => Object.keys(activeBindings.value?.keyboard || {}).length);
const gamepadBindingCount = computed(() => Object.keys(activeBindings.value?.gamepad || {}).length);

function getBindingValue(channel, action) {
  return String(activeBindings.value?.[channel]?.[action] || "").trim();
}

function updateBinding(channel, action, event) {
  gamepadProfilesStore.setBinding(channel, action, event?.target?.value, activePlatformId.value);
}

onMounted(async () => {
  await workspaceStore.initialize();
  gamepadProfilesStore.initialize(platformOptions.value);
});

watch(
  platformOptions,
  (nextPlatforms) => {
    gamepadProfilesStore.syncPlatforms(nextPlatforms);
  },
  { deep: true }
);
</script>

<template>
  <div class="desktop-settings-stack">
    <section class="subcard">
      <div class="card-header-row">
        <div>
          <h4>{{ shellI18nStore.t("desktopShell.settingsTools.platformGamepadDefaults", "Platform Gamepad Profiles") }}</h4>
          <p class="meta-line">{{ shellI18nStore.t("desktopShell.gamepadProfiles.description", "These defaults apply to all emulators of a platform unless an emulator override replaces them.") }}</p>
        </div>
        <span class="pill">{{ configuredProfileCount }} {{ shellI18nStore.t("desktopShell.gamepadProfiles.savedLabel", "saved") }}</span>
      </div>

      <div class="button-row">
        <button type="button" class="action-button" :disabled="saving || !hasDraftChanges" @click="gamepadProfilesStore.save">{{ shellI18nStore.t("desktopShell.gamepadProfiles.saveProfiles", "Save Profiles") }}</button>
        <button type="button" class="action-button" :disabled="saving || !hasDraftChanges" @click="gamepadProfilesStore.resetDraft">{{ shellI18nStore.t("desktopShell.gamepadProfiles.resetDraft", "Reset Draft") }}</button>
        <button type="button" class="action-button" :disabled="!activePlatformId" @click="gamepadProfilesStore.clearActivePlatform">{{ shellI18nStore.t("desktopShell.gamepadProfiles.clearSelectedPlatform", "Clear Selected Platform") }}</button>
        <button type="button" class="action-button" @click="toolsWorkspaceStore.openTool('gamepad')">{{ shellI18nStore.t("desktopShell.gamepadProfiles.openGamepadTester", "Open Gamepad Tester") }}</button>
      </div>

      <p v-if="status" class="desktop-status-line" :data-tone="statusTone || 'info'">{{ status }}</p>
    </section>

    <div class="desktop-tool-card-grid desktop-gamepad-profile-layout">
      <section class="subcard desktop-tool-surface-card">
        <div class="card-header-row">
          <h4>{{ shellI18nStore.t("desktopShell.gamepadProfiles.platforms", "Platforms") }}</h4>
          <span class="pill">{{ platformOptions.length }}</span>
        </div>

        <div class="desktop-settings-nav-list">
          <button
            v-for="platform in platformOptions"
            :key="platform.id"
            type="button"
            class="desktop-settings-nav-button"
            :class="{ 'is-active': activePlatformId === platform.id }"
            @click="gamepadProfilesStore.selectPlatform(platform.id, platformOptions)"
          >
            <strong>{{ platform.label }}</strong>
            <small>{{ (gamepadProfilesStore.draftProfiles[platform.id]?.keyboard && Object.keys(gamepadProfilesStore.draftProfiles[platform.id].keyboard).length) || 0 }} {{ shellI18nStore.t("desktopShell.gamepadProfiles.keyboardLabel", "keyboard") }} / {{ (gamepadProfilesStore.draftProfiles[platform.id]?.gamepad && Object.keys(gamepadProfilesStore.draftProfiles[platform.id].gamepad).length) || 0 }} {{ shellI18nStore.t("desktopShell.gamepadProfiles.gamepadBindingsLabel", "gamepad bindings") }}</small>
          </button>
        </div>

        <div v-if="!platformOptions.length" class="desktop-tool-empty-state">
          {{ shellI18nStore.t("desktopShell.gamepadProfiles.noPlatforms", "No platforms are loaded yet. Refresh the workspace and return to this panel.") }}
        </div>
      </section>

      <section class="subcard desktop-tool-surface-card">
        <div class="card-header-row">
          <div>
            <h4>{{ activePlatform?.label || shellI18nStore.t("desktopShell.gamepadProfiles.noPlatformSelected", "No Platform Selected") }}</h4>
            <p class="meta-line">{{ activePlatform ? `${shellI18nStore.t("desktopShell.gamepadProfiles.profileKeyLabel", "Profile key")}: ${activePlatform.id}` : shellI18nStore.t("desktopShell.gamepadProfiles.choosePlatform", "Choose a platform to edit defaults.") }}</p>
          </div>
          <span class="pill">{{ activePlatform ? shellI18nStore.t("desktopShell.gamepadProfiles.editable", "Editable") : shellI18nStore.t("desktopShell.community.idle", "Idle") }}</span>
        </div>

        <div v-if="activePlatform" class="desktop-gamepad-summary-grid">
          <div class="metric">
            <span class="metric-label">{{ shellI18nStore.t("desktopShell.gamepadProfiles.keyboard", "Keyboard") }}</span>
            <strong>{{ keyboardBindingCount }}</strong>
            <small>{{ shellI18nStore.t("desktopShell.gamepadProfiles.keyboardDescription", "Default keyboard actions stored for this platform.") }}</small>
          </div>
          <div class="metric">
            <span class="metric-label">{{ shellI18nStore.t("tools.gamepad.mapping", "Gamepad") }}</span>
            <strong>{{ gamepadBindingCount }}</strong>
            <small>{{ shellI18nStore.t("desktopShell.gamepadProfiles.gamepadDescription", "Default controller actions stored for this platform.") }}</small>
          </div>
        </div>

        <div v-if="activePlatform" class="desktop-emulator-gamepad-grid">
          <div class="desktop-emulator-gamepad-header">
            <span>{{ shellI18nStore.t("desktopShell.gamepadProfiles.action", "Action") }}</span>
            <span>{{ shellI18nStore.t("desktopShell.gamepadProfiles.keyboardDefault", "Keyboard Default") }}</span>
            <span>{{ shellI18nStore.t("desktopShell.gamepadProfiles.gamepadDefault", "Gamepad Default") }}</span>
          </div>

          <template v-for="action in GAMEPAD_BINDING_ACTIONS" :key="action">
            <div class="desktop-emulator-gamepad-row">
              <span class="desktop-emulator-gamepad-action">{{ GAMEPAD_BINDING_LABELS[action] || action }}</span>
              <label class="desktop-emulator-gamepad-cell">
                <input
                  class="desktop-emulator-gamepad-input"
                  type="text"
                  :value="getBindingValue('keyboard', action)"
                  :placeholder="shellI18nStore.t('desktopShell.gamepadProfiles.keyboardPlaceholder', 'e.g. key:Space, ArrowUp')"
                  @input="updateBinding('keyboard', action, $event)"
                />
                <span class="desktop-emulator-gamepad-platform">{{ shellI18nStore.t("desktopShell.gamepadProfiles.keyboardHint", "Leave empty to inherit emulator-specific mapping only.") }}</span>
              </label>
              <label class="desktop-emulator-gamepad-cell">
                <input
                  class="desktop-emulator-gamepad-input"
                  type="text"
                  :value="getBindingValue('gamepad', action)"
                  :placeholder="shellI18nStore.t('desktopShell.gamepadProfiles.gamepadPlaceholder', 'e.g. button0, axis1+, 32776')"
                  @input="updateBinding('gamepad', action, $event)"
                />
                <span class="desktop-emulator-gamepad-platform">{{ shellI18nStore.t("desktopShell.gamepadProfiles.gamepadHint", "Use the tester to verify button and axis ids before saving.") }}</span>
              </label>
            </div>
          </template>
        </div>

        <div v-else class="desktop-tool-empty-state">
          {{ shellI18nStore.t("desktopShell.gamepadProfiles.emptyState", "Select a platform on the left to edit shared gamepad defaults.") }}
        </div>
      </section>
    </div>
  </div>
</template>
