use super::*;

macro_rules! try_or_some_err {
    ($expr:expr) => {
        match $expr {
            Ok(value) => value,
            Err(error) => return Some(Err(error)),
        }
    };
}

pub(crate) fn handle(channel: &str, args: &[Value]) -> Option<Result<Value, String>> {
    let result = match channel {
        "remote:host:get-config" => {
            let config = read_remote_host_config();
            Ok(json!({ "success": true, "config": config }))
        }
        "remote:host:set-config" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let config = try_or_some_err!(write_remote_host_config(Some(&payload)));
            let status = remote_host_status_payload(&config);
            Ok(json!({
                "success": true,
                "config": config,
                "status": status
            }))
        }
        "remote:host:get-status" => {
            let config = read_remote_host_config();
            Ok(json!({
                "success": true,
                "status": remote_host_status_payload(&config)
            }))
        }
        "remote:host:get-pairing" => {
            let pairing = read_or_refresh_pairing_code();
            Ok(json!({ "success": true, "pairing": pairing }))
        }
        "remote:host:rotate-pairing" => {
            let pairing = generate_pairing_code_value();
            try_or_some_err!(write_state_value(REMOTE_HOST_PAIRING_KEY, &pairing));
            Ok(json!({ "success": true, "pairing": pairing }))
        }
        "remote:client:get-hosts" => Ok(json!({
            "success": true,
            "hosts": read_remote_client_hosts()
        })),
        "remote:client:set-hosts" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let hosts = payload
                .get("hosts")
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default();
            let saved = try_or_some_err!(write_remote_client_hosts(&hosts));
            Ok(json!({ "success": true, "hosts": saved }))
        }
        "remote:client:scan" => {
            let config = read_remote_host_config();
            let mut discovered = Vec::<Value>::new();
            if config.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false) {
                discovered.push(local_remote_host_info(&config));
            }
            let existing = read_remote_client_hosts();
            let mut merged = Vec::<Value>::new();
            let mut seen = HashSet::<String>::new();
            for row in discovered.into_iter().chain(existing.into_iter()) {
                let url = row.get("url").and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
                let host_id = row.get("hostId").and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
                let key = if !url.is_empty() { url.to_lowercase() } else { host_id.to_lowercase() };
                if key.is_empty() || !seen.insert(key) {
                    continue;
                }
                merged.push(row);
            }
            Ok(json!({ "success": true, "hosts": merged }))
        }
        "remote:client:pair" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let host_url = payload
                .get("hostUrl")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            let code = payload
                .get("code")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if host_url.is_empty() || code.is_empty() {
                return Some(Ok(json!({ "success": false, "message": "Missing host URL or pairing code." })));
            }
            let current_pairing = read_or_refresh_pairing_code();
            let expected = current_pairing
                .get("code")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if expected != code {
                return Some(Ok(json!({ "success": false, "message": "Invalid pairing code." })));
            }
            let token = random_hex_token(24);
            let mut host = local_remote_host_info(&read_remote_host_config());
            if let Some(obj) = host.as_object_mut() {
                obj.insert("url".to_string(), Value::String(host_url));
            }
            Ok(json!({
                "success": true,
                "result": {
                    "token": token,
                    "host": host
                }
            }))
        }
        "remote:client:list-games" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let token = payload
                .get("token")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if token.is_empty() {
                return Some(Ok(json!({ "success": false, "message": "Missing remote token." })));
            }
            let rows = read_state_array("games")
                .into_iter()
                .map(|game| {
                    json!({
                        "id": game.get("id").and_then(|v| v.as_i64()).unwrap_or(0),
                        "title": game.get("name").and_then(|v| v.as_str()).unwrap_or("Unknown").to_string(),
                        "path": game.get("filePath").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                        "platform": game.get("platform").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                        "platformShortName": game.get("platformShortName").and_then(|v| v.as_str()).unwrap_or("").to_string()
                    })
                })
                .collect::<Vec<Value>>();
            Ok(json!({ "success": true, "games": rows }))
        }
        "remote:client:download-file" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let token = payload
                .get("token")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            let remote_path = payload
                .get("remotePath")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            let destination = payload
                .get("destinationPath")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if token.is_empty() || remote_path.is_empty() || destination.is_empty() {
                return Some(Ok(json!({ "success": false, "message": "Missing download parameters." })));
            }
            if is_launch_uri(&remote_path) {
                return Some(Ok(json!({ "success": false, "message": "Remote launcher URIs cannot be downloaded." })));
            }
            let source_path = PathBuf::from(&remote_path);
            if !source_path.exists() || !source_path.is_file() {
                return Some(Ok(json!({ "success": false, "message": "Remote file not found." })));
            }
            let destination_path = PathBuf::from(&destination);
            if let Some(parent) = destination_path.parent() {
                try_or_some_err!(ensure_directory(parent));
            }
            match fs::copy(&source_path, &destination_path) {
                Ok(_) => Ok(json!({
                    "success": true,
                    "result": {
                        "success": true,
                        "path": destination_path.to_string_lossy().to_string()
                    }
                })),
                Err(err) => Ok(json!({ "success": false, "message": err.to_string() })),
            }
        }
        _ => return None,
    };
    Some(result)
}
