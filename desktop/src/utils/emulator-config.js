import { buildEffectiveGamepadBindings, getPlatformGamepadBindings, normalizeInputBindingProfile } from "./gamepad-bindings";
import { getShellStorageAdapter } from "./shell-storage-cache";

const EMULATOR_CONFIG_STORAGE_KEY = "emuBro.emulatorConfigs.v1";

function getStorage(storageRef) {
  return getShellStorageAdapter(storageRef);
}

function readStorageMap(storageRef, key) {
  if (!storageRef) {
    return {};
  }

  try {
    const raw = storageRef.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function writeStorageMap(storageRef, key, value) {
  if (!storageRef) {
    return;
  }

  try {
    storageRef.setItem(key, JSON.stringify(value || {}));
  } catch (_error) {}
}

function dirFromPath(filePath) {
  const value = String(filePath || "").trim();
  if (!value) return "";
  const index = Math.max(value.lastIndexOf("/"), value.lastIndexOf("\\"));
  return index > 0 ? value.slice(0, index) : "";
}

function normalizeTagId(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!normalized || normalized === "all") return "";
  return normalized;
}

function normalizeEmulatorTagList(values = []) {
  const source = Array.isArray(values)
    ? values
    : String(values || "").split(/[\r\n,;]+/g);
  const out = [];
  const seen = new Set();
  source.forEach((entry) => {
    const normalized = normalizeTagId(entry);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    out.push(normalized);
  });
  return out;
}

export function getEmulatorConfigStorageKey(emulator) {
  const filePath = String(emulator?.filePath || "").trim();
  if (filePath) {
    return filePath.toLowerCase();
  }
  return String(emulator?.id || emulator?.name || "emu")
    .trim()
    .toLowerCase();
}

export function normalizeEmulatorRuntimeRuleList(values = []) {
  const seen = new Set();
  return (Array.isArray(values) ? values : [])
    .map((entry) => String(entry || "").trim().toLowerCase())
    .filter(Boolean)
    .filter((entry) => {
      if (seen.has(entry)) return false;
      seen.add(entry);
      return true;
    });
}

export function normalizeEmulatorRuntimeExtensionList(values = []) {
  const seen = new Set();
  return (Array.isArray(values) ? values : [])
    .map((entry) => {
      let value = String(entry || "").trim().toLowerCase();
      if (!value) return "";
      if (!value.startsWith(".")) value = `.${value}`;
      return value.replace(/\s+/g, "");
    })
    .filter(Boolean)
    .filter((entry) => {
      if (seen.has(entry)) return false;
      seen.add(entry);
      return true;
    });
}

export function parseEmulatorRuntimeRuleText(rawText) {
  return String(rawText || "")
    .split(/[\r\n,;]+/g)
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
}

export function normalizeEmulatorRuntimeDataRules(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  return {
    directoryNames: normalizeEmulatorRuntimeRuleList(source.directoryNames),
    fileExtensions: normalizeEmulatorRuntimeExtensionList(source.fileExtensions),
    fileNameIncludes: normalizeEmulatorRuntimeRuleList(source.fileNameIncludes)
  };
}

export function createDefaultEmulatorConfig(emulator) {
  return {
    description: String(emulator?.description || "").trim(),
    tags: normalizeEmulatorTagList(emulator?.tags || []),
    website: String(emulator?.website || "").trim(),
    startParameters: String(emulator?.startParameters || emulator?.args || "").trim(),
    launchArgs: "",
    workingDirectory: String(emulator?.workingDirectory || dirFromPath(emulator?.filePath)).trim(),
    configFilePath: String(emulator?.configFilePath || "").trim(),
    searchString: String(emulator?.searchString || "").trim(),
    runCommandsBefore: Array.isArray(emulator?.runCommandsBefore)
      ? emulator.runCommandsBefore.map((command) => String(command || "").trim()).filter(Boolean).join("\n")
      : String(emulator?.runCommandsBefore || "").trim(),
    notes: "",
    gamepadBindings: normalizeInputBindingProfile(emulator?.gamepadBindings || {}),
    runtimeDataRules: normalizeEmulatorRuntimeDataRules({})
  };
}

export function normalizeEmulatorStoredConfig(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  return {
    description: String(source.description || "").trim(),
    tags: normalizeEmulatorTagList(source.tags || []),
    website: String(source.website || "").trim(),
    startParameters: String(source.startParameters || "").trim(),
    launchArgs: String(source.launchArgs || "").trim(),
    workingDirectory: String(source.workingDirectory || "").trim(),
    configFilePath: String(source.configFilePath || "").trim(),
    searchString: String(source.searchString || "").trim(),
    runCommandsBefore: String(source.runCommandsBefore || "").trim(),
    notes: String(source.notes || ""),
    gamepadBindings: normalizeInputBindingProfile(source.gamepadBindings || {}),
    runtimeDataRules: normalizeEmulatorRuntimeDataRules(source.runtimeDataRules || {})
  };
}

export function normalizeEmulatorConfigDraft(input = {}) {
  return normalizeEmulatorStoredConfig(input);
}

export function loadEmulatorConfigMap(storageRef) {
  return readStorageMap(getStorage(storageRef), EMULATOR_CONFIG_STORAGE_KEY);
}

export function saveEmulatorConfigMap(nextMap, storageRef) {
  writeStorageMap(getStorage(storageRef), EMULATOR_CONFIG_STORAGE_KEY, nextMap || {});
}

export function getStoredEmulatorConfig(emulator, storageRef) {
  const key = getEmulatorConfigStorageKey(emulator);
  return normalizeEmulatorStoredConfig(loadEmulatorConfigMap(storageRef)[key] || {});
}

export function saveStoredEmulatorConfig(emulator, config, storageRef) {
  const key = getEmulatorConfigStorageKey(emulator);
  if (!key) return;
  const map = loadEmulatorConfigMap(storageRef);
  map[key] = normalizeEmulatorStoredConfig(config);
  saveEmulatorConfigMap(map, storageRef);
}

export function clearStoredEmulatorConfig(emulator, storageRef) {
  const key = getEmulatorConfigStorageKey(emulator);
  if (!key) return;
  const map = loadEmulatorConfigMap(storageRef);
  delete map[key];
  saveEmulatorConfigMap(map, storageRef);
}

export function mergeEmulatorConfig(emulator, storageRef) {
  const defaults = createDefaultEmulatorConfig(emulator);
  const stored = getStoredEmulatorConfig(emulator, storageRef);
  const merged = {
    ...defaults,
    ...stored,
    runtimeDataRules: normalizeEmulatorRuntimeDataRules(stored.runtimeDataRules || defaults.runtimeDataRules)
  };

  ["startParameters", "searchString", "configFilePath", "runCommandsBefore"].forEach((key) => {
    if (!String(merged[key] || "").trim() && String(defaults[key] || "").trim()) {
      merged[key] = defaults[key];
    }
  });

  return normalizeEmulatorStoredConfig(merged);
}

export function resolveEffectiveEmulatorConfig(emulator, storageRef) {
  const merged = mergeEmulatorConfig(emulator, storageRef);
  const platformGamepadBindings = getPlatformGamepadBindings(emulator?.platformShortName, getStorage(storageRef));
  const effectiveGamepadBindings = buildEffectiveGamepadBindings(platformGamepadBindings, merged.gamepadBindings);
  return {
    ...merged,
    platformGamepadBindings,
    effectiveGamepadBindings,
    effectiveInputBindings: effectiveGamepadBindings
  };
}

export async function readEmulatorConfigFile(bridge, emulatorPath, configFilePath) {
  if (!bridge || typeof bridge.invoke !== "function") {
    return { success: false, exists: false, message: "Desktop bridge unavailable.", resolvedPath: "", text: "" };
  }

  try {
    const response = await bridge.invoke("emulator:read-config-file", { emulatorPath, configFilePath });
    return response && typeof response === "object"
      ? response
      : { success: false, exists: false, message: "Invalid response.", resolvedPath: "", text: "" };
  } catch (error) {
    return {
      success: false,
      exists: false,
      message: error instanceof Error ? error.message : String(error || "Unknown error"),
      resolvedPath: "",
      text: ""
    };
  }
}

export async function writeEmulatorConfigFile(bridge, emulatorPath, configFilePath, contents) {
  if (!bridge || typeof bridge.invoke !== "function") {
    return { success: false, message: "Desktop bridge unavailable.", resolvedPath: "" };
  }

  try {
    const response = await bridge.invoke("emulator:write-config-file", { emulatorPath, configFilePath, contents });
    return response && typeof response === "object"
      ? response
      : { success: false, message: "Invalid response.", resolvedPath: "" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error || "Unknown error"),
      resolvedPath: ""
    };
  }
}

export { EMULATOR_CONFIG_STORAGE_KEY };
