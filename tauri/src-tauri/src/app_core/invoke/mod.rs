use super::*;
use serde_json::json;

mod community;
mod library_actions;
mod state_config;
mod updates;
mod window;

pub(super) fn not_implemented() -> Value {
    json!({
        "success": false,
        "message": "Not implemented in Tauri migration yet"
    })
}

pub(super) fn emubro_invoke_impl(channel: String, args: Vec<Value>, window: Window) -> Result<Value, String> {
    let ch = channel.trim().to_lowercase();

    if let Some(result) = handle_bridge_channel(ch.as_str(), &args) {
        return result;
    }

    match ch.as_str() {
        "window:minimize"
        | "window:start-dragging"
        | "window:start-drag"
        | "window:toggle-maximize"
        | "window:close"
        | "window:is-maximized"
        | "app:renderer-ready" => window::handle(ch.as_str(), &args, &window),

        "get-games"
        | "get-emulators"
        | "tags:list"
        | "get-library-stats"
        | "get-user-info"
        | "settings:get-library-paths"
        | "settings:set-library-paths"
        | "settings:get-runtime-data-rules"
        | "settings:set-runtime-data-rules"
        | "settings:get-splash-theme"
        | "settings:set-splash-theme"
        | "get-all-translations"
        | "locales:list"
        | "locales:read"
        | "locales:exists"
        | "get-platforms"
        | "get-platforms-for-extension"
        | "check-path-type"
        | "prompt-scan-subfolders"
        | "open-file-dialog"
        | "save-file-dialog"
        | "get-file-icon-data-url" => state_config::handle(ch.as_str(), &args, &window),

        "analyze-import-paths"
        | "stage-import-paths"
        | "detect-emulator-exe"
        | "import-exe"
        | "import-files-as-platform"
        | "import-paths"
        | "cue:inspect-bin-files"
        | "cue:generate-for-bin"
        | "import:analyze-archives"
        | "iso:detect-game-codes"
        | "update-game-metadata"
        | "remove-game"
        | "tags:rename"
        | "tags:delete"
        | "launch-game"
        | "launch-emulator"
        | "search-missing-game-file"
        | "relink-game-file"
        | "migration:import-legacy-library-db"
        | "browse-games-and-emus" => library_actions::handle(ch.as_str(), &args, &window),

        "open-external-url"
        | "community:open-in-app-window"
        | "community:close-in-app-windows"
        | "show-item-in-folder" => community::handle(ch.as_str(), &args, &window),

        "update:get-state"
        | "resources:update:get-state"
        | "update:get-config"
        | "resources:update:get-config"
        | "update:set-config"
        | "resources:update:set-config"
        | "update:check"
        | "update:download"
        | "update:install"
        | "resources:update:check"
        | "resources:update:install" => updates::handle(ch.as_str(), &args, &window),

        _ => Ok(json!({
            "success": false,
            "message": format!("Unsupported emubro channel in Tauri migration: {}", channel)
        })),
    }
}
