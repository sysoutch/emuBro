import { defineStore } from "pinia";
import { useWorkspaceStore } from "./workspace";

function getDesktopBridge() {
  if (typeof window === "undefined" || !window.emubro) {
    return null;
  }
  return window.emubro;
}

function sanitizeSegment(value) {
  return String(value || "")
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "remote";
}

function joinPath(...parts) {
  return parts
    .map((part) => String(part || "").replace(/[\\/]+$/, ""))
    .filter(Boolean)
    .join("/");
}

function normalizeHostRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row, index) => {
    const url = String(row?.url || "").trim() || `http://${String(row?.address || "127.0.0.1").trim()}:${Number(row?.port || 38477)}`;
    const hostId = String(row?.hostId || "").trim() || `host-${index}-${url}`;
    return {
      hostId,
      name: String(row?.name || "").trim(),
      address: String(row?.address || "").trim(),
      port: Number(row?.port || 38477),
      url,
      token: String(row?.token || "").trim()
    };
  });
}

function normalizeRemoteGameRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row, index) => {
    const path = String(row?.path || "").trim();
    return {
      key: path || `remote-${index}`,
      title: String(row?.title || row?.name || "Unknown").trim(),
      path,
      platform: String(row?.platform || row?.platformShortName || "").trim(),
      size: Number(row?.size || 0)
    };
  });
}

function defaultHostConfig() {
  return {
    enabled: false,
    port: 38477,
    discoveryPort: 38478,
    allowedRoots: []
  };
}

