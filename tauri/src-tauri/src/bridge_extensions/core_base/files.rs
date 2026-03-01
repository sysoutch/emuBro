use super::*;

pub(crate) fn copy_path_recursive(src: &Path, dest: &Path) -> Result<(), String> {
    if src.is_dir() {
        fs::create_dir_all(dest).map_err(|e| e.to_string())?;
        for entry in fs::read_dir(src).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let source_path = entry.path();
            let target_path = dest.join(entry.file_name());
            copy_path_recursive(&source_path, &target_path)?;
        }
        return Ok(());
    }
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::copy(src, dest).map_err(|e| e.to_string())?;
    Ok(())
}

pub(crate) fn move_path_safe(src: &Path, dest: &Path) -> Result<(), String> {
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    match fs::rename(src, dest) {
        Ok(_) => Ok(()),
        Err(_) => {
            copy_path_recursive(src, dest)?;
            if src.is_dir() {
                fs::remove_dir_all(src).map_err(|e| e.to_string())?;
            } else if src.is_file() {
                fs::remove_file(src).map_err(|e| e.to_string())?;
            }
            Ok(())
        }
    }
}

pub(crate) fn ensure_unique_destination_path(target: &Path) -> PathBuf {
    if !target.exists() {
        return target.to_path_buf();
    }
    let parent = target.parent().unwrap_or_else(|| Path::new("."));
    let stem = target.file_stem().and_then(|v| v.to_str()).unwrap_or("item");
    let ext = target.extension().and_then(|v| v.to_str()).unwrap_or("");
    for index in 1..5000 {
        let name = if ext.is_empty() {
            format!("{} ({})", stem, index)
        } else {
            format!("{} ({}).{}", stem, index, ext)
        };
        let candidate = parent.join(name);
        if !candidate.exists() {
            return candidate;
        }
    }
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let fallback = if ext.is_empty() {
        format!("{} ({})", stem, stamp)
    } else {
        format!("{} ({}).{}", stem, stamp, ext)
    };
    parent.join(fallback)
}

pub(crate) fn classify_import_media(path: &str) -> Value {
    let trimmed = path.trim();
    let root = Path::new(trimmed)
        .components()
        .next()
        .map(|c| c.as_os_str().to_string_lossy().to_string())
        .unwrap_or_default();

    let mut category = "fixed".to_string();
    let mut label = "Filesystem".to_string();
    let lower = trimmed.to_lowercase();

    if lower.starts_with("\\\\") {
        category = "network".to_string();
        label = "Network Share".to_string();
    } else if cfg!(target_os = "windows") {
        let chars: Vec<char> = lower.chars().collect();
        if chars.len() >= 2 && chars[1] == ':' {
            let drive = chars[0];
            if drive != 'c' {
                category = "removable".to_string();
                label = "USB / Removable".to_string();
            }
        }
    }

    json!({
        "path": trimmed,
        "rootPath": root,
        "rootExists": Path::new(&root).exists(),
        "mediaCategory": category,
        "mediaLabel": label
    })
}

pub(crate) fn read_path_list_arg(arg: Option<&Value>) -> Vec<String> {
    match arg {
        Some(Value::Array(rows)) => rows
            .iter()
            .filter_map(|row| row.as_str())
            .map(|row| row.trim().to_string())
            .filter(|row| !row.is_empty())
            .collect(),
        Some(Value::String(text)) => {
            let trimmed = text.trim();
            if trimmed.is_empty() {
                Vec::new()
            } else {
                vec![trimmed.to_string()]
            }
        }
        _ => Vec::new(),
    }
}

