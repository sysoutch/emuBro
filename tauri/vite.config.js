import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");
const legacyIndexPath = path.resolve(workspaceRoot, "index.html").replace(/\\/g, "/");

export default defineConfig(({ command }) => {
  const legacyEntryUrl = command === "serve" ? `/@fs/${legacyIndexPath}` : "";

  return {
    plugins: [vue()],
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
