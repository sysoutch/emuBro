use super::*;
use serde_json::json;
use std::path::PathBuf;
use std::process::Command;

const RESOURCES_UPDATE_CONFIG_KEY: &str = "resources:update:config:v1";
const DEFAULT_RESOURCES_REPO_URL: &str = "https://github.com/sysoutch/emubro-resources.git";
const DEFAULT_RESOURCES_MANIFEST_URL: &str =
    "https://raw.githubusercontent.com/sysoutch/emubro-resources/master/manifest.json";

pub(super) fn handle(ch: &str, args: &[Value], _window: &Window) -> Result<Value, String> {
    match ch {
        "update:get-state" => Ok(json!({
            "available": false,
            "downloaded": false
        })),
        "resources:update:get-state" => Ok(read_resources_update_state()),
        "update:get-config" => Ok(json!({})),
        "resources:update:get-config" => Ok(read_resources_update_config()),
        "update:set-config" => Ok(json!({ "success": true })),
        "resources:update:set-config" => {
            let config = write_resources_update_config(args.get(0))?;
            Ok(with_config(
                json!({
                    "success": true
                }),
                &config,
            ))
        }
        "update:check" | "update:download" | "update:install" => Ok(not_implemented()),
        "resources:update:check" => check_resources_update(),
        "resources:update:install" => install_resources_update(),
        _ => Ok(json!({ "success": false, "message": format!("Unsupported updates channel: {}", ch) })),
    }
}

fn default_resources_storage_path() -> String {
    managed_data_root()
        .join("emubro-resources")
        .to_string_lossy()
        .to_string()
}

fn default_resources_update_config() -> Value {
    let default_storage = default_resources_storage_path();
    json!({
        "manifestUrl": DEFAULT_RESOURCES_MANIFEST_URL,
        "repoUrl": DEFAULT_RESOURCES_REPO_URL,
        "storagePath": "",
        "effectiveStoragePath": default_storage,
        "defaultStoragePath": default_storage,
        "autoCheckOnStartup": true,
        "autoCheckIntervalMinutes": 60
    })
}

fn normalize_resources_update_config(payload: Option<&Value>, fallback: &Value) -> Value {
    let fallback_manifest = fallback
        .get("manifestUrl")
        .and_then(|v| v.as_str())
        .unwrap_or(DEFAULT_RESOURCES_MANIFEST_URL)
        .trim()
        .to_string();
    let fallback_repo = fallback
        .get("repoUrl")
        .and_then(|v| v.as_str())
        .unwrap_or(DEFAULT_RESOURCES_REPO_URL)
        .trim()
        .to_string();
    let fallback_storage = fallback
        .get("storagePath")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let fallback_auto_start = fallback
        .get("autoCheckOnStartup")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    let fallback_interval = fallback
        .get("autoCheckIntervalMinutes")
        .and_then(|v| v.as_u64())
        .unwrap_or(60);

    let manifest_url = payload
        .and_then(|v| v.get("manifestUrl"))
        .and_then(|v| v.as_str())
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
        .unwrap_or(fallback_manifest);
    let repo_url = payload
        .and_then(|v| v.get("repoUrl"))
        .and_then(|v| v.as_str())
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
        .unwrap_or(fallback_repo);
    let storage_path = payload
        .and_then(|v| v.get("storagePath"))
        .and_then(|v| v.as_str())
        .map(|v| v.trim().to_string())
        .unwrap_or(fallback_storage);
    let auto_check_on_startup = payload
        .and_then(|v| v.get("autoCheckOnStartup"))
        .and_then(|v| v.as_bool())
        .unwrap_or(fallback_auto_start);
    let auto_check_interval_minutes = payload
        .and_then(|v| v.get("autoCheckIntervalMinutes"))
        .and_then(|v| v.as_u64())
        .unwrap_or(fallback_interval)
        .max(5);

    let default_storage_path = default_resources_storage_path();
    let effective_storage_path = if storage_path.trim().is_empty() {
        default_storage_path.clone()
    } else {
        storage_path.clone()
    };

    json!({
        "manifestUrl": manifest_url,
        "repoUrl": repo_url,
        "storagePath": storage_path,
        "effectiveStoragePath": effective_storage_path,
        "defaultStoragePath": default_storage_path,
        "autoCheckOnStartup": auto_check_on_startup,
        "autoCheckIntervalMinutes": auto_check_interval_minutes
    })
}

fn read_resources_update_config() -> Value {
    let default_config = default_resources_update_config();
    let stored = read_state_value_or_default(RESOURCES_UPDATE_CONFIG_KEY, default_config.clone());
    normalize_resources_update_config(Some(&stored), &default_config)
}

fn write_resources_update_config(payload: Option<&Value>) -> Result<Value, String> {
    let existing = read_resources_update_config();
    let next = normalize_resources_update_config(payload, &existing);
    write_state_value(RESOURCES_UPDATE_CONFIG_KEY, &next)?;
    Ok(next)
}

fn with_config(base: Value, config: &Value) -> Value {
    let mut out = match base {
        Value::Object(map) => map,
        _ => serde_json::Map::new(),
    };
    if let Some(cfg) = config.as_object() {
        for (k, v) in cfg {
            out.insert(k.clone(), v.clone());
        }
    }
    Value::Object(out)
}

