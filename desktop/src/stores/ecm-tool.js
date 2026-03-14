import { defineStore } from "pinia";
import { useShellI18nStore } from "./shell-i18n";

function getDesktopBridge() {
  if (typeof window === "undefined" || !window.emubro) {
    return null;
  }
  return window.emubro;
}

function normalizeCompilerRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    name: String(row?.name || "").trim(),
    available: !!row?.available,
    version: String(row?.version || "").trim()
  }));
}

function normalizeInstallRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    id: String(row?.id || "").trim(),
    label: String(row?.label || row?.id || "").trim(),
    description: String(row?.description || "").trim(),
    recommended: !!row?.recommended,
    action: String(row?.action || "command").trim().toLowerCase(),
    url: String(row?.url || "").trim(),
    command: String(row?.command || "").trim(),
    compiler: String(row?.compiler || "").trim()
  })).filter((row) => row.id);
}

function normalizeBuildRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row, index) => ({
    key: `${index}-${String(row?.target || row?.source || row?.error || 'build')}`,
    ok: !!row?.ok,
    source: String(row?.source || "").trim(),
    target: String(row?.target || "").trim(),
    stdout: String(row?.stdout || "").trim(),
    stderr: String(row?.stderr || row?.error || "").trim()
  }));
}

function translate(key, fallback, params = null) {
  try {
    const shellI18nStore = useShellI18nStore();
    return params ? shellI18nStore.tf(key, params, fallback) : shellI18nStore.t(key, fallback);
  } catch (_error) {
    if (!params) {
      return fallback;
    }
    return Object.entries(params).reduce(
      (result, [name, value]) => String(result).replaceAll(`{{${name}}}`, String(value ?? "")),
      String(fallback || "")
    );
  }
}

