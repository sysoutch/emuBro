const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const DESKTOP_SRC_DIR = path.join(ROOT_DIR, "desktop", "src-tauri");
const RELEASE_DIR = path.join(DESKTOP_SRC_DIR, "target", "release");
const EXE_PATH = path.join(RELEASE_DIR, "emuBro.exe");
const BUNDLE_RESOURCES_DIR = path.join(DESKTOP_SRC_DIR, "bundle-resources");
const PORTABLE_ROOT_DIR = path.join(RELEASE_DIR, "bundle", "portable");
const DESKTOP_CONF_PATH = path.join(DESKTOP_SRC_DIR, "tauri.conf.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyDir(src, dest) {
  fs.cpSync(src, dest, {
    recursive: true,
    force: true,
    filter: (entryPath) => path.basename(entryPath) !== ".keep"
  });
}

function copyBundleResourcesFlat(targetDir) {
  if (!fs.existsSync(BUNDLE_RESOURCES_DIR)) {
    console.warn(
      `[build-windows-portable] bundle resources missing at ${BUNDLE_RESOURCES_DIR}`
    );
    return;
  }

  const entries = fs.readdirSync(BUNDLE_RESOURCES_DIR);
  for (const entryName of entries) {
    if (entryName === ".keep") continue;
    const source = path.join(BUNDLE_RESOURCES_DIR, entryName);
    const target = path.join(targetDir, entryName);
    const stat = fs.lstatSync(source);
    if (stat.isDirectory()) {
      copyDir(source, target);
    } else {
      ensureDir(path.dirname(target));
      fs.copyFileSync(source, target);
    }
  }
}

function writeReadme(targetDir) {
  const readmePath = path.join(targetDir, "README-portable.txt");
  const contents = [
    "emuBro portable build",
    "",
    "- Run `emuBro_portable.exe` from this folder.",
    "- Keep this executable and all sibling folders together.",
    "- This package does not install system dependencies for you."
  ].join("\n");
  fs.writeFileSync(readmePath, contents, "utf8");
}

function buildPortable() {
  if (!fs.existsSync(EXE_PATH)) {
    throw new Error(
      `Windows release executable not found. Build first: ${EXE_PATH}`
    );
  }

  const desktopConfig = readJson(DESKTOP_CONF_PATH);
  const version = String(desktopConfig.version || "0.0.0").trim();
  const portableName = `emuBro_${version}_x64_portable`;
  const portableDir = path.join(PORTABLE_ROOT_DIR, portableName);
  const portableExePath = path.join(portableDir, "emuBro_portable.exe");

  fs.rmSync(portableDir, { recursive: true, force: true });
  ensureDir(portableDir);

  fs.copyFileSync(EXE_PATH, portableExePath);
  copyBundleResourcesFlat(portableDir);
  writeReadme(portableDir);

  console.log(`[build-windows-portable] portable dir: ${portableDir}`);
  console.log(`[build-windows-portable] executable: ${portableExePath}`);
}

try {
  buildPortable();
} catch (error) {
  console.error(
    `[build-windows-portable] failed: ${error && error.message ? error.message : error}`
  );
  process.exit(1);
}
