use super::*;
use serde_json::json;
use tauri::Manager;

pub(super) fn handle(ch: &str, args: &[Value], window: &Window) -> Result<Value, String> {
    match ch {
        "open-external-url" => {
            let raw_url = args.get(0).and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
            if raw_url.is_empty() {
                return Ok(json!({ "success": false, "message": "Missing URL" }));
            }
            let normalized = if raw_url.to_lowercase().starts_with("http://")
                || raw_url.to_lowercase().starts_with("https://")
            {
                raw_url
            } else {
                format!("https://{}", raw_url)
            };
            match open::that(&normalized) {
                Ok(_) => Ok(json!({ "success": true, "url": normalized })),
                Err(err) => Ok(json!({ "success": false, "message": err.to_string() })),
            }
        }
        "community:open-in-app-window" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let raw_url = payload
                .get("url")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if raw_url.is_empty() {
                return Ok(json!({ "success": false, "message": "Missing URL" }));
            }
            let normalized = if raw_url.to_lowercase().starts_with("http://")
                || raw_url.to_lowercase().starts_with("https://")
            {
                raw_url
            } else {
                format!("https://{}", raw_url)
            };

            let parsed_url = match url::Url::parse(&normalized) {
                Ok(value) => value,
                Err(error) => {
                    return Ok(json!({ "success": false, "message": error.to_string() }));
                }
            };
            if parsed_url.scheme() != "http" && parsed_url.scheme() != "https" {
                return Ok(json!({ "success": false, "message": "Only http(s) community URLs are supported." }));
            }

            let title = payload
                .get("title")
                .and_then(|v| v.as_str())
                .unwrap_or("emuBro Community")
                .trim()
                .to_string();
            let app_handle = window.app_handle().clone();
            let label = "community-browser".to_string();

            let open_external_fallback = |url: &str| -> Result<Value, String> {
                match open::that(url) {
                    Ok(_) => Ok(json!({
                        "success": true,
                        "label": "",
                        "url": url,
                        "fallback": "external-browser"
                    })),
                    Err(error) => Ok(json!({ "success": false, "message": error.to_string() })),
                }
            };

            if let Some(existing_window) = app_handle.get_webview_window(&label) {
                let _ = existing_window.set_title(&title);
                let navigate_result = existing_window.navigate(parsed_url.clone());
                if navigate_result.is_ok() {
                    let _ = existing_window.show();
                    let _ = existing_window.set_focus();
                    return Ok(json!({ "success": true, "label": label, "url": normalized, "reused": true }));
                }
                let _ = existing_window.close();
            }
            for (existing_label, existing_window) in app_handle.webview_windows() {
                if existing_label.starts_with("community-") && existing_label != label {
                    let _ = existing_window.close();
                }
            }

            let community_data_dir = app_handle
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| {
                    std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
                })
                .join("community-webview");
            let _ = fs::create_dir_all(&community_data_dir);

            let builder = tauri::WebviewWindowBuilder::new(
                &app_handle,
                label.clone(),
                tauri::WebviewUrl::External(parsed_url),
            )
            .title(title.clone())
            .inner_size(1360.0, 900.0)
            .min_inner_size(900.0, 620.0)
            .resizable(true)
            .visible(true)
            .closable(true)
            .decorations(true)
            .always_on_top(false)
            .incognito(false)
            .data_directory(community_data_dir)
            .on_navigation(|_url| true)
            .initialization_script(
                r#"
                    window.addEventListener('keydown', (event) => {
                        if (event.key !== 'Escape' && !(event.ctrlKey && (event.key === 'w' || event.key === 'W'))) return;
                        try { window.close(); } catch (_e) {}
                    });
                "#,
            )
            .center();

            match builder.build() {
                Ok(new_window) => {
                    eprintln!("[community] created in-app window for {}", normalized);
                    let _ = new_window.set_decorations(true);
                    let _ = new_window.set_resizable(true);
                    let _ = new_window.show();
                    let _ = new_window.set_focus();
                    Ok(json!({ "success": true, "label": label, "url": normalized }))
                }
                Err(error) => {
                    eprintln!("[community] failed to create in-app window: {}", error);
                    open_external_fallback(&normalized)
                }
            }
        }
        "community:close-in-app-windows" => {
            let app_handle = window.app_handle().clone();
            let mut closed = 0i64;
            for (label, webview_window) in app_handle.webview_windows() {
                if label == "community-browser" || label.starts_with("community-") {
                    if webview_window.close().is_ok() {
                        closed += 1;
                    }
                }
            }
            Ok(json!({ "success": true, "closed": closed }))
        }
        "show-item-in-folder" => {
            let raw_path = args.get(0).and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
            if raw_path.is_empty() {
                return Ok(json!({ "success": false, "message": "Missing path" }));
            }
            let target = PathBuf::from(&raw_path);
            if !target.exists() {
                return Ok(json!({ "success": false, "message": "Path not found" }));
            }
            #[cfg(target_os = "windows")]
            {
                let status = if target.is_file() {
                    Command::new("explorer")
                        .arg(format!("/select,{}", raw_path))
                        .status()
                } else {
                    Command::new("explorer").arg(&raw_path).status()
                };
                match status {
                    Ok(_) => return Ok(json!({ "success": true })),
                    Err(err) => return Ok(json!({ "success": false, "message": err.to_string() })),
                }
            }
            #[cfg(not(target_os = "windows"))]
            {
                let open_target = if target.is_file() {
                    target.parent().unwrap_or(&target).to_path_buf()
                } else {
                    target.clone()
                };
                match open::that(open_target) {
                    Ok(_) => Ok(json!({ "success": true })),
                    Err(err) => Ok(json!({ "success": false, "message": err.to_string() })),
                }
            }
        }
        _ => Ok(json!({ "success": false, "message": format!("Unsupported community channel: {}", ch) })),
    }
}
