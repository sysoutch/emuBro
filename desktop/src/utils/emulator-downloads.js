export function normalizeEmulatorDownloadLinks(raw) {
  const links = raw && typeof raw === "object" ? raw : {};
  const normalizeUrl = (value) => {
    const text = String(value || "").trim();
    if (!text) return "";
    return /^https?:\/\//i.test(text) ? text : `https://${text}`;
  };

  return {
    windows: normalizeUrl(links.windows || links.win || links.win32 || ""),
    linux: normalizeUrl(links.linux || ""),
    mac: normalizeUrl(links.mac || links.macos || links.darwin || "")
  };
}

export function hasAnyEmulatorDownloadLink(emulator) {
  const links = normalizeEmulatorDownloadLinks(emulator?.downloadLinks);
  const website = String(emulator?.website || "").trim();
  const downloadUrl = String(emulator?.downloadUrl || "").trim();
  return !!(links.windows || links.linux || links.mac || website || downloadUrl);
}

export function normalizeEmulatorDownloadPackageType(packageType) {
  const value = String(packageType || "").trim().toLowerCase();
  if (value === "setup" || value === "install") return "installer";
  if (value === "exe" || value === "binary" || value === "portable") return "executable";
  if (value === "installer" || value === "archive" || value === "executable") return value;
  return "";
}

export function getEmulatorDownloadPackageTypeLabel(packageType) {
  const normalized = normalizeEmulatorDownloadPackageType(packageType);
  if (normalized === "installer") return "Installer";
  if (normalized === "archive") return "Archive";
  if (normalized === "executable") return "Executable";
  return "Package";
}

export function normalizeEmulatorDownloadOsKey(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "windows" || normalized === "win" || normalized === "win32") return "windows";
  if (normalized === "linux") return "linux";
  if (normalized === "mac" || normalized === "macos" || normalized === "darwin" || normalized === "osx") return "mac";
  return "windows";
}

export function getEmulatorLinuxInstallOptions(emulator) {
  const installers = emulator?.installers && typeof emulator.installers === "object" ? emulator.installers : null;
  const linux = installers?.linux && typeof installers.linux === "object" ? installers.linux : null;
  const options = [];
  if (linux?.flatpak) options.push({ id: "flatpak", label: "Flatpak" });
  if (linux?.apt) options.push({ id: "apt", label: "APT / DEB" });
  return options;
}
