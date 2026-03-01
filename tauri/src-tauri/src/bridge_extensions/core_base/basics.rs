use super::*;

pub(crate) fn app_version_impl() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

pub(crate) fn unix_timestamp_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0)
}

pub(crate) fn managed_data_root() -> PathBuf {
    std::env::current_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join(".emubro-tauri-data")
}

pub(crate) fn ensure_directory(path: &Path) -> Result<(), String> {
    fs::create_dir_all(path).map_err(|e| e.to_string())
}

pub(crate) fn user_home_dir() -> Option<PathBuf> {
    for key in ["USERPROFILE", "HOME"] {
        if let Ok(value) = std::env::var(key) {
            let trimmed = value.trim();
            if !trimmed.is_empty() {
                return Some(PathBuf::from(trimmed));
            }
        }
    }
    None
}

pub(crate) fn find_locales_dir() -> Option<PathBuf> {
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

pub(crate) fn find_platforms_dir() -> Option<PathBuf> {
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

pub(crate) fn locale_file_path(base: &Path, file_name: &str) -> Option<PathBuf> {
    let name = String::from(file_name).trim().to_string();
    if name.is_empty() {
        return None;
    }
    if name.contains("..") || name.contains('/') || name.contains('\\') {
        return None;
    }
    Some(base.join(name))
}

pub(crate) fn normalize_locale_payload(file_stem: &str, parsed: Value) -> Value {
    let Value::Object(mut root) = parsed else {
        return Value::Object(serde_json::Map::new());
    };

    if root.len() == 1 {
        let matched_key = root
            .keys()
            .find(|key| key.trim().eq_ignore_ascii_case(file_stem))
            .cloned();
        if let Some(key) = matched_key {
            return root.remove(&key).unwrap_or_else(|| Value::Object(serde_json::Map::new()));
        }
    }

    Value::Object(root)
}

pub(crate) fn read_all_translations_from_disk() -> Value {
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
        out.insert(stem.clone(), normalize_locale_payload(&stem, parsed));
    }

    Value::Object(out)
}
