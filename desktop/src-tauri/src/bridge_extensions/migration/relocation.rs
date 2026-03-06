use super::*;

const FOLDER_PREVIEW_LIMIT: usize = 100_000;

fn normalize_managed_folder_kind(raw: &str) -> String {
    let value = raw.trim().to_lowercase();
    if value == "scanfolders" || value == "scan_folders" {
        return "scanFolders".to_string();
    }
    if value == "gamefolders" || value == "game_folders" {
        return "gameFolders".to_string();
    }
    if value == "emulatorfolders" || value == "emulator_folders" {
        return "emulatorFolders".to_string();
    }
    String::new()
}

fn normalize_for_compare(path: &Path) -> String {
    let text = path.to_string_lossy().replace('/', "\\");
    text.trim().to_lowercase()
}

fn paths_equal(left: &Path, right: &Path) -> bool {
    normalize_for_compare(left) == normalize_for_compare(right)
}

fn is_path_inside(child: &Path, parent: &Path) -> bool {
    let child_norm = normalize_for_compare(child);
    let parent_norm = normalize_for_compare(parent);
    child_norm.starts_with(&(parent_norm + "\\"))
}

fn build_directory_integration_preview(source: &Path, target: &Path) -> Value {
    let mut total_items = 0i64;
    let mut total_files = 0i64;
    let mut total_dirs = 0i64;
    let mut new_items = 0i64;
    let mut conflicts = 0i64;
    let mut file_conflicts = 0i64;
    let mut directory_conflicts = 0i64;
    let mut type_conflicts = 0i64;
    let mut merge_candidates = 0i64;
    let mut truncated = false;

    for entry in WalkDir::new(source).into_iter().filter_map(|e| e.ok()) {
        if entry.path() == source {
            continue;
        }
        total_items += 1;
        if total_items as usize > FOLDER_PREVIEW_LIMIT {
            truncated = true;
            break;
        }
        if entry.file_type().is_file() {
            total_files += 1;
        } else if entry.file_type().is_dir() {
            total_dirs += 1;
        }
        let rel = match entry.path().strip_prefix(source) {
            Ok(value) => value,
            Err(_) => continue,
        };
        let destination = target.join(rel);
        if destination.exists() {
            conflicts += 1;
            if entry.file_type().is_file() && destination.is_file() {
                file_conflicts += 1;
            } else if entry.file_type().is_dir() && destination.is_dir() {
                directory_conflicts += 1;
                merge_candidates += 1;
            } else {
                type_conflicts += 1;
            }
        } else {
            new_items += 1;
        }
    }

    json!({
        "totalItems": total_items,
        "totalFiles": total_files,
        "totalDirs": total_dirs,
        "newItems": new_items,
        "conflicts": conflicts,
        "fileConflicts": file_conflicts,
        "directoryConflicts": directory_conflicts,
        "typeConflicts": type_conflicts,
        "mergeCandidates": merge_candidates,
        "truncated": truncated
    })
}

pub(super) fn preview_relocate_managed_folder(payload: &Value) -> Value {
    let kind = normalize_managed_folder_kind(payload.get("kind").and_then(|v| v.as_str()).unwrap_or(""));
    if kind.is_empty() {
        return json!({ "success": false, "message": "Invalid managed folder type" });
    }

    let source = PathBuf::from(payload.get("sourcePath").and_then(|v| v.as_str()).unwrap_or("").trim());
    let target = PathBuf::from(payload.get("targetPath").and_then(|v| v.as_str()).unwrap_or("").trim());
    if source.as_os_str().is_empty() || target.as_os_str().is_empty() {
        return json!({ "success": false, "message": "Missing source or destination path" });
    }
    if !source.exists() || !source.is_dir() {
        return json!({ "success": false, "message": "Source folder does not exist" });
    }
    if paths_equal(&source, &target) {
        return json!({
            "success": true,
            "kind": kind,
            "sourcePath": source.to_string_lossy().to_string(),
            "targetPath": target.to_string_lossy().to_string(),
            "preview": {
                "totalItems": 0,
                "totalFiles": 0,
                "totalDirs": 0,
                "newItems": 0,
                "conflicts": 0,
                "fileConflicts": 0,
                "directoryConflicts": 0,
                "typeConflicts": 0,
                "mergeCandidates": 0,
                "truncated": false
            }
        });
    }
    if is_path_inside(&target, &source) {
        return json!({ "success": false, "message": "Destination folder cannot be inside the source folder." });
    }
    if let Err(error) = ensure_directory(&target) {
        return json!({ "success": false, "message": error });
    }
    let preview = build_directory_integration_preview(&source, &target);
    json!({
        "success": true,
        "kind": kind,
        "sourcePath": source.to_string_lossy().to_string(),
        "targetPath": target.to_string_lossy().to_string(),
        "preview": preview
    })
}

pub(super) fn confirm_relocate_preview(payload: &Value) -> Value {
    let conflicts = payload
        .get("preview")
        .and_then(|v| v.get("conflicts"))
        .and_then(|v| v.as_i64())
        .unwrap_or(0);
    let policy = if conflicts > 0 {
        "keep_both"
    } else {
        "replace_existing"
    };
    json!({
        "success": true,
        "proceed": true,
        "policy": policy,
        "canceled": false
    })
}

#[derive(Clone, Debug)]
struct RelocationStats {
    moved: i64,
    replaced: i64,
    kept_both: i64,
    skipped: i64,
    conflicts: i64,
}

