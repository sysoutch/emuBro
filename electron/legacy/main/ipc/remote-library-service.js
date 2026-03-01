const http = require("node:http");
const dgram = require("node:dgram");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { Readable } = require("node:stream");

function createRemoteLibraryService(deps = {}) {
  const {
    ipcMain,
    log = console,
    store,
    app,
    fsSync,
    getGamesState,
    getLibraryPathSettings
  } = deps;

  if (!ipcMain) throw new Error("createRemoteLibraryService requires ipcMain");
  if (!store) throw new Error("createRemoteLibraryService requires store");
  if (!app) throw new Error("createRemoteLibraryService requires app");
  if (!fsSync) throw new Error("createRemoteLibraryService requires fsSync");
  if (typeof getGamesState !== "function") throw new Error("createRemoteLibraryService requires getGamesState");
  if (typeof getLibraryPathSettings !== "function") throw new Error("createRemoteLibraryService requires getLibraryPathSettings");

  const DEFAULT_PORT = 42160;
  const DEFAULT_DISCOVERY_PORT = 42161;
  const DISCOVERY_MAGIC = "EMUBRO_DISCOVERY_V1";

  const HOST_CONFIG_KEY = "remote:host:config:v1";
  const HOST_PAIRED_KEY = "remote:host:paired:v1";
  const HOST_ID_KEY = "remote:host:id:v1";
  const CLIENT_HOSTS_KEY = "remote:client:hosts:v1";

  let httpServer = null;
  let httpPort = 0;
  let discoverySocket = null;
  let discoveryPort = 0;
  let pairingCode = "";
  let pairingExpiresAt = 0;

  function normalizePort(value, fallback) {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    const rounded = Math.round(num);
    if (rounded < 1 || rounded > 65535) return fallback;
    return rounded;
  }

  function normalizeText(value, fallback = "") {
    const text = String(value ?? "").trim();
    return text || fallback;
  }

  function normalizePathForCompare(inputPath) {
    const normalized = path.normalize(String(inputPath || "").trim());
    if (!normalized) return "";
    return process.platform === "win32" ? normalized.toLowerCase() : normalized;
  }

  function isPathInside(candidatePath, parentPath) {
    const candidate = normalizePathForCompare(candidatePath);
    const parent = normalizePathForCompare(parentPath);
    if (!candidate || !parent) return false;
    if (candidate === parent) return false;
    const parentWithSep = parent.endsWith(path.sep) ? parent : `${parent}${path.sep}`;
    return candidate.startsWith(parentWithSep);
  }

  function getHostId() {
    let id = normalizeText(store.get(HOST_ID_KEY, ""));
    if (!id) {
      id = crypto.randomBytes(12).toString("hex");
      store.set(HOST_ID_KEY, id);
    }
    return id;
  }

  function getHostName() {
    return normalizeText(os.hostname() || "emuBro-host");
  }

  function normalizeHostConfig(value = {}) {
    const source = (value && typeof value === "object") ? value : {};
    return {
      enabled: !!source.enabled,
      port: normalizePort(source.port, DEFAULT_PORT),
      discoveryPort: normalizePort(source.discoveryPort, DEFAULT_DISCOVERY_PORT),
      allowedRoots: Array.isArray(source.allowedRoots)
        ? source.allowedRoots.map((row) => normalizeText(row)).filter(Boolean)
        : []
    };
  }

  function getHostConfig() {
    try {
      return normalizeHostConfig(store.get(HOST_CONFIG_KEY, {}));
    } catch (_error) {
      return normalizeHostConfig({});
    }
  }

  function setHostConfig(value = {}) {
    const normalized = normalizeHostConfig(value);
    store.set(HOST_CONFIG_KEY, normalized);
    return normalized;
  }

  function getPairedClients() {
    try {
      const raw = store.get(HOST_PAIRED_KEY, []);
      return Array.isArray(raw) ? raw : [];
    } catch (_error) {
      return [];
    }
  }

  function setPairedClients(rows = []) {
    const list = Array.isArray(rows) ? rows : [];
    store.set(HOST_PAIRED_KEY, list);
    return list;
  }

  function getClientHosts() {
    try {
      const raw = store.get(CLIENT_HOSTS_KEY, []);
      return Array.isArray(raw) ? raw : [];
    } catch (_error) {
      return [];
    }
  }

  function setClientHosts(rows = []) {
    const list = Array.isArray(rows) ? rows : [];
    store.set(CLIENT_HOSTS_KEY, list);
    return list;
  }

  function generatePairingCode() {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    pairingCode = code;
    pairingExpiresAt = Date.now() + 1000 * 60 * 10;
    return { code, expiresAt: pairingExpiresAt };
  }

  function getPairingCode() {
    if (!pairingCode || Date.now() > pairingExpiresAt) {
      return generatePairingCode();
    }
    return { code: pairingCode, expiresAt: pairingExpiresAt };
  }

  function buildHostInfo() {
    const cfg = getHostConfig();
    return {
      hostId: getHostId(),
      name: getHostName(),
      port: cfg.port,
      discoveryPort: cfg.discoveryPort,
      version: normalizeText(app.getVersion?.() || ""),
      requiresPairing: true
    };
  }

  function isAuthorized(req) {
    const token = normalizeText(req?.headers?.["x-emubro-remote-token"]);
    if (!token) return false;
    const paired = getPairedClients();
    return paired.some((row) => normalizeText(row?.token) === token);
  }

  function allowedRootsWithLibrary() {
    const cfg = getHostConfig();
    const roots = new Set(cfg.allowedRoots.map((row) => normalizePathForCompare(row)));
    const settings = getLibraryPathSettings() || {};
    const gameRoots = Array.isArray(settings.gameFolders) ? settings.gameFolders : [];
    gameRoots.forEach((root) => {
      const norm = normalizePathForCompare(root);
      if (norm) roots.add(norm);
    });
    const scanRoots = Array.isArray(settings.scanFolders) ? settings.scanFolders : [];
    scanRoots.forEach((root) => {
      const norm = normalizePathForCompare(root);
      if (norm) roots.add(norm);
    });
    return Array.from(roots).filter(Boolean);
  }

  function isAllowedPath(targetPath) {
    const normalized = normalizePathForCompare(targetPath);
    if (!normalized) return false;

    // Allow if it matches any game currently in the library
    const games = Array.isArray(getGamesState()) ? getGamesState() : [];
    if (games.some((game) => normalizePathForCompare(game?.path || game?.filePath) === normalized)) {
      return true;
    }

    const roots = allowedRootsWithLibrary();
    if (roots.length === 0) return false;
    return roots.some((root) => {
      if (normalized === root) return true;
      return isPathInside(normalized, root);
    });
  }

  function sendJson(res, statusCode, payload) {
    try {
      res.writeHead(statusCode, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      });
      res.end(JSON.stringify(payload));
    } catch (_error) {
      try { res.end(); } catch (_e) {}
    }
  }

  function collectRequestBody(req) {
    return new Promise((resolve) => {
      let raw = "";
      req.on("data", (chunk) => { raw += chunk.toString(); });
      req.on("end", () => resolve(raw));
      req.on("error", () => resolve(""));
    });
  }

  async function handleHttpRequest(req, res) {
    const url = new URL(req.url || "/", "http://localhost");
    const pathname = url.pathname || "/";

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, X-EmuBro-Remote-Token",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
      });
      res.end();
      return;
    }

    if (pathname === "/api/remote/ping") {
      sendJson(res, 200, { success: true, host: buildHostInfo() });
      return;
    }

    if (pathname === "/api/remote/pair" && req.method === "POST") {
      const raw = await collectRequestBody(req);
      let payload = {};
      try { payload = JSON.parse(raw || "{}"); } catch (_e) { payload = {}; }
      const code = normalizeText(payload.code);
      const current = getPairingCode();
      if (!code || code !== current.code) {
        sendJson(res, 401, { success: false, message: "Invalid pairing code." });
        return;
      }
      const token = crypto.randomBytes(24).toString("hex");
      const clients = getPairedClients();
      clients.push({
        token,
        name: normalizeText(payload.clientName, "client"),
        createdAt: Date.now(),
        lastSeen: Date.now()
      });
      setPairedClients(clients);
      sendJson(res, 200, { success: true, token, host: buildHostInfo() });
      return;
    }

    if (!isAuthorized(req)) {
      sendJson(res, 401, { success: false, message: "Unauthorized." });
      return;
    }

    if (pathname === "/api/remote/library") {
      const rows = Array.isArray(getGamesState()) ? getGamesState() : [];
      const list = rows.map((game) => {
        const gamePath = normalizeText(game?.path || game?.filePath || "");
        let sizeBytes = 0;
        try {
          if (gamePath && fsSync.existsSync(gamePath)) {
            sizeBytes = fsSync.lstatSync(gamePath).size;
          }
        } catch (_e) { sizeBytes = 0; }
        return {
          id: Number(game?.id || 0),
          title: normalizeText(game?.title || game?.name || ""),
          platform: normalizeText(game?.platform || ""),
          platformShortName: normalizeText(game?.platformShortName || game?.platform_short || ""),
          path: gamePath,
          sizeBytes,
          lastPlayed: game?.last_played || game?.lastPlayed || null
        };
      }).filter((row) => row.title);
      sendJson(res, 200, { success: true, games: list });
      return;
    }

    if (pathname === "/api/remote/file") {
      const filePath = normalizeText(url.searchParams.get("path"));
      if (!filePath || !fsSync.existsSync(filePath)) {
        sendJson(res, 404, { success: false, message: "File not found." });
        return;
      }
      if (!isAllowedPath(filePath)) {
        sendJson(res, 403, { success: false, message: "File path not allowed." });
        return;
      }
      const stat = fsSync.lstatSync(filePath);
      if (stat.isDirectory()) {
        sendJson(res, 400, { success: false, message: "Directories are not supported." });
        return;
      }
      res.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Content-Length": stat.size,
        "Content-Disposition": `attachment; filename=\"${path.basename(filePath)}\"`
      });
      const stream = fsSync.createReadStream(filePath);
      stream.on("error", () => {
        try { res.end(); } catch (_e) {}
      });
      stream.pipe(res);
      return;
    }

    sendJson(res, 404, { success: false, message: "Not found." });
  }

  async function startHost() {
    const cfg = getHostConfig();
    if (!cfg.enabled) return { running: false, port: 0 };

    if (!httpServer) {
      httpServer = http.createServer((req, res) => {
        handleHttpRequest(req, res).catch((error) => {
          log.error("remote host request failed:", error);
          sendJson(res, 500, { success: false, message: "Server error." });
        });
      });
    }

    if (!httpServer.listening || httpPort !== cfg.port) {
      await new Promise((resolve, reject) => {
        httpServer.once("error", reject);
        httpServer.listen(cfg.port, "0.0.0.0", () => {
          httpServer.removeListener("error", reject);
          resolve();
        });
      });
      httpPort = cfg.port;
    }

    if (!discoverySocket || discoveryPort !== cfg.discoveryPort) {
      if (discoverySocket) {
        try { discoverySocket.close(); } catch (_e) {}
        discoverySocket = null;
      }
      discoverySocket = dgram.createSocket("udp4");
      discoverySocket.on("message", (msg, rinfo) => {
        const text = msg.toString();
        if (!text.startsWith(DISCOVERY_MAGIC)) return;
        const response = Buffer.from(JSON.stringify({
          magic: DISCOVERY_MAGIC,
          host: buildHostInfo()
        }));
        discoverySocket.send(response, rinfo.port, rinfo.address);
      });
      await new Promise((resolve) => {
        discoverySocket.bind(cfg.discoveryPort, "0.0.0.0", () => resolve());
      });
      discoveryPort = cfg.discoveryPort;
    }

    getPairingCode();
    return { running: true, port: httpPort, discoveryPort };
  }

  async function stopHost() {
    if (httpServer) {
      await new Promise((resolve) => httpServer.close(() => resolve()));
      httpServer = null;
      httpPort = 0;
    }
    if (discoverySocket) {
      try { discoverySocket.close(); } catch (_e) {}
      discoverySocket = null;
      discoveryPort = 0;
    }
    return { running: false, port: 0 };
  }

  async function refreshHostState() {
    const cfg = getHostConfig();
    if (!cfg.enabled) {
      await stopHost();
      return { running: false, port: 0 };
    }
    return await startHost();
  }

  async function scanHosts(timeoutMs = 500) {
    const cfg = getHostConfig();
    const port = normalizePort(cfg.discoveryPort, DEFAULT_DISCOVERY_PORT);
    const socket = dgram.createSocket("udp4");
    const hosts = new Map();
    await new Promise((resolve) => {
      socket.bind(0, () => {
        socket.setBroadcast(true);
        resolve();
      });
    });
    socket.on("message", (msg, rinfo) => {
      try {
        const payload = JSON.parse(msg.toString());
        if (payload?.magic !== DISCOVERY_MAGIC) return;
        const host = payload.host || {};
        const key = `${rinfo.address}:${host.port || ""}`;
        hosts.set(key, {
          address: rinfo.address,
          port: host.port,
          hostId: host.hostId,
          name: host.name,
          version: host.version
        });
      } catch (_e) {}
    });

    const message = Buffer.from(DISCOVERY_MAGIC);
    socket.send(message, port, "255.255.255.255");

    await new Promise((resolve) => setTimeout(resolve, timeoutMs));
    try { socket.close(); } catch (_e) {}
    return Array.from(hosts.values());
  }

  async function pairWithHost(hostUrl, code, clientName) {
    const baseUrl = normalizeText(hostUrl);
    if (!baseUrl) throw new Error("Missing host URL");
    const url = baseUrl.endsWith("/") ? `${baseUrl}api/remote/pair` : `${baseUrl}/api/remote/pair`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, clientName })
    });
    const json = await res.json();
    if (!json?.success) throw new Error(json?.message || "Pairing failed");
    return json;
  }

  async function listRemoteGames(hostUrl, token) {
    const baseUrl = normalizeText(hostUrl);
    const url = baseUrl.endsWith("/") ? `${baseUrl}api/remote/library` : `${baseUrl}/api/remote/library`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "X-EmuBro-Remote-Token": normalizeText(token)
      }
    });
    const json = await res.json();
    if (!json?.success) throw new Error(json?.message || "Failed to fetch library");
    return json.games || [];
  }

  async function downloadRemoteFile(hostUrl, token, remotePath, destinationPath) {
    const baseUrl = normalizeText(hostUrl);
    const url = baseUrl.endsWith("/") ? `${baseUrl}api/remote/file?path=${encodeURIComponent(remotePath)}` : `${baseUrl}/api/remote/file?path=${encodeURIComponent(remotePath)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "X-EmuBro-Remote-Token": normalizeText(token)
      }
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }
    const dir = path.dirname(destinationPath);
    fsSync.mkdirSync(dir, { recursive: true });
    const fileStream = fsSync.createWriteStream(destinationPath);
    await new Promise((resolve, reject) => {
      const body = res.body;
      if (!body) {
        reject(new Error("Missing response body"));
        return;
      }
      const stream = typeof body.pipe === "function" ? body : Readable.fromWeb(body);
      stream.pipe(fileStream);
      stream.on("error", reject);
      fileStream.on("finish", resolve);
      fileStream.on("error", reject);
    });
    return { success: true, path: destinationPath };
  }

  function registerIpc() {
    ipcMain.handle("remote:host:get-config", async () => {
      const cfg = getHostConfig();
      return { success: true, config: cfg };
    });

    ipcMain.handle("remote:host:set-config", async (_event, payload = {}) => {
      const cfg = setHostConfig(payload);
      const status = await refreshHostState();
      return { success: true, config: cfg, status };
    });

    ipcMain.handle("remote:host:get-status", async () => {
      const cfg = getHostConfig();
      const running = !!httpServer && httpServer.listening;
      return { success: true, status: { running, port: httpPort, discoveryPort, enabled: cfg.enabled } };
    });

    ipcMain.handle("remote:host:get-pairing", async () => {
      const code = getPairingCode();
      return { success: true, pairing: code };
    });

    ipcMain.handle("remote:host:rotate-pairing", async () => {
      const code = generatePairingCode();
      return { success: true, pairing: code };
    });

    ipcMain.handle("remote:client:scan", async () => {
      const hosts = await scanHosts();
      return { success: true, hosts };
    });

    ipcMain.handle("remote:client:get-hosts", async () => {
      return { success: true, hosts: getClientHosts() };
    });

    ipcMain.handle("remote:client:set-hosts", async (_event, payload = {}) => {
      const list = setClientHosts(payload.hosts || []);
      return { success: true, hosts: list };
    });

    ipcMain.handle("remote:client:pair", async (_event, payload = {}) => {
      const baseUrl = normalizeText(payload.hostUrl);
      const code = normalizeText(payload.code);
      const clientName = normalizeText(payload.clientName, getHostName());
      const result = await pairWithHost(baseUrl, code, clientName);
      return { success: true, result };
    });

    ipcMain.handle("remote:client:list-games", async (_event, payload = {}) => {
      const baseUrl = normalizeText(payload.hostUrl);
      const token = normalizeText(payload.token);
      const games = await listRemoteGames(baseUrl, token);
      return { success: true, games };
    });

    ipcMain.handle("remote:client:download-file", async (_event, payload = {}) => {
      const baseUrl = normalizeText(payload.hostUrl);
      const token = normalizeText(payload.token);
      const remotePath = normalizeText(payload.remotePath);
      const destinationPath = normalizeText(payload.destinationPath);
      if (!baseUrl || !token || !remotePath || !destinationPath) {
        return { success: false, message: "Missing download parameters." };
      }
      const result = await downloadRemoteFile(baseUrl, token, remotePath, destinationPath);
      return { success: true, result };
    });
  }

  registerIpc();

  refreshHostState().catch(() => {});

  return {
    refreshHostState,
    getHostConfig,
    setHostConfig,
    getPairingCode
  };
}

module.exports = {
  createRemoteLibraryService
};