pub(crate) fn parse_cue_referenced_bin_names(cue_path: &Path) -> Vec<String> {
    let text = match fs::read_to_string(cue_path) {
        Ok(content) => content,
        Err(_) => return Vec::new(),
    };
    let mut out = Vec::<String>::new();
    for raw_line in text.lines() {
        let line = raw_line.trim();
        if line.is_empty() {
            continue;
        }
        if !line.to_uppercase().starts_with("FILE ") {
            continue;
        }
        let mut rest = line[5..].trim().to_string();
        if rest.is_empty() {
            continue;
        }
        let file_name = if rest.starts_with('"') {
            rest.remove(0);
            match rest.find('"') {
                Some(index) => rest[..index].trim().to_string(),
                None => String::new(),
            }
        } else {
            rest.split_whitespace().next().unwrap_or("").trim().to_string()
        };
        if file_name.is_empty() {
            continue;
        }
        if Path::new(&file_name)
            .extension()
            .and_then(|v| v.to_str())
            .map(|v| v.eq_ignore_ascii_case("bin"))
            .unwrap_or(false)
        {
            out.push(
                Path::new(&file_name)
                    .file_name()
                    .and_then(|v| v.to_str())
                    .unwrap_or("")
                    .to_string(),
            );
        }
    }
    out.sort();
    out.dedup();
    out
}

pub(crate) fn find_cue_for_bin(bin_path: &Path) -> Option<PathBuf> {
    if !bin_path
        .extension()
        .and_then(|v| v.to_str())
        .map(|v| v.eq_ignore_ascii_case("bin"))
        .unwrap_or(false)
    {
        return None;
    }
    let parent = bin_path.parent()?;
    let stem = bin_path.file_stem().and_then(|v| v.to_str()).unwrap_or("");
    if !stem.is_empty() {
        let sibling = parent.join(format!("{}.cue", stem));
        if sibling.exists() && sibling.is_file() {
            return Some(sibling);
        }
    }

    let bin_name = bin_path
        .file_name()
        .and_then(|v| v.to_str())
        .unwrap_or("")
        .to_lowercase();
    let entries = fs::read_dir(parent).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let is_cue = path
            .extension()
            .and_then(|v| v.to_str())
            .map(|v| v.eq_ignore_ascii_case("cue"))
            .unwrap_or(false);
        if !is_cue {
            continue;
        }
        let refs = parse_cue_referenced_bin_names(&path)
            .into_iter()
            .map(|row| row.to_lowercase())
            .collect::<Vec<String>>();
        if refs.iter().any(|row| row == &bin_name) {
            return Some(path);
        }
    }
    None
}

pub(crate) fn build_cue_content_for_bin(bin_path: &Path) -> String {
    let file_name = bin_path
        .file_name()
        .and_then(|v| v.to_str())
        .unwrap_or("track01.bin");
    format!(
        "FILE \"{}\" BINARY\n  TRACK 01 MODE1/2352\n    INDEX 01 00:00:00\n",
        file_name
    )
}

pub(crate) fn archive_kind_for_extension(ext: &str) -> String {
    match ext {
        ".zip" => "zip",
        ".rar" => "rar",
        ".7z" => "7z",
        ".iso" => "iso",
        ".ciso" => "ciso",
        ".tar" => "tar",
        ".gz" => "gz",
        _ => "",
    }
    .to_string()
}

pub(crate) fn platform_supports_archive_extension(platform: &Value, extension: &str) -> bool {
    let ext = normalize_extension(extension);
    if ext.is_empty() {
        return false;
    }
    platform
        .get("supportedArchiveTypes")
        .and_then(|v| v.as_array())
        .map(|rows| {
            rows.iter().any(|row| {
                normalize_extension(row.as_str().unwrap_or(""))
                    .eq_ignore_ascii_case(&ext)
            })
        })
        .unwrap_or(false)
}

pub(crate) fn direct_archive_emulators_for_extension(platform: &Value, extension: &str) -> Vec<String> {
    let ext = normalize_extension(extension);
    if ext.is_empty() {
        return Vec::new();
    }
    let mut out = Vec::<String>::new();
    let mut seen = std::collections::HashSet::<String>::new();
    let emulators = platform
        .get("emulators")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    for emulator in emulators {
        let name = emulator
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if name.is_empty() {
            continue;
        }
        let supports = emulator
            .get("supportedFileTypes")
            .and_then(|v| v.as_array())
            .map(|rows| {
                rows.iter().any(|row| {
                    normalize_extension(row.as_str().unwrap_or(""))
                        .eq_ignore_ascii_case(&ext)
                })
            })
            .unwrap_or(false);
        if supports {
            let key = name.to_lowercase();
            if seen.insert(key) {
                out.push(name);
            }
        }
    }
    out
}

