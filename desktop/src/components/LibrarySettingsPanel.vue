<script setup>
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useAppStore } from "../stores/app";
import { useHeaderFiltersStore } from "../stores/header-filters";
import { useLibraryBrowseStore } from "../stores/library-browse";
import { useLibrarySettingsStore } from "../stores/library-settings";
import { useShellI18nStore } from "../stores/shell-i18n";
import { useSettingsToolsStore } from "../stores/settings-tools";

const appStore = useAppStore();
const browseStore = useLibraryBrowseStore();
const headerFiltersStore = useHeaderFiltersStore();
const librarySettingsStore = useLibrarySettingsStore();
const shellI18nStore = useShellI18nStore();
const settingsToolsStore = useSettingsToolsStore();

const {
  generalDraft,
  importDraft,
  librarySectionOptions,
  libraryViewOptions,
  launcherRows,
  launcherInstalledOnly,
  launcherDiscoveryOptions,
  launcherImportBusy,
  launcherScanBusy,
  launcherStatus,
  launcherStatusTone,
  hasDraftChanges,
  saveStatus,
  saveTone,
  visibleLauncherRows,
  selectedLauncherRows
} = storeToRefs(librarySettingsStore);

const selectedLauncherCount = computed(() => selectedLauncherRows.value.length);
const currentLibraryDefaults = computed(() => ({
  section: headerFiltersStore.summary.librarySectionLabel,
  view: headerFiltersStore.viewMode
}));

function openThemeWindow() {
  appStore.setActiveSection("theme-window");
}

function openLanguages() {
  settingsToolsStore.openPanel("languages");
}

function openGamepadProfiles() {
  settingsToolsStore.openPanel("gamepad");
}

function openLibraryWorkspace() {
  appStore.setActiveSection("library-views");
}

onMounted(async () => {
  librarySettingsStore.initialize();
  await Promise.all([browseStore.initialize(), headerFiltersStore.initialize()]);
});
</script>

