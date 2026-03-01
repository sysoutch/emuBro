use super::*;
use std::io::Read;
use tiny_http::{Header, Method, Request as TinyRequest, Response as TinyResponse, StatusCode};

fn relay_resolve_host_provider_payload(input_payload: &Value) -> Value {
    let profile = read_state_value_or_default(RELAY_PROFILE_KEY, relay_profile_default());
    let provider = normalize_provider(
        profile
            .get("provider")
            .and_then(|v| v.as_str())
            .or_else(|| input_payload.get("provider").and_then(|v| v.as_str()))
            .unwrap_or("ollama"),
    );
    let model = profile
        .get("models")
        .and_then(|v| v.get(&provider))
        .and_then(|v| v.as_str())
        .or_else(|| input_payload.get("model").and_then(|v| v.as_str()))
        .unwrap_or("")
        .trim()
        .to_string();
    let base_url = profile
        .get("baseUrls")
        .and_then(|v| v.get(&provider))
        .and_then(|v| v.as_str())
        .or_else(|| input_payload.get("baseUrl").and_then(|v| v.as_str()))
        .unwrap_or("")
        .trim()
        .to_string();
    let api_key = profile
        .get("apiKeys")
        .and_then(|v| v.get(&provider))
        .and_then(|v| v.as_str())
        .or_else(|| input_payload.get("apiKey").and_then(|v| v.as_str()))
        .unwrap_or("")
        .trim()
        .to_string();
    json!({
        "provider": provider,
        "model": model,
        "baseUrl": base_url,
        "apiKey": api_key,
        "llmMode": "host",
        "relayHostUrl": "",
        "relayAuthToken": "",
        "relayPort": 0
    })
}

