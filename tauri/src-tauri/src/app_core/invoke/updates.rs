use super::*;
use serde_json::json;
use std::path::PathBuf;
use std::process::Command;
use tauri::Manager;

const APP_UPDATE_CONFIG_KEY: &str = "app:update:config:v1";
const APP_UPDATE_STATE_KEY: &str = "app:update:state:v1";
const DEFAULT_APP_RELEASE_API_URL: &str = "https://api.github.com/repos/sysoutch/emuBro/releases/latest";
const DEFAULT_APP_RELEASES_PAGE_URL: &str = "https://github.com/sysoutch/emuBro/releases";

const RESOURCES_UPDATE_CONFIG_KEY: &str = "resources:update:config:v1";
const DEFAULT_RESOURCES_REPO_URL: &str = "https://github.com/sysoutch/emubro-resources.git";
const DEFAULT_RESOURCES_MANIFEST_URL: &str =
    "https://raw.githubusercontent.com/sysoutch/emubro-resources/master/manifest.json";

pub(super) fn handle(ch: &str, args: &[Value], window: &Window) -> Result<Value, String> {
    match ch {
        "update:get-state" => Ok(read_app_update_state(window)),
        "resources:update:get-state" => Ok(read_resources_update_state()),
        "update:get-config" => Ok(read_app_update_config()),
        "resources:update:get-config" => Ok(read_resources_update_config()),
        "update:set-config" => {
            let config = write_app_update_config(args.get(0))?;
            Ok(with_config(
                json!({
                    "success": true
                }),
                &config,
            ))
        }
        "resources:update:set-config" => {
            let config = write_resources_update_config(args.get(0))?;
            Ok(with_config(
                json!({
                    "success": true
                }),
                &config,
            ))
        }
        "update:check" => check_app_update(window),
        "update:download" => download_app_update(window),
        "update:install" => install_app_update(window),
        "resources:update:check" => check_resources_update(),
        "resources:update:install" => install_resources_update(),
        _ => Ok(json!({ "success": false, "message": format!("Unsupported updates channel: {}", ch) })),
    }
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

fn default_app_update_config() -> Value {
    json!({
        "releaseApiUrl": DEFAULT_APP_RELEASE_API_URL,
        "releasesPageUrl": DEFAULT_APP_RELEASES_PAGE_URL,
        "autoCheckOnStartup": true,
        "autoCheckIntervalMinutes": 60
    })
}

fn normalize_app_update_config(payload: Option<&Value>, fallback: &Value) -> Value {
    let fallback_api = fallback
        .get("releaseApiUrl")
        .and_then(|v| v.as_str())
        .unwrap_or(DEFAULT_APP_RELEASE_API_URL)
        .trim()
        .to_string();
    let fallback_page = fallback
        .get("releasesPageUrl")
        .and_then(|v| v.as_str())
        .unwrap_or(DEFAULT_APP_RELEASES_PAGE_URL)
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

    let release_api_url = payload
        .and_then(|v| v.get("releaseApiUrl"))
        .and_then(|v| v.as_str())
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
        .unwrap_or(fallback_api);
    let releases_page_url = payload
        .and_then(|v| v.get("releasesPageUrl"))
        .and_then(|v| v.as_str())
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
        .unwrap_or(fallback_page);
    let auto_check_on_startup = payload
        .and_then(|v| v.get("autoCheckOnStartup"))
        .and_then(|v| v.as_bool())
        .unwrap_or(fallback_auto_start);
    let auto_check_interval_minutes = payload
        .and_then(|v| v.get("autoCheckIntervalMinutes"))
        .and_then(|v| v.as_u64())
        .unwrap_or(fallback_interval)
        .max(5);

    json!({
        "releaseApiUrl": release_api_url,
        "releasesPageUrl": releases_page_url,
        "autoCheckOnStartup": auto_check_on_startup,
        "autoCheckIntervalMinutes": auto_check_interval_minutes
    })
}

fn read_app_update_config() -> Value {
    let default_config = default_app_update_config();
    let stored = read_state_value_or_default(APP_UPDATE_CONFIG_KEY, default_config.clone());
    normalize_app_update_config(Some(&stored), &default_config)
}

fn write_app_update_config(payload: Option<&Value>) -> Result<Value, String> {
    let existing = read_app_update_config();
    let next = normalize_app_update_config(payload, &existing);
    write_state_value(APP_UPDATE_CONFIG_KEY, &next)?;
    Ok(next)
}

fn current_app_version(window: &Window) -> String {
    window.app_handle().package_info().version.to_string()
}

fn read_app_update_state(window: &Window) -> Value {
    let config = read_app_update_config();
    let current_version = current_app_version(window);
    let stored = read_state_value_or_default(APP_UPDATE_STATE_KEY, json!({}));

    with_config(
        json!({
            "success": true,
            "available": stored.get("available").and_then(|v| v.as_bool()).unwrap_or(false),
            "checking": false,
            "downloading": false,
            "installing": false,
            "downloaded": stored.get("downloaded").and_then(|v| v.as_bool()).unwrap_or(false),
            "progressPercent": stored.get("progressPercent").and_then(|v| v.as_u64()).unwrap_or(0),
            "currentVersion": current_version,
            "latestVersion": stored.get("latestVersion").and_then(|v| v.as_str()).unwrap_or(""),
            "releaseNotes": stored.get("releaseNotes").and_then(|v| v.as_str()).unwrap_or(""),
            "releaseUrl": stored.get("releaseUrl").and_then(|v| v.as_str()).unwrap_or(""),
            "downloadUrl": stored.get("downloadUrl").and_then(|v| v.as_str()).unwrap_or(""),
            "lastError": stored.get("lastError").and_then(|v| v.as_str()).unwrap_or(""),
            "lastMessage": stored.get("lastMessage").and_then(|v| v.as_str()).unwrap_or("Not checked yet.")
        }),
        &config,
    )
}

fn persist_app_update_state(state: &Value) {
    let _ = write_state_value(APP_UPDATE_STATE_KEY, state);
}

fn normalize_release_tag(version: &str) -> String {
    version
        .trim()
        .trim_start_matches('v')
        .trim_start_matches('V')
        .to_string()
}

fn semver_newer(latest: &str, current: &str) -> bool {
    let latest_norm = normalize_release_tag(latest);
    let current_norm = normalize_release_tag(current);
    if latest_norm.is_empty() || current_norm.is_empty() {
        return !latest_norm.is_empty() && latest_norm != current_norm;
    }

    match (
        semver::Version::parse(&latest_norm),
        semver::Version::parse(&current_norm),
    ) {
        (Ok(latest_ver), Ok(current_ver)) => latest_ver > current_ver,
        _ => latest_norm != current_norm,
    }
}

fn app_platform_asset_suffixes() -> Vec<&'static str> {
    if cfg!(target_os = "windows") {
        vec![".exe", ".msi", ".zip"]
    } else if cfg!(target_os = "linux") {
        vec![".appimage", ".deb", ".tar.gz"]
    } else if cfg!(target_os = "macos") {
        vec![".dmg", ".app.tar.gz", ".zip"]
    } else {
        vec![".zip", ".tar.gz"]
    }
}

