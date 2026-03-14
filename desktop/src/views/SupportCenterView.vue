<script setup>
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import LazyArtwork from "../components/LazyArtwork.vue";
import { renderSupportDoc, renderSupportMarkdown } from "../utils/support-formatting";
import { resolveEffectiveEmulatorConfig } from "../utils/emulator-config";
import { loadSelectedLaunchPath } from "../utils/emulator-preferences";
import { useAppStore } from "../stores/app";
import { useShellI18nStore } from "../stores/shell-i18n";
import { useSettingsToolsStore } from "../stores/settings-tools";
import { useSupportCenterStore } from "../stores/support-center";
import { useWorkspaceStore } from "../stores/workspace";

const appStore = useAppStore();
const shellI18nStore = useShellI18nStore();
const settingsToolsStore = useSettingsToolsStore();
const supportStore = useSupportCenterStore();
const workspaceStore = useWorkspaceStore();

const {
  autoSpecsEnabled,
  chatHistory,
  debugPayload,
  debugSupportEnabled,
  emulator,
  errorText,
  helpDocs,
  helpLoading,
  helpQuery,
  initialized,
  issueSummary,
  issueType,
  issueTypes,
  lastMatchedQuery,
  matchedEmulatorKeys,
  matchedEmulatorCount,
  matchedGameKeys,
  matchedGameCount,
  mode,
  outputMarkdown,
  pendingSupportTask,
  platform,
  running,
  selectedHelpDoc,
  selectedHelpDocId,
  specsBusy,
  status,
  statusTone,
  webAccessEnabled
} = storeToRefs(supportStore);
const { emulators, games } = storeToRefs(workspaceStore);

const matchActionStatus = ref("");
const matchActionTone = ref("");
const chatScrollRef = ref(null);

const renderedOutput = computed(() =>
  mode.value === "help"
    ? renderSupportDoc(selectedHelpDoc.value, shellI18nStore.t("support.helpInitialOutput", "Select a help topic to read it here."))
    : renderSupportMarkdown(outputMarkdown.value)
);

const debugText = computed(() =>
  debugPayload.value ? JSON.stringify(debugPayload.value, null, 2) : shellI18nStore.t("support.debugEmpty", "Debug output will appear after a request.")
);

const supportModes = computed(() => [
  {
    id: "troubleshoot",
    label: shellI18nStore.t("support.modeTroubleshoot", "Troubleshoot"),
    description: shellI18nStore.t(
      "desktopShell.support.modeDescriptionTroubleshoot",
      "Structured issue reporting with platform, emulator, error text, and details."
    )
  },
  {
    id: "chat",
    label: shellI18nStore.t("support.modeChat", "Chat"),
    description: shellI18nStore.t(
      "desktopShell.support.modeDescriptionChat",
      "General support chat for setup, library, and tool questions."
    )
  },
  {
    id: "help",
    label: shellI18nStore.t("support.helpTitle", "Help Docs"),
    description: shellI18nStore.t(
      "desktopShell.support.modeDescriptionHelp",
      "Search and read bundled support docs directly in the shell."
    )
  }
]);

const activeModeMeta = computed(
  () => supportModes.value.find((entry) => entry.id === mode.value) || supportModes.value[0]
);

const supportMatchGridStyle = computed(() => ({
  "--desktop-cover-column-width": "176px"
}));

const matchedGames = computed(() => {
  const keySet = new Set((matchedGameKeys.value || []).map((value) => String(value || "").trim()).filter(Boolean));
  return games.value.filter((row) => keySet.has(String(row?.key || "").trim()));
});

const matchedEmulators = computed(() => {
  const keySet = new Set((matchedEmulatorKeys.value || []).map((value) => String(value || "").trim()).filter(Boolean));
  return emulators.value.filter((row) => keySet.has(String(row?.key || "").trim()));
});

const hasLibraryMatches = computed(() => matchedGames.value.length > 0 || matchedEmulators.value.length > 0);
const chatComposerDisabled = computed(() => running.value || !String(issueSummary.value || "").trim());

const localizedOutputTitle = computed(() => {
  if (mode.value === "chat") {
    return shellI18nStore.t("support.conversation", "Conversation");
  }
  if (mode.value === "help") {
    return shellI18nStore.t("support.helpTitle", "Help Docs");
  }
  return shellI18nStore.t("desktopShell.support.suggestedFixSteps", "Suggested Fix Steps");
});

function useSupportStartup() {
  appStore.setPreferredStartupSection("support-center");
}

function openAiSettings() {
  settingsToolsStore.openPanel("ai");
}

