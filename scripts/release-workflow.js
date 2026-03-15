const { execFileSync } = require('child_process');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

function run(command, args, options = {}) {
  const isWindowsCmd = process.platform === 'win32' && /\.cmd$/i.test(String(command || ''));
  const actualCommand = isWindowsCmd ? 'cmd.exe' : command;
  const actualArgs = isWindowsCmd ? ['/c', command, ...args] : args;

  execFileSync(actualCommand, actualArgs, {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    shell: false,
    ...options
  });
}

function runCapture(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: ROOT_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    shell: false,
    ...options
  }).trim();
}

function parseArgs(argv) {
  const parsed = {
    version: '',
    skipBuild: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = String(argv[index] || '').trim();
    if (!value) continue;

    if (value === '--skip-build') {
      parsed.skipBuild = true;
      continue;
    }

    if (value === '--version' || value === '-v') {
      parsed.version = String(argv[index + 1] || '').trim();
      index += 1;
      continue;
    }

    if (!value.startsWith('-') && !parsed.version) {
      parsed.version = value;
    }
  }

  return parsed;
}

function getCurrentVersion() {
  const packageJson = require(path.join(ROOT_DIR, 'package.json'));
  return String(packageJson.version || '').trim();
}

function incrementAlphaVersion(version) {
  const match = String(version || '').trim().match(/^(.*-alpha\.)(\d+)$/i);
  if (!match) {
    throw new Error(
      `Cannot auto-increment version "${version}". Pass an explicit version, for example: npm run release:alpha -- 1.0.0-alpha.33`
    );
  }

  const nextNumber = Number.parseInt(match[2], 10) + 1;
  return `${match[1]}${nextNumber}`;
}

function ensureCleanEnoughForRelease() {
  const status = runCapture('git', ['status', '--short']);
  if (!status) {
    throw new Error('Nothing to release. Working tree is clean.');
  }
}

function ensureTagDoesNotExist(tagName) {
  const existing = runCapture('git', ['tag', '--list', tagName]);
  if (existing) {
    throw new Error(`Tag ${tagName} already exists.`);
  }
}

function getCurrentBranch() {
  return runCapture('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  ensureCleanEnoughForRelease();

  const currentVersion = getCurrentVersion();
  const nextVersion = args.version || incrementAlphaVersion(currentVersion);
  const tagName = `v${nextVersion}`;

  ensureTagDoesNotExist(tagName);

  run('node', ['scripts/bump-version.js', nextVersion]);
  run('node', ['scripts/generate-roadmap-dashboard.js']);

  if (!args.skipBuild) {
    run('cargo', ['check'], { cwd: path.join(ROOT_DIR, 'desktop', 'src-tauri') });
    run('npm.cmd', ['run', 'legacy:build']);
  }

  run('git', ['add', '-A']);
  run('git', ['commit', '-m', `chore: release ${nextVersion}`]);

  const branch = getCurrentBranch();
  run('git', ['push', 'origin', branch]);
  run('git', ['tag', tagName]);
  run('git', ['push', 'origin', tagName]);
}

main();
