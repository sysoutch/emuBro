function compareText(a, b) {
  return String(a || "").localeCompare(String(b || ""), undefined, { sensitivity: "base" });
}

function normalizeTagId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getRowTagIds(row) {
  const rows = Array.isArray(row?.tags) ? row.tags : Array.isArray(row?.raw?.tags) ? row.raw.tags : [];
  const out = [];
  const seen = new Set();
  rows.forEach((tag) => {
    const normalized = normalizeTagId(tag);
    if (!normalized || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    out.push(normalized);
  });
  return out;
}

function toTimestamp(value) {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function mergeGroupedRows(rows) {
  const map = new Map();

  rows.forEach((row) => {
    const key = String(row?.normalizedName || row?.name || "").trim().toLowerCase();
    if (!key) {
      return;
    }

    if (!map.has(key)) {
      map.set(key, {
        ...row,
        groupCount: 1,
        languageCodes: [...(Array.isArray(row.languageCodes) ? row.languageCodes : [])],
        members: [row]
      });
      return;
    }

    const existing = map.get(key);
    existing.groupCount += 1;
    existing.members.push(row);

    const languageSet = new Set([
      ...(Array.isArray(existing.languageCodes) ? existing.languageCodes : []),
      ...(Array.isArray(row.languageCodes) ? row.languageCodes : [])
    ]);
    existing.languageCodes = [...languageSet];

    if (!existing.regionCode && row.regionCode) {
      existing.regionCode = row.regionCode;
    }
    if (!existing.lastPlayed && row.lastPlayed) {
      existing.lastPlayed = row.lastPlayed;
    }
    if (!existing.company && row.company) {
      existing.company = row.company;
    }
  });

  return [...map.values()];
}

function sortRows(rows, sortBy) {
  const next = [...rows];
  next.sort((a, b) => {
    switch (String(sortBy || "name").trim().toLowerCase()) {
      case "rating":
        return Number(b?.rating || 0) - Number(a?.rating || 0) || compareText(a?.name, b?.name);
      case "platform":
        return compareText(a?.platform, b?.platform) || compareText(a?.name, b?.name);
      case "recent":
        return toTimestamp(b?.lastPlayed) - toTimestamp(a?.lastPlayed) || compareText(a?.name, b?.name);
      case "name":
      default:
        return compareText(a?.name, b?.name);
    }
  });
  return next;
}

function getGroupLabel(row, groupBy) {
  switch (String(groupBy || "none").trim().toLowerCase()) {
    case "platform":
      return String(row?.platform || "Unknown").trim() || "Unknown";
    case "company":
      return String(row?.company || "Unknown").trim() || "Unknown";
    case "series":
      return String(row?.series || "Unknown").trim() || "Unknown";
    default:
      return "All Games";
  }
}

export function filterGameRows(rows, filters = {}) {
  const query = String(filters.query || "").trim().toLowerCase();
  const librarySection = String(filters.librarySection || "all").trim().toLowerCase();
  const selectedPlatform = String(filters.selectedPlatform || "all").trim().toLowerCase();
  const selectedLanguage = String(filters.selectedLanguage || "all").trim().toLowerCase();
  const selectedRegion = String(filters.selectedRegion || "all").trim().toLowerCase();
  const activeTagIds = new Set(
    (Array.isArray(filters.activeTagIds) ? filters.activeTagIds : [])
      .map((tagId) => normalizeTagId(tagId))
      .filter(Boolean)
  );
  const sortBy = String(filters.sortBy || "name").trim().toLowerCase();
  const effectiveSortBy = librarySection === "recent" && sortBy === "name" ? "recent" : sortBy;
  const groupSameNames = filters.groupSameNames === true;

  let nextRows = Array.isArray(rows) ? [...rows] : [];

  switch (librarySection) {
    case "suggested":
      // The migrated shell does not expose the legacy LLM suggestion result set yet.
      nextRows = [];
      break;
    case "recent":
      nextRows = nextRows.filter((row) => !!row?.lastPlayed);
      break;
    default:
      break;
  }

  if (selectedPlatform !== "all") {
    nextRows = nextRows.filter((row) => String(row?.platformShortName || "").trim().toLowerCase() === selectedPlatform);
  }

  if (selectedLanguage !== "all") {
    nextRows = nextRows.filter((row) => Array.isArray(row?.languageCodes) && row.languageCodes.includes(selectedLanguage));
  }

  if (selectedRegion !== "all") {
    nextRows = nextRows.filter((row) => String(row?.regionCode || "").trim().toLowerCase() === selectedRegion);
  }

  if (activeTagIds.size > 0) {
    nextRows = nextRows.filter((row) => getRowTagIds(row).some((tagId) => activeTagIds.has(tagId)));
  }

  if (query) {
    nextRows = nextRows.filter((row) => {
      const haystack = [
        row?.name,
        row?.platform,
        row?.company,
        row?.series,
        row?.genre
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");
      return haystack.includes(query);
    });
  }

  nextRows = sortRows(nextRows, effectiveSortBy);

  if (groupSameNames) {
    nextRows = sortRows(mergeGroupedRows(nextRows), effectiveSortBy);
  }

  return nextRows;
}

export function filterEmulatorRows(rows, filters = {}) {
  const query = String(filters.query || "").trim().toLowerCase();
  const selectedPlatform = String(filters.selectedPlatform || "all").trim().toLowerCase();
  const emulatorType = String(filters.emulatorType || "all").trim().toLowerCase();
  const sortBy = String(filters.sortBy || "name").trim().toLowerCase();

  let nextRows = Array.isArray(rows) ? [...rows] : [];

  if (selectedPlatform !== "all") {
    nextRows = nextRows.filter((row) => String(row?.platformShortName || "").trim().toLowerCase() === selectedPlatform);
  }

  if (emulatorType !== "all") {
    nextRows = nextRows.filter((row) => String(row?.type || "").trim().toLowerCase() === emulatorType);
  }

  if (query) {
    nextRows = nextRows.filter((row) => {
      const haystack = [
        row?.name,
        row?.platform,
        row?.type,
        row?.filePath
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");
      return haystack.includes(query);
    });
  }

  nextRows.sort((a, b) => {
    switch (sortBy) {
      case "platform":
        return compareText(a?.platform, b?.platform) || compareText(a?.name, b?.name);
      case "rating":
        return Number(!!b?.installed) - Number(!!a?.installed) || compareText(a?.name, b?.name);
      default:
        return compareText(a?.name, b?.name);
    }
  });

  return nextRows;
}

export function buildGameSections(rows, filters = {}) {
  const selectedGroup = String(filters.selectedGroup || "none").trim().toLowerCase();
  const nextRows = filterGameRows(rows, filters);

  if (selectedGroup === "none") {
    return [
      {
        id: "all-games",
        label: "All Games",
        rows: nextRows
      }
    ];
  }

  const groups = new Map();
  nextRows.forEach((row) => {
    const label = getGroupLabel(row, selectedGroup);
    const key = label.toLowerCase();
    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        label,
        rows: []
      });
    }
    groups.get(key).rows.push(row);
  });

  return [...groups.values()].sort((a, b) => compareText(a.label, b.label));
}
