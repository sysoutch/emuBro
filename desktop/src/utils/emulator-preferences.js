import { getShellStorageAdapter } from "./shell-storage-cache";

const EMULATOR_SELECTED_PATHS_STORAGE_KEY = "emuBro.emulatorPreferredLaunchPath.v1";
const DOWNLOADED_EMULATOR_PACKAGES_STORAGE_KEY = "emuBro.downloadedEmulatorPackages.v1";
const LINUX_INSTALL_METHOD_KEY = "emuBro.linuxInstallMethod";
const LINUX_INSTALL_REMEMBER_KEY = "emuBro.linuxInstallMethodRemember";

function getStorage() {
  return getShellStorageAdapter();
}

function getStorageMap(key) {
  const storage = getStorage();
  if (!storage) {
    return {};
  }

  try {
    const raw = storage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function setStorageMap(key, nextMap) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(key, JSON.stringify(nextMap || {}));
  } catch (_error) {}
}

export function getEmulatorSelectionStorageKey(emulator) {
  const platformKey = String(emulator?.platformShortName || emulator?.platform || "")
    .trim()
    .toLowerCase();
  const nameKey = String(emulator?.name || "")
    .trim()
    .toLowerCase()
    .replace(/[\s._-]+/g, "")
    .replace(/[^a-z0-9]/g, "");
  if (platformKey && nameKey) {
    return `${platformKey}::${nameKey}`;
  }
  return String(emulator?.key || emulator?.id || "emulator").trim().toLowerCase() || "emulator";
}

export function loadSelectedLaunchPath(emulator, filePaths = []) {
  const paths = Array.isArray(filePaths) ? filePaths : [];
  if (!paths.length) return "";

  const storageKey = getEmulatorSelectionStorageKey(emulator);
  const stored = String(getStorageMap(EMULATOR_SELECTED_PATHS_STORAGE_KEY)[storageKey] || "").trim();
  if (stored) {
    const match = paths.find((path) => String(path || "").trim().toLowerCase() === stored.toLowerCase());
    if (match) return match;
  }

  const currentPath = String(emulator?.filePath || "").trim();
  if (currentPath) {
    const match = paths.find((path) => String(path || "").trim().toLowerCase() === currentPath.toLowerCase());
    if (match) return match;
  }

  return paths[0] || "";
}

export function saveSelectedLaunchPath(emulator, value) {
  const storageKey = getEmulatorSelectionStorageKey(emulator);
  if (!storageKey) return;
  const map = getStorageMap(EMULATOR_SELECTED_PATHS_STORAGE_KEY);
  const normalized = String(value || "").trim();
  if (normalized) {
    map[storageKey] = normalized;
  } else {
    delete map[storageKey];
  }
  setStorageMap(EMULATOR_SELECTED_PATHS_STORAGE_KEY, map);
}

export function loadDownloadedPackagePath(emulator) {
  const key = String(getEmulatorSelectionStorageKey(emulator) || "").trim().toLowerCase();
  if (!key) return "";
  return String(getStorageMap(DOWNLOADED_EMULATOR_PACKAGES_STORAGE_KEY)[key] || "").trim();
}

export function saveDownloadedPackagePath(emulator, packagePath) {
  const key = String(getEmulatorSelectionStorageKey(emulator) || "").trim().toLowerCase();
  if (!key) return;
  const map = getStorageMap(DOWNLOADED_EMULATOR_PACKAGES_STORAGE_KEY);
  const normalized = String(packagePath || "").trim();
  if (normalized) {
    map[key] = normalized;
  } else {
    delete map[key];
  }
  setStorageMap(DOWNLOADED_EMULATOR_PACKAGES_STORAGE_KEY, map);
}

export function loadLinuxInstallPreference() {
  const storage = getStorage();
  if (!storage) {
    return { remember: false, method: "download" };
  }

  try {
    const remember = storage.getItem(LINUX_INSTALL_REMEMBER_KEY) === "true";
    const method = String(storage.getItem(LINUX_INSTALL_METHOD_KEY) || "download").trim().toLowerCase();
    return {
      remember,
      method: method === "flatpak" || method === "apt" || method === "download" ? method : "download"
    };
  } catch (_error) {
    return { remember: false, method: "download" };
  }
}

export function saveLinuxInstallPreference(method, remember) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(LINUX_INSTALL_REMEMBER_KEY, remember ? "true" : "false");
    if (remember) {
      storage.setItem(LINUX_INSTALL_METHOD_KEY, String(method || "download"));
    }
  } catch (_error) {}
}

export {
  DOWNLOADED_EMULATOR_PACKAGES_STORAGE_KEY,
  EMULATOR_SELECTED_PATHS_STORAGE_KEY,
  LINUX_INSTALL_METHOD_KEY,
  LINUX_INSTALL_REMEMBER_KEY
};
