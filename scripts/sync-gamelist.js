const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const DEFAULT_REPO_URL = "https://github.com/sysoutch/gamelist.git";
const DEFAULT_BRANCH = "master";
const DEFAULT_TARGET_DIR = "gamelist";

const repoUrl = String(process.env.EMUBRO_GAMELIST_REPO || DEFAULT_REPO_URL).trim();
const branch = String(process.env.EMUBRO_GAMELIST_BRANCH || DEFAULT_BRANCH).trim();
const targetDirRaw = String(process.env.EMUBRO_GAMELIST_DIR || DEFAULT_TARGET_DIR).trim();
const targetDir = path.isAbsolute(targetDirRaw)
  ? path.normalize(targetDirRaw)
  : path.resolve(ROOT_DIR, targetDirRaw);

let gitExecutable = null;

function fileExists(filePath) {
  try {
    return !!filePath && fs.existsSync(filePath);
  } catch (_error) {
    return false;
  }
}

function resolveGitExecutable() {
  if (gitExecutable) return gitExecutable;

  const envCandidates = [
    process.env.EMUBRO_GIT,
    process.env.GIT_PATH,
    process.env.GIT
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  for (const candidate of envCandidates) {
    if (fileExists(candidate)) {
      gitExecutable = candidate;
      return gitExecutable;
    }
  }

  const probe = spawnSync("git", ["--version"], { encoding: "utf8", shell: false });
  if (!probe.error && probe.status === 0) {
    gitExecutable = "git";
    return gitExecutable;
  }

  if (process.platform === "win32") {
    const localAppData = String(process.env.LOCALAPPDATA || "").trim();
    const programFiles = String(process.env.ProgramFiles || "C:\\Program Files").trim();
    const programFilesX86 = String(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)").trim();
    const windowsCandidates = [
      path.join(programFiles, "Git", "cmd", "git.exe"),
      path.join(programFiles, "Git", "bin", "git.exe"),
      path.join(programFilesX86, "Git", "cmd", "git.exe"),
      path.join(programFilesX86, "Git", "bin", "git.exe"),
      localAppData ? path.join(localAppData, "Programs", "Git", "cmd", "git.exe") : "",
      localAppData ? path.join(localAppData, "Programs", "Git", "bin", "git.exe") : ""
    ].filter(Boolean);

    for (const candidate of windowsCandidates) {
      if (fileExists(candidate)) {
        gitExecutable = candidate;
        return gitExecutable;
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
        "git executable not found.",
        "Install Git (Windows: Git for Windows) or set EMUBRO_GIT to the full path to git.exe."
      ].join(" ")
    );
  }

  const safeArgs =
    Array.isArray(args) &&
    args.length >= 2 &&
    args[0] === "-C" &&
    path.normalize(String(args[1])) === path.normalize(String(targetDir))
      ? ["-c", `safe.directory=${targetDir}`, ...args]
      : args;

  const result = spawnSync(gitExe, safeArgs, {
    cwd,
    stdio: "inherit",
    shell: false
  });

  if (result.error) {
    const message = result.error && result.error.code === "ENOENT"
      ? `Failed to execute git at '${gitExe}' (ENOENT).`
      : `Failed to execute git at '${gitExe}': ${result.error.message || String(result.error)}`;
    throw new Error(message);
  }

  if (result.status !== 0) {
    throw new Error(`git ${safeArgs.join(" ")} failed with exit code ${result.status}`);
  }
}

function runGitCapture(args, cwd = ROOT_DIR) {
  const gitExe = resolveGitExecutable();
  if (!gitExe) {
    throw new Error("git executable not found. Install Git or set EMUBRO_GIT.");
  }

  const safeArgs =
    Array.isArray(args) &&
    args.length >= 2 &&
    args[0] === "-C" &&
    path.normalize(String(args[1])) === path.normalize(String(targetDir))
      ? ["-c", `safe.directory=${targetDir}`, ...args]
      : args;

  const result = spawnSync(gitExe, safeArgs, {
    cwd,
    encoding: "utf8",
    shell: false
  });

  if (result.error) {
    const message = result.error && result.error.code === "ENOENT"
      ? `Failed to execute git at '${gitExe}' (ENOENT).`
      : `Failed to execute git at '${gitExe}': ${result.error.message || String(result.error)}`;
    throw new Error(message);
  }

  if (result.status !== 0) {
    throw new Error(
      (result.stderr || result.stdout || "").trim() ||
      `git ${safeArgs.join(" ")} failed with exit code ${result.status}`
    );
  }

  return String(result.stdout || "").trim();
}

function cloneRepository(target) {
  if (branch) {
    try {
      runGit(["clone", "--branch", branch, "--single-branch", repoUrl, target]);
      return;
    } catch (error) {
      console.warn(`[sync-gamelist] branch '${branch}' unavailable, falling back to default branch: ${error.message}`);
    }
  }
  runGit(["clone", repoUrl, target]);
}

function ensureGamelistSynced() {
  const exists = fs.existsSync(targetDir);
  const isGitRepo = exists && fs.existsSync(path.join(targetDir, ".git"));

  console.log(`[sync-gamelist] repo: ${repoUrl}`);
  console.log(`[sync-gamelist] branch: ${branch}`);
  console.log(`[sync-gamelist] target: ${targetDir}`);

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
    runGit(["-C", targetDir, "remote", "set-url", "origin", repoUrl]);
  } catch (_error) {
    runGit(["-C", targetDir, "remote", "add", "origin", repoUrl]);
  }

  runGit(["-C", targetDir, "fetch", "origin", "--prune"]);

  let pullFromExplicitBranch = false;
  if (branch) {
    try {
      runGit(["-C", targetDir, "checkout", branch]);
      pullFromExplicitBranch = true;
    } catch (error) {
      const currentBranch = runGitCapture(["-C", targetDir, "rev-parse", "--abbrev-ref", "HEAD"]);
      console.warn(`[sync-gamelist] branch '${branch}' unavailable, using current branch '${currentBranch}': ${error.message}`);
    }
  }

  if (pullFromExplicitBranch) {
    runGit(["-C", targetDir, "pull", "--ff-only", "origin", branch]);
  } else {
    runGit(["-C", targetDir, "pull", "--ff-only"]);
  }
}

try {
  ensureGamelistSynced();
  console.log("[sync-gamelist] done");
} catch (error) {
  console.error("[sync-gamelist] failed:", error.message);
  process.exit(1);
}
