const http = require("node:http");
const os = require("node:os");

function createSuggestionsRelayService(deps = {}) {
  const log = deps.log || console;
  const fetchImpl = deps.fetchImpl || fetch;
  const providerClient = deps.providerClient;
  const store = deps.store || null;
  const app = deps.app || null;
  const normalizeProvider = typeof deps.normalizeProvider === "function"
    ? deps.normalizeProvider
    : ((provider) => String(provider || "").trim().toLowerCase() || "ollama");
  const normalizeText = typeof deps.normalizeText === "function"
    ? deps.normalizeText
    : ((value, fallback = "") => {
      const text = String(value ?? "").trim();
      return text || fallback;
    });

  const DEFAULT_PORT = 42141;
  const DEFAULT_SCAN_TIMEOUT_MS = 260;
  const HOST_PROFILE_STORE_KEY = "suggestions:relay:host-profile:v1";
  const HOST_CONFIG_STORE_KEY = "suggestions:relay:host-config:v1";

  let relayServer = null;
  let relayServerPort = 0;
  const connectedDevices = new Map();

  if (typeof fetchImpl !== "function") {
    throw new Error("createSuggestionsRelayService requires fetch implementation");
  }
  if (!providerClient || typeof providerClient.requestJson !== "function" || typeof providerClient.requestText !== "function") {
    throw new Error("createSuggestionsRelayService requires providerClient");
  }

  function normalizePort(value, fallback = DEFAULT_PORT) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    const rounded = Math.round(parsed);
    if (rounded < 1 || rounded > 65535) return fallback;
    return rounded;
  }

  function normalizeHostUrl(value, fallbackPort = DEFAULT_PORT) {
    const raw = normalizeText(value);
    if (!raw) return "";
    let text = raw;
    if (!/^https?:\/\//i.test(text)) {
      text = `http://${text}`;
    }
    try {
      const parsed = new URL(text);
      if (!parsed.port) parsed.port = String(normalizePort(fallbackPort));
      parsed.pathname = "";
      parsed.search = "";
      parsed.hash = "";
      return parsed.toString().replace(/\/+$/g, "");
    } catch (_error) {
      return "";
    }
  }

  function normalizeLlmProfile(value = {}) {
    const source = (value && typeof value === "object") ? value : {};
    const provider = normalizeProvider(source.provider);
    return {
      provider,
      models: source.models && typeof source.models === "object" ? { ...source.models } : {},
      baseUrls: source.baseUrls && typeof source.baseUrls === "object" ? { ...source.baseUrls } : {},
      apiKeys: source.apiKeys && typeof source.apiKeys === "object" ? { ...source.apiKeys } : {}
    };
  }

  function normalizeRelayConfig(value = {}) {
    const source = (value && typeof value === "object") ? value : {};
    const normalizeAccessMode = (rawMode) => {
      const mode = normalizeText(rawMode).toLowerCase();
      if (mode === "whitelist" || mode === "blacklist") return mode;
      return "open";
    };
    const normalizeAddressList = (rawValues) => {
      const list = Array.isArray(rawValues)
        ? rawValues
        : String(rawValues || "")
          .split(/[\r\n,;]+/g)
          .map((row) => row.trim())
          .filter(Boolean);
      const seen = new Set();
      const out = [];
      list.forEach((row) => {
        const item = normalizeText(row);
        if (!item) return;
        const key = item.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        out.push(item);
      });
      return out;
    };
    return {
      enabled: !!source.enabled,
      port: normalizePort(source.port, DEFAULT_PORT),
      authToken: normalizeText(source.authToken),
      accessMode: normalizeAccessMode(source.accessMode),
      whitelist: normalizeAddressList(source.whitelist),
      blacklist: normalizeAddressList(source.blacklist)
    };
  }

  function normalizeRemoteAddress(value) {
    const text = normalizeText(value);
    if (!text) return "";
    let out = text;
    if (out === "::1") return "127.0.0.1";
    if (out.startsWith("::ffff:")) out = out.slice(7);
    return out;
  }

  function isLoopbackAddress(value) {
    const addr = normalizeRemoteAddress(value);
    return addr === "127.0.0.1" || addr === "localhost" || addr === "::1";
  }

  function isAddressListed(list = [], address = "") {
    const target = normalizeRemoteAddress(address).toLowerCase();
    if (!target) return false;
    return (Array.isArray(list) ? list : []).some((row) => normalizeText(row).toLowerCase() === target);
  }

  function isAccessAllowed(req, config = {}) {
    const remoteAddress = normalizeRemoteAddress(req?.socket?.remoteAddress);
    if (!remoteAddress) return false;
    if (isLoopbackAddress(remoteAddress)) return true;
    if (isAddressListed(config.blacklist, remoteAddress)) return false;
    const accessMode = normalizeText(config.accessMode, "open").toLowerCase();
    if (accessMode === "whitelist") {
      return isAddressListed(config.whitelist, remoteAddress);
    }
    return true;
  }

  function getStoredHostProfile() {
    try {
      const raw = store?.get?.(HOST_PROFILE_STORE_KEY, {});
      return normalizeLlmProfile(raw);
    } catch (_error) {
      return normalizeLlmProfile({});
    }
  }

  function setStoredHostProfile(profile = {}) {
    const normalized = normalizeLlmProfile(profile);
    try {
      store?.set?.(HOST_PROFILE_STORE_KEY, normalized);
    } catch (_error) {}
    return normalized;
  }

  function getStoredRelayConfig() {
    try {
      const raw = store?.get?.(HOST_CONFIG_STORE_KEY, {});
      return normalizeRelayConfig(raw);
    } catch (_error) {
      return normalizeRelayConfig({});
    }
  }

  function setStoredRelayConfig(config = {}) {
    const normalized = normalizeRelayConfig(config);
    try {
      store?.set?.(HOST_CONFIG_STORE_KEY, normalized);
    } catch (_error) {}
    return normalized;
  }

  function getLocalIpv4Addresses() {
    const interfaces = os.networkInterfaces();
    const out = [];
    Object.values(interfaces || {}).forEach((rows) => {
      (Array.isArray(rows) ? rows : []).forEach((row) => {
        if (!row) return;
        if (String(row.family || "").toUpperCase() !== "IPV4") return;
        if (row.internal) return;
        const address = normalizeText(row.address);
        if (!address || out.includes(address)) return;
        out.push(address);
      });
    });
    return out;
  }

  function getLocalRelayUrls(port) {
    const normalizedPort = normalizePort(port, DEFAULT_PORT);
    const hosts = ["127.0.0.1", ...getLocalIpv4Addresses()];
    const out = [];
    hosts.forEach((host) => {
      const value = normalizeHostUrl(`http://${host}:${normalizedPort}`, normalizedPort);
      if (!value) return;
      if (!out.includes(value)) out.push(value);
    });
    return out;
  }

  function resolveHostProviderPayload(incomingPayload = {}) {
    const inputPayload = (incomingPayload && typeof incomingPayload === "object") ? incomingPayload : {};
    const hostProfile = getStoredHostProfile();
    const provider = normalizeProvider(hostProfile.provider || inputPayload.provider);
    const model = normalizeText(hostProfile.models?.[provider] || inputPayload.model);
    const baseUrl = normalizeText(hostProfile.baseUrls?.[provider] || inputPayload.baseUrl);
    const apiKey = normalizeText(hostProfile.apiKeys?.[provider] || inputPayload.apiKey);

    return {
      ...inputPayload,
      llmMode: "host",
      relayHostUrl: "",
      relayAuthToken: "",
      relayPort: 0,
      provider,
      model,
      baseUrl,
      apiKey
    };
  }

  function sendJson(res, statusCode, payload) {
    const body = JSON.stringify(payload || {});
    res.writeHead(statusCode, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate"
    });
    res.end(body);
  }

  async function readJsonBody(req, maxBytes = 1.2 * 1024 * 1024) {
    return await new Promise((resolve, reject) => {
      const chunks = [];
      let total = 0;
      req.on("data", (chunk) => {
        total += chunk.length;
        if (total > maxBytes) {
          reject(new Error("Payload too large."));
          req.destroy();
          return;
        }
        chunks.push(chunk);
      });
      req.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        if (!raw.trim()) {
          resolve({});
          return;
        }
        try {
          resolve(JSON.parse(raw));
        } catch (_error) {
          reject(new Error("Invalid JSON payload."));
        }
      });
      req.on("error", (error) => reject(error));
    });
  }

  function getDeviceKey(req) {
    const remoteAddress = normalizeRemoteAddress(req?.socket?.remoteAddress);
    const claimedName = normalizeText(req?.headers?.["x-emubro-client-host"]);
    return `${remoteAddress || "unknown"}::${claimedName || "unknown"}`;
  }

  function touchConnectedDevice(req, patch = {}) {
    const key = getDeviceKey(req);
    const remoteAddress = normalizeRemoteAddress(req?.socket?.remoteAddress);
    const claimedName = normalizeText(req?.headers?.["x-emubro-client-host"]);
    const userAgent = normalizeText(req?.headers?.["user-agent"]);
    const now = Date.now();

    const current = connectedDevices.get(key) || {
      key,
      remoteAddress,
      clientName: claimedName,
      userAgent,
      firstSeenAt: now,
      lastSeenAt: now,
      requestCount: 0,
      deniedCount: 0,
      authFailCount: 0,
      lastPath: ""
    };

    const next = {
      ...current,
      remoteAddress: remoteAddress || current.remoteAddress,
      clientName: claimedName || current.clientName,
      userAgent: userAgent || current.userAgent,
      lastSeenAt: now,
      requestCount: Number(current.requestCount || 0) + 1,
      deniedCount: Number(current.deniedCount || 0) + Number(patch.deniedCount || 0),
      authFailCount: Number(current.authFailCount || 0) + Number(patch.authFailCount || 0),
      lastPath: normalizeText(patch.lastPath, current.lastPath || ""),
      lastStatus: Number(patch.lastStatus || current.lastStatus || 0) || 0
    };
    connectedDevices.set(key, next);
  }

  function getConnectionsSnapshot() {
    const rows = Array.from(connectedDevices.values())
      .map((row) => ({
        key: normalizeText(row?.key),
        remoteAddress: normalizeText(row?.remoteAddress),
        clientName: normalizeText(row?.clientName),
        userAgent: normalizeText(row?.userAgent),
        firstSeenAt: Number(row?.firstSeenAt || 0),
        lastSeenAt: Number(row?.lastSeenAt || 0),
        requestCount: Number(row?.requestCount || 0),
        deniedCount: Number(row?.deniedCount || 0),
        authFailCount: Number(row?.authFailCount || 0),
        lastPath: normalizeText(row?.lastPath),
        lastStatus: Number(row?.lastStatus || 0)
      }))
      .filter((row) => !!row.remoteAddress);
    rows.sort((a, b) => Number(b.lastSeenAt || 0) - Number(a.lastSeenAt || 0));
    return rows.slice(0, 80);
  }

  function isAuthAllowed(req) {
    const config = getStoredRelayConfig();
    const expected = normalizeText(config.authToken);
    if (!expected) return true;
    const provided = normalizeText(req?.headers?.["x-emubro-relay-token"]);
    return provided && provided === expected;
  }

  async function handleRelayRequest(req, res) {
    const method = String(req?.method || "GET").toUpperCase();
    const urlValue = normalizeText(req?.url, "/");
    const pathName = normalizeText(urlValue.split("?")[0], "/");
    const config = getStoredRelayConfig();

    if (!config.enabled) {
      touchConnectedDevice(req, { lastPath: pathName, lastStatus: 503, deniedCount: 1 });
      sendJson(res, 503, { success: false, message: "Incoming relay connections are disabled." });
      return;
    }

    if (!isAccessAllowed(req, config)) {
      touchConnectedDevice(req, { lastPath: pathName, lastStatus: 403, deniedCount: 1 });
      sendJson(res, 403, { success: false, message: "Client is not allowed by relay access rules." });
      return;
    }

    if (method === "GET" && pathName === "/api/llm/ping") {
      touchConnectedDevice(req, { lastPath: pathName, lastStatus: 200 });
      sendJson(res, 200, {
        success: true,
        app: "emuBro",
        version: normalizeText(app?.getVersion?.()),
        hostname: normalizeText(os.hostname()),
        port: normalizePort(config.port, DEFAULT_PORT),
        timestamp: Date.now(),
        connections: getConnectionsSnapshot().length
      });
      return;
    }

    if (method !== "POST") {
      touchConnectedDevice(req, { lastPath: pathName, lastStatus: 404 });
      sendJson(res, 404, { success: false, message: "Not found." });
      return;
    }

    if (!isAuthAllowed(req)) {
      touchConnectedDevice(req, { lastPath: pathName, lastStatus: 401, authFailCount: 1 });
      sendJson(res, 401, { success: false, message: "Unauthorized relay request." });
      return;
    }

    let body = {};
    try {
      body = await readJsonBody(req);
    } catch (error) {
      touchConnectedDevice(req, { lastPath: pathName, lastStatus: 400 });
      sendJson(res, 400, { success: false, message: String(error?.message || "Invalid request body.") });
      return;
    }

    try {
      if (pathName === "/api/llm/request-json") {
        const providerPayload = resolveHostProviderPayload(body?.payload || {});
        const text = await providerClient.requestJson(providerPayload);
        touchConnectedDevice(req, { lastPath: pathName, lastStatus: 200 });
        sendJson(res, 200, { success: true, text: normalizeText(text) });
        return;
      }

      if (pathName === "/api/llm/request-text") {
        const providerPayload = resolveHostProviderPayload(body?.payload || {});
        const requestOptions = {
          prompt: normalizeText(body?.options?.prompt),
          systemPrompt: normalizeText(body?.options?.systemPrompt),
          temperature: Number(body?.options?.temperature)
        };
        const text = await providerClient.requestText(providerPayload, requestOptions);
        touchConnectedDevice(req, { lastPath: pathName, lastStatus: 200 });
        sendJson(res, 200, { success: true, text: normalizeText(text) });
        return;
      }

      if (pathName === "/api/llm/list-ollama-models") {
        const payload = (body?.payload && typeof body.payload === "object") ? body.payload : {};
        const hostProfile = getStoredHostProfile();
        const baseUrl = normalizeText(hostProfile.baseUrls?.ollama || payload.baseUrl);
        const result = await providerClient.listOllamaModels({ baseUrl, llmMode: "host" });
        touchConnectedDevice(req, { lastPath: pathName, lastStatus: 200 });
        sendJson(res, 200, {
          success: true,
          baseUrl: normalizeText(result?.baseUrl),
          models: Array.isArray(result?.models) ? result.models : []
        });
        return;
      }

      touchConnectedDevice(req, { lastPath: pathName, lastStatus: 404 });
      sendJson(res, 404, { success: false, message: "Unknown relay endpoint." });
    } catch (error) {
      touchConnectedDevice(req, { lastPath: pathName, lastStatus: 500 });
      sendJson(res, 500, { success: false, message: String(error?.message || error || "Relay request failed.") });
    }
  }

  async function ensureRelayServer() {
    const config = getStoredRelayConfig();
    if (!config.enabled) {
      if (relayServer) {
        try {
          await new Promise((resolve) => {
            relayServer.close(() => resolve());
          });
        } catch (_error) {}
        relayServer = null;
        relayServerPort = 0;
      }
      return {
        running: false,
        port: normalizePort(config.port, DEFAULT_PORT),
        urls: [],
        accessMode: config.accessMode,
        connections: getConnectionsSnapshot().length
      };
    }

    const desiredPort = normalizePort(config.port, DEFAULT_PORT);
    if (relayServer && relayServerPort === desiredPort) {
      return {
        running: true,
        port: desiredPort,
        urls: getLocalRelayUrls(desiredPort),
        accessMode: config.accessMode,
        connections: getConnectionsSnapshot().length
      };
    }

    if (relayServer) {
      try {
        await new Promise((resolve) => {
          relayServer.close(() => resolve());
        });
      } catch (_error) {}
      relayServer = null;
      relayServerPort = 0;
    }

    relayServer = http.createServer((req, res) => {
      handleRelayRequest(req, res).catch((error) => {
        log.error("suggestions relay request failed:", error);
        try {
          sendJson(res, 500, { success: false, message: "Relay handler failed." });
        } catch (_error) {}
      });
    });
    relayServer.on("error", (error) => {
      log.error("suggestions relay server error:", error);
    });

    await new Promise((resolve, reject) => {
      relayServer.once("error", reject);
      relayServer.listen(desiredPort, "0.0.0.0", () => {
        relayServer.removeListener("error", reject);
        resolve();
      });
    });

    relayServerPort = desiredPort;
    return {
      running: true,
      port: relayServerPort,
      urls: getLocalRelayUrls(relayServerPort),
      accessMode: config.accessMode,
      connections: getConnectionsSnapshot().length
    };
  }

  function sanitizeScanTimeout(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return DEFAULT_SCAN_TIMEOUT_MS;
    return Math.max(120, Math.min(1200, Math.round(parsed)));
  }

  function sanitizeScanConcurrency(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 48;
    return Math.max(8, Math.min(128, Math.round(parsed)));
  }

  async function probeRelayHost(host, port, timeoutMs, authToken = "") {
    const baseUrl = normalizeHostUrl(`http://${host}:${port}`, port);
    if (!baseUrl) return null;
    const endpoint = `${baseUrl}/api/llm/ping`;

    const controller = typeof AbortController === "function" ? new AbortController() : null;
    let timeoutHandle = null;
    if (controller) {
      timeoutHandle = setTimeout(() => {
        try { controller.abort(); } catch (_error) {}
      }, timeoutMs);
    }

    const startTime = Date.now();
    try {
      const headers = {};
      const token = normalizeText(authToken);
      if (token) headers["x-emubro-relay-token"] = token;
      const response = await fetchImpl(endpoint, {
        method: "GET",
        headers,
        signal: controller?.signal
      });
      if (!response.ok) return null;
      const json = await response.json();
      if (!json || json.success !== true) return null;
      return {
        host: normalizeText(host),
        hostname: normalizeText(json.hostname),
        version: normalizeText(json.version),
        url: baseUrl,
        latencyMs: Math.max(1, Date.now() - startTime)
      };
    } catch (_error) {
      return null;
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  }

  function collectScanCandidates(payload = {}) {
    const includeLocalhost = payload?.includeLocalhost !== false;
    const localAddresses = getLocalIpv4Addresses();
    const prefixSet = new Set();
    const localAddressSet = new Set(localAddresses.map((value) => normalizeText(value)));
    localAddresses.forEach((address) => {
      const parts = String(address || "").split(".");
      if (parts.length !== 4) return;
      prefixSet.add(`${parts[0]}.${parts[1]}.${parts[2]}`);
    });

    const candidates = [];
    if (includeLocalhost) {
      candidates.push("127.0.0.1", "localhost");
    }

    const maxPrefixes = Math.max(1, Math.min(5, Number(payload?.maxPrefixes) || 3));
    const prefixes = Array.from(prefixSet).slice(0, maxPrefixes);
    prefixes.forEach((prefix) => {
      for (let idx = 1; idx <= 254; idx += 1) {
        const host = `${prefix}.${idx}`;
        if (localAddressSet.has(host)) continue;
        candidates.push(host);
      }
    });

    const seen = new Set();
    return candidates.filter((host) => {
      const key = normalizeText(host).toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async function runProbeQueue(candidates, worker, concurrency) {
    const out = [];
    let cursor = 0;
    const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
      while (cursor < candidates.length) {
        const index = cursor;
        cursor += 1;
        const candidate = candidates[index];
        // eslint-disable-next-line no-await-in-loop
        const result = await worker(candidate);
        if (result) out.push(result);
      }
    });
    await Promise.all(workers);
    return out;
  }

  async function scanNetwork(payload = {}) {
    const relayConfig = getStoredRelayConfig();
    const port = normalizePort(payload?.port || relayConfig.port, DEFAULT_PORT);
    const timeoutMs = sanitizeScanTimeout(payload?.timeoutMs);
    const concurrency = sanitizeScanConcurrency(payload?.concurrency);
    const authToken = normalizeText(payload?.authToken || payload?.relayAuthToken);
    const candidates = collectScanCandidates(payload);

    if (!candidates.length) {
      return { success: true, hosts: [], scanned: 0, port };
    }

    const hosts = await runProbeQueue(
      candidates,
      async (host) => await probeRelayHost(host, port, timeoutMs, authToken),
      concurrency
    );
    hosts.sort((a, b) => Number(a.latencyMs || 999999) - Number(b.latencyMs || 999999));

    return {
      success: true,
      port,
      scanned: candidates.length,
      hosts
    };
  }

  async function syncHostSettings(payload = {}) {
    const source = (payload && typeof payload === "object") ? payload : {};
    const profile = setStoredHostProfile({
      provider: source.provider,
      models: source.models,
      baseUrls: source.baseUrls,
      apiKeys: source.apiKeys
    });

    const relaySource = source.relay && typeof source.relay === "object"
      ? source.relay
      : {
        enabled: source.relayEnabled,
        port: source.relayPort,
        authToken: source.relayAuthToken,
        accessMode: source.relayAccessMode,
        whitelist: source.relayWhitelist,
        blacklist: source.relayBlacklist
      };
    const relayConfig = setStoredRelayConfig(relaySource);
    const status = await ensureRelayServer();
    return {
      success: true,
      profile,
      relay: relayConfig,
      status
    };
  }

  async function getStatus() {
    const relay = getStoredRelayConfig();
    const status = await ensureRelayServer();
    return {
      success: true,
      relay,
      status,
      connections: getConnectionsSnapshot()
    };
  }

  async function getConnections() {
    return {
      success: true,
      connections: getConnectionsSnapshot()
    };
  }

  return {
    ensureRelayServer,
    syncHostSettings,
    scanNetwork,
    getStatus,
    getConnections
  };
}

module.exports = {
  createSuggestionsRelayService
};
