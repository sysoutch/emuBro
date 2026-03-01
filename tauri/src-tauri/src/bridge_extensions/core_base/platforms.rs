use super::*;

pub(crate) fn normalize_path_list(input: Option<&Value>) -> Vec<Value> {
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

pub(crate) fn default_library_path_settings() -> Value {
    json!({
        "scanFolders": [],
        "gameFolders": [],
        "emulatorFolders": []
    })
}

pub(crate) fn normalize_library_path_settings(payload: Option<&Value>) -> Value {
    let scan_folders = normalize_path_list(payload.and_then(|v| v.get("scanFolders")));
    let game_folders = normalize_path_list(payload.and_then(|v| v.get("gameFolders")));
    let emulator_folders = normalize_path_list(payload.and_then(|v| v.get("emulatorFolders")));
    json!({
        "scanFolders": scan_folders,
        "gameFolders": game_folders,
        "emulatorFolders": emulator_folders
    })
}

pub(crate) fn read_library_path_settings() -> Value {
    let Ok(conn) = open_state_db() else {
        return default_library_path_settings();
    };
    match db_get_state_value(&conn, "libraryPathSettings") {
        Ok(Some(value)) => normalize_library_path_settings(Some(&value)),
        _ => default_library_path_settings(),
    }
}

pub(crate) fn write_library_path_settings(payload: Option<&Value>) -> Result<Value, String> {
    let normalized = normalize_library_path_settings(payload);
    let conn = open_state_db()?;
    db_set_state_value(&conn, "libraryPathSettings", &normalized)?;
    Ok(normalized)
}

pub(crate) fn load_platform_configs() -> Vec<Value> {
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

pub(crate) fn platform_matches_extension(platform: &Value, extension: &str) -> bool {
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

pub(crate) fn normalize_tag_id(input: &str) -> String {
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

pub(crate) fn normalize_extension(value: &str) -> String {
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

pub(crate) fn next_numeric_id(rows: &[Value]) -> i64 {
    rows.iter()
        .filter_map(|row| row.get("id").and_then(|v| v.as_i64()))
        .max()
        .unwrap_or(0)
        + 1
}

pub(crate) fn path_key(value: &str) -> String {
    value.trim().to_lowercase()
}

pub(crate) fn add_unique_text(rows: &mut Vec<Value>, seen: &mut std::collections::HashSet<String>, value: &str) {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return;
    }
    let key = path_key(trimmed);
    if seen.insert(key) {
        rows.push(Value::String(trimmed.to_string()));
    }
}

pub(crate) fn read_string_array(input: Option<&Value>) -> std::collections::HashSet<String> {
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

pub(crate) fn extension_platform_map(platforms: &[Value]) -> std::collections::HashMap<String, Value> {
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
