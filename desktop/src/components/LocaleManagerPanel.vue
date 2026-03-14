<script setup>
import { onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useShellI18nStore } from "../stores/shell-i18n";
import { useLocalesStore } from "../stores/locales";
import { useWorkspaceStore } from "../stores/workspace";

const shellI18nStore = useShellI18nStore();
const localesStore = useLocalesStore();
const workspaceStore = useWorkspaceStore();
const {
  actionStatus,
  createForm,
  dirty,
  editorText,
  error,
  loading,
  renameForm,
  rows,
  saving,
  selectedFilename,
  selectedRow
} = storeToRefs(localesStore);

async function refreshWorkspaceLanguages() {
  await workspaceStore.refresh();
}

async function saveLocale() {
  const success = await localesStore.saveSelected();
  if (success) {
    await refreshWorkspaceLanguages();
  }
}

async function createLocale() {
  const success = await localesStore.createLocale();
  if (success) {
    await refreshWorkspaceLanguages();
  }
}

async function renameLocale() {
  const success = await localesStore.renameSelected();
  if (success) {
    await refreshWorkspaceLanguages();
  }
}

async function deleteLocale() {
  const success = await localesStore.deleteSelected();
  if (success) {
    await refreshWorkspaceLanguages();
  }
}

onMounted(() => {
  void localesStore.initialize();
});
</script>

<template>
  <div class="desktop-locale-layout">
    <aside class="desktop-locale-sidebar">
      <div class="card-header-row">
        <h4>{{ shellI18nStore.t("desktopShell.locales.installedLocales", "Installed locales") }}</h4>
        <span class="pill">{{ rows.length }}</span>
      </div>
      <div class="desktop-locale-list">
        <button
          v-for="row in rows"
          :key="row.filename"
          type="button"
          class="desktop-locale-list-item"
          :class="{ 'is-active': row.filename === selectedFilename }"
          @click="localesStore.selectLocale(row.filename)"
        >
          <strong>{{ row.code }}</strong>
          <span>{{ row.filename }}</span>
          <small>{{ row.source }}</small>
        </button>
      </div>
    </aside>

    <div class="desktop-locale-content">
      <section class="subcard">
        <div class="card-header-row">
          <h4>{{ shellI18nStore.t("desktopShell.locales.selectedLocale", "Selected locale") }}</h4>
          <span class="pill">{{ selectedRow?.filename || shellI18nStore.t("desktopShell.community.none", "None") }}</span>
        </div>
        <div class="button-row">
          <button type="button" class="action-button" :disabled="saving || !selectedRow" @click="saveLocale">
            {{ saving ? shellI18nStore.t("desktopShell.themeWindow.saving", "Saving...") : shellI18nStore.t("desktopShell.locales.saveJson", "Save JSON") }}
          </button>
          <button
            type="button"
            class="action-button"
            :disabled="saving || selectedRow?.canRename !== true"
            @click="renameLocale"
          >
            {{ shellI18nStore.t("desktopShell.locales.renameLocale", "Rename Locale") }}
          </button>
          <button
            type="button"
            class="action-button danger"
            :disabled="saving || selectedRow?.canDelete !== true"
            @click="deleteLocale"
          >
            {{ shellI18nStore.t("desktopShell.locales.deleteLocale", "Delete Locale") }}
          </button>
          <button type="button" class="action-button" :disabled="loading" @click="localesStore.refresh">
            {{ shellI18nStore.t("desktopShell.locales.reload", "Reload") }}
          </button>
        </div>
        <p v-if="actionStatus" class="meta-line">{{ actionStatus }}</p>
        <p v-if="error" class="legacy-fallback-note">{{ error }}</p>
        <p class="meta-line">
          {{ shellI18nStore.t("desktopShell.locales.unsavedChanges", "Unsaved changes") }}:
          {{ dirty ? shellI18nStore.t("buttons.yes", "Yes") : shellI18nStore.t("buttons.no", "No") }}
        </p>
      </section>

      <section class="subcard">
        <h4>{{ shellI18nStore.t("desktopShell.locales.renameMetadata", "Rename metadata") }}</h4>
        <div class="form-grid">
          <label class="field">
            <span>{{ shellI18nStore.t("desktopShell.locales.code", "Code") }}</span>
            <input v-model="renameForm.code" type="text" placeholder="en" />
          </label>
          <label class="field">
            <span>{{ shellI18nStore.t("desktopShell.locales.name", "Name") }}</span>
            <input v-model="renameForm.name" type="text" placeholder="English" />
          </label>
          <label class="field">
            <span>{{ shellI18nStore.t("desktopShell.locales.abbreviation", "Abbreviation") }}</span>
            <input v-model="renameForm.abbreviation" type="text" placeholder="EN" />
          </label>
          <label class="field">
            <span>{{ shellI18nStore.t("desktopShell.locales.flag", "Flag") }}</span>
            <input v-model="renameForm.flag" type="text" placeholder="us" />
          </label>
        </div>
      </section>

      <section class="subcard">
        <h4>{{ shellI18nStore.t("desktopShell.locales.localeJsonEditor", "Locale JSON editor") }}</h4>
        <textarea
          class="desktop-locale-editor"
          :value="editorText"
          :placeholder="shellI18nStore.t('desktopShell.locales.editorPlaceholder', 'Select a locale to edit its JSON.')"
          @input="localesStore.updateEditorText($event.target.value)"
        />
      </section>

      <section class="subcard">
        <h4>{{ shellI18nStore.t("desktopShell.locales.createNewLocale", "Create new locale") }}</h4>
        <div class="form-grid">
          <label class="field">
            <span>{{ shellI18nStore.t("desktopShell.locales.code", "Code") }}</span>
            <input v-model="createForm.code" type="text" placeholder="pt" />
          </label>
          <label class="field">
            <span>{{ shellI18nStore.t("desktopShell.locales.name", "Name") }}</span>
            <input v-model="createForm.name" type="text" placeholder="Portuguese" />
          </label>
          <label class="field">
            <span>{{ shellI18nStore.t("desktopShell.locales.abbreviation", "Abbreviation") }}</span>
            <input v-model="createForm.abbreviation" type="text" placeholder="PT" />
          </label>
          <label class="field">
            <span>{{ shellI18nStore.t("desktopShell.locales.flag", "Flag") }}</span>
            <input v-model="createForm.flag" type="text" placeholder="pt" />
          </label>
        </div>
        <div class="button-row">
          <button type="button" class="action-button" :disabled="saving" @click="createLocale">
            {{ shellI18nStore.t("desktopShell.locales.createLocale", "Create Locale") }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
