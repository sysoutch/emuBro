const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const TARGET_DIR = path.join(ROOT_DIR, 'tauri', 'src-tauri', 'bundle-resources');

const SOURCES = [
  { name: 'locales', path: path.join(ROOT_DIR, 'locales') },
  { name: 'emubro-resources', path: path.join(ROOT_DIR, 'emubro-resources') },
  { name: 'gamelist', path: path.join(ROOT_DIR, 'gamelist') },
  { name: 'community-themes', path: path.join(ROOT_DIR, 'community-themes') },
  { name: 'assets', path: path.join(ROOT_DIR, 'assets') },
  { name: path.join('dist', 'legacy'), path: path.join(ROOT_DIR, 'dist', 'legacy') }
];

function exists(p) {
  try {
    return fs.existsSync(p);
  } catch (_e) {
    return false;
  }
}

function copyDir(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, {
    recursive: true,
    filter: (srcPath) => {
      const base = path.basename(srcPath);
      if (base === '.git') return false;
      if (base === '.github') return false;
      return true;
    }
  });
}

function syncResources() {
  if (exists(TARGET_DIR)) {
    fs.rmSync(TARGET_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TARGET_DIR, { recursive: true });

  const copied = [];
  for (const entry of SOURCES) {
    if (!exists(entry.path)) {
      continue;
    }
    const dest = path.join(TARGET_DIR, entry.name);
    copyDir(entry.path, dest);
    copied.push(entry.name);
  }

  const keepFile = path.join(TARGET_DIR, '.keep');
  if (!exists(keepFile)) {
    fs.writeFileSync(keepFile, 'bundle resources placeholder\n', 'utf8');
  }

  console.log(`[sync-bundle-resources] target: ${TARGET_DIR}`);
  console.log(
    copied.length
      ? `[sync-bundle-resources] copied: ${copied.join(', ')}`
      : '[sync-bundle-resources] no sources found to copy'
  );
}

syncResources();