fn pick_release_download_url(release_json: &Value) -> String {
    let assets = release_json
        .get("assets")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    let suffixes = app_platform_asset_suffixes();

    for suffix in suffixes {
        let suffix_lower = suffix.to_lowercase();
        for asset in &assets {
            let name = asset
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_lowercase();
            if !name.ends_with(&suffix_lower) {
                continue;
            }
            let url = asset
                .get("browser_download_url")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if !url.is_empty() {
                return url;
            }
        }
    }

    assets
        .iter()
        .find_map(|asset| {
            asset
                .get("browser_download_url")
                .and_then(|v| v.as_str())
                .map(|v| v.trim().to_string())
                .filter(|v| !v.is_empty())
        })
        .unwrap_or_default()
}

fn fetch_latest_release(release_api_url: &str) -> Result<Value, String> {
    let trimmed = release_api_url.trim();
    if trimmed.is_empty() {
        return Err("Release API URL is empty.".to_string());
    }

    let response = ureq::get(trimmed)
        .set("User-Agent", "emuBro-Tauri")
        .set("Accept", "application/vnd.github+json")
        .call()
        .map_err(|e| e.to_string())?;
    let text = response.into_string().map_err(|e| e.to_string())?;
    let release_json = serde_json::from_str::<Value>(&text).map_err(|e| e.to_string())?;

    let tag_name = release_json
        .get("tag_name")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let version = normalize_release_tag(&tag_name);
    if version.is_empty() {
        return Err("Release API response did not contain a valid tag_name.".to_string());
    }

    let release_url = release_json
        .get("html_url")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let release_notes = release_json
        .get("body")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let download_url = pick_release_download_url(&release_json);

    Ok(json!({
        "version": version,
        "releaseUrl": release_url,
        "releaseNotes": release_notes,
        "downloadUrl": download_url
    }))
}

