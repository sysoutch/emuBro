use super::*;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

fn apply_windows_hidden_process_flags(command: &mut Command) {
    #[cfg(windows)]
    {
        command.creation_flags(CREATE_NO_WINDOW);
    }
}

pub(crate) fn parse_game_id_from_payload(payload: &Value) -> i64 {
    if let Some(id) = payload.as_i64() {
        return id;
    }
    if let Some(obj) = payload.as_object() {
        if let Some(id) = obj.get("gameId").and_then(|v| v.as_i64()) {
            return id;
        }
        if let Some(id) = obj.get("id").and_then(|v| v.as_i64()) {
            return id;
        }
    }
    0
}

pub(crate) fn system_unix_timestamp_string() -> String {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs().to_string())
        .unwrap_or_else(|_| "0".to_string())
}

pub(crate) fn update_game_last_played(game_id: i64) -> Result<(), String> {
    if game_id <= 0 {
        return Ok(());
    }
    let mut games = read_state_array("games");
    let mut changed = false;
    for row in &mut games {
        if row.get("id").and_then(|v| v.as_i64()).unwrap_or(0) == game_id {
            if let Some(obj) = row.as_object_mut() {
                obj.insert(
                    "lastPlayed".to_string(),
                    Value::String(system_unix_timestamp_string()),
                );
            }
            changed = true;
            break;
        }
    }
    if changed {
        write_state_array("games", games)?;
    }
    Ok(())
}

pub(crate) fn percent_encode_data_url(input: &str) -> String {
    let mut out = String::with_capacity(input.len() * 2);
    for byte in input.as_bytes() {
        let c = *byte as char;
        let safe = c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.' || c == '~';
        if safe {
            out.push(c);
        } else {
            out.push('%');
            out.push_str(&format!("{:02X}", byte));
        }
    }
    out
}

pub(crate) fn build_file_icon_data_url(file_path: &Path) -> String {
    let ext = file_path
        .extension()
        .and_then(|v| v.to_str())
        .unwrap_or("")
        .trim()
        .to_uppercase();
    let label = if ext.is_empty() {
        "FILE".to_string()
    } else {
        ext.chars().take(4).collect::<String>()
    };

    let mut hasher = DefaultHasher::new();
    label.hash(&mut hasher);
    let hash = hasher.finish();
    let hue = (hash % 360) as i32;
    let hue2 = ((hue + 28) % 360) as i32;

    let svg = format!(
        "<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'>\
<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>\
<stop offset='0%' stop-color='hsl({} 68% 42%)'/>\
<stop offset='100%' stop-color='hsl({} 74% 34%)'/>\
</linearGradient></defs>\
<rect x='2' y='2' width='92' height='92' rx='16' fill='url(#g)'/>\
<rect x='10' y='12' width='76' height='72' rx='10' fill='rgba(6,10,18,0.35)'/>\
<text x='48' y='56' text-anchor='middle' font-family='Segoe UI,Arial,sans-serif' font-size='22' font-weight='700' fill='#F4F8FF'>{}</text>\
</svg>",
        hue, hue2, label
    );

    format!("data:image/svg+xml;utf8,{}", percent_encode_data_url(&svg))
}

pub(crate) fn parse_command_args(input: &str) -> Vec<String> {
    let text = input.trim();
    if text.is_empty() {
        return Vec::new();
    }
    let mut args = Vec::<String>::new();
    let mut current = String::new();
    let mut in_quotes = false;
    let mut quote_char = '\0';
    for ch in text.chars() {
        if in_quotes {
            if ch == quote_char {
                in_quotes = false;
                quote_char = '\0';
            } else {
                current.push(ch);
            }
            continue;
        }

        if ch == '"' || ch == '\'' {
            in_quotes = true;
            quote_char = ch;
            continue;
        }

        if ch.is_whitespace() {
            if !current.is_empty() {
                args.push(current.clone());
                current.clear();
            }
            continue;
        }
        current.push(ch);
    }
    if !current.is_empty() {
        args.push(current);
    }
    args
}

pub(crate) fn launch_game_with_emulator(
    emulator_path: &Path,
    emulator_args: &str,
    game_path: &Path,
) -> Result<u32, String> {
    let mut args = parse_command_args(emulator_args);
    args.push(game_path.to_string_lossy().to_string());
    let mut command = Command::new(emulator_path);
    if !args.is_empty() {
        command.args(args);
    }
    if let Some(parent) = emulator_path.parent() {
        command.current_dir(parent);
    }
    apply_windows_hidden_process_flags(&mut command);
    let child = command.spawn().map_err(|e| e.to_string())?;
    Ok(child.id())
}

pub(crate) fn launch_emulator_process(
    emulator_path: &Path,
    emulator_args: &str,
    working_directory: &str,
) -> Result<u32, String> {
    if !emulator_path.exists() || !emulator_path.is_file() {
        return Err("Emulator executable not found".to_string());
    }
    let args = parse_command_args(emulator_args);
    let mut command = Command::new(emulator_path);
    if !args.is_empty() {
        command.args(args);
    }

    let working_dir = working_directory.trim();
    if !working_dir.is_empty() {
        command.current_dir(PathBuf::from(working_dir));
    } else if let Some(parent) = emulator_path.parent() {
        command.current_dir(parent);
    }

    apply_windows_hidden_process_flags(&mut command);
    let child = command.spawn().map_err(|e| e.to_string())?;
    Ok(child.id())
}

pub(crate) fn find_file_by_name_in_tree(root_dir: &Path, file_name: &str, max_depth: usize, max_files: usize) -> Option<PathBuf> {
    if !root_dir.exists() || !root_dir.is_dir() {
        return None;
    }
    let target = file_name.trim().to_lowercase();
    if target.is_empty() {
        return None;
    }
    let mut visited_files = 0usize;
    for entry in WalkDir::new(root_dir)
        .follow_links(false)
        .max_depth(max_depth)
        .into_iter()
        .filter_map(|row| row.ok())
    {
        if !entry.file_type().is_file() {
            continue;
        }
        visited_files += 1;
        if visited_files > max_files {
            break;
        }
        let name = entry.file_name().to_string_lossy().to_lowercase();
        if name == target {
            return Some(entry.path().to_path_buf());
        }
    }
    None
}

pub(crate) fn launch_game_file(game_path: &Path) -> Result<Option<u32>, String> {
    if cfg!(target_os = "windows") {
        let lower_ext = game_path
            .extension()
            .and_then(|v| v.to_str())
            .unwrap_or("")
            .to_lowercase();
        if lower_ext == "exe" || lower_ext == "bat" || lower_ext == "cmd" {
            let mut command = Command::new(game_path);
            if let Some(parent) = game_path.parent() {
                command.current_dir(parent);
            }
            apply_windows_hidden_process_flags(&mut command);
            let child = command.spawn().map_err(|e| e.to_string())?;
            return Ok(Some(child.id()));
        }
    }
    open::that(game_path).map_err(|e| e.to_string())?;
    Ok(None)
}
