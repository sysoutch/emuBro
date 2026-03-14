<script setup>
import { computed, ref, watch } from "vue";
import { useShellI18nStore } from "../stores/shell-i18n";
import {
  clearStoredEmulatorConfig,
  createDefaultEmulatorConfig,
  mergeEmulatorConfig,
  normalizeEmulatorConfigDraft,
  parseEmulatorRuntimeRuleText,
  readEmulatorConfigFile,
  saveStoredEmulatorConfig,
  writeEmulatorConfigFile
} from "../utils/emulator-config";
import {
  analyzeBindingEntries,
  applyBindingEdits,
  CONTROL_PRESET_GAMEPAD,
  CONTROL_PRESET_KEYBOARD,
  detectConfigFormat,
  extractBindings
} from "../utils/emulator-config-bindings";
import {
  buildEffectiveGamepadBindings,
  GAMEPAD_BINDING_ACTIONS,
  GAMEPAD_BINDING_LABELS,
  getPlatformGamepadBindings,
  normalizeInputBindingProfile
} from "../utils/gamepad-bindings";

const props = defineProps({
  emulator: {
    type: Object,
    default: null
  },
  selectedLaunchPath: {
    type: String,
    default: ""
  }
});
const shellI18nStore = useShellI18nStore();

const activeTab = ref("general");
const configDraft = ref(createDefaultEmulatorConfig(props.emulator));
const runtimeDirectoryNamesText = ref("");
const runtimeFileExtensionsText = ref("");
const runtimeFileNameIncludesText = ref("");
const configFileText = ref("");
const configFileResolvedPath = ref("");
const configFileLoaded = ref(false);
const configFileExists = ref(false);
const configStatus = ref("");
const configStatusTone = ref("");
const configBusy = ref("");
const bindingEntries = ref([]);
const bindingEditable = ref(false);
const bindingMessage = ref("");
const bindingFormat = ref("");
const platformGamepadBindings = ref(normalizeInputBindingProfile({}));

const effectiveExecutablePath = computed(() =>
  String(props.selectedLaunchPath || props.emulator?.filePath || "").trim()
);
const effectiveDraft = computed(() => buildCurrentConfigDraft());
const platformLabel = computed(() =>
  String(props.emulator?.platform || props.emulator?.platformShortName || t("desktopShell.emulatorConfig.gamepad.unknownPlatform", "Unknown")).trim()
);
const hasConfigOverrideChanges = computed(() => {
  const nextDraft = JSON.stringify(effectiveDraft.value);
  const mergedDraft = JSON.stringify(mergeEmulatorConfig(props.emulator));
  return nextDraft !== mergedDraft;
});
const canAccessConfigFile = computed(() =>
  !!effectiveExecutablePath.value && !!String(configDraft.value?.configFilePath || "").trim()
);
const bindingSummary = computed(() => analyzeBindingEntries(bindingEntries.value));
const effectiveGamepadBindings = computed(() =>
  buildEffectiveGamepadBindings(platformGamepadBindings.value, configDraft.value?.gamepadBindings || {})
);

function getDesktopBridge() {
  if (typeof window === "undefined" || !window.emubro) {
    return null;
  }
  return window.emubro;
}

function t(key, fallback) {
  return shellI18nStore.t(key, fallback);
}

function tf(key, params, fallback) {
  return shellI18nStore.tf(key, params, fallback);
}

function setConfigFeedback(message, tone = "") {
  configStatus.value = String(message || "").trim();
  configStatusTone.value = tone;
}

function syncConfigEditorDraft() {
  const merged = mergeEmulatorConfig(props.emulator);
  configDraft.value = normalizeEmulatorConfigDraft(merged);
  runtimeDirectoryNamesText.value = (merged.runtimeDataRules?.directoryNames || []).join("\n");
  runtimeFileExtensionsText.value = (merged.runtimeDataRules?.fileExtensions || []).join("\n");
  runtimeFileNameIncludesText.value = (merged.runtimeDataRules?.fileNameIncludes || []).join("\n");
  platformGamepadBindings.value = getPlatformGamepadBindings(props.emulator?.platformShortName);
  configFileText.value = "";
  configFileResolvedPath.value = "";
  configFileLoaded.value = false;
  configFileExists.value = false;
  bindingEntries.value = [];
  bindingEditable.value = false;
  bindingMessage.value = "";
  bindingFormat.value = "";
  activeTab.value = "general";
  setConfigFeedback("", "");
}

