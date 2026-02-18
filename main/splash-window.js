const { BrowserWindow } = require("electron");

function createSplashWindowManager() {
  let splashWindow = null;
  let splashShownAt = 0;

  function createSplashWindow() {
    if (splashWindow && !splashWindow.isDestroyed()) return splashWindow;

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
      backgroundColor: "#0b1220",
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
      :root { color-scheme: dark; }
      html, body { height: 100%; margin: 0; }
      body {
        font-family: Segoe UI, system-ui, -apple-system, sans-serif;
        display: grid;
        place-items: center;
        background:
          radial-gradient(70% 120% at 0% 0%, rgba(0, 214, 255, 0.18), transparent 60%),
          radial-gradient(70% 120% at 100% 100%, rgba(255, 200, 80, 0.16), transparent 60%),
          #0b1220;
        color: #d8e7ff;
      }
      .wrap {
        width: 86%;
        border: 1px solid rgba(124, 180, 255, 0.25);
        border-radius: 14px;
        background: rgba(13, 22, 40, 0.75);
        backdrop-filter: blur(8px);
        padding: 24px 22px;
        text-align: center;
      }
      .brand {
        margin: 0 0 10px 0;
        font-size: 34px;
        letter-spacing: 1px;
        font-weight: 800;
      }
      .brand span { color: #32b8de; }
      .sub { margin: 0 0 18px 0; color: #9bb7d7; font-size: 14px; }
      .bar {
        width: 100%;
        height: 7px;
        border-radius: 999px;
        overflow: hidden;
        background: rgba(255, 255, 255, 0.1);
      }
      .bar > i {
        display: block;
        height: 100%;
        width: 34%;
        border-radius: inherit;
        background: linear-gradient(90deg, #32b8de, #8fe6ff);
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

