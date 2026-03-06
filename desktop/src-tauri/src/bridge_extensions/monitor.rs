use super::*;
use std::ffi::OsString;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Clone, Debug, Default)]
struct MonitorInfo {
    id: String,
    name: String,
    device_id: String,
    width: i64,
    height: i64,
    is_primary: bool,
    orientation: i64,
    connected: bool,
}

fn is_windows() -> bool {
    cfg!(target_os = "windows")
}

fn monitor_tool_path_candidates() -> Vec<PathBuf> {
    let mut candidates = Vec::new();
    if let Ok(cwd) = std::env::current_dir() {
        candidates.push(cwd.join("resources").join("MultiMonitorTool.exe"));
        candidates.push(cwd.join("../resources").join("MultiMonitorTool.exe"));
        candidates.push(cwd.join("../../resources").join("MultiMonitorTool.exe"));
        candidates.push(cwd.join("desktop/resources").join("MultiMonitorTool.exe"));
        candidates.push(cwd.join("../desktop/resources").join("MultiMonitorTool.exe"));
    }
    candidates
}

fn resolve_monitor_tool_path() -> Result<PathBuf, String> {
    for candidate in monitor_tool_path_candidates() {
        if candidate.exists() {
            return Ok(candidate);
        }
    }
    Err("MultiMonitorTool.exe not found in resources directory".to_string())
}

fn parse_csv_line(line: &str) -> Vec<String> {
    let mut fields = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;
    let mut chars = line.chars().peekable();

    while let Some(ch) = chars.next() {
        match ch {
            '"' => {
                if in_quotes && matches!(chars.peek(), Some('"')) {
                    current.push('"');
                    let _ = chars.next();
                } else {
                    in_quotes = !in_quotes;
                }
            }
            ',' if !in_quotes => {
                fields.push(current.trim().to_string());
                current.clear();
            }
            _ => current.push(ch),
        }
    }

    fields.push(current.trim().to_string());
    fields
}

fn parse_bool_yes(value: Option<&str>) -> bool {
    matches!(value.unwrap_or("").trim().to_ascii_lowercase().as_str(), "yes" | "true" | "1")
}

fn parse_i64(value: Option<&str>) -> i64 {
    value
        .unwrap_or("")
        .trim()
        .parse::<i64>()
        .unwrap_or(0)
}

fn read_monitor_info() -> Vec<MonitorInfo> {
    if !is_windows() {
        return Vec::new();
    }

    let tool_path = match resolve_monitor_tool_path() {
        Ok(path) => path,
        Err(_) => return Vec::new(),
    };

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let csv_path = std::env::temp_dir().join(format!("emubro_monitors_{}_{}.csv", std::process::id(), now));
    let csv_path_os: OsString = csv_path.as_os_str().to_os_string();

    let run_result = Command::new(tool_path)
        .args(["/scomma"])
        .arg(csv_path_os)
        .output();

    match run_result {
        Ok(output) if output.status.success() => {}
        _ => return Vec::new(),
    }

    let csv_content = match fs::read_to_string(&csv_path) {
        Ok(content) => content,
        Err(_) => {
            let _ = fs::remove_file(&csv_path);
            return Vec::new();
        }
    };
    let _ = fs::remove_file(&csv_path);

    let mut lines = csv_content.lines();
    let header_line = match lines.next() {
        Some(line) if !line.trim().is_empty() => line,
        _ => return Vec::new(),
    };
    let headers = parse_csv_line(header_line);
    if headers.is_empty() {
        return Vec::new();
    }

    let mut rows = Vec::new();
    for (line_index, line) in lines.enumerate() {
        if line.trim().is_empty() {
            continue;
        }
        let values = parse_csv_line(line);
        let mut map = std::collections::HashMap::new();
        for (idx, header) in headers.iter().enumerate() {
            if let Some(value) = values.get(idx) {
                map.insert(header.trim().to_string(), value.trim().to_string());
            }
        }

        let name = map.get("Name").cloned().unwrap_or_else(|| format!("Monitor {}", line_index + 1));
        let monitor_id = map
            .get("Monitor ID")
            .cloned()
            .or_else(|| map.get("Name").cloned())
            .unwrap_or_else(|| name.clone());

        rows.push(MonitorInfo {
            id: monitor_id.clone(),
            name,
            device_id: monitor_id,
            width: parse_i64(map.get("Width").map(String::as_str)),
            height: parse_i64(map.get("Height").map(String::as_str)),
            is_primary: parse_bool_yes(map.get("Primary").map(String::as_str)),
            orientation: parse_i64(map.get("Orientation").map(String::as_str)),
            connected: parse_bool_yes(map.get("Active").map(String::as_str)),
        });
    }

    rows
}

