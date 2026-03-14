import { defineStore } from "pinia";
import { normalizeLocaleOption, normalizePlatformOption } from "../utils/library-data";
import { readNativeShellState, writeNativeShellState } from "../utils/shell-state";
import { getShellStorageValue, setShellStorageValue } from "../utils/shell-storage-cache";

const STORAGE_KEY = "emubro.desktop.header-filters";
const STATE_KEY = "header-filters";
const LIBRARY_SECTION_QUERY_KEY = "library";
const VIEW_MODE_QUERY_KEY = "view";
const QUERY_QUERY_KEY = "query";
const PLATFORM_QUERY_KEY = "platform";
const REGION_QUERY_KEY = "region";
const LANGUAGE_QUERY_KEY = "language";
const GROUP_QUERY_KEY = "group";
const SORT_QUERY_KEY = "sort";
const EMULATOR_TYPE_QUERY_KEY = "emulatorType";

const REGION_OPTIONS = [
  { id: "all", label: "All Regions" },
  { id: "us", label: "USA" },
  { id: "eu", label: "Europe" },
  { id: "jp", label: "Japan" }
];

const GROUP_OPTIONS = [
  { id: "none", label: "None" },
  { id: "platform", label: "Platform" },
  { id: "company", label: "Company" },
  { id: "series", label: "Series" }
];

const LIBRARY_SECTION_OPTIONS = [
  { id: "all", label: "All Games" },
  { id: "suggested", label: "Suggested Games" },
  { id: "recent", label: "Recently Played" },
  { id: "emulators", label: "Emulators" }
];
const LIBRARY_SECTION_IDS = new Set(["all", "suggested", "recent", "emulators"]);

const EMULATOR_TYPE_OPTIONS = [
  { id: "all", label: "All Types" },
  { id: "standalone", label: "Standalone" },
  { id: "core", label: "Cores" },
  { id: "web", label: "Web" }
];

const VIEW_MODE_OPTIONS = [
  { id: "cover", label: "Cover" },
  { id: "list", label: "List" },
  { id: "focus", label: "Focus" },
  { id: "slideshow", label: "Slideshow" },
  { id: "random", label: "Random" }
];

function normalizeViewMode(viewMode, librarySection = "all") {
  const value = String(viewMode || "").trim().toLowerCase();
  const isEmulatorSection = String(librarySection || "").trim().toLowerCase() === "emulators";
  if (isEmulatorSection) {
    return value === "list" ? "list" : "cover";
  }
  if (VIEW_MODE_OPTIONS.some((row) => row.id === value)) {
    return value;
  }
  return "cover";
}

const SORT_OPTIONS = [
  { id: "name", label: "Sort by Name" },
  { id: "platform", label: "Sort by Platform" },
  { id: "rating", label: "Sort by Rating" },
  { id: "recent", label: "Recently Played" }
];

function getDesktopBridge() {
  if (typeof window === "undefined" || !window.emubro) {
    return null;
  }
  return window.emubro;
}

function dedupeOptions(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    if (!row || seen.has(row.id)) {
      return false;
    }
    seen.add(row.id);
    return true;
  });
}

function normalizeLibrarySectionId(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "favorite") {
    return "suggested";
  }
  return LIBRARY_SECTION_IDS.has(normalized) ? normalized : "all";
}

function readPersistedState() {
  try {
    const raw = getShellStorageValue(STORAGE_KEY, "");
    return raw ? JSON.parse(raw) : {};
  } catch (_error) {
    return {};
  }
}

function readLegacyLibraryDefaults() {
  return {
    librarySection: String(getShellStorageValue("emuBro.defaultLibrarySection", "") || ""),
    viewMode: String(getShellStorageValue("emuBro.defaultLibraryView", "") || "")
  };
}

function isLibraryRouteSection(sectionId) {
  const normalized = String(sectionId || "").trim().toLowerCase();
  return normalized === "library-views" || normalized === "header-filters" || normalized === "library" || normalized === "filters";
}

function readLocationState() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const currentUrl = new URL(window.location.href);
    const sectionId = String(currentUrl.searchParams.get("section") || "").trim().toLowerCase();
    if (!isLibraryRouteSection(sectionId)) {
      return {};
    }

    return {
      librarySection: currentUrl.searchParams.get(LIBRARY_SECTION_QUERY_KEY) || "",
      viewMode: currentUrl.searchParams.get(VIEW_MODE_QUERY_KEY) || "",
      query: currentUrl.searchParams.get(QUERY_QUERY_KEY) || "",
      selectedPlatform: currentUrl.searchParams.get(PLATFORM_QUERY_KEY) || "",
      selectedRegion: currentUrl.searchParams.get(REGION_QUERY_KEY) || "",
      selectedLanguage: currentUrl.searchParams.get(LANGUAGE_QUERY_KEY) || "",
      selectedGroup: currentUrl.searchParams.get(GROUP_QUERY_KEY) || "",
      sortBy: currentUrl.searchParams.get(SORT_QUERY_KEY) || "",
      emulatorType: currentUrl.searchParams.get(EMULATOR_TYPE_QUERY_KEY) || ""
    };
  } catch (_error) {
    return {};
  }
}

