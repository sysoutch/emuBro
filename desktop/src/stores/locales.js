import { defineStore } from "pinia";

function getDesktopBridge() {
  if (typeof window === "undefined" || !window.emubro) {
    return null;
  }
  return window.emubro;
}

function buildLocalePayload({ code, name, abbreviation, flag }) {
  const localeCode = String(code || "")
    .trim()
    .toLowerCase();

  return {
    [localeCode]: {
      language: {
        name: String(name || localeCode.toUpperCase()).trim(),
        abbreviation: String(abbreviation || localeCode.toUpperCase()).trim(),
        flag: String(flag || "us")
          .trim()
          .toLowerCase(),
        selectLanguage: "Select Language"
      }
    }
  };
}

function getLanguageInfo(row) {
  if (!row?.code || !row?.data || typeof row.data !== "object") {
    return {};
  }
  return row.data[row.code]?.language || {};
}

export const useLocalesStore = defineStore("desktopLocales", {
  state: () => ({
    initialized: false,
    loading: false,
    saving: false,
    error: "",
    actionStatus: "",
    rows: [],
    selectedFilename: "",
    editorText: "",
    dirty: false,
    createForm: {
      code: "",
      name: "",
      abbreviation: "",
      flag: "us"
    },
    renameForm: {
      code: "",
      name: "",
      abbreviation: "",
      flag: "us"
    }
  }),
  getters: {
    selectedRow(state) {
      return state.rows.find((row) => row.filename === state.selectedFilename) || null;
    }
  },
  actions: {
    async refresh() {
      const bridge = getDesktopBridge();
      if (!bridge?.locales) {
        this.error = "Desktop locale bridge unavailable.";
        return;
      }

      this.loading = true;
      this.error = "";

      try {
        const rows = await bridge.locales.list();
        this.rows = Array.isArray(rows) ? rows : [];

        if (!this.selectedFilename || !this.rows.some((row) => row.filename === this.selectedFilename)) {
          this.selectedFilename = this.rows[0]?.filename || "";
        }

        if (this.selectedFilename) {
          await this.loadSelected();
        }
        this.initialized = true;
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error || "Unknown error");
      } finally {
        this.loading = false;
      }
    },
    async initialize() {
      if (this.initialized) {
        return;
      }
      await this.refresh();
    },
    async selectLocale(filename) {
      this.selectedFilename = String(filename || "").trim();
      this.actionStatus = "";
      this.dirty = false;
      await this.loadSelected();
    },
    async loadSelected() {
      const bridge = getDesktopBridge();
      const row = this.selectedRow;
      if (!bridge?.locales || !row?.filename) {
        this.editorText = "";
        return;
      }

      const data = await bridge.locales.read(row.filename);
      this.editorText = JSON.stringify(data || {}, null, 2);
      this.dirty = false;

      const info = getLanguageInfo(row);
      this.renameForm = {
        code: String(row.code || "").trim().toLowerCase(),
        name: String(info.name || row.code || "").trim(),
        abbreviation: String(info.abbreviation || row.code || "").trim(),
        flag: String(info.flag || "us").trim().toLowerCase()
      };
    },
    updateEditorText(value) {
      this.editorText = String(value || "");
      this.dirty = true;
    },
    async saveSelected() {
      const bridge = getDesktopBridge();
      const row = this.selectedRow;
      if (!bridge?.locales || !row?.filename) {
        this.error = "Desktop locale bridge unavailable.";
        return false;
      }

      this.saving = true;
      this.error = "";

      try {
        const parsed = JSON.parse(this.editorText || "{}");
        await bridge.locales.write(row.filename, parsed);
        this.actionStatus = `Saved ${row.filename}`;
        this.dirty = false;
        await this.refresh();
        return true;
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error || "Unknown error");
        return false;
      } finally {
        this.saving = false;
      }
    },
    async createLocale() {
      const bridge = getDesktopBridge();
      if (!bridge?.locales) {
        this.error = "Desktop locale bridge unavailable.";
        return false;
      }

      const code = String(this.createForm.code || "")
        .trim()
        .toLowerCase();
      if (!/^[a-z]{2,3}$/.test(code)) {
        this.error = "Locale code must be 2-3 lowercase letters.";
        return false;
      }

      this.saving = true;
      this.error = "";

      try {
        const filename = `${code}.json`;
        const exists = await bridge.locales.exists(filename);
        if (exists) {
          this.error = `${filename} already exists.`;
          return false;
        }

        await bridge.locales.write(filename, buildLocalePayload(this.createForm));
        this.createForm = {
          code: "",
          name: "",
          abbreviation: "",
          flag: "us"
        };
        this.actionStatus = `Created ${filename}`;
        await this.refresh();
        await this.selectLocale(filename);
        return true;
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error || "Unknown error");
        return false;
      } finally {
        this.saving = false;
      }
    },
    async renameSelected() {
      const bridge = getDesktopBridge();
      const row = this.selectedRow;
      if (!bridge?.locales || !row?.filename || row.canRename !== true) {
        this.error = "Selected locale cannot be renamed.";
        return false;
      }

      const code = String(this.renameForm.code || "")
        .trim()
        .toLowerCase();
      if (!/^[a-z]{2,3}$/.test(code)) {
        this.error = "Locale code must be 2-3 lowercase letters.";
        return false;
      }

      this.saving = true;
      this.error = "";

      try {
        const result = await bridge.locales.rename({
          oldFilename: row.filename,
          oldCode: row.code,
          newCode: code,
          newName: this.renameForm.name,
          newAbbreviation: this.renameForm.abbreviation,
          newFlag: this.renameForm.flag
        });
        if (!result?.success) {
          throw new Error(result?.message || "Rename failed");
        }
        this.actionStatus = `Renamed ${row.filename} to ${result.filename || `${code}.json`}`;
        await this.refresh();
        await this.selectLocale(result.filename || `${code}.json`);
        return true;
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error || "Unknown error");
        return false;
      } finally {
        this.saving = false;
      }
    },
    async deleteSelected() {
      const bridge = getDesktopBridge();
      const row = this.selectedRow;
      if (!bridge?.locales || !row?.filename || row.canDelete !== true) {
        this.error = "Selected locale cannot be deleted.";
        return false;
      }

      if (typeof window !== "undefined" && !window.confirm(`Delete ${row.filename}?`)) {
        return false;
      }

      this.saving = true;
      this.error = "";

      try {
        const result = await bridge.locales.delete(row.filename);
        if (!result?.success) {
          throw new Error(result?.message || "Delete failed");
        }
        this.actionStatus = `Deleted ${row.filename}`;
        this.selectedFilename = "";
        this.editorText = "";
        await this.refresh();
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
