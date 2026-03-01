use super::*;
use serde_json::json;

pub(super) fn handle(ch: &str, _args: &[Value], _window: &Window) -> Result<Value, String> {
    match ch {
        "update:get-state" | "resources:update:get-state" => Ok(json!({
            "available": false,
            "downloaded": false
        })),
        "update:get-config" | "resources:update:get-config" => Ok(json!({})),
        "update:set-config" | "resources:update:set-config" => Ok(json!({ "success": true })),
        "update:check"
        | "update:download"
        | "update:install"
        | "resources:update:check"
        | "resources:update:install"
        => Ok(not_implemented()),
        _ => Ok(json!({ "success": false, "message": format!("Unsupported updates channel: {}", ch) })),
    }
}
