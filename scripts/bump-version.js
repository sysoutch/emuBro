const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const FILES = [
  path.join(ROOT_DIR, 'package.json'),
  path.join(ROOT_DIR, 'tauri', 'package.json'),
  path.join(ROOT_DIR, 'tauri', 'src-tauri', 'tauri.conf.json')
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  const content = JSON.stringify(data, null, 2) + '\n';
  fs.writeFileSync(filePath, content, 'utf8');
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
}

const arg = process.argv[2];
if (!arg || arg === 'sync') {
  syncVersion();
} else {
  setVersion(arg);
}
