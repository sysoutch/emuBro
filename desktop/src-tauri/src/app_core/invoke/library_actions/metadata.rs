use super::*;
use serde_json::json;

pub(super) fn handle(ch: &str, args: &[Value], _window: &Window) -> Result<Value, String> {
    match ch {
        "update-game-metadata" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let game_id = payload.get("gameId").and_then(|v| v.as_i64()).unwrap_or(0);
            if game_id <= 0 {
                return Ok(json!({ "success": false, "message": "Invalid game id" }));
            }

            let mut games = read_state_array("games");
            let mut found_idx = None;
            for (idx, row) in games.iter().enumerate() {
                if row.get("id").and_then(|v| v.as_i64()).unwrap_or(0) == game_id {
                    found_idx = Some(idx);
                    break;
                }
            }
            let Some(idx) = found_idx else {
                return Ok(json!({ "success": false, "message": "Game not found" }));
            };

            let mut game_obj = games[idx].as_object().cloned().unwrap_or_default();
            if let Some(value) = payload.get("platformShortName").and_then(|v| v.as_str()) {
                game_obj.insert("platformShortName".to_string(), Value::String(value.trim().to_lowercase()));
            }
            if let Some(value) = payload.get("platform").and_then(|v| v.as_str()) {
                game_obj.insert("platform".to_string(), Value::String(value.trim().to_string()));
            }
            if let Some(value) = payload.get("code").and_then(|v| v.as_str()) {
                game_obj.insert("code".to_string(), Value::String(value.trim().to_string()));
            }
            if let Some(value) = payload.get("image").and_then(|v| v.as_str()) {
                game_obj.insert("image".to_string(), Value::String(value.trim().to_string()));
            }
            if let Some(value) = payload.get("description").and_then(|v| v.as_str()) {
                game_obj.insert("description".to_string(), Value::String(value.trim().to_string()));
            }
            if let Some(value) = payload.get("filePath").and_then(|v| v.as_str()) {
                game_obj.insert("filePath".to_string(), Value::String(value.trim().to_string()));
            }
            if let Some(value) = payload.get("emulatorOverridePath") {
                if value.is_null() {
                    game_obj.insert("emulatorOverridePath".to_string(), Value::Null);
                } else if let Some(text) = value.as_str() {
                    game_obj.insert(
                        "emulatorOverridePath".to_string(),
                        Value::String(text.trim().to_string()),
                    );
                }
            }
            if let Some(value) = payload.get("lastPlayed") {
                game_obj.insert("lastPlayed".to_string(), value.clone());
            }
            if let Some(value) = payload.get("progress") {
                game_obj.insert("progress".to_string(), value.clone());
            }
            if let Some(value) = payload.get("runAsMode") {
                game_obj.insert("runAsMode".to_string(), value.clone());
            }
            if let Some(value) = payload.get("runAsUser") {
                game_obj.insert("runAsUser".to_string(), value.clone());
            }
            if let Some(Value::Array(tags)) = payload.get("tags") {
                let cleaned: Vec<Value> = tags
                    .iter()
                    .filter_map(|v| v.as_str())
                    .map(normalize_tag_id)
                    .filter(|s| !s.is_empty())
                    .map(Value::String)
                    .collect();
                game_obj.insert("tags".to_string(), Value::Array(cleaned));
            }

            games[idx] = Value::Object(game_obj.clone());
            write_state_array("games", games)?;
            Ok(json!({ "success": true, "game": Value::Object(game_obj) }))
        }
        "remove-game" => {
            let target_id = args.get(0).and_then(|v| v.as_i64()).unwrap_or(0);
            if target_id <= 0 {
                return Ok(json!({ "success": false, "message": "Invalid game id" }));
            }
            let mut games = read_state_array("games");
            let before = games.len();
            games.retain(|row| row.get("id").and_then(|v| v.as_i64()).unwrap_or(0) != target_id);
            if games.len() == before {
                return Ok(json!({ "success": false, "message": "Game not found" }));
            }
            write_state_array("games", games)?;
            Ok(json!({ "success": true, "message": "Game removed from library" }))
        }
        _ => Ok(json!({ "success": false, "message": format!("Unsupported metadata channel: {}", ch) })),
    }
}
