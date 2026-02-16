const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const DEFAULT_REPO_URL = 'https://github.com/sysoutch/emubro-resources.git';
const DEFAULT_BRANCH = 'dev-master';
const DEFAULT_TARGET_DIR = 'emubro-resources';

const repoUrl = String(process.env.EMUBRO_RESOURCES_REPO || DEFAULT_REPO_URL).trim();
const branch = String(process.env.EMUBRO_RESOURCES_BRANCH || DEFAULT_BRANCH).trim();
const targetDirRaw = String(process.env.EMUBRO_RESOURCES_DIR || DEFAULT_TARGET_DIR).trim();
const targetDir = path.isAbsolute(targetDirRaw)
  ? path.normalize(targetDirRaw)
  : path.resolve(ROOT_DIR, targetDirRaw);

let _gitExecutable = null;

function _fileExists(p) {
  try {
    return !!p && fs.existsSync(p);
  } catch (_e) {
    return false;
  }
}

function resolveGitExecutable() {
  if (_gitExecutable) return _gitExecutable;

  const envCandidates = [
    process.env.EMUBRO_GIT,
    process.env.GIT_PATH,
    process.env.GIT
  ]
    .map((v) => String(v || '').trim())
    .filter(Boolean);

  for (const c of envCandidates) {
    if (_fileExists(c)) {
      _gitExecutable = c;
      return _gitExecutable;
    }
  }

  // First try PATH resolution ("git"). This should work on most setups.
  {
    const probe = spawnSync('git', ['--version'], { encoding: 'utf8', shell: false });
    if (!probe.error && probe.status === 0) {
      _gitExecutable = 'git';
      return _gitExecutable;
    }
  }

  // Windows: Git is often installed but not on PATH for non-interactive processes.
  if (process.platform === 'win32') {
    const localAppData = String(process.env.LOCALAPPDATA || '').trim();
    const programFiles = String(process.env['ProgramFiles'] || 'C:\\Program Files').trim();
    const programFilesX86 = String(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)').trim();

    const winCandidates = [
      // Standard installers
      path.join(programFiles, 'Git', 'cmd', 'git.exe'),
      path.join(programFiles, 'Git', 'bin', 'git.exe'),
      path.join(programFilesX86, 'Git', 'cmd', 'git.exe'),
      path.join(programFilesX86, 'Git', 'bin', 'git.exe'),
      // Per-user installer (common)
      localAppData ? path.join(localAppData, 'Programs', 'Git', 'cmd', 'git.exe') : '',
      localAppData ? path.join(localAppData, 'Programs', 'Git', 'bin', 'git.exe') : ''
    ].filter(Boolean);

    for (const c of winCandidates) {
      if (_fileExists(c)) {
        _gitExecutable = c;
        return _gitExecutable;
      }
    }
  }

  return null;
}

function runGit(args, cwd = ROOT_DIR) {
  const gitExe = resolveGitExecutable();
  if (!gitExe) {
    throw new Error(
      [
        'git executable not found.',
        'Install Git (Windows: "Git for Windows") or set EMUBRO_GIT to the full path to git.exe, e.g.:',
        '  setx EMUBRO_GIT "C:\\\\Users\\\\<you>\\\\AppData\\\\Local\\\\Programs\\\\Git\\\\cmd\\\\git.exe"'
      ].join(' ')
    );
  }

  // Avoid "detected dubious ownership" when running under a different Windows user (e.g. elevated admin).
  // Passing `-c safe.directory=<path>` is equivalent to `git config --global --add safe.directory <path>`
  // but scoped to this invocation.
  const safeArgs =
    Array.isArray(args) &&
    args.length >= 2 &&
    args[0] === '-C' &&
    path.normalize(String(args[1])) === path.normalize(String(targetDir))
      ? ['-c', `safe.directory=${targetDir}`, ...args]
      : args;

  const result = spawnSync(gitExe, safeArgs, {
    cwd,
    stdio: 'inherit',
    shell: false
  });

  if (result.error) {
    const msg = result.error && result.error.code === 'ENOENT'
      ? `Failed to execute git at '${gitExe}' (ENOENT).`
      : `Failed to execute git at '${gitExe}': ${result.error.message || String(result.error)}`;
    throw new Error(msg);
  }

  if (result.status !== 0) {
    throw new Error(`git ${safeArgs.join(' ')} failed with exit code ${result.status}`);
  }
}