function buildCurrentConfigDraft() {
  return normalizeEmulatorConfigDraft({
    ...configDraft.value,
    gamepadBindings: normalizeInputBindingProfile(configDraft.value?.gamepadBindings || {}),
    runtimeDataRules: {
      directoryNames: parseEmulatorRuntimeRuleText(runtimeDirectoryNamesText.value),
      fileExtensions: parseEmulatorRuntimeRuleText(runtimeFileExtensionsText.value),
      fileNameIncludes: parseEmulatorRuntimeRuleText(runtimeFileNameIncludesText.value)
    }
  });
}

function loadBindingEntriesFromText(rawText = configFileText.value) {
  const format = detectConfigFormat(configDraft.value?.configFilePath, rawText);
  const result = extractBindings(rawText, format);
  bindingEntries.value = Array.isArray(result?.entries) ? result.entries : [];
  bindingEditable.value = !!result?.editable;
  bindingMessage.value = String(result?.message || "");
  bindingFormat.value = String(result?.format || format || "");
}

function updateBindingEntry(entryId, nextValue) {
  bindingEntries.value = bindingEntries.value.map((entry) =>
    String(entry?.id || "") === String(entryId || "")
      ? { ...entry, value: String(nextValue ?? "") }
      : entry
  );
}

function applyControlPreset(presetMap) {
  const preset = presetMap && typeof presetMap === "object" ? presetMap : {};
  bindingEntries.value = bindingEntries.value.map((entry) => {
    const controlKey = String(entry?.controlKey || "").trim().toLowerCase();
    if (!controlKey || !Object.prototype.hasOwnProperty.call(preset, controlKey)) {
      return entry;
    }
    return {
      ...entry,
      value: String(preset[controlKey] || "")
    };
  });
}

function setGamepadOverride(channel, action, value) {
  const normalizedChannel = String(channel || "").trim().toLowerCase() === "keyboard" ? "keyboard" : "gamepad";
  const normalizedAction = String(action || "").trim();
  if (!normalizedAction) return;

  const nextProfile = normalizeInputBindingProfile(configDraft.value?.gamepadBindings || {});
  const nextChannel = {
    ...(nextProfile[normalizedChannel] || {})
  };
  const normalizedValue = String(value || "").trim();
  if (normalizedValue) {
    nextChannel[normalizedAction] = normalizedValue;
  } else {
    delete nextChannel[normalizedAction];
  }
  nextProfile[normalizedChannel] = nextChannel;
  configDraft.value = normalizeEmulatorConfigDraft({
    ...configDraft.value,
    gamepadBindings: nextProfile
  });
}

function resetGamepadOverrides() {
  configDraft.value = normalizeEmulatorConfigDraft({
    ...configDraft.value,
    gamepadBindings: normalizeInputBindingProfile({})
  });
}

function getPlatformGamepadValue(channel, action) {
  return String(platformGamepadBindings.value?.[channel]?.[action] || "").trim();
}

function getEffectiveGamepadValue(channel, action) {
  return String(effectiveGamepadBindings.value?.[channel]?.[action] || "").trim();
}

async function saveConfigOverrides() {
  if (!props.emulator) {
    setConfigFeedback(t("desktopShell.emulatorConfig.errors.noSelection", "No emulator is selected."), "error");
    return;
  }

  configBusy.value = "save-overrides";
  try {
    const nextDraft = buildCurrentConfigDraft();
    saveStoredEmulatorConfig(props.emulator, nextDraft);
    configDraft.value = nextDraft;
    setConfigFeedback(t("desktopShell.emulatorConfig.overrides.saved", "Config overrides saved."), "success");
  } catch (error) {
    setConfigFeedback(
      error instanceof Error ? error.message : String(error || t("desktopShell.emulatorConfig.errors.saveOverrides", "Failed to save config overrides.")),
      "error"
    );
  } finally {
    configBusy.value = "";
  }
}