function syncLocationState(snapshot) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const currentUrl = new URL(window.location.href);
    const sectionId = String(currentUrl.searchParams.get("section") || "").trim().toLowerCase();
    if (!isLibraryRouteSection(sectionId)) {
      return;
    }

    const setOptional = (key, value, fallback = "all") => {
      const normalized = String(value || "").trim();
      if (!normalized || normalized === fallback) {
        currentUrl.searchParams.delete(key);
        return;
      }
      currentUrl.searchParams.set(key, normalized);
    };

    setOptional(LIBRARY_SECTION_QUERY_KEY, snapshot.librarySection, "all");
    setOptional(VIEW_MODE_QUERY_KEY, snapshot.viewMode, "cover");
    setOptional(QUERY_QUERY_KEY, snapshot.query, "");
    setOptional(PLATFORM_QUERY_KEY, snapshot.selectedPlatform, "all");
    setOptional(REGION_QUERY_KEY, snapshot.selectedRegion, "all");
    setOptional(LANGUAGE_QUERY_KEY, snapshot.selectedLanguage, "all");
    setOptional(GROUP_QUERY_KEY, snapshot.selectedGroup, "none");
    setOptional(SORT_QUERY_KEY, snapshot.sortBy, "name");
    setOptional(EMULATOR_TYPE_QUERY_KEY, snapshot.emulatorType, "all");
    window.history.replaceState({}, "", currentUrl.toString());
  } catch (_error) {}
}

function persistState(snapshot) {
  setShellStorageValue(STORAGE_KEY, JSON.stringify(snapshot));
  syncLocationState(snapshot);
  void writeNativeShellState(STATE_KEY, snapshot);
}

function applyPersistedSnapshot(store, snapshot = {}) {
  const source = snapshot && typeof snapshot === "object" ? snapshot : {};
  const rawRegion = String(source.selectedRegion || "all")
    .trim()
    .toLowerCase();
  const normalizedRegion =
    rawRegion === "usa" ? "us" : rawRegion === "europe" ? "eu" : rawRegion === "japan" ? "jp" : rawRegion;

  store.librarySection = normalizeLibrarySectionId(source.librarySection);
  store.emulatorType = ["standalone", "core", "web"].includes(String(source.emulatorType || "").trim().toLowerCase())
    ? String(source.emulatorType).trim().toLowerCase()
    : "all";
  store.query = String(source.query || "");
  store.viewMode = normalizeViewMode(source.viewMode, store.librarySection);
  store.coverSize = Number.isFinite(Number(source.coverSize))
    ? Math.min(100, Math.max(30, Number(source.coverSize)))
    : 70;
  store.selectedPlatform = String(source.selectedPlatform || "all");
  store.selectedRegion =
    normalizedRegion === "us" || normalizedRegion === "eu" || normalizedRegion === "jp" ? normalizedRegion : "all";
  store.selectedLanguage = String(source.selectedLanguage || "all");
  store.selectedGroup = String(source.selectedGroup || "none");
  store.sortBy = String(source.sortBy || "name");
  store.groupSameNames = source.groupSameNames === true;
}

function getInitialState() {
  const persisted = readPersistedState();
  const locationState = readLocationState();
  const legacyDefaults = readLegacyLibraryDefaults();
  const source = { ...legacyDefaults, ...persisted, ...locationState };
  const persistedRegion = String(persisted.selectedRegion || "all")
    .trim()
    .toLowerCase();
  const locationRegion = String(locationState.selectedRegion || "").trim().toLowerCase();
  const rawRegion = locationRegion || persistedRegion;
  const normalizedRegion =
    rawRegion === "usa" ? "us" : rawRegion === "europe" ? "eu" : rawRegion === "japan" ? "jp" : rawRegion;
  const selectedRegion = normalizedRegion === "us" || normalizedRegion === "eu" || normalizedRegion === "jp" ? normalizedRegion : "all";

  return {
    initialized: false,
    loading: false,
    librarySection: normalizeLibrarySectionId(source.librarySection),
    emulatorType: ["standalone", "core", "web"].includes(String(source.emulatorType || "").trim().toLowerCase())
      ? String(source.emulatorType).trim().toLowerCase()
      : "all",
    query: String(source.query || ""),
    viewMode: normalizeViewMode(source.viewMode, source.librarySection),
    coverSize: Number.isFinite(Number(persisted.coverSize)) ? Math.min(100, Math.max(30, Number(persisted.coverSize))) : 70,
    selectedPlatform: String(source.selectedPlatform || "all"),
    selectedRegion,
    selectedLanguage: String(source.selectedLanguage || "all"),
    selectedGroup: String(source.selectedGroup || "none"),
    sortBy: String(source.sortBy || "name"),
    groupSameNames: persisted.groupSameNames === true,
    librarySectionOptions: LIBRARY_SECTION_OPTIONS,
    emulatorTypeOptions: EMULATOR_TYPE_OPTIONS,
    viewModeOptions: VIEW_MODE_OPTIONS,
    platformOptions: [{ id: "all", label: "All Platforms" }],
    regionOptions: REGION_OPTIONS,
    languageOptions: [{ id: "all", label: "All Languages" }],
    groupOptions: GROUP_OPTIONS,
    sortOptions: SORT_OPTIONS
  };
}

