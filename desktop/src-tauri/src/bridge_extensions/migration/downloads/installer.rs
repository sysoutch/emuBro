use super::*;
use super::emulator_rows::{find_executable_candidate, normalize_install_method, run_shell_command, upsert_emulator_row};
use super::url_helpers::{
    collect_download_urls,
    download_url_to_file,
    ensure_http_url,
    ensure_unique_destination_path,
    infer_download_package_type_from_url,
    is_probably_direct_download,
    normalize_download_os_key,
    sanitize_path_segment,
    url_file_name,
};

pub(super) fn get_emulator_download_options(payload: &Value) -> Value {
    let name = payload
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    if name.is_empty() {
        return json!({ "success": false, "message": "Missing emulator name" });
    }

    let os_key = normalize_download_os_key(payload.get("os").and_then(|v| v.as_str()).unwrap_or(""));
    let urls = collect_download_urls(payload, &os_key);
    let options = urls
        .iter()
        .map(|url| {
            let package_type = infer_download_package_type_from_url(url);
            json!({
                "url": url,
                "source": url,
                "fileName": url_file_name(url),
                "packageType": package_type
            })
        })
        .collect::<Vec<Value>>();

    let recommended = options
        .iter()
        .find_map(|row| row.get("packageType").and_then(|v| v.as_str()))
        .unwrap_or("")
        .to_string();
    let manual_url = ensure_http_url(payload.get("website").and_then(|v| v.as_str()).unwrap_or(""));
    let wayback_url = if manual_url.is_empty() {
        String::new()
    } else {
        format!(
            "https://web.archive.org/web/*/{}",
            urlencoding::encode(&manual_url)
        )
    };

    json!({
        "success": true,
        "osKey": os_key,
        "options": options,
        "recommendedType": recommended,
        "manualUrl": manual_url,
        "waybackUrl": wayback_url
    })
}

