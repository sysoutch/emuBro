import { getShellStorageAdapter } from "./shell-storage-cache";

const COVER_SOURCE_STORAGE_KEY = "emuBro.coverDownloader.sources.v1";

export const COVER_DEFAULT_SOURCES = Object.freeze({
  psx: "https://raw.githubusercontent.com/xlenore/psx-covers/main/covers/default/${serial}.jpg",
  ps2: "https://raw.githubusercontent.com/xlenore/ps2-covers/main/covers/default/${serial}.jpg"
});

export function normalizeCoverPlatform(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw === "psx" || raw === "ps2") return raw;
  if (raw === "ps1" || raw === "ps") return "psx";
  if (raw === "playstation" || raw === "playstation-1") return "psx";
  if (raw === "playstation2" || raw === "playstation-2") return "ps2";
  return "";
}

export function hasGameSerial(game) {
  const direct = [game?.code, game?.productCode, game?.serial, game?.gameCode];
  if (direct.some((value) => String(value || "").trim())) {
    return true;
  }

  const haystack = `${String(game?.name || "")} ${String(game?.filePath || "")}`.toUpperCase();
  return /\b[A-Z]{4}[-_. ]?\d{3,7}\b/.test(haystack);
}

function normalizeCoverSourceLine(value) {
  const line = String(value || "").trim();
  if (!line) return "";
  if (!/^https?:\/\//i.test(line)) return "";
  if (!line.includes("${serial}")) return "";
  return line;
}

export function parseCoverSourceText(value) {
  const seen = new Set();
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => normalizeCoverSourceLine(line))
    .filter(Boolean)
    .filter((line) => {
      const key = line.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function loadCoverSourceOverrides() {
  try {
    const raw = getShellStorageAdapter().getItem(COVER_SOURCE_STORAGE_KEY);
    if (!raw) {
      return { psx: [], ps2: [] };
    }
    const parsed = JSON.parse(raw);
    return {
      psx: parseCoverSourceText((Array.isArray(parsed?.psx) ? parsed.psx : []).join("\n")),
      ps2: parseCoverSourceText((Array.isArray(parsed?.ps2) ? parsed.ps2 : []).join("\n"))
    };
  } catch (_error) {
    return { psx: [], ps2: [] };
  }
}

export function saveCoverSourceOverrides(value) {
  const normalized = {
    psx: parseCoverSourceText((Array.isArray(value?.psx) ? value.psx : []).join("\n")),
    ps2: parseCoverSourceText((Array.isArray(value?.ps2) ? value.ps2 : []).join("\n"))
  };
  getShellStorageAdapter().setItem(COVER_SOURCE_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function formatCoverDownloadResult(row) {
  const status = String(row?.status || "").trim();
  if (status === "downloaded") return "Downloaded";
  if (status === "reused_existing_file") return "Reused local cover";
  if (status === "skipped_existing_cover") return "Skipped";
  if (status === "missing_serial") return "No serial/code detected for this game.";
  if (status === "not_found") return "No cover found on source repositories.";
  return String(row?.message || "Failed");
}