pub(crate) fn extract_zip_archive_to_dir(archive_path: &Path, destination_dir: &Path) -> Result<(), String> {
    let file = fs::File::open(archive_path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;
    fs::create_dir_all(destination_dir).map_err(|e| e.to_string())?;

    for index in 0..archive.len() {
        let mut entry = archive.by_index(index).map_err(|e| e.to_string())?;
        let Some(relative_path) = entry.enclosed_name().map(|p| p.to_path_buf()) else {
            continue;
        };
        let out_path = destination_dir.join(relative_path);

        if entry.is_dir() {
            fs::create_dir_all(&out_path).map_err(|e| e.to_string())?;
            continue;
        }

        if let Some(parent) = out_path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let mut out_file = fs::File::create(&out_path).map_err(|e| e.to_string())?;
        std::io::copy(&mut entry, &mut out_file).map_err(|e| e.to_string())?;
        out_file.flush().map_err(|e| e.to_string())?;
    }

    Ok(())
}

pub(crate) fn extract_archive_with_7z(archive_path: &Path, destination_dir: &Path) -> Result<(), String> {
    let archive = archive_path.to_string_lossy().to_string();
    let destination = destination_dir.to_string_lossy().to_string();
    let candidates = if cfg!(target_os = "windows") {
        vec![
            "7z".to_string(),
            "7za".to_string(),
            "7zr".to_string(),
            "C:\\Program Files\\7-Zip\\7z.exe".to_string(),
            "C:\\Program Files (x86)\\7-Zip\\7z.exe".to_string(),
        ]
    } else {
        vec!["7z".to_string(), "7za".to_string(), "7zr".to_string()]
    };
    let mut last_error = String::new();
    for command in candidates {
        let status = Command::new(&command)
            .arg("x")
            .arg(&archive)
            .arg(format!("-o{}", destination))
            .arg("-y")
            .status();
        match status {
            Ok(exit) if exit.success() => return Ok(()),
            Ok(exit) => {
                last_error = format!("{} exited with status {}", command, exit);
            }
            Err(err) => {
                last_error = err.to_string();
            }
        }
    }
    if last_error.is_empty() {
        last_error = "No 7z executable found".to_string();
    }
    Err(last_error)
}

pub(crate) fn extract_archive_with_tar(archive_path: &Path, destination_dir: &Path) -> Result<(), String> {
    let status = Command::new("tar")
        .arg("-xf")
        .arg(archive_path)
        .arg("-C")
        .arg(destination_dir)
        .status()
        .map_err(|e| e.to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err(format!("tar exited with status {}", status))
    }
}

pub(crate) fn extract_archive_to_dir(archive_path: &Path, destination_dir: &Path) -> Result<(), String> {
    fs::create_dir_all(destination_dir).map_err(|e| e.to_string())?;
    let ext = normalize_extension(archive_path.extension().and_then(|v| v.to_str()).unwrap_or(""));
    if ext == ".zip" {
        return extract_zip_archive_to_dir(archive_path, destination_dir);
    }
    if ext == ".tar" || ext == ".gz" || ext == ".tgz" {
        if let Ok(_) = extract_archive_with_tar(archive_path, destination_dir) {
            return Ok(());
        }
    }
    extract_archive_with_7z(archive_path, destination_dir)
}

pub(crate) fn build_archive_extraction_directory(archive_path: &Path) -> PathBuf {
    let parent = archive_path.parent().unwrap_or_else(|| Path::new("."));
    let stem = archive_path
        .file_stem()
        .and_then(|v| v.to_str())
        .unwrap_or("archive");
    let initial = parent.join(format!("{}_extracted", stem));
    ensure_unique_destination_path(&initial)
}
