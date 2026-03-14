import { deleteNativeShellState, readNativeShellState, writeNativeShellState } from "../utils/shell-state";
import {
  getShellStorageValue,
  removeShellStorageValue,
  setShellStorageValue
} from "../utils/shell-storage-cache";

export const DEFAULT_STARTUP_SECTION_ID = "library-views";

const SHELL_SECTIONS = [
  {
    id: "legacy-home",
    label: "Legacy UI",
    title: "emuBro Legacy UI",
    subtitle: "Current stable runtime hosted inside the desktop shell",
    labelKey: "desktopShell.sections.legacyHome.label",
    titleKey: "desktopShell.sections.legacyHome.title",
    subtitleKey: "desktopShell.sections.legacyHome.subtitle",
    renderMode: "legacy"
  },
  {
    id: "library-views",
    label: "Library Views",
    title: "Library and Game View Workspace",
    subtitle: "Shared library data layer for future migrated game and emulator views",
    labelKey: "desktopShell.sections.libraryViews.label",
    titleKey: "desktopShell.sections.libraryViews.title",
    subtitleKey: "desktopShell.sections.libraryViews.subtitle",
    renderMode: "desktop"
  },
  {
    id: "header-filters",
    label: "Header + Filters",
    title: "Header, Search, and Filter State",
    subtitle: "Centralized shell state for search, grouping, sorting, and cover sizing",
    labelKey: "desktopShell.sections.headerFilters.label",
    titleKey: "desktopShell.sections.headerFilters.title",
    subtitleKey: "desktopShell.sections.headerFilters.subtitle",
    renderMode: "desktop"
  },
  {
    id: "theme-window",
    label: "Theme + Window",
    title: "Theme and Window Chrome",
    subtitle: "Shell-owned theme tone and native window state migrated out of the legacy bootstrap",
    labelKey: "desktopShell.sections.themeWindow.label",
    titleKey: "desktopShell.sections.themeWindow.title",
    subtitleKey: "desktopShell.sections.themeWindow.subtitle",
    renderMode: "desktop"
  },
  {
    id: "settings-tools",
    label: "Settings + Tools",
    title: "Settings, Language, and Tools",
    subtitle: "Desktop-managed settings, locale catalog, and plugin/tool readiness",
    labelKey: "desktopShell.sections.settingsTools.label",
    titleKey: "desktopShell.sections.settingsTools.title",
    subtitleKey: "desktopShell.sections.settingsTools.subtitle",
    renderMode: "desktop"
  },
  {
    id: "support-center",
    label: "Support",
    title: "Support and Help Center",
    subtitle: "Shell-native troubleshooting, chat, system specs, and help docs",
    labelKey: "desktopShell.sections.supportCenter.label",
    titleKey: "desktopShell.sections.supportCenter.title",
    subtitleKey: "desktopShell.sections.supportCenter.subtitle",
    renderMode: "desktop"
  },
  {
    id: "community-hub",
    label: "Community",
    title: "Community Hub",
    subtitle: "Desktop-managed community links and in-app browser launch flows",
    labelKey: "desktopShell.sections.communityHub.label",
    titleKey: "desktopShell.sections.communityHub.title",
    subtitleKey: "desktopShell.sections.communityHub.subtitle",
    renderMode: "desktop"
  },
  {
    id: "desktop-home",
    label: "Overview",
    title: "Desktop Runtime Overview",
    subtitle: "Shell-native overview hub for startup control, diagnostics, and cross-section shortcuts",
    labelKey: "desktopShell.sections.desktopHome.label",
    titleKey: "desktopShell.sections.desktopHome.title",
    subtitleKey: "desktopShell.sections.desktopHome.subtitle",
    renderMode: "desktop"
  }
];

const SECTION_BY_ID = new Map(SHELL_SECTIONS.map((section) => [section.id, section]));
const STARTUP_SECTION_STORAGE_KEY = "emubro.desktop.startup-section";
const STARTUP_SECTION_STATE_KEY = "startup-section";

