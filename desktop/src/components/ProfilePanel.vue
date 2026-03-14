<script setup>
import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useProfileStore } from "../stores/profile";
import { useShellI18nStore } from "../stores/shell-i18n";
import { useWorkspaceStore } from "../stores/workspace";

const shellI18nStore = useShellI18nStore();
const profileStore = useProfileStore();
const workspaceStore = useWorkspaceStore();
const { draft, hasDraftChanges, loading, status, statusTone } = storeToRefs(profileStore);
const fileInput = ref(null);

function triggerAvatarPicker() {
  fileInput.value?.click();
}

function onAvatarSelected(event) {
  const file = event?.target?.files?.[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === "string") {
      profileStore.setAvatar(reader.result);
    }
  };
  reader.readAsDataURL(file);
  event.target.value = "";
}

onMounted(async () => {
  await Promise.all([profileStore.initialize(), workspaceStore.initialize()]);
});
</script>

<template>
  <section class="subcard desktop-section-card">
    <div class="card-header-row">
      <div>
        <h4>{{ shellI18nStore.t("desktopShell.settingsTools.panels.profile.label", "Profile") }}</h4>
        <p class="meta-line">{{ shellI18nStore.t("desktopShell.profile.description", "Local identity settings moved out of the old profile modal and into the shell workspace.") }}</p>
      </div>
      <span class="pill">{{ hasDraftChanges ? shellI18nStore.t("desktopShell.themeWindow.unsavedChanges", "Unsaved") : shellI18nStore.t("desktopShell.states.saved", "Saved") }}</span>
    </div>

    <div class="desktop-profile-top">
      <img class="desktop-profile-avatar" :src="draft.avatar" :alt="shellI18nStore.t('desktopShell.profile.avatarAlt', 'Profile avatar')" />
      <div class="desktop-profile-identity">
        <strong>{{ draft.displayName || shellI18nStore.t("desktopShell.profile.defaultDisplayName", "Bro") }}</strong>
        <small>@{{ draft.username || shellI18nStore.t("desktopShell.profile.defaultUsername", "bro") }}</small>
        <small>{{ draft.status || shellI18nStore.t("desktopShell.profile.statusOnline", "online") }}</small>
        <div class="button-row">
          <button type="button" class="action-button" @click="triggerAvatarPicker">{{ shellI18nStore.t("desktopShell.profile.changeAvatar", "Change Avatar") }}</button>
          <button type="button" class="action-button" @click="profileStore.resetAvatar">{{ shellI18nStore.t("desktopShell.profile.resetAvatar", "Reset Avatar") }}</button>
        </div>
      </div>

      <div class="desktop-gamepad-summary-grid">
        <div class="metric">
          <span class="metric-label">{{ shellI18nStore.t("desktopShell.settingsTools.games", "Games") }}</span>
          <strong>{{ workspaceStore.stats.games }}</strong>
          <small>{{ shellI18nStore.t("desktopShell.profile.loadedLibraryEntries", "Loaded library entries.") }}</small>
        </div>
        <div class="metric">
          <span class="metric-label">{{ shellI18nStore.t("desktopShell.settingsTools.emulators", "Emulators") }}</span>
          <strong>{{ workspaceStore.stats.emulators }}</strong>
          <small>{{ shellI18nStore.t("desktopShell.profile.loadedEmulatorEntries", "Loaded emulator entries.") }}</small>
        </div>
      </div>
    </div>

    <input ref="fileInput" type="file" accept="image/*" hidden @change="onAvatarSelected" />

    <div class="form-grid">
      <label class="field">
        <span>{{ shellI18nStore.t("desktopShell.profile.displayName", "Display name") }}</span>
        <input :value="draft.displayName" type="text" @input="profileStore.setField('displayName', $event.target.value)" />
      </label>

      <label class="field">
        <span>{{ shellI18nStore.t("desktopShell.profile.username", "Username") }}</span>
        <input :value="draft.username" type="text" @input="profileStore.setField('username', $event.target.value)" />
      </label>

      <label class="field">
        <span>{{ shellI18nStore.t("desktopShell.profile.status", "Status") }}</span>
        <select :value="draft.status" @change="profileStore.setField('status', $event.target.value)">
          <option value="online">{{ shellI18nStore.t("desktopShell.profile.statusOnline", "Online") }}</option>
          <option value="away">{{ shellI18nStore.t("desktopShell.profile.statusAway", "Away") }}</option>
          <option value="busy">{{ shellI18nStore.t("desktopShell.profile.statusBusy", "Busy") }}</option>
          <option value="invisible">{{ shellI18nStore.t("desktopShell.profile.statusInvisible", "Invisible") }}</option>
        </select>
      </label>

      <label class="field">
        <span>{{ shellI18nStore.t("desktopShell.profile.statusMessage", "Status message") }}</span>
        <input :value="draft.statusMessage" type="text" @input="profileStore.setField('statusMessage', $event.target.value)" />
      </label>

      <label class="field field-wide">
        <span>{{ shellI18nStore.t("desktopShell.profile.bio", "Bio") }}</span>
        <textarea class="desktop-textarea-input" :value="draft.bio" @input="profileStore.setField('bio', $event.target.value)" />
      </label>

      <label class="field field-wide">
        <span>{{ shellI18nStore.t("desktopShell.profile.favoritePlatforms", "Favorite platforms") }}</span>
        <input :value="draft.favoritePlatforms" type="text" :placeholder="shellI18nStore.t('desktopShell.profile.favoritePlatformsPlaceholder', 'PS1, PS2, GameCube')" @input="profileStore.setField('favoritePlatforms', $event.target.value)" />
      </label>

      <label class="field">
        <span>Steam</span>
        <input :value="draft.linkedSteam" type="text" :placeholder="shellI18nStore.t('desktopShell.profile.steamPlaceholder', 'steam username')" @input="profileStore.setField('linkedSteam', $event.target.value)" />
      </label>

      <label class="field">
        <span>Epic Games</span>
        <input :value="draft.linkedEpic" type="text" :placeholder="shellI18nStore.t('desktopShell.profile.epicPlaceholder', 'epic account')" @input="profileStore.setField('linkedEpic', $event.target.value)" />
      </label>

      <label class="field">
        <span>GOG</span>
        <input :value="draft.linkedGog" type="text" :placeholder="shellI18nStore.t('desktopShell.profile.gogPlaceholder', 'gog username')" @input="profileStore.setField('linkedGog', $event.target.value)" />
      </label>
    </div>

    <div class="button-row">
      <button type="button" class="action-button" :disabled="loading || !hasDraftChanges" @click="profileStore.save">{{ shellI18nStore.t("desktopShell.profile.saveProfile", "Save Profile") }}</button>
      <button type="button" class="action-button" :disabled="loading || !hasDraftChanges" @click="profileStore.resetDraft">{{ shellI18nStore.t("desktopShell.profile.revert", "Revert") }}</button>
    </div>

    <p v-if="status" class="desktop-status-line" :data-tone="statusTone || 'info'">{{ status }}</p>
  </section>
</template>
