import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");
const legacyIndexPath = path.resolve(workspaceRoot, "index.html").replace(/\\/g, "/");
const legacyBuildEntryPath = "/legacy/index.html";

function ensureDir(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function copyIfExists(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath)) return;
  const stats = fs.lstatSync(sourcePath);
  if (stats.isDirectory()) {
    fs.cpSync(sourcePath, targetPath, { recursive: true, force: true });
    return;
  }
  ensureDir(path.dirname(targetPath));
  fs.copyFileSync(sourcePath, targetPath);
}

function legacyUiSyncPlugin() {
  return {
    name: "emubro-legacy-ui-sync",
    apply: "build",
    closeBundle() {
      const outDir = path.resolve(__dirname, "dist");
      const legacyOut = path.join(outDir, "legacy");
      fs.rmSync(legacyOut, { recursive: true, force: true });
      ensureDir(legacyOut);

      const directoriesToCopy = [
        "dist",
        "assets",
        "locales",
        "emubro-resources",
        "gamelist",
        "community-themes"
      ];
      const filesToCopy = [
        "index.html",
        "i18n.js",
        "logo.png",
        "icon.png",
        "favicon.ico",
        "translations-loader.js",
        "game-session-overlay.html"
      ];

      directoriesToCopy.forEach((entry) => {
        copyIfExists(
          path.resolve(workspaceRoot, entry),
          path.resolve(legacyOut, entry)
        );
      });
      filesToCopy.forEach((entry) => {
        copyIfExists(
          path.resolve(workspaceRoot, entry),
          path.resolve(legacyOut, entry)
        );
      });
    }
  };
}

export default defineConfig(({ command }) => {
  const legacyEntryUrl =
    command === "serve" ? `/@fs/${legacyIndexPath}` : legacyBuildEntryPath;

  return {
    plugins: [vue(), legacyUiSyncPlugin()],
    clearScreen: false,
    define: {
      __EMUBRO_LEGACY_INDEX__: JSON.stringify(legacyEntryUrl)
    },
    server: {
      port: 1420,
      strictPort: true,
      hmr: {
        port: 1421
      },
      fs: {
        allow: [workspaceRoot]
      }
    },
    envPrefix: ["VITE_", "TAURI_"],
    build: {
      target: ["es2021", "chrome100", "safari13"]
    }
  };
});
