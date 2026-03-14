<script setup>
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useShellI18nStore } from "../stores/shell-i18n";
import { useLlmSettingsStore } from "../stores/llm-settings";

const shellI18nStore = useShellI18nStore();
const llmSettingsStore = useLlmSettingsStore();
const {
  activeProviderState,
  refreshingModels,
  initialized,
  isOllamaProvider,
  ollamaModels,
  provider,
  promptTemplate,
  relay,
  relayConnections,
  relayScanBusy,
  relayStatus,
  relayStatusLoading,
  requiresApiKey,
  saving,
  scanResults,
  scanStatus,
  scope,
  selectedPlatformOnly,
  status,
  statusTone,
  syncingRelay,
  llmMode
} = storeToRefs(llmSettingsStore);

const currentModel = computed(() => activeProviderState.value?.model || "");
const currentBaseUrl = computed(() => activeProviderState.value?.baseUrl || "");
const currentApiKey = computed(() => activeProviderState.value?.apiKey || "");
const hostRunningLabel = computed(() =>
  relayStatus.value?.running
    ? shellI18nStore.tf(
        "desktopShell.llm.relayRunning",
        { port: Number(relayStatus.value?.port || relay.value?.port || 42141) },
        "Incoming relay is running on port {{port}}."
      )
    : shellI18nStore.t("desktopShell.llm.relayDisabled", "Incoming relay is currently disabled.")
);

function selectDiscoveredHost(url) {
  llmSettingsStore.pickRelayHost(url);
}

onMounted(() => {
  void llmSettingsStore.initialize();
});
</script>

