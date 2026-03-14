import { defineStore } from "pinia";
import { getGameTagIds, normalizeTagCategory } from "../utils/tag-categories";
import { dedupeTagRows, formatTagLabel } from "../utils/tags";
import { useWorkspaceStore } from "./workspace";
import { readNativeShellState, writeNativeShellState } from "../utils/shell-state";
import { getShellStorageValue, setShellStorageValue } from "../utils/shell-storage-cache";

const CATEGORY_SELECTION_MODE_KEY = "emuBro.categorySelectionMode.v1";
const CATEGORY_SORT_MODE_KEY = "emuBro.categorySortMode.v1";
const CATEGORY_SHOW_ALL_KEY = "emuBro.categoryShowAll.v1";
const CATEGORY_VISIBLE_LIMIT = 10;
const LIBRARY_CATEGORIES_STATE_KEY = "library-categories";

function getDesktopBridge() {
  if (typeof window === "undefined" || !window.emubro) {
    return null;
  }
  return window.emubro;
}

function readStorage(key, fallback = "") {
  return getShellStorageValue(key, fallback);
}

function writeStorage(key, value) {
  setShellStorageValue(key, String(value ?? ""));
}

function normalizeSelectionMode(value) {
  return String(value || "").trim().toLowerCase() === "multi" ? "multi" : "single";
}

function normalizeSortMode(value) {
  return String(value || "").trim().toLowerCase() === "name-asc" ? "name-asc" : "count-desc";
}

function readStoredBoolean(key, fallback = false) {
  return String(readStorage(key, fallback ? "true" : "false")).trim().toLowerCase() === "true";
}

function normalizeCategoriesUiState(raw = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    selectionMode: normalizeSelectionMode(source.selectionMode),
    sortMode: normalizeSortMode(source.sortMode),
    showAll: !!source.showAll
  };
}

export const useLibraryCategoriesStore = defineStore("libraryCategories", {
  state: () => ({
    initialized: false,
    loading: false,
    selectionMode: normalizeSelectionMode(readStorage(CATEGORY_SELECTION_MODE_KEY, "multi")),
    sortMode: normalizeSortMode(readStorage(CATEGORY_SORT_MODE_KEY, "count-desc")),
    showAll: readStoredBoolean(CATEGORY_SHOW_ALL_KEY, false),
    selectedTagIds: [],
    catalog: [],
    lastError: ""
  }),
  getters: {
    activeTagIds(state) {
      return state.selectedTagIds.map((tagId) => normalizeTagCategory(tagId)).filter((tagId) => tagId && tagId !== "all");
    },
    hasSelection(state) {
      return state.selectedTagIds.length > 0;
    },
    categoryRows(state) {
      const workspaceStore = useWorkspaceStore();
      const labelMap = new Map(state.catalog.map((row) => [row.id, row.label]));
      const counts = new Map();

      workspaceStore.games.forEach((game) => {
        getGameTagIds(game.raw || game).forEach((tagId) => {
          counts.set(tagId, (counts.get(tagId) || 0) + 1);
        });
      });

      const rows = Array.from(counts.entries()).map(([id, count]) => ({
        id,
        label: labelMap.get(id) || formatTagLabel(normalizeTagCategory(id)),
        count: Number(count) || 0,
        selected: state.selectedTagIds.includes(id)
      }));

      rows.sort((a, b) => {
        if (state.sortMode === "count-desc") {
          return Number(b.count || 0) - Number(a.count || 0) || String(a.label).localeCompare(String(b.label));
        }
        return String(a.label).localeCompare(String(b.label));
      });

      return rows;
    },
    visibleCategoryRows(state) {
      const rows = this.categoryRows;
      return state.showAll ? rows : rows.slice(0, CATEGORY_VISIBLE_LIMIT);
    }
  },
  actions: {
    persistUiState() {
      writeStorage(CATEGORY_SELECTION_MODE_KEY, this.selectionMode);
      writeStorage(CATEGORY_SORT_MODE_KEY, this.sortMode);
      writeStorage(CATEGORY_SHOW_ALL_KEY, this.showAll ? "true" : "false");
      void writeNativeShellState(LIBRARY_CATEGORIES_STATE_KEY, {
        selectionMode: this.selectionMode,
        sortMode: this.sortMode,
        showAll: this.showAll
      });
    },
    async refreshCatalog() {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.catalog = [];
        return;
      }

      this.loading = true;
      this.lastError = "";
      try {
        const result = await bridge.invoke("tags:list");
        this.catalog = dedupeTagRows(result?.tags).map((row) => ({
          ...row,
          id: normalizeTagCategory(row.id)
        }));
      } catch (error) {
        this.catalog = [];
        this.lastError = error instanceof Error ? error.message : String(error || "Unknown error");
      } finally {
        this.loading = false;
      }
    },
    setSelectionMode(mode) {
      this.selectionMode = normalizeSelectionMode(mode);
      if (this.selectionMode === "single" && this.selectedTagIds.length > 1) {
        this.selectedTagIds = this.selectedTagIds.slice(0, 1);
      }
      this.persistUiState();
    },
    setSortMode(mode) {
      this.sortMode = normalizeSortMode(mode);
      this.persistUiState();
    },
    toggleShowAll() {
      this.showAll = !this.showAll;
      this.persistUiState();
    },
    clearSelection() {
      this.selectedTagIds = [];
    },
    toggleTag(tagId) {
      const normalized = normalizeTagCategory(tagId);
      if (!normalized || normalized === "all") {
        this.clearSelection();
        return;
      }

      if (this.selectionMode === "single") {
        this.selectedTagIds = this.selectedTagIds[0] === normalized ? [] : [normalized];
        return;
      }

      if (this.selectedTagIds.includes(normalized)) {
        this.selectedTagIds = this.selectedTagIds.filter((entry) => entry !== normalized);
        return;
      }
      this.selectedTagIds = [...this.selectedTagIds, normalized];
    },
    async initialize() {
      if (this.initialized) {
        return;
      }
      const persisted = normalizeCategoriesUiState(
        await readNativeShellState(LIBRARY_CATEGORIES_STATE_KEY, {
          selectionMode: readStorage(CATEGORY_SELECTION_MODE_KEY, "multi"),
          sortMode: readStorage(CATEGORY_SORT_MODE_KEY, "count-desc"),
          showAll: readStoredBoolean(CATEGORY_SHOW_ALL_KEY, false)
        })
      );
      this.selectionMode = persisted.selectionMode;
      this.sortMode = persisted.sortMode;
      this.showAll = persisted.showAll;
      await this.refreshCatalog();
      this.persistUiState();
      this.initialized = true;
    }
  }
});
