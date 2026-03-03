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

const REMOTE_HOST_CONFIG_KEY: &str = "remoteHostConfig";
const REMOTE_HOST_PAIRING_KEY: &str = "remoteHostPairing";
const REMOTE_CLIENT_HOSTS_KEY: &str = "remoteClientHosts";
const DEFAULT_REMOTE_HOST_PORT: u16 = 38477;
const DEFAULT_REMOTE_DISCOVERY_PORT: u16 = 38478;

fn is_launch_uri(value: &str) -> bool {
    let trimmed = value.trim().to_lowercase();
    trimmed.starts_with("emubro://")
        || trimmed.starts_with("steam://")
        || trimmed.starts_with("shell:")
}

fn random_hex_token(len: usize) -> String {
    let mut seed = format!(
        "{}:{}:{}",
        unix_timestamp_ms(),
        std::process::id(),
        std::thread::current().name().unwrap_or("emubro")
    );
    let mut out = String::new();
    while out.len() < len {
        let mut hasher = DefaultHasher::new();
        seed.hash(&mut hasher);
        let next = format!("{:016x}", hasher.finish());
        out.push_str(&next);
        seed = next;
    }
    out.truncate(len);
    out
}

fn default_remote_allowed_roots() -> Vec<Value> {
    let settings = read_library_path_settings();
    let mut rows = Vec::<Value>::new();
    let mut seen = HashSet::<String>::new();
    for key in ["gameFolders", "scanFolders", "emulatorFolders"] {
        if let Some(values) = settings.get(key).and_then(|v| v.as_array()) {
            for value in values {
                if let Some(path) = value.as_str() {
                    add_unique_text(&mut rows, &mut seen, path);
                }
            }
        }
    }
    if rows.is_empty() {
        add_unique_text(
            &mut rows,
            &mut seen,
            managed_data_root().to_string_lossy().as_ref()
        );
    }
    rows
}

fn default_remote_host_config() -> Value {
    json!({
        "enabled": false,
        "port": DEFAULT_REMOTE_HOST_PORT,
        "discoveryPort": DEFAULT_REMOTE_DISCOVERY_PORT,
        "allowedRoots": default_remote_allowed_roots()
    })
}

fn normalize_port(value: Option<&Value>, fallback: u16) -> u16 {
    let parsed = value
        .and_then(|v| v.as_u64())
        .or_else(|| value.and_then(|v| v.as_str()).and_then(|s| s.trim().parse::<u64>().ok()))
        .unwrap_or(fallback as u64);
    parsed.clamp(1, 65535) as u16
}

fn normalize_remote_host_config(payload: Option<&Value>) -> Value {
    let defaults = default_remote_host_config();
    json!({
        "enabled": payload
            .and_then(|v| v.get("enabled"))
            .and_then(|v| v.as_bool())
            .unwrap_or_else(|| defaults.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false)),
        "port": normalize_port(payload.and_then(|v| v.get("port")), DEFAULT_REMOTE_HOST_PORT),
        "discoveryPort": normalize_port(payload.and_then(|v| v.get("discoveryPort")), DEFAULT_REMOTE_DISCOVERY_PORT),
        "allowedRoots": normalize_path_list(payload.and_then(|v| v.get("allowedRoots")))
    })
}

fn read_remote_host_config() -> Value {
    normalize_remote_host_config(Some(&read_state_value_or_default(
        REMOTE_HOST_CONFIG_KEY,
        default_remote_host_config()
    )))
}

fn write_remote_host_config(payload: Option<&Value>) -> Result<Value, String> {
    let normalized = normalize_remote_host_config(payload);
    write_state_value(REMOTE_HOST_CONFIG_KEY, &normalized)?;
    Ok(normalized)
}

fn host_name() -> String {
    for key in ["COMPUTERNAME", "HOSTNAME"] {
        if let Ok(value) = std::env::var(key) {
            let trimmed = value.trim();
            if !trimmed.is_empty() {
                return trimmed.to_string();
            }
        }
    }
    "emuBro Host".to_string()
}

fn local_ip_guess() -> String {
    "127.0.0.1".to_string()
}

fn local_host_id() -> String {
    let mut hasher = DefaultHasher::new();
    host_name().hash(&mut hasher);
    managed_data_root().to_string_lossy().hash(&mut hasher);
    format!("host-{:016x}", hasher.finish())
}

fn local_remote_host_info(config: &Value) -> Value {
    let port = normalize_port(config.get("port"), DEFAULT_REMOTE_HOST_PORT);
    let address = local_ip_guess();
    json!({
        "hostId": local_host_id(),
        "name": host_name(),
        "address": address,
        "port": port,
        "url": format!("http://{}:{}", local_ip_guess(), port)
    })
}

fn remote_host_status_payload(config: &Value) -> Value {
    let enabled = config.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false);
    let port = normalize_port(config.get("port"), DEFAULT_REMOTE_HOST_PORT);
    json!({
        "running": enabled,
        "port": port
    })
}

fn generate_pairing_code_value() -> Value {
    let mut code = String::new();
    for ch in random_hex_token(6).chars() {
        let digit = ch.to_digit(16).unwrap_or(0) % 10;
        code.push(char::from(b'0' + digit as u8));
    }
    json!({
        "code": code,
        "generatedAt": unix_timestamp_ms().to_string()
    })
}

fn read_or_refresh_pairing_code() -> Value {
    let current = read_state_value_or_default(REMOTE_HOST_PAIRING_KEY, Value::Null);
    let has_code = current
        .get("code")
        .and_then(|v| v.as_str())
        .map(|v| !v.trim().is_empty())
        .unwrap_or(false);
    if has_code {
        return current;
    }
    let generated = generate_pairing_code_value();
    let _ = write_state_value(REMOTE_HOST_PAIRING_KEY, &generated);
    generated
}

fn normalize_remote_client_host_row(row: &Value) -> Option<Value> {
    let url = row.get("url").and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
    let address = row.get("address").and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
    let port = normalize_port(row.get("port"), DEFAULT_REMOTE_HOST_PORT);
    let host_id = row.get("hostId").and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
    if url.is_empty() && address.is_empty() && host_id.is_empty() {
        return None;
    }
    Some(json!({
        "hostId": host_id,
        "name": row.get("name").and_then(|v| v.as_str()).unwrap_or("").trim(),
        "address": if address.is_empty() { "127.0.0.1" } else { &address },
        "port": port,
        "url": if url.is_empty() { format!("http://{}:{}", if address.is_empty() { "127.0.0.1" } else { &address }, port) } else { url },
        "token": row.get("token").and_then(|v| v.as_str()).unwrap_or("").trim()
    }))
}

fn read_remote_client_hosts() -> Vec<Value> {
    read_state_value_or_default(REMOTE_CLIENT_HOSTS_KEY, json!([]))
        .as_array()
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .filter_map(|row| normalize_remote_client_host_row(&row))
        .collect()
}

fn write_remote_client_hosts(hosts: &[Value]) -> Result<Vec<Value>, String> {
    let mut normalized = Vec::<Value>::new();
    let mut seen = HashSet::<String>::new();
    for row in hosts {
        let Some(entry) = normalize_remote_client_host_row(row) else {
            continue;
        };
        let key = entry
            .get("url")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_lowercase();
        if key.is_empty() || !seen.insert(key) {
            continue;
        }
        normalized.push(entry);
    }
    write_state_value(REMOTE_CLIENT_HOSTS_KEY, &Value::Array(normalized.clone()))?;
    Ok(normalized)
}
