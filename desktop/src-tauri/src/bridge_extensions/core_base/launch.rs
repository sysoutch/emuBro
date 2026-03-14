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

#[cfg(windows)]
fn escape_powershell_single_quotes(value: &str) -> String {
    value.replace('\'', "''")
}

#[cfg(windows)]
fn join_windows_command_line(executable_path: &Path, args: &[String]) -> String {
    let mut out = format!("\"{}\"", executable_path.to_string_lossy());
    for arg in args {
        if arg.is_empty() {
            out.push_str(" \"\"");
            continue;
        }
        if arg.chars().any(|ch| ch.is_whitespace() || ch == '"') {
            out.push(' ');
            out.push('"');
            out.push_str(&arg.replace('"', "\\\""));
            out.push('"');
        } else {
            out.push(' ');
            out.push_str(arg);
        }
    }
    out
}

#[cfg(windows)]
fn launch_with_windows_admin(
    executable_path: &Path,
    args: &[String],
    working_directory: &str,
    env_pairs: &[(String, String)],
) -> Result<u32, String> {
    let escaped_path = escape_powershell_single_quotes(&executable_path.to_string_lossy());
    let escaped_args = args
        .iter()
        .map(|arg| format!("'{}'", escape_powershell_single_quotes(arg)))
        .collect::<Vec<_>>()
        .join(",");
    let escaped_working_dir = escape_powershell_single_quotes(working_directory);

    let mut script = if escaped_args.is_empty() {
        format!("Start-Process -FilePath '{}' -Verb RunAs", escaped_path)
    } else {
        format!(
            "Start-Process -FilePath '{}' -ArgumentList @({}) -Verb RunAs",
            escaped_path, escaped_args
        )
    };
    if !escaped_working_dir.trim().is_empty() {
        script.push_str(&format!(" -WorkingDirectory '{}'", escaped_working_dir));
    }

    let mut command = Command::new("powershell");
    command.args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", &script]);
    if !env_pairs.is_empty() {
        command.envs(env_pairs.iter().map(|(key, value)| (key, value)));
    }
    let child = command.spawn().map_err(|e| e.to_string())?;
    Ok(child.id())
}

#[cfg(windows)]
fn launch_with_windows_user(
    executable_path: &Path,
    args: &[String],
    run_as_user: &str,
    env_pairs: &[(String, String)],
) -> Result<u32, String> {
    let user = run_as_user.trim();
    if user.is_empty() {
        return Err("Run-as user is empty.".to_string());
    }
    let command_line = join_windows_command_line(executable_path, args);
    let mut command = Command::new("runas");
    command.arg(format!("/user:{}", user)).arg(command_line);
    if !env_pairs.is_empty() {
        command.envs(env_pairs.iter().map(|(key, value)| (key, value)));
    }
    let child = command.spawn().map_err(|e| e.to_string())?;
    Ok(child.id())
}

fn command_exists(binary: &str) -> bool {
    let search = std::env::var_os("PATH");
    let Some(path_var) = search else {
        return false;
    };
    std::env::split_paths(&path_var).any(|dir| {
        let candidate = dir.join(binary);
        if candidate.exists() {
            return true;
        }
        #[cfg(windows)]
        {
            let exe = dir.join(format!("{}.exe", binary));
            let cmd = dir.join(format!("{}.cmd", binary));
            let bat = dir.join(format!("{}.bat", binary));
            exe.exists() || cmd.exists() || bat.exists()
        }
        #[cfg(not(windows))]
        {
            false
        }
    })
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

fn determine_launch_working_directory<'a>(emulator_path: &'a Path, working_directory: &'a str) -> PathBuf {
    let working_dir = working_directory.trim();
    if !working_dir.is_empty() {
        PathBuf::from(working_dir)
    } else {
        emulator_path
            .parent()
            .map(|path| path.to_path_buf())
            .unwrap_or_else(|| PathBuf::from("."))
    }
}

pub(crate) fn parse_run_commands_before_payload(payload: &Value) -> Vec<String> {
    if let Some(array) = payload.as_array() {
        return array
            .iter()
            .map(|value| value.as_str().unwrap_or("").trim().to_string())
            .filter(|value| !value.is_empty())
            .collect::<Vec<String>>();
    }

    if let Some(text) = payload.as_str() {
        return text
            .split(&['\r', '\n', ';'][..])
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .collect::<Vec<String>>();
    }

    Vec::new()
}

fn has_nonempty_json_payload(value: &Value) -> bool {
    match value {
        Value::Null => false,
        Value::Bool(_) | Value::Number(_) => true,
        Value::String(text) => !text.trim().is_empty(),
        Value::Array(rows) => !rows.is_empty(),
        Value::Object(map) => !map.is_empty(),
    }
}

fn run_prelaunch_commands(commands: &[String], working_directory: &Path) -> Result<(), String> {
    for command_text in commands {
        let trimmed = command_text.trim();
        if trimmed.is_empty() {
            continue;
        }

        #[cfg(windows)]
        let mut command = {
            let mut value = Command::new("cmd");
            value.args(["/C", trimmed]);
            apply_windows_hidden_process_flags(&mut value);
            value
        };

        #[cfg(not(windows))]
        let mut command = {
            let mut value = Command::new("sh");
            value.args(["-lc", trimmed]);
            value
        };

        command.current_dir(working_directory);
        let status = command.status().map_err(|error| error.to_string())?;
        if !status.success() {
            return Err(format!("Pre-launch command failed: {}", trimmed));
        }
    }
    Ok(())
}

