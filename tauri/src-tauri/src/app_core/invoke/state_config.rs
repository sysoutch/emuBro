use super::*;
use serde_json::json;

pub(super) fn handle(ch: &str, args: &[Value], _window: &Window) -> Result<Value, String> {
    match ch {
        "get-games" => Ok(Value::Array(read_state_array("games"))),
        "get-emulators" => Ok(Value::Array(list_emulators_for_library())),
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
        "settings:get-splash-theme" => Ok(json!({
            "success": true,
            "theme": read_splash_theme_settings()
        })),
        "settings:set-splash-theme" => {
            let theme = write_splash_theme_settings(args.get(0))?;
            Ok(json!({ "success": true, "theme": theme }))
        }
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

fn list_emulators_for_library() -> Vec<Value> {
    let installed = normalize_emulator_rows(read_state_array("emulators"));
    if installed.is_empty() {
        return configured_emulator_rows();
    }
    installed
}

fn configured_emulator_rows() -> Vec<Value> {
    let mut out = Vec::<Value>::new();
    let mut seen = std::collections::HashSet::<String>::new();

    for platform in load_platform_configs() {
        let platform_short = normalize_platform_short_name(
            platform
                .get("shortName")
                .or_else(|| platform.get("platformDir"))
                .and_then(|v| v.as_str())
                .unwrap_or(""),
        );
        if platform_short.is_empty() {
            continue;
        }
        let platform_name = platform
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or(&platform_short)
            .trim()
            .to_string();
        let Some(emulators) = platform.get("emulators").and_then(|v| v.as_array()) else {
            continue;
        };

        for emu in emulators {
            let name = emu
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if name.is_empty() {
                continue;
            }
            let name_key = normalize_emulator_name_key(&name);
            let dedupe_key = format!("{}::{}", platform_short, name_key);
            if !seen.insert(dedupe_key) {
                continue;
            }

            let row = json!({
                "id": format!("cfg:{}:{}", platform_short, if name_key.is_empty() { "emu" } else { &name_key }),
                "name": name,
                "platform": platform_name,
                "platformShortName": platform_short,
                "type": normalize_emulator_type(emu.get("type").and_then(|v| v.as_str()).unwrap_or("standalone")),
                "filePath": "",
                "filePaths": [],
                "isInstalled": false,
                "website": emu.get("website").and_then(|v| v.as_str()).unwrap_or("").trim(),
                "downloadUrl": emu.get("downloadUrl").cloned().unwrap_or(Value::Null),
                "downloadLinks": emulator_download_links(emu),
                "startParameters": emu.get("startParameters").and_then(|v| v.as_str()).unwrap_or("").trim(),
                "searchString": emu.get("searchString").and_then(|v| v.as_str()).unwrap_or("").trim(),
                "archiveFileMatchWin": emu.get("archiveFileMatchWin").and_then(|v| v.as_str()).unwrap_or("").trim(),
                "archiveFileMatchLinux": emu.get("archiveFileMatchLinux").and_then(|v| v.as_str()).unwrap_or("").trim(),
                "archiveFileMatchMac": emu.get("archiveFileMatchMac").and_then(|v| v.as_str()).unwrap_or("").trim(),
                "setupFileMatchWin": emu.get("setupFileMatchWin").and_then(|v| v.as_str()).unwrap_or("").trim(),
                "setupFileMatchLinux": emu.get("setupFileMatchLinux").and_then(|v| v.as_str()).unwrap_or("").trim(),
                "setupFileMatchMac": emu.get("setupFileMatchMac").and_then(|v| v.as_str()).unwrap_or("").trim(),
                "executableFileMatchWin": emu.get("executableFileMatchWin").and_then(|v| v.as_str()).unwrap_or("").trim(),
                "executableFileMatchLinux": emu.get("executableFileMatchLinux").and_then(|v| v.as_str()).unwrap_or("").trim(),
                "executableFileMatchMac": emu.get("executableFileMatchMac").and_then(|v| v.as_str()).unwrap_or("").trim(),
                "configFilePath": emu.get("configFilePath").and_then(|v| v.as_str()).unwrap_or("").trim(),
                "runCommandsBefore": normalized_string_array(emu.get("runCommandsBefore")),
                "installers": emu.get("installers").and_then(|v| v.as_object()).cloned().map(Value::Object).unwrap_or(Value::Null),
                "supportedFileTypes": normalized_string_array(emu.get("supportedFileTypes")),
                "biosRequired": emu.get("biosRequired").and_then(|v| v.as_bool()).unwrap_or(false),
                "autoSearchEnabled": emu.get("autoSearchEnabled").and_then(|v| v.as_bool()).unwrap_or(true),
                "iconFilename": emu.get("iconFilename").and_then(|v| v.as_str()).unwrap_or("").trim(),
                "source": "config"
            });
            out.push(row);
        }
    }

    out.sort_by(|a, b| {
        let ap = a
            .get("platform")
            .or_else(|| a.get("platformShortName"))
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let bp = b
            .get("platform")
            .or_else(|| b.get("platformShortName"))
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let pc = ap.cmp(bp);
        if pc != std::cmp::Ordering::Equal {
            return pc;
        }
        let an = a.get("name").and_then(|v| v.as_str()).unwrap_or("");
        let bn = b.get("name").and_then(|v| v.as_str()).unwrap_or("");
        an.cmp(bn)
    });

    out
}

fn normalize_emulator_rows(rows: Vec<Value>) -> Vec<Value> {
    rows.into_iter()
        .map(|row| {
            let mut obj = row.as_object().cloned().unwrap_or_default();

            let path = obj
                .get("filePath")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            let mut paths = vec![];
            let mut seen = std::collections::HashSet::<String>::new();

            if let Some(list) = obj.get("filePaths").and_then(|v| v.as_array()) {
                for item in list {
                    let text = item.as_str().unwrap_or("").trim().to_string();
                    if text.is_empty() {
                        continue;
                    }
                    let key = text.to_lowercase();
                    if seen.insert(key) {
                        paths.push(text);
                    }
                }
            }
            if !path.is_empty() {
                let key = path.to_lowercase();
                if seen.insert(key) {
                    paths.push(path.clone());
                }
            }

            let is_installed = paths
                .iter()
                .any(|entry| Path::new(entry).exists())
                || obj.get("isInstalled").and_then(|v| v.as_bool()).unwrap_or(false);

            let platform_short = normalize_platform_short_name(
                obj.get("platformShortName")
                    .or_else(|| obj.get("platform"))
                    .and_then(|v| v.as_str())
                    .unwrap_or(""),
            );
            let platform_name = obj
                .get("platform")
                .and_then(|v| v.as_str())
                .unwrap_or(&platform_short)
                .trim()
                .to_string();
            let typ = normalize_emulator_type(
                obj.get("type")
                    .or_else(|| obj.get("emulatorType"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("standalone"),
            );

            obj.insert("filePath".to_string(), Value::String(path));
            obj.insert(
                "filePaths".to_string(),
                Value::Array(paths.into_iter().map(Value::String).collect()),
            );
            obj.insert("isInstalled".to_string(), Value::Bool(is_installed));
            obj.insert("type".to_string(), Value::String(typ));
            obj.insert("platformShortName".to_string(), Value::String(platform_short));
            obj.insert("platform".to_string(), Value::String(platform_name));

            let links = emulator_download_links(&Value::Object(obj.clone()));
            obj.insert("downloadLinks".to_string(), links);
            Value::Object(obj)
        })
        .collect()
}

fn normalize_emulator_type(raw: &str) -> String {
    let value = raw.trim().to_lowercase();
    if value == "core" || value == "web" {
        return value;
    }
    "standalone".to_string()
}

fn normalize_emulator_name_key(raw: &str) -> String {
    raw.trim()
        .to_lowercase()
        .chars()
        .filter(|ch| ch.is_ascii_alphanumeric())
        .collect::<String>()
}

fn normalized_string_array(input: Option<&Value>) -> Vec<Value> {
    input
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .filter_map(|v| v.as_str().map(|s| s.trim().to_string()))
        .filter(|s| !s.is_empty())
        .map(Value::String)
        .collect()
}

fn normalize_download_link_url(value: &str) -> String {
    let text = value.trim();
    if text.is_empty() {
        return String::new();
    }
    if text.to_lowercase().starts_with("http://") || text.to_lowercase().starts_with("https://") {
        return text.to_string();
    }
    format!("https://{}", text)
}

fn first_non_empty_url(value: Option<&Value>) -> String {
    if let Some(text) = value.and_then(|v| v.as_str()) {
        let normalized = normalize_download_link_url(text);
        if !normalized.is_empty() {
            return normalized;
        }
    }
    if let Some(arr) = value.and_then(|v| v.as_array()) {
        for item in arr {
            let normalized = normalize_download_link_url(item.as_str().unwrap_or(""));
            if !normalized.is_empty() {
                return normalized;
            }
        }
    }
    String::new()
}

fn read_download_link_for_keys(
    direct_links: Option<&serde_json::Map<String, Value>>,
    download_url: Option<&serde_json::Map<String, Value>>,
    keys: &[&str],
) -> String {
    for key in keys {
        let normalized = first_non_empty_url(direct_links.and_then(|m| m.get(*key)));
        if !normalized.is_empty() {
            return normalized;
        }
    }
    for key in keys {
        let normalized = first_non_empty_url(download_url.and_then(|m| m.get(*key)));
        if !normalized.is_empty() {
            return normalized;
        }
    }
    String::new()
}

fn emulator_download_links(row: &Value) -> Value {
    let direct_links = row.get("downloadLinks").and_then(|v| v.as_object());
    let download_url = row.get("downloadUrl").and_then(|v| v.as_object());

    let windows = read_download_link_for_keys(
        direct_links,
        download_url,
        &["windows", "win", "win32", "default", "all", "any"],
    );
    let linux = read_download_link_for_keys(
        direct_links,
        download_url,
        &["linux", "default", "all", "any"],
    );
    let mac = read_download_link_for_keys(
        direct_links,
        download_url,
        &["mac", "macos", "darwin", "osx", "default", "all", "any"],
    );

    json!({
        "windows": windows,
        "linux": linux,
        "mac": mac
    })
}

const SPLASH_THEME_STATE_KEY: &str = "splashThemeSettings";

fn default_splash_theme_settings() -> Value {
    json!({
        "id": "dark",
        "tone": "dark",
        "bgPrimary": "#0b1220",
        "bgSecondary": "#121c2f",
        "bgTertiary": "#1a263d",
        "textPrimary": "#e7edf8",
        "textSecondary": "#b9c7dc",
        "accentColor": "#32b8de",
        "accentLight": "#8fe6ff",
        "fontBody": "Segoe UI, Inter, sans-serif",
        "appGradientA": "#0b1220",
        "appGradientB": "#121c2f",
        "appGradientC": "#1a263d"
    })
}

fn is_hex_color(input: &str) -> bool {
    let text = input.trim();
    if !text.starts_with('#') {
        return false;
    }
    let hex = &text[1..];
    matches!(hex.len(), 3 | 4 | 6 | 8) && hex.chars().all(|ch| ch.is_ascii_hexdigit())
}

fn read_color_field(source: Option<&Value>, key: &str, fallback: &str) -> String {
    let value = source
        .and_then(|v| v.get(key))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    if is_hex_color(&value) {
        value
    } else {
        fallback.to_string()
    }
}

fn normalize_splash_theme_settings(payload: Option<&Value>) -> Value {
    let defaults = default_splash_theme_settings();
    let default_obj = defaults.as_object().cloned().unwrap_or_default();

    let id = payload
        .and_then(|v| v.get("id"))
        .and_then(|v| v.as_str())
        .unwrap_or(default_obj.get("id").and_then(|v| v.as_str()).unwrap_or("dark"))
        .trim();
    let tone_raw = payload
        .and_then(|v| v.get("tone"))
        .and_then(|v| v.as_str())
        .unwrap_or("dark")
        .trim()
        .to_lowercase();
    let tone = if tone_raw == "light" { "light" } else { "dark" };

    let default_bg_primary = default_obj
        .get("bgPrimary")
        .and_then(|v| v.as_str())
        .unwrap_or("#0b1220");
    let default_bg_secondary = default_obj
        .get("bgSecondary")
        .and_then(|v| v.as_str())
        .unwrap_or("#121c2f");
    let default_bg_tertiary = default_obj
        .get("bgTertiary")
        .and_then(|v| v.as_str())
        .unwrap_or("#1a263d");
    let default_text_primary = default_obj
        .get("textPrimary")
        .and_then(|v| v.as_str())
        .unwrap_or("#e7edf8");
    let default_text_secondary = default_obj
        .get("textSecondary")
        .and_then(|v| v.as_str())
        .unwrap_or("#b9c7dc");
    let default_accent = default_obj
        .get("accentColor")
        .and_then(|v| v.as_str())
        .unwrap_or("#32b8de");
    let default_accent_light = default_obj
        .get("accentLight")
        .and_then(|v| v.as_str())
        .unwrap_or("#8fe6ff");

    let bg_primary = read_color_field(payload, "bgPrimary", default_bg_primary);
    let bg_secondary = read_color_field(payload, "bgSecondary", default_bg_secondary);
    let bg_tertiary = read_color_field(payload, "bgTertiary", default_bg_tertiary);
    let text_primary = read_color_field(payload, "textPrimary", default_text_primary);
    let text_secondary = read_color_field(payload, "textSecondary", default_text_secondary);
    let accent_color = read_color_field(payload, "accentColor", default_accent);
    let accent_light = read_color_field(payload, "accentLight", default_accent_light);
    let app_gradient_a = read_color_field(payload, "appGradientA", &bg_primary);
    let app_gradient_b = read_color_field(payload, "appGradientB", &bg_secondary);
    let app_gradient_c = read_color_field(payload, "appGradientC", &bg_tertiary);
    let font_body = payload
        .and_then(|v| v.get("fontBody"))
        .and_then(|v| v.as_str())
        .unwrap_or(default_obj.get("fontBody").and_then(|v| v.as_str()).unwrap_or("Segoe UI, Inter, sans-serif"))
        .trim();

    json!({
        "id": if id.is_empty() { "dark" } else { id },
        "tone": tone,
        "bgPrimary": bg_primary,
        "bgSecondary": bg_secondary,
        "bgTertiary": bg_tertiary,
        "textPrimary": text_primary,
        "textSecondary": text_secondary,
        "accentColor": accent_color,
        "accentLight": accent_light,
        "fontBody": if font_body.is_empty() { "Segoe UI, Inter, sans-serif" } else { font_body },
        "appGradientA": app_gradient_a,
        "appGradientB": app_gradient_b,
        "appGradientC": app_gradient_c
    })
}

fn read_splash_theme_settings() -> Value {
    let Ok(conn) = open_state_db() else {
        return default_splash_theme_settings();
    };
    match db_get_state_value(&conn, SPLASH_THEME_STATE_KEY) {
        Ok(Some(value)) => normalize_splash_theme_settings(Some(&value)),
        _ => default_splash_theme_settings(),
    }
}

fn write_splash_theme_settings(payload: Option<&Value>) -> Result<Value, String> {
    let normalized = normalize_splash_theme_settings(payload);
    let conn = open_state_db()?;
    db_set_state_value(&conn, SPLASH_THEME_STATE_KEY, &normalized)?;
    Ok(normalized)
}
