const fs = require("fs");
const path = require("path");
const vm = require("vm");

const REPO_ROOT = path.resolve(__dirname, "..");
const DESKTOP_SRC_ROOT = path.join(REPO_ROOT, "desktop", "src");
const EN_LOCALE_PATH = path.join(REPO_ROOT, "locales", "en.json");
const SHELL_FALLBACK_PATH = path.join(REPO_ROOT, "desktop", "src", "utils", "shell-i18n-fallback.js");

const TARGET_KEY_PATTERN = /^(desktopShell|common)\./;
const FILE_EXTENSIONS = new Set([".js", ".vue"]);

function walkFiles(rootDir) {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === "dist" || entry.name === "node_modules") {
      continue;
    }

    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
      continue;
    }

    if (FILE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

function decodeJsString(raw) {
  const quote = raw[0];
  if (quote === "\"") {
    return JSON.parse(raw);
  }

  if (quote === "'") {
    const body = raw
      .slice(1, -1)
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\r/g, "\\r")
      .replace(/\n/g, "\\n")
      .replace(/\t/g, "\\t")
      .replace(/\f/g, "\\f")
      .replace(/\b/g, "\\b");
    return JSON.parse(`"${body}"`);
  }

  return raw;
}

function splitArgs(source) {
  const args = [];
  let current = "";
  let depthParen = 0;
  let depthBrace = 0;
  let depthBracket = 0;
  let stringQuote = "";
  let inTemplate = false;
  let templateExprDepth = 0;
  let escape = false;

  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];
    current += ch;

    if (stringQuote) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === stringQuote) {
        stringQuote = "";
      }
      continue;
    }

    if (inTemplate) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (templateExprDepth > 0) {
        if (ch === "{") templateExprDepth += 1;
        else if (ch === "}") templateExprDepth -= 1;
        continue;
      }
      if (ch === "$" && next === "{") {
        current += next;
        i += 1;
        templateExprDepth = 1;
        continue;
      }
      if (ch === "`") {
        inTemplate = false;
      }
      continue;
    }

    if (ch === "\"" || ch === "'") {
      stringQuote = ch;
      continue;
    }
    if (ch === "`") {
      inTemplate = true;
      continue;
    }
    if (ch === "(") depthParen += 1;
    else if (ch === ")") depthParen -= 1;
    else if (ch === "{") depthBrace += 1;
    else if (ch === "}") depthBrace -= 1;
    else if (ch === "[") depthBracket += 1;
    else if (ch === "]") depthBracket -= 1;
    else if (ch === "," && depthParen === 0 && depthBrace === 0 && depthBracket === 0) {
      args.push(current.slice(0, -1).trim());
      current = "";
    }
  }

  if (current.trim()) {
    args.push(current.trim());
  }

  return args;
}

function findCallEnd(text, startIndex) {
  let depth = 1;
  let stringQuote = "";
  let inTemplate = false;
  let templateExprDepth = 0;
  let escape = false;

  for (let i = startIndex; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (stringQuote) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === stringQuote) {
        stringQuote = "";
      }
      continue;
    }

    if (inTemplate) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (templateExprDepth > 0) {
        if (ch === "{") templateExprDepth += 1;
        else if (ch === "}") templateExprDepth -= 1;
        continue;
      }
      if (ch === "$" && next === "{") {
        templateExprDepth = 1;
        i += 1;
        continue;
      }
      if (ch === "`") {
        inTemplate = false;
      }
      continue;
    }

    if (ch === "\"" || ch === "'") {
      stringQuote = ch;
      continue;
    }
    if (ch === "`") {
      inTemplate = true;
      continue;
    }
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }

  return -1;
}

function extractParamNames(raw) {
  const names = [];
  if (!raw || !raw.trim().startsWith("{")) {
    return names;
  }

  const regex = /([A-Za-z_$][\w$]*)\s*:/g;
  let match;
  while ((match = regex.exec(raw))) {
    names.push(match[1]);
  }
  return names;
}

function decodeTemplate(raw, paramNames = []) {
  const body = raw.slice(1, -1);
  let result = "";
  let replacementIndex = 0;

  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    const next = body[i + 1];

    if (ch === "\\") {
      const escaped = body[i + 1];
      if (escaped === "n") result += "\n";
      else if (escaped === "r") result += "\r";
      else if (escaped === "t") result += "\t";
      else result += escaped || "";
      i += 1;
      continue;
    }

    if (ch === "$" && next === "{") {
      i += 2;
      let exprDepth = 1;
      while (i < body.length && exprDepth > 0) {
        if (body[i] === "{") exprDepth += 1;
        else if (body[i] === "}") exprDepth -= 1;
        i += 1;
      }
      const name = paramNames[replacementIndex] || `value${replacementIndex + 1}`;
      result += `{{${name}}}`;
      replacementIndex += 1;
      i -= 1;
      continue;
    }

    result += ch;
  }

  return result;
}