function resetConfigOverrides() {
  if (!props.emulator) {
    setConfigFeedback(t("desktopShell.emulatorConfig.errors.noSelection", "No emulator is selected."), "error");
    return;
  }

  clearStoredEmulatorConfig(props.emulator);
  syncConfigEditorDraft();
  setConfigFeedback(t("desktopShell.emulatorConfig.overrides.reset", "Config overrides reset to defaults."), "success");
}

async function loadConfigFileContents() {
  if (!canAccessConfigFile.value) {
    setConfigFeedback(t("desktopShell.emulatorConfig.errors.missingPaths", "Select an emulator path and config file path first."), "error");
    return;
  }

  const bridge = getDesktopBridge();
  configBusy.value = "load-config-file";
  setConfigFeedback(t("desktopShell.emulatorConfig.config.loading", "Loading config file..."), "");
  try {
    const response = await readEmulatorConfigFile(
      bridge,
      effectiveExecutablePath.value,
      configDraft.value.configFilePath
    );
    if (!response?.success && response?.exists !== false) {
      throw new Error(String(response?.message || t("desktopShell.emulatorConfig.errors.loadConfigFile", "Failed to load config file.")));
    }

    configFileResolvedPath.value = String(response?.resolvedPath || "").trim();
    configFileText.value = String(response?.text || "");
    configFileLoaded.value = true;
    configFileExists.value = !!response?.exists;
    loadBindingEntriesFromText(configFileText.value);

    if (!response?.exists) {
      setConfigFeedback(String(response?.message || t("desktopShell.emulatorConfig.config.notFound", "Config file not found yet.")), "error");
      return;
    }

    setConfigFeedback(t("desktopShell.emulatorConfig.config.loaded", "Config file loaded."), "success");
  } catch (error) {
    configFileLoaded.value = false;
    configFileExists.value = false;
    bindingEntries.value = [];
    bindingEditable.value = false;
    bindingMessage.value = "";
    bindingFormat.value = "";
    setConfigFeedback(
      error instanceof Error ? error.message : String(error || t("desktopShell.emulatorConfig.errors.loadConfigFile", "Failed to load config file.")),
      "error"
    );
  } finally {
    configBusy.value = "";
  }
}

async function saveConfigFileContents() {
  if (!canAccessConfigFile.value) {
    setConfigFeedback(t("desktopShell.emulatorConfig.errors.missingPaths", "Select an emulator path and config file path first."), "error");
    return;
  }

  const bridge = getDesktopBridge();
  configBusy.value = "save-config-file";
  setConfigFeedback(t("desktopShell.emulatorConfig.config.saving", "Saving config file..."), "");
  try {
    let contents = String(configFileText.value || "");
    if (bindingEditable.value && bindingEntries.value.length) {
      try {
        contents = applyBindingEdits(contents, bindingFormat.value || detectConfigFormat(configDraft.value.configFilePath, contents), bindingEntries.value);
        configFileText.value = contents;
      } catch (error) {
        activeTab.value = "bindings";
        throw error;
      }
    }

    const response = await writeEmulatorConfigFile(
      bridge,
      effectiveExecutablePath.value,
      configDraft.value.configFilePath,
      contents
    );
    if (!response?.success) {
      throw new Error(String(response?.message || t("desktopShell.emulatorConfig.errors.saveConfigFile", "Failed to save config file.")));
    }

    configFileResolvedPath.value = String(response?.resolvedPath || configDraft.value.configFilePath || "").trim();
    configFileLoaded.value = true;
    configFileExists.value = true;
    loadBindingEntriesFromText(contents);
    setConfigFeedback(t("desktopShell.emulatorConfig.config.saved", "Config file saved."), "success");
  } catch (error) {
    setConfigFeedback(
      error instanceof Error ? error.message : String(error || t("desktopShell.emulatorConfig.errors.saveConfigFile", "Failed to save config file.")),
      "error"
    );
  } finally {
    configBusy.value = "";
  }
}