export const useEcmToolStore = defineStore("ecmTool", {
  state: () => ({
    initialized: false,
    running: false,
    status: "",
    statusTone: "",
    info: null,
    environment: null,
    compilerOptions: [],
    installOptions: [],
    selectedCompiler: "",
    selectedInstallOptionId: "",
    selectedSourcePath: "",
    lastDownloadedPath: "",
    lastBuildOutputPath: "",
    buildRows: []
  }),
  getters: {
    selectedInstallOption(state) {
      return state.installOptions.find((row) => row.id === state.selectedInstallOptionId) || null;
    },
    recommendedCompiler(state) {
      return String(state.environment?.recommendedCompiler || "").trim();
    }
  },
  actions: {
    setStatus(message, tone = "") {
      this.status = String(message || "").trim();
      this.statusTone = String(tone || "").trim();
    },
    setSourcePath(value) {
      this.selectedSourcePath = String(value || "").trim();
    },
    setSelectedCompiler(value) {
      this.selectedCompiler = String(value || "").trim();
    },
    setSelectedInstallOption(value) {
      this.selectedInstallOptionId = String(value || "").trim();
    },
    async loadInfo() {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.setStatus(translate("desktopShell.tools.bridgeUnavailable", "Desktop bridge unavailable."), "error");
        return null;
      }

      const response = await bridge.invoke("tools:ecm:get-download-info");
      if (response?.success) {
        this.info = response;
      }
      return this.info;
    },
    applyEnvironment(environment) {
      this.environment = environment && typeof environment === "object" ? environment : null;
      this.compilerOptions = normalizeCompilerRows(this.environment?.compilers);
      this.installOptions = normalizeInstallRows(this.environment?.compilerInstallOptions);
      const recommendedInstaller = String(this.environment?.recommendedCompilerInstaller || "").trim();
      if (!this.installOptions.some((row) => row.id === this.selectedInstallOptionId)) {
        this.selectedInstallOptionId = this.installOptions.find((row) => row.id === recommendedInstaller)?.id || this.installOptions[0]?.id || "";
      }
      if (!this.selectedCompiler || !this.compilerOptions.some((row) => row.name === this.selectedCompiler)) {
        this.selectedCompiler = "";
      }
    },
    async detectEnvironment() {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.setStatus(translate("desktopShell.tools.bridgeUnavailable", "Desktop bridge unavailable."), "error");
        return null;
      }

      this.running = true;
      this.setStatus(translate("tools.ecmUnecmDetectRunning", "Detecting build environment..."));
      try {
        const response = await bridge.invoke("tools:ecm:detect-build-env");
        if (!response?.success) {
          this.setStatus(String(response?.message || "Failed to detect build environment."), "error");
          return null;
        }
        this.applyEnvironment(response.environment || null);
        this.setStatus(translate("tools.ecmUnecmDetectSuccess", "Build environment detected."), "success");
        return this.environment;
      } catch (error) {
        this.setStatus(error instanceof Error ? error.message : String(error || "Failed to detect build environment."), "error");
        return null;
      } finally {
        this.running = false;
      }
    },
    async refreshInstallOptions() {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        return [];
      }
      const response = await bridge.invoke("tools:ecm:get-compiler-install-options");
      if (response?.success) {
        this.applyEnvironment(response.environment || this.environment || null);
        this.installOptions = normalizeInstallRows(response.options);
        const recommended = String(response?.recommendedOptionId || "").trim();
        if (!this.installOptions.some((row) => row.id === this.selectedInstallOptionId)) {
          this.selectedInstallOptionId = this.installOptions.find((row) => row.id === recommended)?.id || this.installOptions[0]?.id || "";
        }
      }
      return this.installOptions;
    },
    async downloadSourceZip() {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.setStatus(translate("desktopShell.tools.bridgeUnavailable", "Desktop bridge unavailable."), "error");
        return null;
      }
      this.running = true;
      this.setStatus(translate("tools.status.ecmUnecmDownloadRunning", "Downloading ECM/UNECM source ZIP..."));
      try {
        const result = await bridge.invoke("tools:ecm:download-source-zip", {});
        if (!result?.success) {
          this.setStatus(String(result?.message || "Failed to download ECM/UNECM archive."), result?.canceled ? "warning" : "error");
          return null;
        }
        this.lastDownloadedPath = String(result?.filePath || "").trim();
        if (this.lastDownloadedPath) {
          this.selectedSourcePath = this.lastDownloadedPath;
        }
        this.buildRows = [
          {
            key: `download-${this.lastDownloadedPath}`,
            ok: true,
            source: String(result?.sourceUrl || "").trim(),
            target: this.lastDownloadedPath,
            stdout: `${Number(result?.sizeBytes || 0)} bytes`,
            stderr: ""
          }
        ];
        this.setStatus(translate("tools.status.ecmUnecmDownloadSuccess", "ECM/UNECM source ZIP downloaded."), "success");
        return result;
      } catch (error) {
        this.setStatus(error instanceof Error ? error.message : String(error || "Failed to download ECM/UNECM archive."), "error");
        return null;
      } finally {
        this.running = false;
      }
    },
    async pickSourcePath() {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.setStatus(translate("desktopShell.tools.bridgeUnavailable", "Desktop bridge unavailable."), "error");
        return null;
      }
      const pick = await bridge.invoke("open-file-dialog", {
        title: translate("tools.ecmUnecmPickSource", "Select Source Path"),
        properties: ["openFile", "openDirectory"],
        filters: [
          { name: "ZIP Archive", extensions: ["zip"] },
          { name: "All Files", extensions: ["*"] }
        ]
      });
      if (!pick || pick.canceled || !Array.isArray(pick.filePaths) || pick.filePaths.length === 0) {
        return null;
      }
      this.selectedSourcePath = String(pick.filePaths[0] || "").trim();
      this.setStatus(translate("tools.ecmUnecmSourcePicked", "Source path selected."), "success");
      return this.selectedSourcePath;
    },
    async installCompiler() {
      const bridge = getDesktopBridge();
      const option = this.selectedInstallOption;
      if (!bridge?.invoke) {
        this.setStatus(translate("desktopShell.tools.bridgeUnavailable", "Desktop bridge unavailable."), "error");
        return null;
      }
      if (!option) {
        this.setStatus(translate("tools.ecmUnecmInstallSelectFirst", "Select a compiler install option first."), "warning");
        return null;
      }
      if (option.action === "url") {
        const result = await bridge.invoke("open-external-url", option.url);
        this.setStatus(String(result?.message || translate("tools.ecmUnecmInstallOpenedDownload", "Opened compiler download page.")), result?.success ? "success" : "error");
        return result;
      }

      this.running = true;
      this.setStatus(translate("tools.status.ecmUnecmCompilerInstallRunning", "Installing compiler..."));
      try {
        const result = await bridge.invoke("tools:ecm:install-compiler", {
          optionId: option.id
        });
        if (!result?.success) {
          this.setStatus(String(result?.message || "Compiler install failed."), result?.needsManual ? "warning" : "error");
          return null;
        }
        this.applyEnvironment(result.environment || this.environment || null);
        this.setStatus(String(result?.message || translate("tools.status.ecmUnecmCompilerInstallSuccess", "Compiler install finished.")), "success");
        return result;
      } catch (error) {
        this.setStatus(error instanceof Error ? error.message : String(error || "Compiler install failed."), "error");
        return null;
      } finally {
        this.running = false;
      }
    },
    async buildBinaries() {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.setStatus(translate("desktopShell.tools.bridgeUnavailable", "Desktop bridge unavailable."), "error");
        return null;
      }
      if (!this.selectedSourcePath) {
        this.setStatus(translate("tools.ecmUnecmNoSourceForBuild", "Select a source folder or ZIP first."), "warning");
        return null;
      }

      this.running = true;
      this.setStatus(translate("tools.status.ecmUnecmBuildRunning", "Building ECM/UNECM binaries..."));
      try {
        const result = await bridge.invoke("tools:ecm:build-binaries", {
          sourcePath: this.selectedSourcePath,
          compiler: this.selectedCompiler
        });
        if (!result?.success) {
          this.buildRows = normalizeBuildRows(result?.buildResults);
          this.setStatus(String(result?.message || "Build failed."), "error");
          return null;
        }
        this.lastBuildOutputPath = String(result?.outputDir || "").trim();
        this.buildRows = normalizeBuildRows(result?.buildResults);
        this.applyEnvironment(result.environment || this.environment || null);
        this.setStatus(translate("tools.status.ecmUnecmBuildSuccess", "ECM/UNECM binaries built successfully."), "success");
        return result;
      } catch (error) {
        this.setStatus(error instanceof Error ? error.message : String(error || "Build failed."), "error");
        return null;
      } finally {
        this.running = false;
      }
    },
    async showPathInFolder(target) {
      const bridge = getDesktopBridge();
      const path = String(target || "").trim();
      if (!bridge?.invoke || !path) {
        return null;
      }
      const result = await bridge.invoke("show-item-in-folder", path);
      if (!result?.success) {
        this.setStatus(String(result?.message || translate("tools.status.openFolderFailed", "Failed to open folder.")), "error");
      }
      return result;
    },
    async initialize() {
      if (this.initialized) {
        return;
      }
      await this.loadInfo();
      await this.detectEnvironment();
      await this.refreshInstallOptions();
      this.initialized = true;
    }
  }
});