fn read_monitor_info_via_tool() -> Vec<Value> {
    read_monitor_info()
        .into_iter()
        .map(|monitor| {
            json!({
                "id": monitor.id,
                "name": monitor.name,
                "deviceId": monitor.device_id,
                "width": monitor.width,
                "height": monitor.height,
                "isPrimary": monitor.is_primary,
                "orientation": monitor.orientation,
                "connected": monitor.connected
            })
        })
        .collect()
}

fn monitor_id_from_index(monitor_index: i64) -> Result<String, String> {
    let idx = usize::try_from(monitor_index).map_err(|_| "Monitor index out of range".to_string())?;
    let monitors = read_monitor_info();
    let monitor = monitors
        .get(idx)
        .ok_or_else(|| "Monitor index out of range".to_string())?;
    Ok(monitor.id.clone())
}

fn run_monitor_tool_with_args(args: &[String]) -> Result<(), String> {
    if !is_windows() {
        return Err("Monitor tool is only available on Windows".to_string());
    }

    let tool_path = resolve_monitor_tool_path()?;
    let output = Command::new(tool_path)
        .args(args)
        .output()
        .map_err(|error| format!("Failed to run MultiMonitorTool: {}", error))?;

    if output.status.success() {
        return Ok(());
    }

    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let detail = if !stderr.is_empty() {
        stderr
    } else if !stdout.is_empty() {
        stdout
    } else {
        "Unknown tool error".to_string()
    };

    Err(format!("MultiMonitorTool command failed: {}", detail))
}

pub(crate) fn handle(channel: &str, args: &[Value]) -> Option<Result<Value, String>> {
    let result = match channel {
        "get-monitor-info" => Ok(Value::Array(read_monitor_info_via_tool())),
        "detect-monitors" => Ok(Value::Array(read_monitor_info_via_tool())),
        "set-monitor-orientation" => {
            let monitor_index = args.get(0).and_then(|v| v.as_i64()).unwrap_or(-1);
            let orientation = args.get(1).and_then(|v| v.as_i64()).unwrap_or(0);
            match monitor_id_from_index(monitor_index) {
                Ok(monitor_id) => {
                    let command_args = vec![
                        "/SetOrientation".to_string(),
                        monitor_id,
                        orientation.to_string(),
                    ];
                    match run_monitor_tool_with_args(&command_args) {
                        Ok(_) => Ok(json!({ "success": true })),
                        Err(err) => Ok(json!({ "success": false, "message": err })),
                    }
                }
                Err(err) => Ok(json!({ "success": false, "message": err })),
            }
        }
        "toggle-monitor-orientation" => {
            let monitor_index = args.get(0).and_then(|v| v.as_i64()).unwrap_or(-1);
            let target_orientation = args.get(1).and_then(|v| v.as_i64()).unwrap_or(0);
            match monitor_id_from_index(monitor_index) {
                Ok(monitor_id) => {
                    let command_args = vec![
                        "/SetOrientation".to_string(),
                        monitor_id,
                        target_orientation.to_string(),
                    ];
                    match run_monitor_tool_with_args(&command_args) {
                        Ok(_) => Ok(json!({ "success": true })),
                        Err(err) => Ok(json!({ "success": false, "message": err })),
                    }
                }
                Err(err) => Ok(json!({ "success": false, "message": err })),
            }
        }
        "set-monitor-display-state" => {
            let monitor_index = args.get(0).and_then(|v| v.as_i64()).unwrap_or(-1);
            let state = args
                .get(1)
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_lowercase();
            match monitor_id_from_index(monitor_index) {
                Ok(monitor_id) => {
                    let action = if state == "disable" { "/Disable" } else { "/Enable" };
                    let command_args = vec![action.to_string(), monitor_id];
                    match run_monitor_tool_with_args(&command_args) {
                        Ok(_) => Ok(json!({ "success": true })),
                        Err(err) => Ok(json!({ "success": false, "message": err })),
                    }
                }
                Err(err) => Ok(json!({ "success": false, "message": err })),
            }
        }
        "set-primary-monitor" => {
            let monitor_index = args.get(0).and_then(|v| v.as_i64()).unwrap_or(-1);
            match monitor_id_from_index(monitor_index) {
                Ok(monitor_id) => {
                    let command_args = vec!["/SetPrimary".to_string(), monitor_id];
                    match run_monitor_tool_with_args(&command_args) {
                        Ok(_) => Ok(json!({ "success": true })),
                        Err(err) => Ok(json!({ "success": false, "message": err })),
                    }
                }
                Err(err) => Ok(json!({ "success": false, "message": err })),
            }
        }
        _ => return None,
    };
    Some(result)
}