async function showConfigFileInFolder() {
  const target = String(configFileResolvedPath.value || configDraft.value.configFilePath || "").trim();
  if (!target) {
    setConfigFeedback(t("desktopShell.emulatorConfig.errors.noConfigPath", "No config file path is available yet."), "error");
    return;
  }

  const bridge = getDesktopBridge();
  if (!bridge?.invoke) {
    setConfigFeedback(t("desktopShell.tools.bridgeUnavailable", "Desktop bridge unavailable."), "error");
    return;
  }

  const result = await bridge.invoke("show-item-in-folder", target);
  setConfigFeedback(
    String(
      result?.message ||
        (result?.success
          ? t("desktopShell.emulatorConfig.config.folderOpened", "Opened config file location.")
          : t("desktopShell.emulatorConfig.config.folderFailed", "Could not open config file location."))
    ),
    result?.success ? "success" : "error"
  );
}

watch(
  () => props.emulator,
  () => {
    syncConfigEditorDraft();
  },
  { immediate: true }
);

watch(
  () => configDraft.value.configFilePath,
  () => {
    configFileLoaded.value = false;
    configFileExists.value = false;
    configFileResolvedPath.value = "";
    configFileText.value = "";
    bindingEntries.value = [];
    bindingEditable.value = false;
    bindingMessage.value = "";
    bindingFormat.value = "";
    if (configStatusTone.value !== "error") {
      setConfigFeedback("", "");
    }
  }
);
</script>

