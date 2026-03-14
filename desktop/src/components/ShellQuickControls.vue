<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useAppStore } from "../stores/app";
import { useShellI18nStore } from "../stores/shell-i18n";
import { useSettingsToolsStore } from "../stores/settings-tools";
import { useShellLanguageStore } from "../stores/shell-language";
import { useShellThemeStore } from "../stores/shell-theme";

const appStore = useAppStore();
const shellI18nStore = useShellI18nStore();
const settingsToolsStore = useSettingsToolsStore();
const shellLanguageStore = useShellLanguageStore();
const shellThemeStore = useShellThemeStore();

const { currentCode, currentRow, rows: languageRows } = storeToRefs(shellLanguageStore);
const { draft } = storeToRefs(shellThemeStore);

const rootEl = ref(null);
const openMenuId = ref("");

const toneOptions = computed(() => [
  { id: "dark", label: shellI18nStore.t("desktopShell.quickControls.dark", "Dark") },
  { id: "light", label: shellI18nStore.t("desktopShell.quickControls.light", "Light") }
]);

const currentLanguageLabel = computed(() => currentRow.value?.label || currentCode.value.toUpperCase());
const currentLanguageFlag = computed(() => toFlagEmoji(currentRow.value?.flagCode || "us"));

function toFlagEmoji(code) {
  const normalized = String(code || "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) {
    return "";
  }
  return Array.from(normalized)
    .map((character) => String.fromCodePoint(127397 + character.charCodeAt(0)))
    .join("");
}

function closeMenus() {
  openMenuId.value = "";
}

function toggleMenu(menuId) {
  openMenuId.value = openMenuId.value === menuId ? "" : menuId;
}

function onDocumentPointerDown(event) {
  const target = event?.target;
  if (!rootEl.value || !(target instanceof Node)) {
    closeMenus();
    return;
  }
  if (!rootEl.value.contains(target)) {
    closeMenus();
  }
}

function onDocumentKeyDown(event) {
  if (event.key === "Escape") {
    closeMenus();
  }
}

function setTone(value) {
  shellThemeStore.updateField("tone", value === "light" ? "light" : "dark");
  closeMenus();
}

function openThemeWorkspace() {
  appStore.setActiveSection("theme-window");
  closeMenus();
}

function openLanguagesWorkspace() {
  settingsToolsStore.openPanel("languages");
  closeMenus();
}

function setLanguage(code) {
  void shellLanguageStore.setCurrentLanguage(code);
  closeMenus();
}

onMounted(() => {
  void Promise.all([shellThemeStore.initialize(), shellLanguageStore.initialize()]);
  document.addEventListener("pointerdown", onDocumentPointerDown);
  document.addEventListener("keydown", onDocumentKeyDown);
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onDocumentPointerDown);
  document.removeEventListener("keydown", onDocumentKeyDown);
});
</script>

<template>
  <div ref="rootEl" class="shell-quick-controls" data-no-window-drag>
    <div class="shell-quick-inline">
      <label class="shell-quick-field">
        <span>{{ shellI18nStore.t("desktopShell.quickControls.theme", "Theme") }}</span>
        <select :value="draft.tone" @change="setTone($event.target.value)">
          <option v-for="option in toneOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
        </select>
      </label>
      <button type="button" class="shell-quick-manage-button" @click="openThemeWorkspace">
        {{ shellI18nStore.t("desktopShell.quickControls.themeWorkspace", "Theme Workspace") }}
      </button>

      <label class="shell-quick-field">
        <span>{{ shellI18nStore.t("desktopShell.quickControls.language", "Language") }}</span>
        <select :value="currentCode" @change="setLanguage($event.target.value)">
          <option v-for="row in languageRows" :key="row.code" :value="row.code">{{ row.label }}</option>
        </select>
      </label>
      <button type="button" class="shell-quick-manage-button" @click="openLanguagesWorkspace">
        {{ shellI18nStore.t("desktopShell.quickControls.languages", "Languages") }}
      </button>
    </div>

    <div class="shell-quick-compact">
      <div class="shell-compact-control">
        <button
          type="button"
          class="shell-compact-trigger"
          :class="{ 'is-open': openMenuId === 'theme' }"
          @click.stop="toggleMenu('theme')"
        >
          <span>{{ shellI18nStore.t("desktopShell.quickControls.theme", "Theme") }}</span>
          <strong>{{ draft.tone }}</strong>
        </button>
        <div v-if="openMenuId === 'theme'" class="shell-compact-menu">
          <div class="shell-compact-menu-section">
            <div class="shell-compact-menu-label">{{ shellI18nStore.t("desktopShell.quickControls.tone", "Tone") }}</div>
            <div class="shell-compact-menu-grid">
              <button
                v-for="option in toneOptions"
                :key="option.id"
                type="button"
                class="shell-compact-option"
                :class="{ 'is-active': draft.tone === option.id }"
                @click="setTone(option.id)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>
          <div class="shell-compact-menu-section">
            <button type="button" class="shell-compact-link" @click="openThemeWorkspace">
              {{ shellI18nStore.t("desktopShell.quickControls.openThemeWorkspace", "Open Theme Workspace") }}
            </button>
          </div>
        </div>
      </div>

      <div class="shell-compact-control">
        <button
          type="button"
          class="shell-compact-trigger"
          :class="{ 'is-open': openMenuId === 'language' }"
          @click.stop="toggleMenu('language')"
        >
          <span>{{ shellI18nStore.t("desktopShell.quickControls.language", "Language") }}</span>
          <strong>{{ currentLanguageFlag }} {{ currentLanguageLabel }}</strong>
        </button>
        <div v-if="openMenuId === 'language'" class="shell-compact-menu">
          <div class="shell-compact-menu-section">
            <div class="shell-compact-menu-label">{{ shellI18nStore.t("desktopShell.quickControls.language", "Language") }}</div>
            <div class="shell-compact-language-list">
              <button
                v-for="row in languageRows"
                :key="row.code"
                type="button"
                class="shell-compact-language-option"
                :class="{ 'is-active': currentCode === row.code }"
                @click="setLanguage(row.code)"
              >
                <span>{{ toFlagEmoji(row.flagCode) }}</span>
                <strong>{{ row.label }}</strong>
                <small>{{ row.code.toUpperCase() }}</small>
              </button>
            </div>
          </div>
          <div class="shell-compact-menu-section">
            <button type="button" class="shell-compact-link" @click="openLanguagesWorkspace">
              {{ shellI18nStore.t("desktopShell.quickControls.openLanguageWorkspace", "Open Language Workspace") }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
