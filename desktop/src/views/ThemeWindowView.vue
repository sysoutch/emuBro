<script setup>
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useAppStore } from "../stores/app";
import { useShellI18nStore } from "../stores/shell-i18n";
import { useShellThemeStore } from "../stores/shell-theme";

const appStore = useAppStore();
const shellI18nStore = useShellI18nStore();
const shellThemeStore = useShellThemeStore();

const { windowMaximized, windowStateReady } = storeToRefs(appStore);
const { actionStatus, draft, error, hasChanges, loading, previewAccentStyle, saving } = storeToRefs(shellThemeStore);

const toneSummary = computed(() =>
  draft.value.tone === "light"
    ? shellI18nStore.t(
        "desktopShell.themeWindow.toneSummaryLight",
        "Light shell tone is active and backed by persisted splash-theme settings."
      )
    : shellI18nStore.t(
        "desktopShell.themeWindow.toneSummaryDark",
        "Dark shell tone is active and backed by persisted splash-theme settings."
      )
);

const themeGroups = computed(() => [
  {
    id: "surfaces",
    eyebrow: shellI18nStore.t("desktopShell.themeWindow.groups.surfaces.eyebrow", "Surface Colors"),
    title: shellI18nStore.t("desktopShell.themeWindow.groups.surfaces.title", "Core surfaces"),
    fields: [
      { key: "bgPrimary", label: shellI18nStore.t("desktopShell.themeWindow.groups.surfaces.bgPrimary", "Background Primary") },
      { key: "bgSecondary", label: shellI18nStore.t("desktopShell.themeWindow.groups.surfaces.bgSecondary", "Background Secondary") },
      { key: "bgTertiary", label: shellI18nStore.t("desktopShell.themeWindow.groups.surfaces.bgTertiary", "Background Tertiary") }
    ]
  },
  {
    id: "text",
    eyebrow: shellI18nStore.t("desktopShell.themeWindow.groups.text.eyebrow", "Typography"),
    title: shellI18nStore.t("desktopShell.themeWindow.groups.text.title", "Text colors"),
    fields: [
      { key: "textPrimary", label: shellI18nStore.t("desktopShell.themeWindow.groups.text.textPrimary", "Text Primary") },
      { key: "textSecondary", label: shellI18nStore.t("desktopShell.themeWindow.groups.text.textSecondary", "Text Secondary") }
    ]
  },
  {
    id: "accent",
    eyebrow: shellI18nStore.t("desktopShell.themeWindow.groups.accent.eyebrow", "Brand"),
    title: shellI18nStore.t("desktopShell.themeWindow.groups.accent.title", "Accent colors"),
    fields: [
      { key: "accentColor", label: shellI18nStore.t("desktopShell.themeWindow.groups.accent.accentColor", "Accent") },
      { key: "accentLight", label: shellI18nStore.t("desktopShell.themeWindow.groups.accent.accentLight", "Accent Light") }
    ]
  },
  {
    id: "gradient",
    eyebrow: shellI18nStore.t("desktopShell.themeWindow.groups.gradient.eyebrow", "Background"),
    title: shellI18nStore.t("desktopShell.themeWindow.groups.gradient.title", "App gradients"),
    fields: [
      { key: "appGradientA", label: shellI18nStore.t("desktopShell.themeWindow.groups.gradient.appGradientA", "Gradient A") },
      { key: "appGradientB", label: shellI18nStore.t("desktopShell.themeWindow.groups.gradient.appGradientB", "Gradient B") },
      { key: "appGradientC", label: shellI18nStore.t("desktopShell.themeWindow.groups.gradient.appGradientC", "Gradient C") }
    ]
  }
]);

onMounted(() => {
  void shellThemeStore.initialize();
});
</script>

