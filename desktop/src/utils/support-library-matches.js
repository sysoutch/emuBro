export function inferSupportLibraryIntent({
  issueSummary = "",
  platform = "",
  emulator = ""
} = {}) {
  const issueText = String(issueSummary || "").trim();
  const platformText = String(platform || "").trim();
  const emulatorText = String(emulator || "").trim();
  if (!issueText && !platformText && !emulatorText) {
    return {
      active: false,
      reason: "empty"
    };
  }
  return {
    active: false,
    reason: "task-driven"
  };
}

function summarizeCatalogRows(rows, kind, limit = 220) {
  return (Array.isArray(rows) ? rows : [])
    .slice()
    .sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")))
    .slice(0, limit)
    .map((row) => ({
      id: Number(row?.id || 0),
      key: String(row?.key || "").trim(),
      kind,
      name: String(row?.name || "").trim(),
      platform: String(row?.platform || row?.platformShortName || "").trim(),
      platformShortName: String(row?.platformShortName || "").trim(),
      tags: kind === "game"
        ? (Array.isArray(row?.tags)
          ? row.tags.map((value) => String(value || "").trim()).filter(Boolean)
          : [])
        : [],
      tagLabels: kind === "game"
        ? (Array.isArray(row?.tagLabels)
          ? row.tagLabels.map((value) => String(value || "").trim()).filter(Boolean)
          : [])
        : [],
      installed: kind === "emulator" ? !!(row?.isInstalled ?? row?.installed) : undefined,
      isInstalled: kind === "emulator" ? !!(row?.isInstalled ?? row?.installed) : undefined,
      filePath: kind === "emulator" ? String(row?.filePath || "").trim() : "",
      filePaths: kind === "emulator"
        ? (Array.isArray(row?.filePaths)
          ? row.filePaths.map((value) => String(value || "").trim()).filter(Boolean)
          : [])
        : [],
      type: kind === "emulator" ? String(row?.type || "").trim() : ""
    }))
    .filter((row) => row.name);
}

function buildPlatformCounts(rows = []) {
  const counter = new Map();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const platform = String(row?.platform || row?.platformShortName || "").trim();
    if (!platform) return;
    counter.set(platform, Number(counter.get(platform) || 0) + 1);
  });
  return Array.from(counter.entries())
    .map(([platform, count]) => ({ platform, count }))
    .sort((a, b) => b.count - a.count || a.platform.localeCompare(b.platform))
    .slice(0, 40);
}

export function resolveSupportLibraryMatches({
  games = [],
  emulators = [],
  issueSummary = "",
  platform = "",
  emulator = ""
} = {}) {
  const intent = inferSupportLibraryIntent({ issueSummary, platform, emulator });
  return {
    active: false,
    reason: intent.reason,
    query: "",
    games: [],
    emulators: [],
    gameCount: 0,
    emulatorCount: 0,
    catalog: {
      gameTotal: Array.isArray(games) ? games.length : 0,
      emulatorTotal: Array.isArray(emulators) ? emulators.length : 0,
      gamePlatforms: buildPlatformCounts(games),
      emulatorPlatforms: buildPlatformCounts(emulators),
      games: summarizeCatalogRows(games, "game"),
      emulators: summarizeCatalogRows(emulators, "emulator")
    }
  };
}
