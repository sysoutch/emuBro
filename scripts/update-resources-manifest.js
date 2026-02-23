#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

function parseArgs(argv = []) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = String(argv[i] || "").trim();
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !String(next).startsWith("--")) {
      out[key] = String(next);
      i += 1;
    } else {
      out[key] = "true";
    }
  }
  return out;
}

function toPosix(relPath) {
  return String(relPath || "").replace(/\\/g, "/");
}

function encodeRawPath(relPath) {
  return toPosix(relPath)
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function normalizeVersion(value) {
  const raw = String(value || "").trim();
  return raw;
}

function bumpVersion(previousValue) {
  const prev = normalizeVersion(previousValue);
  if (!prev) return "1";
  if (/^\d+$/.test(prev)) {
    return String(Number.parseInt(prev, 10) + 1);
  }
  const semver = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;
  const match = prev.match(semver);
  if (!match) return prev;

  const major = Number.parseInt(match[1], 10);
  const minor = Number.parseInt(match[2], 10);
  const patch = Number.parseInt(match[3], 10);
  const prerelease = String(match[4] || "");
  if (!prerelease) return `${major}.${minor}.${patch + 1}`;

  const preMatch = prerelease.match(/^(.*?)(\d+)$/);
  if (!preMatch) return `${major}.${minor}.${patch + 1}`;
  const prePrefix = preMatch[1];
  const preNumber = Number.parseInt(preMatch[2], 10);
  return `${major}.${minor}.${patch}-${prePrefix}${preNumber + 1}`;
}

function collectFiles(baseDir, relDir, out, excludes) {
  const absDir = path.join(baseDir, relDir);
  const entries = fs.readdirSync(absDir, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name, "en"));

  for (const entry of entries) {
    const relPath = toPosix(path.join(relDir, entry.name));
    const normalizedName = String(entry.name || "").trim();
    if (!normalizedName) continue;
    if (normalizedName === ".git" || normalizedName === ".github" || normalizedName === "node_modules") continue;
    if (normalizedName.startsWith(".") && normalizedName !== ".keep") continue;
    if (excludes.has(relPath.toLowerCase())) continue;

    const absPath = path.join(baseDir, relPath);
    if (entry.isDirectory()) {
      collectFiles(baseDir, relPath, out, excludes);
      continue;
    }
    if (!entry.isFile()) continue;
    out.push(relPath);
  }
}

function readExistingManifest(manifestPath) {
  try {
    if (!fs.existsSync(manifestPath)) return null;
    const raw = fs.readFileSync(manifestPath, "utf8");
    const parsed = JSON.parse(String(raw || "{}"));
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch (_error) {
    return null;
  }
}

function run() {
  const args = parseArgs(process.argv.slice(2));
  const repoDir = path.resolve(String(args.repo || "emubro-resources"));
  const owner = String(args.owner || "sysoutch").trim();
  const repoName = String(args["repo-name"] || "emubro-resources").trim();
  const branch = String(args.branch || "main").trim();
  const manifestPath = path.join(repoDir, "manifest.json");

  if (!fs.existsSync(repoDir) || !fs.statSync(repoDir).isDirectory()) {
    throw new Error(`Repository directory not found: ${repoDir}`);
  }

  const existing = readExistingManifest(manifestPath);
  const manifestName = String(args.name || existing?.name || "emuBro Resources").trim() || "emuBro Resources";
  const requestedVersion = normalizeVersion(args.version || "");
  const nextVersion = requestedVersion || bumpVersion(existing?.version);
  const rawBaseUrl = `https://raw.githubusercontent.com/${owner}/${repoName}/${branch}`;

  const excludes = new Set([
    "manifest.json",
    ".gitignore",
    "readme.md"
  ]);
  const files = [];
  collectFiles(repoDir, "", files, excludes);

  const manifest = {
    name: manifestName,
    version: /^\d+$/.test(nextVersion) ? Number.parseInt(nextVersion, 10) : nextVersion,
    generatedAt: new Date().toISOString(),
    source: {
      owner,
      repo: repoName,
      branch
    },
    files: files.map((relPath) => ({
      path: relPath,
      url: `${rawBaseUrl}/${encodeRawPath(relPath)}`
    }))
  };

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`[resources-manifest] wrote ${manifest.files.length} files`);
  console.log(`[resources-manifest] version: ${manifest.version}`);
  console.log(`[resources-manifest] path: ${manifestPath}`);
}

try {
  run();
} catch (error) {
  console.error(`[resources-manifest] failed: ${error?.message || error}`);
  process.exit(1);
}
