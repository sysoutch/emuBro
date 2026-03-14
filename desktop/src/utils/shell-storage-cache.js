import { deleteNativeShellState, readNativeShellState, writeNativeShellState } from "./shell-state.js";

const SHELL_STORAGE_STATE_PREFIX = "storage:";
const PRELOADED_STORAGE_KEYS = Object.freeze([
  "emuBro.coverDownloader.sources.v1",
  "emuBro.downloadedEmulatorPackages.v1",
  "emuBro.emulatorConfigs.v1",
  "emuBro.emulatorPreferredLaunchPath.v1",
  "emuBro.linuxInstallMethod",
  "emuBro.linuxInstallMethodRemember",
  "emuBro.platformGamepadBindings.v1",
  "emuBro.suggestionsSettings.v1"
]);

const cachedValues = new Map();
const hydratedKeys = new Set();
let hydrationPromise = null;

function normalizeStorageKey(key) {
  return String(key || "").trim();
}

function getBrowserStorage() {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  return window.localStorage;
}

function toNativeShellStateKey(storageKey) {
  return `${SHELL_STORAGE_STATE_PREFIX}${storageKey}`;
}

function normalizeStoredValue(value) {
  if (value === undefined || value === null) {
    return null;
  }
  return typeof value === "string" ? value : JSON.stringify(value);
}

function readBrowserValue(storageKey) {
  const storage = getBrowserStorage();
  if (!storage) {
    return null;
  }

  try {
    return normalizeStoredValue(storage.getItem(storageKey));
  } catch (_error) {
    return null;
  }
}

function writeBrowserValue(storageKey, value) {
  const storage = getBrowserStorage();
  if (!storage) {
    return;
  }

  try {
    if (value === null) {
      storage.removeItem(storageKey);
    } else {
      storage.setItem(storageKey, value);
    }
  } catch (_error) {}
}

async function hydrateStorageKey(storageKey) {
  const normalizedKey = normalizeStorageKey(storageKey);
  if (!normalizedKey) {
    return null;
  }

  const browserValue = readBrowserValue(normalizedKey);
  const nativeValue = normalizeStoredValue(
    await readNativeShellState(toNativeShellStateKey(normalizedKey), browserValue)
  );

  cachedValues.set(normalizedKey, nativeValue);
  hydratedKeys.add(normalizedKey);

  if (nativeValue === null) {
    writeBrowserValue(normalizedKey, null);
  } else if (nativeValue !== browserValue) {
    writeBrowserValue(normalizedKey, nativeValue);
  }

  return nativeValue;
}

function uniqueStorageKeys(keys = []) {
  return Array.from(
    new Set(
      (Array.isArray(keys) ? keys : [keys])
        .map((key) => normalizeStorageKey(key))
        .filter(Boolean)
    )
  );
}

export async function initializeShellStorageCache(keys = PRELOADED_STORAGE_KEYS) {
  const nextKeys = uniqueStorageKeys(keys);
  if (!nextKeys.length) {
    return;
  }

  const missingKeys = nextKeys.filter((key) => !hydratedKeys.has(key));
  if (!missingKeys.length) {
    return;
  }

  if (!hydrationPromise) {
    hydrationPromise = Promise.all(missingKeys.map((key) => hydrateStorageKey(key)));
  }

  try {
    await hydrationPromise;
  } finally {
    hydrationPromise = null;
  }
}

function getCachedValue(storageKey) {
  const normalizedKey = normalizeStorageKey(storageKey);
  if (!normalizedKey) {
    return null;
  }

  if (cachedValues.has(normalizedKey)) {
    return cachedValues.get(normalizedKey);
  }

  const browserValue = readBrowserValue(normalizedKey);
  cachedValues.set(normalizedKey, browserValue);
  return browserValue;
}

export function getShellStorageValue(storageKey, fallback = null) {
  const value = getCachedValue(storageKey);
  return value === null ? fallback : value;
}

export function setShellStorageValue(storageKey, value) {
  const normalizedKey = normalizeStorageKey(storageKey);
  if (!normalizedKey) {
    return null;
  }

  const normalizedValue = normalizeStoredValue(value);
  cachedValues.set(normalizedKey, normalizedValue);
  hydratedKeys.add(normalizedKey);
  writeBrowserValue(normalizedKey, normalizedValue);

  if (normalizedValue === null) {
    void deleteNativeShellState(toNativeShellStateKey(normalizedKey));
  } else {
    void writeNativeShellState(toNativeShellStateKey(normalizedKey), normalizedValue);
  }

  return normalizedValue;
}

export function removeShellStorageValue(storageKey) {
  const normalizedKey = normalizeStorageKey(storageKey);
  if (!normalizedKey) {
    return;
  }

  cachedValues.set(normalizedKey, null);
  hydratedKeys.add(normalizedKey);
  writeBrowserValue(normalizedKey, null);
  void deleteNativeShellState(toNativeShellStateKey(normalizedKey));
}

export function getShellStorageAdapter(storageRef = null) {
  if (storageRef && typeof storageRef.getItem === "function") {
    return storageRef;
  }

  return {
    getItem(key) {
      return getShellStorageValue(key, null);
    },
    setItem(key, value) {
      setShellStorageValue(key, value);
    },
    removeItem(key) {
      removeShellStorageValue(key);
    }
  };
}

export { PRELOADED_STORAGE_KEYS };
