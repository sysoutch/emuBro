const CFG_KV = "keyvalue";
const CFG_JSON = "json";
const CFG_XML = "xml";
const CFG_UNKNOWN = "unknown";
const BINDING_KEY_RE = /(bind|binding|input|key|hotkey|button|controller|gamepad|pad|joy|axis|trigger)/i;
const CONTROLS_SECTION_RE = /^(controls?|input|keyboard|gamepad|controller|pad)/i;
const TRUE_RE = /^(1|true|yes|on|enabled)$/i;
const FALSE_RE = /^(0|false|no|off|disabled)$/i;

export const CONTROL_PRESET_KEYBOARD = Object.freeze({
  left: "37",
  right: "39",
  up: "38",
  down: "40",
  left_up: "0",
  left_down: "0",
  right_up: "0",
  right_down: "0",
  start: "13",
  select: "161",
  lid: "0",
  debug: "0",
  a: "88",
  b: "90",
  x: "83",
  y: "65",
  l: "81",
  r: "87"
});

export const CONTROL_PRESET_GAMEPAD = Object.freeze({
  left: "32772",
  right: "32773",
  up: "32774",
  down: "32775",
  left_up: "0",
  left_down: "0",
  right_up: "0",
  right_down: "0",
  start: "32783",
  select: "32782",
  lid: "0",
  debug: "0",
  a: "32776",
  b: "32777",
  x: "32778",
  y: "32779",
  l: "32780",
  r: "32781"
});

const CONTROL_KEY_SET = new Set([
  ...Object.keys(CONTROL_PRESET_KEYBOARD),
  ...Object.keys(CONTROL_PRESET_GAMEPAD)
]);

function pathLabel(segments) {
  let out = "";
  segments.forEach((segment) => {
    if (typeof segment === "number") out += `[${segment}]`;
    else out += out ? `.${segment}` : String(segment);
  });
  return out;
}

