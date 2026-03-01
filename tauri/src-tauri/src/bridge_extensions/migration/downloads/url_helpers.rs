use super::*;
use std::collections::HashSet;
use std::io::{Read, Write};

pub(super) fn normalize_download_os_key(raw: &str) -> String {
    let value = raw.trim().to_lowercase();
    if value == "windows" || value == "win" || value == "win32" || value == "win64" {
        return "windows".to_string();
    }
    if value == "linux" {
        return "linux".to_string();
    }
    if value == "mac" || value == "macos" || value == "darwin" || value == "osx" {
        return "mac".to_string();
    }
    match std::env::consts::OS {
        "windows" => "windows".to_string(),
        "macos" => "mac".to_string(),
        _ => "linux".to_string(),
    }
}

pub(super) fn ensure_http_url(raw: &str) -> String {
    let value = raw.trim();
    if value.is_empty() {
        return String::new();
    }
    let lower = value.to_lowercase();
    if lower.starts_with("http://") || lower.starts_with("https://") {
        return value.to_string();
    }
    if lower.starts_with("www.") {
        return format!("https://{}", value);
    }
    String::new()
}

pub(super) fn infer_download_package_type_from_url(url: &str) -> String {
    let raw = url.trim().to_lowercase();
    if raw.is_empty() {
        return String::new();
    }
    let trimmed = raw.split('?').next().unwrap_or("");
    for ext in [".zip", ".7z", ".rar", ".tar", ".gz", ".bz2", ".xz"] {
        if trimmed.ends_with(ext) {
            return "archive".to_string();
        }
    }
    for ext in [".msi", ".exe", ".pkg", ".dmg", ".deb", ".rpm"] {
        if trimmed.ends_with(ext) {
            return "installer".to_string();
        }
    }
    for ext in [".appimage", ".app", ".sh"] {
        if trimmed.ends_with(ext) {
            return "executable".to_string();
        }
    }
    String::new()
}

pub(super) fn url_file_name(url: &str) -> String {
    let raw = url.trim();
    if raw.is_empty() {
        return String::new();
    }
    let parsed = raw.split('?').next().unwrap_or(raw).trim();
    let tail = parsed.rsplit('/').next().unwrap_or("").trim();
    if tail.is_empty() || tail.eq_ignore_ascii_case("latest") {
        return String::new();
    }
    tail.to_string()
}

pub(super) fn collect_download_urls(payload: &Value, os_key: &str) -> Vec<String> {
    let mut out = Vec::<String>::new();
    let mut seen = HashSet::<String>::new();
    let mut push_url = |value: &str| {
        let normalized = ensure_http_url(value);
        if normalized.is_empty() {
            return;
        }
        let key = normalized.to_lowercase();
        if seen.insert(key) {
            out.push(normalized);
        }
    };

    if let Some(links) = payload.get("downloadLinks").and_then(|v| v.as_object()) {
        for key in [os_key, "windows", "win", "linux", "mac", "macos", "darwin"] {
            if let Some(value) = links.get(key).and_then(|v| v.as_str()) {
                if normalize_download_os_key(key) == os_key {
                    push_url(value);
                }
            }
        }
    }

    match payload.get("downloadUrl") {
        Some(Value::String(url)) => push_url(url),
        Some(Value::Array(values)) => {
            for value in values {
                if let Some(url) = value.as_str() {
                    push_url(url);
                }
            }
        }
        Some(Value::Object(map)) => {
            let keys = if os_key == "windows" {
                vec!["windows", "win", "win32", "win64"]
            } else if os_key == "mac" {
                vec!["mac", "macos", "darwin", "osx"]
            } else {
                vec!["linux"]
            };
            for key in keys {
                if let Some(value) = map.get(key) {
                    match value {
                        Value::String(url) => push_url(url),
                        Value::Array(rows) => {
                            for row in rows {
                                if let Some(url) = row.as_str() {
                                    push_url(url);
                                }
                            }
                        }
                        _ => {}
                    }
                }
            }
        }
        _ => {}
    }

    out
}

pub(super) fn is_probably_direct_download(url: &str, package_type: &str) -> bool {
    if package_type == "archive" || package_type == "installer" || package_type == "executable" {
        return true;
    }
    let lower = url.trim().to_lowercase();
    if lower.contains("github.com") && lower.contains("/releases/latest") {
        return false;
    }
    let tail = lower.split('?').next().unwrap_or("");
    !(tail.ends_with('/') || tail.ends_with(".html") || tail.ends_with(".htm"))
}

pub(super) fn sanitize_path_segment(value: &str, fallback: &str) -> String {
    let mut out = String::new();
    for ch in value.trim().chars() {
        let keep = ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' || ch == ' ';
        if keep {
            out.push(ch);
        }
    }
    let normalized = out.trim().replace(' ', "-");
    if normalized.is_empty() {
        fallback.trim().to_string()
    } else {
        normalized
    }
}

pub(super) fn ensure_unique_destination_path(path: &Path) -> PathBuf {
    if !path.exists() {
        return path.to_path_buf();
    }
    let parent = path.parent().unwrap_or_else(|| Path::new("."));
    let stem = path.file_stem().and_then(|v| v.to_str()).unwrap_or("file");
    let ext = path.extension().and_then(|v| v.to_str()).unwrap_or("");
    for index in 1..10_000 {
        let candidate_name = if ext.is_empty() {
            format!("{}-{}", stem, index)
        } else {
            format!("{}-{}.{}", stem, index, ext)
        };
        let candidate = parent.join(candidate_name);
        if !candidate.exists() {
            return candidate;
        }
    }
    let suffix = unix_timestamp_ms();
    let fallback_name = if ext.is_empty() {
        format!("{}-{}", stem, suffix)
    } else {
        format!("{}-{}.{}", stem, suffix, ext)
    };
    parent.join(fallback_name)
}

pub(super) fn download_url_to_file(url: &str, destination: &Path) -> Result<u64, String> {
    let client = ureq::AgentBuilder::new()
        .timeout(std::time::Duration::from_secs(90))
        .build();
    let response = client
        .get(url)
        .set("User-Agent", "emuBro-Tauri/0.1")
        .call()
        .map_err(|e| e.to_string())?;

    if let Some(parent) = destination.parent() {
        ensure_directory(parent)?;
    }

    let mut out = fs::File::create(destination).map_err(|e| e.to_string())?;
    let mut reader = response.into_reader();
    let mut total = 0u64;
    let mut buf = [0u8; 64 * 1024];
    loop {
        let read = reader.read(&mut buf).map_err(|e| e.to_string())?;
        if read == 0 {
            break;
        }
        out.write_all(&buf[..read]).map_err(|e| e.to_string())?;
        total += read as u64;
    }
    Ok(total)
}