<template>
  <div class="desktop-settings-stack">
    <section class="subcard">
      <div class="card-header-row">
        <div>
          <h4>{{ shellI18nStore.t("desktopShell.librarySettings.defaultsTitle", "Library defaults and import behavior") }}</h4>
          <p class="meta-line">
            {{
              shellI18nStore.t(
                "desktopShell.librarySettings.defaultsDescription",
                "These settings used to live only in the legacy settings modal. The shell now owns the same storage contract directly."
              )
            }}
          </p>
        </div>
        <span class="pill">{{ hasDraftChanges ? shellI18nStore.t("desktopShell.themeWindow.unsavedChanges", "Unsaved") : shellI18nStore.t("desktopShell.states.saved", "Saved") }}</span>
      </div>

      <div class="button-row">
        <button type="button" class="action-button" :disabled="!hasDraftChanges" @click="librarySettingsStore.save">{{ shellI18nStore.t("desktopShell.librarySettings.saveLibrarySettings", "Save Library Settings") }}</button>
        <button type="button" class="action-button" :disabled="!hasDraftChanges" @click="librarySettingsStore.resetDrafts">{{ shellI18nStore.t("desktopShell.librarySettings.revertDraft", "Revert Draft") }}</button>
        <button type="button" class="action-button" @click="openLibraryWorkspace">{{ shellI18nStore.t("desktopShell.library.openLibrary", "Open Library") }}</button>
      </div>

      <p v-if="saveStatus" class="desktop-status-line" :data-tone="saveTone || 'info'">{{ saveStatus }}</p>
    </section>

    <div class="grid-two">
      <section class="subcard desktop-section-card">
        <div class="card-header-row">
          <h4>{{ shellI18nStore.t("desktopShell.librarySettings.defaultLibraryBehavior", "Default library behavior") }}</h4>
          <span class="pill">{{ currentLibraryDefaults.section }} / {{ currentLibraryDefaults.view }}</span>
        </div>

        <div class="form-grid">
          <label class="field">
            <span>{{ shellI18nStore.t("desktopShell.librarySettings.defaultSection", "Default section") }}</span>
            <select :value="generalDraft.defaultSection" @change="librarySettingsStore.setGeneralField('defaultSection', $event.target.value)">
              <option v-for="option in librarySectionOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
            </select>
          </label>

          <label class="field">
            <span>{{ shellI18nStore.t("desktopShell.librarySettings.defaultView", "Default view") }}</span>
            <select :value="generalDraft.defaultView" @change="librarySettingsStore.setGeneralField('defaultView', $event.target.value)">
              <option v-for="option in libraryViewOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
            </select>
          </label>

          <label class="checkbox-field">
            <input
              type="checkbox"
              :checked="generalDraft.showLoadIndicator"
              @change="librarySettingsStore.setGeneralField('showLoadIndicator', $event.target.checked)"
            />
            <span>{{ shellI18nStore.t("desktopShell.librarySettings.showLoadIndicator", "Show progressive load indicator when more items are appended.") }}</span>
          </label>

          <label class="checkbox-field">
            <input
              type="checkbox"
              :checked="generalDraft.autoOpenFooter"
              @change="librarySettingsStore.setGeneralField('autoOpenFooter', $event.target.checked)"
            />
            <span>{{ shellI18nStore.t("desktopShell.librarySettings.autoOpenFooter", "Auto-open the bottom panel when selecting a game.") }}</span>
          </label>

          <label class="checkbox-field">
            <input
              type="checkbox"
              :checked="generalDraft.llmHelpersEnabled"
              @change="librarySettingsStore.setGeneralField('llmHelpersEnabled', $event.target.checked)"
            />
            <span>{{ shellI18nStore.t("desktopShell.librarySettings.enableLlmHelpers", "Enable AI / LLM helpers across library tagging and support flows.") }}</span>
          </label>

          <label class="checkbox-field">
            <input
              type="checkbox"
              :checked="generalDraft.llmAllowUnknownTags"
              :disabled="!generalDraft.llmHelpersEnabled"
              @change="librarySettingsStore.setGeneralField('llmAllowUnknownTags', $event.target.checked)"
            />
            <span>{{ shellI18nStore.t("desktopShell.librarySettings.allowUnknownTags", "Allow AI to suggest tags that are not already in the current catalog.") }}</span>
          </label>
        </div>

        <div class="button-row">
          <button type="button" class="action-button" @click="openThemeWindow">{{ shellI18nStore.t("desktopShell.librarySettings.openThemeWindow", "Open Theme + Window") }}</button>
          <button type="button" class="action-button" @click="openLanguages">{{ shellI18nStore.t("desktopShell.quickControls.openLanguageWorkspace", "Open Languages") }}</button>
          <button type="button" class="action-button" @click="openGamepadProfiles">{{ shellI18nStore.t("desktopShell.librarySettings.openGamepadProfiles", "Open Gamepad Profiles") }}</button>
        </div>
      </section>

      <section class="subcard desktop-section-card">
        <div class="card-header-row">
          <h4>{{ shellI18nStore.t("desktopShell.librarySettings.importBehavior", "Import behavior") }}</h4>
          <span class="pill">{{ importDraft.launcherDiscoveryMode }}</span>
        </div>

        <div class="form-grid">
          <label class="checkbox-field">
            <input
              type="checkbox"
              :checked="importDraft.preferCopyExternal"
              @change="librarySettingsStore.setImportField('preferCopyExternal', $event.target.checked)"
            />
            <span>{{ shellI18nStore.t("desktopShell.librarySettings.preferCopyExternal", "Prefer copy instead of move when importing from external drives.") }}</span>
          </label>

          <label class="checkbox-field">
            <input
              type="checkbox"
              :checked="importDraft.enableNetworkScan"
              @change="librarySettingsStore.setImportField('enableNetworkScan', $event.target.checked)"
            />
            <span>{{ shellI18nStore.t("desktopShell.librarySettings.enableNetworkScan", "Allow network share targets during search and import flows.") }}</span>
          </label>

          <label class="field">
            <span>{{ shellI18nStore.t("desktopShell.librarySettings.launcherDiscoveryMode", "Launcher discovery mode") }}</span>
            <select :value="importDraft.launcherDiscoveryMode" @change="librarySettingsStore.setImportField('launcherDiscoveryMode', $event.target.value)">
              <option v-for="option in launcherDiscoveryOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
            </select>
          </label>
        </div>

        <div class="button-row">
          <button type="button" class="action-button" :disabled="browseStore.searchBusy" @click="browseStore.runBrowseSearch('full')">{{ shellI18nStore.t("desktopShell.librarySettings.fullSearch", "Full Search") }}</button>
          <button type="button" class="action-button" :disabled="browseStore.searchBusy || !browseStore.quickSearchReady" @click="browseStore.runBrowseSearch('quick')">{{ shellI18nStore.t("desktopShell.librarySettings.quickSearch", "Quick Search") }}</button>
          <button type="button" class="action-button" :disabled="browseStore.searchBusy" @click="browseStore.runBrowseSearch('custom')">{{ shellI18nStore.t("desktopShell.librarySettings.customFolder", "Custom Folder") }}</button>
        </div>
      </section>
    </div>

    <section class="subcard desktop-section-card">
      <div class="card-header-row">
        <div>
          <h4>{{ shellI18nStore.t("desktopShell.librarySettings.launcherImports", "Launcher imports") }}</h4>
          <p class="meta-line">{{ shellI18nStore.t("desktopShell.librarySettings.launcherImportsDescription", "Scan Steam, Epic, and GOG from the shell and import selected titles into the library.") }}</p>
        </div>
        <span class="pill">{{ launcherRows.length }} {{ shellI18nStore.t("desktopShell.librarySettings.foundLabel", "found") }}</span>
      </div>

      <div class="form-grid">
        <label class="checkbox-field">
          <input
            type="checkbox"
            :checked="importDraft.launcherStores.steam"
            @change="librarySettingsStore.setLauncherStore('steam', $event.target.checked)"
          />
          <span>Steam</span>
        </label>

        <label class="checkbox-field">
          <input
            type="checkbox"
            :checked="importDraft.launcherStores.epic"
            @change="librarySettingsStore.setLauncherStore('epic', $event.target.checked)"
          />
          <span>Epic Games</span>
        </label>

        <label class="checkbox-field">
          <input
            type="checkbox"
            :checked="importDraft.launcherStores.gog"
            @change="librarySettingsStore.setLauncherStore('gog', $event.target.checked)"
          />
          <span>GOG Galaxy</span>
        </label>

        <label class="checkbox-field">
          <input
            type="checkbox"
            :checked="launcherInstalledOnly"
            @change="librarySettingsStore.setLauncherInstalledOnly($event.target.checked)"
          />
          <span>{{ shellI18nStore.t("desktopShell.librarySettings.installedOnly", "Installed only") }}</span>
        </label>
      </div>

      <div class="button-row">
        <button type="button" class="action-button" :disabled="launcherScanBusy" @click="librarySettingsStore.scanLauncherGames">
          {{ launcherScanBusy ? shellI18nStore.t("desktopShell.librarySettings.scanning", "Scanning...") : shellI18nStore.t("desktopShell.librarySettings.scanLaunchers", "Scan Launchers") }}
        </button>
        <button type="button" class="action-button" :disabled="launcherImportBusy || selectedLauncherCount === 0" @click="librarySettingsStore.importSelectedLauncherRows">
          {{
            launcherImportBusy
              ? shellI18nStore.t("desktopShell.librarySettings.importing", "Importing...")
              : `${shellI18nStore.t("desktopShell.librarySettings.importSelectedPrefix", "Import Selected")} (${selectedLauncherCount})`
          }}
        </button>
        <button type="button" class="action-button" :disabled="launcherRows.length === 0" @click="librarySettingsStore.selectAllLauncherRows(true)">{{ shellI18nStore.t("desktopShell.librarySettings.selectAll", "Select All") }}</button>
        <button type="button" class="action-button" :disabled="launcherRows.length === 0" @click="librarySettingsStore.selectAllLauncherRows(false)">{{ shellI18nStore.t("buttons.clear", "Clear") }}</button>
      </div>

      <p v-if="launcherStatus" class="desktop-status-line" :data-tone="launcherStatusTone || 'info'">{{ launcherStatus }}</p>

      <div v-if="visibleLauncherRows.length" class="desktop-tool-list">
        <label v-for="row in visibleLauncherRows" :key="row.id" class="desktop-tool-game-row">
          <input type="checkbox" :checked="row.selected" @change="librarySettingsStore.setLauncherRowSelected(row.id, $event.target.checked)" />
          <div>
            <strong>{{ row.name }}</strong>
            <small>
              {{ row.launcher.toUpperCase() }}{{ row.installDir ? ` | ${row.installDir}` : "" }}{{ row.imported ? ` | ${shellI18nStore.t("desktopShell.librarySettings.alreadyInLibrary", "Already in library")}` : "" }}{{ row.installed ? ` | ${shellI18nStore.t("gameCard.installed", "Installed")}` : "" }}
            </small>
          </div>
          <span class="pill">{{ row.launcher }}</span>
        </label>
      </div>
      <div v-else class="desktop-tool-empty-state">{{ shellI18nStore.t("desktopShell.librarySettings.emptyLauncherScan", "Run a launcher scan to inspect importable titles here.") }}</div>
    </section>
  </div>
</template>
