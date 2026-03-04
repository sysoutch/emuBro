use super::*;
use serde_json::json;
use std::fs::File;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};
use tauri::Manager;

const APP_UPDATE_CONFIG_KEY: &str = "app:update:config:v1";
const APP_UPDATE_STATE_KEY: &str = "app:update:state:v1";
const DEFAULT_APP_RELEASE_API_URL: &str = "https://api.github.com/repos/sysoutch/emuBro/releases/latest";
const DEFAULT_APP_RELEASES_PAGE_URL: &str = "https://github.com/sysoutch/emuBro/releases";
const APP_UPDATE_DOWNLOADS_DIR_NAME: &str = "updates";
const APP_UPDATE_DOWNLOAD_IN_PROGRESS_MSG: &str = "Update download already in progress.";

static APP_UPDATE_DOWNLOAD_IN_PROGRESS: AtomicBool = AtomicBool::new(false);

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
    let downloaded_file_path = stored
        .get("downloadedFilePath")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let has_local_download = !downloaded_file_path.is_empty() && Path::new(&downloaded_file_path).exists();
    let stored_downloaded = stored
        .get("downloaded")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let downloaded = if downloaded_file_path.is_empty() {
        stored_downloaded
    } else {
        stored_downloaded && has_local_download
    };
    let progress_percent = if downloaded {
        100
    } else {
        stored.get("progressPercent").and_then(|v| v.as_u64()).unwrap_or(0)
    };

    with_config(
        json!({
            "success": true,
            "available": stored.get("available").and_then(|v| v.as_bool()).unwrap_or(false),
            "checking": stored.get("checking").and_then(|v| v.as_bool()).unwrap_or(false),
            "downloading": stored.get("downloading").and_then(|v| v.as_bool()).unwrap_or(false),
            "installing": stored.get("installing").and_then(|v| v.as_bool()).unwrap_or(false),
            "downloaded": downloaded,
            "progressPercent": progress_percent,
            "currentVersion": current_version,
            "latestVersion": stored.get("latestVersion").and_then(|v| v.as_str()).unwrap_or(""),
            "releaseNotes": stored.get("releaseNotes").and_then(|v| v.as_str()).unwrap_or(""),
            "releaseUrl": stored.get("releaseUrl").and_then(|v| v.as_str()).unwrap_or(""),
            "downloadUrl": stored.get("downloadUrl").and_then(|v| v.as_str()).unwrap_or(""),
            "downloadFileName": stored.get("downloadFileName").and_then(|v| v.as_str()).unwrap_or(""),
            "downloadedFilePath": downloaded_file_path,
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

fn pick_release_asset_info(release_json: &Value) -> (String, String) {
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
                let file_name = asset
                    .get("name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .trim()
                    .to_string();
                return (url, file_name);
            }
        }
    }

    for asset in assets {
        let url = asset
            .get("browser_download_url")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if !url.is_empty() {
            let file_name = asset
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            return (url, file_name);
        }
    }

    (String::new(), String::new())
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
    let (download_url, download_file_name) = pick_release_asset_info(&release_json);

    Ok(json!({
        "version": version,
        "releaseUrl": release_url,
        "releaseNotes": release_notes,
        "downloadUrl": download_url,
        "downloadFileName": download_file_name
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
            let download_file_name = latest
                .get("downloadFileName")
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
            let existing_download_path = existing
                .get("downloadedFilePath")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            let existing_download_file_name = existing
                .get("downloadFileName")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            let local_download_exists =
                !existing_download_path.is_empty() && Path::new(&existing_download_path).exists();
            let already_downloaded = existing
                .get("downloaded")
                .and_then(|v| v.as_bool())
                .unwrap_or(false)
                && existing_latest == latest_version
                && (existing_download_path.is_empty() || local_download_exists);

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
                    "downloadFileName": if !download_file_name.is_empty() { download_file_name } else { existing_download_file_name },
                    "downloadedFilePath": if already_downloaded && local_download_exists { existing_download_path } else { "".to_string() },
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
                    "downloadFileName": "",
                    "downloadedFilePath": "",
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

fn read_downloaded_file_path(state: &Value) -> String {
    state
        .get("downloadedFilePath")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string()
}

fn app_update_downloads_dir() -> PathBuf {
    managed_data_root().join(APP_UPDATE_DOWNLOADS_DIR_NAME)
}

fn sanitize_file_name(input: &str) -> String {
    let mut out = String::new();
    for ch in input.chars() {
        if ch.is_ascii_alphanumeric() || ch == '.' || ch == '-' || ch == '_' {
            out.push(ch);
        }
    }
    let cleaned = out.trim_matches('.').trim().to_string();
    if cleaned.is_empty() {
        "emubro-update".to_string()
    } else {
        cleaned
    }
}

fn fallback_platform_extension() -> &'static str {
    if cfg!(target_os = "windows") {
        ".exe"
    } else if cfg!(target_os = "linux") {
        ".AppImage"
    } else if cfg!(target_os = "macos") {
        ".dmg"
    } else {
        ".bin"
    }
}

fn infer_download_file_name_from_url(download_url: &str) -> Option<String> {
    let parsed = url::Url::parse(download_url).ok()?;
    let segment = parsed
        .path_segments()
        .and_then(|segments| segments.last())
        .unwrap_or("")
        .trim();
    if segment.is_empty() {
        return None;
    }
    Some(segment.to_string())
}

fn resolve_download_file_name(state: &Value) -> String {
    let from_state = state
        .get("downloadFileName")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let from_url = infer_download_file_name_from_url(
        state
            .get("downloadUrl")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim(),
    )
    .unwrap_or_default();
    let latest_version = normalize_release_tag(
        state
            .get("latestVersion")
            .and_then(|v| v.as_str())
            .unwrap_or(""),
    );
    let candidate = if !from_state.is_empty() {
        from_state
    } else if !from_url.is_empty() {
        from_url
    } else if latest_version.is_empty() {
        format!("emuBro-update{}", fallback_platform_extension())
    } else {
        format!("emuBro-{}{}", latest_version, fallback_platform_extension())
    };
    sanitize_file_name(&candidate)
}

fn resolve_download_target_path(state: &Value) -> Result<PathBuf, String> {
    let dir = app_update_downloads_dir();
    ensure_directory(&dir)?;

    let latest_version = normalize_release_tag(
        state
            .get("latestVersion")
            .and_then(|v| v.as_str())
            .unwrap_or(""),
    );
    let file_name = resolve_download_file_name(state);
    let version_prefix = sanitize_file_name(&latest_version);

    let final_name = if version_prefix.is_empty() {
        file_name
    } else {
        format!("{}-{}", version_prefix, file_name)
    };
    Ok(dir.join(final_name))
}

fn is_supported_download_url(download_url: &str) -> bool {
    let trimmed = download_url.trim();
    if trimmed.is_empty() {
        return false;
    }
    trimmed.starts_with("http://") || trimmed.starts_with("https://")
}

fn format_download_size(bytes: u64) -> String {
    const KB: f64 = 1024.0;
    const MB: f64 = KB * 1024.0;
    const GB: f64 = MB * 1024.0;
    let b = bytes as f64;
    if b >= GB {
        format!("{:.1} GB", b / GB)
    } else if b >= MB {
        format!("{:.1} MB", b / MB)
    } else if b >= KB {
        format!("{:.1} KB", b / KB)
    } else {
        format!("{} B", bytes)
    }
}

#[cfg(unix)]
fn maybe_make_download_executable(path: &Path) -> Result<(), String> {
    use std::os::unix::fs::PermissionsExt;

    let extension = path
        .extension()
        .and_then(|v| v.to_str())
        .unwrap_or("")
        .trim()
        .to_ascii_lowercase();
    if extension != "appimage" {
        return Ok(());
    }

    let metadata = fs::metadata(path).map_err(|e| e.to_string())?;
    let mut permissions = metadata.permissions();
    let mode = permissions.mode();
    if (mode & 0o111) != 0 {
        return Ok(());
    }
    permissions.set_mode(mode | 0o755);
    fs::set_permissions(path, permissions).map_err(|e| e.to_string())
}

#[cfg(not(unix))]
fn maybe_make_download_executable(_path: &Path) -> Result<(), String> {
    Ok(())
}

fn download_update_asset_with_progress(
    download_url: &str,
    target_path: &Path,
    mut on_progress: impl FnMut(u64, Option<u64>),
) -> Result<(), String> {
    if let Some(parent) = target_path.parent() {
        ensure_directory(parent)?;
    }

    let response = ureq::get(download_url)
        .set("User-Agent", "emuBro-Tauri")
        .set("Accept", "application/octet-stream")
        .call()
        .map_err(|e| e.to_string())?;

    let content_length = response
        .header("Content-Length")
        .and_then(|value| value.parse::<u64>().ok());

    let part_file_name = format!(
        "{}.part",
        target_path
            .file_name()
            .and_then(|v| v.to_str())
            .unwrap_or("emubro-update")
    );
    let part_path = target_path.with_file_name(part_file_name);
    let mut reader = response.into_reader();
    let mut file = File::create(&part_path).map_err(|e| e.to_string())?;
    let mut buffer = [0u8; 64 * 1024];
    let mut downloaded_bytes: u64 = 0;

    on_progress(downloaded_bytes, content_length);

    loop {
        let read = reader.read(&mut buffer).map_err(|e| {
            let _ = fs::remove_file(&part_path);
            e.to_string()
        })?;
        if read == 0 {
            break;
        }
        file.write_all(&buffer[..read]).map_err(|e| {
            let _ = fs::remove_file(&part_path);
            e.to_string()
        })?;
        downloaded_bytes = downloaded_bytes.saturating_add(read as u64);
        on_progress(downloaded_bytes, content_length);
    }
    file.flush().map_err(|e| e.to_string())?;

    if target_path.exists() {
        let _ = fs::remove_file(target_path);
    }
    fs::rename(&part_path, target_path).map_err(|e| {
        let _ = fs::remove_file(&part_path);
        e.to_string()
    })?;

    maybe_make_download_executable(target_path)?;
    Ok(())
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
    if APP_UPDATE_DOWNLOAD_IN_PROGRESS.load(Ordering::SeqCst) {
        let current = read_app_update_state(window);
        let state = with_config(
            json!({
                "success": true,
                "downloading": true,
                "installing": false,
                "lastError": "",
                "lastMessage": APP_UPDATE_DOWNLOAD_IN_PROGRESS_MSG
            }),
            &current,
        );
        persist_app_update_state(&state);
        return Ok(state);
    }

    let checked = check_app_update(window)?;
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
                "downloadedFilePath": "",
                "lastMessage": "No app update is currently available."
            }),
            &checked,
        );
        persist_app_update_state(&state);
        return Ok(state);
    }

    let download_url = checked
        .get("downloadUrl")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    if !is_supported_download_url(&download_url) {
        let state = with_config(
            json!({
                "success": false,
                "downloading": false,
                "downloaded": false,
                "progressPercent": 0,
                "downloadedFilePath": "",
                "lastError": "Could not resolve a valid update download URL.",
                "lastMessage": ""
            }),
            &checked,
        );
        persist_app_update_state(&state);
        return Ok(state);
    }

    let target_path = match resolve_download_target_path(&checked) {
        Ok(path) => path,
        Err(error) => {
            let state = with_config(
                json!({
                    "success": false,
                    "downloading": false,
                    "downloaded": false,
                    "progressPercent": 0,
                    "downloadedFilePath": "",
                    "lastError": error,
                    "lastMessage": ""
                }),
                &checked,
            );
            persist_app_update_state(&state);
            return Ok(state);
        }
    };
    let downloaded_file_path = target_path.to_string_lossy().to_string();
    let download_file_name = resolve_download_file_name(&checked);

    if APP_UPDATE_DOWNLOAD_IN_PROGRESS
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .is_err()
    {
        let current = read_app_update_state(window);
        let state = with_config(
            json!({
                "success": true,
                "downloading": true,
                "installing": false,
                "lastError": "",
                "lastMessage": APP_UPDATE_DOWNLOAD_IN_PROGRESS_MSG
            }),
            &current,
        );
        persist_app_update_state(&state);
        return Ok(state);
    }

    let started_state = with_config(
        json!({
            "success": true,
            "downloading": true,
            "installing": false,
            "downloaded": false,
            "progressPercent": 0,
            "downloadedFilePath": downloaded_file_path,
            "downloadFileName": download_file_name,
            "lastError": "",
            "lastMessage": "Downloading update..."
        }),
        &checked,
    );
    persist_app_update_state(&started_state);

    let checked_for_thread = checked.clone();
    let download_url_for_thread = download_url.clone();
    let target_path_for_thread = target_path.clone();

    std::thread::spawn(move || {
        let mut last_percent = 0u64;
        let mut last_emit = Instant::now()
            .checked_sub(Duration::from_secs(5))
            .unwrap_or_else(Instant::now);

        let result = download_update_asset_with_progress(
            &download_url_for_thread,
            &target_path_for_thread,
            |downloaded_bytes, total_bytes| {
                let percent = total_bytes
                    .map(|total| {
                        if total == 0 {
                            0
                        } else {
                            ((downloaded_bytes.saturating_mul(100)) / total).min(99)
                        }
                    })
                    .unwrap_or(0);

                let should_emit =
                    percent > last_percent || last_emit.elapsed() >= Duration::from_millis(700);
                if !should_emit {
                    return;
                }

                last_percent = percent;
                last_emit = Instant::now();

                let progress_message = match total_bytes {
                    Some(total) => format!(
                        "Downloading update... {} / {} ({}%)",
                        format_download_size(downloaded_bytes),
                        format_download_size(total),
                        percent
                    ),
                    None => format!("Downloading update... {}", format_download_size(downloaded_bytes)),
                };
                let progress_state = with_config(
                    json!({
                        "success": true,
                        "downloading": true,
                        "installing": false,
                        "downloaded": false,
                        "progressPercent": percent,
                        "downloadedFilePath": target_path_for_thread.to_string_lossy().to_string(),
                        "lastError": "",
                        "lastMessage": progress_message
                    }),
                    &checked_for_thread,
                );
                persist_app_update_state(&progress_state);
            },
        );

        match result {
            Ok(_) => {
                let completed = with_config(
                    json!({
                        "success": true,
                        "downloading": false,
                        "installing": false,
                        "downloaded": true,
                        "progressPercent": 100,
                        "downloadedFilePath": target_path_for_thread.to_string_lossy().to_string(),
                        "lastError": "",
                        "lastMessage": "Update downloaded. Click \"Install & Restart\" to continue."
                    }),
                    &checked_for_thread,
                );
                persist_app_update_state(&completed);
            }
            Err(error) => {
                let failed = with_config(
                    json!({
                        "success": false,
                        "downloading": false,
                        "installing": false,
                        "downloaded": false,
                        "progressPercent": 0,
                        "lastError": format!("Failed to download update: {}", error),
                        "lastMessage": ""
                    }),
                    &checked_for_thread,
                );
                persist_app_update_state(&failed);
            }
        }

        APP_UPDATE_DOWNLOAD_IN_PROGRESS.store(false, Ordering::SeqCst);
    });

    Ok(started_state)
}