function runGitCapture(args, cwd = ROOT_DIR) {
  const gitExe = resolveGitExecutable();
  if (!gitExe) {
    throw new Error(
      [
        'git executable not found.',
        'Install Git or set EMUBRO_GIT to the full path to git.exe.'
      ].join(' ')
    );
  }

  const safeArgs =
    Array.isArray(args) &&
    args.length >= 2 &&
    args[0] === '-C' &&
    path.normalize(String(args[1])) === path.normalize(String(targetDir))
      ? ['-c', `safe.directory=${targetDir}`, ...args]
      : args;

  const result = spawnSync(gitExe, safeArgs, {
    cwd,
    encoding: 'utf8',
    shell: false
  });

  if (result.error) {
    const msg = result.error && result.error.code === 'ENOENT'
      ? `Failed to execute git at '${gitExe}' (ENOENT).`
      : `Failed to execute git at '${gitExe}': ${result.error.message || String(result.error)}`;
    throw new Error(msg);
  }

  if (result.status !== 0) {
    throw new Error(
      (result.stderr || result.stdout || '').trim() ||
        `git ${safeArgs.join(' ')} failed with exit code ${result.status}`
    );
  }

  return String(result.stdout || '').trim();
}

function cloneRepository(target) {
  if (branch) {
    try {
      runGit(['clone', '--branch', branch, '--single-branch', repoUrl, target]);
      return;
    } catch (e) {
      console.warn(`[sync-emubro-resources] branch '${branch}' unavailable, falling back to default branch: ${e.message}`);
    }
  }

  runGit(['clone', repoUrl, target]);
}

function ensureResourcesSynced() {
  const exists = fs.existsSync(targetDir);
  const isGitRepo = exists && fs.existsSync(path.join(targetDir, '.git'));

  console.log(`[sync-emubro-resources] repo: ${repoUrl}`);
  console.log(`[sync-emubro-resources] branch: ${branch}`);
  console.log(`[sync-emubro-resources] target: ${targetDir}`);

  if (!exists) {
    cloneRepository(targetDir);
    return;
  }

  if (!isGitRepo) {
    const entries = fs.readdirSync(targetDir);
    if (entries.length > 0) {
      throw new Error(`Target directory exists but is not a git repository: ${targetDir}`);
    }

    cloneRepository(targetDir);
    return;
  }

  try {
    runGit(['-C', targetDir, 'remote', 'set-url', 'origin', repoUrl]);
  } catch (_e) {
    runGit(['-C', targetDir, 'remote', 'add', 'origin', repoUrl]);
  }

  runGit(['-C', targetDir, 'fetch', 'origin', '--prune']);

  let useExplicitBranchPull = false;
  if (branch) {
    try {
      runGit(['-C', targetDir, 'checkout', branch]);
      useExplicitBranchPull = true;
    } catch (e) {
      const currentBranch = runGitCapture(['-C', targetDir, 'rev-parse', '--abbrev-ref', 'HEAD']);
      console.warn(`[sync-emubro-resources] branch '${branch}' unavailable, using current branch '${currentBranch}': ${e.message}`);
    }
  }

  if (useExplicitBranchPull) {
    runGit(['-C', targetDir, 'pull', '--ff-only', 'origin', branch]);
  } else {
    runGit(['-C', targetDir, 'pull', '--ff-only']);
  }
}

try {
  ensureResourcesSynced();
  console.log('[sync-emubro-resources] done');
} catch (e) {
  console.error('[sync-emubro-resources] failed:', e.message);
  process.exit(1);
}
