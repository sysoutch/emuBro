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