function getDesktopBridge() {
  if (typeof window === "undefined" || !window.emubro) {
    return null;
  }
  return window.emubro;
}

function handleSupportMatchArtworkError(event, row, kind = "game") {
  const image = event?.target;
  if (!(image instanceof HTMLImageElement)) {
    return;
  }
  if (image.dataset.fallbackApplied === "1") {
    return;
  }
  const fallback = kind === "emulator"
    ? "/logo.png"
    : String(row?.platformLogo || "/logo.png").trim() || "/logo.png";
  image.dataset.fallbackApplied = "1";
  image.classList.add("is-artwork-fallback");
  image.src = fallback;
}

async function launchMatchedGame(row) {
  const bridge = getDesktopBridge();
  if (!bridge || typeof bridge.invoke !== "function") {
    matchActionStatus.value = shellI18nStore.t("desktopShell.library.desktopBridgeUnavailable", "Desktop bridge unavailable.");
    matchActionTone.value = "error";
    return;
  }
  const result = await bridge.invoke("launch-game", { gameId: row.id });
  matchActionStatus.value = String(
    result?.message ||
      (result?.success
        ? shellI18nStore.t("messages.gameLaunched", "Game launched successfully!")
        : shellI18nStore.t("messages.launchFailed", "Launch failed."))
  );
  matchActionTone.value = result?.success ? "success" : "error";
}

async function triggerMatchedEmulatorAction(row) {
  const bridge = getDesktopBridge();
  if (!bridge || typeof bridge.invoke !== "function") {
    matchActionStatus.value = shellI18nStore.t("desktopShell.library.desktopBridgeUnavailable", "Desktop bridge unavailable.");
    matchActionTone.value = "error";
    return;
  }

  if (!row?.installed) {
    const target = String(row?.website || row?.downloadUrl || "").trim();
    if (!target) {
      matchActionStatus.value = shellI18nStore.t("desktopShell.library.noEmulatorWebsite", "No emulator website is configured.");
      matchActionTone.value = "error";
      return;
    }
    const result = await bridge.invoke("open-external-url", target);
    matchActionStatus.value = String(
      result?.message ||
        (result?.success
          ? shellI18nStore.t("desktopShell.library.openedEmulatorWebsite", "Opened emulator website.")
          : shellI18nStore.t("desktopShell.library.couldNotOpenWebsite", "Could not open website."))
    );
    matchActionTone.value = result?.success ? "success" : "error";
    return;
  }

  const config = resolveEffectiveEmulatorConfig(row);
  const launchPath =
    loadSelectedLaunchPath(row, Array.isArray(row.filePaths) ? row.filePaths : [row.filePath]) || row.filePath;
  const directLaunchArgs = String(config.launchArgs || "").trim();
  const result = await bridge.invoke("launch-emulator", {
    filePath: launchPath,
    args: directLaunchArgs,
    workingDirectory: config.workingDirectory || row.workingDirectory,
    inputBindings: config.effectiveInputBindings,
    gamepadBindings: config.effectiveGamepadBindings?.gamepad || {},
    runCommandsBefore: config.runCommandsBefore,
    name: row.name
  });
  matchActionStatus.value = String(
    result?.message ||
      (result?.success
        ? shellI18nStore.t("desktopShell.library.emulatorLaunched", "Emulator launched.")
        : shellI18nStore.t("desktopShell.library.emulatorLaunchFailed", "Failed to launch emulator."))
  );
  matchActionTone.value = result?.success ? "success" : "error";
}

function scrollChatToBottom(behavior = "smooth") {
  const container = chatScrollRef.value;
  if (!container) {
    return;
  }
  container.scrollTo({
    top: container.scrollHeight,
    behavior
  });
}

async function queueChatScroll(behavior = "smooth") {
  await nextTick();
  scrollChatToBottom(behavior);
}

async function submitChatMessage() {
  if (chatComposerDisabled.value) {
    return;
  }
  await supportStore.runSupport();
  await queueChatScroll("smooth");
}

function handleChatComposerKeydown(event) {
  if (event.key !== "Enter" || event.shiftKey || event.isComposing) {
    return;
  }
  event.preventDefault();
  void submitChatMessage();
}

watch(
  () => [mode.value, chatHistory.value.length, running.value, matchedGameCount.value, matchedEmulatorCount.value],
  async (nextValue, previousValue = []) => {
    const activeMode = nextValue[0];
    const previousMode = previousValue[0];
    if (activeMode !== "chat") {
      return;
    }
    await queueChatScroll(previousMode === "chat" ? "smooth" : "auto");
  }
);

onMounted(() => {
  void Promise.all([supportStore.initialize(), settingsToolsStore.initialize(), workspaceStore.initialize()]);
});
</script>

