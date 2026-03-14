<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import ShellAboutModal from "./ShellAboutModal.vue";
import ShellQuickControls from "./ShellQuickControls.vue";
import { useHeaderFiltersStore } from "../stores/header-filters";
import { useShellI18nStore } from "../stores/shell-i18n";
import { useSettingsToolsStore } from "../stores/settings-tools";
import { useWindowChromeStore } from "../stores/window-chrome";
import { getShellStorageValue, setShellStorageValue } from "../utils/shell-storage-cache";

const props = defineProps({
  activeSection: {
    type: Object,
    required: true
  },
  ready: {
    type: Boolean,
    default: false
  },
  shellSections: {
    type: Array,
    default: () => []
  },
  theme: {
    type: String,
    default: "dark"
  },
  windowMaximized: {
    type: Boolean,
    default: false
  },
  windowStateReady: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(["select-section", "toggle-theme", "minimize-window", "maximize-window", "close-window"]);
const headerFiltersStore = useHeaderFiltersStore();
const shellI18nStore = useShellI18nStore();
const windowChromeStore = useWindowChromeStore();
const settingsToolsStore = useSettingsToolsStore();
const SIDEBAR_EXPANDED_STORAGE_KEY = "emubro.desktop.shell.sidebar-expanded";
const { availableUpdateCount, hasAvailableUpdates, updateActivityLabel, userInfo } = storeToRefs(windowChromeStore);
const { activePanel } = storeToRefs(settingsToolsStore);
const { query } = storeToRefs(headerFiltersStore);
const headerEl = ref(null);
const headerDensity = ref("normal");
const sidebarExpanded = ref(readSidebarExpanded());
let headerResizeObserver = null;
let headerSyncFrame = 0;

const SECTION_GROUPS = [
  {
    id: "library",
    label: "Library",
    caption: "Workspace, filters, and browsing",
    labelKey: "desktopShell.groups.library.label",
    captionKey: "desktopShell.groups.library.caption",
    defaultSectionId: "library-views",
    sectionIds: ["library-views", "header-filters"]
  },
  {
    id: "tools",
    label: "Tools",
    caption: "Settings, themes, and utilities",
    labelKey: "desktopShell.groups.tools.label",
    captionKey: "desktopShell.groups.tools.caption",
    defaultSectionId: "settings-tools",
    sectionIds: ["settings-tools", "theme-window"]
  },
  {
    id: "support",
    label: "Support",
    caption: "Help, chat, and diagnostics",
    labelKey: "desktopShell.groups.support.label",
    captionKey: "desktopShell.groups.support.caption",
    defaultSectionId: "support-center",
    sectionIds: ["support-center"]
  },
  {
    id: "community",
    label: "Community",
    caption: "Discord, GitHub, and social flows",
    labelKey: "desktopShell.groups.community.label",
    captionKey: "desktopShell.groups.community.caption",
    defaultSectionId: "community-hub",
    sectionIds: ["community-hub"]
  },
  {
    id: "overview",
    label: "Overview",
    caption: "Startup control and shell diagnostics",
    labelKey: "desktopShell.groups.overview.label",
    captionKey: "desktopShell.groups.overview.caption",
    defaultSectionId: "desktop-home",
    sectionIds: ["desktop-home"]
  }
];

const UTILITY_ACTIONS = [
  {
    panelId: "settings",
    label: "Settings",
    subtitle: "Library defaults and paths",
    labelKey: "desktopShell.utilities.settings.label",
    subtitleKey: "desktopShell.utilities.settings.subtitle"
  },
  {
    panelId: "profile",
    label: "Profile",
    subtitle: "Avatar and identity",
    labelKey: "desktopShell.utilities.profile.label",
    subtitleKey: "desktopShell.utilities.profile.subtitle"
  },
  {
    panelId: "languages",
    label: "Languages",
    subtitle: "Locale catalog and editor",
    labelKey: "desktopShell.utilities.languages.label",
    subtitleKey: "desktopShell.utilities.languages.subtitle"
  },
  {
    panelId: "updates",
    label: "Updates",
    subtitle: "App and resources updater",
    labelKey: "desktopShell.utilities.updates.label",
    subtitleKey: "desktopShell.utilities.updates.subtitle"
  }
];

const RAIL_ICON_MARKUP = Object.freeze({
  menu: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.8" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8" />
    </svg>
  `,
  library: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 16.5c-1.8 0-3.3-1.3-3.7-3l-.6-2.4C2.2 9 3.5 7 5.7 7h12.6c2.2 0 3.5 2 3 4.1l-.6 2.4c-.4 1.7-1.9 3-3.7 3-.9 0-1.7-.3-2.4-.9l-1.2-1.1c-.8-.7-2-.7-2.8 0l-1.2 1.1c-.7.6-1.5.9-2.4.9z" />
      <path d="M7.4 11.3h2.8M8.8 9.9v2.8" />
      <path d="M15.9 10.6h.01M18 12.7h.01" />
    </svg>
  `,
  tools: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 3c3 1 5 4 5 7-1 1-2 2-3 3l-3-3c1-1 2-2 3-3-1-2-2-3-2-4z" />
      <path d="M11 6c-3 3-5 6-6 10 4-1 7-3 10-6" />
      <path d="M9 15l-3 6 6-3" />
    </svg>
  `,
  support: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
      <path d="M18.4 5.6 14 10" />
      <path d="M10 14 5.6 18.4" />
      <path d="M18.4 18.4 14 14" />
      <path d="M10 10 5.6 5.6" />
    </svg>
  `,
  community: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H8l-5 3 1.5-4.5A8.5 8.5 0 1 1 21 11.5z" />
    </svg>
  `,
  overview: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
    </svg>
  `,
  settings: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3.1" />
      <path d="M12 2.8v2.3M12 18.9v2.3M21.2 12h-2.3M5.1 12H2.8M18.5 5.5l-1.6 1.6M7.1 16.9l-1.6 1.6M18.5 18.5l-1.6-1.6M7.1 7.1 5.5 5.5" />
      <path d="m14.6 3.6.9 1.9 2.1.3-.9 1.9.9 1.9-2.1.3-.9 1.9-1.9-.9-1.9.9-.9-1.9-2.1-.3.9-1.9-.9-1.9 2.1-.3.9-1.9 1.9.9z" />
    </svg>
  `,
  profile: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  `,
  languages: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.7 2.4 4.2 5.7 4.2 9s-1.5 6.6-4.2 9" />
      <path d="M12 3c-2.7 2.4-4.2 5.7-4.2 9s1.5 6.6 4.2 9" />
    </svg>
  `,
  updates: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4v10" />
      <path d="m8.5 10.5 3.5 3.5 3.5-3.5" />
      <path d="M5 19h14" />
    </svg>
  `
});

const sectionMap = computed(() => new Map(props.shellSections.map((section) => [section.id, section])));

const navigationGroups = computed(() =>
  SECTION_GROUPS.map((group) => {
    const sections = group.sectionIds.map((id) => sectionMap.value.get(id)).filter(Boolean);
    if (!sections.length) {
      return null;
    }
    return {
      ...group,
      sections
    };
  }).filter(Boolean)
);

const fallbackSections = computed(() =>
  props.shellSections.filter(
    (section) =>
      section.id !== "legacy-home" &&
      !SECTION_GROUPS.some((group) => group.sectionIds.includes(section.id))
  )
);

const activeGroup = computed(() => {
  const match = navigationGroups.value.find((group) => group.sectionIds.includes(props.activeSection.id));
  if (match) {
    return match;
  }

  return navigationGroups.value[0] || null;
});

const sidebarSections = computed(() => {
  const currentGroup = activeGroup.value;
  if (!currentGroup) {
    return [];
  }
  return currentGroup.sections || [];
});

const topSectionTabs = computed(() => {
  if (sidebarSections.value.length > 0) {
    return sidebarSections.value;
  }
  return fallbackSections.value;
});

const shouldShowStageHeader = computed(() => !["library-views", "header-filters"].includes(props.activeSection.id));

function selectSection(sectionId) {
  emit("select-section", sectionId);
}

function selectGroup(groupId) {
  const group = navigationGroups.value.find((entry) => entry.id === groupId);
  if (!group) {
    return;
  }

  const currentSection = group.sections.find((section) => section.id === props.activeSection.id);
  emit("select-section", currentSection?.id || group.defaultSectionId);
}

function readSidebarExpanded() {
  return getShellStorageValue(SIDEBAR_EXPANDED_STORAGE_KEY, "true") !== "false";
}

function setSidebarExpanded(value) {
  sidebarExpanded.value = !!value;
  setShellStorageValue(SIDEBAR_EXPANDED_STORAGE_KEY, sidebarExpanded.value ? "true" : "false");
}

function toggleSidebar() {
  setSidebarExpanded(!sidebarExpanded.value);
}

function activateGroup(groupId) {
  selectGroup(groupId);
  setSidebarExpanded(true);
}

function openSettingsPanel(panelId) {
  settingsToolsStore.openPanel(panelId);
}

function openSidebarUtilityPanel(panelId) {
  openSettingsPanel(panelId);
  setSidebarExpanded(true);
}

function isUtilityPanelActive(panelId) {
  return props.activeSection.id === "settings-tools" && activePanel.value === panelId;
}

function getRailLabel(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "?";
  }
  return text.length <= 2 ? text.toUpperCase() : text.slice(0, 2).toUpperCase();
}

function getRailIconMarkup(iconId, fallbackLabel = "") {
  return RAIL_ICON_MARKUP[iconId] || `<span>${getRailLabel(fallbackLabel)}</span>`;
}

function clearHeaderQuery() {
  headerFiltersStore.updateField("query", "");
}

function resolveHeaderDensity(width) {
  if (width <= 1260) {
    return "tiny";
  }
  if (width <= 1600) {
    return "compact";
  }
  return "normal";
}

function syncHeaderDensity() {
  const headerWidth = Number(headerEl.value?.clientWidth || window?.innerWidth || 0);
  headerDensity.value = resolveHeaderDensity(headerWidth);
}

function queueHeaderDensitySync() {
  if (typeof window === "undefined") {
    syncHeaderDensity();
    return;
  }
  if (headerSyncFrame) {
    window.cancelAnimationFrame(headerSyncFrame);
  }
  headerSyncFrame = window.requestAnimationFrame(() => {
    headerSyncFrame = 0;
    syncHeaderDensity();
  });
}

onMounted(() => {
  void Promise.all([windowChromeStore.initialize(), headerFiltersStore.initialize()]).finally(() => {
    queueHeaderDensitySync();
  });

  if (typeof window !== "undefined") {
    if (typeof window.ResizeObserver === "function" && headerEl.value) {
      headerResizeObserver = new window.ResizeObserver(() => {
        queueHeaderDensitySync();
      });
      headerResizeObserver.observe(headerEl.value);
    } else {
      window.addEventListener("resize", queueHeaderDensitySync);
    }
  }
});

onBeforeUnmount(() => {
  if (headerResizeObserver) {
    headerResizeObserver.disconnect();
    headerResizeObserver = null;
  }

  if (typeof window !== "undefined") {
    if (headerSyncFrame) {
      window.cancelAnimationFrame(headerSyncFrame);
      headerSyncFrame = 0;
    }
    window.removeEventListener("resize", queueHeaderDensitySync);
  }
});

watch(
  () => props.activeSection.id,
  () => {
    void nextTick(() => {
      queueHeaderDensitySync();
    });
  }
);
</script>

<template>
  <main class="shell" :data-header-density="headerDensity">
    <header ref="headerEl" class="shell-header" data-tauri-drag-region>
      <div class="shell-header-top">
        <div class="shell-brand" data-tauri-drag-region>
          <span class="shell-brand-mark">
            <img src="/logo.png" alt="emuBro" />
          </span>
          <span class="shell-brand-copy">
            <span class="shell-brand-wordmark">
              <strong>EMU</strong><em>BRO</em>
            </span>
            <small>{{ shellI18nStore.t("desktopShell.brand.runtime", "Desktop Runtime") }}</small>
          </span>
        </div>

        <nav
          class="shell-primary-nav"
          :aria-label="shellI18nStore.t('desktopShell.header.primaryNavAria', 'Primary shell sections')"
        >
          <button
            v-for="group in navigationGroups"
            :key="group.id"
            type="button"
            class="shell-nav-button"
            :class="{ 'is-active': activeGroup?.id === group.id }"
            @click="activateGroup(group.id)"
          >
            {{ shellI18nStore.t(group.labelKey, group.label) }}
          </button>
        </nav>

        <label class="shell-header-search" data-no-window-drag>
          <input
            :value="query"
            type="text"
            :placeholder="shellI18nStore.t('header.search', 'Search games...')"
            @input="headerFiltersStore.updateField('query', $event.target.value)"
          />
          <button
            v-if="query"
            type="button"
            class="shell-header-search-clear"
            :aria-label="shellI18nStore.t('desktopShell.header.clearSearch', 'Clear search')"
            :title="shellI18nStore.t('desktopShell.header.clearSearch', 'Clear search')"
            @click="clearHeaderQuery"
          >
            x
          </button>
        </label>

        <div class="shell-header-actions">
          <ShellQuickControls />
          <button
            type="button"
            class="shell-pill shell-pill-button shell-pill-button--updates"
            :class="{ 'has-update': hasAvailableUpdates }"
            :title="updateActivityLabel"
            :aria-label="updateActivityLabel"
            @click="windowChromeStore.openUpdatesPanel()"
          >
            <span>{{ shellI18nStore.t("desktopShell.header.updates", "Updates") }}</span>
            <strong>{{ hasAvailableUpdates ? availableUpdateCount : shellI18nStore.t("desktopShell.header.current", "Current") }}</strong>
            <em v-if="availableUpdateCount" class="shell-pill-badge">{{ availableUpdateCount }}</em>
          </button>
          <button
            type="button"
            class="shell-window-button"
            :title="shellI18nStore.t('desktopShell.header.aboutAria', 'About emuBro')"
            :aria-label="shellI18nStore.t('desktopShell.header.aboutAria', 'About emuBro')"
            @click="windowChromeStore.openAbout()"
          >
            {{ shellI18nStore.t("desktopShell.header.about", "About") }}
          </button>
          <button
            type="button"
            class="shell-window-button shell-window-button--chrome"
            :title="shellI18nStore.t('desktopShell.header.minimize', 'Minimize')"
            :aria-label="shellI18nStore.t('desktopShell.header.minimize', 'Minimize')"
            @click="$emit('minimize-window')"
          >
            -
          </button>
          <button
            type="button"
            class="shell-window-button shell-window-button--chrome"
            :title="windowMaximized ? shellI18nStore.t('desktopShell.header.restore', 'Restore') : shellI18nStore.t('desktopShell.header.max', 'Maximize')"
            :aria-label="windowMaximized ? shellI18nStore.t('desktopShell.header.restore', 'Restore') : shellI18nStore.t('desktopShell.header.max', 'Maximize')"
            @click="$emit('maximize-window')"
          >
            []
          </button>
          <button
            type="button"
            class="shell-window-button shell-window-button--chrome danger"
            :title="shellI18nStore.t('desktopShell.header.close', 'Close')"
            :aria-label="shellI18nStore.t('desktopShell.header.close', 'Close')"
            @click="$emit('close-window')"
          >
            x
          </button>
        </div>
      </div>
    </header>

    <section class="shell-body">
      <aside class="shell-sidebar-shell" :class="{ 'is-collapsed': !sidebarExpanded }">
        <div class="shell-rail">
          <button
            type="button"
            class="shell-rail-button shell-rail-button--brand"
            :aria-expanded="sidebarExpanded ? 'true' : 'false'"
            :title="
              sidebarExpanded
                ? shellI18nStore.t('desktopShell.sidebar.collapse', 'Collapse sidebar')
                : shellI18nStore.t('desktopShell.sidebar.expand', 'Expand sidebar')
            "
            @click="toggleSidebar"
          >
            <span class="shell-rail-icon" aria-hidden="true" v-html="getRailIconMarkup('menu', 'Menu')"></span>
          </button>

          <div class="shell-rail-group">
            <button
              v-for="group in navigationGroups"
              :key="group.id"
              type="button"
              class="shell-rail-button"
              :class="{ 'is-active': activeGroup?.id === group.id }"
              :title="shellI18nStore.t(group.labelKey, group.label)"
              :aria-label="shellI18nStore.t(group.labelKey, group.label)"
              @click="activateGroup(group.id)"
            >
              <span
                class="shell-rail-icon"
                aria-hidden="true"
                v-html="getRailIconMarkup(group.id, shellI18nStore.t(group.labelKey, group.label))"
              ></span>
            </button>
          </div>

          <div class="shell-rail-spacer"></div>

          <div class="shell-rail-group shell-rail-group--bottom">
            <button
              v-for="action in UTILITY_ACTIONS"
              :key="action.panelId"
              type="button"
              class="shell-rail-button shell-rail-button--utility"
              :class="{ 'is-active': isUtilityPanelActive(action.panelId) }"
              :title="shellI18nStore.t(action.labelKey, action.label)"
              :aria-label="shellI18nStore.t(action.labelKey, action.label)"
              @click="openSidebarUtilityPanel(action.panelId)"
            >
              <span
                class="shell-rail-icon"
                aria-hidden="true"
                v-html="getRailIconMarkup(action.panelId, shellI18nStore.t(action.labelKey, action.label))"
              ></span>
            </button>
          </div>
        </div>

        <div class="shell-sidebar-pane" :aria-hidden="sidebarExpanded ? 'false' : 'true'">
          <div class="shell-sidebar-pane-inner">
            <div class="shell-sidebar-header">
              <div>
                <div class="shell-sidebar-label">
                  {{
                    activeGroup
                      ? shellI18nStore.t(activeGroup.labelKey, activeGroup.label)
                      : shellI18nStore.t("desktopShell.brand.runtime", "Desktop Runtime")
                  }}
                </div>
                <p class="shell-sidebar-caption">
                  {{
                    activeGroup
                      ? shellI18nStore.t(activeGroup.captionKey, activeGroup.caption)
                      : shellI18nStore.t("desktopShell.brand.runtime", "Desktop Runtime")
                  }}
                </p>
              </div>
              <button
                type="button"
                class="shell-sidebar-collapse"
                :title="shellI18nStore.t('desktopShell.sidebar.collapse', 'Collapse sidebar')"
                :aria-label="shellI18nStore.t('desktopShell.sidebar.collapse', 'Collapse sidebar')"
                @click="toggleSidebar"
              >
                <span aria-hidden="true">&lt;</span>
              </button>
            </div>

            <div class="shell-sidebar-section">
              <div class="shell-sidebar-section-title">
                {{ shellI18nStore.t("desktopShell.sidebar.sections", "Sections") }}
              </div>
              <div class="shell-sidebar-section-list">
                <button
                  v-for="section in sidebarSections"
                  :key="section.id"
                  type="button"
                  class="shell-sidebar-link"
                  :class="{ 'is-active': section.id === props.activeSection.id }"
                  @click="selectSection(section.id)"
                >
                  <strong>{{ shellI18nStore.t(section.labelKey, section.label) }}</strong>
                  <small>{{ shellI18nStore.t(section.subtitleKey, section.subtitle) }}</small>
                </button>
              </div>
            </div>

            <div class="shell-sidebar-divider"></div>

            <div class="shell-sidebar-section">
              <div class="shell-sidebar-section-title">
                {{ shellI18nStore.t("desktopShell.sidebar.quickActions", "Quick actions") }}
              </div>
              <div class="shell-sidebar-section-list">
                <button
                  v-for="action in UTILITY_ACTIONS"
                  :key="action.panelId"
                  type="button"
                  class="shell-sidebar-link shell-sidebar-link--utility"
                  :class="{ 'is-active': isUtilityPanelActive(action.panelId) }"
                  @click="openSidebarUtilityPanel(action.panelId)"
                >
                  <strong>{{ shellI18nStore.t(action.labelKey, action.label) }}</strong>
                  <small>{{ shellI18nStore.t(action.subtitleKey, action.subtitle) }}</small>
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <section class="shell-stage" :class="{ 'has-stage-header': shouldShowStageHeader, 'has-toolbar': !!$slots.toolbar }">
        <div v-if="shouldShowStageHeader" class="shell-stage-header">
          <div class="shell-stage-header-top">
            <div>
              <div class="eyebrow">
                {{
                  activeGroup
                    ? shellI18nStore.t(activeGroup.labelKey, activeGroup.label)
                    : shellI18nStore.t("desktopShell.brand.runtime", "Desktop Runtime")
                }}
              </div>
              <h1>{{ shellI18nStore.t(props.activeSection.titleKey, props.activeSection.title) }}</h1>
              <p>{{ shellI18nStore.t(props.activeSection.subtitleKey, props.activeSection.subtitle) }}</p>
            </div>
            <div class="shell-stage-header-meta">
              <span class="shell-stage-meta-pill">{{ userInfo.displayName || "Guest" }}</span>
            </div>
          </div>

          <div v-if="topSectionTabs.length && !sidebarExpanded" class="shell-section-tabs" data-no-window-drag>
            <button
              v-for="section in topSectionTabs"
              :key="section.id"
              type="button"
              class="shell-section-tab"
              :class="{ 'is-active': section.id === props.activeSection.id }"
              @click="selectSection(section.id)"
            >
              {{ shellI18nStore.t(section.labelKey, section.label) }}
            </button>
          </div>
        </div>

        <div class="shell-toolbar-wrap" :class="{ 'is-empty': !$slots.toolbar }">
          <slot name="toolbar" />
        </div>

        <div class="shell-stage-content">
          <slot />
        </div>
      </section>
    </section>

    <ShellAboutModal />
  </main>
</template>
