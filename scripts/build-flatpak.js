#!/usr/bin/env node

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const buildRoot = path.join(repoRoot, "build", "flatpak");
const appDir = path.join(buildRoot, "app");
const repoDir = path.join(buildRoot, "repo");
const bundlePath = path.join(buildRoot, "emuBro.flatpak");
const manifestPath = path.join(repoRoot, "flatpak", "com.emubro.desktop.yml");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (process.platform !== "linux") {
  console.error("[flatpak] Flatpak builds are supported on Linux only.");
  process.exit(1);
}

if (!fs.existsSync(manifestPath)) {
  console.error(`[flatpak] Manifest not found: ${manifestPath}`);
  process.exit(1);
}

console.log("[flatpak] Checking required tools...");
run("flatpak-builder", ["--version"]);
run("flatpak", ["--version"]);
run("cargo", ["--version"]);

console.log("[flatpak] Building frontend and Rust binary...");
run("npm", ["--prefix", "tauri", "run", "build"]);
run("node", ["scripts/sync-bundle-resources.js"]);

console.log("[flatpak] Building Flatpak repo...");
fs.rmSync(appDir, { recursive: true, force: true });
fs.rmSync(repoDir, { recursive: true, force: true });
fs.mkdirSync(buildRoot, { recursive: true });

run("flatpak-builder", [
  "--force-clean",
  "--repo",
  repoDir,
  appDir,
  manifestPath
]);

console.log("[flatpak] Exporting bundle...");
if (fs.existsSync(bundlePath)) {
  fs.rmSync(bundlePath);
}
run("flatpak", [
  "build-bundle",
  repoDir,
  bundlePath,
  "com.emubro.desktop"
]);

console.log(`[flatpak] Done: ${bundlePath}`);