<template>
  <div class="desktop-workspace-layout">
    <aside class="desktop-workspace-sidebar">
      <section class="subcard desktop-workspace-nav-card">
        <div class="card-header-row">
          <div>
            <div class="eyebrow">{{ shellI18nStore.t("desktopShell.groups.support.label", "Support") }}</div>
            <h4>{{ shellI18nStore.t("desktopShell.support.supportModes", "Support modes") }}</h4>
          </div>
          <span class="pill">{{ activeModeMeta.label }}</span>
        </div>
        <div class="desktop-workspace-nav-list">
          <button
            v-for="entry in supportModes"
            :key="entry.id"
            type="button"
            class="desktop-workspace-nav-button"
            :class="{ 'is-active': mode === entry.id }"
            @click="supportStore.setMode(entry.id)"
          >
            <strong>{{ entry.label }}</strong>
            <small>{{ entry.description }}</small>
          </button>
        </div>
        <div class="button-row">
          <button type="button" class="action-button" @click="openAiSettings">
            {{ shellI18nStore.t("desktopShell.support.aiSettings", "AI / LLM Settings") }}
          </button>
          <button type="button" class="action-button" @click="useSupportStartup">
            {{ shellI18nStore.t("desktopShell.actions.useAsStartup", "Use As Startup") }}
          </button>
        </div>
      </section>

      <section class="subcard desktop-workspace-nav-card">
        <div class="card-header-row">
          <h4>{{ shellI18nStore.t("desktopShell.support.capabilities", "Capabilities") }}</h4>
          <span class="pill">{{ initialized ? shellI18nStore.t("desktopShell.states.restored", "Restored") : shellI18nStore.t("desktopShell.states.initializing", "Initializing") }}</span>
        </div>
        <div class="desktop-workspace-toggle-list">
          <label class="toolbar-checkbox">
            <input :checked="autoSpecsEnabled" type="checkbox" @change="supportStore.setAutoSpecsEnabled($event.target.checked)" />
            <span>{{ shellI18nStore.t("support.autoSpecsToggle", "Allow auto specs fetch") }}</span>
          </label>
          <label class="toolbar-checkbox">
            <input :checked="webAccessEnabled" type="checkbox" @change="supportStore.setWebAccessEnabled($event.target.checked)" />
            <span>{{ shellI18nStore.t("desktopShell.support.allowWebAccess", "Allow web access") }}</span>
          </label>
          <label class="toolbar-checkbox">
            <input :checked="debugSupportEnabled" type="checkbox" @change="supportStore.setDebugSupportEnabled($event.target.checked)" />
            <span>{{ shellI18nStore.t("support.debugContext", "Debug context") }}</span>
          </label>
        </div>
        <div class="desktop-sidebar-stat-list">
          <div class="desktop-sidebar-stat">
            <strong>{{ mode === "chat" ? chatHistory.length : helpDocs.length }}</strong>
            <span>
              {{
                mode === "chat"
                  ? shellI18nStore.t("desktopShell.support.messages", "Messages")
                  : mode === "help"
                    ? shellI18nStore.t("desktopShell.support.docs", "Docs")
                    : shellI18nStore.t("desktopShell.support.guides", "Guides")
              }}
            </span>
          </div>
          <div class="desktop-sidebar-stat">
            <strong>{{ running ? shellI18nStore.t("desktopShell.support.busy", "Busy") : shellI18nStore.t("desktopShell.support.idle", "Idle") }}</strong>
            <span>{{ shellI18nStore.t("desktopShell.support.assistantState", "Assistant state") }}</span>
          </div>
        </div>
      </section>
    </aside>

    <section class="desktop-workspace-main">
      <section v-if="mode === 'chat'" class="card desktop-support-chat-shell">
        <header class="desktop-support-chat-shell-header">
          <div class="desktop-support-chat-shell-copy">
            <div class="eyebrow">{{ shellI18nStore.t("support.heroBadge", "LLM Support Chat") }}</div>
            <h2>{{ shellI18nStore.t("support.heroTitle", "Support Assistant") }}</h2>
            <p class="meta-line">{{ activeModeMeta.description }}</p>
          </div>
          <div class="desktop-support-chat-shell-actions">
            <button type="button" class="action-button" :disabled="specsBusy" @click="supportStore.insertSystemSpecs">
              {{ specsBusy ? shellI18nStore.t("support.status.collectingSpecs", "Collecting system specs...") : shellI18nStore.t("support.insertPcSpecs", "Insert PC Specs") }}
            </button>
            <button type="button" class="action-button" @click="openAiSettings">
              {{ shellI18nStore.t("desktopShell.support.openAiSettings", "Open AI / LLM") }}
            </button>
            <button type="button" class="action-button" @click="supportStore.clearSession">
              {{ shellI18nStore.t("support.clear", "Clear") }}
            </button>
          </div>
        </header>

        <div ref="chatScrollRef" class="desktop-support-chat-scroll">
          <div class="desktop-support-chat-stream">
            <div v-if="!chatHistory.length && !running" class="desktop-support-chat-empty">
              <strong>{{ shellI18nStore.t("desktopShell.support.sendAMessage", "Send a message to start the support conversation.") }}</strong>
              <p>{{ shellI18nStore.t("support.chatMessagePlaceholder", "Ask anything about emuBro features, settings, tools, launchers, emulator setup, or your local library.") }}</p>
            </div>

            <div class="desktop-support-chat">
              <article
                v-for="(entry, index) in chatHistory"
                :key="`${entry.role}-${index}`"
                class="desktop-support-chat-item"
                :class="`is-${entry.role}`"
              >
                <strong>{{ entry.role === "assistant" ? shellI18nStore.t("support.roleAssistant", "Assistant") : shellI18nStore.t("support.roleUser", "You") }}</strong>
                <div class="desktop-support-markdown" v-html="renderSupportMarkdown(entry.text)" />
              </article>

              <article v-if="running" class="desktop-support-chat-item is-assistant is-pending">
                <strong>{{ shellI18nStore.t("support.roleAssistant", "Assistant") }}</strong>
                <div class="desktop-support-chat-typing" aria-label="Thinking">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </article>
            </div>

            <section v-if="pendingSupportTask?.task?.type" class="desktop-support-task-approval">
              <div class="desktop-support-task-approval-copy">
                <strong>{{ pendingSupportTask?.title || shellI18nStore.t("desktopShell.support.taskApprovalTitle", "Assistant Request") }}</strong>
                <p>{{ pendingSupportTask?.message || shellI18nStore.t("desktopShell.support.taskApprovalSpecs", "The assistant wants to fetch your PC specs before continuing.") }}</p>
              </div>
              <div class="desktop-support-task-approval-actions">
                <button type="button" class="action-button" :disabled="running || specsBusy" @click="supportStore.approvePendingSupportTask()">
                  {{
                    specsBusy
                      ? shellI18nStore.t("support.status.collectingSpecs", "Collecting system specs...")
                      : (pendingSupportTask?.actionLabel || shellI18nStore.t("desktopShell.support.approveSpecsFetch", "Approve"))
                  }}
                </button>
                <button type="button" class="action-button ghost-button" :disabled="running || specsBusy" @click="supportStore.dismissPendingSupportTask()">
                  {{ shellI18nStore.t("desktopShell.support.dismissTaskRequest", "Not now") }}
                </button>
              </div>
            </section>

            <section v-if="hasLibraryMatches" class="desktop-support-match-stack desktop-support-match-stack--chat">
              <div class="card-header-row">
                <div>
                  <h4>{{ shellI18nStore.t("desktopShell.support.libraryMatches", "Library Matches") }}</h4>
                  <p class="meta-line">
                    {{
                      lastMatchedQuery
                        ? `${shellI18nStore.t("desktopShell.support.matchesFor", "Matches for")}: ${lastMatchedQuery}`
                        : shellI18nStore.t("desktopShell.support.matchesForCurrentQuestion", "Rows matching the current support question.")
                    }}
                  </p>
                </div>
                <span class="pill">{{ matchedGameCount + matchedEmulatorCount }}</span>
              </div>

              <div v-if="matchedGames.length" class="desktop-support-match-group">
                <div class="card-header-row">
                  <h5>{{ shellI18nStore.t("sidebar.allGames", "Games") }}</h5>
                  <span class="pill">{{ matchedGameCount }}</span>
                </div>
                <div class="desktop-library-cover-grid desktop-support-match-grid" :style="supportMatchGridStyle">
                  <article
                    v-for="row in matchedGames"
                    :key="row.key"
                    class="desktop-library-card"
                    tabindex="0"
                    role="button"
                    @dblclick="launchMatchedGame(row)"
                    @keydown.enter.prevent="launchMatchedGame(row)"
                  >
                    <div class="desktop-library-card-image">
                      <LazyArtwork :src="row.image" :alt="row.name" @error="handleSupportMatchArtworkError($event, row, 'game')" />
                      <span class="desktop-platform-badge">
                        <LazyArtwork :src="row.platformLogo" :alt="row.platform" />
                      </span>
                      <button type="button" class="desktop-library-hover-play" @click.stop="launchMatchedGame(row)">
                        {{ shellI18nStore.t("gameCard.launch", "Launch") }}
                      </button>
                    </div>
                    <div class="desktop-library-title-box">
                      <h5>{{ row.name }}</h5>
                    </div>
                    <div class="desktop-library-card-meta desktop-library-card-meta--compact">
                      <span>{{ row.platform }}</span>
                      <span>{{ shellI18nStore.t("gameDetails.rating", "Rating") }} {{ row.rating }}</span>
                    </div>
                  </article>
                </div>
              </div>

              <div v-if="matchedEmulators.length" class="desktop-support-match-group">
                <div class="card-header-row">
                  <h5>{{ shellI18nStore.t("sidebar.emulators", "Emulators") }}</h5>
                  <span class="pill">{{ matchedEmulatorCount }}</span>
                </div>
                <div class="desktop-library-cover-grid desktop-emulator-cover-grid desktop-support-match-grid" :style="supportMatchGridStyle">
                  <article
                    v-for="row in matchedEmulators"
                    :key="row.key"
                    class="desktop-library-card desktop-emulator-card"
                    tabindex="0"
                    role="button"
                    @dblclick="triggerMatchedEmulatorAction(row)"
                    @keydown.enter.prevent="triggerMatchedEmulatorAction(row)"
                  >
                    <div class="desktop-library-card-image desktop-emulator-card-image desktop-emulator-card-hero">
                      <span class="desktop-platform-badge desktop-platform-badge--emulator">
                        <LazyArtwork :src="row.platformLogo" :alt="row.platform" @error="handleSupportMatchArtworkError($event, row, 'emulator')" />
                      </span>
                      <LazyArtwork class="desktop-emulator-card-icon" :src="row.icon" :alt="row.name" @error="handleSupportMatchArtworkError($event, row, 'emulator')" />
                      <button
                        type="button"
                        class="desktop-library-hover-play desktop-library-hover-play--emulator"
                        @click.stop="triggerMatchedEmulatorAction(row)"
                      >
                        {{
                          row.installed
                            ? shellI18nStore.t("gameCard.launch", "Launch")
                            : shellI18nStore.t("desktopShell.library.website", "Website")
                        }}
                      </button>
                    </div>
                    <div class="desktop-library-card-body desktop-emulator-card-body">
                      <h5>{{ row.name }}</h5>
                      <p>{{ row.platform }}</p>
                      <span class="desktop-emulator-status-pill" :class="{ 'is-installed': row.installed }">
                        {{
                          row.installed
                            ? shellI18nStore.t("gameCard.installed", "Installed")
                            : shellI18nStore.t("gameCard.notInstalled", "Not Installed")
                        }}
                      </span>
                      <div class="desktop-library-card-meta">
                        <span>{{ row.type }}</span>
                        <span v-if="row.filePaths.length > 1">+{{ row.filePaths.length - 1 }}</span>
                      </div>
                    </div>
                  </article>
                </div>
              </div>

              <p v-if="matchActionStatus" class="meta-line" :class="{ 'meta-line-error': matchActionTone === 'error' }">
                {{ matchActionStatus }}
              </p>
            </section>

            <details v-if="debugSupportEnabled" class="desktop-update-notes" :open="!!debugPayload">
              <summary>{{ shellI18nStore.t("support.debugDetails", "Planner / Retrieval Details") }}</summary>
              <pre>{{ debugText }}</pre>
            </details>
          </div>
        </div>

        <footer class="desktop-support-chat-composer">
          <div class="desktop-support-chat-composer-row">
            <textarea
              class="desktop-support-chat-input"
              :value="issueSummary"
              :placeholder="shellI18nStore.t('support.chatMessagePlaceholder', 'Ask anything about emuBro features, settings, tools, launchers, or your local library...')"
              @input="supportStore.updateField('issueSummary', $event.target.value)"
              @keydown="handleChatComposerKeydown"
            />
            <button type="button" class="action-button desktop-support-chat-send" :disabled="chatComposerDisabled" @click="submitChatMessage">
              {{ running ? shellI18nStore.t("suggested.status.running", "Running...") : shellI18nStore.t("support.send", "Send") }}
            </button>
          </div>
          <div class="desktop-support-chat-footer-meta">
            <p v-if="status" class="meta-line" :class="{ 'meta-line-error': statusTone === 'error' }">{{ status }}</p>
            <p v-else class="meta-line">{{ shellI18nStore.t("desktopShell.support.enterToSend", "Enter to send. Shift+Enter for newline.") }}</p>
            <span class="pill">{{ chatHistory.length }} {{ shellI18nStore.t("desktopShell.support.messages", "messages") }}</span>
          </div>
        </footer>
      </section>

      <template v-else>
        <section class="card desktop-workspace-hero-card">
          <div class="card-header-row">
            <div>
              <div class="eyebrow">{{ shellI18nStore.t("support.heroBadge", "LLM Troubleshooter") }}</div>
              <h2>{{ shellI18nStore.t("support.heroTitle", "Support Assistant") }}</h2>
            </div>
            <span class="pill">{{ activeModeMeta.label }}</span>
          </div>
          <p>{{ shellI18nStore.t("desktopShell.support.heroDescription", "This shell section owns real troubleshooting, chat, help-doc browsing, and system-spec insertion instead of routing support back through the legacy renderer.") }}</p>
          <p class="meta-line">{{ activeModeMeta.description }}</p>
        </section>

        <section class="grid-two desktop-support-layout">
        <article class="card desktop-support-form-card">
          <div class="form-grid">
            <label v-if="mode === 'troubleshoot'" class="field">
              <span>{{ shellI18nStore.t("support.issueTypeLabel", "Issue Type") }}</span>
              <select :value="issueType" @change="supportStore.setIssueType($event.target.value)">
                <option v-for="option in issueTypes" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label v-if="mode === 'troubleshoot'" class="field">
              <span>{{ shellI18nStore.t("support.platformOptionalLabel", "Platform") }}</span>
              <input
                :value="platform"
                type="text"
                :placeholder="shellI18nStore.t('support.platformPlaceholder', 'e.g. PS1, SNES, N64')"
                @input="supportStore.updateField('platform', $event.target.value)"
              />
            </label>

            <label v-if="mode === 'troubleshoot'" class="field">
              <span>{{ shellI18nStore.t("support.emulatorOptionalLabel", "Emulator") }}</span>
              <input
                :value="emulator"
                type="text"
                :placeholder="shellI18nStore.t('support.emulatorPlaceholder', 'e.g. DuckStation, RetroArch, PCSX2')"
                @input="supportStore.updateField('emulator', $event.target.value)"
              />
            </label>

            <label v-if="mode !== 'help'" class="field field-wide">
              <span>{{ shellI18nStore.t("support.issueSummaryLabel", "Short problem summary") }}</span>
              <input
                :value="issueSummary"
                type="text"
                :placeholder="shellI18nStore.t('support.issueSummaryPlaceholder', 'e.g. Game boots to black screen after intro')"
                @input="supportStore.updateField('issueSummary', $event.target.value)"
              />
            </label>

            <label v-if="mode === 'troubleshoot'" class="field field-wide">
              <span>{{ shellI18nStore.t("support.errorTextOptionalLabel", "Error text") }}</span>
              <input
                :value="errorText"
                type="text"
                :placeholder="shellI18nStore.t('support.errorTextPlaceholder', 'Paste exact error text if you have one')"
                @input="supportStore.updateField('errorText', $event.target.value)"
              />
            </label>

            <label v-if="mode === 'troubleshoot'" class="field field-wide">
              <span>{{ shellI18nStore.t("support.detailsLabel", "Details") }}</span>
              <textarea
                class="desktop-support-textarea"
                :value="supportStore.details"
                :placeholder="shellI18nStore.t('support.detailsPlaceholder', 'What did you try already? What changed recently? Any hardware/driver info?')"
                @input="supportStore.updateField('details', $event.target.value)"
              />
            </label>

            <label v-if="mode === 'help'" class="field field-wide">
              <span>{{ shellI18nStore.t("support.helpSearchLabel", "Search Help Docs") }}</span>
              <div class="desktop-help-search-row">
                <input
                  :value="helpQuery"
                  type="text"
                  :placeholder="shellI18nStore.t('support.helpSearchPlaceholder', 'Search docs (theme, launchers, covers, import, updates...)')"
                  @input="supportStore.setHelpQuery($event.target.value)"
                />
                <button type="button" class="action-button" :disabled="helpLoading" @click="supportStore.refreshHelpDocs({ openFirst: true })">
                  {{ helpLoading ? shellI18nStore.t("desktopShell.states.loading", "Loading...") : shellI18nStore.t("support.helpSearchAction", "Search Docs") }}
                </button>
              </div>
            </label>
          </div>

          <div class="button-row">
            <button
              v-if="mode !== 'help'"
              type="button"
              class="action-button"
              :disabled="specsBusy"
              @click="supportStore.insertSystemSpecs"
            >
              {{ specsBusy ? shellI18nStore.t("support.status.collectingSpecs", "Collecting system specs...") : shellI18nStore.t("support.insertPcSpecs", "Insert PC Specs") }}
            </button>
            <button
              v-if="mode !== 'help'"
              type="button"
              class="action-button"
              :disabled="running"
              @click="supportStore.runSupport"
            >
              {{ running ? shellI18nStore.t("suggested.status.running", "Running...") : shellI18nStore.t("support.getHelp", "Get Help") }}
            </button>
            <button v-if="mode !== 'help'" type="button" class="action-button" @click="openAiSettings">
              {{ shellI18nStore.t("desktopShell.support.openAiSettings", "Open AI / LLM") }}
            </button>
            <button
              v-if="mode === 'help'"
              type="button"
              class="action-button"
              :disabled="helpLoading"
              @click="supportStore.refreshHelpDocs({ openFirst: true })"
            >
              {{ helpLoading ? shellI18nStore.t("desktopShell.support.reloading", "Reloading...") : shellI18nStore.t("desktopShell.actions.reloadDocs", "Reload Docs") }}
            </button>
            <button type="button" class="action-button" @click="supportStore.clearSession">
              {{ shellI18nStore.t("support.clear", "Clear") }}
            </button>
          </div>

          <p v-if="status" class="meta-line" :class="{ 'meta-line-error': statusTone === 'error' }">{{ status }}</p>
        </article>

        <article class="card desktop-support-output-card">
          <div class="card-header-row">
            <h3>{{ localizedOutputTitle }}</h3>
            <span class="pill">
              {{
                mode === "help"
                  ? `${helpDocs.length} ${shellI18nStore.t("desktopShell.support.docs", "docs")}`
                  : shellI18nStore.t("desktopShell.settingsTools.desktopManaged", "Desktop-managed")
              }}
            </span>
          </div>

          <div v-if="mode === 'help'" class="desktop-support-help-layout">
            <aside class="desktop-support-help-list">
              <button
                v-for="doc in helpDocs"
                :key="doc.id"
                type="button"
                class="desktop-docs-list-item"
                :class="{ 'is-active': selectedHelpDocId === doc.id }"
                @click="supportStore.selectHelpDoc(doc.id)"
              >
                <strong>{{ doc.title || doc.id }}</strong>
                <small>{{ doc.preview || doc.snippet || shellI18nStore.t("desktopShell.home.noDocPreview", "No preview available.") }}</small>
              </button>
              <div v-if="!helpDocs.length && !helpLoading" class="desktop-docs-empty">
                {{ shellI18nStore.t("desktopShell.home.noDocsMatched", "No docs matched the current query.") }}
              </div>
            </aside>
            <article class="subcard">
              <div class="desktop-support-markdown" v-html="renderedOutput" />
            </article>
          </div>

          <div v-else class="desktop-support-markdown desktop-support-output-markdown" v-html="renderedOutput" />

          <section v-if="mode !== 'help' && pendingSupportTask?.task?.type" class="desktop-support-task-approval">
            <div class="desktop-support-task-approval-copy">
              <strong>{{ pendingSupportTask?.title || shellI18nStore.t("desktopShell.support.taskApprovalTitle", "Assistant Request") }}</strong>
              <p>{{ pendingSupportTask?.message || shellI18nStore.t("desktopShell.support.taskApprovalSpecs", "The assistant wants to fetch your PC specs before continuing.") }}</p>
            </div>
            <div class="desktop-support-task-approval-actions">
              <button type="button" class="action-button" :disabled="running || specsBusy" @click="supportStore.approvePendingSupportTask()">
                {{
                  specsBusy
                    ? shellI18nStore.t("support.status.collectingSpecs", "Collecting system specs...")
                    : (pendingSupportTask?.actionLabel || shellI18nStore.t("desktopShell.support.approveSpecsFetch", "Approve"))
                }}
              </button>
              <button type="button" class="action-button ghost-button" :disabled="running || specsBusy" @click="supportStore.dismissPendingSupportTask()">
                {{ shellI18nStore.t("desktopShell.support.dismissTaskRequest", "Not now") }}
              </button>
            </div>
          </section>

          <section v-if="mode !== 'help' && hasLibraryMatches" class="desktop-support-match-stack">
            <div class="card-header-row">
              <div>
                <h4>{{ shellI18nStore.t("desktopShell.support.libraryMatches", "Library Matches") }}</h4>
                <p class="meta-line">
                  {{
                    lastMatchedQuery
                      ? `${shellI18nStore.t("desktopShell.support.matchesFor", "Matches for")}: ${lastMatchedQuery}`
                      : shellI18nStore.t("desktopShell.support.matchesForCurrentQuestion", "Rows matching the current support question.")
                  }}
                </p>
              </div>
              <span class="pill">{{ matchedGameCount + matchedEmulatorCount }}</span>
            </div>

            <div v-if="matchedGames.length" class="desktop-support-match-group">
              <div class="card-header-row">
                <h5>{{ shellI18nStore.t("sidebar.allGames", "Games") }}</h5>
                <span class="pill">{{ matchedGameCount }}</span>
              </div>
              <div class="desktop-library-cover-grid desktop-support-match-grid" :style="supportMatchGridStyle">
                <article
                  v-for="row in matchedGames"
                  :key="row.key"
                  class="desktop-library-card"
                  tabindex="0"
                  role="button"
                  @dblclick="launchMatchedGame(row)"
                  @keydown.enter.prevent="launchMatchedGame(row)"
                >
                  <div class="desktop-library-card-image">
                    <LazyArtwork :src="row.image" :alt="row.name" @error="handleSupportMatchArtworkError($event, row, 'game')" />
                    <span class="desktop-platform-badge">
                      <LazyArtwork :src="row.platformLogo" :alt="row.platform" />
                    </span>
                    <button type="button" class="desktop-library-hover-play" @click.stop="launchMatchedGame(row)">
                      {{ shellI18nStore.t("gameCard.launch", "Launch") }}
                    </button>
                  </div>
                  <div class="desktop-library-title-box">
                    <h5>{{ row.name }}</h5>
                  </div>
                  <div class="desktop-library-card-meta desktop-library-card-meta--compact">
                    <span>{{ row.platform }}</span>
                    <span>{{ shellI18nStore.t("gameDetails.rating", "Rating") }} {{ row.rating }}</span>
                  </div>
                </article>
              </div>
            </div>

            <div v-if="matchedEmulators.length" class="desktop-support-match-group">
              <div class="card-header-row">
                <h5>{{ shellI18nStore.t("sidebar.emulators", "Emulators") }}</h5>
                <span class="pill">{{ matchedEmulatorCount }}</span>
              </div>
              <div class="desktop-library-cover-grid desktop-emulator-cover-grid desktop-support-match-grid" :style="supportMatchGridStyle">
                <article
                  v-for="row in matchedEmulators"
                  :key="row.key"
                  class="desktop-library-card desktop-emulator-card"
                  tabindex="0"
                  role="button"
                  @dblclick="triggerMatchedEmulatorAction(row)"
                  @keydown.enter.prevent="triggerMatchedEmulatorAction(row)"
                >
                  <div class="desktop-library-card-image desktop-emulator-card-image desktop-emulator-card-hero">
                    <span class="desktop-platform-badge desktop-platform-badge--emulator">
                      <LazyArtwork :src="row.platformLogo" :alt="row.platform" @error="handleSupportMatchArtworkError($event, row, 'emulator')" />
                    </span>
                    <LazyArtwork class="desktop-emulator-card-icon" :src="row.icon" :alt="row.name" @error="handleSupportMatchArtworkError($event, row, 'emulator')" />
                    <button
                      type="button"
                      class="desktop-library-hover-play desktop-library-hover-play--emulator"
                      @click.stop="triggerMatchedEmulatorAction(row)"
                    >
                      {{
                        row.installed
                          ? shellI18nStore.t("gameCard.launch", "Launch")
                          : shellI18nStore.t("desktopShell.library.website", "Website")
                      }}
                    </button>
                  </div>
                  <div class="desktop-library-card-body desktop-emulator-card-body">
                    <h5>{{ row.name }}</h5>
                    <p>{{ row.platform }}</p>
                    <span class="desktop-emulator-status-pill" :class="{ 'is-installed': row.installed }">
                      {{
                        row.installed
                          ? shellI18nStore.t("gameCard.installed", "Installed")
                          : shellI18nStore.t("gameCard.notInstalled", "Not Installed")
                      }}
                    </span>
                    <div class="desktop-library-card-meta">
                      <span>{{ row.type }}</span>
                      <span v-if="row.filePaths.length > 1">+{{ row.filePaths.length - 1 }}</span>
                    </div>
                  </div>
                </article>
              </div>
            </div>

            <p v-if="matchActionStatus" class="meta-line" :class="{ 'meta-line-error': matchActionTone === 'error' }">
              {{ matchActionStatus }}
            </p>
          </section>

          <details v-if="debugSupportEnabled" class="desktop-update-notes" :open="!!debugPayload">
            <summary>{{ shellI18nStore.t("support.debugDetails", "Planner / Retrieval Details") }}</summary>
            <pre>{{ debugText }}</pre>
          </details>
        </article>
        </section>
      </template>
    </section>
  </div>
</template>
