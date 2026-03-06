use super::*;

fn resolve_emulator_config_path(emulator_path: &str, config_file_path: &str) -> String {
    let exe_path = emulator_path.trim();
    let cfg_path = config_file_path.trim();
    if exe_path.is_empty() || cfg_path.is_empty() {
        return String::new();
    }
    let cfg = Path::new(cfg_path);
    if cfg.is_absolute() {
        return cfg.to_string_lossy().to_string();
    }
    let emulator_dir = Path::new(exe_path).parent().unwrap_or_else(|| Path::new("."));
    let relative = cfg_path.trim_start_matches(['/', '\\']);
    emulator_dir.join(relative).to_string_lossy().to_string()
}

pub(super) fn read_emulator_config_file(payload: &Value) -> Value {
    let emulator_path = payload
        .get("emulatorPath")
        .or_else(|| payload.get("filePath"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let config_file_path = payload
        .get("configFilePath")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    if emulator_path.is_empty() {
        return json!({
            "success": false,
            "exists": false,
            "resolvedPath": "",
            "text": "",
            "message": "Missing emulator path"
        });
    }
    if config_file_path.is_empty() {
        return json!({
            "success": false,
            "exists": false,
            "resolvedPath": "",
            "text": "",
            "message": "Missing config file path"
        });
    }
    if !Path::new(&emulator_path).exists() {
        return json!({
            "success": false,
            "exists": false,
            "resolvedPath": "",
            "text": "",
            "message": "Emulator executable not found"
        });
    }
    let resolved = resolve_emulator_config_path(&emulator_path, &config_file_path);
    if resolved.is_empty() {
        return json!({
            "success": false,
            "exists": false,
            "resolvedPath": "",
            "text": "",
            "message": "Failed to resolve config file path"
        });
    }
    let path = PathBuf::from(&resolved);
    if !path.exists() {
        return json!({
            "success": false,
            "exists": false,
            "resolvedPath": resolved,
            "text": "",
            "message": "Config file not found"
        });
    }
    match fs::read_to_string(&path) {
        Ok(text) => json!({
            "success": true,
            "exists": true,
            "resolvedPath": resolved,
            "text": text
        }),
        Err(error) => json!({
            "success": false,
            "exists": false,
            "resolvedPath": resolved,
            "text": "",
            "message": error.to_string()
        }),
    }
}

pub(super) fn write_emulator_config_file(payload: &Value) -> Value {
    let emulator_path = payload
        .get("emulatorPath")
        .or_else(|| payload.get("filePath"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let config_file_path = payload
        .get("configFilePath")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let contents = payload
        .get("contents")
        .or_else(|| payload.get("text"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    if emulator_path.is_empty() {
        return json!({ "success": false, "resolvedPath": "", "message": "Missing emulator path" });
    }
    if config_file_path.is_empty() {
        return json!({ "success": false, "resolvedPath": "", "message": "Missing config file path" });
    }
    if !Path::new(&emulator_path).exists() {
        return json!({
            "success": false,
            "resolvedPath": "",
            "message": "Emulator executable not found"
        });
    }
    let resolved = resolve_emulator_config_path(&emulator_path, &config_file_path);
    if resolved.is_empty() {
        return json!({
            "success": false,
            "resolvedPath": "",
            "message": "Failed to resolve config file path"
        });
    }
    let target = PathBuf::from(&resolved);
    if let Some(parent) = target.parent() {
        if let Err(error) = ensure_directory(parent) {
            return json!({
                "success": false,
                "resolvedPath": resolved,
                "message": error
            });
        }
    }
    match fs::write(&target, contents.as_bytes()) {
        Ok(_) => json!({
            "success": true,
            "resolvedPath": resolved,
            "bytesWritten": contents.as_bytes().len()
        }),
        Err(error) => json!({
            "success": false,
            "resolvedPath": resolved,
            "message": error.to_string()
        }),
    }
}
