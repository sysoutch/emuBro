const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const TAURI_DIR = path.join(ROOT_DIR, "tauri");
const INSTALL_ROOT = path.join(ROOT_DIR, ".cache", "tauri-portable-appimage-cli");
const INSTALL_BIN_DIR = path.join(
  INSTALL_ROOT,
  process.platform === "win32" ? "" : "bin"
);
const BRANCH = "feat/truly-portable-appimage";
const REPO_URL = "https://github.com/tauri-apps/tauri";

function fail(message) {
  console.error(`[portable-appimage] ${message}`);
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options
  });

  if (typeof result.status === "number" && result.status === 0) {
    return;
  }

  fail(`Command failed: ${command} ${args.join(" ")}`);
}

function ensureInstallRoot() {
  fs.mkdirSync(INSTALL_ROOT, { recursive: true });
}

function cargoTauriBinary() {
  if (process.platform === "win32") {
    return path.join(INSTALL_ROOT, "cargo-tauri.exe");
  }
  return path.join(INSTALL_BIN_DIR, "cargo-tauri");
}

function installExperimentalCli() {
  ensureInstallRoot();
  console.log(
    `[portable-appimage] Installing tauri-cli from ${REPO_URL}#${BRANCH}`
  );
  run("cargo", [
    "install",
    "tauri-cli",
    "--git",
    REPO_URL,
    "--branch",
    BRANCH,
    "--force",
    "--root",
    INSTALL_ROOT
  ]);
}

function showCliVersion(binaryPath, env) {
  console.log("[portable-appimage] Installed CLI version:");
  run(binaryPath, ["--version"], { env });
}

function buildPortableAppImage(binaryPath, env, extraArgs) {
  const args = ["build", "--bundles", "appimage", ...extraArgs];
  console.log(
    "[portable-appimage] Building AppImage with TAURI_BUNDLER_NEW_APPIMAGE_FORMAT=true"
  );
  run(binaryPath, args, {
    cwd: TAURI_DIR,
    env
  });
}

function main() {
  if (process.platform !== "linux") {
    fail("This script must be run on Linux.");
  }

  installExperimentalCli();

  const binaryPath = cargoTauriBinary();
  const env = {
    ...process.env,
    TAURI_BUNDLER_NEW_APPIMAGE_FORMAT: "true",
    PATH: `${INSTALL_BIN_DIR}${path.delimiter}${process.env.PATH || ""}`
  };
  const extraArgs = process.argv.slice(2);

  showCliVersion(binaryPath, env);
  buildPortableAppImage(binaryPath, env, extraArgs);
}

main();