function normalizeSectionId(rawValue) {
  const value = String(rawValue || "").trim().toLowerCase();
  if (!value) return DEFAULT_STARTUP_SECTION_ID;
  if (value === "legacy") return "legacy-home";
  if (value === "desktop") return "desktop-home";
  if (value === "theme") return "theme-window";
  if (value === "filters") return "header-filters";
  if (value === "settings") return "settings-tools";
  if (value === "profile") return "settings-tools";
  if (value === "gamepad") return "settings-tools";
  if (value === "tools") return "settings-tools";
  if (value === "languages") return "settings-tools";
  if (value === "ai") return "settings-tools";
  if (value === "updates") return "settings-tools";
  if (value === "library") return "library-views";
  if (value === "support") return "support-center";
  if (value === "community") return "community-hub";
  if (SECTION_BY_ID.has(value)) return value;
  return DEFAULT_STARTUP_SECTION_ID;
}

export function listShellSections() {
  return SHELL_SECTIONS.map((section) => ({ ...section }));
}

export function getShellSection(id) {
  return SECTION_BY_ID.get(normalizeSectionId(id)) || SECTION_BY_ID.get(DEFAULT_STARTUP_SECTION_ID);
}

export function readPreferredStartupSectionId() {
  const value = getShellStorageValue(STARTUP_SECTION_STORAGE_KEY, "");
  return value ? normalizeSectionId(value) : DEFAULT_STARTUP_SECTION_ID;
}

export function writePreferredStartupSectionId(sectionId) {
  const normalized = normalizeSectionId(sectionId);
  setShellStorageValue(STARTUP_SECTION_STORAGE_KEY, normalized);
  return normalized;
}

export function clearPreferredStartupSectionId() {
  removeShellStorageValue(STARTUP_SECTION_STORAGE_KEY);
  return DEFAULT_STARTUP_SECTION_ID;
}

export async function readPreferredStartupSectionIdAsync() {
  const fallback = readPreferredStartupSectionId();
  const value = await readNativeShellState(STARTUP_SECTION_STATE_KEY, fallback);
  const normalized = normalizeSectionId(value);
  writePreferredStartupSectionId(normalized);
  return normalized;
}

export async function writePreferredStartupSectionIdAsync(sectionId) {
  const normalized = writePreferredStartupSectionId(sectionId);
  await writeNativeShellState(STARTUP_SECTION_STATE_KEY, normalized);
  return normalized;
}

export async function clearPreferredStartupSectionIdAsync() {
  clearPreferredStartupSectionId();
  await deleteNativeShellState(STARTUP_SECTION_STATE_KEY);
  return DEFAULT_STARTUP_SECTION_ID;
}

export function hasExplicitSectionSelectionInLocation() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const currentUrl = new URL(window.location.href);
    if (String(currentUrl.searchParams.get("section") || "").trim()) {
      return true;
    }

    const hashValue = currentUrl.hash.replace(/^#/, "").trim();
    return !!hashValue;
  } catch (_error) {
    return false;
  }
}

export function resolveInitialShellSectionId() {
  try {
    const currentUrl = new URL(window.location.href);
    const sectionParam = currentUrl.searchParams.get("section");
    if (sectionParam) return normalizeSectionId(sectionParam);

    const desktopParam = currentUrl.searchParams.get("desktop");
    if (desktopParam === "1" || desktopParam === "true") {
      const preferredSection = readPreferredStartupSectionId();
      return getShellSection(preferredSection).renderMode === "desktop"
        ? preferredSection
        : DEFAULT_STARTUP_SECTION_ID;
    }

    const hashValue = currentUrl.hash.replace(/^#/, "").trim();
    if (hashValue) return normalizeSectionId(hashValue);
  } catch (_error) {}

  const preferredSection = readPreferredStartupSectionId();
  if (preferredSection) {
    return preferredSection;
  }

  return DEFAULT_STARTUP_SECTION_ID;
}