pub(super) fn relay_handle_request(mut request: TinyRequest, default_port: i64) {
    let method = request.method().clone();
    let path = request.url().split('?').next().unwrap_or("/").trim().to_string();
    let remote = relay_request_remote_address(&request);
    let client_name = tiny_header_value(&request, "x-emubro-client-host");
    let relay = normalize_relay(&read_state_value_or_default(RELAY_KEY, relay_default()));

    let deny = |request: TinyRequest, code: u16, message: &str, path: &str, remote: &str, client_name: &str, auth_fail: bool| {
        relay_touch_connection(remote, client_name, path, code as i64, true, auth_fail);
        let _ = request.respond(tiny_json_response(code, &json!({ "success": false, "message": message })));
    };

    if !relay.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false) {
        deny(
            request,
            503,
            "Incoming relay connections are disabled.",
            &path,
            &remote,
            &client_name,
            false,
        );
        return;
    }
    if !relay_access_allowed(&remote, &relay) {
        deny(
            request,
            403,
            "Client is not allowed by relay access rules.",
            &path,
            &remote,
            &client_name,
            false,
        );
        return;
    }

    if method == Method::Get && path == "/api/llm/ping" {
        relay_touch_connection(&remote, &client_name, &path, 200, false, false);
        let connections = read_state_value_or_default(RELAY_CONNECTIONS_KEY, json!([]))
            .as_array()
            .cloned()
            .unwrap_or_default()
            .len();
        let payload = json!({
            "success": true,
            "app": "emuBro",
            "version": env!("CARGO_PKG_VERSION"),
            "hostname": relay_client_name(),
            "port": relay.get("port").and_then(|v| v.as_i64()).unwrap_or(default_port),
            "timestamp": unix_timestamp_ms(),
            "connections": connections
        });
        let _ = request.respond(tiny_json_response(200, &payload));
        return;
    }

    if method != Method::Post {
        deny(request, 404, "Not found.", &path, &remote, &client_name, false);
        return;
    }

    let expected_token = relay
        .get("authToken")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let provided_token = tiny_header_value(&request, "x-emubro-relay-token");
    if !expected_token.is_empty() && expected_token != provided_token.trim() {
        deny(
            request,
            401,
            "Unauthorized relay request.",
            &path,
            &remote,
            &client_name,
            true,
        );
        return;
    }

    let body = match tiny_request_body_json(&mut request, 1_200_000) {
        Ok(value) => value,
        Err(message) => {
            relay_touch_connection(&remote, &client_name, &path, 400, false, false);
            let _ = request.respond(tiny_json_response(400, &json!({ "success": false, "message": message })));
            return;
        }
    };

    let result = if path == "/api/llm/request-text" || path == "/api/llm/request-json" {
        let payload = relay_resolve_host_provider_payload(body.get("payload").unwrap_or(&json!({})));
        let prompt = body
            .get("options")
            .and_then(|v| v.get("prompt"))
            .or_else(|| body.get("payload").and_then(|v| v.get("prompt")))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if prompt.is_empty() {
            Err("Prompt is required.".to_string())
        } else {
            let mut merged = payload.as_object().cloned().unwrap_or_default();
            if let Some(temp) = body
                .get("options")
                .and_then(|v| v.get("temperature"))
                .and_then(|v| v.as_f64())
            {
                merged.insert("temperature".to_string(), json!(temp));
            }
            request_provider_text(&Value::Object(merged), &prompt).map(|text| {
                json!({
                    "success": true,
                    "text": text
                })
            })
        }
    } else if path == "/api/llm/list-ollama-models" {
        let payload = body.get("payload").cloned().unwrap_or_else(|| json!({}));
        let resolved = relay_resolve_host_provider_payload(&payload);
        let base_url = resolved
            .get("baseUrl")
            .and_then(|v| v.as_str())
            .unwrap_or("http://127.0.0.1:11434")
            .trim()
            .to_string();
        list_ollama_models_for_base(&base_url).map(|models| {
            json!({
                "success": true,
                "baseUrl": base_url,
                "models": models
            })
        })
    } else {
        Err("Unknown relay endpoint.".to_string())
    };

    match result {
        Ok(payload) => {
            relay_touch_connection(&remote, &client_name, &path, 200, false, false);
            let _ = request.respond(tiny_json_response(200, &payload));
        }
        Err(message) => {
            relay_touch_connection(&remote, &client_name, &path, 500, false, false);
            let _ = request.respond(tiny_json_response(500, &json!({ "success": false, "message": message })));
        }
    }
}

fn tiny_header(name: &str, value: &str) -> Option<Header> {
    Header::from_bytes(name.as_bytes(), value.as_bytes()).ok()
}