fn read_manifest_version(path: &PathBuf) -> Option<String> {
    let manifest_path = path.join("manifest.json");
    let raw = fs::read_to_string(manifest_path).ok()?;
    let parsed = serde_json::from_str::<Value>(&raw).ok()?;
    let version = parsed.get("version").and_then(|v| v.as_str()).unwrap_or("").trim();
    if version.is_empty() {
        None
    } else {
        Some(version.to_string())
    }
}

fn fetch_remote_manifest_version(manifest_url: &str) -> Result<String, String> {
    let trimmed = manifest_url.trim();
    if trimmed.is_empty() {
        return Ok(String::new());
    }
    let response = ureq::get(trimmed)
        .set("Cache-Control", "no-cache")
        .set("Pragma", "no-cache")
        .call()
        .map_err(|e| e.to_string())?;
    let text = response.into_string().map_err(|e| e.to_string())?;
    let parsed = serde_json::from_str::<Value>(&text).map_err(|e| e.to_string())?;
    let version = parsed
        .get("version")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    Ok(version)
}

fn read_resources_update_state() -> Value {
    let config = read_resources_update_config();
    let effective_storage_path = config
        .get("effectiveStoragePath")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let current_version = if effective_storage_path.is_empty() {
        String::new()
    } else {
        read_manifest_version(&PathBuf::from(&effective_storage_path)).unwrap_or_default()
    };

    with_config(
        json!({
            "success": true,
            "available": false,
            "checking": false,
            "installing": false,
            "downloaded": false,
            "progressPercent": 0,
            "currentVersion": current_version,
            "latestVersion": "",
            "lastError": "",
            "lastMessage": ""
        }),
        &config,
    )
}

fn check_resources_update() -> Result<Value, String> {
    let config = read_resources_update_config();
    let manifest_url = config
        .get("manifestUrl")
        .and_then(|v| v.as_str())
        .unwrap_or(DEFAULT_RESOURCES_MANIFEST_URL)
        .trim()
        .to_string();
    let effective_storage_path = config
        .get("effectiveStoragePath")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let current_version = read_manifest_version(&PathBuf::from(&effective_storage_path)).unwrap_or_default();

    match fetch_remote_manifest_version(&manifest_url) {
        Ok(latest_version) => {
            let available = !latest_version.is_empty() && latest_version != current_version;
            Ok(with_config(
                json!({
                    "success": true,
                    "available": available,
                    "checking": false,
                    "installing": false,
                    "progressPercent": 0,
                    "currentVersion": current_version,
                    "latestVersion": latest_version,
                    "lastError": "",
                    "lastMessage": if available { "Resource update available." } else { "Resources are up to date." }
                }),
                &config,
            ))
        }
        Err(error) => Ok(with_config(
            json!({
                "success": false,
                "available": false,
                "checking": false,
                "installing": false,
                "progressPercent": 0,
                "currentVersion": current_version,
                "latestVersion": "",
                "lastError": error,
                "lastMessage": ""
            }),
            &config,
        )),
    }
}

fn run_git_sync(repo_url: &str, target_dir: &PathBuf) -> Result<(), String> {
    let target_parent = target_dir
        .parent()
        .map(|v| v.to_path_buf())
        .unwrap_or_else(|| PathBuf::from("."));
    if !target_parent.exists() {
        fs::create_dir_all(&target_parent).map_err(|e| e.to_string())?;
    }

    if target_dir.join(".git").exists() {
        let status = Command::new("git")
            .arg("-C")
            .arg(target_dir)
            .arg("pull")
            .arg("--ff-only")
            .arg("origin")
            .status()
            .map_err(|e| format!("Failed to run git pull: {}", e))?;
        if !status.success() {
            return Err("Failed to update emubro-resources repository.".to_string());
        }
        return Ok(());
    }

    if target_dir.exists() {
        fs::remove_dir_all(target_dir).map_err(|e| e.to_string())?;
    }

    let status = Command::new("git")
        .arg("clone")
        .arg("--depth")
        .arg("1")
        .arg(repo_url)
        .arg(target_dir)
        .status()
        .map_err(|e| format!("Failed to run git clone: {}", e))?;
    if !status.success() {
        return Err("Failed to clone emubro-resources repository.".to_string());
    }
    Ok(())
}

fn install_resources_update() -> Result<Value, String> {
    let config = read_resources_update_config();
    let repo_url = config
        .get("repoUrl")
        .and_then(|v| v.as_str())
        .unwrap_or(DEFAULT_RESOURCES_REPO_URL)
        .trim()
        .to_string();
    let effective_storage_path = config
        .get("effectiveStoragePath")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    if effective_storage_path.is_empty() {
        return Ok(with_config(
            json!({
                "success": false,
                "installing": false,
                "downloaded": false,
                "progressPercent": 0,
                "lastError": "No storage path configured for resources.",
                "lastMessage": ""
            }),
            &config,
        ));
    }

    match run_git_sync(&repo_url, &PathBuf::from(&effective_storage_path)) {
        Ok(_) => {
            let checked = check_resources_update()?;
            Ok(with_config(
                json!({
                    "success": true,
                    "installing": false,
                    "downloaded": true,
                    "progressPercent": 100,
                    "lastError": "",
                    "lastMessage": "Resources updated successfully."
                }),
                &checked,
            ))
        }
        Err(error) => Ok(with_config(
            json!({
                "success": false,
                "installing": false,
                "downloaded": false,
                "progressPercent": 0,
                "lastError": error,
                "lastMessage": ""
            }),
            &config,
        )),
    }
}
