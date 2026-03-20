import { defineStore } from "pinia";
import { useAppStore } from "./app";

const COLOR_FIELDS = [
  "bgPrimary",
  "bgSecondary",
  "bgTertiary",
  "textPrimary",
  "textSecondary",
  "accentColor",
  "accentLight",
  "appGradientA",
  "appGradientB",
  "appGradientC"
];

const DEFAULT_DARK_THEME = {
  id: "dark",
  tone: "dark",
  bgPrimary: "#0b1220",
  bgSecondary: "#121c2f",
  bgTertiary: "#1a263d",
  textPrimary: "#e7edf8",
  textSecondary: "#b9c7dc",
  accentColor: "#5c758d",
  accentLight: "#8498ad",
  fontBody: "Segoe UI, Inter, sans-serif",
  appGradientA: "#0b1220",
  appGradientB: "#121c2f",
  appGradientC: "#1a263d"
};

const DEFAULT_LIGHT_THEME = {
  id: "light",
  tone: "light",
  bgPrimary: "#dfeaf6",
  bgSecondary: "#edf4fb",
  bgTertiary: "#d2e3f5",
  textPrimary: "#17263a",
  textSecondary: "#5d7694",
  accentColor: "#5c758d",
  accentLight: "#8498ad",
  fontBody: "Segoe UI, Inter, sans-serif",
  appGradientA: "#dbe9f7",
  appGradientB: "#e7f3ff",
  appGradientC: "#d2e3f5"
};

function getDesktopBridge() {
  if (typeof window === "undefined" || !window.emubro) {
    return null;
  }
  return window.emubro;
}

function isHexColor(value) {
  return /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(String(value || "").trim());
}

function normalizeColor(value, fallback) {
  const next = String(value || "").trim();
  return isHexColor(next) ? next : fallback;
}

function cloneTheme(theme) {
  return JSON.parse(JSON.stringify(theme));
}

function getDefaultThemeForTone(tone) {
  return tone === "light" ? DEFAULT_LIGHT_THEME : DEFAULT_DARK_THEME;
}

function hexToRgbString(value) {
  const raw = String(value || "").trim().replace("#", "");
  if (!raw) {
    return "92, 117, 141";
  }

  let hex = raw;
  if (hex.length === 3 || hex.length === 4) {
    hex = hex
      .slice(0, 3)
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }
  if (hex.length < 6) {
    return "92, 117, 141";
  }

  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  if (![red, green, blue].every(Number.isFinite)) {
    return "92, 117, 141";
  }
  return `${red}, ${green}, ${blue}`;
}

function normalizeThemeConfig(payload) {
  const tone = String(payload?.tone || "dark").trim().toLowerCase() === "light" ? "light" : "dark";
  const defaults = getDefaultThemeForTone(tone);

  const normalized = {
    id: String(payload?.id || defaults.id).trim() || defaults.id,
    tone,
    fontBody: String(payload?.fontBody || defaults.fontBody).trim() || defaults.fontBody
  };

  COLOR_FIELDS.forEach((field) => {
    normalized[field] = normalizeColor(payload?.[field], defaults[field]);
  });

  return normalized;
}

function applyThemeConfigToDocument(config) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  const accentRgb = hexToRgbString(config.accentColor);

  root.setAttribute("data-theme", config.tone);
  root.style.setProperty("--bg", config.bgPrimary);
  root.style.setProperty("--bg-elev", config.bgSecondary);
  root.style.setProperty("--bg-tertiary", config.bgTertiary);
  root.style.setProperty("--text", config.textPrimary);
  root.style.setProperty("--muted", config.textSecondary);
  root.style.setProperty("--accent", config.accentColor);
  root.style.setProperty("--accent-light", config.accentLight);
  root.style.setProperty("--accent-rgb", accentRgb);
  root.style.setProperty("--border", `rgba(${accentRgb}, 0.22)`);
  root.style.setProperty("--app-gradient-a", config.appGradientA);
  root.style.setProperty("--app-gradient-b", config.appGradientB);
  root.style.setProperty("--app-gradient-c", config.appGradientC);
  root.style.setProperty("--app-font-body", config.fontBody);
  root.style.setProperty("--bg-primary", config.bgPrimary);
  root.style.setProperty("--bg-secondary", config.bgSecondary);
  root.style.setProperty("--bg-sidebar", config.bgSecondary);
  root.style.setProperty("--text-primary", config.textPrimary);
  root.style.setProperty("--text-secondary", config.textSecondary);
  root.style.setProperty("--accent-color", config.accentColor);
  root.style.setProperty("--accent-light-color", config.accentLight);
  root.style.setProperty("--border-color", `rgba(${accentRgb}, 0.22)`);
  root.style.setProperty("--glass-border", `rgba(${accentRgb}, 0.22)`);
  root.style.setProperty("--brand-color", config.accentColor);
  root.style.setProperty("--font-body", config.fontBody);
  root.style.setProperty("--font-heading", "\"Quicksand\", \"Montserrat\", \"Segoe UI\", sans-serif");
}

