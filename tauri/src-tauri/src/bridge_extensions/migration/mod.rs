use super::*;

mod downloads;
mod emulator_config;
mod relocation;
mod session;
mod theme_upload;
mod web_source;

pub(crate) use session::set_game_session_from_launch;

pub(crate) fn handle(channel: &str, args: &[Value]) -> Option<Result<Value, String>> {
    let result = match channel {
        "emulator:read-config-file" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            Ok(emulator_config::read_emulator_config_file(&payload))
        }
        "emulator:write-config-file" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            Ok(emulator_config::write_emulator_config_file(&payload))
        }
        "get-emulator-download-options" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            Ok(downloads::get_emulator_download_options(&payload))
        }
        "download-install-emulator" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            Ok(downloads::download_and_install_emulator(&payload))
        }
        "import:analyze-web-emulator-source" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            Ok(web_source::analyze_web_emulator_source(&payload))
        }
        "import:save-web-emulator-source" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            Ok(web_source::save_web_emulator_source(&payload))
        }
        "settings:preview-relocate-managed-folder" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            Ok(relocation::preview_relocate_managed_folder(&payload))
        }
        "settings:confirm-relocate-preview" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            Ok(relocation::confirm_relocate_preview(&payload))
        }
        "settings:relocate-managed-folder" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            Ok(relocation::relocate_managed_folder(&payload))
        }
        "upload-theme" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            Ok(Value::Bool(theme_upload::upload_theme_webhook(&payload)))
        }
        "game-session:get-status" => Ok(session::game_session_status_payload()),
        "game-session:show-launcher" => Ok(json!({ "success": true })),
        "game-session:quit" => {
            session::clear_game_session();
            Ok(json!({
                "success": true,
                "message": "No tracked game session process to terminate in Tauri migration yet."
            }))
        }
        "game-session:send-hotkey" => Ok(json!({
            "success": false,
            "message": "Game-session hotkeys are not wired in Tauri yet."
        })),
        "game-session:capture-screenshot" => Ok(json!({
            "success": false,
            "message": "Session screenshot capture is not wired in Tauri yet."
        })),
        "game-session:show-overlay-menu" => Ok(json!({ "success": true })),
        _ => return None,
    };
    Some(result)
}
