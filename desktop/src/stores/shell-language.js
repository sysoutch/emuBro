import { defineStore } from "pinia";
import { useShellI18nStore } from "./shell-i18n";

function getDesktopBridge() {
  if (typeof window === "undefined" || !window.emubro) {
    return null;
  }
  return window.emubro;
}

function normalizeCode(value, fallback = "en") {
  const code = String(value || "")
    .trim()
    .toLowerCase();
  return /^[a-z]{2,3}$/.test(code) ? code : fallback;
}

function normalizeLocaleOption(code, languageData = {}) {
  const localeCode = normalizeCode(code, "");
  if (!localeCode) {
    return null;
  }

  const flagCode = normalizeCode(languageData?.flag || "", "us");
  return {
    id: localeCode,
    code: localeCode,
    label: String(languageData?.name || languageData?.english || localeCode.toUpperCase()).trim() || localeCode.toUpperCase(),
    abbreviation: String(languageData?.abbreviation || localeCode.toUpperCase()).trim() || localeCode.toUpperCase(),
    flagCode
  };
}

function buildLocaleRowsFromTranslations(translations) {
  const source = translations && typeof translations === "object" ? translations : {};
  return Object.entries(source)
    .map(([code, payload]) => normalizeLocaleOption(code, payload?.language || {}))
    .filter(Boolean)
    .sort((left, right) => left.label.localeCompare(right.label));
}

function buildLocaleRowsFromList(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => {
      const code = String(row?.code || row?.id || "").trim().toLowerCase();
      const languageData = row?.data?.[code]?.language || {};
      return normalizeLocaleOption(code, {
        name: row?.label || languageData?.name || code.toUpperCase(),
        abbreviation: languageData?.abbreviation || code.toUpperCase(),
        flag: languageData?.flag || "us"
      });
    })
    .filter(Boolean)
    .sort((left, right) => left.label.localeCompare(right.label));
}

function ensureEnglishRow(rows) {
  const list = Array.isArray(rows) ? [...rows] : [];
  if (!list.some((row) => row.code === "en")) {
    list.unshift({
      id: "en",
      code: "en",
      label: "English",
      abbreviation: "EN",
      flagCode: "us"
    });
  }
  return list;
}

export const useShellLanguageStore = defineStore("shellLanguage", {
  state: () => ({
    initialized: false,
    loading: false,
    error: "",
    actionStatus: "",
    rows: [],
    currentCode: "en"
  }),
  getters: {
    currentRow(state) {
      return state.rows.find((row) => row.code === state.currentCode) || state.rows[0] || null;
    }
  },
  actions: {
    applyDocumentLanguage(code) {
      const normalized = normalizeCode(code, "en");
      const shellI18nStore = useShellI18nStore();
      const nextCode = shellI18nStore.setLanguage(normalized);
      this.currentCode = nextCode;

      if (typeof document !== "undefined") {
        document.documentElement.setAttribute("lang", nextCode);
      }

      if (typeof window !== "undefined") {
        try {
          window.dispatchEvent(
            new CustomEvent("emubro:shell-language-changed", {
              detail: { code: nextCode }
            })
          );
        } catch (_error) {}
      }
      return nextCode;
    },
    async refresh() {
      const bridge = getDesktopBridge();
      const shellI18nStore = useShellI18nStore();
      this.loading = true;
      this.error = "";

      try {
        let rows = [];
        await shellI18nStore.initialize();
        rows = buildLocaleRowsFromTranslations(shellI18nStore.translations);

        if (!rows.length && bridge?.locales?.list) {
          const localeList = await bridge.locales.list();
          rows = buildLocaleRowsFromList(localeList);
        }

        this.rows = ensureEnglishRow(rows);
        this.currentCode = normalizeCode(shellI18nStore.currentLanguage || this.currentCode, "en");
        this.applyDocumentLanguage(this.currentCode);
        this.initialized = true;
      } catch (error) {
        this.rows = ensureEnglishRow([]);
        this.error = error instanceof Error ? error.message : String(error || "Failed to load languages.");
        this.applyDocumentLanguage(this.currentCode);
        this.initialized = true;
      } finally {
        this.loading = false;
      }
    },
    async initialize() {
      if (this.initialized || this.loading) {
        return;
      }
      await this.refresh();
    },
    async setCurrentLanguage(code) {
      const normalized = this.applyDocumentLanguage(code);
      const current = this.rows.find((row) => row.code === normalized);
      this.actionStatus = current
        ? `Language preference set to ${current.label}.`
        : `Language preference set to ${normalized.toUpperCase()}.`;
      return normalized;
    }
  }
});
