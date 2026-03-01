use super::*;

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