export const useShellThemeStore = defineStore("shellTheme", {
  state: () => ({
    initialized: false,
    loading: false,
    saving: false,
    error: "",
    actionStatus: "",
    savedConfig: cloneTheme(DEFAULT_DARK_THEME),
    draft: cloneTheme(DEFAULT_DARK_THEME)
  }),
  getters: {
    hasChanges(state) {
      return JSON.stringify(state.savedConfig) !== JSON.stringify(state.draft);
    },
    previewAccentStyle(state) {
      return {
        "--theme-preview-accent": state.draft.accentColor,
        "--theme-preview-accent-light": state.draft.accentLight
      };
    }
  },
  actions: {
    applyDraft() {
      applyThemeConfigToDocument(this.draft);
      useAppStore().setTheme(this.draft.tone);
    },
    updateField(field, value) {
      if (!(field in this.draft)) {
        return;
      }
      if (field === "tone") {
        this.draft.tone = String(value || "").trim().toLowerCase() === "light" ? "light" : "dark";
      } else if (COLOR_FIELDS.includes(field)) {
        const fallback = this.draft[field];
        this.draft[field] = normalizeColor(value, fallback);
      } else {
        this.draft[field] = String(value || "");
      }
      this.applyDraft();
    },
    useTonePreset(tone) {
      this.draft = cloneTheme(getDefaultThemeForTone(tone === "light" ? "light" : "dark"));
      this.applyDraft();
      this.actionStatus = `Loaded ${this.draft.tone} shell preset.`;
    },
    toggleTone() {
      this.useTonePreset(this.draft.tone === "light" ? "dark" : "light");
    },
    restoreSaved() {
      this.draft = cloneTheme(this.savedConfig);
      this.applyDraft();
      this.actionStatus = "Restored saved shell theme.";
    },
    async initialize() {
      if (this.initialized || this.loading) {
        return;
      }

      this.loading = true;
      this.error = "";

      const bridge = getDesktopBridge();
      try {
        if (bridge?.invoke) {
          const result = await bridge.invoke("settings:get-splash-theme");
          const theme = normalizeThemeConfig(result?.theme || result || DEFAULT_DARK_THEME);
          this.savedConfig = cloneTheme(theme);
          this.draft = cloneTheme(theme);
        } else {
          this.savedConfig = cloneTheme(DEFAULT_DARK_THEME);
          this.draft = cloneTheme(DEFAULT_DARK_THEME);
        }
        this.applyDraft();
        this.initialized = true;
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error || "Unknown error");
        this.savedConfig = cloneTheme(DEFAULT_DARK_THEME);
        this.draft = cloneTheme(DEFAULT_DARK_THEME);
        this.applyDraft();
        this.initialized = true;
      } finally {
        this.loading = false;
      }
    },
    async save() {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.error = "Desktop bridge unavailable.";
        return false;
      }

      this.saving = true;
      this.error = "";

      try {
        const result = await bridge.invoke("settings:set-splash-theme", this.draft);
        const theme = normalizeThemeConfig(result?.theme || this.draft);
        this.savedConfig = cloneTheme(theme);
        this.draft = cloneTheme(theme);
        this.applyDraft();
        this.actionStatus = `Saved ${theme.tone} shell theme.`;
        return true;
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error || "Unknown error");
        return false;
      } finally {
        this.saving = false;
      }
    }
  }
});
