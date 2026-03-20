#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// lazy require (so script still runs if not installed globally)
let chalk;
try {
  chalk = require("chalk");
} catch {
  chalk = { cyan: x => x, gray: x => x, green: x => x, yellow: x => x, red: x => x, blue: x => x };
}

let ignore;
try {
  ignore = require("ignore");
} catch {
  ignore = null;
}

// -------- CONFIG --------
const ROOT_DIR = path.resolve(process.cwd());

const EXCLUDED_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  ".git"
]);

// -------- CLI ARGS --------
const args = process.argv.slice(2);

function getArg(name, def) {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split("=")[1] : def;
}

const MIN_LINES = parseInt(getArg("min", "500"), 10);
const TOP_N = parseInt(getArg("top", "0"), 10);
const EXTENSIONS = new Set(
  getArg("ext", ".js,.ts,.html,.css,.scss,.vue")
    .split(",")
    .map(e => e.trim().toLowerCase())
);

// -------- GITIGNORE --------
function loadIgnore() {
  if (!ignore) return null;

  const ig = ignore();
  const file = path.join(ROOT_DIR, ".gitignore");

  if (fs.existsSync(file)) {
    ig.add(fs.readFileSync(file, "utf8"));
  }

  return ig;
}

const ig = loadIgnore();

// -------- STATE --------
const results = [];
const fileLineCounts = new Map();

// -------- HELPERS --------
function getLineNumbers(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return content.split(/\r?\n/).length;
  } catch {
    return 0;
  }
}

// -------- CORE --------
function walk(dir) {
  let entries;

  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(ROOT_DIR, fullPath);

    if (ig && ig.ignores(relPath)) continue;

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      walk(fullPath);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (!EXTENSIONS.has(ext)) continue;

      const lines = getLineNumbers(fullPath);

      if (lines >= MIN_LINES) {
        results.push(fullPath);
        fileLineCounts.set(fullPath, lines);
      }
    }
  }
}

// -------- RUN --------
console.log(chalk.cyan(`🔍 Scanning: ${ROOT_DIR}`));
console.log(chalk.gray(`Min lines: ${MIN_LINES}`));
console.log("");

walk(ROOT_DIR);

results.sort((a, b) => fileLineCounts.get(b) - fileLineCounts.get(a));

const final = TOP_N > 0 ? results.slice(0, TOP_N) : results;

if (final.length === 0) {
  console.log(chalk.green("✅ No large files found."));
  process.exit(0);
}

for (const file of final) {
  const count = fileLineCounts.get(file);
  const rel = path.relative(ROOT_DIR, file);

  let color = chalk.white;
  let icon = " ";

  if (count >= 1000) {
    color = chalk.red;
    icon = "🔥";
  } else if (count >= 700) {
    color = chalk.yellow;
    icon = "⚠️";
  }

  console.log(
    color(`${icon} ${count.toString().padStart(5)} lines  ${rel}`)
  );
}

console.log("");
console.log(chalk.blue(`📊 Found ${results.length} file(s) ≥ ${MIN_LINES} lines`));