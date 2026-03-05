use super::*;

const RESOURCES_UPDATE_CONFIG_KEY: &str = "resources:update:config:v1";

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
    if let Ok(explicit_dir) = std::env::var("EMUBRO_MANAGED_DATA_DIR") {
        let trimmed = explicit_dir.trim();
        if !trimmed.is_empty() {
            return PathBuf::from(trimmed);
        }
    }

    if let Ok(local_appdata) = std::env::var("LOCALAPPDATA") {
        let trimmed = local_appdata.trim();
        if !trimmed.is_empty() {
            return PathBuf::from(trimmed).join("emuBro");
        }
    }

    if let Ok(xdg_data_home) = std::env::var("XDG_DATA_HOME") {
        let trimmed = xdg_data_home.trim();
        if !trimmed.is_empty() {
            return PathBuf::from(trimmed).join("emuBro");
        }
    }

    if let Some(home_dir) = user_home_dir() {
        if cfg!(target_os = "macos") {
            return home_dir.join("Library").join("Application Support").join("emuBro");
        }
        return home_dir.join(".local").join("share").join("emuBro");
    }

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
    for root in resource_search_roots() {
        let candidates = [
            root.join("locales"),
            root.join("legacy").join("locales"),
            root.join("bundle-resources").join("locales"),
            root.join("bundle-resources").join("legacy").join("locales"),
            root.join("resources").join("bundle-resources").join("locales"),
            root.join("resources")
                .join("bundle-resources")
                .join("legacy")
                .join("locales"),
        ];
        for path in candidates {
            if path.exists() && path.is_dir() {
                return Some(path);
            }
        }
    }
    None
}

pub(crate) fn find_platforms_dir() -> Option<PathBuf> {
    for root in resource_search_roots() {
        let candidates = [
            root.join("platforms"),
            root.join("emubro-resources").join("platforms"),
            root.join("legacy").join("emubro-resources").join("platforms"),
            root.join("bundle-resources")
                .join("emubro-resources")
                .join("platforms"),
            root.join("bundle-resources")
                .join("legacy")
                .join("emubro-resources")
                .join("platforms"),
            root.join("resources")
                .join("bundle-resources")
                .join("emubro-resources")
                .join("platforms"),
            root.join("resources")
                .join("emubro-resources")
                .join("platforms"),
            root.join("resources").join("platforms"),
            root.join("resources")
                .join("bundle-resources")
                .join("legacy")
                .join("emubro-resources")
                .join("platforms"),
        ];
        for path in candidates {
            if path.exists() && path.is_dir() {
                return Some(path);
            }
        }
    }
    None
}

fn resource_search_roots() -> Vec<PathBuf> {
    let mut roots = Vec::<PathBuf>::new();
    let mut seen = std::collections::HashSet::<String>::new();

    let mut push = |path: PathBuf| {
        let key = path.to_string_lossy().to_lowercase();
        if seen.insert(key) {
            roots.push(path);
        }
    };

    if let Ok(cwd) = std::env::current_dir() {
        push(cwd.clone());
        if let Some(parent) = cwd.parent() {
            push(parent.to_path_buf());
            if let Some(grand_parent) = parent.parent() {
                push(grand_parent.to_path_buf());
            }
        }
    }

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            push(exe_dir.to_path_buf());
            if let Some(parent) = exe_dir.parent() {
                push(parent.to_path_buf());
                push(parent.join("resources"));
            }
        }
    }

    if let Ok(resources_dir) = std::env::var("EMUBRO_BUNDLE_RESOURCES_DIR") {
        let trimmed = resources_dir.trim();
        if !trimmed.is_empty() {
            push(PathBuf::from(trimmed));
        }
    }

    if let Ok(resources_dir) = std::env::var("EMUBRO_RESOURCES_DIR") {
        let trimmed = resources_dir.trim();
        if !trimmed.is_empty() {
            push(PathBuf::from(trimmed));
        }
    }

    let resources_config = read_state_value_or_default(RESOURCES_UPDATE_CONFIG_KEY, json!({}));
    for key in ["effectiveStoragePath", "storagePath", "defaultStoragePath"] {
        let configured = resources_config
            .get(key)
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if configured.is_empty() {
            continue;
        }
        let configured_path = PathBuf::from(&configured);
        push(configured_path.clone());
        if let Some(parent) = configured_path.parent() {
            push(parent.to_path_buf());
        }
    }

    push(managed_data_root());

    roots
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

    if !out.contains_key("en") {
        let fallback = serde_json::from_str::<Value>(include_str!("../../../../../locales/en.json"))
            .ok()
            .and_then(|parsed| {
                parsed
                    .as_object()
                    .and_then(|obj| obj.get("en").cloned())
            });
        if let Some(en) = fallback {
            out.insert("en".to_string(), en);
        }
    }

    Value::Object(out)
}