fn check_app_update(window: &Window) -> Result<Value, String> {
    let config = read_app_update_config();
    let current_version = current_app_version(window);
    let release_api_url = config
        .get("releaseApiUrl")
        .and_then(|v| v.as_str())
        .unwrap_or(DEFAULT_APP_RELEASE_API_URL)
        .to_string();
    let fallback_release_page = config
        .get("releasesPageUrl")
        .and_then(|v| v.as_str())
        .unwrap_or(DEFAULT_APP_RELEASES_PAGE_URL)
        .to_string();

    match fetch_latest_release(&release_api_url) {
        Ok(latest) => {
            let latest_version = latest
                .get("version")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let release_notes = latest
                .get("releaseNotes")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let release_url = latest
                .get("releaseUrl")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            let download_url = latest
                .get("downloadUrl")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            let available = semver_newer(&latest_version, &current_version);

            let existing = read_app_update_state(window);
            let existing_latest = existing
                .get("latestVersion")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let already_downloaded = existing
                .get("downloaded")
                .and_then(|v| v.as_bool())
                .unwrap_or(false)
                && existing_latest == latest_version;

            let state = with_config(
                json!({
                    "success": true,
                    "available": available,
                    "checking": false,
                    "downloading": false,
                    "installing": false,
                    "downloaded": already_downloaded,
                    "progressPercent": if already_downloaded { 100 } else { 0 },
                    "currentVersion": current_version,
                    "latestVersion": latest_version,
                    "releaseNotes": release_notes,
                    "releaseUrl": if release_url.is_empty() { fallback_release_page } else { release_url },
                    "downloadUrl": download_url,
                    "lastError": "",
                    "lastMessage": if available { "App update available." } else { "App is up to date." }
                }),
                &config,
            );
            persist_app_update_state(&state);
            Ok(state)
        }
        Err(error) => {
            let state = with_config(
                json!({
                    "success": false,
                    "available": false,
                    "checking": false,
                    "downloading": false,
                    "installing": false,
                    "downloaded": false,
                    "progressPercent": 0,
                    "currentVersion": current_version,
                    "latestVersion": "",
                    "releaseNotes": "",
                    "releaseUrl": fallback_release_page,
                    "downloadUrl": "",
                    "lastError": error,
                    "lastMessage": ""
                }),
                &config,
            );
            persist_app_update_state(&state);
            Ok(state)
        }
    }
}

fn resolve_update_open_url(state: &Value, fallback_release_page: &str) -> String {
    let download_url = state
        .get("downloadUrl")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    if !download_url.is_empty() {
        return download_url;
    }
    let release_url = state
        .get("releaseUrl")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    if !release_url.is_empty() {
        return release_url;
    }
    fallback_release_page.trim().to_string()
}

fn download_app_update(window: &Window) -> Result<Value, String> {
    let checked = check_app_update(window)?;
    let config = read_app_update_config();
    let fallback_release_page = config
        .get("releasesPageUrl")
        .and_then(|v| v.as_str())
        .unwrap_or(DEFAULT_APP_RELEASES_PAGE_URL);
    let available = checked
        .get("available")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    if !available {
        let state = with_config(
            json!({
                "success": true,
                "downloading": false,
                "downloaded": false,
                "progressPercent": 0,
                "lastError": "",
                "lastMessage": "No app update is currently available."
            }),
            &checked,
        );
        persist_app_update_state(&state);
        return Ok(state);
    }

    let open_url = resolve_update_open_url(&checked, fallback_release_page);
    if open_url.is_empty() {
        let state = with_config(
            json!({
                "success": false,
                "downloading": false,
                "downloaded": false,
                "progressPercent": 0,
                "lastError": "Could not resolve update download URL.",
                "lastMessage": ""
            }),
            &checked,
        );
        persist_app_update_state(&state);
        return Ok(state);
    }

    match open::that(&open_url) {
        Ok(_) => {
            let state = with_config(
                json!({
                    "success": true,
                    "downloading": false,
                    "downloaded": true,
                    "progressPercent": 100,
                    "lastError": "",
                    "lastMessage": "Opened update download in your browser. Run installer, then restart emuBro."
                }),
                &checked,
            );
            persist_app_update_state(&state);
            Ok(state)
        }
        Err(error) => {
            let state = with_config(
                json!({
                    "success": false,
                    "downloading": false,
                    "downloaded": false,
                    "progressPercent": 0,
                    "lastError": format!("Failed to open update URL: {}", error),
                    "lastMessage": ""
                }),
                &checked,
            );
            persist_app_update_state(&state);
            Ok(state)
        }
    }
}

fn install_app_update(window: &Window) -> Result<Value, String> {
    let current_state = read_app_update_state(window);
    let config = read_app_update_config();
    let fallback_release_page = config
        .get("releasesPageUrl")
        .and_then(|v| v.as_str())
        .unwrap_or(DEFAULT_APP_RELEASES_PAGE_URL);
    let open_url = resolve_update_open_url(&current_state, fallback_release_page);

    if open_url.is_empty() {
        let state = with_config(
            json!({
                "success": false,
                "installing": false,
                "lastError": "No installer URL is available. Run \"Check for Updates\" first.",
                "lastMessage": ""
            }),
            &current_state,
        );
        persist_app_update_state(&state);
        return Ok(state);
    }

    match open::that(&open_url) {
        Ok(_) => {
            let state = with_config(
                json!({
                    "success": true,
                    "installing": false,
                    "downloaded": true,
                    "lastError": "",
                    "lastMessage": "Opened installer/release page. Complete installation, then relaunch emuBro."
                }),
                &current_state,
            );
            persist_app_update_state(&state);
            Ok(state)
        }
        Err(error) => {
            let state = with_config(
                json!({
                    "success": false,
                    "installing": false,
                    "lastError": format!("Failed to open installer URL: {}", error),
                    "lastMessage": ""
                }),
                &current_state,
            );
            persist_app_update_state(&state);
            Ok(state)
        }
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
