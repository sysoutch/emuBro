use super::*;
use std::io::Read;
use std::net::{IpAddr, Ipv4Addr, SocketAddr, UdpSocket};
use std::sync::mpsc::{self, Sender};
use std::sync::{Mutex, OnceLock};
use std::thread;
use std::time::{Duration, Instant};
use tiny_http::{Header, Method, Request as TinyRequest, Response as TinyResponse, Server, StatusCode};
use url::Url;

macro_rules! try_or_some_err {
    ($expr:expr) => {
        match $expr {
            Ok(value) => value,
            Err(error) => return Some(Err(error)),
        }
    };
}

const REMOTE_HOST_CONFIG_KEY: &str = "remoteHostConfig";
const REMOTE_HOST_PAIRING_KEY: &str = "remoteHostPairing";
const REMOTE_HOST_TOKENS_KEY: &str = "remoteHostTokens";
const REMOTE_CLIENT_HOSTS_KEY: &str = "remoteClientHosts";
const DEFAULT_REMOTE_HOST_PORT: u16 = 38477;
const DEFAULT_REMOTE_DISCOVERY_PORT: u16 = 38478;
const DEFAULT_SCAN_TIMEOUT_MS: u64 = 1100;
const DEFAULT_HTTP_TIMEOUT_MS: u64 = 3500;
const DOWNLOAD_TIMEOUT_MS: u64 = 90_000;
const REMOTE_API_BASE: &str = "/api/remote";

struct RemoteHostRuntime {
    host_port: u16,
    discovery_port: u16,
    stop_tx: Sender<()>,
    join_handle: Option<thread::JoinHandle<()>>,
}

static REMOTE_HOST_RUNTIME: OnceLock<Mutex<Option<RemoteHostRuntime>>> = OnceLock::new();

pub(crate) fn bootstrap_runtime_from_saved_config() {
    let config = read_remote_host_config();
    let _ = remote_start_or_update_runtime(&config);
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
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            Ok(remote_scan_hosts(&payload))
        }
        "remote:client:pair" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            Ok(remote_client_pair(&payload))
        }
        "remote:client:list-games" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            Ok(remote_client_list_games(&payload))
        }
        "remote:client:download-file" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            Ok(remote_client_download_file(&payload))
        }
        _ => return None,
    };
    Some(result)
}

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

fn primary_ipv4() -> Option<Ipv4Addr> {
    let socket = UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.connect("8.8.8.8:80").ok()?;
    let local = socket.local_addr().ok()?;
    match local.ip() {
        IpAddr::V4(v4) => Some(v4),
        _ => None,
    }
}

fn local_ipv4_for_peer(peer: SocketAddr) -> Option<Ipv4Addr> {
    let socket = UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.connect((peer.ip(), 9)).ok()?;
    let local = socket.local_addr().ok()?;
    match local.ip() {
        IpAddr::V4(v4) => Some(v4),
        _ => None,
    }
}

fn local_ip_guess() -> String {
    primary_ipv4()
        .map(|v| v.to_string())
        .unwrap_or_else(|| "127.0.0.1".to_string())
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
        "url": format!("http://{}:{}", address, port)
    })
}

fn remote_runtime_slot() -> &'static Mutex<Option<RemoteHostRuntime>> {
    REMOTE_HOST_RUNTIME.get_or_init(|| Mutex::new(None))
}

fn remote_stop_runtime(runtime: &mut Option<RemoteHostRuntime>) {
    if let Some(mut current) = runtime.take() {
        let _ = current.stop_tx.send(());
        if let Some(handle) = current.join_handle.take() {
            let _ = handle.join();
        }
    }
}

fn remote_local_urls(port: u16) -> Vec<String> {
    let mut out = vec![format!("http://127.0.0.1:{}", port)];
    if let Some(local) = primary_ipv4() {
        let url = format!("http://{}:{}", local, port);
        if !out.iter().any(|row| row.eq_ignore_ascii_case(&url)) {
            out.push(url);
        }
    }
    out
}

