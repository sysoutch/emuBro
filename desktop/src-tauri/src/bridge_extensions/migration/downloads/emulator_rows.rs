use super::*;

pub(super) fn upsert_emulator_row(
    name: &str,
    platform: &str,
    platform_short_name: &str,
    file_path: &str,
    website: &str,
    start_parameters: &str,
    emulator_type: &str,
) -> Result<Value, String> {
    let mut rows = read_state_array("emulators");
    let path_key = file_path.trim().to_lowercase();
    if path_key.is_empty() {
        return Err("Missing emulator file path".to_string());
    }

    let mut matched_index = None;
    for (index, row) in rows.iter().enumerate() {
        let current_path = row
            .get("filePath")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_lowercase();
        if current_path == path_key {
            matched_index = Some(index);
            break;
        }
    }

    let next_id = if let Some(index) = matched_index {
        rows[index]
            .get("id")
            .and_then(|v| v.as_i64())
            .unwrap_or_else(|| next_numeric_id(&rows))
    } else {
        next_numeric_id(&rows)
    };

    let row = json!({
        "id": next_id,
        "name": name.trim(),
        "platform": platform.trim(),
        "platformShortName": normalize_platform_short_name(platform_short_name),
        "filePath": file_path.trim(),
        "args": "",
        "workingDirectory": Path::new(file_path).parent().map(|p| p.to_string_lossy().to_string()).unwrap_or_default(),
        "website": website.trim(),
        "startParameters": start_parameters.trim(),
        "type": emulator_type.trim()
    });

    if let Some(index) = matched_index {
        rows[index] = row.clone();
    } else {
        rows.push(row.clone());
    }
    write_state_array("emulators", rows)?;
    Ok(row)
}

pub(super) fn normalize_install_method(raw: &str) -> String {
    let value = raw.trim().to_lowercase();
    if value == "flatpak" || value == "apt" {
        value
    } else {
        "download".to_string()
    }
}

pub(super) fn run_shell_command(command: &str) -> (bool, String, String) {
    if command.trim().is_empty() {
        return (false, String::new(), "Missing command".to_string());
    }

    #[cfg(target_os = "windows")]
    let child = Command::new("cmd")
        .args(["/d", "/s", "/c", command])
        .output();

    #[cfg(not(target_os = "windows"))]
    let child = Command::new("bash").args(["-lc", command]).output();

    match child {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            (output.status.success(), stdout, stderr)
        }
        Err(error) => (false, String::new(), error.to_string()),
    }
}

pub(super) fn find_executable_candidate(root: &Path, os_key: &str) -> Option<PathBuf> {
    let mut best = None::<PathBuf>;
    let preferred_exts = if os_key == "windows" {
        vec![".exe", ".bat", ".cmd"]
    } else if os_key == "mac" {
        vec![".app"]
    } else {
        vec![".appimage", ".sh", ".bin"]
    };

    for entry in WalkDir::new(root).max_depth(6).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if !path.is_file() && !path.is_dir() {
            continue;
        }
        let path_text = path.to_string_lossy().to_string();
        let lower = path_text.to_lowercase();
        let mut score = 0i64;
        for (idx, ext) in preferred_exts.iter().enumerate() {
            if lower.ends_with(ext) {
                score = 100 - idx as i64;
                break;
            }
        }
        if score <= 0 {
            continue;
        }
        if best.is_none() {
            best = Some(path.to_path_buf());
            continue;
        }
        let current = best.as_ref().unwrap().to_string_lossy().to_string();
        if path_text.len() < current.len() {
            best = Some(path.to_path_buf());
        }
    }
    best
}
