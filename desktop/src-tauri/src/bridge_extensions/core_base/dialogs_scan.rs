use super::*;

pub(crate) fn build_file_dialog(mut dialog: rfd::FileDialog, options: &Value) -> rfd::FileDialog {
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

pub(crate) fn options_flag(options: &Value, key: &str) -> bool {
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

pub(crate) fn resolve_open_file_dialog(options: &Value) -> Value {
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

pub(crate) fn resolve_save_file_dialog(options: &Value) -> Value {
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

pub(crate) fn scan_and_import_games_and_emulators(scan_target: &str, options: Option<&Value>) -> Result<Value, String> {
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

pub(crate) fn emulator_extensions() -> std::collections::HashSet<String> {
    [".exe", ".bat", ".cmd", ".ps1", ".sh", ".appimage"]
        .into_iter()
        .map(|v| v.to_string())
        .collect()
}

pub(crate) fn archive_extensions() -> std::collections::HashSet<String> {
    [".zip", ".rar", ".7z", ".iso", ".ciso", ".tar", ".gz"]
        .into_iter()
        .map(|v| v.to_string())
        .collect()
}

pub(crate) fn normalize_platform_short_name(value: &str) -> String {
    value.trim().to_lowercase()
}

pub(crate) fn find_platform_name(platforms: &[Value], platform_short_name: &str) -> String {
    let psn = normalize_platform_short_name(platform_short_name);
    if psn == "pc" {
        return "PC".to_string();
    }
    for row in platforms {
        let row_short = normalize_platform_short_name(
            row.get("shortName").and_then(|v| v.as_str()).unwrap_or(""),
        );
        if row_short == psn {
            return row
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("Unknown")
                .trim()
                .to_string();
        }
    }
    "Unknown".to_string()
}

pub(crate) fn detect_emulator_platform(path: &str, platforms: &[Value]) -> (bool, String, String) {
    let name = Path::new(path)
        .file_name()
        .and_then(|v| v.to_str())
        .unwrap_or("")
        .to_lowercase();
    if name.is_empty() {
        return (false, String::new(), String::new());
    }

    for row in platforms {
        let psn = normalize_platform_short_name(
            row.get("shortName").and_then(|v| v.as_str()).unwrap_or(""),
        );
        if psn.is_empty() {
            continue;
        }
        let pname = row
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("Unknown")
            .trim()
            .to_string();
        let pname_key = pname.to_lowercase().replace([' ', '-', '_'], "");
        let psn_key = psn.replace([' ', '-', '_'], "");

        if name.contains(&psn_key) || (!pname_key.is_empty() && name.contains(&pname_key)) {
            return (true, psn, pname);
        }

        if let Some(emulators) = row.get("emulators").and_then(|v| v.as_array()) {
            for emu in emulators {
                let emu_name = emu
                    .get("name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .trim()
                    .to_lowercase()
                    .replace([' ', '-', '_'], "");
                if !emu_name.is_empty() && name.replace([' ', '-', '_'], "").contains(&emu_name) {
                    return (true, psn, pname);
                }
            }
        }
    }

    (false, String::new(), String::new())
}

pub(crate) fn make_game_row(id: i64, file_path: &str, platform_short_name: &str, platform_name: &str) -> Value {
    let title = Path::new(file_path)
        .file_stem()
        .and_then(|v| v.to_str())
        .unwrap_or("Unknown")
        .trim()
        .to_string();
    json!({
        "id": id,
        "name": title,
        "platform": platform_name,
        "platformShortName": normalize_platform_short_name(platform_short_name),
        "filePath": file_path,
        "code": "",
        "image": "",
        "progress": 0,
        "tags": []
    })
}

pub(crate) fn make_emulator_row(id: i64, file_path: &str, platform_short_name: &str) -> Value {
    let title = Path::new(file_path)
        .file_stem()
        .and_then(|v| v.to_str())
        .unwrap_or("Emulator")
        .trim()
        .to_string();
    json!({
        "id": id,
        "name": title,
        "filePath": file_path,
        "platformShortName": normalize_platform_short_name(platform_short_name),
        "args": "",
        "workingDirectory": Path::new(file_path).parent().map(|p| p.to_string_lossy().to_string()).unwrap_or_default()
    })
}