fn remote_start_or_update_runtime(config: &Value) -> Result<Value, String> {
    let enabled = config.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false);
    let host_port = normalize_port(config.get("port"), DEFAULT_REMOTE_HOST_PORT);
    let discovery_port = normalize_port(config.get("discoveryPort"), DEFAULT_REMOTE_DISCOVERY_PORT);

    let slot = remote_runtime_slot();
    let mut guard = slot
        .lock()
        .map_err(|_| "Remote host runtime lock failed.".to_string())?;

    if !enabled {
        remote_stop_runtime(&mut guard);
        return Ok(json!({
            "running": false,
            "port": host_port,
            "discoveryPort": discovery_port,
            "urls": []
        }));
    }

    if let Some(current) = guard.as_ref() {
        if current.host_port == host_port && current.discovery_port == discovery_port {
            return Ok(json!({
                "running": true,
                "port": host_port,
                "discoveryPort": discovery_port,
                "urls": remote_local_urls(host_port)
            }));
        }
    }

    remote_stop_runtime(&mut guard);

    let server = Server::http(("0.0.0.0", host_port)).map_err(|e| e.to_string())?;
    let discovery_socket = UdpSocket::bind(("0.0.0.0", discovery_port)).map_err(|e| e.to_string())?;
    let _ = discovery_socket.set_nonblocking(true);
    let _ = discovery_socket.set_broadcast(true);
    let (stop_tx, stop_rx) = mpsc::channel::<()>();

    let join_handle = thread::spawn(move || {
        loop {
            if stop_rx.try_recv().is_ok() {
                break;
            }

            match server.recv_timeout(Duration::from_millis(120)) {
                Ok(Some(request)) => remote_handle_http_request(request),
                Ok(None) => {}
                Err(_) => {}
            }

            remote_handle_discovery_probe(&discovery_socket);
        }
    });

    *guard = Some(RemoteHostRuntime {
        host_port,
        discovery_port,
        stop_tx,
        join_handle: Some(join_handle),
    });

    Ok(json!({
        "running": true,
        "port": host_port,
        "discoveryPort": discovery_port,
        "urls": remote_local_urls(host_port)
    }))
}