fn install_app_update(window: &Window) -> Result<Value, String> {
    let current_state = read_app_update_state(window);
    let downloading = current_state
        .get("downloading")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    if downloading {
        let state = with_config(
            json!({
                "success": false,
                "installing": false,
                "lastError": "Update is still downloading. Please wait for it to finish.",
                "lastMessage": ""
            }),
            &current_state,
        );
        persist_app_update_state(&state);
        return Ok(state);
    }

    let local_download_path = read_downloaded_file_path(&current_state);
    if !local_download_path.is_empty() && Path::new(&local_download_path).exists() {
        let local_path = PathBuf::from(&local_download_path);
        match maybe_make_download_executable(&local_path).and_then(|_| open::that(&local_path).map_err(|e| e.to_string())) {
            Ok(_) => {
                let state = with_config(
                    json!({
                        "success": true,
                        "installing": false,
                        "downloaded": true,
                        "lastError": "",
                        "lastMessage": "Opened downloaded installer. Complete installation, then relaunch emuBro."
                    }),
                    &current_state,
                );
                persist_app_update_state(&state);
                return Ok(state);
            }
            Err(error) => {
                let state = with_config(
                    json!({
                        "success": false,
                        "installing": false,
                        "lastError": format!("Failed to open downloaded installer: {}", error),
                        "lastMessage": ""
                    }),
                    &current_state,
                );
                persist_app_update_state(&state);
                return Ok(state);
            }
        }
    }

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