export const useRemoteLibraryStore = defineStore("remoteLibrary", {
  state: () => ({
    initialized: false,
    hostLoading: false,
    scanBusy: false,
    browseBusy: false,
    downloadBusy: false,
    status: "",
    statusTone: "",
    hostConfig: defaultHostConfig(),
    hostStatus: {
      running: false,
      port: 38477
    },
    pairing: {
      code: "",
      expiresAt: ""
    },
    clientHosts: [],
    activeHostId: "",
    remoteGames: [],
    remoteDiagnostics: null,
    pairCodes: {},
    selectedRemotePaths: [],
    manualPath: ""
  }),
  getters: {
    activeHost(state) {
      return state.clientHosts.find((row) => row.hostId === state.activeHostId) || null;
    },
    allowedRootsText(state) {
      return (Array.isArray(state.hostConfig.allowedRoots) ? state.hostConfig.allowedRoots : []).join("\n");
    },
    selectedRemoteGames(state) {
      const selected = new Set(state.selectedRemotePaths);
      return state.remoteGames.filter((row) => selected.has(row.path));
    }
  },
  actions: {
    setStatus(message, tone = "") {
      this.status = String(message || "").trim();
      this.statusTone = String(tone || "").trim();
    },
    setHostField(field, value) {
      if (field === "enabled") {
        this.hostConfig = {
          ...this.hostConfig,
          enabled: !!value
        };
        return;
      }
      if (field === "port" || field === "discoveryPort") {
        this.hostConfig = {
          ...this.hostConfig,
          [field]: Number(value || 0)
        };
        return;
      }
      this.hostConfig = {
        ...this.hostConfig,
        [field]: value
      };
    },
    setAllowedRootsText(value) {
      this.hostConfig = {
        ...this.hostConfig,
        allowedRoots: String(value || "")
          .split(/[\r\n]+/)
          .map((row) => row.trim())
          .filter(Boolean)
      };
    },
    setPairCode(hostId, value) {
      const key = String(hostId || "").trim();
      if (!key) {
        return;
      }
      this.pairCodes = {
        ...this.pairCodes,
        [key]: String(value || "").trim()
      };
    },
    setManualPath(value) {
      this.manualPath = String(value || "");
    },
    setActiveHost(hostId) {
      this.activeHostId = String(hostId || "").trim();
      this.selectedRemotePaths = [];
    },
    toggleRemoteSelection(remotePath) {
      const key = String(remotePath || "").trim();
      if (!key) {
        return;
      }
      const selected = new Set(this.selectedRemotePaths);
      if (selected.has(key)) {
        selected.delete(key);
      } else {
        selected.add(key);
      }
      this.selectedRemotePaths = Array.from(selected);
    },
    async loadHostConfig() {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.setStatus("Desktop bridge unavailable.", "error");
        return null;
      }

      this.hostLoading = true;

      try {
        const [configResult, statusResult, pairingResult] = await Promise.all([
          bridge.invoke("remote:host:get-config"),
          bridge.invoke("remote:host:get-status"),
          bridge.invoke("remote:host:get-pairing")
        ]);

        if (configResult?.success) {
          const config = configResult?.config || {};
          this.hostConfig = {
            enabled: !!config.enabled,
            port: Number(config.port || 38477),
            discoveryPort: Number(config.discoveryPort || 38478),
            allowedRoots: Array.isArray(config.allowedRoots) ? config.allowedRoots.map((row) => String(row || "").trim()).filter(Boolean) : []
          };
        }

        if (statusResult?.success) {
          this.hostStatus = {
            running: !!statusResult?.status?.running,
            port: Number(statusResult?.status?.port || this.hostConfig.port || 38477)
          };
        }

        if (pairingResult?.success) {
          this.pairing = {
            code: String(pairingResult?.pairing?.code || "").trim(),
            expiresAt: String(pairingResult?.pairing?.expiresAt || "").trim()
          };
        }

        return this.hostConfig;
      } catch (error) {
        this.setStatus(error instanceof Error ? error.message : String(error || "Failed to load remote host settings."), "error");
        return null;
      } finally {
        this.hostLoading = false;
      }
    },
    async saveHostConfig() {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.setStatus("Desktop bridge unavailable.", "error");
        return null;
      }

      this.hostLoading = true;
      this.setStatus("Saving host settings...");

      try {
        const response = await bridge.invoke("remote:host:set-config", this.hostConfig);
        if (!response?.success) {
          this.setStatus(String(response?.message || "Failed to save host settings."), "error");
          return null;
        }

        const runtimeStatus = response?.status || {};
        await this.loadHostConfig();

        if (this.hostConfig.enabled) {
          if (runtimeStatus?.running) {
            const hostPort = Number(runtimeStatus?.port || this.hostConfig.port || 38477);
            this.setStatus(`Host started on port ${hostPort}.`, "success");
          } else {
            const runtimeError = String(runtimeStatus?.error || "").trim();
            this.setStatus(
              runtimeError || "Host settings were saved, but the host runtime did not start.",
              "error"
            );
          }
        } else {
          this.setStatus("Host disabled and settings saved.", "success");
        }
        return response;
      } catch (error) {
        this.setStatus(error instanceof Error ? error.message : String(error || "Failed to save host settings."), "error");
        return null;
      } finally {
        this.hostLoading = false;
      }
    },
    async rotatePairing() {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.setStatus("Desktop bridge unavailable.", "error");
        return null;
      }

      const response = await bridge.invoke("remote:host:rotate-pairing");
      if (!response?.success) {
        this.setStatus(String(response?.message || "Failed to rotate pairing code."), "error");
        return null;
      }

      this.pairing = {
        code: String(response?.pairing?.code || "").trim(),
        expiresAt: String(response?.pairing?.expiresAt || "").trim()
      };
      this.setStatus("Generated a new pairing code.", "success");
      return response;
    },
    async loadClientHosts() {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.setStatus("Desktop bridge unavailable.", "error");
        return [];
      }

      const response = await bridge.invoke("remote:client:get-hosts");
      if (!response?.success) {
        this.setStatus(String(response?.message || "Failed to load remote hosts."), "error");
        return [];
      }

      this.clientHosts = normalizeHostRows(response?.hosts);
      if (!this.clientHosts.some((row) => row.hostId === this.activeHostId)) {
        this.activeHostId = this.clientHosts[0]?.hostId || "";
      }
      return this.clientHosts;
    },
    async persistClientHosts() {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        return null;
      }
      return bridge.invoke("remote:client:set-hosts", {
        hosts: this.clientHosts
      });
    },
    async clearHosts() {
      this.clientHosts = [];
      this.activeHostId = "";
      this.remoteGames = [];
      this.selectedRemotePaths = [];
      await this.persistClientHosts();
      this.setStatus("Host list cleared.", "success");
    },
    async scanHosts() {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.setStatus("Desktop bridge unavailable.", "error");
        return [];
      }

      this.scanBusy = true;
      this.setStatus("Scanning LAN for hosts...");

      try {
        const response = await bridge.invoke("remote:client:scan", {
          includeLocalSelf: false
        });
        if (!response?.success) {
          this.setStatus(String(response?.message || "Scan failed."), "error");
          return [];
        }

        this.clientHosts = normalizeHostRows(response?.hosts);
        if (!this.activeHostId && this.clientHosts[0]) {
          this.activeHostId = this.clientHosts[0].hostId;
        }
        await this.persistClientHosts();
        this.setStatus(this.clientHosts.length ? "Scan completed." : "No hosts found on the local network.", this.clientHosts.length ? "success" : "warning");
        return this.clientHosts;
      } catch (error) {
        this.setStatus(error instanceof Error ? error.message : String(error || "Scan failed."), "error");
        return [];
      } finally {
        this.scanBusy = false;
      }
    },
    async pairHost(hostId) {
      const bridge = getDesktopBridge();
      const host = this.clientHosts.find((row) => row.hostId === hostId);
      if (!bridge?.invoke || !host) {
        this.setStatus("Desktop bridge unavailable.", "error");
        return null;
      }

      const code = String(this.pairCodes[hostId] || "").trim();
      if (!code) {
        this.setStatus("Enter a pairing code from the host first.", "warning");
        return null;
      }

      this.setStatus(`Pairing with ${host.name || host.address || "host"}...`);

      try {
        const response = await bridge.invoke("remote:client:pair", {
          hostUrl: host.url,
          code,
          clientName: sanitizeSegment(window.navigator?.userAgent || "emuBro")
        });
        if (!response?.success) {
          this.setStatus(String(response?.message || "Pairing failed."), "error");
          return null;
        }

        const token = String(response?.result?.token || "").trim();
        this.clientHosts = this.clientHosts.map((row) =>
          row.hostId === hostId
            ? {
                ...row,
                token,
                hostId: String(response?.result?.host?.hostId || row.hostId).trim() || row.hostId
              }
            : row
        );
        await this.persistClientHosts();
        this.pairCodes = {
          ...this.pairCodes,
          [hostId]: ""
        };
        this.setStatus("Paired successfully.", "success");
        return response;
      } catch (error) {
        this.setStatus(error instanceof Error ? error.message : String(error || "Pairing failed."), "error");
        return null;
      }
    },
    async browseHost(hostId) {
      const bridge = getDesktopBridge();
      const host = this.clientHosts.find((row) => row.hostId === hostId);
      if (!bridge?.invoke || !host) {
        this.setStatus("Desktop bridge unavailable.", "error");
        return null;
      }
      if (!host.token) {
        this.setStatus("Select a paired host first.", "warning");
        return null;
      }

      this.browseBusy = true;
      this.setActiveHost(hostId);
      this.setStatus("Loading remote games...");

      try {
        const response = await bridge.invoke("remote:client:list-games", {
          hostUrl: host.url,
          token: host.token
        });
        if (!response?.success) {
          this.setStatus(String(response?.message || "Failed to load games."), "error");
          return null;
        }

        this.remoteGames = normalizeRemoteGameRows(response?.games);
        this.remoteDiagnostics = response?.diagnostics || null;
        this.selectedRemotePaths = [];
        if (!this.remoteGames.length) {
          const diagnostics = response?.diagnostics || {};
          const totalGames = Number(diagnostics.totalGames || 0);
          const blockedByRoots = Number(diagnostics.blockedByRoots || 0);
          const hostMessage = String(response?.message || "").trim();
          if (hostMessage) {
            this.setStatus(hostMessage, "warning");
          } else if (totalGames > 0 && blockedByRoots >= totalGames) {
            this.setStatus("Host has games, but none are inside allowed transfer roots.", "warning");
          } else {
            this.setStatus("No games returned from host.", "warning");
          }
        } else {
          this.setStatus(`Loaded ${this.remoteGames.length} remote game(s).`, "success");
        }
        return this.remoteGames;
      } catch (error) {
        this.setStatus(error instanceof Error ? error.message : String(error || "Failed to load games."), "error");
        return null;
      } finally {
        this.browseBusy = false;
      }
    },
    async resolveDownloadRoot() {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        return "";
      }

      const response = await bridge.invoke("settings:get-library-paths");
      const settings = response?.settings || {};
      const gameFolders = Array.isArray(settings?.gameFolders) ? settings.gameFolders : [];
      if (gameFolders.length > 0) {
        return String(gameFolders[0] || "").trim();
      }

      const pick = await bridge.invoke("open-file-dialog", {
        title: "Select destination folder",
        properties: ["openDirectory", "createDirectory"]
      });
      if (pick?.canceled || !Array.isArray(pick?.filePaths) || !pick.filePaths.length) {
        return "";
      }

      return String(pick.filePaths[0] || "").trim();
    },
    async downloadRows(rows, { launchAfter = false } = {}) {
      const bridge = getDesktopBridge();
      const workspaceStore = useWorkspaceStore();
      const host = this.activeHost;
      if (!bridge?.invoke || !host) {
        this.setStatus("Desktop bridge unavailable.", "error");
        return null;
      }
      if (!rows.length) {
        this.setStatus("Select at least one game.", "warning");
        return null;
      }

      const baseRoot = await this.resolveDownloadRoot();
      if (!baseRoot) {
        return null;
      }

      this.downloadBusy = true;
      let lastImportedId = 0;
      const hostFolder = sanitizeSegment(host.name || host.hostId || "remote-host");
      const downloadRoot = joinPath(baseRoot, "remote-imports", hostFolder);

      try {
        for (const game of rows) {
          const remotePath = String(game?.path || "").trim();
          if (!remotePath) {
            continue;
          }
          const fileName = remotePath.split(/[\\/]/).pop() || sanitizeSegment(game?.title || "remote");
          const destPath = joinPath(downloadRoot, sanitizeSegment(fileName));
          this.setStatus(`Downloading ${String(game?.title || fileName).trim()}...`);

          const result = await bridge.invoke("remote:client:download-file", {
            hostUrl: host.url,
            token: host.token,
            remotePath,
            destinationPath: destPath
          });
          if (!result?.success) {
            this.setStatus(String(result?.message || "Download failed."), "error");
            continue;
          }

          const importResult = await bridge.importPaths([destPath], { recursive: false });
          if (Array.isArray(importResult?.addedGames) && importResult.addedGames[0]) {
            lastImportedId = Number(importResult.addedGames[0].id || 0);
          }
        }

        await workspaceStore.refresh();
        if (launchAfter && lastImportedId > 0) {
          await bridge.invoke("launch-game", { gameId: lastImportedId });
        }
        this.setStatus("Download completed.", "success");
        return { lastImportedId };
      } catch (error) {
        this.setStatus(error instanceof Error ? error.message : String(error || "Download failed."), "error");
        return null;
      } finally {
        this.downloadBusy = false;
      }
    },
    async downloadSelected({ launchAfter = false } = {}) {
      return this.downloadRows(this.selectedRemoteGames, { launchAfter });
    },
    async downloadManualPath() {
      const host = this.activeHost;
      const bridge = getDesktopBridge();
      if (!host || !bridge?.invoke) {
        this.setStatus("Desktop bridge unavailable.", "error");
        return null;
      }

      const remotePath = String(this.manualPath || "").trim();
      if (!remotePath) {
        this.setStatus("Enter a remote file path first.", "warning");
        return null;
      }

      const baseRoot = await this.resolveDownloadRoot();
      if (!baseRoot) {
        return null;
      }

      const hostFolder = sanitizeSegment(host.name || host.hostId || "remote-host");
      const fileName = remotePath.split(/[\\/]/).pop() || "remote-file";
      const destPath = joinPath(baseRoot, "remote-imports", hostFolder, sanitizeSegment(fileName));

      this.downloadBusy = true;
      this.setStatus(`Downloading ${fileName}...`);

      try {
        const result = await bridge.invoke("remote:client:download-file", {
          hostUrl: host.url,
          token: host.token,
          remotePath,
          destinationPath: destPath
        });
        if (!result?.success) {
          this.setStatus(String(result?.message || "Download failed."), "error");
          return null;
        }
        this.setStatus("Download completed.", "success");
        return result;
      } catch (error) {
        this.setStatus(error instanceof Error ? error.message : String(error || "Download failed."), "error");
        return null;
      } finally {
        this.downloadBusy = false;
      }
    },
    async initialize() {
      if (this.initialized) {
        return;
      }
      await Promise.all([this.loadHostConfig(), this.loadClientHosts()]);
      this.initialized = true;
    }
  }
});
