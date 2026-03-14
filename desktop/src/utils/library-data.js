const LANGUAGE_TOKEN_TO_CODE = new Map([
  ["english", "en"],
  ["eng", "en"],
  ["en", "en"],
  ["german", "de"],
  ["deutsch", "de"],
  ["ger", "de"],
  ["deu", "de"],
  ["de", "de"],
  ["french", "fr"],
  ["fra", "fr"],
  ["fre", "fr"],
  ["francais", "fr"],
  ["fr", "fr"],
  ["spanish", "es"],
  ["espanol", "es"],
  ["spa", "es"],
  ["esp", "es"],
  ["es", "es"],
  ["italian", "it"],
  ["ita", "it"],
  ["it", "it"],
  ["japanese", "jp"],
  ["jpn", "jp"],
  ["jp", "jp"],
  ["ja", "jp"],
  ["portuguese", "pt"],
  ["por", "pt"],
  ["pt", "pt"],
  ["dutch", "nl"],
  ["nederlands", "nl"],
  ["nld", "nl"],
  ["nl", "nl"],
  ["swedish", "sv"],
  ["svenska", "sv"],
  ["swe", "sv"],
  ["sv", "sv"],
  ["norwegian", "no"],
  ["norsk", "no"],
  ["nor", "no"],
  ["no", "no"],
  ["danish", "da"],
  ["dansk", "da"],
  ["dan", "da"],
  ["da", "da"],
  ["finnish", "fi"],
  ["suomi", "fi"],
  ["fin", "fi"],
  ["fi", "fi"],
  ["polish", "pl"],
  ["polski", "pl"],
  ["pol", "pl"],
  ["pl", "pl"],
  ["russian", "ru"],
  ["rus", "ru"],
  ["ru", "ru"],
  ["turkish", "tr"],
  ["tur", "tr"],
  ["tr", "tr"],
  ["czech", "cs"],
  ["cze", "cs"],
  ["ces", "cs"],
  ["cs", "cs"],
  ["hungarian", "hu"],
  ["hun", "hu"],
  ["hu", "hu"],
  ["korean", "ko"],
  ["kor", "ko"],
  ["ko", "ko"],
  ["chinese", "zh"],
  ["chi", "zh"],
  ["zho", "zh"],
  ["zh", "zh"],
  ["cn", "zh"]
]);

const REGION_PREFIX_TO_CODE = new Map([
  ["SLES", "eu"],
  ["SCES", "eu"],
  ["BLES", "eu"],
  ["BCES", "eu"],
  ["NPEB", "eu"],
  ["NLES", "eu"],
  ["ULES", "eu"],
  ["SLUS", "us"],
  ["SCUS", "us"],
  ["BLUS", "us"],
  ["BCUS", "us"],
  ["NPUB", "us"],
  ["NPUA", "us"],
  ["ULUS", "us"],
  ["SLPS", "jp"],
  ["SCPS", "jp"],
  ["BLJS", "jp"],
  ["BCJS", "jp"],
  ["NPJB", "jp"],
  ["ULJM", "jp"],
  ["SLPM", "jp"]
]);

