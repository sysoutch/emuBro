#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde_json::{json, Value};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Window;

#[tauri::command]
fn app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

fn find_locales_dir() -> Option<PathBuf> {
    let cwd = std::env::current_dir().ok()?;
    let candidates = [
        cwd.join("locales"),
        cwd.join("../locales"),
        cwd.join("../../locales"),
        cwd.join("../../../locales"),
    ];
    candidates
        .into_iter()
        .find(|path| path.exists() && path.is_dir())
}

fn locale_file_path(base: &Path, file_name: &str) -> Option<PathBuf> {
    let name = String::from(file_name).trim().to_string();
    if name.is_empty() {
        return None;
    }
    if name.contains("..") || name.contains('/') || name.contains('\\') {
        return None;
    }
    Some(base.join(name))
}

fn read_all_translations_from_disk() -> Value {
    let Some(locales_dir) = find_locales_dir() else {
        return json!({});
    };

    let mut out = serde_json::Map::new();
    let Ok(entries) = fs::read_dir(locales_dir) else {
        return json!({});
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        if path.extension().and_then(|s| s.to_str()).unwrap_or("") != "json" {
            continue;
        }
        let stem = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if stem.is_empty() {
            continue;
        }

        let Ok(contents) = fs::read_to_string(&path) else {
            continue;
        };
        let Ok(parsed) = serde_json::from_str::<Value>(&contents) else {
            continue;
        };
        out.insert(stem, parsed);
    }

    Value::Object(out)
}

fn migration_state_path() -> PathBuf {
    std::env::current_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join(".emubro-tauri-state.json")
}

fn load_migration_state() -> serde_json::Map<String, Value> {
    let path = migration_state_path();
    let Ok(raw) = fs::read_to_string(path) else {
        return serde_json::Map::new();
    };
    match serde_json::from_str::<Value>(&raw) {
        Ok(Value::Object(map)) => map,
        _ => serde_json::Map::new(),
    }
}

fn save_migration_state(map: &serde_json::Map<String, Value>) -> Result<(), String> {
    let path = migration_state_path();
    let encoded = serde_json::to_string_pretty(map).map_err(|e| e.to_string())?;
    fs::write(path, encoded).map_err(|e| e.to_string())
}

fn normalize_path_list(input: Option<&Value>) -> Vec<Value> {
    let mut out = Vec::<Value>::new();
    if let Some(Value::Array(values)) = input {
        for item in values {
            if let Some(text) = item.as_str() {
                let trimmed = text.trim();
                if trimmed.is_empty() {
                    continue;
                }
                out.push(Value::String(trimmed.to_string()));
            }
        }
    }
    out
}

fn default_library_path_settings() -> Value {
    json!({
        "scanFolders": [],
        "gameFolders": [],
        "emulatorFolders": []
    })
}

fn normalize_library_path_settings(payload: Option<&Value>) -> Value {
    let scan_folders = normalize_path_list(payload.and_then(|v| v.get("scanFolders")));
    let game_folders = normalize_path_list(payload.and_then(|v| v.get("gameFolders")));
    let emulator_folders = normalize_path_list(payload.and_then(|v| v.get("emulatorFolders")));
    json!({
        "scanFolders": scan_folders,
        "gameFolders": game_folders,
        "emulatorFolders": emulator_folders
    })
}

fn read_library_path_settings() -> Value {
    let state = load_migration_state();
    match state.get("libraryPathSettings") {
        Some(value) => normalize_library_path_settings(Some(value)),
        None => default_library_path_settings(),
    }
}

fn write_library_path_settings(payload: Option<&Value>) -> Result<Value, String> {
    let normalized = normalize_library_path_settings(payload);
    let mut state = load_migration_state();
    state.insert("libraryPathSettings".to_string(), normalized.clone());
    save_migration_state(&state)?;
    Ok(normalized)
}

fn not_implemented() -> Value {
    json!({
        "success": false,
        "message": "Not implemented in Tauri migration yet"
    })
}

#[tauri::command]
fn emubro_invoke(channel: String, args: Vec<Value>, window: Window) -> Result<Value, String> {
    let ch = channel.trim().to_lowercase();

    match ch.as_str() {
        "window:minimize" => {
            window.minimize().map_err(|e| e.to_string())?;
            Ok(Value::Null)
        }
        "window:toggle-maximize" => {
            let is_max = window.is_maximized().map_err(|e| e.to_string())?;
            if is_max {
                window.unmaximize().map_err(|e| e.to_string())?;
            } else {
                window.maximize().map_err(|e| e.to_string())?;
            }
            Ok(Value::Null)
        }
        "window:close" => {
            window.close().map_err(|e| e.to_string())?;
            Ok(Value::Null)
        }
        "window:is-maximized" => {
            let is_max = window.is_maximized().map_err(|e| e.to_string())?;
            Ok(json!(is_max))
        }
        "app:renderer-ready" => Ok(json!({ "success": true })),
        "get-games" => Ok(json!([])),
        "get-emulators" => Ok(json!([])),
        "tags:list" => Ok(json!({ "tags": [] })),
        "get-library-stats" => Ok(json!({
            "totalGames": 0,
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
        "prompt-scan-subfolders" => Ok(json!({ "canceled": false, "recursive": true })),
        "open-file-dialog" => Ok(json!({ "canceled": true, "filePaths": [] })),
        "save-file-dialog" => Ok(json!({ "canceled": true, "filePath": "" })),
        "open-external-url" => Ok(json!({ "success": true })),
        "show-item-in-folder" => Ok(json!({ "success": true })),
        "get-platforms" => Ok(json!([])),
        "get-platforms-for-extension" => Ok(json!([])),
        "browse-games-and-emus" => Ok(json!({
            "success": true,
            "games": [],
            "emulators": [],
            "archives": [],
            "setupFiles": []
        })),
        "update:get-state" | "resources:update:get-state" => Ok(json!({
            "available": false,
            "downloaded": false
        })),
        "update:get-config" | "resources:update:get-config" => Ok(json!({})),
        "update:set-config" | "resources:update:set-config" => Ok(json!({ "success": true })),
        "update:check"
        | "update:download"
        | "update:install"
        | "resources:update:check"
        | "resources:update:install" => Ok(not_implemented()),
        _ => Ok(json!({
            "success": false,
            "message": format!("Unsupported emubro channel in Tauri migration: {}", channel)
        })),
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![app_version, emubro_invoke])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
