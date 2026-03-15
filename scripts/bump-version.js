const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const FILES = [
  path.join(ROOT_DIR, 'package.json'),
  path.join(ROOT_DIR, 'desktop', 'package.json'),
  path.join(ROOT_DIR, 'desktop', 'src-tauri', 'tauri.conf.json')
];
const CARGO_TOML_PATH = path.join(ROOT_DIR, 'desktop', 'src-tauri', 'Cargo.toml');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  const content = JSON.stringify(data, null, 2) + '\n';
  fs.writeFileSync(filePath, content, 'utf8');
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeText(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

function setCargoPackageVersion(version) {
  const source = readText(CARGO_TOML_PATH);
  const next = source.replace(
    /(\[package\][\s\S]*?\bversion\s*=\s*")([^"]+)(")/,
    `$1${version}$3`
  );

  if (next === source) {
    throw new Error(`Failed to update Cargo package version in ${CARGO_TOML_PATH}`);
  }

  writeText(CARGO_TOML_PATH, next);
}

function getRootVersion() {
  const rootPkg = readJson(FILES[0]);
  return String(rootPkg.version || '').trim();
}

function setVersion(version) {
  if (!version) {
    throw new Error('Missing version argument. Example: node scripts/bump-version.js 1.0.0-alpha.20');
  }

  for (const filePath of FILES) {
    const data = readJson(filePath);
    data.version = version;
    writeJson(filePath, data);
  }

  setCargoPackageVersion(version);
}

function syncVersion() {
  const version = getRootVersion();
  if (!version) {
    throw new Error('Root package.json has no version to sync.');
  }
  for (const filePath of FILES.slice(1)) {
    const data = readJson(filePath);
    data.version = version;
    writeJson(filePath, data);
  }
  setCargoPackageVersion(version);
}

const arg = process.argv[2];
if (!arg || arg === 'sync') {
  syncVersion();
} else {
  setVersion(arg);
}
