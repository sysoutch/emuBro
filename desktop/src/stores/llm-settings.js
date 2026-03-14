import { defineStore } from "pinia";
import {
  buildRelaySyncPayload,
  createDefaultDesktopLlmSettings,
  getActiveLlmProviderState,
  loadDesktopLlmSettings,
  normalizeDesktopLlmSettings,
  normalizeRelayAddressList,
  saveDesktopLlmSettings
} from "../utils/llm-settings";

function getDesktopBridge() {
  if (typeof window === "undefined" || !window.emubro) {
    return null;
  }
  return window.emubro;
}

function createRelayStatusFallback(port = 42141) {
  return {
    running: false,
    port
  };
}

export const useLlmSettingsStore = defineStore("llmSettings", {
  state: () => ({
    initialized: false,
    saving: false,
    syncingRelay: false,
    refreshingModels: false,
    relayStatusLoading: false,
    relayScanBusy: false,
    status: "",
    statusTone: "",
    scanStatus: "Scan your local network for other running emuBro hosts.",
    scanResults: [],
    ollamaModels: [],
    relayStatus: createRelayStatusFallback(),
    relayConnections: [],
    ...createDefaultDesktopLlmSettings()
  }),
  getters: {
    activeProviderState(state) {
      return getActiveLlmProviderState(state);
    },
    isOllamaProvider(state) {
      return state.provider === "ollama";
    },
    requiresApiKey(state) {
      return state.provider === "openai" || state.provider === "gemini";
    }
  },
  actions: {
    getSnapshot() {
      return normalizeDesktopLlmSettings({
        provider: this.provider,
        llmMode: this.llmMode,
        scope: this.scope,
        query: this.query,
        promptTemplate: this.promptTemplate,
        selectedPlatformOnly: this.selectedPlatformOnly,
        relay: this.relay,
        models: this.models,
        baseUrls: this.baseUrls,
        apiKeys: this.apiKeys
      });
    },
    applySettings(nextSettings) {
      const normalized = normalizeDesktopLlmSettings(nextSettings);
      this.provider = normalized.provider;
      this.llmMode = normalized.llmMode;
      this.scope = normalized.scope;
      this.query = normalized.query;
      this.promptTemplate = normalized.promptTemplate;
      this.selectedPlatformOnly = normalized.selectedPlatformOnly;
      this.relay = normalized.relay;
      this.models = normalized.models;
      this.baseUrls = normalized.baseUrls;
      this.apiKeys = normalized.apiKeys;
      if (!this.relayStatus || typeof this.relayStatus !== "object") {
        this.relayStatus = createRelayStatusFallback(this.relay.port);
      }
    },
    clearStatus() {
      this.status = "";
      this.statusTone = "";
    },
    hydrateFromStorage() {
      this.applySettings(loadDesktopLlmSettings());
      this.clearStatus();
      this.scanStatus = "Scan your local network for other running emuBro hosts.";
      this.scanResults = [];
    },
    setProvider(provider) {
      this.applySettings({
        ...this.getSnapshot(),
        provider
      });
      this.clearStatus();
    },
    setMode(mode) {
      this.applySettings({
        ...this.getSnapshot(),
        llmMode: mode
      });
      this.clearStatus();
    },
    setScope(scope) {
      this.applySettings({
        ...this.getSnapshot(),
        scope
      });
      this.clearStatus();
    },
    setSelectedPlatformOnly(value) {
      this.selectedPlatformOnly = !!value;
      this.clearStatus();
    },
    setPromptTemplate(value) {
      this.promptTemplate = String(value || "");
      this.clearStatus();
    },
    setModel(value) {
      this.models = {
        ...this.models,
        [this.provider]: String(value || "").trim()
      };
      this.clearStatus();
    },
    setBaseUrl(value) {
      this.baseUrls = {
        ...this.baseUrls,
        [this.provider]: String(value || "").trim()
      };
      this.clearStatus();
    },
    setApiKey(value) {
      this.apiKeys = {
        ...this.apiKeys,
        [this.provider]: String(value || "").trim()
      };
      this.clearStatus();
    },
    setRelayField(field, value) {
      const relay = { ...this.relay };
      if (field === "port") {
        relay.port = Number(value);
      } else if (field === "enabled") {
        relay.enabled = !!value;
      } else if (field === "whitelist" || field === "blacklist") {
        relay[field] = normalizeRelayAddressList(value);
      } else {
        relay[field] = typeof value === "string" ? String(value).trim() : value;
      }

      this.applySettings({
        ...this.getSnapshot(),
        relay
      });
      this.clearStatus();
    },
    pickRelayHost(url) {
      this.setRelayField("hostUrl", url);
      this.scanStatus = `Selected host: ${String(url || "").trim()}`;
    },
    async refreshRelayHostData() {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.relayStatus = createRelayStatusFallback(this.relay.port);
        this.relayConnections = [];
        return null;
      }

      this.relayStatusLoading = true;
      try {
        const result = await bridge.invoke("suggestions:relay:get-status");
        if (!result?.success) {
          this.status = String(result?.message || "Failed to refresh relay status.");
          this.statusTone = "error";
          return null;
        }

        this.relayStatus = result?.status && typeof result.status === "object"
          ? result.status
          : createRelayStatusFallback(this.relay.port);
        this.relayConnections = Array.isArray(result?.connections) ? result.connections : [];
        return result;
      } catch (error) {
        this.status = error instanceof Error ? error.message : String(error || "Failed to refresh relay status.");
        this.statusTone = "error";
        return null;
      } finally {
        this.relayStatusLoading = false;
      }
    },
    async syncRelayHostSettings({ updateStatus = true } = {}) {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        if (updateStatus) {
          this.status = "Desktop bridge unavailable.";
          this.statusTone = "error";
        }
        return null;
      }

      this.syncingRelay = true;
      if (updateStatus) {
        this.status = "Syncing relay host settings...";
        this.statusTone = "";
      }

      try {
        const result = await bridge.invoke("suggestions:relay:sync-host-settings", buildRelaySyncPayload(this.getSnapshot()));
        if (!result?.success) {
          if (updateStatus) {
            this.status = String(result?.message || "Failed to sync relay settings.");
            this.statusTone = "error";
          }
          return null;
        }

        this.relayStatus = result?.status && typeof result.status === "object"
          ? result.status
          : createRelayStatusFallback(this.relay.port);
        await this.refreshRelayHostData();
        if (updateStatus) {
          this.status = "AI / LLM settings saved and relay host synced.";
          this.statusTone = "success";
        }
        return result;
      } catch (error) {
        if (updateStatus) {
          this.status = error instanceof Error ? error.message : String(error || "Failed to sync relay settings.");
          this.statusTone = "error";
        }
        return null;
      } finally {
        this.syncingRelay = false;
      }
    },
    async save() {
      this.saving = true;
      this.status = "Saving AI / LLM settings...";
      this.statusTone = "";

      try {
        const saved = saveDesktopLlmSettings(this.getSnapshot());
        this.applySettings(saved);
        await this.syncRelayHostSettings({ updateStatus: false });
        this.status = "AI / LLM settings saved.";
        this.statusTone = "success";
        return saved;
      } catch (error) {
        this.status = error instanceof Error ? error.message : String(error || "Failed to save AI / LLM settings.");
        this.statusTone = "error";
        return null;
      } finally {
        this.saving = false;
      }
    },
    async refreshOllamaModels() {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.status = "Desktop bridge unavailable.";
        this.statusTone = "error";
        return [];
      }

      this.refreshingModels = true;
      this.status = "Fetching Ollama models...";
      this.statusTone = "";

      try {
        const active = this.activeProviderState;
        const result = await bridge.invoke("suggestions:list-ollama-models", {
          baseUrl: this.baseUrls.ollama,
          llmMode: active.llmMode,
          relayHostUrl: active.relayHostUrl,
          relayAuthToken: String(this.relay?.authToken || "").trim(),
          relayPort: Number(this.relay?.port || 42141)
        });
        if (!result?.success) {
          this.status = String(result?.message || "Failed to fetch Ollama models.");
          this.statusTone = "error";
          this.ollamaModels = [];
          return [];
        }

        const deduped = Array.from(
          new Set((Array.isArray(result.models) ? result.models : []).map((value) => String(value || "").trim()).filter(Boolean))
        );
        this.ollamaModels = deduped;
        if (!String(this.models.ollama || "").trim() && deduped.length > 0) {
          this.setModel(deduped[0]);
        }
        this.status = `Found ${deduped.length} Ollama model(s).`;
        this.statusTone = deduped.length ? "success" : "";
        return deduped;
      } catch (error) {
        this.status = error instanceof Error ? error.message : String(error || "Failed to fetch Ollama models.");
        this.statusTone = "error";
        this.ollamaModels = [];
        return [];
      } finally {
        this.refreshingModels = false;
      }
    },
    async scanRelayNetwork() {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.scanStatus = "Desktop bridge unavailable.";
        this.status = "Desktop bridge unavailable.";
        this.statusTone = "error";
        return [];
      }

      this.relayScanBusy = true;
      this.scanStatus = "Scanning local network...";
      this.status = "";
      this.statusTone = "";

      try {
        const result = await bridge.invoke("suggestions:relay:scan-network", {
          port: Number(this.relay?.port || 42141),
          relayAuthToken: String(this.relay?.authToken || "").trim(),
          timeoutMs: 280
        });
        if (!result?.success) {
          this.scanResults = [];
          this.scanStatus = String(result?.message || "Network scan failed.");
          this.status = this.scanStatus;
          this.statusTone = "error";
          return [];
        }

        this.scanResults = Array.isArray(result.hosts) ? result.hosts : [];
        this.scanStatus = this.scanResults.length
          ? `Found ${this.scanResults.length} host(s).`
          : "No emuBro hosts found on the local network.";
        return this.scanResults;
      } catch (error) {
        this.scanResults = [];
        this.scanStatus = error instanceof Error ? error.message : String(error || "Network scan failed.");
        this.status = this.scanStatus;
        this.statusTone = "error";
        return [];
      } finally {
        this.relayScanBusy = false;
      }
    },
    async initialize() {
      if (this.initialized) {
        return;
      }

      this.hydrateFromStorage();
      await this.refreshRelayHostData();
      this.initialized = true;
    }
  }
});