fn move_with_policy(source_file: &Path, destination_file: &Path, policy: &str, stats: &mut RelocationStats) -> Result<(), String> {
    if !destination_file.exists() {
        if let Some(parent) = destination_file.parent() {
            ensure_directory(parent)?;
        }
        fs::rename(source_file, destination_file).map_err(|e| e.to_string())?;
        stats.moved += 1;
        return Ok(());
    }

    stats.conflicts += 1;
    let normalized = policy.trim().to_lowercase();
    if normalized == "skip_existing" {
        stats.skipped += 1;
        return Ok(());
    }

    if normalized == "replace_existing" {
        if destination_file.is_file() {
            fs::remove_file(destination_file).map_err(|e| e.to_string())?;
        } else if destination_file.is_dir() {
            fs::remove_dir_all(destination_file).map_err(|e| e.to_string())?;
        }
        if let Some(parent) = destination_file.parent() {
            ensure_directory(parent)?;
        }
        fs::rename(source_file, destination_file).map_err(|e| e.to_string())?;
        stats.replaced += 1;
        stats.moved += 1;
        return Ok(());
    }

    let alt = ensure_unique_destination_path(destination_file);
    if let Some(parent) = alt.parent() {
        ensure_directory(parent)?;
    }
    fs::rename(source_file, &alt).map_err(|e| e.to_string())?;
    stats.kept_both += 1;
    stats.moved += 1;
    Ok(())
}

fn cleanup_empty_dirs(root: &Path) {
    let mut dirs = WalkDir::new(root)
        .contents_first(true)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_dir())
        .map(|e| e.path().to_path_buf())
        .collect::<Vec<PathBuf>>();
    dirs.sort_by(|a, b| b.components().count().cmp(&a.components().count()));
    for dir in dirs {
        if dir == root {
            continue;
        }
        let _ = fs::remove_dir(&dir);
    }
    let _ = fs::remove_dir(root);
}

pub(super) fn relocate_managed_folder(payload: &Value) -> Value {
    let kind = normalize_managed_folder_kind(payload.get("kind").and_then(|v| v.as_str()).unwrap_or(""));
    if kind.is_empty() {
        return json!({ "success": false, "message": "Invalid managed folder type" });
    }
    let source = PathBuf::from(payload.get("sourcePath").and_then(|v| v.as_str()).unwrap_or("").trim());
    let target = PathBuf::from(payload.get("targetPath").and_then(|v| v.as_str()).unwrap_or("").trim());
    if source.as_os_str().is_empty() || target.as_os_str().is_empty() {
        return json!({ "success": false, "message": "Missing source or destination path" });
    }
    if !source.exists() || !source.is_dir() {
        return json!({ "success": false, "message": "Source folder does not exist" });
    }
    if paths_equal(&source, &target) {
        return json!({
            "success": true,
            "message": "Source and destination are identical",
            "settings": read_library_path_settings(),
            "stats": { "moved": 0, "replaced": 0, "keptBoth": 0, "skipped": 0, "conflicts": 0 }
        });
    }
    if is_path_inside(&target, &source) {
        return json!({ "success": false, "message": "Destination folder cannot be inside the source folder." });
    }
    if let Err(error) = ensure_directory(&target) {
        return json!({ "success": false, "message": error });
    }

    let policy = payload
        .get("conflictPolicy")
        .and_then(|v| v.as_str())
        .unwrap_or("keep_both");
    let mut stats = RelocationStats {
        moved: 0,
        replaced: 0,
        kept_both: 0,
        skipped: 0,
        conflicts: 0,
    };

    for entry in WalkDir::new(&source).into_iter().filter_map(|e| e.ok()) {
        if entry.path() == source {
            continue;
        }
        if !entry.file_type().is_file() {
            continue;
        }
        let rel = match entry.path().strip_prefix(&source) {
            Ok(value) => value,
            Err(_) => continue,
        };
        let destination = target.join(rel);
        if let Err(error) = move_with_policy(entry.path(), &destination, policy, &mut stats) {
            return json!({
                "success": false,
                "message": error,
                "settings": read_library_path_settings(),
                "stats": {
                    "moved": stats.moved,
                    "replaced": stats.replaced,
                    "keptBoth": stats.kept_both,
                    "skipped": stats.skipped,
                    "conflicts": stats.conflicts
                }
            });
        }
    }
    cleanup_empty_dirs(&source);

    let mut settings = read_library_path_settings();
    if let Some(obj) = settings.as_object_mut() {
        let current_list = obj
            .get(&kind)
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default();
        let mut next = Vec::<Value>::new();
        let source_key = source.to_string_lossy().to_lowercase();
        let target_text = target.to_string_lossy().to_string();
        let mut seen = HashSet::<String>::new();
        for value in current_list {
            let text = value.as_str().unwrap_or("").trim().to_string();
            if text.is_empty() {
                continue;
            }
            let normalized = if text.to_lowercase() == source_key {
                target_text.clone()
            } else {
                text
            };
            let key = normalized.to_lowercase();
            if seen.insert(key) {
                next.push(Value::String(normalized));
            }
        }
        if !next.iter().any(|row| row.as_str().unwrap_or("").eq_ignore_ascii_case(&target_text)) {
            next.push(Value::String(target_text.clone()));
        }
        obj.insert(kind.clone(), Value::Array(next));
    }
    let saved = match write_library_path_settings(Some(&settings)) {
        Ok(value) => value,
        Err(error) => return json!({ "success": false, "message": error }),
    };

    json!({
        "success": true,
        "message": "Managed folder relocated successfully.",
        "settings": saved,
        "sourcePath": source.to_string_lossy().to_string(),
        "targetPath": target.to_string_lossy().to_string(),
        "stats": {
            "moved": stats.moved,
            "replaced": stats.replaced,
            "keptBoth": stats.kept_both,
            "skipped": stats.skipped,
            "conflicts": stats.conflicts
        }
    })
}
