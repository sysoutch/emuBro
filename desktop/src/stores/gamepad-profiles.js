import { defineStore } from "pinia";
import {
  GAMEPAD_BINDING_ACTIONS,
  loadPlatformGamepadBindingsMap,
  normalizeInputBindingProfile,
  savePlatformGamepadBindingsMap
} from "../utils/gamepad-bindings";
import { readNativeShellState, writeNativeShellState } from "../utils/shell-state";
import {
  getShellStorageValue,
  removeShellStorageValue,
  setShellStorageValue
} from "../utils/shell-storage-cache";

const ACTIVE_PLATFORM_STORAGE_KEY = "emubro.desktop.gamepad-profiles.active-platform";
const GAMEPAD_PROFILES_STATE_KEY = "gamepad-profiles";

function normalizePlatformRows(rows = []) {
  const seen = new Set();
  return (Array.isArray(rows) ? rows : [])
    .map((row, index) => {
      const shortName = String(row?.shortName || row?.id || `platform-${index + 1}`)
        .trim()
        .toLowerCase();
      const label = String(row?.label || row?.platform || row?.name || shortName.toUpperCase()).trim();
      if (!shortName || seen.has(shortName)) {
        return null;
      }
      seen.add(shortName);
      return {
        id: shortName,
        shortName,
        label: label || shortName.toUpperCase()
      };
    })
    .filter(Boolean);
}

function cloneProfilesMap(source = {}) {
  const out = {};
  Object.entries(source && typeof source === "object" ? source : {}).forEach(([platformShortName, bindings]) => {
    const key = String(platformShortName || "").trim().toLowerCase();
    if (!key) {
      return;
    }
    const normalized = normalizeInputBindingProfile(bindings || {});
    const hasBindings = Object.keys(normalized.keyboard || {}).length > 0 || Object.keys(normalized.gamepad || {}).length > 0;
    if (hasBindings) {
      out[key] = normalized;
    }
  });
  return out;
}

function readActivePlatformId() {
  return String(getShellStorageValue(ACTIVE_PLATFORM_STORAGE_KEY, "") || "").trim().toLowerCase();
}

function writeActivePlatformId(platformId) {
  const normalized = String(platformId || "").trim().toLowerCase();
  if (normalized) {
    setShellStorageValue(ACTIVE_PLATFORM_STORAGE_KEY, normalized);
  } else {
    removeShellStorageValue(ACTIVE_PLATFORM_STORAGE_KEY);
  }
  return normalized;
}

function resolvePlatformId(platformId, platformRows = []) {
  const normalizedRows = normalizePlatformRows(platformRows);
  const requestedId = String(platformId || "").trim().toLowerCase();
  if (requestedId && normalizedRows.some((row) => row.id === requestedId)) {
    return requestedId;
  }
  return normalizedRows[0]?.id || "";
}

export const useGamepadProfilesStore = defineStore("gamepadProfiles", {
  state: () => ({
    initialized: false,
    activePlatformId: readActivePlatformId(),
    savedProfiles: {},
    draftProfiles: {},
    status: "",
    statusTone: "",
    saving: false
  }),
  getters: {
    activeBindings(state) {
      return normalizeInputBindingProfile(state.draftProfiles[state.activePlatformId] || {});
    },
    hasDraftChanges(state) {
      return JSON.stringify(state.savedProfiles) !== JSON.stringify(state.draftProfiles);
    },
    configuredProfileCount(state) {
      return Object.keys(state.savedProfiles).length;
    }
  },
  actions: {
    persistNativeState() {
      void writeNativeShellState(GAMEPAD_PROFILES_STATE_KEY, {
        activePlatformId: this.activePlatformId,
        profiles: this.savedProfiles
      });
    },
    async initialize(platformRows = []) {
      if (this.initialized) {
        this.syncPlatforms(platformRows);
        return;
      }
      const persisted = await readNativeShellState(GAMEPAD_PROFILES_STATE_KEY, {
        activePlatformId: this.activePlatformId || readActivePlatformId(),
        profiles: loadPlatformGamepadBindingsMap()
      });
      const loadedProfiles = cloneProfilesMap(persisted?.profiles || {});
      this.savedProfiles = loadedProfiles;
      this.draftProfiles = cloneProfilesMap(loadedProfiles);
      this.activePlatformId = resolvePlatformId(persisted?.activePlatformId || this.activePlatformId || readActivePlatformId(), platformRows);
      writeActivePlatformId(this.activePlatformId);
      this.persistNativeState();
      this.initialized = true;
      if (!this.activePlatformId) {
        this.status = "No platforms available yet. Refresh the workspace first.";
        this.statusTone = "warning";
      }
    },
    syncPlatforms(platformRows = []) {
      const nextPlatformId = resolvePlatformId(this.activePlatformId || readActivePlatformId(), platformRows);
      if (nextPlatformId !== this.activePlatformId) {
        this.activePlatformId = nextPlatformId;
        writeActivePlatformId(this.activePlatformId);
        this.persistNativeState();
      }
      if (!nextPlatformId && platformRows.length) {
        this.status = "Platform selection could not be restored.";
        this.statusTone = "warning";
      }
    },
    selectPlatform(platformId, platformRows = []) {
      this.activePlatformId = resolvePlatformId(platformId, platformRows);
      writeActivePlatformId(this.activePlatformId);
      this.persistNativeState();
      this.status = "";
      this.statusTone = "";
    },
    setBinding(channel, action, value, platformId = this.activePlatformId) {
      const normalizedPlatformId = String(platformId || "").trim().toLowerCase();
      const normalizedAction = String(action || "").trim().toLowerCase();
      if (!normalizedPlatformId || !GAMEPAD_BINDING_ACTIONS.includes(normalizedAction)) {
        return;
      }

      const normalizedChannel = String(channel || "").trim().toLowerCase() === "keyboard" ? "keyboard" : "gamepad";
      const nextProfiles = cloneProfilesMap(this.draftProfiles);
      const nextProfile = normalizeInputBindingProfile(nextProfiles[normalizedPlatformId] || {});
      const nextValue = String(value || "").trim();
      if (nextValue) {
        nextProfile[normalizedChannel][normalizedAction] = nextValue;
      } else {
        delete nextProfile[normalizedChannel][normalizedAction];
      }

      const hasBindings = Object.keys(nextProfile.keyboard || {}).length > 0 || Object.keys(nextProfile.gamepad || {}).length > 0;
      if (hasBindings) {
        nextProfiles[normalizedPlatformId] = nextProfile;
      } else {
        delete nextProfiles[normalizedPlatformId];
      }

      this.draftProfiles = nextProfiles;
      this.status = "Unsaved gamepad profile changes.";
      this.statusTone = this.hasDraftChanges ? "warning" : "";
    },
    clearActivePlatform() {
      if (!this.activePlatformId) {
        return;
      }
      const nextProfiles = cloneProfilesMap(this.draftProfiles);
      delete nextProfiles[this.activePlatformId];
      this.draftProfiles = nextProfiles;
      this.status = "Cleared bindings for the selected platform.";
      this.statusTone = "warning";
    },
    resetDraft() {
      this.draftProfiles = cloneProfilesMap(this.savedProfiles);
      this.status = "Reverted unsaved gamepad profile changes.";
      this.statusTone = "";
    },
    save() {
      this.saving = true;
      try {
        savePlatformGamepadBindingsMap(this.draftProfiles);
        this.savedProfiles = cloneProfilesMap(this.draftProfiles);
        this.persistNativeState();
        this.status = "Saved platform gamepad profiles.";
        this.statusTone = "success";
      } finally {
        this.saving = false;
      }
    }
  }
});