function normalizeControlKey(rawKey) {
  const base = String(rawKey || "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!base) return "";
  const aliases = {
    leftup: "left_up",
    leftdown: "left_down",
    rightup: "right_up",
    rightdown: "right_down"
  };
  return aliases[base] || base;
}

function flattenJsonBindings(node, segments = [], out = []) {
  if (Array.isArray(node)) {
    node.forEach((value, index) => flattenJsonBindings(value, [...segments, index], out));
    return out;
  }
  if (node && typeof node === "object") {
    Object.keys(node).forEach((key) => flattenJsonBindings(node[key], [...segments, key], out));
    return out;
  }
  if (!segments.length) return out;
  const label = pathLabel(segments);
  if (!BINDING_KEY_RE.test(label)) return out;
  out.push({
    id: `json:${label}`,
    displayKey: label,
    pathSegments: segments,
    value: String(node ?? ""),
    valueType: node === null ? "null" : typeof node,
    sourceFormat: CFG_JSON,
    controlKey: (() => {
      const key = normalizeControlKey(label.split(".").pop() || "");
      return CONTROL_KEY_SET.has(key) ? key : "";
    })()
  });
  return out;
}

function setJsonPathValue(root, pathSegments, value) {
  let node = root;
  for (let index = 0; index < pathSegments.length; index += 1) {
    const segment = pathSegments[index];
    const last = index === pathSegments.length - 1;
    if (last) {
      node[segment] = value;
      return;
    }
    const nextSegment = pathSegments[index + 1];
    const shouldArray = typeof nextSegment === "number";
    if (!node[segment] || typeof node[segment] !== "object") {
      node[segment] = shouldArray ? [] : {};
    }
    node = node[segment];
  }
}

function typedJsonValue(nextRaw, type, currentRaw) {
  const text = String(nextRaw ?? "");
  if (type === "number") {
    const nextNumber = Number(text);
    if (Number.isFinite(nextNumber)) return nextNumber;
    const fallback = Number(currentRaw);
    return Number.isFinite(fallback) ? fallback : 0;
  }
  if (type === "boolean") {
    if (TRUE_RE.test(text)) return true;
    if (FALSE_RE.test(text)) return false;
    return !!currentRaw;
  }
  if (type === "null") return text.trim() ? text : null;
  return text;
}

export function detectConfigFormat(configPath, rawText = "") {
  const normalizedPath = String(configPath || "").trim().toLowerCase();
  if (/\.(json|json5)$/i.test(normalizedPath)) return CFG_JSON;
  if (/\.(xml|xaml|plist)$/i.test(normalizedPath)) return CFG_XML;
  if (/\.(ini|cfg|conf|properties|txt|toml|yaml|yml)$/i.test(normalizedPath)) return CFG_KV;
  const text = String(rawText || "").trim();
  if (!text) return CFG_UNKNOWN;
  if (text.startsWith("{") || text.startsWith("[")) return CFG_JSON;
  if (text.startsWith("<")) return CFG_XML;
  return CFG_KV;
}

export function extractBindings(rawText, format) {
  if (format === CFG_JSON) {
    try {
      const parsed = JSON.parse(String(rawText || ""));
      return { entries: flattenJsonBindings(parsed), editable: true, message: "", format };
    } catch (error) {
      return { entries: [], editable: false, message: `JSON parse error: ${error?.message || String(error)}`, format };
    }
  }

  if (format === CFG_KV) {
    const lines = String(rawText || "").split(/\r?\n/g);
    const counts = new Map();
    const entries = [];
    let currentSection = "";
    lines.forEach((line) => {
      const sectionMatch = line.match(/^\s*\[([^\]]+)\]\s*$/);
      if (sectionMatch) {
        currentSection = String(sectionMatch[1] || "").trim().toLowerCase();
        return;
      }
      const match = line.match(/^(\s*)([^#;][^=:\r\n]*?)(\s*)([=:])(\s*)(.*)$/);
      if (!match) return;
      const key = String(match[2] || "").trim();
      if (!key) return;
      const controlKey = normalizeControlKey(key);
      const looksLikeControl = CONTROL_KEY_SET.has(controlKey);
      const looksLikeBinding = BINDING_KEY_RE.test(key) || looksLikeControl || CONTROLS_SECTION_RE.test(currentSection);
      if (!looksLikeBinding) return;
      const keyLower = key.toLowerCase();
      const index = (counts.get(keyLower) || 0) + 1;
      counts.set(keyLower, index);
      entries.push({
        id: `kv:${keyLower}:${index}`,
        displayKey: index > 1 ? `${key} [${index}]` : key,
        key,
        keyLower,
        section: currentSection,
        controlKey,
        value: String(match[6] ?? ""),
        valueType: "string",
        sourceFormat: CFG_KV
      });
    });
    return { entries, editable: true, message: "", format };
  }

  if (format === CFG_XML) {
    return { entries: [], editable: false, message: "Binding editor is not available for XML yet. Use the raw config editor.", format };
  }

  return { entries: [], editable: false, message: "Binding editor supports key=value and JSON configs.", format };
}

export function applyBindingEdits(rawText, format, entries) {
  const list = Array.isArray(entries) ? entries : [];
  const source = String(rawText || "");
  if (!list.length) return source;

  if (format === CFG_KV) {
    const updatesById = new Map();
    list.forEach((entry) => {
      const id = String(entry?.id || "").trim();
      if (!id.startsWith("kv:")) return;
      updatesById.set(id, String(entry?.value ?? ""));
    });
    if (!updatesById.size) return source;

    const eol = source.includes("\r\n") ? "\r\n" : "\n";
    const lines = source.split(/\r?\n/g);
    const seenCounts = new Map();
    return lines.map((line) => {
      const match = line.match(/^(\s*)([^#;][^=:\r\n]*?)(\s*)([=:])(\s*)(.*)$/);
      if (!match) return line;
      const keyLower = String(match[2] || "").trim().toLowerCase();
      if (!keyLower) return line;
      const index = (seenCounts.get(keyLower) || 0) + 1;
      seenCounts.set(keyLower, index);
      const entryId = `kv:${keyLower}:${index}`;
      if (!updatesById.has(entryId)) return line;
      return `${match[1]}${match[2]}${match[3]}${match[4]}${match[5]}${updatesById.get(entryId)}`;
    }).join(eol);
  }

  if (format === CFG_JSON) {
    const parsed = JSON.parse(source || "{}");
    list.forEach((entry) => {
      if (!Array.isArray(entry?.pathSegments) || !entry.pathSegments.length) return;
      const nextValue = typedJsonValue(entry.value, entry.valueType, entry.value);
      setJsonPathValue(parsed, entry.pathSegments, nextValue);
    });
    return JSON.stringify(parsed, null, 2);
  }

  return source;
}

export function analyzeBindingEntries(entries = []) {
  const rows = Array.isArray(entries) ? entries : [];
  const controlEntries = rows.filter((entry) => !!String(entry?.controlKey || "").trim());
  const numericValues = controlEntries
    .map((entry) => Number.parseInt(String(entry?.value || "").trim(), 10))
    .filter((value) => Number.isFinite(value));
  return {
    total: rows.length,
    controlCount: controlEntries.length,
    looksGamepadCodes: numericValues.some((value) => value >= 32768),
    looksKeyboardCodes: numericValues.some((value) => value > 0 && value < 32768)
  };
}

export { CFG_JSON, CFG_KV, CFG_UNKNOWN, CFG_XML };
