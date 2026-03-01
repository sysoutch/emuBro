use super::*;
use serde_json::json;

pub(super) fn handle(ch: &str, args: &[Value], _window: &Window) -> Result<Value, String> {
    match ch {
        "get-games" => Ok(Value::Array(read_state_array("games"))),
        "get-emulators" => Ok(Value::Array(read_state_array("emulators"))),
        "tags:list" => Ok(json!({ "tags": read_state_array("tags") })),
        "get-library-stats" => Ok(json!({
            "totalGames": read_state_array("games").len(),
            "totalPlayTime": "0h"
        })),
        "get-user-info" => Ok(json!({
            "username": "Guest",
            "displayName": "Guest",
            "id": "local",
            "avatarUrl": ""
        })),
        "settings:get-library-paths" => Ok(json!({
            "success": true,
            "settings": read_library_path_settings()
        })),
        "settings:set-library-paths" => {
            let normalized = write_library_path_settings(args.get(0))?;
            Ok(json!({
                "success": true,
                "settings": normalized
            }))
        }
        "settings:get-runtime-data-rules" => Ok(json!({
            "success": true,
            "rules": {
                "directoryNames": [],
                "fileExtensions": [],
                "fileNameIncludes": []
            }
        })),
        "settings:set-runtime-data-rules" => Ok(json!({
            "success": true,
            "rules": {
                "directoryNames": [],
                "fileExtensions": [],
                "fileNameIncludes": []
            }
        })),
        "settings:get-splash-theme" => Ok(json!({ "success": true, "theme": Value::Null })),
        "settings:set-splash-theme" => Ok(json!({ "success": true })),
        "get-all-translations" => Ok(read_all_translations_from_disk()),
        "locales:list" => {
            let translations = read_all_translations_from_disk();
            let obj = match translations.as_object() {
                Some(m) => m,
                None => return Ok(json!([])),
            };
            let mut rows = Vec::<Value>::new();
            for (code, data) in obj {
                let mut wrapped = serde_json::Map::new();
                wrapped.insert(code.clone(), data.clone());
                rows.push(json!({
                    "code": code,
                    "source": "app",
                    "canRename": false,
                    "canDelete": false,
                    "data": Value::Object(wrapped)
                }));
            }
            Ok(Value::Array(rows))
        }
        "locales:read" => {
            let file_name = args.get(0).and_then(|v| v.as_str()).unwrap_or("").to_string();
            let Some(locales_dir) = find_locales_dir() else {
                return Ok(json!({}));
            };
            let Some(path) = locale_file_path(&locales_dir, &file_name) else {
                return Ok(json!({}));
            };
            let text = fs::read_to_string(path).unwrap_or_else(|_| "{}".to_string());
            let parsed: Value = serde_json::from_str(&text).unwrap_or_else(|_| json!({}));
            Ok(parsed)
        }
        "locales:exists" => {
            let file_name = args.get(0).and_then(|v| v.as_str()).unwrap_or("").to_string();
            let Some(locales_dir) = find_locales_dir() else {
                return Ok(json!(false));
            };
            let exists = locale_file_path(&locales_dir, &file_name)
                .map(|p| p.exists() && p.is_file())
                .unwrap_or(false);
            Ok(json!(exists))
        }
        "get-platforms" => Ok(Value::Array(load_platform_configs())),
        "get-platforms-for-extension" => {
            let ext = args
                .get(0)
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_lowercase();
            if ext.is_empty() {
                return Ok(Value::Array(Vec::new()));
            }
            let rows = load_platform_configs()
                .into_iter()
                .filter(|row| platform_matches_extension(row, &ext))
                .collect::<Vec<Value>>();
            Ok(Value::Array(rows))
        }
        "check-path-type" => {
            let target_path = args
                .get(0)
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if target_path.is_empty() {
                return Ok(json!({ "path": "", "exists": false, "isDirectory": false, "isFile": false }));
            }
            let p = PathBuf::from(target_path.clone());
            let meta = fs::metadata(&p).ok();
            let is_dir = meta.as_ref().map(|m| m.is_dir()).unwrap_or(false);
            let is_file = meta.as_ref().map(|m| m.is_file()).unwrap_or(false);
            Ok(json!({
                "path": target_path,
                "exists": meta.is_some(),
                "isDirectory": is_dir,
                "isFile": is_file
            }))
        }

        "prompt-scan-subfolders" => Ok(json!({ "canceled": false, "recursive": true })),
        "open-file-dialog" => {
            let options = args.get(0).cloned().unwrap_or_else(|| json!({}));
            Ok(resolve_open_file_dialog(&options))
        }
        "save-file-dialog" => {
            let options = args.get(0).cloned().unwrap_or_else(|| json!({}));
            Ok(resolve_save_file_dialog(&options))
        }

        "get-file-icon-data-url" => {
            let raw_path = args.get(0).and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
            if raw_path.is_empty() {
                return Ok(json!({ "success": false, "message": "Missing path", "dataUrl": "" }));
            }
            let path = PathBuf::from(&raw_path);
            if !path.exists() {
                return Ok(json!({ "success": false, "message": "Path not found", "dataUrl": "" }));
            }
            Ok(json!({
                "success": true,
                "dataUrl": build_file_icon_data_url(&path)
            }))
        }
        _ => Ok(json!({ "success": false, "message": format!("Unsupported state_config channel: {}", ch) })),
    }
}
