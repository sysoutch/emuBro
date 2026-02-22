const { fileURLToPath } = require("url");

function createResourceOverrides(deps = {}) {
  const app = deps.app;
  const fsSync = deps.fsSync;
  const path = deps.path;
  const log = deps.log || console;

  if (!app || !fsSync || !path) {
    throw new Error("createResourceOverrides requires app/fsSync/path");
  }

  const normalizedSegment = `${path.sep}emubro-resources${path.sep}`;
  let protocolHookInstalled = false;

  function getBundledResourcesDir() {
    return path.join(app.getAppPath(), "emubro-resources");
  }

  function getUserResourcesDir() {
    const dir = path.join(app.getPath("userData"), "emubro-resources");
    try {
      fsSync.mkdirSync(dir, { recursive: true });
    } catch (_error) {}
    return dir;
  }

  function fileExists(targetPath) {
    try {
      return fsSync.existsSync(targetPath);
    } catch (_error) {
      return false;
    }
  }

  function getResourceRoots() {
    const roots = [];
    const userDir = getUserResourcesDir();
    const bundledDir = getBundledResourcesDir();
    if (fileExists(userDir)) roots.push(userDir);
    if (fileExists(bundledDir)) roots.push(bundledDir);
    if (!roots.length) roots.push(bundledDir);
    return roots;
  }

  function normalizeRelativePath(input) {
    const raw = String(input || "").replace(/\\/g, "/").trim();
    if (!raw) return "";
    const cleaned = raw.replace(/^\/+/, "").replace(/^\.\/+/, "");
    if (!cleaned || cleaned.includes("../") || cleaned.startsWith("..")) return "";
    return cleaned;
  }

  function resolveResourcePath(relativePath, options = {}) {
    const rel = normalizeRelativePath(relativePath);
    if (!rel) return "";

    const mustExist = options.mustExist !== false;
    const candidates = getResourceRoots().map((root) => path.join(root, rel));

    if (mustExist) {
      for (const candidate of candidates) {
        if (fileExists(candidate)) return candidate;
      }
      return "";
    }

    const userTarget = path.join(getUserResourcesDir(), rel);
    return userTarget || candidates[0] || "";
  }

  function installFileProtocolOverride(defaultSession) {
    if (!defaultSession || !defaultSession.protocol || protocolHookInstalled) return;
    protocolHookInstalled = true;

    try {
      defaultSession.protocol.interceptFileProtocol("file", (request, callback) => {
        try {
          const requestPath = fileURLToPath(request.url);
          const normalized = path.normalize(requestPath);
          const idx = normalized.toLowerCase().indexOf(normalizedSegment.toLowerCase());
          if (idx < 0) {
            callback({ path: normalized });
            return;
          }

          const rel = normalized.slice(idx + normalizedSegment.length).replace(/\\/g, "/");
          const overridePath = resolveResourcePath(rel, { mustExist: true });
          if (overridePath) {
            callback({ path: overridePath });
            return;
          }

          callback({ path: normalized });
        } catch (_error) {
          try {
            callback({ path: fileURLToPath(request.url) });
          } catch (_errorInner) {
            callback({ path: String(request?.url || "").replace(/^file:\/\//i, "") });
          }
        }
      });
    } catch (error) {
      protocolHookInstalled = false;
      log.warn("Failed to install emubro-resources file override hook:", error?.message || error);
    }
  }

  return {
    getBundledResourcesDir,
    getUserResourcesDir,
    getResourceRoots,
    resolveResourcePath,
    installFileProtocolOverride
  };
}

module.exports = {
  createResourceOverrides
};