export function slugify(value, fallback = "item") {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

export function pickRowLabel(row, fallback) {
  if (!row || typeof row !== "object") {
    return fallback;
  }

  return String(
    row.title ||
      row.name ||
      row.displayName ||
      row.label ||
      row.fileName ||
      row.filename ||
      row.id ||
      fallback
  ).trim();
}

function getBracketedNameSegments(value) {
  const text = String(value || "");
  if (!text) return [];

  const segments = [];
  const regex = /[\(\[\{]([^()\[\]{}]+)[\)\]\}]/g;
  let match = null;
  while ((match = regex.exec(text)) !== null) {
    const segment = String(match[1] || "").trim();
    if (segment) {
      segments.push(segment);
    }
  }
  return segments;
}

export function stripBracketedTitleParts(value) {
  let text = String(value || "").trim();
  if (!text) return "";

  let previous = "";
  while (previous !== text) {
    previous = text;
    text = text.replace(/\s*[\(\[\{][^()\[\]{}]*[\)\]\}]\s*/g, " ");
  }
  return text.replace(/\s+/g, " ").trim();
}

export function normalizeNameKey(value) {
  return stripBracketedTitleParts(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getGameCompanyValue(game) {
  const raw = game?.company || game?.publisher || game?.developer || game?.studio || game?.manufacturer;
  const text = String(raw || "").trim();
  return text || "Unknown";
}

export function getLanguageCodesFromNameBrackets(game) {
  const segments = getBracketedNameSegments(game?.name);
  const codes = new Set();

  segments.forEach((segment) => {
    const normalized = String(segment || "")
      .toLowerCase()
      .replace(/[-_/|,;+&]+/g, " ")
      .replace(/[^a-z0-9\s]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!normalized) {
      return;
    }

    normalized.split(" ").forEach((token) => {
      const code = LANGUAGE_TOKEN_TO_CODE.get(token);
      if (code) {
        codes.add(code);
      }
    });
  });

  return [...codes];
}

function inferGameCodeForRegion(game) {
  const direct = game?.code || game?.productCode || game?.serial || game?.gameCode;
  if (direct) {
    return String(direct).trim();
  }

  const fileName = String(game?.filePath || "").trim().split(/[/\\]/).pop() || "";
  const haystack = `${String(game?.name || "")} ${fileName}`.toUpperCase();
  const match = haystack.match(/\b([A-Z]{4})[-_ ]?(\d{3})[.\-_ ]?(\d{2})\b|\b([A-Z]{4})[-_ ]?(\d{5})\b/);
  if (!match) {
    return "";
  }
  if (match[1] && match[2] && match[3]) {
    return `${match[1]}-${match[2]}${match[3]}`;
  }
  if (match[4] && match[5]) {
    return `${match[4]}-${match[5]}`;
  }
  return "";
}

export function getRegionCodeFromGame(game) {
  const directCode = inferGameCodeForRegion(game);
  if (directCode) {
    const letters = String(directCode).toUpperCase().replace(/[^A-Z]/g, "");
    const prefix = letters.slice(0, 4);
    const mapped = REGION_PREFIX_TO_CODE.get(prefix);
    if (mapped) {
      return mapped;
    }
  }

  const segments = getBracketedNameSegments(game?.name);
  for (const segment of segments) {
    const normalized = String(segment || "")
      .toLowerCase()
      .replace(/[_/|,;+&-]+/g, " ")
      .replace(/[^a-z0-9\s]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!normalized) continue;
    if (normalized === "e" || normalized === "eu") return "eu";
    if (normalized === "u" || normalized === "us" || normalized === "usa") return "us";
    if (normalized === "j" || normalized === "jp") return "jp";
    if (/\b(europe|eur|eu|pal)\b/.test(normalized)) return "eu";
    if (/\b(usa|us|north america|na|ntsc u|ntscu)\b/.test(normalized)) return "us";
    if (/\b(japan|jpn|jp|ntsc j|ntscj)\b/.test(normalized)) return "jp";
  }

  return "";
}

export function deriveSeriesName(value) {
  const base = stripBracketedTitleParts(value);
  if (!base) {
    return "Unknown";
  }

  const match = base.match(/^(.+?)(?:\s*[:-]\s+|\s+\d+$)/);
  const candidate = String(match?.[1] || base).trim();
  return candidate || base;
}

export function buildPlatformLogoPath(platformShortName) {
  const key = slugify(platformShortName || "unknown", "unknown");
  return `emubro-resources/platforms/${key}/logos/default.png`;
}

export function buildGameImagePath(game) {
  const direct = String(game?.image || game?.coverImage || "").trim();
  if (direct) {
    return direct;
  }
  const key = slugify(game?.platformShortName || game?.platform || "unknown", "unknown");
  return `emubro-resources/platforms/${key}/covers/default.jpg`;
}

function pickRecentTimestamp(row) {
  return String(
    row?.lastPlayed ||
      row?.updatedAt ||
      row?.addedAt ||
      row?.createdAt ||
      row?.created ||
      row?.dateAdded ||
      ""
  ).trim();
}

function normalizeNumericId(value, fallback) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric;
  }
  return fallback;
}

export function normalizePlatformOption(row, index = 0) {
  if (!row || typeof row !== "object") {
    return null;
  }

  const label =
    row.displayName ||
    row.name ||
    row.platform ||
    row.platformName ||
    row.label ||
    row.shortName ||
    row.id ||
    `Platform ${index + 1}`;

  const idSeed =
    row.shortName ||
    row.platformShortName ||
    row.id ||
    row.slug ||
    row.code ||
    label;

  return {
    id: slugify(idSeed, `platform-${index + 1}`),
    shortName: slugify(idSeed, `platform-${index + 1}`),
    label: String(label).trim()
  };
}

export function normalizeLocaleOption(row, index = 0) {
  if (!row || typeof row !== "object") {
    return null;
  }

  const code = String(row.code || row.id || `lang-${index + 1}`)
    .trim()
    .toLowerCase();
  const wrapped = row.data && typeof row.data === "object" ? row.data[code] : null;
  const label =
    wrapped?.language?.name ||
    wrapped?.language?.english ||
    row.label ||
    code.toUpperCase();

  return {
    id: code || `lang-${index + 1}`,
    code: code || `lang-${index + 1}`,
    label: String(label).trim(),
    source: String(row.source || "app").trim() || "app",
    canRename: row.canRename === true,
    canDelete: row.canDelete === true
  };
}

export function normalizeGameRow(row, index = 0) {
  const name = pickRowLabel(row, `Game ${index + 1}`);
  const platformShortName = slugify(
    row?.platformShortName || row?.shortName || row?.platform || "unknown",
    "unknown"
  );

  return {
    id: normalizeNumericId(row?.id, index + 1),
    key: String(row?.id || row?.filePath || row?.path || `${platformShortName}:${index}`),
    raw: row,
    name,
    normalizedName: normalizeNameKey(name),
    company: getGameCompanyValue(row),
    series: deriveSeriesName(name),
    platform: String(row?.platform || row?.platformName || row?.platformShortName || "Unknown").trim(),
    platformShortName,
    genre: String(row?.genre || "Unknown").trim() || "Unknown",
    description: String(row?.description || row?.summary || row?.overview || "").trim(),
    rating: Number(row?.rating || 0),
    isInstalled: Boolean(row?.isInstalled ?? row?.installed ?? row?.filePath ?? row?.path),
    image: buildGameImagePath(row),
    platformLogo: buildPlatformLogoPath(platformShortName),
    filePath: String(row?.filePath || row?.path || "").trim(),
    emulatorOverridePath: String(row?.emulatorOverridePath || "").trim(),
    runAsMode: String(row?.runAsMode || "default").trim().toLowerCase(),
    runAsUser: String(row?.runAsUser || "").trim(),
    lastPlayed: pickRecentTimestamp(row),
    regionCode: getRegionCodeFromGame(row),
    languageCodes: getLanguageCodesFromNameBrackets(row),
    tags: Array.isArray(row?.tags) ? row.tags.map((tag) => String(tag || "").trim()).filter(Boolean) : []
  };
}

export function normalizeEmulatorRow(row, index = 0) {
  const name = pickRowLabel(row, `Emulator ${index + 1}`);
  const platformShortName = slugify(
    row?.platformShortName || row?.platform || row?.shortName || "unknown",
    "unknown"
  );
  const filePaths = Array.isArray(row?.filePaths)
    ? row.filePaths.map((value) => String(value || "").trim()).filter(Boolean)
    : [];
  const filePath = String(row?.filePath || row?.path || filePaths[0] || "").trim();
  const website = String(row?.website || "").trim();
  const downloadUrl = typeof row?.downloadUrl === "string" ? String(row.downloadUrl || "").trim() : "";

  return {
    id: normalizeNumericId(row?.id, index + 1),
    key: String(row?.id || row?.name || `${platformShortName}:${index}`),
    raw: row,
    name,
    description: String(row?.description || row?.summary || row?.overview || "").trim(),
    platform: String(row?.platform || row?.platformShortName || "Unknown").trim(),
    platformShortName,
    platformLogo: buildPlatformLogoPath(platformShortName),
    type: String(row?.type || row?.emulatorType || "standalone").trim() || "standalone",
    icon: String(row?.image || row?.icon || buildPlatformLogoPath(platformShortName)).trim(),
    website: website || downloadUrl,
    downloadUrl,
    filePath,
    filePaths: filePaths.length ? filePaths : (filePath ? [filePath] : []),
    args: String(row?.args || row?.launchArgs || row?.startParameters || "").trim(),
    startParameters: String(row?.startParameters || "").trim(),
    searchString: String(row?.searchString || "").trim(),
    workingDirectory: String(row?.workingDirectory || "").trim(),
    gamepadBindings: row?.gamepadBindings || {},
    downloadLinks: row?.downloadLinks || null,
    archiveFileMatchWin: String(row?.archiveFileMatchWin || "").trim(),
    archiveFileMatchLinux: String(row?.archiveFileMatchLinux || "").trim(),
    archiveFileMatchMac: String(row?.archiveFileMatchMac || "").trim(),
    setupFileMatchWin: String(row?.setupFileMatchWin || "").trim(),
    setupFileMatchLinux: String(row?.setupFileMatchLinux || "").trim(),
    setupFileMatchMac: String(row?.setupFileMatchMac || "").trim(),
    executableFileMatchWin: String(row?.executableFileMatchWin || "").trim(),
    executableFileMatchLinux: String(row?.executableFileMatchLinux || "").trim(),
    executableFileMatchMac: String(row?.executableFileMatchMac || "").trim(),
    installers: row?.installers || null,
    installed: Boolean(row?.installed ?? row?.isInstalled ?? filePath)
  };
}