<template>
  <div class="stack">
    <section class="subcard">
      <div class="card-header-row">
        <div>
          <h4>{{ shellI18nStore.t("desktopShell.settingsTools.aiConfiguration", "AI / LLM Configuration") }}</h4>
          <p class="meta-line">
            {{
              shellI18nStore.t(
                "desktopShell.llm.description",
                "The shell now owns provider, relay, and prompt settings used by support, suggestions, and other AI-assisted flows."
              )
            }}
          </p>
        </div>
        <span class="pill">{{ initialized ? shellI18nStore.t("desktopShell.llm.ready", "Shell settings ready") : shellI18nStore.t("desktopShell.states.initializing", "Initializing") }}</span>
      </div>

      <div class="desktop-llm-grid">
        <label class="field">
          <span>{{ shellI18nStore.t("desktopShell.llm.mode", "Mode") }}</span>
          <select :value="llmMode" @change="llmSettingsStore.setMode($event.target.value)">
            <option value="host">{{ shellI18nStore.t("desktopShell.llm.host", "Host") }}</option>
            <option value="client">{{ shellI18nStore.t("desktopShell.llm.client", "Client") }}</option>
          </select>
        </label>

        <label class="field">
          <span>{{ shellI18nStore.t("desktopShell.llm.provider", "Provider") }}</span>
          <select :value="provider" @change="llmSettingsStore.setProvider($event.target.value)">
            <option value="ollama">Ollama (Local)</option>
            <option value="openai">ChatGPT (OpenAI)</option>
            <option value="gemini">Gemini (Google)</option>
          </select>
        </label>

        <label class="field">
          <span>{{ shellI18nStore.t("desktopShell.llm.suggestionScope", "Suggestion Scope") }}</span>
          <select :value="scope" @change="llmSettingsStore.setScope($event.target.value)">
            <option value="library-plus-missing">{{ shellI18nStore.t("desktopShell.llm.libraryPlusMissing", "Library + Missing") }}</option>
            <option value="library-only">{{ shellI18nStore.t("desktopShell.llm.libraryOnly", "Library Only") }}</option>
          </select>
        </label>

        <label class="toolbar-checkbox desktop-llm-checkbox">
          <input
            :checked="selectedPlatformOnly"
            type="checkbox"
            @change="llmSettingsStore.setSelectedPlatformOnly($event.target.checked)"
          />
          <span>{{ shellI18nStore.t("desktopShell.llm.preferCurrentPlatformOnly", "Prefer current platform only") }}</span>
        </label>
      </div>

      <div class="desktop-llm-grid">
        <label class="field field-wide">
          <span>{{ shellI18nStore.t("desktopShell.llm.modelName", "Model Name") }}</span>
          <input
            :value="currentModel"
            type="text"
            :placeholder="isOllamaProvider ? 'llama3.1' : 'gpt-4o-mini / gemini-1.5-flash'"
            @input="llmSettingsStore.setModel($event.target.value)"
          />
        </label>

        <div v-if="isOllamaProvider" class="field field-wide">
          <span>{{ shellI18nStore.t("desktopShell.llm.detectedOllamaModels", "Detected Ollama Models") }}</span>
          <div class="desktop-llm-row">
            <select :value="currentModel" @change="llmSettingsStore.setModel($event.target.value)">
              <option value="">{{ shellI18nStore.t("desktopShell.llm.selectModel", "Select model...") }}</option>
              <option v-for="modelName in ollamaModels" :key="modelName" :value="modelName">
                {{ modelName }}
              </option>
            </select>
            <button type="button" class="action-button" :disabled="refreshingModels" @click="llmSettingsStore.refreshOllamaModels">
              {{ refreshingModels ? shellI18nStore.t("desktopShell.states.loading", "Loading...") : shellI18nStore.t("desktopShell.llm.refreshModels", "Refresh Models") }}
            </button>
          </div>
        </div>

        <label class="field field-wide" :class="{ 'is-dimmed': llmMode === 'client' }">
          <span>{{ shellI18nStore.t("desktopShell.llm.apiBaseUrl", "API Base URL") }}</span>
          <input
            :value="currentBaseUrl"
            type="text"
            :disabled="llmMode === 'client'"
            :placeholder="isOllamaProvider ? 'http://127.0.0.1:11434' : 'https://api.openai.com/v1'"
            @input="llmSettingsStore.setBaseUrl($event.target.value)"
          />
        </label>

        <label v-if="requiresApiKey" class="field field-wide" :class="{ 'is-dimmed': llmMode === 'client' }">
          <span>{{ shellI18nStore.t("desktopShell.llm.apiKey", "API Key") }}</span>
          <input
            :value="currentApiKey"
            type="password"
            autocomplete="off"
            :disabled="llmMode === 'client'"
            placeholder="sk-..."
            @input="llmSettingsStore.setApiKey($event.target.value)"
          />
        </label>
      </div>
    </section>

    <section class="subcard">
      <div class="card-header-row">
        <div>
          <h4>{{ shellI18nStore.t("desktopShell.llm.relayAndNetworkSettings", "Relay and network settings") }}</h4>
          <p class="meta-line">{{ hostRunningLabel }}</p>
        </div>
        <span class="pill">{{ relayStatusLoading ? shellI18nStore.t("desktopShell.states.syncing", "Syncing") : llmMode === "client" ? shellI18nStore.t("desktopShell.llm.clientMode", "Client Mode") : shellI18nStore.t("desktopShell.llm.hostMode", "Host Mode") }}</span>
      </div>

      <div class="desktop-llm-grid">
        <label class="field">
          <span>{{ shellI18nStore.t("desktopShell.llm.relayPort", "Relay Port") }}</span>
          <input
            :value="relay.port"
            type="number"
            min="1"
            max="65535"
            step="1"
            @input="llmSettingsStore.setRelayField('port', $event.target.value)"
          />
        </label>

        <label class="field">
          <span>{{ shellI18nStore.t("desktopShell.llm.sharedToken", "Shared Token") }}</span>
          <input
            :value="relay.authToken"
            type="password"
            autocomplete="off"
            :placeholder="shellI18nStore.t('desktopShell.llm.sharedTokenPlaceholder', 'Optional shared token')"
            @input="llmSettingsStore.setRelayField('authToken', $event.target.value)"
          />
        </label>
      </div>

      <div v-if="llmMode === 'client'" class="stack">
        <label class="field field-wide">
          <span>{{ shellI18nStore.t("desktopShell.llm.hostUrl", "Host URL") }}</span>
          <input
            :value="relay.hostUrl"
            type="text"
            placeholder="http://192.168.1.40:42141"
            @input="llmSettingsStore.setRelayField('hostUrl', $event.target.value)"
          />
        </label>

        <div class="button-row">
          <button type="button" class="action-button" :disabled="relayScanBusy" @click="llmSettingsStore.scanRelayNetwork">
            {{ relayScanBusy ? shellI18nStore.t("desktopShell.llm.scanning", "Scanning...") : shellI18nStore.t("desktopShell.llm.scanNetwork", "Scan Network") }}
          </button>
        </div>

        <p class="meta-line">{{ scanStatus }}</p>

        <div v-if="scanResults.length" class="desktop-llm-results">
          <article v-for="row in scanResults" :key="`${row.url}-${row.hostname || row.host || 'host'}`" class="desktop-llm-result-card">
            <div>
              <strong>{{ row.hostname || row.host || shellI18nStore.t("desktopShell.llm.unknownHost", "Unknown host") }}</strong>
              <p class="meta-line">
                {{ row.url }}
                <span v-if="row.version">| {{ row.version }}</span>
                <span v-if="Number.isFinite(Number(row.latencyMs))">| {{ Math.round(Number(row.latencyMs)) }} ms</span>
              </p>
            </div>
            <button type="button" class="action-button" @click="selectDiscoveredHost(row.url)">{{ shellI18nStore.t("desktopShell.llm.useHost", "Use Host") }}</button>
          </article>
        </div>
      </div>

      <div v-else class="stack">
        <label class="toolbar-checkbox desktop-llm-checkbox">
          <input :checked="relay.enabled" type="checkbox" @change="llmSettingsStore.setRelayField('enabled', $event.target.checked)" />
          <span>{{ shellI18nStore.t("desktopShell.llm.enableIncomingClientConnections", "Enable incoming client connections") }}</span>
        </label>

        <label class="field">
          <span>{{ shellI18nStore.t("desktopShell.llm.accessMode", "Access Mode") }}</span>
          <select
            :value="relay.accessMode"
            :disabled="!relay.enabled"
            @change="llmSettingsStore.setRelayField('accessMode', $event.target.value)"
          >
            <option value="open">{{ shellI18nStore.t("desktopShell.llm.openLan", "Open LAN") }}</option>
            <option value="whitelist">{{ shellI18nStore.t("desktopShell.llm.whitelistOnly", "Whitelist only") }}</option>
            <option value="blacklist">{{ shellI18nStore.t("desktopShell.llm.blacklist", "Blacklist") }}</option>
          </select>
        </label>

        <div class="desktop-llm-grid">
          <label class="field field-wide" :class="{ 'is-dimmed': !relay.enabled }">
            <span>{{ shellI18nStore.t("desktopShell.llm.whitelistIpHost", "Whitelist IP/Host") }}</span>
            <textarea
              class="desktop-llm-textarea"
              :disabled="!relay.enabled"
              :value="relay.whitelist.join('\n')"
              :placeholder="shellI18nStore.t('desktopShell.llm.oneIpPerLine', 'One IP or host per line')"
              @input="llmSettingsStore.setRelayField('whitelist', $event.target.value)"
            />
          </label>

          <label class="field field-wide" :class="{ 'is-dimmed': !relay.enabled }">
            <span>{{ shellI18nStore.t("desktopShell.llm.blacklistIpHost", "Blacklist IP/Host") }}</span>
            <textarea
              class="desktop-llm-textarea"
              :disabled="!relay.enabled"
              :value="relay.blacklist.join('\n')"
              :placeholder="shellI18nStore.t('desktopShell.llm.oneIpPerLine', 'One IP or host per line')"
              @input="llmSettingsStore.setRelayField('blacklist', $event.target.value)"
            />
          </label>
        </div>

        <div class="button-row">
          <button type="button" class="action-button" :disabled="relayStatusLoading" @click="llmSettingsStore.refreshRelayHostData">
            {{ relayStatusLoading ? shellI18nStore.t("desktopShell.tools.refreshing", "Refreshing...") : shellI18nStore.t("desktopShell.llm.refreshConnectedDevices", "Refresh Connected Devices") }}
          </button>
        </div>

        <div v-if="relayConnections.length" class="desktop-llm-results">
          <article
            v-for="row in relayConnections"
            :key="`${row.remoteAddress}-${row.lastSeenAt || 0}`"
            class="desktop-llm-result-card desktop-llm-connection-card"
          >
            <div>
              <strong>{{ row.remoteAddress || shellI18nStore.t("tools.unknown", "unknown") }} <span v-if="row.clientName" class="meta-line">({{ row.clientName }})</span></strong>
              <p class="meta-line">
                {{ shellI18nStore.t("desktopShell.llm.last", "last") }}: {{ row.lastPath || "-" }} | {{ shellI18nStore.t("desktopShell.llm.requests", "requests") }}: {{ row.requestCount || 0 }} | {{ shellI18nStore.t("desktopShell.llm.denied", "denied") }}: {{ row.deniedCount || 0 }}
              </p>
              <p class="meta-line">{{ shellI18nStore.t("desktopShell.llm.seen", "seen") }}: {{ row.lastSeenAt ? new Date(Number(row.lastSeenAt)).toLocaleString() : "-" }}</p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="subcard">
      <div class="card-header-row">
        <h4>{{ shellI18nStore.t("desktopShell.llm.promptTemplateTitle", "Suggestion prompt template") }}</h4>
        <span class="pill">{{ shellI18nStore.t("desktopShell.llm.sharedWithSuggestions", "Shared with suggestions") }}</span>
      </div>
      <label class="field field-wide">
        <span>{{ shellI18nStore.t("desktopShell.llm.promptTemplate", "Prompt Template") }}</span>
        <textarea
          class="desktop-llm-prompt"
          :value="promptTemplate"
          :placeholder="shellI18nStore.t('desktopShell.llm.promptTemplatePlaceholder', 'Prompt template used for suggestion requests')"
          @input="llmSettingsStore.setPromptTemplate($event.target.value)"
        />
      </label>
    </section>

    <section class="subcard">
      <div class="button-row">
        <button type="button" class="action-button" :disabled="saving" @click="llmSettingsStore.save">
          {{ saving ? shellI18nStore.t("desktopShell.themeWindow.saving", "Saving...") : shellI18nStore.t("desktopShell.llm.saveSettings", "Save AI / LLM Settings") }}
        </button>
        <button type="button" class="action-button" :disabled="syncingRelay" @click="llmSettingsStore.syncRelayHostSettings">
          {{ syncingRelay ? shellI18nStore.t("desktopShell.states.syncing", "Syncing...") : shellI18nStore.t("desktopShell.llm.syncRelayHost", "Sync Relay Host") }}
        </button>
      </div>
      <p v-if="status" class="meta-line" :class="{ 'meta-line-error': statusTone === 'error' }">{{ status }}</p>
    </section>
  </div>
</template>