fn create_emulator_launch_env_pairs(
    emulator_path: &Path,
    args: &[String],
    working_directory: &Path,
    input_bindings: &Value,
    gamepad_bindings: &Value,
    run_commands_before: &[String],
) -> Result<Vec<(String, String)>, String> {
    let mut env_pairs = Vec::<(String, String)>::new();
    let has_payload = has_nonempty_json_payload(input_bindings)
        || has_nonempty_json_payload(gamepad_bindings)
        || !run_commands_before.is_empty();

    if !has_payload {
        return Ok(env_pairs);
    }

    let runtime_dir = std::env::temp_dir().join("emuBro").join("launch-payloads");
    fs::create_dir_all(&runtime_dir).map_err(|error| error.to_string())?;

    let mut hasher = DefaultHasher::new();
    emulator_path.to_string_lossy().hash(&mut hasher);
    system_unix_timestamp_string().hash(&mut hasher);
    let file_name = format!("emulator-launch-{:x}.json", hasher.finish());
    let payload_path = runtime_dir.join(file_name);
    let payload = json!({
        "emulatorPath": emulator_path.to_string_lossy().to_string(),
        "args": args,
        "workingDirectory": working_directory.to_string_lossy().to_string(),
        "inputBindings": input_bindings.clone(),
        "gamepadBindings": gamepad_bindings.clone(),
        "runCommandsBefore": run_commands_before
    });
    let contents = serde_json::to_vec_pretty(&payload).map_err(|error| error.to_string())?;
    fs::write(&payload_path, contents).map_err(|error| error.to_string())?;

    env_pairs.push((
        "EMUBRO_EMULATOR_LAUNCH_PAYLOAD_FILE".to_string(),
        payload_path.to_string_lossy().to_string(),
    ));
    env_pairs.push((
        "EMUBRO_EMULATOR_WORKING_DIRECTORY".to_string(),
        working_directory.to_string_lossy().to_string(),
    ));
    if has_nonempty_json_payload(input_bindings) {
        env_pairs.push((
            "EMUBRO_INPUT_BINDINGS_JSON".to_string(),
            input_bindings.to_string(),
        ));
    }
    if has_nonempty_json_payload(gamepad_bindings) {
        env_pairs.push((
            "EMUBRO_GAMEPAD_BINDINGS_JSON".to_string(),
            gamepad_bindings.to_string(),
        ));
    }

    Ok(env_pairs)
}

pub(crate) fn launch_emulator_process(
    emulator_path: &Path,
    emulator_args: &str,
    working_directory: &str,
    run_as_admin: bool,
    run_as_user: &str,
    input_bindings: &Value,
    gamepad_bindings: &Value,
    run_commands_before: &[String],
) -> Result<u32, String> {
    if !emulator_path.exists() || !emulator_path.is_file() {
        return Err("Emulator executable not found".to_string());
    }
    let args = parse_command_args(emulator_args);
    let run_as_user_trimmed = run_as_user.trim();
    let resolved_working_directory = determine_launch_working_directory(emulator_path, working_directory);

    run_prelaunch_commands(run_commands_before, &resolved_working_directory)?;
    let env_pairs = create_emulator_launch_env_pairs(
        emulator_path,
        &args,
        &resolved_working_directory,
        input_bindings,
        gamepad_bindings,
        run_commands_before,
    )?;

    #[cfg(windows)]
    {
        if !run_as_user_trimmed.is_empty() {
            return launch_with_windows_user(emulator_path, &args, run_as_user_trimmed, &env_pairs);
        }
        if run_as_admin {
            return launch_with_windows_admin(emulator_path, &args, working_directory, &env_pairs);
        }
    }

    #[cfg(target_os = "linux")]
    {
        if run_as_admin {
            if !command_exists("pkexec") {
                return Err("pkexec is not available on this Linux system.".to_string());
            }
            let mut command = Command::new("pkexec");
            command.arg(emulator_path);
            if !args.is_empty() {
                command.args(&args);
            }
            if !env_pairs.is_empty() {
                command.envs(env_pairs.iter().map(|(key, value)| (key, value)));
            }
            command.current_dir(&resolved_working_directory);
            let child = command.spawn().map_err(|e| e.to_string())?;
            return Ok(child.id());
        }
        if !run_as_user_trimmed.is_empty() {
            if !command_exists("runuser") {
                return Err("runuser is not available on this Linux system.".to_string());
            }
            let mut command = Command::new("runuser");
            command.args(["-m", "-u", run_as_user_trimmed, "--"]);
            command.arg(emulator_path);
            if !args.is_empty() {
                command.args(&args);
            }
            if !env_pairs.is_empty() {
                command.envs(env_pairs.iter().map(|(key, value)| (key, value)));
            }
            command.current_dir(&resolved_working_directory);
            let child = command.spawn().map_err(|e| e.to_string())?;
            return Ok(child.id());
        }
    }

    let mut command = Command::new(emulator_path);
    if !args.is_empty() {
        command.args(args);
    }
    if !env_pairs.is_empty() {
        command.envs(env_pairs.iter().map(|(key, value)| (key, value)));
    }
    command.current_dir(&resolved_working_directory);

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
