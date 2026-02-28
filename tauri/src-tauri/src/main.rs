#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde_json::{json, Value};
use std::fs;
use std::process::Command;
use std::path::{Path, PathBuf};
use tauri::Window;
use walkdir::WalkDir;

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
        cwd.join("../../../../locales"),
    ];
    candidates
        .into_iter()
        .find(|path| path.exists() && path.is_dir())
}

fn find_platforms_dir() -> Option<PathBuf> {
    let cwd = std::env::current_dir().ok()?;
    let candidates = [
        cwd.join("emubro-resources").join("platforms"),
        cwd.join("../emubro-resources").join("platforms"),
        cwd.join("../../emubro-resources").join("platforms"),
        cwd.join("../../../../emubro-resources").join("platforms"),
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

fn read_state_array(key: &str) -> Vec<Value> {
    let state = load_migration_state();
    match state.get(key) {
        Some(Value::Array(rows)) => rows.clone(),
        _ => Vec::new(),
    }
}

fn write_state_array(key: &str, rows: Vec<Value>) -> Result<(), String> {
    let mut state = load_migration_state();
    state.insert(key.to_string(), Value::Array(rows));
    save_migration_state(&state)
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

fn load_platform_configs() -> Vec<Value> {
    let Some(platforms_dir) = find_platforms_dir() else {
        return Vec::new();
    };
    let Ok(entries) = fs::read_dir(platforms_dir) else {
        return Vec::new();
    };

    let mut out = Vec::<Value>::new();
    for entry in entries.flatten() {
        let dir = entry.path();
        if !dir.is_dir() {
            continue;
        }
        let platform_dir = dir
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if platform_dir.is_empty() {
            continue;
        }
        let config_path = dir.join("config.json");
        if !config_path.exists() {
            continue;
        }
        let Ok(raw) = fs::read_to_string(config_path) else {
            continue;
        };
        let Ok(mut parsed) = serde_json::from_str::<Value>(&raw) else {
            continue;
        };
        if let Some(obj) = parsed.as_object_mut() {
            obj.insert("platformDir".to_string(), Value::String(platform_dir.clone()));
            if obj.get("shortName").is_none() {
                obj.insert("shortName".to_string(), Value::String(platform_dir));
            }
        }
        out.push(parsed);
    }
    out
}

fn platform_matches_extension(platform: &Value, extension: &str) -> bool {
    let ext = extension.trim().to_lowercase();
    if ext.is_empty() {
        return false;
    }

    let check_array = |arr: Option<&Vec<Value>>| -> bool {
        arr.map(|rows| {
            rows.iter().any(|item| {
                item.as_str()
                    .map(|s| s.trim().to_lowercase() == ext)
                    .unwrap_or(false)
            })
        })
        .unwrap_or(false)
    };

    if check_array(platform.get("supportedImageTypes").and_then(|v| v.as_array())) {
        return true;
    }
    if check_array(platform.get("supportedArchiveTypes").and_then(|v| v.as_array())) {
        return true;
    }
    if let Some(emulators) = platform.get("emulators").and_then(|v| v.as_array()) {
        for emulator in emulators {
            if check_array(emulator.get("supportedFileTypes").and_then(|v| v.as_array())) {
                return true;
            }
        }
    }
    false
}

fn normalize_tag_id(input: &str) -> String {
    let mut out = String::new();
    for ch in input.trim().to_lowercase().chars() {
        if ch.is_ascii_alphanumeric() {
            out.push(ch);
        } else {
            out.push('-');
        }
    }
    out.trim_matches('-').to_string()
}

fn normalize_extension(value: &str) -> String {
    let trimmed = value.trim().to_lowercase();
    if trimmed.is_empty() {
        return String::new();
    }
    if trimmed.starts_with('.') {
        trimmed
    } else {
        format!(".{}", trimmed)
    }
}

fn next_numeric_id(rows: &[Value]) -> i64 {
    rows.iter()
        .filter_map(|row| row.get("id").and_then(|v| v.as_i64()))
        .max()
        .unwrap_or(0)
        + 1
}

fn path_key(value: &str) -> String {
    value.trim().to_lowercase()
}

fn add_unique_text(rows: &mut Vec<Value>, seen: &mut std::collections::HashSet<String>, value: &str) {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return;
    }
    let key = path_key(trimmed);
    if seen.insert(key) {
        rows.push(Value::String(trimmed.to_string()));
    }
}

fn read_string_array(input: Option<&Value>) -> std::collections::HashSet<String> {
    let mut out = std::collections::HashSet::new();
    let Some(Value::Array(values)) = input else {
        return out;
    };
    for value in values {
        let text = normalize_extension(value.as_str().unwrap_or(""));
        if text.is_empty() {
            continue;
        }
        out.insert(text);
    }
    out
}

fn extension_platform_map(platforms: &[Value]) -> std::collections::HashMap<String, Value> {
    let mut map = std::collections::HashMap::new();
    for platform in platforms {
        let short = platform
            .get("shortName")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_lowercase();
        if short.is_empty() {
            continue;
        }
        let name = platform
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or(&short)
            .trim()
            .to_string();
        let platform_row = json!({
            "shortName": short,
            "name": name
        });
        let mut supported = read_string_array(platform.get("supportedImageTypes"));
        for ext in read_string_array(platform.get("supportedArchiveTypes")) {
            supported.insert(ext);
        }
        for emulator in platform
            .get("emulators")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default()
        {
            for ext in read_string_array(emulator.get("supportedFileTypes")) {
                supported.insert(ext);
            }
        }
        for ext in supported {
            if ext == ".exe" || ext == ".bat" || ext == ".cmd" || ext == ".ps1" {
                continue;
            }
            map.entry(ext).or_insert_with(|| platform_row.clone());
        }
    }
    map
}

fn build_file_dialog(mut dialog: rfd::FileDialog, options: &Value) -> rfd::FileDialog {
    if let Some(title) = options.get("title").and_then(|v| v.as_str()) {
        let trimmed = title.trim();
        if !trimmed.is_empty() {
            dialog = dialog.set_title(trimmed);
        }
    }
    if let Some(default_path) = options.get("defaultPath").and_then(|v| v.as_str()) {
        let trimmed = default_path.trim();
        if !trimmed.is_empty() {
            let p = PathBuf::from(trimmed);
            if p.is_dir() {
                dialog = dialog.set_directory(&p);
            } else if p.is_file() {
                if let Some(parent) = p.parent() {
                    dialog = dialog.set_directory(parent);
                }
                if let Some(name) = p.file_name().and_then(|v| v.to_str()) {
                    dialog = dialog.set_file_name(name);
                }
            } else {
                dialog = dialog.set_directory(&p);
            }
        }
    }
    if let Some(filters) = options.get("filters").and_then(|v| v.as_array()) {
        for filter in filters {
            let name = filter
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("Files")
                .trim()
                .to_string();
            let mut exts = Vec::<String>::new();
            if let Some(raw_exts) = filter.get("extensions").and_then(|v| v.as_array()) {
                for entry in raw_exts {
                    let ext = entry.as_str().unwrap_or("").trim().trim_start_matches('.').to_string();
                    if ext.is_empty() {
                        continue;
                    }
                    exts.push(ext);
                }
            }
            if !exts.is_empty() {
                let refs = exts.iter().map(|v| v.as_str()).collect::<Vec<&str>>();
                dialog = dialog.add_filter(&name, &refs);
            }
        }
    }
    dialog
}

fn options_flag(options: &Value, key: &str) -> bool {
    options
        .get("properties")
        .and_then(|v| v.as_array())
        .map(|rows| {
            rows.iter().any(|entry| {
                entry
                    .as_str()
                    .map(|text| text.trim().eq_ignore_ascii_case(key))
                    .unwrap_or(false)
            })
        })
        .unwrap_or(false)
}

fn resolve_open_file_dialog(options: &Value) -> Value {
    let select_directory = options_flag(options, "openDirectory");
    let allow_multiple = options_flag(options, "multiSelections");
    let dialog = build_file_dialog(rfd::FileDialog::new(), options);

    if select_directory {
        if allow_multiple {
            let picked = dialog.pick_folders().unwrap_or_default();
            let file_paths: Vec<Value> = picked
                .into_iter()
                .map(|p| Value::String(p.to_string_lossy().to_string()))
                .collect();
            return json!({
                "canceled": file_paths.is_empty(),
                "filePaths": file_paths
            });
        }
        let picked = dialog.pick_folder();
        return match picked {
            Some(path) => json!({
                "canceled": false,
                "filePaths": [path.to_string_lossy().to_string()]
            }),
            None => json!({ "canceled": true, "filePaths": [] }),
        };
    }

    if allow_multiple {
        let picked = dialog.pick_files().unwrap_or_default();
        let file_paths: Vec<Value> = picked
            .into_iter()
            .map(|p| Value::String(p.to_string_lossy().to_string()))
            .collect();
        return json!({
            "canceled": file_paths.is_empty(),
            "filePaths": file_paths
        });
    }

    let picked = dialog.pick_file();
    match picked {
        Some(path) => json!({
            "canceled": false,
            "filePaths": [path.to_string_lossy().to_string()]
        }),
        None => json!({ "canceled": true, "filePaths": [] }),
    }
}

fn resolve_save_file_dialog(options: &Value) -> Value {
    let dialog = build_file_dialog(rfd::FileDialog::new(), options);
    match dialog.save_file() {
        Some(path) => json!({
            "canceled": false,
            "filePath": path.to_string_lossy().to_string()
        }),
        None => json!({
            "canceled": true,
            "filePath": ""
        }),
    }
}

fn scan_and_import_games_and_emulators(scan_target: &str, options: Option<&Value>) -> Result<Value, String> {
    let scope = options
        .and_then(|v| v.get("scope"))
        .and_then(|v| v.as_str())
        .unwrap_or("both")
        .trim()
        .to_lowercase();
    let scan_games = scope != "emulators";
    let scan_emulators = scope != "games";
    let recursive = options
        .and_then(|v| v.get("recursive"))
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    let max_depth = options
        .and_then(|v| v.get("maxDepth"))
        .and_then(|v| v.as_u64())
        .unwrap_or(if recursive { 20 } else { 0 }) as usize;

    let root = if scan_target.trim().is_empty() {
        std::env::current_dir().map_err(|e| e.to_string())?
    } else {
        PathBuf::from(scan_target.trim())
    };
    if !root.exists() || !root.is_dir() {
        return Ok(json!({
            "success": false,
            "message": "Scan path does not exist",
            "games": [],
            "emulators": [],
            "archives": [],
            "setupFiles": []
        }));
    }

    let platform_rows = load_platform_configs();
    let extension_map = extension_platform_map(&platform_rows);
    let archive_exts: std::collections::HashSet<String> = [".zip", ".rar", ".7z", ".iso", ".tar", ".gz"]
        .into_iter()
        .map(|v| v.to_string())
        .collect();
    let emulator_exts: std::collections::HashSet<String> = [".exe", ".bat", ".cmd", ".ps1", ".sh", ".appimage"]
        .into_iter()
        .map(|v| v.to_string())
        .collect();

    let mut games = read_state_array("games");
    let mut emulators = read_state_array("emulators");
    let mut games_seen = games
        .iter()
        .filter_map(|row| row.get("filePath").and_then(|v| v.as_str()))
        .map(path_key)
        .collect::<std::collections::HashSet<String>>();
    let mut emulators_seen = emulators
        .iter()
        .filter_map(|row| row.get("filePath").and_then(|v| v.as_str()))
        .map(path_key)
        .collect::<std::collections::HashSet<String>>();
    let mut archives_seen = std::collections::HashSet::new();
    let mut setup_seen = std::collections::HashSet::new();

    let mut found_games = Vec::<Value>::new();
    let mut found_emulators = Vec::<Value>::new();
    let mut found_archives = Vec::<Value>::new();
    let mut found_setup_files = Vec::<Value>::new();

    let mut next_game_id = next_numeric_id(&games);
    let mut next_emulator_id = next_numeric_id(&emulators);
    let max_findings = 1500usize;

    for entry in WalkDir::new(&root)
        .follow_links(false)
        .max_depth(max_depth)
        .into_iter()
        .filter_map(|row| row.ok())
    {
        if found_games.len() + found_emulators.len() >= max_findings {
            break;
        }
        if !entry.file_type().is_file() {
            continue;
        }
        let file_path = entry.path().to_string_lossy().to_string();
        if file_path.trim().is_empty() {
            continue;
        }
        let ext = normalize_extension(
            entry
                .path()
                .extension()
                .and_then(|v| v.to_str())
                .unwrap_or(""),
        );
        if ext.is_empty() {
            continue;
        }

        if archive_exts.contains(&ext) {
            add_unique_text(&mut found_archives, &mut archives_seen, &file_path);
        }
        let file_name = entry.file_name().to_string_lossy().to_lowercase();
        if file_name.contains("setup") && (ext == ".exe" || ext == ".msi" || ext == ".pkg") {
            add_unique_text(&mut found_setup_files, &mut setup_seen, &file_path);
        }

        if scan_games {
            if let Some(platform) = extension_map.get(&ext) {
                let key = path_key(&file_path);
                if games_seen.insert(key) {
                    let title = entry
                        .path()
                        .file_stem()
                        .and_then(|v| v.to_str())
                        .unwrap_or("Unknown")
                        .trim()
                        .to_string();
                    let platform_short = platform
                        .get("shortName")
                        .and_then(|v| v.as_str())
                        .unwrap_or("unknown")
                        .trim()
                        .to_lowercase();
                    let platform_name = platform
                        .get("name")
                        .and_then(|v| v.as_str())
                        .unwrap_or("Unknown")
                        .trim()
                        .to_string();
                    let row = json!({
                        "id": next_game_id,
                        "name": title,
                        "platform": platform_name,
                        "platformShortName": platform_short,
                        "filePath": file_path,
                        "code": "",
                        "image": "",
                        "progress": 0,
                        "tags": []
                    });
                    next_game_id += 1;
                    games.push(row.clone());
                    found_games.push(row);
                    continue;
                }
            }
        }

        if scan_emulators && emulator_exts.contains(&ext) {
            let key = path_key(&file_path);
            if emulators_seen.insert(key) {
                let name = entry
                    .path()
                    .file_stem()
                    .and_then(|v| v.to_str())
                    .unwrap_or("Emulator")
                    .trim()
                    .to_string();
                let row = json!({
                    "id": next_emulator_id,
                    "name": name,
                    "filePath": file_path,
                    "platformShortName": "",
                    "args": "",
                    "workingDirectory": entry.path().parent().map(|p| p.to_string_lossy().to_string()).unwrap_or_default()
                });
                next_emulator_id += 1;
                emulators.push(row.clone());
                found_emulators.push(row);
            }
        }
    }

    if !found_games.is_empty() {
        write_state_array("games", games)?;
    }
    if !found_emulators.is_empty() {
        write_state_array("emulators", emulators)?;
    }

    Ok(json!({
        "success": true,
        "games": found_games,
        "emulators": found_emulators,
        "archives": found_archives,
        "setupFiles": found_setup_files
    }))
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
            if let Some(value) = payload.get("filePath").and_then(|v| v.as_str()) {
                game_obj.insert("filePath".to_string(), Value::String(value.trim().to_string()));
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
        "tags:rename" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let old_tag = normalize_tag_id(payload.get("oldTagId").and_then(|v| v.as_str()).unwrap_or(""));
            let new_label = payload
                .get("newTagName")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if old_tag.is_empty() || new_label.is_empty() {
                return Ok(json!({ "success": false, "message": "Invalid tag payload" }));
            }
            let new_tag = normalize_tag_id(&new_label);
            if new_tag.is_empty() {
                return Ok(json!({ "success": false, "message": "Invalid tag name" }));
            }

            let mut tags = read_state_array("tags");
            let existing_new = tags.iter().any(|row| {
                row.get("id")
                    .and_then(|v| v.as_str())
                    .map(|s| s.eq_ignore_ascii_case(&new_tag))
                    .unwrap_or(false)
            });
            let mut found_old = false;
            for row in &mut tags {
                if row
                    .get("id")
                    .and_then(|v| v.as_str())
                    .map(|s| s.eq_ignore_ascii_case(&old_tag))
                    .unwrap_or(false)
                {
                    found_old = true;
                    if let Some(obj) = row.as_object_mut() {
                        obj.insert("id".to_string(), Value::String(new_tag.clone()));
                        obj.insert("label".to_string(), Value::String(new_label.clone()));
                    }
                }
            }
            if !found_old {
                return Ok(json!({ "success": false, "message": "Tag not found" }));
            }
            if existing_new {
                tags.retain(|row| {
                    row.get("id")
                        .and_then(|v| v.as_str())
                        .map(|s| !s.eq_ignore_ascii_case(&old_tag))
                        .unwrap_or(true)
                });
            }

            let mut games = read_state_array("games");
            for game in &mut games {
                if let Some(obj) = game.as_object_mut() {
                    let tags_arr = obj
                        .get("tags")
                        .and_then(|v| v.as_array())
                        .cloned()
                        .unwrap_or_default();
                    let mut out = Vec::<Value>::new();
                    for tag in tags_arr {
                        let text = normalize_tag_id(tag.as_str().unwrap_or(""));
                        if text.is_empty() {
                            continue;
                        }
                        if text == old_tag {
                            out.push(Value::String(new_tag.clone()));
                        } else {
                            out.push(Value::String(text));
                        }
                    }
                    obj.insert("tags".to_string(), Value::Array(out));
                }
            }

            write_state_array("tags", tags)?;
            write_state_array("games", games)?;
            Ok(json!({
                "success": true,
                "newTagId": new_tag,
                "newLabel": new_label,
                "merged": existing_new
            }))
        }
        "tags:delete" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let tag_id = normalize_tag_id(payload.get("tagId").and_then(|v| v.as_str()).unwrap_or(""));
            if tag_id.is_empty() {
                return Ok(json!({ "success": false, "message": "Invalid tag id" }));
            }

            let mut tags = read_state_array("tags");
            let before = tags.len();
            tags.retain(|row| {
                row.get("id")
                    .and_then(|v| v.as_str())
                    .map(|s| !s.eq_ignore_ascii_case(&tag_id))
                    .unwrap_or(true)
            });
            if tags.len() == before {
                return Ok(json!({ "success": false, "message": "Tag not found" }));
            }

            let mut games = read_state_array("games");
            for game in &mut games {
                if let Some(obj) = game.as_object_mut() {
                    let tags_arr = obj
                        .get("tags")
                        .and_then(|v| v.as_array())
                        .cloned()
                        .unwrap_or_default();
                    let out: Vec<Value> = tags_arr
                        .into_iter()
                        .filter(|tag| !normalize_tag_id(tag.as_str().unwrap_or("")).eq_ignore_ascii_case(&tag_id))
                        .collect();
                    obj.insert("tags".to_string(), Value::Array(out));
                }
            }

            write_state_array("tags", tags)?;
            write_state_array("games", games)?;
            Ok(json!({ "success": true }))
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
        "open-external-url" => {
            let raw_url = args.get(0).and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
            if raw_url.is_empty() {
                return Ok(json!({ "success": false, "message": "Missing URL" }));
            }
            let normalized = if raw_url.to_lowercase().starts_with("http://")
                || raw_url.to_lowercase().starts_with("https://")
            {
                raw_url
            } else {
                format!("https://{}", raw_url)
            };
            match open::that(&normalized) {
                Ok(_) => Ok(json!({ "success": true, "url": normalized })),
                Err(err) => Ok(json!({ "success": false, "message": err.to_string() })),
            }
        }
        "show-item-in-folder" => {
            let raw_path = args.get(0).and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
            if raw_path.is_empty() {
                return Ok(json!({ "success": false, "message": "Missing path" }));
            }
            let target = PathBuf::from(&raw_path);
            if !target.exists() {
                return Ok(json!({ "success": false, "message": "Path not found" }));
            }
            #[cfg(target_os = "windows")]
            {
                let status = if target.is_file() {
                    Command::new("explorer")
                        .arg(format!("/select,{}", raw_path))
                        .status()
                } else {
                    Command::new("explorer").arg(&raw_path).status()
                };
                match status {
                    Ok(_) => return Ok(json!({ "success": true })),
                    Err(err) => return Ok(json!({ "success": false, "message": err.to_string() })),
                }
            }
            #[cfg(not(target_os = "windows"))]
            {
                let open_target = if target.is_file() {
                    target.parent().unwrap_or(&target).to_path_buf()
                } else {
                    target.clone()
                };
                match open::that(open_target) {
                    Ok(_) => Ok(json!({ "success": true })),
                    Err(err) => Ok(json!({ "success": false, "message": err.to_string() })),
                }
            }
        }
        "browse-games-and-emus" => {
            let scan_target = args.get(0).and_then(|v| v.as_str()).unwrap_or("");
            scan_and_import_games_and_emulators(scan_target, args.get(1))
        }
        "get-file-icon-data-url" => Ok(json!({
            "success": false,
            "message": "Not implemented in Tauri migration yet",
            "dataUrl": ""
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
        | "resources:update:install"
        | "import-paths"
        | "import-exe"
        | "stage-import-paths"
        | "analyze-import-paths"
        | "detect-emulator-exe"
        | "cue:inspect-bin-files"
        | "cue:generate-for-bin"
        | "import:analyze-archives"
        | "import-files-as-platform"
        | "iso:detect-game-codes"
        | "launcher:scan-games"
        | "launcher:import-games"
        | "locales:write"
        | "locales:delete"
        | "locales:rename"
        | "locales:flags:get-data-url"
        | "locales:flags:write-data-url"
        | "locales:flags:write-from-file"
        | "locales:repo:get-config"
        | "locales:repo:set-config"
        | "locales:repo:fetch-catalog"
        | "locales:repo:install"
        | "search-missing-game-file"
        | "relink-game-file"
        | "launch-game"
        | "launch-emulator"
        | "youtube:search-videos"
        | "youtube:open-video"
        | "covers:download-for-game"
        | "covers:download-for-library"
        | "covers:get-source-config"
        | "suggestions:recommend-games"
        | "suggestions:list-ollama-models"
        | "suggestions:relay:sync-host-settings"
        | "suggestions:relay:scan-network"
        | "suggestions:relay:get-status"
        | "suggestions:relay:get-connections"
        | "suggestions:emulation-support"
        | "suggestions:generate-theme"
        | "suggestions:translate-locale-missing"
        | "suggestions:suggest-tags-for-game"
        | "suggestions:suggest-tags-for-games-batch"
        | "tools:ecm:get-download-info"
        | "tools:ecm:download-source-zip"
        | "tools:ecm:detect-build-env"
        | "tools:ecm:build-binaries"
        | "tools:ecm:get-compiler-install-options"
        | "tools:ecm:install-compiler"
        | "bios:list"
        | "bios:add-files"
        | "bios:open-folder"
        | "read-memory-card"
        | "delete-save"
        | "undelete-save"
        | "rename-save"
        | "format-card"
        | "copy-save"
        | "export-save"
        | "import-save"
        | "memory-card:create-empty"
        | "browse-memory-cards"
        | "remote:host:get-config"
        | "remote:host:set-config"
        | "remote:host:get-status"
        | "remote:host:get-pairing"
        | "remote:host:rotate-pairing"
        | "remote:client:scan"
        | "remote:client:get-hosts"
        | "remote:client:set-hosts"
        | "remote:client:pair"
        | "remote:client:list-games"
        | "remote:client:download-file"
        | "help:docs:list"
        | "help:docs:get"
        | "help:docs:search"
        | "get-monitor-info"
        | "detect-monitors"
        | "set-monitor-orientation"
        | "toggle-monitor-orientation"
        | "set-monitor-display-state"
        | "set-primary-monitor"
        | "system:get-specs"
        | "create-game-shortcut" => Ok(not_implemented()),
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
