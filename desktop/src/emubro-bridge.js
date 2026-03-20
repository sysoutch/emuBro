import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { listen as tauriListen } from "@tauri-apps/api/event";
import { getShellStorageValue, setShellStorageValue } from "./utils/shell-storage-cache";

const emitter = new EventTarget();
const bridgeErrorMessage =
  "emuBro bridge unavailable. Run inside the desktop shell (npm run dev).";

function detectDesktopPlatform() {
  const ua = String(navigator?.userAgent || "").toLowerCase();
  const platform = String(navigator?.platform || "").toLowerCase();
  if (platform.includes("win") || ua.includes("windows")) return "win32";
  if (platform.includes("mac") || ua.includes("mac os")) return "darwin";
  if (platform.includes("linux") || ua.includes("linux")) return "linux";
  return "desktop";
}

function hasTauriRuntime() {
  return Boolean(
    (window.__TAURI__ &&
      window.__TAURI__.core &&
      typeof window.__TAURI__.core.invoke === "function") ||
      (window.__TAURI_INTERNALS__ &&
        typeof window.__TAURI_INTERNALS__.invoke === "function")
  );
}

const runningInDesktopShell = hasTauriRuntime();

function normalizeFallbackTagId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildFallbackTagCatalog() {
  return [
    { id: "action", label: "Action" },
    { id: "adventure", label: "Adventure" },
    { id: "arcade", label: "Arcade" },
    { id: "multiplayer", label: "Multiplayer" },
    { id: "platformer", label: "Platformer" },
    { id: "puzzle", label: "Puzzle" },
    { id: "racing", label: "Racing" },
    { id: "rpg", label: "RPG" }
  ];
}

function normalizeFallbackUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return /^https?:\/\//i.test(text) ? text : `https://${text}`;
}

const fallbackRemoteConfigKey = "emubro.desktop.fallback.remote.config";
const fallbackRemoteHostsKey = "emubro.desktop.fallback.remote.hosts";
const fallbackRemotePairingKey = "emubro.desktop.fallback.remote.pairing";
const fallbackMemoryCardsKey = "emubro.desktop.fallback.memory-cards";
const fallbackShellStateKey = "emubro.desktop.fallback.shell-state";

function readFallbackStorageJson(key, fallbackValue) {
  try {
    const raw = getShellStorageValue(key, "");
    return raw ? JSON.parse(raw) : fallbackValue;
  } catch (_error) {
    return fallbackValue;
  }
}

function writeFallbackStorageJson(key, value) {
  try {
    setShellStorageValue(key, JSON.stringify(value));
  } catch (_error) {}
  return value;
}

function getFallbackRemoteConfig() {
  return readFallbackStorageJson(fallbackRemoteConfigKey, {
    enabled: false,
    port: 38477,
    discoveryPort: 38478,
    allowedRoots: []
  });
}

function getFallbackRemoteHosts() {
  return readFallbackStorageJson(fallbackRemoteHostsKey, []);
}

function getFallbackRemotePairing() {
  return readFallbackStorageJson(fallbackRemotePairingKey, {
    code: "123456",
    expiresAt: ""
  });
}

