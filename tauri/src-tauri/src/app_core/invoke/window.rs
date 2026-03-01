use super::*;
use serde_json::json;

pub(super) fn handle(ch: &str, _args: &[Value], window: &Window) -> Result<Value, String> {
    match ch {
        "window:minimize" => {
            window.minimize().map_err(|e| e.to_string())?;
            Ok(Value::Null)
        }
        "window:start-dragging" | "window:start-drag" => {
            match window.start_dragging() {
                Ok(_) => Ok(Value::Null),
                Err(error) => {
                    eprintln!("[window] start_dragging failed: {}", error);
                    Err(error.to_string())
                }
            }
        }
        "window:toggle-maximize" => {
            let is_max = window.is_maximized().map_err(|e| e.to_string())?;
            if is_max {
                window.unmaximize().map_err(|e| e.to_string())?;
            } else {
                window.maximize().map_err(|e| e.to_string())?;
            }
            Ok(Value::Null)
        }
        "window:close" => {
            window.close().map_err(|e| e.to_string())?;
            Ok(Value::Null)
        }
        "window:is-maximized" => {
            let is_max = window.is_maximized().map_err(|e| e.to_string())?;
            Ok(json!(is_max))
        }
        "app:renderer-ready" => Ok(json!({ "success": true })),
        _ => Ok(json!({ "success": false, "message": format!("Unsupported window channel: {}", ch) })),
    }
}