function getDefaultFieldState() {
  return {
    librarySection: "all",
    emulatorType: "all",
    query: "",
    viewMode: "cover",
    coverSize: 70,
    selectedPlatform: "all",
    selectedRegion: "all",
    selectedLanguage: "all",
    selectedGroup: "none",
    sortBy: "name",
    groupSameNames: false
  };
}

export const useHeaderFiltersStore = defineStore("headerFilters", {
  state: () => getInitialState(),
  getters: {
    summary(state) {
      const platformLabel =
        state.platformOptions.find((row) => row.id === state.selectedPlatform)?.label || "All Platforms";
      const librarySectionLabel =
        state.librarySectionOptions.find((row) => row.id === state.librarySection)?.label || "All Games";
      const emulatorTypeLabel =
        state.emulatorTypeOptions.find((row) => row.id === state.emulatorType)?.label || "All Types";
      const regionLabel =
        state.regionOptions.find((row) => row.id === state.selectedRegion)?.label || "All Regions";
      const languageLabel =
        state.languageOptions.find((row) => row.id === state.selectedLanguage)?.label || "All Languages";
      const groupLabel =
        state.groupOptions.find((row) => row.id === state.selectedGroup)?.label || "None";
      const sortLabel =
        state.sortOptions.find((row) => row.id === state.sortBy)?.label || "Sort by Name";

      return {
        librarySectionLabel,
        emulatorTypeLabel,
        platformLabel,
        regionLabel,
        languageLabel,
        groupLabel,
        sortLabel
      };
    }
  },
  actions: {
    persist() {
      persistState({
        librarySection: this.librarySection,
        emulatorType: this.emulatorType,
        query: this.query,
        viewMode: this.viewMode,
        coverSize: this.coverSize,
        selectedPlatform: this.selectedPlatform,
        selectedRegion: this.selectedRegion,
        selectedLanguage: this.selectedLanguage,
        selectedGroup: this.selectedGroup,
        sortBy: this.sortBy,
        groupSameNames: this.groupSameNames
      });
    },
    updateField(field, value) {
      if (!(field in this.$state)) {
        return;
      }
      if (field === "librarySection") {
        this.librarySection = String(value || "all").trim().toLowerCase();
        this.viewMode = normalizeViewMode(this.viewMode, this.librarySection);
        this.persist();
        return;
      }
      if (field === "viewMode") {
        this.viewMode = normalizeViewMode(value, this.librarySection);
        this.persist();
        return;
      }
      this[field] = value;
      this.persist();
    },
    reset() {
      Object.assign(this, getDefaultFieldState());
      this.persist();
    },
    async initialize() {
      if (this.initialized || this.loading) {
        return;
      }

      this.loading = true;
      try {
        const persistedState = await readNativeShellState(STATE_KEY, readPersistedState());
        applyPersistedSnapshot(this, {
          ...persistedState,
          ...readLocationState()
        });

        const bridge = getDesktopBridge();
        if (!bridge || typeof bridge.invoke !== "function") {
          this.initialized = true;
          this.persist();
          return;
        }

        const [platformRows, localeRows] = await Promise.all([
          bridge.invoke("get-platforms"),
          bridge.invoke("locales:list")
        ]);

        const platforms = dedupeOptions(
          (Array.isArray(platformRows) ? platformRows : [])
            .map((row, index) => normalizePlatformOption(row, index))
            .filter(Boolean)
        );
        const languages = dedupeOptions(
          (Array.isArray(localeRows) ? localeRows : [])
            .map((row, index) => normalizeLocaleOption(row, index))
            .filter(Boolean)
        );

        this.platformOptions = [{ id: "all", label: "All Platforms" }, ...platforms];
        this.languageOptions = [{ id: "all", label: "All Languages" }, ...languages];
        this.initialized = true;
        this.persist();
      } finally {
        this.loading = false;
      }
    }
  }
});
