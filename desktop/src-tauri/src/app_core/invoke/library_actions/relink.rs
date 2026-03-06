use super::*;
use serde_json::json;

pub(super) fn handle(ch: &str, args: &[Value], _window: &Window) -> Result<Value, String> {
    match ch {
        "search-missing-game-file" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let target_id = payload
                .get("gameId")
                .and_then(|v| v.as_i64())
                .unwrap_or(0);
            let root_dir = payload
                .get("rootDir")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            let max_depth = payload
                .get("maxDepth")
                .and_then(|v| v.as_u64())
                .unwrap_or(8) as usize;

            if target_id <= 0 {
                return Ok(json!({ "success": false, "message": "Missing game ID" }));
            }
            if root_dir.is_empty() {
                return Ok(json!({ "success": false, "message": "Missing search root folder" }));
            }
            let root_path = PathBuf::from(&root_dir);
            if !root_path.exists() || !root_path.is_dir() {
                return Ok(json!({ "success": false, "message": "Search root folder not found" }));
            }

            let mut games = read_state_array("games");
            let game_index = games.iter().position(|row| {
                row.get("id").and_then(|v| v.as_i64()).unwrap_or(0) == target_id
            });
            let Some(game_index) = game_index else {
                return Ok(json!({ "success": false, "message": "Game not found" }));
            };
            let game_name = games[game_index]
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("Unknown Game")
                .to_string();
            let old_path = games[game_index]
                .get("filePath")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            let target_file_name = Path::new(&old_path)
                .file_name()
                .and_then(|v| v.to_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if target_file_name.is_empty() {
                return Ok(json!({ "success": false, "message": "Game has no file name" }));
            }

            let found_path = find_file_by_name_in_tree(&root_path, &target_file_name, max_depth, 20000);
            let Some(found) = found_path else {
                return Ok(json!({
                    "success": true,
                    "found": false,
                    "gameId": target_id,
                    "gameName": game_name,
                    "targetFileName": target_file_name
                }));
            };

            if let Some(obj) = games[game_index].as_object_mut() {
                obj.insert(
                    "filePath".to_string(),
                    Value::String(found.to_string_lossy().to_string()),
                );
            }
            write_state_array("games", games)?;
            Ok(json!({
                "success": true,
                "found": true,
                "gameId": target_id,
                "gameName": game_name,
                "newPath": found.to_string_lossy().to_string()
            }))
        }
        "relink-game-file" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let target_id = payload
                .get("gameId")
                .and_then(|v| v.as_i64())
                .unwrap_or(0);
            let selected_path = payload
                .get("filePath")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();

            if target_id <= 0 {
                return Ok(json!({ "success": false, "message": "Missing game ID" }));
            }
            if selected_path.is_empty() {
                return Ok(json!({ "success": false, "message": "Missing file path" }));
            }
            let selected = PathBuf::from(&selected_path);
            if !selected.exists() {
                return Ok(json!({ "success": false, "message": "Selected file was not found" }));
            }
            if !selected.is_file() {
                return Ok(json!({ "success": false, "message": "Selected path is not a file" }));
            }

            let mut games = read_state_array("games");
            let game_index = games.iter().position(|row| {
                row.get("id").and_then(|v| v.as_i64()).unwrap_or(0) == target_id
            });
            let Some(index) = game_index else {
                return Ok(json!({ "success": false, "message": "Game not found" }));
            };
            let game_name = games[index]
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("Unknown Game")
                .to_string();
            if let Some(obj) = games[index].as_object_mut() {
                obj.insert("filePath".to_string(), Value::String(selected_path.clone()));
            }
            write_state_array("games", games)?;
            Ok(json!({
                "success": true,
                "gameId": target_id,
                "gameName": game_name,
                "newPath": selected_path
            }))
        }
        _ => Ok(json!({ "success": false, "message": format!("Unsupported relink channel: {}", ch) })),
    }
}