pub(super) fn download_and_install_emulator(payload: &Value) -> Value {
    let name = payload
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    if name.is_empty() {
        return json!({ "success": false, "message": "Missing emulator name" });
    }
    let os_key = normalize_download_os_key(payload.get("os").and_then(|v| v.as_str()).unwrap_or(""));
    let install_method = normalize_install_method(
        payload
            .get("installMethod")
            .and_then(|v| v.as_str())
            .unwrap_or("download"),
    );

    if os_key == "linux" && (install_method == "flatpak" || install_method == "apt") {
        let command = payload
            .get("installers")
            .and_then(|v| v.get("linux"))
            .and_then(|v| v.get(&install_method))
            .and_then(|v| v.get("install"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if command.is_empty() {
            return json!({
                "success": false,
                "message": format!("No {} installer command configured for this emulator.", install_method)
            });
        }
        let (ok, stdout, stderr) = run_shell_command(&command);
        if !ok {
            return json!({
                "success": false,
                "message": format!("Failed to run {} installer.", install_method),
                "stdout": stdout,
                "stderr": stderr
            });
        }
        return json!({
            "success": true,
            "installed": false,
            "installedBy": install_method,
            "command": command,
            "message": "Installer finished. Rescan emulators if the binary was not detected automatically."
        });
    }

    let use_wayback = payload
        .get("useWaybackFallback")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    if use_wayback {
        let source_url = ensure_http_url(
            payload
                .get("waybackSourceUrl")
                .and_then(|v| v.as_str())
                .unwrap_or(""),
        );
        let mut wayback_url = ensure_http_url(
            payload
                .get("waybackUrl")
                .and_then(|v| v.as_str())
                .unwrap_or(""),
        );
        if wayback_url.is_empty() && !source_url.is_empty() {
            wayback_url = format!(
                "https://web.archive.org/web/*/{}",
                urlencoding::encode(&source_url)
            );
        }
        if wayback_url.is_empty() {
            return json!({ "success": false, "message": "No fallback source URL available for Wayback Machine." });
        }
        return match open::that(&wayback_url) {
            Ok(_) => json!({
                "success": false,
                "manual": true,
                "wayback": true,
                "openedUrl": wayback_url,
                "message": "Opened Wayback Machine fallback for this emulator."
            }),
            Err(error) => json!({ "success": false, "message": error.to_string() }),
        };
    }

    let requested_type = payload
        .get("packageType")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_lowercase();
    let specific_url = ensure_http_url(payload.get("specificUrl").and_then(|v| v.as_str()).unwrap_or(""));
    let urls = collect_download_urls(payload, &os_key);
    let selected_url = if !specific_url.is_empty() {
        specific_url
    } else if !requested_type.is_empty() {
        urls.into_iter()
            .find(|url| infer_download_package_type_from_url(url) == requested_type)
            .unwrap_or_default()
    } else {
        urls.into_iter().next().unwrap_or_default()
    };

    if selected_url.is_empty() {
        let manual_url = ensure_http_url(payload.get("website").and_then(|v| v.as_str()).unwrap_or(""));
        if manual_url.is_empty() {
            return json!({ "success": false, "message": "No download source found for this emulator" });
        }
        return match open::that(&manual_url) {
            Ok(_) => json!({
                "success": false,
                "manual": true,
                "openedUrl": manual_url,
                "message": "No direct package found. Opened the download page in your browser."
            }),
            Err(error) => json!({ "success": false, "message": error.to_string() }),
        };
    }

    let package_type = infer_download_package_type_from_url(&selected_url);
    if !is_probably_direct_download(&selected_url, &package_type) {
        return match open::that(&selected_url) {
            Ok(_) => json!({
                "success": false,
                "manual": true,
                "openedUrl": selected_url,
                "message": "No direct package detected. Opened the download page in your browser."
            }),
            Err(error) => json!({ "success": false, "message": error.to_string() }),
        };
    }

    let settings = read_library_path_settings();
    let first_library_path = settings
        .get("emulatorFolders")
        .and_then(|v| v.as_array())
        .and_then(|arr| arr.first())
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let base_install_root = if first_library_path.is_empty() {
        managed_data_root().join("library-storage").join("emulators")
    } else {
        PathBuf::from(first_library_path)
    };
    let platform_short_name = normalize_platform_short_name(
        payload
            .get("platformShortName")
            .and_then(|v| v.as_str())
            .unwrap_or(payload.get("platform").and_then(|v| v.as_str()).unwrap_or("unknown")),
    );
    let emulator_dir = base_install_root
        .join(sanitize_path_segment(&platform_short_name, "unknown"))
        .join(sanitize_path_segment(&name, "emulator"));
    if let Err(error) = ensure_directory(&emulator_dir) {
        return json!({ "success": false, "message": error });
    }

    let cache_dir = managed_data_root().join("download-cache").join("emulators");
    if let Err(error) = ensure_directory(&cache_dir) {
        return json!({ "success": false, "message": error });
    }
    let default_name = format!("{}-{}", sanitize_path_segment(&name, "emulator"), unix_timestamp_ms());
    let resolved_name = url_file_name(&selected_url);
    let file_name = if resolved_name.is_empty() { default_name } else { resolved_name };
    let download_path = ensure_unique_destination_path(&cache_dir.join(file_name));

    let size_bytes = match download_url_to_file(&selected_url, &download_path) {
        Ok(size) => size,
        Err(error) => return json!({ "success": false, "message": error }),
    };

    let ext = normalize_extension(download_path.extension().and_then(|v| v.to_str()).unwrap_or(""));
    let is_archive = matches!(
        ext.as_str(),
        ".zip" | ".7z" | ".rar" | ".tar" | ".gz" | ".bz2" | ".xz"
    );

    let package_path: PathBuf;
    let mut installed_path = PathBuf::new();

    if is_archive {
        if let Err(error) = extract_archive_to_dir(&download_path, &emulator_dir) {
            return json!({
                "success": false,
                "message": error,
                "packagePath": download_path.to_string_lossy().to_string()
            });
        }
        package_path = emulator_dir.clone();
        if let Some(candidate) = find_executable_candidate(&emulator_dir, &os_key) {
            installed_path = candidate;
        }
    } else {
        let target = ensure_unique_destination_path(
            &emulator_dir.join(
                download_path
                    .file_name()
                    .and_then(|v| v.to_str())
                    .unwrap_or("package.bin"),
            ),
        );
        if let Err(error) = fs::rename(&download_path, &target) {
            return json!({ "success": false, "message": error.to_string() });
        }
        package_path = target.clone();
        installed_path = target;
    }

    let mut upserted = Value::Null;
    let installed_text = installed_path.to_string_lossy().to_string();
    if !installed_text.trim().is_empty() {
        match upsert_emulator_row(
            &name,
            payload.get("platform").and_then(|v| v.as_str()).unwrap_or(""),
            &platform_short_name,
            &installed_text,
            payload.get("website").and_then(|v| v.as_str()).unwrap_or(""),
            payload
                .get("startParameters")
                .and_then(|v| v.as_str())
                .unwrap_or(""),
            payload.get("type").and_then(|v| v.as_str()).unwrap_or("standalone"),
        ) {
            Ok(row) => upserted = row,
            Err(error) => {
                return json!({
                    "success": false,
                    "message": error,
                    "packagePath": package_path.to_string_lossy().to_string()
                });
            }
        }
    }

    if installed_text.trim().is_empty() {
        return json!({
            "success": true,
            "installed": false,
            "packagePath": package_path.to_string_lossy().to_string(),
            "installDir": emulator_dir.to_string_lossy().to_string(),
            "packageType": package_type,
            "sizeBytes": size_bytes,
            "message": format!(
                "Downloaded package to {}. Could not auto-detect executable yet.",
                package_path.to_string_lossy()
            )
        });
    }

    json!({
        "success": true,
        "installed": true,
        "installedPath": installed_text,
        "packagePath": package_path.to_string_lossy().to_string(),
        "installDir": emulator_dir.to_string_lossy().to_string(),
        "packageType": package_type,
        "sizeBytes": size_bytes,
        "emulator": upserted,
        "message": format!("Downloaded and installed {}.", name)
    })
}
