<script setup>
import { ref } from "vue";
import { storeToRefs } from "pinia";
import { useShellI18nStore } from "../stores/shell-i18n";
import { useWorkspaceStore } from "../stores/workspace";

const shellI18nStore = useShellI18nStore();
const workspaceStore = useWorkspaceStore();
const {
  libraryPathDirty,
  libraryPathSaveBusy,
  libraryPathSaveError,
  libraryPathStatus,
  libraryPathsDraft,
  totalDraftLibraryFolders
} = storeToRefs(workspaceStore);

const manualGamePath = ref("");
const manualEmulatorPath = ref("");

function addManualPath(kind, model) {
  workspaceStore.addLibraryPath(kind, model.value);
  model.value = "";
}
</script>

<template>
  <div class="desktop-settings-stack">
    <section class="subcard">
      <div class="card-header-row">
        <h4>{{ shellI18nStore.t("desktopShell.paths.editableLibraryPaths", "Editable library paths") }}</h4>
        <span class="pill">{{ totalDraftLibraryFolders }} {{ shellI18nStore.t("desktopShell.tools.workflows", "folders") }}</span>
      </div>
      <p class="meta-line">
        {{
          shellI18nStore.t(
            "desktopShell.paths.description",
            "These folder lists now save through the desktop bridge instead of being read-only snapshots."
          )
        }}
      </p>
      <div class="button-row">
        <button type="button" class="action-button" :disabled="libraryPathSaveBusy" @click="workspaceStore.saveLibraryPaths">
          {{
            libraryPathSaveBusy
              ? shellI18nStore.t("desktopShell.themeWindow.saving", "Saving...")
              : shellI18nStore.t("desktopShell.paths.savePathSettings", "Save Path Settings")
          }}
        </button>
        <button
          type="button"
          class="action-button"
          :disabled="libraryPathSaveBusy || !libraryPathDirty"
          @click="workspaceStore.resetLibraryPathDraft"
        >
          {{ shellI18nStore.t("desktopShell.paths.revertUnsavedChanges", "Revert Unsaved Changes") }}
        </button>
        <span class="pill">
          {{ libraryPathDirty ? shellI18nStore.t("desktopShell.themeWindow.unsavedChanges", "Unsaved changes") : shellI18nStore.t("desktopShell.states.saved", "Saved") }}
        </span>
      </div>
      <p v-if="libraryPathStatus" class="meta-line">{{ libraryPathStatus }}</p>
      <p v-if="libraryPathSaveError" class="legacy-fallback-note">{{ libraryPathSaveError }}</p>
    </section>

    <div class="grid-two">
      <section class="subcard">
        <div class="card-header-row">
          <h4>{{ shellI18nStore.t("desktopShell.paths.gameFolders", "Game folders") }}</h4>
          <button type="button" class="action-button" @click="workspaceStore.browseAndAddLibraryPath('gameFolders')">
            {{ shellI18nStore.t("footer.browse", "Browse") }}
          </button>
        </div>
        <div class="desktop-path-entry-row">
          <input
            v-model="manualGamePath"
            type="text"
            :placeholder="shellI18nStore.t('desktopShell.paths.addGameFolderManually', 'Add game folder path manually')"
          />
          <button type="button" class="action-button" @click="addManualPath('gameFolders', manualGamePath)">
            {{ shellI18nStore.t("buttons.create", "Add") }}
          </button>
        </div>
        <ul class="desktop-path-list">
          <li v-for="(path, index) in libraryPathsDraft.gameFolders" :key="`game-${path}`">
            <span>{{ path }}</span>
            <button type="button" class="action-button" @click="workspaceStore.removeLibraryPath('gameFolders', index)">
              {{ shellI18nStore.t("customToolActions.remove", "Remove") }}
            </button>
          </li>
          <li v-if="!libraryPathsDraft.gameFolders.length">
            {{ shellI18nStore.t("desktopShell.paths.noGameFoldersYet", "No configured game folders yet.") }}
          </li>
        </ul>
      </section>

      <section class="subcard">
        <div class="card-header-row">
          <h4>{{ shellI18nStore.t("desktopShell.paths.emulatorFolders", "Emulator folders") }}</h4>
          <button type="button" class="action-button" @click="workspaceStore.browseAndAddLibraryPath('emulatorFolders')">
            {{ shellI18nStore.t("footer.browse", "Browse") }}
          </button>
        </div>
        <div class="desktop-path-entry-row">
          <input
            v-model="manualEmulatorPath"
            type="text"
            :placeholder="shellI18nStore.t('desktopShell.paths.addEmulatorFolderManually', 'Add emulator folder path manually')"
          />
          <button type="button" class="action-button" @click="addManualPath('emulatorFolders', manualEmulatorPath)">
            {{ shellI18nStore.t("buttons.create", "Add") }}
          </button>
        </div>
        <ul class="desktop-path-list">
          <li v-for="(path, index) in libraryPathsDraft.emulatorFolders" :key="`emu-${path}`">
            <span>{{ path }}</span>
            <button type="button" class="action-button" @click="workspaceStore.removeLibraryPath('emulatorFolders', index)">
              {{ shellI18nStore.t("customToolActions.remove", "Remove") }}
            </button>
          </li>
          <li v-if="!libraryPathsDraft.emulatorFolders.length">
            {{ shellI18nStore.t("desktopShell.paths.noEmulatorFoldersYet", "No configured emulator folders yet.") }}
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
