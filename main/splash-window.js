const { BrowserWindow } = require("electron");

function sanitizeColor(value, fallback) {
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  if (/^#[0-9a-f]{3,8}$/i.test(raw)) return raw;
  if (/^rgba?\(/i.test(raw)) return raw;
  if (/^hsla?\(/i.test(raw)) return raw;
  return fallback;
}

function sanitizeFontFamily(value, fallback) {
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  if (raw.length > 240) return fallback;
  if (!/^[a-z0-9\s,'"._\-()]+$/i.test(raw)) return fallback;
  return raw;
}

function resolveSplashTheme(snapshot) {
  const tone = String(snapshot?.tone || "dark").toLowerCase() === "light" ? "light" : "dark";

  const defaults = tone === "light"
    ? {
        bgPrimary: "#dfeaf6",
        bgSecondary: "#edf4fb",
        bgTertiary: "#d2e3f5",
        textPrimary: "#17263a",
        textSecondary: "#5d7694",
        accentColor: "#3db2d6",
        accentLight: "#87d8ef",
        fontBody: "'Quicksand', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
      }
    : {
        bgPrimary: "#0b1220",
        bgSecondary: "#121c2f",
        bgTertiary: "#1a263d",
        textPrimary: "#d8e7ff",
        textSecondary: "#9bb7d7",
        accentColor: "#32b8de",
        accentLight: "#8fe6ff",
        fontBody: "'Quicksand', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
      };

  return {
    tone,
    bgPrimary: sanitizeColor(snapshot?.bgPrimary, defaults.bgPrimary),
    bgSecondary: sanitizeColor(snapshot?.bgSecondary, defaults.bgSecondary),
    bgTertiary: sanitizeColor(snapshot?.bgTertiary, defaults.bgTertiary),
    textPrimary: sanitizeColor(snapshot?.textPrimary, defaults.textPrimary),
    textSecondary: sanitizeColor(snapshot?.textSecondary, defaults.textSecondary),
    accentColor: sanitizeColor(snapshot?.accentColor, defaults.accentColor),
    accentLight: sanitizeColor(snapshot?.accentLight, defaults.accentLight),
    fontBody: sanitizeFontFamily(snapshot?.fontBody, defaults.fontBody),
    appGradientA: sanitizeColor(snapshot?.appGradientA, defaults.bgPrimary),
    appGradientB: sanitizeColor(snapshot?.appGradientB, defaults.bgSecondary),
    appGradientC: sanitizeColor(snapshot?.appGradientC, defaults.bgTertiary)
  };
}

function createSplashWindowManager(options = {}) {
  const getSplashTheme = (typeof options.getSplashTheme === "function")
    ? options.getSplashTheme
    : (() => null);

  let splashWindow = null;
  let splashShownAt = 0;

  function createSplashWindow() {
    if (splashWindow && !splashWindow.isDestroyed()) return splashWindow;

    const splashTheme = resolveSplashTheme(getSplashTheme());

    splashWindow = new BrowserWindow({
      width: 460,
      height: 260,
      frame: false,
      resizable: false,
      minimizable: false,
      maximizable: false,
      closable: true,
      movable: false,
      alwaysOnTop: true,
      show: false,
      skipTaskbar: true,
      backgroundColor: splashTheme.bgPrimary,
      webPreferences: {
        backgroundThrottling: false,
        partition: "splash",
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    const splashHtml = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>emuBro Loading</title>
    <style>
      :root {
        color-scheme: ${splashTheme.tone};
        --splash-bg-a: ${splashTheme.appGradientA};
        --splash-bg-b: ${splashTheme.appGradientB};
        --splash-bg-c: ${splashTheme.appGradientC};
        --splash-panel-bg: ${splashTheme.bgSecondary};
        --splash-border: ${splashTheme.accentColor};
        --splash-text: ${splashTheme.textPrimary};
        --splash-sub: ${splashTheme.textSecondary};
        --splash-accent: ${splashTheme.accentColor};
        --splash-accent-light: ${splashTheme.accentLight};
        --splash-font-body: ${splashTheme.fontBody};
      }
      html, body { height: 100%; margin: 0; }
      body {
        font-family: var(--splash-font-body);
        display: grid;
        place-items: center;
        background:
          radial-gradient(70% 120% at 0% 0%, color-mix(in srgb, var(--splash-accent) 34%, transparent), transparent 60%),
          radial-gradient(70% 120% at 100% 100%, color-mix(in srgb, var(--splash-accent-light) 28%, transparent), transparent 62%),
          linear-gradient(160deg, var(--splash-bg-a) 0%, var(--splash-bg-b) 52%, var(--splash-bg-c) 100%);
        color: var(--splash-text);
      }
      .wrap {
        width: 86%;
        border: 1px solid color-mix(in srgb, var(--splash-border) 48%, transparent);
        border-radius: 14px;
        background: color-mix(in srgb, var(--splash-panel-bg) 82%, transparent);
        backdrop-filter: blur(8px);
        padding: 24px 22px;
        text-align: center;
      }
      .brand {
        margin: 0 0 10px 0;
        font-size: 34px;
        letter-spacing: 1px;
        font-weight: 800;
        font-family: var(--splash-font-body);
      }
      .brand span { color: var(--splash-accent); }
      .sub { margin: 0 0 18px 0; color: var(--splash-sub); font-size: 14px; }
      .bar {
        width: 100%;
        height: 7px;
        border-radius: 999px;
        overflow: hidden;
        background: color-mix(in srgb, var(--splash-text) 14%, transparent);
      }
      .bar > i {
        display: block;
        height: 100%;
        width: 34%;
        border-radius: inherit;
        background: linear-gradient(90deg, var(--splash-accent), var(--splash-accent-light));
        transform: translate3d(-120%, 0, 0);
        will-change: transform;
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <h1 class="brand">EMU<span>BRO</span></h1>
      <p class="sub">Loading library, themes, and tools...</p>
      <div class="bar"><i id="splash-progress"></i></div>
    </div>
    <script>
      (() => {
        const bar = document.getElementById("splash-progress");
        if (!bar) return;
        let pos = -120;
        const tick = () => {
          pos += 2.4;
          if (pos > 320) pos = -120;
          bar.style.transform = "translate3d(" + pos + "%,0,0)";
          window.requestAnimationFrame(tick);
        };
        window.requestAnimationFrame(tick);
      })();
    </script>
  </body>
</html>`;

    splashWindow.once("ready-to-show", () => {
      splashShownAt = Date.now();
      if (splashWindow && !splashWindow.isDestroyed()) splashWindow.show();
    });

    splashWindow.on("closed", () => {
      splashWindow = null;
    });

    splashWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(splashHtml)}`);
    return splashWindow;
  }

  function closeSplashWindow(options = {}) {
    const force = !!options.force;
    if (!splashWindow || splashWindow.isDestroyed()) return;

    const closeNow = () => {
      const target = splashWindow;
      splashWindow = null;
      if (!target || target.isDestroyed()) return;
      try {
        target.destroy();
      } catch (_e) {}
    };

    if (force) {
      closeNow();
      return;
    }

    const minVisibleMs = 500;
    const elapsed = Date.now() - splashShownAt;
    if (elapsed >= minVisibleMs) {
      closeNow();
      return;
    }

    setTimeout(closeNow, Math.max(0, minVisibleMs - elapsed));
  }

  return {
    createSplashWindow,
    closeSplashWindow
  };
}

module.exports = { createSplashWindowManager };
