const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const TAURI_DIR = path.join(ROOT_DIR, "tauri");
const TAURI_CONF_PATH = path.join(TAURI_DIR, "src-tauri", "tauri.conf.json");

function readTauriVersion() {
  try {
    const raw = fs.readFileSync(TAURI_CONF_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return String(parsed.version || "").trim();
  } catch (_error) {
    return "";
  }
}

function splitPreReleaseIdentifiers(version) {
  const normalized = String(version || "").trim();
  const dashIndex = normalized.indexOf("-");
  if (dashIndex < 0) return [];
  const plusIndex = normalized.indexOf("+", dashIndex + 1);
  const preRelease = normalized.slice(
    dashIndex + 1,
    plusIndex >= 0 ? plusIndex : normalized.length
  );
  return preRelease
    .split(".")
    .map((segment) => String(segment || "").trim())
    .filter(Boolean);
}

function isNumericMsiPreRelease(version) {
  const segments = splitPreReleaseIdentifiers(version);
  if (segments.length === 0) return true;
  return segments.every((segment) => {
    if (!/^\d+$/.test(segment)) return false;
    const value = Number.parseInt(segment, 10);
    return Number.isFinite(value) && value >= 0 && value <= 65535;
  });
}

function hasExplicitBundlesArg(args) {
  return args.some((value) => {
    const text = String(value || "").trim();
    return text === "--bundles" || text.startsWith("--bundles=");
  });
}

function runTauriBuild() {
  const userArgs = process.argv.slice(2);
  const isWindows = process.platform === "win32";
  const version = readTauriVersion();
  const hasExplicitBundles = hasExplicitBundlesArg(userArgs);
  const forceNsisOnly =
    isWindows &&
    !hasExplicitBundles &&
    splitPreReleaseIdentifiers(version).length > 0 &&
    !isNumericMsiPreRelease(version);

  const args = ["build", ...userArgs];
  if (forceNsisOnly) {
    args.push("--bundles", "nsis");
    console.log(
      `[tauri-build] Windows prerelease version ${version} detected, using --bundles nsis to avoid MSI version restriction.`
    );
  }

  const result = spawnSync("tauri", args, {
    cwd: TAURI_DIR,
    stdio: "inherit",
    shell: true
  });

  if (typeof result.status === "number") {
    process.exit(result.status);
  }
  process.exit(1);
}

runTauriBuild();
