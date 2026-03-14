import { defineStore } from "pinia";
import { readNativeShellState, writeNativeShellState } from "../utils/shell-state";
import { getShellStorageValue, setShellStorageValue } from "../utils/shell-storage-cache";

const PROFILE_STORAGE_KEY = "emuBro.profile";
const PROFILE_STATE_KEY = "profile";
const DEFAULT_AVATAR = "/logo.png";

function getDesktopBridge() {
  if (typeof window === "undefined" || !window.emubro) {
    return null;
  }
  return window.emubro;
}

function createDefaultProfile() {
  return {
    displayName: "Bro",
    username: "bro",
    status: "online",
    statusMessage: "",
    bio: "",
    favoritePlatforms: "",
    avatar: DEFAULT_AVATAR,
    linkedSteam: "",
    linkedEpic: "",
    linkedGog: ""
  };
}

function normalizeProfile(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  const fallback = createDefaultProfile();
  const status = String(source.status || fallback.status).trim().toLowerCase();
  return {
    displayName: String(source.displayName || fallback.displayName).trim() || fallback.displayName,
    username: String(source.username || fallback.username).trim() || fallback.username,
    status: ["online", "away", "busy", "invisible"].includes(status) ? status : fallback.status,
    statusMessage: String(source.statusMessage || "").trim(),
    bio: String(source.bio || "").trim(),
    favoritePlatforms: String(source.favoritePlatforms || "").trim(),
    avatar: String(source.avatar || source.avatarUrl || fallback.avatar).trim() || fallback.avatar,
    linkedSteam: String(source.linkedSteam || "").trim(),
    linkedEpic: String(source.linkedEpic || "").trim(),
    linkedGog: String(source.linkedGog || "").trim()
  };
}

function readStoredProfile() {
  try {
    const raw = getShellStorageValue(PROFILE_STORAGE_KEY, "");
    return raw ? normalizeProfile(JSON.parse(raw)) : createDefaultProfile();
  } catch (_error) {
    return createDefaultProfile();
  }
}

function writeStoredProfile(profile) {
  setShellStorageValue(PROFILE_STORAGE_KEY, JSON.stringify(normalizeProfile(profile)));
}

export const useProfileStore = defineStore("profile", {
  state: () => ({
    initialized: false,
    loading: false,
    draft: createDefaultProfile(),
    saved: createDefaultProfile(),
    status: "",
    statusTone: ""
  }),
  getters: {
    hasDraftChanges(state) {
      return JSON.stringify(state.draft) !== JSON.stringify(state.saved);
    }
  },
  actions: {
    setField(field, value) {
      if (!Object.prototype.hasOwnProperty.call(this.draft, field)) {
        return;
      }
      this.draft = {
        ...this.draft,
        [field]: field === "status" ? String(value || "").trim().toLowerCase() : String(value || "")
      };
      this.status = "";
      this.statusTone = "";
    },
    setAvatar(dataUrl) {
      this.draft = {
        ...this.draft,
        avatar: String(dataUrl || DEFAULT_AVATAR).trim() || DEFAULT_AVATAR
      };
      this.status = "";
      this.statusTone = "";
    },
    resetAvatar() {
      this.setAvatar(DEFAULT_AVATAR);
    },
    resetDraft() {
      this.draft = normalizeProfile(this.saved);
      this.status = "Reverted unsaved profile changes.";
      this.statusTone = "";
    },
    save() {
      this.saved = normalizeProfile(this.draft);
      this.draft = normalizeProfile(this.saved);
      writeStoredProfile(this.saved);
      void writeNativeShellState(PROFILE_STATE_KEY, this.saved);
      this.status = "Saved local profile settings.";
      this.statusTone = "success";
    },
    async initialize() {
      if (this.initialized || this.loading) {
        return;
      }

      this.loading = true;
      try {
        let bridgeProfile = {};
        const bridge = getDesktopBridge();
        if (bridge?.invoke) {
          try {
            bridgeProfile = await bridge.invoke("get-user-info");
          } catch (_error) {
            bridgeProfile = {};
          }
        }
        const storedProfile = normalizeProfile(
          await readNativeShellState(PROFILE_STATE_KEY, readStoredProfile())
        );
        this.saved = normalizeProfile({ ...bridgeProfile, ...storedProfile });
        this.draft = normalizeProfile(this.saved);
        void writeNativeShellState(PROFILE_STATE_KEY, this.saved);
        this.initialized = true;
      } finally {
        this.loading = false;
      }
    }
  }
});
