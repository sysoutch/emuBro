use super::*;
use serde_json::json;

pub(super) fn handle(ch: &str, args: &[Value], _window: &Window) -> Result<Value, String> {
    match ch {
        "launch-game" => {
            let payload = args.get(0).cloned().unwrap_or(Value::Null);
            let game_id = parse_game_id_from_payload(&payload);
            if game_id <= 0 {
                return Ok(json!({ "success": false, "message": "Game not found" }));
            }

            let games = read_state_array("games");
            let game = games
                .iter()
                .find(|row| row.get("id").and_then(|v| v.as_i64()).unwrap_or(0) == game_id)
                .cloned();
            let Some(game_row) = game else {
                return Ok(json!({ "success": false, "message": "Game not found" }));
            };

            let game_name = game_row
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("Unknown Game")
                .to_string();
            let game_path = game_row
                .get("filePath")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if game_path.is_empty() {
                return Ok(json!({
                    "success": false,
                    "code": "GAME_FILE_MISSING",
                    "message": "Game file not found",
                    "gameId": game_id,
                    "gameName": game_name,
                    "missingPath": "",
                    "parentPath": "",
                    "parentExists": false,
                    "rootPath": "",
                    "rootExists": false,
                    "sourceMedia": "unknown"
                }));
            }

            let is_launcher_uri = game_path.starts_with("steam://")
                || game_path.starts_with("com.epicgames.launcher://")
                || game_path.starts_with("goggalaxy://")
                || game_path.starts_with("heroic://");
            if is_launcher_uri {
                return match open::that(&game_path) {
                    Ok(_) => {
                        let _ = update_game_last_played(game_id);
                        set_game_session_from_launch(game_id, &game_name, &game_path);
                        Ok(json!({
                            "success": true,
                            "message": "Launcher opened",
                            "launchMode": "launcher"
                        }))
                    }
                    Err(err) => Ok(json!({
                        "success": false,
                        "message": err.to_string()
                    })),
                };
            }

            let game_path_buf = PathBuf::from(&game_path);
            if !game_path_buf.exists() {
                let parent_path = game_path_buf
                    .parent()
                    .map(|p| p.to_string_lossy().to_string())
                    .unwrap_or_default();
                let parent_exists = game_path_buf.parent().map(|p| p.exists()).unwrap_or(false);
                let media = classify_import_media(&game_path);
                return Ok(json!({
                    "success": false,
                    "code": "GAME_FILE_MISSING",
                    "message": "Game file not found",
                    "gameId": game_id,
                    "gameName": game_name,
                    "missingPath": game_path,
                    "parentPath": parent_path,
                    "parentExists": parent_exists,
                    "rootPath": media.get("rootPath").cloned().unwrap_or_else(|| Value::String(String::new())),
                    "rootExists": media.get("rootExists").cloned().unwrap_or(Value::Bool(false)),
                    "sourceMedia": media.get("mediaCategory").cloned().unwrap_or_else(|| Value::String("unknown".to_string()))
                }));
            }

            let platform_short_name = normalize_platform_short_name(
                game_row
                    .get("platformShortName")
                    .and_then(|v| v.as_str())
                    .unwrap_or(""),
            );
            let override_emulator_path = game_row
                .get("emulatorOverridePath")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();

            let emulators = read_state_array("emulators");
            let mut selected_emulator = None::<(PathBuf, String)>;
            if !override_emulator_path.is_empty() {
                let candidate = PathBuf::from(&override_emulator_path);
                if candidate.exists() && candidate.is_file() {
                    selected_emulator = Some((candidate, String::new()));
                }
            }

            if selected_emulator.is_none() && !platform_short_name.is_empty() {
                for emulator in emulators {
                    let emulator_psn = normalize_platform_short_name(
                        emulator
                            .get("platformShortName")
                            .and_then(|v| v.as_str())
                            .unwrap_or(""),
                    );
                    if emulator_psn != platform_short_name {
                        continue;
                    }
                    let emulator_path = emulator
                        .get("filePath")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .trim()
                        .to_string();
                    if emulator_path.is_empty() {
                        continue;
                    }
                    let emulator_path_buf = PathBuf::from(&emulator_path);
                    if !emulator_path_buf.exists() || !emulator_path_buf.is_file() {
                        continue;
                    }
                    let emulator_args = emulator
                        .get("args")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .trim()
                        .to_string();
                    selected_emulator = Some((emulator_path_buf, emulator_args));
                    break;
                }
            }

            if let Some((emulator_path, emulator_args)) = selected_emulator {
                match launch_game_with_emulator(&emulator_path, &emulator_args, &game_path_buf) {
                    Ok(_) => {
                        let _ = update_game_last_played(game_id);
                        set_game_session_from_launch(game_id, &game_name, &game_path);
                        return Ok(json!({
                            "success": true,
                            "message": "Game launched",
                            "gameId": game_id,
                            "launchMode": "emulator",
                            "emulatorPath": emulator_path.to_string_lossy().to_string()
                        }));
                    }
                    Err(_) => {}
                }
            }

            match launch_game_file(&game_path_buf) {
                Ok(_) => {
                    let _ = update_game_last_played(game_id);
                    set_game_session_from_launch(game_id, &game_name, &game_path);
                    Ok(json!({
                        "success": true,
                        "message": "Game launched",
                        "gameId": game_id,
                        "launchMode": "direct"
                    }))
                }
                Err(err) => Ok(json!({
                    "success": false,
                    "message": err
                })),
            }
        }
        "launch-emulator" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let emulator_path = payload
                .get("filePath")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if emulator_path.is_empty() {
                return Ok(json!({ "success": false, "message": "Missing emulator path" }));
            }
            let emulator_args = payload
                .get("args")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let working_directory = payload
                .get("workingDirectory")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            match launch_emulator_process(
                Path::new(&emulator_path),
                &emulator_args,
                &working_directory,
            ) {
                Ok(_) => {
                    let emulator_name = payload
                        .get("name")
                        .and_then(|v| v.as_str())
                        .unwrap_or("Emulator Session")
                        .trim()
                        .to_string();
                    set_game_session_from_launch(0, &emulator_name, &emulator_path);
                    Ok(json!({ "success": true }))
                }
                Err(err) => Ok(json!({ "success": false, "message": err })),
            }
        }
        _ => Ok(json!({ "success": false, "message": format!("Unsupported launch channel: {}", ch) })),
    }
}