fn tiny_json_response(status: u16, payload: &Value) -> TinyResponse<std::io::Cursor<Vec<u8>>> {
    let body = serde_json::to_vec(payload).unwrap_or_else(|_| br#"{"success":false,"message":"json encode failed"}"#.to_vec());
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

fn tiny_header_value(request: &TinyRequest, header_name: &str) -> String {
    let key = header_name.trim().to_lowercase();
    request
        .headers()
        .iter()
        .find(|h| h.field.to_string().eq_ignore_ascii_case(&key))
        .map(|h| h.value.as_str().trim().to_string())
        .unwrap_or_default()
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

fn relay_normalize_remote_address(raw: &str) -> String {
    let mut out = raw.trim().to_string();
    if out.starts_with("::ffff:") {
        out = out.trim_start_matches("::ffff:").to_string();
    }
    if out == "::1" {
        return "127.0.0.1".to_string();
    }
    out
}

fn relay_request_remote_address(request: &TinyRequest) -> String {
    request
        .remote_addr()
        .map(|v| relay_normalize_remote_address(v.ip().to_string().as_str()))
        .unwrap_or_default()
}

fn relay_address_list(relay: &Value, key: &str) -> Vec<String> {
    relay
        .get(key)
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .filter_map(|v| v.as_str().map(|s| relay_normalize_remote_address(s).to_lowercase()))
        .filter(|s| !s.is_empty())
        .collect::<Vec<String>>()
}

fn relay_access_allowed(remote: &str, relay: &Value) -> bool {
    let normalized = relay_normalize_remote_address(remote);
    if normalized.is_empty() {
        return false;
    }
    if normalized == "127.0.0.1" || normalized.eq_ignore_ascii_case("localhost") {
        return true;
    }
    let lowered = normalized.to_lowercase();
    let blacklist = relay_address_list(relay, "blacklist");
    if blacklist.iter().any(|row| row == &lowered) {
        return false;
    }
    let access_mode = relay
        .get("accessMode")
        .and_then(|v| v.as_str())
        .unwrap_or("open")
        .trim()
        .to_lowercase();
    if access_mode == "whitelist" {
        let whitelist = relay_address_list(relay, "whitelist");
        return whitelist.iter().any(|row| row == &lowered);
    }
    true
}

fn relay_touch_connection(remote_address: &str, client_name: &str, last_path: &str, status: i64, denied: bool, auth_fail: bool) {
    let mut rows = read_state_value_or_default(RELAY_CONNECTIONS_KEY, json!([]))
        .as_array()
        .cloned()
        .unwrap_or_default();
    let key = format!(
        "{}::{}",
        relay_normalize_remote_address(remote_address).to_lowercase(),
        client_name.trim().to_lowercase()
    );
    let now = unix_timestamp_ms() as i64;
    let mut found = false;
    for row in &mut rows {
        let row_key = row.get("key").and_then(|v| v.as_str()).unwrap_or("").trim().to_lowercase();
        if row_key != key {
            continue;
        }
        if let Some(obj) = row.as_object_mut() {
            let request_count = obj.get("requestCount").and_then(|v| v.as_i64()).unwrap_or(0) + 1;
            let denied_count = obj.get("deniedCount").and_then(|v| v.as_i64()).unwrap_or(0) + if denied { 1 } else { 0 };
            let auth_fail_count = obj.get("authFailCount").and_then(|v| v.as_i64()).unwrap_or(0) + if auth_fail { 1 } else { 0 };
            obj.insert("lastSeenAt".to_string(), json!(now));
            obj.insert("requestCount".to_string(), json!(request_count));
            obj.insert("deniedCount".to_string(), json!(denied_count));
            obj.insert("authFailCount".to_string(), json!(auth_fail_count));
            obj.insert("lastPath".to_string(), json!(last_path.trim()));
            obj.insert("lastStatus".to_string(), json!(status));
            if obj.get("remoteAddress").and_then(|v| v.as_str()).unwrap_or("").trim().is_empty() {
                obj.insert("remoteAddress".to_string(), json!(relay_normalize_remote_address(remote_address)));
            }
            if obj.get("clientName").and_then(|v| v.as_str()).unwrap_or("").trim().is_empty() {
                obj.insert("clientName".to_string(), json!(client_name.trim()));
            }
        }
        found = true;
        break;
    }
    if !found {
        rows.push(json!({
            "key": key,
            "remoteAddress": relay_normalize_remote_address(remote_address),
            "clientName": client_name.trim(),
            "userAgent": "",
            "firstSeenAt": now,
            "lastSeenAt": now,
            "requestCount": 1,
            "deniedCount": if denied { 1 } else { 0 },
            "authFailCount": if auth_fail { 1 } else { 0 },
            "lastPath": last_path.trim(),
            "lastStatus": status
        }));
    }
    rows.sort_by(|a, b| {
        let la = a.get("lastSeenAt").and_then(|v| v.as_i64()).unwrap_or(0);
        let lb = b.get("lastSeenAt").and_then(|v| v.as_i64()).unwrap_or(0);
        lb.cmp(&la)
    });
    if rows.len() > 80 {
        rows.truncate(80);
    }
    let _ = write_state_value(RELAY_CONNECTIONS_KEY, &Value::Array(rows));
}