fn remote_host_status_payload(config: &Value) -> Value {
    let port = normalize_port(config.get("port"), DEFAULT_REMOTE_HOST_PORT);
    let discovery_port = normalize_port(config.get("discoveryPort"), DEFAULT_REMOTE_DISCOVERY_PORT);
    match remote_start_or_update_runtime(config) {
        Ok(status) => status,
        Err(error) => json!({
            "running": false,
            "port": port,
            "discoveryPort": discovery_port,
            "urls": [],
            "error": error
        }),
    }
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
    let url = row
        .get("url")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let address = row
        .get("address")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let port = normalize_port(row.get("port"), DEFAULT_REMOTE_HOST_PORT);
    let host_id = row
        .get("hostId")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    if url.is_empty() && address.is_empty() && host_id.is_empty() {
        return None;
    }

    let normalized_url = if url.is_empty() {
        normalize_client_host_url(
            format!("http://{}:{}", if address.is_empty() { "127.0.0.1" } else { &address }, port).as_str(),
            port,
        )
    } else {
        normalize_client_host_url(&url, port)
    };
    if normalized_url.is_empty() {
        return None;
    }
    let parsed = Url::parse(&normalized_url).ok()?;
    let resolved_address = parsed
        .host_str()
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
        .or_else(|| {
            if address.is_empty() {
                None
            } else {
                Some(address.clone())
            }
        })
        .unwrap_or_else(|| "127.0.0.1".to_string());
    let resolved_port = parsed.port().unwrap_or(port);

    Some(json!({
        "hostId": host_id,
        "name": row.get("name").and_then(|v| v.as_str()).unwrap_or("").trim(),
        "address": resolved_address,
        "port": resolved_port,
        "url": normalized_url,
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
        let url_key = entry
            .get("url")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_lowercase();
        let host_key = entry
            .get("hostId")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_lowercase();
        let dedupe_key = if !host_key.is_empty() { host_key } else { url_key };
        if dedupe_key.is_empty() || !seen.insert(dedupe_key) {
            continue;
        }
        normalized.push(entry);
    }
    write_state_value(REMOTE_CLIENT_HOSTS_KEY, &Value::Array(normalized.clone()))?;
    Ok(normalized)
}

fn normalize_client_host_url(raw: &str, fallback_port: u16) -> String {
    let mut text = raw.trim().to_string();
    if text.is_empty() {
        return String::new();
    }
    if !text.to_lowercase().starts_with("http://") && !text.to_lowercase().starts_with("https://") {
        text = format!("http://{}", text);
    }
    let mut parsed = match Url::parse(&text) {
        Ok(value) => value,
        Err(_) => return String::new(),
    };
    let scheme = parsed.scheme().trim().to_lowercase();
    if scheme != "http" && scheme != "https" {
        return String::new();
    }
    if parsed.host_str().unwrap_or("").trim().is_empty() {
        return String::new();
    }
    if parsed.port().is_none() {
        let _ = parsed.set_port(Some(fallback_port));
    }
    parsed.set_path("");
    parsed.set_query(None);
    parsed.set_fragment(None);
    parsed.to_string().trim_end_matches('/').to_string()
}

fn host_url_from_payload(payload: &Value) -> String {
    let port = normalize_port(payload.get("port"), DEFAULT_REMOTE_HOST_PORT);
    let raw = payload
        .get("hostUrl")
        .or_else(|| payload.get("url"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim();
    normalize_client_host_url(raw, port)
}

fn tiny_header(name: &str, value: &str) -> Option<Header> {
    Header::from_bytes(name.as_bytes(), value.as_bytes()).ok()
}

fn tiny_json_response(status: u16, payload: &Value) -> TinyResponse<std::io::Cursor<Vec<u8>>> {
    let body = serde_json::to_vec(payload)
        .unwrap_or_else(|_| br#"{"success":false,"message":"json encode failed"}"#.to_vec());
    let mut response = TinyResponse::new(
        StatusCode(status),
        Vec::new(),
        std::io::Cursor::new(body),
        None,
        None,
    );
    if let Some(header) = tiny_header("Content-Type", "application/json; charset=utf-8") {
        response.add_header(header);
    }
    if let Some(header) = tiny_header("Cache-Control", "no-store, no-cache, must-revalidate") {
        response.add_header(header);
    }
    response
}

fn tiny_request_body_json(request: &mut TinyRequest, max_bytes: usize) -> Result<Value, String> {
    let mut raw = String::new();
    let mut limited = request.as_reader().take(max_bytes as u64);
    limited.read_to_string(&mut raw).map_err(|e| e.to_string())?;
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Ok(json!({}));
    }
    serde_json::from_str::<Value>(trimmed).map_err(|_| "Invalid JSON payload.".to_string())
}

fn remote_request_address(request: &TinyRequest) -> String {
    request
        .remote_addr()
        .map(|v| {
            let ip = v.ip().to_string();
            if ip == "::1" {
                "127.0.0.1".to_string()
            } else if ip.starts_with("::ffff:") {
                ip.trim_start_matches("::ffff:").to_string()
            } else {
                ip
            }
        })
        .unwrap_or_default()
}

fn normalize_remote_token_row(row: &Value) -> Option<Value> {
    let token = row
        .get("token")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    if token.is_empty() {
        return None;
    }
    let created_at = row
        .get("createdAt")
        .and_then(|v| v.as_u64())
        .unwrap_or_else(|| unix_timestamp_ms() as u64);
    let last_seen_at = row
        .get("lastSeenAt")
        .and_then(|v| v.as_u64())
        .unwrap_or(created_at);
    Some(json!({
        "token": token,
        "clientName": row.get("clientName").and_then(|v| v.as_str()).unwrap_or("").trim(),
        "remoteAddress": row.get("remoteAddress").and_then(|v| v.as_str()).unwrap_or("").trim(),
        "createdAt": created_at,
        "lastSeenAt": last_seen_at
    }))
}

fn read_remote_host_tokens() -> Vec<Value> {
    read_state_value_or_default(REMOTE_HOST_TOKENS_KEY, json!([]))
        .as_array()
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .filter_map(|row| normalize_remote_token_row(&row))
        .collect()
}

fn write_remote_host_tokens(tokens: &[Value]) -> Result<(), String> {
    let normalized = tokens
        .iter()
        .filter_map(normalize_remote_token_row)
        .collect::<Vec<Value>>();
    write_state_value(REMOTE_HOST_TOKENS_KEY, &Value::Array(normalized))
}

fn issue_remote_token(client_name: &str, remote_address: &str) -> Result<String, String> {
    let mut rows = read_remote_host_tokens();
    let token = random_hex_token(48);
    let now = unix_timestamp_ms();
    rows.insert(0, json!({
        "token": token,
        "clientName": client_name.trim(),
        "remoteAddress": remote_address.trim(),
        "createdAt": now,
        "lastSeenAt": now
    }));
    let mut dedup = Vec::<Value>::new();
    let mut seen = HashSet::<String>::new();
    for row in rows {
        let current = row
            .get("token")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if current.is_empty() || !seen.insert(current.to_lowercase()) {
            continue;
        }
        dedup.push(row);
        if dedup.len() >= 200 {
            break;
        }
    }
    write_remote_host_tokens(&dedup)?;
    Ok(token)
}

fn touch_remote_token(token: &str) -> bool {
    let mut rows = read_remote_host_tokens();
    let mut found = false;
    let now = unix_timestamp_ms();
    for row in &mut rows {
        if row.get("token").and_then(|v| v.as_str()).unwrap_or("").trim() != token.trim() {
            continue;
        }
        if let Some(obj) = row.as_object_mut() {
            obj.insert("lastSeenAt".to_string(), json!(now));
        }
        found = true;
        break;
    }
    if found {
        let _ = write_remote_host_tokens(&rows);
    }
    found
}

fn canonicalize_or_same(path: &Path) -> Option<PathBuf> {
    if path.exists() {
        fs::canonicalize(path).ok().or_else(|| Some(path.to_path_buf()))
    } else {
        Some(path.to_path_buf())
    }
}

fn path_is_within_root(path: &Path, root: &Path) -> bool {
    let Some(canonical_path) = canonicalize_or_same(path) else {
        return false;
    };
    let Some(canonical_root) = canonicalize_or_same(root) else {
        return false;
    };
    if cfg!(windows) {
        let p = canonical_path.to_string_lossy().to_lowercase();
        let r = canonical_root.to_string_lossy().to_lowercase();
        if p == r {
            return true;
        }
        let mut r_sep = r.clone();
        if !r_sep.ends_with('\\') && !r_sep.ends_with('/') {
            r_sep.push('\\');
        }
        p.starts_with(&r_sep) || p.starts_with(&(r + "/"))
    } else {
        canonical_path.starts_with(&canonical_root)
    }
}

fn allowed_roots_from_config(config: &Value) -> Vec<PathBuf> {
    config
        .get("allowedRoots")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .filter_map(|v| v.as_str().map(|s| s.trim().to_string()))
        .filter(|s| !s.is_empty())
        .map(PathBuf::from)
        .collect()
}

fn path_allowed_for_remote_access(path: &Path, config: &Value) -> bool {
    let roots = allowed_roots_from_config(config);
    if roots.is_empty() {
        return false;
    }
    roots.into_iter().any(|root| path_is_within_root(path, &root))
}

fn remote_list_games_for_client(config: &Value) -> Vec<Value> {
    let roots = allowed_roots_from_config(config);
    let roots_exist = !roots.is_empty();
    read_state_array("games")
        .into_iter()
        .filter_map(|game| {
            let path_text = game
                .get("filePath")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if path_text.is_empty() {
                return None;
            }

            if !is_launch_uri(&path_text) && roots_exist {
                let file_path = PathBuf::from(&path_text);
                if !path_allowed_for_remote_access(&file_path, config) {
                    return None;
                }
            }

            Some(json!({
                "id": game.get("id").and_then(|v| v.as_i64()).unwrap_or(0),
                "title": game.get("name").and_then(|v| v.as_str()).unwrap_or("Unknown").to_string(),
                "path": path_text,
                "platform": game.get("platform").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                "platformShortName": game.get("platformShortName").and_then(|v| v.as_str()).unwrap_or("").to_string()
            }))
        })
        .collect::<Vec<Value>>()
}

fn parse_ureq_error(err: ureq::Error) -> String {
    match err {
        ureq::Error::Status(_code, response) => {
            let body = response.into_string().unwrap_or_default();
            if let Ok(parsed) = serde_json::from_str::<Value>(&body) {
                let message = parsed
                    .get("message")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .trim()
                    .to_string();
                if !message.is_empty() {
                    return message;
                }
            }
            if body.trim().is_empty() {
                "Remote host returned an error.".to_string()
            } else {
                body.trim().to_string()
            }
        }
        ureq::Error::Transport(err) => err.to_string(),
    }
}

fn remote_http_get_json(url: &str, timeout_ms: u64) -> Result<Value, String> {
    let agent = ureq::AgentBuilder::new()
        .timeout(Duration::from_millis(timeout_ms.max(200)))
        .build();
    let response = agent
        .get(url)
        .set("accept", "application/json")
        .call()
        .map_err(parse_ureq_error)?;
    let text = response.into_string().map_err(|e| e.to_string())?;
    serde_json::from_str::<Value>(&text).map_err(|_| "Invalid JSON response from remote host.".to_string())
}

fn remote_http_post_json(url: &str, payload: &Value, timeout_ms: u64) -> Result<Value, String> {
    let body = serde_json::to_string(payload).map_err(|e| e.to_string())?;
    let agent = ureq::AgentBuilder::new()
        .timeout(Duration::from_millis(timeout_ms.max(200)))
        .build();
    let response = agent
        .post(url)
        .set("accept", "application/json")
        .set("content-type", "application/json")
        .send_string(&body)
        .map_err(parse_ureq_error)?;
    let text = response.into_string().map_err(|e| e.to_string())?;
    serde_json::from_str::<Value>(&text).map_err(|_| "Invalid JSON response from remote host.".to_string())
}

fn remote_probe_host_url(host_url: &str) -> Option<Value> {
    let normalized = normalize_client_host_url(host_url, DEFAULT_REMOTE_HOST_PORT);
    if normalized.is_empty() {
        return None;
    }
    let ping_url = format!("{}/ping", remote_api_base_url(&normalized));
    let payload = remote_http_get_json(&ping_url, 1100).ok()?;
    if !payload.get("success").and_then(|v| v.as_bool()).unwrap_or(false) {
        return None;
    }
    let host = payload.get("host").cloned().unwrap_or_else(|| json!({}));
    normalize_remote_client_host_row(&host)
}

fn remote_api_base_url(host_url: &str) -> String {
    format!("{}{}", host_url.trim_end_matches('/'), REMOTE_API_BASE)
}

fn remote_client_pair(payload: &Value) -> Value {
    let host_url = host_url_from_payload(payload);
    let code = payload
        .get("code")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let client_name = payload
        .get("clientName")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    if host_url.is_empty() || code.is_empty() {
        return json!({ "success": false, "message": "Missing host URL or pairing code." });
    }
    let url = format!("{}/pair", remote_api_base_url(&host_url));
    match remote_http_post_json(
        &url,
        &json!({
            "code": code,
            "clientName": client_name
        }),
        DEFAULT_HTTP_TIMEOUT_MS,
    ) {
        Ok(response) => {
            let success = response.get("success").and_then(|v| v.as_bool()).unwrap_or(false);
            if !success {
                return json!({
                    "success": false,
                    "message": response.get("message").and_then(|v| v.as_str()).unwrap_or("Pairing failed.")
                });
            }
            response
        }
        Err(message) => json!({ "success": false, "message": message }),
    }
}

fn remote_client_list_games(payload: &Value) -> Value {
    let host_url = host_url_from_payload(payload);
    let token = payload
        .get("token")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    if host_url.is_empty() || token.is_empty() {
        return json!({ "success": false, "message": "Missing remote host URL or token." });
    }
    let url = format!("{}/list-games", remote_api_base_url(&host_url));
    match remote_http_post_json(&url, &json!({ "token": token }), DEFAULT_HTTP_TIMEOUT_MS) {
        Ok(response) => response,
        Err(message) => json!({ "success": false, "message": message }),
    }
}

fn remote_client_download_file(payload: &Value) -> Value {
    let host_url = host_url_from_payload(payload);
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
    if host_url.is_empty() || token.is_empty() || remote_path.is_empty() || destination.is_empty() {
        return json!({ "success": false, "message": "Missing download parameters." });
    }
    if is_launch_uri(&remote_path) {
        return json!({ "success": false, "message": "Remote launcher URIs cannot be downloaded." });
    }

    let destination_path = PathBuf::from(&destination);
    if let Some(parent) = destination_path.parent() {
        if let Err(error) = ensure_directory(parent) {
            return json!({ "success": false, "message": error });
        }
    }

    match remote_download_to_path(&host_url, &token, &remote_path, &destination_path) {
        Ok(path) => json!({
            "success": true,
            "result": {
                "success": true,
                "path": path
            }
        }),
        Err(message) => json!({ "success": false, "message": message }),
    }
}

fn remote_download_to_path(
    host_url: &str,
    token: &str,
    remote_path: &str,
    destination_path: &Path,
) -> Result<String, String> {
    let url = format!("{}/download-file", remote_api_base_url(host_url));
    let body = serde_json::to_string(&json!({
        "token": token,
        "remotePath": remote_path
    }))
    .map_err(|e| e.to_string())?;
    let agent = ureq::AgentBuilder::new()
        .timeout(Duration::from_millis(DOWNLOAD_TIMEOUT_MS))
        .build();
    let response = agent
        .post(&url)
        .set("accept", "application/octet-stream,application/json")
        .set("content-type", "application/json")
        .send_string(&body);

    match response {
        Ok(response) => {
            let content_type = response
                .header("content-type")
                .unwrap_or("")
                .trim()
                .to_lowercase();
            if content_type.starts_with("application/json") {
                let text = response.into_string().unwrap_or_default();
                if let Ok(parsed) = serde_json::from_str::<Value>(&text) {
                    let message = parsed
                        .get("message")
                        .and_then(|v| v.as_str())
                        .unwrap_or("Download failed.")
                        .trim()
                        .to_string();
                    return Err(message);
                }
                return Err("Download failed.".to_string());
            }

            let temp_path = destination_path.with_extension(format!(
                "{}part",
                destination_path
                    .extension()
                    .and_then(|v| v.to_str())
                    .map(|ext| format!("{ext}."))
                    .unwrap_or_default()
            ));
            let mut file = fs::File::create(&temp_path).map_err(|e| e.to_string())?;
            let mut reader = response.into_reader();
            std::io::copy(&mut reader, &mut file).map_err(|e| e.to_string())?;
            file.flush().map_err(|e| e.to_string())?;
            if destination_path.exists() {
                fs::remove_file(destination_path).map_err(|e| e.to_string())?;
            }
            fs::rename(&temp_path, destination_path).map_err(|e| e.to_string())?;
            Ok(destination_path.to_string_lossy().to_string())
        }
        Err(error) => Err(parse_ureq_error(error)),
    }
}

fn subnet_broadcast_candidate() -> Option<Ipv4Addr> {
    let local = primary_ipv4()?;
    let mut octets = local.octets();
    octets[3] = 255;
    Some(Ipv4Addr::from(octets))
}

fn remote_scan_hosts(payload: &Value) -> Value {
    let config = read_remote_host_config();
    let discovery_port = normalize_port(
        payload.get("discoveryPort").or_else(|| config.get("discoveryPort")),
        DEFAULT_REMOTE_DISCOVERY_PORT,
    );
    let timeout_ms = payload
        .get("timeoutMs")
        .and_then(|v| v.as_u64())
        .map(|v| v.clamp(250, 3500))
        .unwrap_or(DEFAULT_SCAN_TIMEOUT_MS);

    let mut discovered = discover_remote_hosts_udp(discovery_port, timeout_ms);
    let existing = read_remote_client_hosts();

    for host in &existing {
        let url = host
            .get("url")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if url.is_empty() {
            continue;
        }
        if let Some(probed) = remote_probe_host_url(&url) {
            discovered.push(probed);
        }
    }

    if config.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false) {
        discovered.push(local_remote_host_info(&config));
    }

    let mut map = HashMap::<String, Value>::new();
    let host_key_for = |row: &Value| {
        let host_key = row
            .get("hostId")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_lowercase();
        if !host_key.is_empty() {
            return host_key;
        }
        row.get("url")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_lowercase()
    };

    for row in &existing {
        let Some(normalized) = normalize_remote_client_host_row(row) else {
            continue;
        };
        let key = host_key_for(&normalized);
        if key.is_empty() {
            continue;
        }
        map.insert(key, normalized);
    }

    for row in discovered {
        let Some(normalized) = normalize_remote_client_host_row(&row) else {
            continue;
        };
        let key = host_key_for(&normalized);
        if key.is_empty() {
            continue;
        }
        if let Some(current) = map.get_mut(&key) {
            if let (Some(cur), Some(newer)) = (current.as_object_mut(), normalized.as_object()) {
                for field in ["hostId", "name", "address", "port", "url"] {
                    if let Some(value) = newer.get(field) {
                        let is_empty = match value {
                            Value::Null => true,
                            Value::String(text) => text.trim().is_empty(),
                            _ => false,
                        };
                        if !is_empty {
                            cur.insert(field.to_string(), value.clone());
                        }
                    }
                }
                let has_token = cur
                    .get("token")
                    .and_then(|v| v.as_str())
                    .map(|v| !v.trim().is_empty())
                    .unwrap_or(false);
                if !has_token {
                    if let Some(token) = newer.get("token") {
                        cur.insert("token".to_string(), token.clone());
                    }
                }
            }
        } else {
            map.insert(key, normalized);
        }
    }

    let merged = map.into_values().collect::<Vec<Value>>();
    let saved = write_remote_client_hosts(&merged).unwrap_or(merged);
    json!({
        "success": true,
        "hosts": saved,
        "discoveryPort": discovery_port
    })
}

fn discover_remote_hosts_udp(discovery_port: u16, timeout_ms: u64) -> Vec<Value> {
    let socket = match UdpSocket::bind("0.0.0.0:0") {
        Ok(sock) => sock,
        Err(_) => return Vec::new(),
    };
    let _ = socket.set_broadcast(true);
    let _ = socket.set_nonblocking(true);

    let request_id = format!("scan-{}", random_hex_token(12));
    let probe = serde_json::to_vec(&json!({
        "type": "emubro-remote-probe",
        "requestId": request_id,
        "version": 1
    }))
    .unwrap_or_else(|_| b"{}".to_vec());

    let mut targets = vec![
        SocketAddr::from(([255, 255, 255, 255], discovery_port)),
        SocketAddr::from(([127, 0, 0, 1], discovery_port)),
    ];
    if let Some(broadcast) = subnet_broadcast_candidate() {
        targets.push(SocketAddr::new(IpAddr::V4(broadcast), discovery_port));
    }
    if let Some(local) = primary_ipv4() {
        targets.push(SocketAddr::new(IpAddr::V4(local), discovery_port));
    }
    for target in targets {
        let _ = socket.send_to(&probe, target);
    }

    let deadline = Instant::now() + Duration::from_millis(timeout_ms.max(200));
    let mut rows = Vec::<Value>::new();
    let mut seen = HashSet::<String>::new();
    let mut buf = [0u8; 3072];

    while Instant::now() < deadline {
        match socket.recv_from(&mut buf) {
            Ok((size, remote_addr)) => {
                let raw = String::from_utf8_lossy(&buf[..size]).to_string();
                let Ok(parsed) = serde_json::from_str::<Value>(&raw) else {
                    continue;
                };
                if parsed.get("type").and_then(|v| v.as_str()).unwrap_or("") != "emubro-remote-host" {
                    continue;
                }
                let reply_request_id = parsed
                    .get("requestId")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .trim()
                    .to_string();
                if !reply_request_id.is_empty() && reply_request_id != request_id {
                    continue;
                }

                let mut host = parsed.get("host").cloned().unwrap_or_else(|| json!({}));
                if let Some(obj) = host.as_object_mut() {
                    if obj.get("address").and_then(|v| v.as_str()).unwrap_or("").trim().is_empty() {
                        obj.insert("address".to_string(), json!(remote_addr.ip().to_string()));
                    }
                    if obj.get("port").and_then(|v| v.as_u64()).unwrap_or(0) == 0 {
                        obj.insert("port".to_string(), json!(DEFAULT_REMOTE_HOST_PORT));
                    }
                    if obj.get("url").and_then(|v| v.as_str()).unwrap_or("").trim().is_empty() {
                        let port = normalize_port(obj.get("port"), DEFAULT_REMOTE_HOST_PORT);
                        obj.insert(
                            "url".to_string(),
                            json!(format!("http://{}:{}", remote_addr.ip(), port)),
                        );
                    }
                }

                let Some(normalized) = normalize_remote_client_host_row(&host) else {
                    continue;
                };
                let key = normalized
                    .get("hostId")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .trim()
                    .to_lowercase();
                let url_key = normalized
                    .get("url")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .trim()
                    .to_lowercase();
                let dedupe = if !key.is_empty() { key } else { url_key };
                if dedupe.is_empty() || !seen.insert(dedupe) {
                    continue;
                }
                rows.push(normalized);
            }
            Err(error) => {
                if error.kind() == std::io::ErrorKind::WouldBlock {
                    thread::sleep(Duration::from_millis(35));
                    continue;
                }
                break;
            }
        }
    }

    rows
}

fn remote_handle_discovery_probe(socket: &UdpSocket) {
    let mut buf = [0u8; 3072];
    loop {
        match socket.recv_from(&mut buf) {
            Ok((size, peer)) => {
                let raw = String::from_utf8_lossy(&buf[..size]).to_string();
                let Ok(payload) = serde_json::from_str::<Value>(&raw) else {
                    continue;
                };
                if payload.get("type").and_then(|v| v.as_str()).unwrap_or("") != "emubro-remote-probe" {
                    continue;
                }

                let config = read_remote_host_config();
                if !config.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false) {
                    continue;
                }

                let mut host = local_remote_host_info(&config);
                if let Some(obj) = host.as_object_mut() {
                    if let Some(v4) = local_ipv4_for_peer(peer) {
                        obj.insert("address".to_string(), json!(v4.to_string()));
                        let port = normalize_port(obj.get("port"), DEFAULT_REMOTE_HOST_PORT);
                        obj.insert("url".to_string(), json!(format!("http://{}:{}", v4, port)));
                    }
                }

                let response = serde_json::to_vec(&json!({
                    "type": "emubro-remote-host",
                    "requestId": payload.get("requestId").and_then(|v| v.as_str()).unwrap_or(""),
                    "host": host,
                    "version": 1
                }))
                .unwrap_or_else(|_| b"{}".to_vec());
                let _ = socket.send_to(&response, peer);
            }
            Err(error) => {
                if error.kind() == std::io::ErrorKind::WouldBlock {
                    break;
                }
                break;
            }
        }
    }
}

fn remote_handle_http_request(mut request: TinyRequest) {
    let method = request.method().clone();
    let path = request.url().split('?').next().unwrap_or("/").trim().to_string();
    let remote_addr = remote_request_address(&request);
    let config = read_remote_host_config();

    if !config.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false) {
        let _ = request.respond(tiny_json_response(
            503,
            &json!({ "success": false, "message": "Remote host is disabled." }),
        ));
        return;
    }

    if method == Method::Get && path == format!("{}/ping", REMOTE_API_BASE) {
        let _ = request.respond(tiny_json_response(
            200,
            &json!({
                "success": true,
                "host": local_remote_host_info(&config),
                "timestamp": unix_timestamp_ms()
            }),
        ));
        return;
    }

    if method != Method::Post {
        let _ = request.respond(tiny_json_response(
            404,
            &json!({ "success": false, "message": "Not found." }),
        ));
        return;
    }

    let body = match tiny_request_body_json(&mut request, 1_600_000) {
        Ok(value) => value,
        Err(message) => {
            let _ = request.respond(tiny_json_response(400, &json!({ "success": false, "message": message })));
            return;
        }
    };

    if path == format!("{}/pair", REMOTE_API_BASE) {
        let code = body
            .get("code")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        let expected = read_or_refresh_pairing_code()
            .get("code")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if code.is_empty() || expected.is_empty() || code != expected {
            let _ = request.respond(tiny_json_response(
                401,
                &json!({ "success": false, "message": "Invalid pairing code." }),
            ));
            return;
        }
        let client_name = body
            .get("clientName")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        let token = match issue_remote_token(&client_name, &remote_addr) {
            Ok(value) => value,
            Err(error) => {
                let _ = request.respond(tiny_json_response(
                    500,
                    &json!({ "success": false, "message": error }),
                ));
                return;
            }
        };
        let _ = request.respond(tiny_json_response(
            200,
            &json!({
                "success": true,
                "result": {
                    "token": token,
                    "host": local_remote_host_info(&config)
                }
            }),
        ));
        return;
    }

    let token = body
        .get("token")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    if token.is_empty() || !touch_remote_token(&token) {
        let _ = request.respond(tiny_json_response(
            401,
            &json!({ "success": false, "message": "Unauthorized remote token." }),
        ));
        return;
    }

    if path == format!("{}/list-games", REMOTE_API_BASE) {
        let games = remote_list_games_for_client(&config);
        let _ = request.respond(tiny_json_response(
            200,
            &json!({ "success": true, "games": games }),
        ));
        return;
    }

    if path == format!("{}/download-file", REMOTE_API_BASE) {
        let remote_path = body
            .get("remotePath")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if remote_path.is_empty() {
            let _ = request.respond(tiny_json_response(
                400,
                &json!({ "success": false, "message": "Missing remote path." }),
            ));
            return;
        }
        if is_launch_uri(&remote_path) {
            let _ = request.respond(tiny_json_response(
                400,
                &json!({ "success": false, "message": "Launcher URI paths cannot be downloaded." }),
            ));
            return;
        }

        let path = PathBuf::from(&remote_path);
        if !path.exists() || !path.is_file() {
            let _ = request.respond(tiny_json_response(
                404,
                &json!({ "success": false, "message": "Remote file not found." }),
            ));
            return;
        }
        if !path_allowed_for_remote_access(&path, &config) {
            let _ = request.respond(tiny_json_response(
                403,
                &json!({ "success": false, "message": "File is outside allowed roots." }),
            ));
            return;
        }

        let file = match fs::File::open(&path) {
            Ok(value) => value,
            Err(error) => {
                let _ = request.respond(tiny_json_response(
                    500,
                    &json!({ "success": false, "message": error.to_string() }),
                ));
                return;
            }
        };
        let mut response = TinyResponse::from_file(file);
        if let Some(header) = tiny_header("Content-Type", "application/octet-stream") {
            response.add_header(header);
        }
        if let Some(header) = tiny_header("Cache-Control", "no-store, no-cache, must-revalidate") {
            response.add_header(header);
        }
        let _ = request.respond(response);
        return;
    }

    let _ = request.respond(tiny_json_response(
        404,
        &json!({ "success": false, "message": "Unknown remote endpoint." }),
    ));
}
