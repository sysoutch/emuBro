use super::*;
use std::sync::mpsc::Sender;
use std::sync::{Mutex, OnceLock};
use std::thread;

pub(super) const RELAY_KEY: &str = "suggestions:relay:host-config:v1";
pub(super) const RELAY_CONNECTIONS_KEY: &str = "suggestions:relay:connections:v1";
pub(super) const RELAY_PROFILE_KEY: &str = "suggestions:relay:host-profile:v1";
pub(super) const RELAY_DEFAULT_PORT: i64 = 42141;
pub(super) const RELAY_DEFAULT_SCAN_TIMEOUT_MS: u64 = 260;

pub(super) struct RelayRuntime {
    pub(super) port: i64,
    pub(super) stop_tx: Sender<()>,
    pub(super) join_handle: Option<thread::JoinHandle<()>>,
}

static RELAY_RUNTIME: OnceLock<Mutex<Option<RelayRuntime>>> = OnceLock::new();

pub(super) fn relay_port_from_payload(payload: &Value) -> i64 {
    payload
        .get("relayPort")
        .or_else(|| payload.get("port"))
        .or_else(|| payload.get("relay").and_then(|v| v.get("port")))
        .and_then(|v| v.as_i64())
        .map(|v| v.clamp(1, 65535))
        .unwrap_or(RELAY_DEFAULT_PORT)
}

pub(super) fn relay_auth_token_from_payload(payload: &Value) -> String {
    payload
        .get("relayAuthToken")
        .or_else(|| payload.get("authToken"))
        .or_else(|| payload.get("relay").and_then(|v| v.get("authToken")))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string()
}

pub(super) fn normalize_client_host_url(raw: &str, fallback_port: i64) -> String {
    let mut text = raw.trim().to_string();
    if text.is_empty() {
        return String::new();
    }
    if !text.to_lowercase().starts_with("http://") && !text.to_lowercase().starts_with("https://") {
        text = format!("http://{}", text);
    }
    let scheme_split = text.split("://").collect::<Vec<&str>>();
    if scheme_split.len() != 2 {
        return String::new();
    }
    let scheme = scheme_split[0].trim().to_lowercase();
    if scheme != "http" && scheme != "https" {
        return String::new();
    }
    let rest = scheme_split[1];
    let host_part = rest.split('/').next().unwrap_or(rest);
    if !host_part.is_empty() && !host_part.contains(':') {
        text = format!("{}:{}", text.trim_end_matches('/'), fallback_port.clamp(1, 65535));
    }
    text.trim_end_matches('/').to_string()
}

pub(super) fn relay_host_url_from_payload(payload: &Value) -> String {
    let port = relay_port_from_payload(payload);
    let raw = payload
        .get("relayHostUrl")
        .or_else(|| payload.get("clientHostUrl"))
        .or_else(|| payload.get("hostUrl"))
        .or_else(|| payload.get("relay").and_then(|v| v.get("hostUrl")))
        .and_then(|v| v.as_str())
        .unwrap_or("");
    normalize_client_host_url(raw, port)
}

fn relay_mode_from_payload(payload: &Value) -> String {
    match payload
        .get("llmMode")
        .and_then(|v| v.as_str())
        .unwrap_or("host")
        .trim()
        .to_lowercase()
        .as_str()
    {
        "client" => "client".to_string(),
        _ => "host".to_string(),
    }
}

pub(super) fn relay_enabled_for_payload(payload: &Value) -> bool {
    relay_mode_from_payload(payload) == "client" && !relay_host_url_from_payload(payload).is_empty()
}

pub(super) fn relay_client_name() -> String {
    let keys = ["COMPUTERNAME", "HOSTNAME"];
    for key in keys {
        if let Ok(value) = std::env::var(key) {
            let trimmed = value.trim();
            if !trimmed.is_empty() {
                return trimmed.to_string();
            }
        }
    }
    "emuBro-tauri".to_string()
}

pub(super) fn sanitize_relay_payload(payload: &Value) -> Value {
    let mut map = payload.as_object().cloned().unwrap_or_default();
    map.insert("llmMode".to_string(), Value::String("host".to_string()));
    map.remove("relayHostUrl");
    map.remove("relayAuthToken");
    map.remove("relayPort");
    if let Some(relay) = map.get_mut("relay").and_then(|v| v.as_object_mut()) {
        relay.remove("hostUrl");
        relay.remove("authToken");
        relay.remove("port");
    }
    Value::Object(map)
}

pub(super) fn relay_default() -> Value {
    json!({
        "enabled": false,
        "port": 42141,
        "accessMode": "open",
        "whitelist": [],
        "blacklist": [],
        "authToken": ""
    })
}

pub(super) fn relay_profile_default() -> Value {
    json!({
        "provider": "ollama",
        "models": {},
        "baseUrls": {},
        "apiKeys": {}
    })
}

pub(super) fn normalize_relay_profile(payload: &Value) -> Value {
    json!({
        "provider": normalize_provider(payload.get("provider").and_then(|v| v.as_str()).unwrap_or("ollama")),
        "models": payload.get("models").cloned().unwrap_or_else(|| json!({})),
        "baseUrls": payload.get("baseUrls").cloned().unwrap_or_else(|| json!({})),
        "apiKeys": payload.get("apiKeys").cloned().unwrap_or_else(|| json!({}))
    })
}

pub(super) fn relay_runtime_slot() -> &'static Mutex<Option<RelayRuntime>> {
    RELAY_RUNTIME.get_or_init(|| Mutex::new(None))
}

pub(super) fn relay_stop_runtime(runtime: &mut Option<RelayRuntime>) {
    if let Some(mut current) = runtime.take() {
        let _ = current.stop_tx.send(());
        if let Some(handle) = current.join_handle.take() {
            let _ = handle.join();
        }
    }
}

pub(super) fn normalize_relay(payload: &Value) -> Value {
    let relay = payload.get("relay").cloned().unwrap_or_else(relay_default);
    let enabled = relay.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false);
    let port = relay
        .get("port")
        .and_then(|v| v.as_i64())
        .map(|v| v.clamp(1, 65535))
        .unwrap_or(42141);
    let mode = relay
        .get("accessMode")
        .and_then(|v| v.as_str())
        .unwrap_or("open")
        .trim()
        .to_lowercase();
    let access_mode = if mode == "whitelist" || mode == "blacklist" {
        mode
    } else {
        "open".to_string()
    };
    let normalize_list = |key: &str| -> Vec<Value> {
        relay
            .get(key)
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default()
            .into_iter()
            .filter_map(|v| v.as_str().map(|s| s.trim().to_string()))
            .filter(|s| !s.is_empty())
            .map(Value::String)
            .collect::<Vec<Value>>()
    };
    json!({
        "enabled": enabled,
        "port": port,
        "accessMode": access_mode,
        "whitelist": normalize_list("whitelist"),
        "blacklist": normalize_list("blacklist"),
        "authToken": relay.get("authToken").and_then(|v| v.as_str()).unwrap_or("").trim()
    })
}
