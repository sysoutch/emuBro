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

function runGit(args, cwd = ROOT_DIR) {
  const result = spawnSync('git', args, {
    cwd,
    stdio: 'inherit',
    shell: false
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed with exit code ${result.status}`);
  }
}

function runGitCapture(args, cwd = ROOT_DIR) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    shell: false
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || '').trim() || `git ${args.join(' ')} failed with exit code ${result.status}`);
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