<template>
  <div class="desktop-workspace-layout">
    <aside class="desktop-workspace-sidebar">
      <section class="subcard desktop-workspace-nav-card">
        <div class="card-header-row">
          <div>
            <div class="eyebrow">{{ shellI18nStore.t("desktopShell.themeWindow.sidebarEyebrow", "Theme + Window") }}</div>
            <h4>{{ shellI18nStore.t("desktopShell.themeWindow.sidebarTitle", "Shell appearance") }}</h4>
          </div>
          <span class="pill">{{ draft.tone }}</span>
        </div>
        <p class="meta-line">{{ shellI18nStore.t("desktopShell.themeWindow.sidebarDescription", "This shell section now owns persisted theme state and native window controls instead of mirroring them from the legacy runtime.") }}</p>

        <div class="desktop-workspace-nav-list">
          <button type="button" class="desktop-workspace-nav-button" @click="shellThemeStore.useTonePreset('dark')">
            <strong>{{ shellI18nStore.t("desktopShell.actions.darkPreset", "Dark Preset") }}</strong>
            <small>{{ shellI18nStore.t("desktopShell.themeWindow.darkPresetDescription", "Load the default dark shell palette.") }}</small>
          </button>
          <button type="button" class="desktop-workspace-nav-button" @click="shellThemeStore.useTonePreset('light')">
            <strong>{{ shellI18nStore.t("desktopShell.actions.lightPreset", "Light Preset") }}</strong>
            <small>{{ shellI18nStore.t("desktopShell.themeWindow.lightPresetDescription", "Load the default light shell palette.") }}</small>
          </button>
          <button type="button" class="desktop-workspace-nav-button" @click="shellThemeStore.toggleTone">
            <strong>{{ shellI18nStore.t("desktopShell.actions.toggleTone", "Toggle Tone") }}</strong>
            <small>{{ shellI18nStore.t("desktopShell.themeWindow.toggleToneDescription", "Flip the active shell tone instantly.") }}</small>
          </button>
          <button type="button" class="desktop-workspace-nav-button" :disabled="!hasChanges" @click="shellThemeStore.restoreSaved">
            <strong>{{ shellI18nStore.t("desktopShell.actions.restoreSaved", "Restore Saved") }}</strong>
            <small>{{ shellI18nStore.t("desktopShell.themeWindow.restoreSavedDescription", "Undo current unsaved theme edits.") }}</small>
          </button>
        </div>
      </section>

      <section class="subcard desktop-workspace-nav-card">
        <div class="card-header-row">
          <h4>{{ shellI18nStore.t("desktopShell.themeWindow.windowControls", "Window controls") }}</h4>
          <span class="pill">
            {{
              windowStateReady
                ? windowMaximized
                  ? shellI18nStore.t("desktopShell.header.maximized", "Maximized")
                  : shellI18nStore.t("desktopShell.header.normal", "Normal")
                : shellI18nStore.t("desktopShell.header.syncing", "Syncing")
            }}
          </span>
        </div>
        <div class="button-row">
          <button type="button" class="action-button" @click="appStore.minimizeWindow">
            {{ shellI18nStore.t("desktopShell.themeWindow.minimize", "Minimize") }}
          </button>
          <button type="button" class="action-button" @click="appStore.maximizeWindow">
            {{
              windowMaximized
                ? shellI18nStore.t("desktopShell.themeWindow.restoreWindow", "Restore Window")
                : shellI18nStore.t("desktopShell.themeWindow.maximizeWindow", "Maximize Window")
            }}
          </button>
          <button type="button" class="action-button danger" @click="appStore.closeWindow">
            {{ shellI18nStore.t("desktopShell.themeWindow.closeWindow", "Close Window") }}
          </button>
        </div>
        <div class="desktop-sidebar-stat-list">
          <div class="desktop-sidebar-stat">
            <strong>{{ hasChanges ? shellI18nStore.t("desktopShell.states.draft", "Draft") : shellI18nStore.t("desktopShell.states.saved", "Saved") }}</strong>
            <span>{{ shellI18nStore.t("desktopShell.themeWindow.themeState", "Theme state") }}</span>
          </div>
          <div class="desktop-sidebar-stat">
            <strong>{{ loading ? shellI18nStore.t("desktopShell.states.loading", "Loading...") : shellI18nStore.t("desktopShell.states.live", "Live") }}</strong>
            <span>{{ shellI18nStore.t("desktopShell.themeWindow.previewMode", "Preview mode") }}</span>
          </div>
        </div>
      </section>
    </aside>

    <section class="desktop-workspace-main">
      <section class="card desktop-workspace-hero-card">
        <div class="card-header-row">
          <div>
            <div class="eyebrow">{{ shellI18nStore.t("desktopShell.themeWindow.heroEyebrow", "Theme Manager") }}</div>
            <h2>{{ shellI18nStore.t("desktopShell.themeWindow.heroTitle", "Theme and window chrome") }}</h2>
          </div>
          <span class="pill">{{ draft.id }}</span>
        </div>
        <p>{{ shellI18nStore.t("desktopShell.themeWindow.heroDescription", "This shell slice reads and writes the persisted splash theme settings.") }}</p>
        <div class="metrics">
          <div class="metric">
            <span class="metric-label">{{ shellI18nStore.t("desktopShell.themeWindow.themeToneLabel", "Theme tone") }}</span>
            <strong>{{ draft.tone }}</strong>
            <small>{{ toneSummary }}</small>
          </div>
          <div class="metric">
            <span class="metric-label">{{ shellI18nStore.t("desktopShell.themeWindow.windowStateLabel", "Window state") }}</span>
            <strong>
              {{
                windowStateReady
                  ? windowMaximized
                    ? shellI18nStore.t("desktopShell.header.maximized", "Maximized")
                    : shellI18nStore.t("desktopShell.header.normal", "Normal")
                  : shellI18nStore.t("desktopShell.header.syncing", "Syncing")
              }}
            </strong>
            <small>{{ shellI18nStore.t("desktopShell.themeWindow.windowStateDescription", "Bound to maximize events from the desktop bridge.") }}</small>
          </div>
          <div class="metric">
            <span class="metric-label">{{ shellI18nStore.t("desktopShell.themeWindow.themeStatusLabel", "Theme status") }}</span>
            <strong>{{ hasChanges ? shellI18nStore.t("desktopShell.themeWindow.unsavedChanges", "Unsaved changes") : shellI18nStore.t("desktopShell.states.saved", "Saved") }}</strong>
            <small>
              {{
                loading
                  ? shellI18nStore.t("desktopShell.themeWindow.loadingPersistedTheme", "Loading persisted theme...")
                  : shellI18nStore.t("desktopShell.themeWindow.livePreviewActive", "Live preview is active.")
              }}
            </small>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="card-header-row">
          <h3>{{ shellI18nStore.t("desktopShell.themeWindow.editorTitle", "Persisted shell theme editor") }}</h3>
          <span class="pill">{{ saving ? shellI18nStore.t("desktopShell.themeWindow.saving", "Saving...") : shellI18nStore.t("desktopShell.themeWindow.ready", "Ready") }}</span>
        </div>

        <div class="form-grid">
          <label class="field">
            <span>{{ shellI18nStore.t("desktopShell.themeWindow.themeId", "Theme id") }}</span>
            <input :value="draft.id" type="text" @input="shellThemeStore.updateField('id', $event.target.value)" />
          </label>
          <label class="field">
            <span>{{ shellI18nStore.t("desktopShell.themeWindow.tone", "Tone") }}</span>
            <select :value="draft.tone" @change="shellThemeStore.updateField('tone', $event.target.value)">
              <option value="dark">{{ shellI18nStore.t("desktopShell.quickControls.dark", "Dark") }}</option>
              <option value="light">{{ shellI18nStore.t("desktopShell.quickControls.light", "Light") }}</option>
            </select>
          </label>
          <label class="field field-wide">
            <span>{{ shellI18nStore.t("desktopShell.themeWindow.bodyFont", "Body font") }}</span>
            <input
              :value="draft.fontBody"
              type="text"
              :placeholder="shellI18nStore.t('desktopShell.themeWindow.bodyFontPlaceholder', 'Segoe UI, Inter, sans-serif')"
              @input="shellThemeStore.updateField('fontBody', $event.target.value)"
            />
          </label>
        </div>

        <div class="desktop-theme-group-grid">
          <article v-for="group in themeGroups" :key="group.id" class="subcard desktop-theme-group-card">
            <div class="eyebrow">{{ group.eyebrow }}</div>
            <h4>{{ group.title }}</h4>
            <div class="desktop-theme-editor-grid">
              <label v-for="field in group.fields" :key="field.key" class="desktop-theme-color-field">
                <span>{{ field.label }}</span>
                <div class="desktop-theme-color-row">
                  <input
                    class="desktop-theme-color-swatch"
                    :value="draft[field.key]"
                    type="color"
                    @input="shellThemeStore.updateField(field.key, $event.target.value)"
                  />
                  <input
                    class="desktop-theme-color-input"
                    :value="draft[field.key]"
                    type="text"
                    @input="shellThemeStore.updateField(field.key, $event.target.value)"
                  />
                </div>
              </label>
            </div>
          </article>
        </div>

        <div class="button-row">
          <button type="button" class="action-button" @click="shellThemeStore.applyDraft">
            {{ shellI18nStore.t("desktopShell.actions.applyPreview", "Apply Preview") }}
          </button>
          <button type="button" class="action-button" :disabled="saving" @click="shellThemeStore.save">
            {{
              saving
                ? shellI18nStore.t("desktopShell.themeWindow.saving", "Saving...")
                : shellI18nStore.t("desktopShell.actions.saveShellTheme", "Save Shell Theme")
            }}
          </button>
        </div>

        <p v-if="actionStatus" class="meta-line">{{ actionStatus }}</p>
        <p v-if="error" class="legacy-fallback-note">{{ error }}</p>
      </section>

      <section class="card desktop-theme-preview-card" :style="previewAccentStyle">
        <div>
          <div class="eyebrow">{{ shellI18nStore.t("desktopShell.themeWindow.previewEyebrow", "Live Preview") }}</div>
          <h3>{{ shellI18nStore.t("desktopShell.themeWindow.previewTitle", "Desktop shell preview") }}</h3>
          <p>{{ shellI18nStore.t("desktopShell.themeWindow.previewDescription", "The shell preview uses the same CSS variables the migrated sections consume.") }}</p>
        </div>

        <div class="desktop-theme-preview-surface">
          <div class="desktop-theme-preview-chip">{{ shellI18nStore.t("desktopShell.themeWindow.accentChip", "Accent") }}</div>
          <div class="desktop-theme-preview-window">
            <div class="desktop-theme-preview-window-bar"></div>
            <div class="desktop-theme-preview-window-body">
              <div class="desktop-theme-preview-card-panel"></div>
              <div class="desktop-theme-preview-card-panel is-accent"></div>
            </div>
          </div>
        </div>
      </section>
    </section>
  </div>
</template>