<template>
  <div class="desktop-modal-editor-section">
    <article class="subcard desktop-modal-editor-section">
      <div class="card-header-row">
        <div>
          <h4>{{ shellI18nStore.t("desktopShell.emulatorConfig.title", "Emulator Configuration") }}</h4>
          <p class="meta-line">
            {{ shellI18nStore.t("desktopShell.emulatorConfig.description", "Shell-native general overrides, binding editing, config-file editing, gamepad overrides, and runtime backup rules.") }}
          </p>
        </div>
      </div>

      <div class="segmented-control desktop-emulator-config-tabs">
        <button type="button" class="segmented-control-button" :class="{ 'is-active': activeTab === 'general' }" @click="activeTab = 'general'">
          {{ shellI18nStore.t("desktopShell.emulatorConfig.tabs.general", "General") }}
        </button>
        <button type="button" class="segmented-control-button" :class="{ 'is-active': activeTab === 'bindings' }" @click="activeTab = 'bindings'">
          {{ shellI18nStore.t("desktopShell.emulatorConfig.tabs.bindings", "Bindings") }}
        </button>
        <button type="button" class="segmented-control-button" :class="{ 'is-active': activeTab === 'config' }" @click="activeTab = 'config'">
          {{ shellI18nStore.t("desktopShell.emulatorConfig.tabs.configFile", "Config File") }}
        </button>
        <button type="button" class="segmented-control-button" :class="{ 'is-active': activeTab === 'gamepad' }" @click="activeTab = 'gamepad'">
          {{ shellI18nStore.t("desktopShell.emulatorConfig.tabs.gamepad", "Gamepad") }}
        </button>
        <button type="button" class="segmented-control-button" :class="{ 'is-active': activeTab === 'runtime' }" @click="activeTab = 'runtime'">
          {{ shellI18nStore.t("desktopShell.emulatorConfig.tabs.runtime", "Runtime") }}
        </button>
      </div>

      <div v-show="activeTab === 'general'" class="desktop-modal-editor-section">
        <div class="form-grid">
          <label class="field">
            <span>{{ shellI18nStore.t("desktopShell.emulatorConfig.general.website", "Website") }}</span>
            <input v-model="configDraft.website" :placeholder="shellI18nStore.t('desktopShell.emulatorConfig.general.websitePlaceholder', 'https://emulator.example.com')" />
          </label>
          <label class="field">
            <span>{{ shellI18nStore.t("desktopShell.emulatorConfig.general.searchString", "Search String") }}</span>
            <input v-model="configDraft.searchString" :placeholder="shellI18nStore.t('desktopShell.emulatorConfig.general.searchStringPlaceholder', 'RetroArch nightly windows')" />
          </label>
          <label class="field">
            <span>{{ shellI18nStore.t("desktopShell.emulatorConfig.general.startParameters", "Start Parameters") }}</span>
            <input v-model="configDraft.startParameters" :placeholder="shellI18nStore.t('desktopShell.emulatorConfig.general.startParametersPlaceholder', '--fullscreen')" />
          </label>
          <label class="field">
            <span>{{ shellI18nStore.t("desktopShell.emulatorConfig.general.launchArguments", "Launch Arguments") }}</span>
            <input v-model="configDraft.launchArgs" :placeholder="shellI18nStore.t('desktopShell.emulatorConfig.general.launchArgumentsPlaceholder', '--append-config portable.cfg')" />
          </label>
          <label class="field">
            <span>{{ shellI18nStore.t("desktopShell.emulatorConfig.general.workingDirectory", "Working Directory") }}</span>
            <input v-model="configDraft.workingDirectory" :placeholder="shellI18nStore.t('desktopShell.emulatorConfig.general.workingDirectoryPlaceholder', 'C:\\\\Emulators\\\\RetroArch')" />
          </label>
          <label class="field">
            <span>{{ shellI18nStore.t("desktopShell.emulatorConfig.general.configFilePath", "Config File Path") }}</span>
            <input v-model="configDraft.configFilePath" :placeholder="shellI18nStore.t('desktopShell.emulatorConfig.general.configFilePathPlaceholder', 'config\\\\retroarch.cfg')" />
          </label>
          <label class="field field-wide">
            <span>{{ shellI18nStore.t("desktopShell.emulatorConfig.general.runCommandsBefore", "Run Commands Before") }}</span>
            <textarea
              v-model="configDraft.runCommandsBefore"
              class="desktop-modal-textarea desktop-modal-textarea-compact"
              rows="4"
              :placeholder="shellI18nStore.t('desktopShell.emulatorConfig.general.runCommandsBeforePlaceholder', 'taskkill /IM some-helper.exe /F')"
            />
          </label>
          <label class="field field-wide">
            <span>{{ shellI18nStore.t("desktopShell.emulatorConfig.general.notes", "Notes") }}</span>
            <textarea
              v-model="configDraft.notes"
              class="desktop-modal-textarea desktop-modal-textarea-compact"
              rows="4"
              :placeholder="shellI18nStore.t('desktopShell.emulatorConfig.general.notesPlaceholder', 'Keep local notes about this emulator setup.')"
            />
          </label>
        </div>
      </div>

      <div v-show="activeTab === 'bindings'" class="desktop-modal-editor-section">
        <div class="pill-row">
          <span class="pill">{{ shellI18nStore.tf("desktopShell.emulatorConfig.bindings.format", { value: bindingFormat || shellI18nStore.t("desktopShell.emulatorConfig.bindings.unknown", "unknown") }, `Format: ${bindingFormat || shellI18nStore.t("desktopShell.emulatorConfig.bindings.unknown", "unknown")}`) }}</span>
          <span class="pill">{{ shellI18nStore.tf("desktopShell.emulatorConfig.bindings.entries", { count: bindingSummary.total }, `Entries: ${bindingSummary.total}`) }}</span>
          <span class="pill">{{ shellI18nStore.tf("desktopShell.emulatorConfig.bindings.controls", { count: bindingSummary.controlCount }, `Controls: ${bindingSummary.controlCount}`) }}</span>
        </div>

        <p class="meta-line" v-if="!configDraft.configFilePath">
          {{ shellI18nStore.t("desktopShell.emulatorConfig.bindings.missingConfigPath", "Set a config file path first to enable bindings editing.") }}
        </p>
        <p class="meta-line" v-else-if="!configFileLoaded">
          {{ shellI18nStore.t("desktopShell.emulatorConfig.bindings.loadFirst", "Load the config file first so the shell can detect editable bindings.") }}
        </p>
        <p class="meta-line" v-else-if="bindingMessage">
          {{ bindingMessage }}
        </p>
        <p class="meta-line" v-else-if="!bindingEntries.length">
          {{ shellI18nStore.t("desktopShell.emulatorConfig.bindings.noneDetected", "No binding-like entries were detected in this config file.") }}
        </p>
        <p class="meta-line" v-else>
          {{
            bindingSummary.looksGamepadCodes
              ? shellI18nStore.t("desktopShell.emulatorConfig.bindings.looksGamepad", "Current binding values look like gamepad codes.")
              : bindingSummary.looksKeyboardCodes
                ? shellI18nStore.t("desktopShell.emulatorConfig.bindings.looksKeyboard", "Current binding values look like keyboard key codes.")
                : shellI18nStore.t("desktopShell.emulatorConfig.bindings.editable", "Bindings are editable directly in the shell.")
          }}
        </p>

        <div class="button-row" v-if="bindingEditable && bindingEntries.length">
          <button type="button" class="action-button" @click="applyControlPreset(CONTROL_PRESET_KEYBOARD)">{{ shellI18nStore.t("desktopShell.emulatorConfig.bindings.applyKeyboardPreset", "Apply Keyboard Preset") }}</button>
          <button type="button" class="action-button" @click="applyControlPreset(CONTROL_PRESET_GAMEPAD)">{{ shellI18nStore.t("desktopShell.emulatorConfig.bindings.applyGamepadPreset", "Apply Gamepad Preset") }}</button>
          <button type="button" class="action-button" :disabled="!configFileLoaded" @click="loadBindingEntriesFromText(configFileText)">{{ shellI18nStore.t("desktopShell.emulatorConfig.bindings.refreshFromText", "Refresh From Current Text") }}</button>
        </div>

        <div v-if="bindingEditable && bindingEntries.length" class="desktop-emulator-binding-list">
          <label v-for="entry in bindingEntries" :key="entry.id" class="desktop-emulator-binding-row">
            <span class="desktop-emulator-binding-key">{{ entry.displayKey }}</span>
            <input
              class="desktop-emulator-binding-input"
              :value="entry.value"
              @input="updateBindingEntry(entry.id, $event.target.value)"
            />
          </label>
        </div>
      </div>

      <div v-show="activeTab === 'config'" class="desktop-modal-editor-section">
        <div class="pill-row">
          <span class="pill">{{ shellI18nStore.tf("desktopShell.emulatorConfig.config.launchPath", { value: effectiveExecutablePath || shellI18nStore.t("desktopShell.emulatorConfig.config.notSelected", "Not selected") }, `Launch Path: ${effectiveExecutablePath || shellI18nStore.t("desktopShell.emulatorConfig.config.notSelected", "Not selected")}`) }}</span>
          <span class="pill">{{ shellI18nStore.tf("desktopShell.emulatorConfig.config.configPath", { value: configDraft.configFilePath || shellI18nStore.t("desktopShell.emulatorConfig.config.notSet", "Not set") }, `Config Path: ${configDraft.configFilePath || shellI18nStore.t("desktopShell.emulatorConfig.config.notSet", "Not set")}`) }}</span>
          <span class="pill">{{ shellI18nStore.tf("desktopShell.emulatorConfig.config.resolved", { value: configFileResolvedPath || shellI18nStore.t("desktopShell.emulatorConfig.config.notLoaded", "Not loaded") }, `Resolved: ${configFileResolvedPath || shellI18nStore.t("desktopShell.emulatorConfig.config.notLoaded", "Not loaded")}`) }}</span>
        </div>

        <div class="button-row">
          <button type="button" class="action-button" :disabled="configBusy === 'load-config-file' || !canAccessConfigFile" @click="loadConfigFileContents">
            {{
              configBusy === "load-config-file"
                ? shellI18nStore.t("desktopShell.emulatorConfig.config.loadingShort", "Loading...")
                : shellI18nStore.t("desktopShell.emulatorConfig.config.loadButton", "Load Config File")
            }}
          </button>
          <button
            type="button"
            class="action-button"
            :disabled="configBusy === 'save-config-file' || !canAccessConfigFile || (!configFileLoaded && !configFileText.trim())"
            @click="saveConfigFileContents"
          >
            {{
              configBusy === "save-config-file"
                ? shellI18nStore.t("desktopShell.emulatorConfig.config.savingShort", "Saving...")
                : shellI18nStore.t("desktopShell.emulatorConfig.config.saveButton", "Save Config File")
            }}
          </button>
          <button type="button" class="action-button" :disabled="!configFileResolvedPath && !configDraft.configFilePath" @click="showConfigFileInFolder">
            {{ shellI18nStore.t("desktopShell.emulatorConfig.config.showButton", "Show Config File") }}
          </button>
        </div>

        <textarea
          v-model="configFileText"
          class="desktop-modal-textarea desktop-modal-textarea-code"
          rows="10"
          :disabled="!canAccessConfigFile"
          :placeholder="shellI18nStore.t('desktopShell.emulatorConfig.config.editorPlaceholder', 'Load the config file to edit it here.')"
        />

        <p class="meta-line">
          {{
            !canAccessConfigFile
              ? shellI18nStore.t("desktopShell.emulatorConfig.errors.missingPaths", "Select an emulator path and config file path first.")
              : configFileLoaded
                ? configFileExists
                  ? shellI18nStore.t("desktopShell.emulatorConfig.config.loadedHelp", "Config file loaded into the shell editor. Saving also applies any binding edits from the Bindings tab.")
                  : shellI18nStore.t("desktopShell.emulatorConfig.config.missingButWritable", "The file does not exist yet, but you can still save new contents.")
                : shellI18nStore.t("desktopShell.emulatorConfig.config.loadBeforeEditing", "Load the current config file contents before editing.")
          }}
        </p>
      </div>

      <div v-show="activeTab === 'gamepad'" class="desktop-modal-editor-section">
        <p class="meta-line">
          {{
            shellI18nStore.tf(
              "desktopShell.emulatorConfig.gamepad.description",
              { platform: platformLabel },
              `Platform defaults come from ${platformLabel} gamepad profiles. Emulator overrides below win over those defaults.`
            )
          }}
        </p>

        <div class="desktop-emulator-gamepad-grid">
          <div class="desktop-emulator-gamepad-header">
            <span>{{ shellI18nStore.t("desktopShell.emulatorConfig.gamepad.action", "Action") }}</span>
            <span>{{ shellI18nStore.t("desktopShell.emulatorConfig.gamepad.keyboardOverride", "Keyboard Override") }}</span>
            <span>{{ shellI18nStore.t("desktopShell.emulatorConfig.gamepad.gamepadOverride", "Gamepad Override") }}</span>
          </div>
          <template v-for="action in GAMEPAD_BINDING_ACTIONS" :key="action">
            <div class="desktop-emulator-gamepad-row">
              <span class="desktop-emulator-gamepad-action">{{ GAMEPAD_BINDING_LABELS[action] || action }}</span>
              <label class="desktop-emulator-gamepad-cell">
                <input
                  class="desktop-emulator-gamepad-input"
                  type="text"
                  :value="configDraft.gamepadBindings?.keyboard?.[action] || ''"
                  :placeholder="getPlatformGamepadValue('keyboard', action) || shellI18nStore.t('desktopShell.emulatorConfig.gamepad.overrideOptional', 'Override (optional)')"
                  @input="setGamepadOverride('keyboard', action, $event.target.value)"
                />
                <span class="desktop-emulator-gamepad-platform">
                  {{ getEffectiveGamepadValue('keyboard', action) || shellI18nStore.t("desktopShell.emulatorConfig.gamepad.noEffectiveValue", "No effective value") }}
                </span>
              </label>
              <label class="desktop-emulator-gamepad-cell">
                <input
                  class="desktop-emulator-gamepad-input"
                  type="text"
                  :value="configDraft.gamepadBindings?.gamepad?.[action] || ''"
                  :placeholder="getPlatformGamepadValue('gamepad', action) || shellI18nStore.t('desktopShell.emulatorConfig.gamepad.overrideOptional', 'Override (optional)')"
                  @input="setGamepadOverride('gamepad', action, $event.target.value)"
                />
                <span class="desktop-emulator-gamepad-platform">
                  {{ getEffectiveGamepadValue('gamepad', action) || shellI18nStore.t("desktopShell.emulatorConfig.gamepad.noEffectiveValue", "No effective value") }}
                </span>
              </label>
            </div>
          </template>
        </div>

        <div class="button-row">
          <button type="button" class="action-button" @click="resetGamepadOverrides">
            {{ shellI18nStore.t("desktopShell.emulatorConfig.gamepad.clearOverrides", "Clear Emulator Gamepad Overrides") }}
          </button>
        </div>
      </div>

      <div v-show="activeTab === 'runtime'" class="desktop-modal-editor-section">
        <p class="meta-line">
          {{ shellI18nStore.t("desktopShell.emulatorConfig.runtime.description", "These rules decide which runtime save/state/config files are copied into periodic backups while this emulator is running.") }}
        </p>
        <div class="desktop-runtime-rule-grid">
          <label class="field">
            <span>{{ shellI18nStore.t("desktopShell.emulatorConfig.runtime.directories", "Runtime Backup Directories") }}</span>
            <textarea
              v-model="runtimeDirectoryNamesText"
              class="desktop-modal-textarea desktop-modal-textarea-compact"
              rows="5"
              :placeholder="shellI18nStore.t('desktopShell.emulatorConfig.runtime.directoriesPlaceholder', 'saves\\nstate\\nmemcards')"
            />
          </label>
          <label class="field">
            <span>{{ shellI18nStore.t("desktopShell.emulatorConfig.runtime.extensions", "Runtime Backup Extensions") }}</span>
            <textarea
              v-model="runtimeFileExtensionsText"
              class="desktop-modal-textarea desktop-modal-textarea-compact"
              rows="5"
              :placeholder="shellI18nStore.t('desktopShell.emulatorConfig.runtime.extensionsPlaceholder', '.sav\\n.state\\n.srm')"
            />
          </label>
          <label class="field">
            <span>{{ shellI18nStore.t("desktopShell.emulatorConfig.runtime.fileIncludes", "Runtime Backup Filename Includes") }}</span>
            <textarea
              v-model="runtimeFileNameIncludesText"
              class="desktop-modal-textarea desktop-modal-textarea-compact"
              rows="5"
              :placeholder="shellI18nStore.t('desktopShell.emulatorConfig.runtime.fileIncludesPlaceholder', 'save\\nstate\\nprofile')"
            />
          </label>
        </div>
      </div>

      <div class="button-row">
        <button type="button" class="action-button" :disabled="configBusy === 'save-overrides'" @click="saveConfigOverrides">
          {{
            configBusy === "save-overrides"
              ? shellI18nStore.t("desktopShell.emulatorConfig.overrides.saving", "Saving...")
              : shellI18nStore.t("desktopShell.emulatorConfig.overrides.saveButton", "Save Overrides")
          }}
        </button>
        <button type="button" class="action-button" :disabled="configBusy === 'save-overrides' || !hasConfigOverrideChanges" @click="resetConfigOverrides">
          {{ shellI18nStore.t("desktopShell.emulatorConfig.overrides.resetButton", "Reset Overrides") }}
        </button>
      </div>
    </article>

    <p
      v-if="configStatus"
      class="meta-line"
      :class="{
        'meta-line-error': configStatusTone === 'error',
        'meta-line-success': configStatusTone === 'success'
      }"
    >
      {{ configStatus }}
    </p>
  </div>
</template>
