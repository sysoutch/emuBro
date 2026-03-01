use super::*;
use std::env;
use std::path::PathBuf;

fn build_system_specs() -> Value {
    json!({
        "platform": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "cpuCores": std::thread::available_parallelism().map(|n| n.get()).unwrap_or(1),
    })
}

fn sanitize_filename(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    for ch in input.chars() {
        let invalid = matches!(ch, '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*');
        if invalid || ch.is_control() {
            out.push('_');
        } else {
            out.push(ch);
        }
    }
    out.trim().trim_matches('.').to_string()
}

fn desktop_dir() -> Option<PathBuf> {
    if cfg!(target_os = "windows") {
        if let Ok(user_profile) = env::var("USERPROFILE") {
            let path = PathBuf::from(user_profile).join("Desktop");
            if path.exists() {
                return Some(path);
            }
        }
    }

    if let Ok(home) = env::var("HOME") {
        let path = PathBuf::from(home).join("Desktop");
        if path.exists() {
            return Some(path);
        }
    }

    None
}

fn escape_ps_single_quotes(text: &str) -> String {
    text.replace('\'', "''")
}

fn create_shortcut_for_game(game_id: i64) -> Result<Value, String> {
    if game_id <= 0 {
        return Ok(json!({ "success": false, "message": "Game not found" }));
    }

    let games = read_state_array("games");
    let game = games.iter().find(|row| row.get("id").and_then(|v| v.as_i64()).unwrap_or(0) == game_id);
    let Some(game_row) = game else {
        return Ok(json!({ "success": false, "message": "Game not found" }));
    };

    let game_name = game_row.get("name").and_then(|v| v.as_str()).unwrap_or("Unknown Game");
    let platform_name = game_row
        .get("platformShortName")
        .and_then(|v| v.as_str())
        .or_else(|| game_row.get("platform").and_then(|v| v.as_str()))
        .unwrap_or("unknown");

    let desktop = match desktop_dir() {
        Some(path) => path,
        None => {
            return Ok(json!({ "success": false, "message": "Desktop path not found" }));
        }
    };

    if !cfg!(target_os = "windows") {
        return Ok(json!({
            "success": false,
            "message": "Desktop shortcut creation is currently supported on Windows only"
        }));
    }

    let exe_path = std::env::current_exe().map_err(|error| error.to_string())?;
    let working_dir = exe_path
        .parent()
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|| desktop.clone());

    let shortcut_name_raw = format!("{} ({})", game_name, platform_name);
    let shortcut_name = sanitize_filename(&shortcut_name_raw);
    let shortcut_file = if shortcut_name.is_empty() {
        format!("emuBro Game {}.lnk", game_id)
    } else {
        format!("{}.lnk", shortcut_name)
    };
    let shortcut_path = desktop.join(shortcut_file);

    let target = escape_ps_single_quotes(&exe_path.to_string_lossy());
    let output = escape_ps_single_quotes(&shortcut_path.to_string_lossy());
    let workdir = escape_ps_single_quotes(&working_dir.to_string_lossy());
    let description = escape_ps_single_quotes(&format!("Launch {} in emuBro", game_name));
    let args = format!("--launch-game={}", game_id);
    let args_escaped = escape_ps_single_quotes(&args);

    let script = format!(
        "$w = New-Object -ComObject WScript.Shell; \
$s = $w.CreateShortcut('{output}'); \
$s.TargetPath = '{target}'; \
$s.Arguments = '{args}'; \
$s.WorkingDirectory = '{workdir}'; \
$s.Description = '{description}'; \
$s.Save();",
        output = output,
        target = target,
        args = args_escaped,
        workdir = workdir,
        description = description,
    );

    let powershell_output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            script.as_str(),
        ])
        .output()
        .map_err(|error| error.to_string())?;

    if !powershell_output.status.success() {
        let stderr = String::from_utf8_lossy(&powershell_output.stderr).trim().to_string();
        let stdout = String::from_utf8_lossy(&powershell_output.stdout).trim().to_string();
        let message = if !stderr.is_empty() {
            stderr
        } else if !stdout.is_empty() {
            stdout
        } else {
            "Failed to create shortcut".to_string()
        };
        return Ok(json!({ "success": false, "message": message }));
    }

    if !shortcut_path.exists() {
        return Ok(json!({ "success": false, "message": "Failed to create shortcut" }));
    }

    Ok(json!({
        "success": true,
        "path": shortcut_path.to_string_lossy().to_string(),
        "args": args
    }))
}

pub(crate) fn handle(channel: &str, args: &[Value]) -> Option<Result<Value, String>> {
    let result = match channel {
        "system:get-specs" => Ok(json!({
            "success": true,
            "specs": build_system_specs()
        })),
        "create-game-shortcut" => {
            let game_id = parse_game_id_from_payload(args.get(0).unwrap_or(&Value::Null));
            create_shortcut_for_game(game_id)
        }
        _ => return None,
    };
    Some(result)
}
