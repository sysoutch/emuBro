import { defineStore } from "pinia";
import shellFallbackTranslations from "../utils/shell-i18n-fallback";
import { readNativeShellState, writeNativeShellState } from "../utils/shell-state";
import { getShellStorageValue, setShellStorageValue } from "../utils/shell-storage-cache";

const DEFAULT_LANGUAGE = "en";
const LANGUAGE_STORAGE_KEY = "language";
const LANGUAGE_STATE_KEY = "language";
const listeners = new Set();

function getDesktopBridge() {
  if (typeof window === "undefined" || !window.emubro) {
    return null;
  }
  return window.emubro;
}

function normalizeLanguageCode(value, fallback = DEFAULT_LANGUAGE) {
  const code = String(value || "")
    .trim()
    .toLowerCase();
  return /^[a-z]{2,3}$/.test(code) ? code : fallback;
}

function readStoredLanguage() {
  return normalizeLanguageCode(getShellStorageValue(LANGUAGE_STORAGE_KEY, DEFAULT_LANGUAGE), DEFAULT_LANGUAGE);
}

function writeStoredLanguage(code) {
  const normalized = normalizeLanguageCode(code, DEFAULT_LANGUAGE);
  setShellStorageValue(LANGUAGE_STORAGE_KEY, normalized);
  return normalized;
}

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function cloneObject(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneObject(entry));
  }
  if (!isPlainObject(value)) {
    return value;
  }

  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneObject(entry)]));
}

function mergeObjects(baseValue, overrideValue) {
  const base = isPlainObject(baseValue) ? baseValue : {};
  const override = isPlainObject(overrideValue) ? overrideValue : {};
  const keys = new Set([...Object.keys(base), ...Object.keys(override)]);
  const result = {};

  for (const key of keys) {
    const baseEntry = base[key];
    const overrideEntry = override[key];
    if (isPlainObject(baseEntry) || isPlainObject(overrideEntry)) {
      result[key] = mergeObjects(baseEntry, overrideEntry);
      continue;
    }
    result[key] = overrideEntry !== undefined ? cloneObject(overrideEntry) : cloneObject(baseEntry);
  }

  return result;
}

function mergeTranslations(loadedTranslations) {
  const loaded = isPlainObject(loadedTranslations) ? loadedTranslations : {};
  const languageCodes = new Set([
    ...Object.keys(shellFallbackTranslations),
    ...Object.keys(loaded)
  ]);
  const merged = {};

  for (const code of languageCodes) {
    merged[code] = mergeObjects(shellFallbackTranslations[code], loaded[code]);
  }

  if (!merged[DEFAULT_LANGUAGE]) {
    merged[DEFAULT_LANGUAGE] = cloneObject(shellFallbackTranslations[DEFAULT_LANGUAGE]);
  }

  return merged;
}

function getNestedValue(source, key) {
  if (!isPlainObject(source) || !String(key || "").trim()) {
    return undefined;
  }

  return String(key)
    .split(".")
    .reduce((current, segment) => {
      if (!isPlainObject(current) && !Array.isArray(current)) {
        return undefined;
      }
      return current?.[segment];
    }, source);
}

function interpolateText(text, params = {}) {
  return Object.entries(isPlainObject(params) ? params : {}).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, String(value ?? "")),
    String(text || "")
  );
}

function installGlobalI18nBridge(store) {
  if (typeof window === "undefined") {
    return;
  }

  const bridge = {
    loadTranslations(nextTranslations) {
      store.setTranslations(nextTranslations);
    },
    setLanguage(language) {
      return store.setLanguage(language);
    },
    getLanguage() {
      return store.currentLanguage;
    },
    getAvailableLanguages() {
      return Object.keys(store.translations || {});
    },
    t(key, defaultValue = key) {
      return store.t(key, defaultValue);
    },
    tf(key, params = {}, defaultValue = key) {
      return store.tf(key, params, defaultValue);
    },
    onChange(callback) {
      if (typeof callback !== "function") {
        return () => {};
      }
      listeners.add(callback);
      return () => listeners.delete(callback);
    }
  };

  window.allTranslations = store.translations;
  window.i18n = bridge;
}

export const useShellI18nStore = defineStore("shellI18n", {
  state: () => ({
    initialized: false,
    loading: false,
    error: "",
    translations: mergeTranslations({}),
    currentLanguage: readStoredLanguage()
  }),
  actions: {
    setTranslations(translations) {
      this.translations = mergeTranslations(translations);
      installGlobalI18nBridge(this);
    },
    notifyLanguageChanged() {
      for (const callback of listeners) {
        try {
          callback(this.currentLanguage);
        } catch (_error) {}
      }
    },
    setLanguage(language) {
      const requested = normalizeLanguageCode(language, DEFAULT_LANGUAGE);
      const nextLanguage = this.translations[requested] ? requested : DEFAULT_LANGUAGE;
      this.currentLanguage = nextLanguage;
      writeStoredLanguage(nextLanguage);
      void writeNativeShellState(LANGUAGE_STATE_KEY, nextLanguage);

      if (typeof document !== "undefined") {
        document.documentElement.setAttribute("lang", nextLanguage);
      }

      installGlobalI18nBridge(this);
      this.notifyLanguageChanged();
      return nextLanguage;
    },
    t(key, defaultValue = key) {
      const localized = getNestedValue(this.translations[this.currentLanguage], key);
      if (localized !== undefined && localized !== null && localized !== "") {
        return localized;
      }

      const fallback = getNestedValue(this.translations[DEFAULT_LANGUAGE], key);
      if (fallback !== undefined && fallback !== null && fallback !== "") {
        return fallback;
      }

      return defaultValue;
    },
    tf(key, params = {}, defaultValue = key) {
      return interpolateText(this.t(key, defaultValue), params);
    },
    async initialize() {
      if (this.initialized || this.loading) {
        return;
      }

      this.loading = true;
      this.error = "";
      installGlobalI18nBridge(this);

      try {
        const bridge = getDesktopBridge();
        let loadedTranslations = {};
        this.currentLanguage = normalizeLanguageCode(
          await readNativeShellState(LANGUAGE_STATE_KEY, readStoredLanguage()),
          DEFAULT_LANGUAGE
        );

        if (bridge?.getAllTranslations) {
          loadedTranslations = await bridge.getAllTranslations();
        }

        this.setTranslations(loadedTranslations);
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error || "Failed to initialize shell translations.");
        this.setTranslations({});
      } finally {
        this.setLanguage(this.currentLanguage);
        this.initialized = true;
        this.loading = false;
      }
    }
  }
});
