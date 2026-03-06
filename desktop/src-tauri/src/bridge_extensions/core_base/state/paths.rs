use super::*;

pub(crate) fn state_db_path() -> PathBuf {
    let root = managed_data_root();
    let _ = ensure_directory(&root);
    root.join(".emubro-desktop-state.db")
}

pub(crate) fn legacy_json_state_path() -> PathBuf {
    let root = managed_data_root();
    let _ = ensure_directory(&root);
    root.join(".emubro-desktop-state.json")
}

pub(crate) fn read_legacy_state_json() -> serde_json::Map<String, Value> {
    let path = legacy_json_state_path();
    let Ok(raw) = fs::read_to_string(path) else {
        return serde_json::Map::new();
    };
    match serde_json::from_str::<Value>(&raw) {
        Ok(Value::Object(map)) => map,
        _ => serde_json::Map::new(),
    }
}

pub(crate) fn legacy_library_db_candidate_paths() -> Vec<PathBuf> {
    let mut out = Vec::<PathBuf>::new();
    let mut seen = std::collections::HashSet::<String>::new();
    let push = |rows: &mut Vec<PathBuf>,
                used: &mut std::collections::HashSet<String>,
                path: PathBuf| {
        let key = path.to_string_lossy().to_lowercase();
        if used.insert(key) {
            rows.push(path);
        }
    };

    if let Ok(cwd) = std::env::current_dir() {
        push(&mut out, &mut seen, cwd.join("library.db"));
        push(&mut out, &mut seen, cwd.join("../library.db"));
        push(&mut out, &mut seen, cwd.join("../../library.db"));
    }

    let roaming_roots = [
        "emuBro",
        "emubro",
        "emuBro-Reloaded",
        "emubro-reloaded",
        "emuBro Reloaded",
    ];
    if let Ok(appdata) = std::env::var("APPDATA") {
        let base = PathBuf::from(appdata);
        for root in roaming_roots {
            push(&mut out, &mut seen, base.join(root).join("library.db"));
        }
    }
    if let Ok(local_appdata) = std::env::var("LOCALAPPDATA") {
        let base = PathBuf::from(local_appdata);
        for root in roaming_roots {
            push(&mut out, &mut seen, base.join(root).join("library.db"));
        }
    }

    out
}