function getFallbackShellState() {
  const value = readFallbackStorageJson(fallbackShellStateKey, {});
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function writeFallbackShellState(nextState) {
  return writeFallbackStorageJson(
    fallbackShellStateKey,
    nextState && typeof nextState === "object" && !Array.isArray(nextState) ? nextState : {}
  );
}

function buildFallbackMemorySave(slot, title, productCode = "") {
  return {
    slot: Number(slot || 1),
    title: String(title || "Untitled Save").trim(),
    productCode: String(productCode || "").trim(),
    size: 8192,
    blocks: 1,
    isMultiBlock: false,
    icon: null
  };
}

function buildFallbackMemoryCardData(path, saves = []) {
  const normalizedSaves = (Array.isArray(saves) ? saves : []).map((row, index) => ({
    ...buildFallbackMemorySave(row?.slot || index + 1, row?.title || `Save ${index + 1}`, row?.productCode || "")
  }));
  const usedBlocks = normalizedSaves.reduce((total, row) => total + Math.max(1, Number(row?.blocks || 1)), 0);
  return {
    format: "PlayStation 1",
    saves: normalizedSaves,
    freeBlocks: Math.max(0, 15 - usedBlocks),
    cardSize: 128 * 1024,
    rawPath: String(path || "").trim()
  };
}

function buildDefaultFallbackMemoryCards() {
  return {
    cards: {
      "C:/emuBro/dev-fallback/cards/memory-card-1.mcr": buildFallbackMemoryCardData("C:/emuBro/dev-fallback/cards/memory-card-1.mcr", [
        buildFallbackMemorySave(1, "Gran Turismo 2", "SCUS-94455"),
        buildFallbackMemorySave(2, "Crash Team Racing", "SCUS-94426")
      ]),
      "C:/emuBro/dev-fallback/cards/memory-card-2.mcr": buildFallbackMemoryCardData("C:/emuBro/dev-fallback/cards/memory-card-2.mcr", [
        buildFallbackMemorySave(1, "Tekken 3", "SCES-01237")
      ])
    }
  };
}

function getFallbackMemoryCardsState() {
  return readFallbackStorageJson(fallbackMemoryCardsKey, buildDefaultFallbackMemoryCards());
}

function writeFallbackMemoryCardsState(nextState) {
  return writeFallbackStorageJson(fallbackMemoryCardsKey, nextState);
}

function ensureFallbackMemoryCard(path) {
  const targetPath = String(path || "").trim();
  const state = getFallbackMemoryCardsState();
  if (!state.cards || typeof state.cards !== "object") {
    state.cards = {};
  }
  if (!state.cards[targetPath]) {
    state.cards[targetPath] = buildFallbackMemoryCardData(targetPath, []);
    writeFallbackMemoryCardsState(state);
  }
  return { state, card: state.cards[targetPath] };
}

function getFallbackMemoryCard(path) {
  return ensureFallbackMemoryCard(path).card;
}

function writeFallbackMemoryCard(path, cardData) {
  const targetPath = String(path || "").trim();
  const state = getFallbackMemoryCardsState();
  if (!state.cards || typeof state.cards !== "object") {
    state.cards = {};
  }
  state.cards[targetPath] = buildFallbackMemoryCardData(targetPath, cardData?.saves || []);
  writeFallbackMemoryCardsState(state);
  return state.cards[targetPath];
}

function findNextFallbackMemorySlot(cardData) {
  const usedSlots = new Set((Array.isArray(cardData?.saves) ? cardData.saves : []).map((row) => Number(row?.slot || 0)));
  for (let slot = 1; slot <= 15; slot += 1) {
    if (!usedSlots.has(slot)) {
      return slot;
    }
  }
  return 0;
}

function getBridgeFallback(channel, args = []) {
  const payload = args[0];
  switch (String(channel || "").trim()) {
    case "get-all-translations":
      return {};
    case "get-games":
    case "get-emulators":
    case "get-platforms":
    case "get-platforms-for-extension":
    case "locales:list":
      return [];
    case "get-user-info":
      return {
        displayName: "Bro",
        username: "bro",
        avatarUrl: "/logo.png",
        status: "online"
      };
    case "tags:list":
      return { tags: buildFallbackTagCatalog() };
    case "read-memory-card": {
      const filePath = String(payload || "").trim();
      return {
        success: true,
        data: getFallbackMemoryCard(filePath)
      };
    }
    case "delete-save": {
      const filePath = String(payload?.filePath || "").trim();
      const slot = Number(payload?.slot || 0);
      const { card } = ensureFallbackMemoryCard(filePath);
      const save = (Array.isArray(card?.saves) ? card.saves : []).find((row) => Number(row?.slot || 0) === slot);
      if (!save) {
        return { success: false, message: "Slot is empty or invalid." };
      }
      const nextCard = buildFallbackMemoryCardData(
        filePath,
        card.saves.filter((row) => Number(row?.slot || 0) !== slot)
      );
      writeFallbackMemoryCard(filePath, nextCard);
      return {
        success: true,
        deletedEntry: JSON.stringify(save),
        deletedTitle: String(save?.title || "Deleted Save"),
        slot
      };
    }
    case "rename-save": {
      const filePath = String(payload?.filePath || "").trim();
      const slot = Number(payload?.slot || 0);
      const newName = String(payload?.newName || "").trim();
      const { card } = ensureFallbackMemoryCard(filePath);
      const nextCard = buildFallbackMemoryCardData(
        filePath,
        (Array.isArray(card?.saves) ? card.saves : []).map((row) =>
          Number(row?.slot || 0) === slot ? { ...row, title: newName || row.title } : row
        )
      );
      writeFallbackMemoryCard(filePath, nextCard);
      return { success: true };
    }
    case "format-card": {
      const filePath = String(payload || "").trim();
      writeFallbackMemoryCard(filePath, buildFallbackMemoryCardData(filePath, []));
      return { success: true };
    }
    case "memory-card:create-empty": {
      const filePath = String(payload?.filePath || payload || "").trim();
      writeFallbackMemoryCard(filePath, buildFallbackMemoryCardData(filePath, []));
      return { success: true, filePath };
    }
    case "copy-save": {
      const sourcePath = String(payload?.sourcePath || "").trim();
      const sourceSlot = Number(payload?.sourceSlot || 0);
      const targetPath = String(payload?.targetPath || "").trim();
      const sourceCard = getFallbackMemoryCard(sourcePath);
      const sourceSave = (Array.isArray(sourceCard?.saves) ? sourceCard.saves : []).find((row) => Number(row?.slot || 0) === sourceSlot);
      if (!sourceSave) {
        return { success: false, message: "Source slot is empty or invalid." };
      }
      const targetCard = getFallbackMemoryCard(targetPath);
      const targetSlot = findNextFallbackMemorySlot(targetCard);
      if (!targetSlot) {
        return { success: false, message: "No free slot available on target card." };
      }
      const nextSaves = [...(Array.isArray(targetCard?.saves) ? targetCard.saves : []), { ...sourceSave, slot: targetSlot }];
      writeFallbackMemoryCard(targetPath, buildFallbackMemoryCardData(targetPath, nextSaves));
      return { success: true, targetSlot };
    }
    case "export-save":
      return { success: true, outputPath: String(payload?.outputPath || "").trim() };
    case "import-save": {
      const filePath = String(payload?.filePath || "").trim();
      const importPath = String(payload?.importPath || "").trim();
      const targetCard = getFallbackMemoryCard(filePath);
      const targetSlot = findNextFallbackMemorySlot(targetCard);
      if (!targetSlot) {
        return { success: false, message: "No free slot available on this card." };
      }
      const baseName = importPath.replace(/\\/g, "/").split("/").pop() || "Imported Save";
      const nextSaves = [
        ...(Array.isArray(targetCard?.saves) ? targetCard.saves : []),
        buildFallbackMemorySave(targetSlot, baseName.replace(/\.[^.]+$/, ""))
      ];
      writeFallbackMemoryCard(filePath, buildFallbackMemoryCardData(filePath, nextSaves));
      return { success: true, targetSlot };
    }
    case "undelete-save": {
      const filePath = String(payload?.filePath || "").trim();
      const slot = Number(payload?.slot || 0);
      const deletedEntry = String(payload?.deletedEntry || "").trim();
      let restoredSave = null;
      try {
        restoredSave = JSON.parse(deletedEntry);
      } catch (_error) {
        restoredSave = null;
      }
      if (!restoredSave) {
        return { success: false, message: "Invalid deleted-save payload." };
      }
      const targetCard = getFallbackMemoryCard(filePath);
      if ((Array.isArray(targetCard?.saves) ? targetCard.saves : []).some((row) => Number(row?.slot || 0) === slot)) {
        return { success: false, message: "Target slot is no longer free." };
      }
      const nextSaves = [...(Array.isArray(targetCard?.saves) ? targetCard.saves : []), { ...restoredSave, slot }];
      nextSaves.sort((a, b) => Number(a?.slot || 0) - Number(b?.slot || 0));
      writeFallbackMemoryCard(filePath, buildFallbackMemoryCardData(filePath, nextSaves));
      return { success: true };
    }
    case "browse-memory-cards": {
      const rootHint = String(payload || "").trim().toLowerCase();
      const state = getFallbackMemoryCardsState();
      const cards = Object.entries(state?.cards || {})
        .filter(([path]) => !rootHint || String(path || "").toLowerCase().includes(rootHint))
        .map(([path, cardData]) => ({
          name: String(path || "").replace(/\\/g, "/").split("/").pop() || "memory-card.mcr",
          path,
          size: Number(cardData?.cardSize || 128 * 1024),
          modified: Date.now()
        }));
      return { success: true, cards };
    }
    case "bios:list":
      return {
        success: true,
        rootPath: "C:/emuBro/dev-fallback/bios",
        platforms: [
          {
            shortName: "shared",
            name: "Shared",
            biosRequired: false,
            requiredBy: [],
            folderPath: "C:/emuBro/dev-fallback/bios/shared",
            fileCount: 0,
            files: []
          },
          {
            shortName: "psx",
            name: "Sony PlayStation",
            biosRequired: true,
            requiredBy: ["DuckStation"],
            folderPath: "C:/emuBro/dev-fallback/bios/psx",
            fileCount: 1,
            files: [{ name: "scph1001.bin", size: 524288 }]
          }
        ]
      };
    case "locales:read":
    case "settings:get-splash-theme":
    case "update:get-config":
    case "resources:update:get-config":
      return {};
    case "update:get-state":
      return {
        available: false,
        checking: false,
        downloading: false,
        installing: false,
        downloaded: false,
        progressPercent: 0,
        currentVersion: "dev-shell",
        latestVersion: "dev-shell",
        releaseNotes: "Browser fallback build. Native updater state is only available inside the desktop runtime.",
        lastMessage: "Browser fallback updater unavailable."
      };
    case "resources:update:get-state":
      return {
        available: false,
        checking: false,
        installing: false,
        downloaded: false,
        progressPercent: 0,
        currentVersion: "dev-shell",
        latestVersion: "dev-shell",
        missingLocalResources: false,
        lastMessage: "Browser fallback resources updater unavailable."
      };
    case "locales:exists":
      return false;
    case "locales:flags:get-data-url":
      return { dataUrl: "" };
    case "help:docs:list":
      return { success: true, docs: [] };
    case "help:docs:get":
      return { success: false, doc: null };
    case "help:docs:search":
      return { success: true, rows: [] };
    case "suggestions:list-ollama-models":
      return { success: true, models: ["llama3.1"], baseUrl: "http://127.0.0.1:11434" };
    case "suggestions:relay:get-status":
      return {
        success: true,
        status: { running: false, port: 42141 },
        connections: []
      };
    case "suggestions:relay:get-connections":
      return { success: true, connections: [] };
    case "suggestions:relay:sync-host-settings":
      return {
        success: true,
        status: { running: false, port: 42141 },
        connections: []
      };
    case "suggestions:relay:scan-network":
      return { success: true, hosts: [] };
    case "window:is-maximized":
      return false;
    case "window:set-corner-radius":
      return { success: true };
    case "prompt-scan-subfolders":
      return { canceled: false, recursive: true };
    case "settings:get-library-paths":
      return { success: true, settings: { gameFolders: [], emulatorFolders: [] } };
    case "settings:set-library-paths":
      return { success: true, settings: { gameFolders: [], emulatorFolders: [] } };
    case "settings:set-splash-theme":
    case "update-game-metadata":
      return { success: true };
    case "shell-state:get": {
      const key = String(payload?.key || "").trim();
      const state = getFallbackShellState();
      return {
        success: !!key,
        value: key && Object.prototype.hasOwnProperty.call(state, key) ? state[key] : payload?.fallback ?? null
      };
    }
    case "shell-state:set": {
      const key = String(payload?.key || "").trim();
      if (!key) {
        return { success: false, message: "Missing shell state key." };
      }
      const state = getFallbackShellState();
      state[key] = payload?.value ?? null;
      writeFallbackShellState(state);
      return { success: true, value: state[key] };
    }
    case "shell-state:delete": {
      const key = String(payload?.key || "").trim();
      if (!key) {
        return { success: false, message: "Missing shell state key." };
      }
      const state = getFallbackShellState();
      delete state[key];
      writeFallbackShellState(state);
      return { success: true };
    }
    case "bios:add-files":
      return { success: true, added: Array.isArray(payload?.filePaths) ? payload.filePaths.length : 0, skipped: 0 };
    case "bios:open-folder":
      return { success: true, path: `C:/emuBro/dev-fallback/bios/${String(payload?.platformShortName || "shared").trim()}` };
    case "resources:update:set-config":
    case "update:set-config":
      return { success: true };
    case "tags:rename": {
      const nextLabel = String(payload?.newTagName || "").trim() || "Renamed Tag";
      return {
        success: true,
        newTagId: normalizeFallbackTagId(nextLabel) || "renamed-tag",
        newLabel: nextLabel
      };
    }
    case "tags:delete":
      return { success: true };
    case "remove-game":
      return { success: true, message: "Game removed from library." };
    case "cue:inspect-bin-files": {
      const rows = Array.isArray(payload) ? payload : [];
      return {
        success: true,
        results: rows.map((binPath) => ({
          binPath: String(binPath || "").trim(),
          hasCue: false,
          cuePath: ""
        }))
      };
    }
    case "cue:generate-for-bin": {
      const rows = Array.isArray(payload) ? payload : [];
      return {
        success: true,
        generated: rows.map((binPath) => ({
          binPath: String(binPath || "").trim(),
          cuePath: `${String(binPath || "").trim().replace(/\.[^.]+$/i, "")}.cue`
        })),
        existing: [],
        failed: []
      };
    }
    case "tools:ecm:get-download-info":
      return {
        success: true,
        repoUrl: "https://github.com/eka2l1/ecm",
        sourceZipUrl: "https://github.com/eka2l1/ecm/archive/refs/heads/master.zip",
        defaultFileName: "ecm-master.zip",
        license: "GPL-2.0-or-later",
        note: "Downloaded as a separate external tool archive."
      };
    case "tools:ecm:download-source-zip":
      return {
        success: true,
        canceled: false,
        filePath: "C:/emuBro/dev-fallback/ecm-master.zip",
        sizeBytes: 24576,
        sourceUrl: "https://github.com/eka2l1/ecm/archive/refs/heads/master.zip",
        repoUrl: "https://github.com/eka2l1/ecm"
      };
    case "tools:ecm:detect-build-env":
      return {
        success: true,
        environment: {
          platform: detectDesktopPlatform(),
          recommendedCompiler: "gcc",
          recommendedCompilerInstaller: "winget-gcc",
          compilers: [
            { name: "gcc", available: true, version: "13.2.0" },
            { name: "clang", available: false, version: "" }
          ],
          compilerInstallOptions: [
            {
              id: "winget-gcc",
              label: "Install GCC with winget",
              description: "Use winget to install a GCC toolchain.",
              recommended: true,
              action: "command",
              command: "winget install GCC"
            },
            {
              id: "mingw-url",
              label: "Open MinGW download page",
              description: "Open the MinGW download page in your browser.",
              recommended: false,
              action: "url",
              url: "https://www.mingw-w64.org/downloads/"
            }
          ]
        }
      };
    case "tools:ecm:get-compiler-install-options": {
      const environment = getBridgeFallback("tools:ecm:detect-build-env");
      return {
        success: true,
        platform: environment?.environment?.platform || detectDesktopPlatform(),
        options: environment?.environment?.compilerInstallOptions || [],
        recommendedOptionId: environment?.environment?.recommendedCompilerInstaller || "",
        environment: environment?.environment || {}
      };
    }
    case "tools:ecm:install-compiler":
      return {
        success: true,
        message: "Compiler installation finished and compiler was detected.",
        compilerDetected: true,
        environment: getBridgeFallback("tools:ecm:detect-build-env")?.environment || {}
      };
    case "tools:ecm:build-binaries":
      return {
        success: true,
        compiler: String(payload?.compiler || "gcc").trim() || "gcc",
        sourceDir: String(payload?.sourcePath || "C:/emuBro/dev-fallback/ecm-master.zip"),
        outputDir: "C:/emuBro/dev-fallback/ecm-bin",
        extractedFromZip: true,
        extractedDir: "C:/emuBro/dev-fallback/ecm-source",
        binaries: [
          "C:/emuBro/dev-fallback/ecm-bin/ecm.exe",
          "C:/emuBro/dev-fallback/ecm-bin/unecm.exe"
        ],
        buildResults: [
          { ok: true, source: "ecm.c", target: "C:/emuBro/dev-fallback/ecm-bin/ecm.exe", stdout: "compiled", stderr: "" },
          { ok: true, source: "unecm.c", target: "C:/emuBro/dev-fallback/ecm-bin/unecm.exe", stdout: "compiled", stderr: "" }
        ],
        environment: getBridgeFallback("tools:ecm:detect-build-env")?.environment || {}
      };
    case "get-emulator-download-options": {
      const links = payload?.downloadLinks && typeof payload.downloadLinks === "object" ? payload.downloadLinks : {};
      const osKey = String(payload?.os || payload?.osKey || "windows").trim().toLowerCase();
      const direct = osKey === "linux" ? links.linux : osKey === "mac" ? links.mac : links.windows || links.win32;
      const url = normalizeFallbackUrl(direct || payload?.website || payload?.downloadUrl || "");
      const packageType =
        /(\.zip|\.7z|\.rar|\.tar|\.gz|\.bz2|\.xz)(?:$|[?#])/i.test(url)
          ? "archive"
          : /(\.msi|\.pkg|\.dmg|setup|install)(?:$|[?#])/i.test(url)
            ? "installer"
            : "executable";
      return {
        success: true,
        osKey,
        options: url ? [{ url, source: url, fileName: url.split("/").pop() || "package.bin", packageType }] : [],
        recommendedType: packageType,
        manualUrl: normalizeFallbackUrl(payload?.website || payload?.downloadUrl || ""),
        waybackUrl: ""
      };
    }
    case "download-install-emulator":
      return {
        success: true,
        installed: true,
        installedPath: "C:/emuBro/dev-fallback/emulator.exe",
        packagePath: "C:/emuBro/dev-fallback/package.zip",
        message: `Installed ${String(payload?.name || "emulator")} in browser fallback mode.`
      };
    case "covers:download-for-game":
      return {
        success: true,
        status: "downloaded",
        downloaded: true,
        imageUrl: "https://picsum.photos/seed/emubro-cover/512/768",
        message: "Browser fallback applied a placeholder cover."
      };
    case "covers:get-source-config":
      return {
        success: true,
        sources: {
          psx: ["https://raw.githubusercontent.com/xlenore/psx-covers/main/covers/default/${serial}.jpg"],
          ps2: ["https://raw.githubusercontent.com/xlenore/ps2-covers/main/covers/default/${serial}.jpg"]
        }
      };
    case "covers:download-for-library": {
      const gameRows = Array.isArray(getBridgeFallback("get-games")) ? getBridgeFallback("get-games") : [];
      const wantedIds = Array.isArray(payload?.gameIds)
        ? new Set(payload.gameIds.map((value) => Number(value)).filter((value) => Number.isFinite(value)))
        : null;
      const selectedRows = gameRows.filter((row) => {
        if (!wantedIds || !wantedIds.size) return true;
        return wantedIds.has(Number(row?.id || 0));
      });
      const results = selectedRows.slice(0, 10).map((row, index) => ({
        success: true,
        downloaded: true,
        status: "downloaded",
        gameId: Number(row?.id || index + 1),
        name: String(row?.name || `Game ${index + 1}`),
        platformShortName: String(row?.platformShortName || row?.platform || "psx"),
        sourceUrl: `https://picsum.photos/seed/emubro-cover-${index}/512/768`
      }));
      return {
        success: true,
        total: selectedRows.length,
        downloaded: results.length,
        skipped: Math.max(0, selectedRows.length - results.length),
        failed: 0,
        results,
        sourceTemplates: {
          psx: ["https://raw.githubusercontent.com/xlenore/psx-covers/main/covers/default/${serial}.jpg"],
          ps2: ["https://raw.githubusercontent.com/xlenore/ps2-covers/main/covers/default/${serial}.jpg"]
        }
      };
    }
    case "covers:search-web": {
      const query = String(payload?.query || "emuBro cover").trim();
      return {
        success: true,
        query,
        results: Array.from({ length: 8 }, (_, index) => ({
          title: `${query} ${index + 1}`,
          source: "browser-fallback",
          imageUrl: `https://picsum.photos/seed/${encodeURIComponent(query)}-${index}/512/768`,
          thumbnailUrl: `https://picsum.photos/seed/${encodeURIComponent(query)}-${index}/256/384`
        }))
      };
    }
    case "emulator:read-config-file": {
      const emulatorPath = String(payload?.emulatorPath || payload?.filePath || "C:/emuBro/dev-fallback/emulator.exe").trim();
      const configFilePath = String(payload?.configFilePath || "config.ini").trim();
      const resolvedPath = configFilePath.includes(":") ? configFilePath : `${emulatorPath.replace(/[\\\\/][^\\\\/]+$/, "")}/${configFilePath}`;
      return {
        success: true,
        exists: true,
        resolvedPath,
        text: [
          "# Browser fallback config",
          "fullscreen=false",
          "vsync=true",
          "audio_driver=default"
        ].join("\n")
      };
    }
    case "emulator:write-config-file":
      return {
        success: true,
        resolvedPath: String(payload?.configFilePath || "").trim(),
        bytesWritten: String(payload?.contents || "").length
      };
    case "get-monitor-info":
    case "detect-monitors":
      return [
        {
          id: "display-1",
          name: "Primary Monitor",
          deviceId: "DISPLAY1",
          width: 1920,
          height: 1080,
          isPrimary: true,
          orientation: 0,
          connected: true
        },
        {
          id: "display-2",
          name: "Secondary Monitor",
          deviceId: "DISPLAY2",
          width: 1080,
          height: 1920,
          isPrimary: false,
          orientation: 270,
          connected: true
        }
      ];
    case "set-monitor-orientation":
    case "toggle-monitor-orientation":
    case "set-monitor-display-state":
    case "set-primary-monitor":
      return { success: true };
    case "remote:host:get-config":
      return { success: true, config: getFallbackRemoteConfig() };
    case "remote:host:set-config": {
      const savedConfig = writeFallbackStorageJson(fallbackRemoteConfigKey, {
        enabled: !!payload?.enabled,
        port: Number(payload?.port || 38477),
        discoveryPort: Number(payload?.discoveryPort || 38478),
        allowedRoots: Array.isArray(payload?.allowedRoots) ? payload.allowedRoots : []
      });
      return {
        success: true,
        config: savedConfig,
        status: {
          running: !!savedConfig.enabled,
          port: Number(savedConfig.port || 38477)
        }
      };
    }
    case "remote:host:get-status": {
      const config = getFallbackRemoteConfig();
      return {
        success: true,
        status: {
          running: !!config.enabled,
          port: Number(config.port || 38477)
        }
      };
    }
    case "remote:host:get-pairing":
      return { success: true, pairing: getFallbackRemotePairing() };
    case "remote:host:rotate-pairing": {
      const pairing = writeFallbackStorageJson(fallbackRemotePairingKey, {
        code: String(Math.floor(100000 + Math.random() * 899999)),
        expiresAt: ""
      });
      return { success: true, pairing };
    }
    case "remote:client:get-hosts":
      return { success: true, hosts: getFallbackRemoteHosts() };
    case "remote:client:set-hosts":
      return { success: true, hosts: writeFallbackStorageJson(fallbackRemoteHostsKey, Array.isArray(payload?.hosts) ? payload.hosts : []) };
    case "remote:client:scan":
      return {
        success: true,
        hosts: [
          {
            hostId: "fallback-host-1",
            name: "Fallback Host",
            address: "192.168.0.10",
            port: 38477,
            url: "http://192.168.0.10:38477"
          }
        ]
      };
    case "remote:client:pair":
      return {
        success: true,
        result: {
          token: "fallback-token",
          host: {
            hostId: "fallback-host-1"
          }
        }
      };
    case "remote:client:list-games":
      return {
        success: true,
        games: [
          {
            title: "Remote Demo Game",
            path: "/remote/demo-game.7z",
            platformShortName: "psx"
          }
        ],
        diagnostics: {
          totalGames: 1,
          blockedByRoots: 0
        }
      };
    case "remote:client:download-file":
      return {
        success: true,
        destinationPath: String(payload?.destinationPath || "C:/emuBro/dev-fallback/remote-file.7z")
      };
    case "open-file-dialog":
    case "save-file-dialog":
      return { canceled: true, filePaths: [] };
    case "show-item-in-folder":
      return { success: true, path: String(payload || "").trim() };
    case "launcher:scan-games":
      return {
        success: true,
        stores: {
          steam: [
            {
              name: "Half-Life",
              launchUri: "steam://rungameid/70",
              installDir: "C:/Program Files (x86)/Steam/steamapps/common/Half-Life",
              installed: true
            },
            {
              name: "Sonic CD",
              launchUri: "steam://rungameid/200940",
              installDir: "C:/Program Files (x86)/Steam/steamapps/common/Sonic CD",
              installed: true
            }
          ],
          epic: [
            {
              name: "Fortnite",
              launchUri: "com.epicgames.launcher://apps/Fortnite?action=launch",
              installDir: "C:/Program Files/Epic Games/Fortnite",
              installed: true
            }
          ],
          gog: []
        },
        errors: []
      };
    case "launcher:import-games":
      return {
        success: true,
        added: Array.isArray(payload?.games) ? payload.games : []
      };
    case "community:close-in-app-windows":
      return { success: true, closed: 0 };
    case "community:get-platform-feed": {
      const platform = String(payload?.platform || "discord").trim().toLowerCase();
      const base = {
        success: true,
        platform,
        fetchedAt: new Date().toISOString(),
        items: []
      };
      if (platform === "bluesky") {
        return {
          ...base,
          mode: "feed",
          items: [
            {
              id: "fallback-bsky-1",
              title: "Shell fallback Bluesky post",
              excerpt: "This preview appears because the native community feed bridge is unavailable in browser mode.",
              url: "https://bsky.app/profile/emubro.bsky.social",
              publishedAt: new Date().toISOString(),
              author: "@emubro.bsky.social",
              thumbnail: "",
              badge: "Post",
              stats: ["browser fallback"]
            }
          ]
        };
      }
      if (platform === "reddit") {
        return {
          ...base,
          mode: "feed",
          items: [
            {
              id: "fallback-reddit-1",
              title: "Shell fallback Reddit thread",
              excerpt: "Open the subreddit in your browser for the full live feed when the desktop bridge is unavailable.",
              url: "https://www.reddit.com/r/emuBro/",
              publishedAt: Date.now(),
              author: "u/emubro",
              thumbnail: "",
              badge: "Thread",
              stats: ["browser fallback"]
            }
          ]
        };
      }
      if (platform === "youtube") {
        return {
          ...base,
          mode: "feed",
          items: [
            {
              id: "fallback-youtube-1",
              title: "Shell fallback YouTube upload",
              excerpt: "The desktop bridge normally loads the latest channel uploads here.",
              url: "https://www.youtube.com/channel/UC9zQuEiPjnRv2LXVqR57K1Q",
              publishedAt: new Date().toISOString(),
              author: "emuBro",
              thumbnail: "",
              badge: "Video",
              stats: ["browser fallback"]
            }
          ]
        };
      }
      return {
        ...base,
        mode: platform === "twitter" ? "limited" : "guide",
        message: "This browser-mode fallback keeps the platform view alive, but live community feeds need the desktop bridge."
      };
    }
    case "system:get-specs":
      return {
        success: true,
        specs: {
          text: [
            `Platform: ${String(navigator?.platform || "web")}`,
            `User agent: ${String(navigator?.userAgent || "unknown")}`
          ].join("\n")
        }
      };
    case "suggestions:suggest-tags-for-game":
      return {
        success: false,
        message: "LLM tag suggestion fallback is disabled. Use the desktop runtime with a configured AI/LLM provider."
      };
    case "suggestions:generate-description-for-game": {
      const game = payload?.game || {};
      const name = String(game?.name || "This game").trim();
      const platform = String(game?.platform || game?.platformShortName || "Unknown platform").trim();
      const genre = String(game?.genre || "Unknown genre").trim().toLowerCase();
      return {
        success: true,
        description: `${name} is a ${genre} title in your ${platform} library. This short placeholder description comes from the browser fallback because the native AI provider is unavailable in this mode.`
      };
    }
    default:
      return { success: false, message: bridgeErrorMessage };
  }
}

async function invokeChannel(channel, ...args) {
  if (!runningInDesktopShell) {
    if (channel === "open-external-url" || channel === "community:open-in-app-window") {
      const payload = args[0];
      const url =
        typeof payload === "string"
          ? String(payload || "").trim()
          : String(payload?.url || "").trim();
      if (!url) {
        return { success: false, message: "Missing URL." };
      }

      try {
        window.open(url, "_blank", "noopener,noreferrer");
        return {
          success: true,
          url,
          fallback: channel === "community:open-in-app-window" ? "external-browser" : "browser-window"
        };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : String(error || "Unknown error")
        };
      }
    }

    if (channel === "suggestions:emulation-support") {
      return {
        success: false,
        message: "LLM support chat fallback is disabled. Use the desktop runtime with a configured AI/LLM provider."
      };
    }

    return getBridgeFallback(channel, args);
  }
  return tauriInvoke("emubro_invoke", { channel, args });
}

function onEvent(eventName, callback) {
  if (typeof callback !== "function") return () => {};
  const handler = (event) => callback(event.detail);
  emitter.addEventListener(eventName, handler);
  return () => emitter.removeEventListener(eventName, handler);
}

function dispatchEvent(eventName, detail) {
  emitter.dispatchEvent(new CustomEvent(eventName, { detail }));
}

let nativeEventBridgeInitialized = false;
const nativeDropDeduper = { key: "", at: 0 };

function shouldSkipDuplicateNativeDrop(payload) {
  const now = Date.now();
  const paths = Array.isArray(payload)
    ? payload
    : payload && Array.isArray(payload.paths)
      ? payload.paths
      : [];
  const normalized = paths.map((p) => String(p || "").trim()).filter(Boolean);
  if (!normalized.length) return false;
  const key = normalized.map((p) => p.toLowerCase()).sort().join("|");
  const recent = nativeDropDeduper.key === key && now - nativeDropDeduper.at < 600;
  nativeDropDeduper.key = key;
  nativeDropDeduper.at = now;
  return recent;
}

async function bindNativeEventBridge() {
  if (!runningInDesktopShell || nativeEventBridgeInitialized) return;
  nativeEventBridgeInitialized = true;

  const eventNames = [
    "emubro:launch",
    "emubro:support-stream",
    "window-moved",
    "window:maximized-changed",
    "app:update-status",
    "resources:update-status",
    "tauri://file-drop",
    "tauri://file-drop-hover",
    "tauri://file-drop-cancelled",

    // Tauri v2 drag/drop events (map to legacy file-drop events for existing UI code).
    "tauri://drag-enter",
    "tauri://drag-over",
    "tauri://drag-drop",
    "tauri://drag-leave"
  ];

  await Promise.all(
    eventNames.map(async (eventName) => {
      try {
        await tauriListen(eventName, (event) => {
          const payload = event?.payload;

          if (eventName === "tauri://drag-enter" || eventName === "tauri://drag-over") {
            dispatchEvent("tauri://file-drop-hover", payload);
            return;
          }

          if (eventName === "tauri://drag-leave") {
            dispatchEvent("tauri://file-drop-cancelled", payload);
            return;
          }

          if (eventName === "tauri://drag-drop") {
            if (!shouldSkipDuplicateNativeDrop(payload)) {
              dispatchEvent("tauri://file-drop", payload);
            }
            return;
          }

          if (eventName === "tauri://file-drop" && shouldSkipDuplicateNativeDrop(payload)) {
            return;
          }

          dispatchEvent(eventName, payload);
        });
      } catch (_error) {}
    })
  );
}

const emubro = {
  platform: runningInDesktopShell ? detectDesktopPlatform() : "web",
  invoke: invokeChannel,
  minimizeWindow: () => invokeChannel("window:minimize"),
  startWindowDragging: () => invokeChannel("window:start-dragging"),
  onLaunch: (callback) => onEvent("emubro:launch", callback),
  onSupportStream: (callback) => onEvent("emubro:support-stream", callback),
  onWindowMoved: (callback) => onEvent("window-moved", callback),
  onWindowMaximizedChanged: (callback) => onEvent("window:maximized-changed", callback),
  onUpdateStatus: (callback) => onEvent("app:update-status", callback),
  onResourcesUpdateStatus: (callback) => onEvent("resources:update-status", callback),
  onFileDrop: (callback) => onEvent("tauri://file-drop", callback),
  onFileDropHover: (callback) => onEvent("tauri://file-drop-hover", callback),
  onFileDropCancelled: (callback) => onEvent("tauri://file-drop-cancelled", callback),
  getAllTranslations: () => invokeChannel("get-all-translations"),
  locales: {
    list: () => invokeChannel("locales:list"),
    read: (filename) => invokeChannel("locales:read", filename),
    exists: (filename) => invokeChannel("locales:exists", filename),
    write: (filename, data) => invokeChannel("locales:write", filename, data),
    delete: (filename) => invokeChannel("locales:delete", filename),
    rename: (payload) => invokeChannel("locales:rename", payload),
    getFlagDataUrl: (flagCode) => invokeChannel("locales:flags:get-data-url", flagCode),
    writeFlagDataUrl: (payload) => invokeChannel("locales:flags:write-data-url", payload),
    writeFlagFromFile: (payload) => invokeChannel("locales:flags:write-from-file", payload),
    getRepoConfig: () => invokeChannel("locales:repo:get-config"),
    setRepoConfig: (payload) => invokeChannel("locales:repo:set-config", payload),
    fetchRepoCatalog: (payload) => invokeChannel("locales:repo:fetch-catalog", payload),
    installFromRepo: (payload) => invokeChannel("locales:repo:install", payload)
  },
  updates: {
    getState: () => invokeChannel("update:get-state"),
    getConfig: () => invokeChannel("update:get-config"),
    setConfig: (payload) => invokeChannel("update:set-config", payload),
    check: () => invokeChannel("update:check"),
    download: () => invokeChannel("update:download"),
    install: () => invokeChannel("update:install")
  },
  resourcesUpdates: {
    getState: () => invokeChannel("resources:update:get-state"),
    check: () => invokeChannel("resources:update:check"),
    install: () => invokeChannel("resources:update:install"),
    getConfig: () => invokeChannel("resources:update:get-config"),
    setConfig: (payload) => invokeChannel("resources:update:set-config", payload)
  },
  helpDocs: {
    list: (payload) => invokeChannel("help:docs:list", payload),
    get: (payload) => invokeChannel("help:docs:get", payload),
    search: (payload) => invokeChannel("help:docs:search", payload)
  },
  promptScanSubfolders: (folderPath) => invokeChannel("prompt-scan-subfolders", folderPath),
  importPaths: (paths, options) => invokeChannel("import-paths", paths, options),
  createGameShortcut: (gameId) => invokeChannel("create-game-shortcut", gameId),
  getPathForFile: () => ""
};

if (!window.emubro) {
  window.emubro = emubro;
}

window.__emubroDispatchEvent = dispatchEvent;

bindNativeEventBridge().catch(() => {});

export { emubro, dispatchEvent };