function extractEntries(text) {
  const entries = [];
  const callPattern = /\b(?:shellI18nStore\.)?(t|tf)\s*\(/g;
  let match;

  while ((match = callPattern.exec(text))) {
    const openIndex = match.index + match[0].length;
    const closeIndex = findCallEnd(text, openIndex);
    if (closeIndex === -1) {
      continue;
    }

    const args = splitArgs(text.slice(openIndex, closeIndex));
    const kind = match[1];
    if ((kind === "t" && args.length < 2) || (kind === "tf" && args.length < 3)) {
      callPattern.lastIndex = closeIndex;
      continue;
    }

    const keyRaw = args[0].trim();
    if (!/^['"]/.test(keyRaw)) {
      callPattern.lastIndex = closeIndex;
      continue;
    }

    const key = decodeJsString(keyRaw);
    if (!TARGET_KEY_PATTERN.test(key)) {
      callPattern.lastIndex = closeIndex;
      continue;
    }

    const fallbackRaw = args[kind === "t" ? 1 : 2].trim();
    let fallback = null;
    if (/^['"]/.test(fallbackRaw)) {
      fallback = decodeJsString(fallbackRaw);
    } else if (/^`/.test(fallbackRaw)) {
      fallback = decodeTemplate(fallbackRaw, kind === "tf" ? extractParamNames(args[1]) : []);
    }

    if (fallback != null) {
      entries.push([key, fallback]);
    }

    callPattern.lastIndex = closeIndex;
  }

  return entries;
}

function setNestedIfMissing(target, key, value) {
  const parts = key.split(".");
  let cursor = target;

  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    if (!cursor[part] || typeof cursor[part] !== "object" || Array.isArray(cursor[part])) {
      cursor[part] = {};
    }
    cursor = cursor[part];
  }

  const leafKey = parts[parts.length - 1];
  if (cursor[leafKey] == null) {
    cursor[leafKey] = value;
    return true;
  }

  return false;
}

function loadFallbackObject() {
  const fallbackText = fs.readFileSync(SHELL_FALLBACK_PATH, "utf8");
  const start = fallbackText.indexOf("{", fallbackText.indexOf("="));
  const end = fallbackText.lastIndexOf("};");
  if (start === -1 || end === -1) {
    throw new Error("Could not parse shell fallback translation file.");
  }
  return vm.runInNewContext(`(${fallbackText.slice(start, end + 1)})`);
}

function saveFallbackObject(value) {
  const output =
    `const shellFallbackTranslations = ${JSON.stringify(value, null, 2)};\n\n` +
    "export default shellFallbackTranslations;\n";
  fs.writeFileSync(SHELL_FALLBACK_PATH, output);
}

function main() {
  const files = walkFiles(DESKTOP_SRC_ROOT);
  const extracted = new Map();

  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    for (const [key, value] of extractEntries(text)) {
      if (!extracted.has(key)) {
        extracted.set(key, value);
      }
    }
  }

  const localeData = JSON.parse(fs.readFileSync(EN_LOCALE_PATH, "utf8"));
  const fallbackData = loadFallbackObject();

  if (!localeData.en || typeof localeData.en !== "object") {
    localeData.en = {};
  }
  if (!fallbackData.en || typeof fallbackData.en !== "object") {
    fallbackData.en = {};
  }

  let localeAdded = 0;
  let fallbackAdded = 0;

  for (const [key, value] of extracted) {
    if (setNestedIfMissing(localeData.en, key, value)) {
      localeAdded += 1;
    }
    if (setNestedIfMissing(fallbackData.en, key, value)) {
      fallbackAdded += 1;
    }
  }

  fs.writeFileSync(EN_LOCALE_PATH, `${JSON.stringify(localeData, null, 2)}\n`);
  saveFallbackObject(fallbackData);

  console.log(`shell-i18n sync: scanned ${files.length} files, extracted ${extracted.size} keys, added ${localeAdded} to locales/en.json, added ${fallbackAdded} to shell fallback`);
}

main();
