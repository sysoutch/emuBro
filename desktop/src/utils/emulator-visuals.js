const PALETTE_CACHE_KEY = "emubro.desktop.emulator-platform-palette.v1";
const paletteCache = new Map();
let cacheRestored = false;
let persistTimer = null;

function clampChannel(value) {
  return Math.max(0, Math.min(255, Number(value) || 0));
}

function toRgba({ r, g, b }, alpha) {
  return `rgba(${clampChannel(r)}, ${clampChannel(g)}, ${clampChannel(b)}, ${alpha})`;
}

function mixRgb(a, b, ratio) {
  const weight = Math.max(0, Math.min(1, Number(ratio) || 0));
  return {
    r: Math.round(a.r * (1 - weight) + b.r * weight),
    g: Math.round(a.g * (1 - weight) + b.g * weight),
    b: Math.round(a.b * (1 - weight) + b.b * weight)
  };
}

function colorDistanceSq(a, b) {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

function hashString(value) {
  const text = String(value || "");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function hslToRgb(h, s, l) {
  const hue = ((Number(h) % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(100, Number(s) || 0)) / 100;
  const light = Math.max(0, Math.min(100, Number(l) || 0)) / 100;
  const chroma = (1 - Math.abs(2 * light - 1)) * sat;
  const x = chroma * (1 - Math.abs((hue / 60) % 2 - 1));
  const m = light - chroma / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (hue < 60) {
    r = chroma;
    g = x;
  } else if (hue < 120) {
    r = x;
    g = chroma;
  } else if (hue < 180) {
    g = chroma;
    b = x;
  } else if (hue < 240) {
    g = x;
    b = chroma;
  } else if (hue < 300) {
    r = x;
    b = chroma;
  } else {
    r = chroma;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
}

function normalizePalette(palette) {
  if (!Array.isArray(palette) || palette.length < 3) {
    return null;
  }
  const normalized = palette.slice(0, 3).map((entry) => String(entry || "").trim()).filter(Boolean);
  return normalized.length === 3 ? normalized : null;
}

function restoreCache() {
  if (cacheRestored || typeof window === "undefined") {
    return;
  }
  cacheRestored = true;
  try {
    const raw = window.localStorage.getItem(PALETTE_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) {
      return;
    }
    parsed.forEach((entry) => {
      if (!Array.isArray(entry) || entry.length < 2) {
        return;
      }
      const source = String(entry[0] || "").trim();
      const palette = normalizePalette(entry[1]);
      if (!source || !palette) {
        return;
      }
      paletteCache.set(source, palette);
    });
  } catch (_error) {}
}

function schedulePersist() {
  if (persistTimer || typeof window === "undefined") {
    return;
  }
  persistTimer = window.setTimeout(() => {
    persistTimer = null;
    try {
      window.localStorage.setItem(PALETTE_CACHE_KEY, JSON.stringify([...paletteCache.entries()]));
    } catch (_error) {}
  }, 320);
}

function getCachedPalette(source) {
  restoreCache();
  const key = String(source || "").trim();
  return key ? normalizePalette(paletteCache.get(key)) : null;
}

function setCachedPalette(source, palette) {
  restoreCache();
  const key = String(source || "").trim();
  const normalized = normalizePalette(palette);
  if (!key || !normalized) {
    return;
  }
  paletteCache.set(key, normalized);
  schedulePersist();
}

export function buildFallbackPalette(source) {
  const seed = hashString(source || "emubro-platform");
  const baseHue = seed % 360;
  const colorA = hslToRgb(baseHue, 72, 58);
  const colorB = hslToRgb((baseHue + 34) % 360, 66, 56);
  const colorC = hslToRgb((baseHue + 316) % 360, 58, 42);
  return [
    toRgba(colorA, 0.52),
    toRgba(colorB, 0.44),
    toRgba(colorC, 0.36)
  ];
}

export function extractPaletteFromImage(image) {
  const width = Number(image?.naturalWidth || 0);
  const height = Number(image?.naturalHeight || 0);
  if (!width || !height) {
    return null;
  }

  const scale = Math.min(1, 42 / Math.max(width, height));
  const canvasWidth = Math.max(1, Math.round(width * scale));
  const canvasHeight = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return null;
  }

  try {
    context.drawImage(image, 0, 0, canvasWidth, canvasHeight);
    const data = context.getImageData(0, 0, canvasWidth, canvasHeight).data;
    const buckets = new Map();

    for (let index = 0; index < data.length; index += 4) {
      const alpha = data[index + 3];
      if (alpha < 120) {
        continue;
      }

      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      if (r + g + b < 56) {
        continue;
      }

      const key = [
        Math.round(r / 24) * 24,
        Math.round(g / 24) * 24,
        Math.round(b / 24) * 24
      ].join(",");
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }

    const palette = [];
    [...buckets.entries()]
      .sort((a, b) => b[1] - a[1])
      .forEach(([bucket, count]) => {
        if (palette.length >= 3 || (palette.length > 0 && count < 2)) {
          return;
        }
        const [r, g, b] = bucket.split(",").map((value) => clampChannel(Number(value)));
        const rgb = { r, g, b };
        const tooClose = palette.some((entry) => colorDistanceSq(entry, rgb) < 2300);
        if (!tooClose) {
          palette.push(rgb);
        }
      });

    if (!palette.length) {
      return null;
    }
    if (palette.length === 1) {
      palette.push(mixRgb(palette[0], { r: 255, g: 255, b: 255 }, 0.32));
    }
    if (palette.length === 2) {
      palette.push(mixRgb(palette[0], { r: 18, g: 28, b: 52 }, 0.42));
    }

    return [
      toRgba(palette[0], 0.5),
      toRgba(palette[1], 0.42),
      toRgba(palette[2], 0.34)
    ];
  } catch (_error) {
    return null;
  }
}

export function applyPaletteToElement(element, palette) {
  const normalized = normalizePalette(palette);
  if (!element || !normalized) {
    return;
  }
  element.style.setProperty("--emulator-glow-1", normalized[0]);
  element.style.setProperty("--emulator-glow-2", normalized[1]);
  element.style.setProperty("--emulator-glow-3", normalized[2]);
}

export function applyPaletteFromSource(element, source) {
  const cached = getCachedPalette(source);
  applyPaletteToElement(element, cached || buildFallbackPalette(source));
}

export function applyPaletteFromImage(element, image, source = "") {
  const resolvedSource = String(source || image?.currentSrc || image?.src || "").trim();
  if (!element || !resolvedSource) {
    return;
  }
  applyPaletteFromSource(element, resolvedSource);
  const extracted = extractPaletteFromImage(image);
  if (!extracted) {
    return;
  }
  setCachedPalette(resolvedSource, extracted);
  applyPaletteToElement(element, extracted);
}
