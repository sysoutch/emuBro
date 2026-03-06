use super::*;
use std::collections::HashSet;
use std::net::{IpAddr, Ipv4Addr, UdpSocket};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

fn primary_ipv4() -> Option<Ipv4Addr> {
    let socket = UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.connect("8.8.8.8:80").ok()?;
    let local = socket.local_addr().ok()?;
    match local.ip() {
        IpAddr::V4(v4) => Some(v4),
        _ => None,
    }
}

pub(super) fn relay_local_urls(port: i64) -> Vec<String> {
    let mut out = vec![format!("http://127.0.0.1:{}", port)];
    if let Some(local) = primary_ipv4() {
        let url = format!("http://{}:{}", local, port);
        if !out.iter().any(|row| row.eq_ignore_ascii_case(&url)) {
            out.push(url);
        }
    }
    out
}

fn relay_probe_host(host: &str, port: i64, timeout_ms: u64, auth_token: &str) -> Option<Value> {
    let base_url = super::core::normalize_client_host_url(&format!("http://{}:{}", host, port), port);
    if base_url.is_empty() {
        return None;
    }
    let url = format!("{}/api/llm/ping", base_url);
    let start = Instant::now();
    let agent = ureq::AgentBuilder::new()
        .timeout(Duration::from_millis(timeout_ms.max(120)))
        .build();
    let mut req = agent.get(&url).set("accept", "application/json");
    if !auth_token.trim().is_empty() {
        req = req.set("x-emubro-relay-token", auth_token.trim());
    }
    let response = req.call().ok()?;
    let text = response.into_string().ok()?;
    let parsed = serde_json::from_str::<Value>(&text).ok()?;
    if !parsed.get("success").and_then(|v| v.as_bool()).unwrap_or(false) {
        return None;
    }
    let latency_ms = start.elapsed().as_millis() as i64;
    Some(json!({
        "host": host,
        "hostname": parsed.get("hostname").and_then(|v| v.as_str()).unwrap_or(""),
        "version": parsed.get("version").and_then(|v| v.as_str()).unwrap_or(""),
        "url": base_url,
        "latencyMs": latency_ms.max(1)
    }))
}

fn relay_scan_candidates(payload: &Value) -> Vec<String> {
    let include_localhost = payload
        .get("includeLocalhost")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    let mut out = Vec::<String>::new();
    if include_localhost {
        out.push("127.0.0.1".to_string());
        out.push("localhost".to_string());
    }
    if let Some(local) = primary_ipv4() {
        let octets = local.octets();
        let prefix = format!("{}.{}.{}", octets[0], octets[1], octets[2]);
        for i in 1..=254u16 {
            if i as u8 == octets[3] {
                continue;
            }
            out.push(format!("{}.{}", prefix, i));
        }
    }
    let mut seen = HashSet::<String>::new();
    out.into_iter()
        .filter(|row| {
            let key = row.trim().to_lowercase();
            if key.is_empty() {
                return false;
            }
            seen.insert(key)
        })
        .collect::<Vec<String>>()
}

pub(super) fn relay_scan_network(payload: &Value) -> Value {
    let port = super::core::relay_port_from_payload(payload);
    let timeout_ms = payload
        .get("timeoutMs")
        .and_then(|v| v.as_u64())
        .map(|v| v.clamp(120, 1200))
        .unwrap_or(super::core::RELAY_DEFAULT_SCAN_TIMEOUT_MS);
    let concurrency = payload
        .get("concurrency")
        .and_then(|v| v.as_u64())
        .map(|v| v.clamp(8, 128) as usize)
        .unwrap_or(48usize);
    let token = super::core::relay_auth_token_from_payload(payload);
    let candidates = relay_scan_candidates(payload);
    if candidates.is_empty() {
        return json!({ "success": true, "hosts": [], "scanned": 0, "port": port });
    }

    let queue = Arc::new(candidates.clone());
    let index = Arc::new(AtomicUsize::new(0));
    let results = Arc::new(Mutex::new(Vec::<Value>::new()));
    let worker_count = concurrency.min(queue.len().max(1));
    let mut handles = Vec::<thread::JoinHandle<()>>::new();
    for _ in 0..worker_count {
        let queue_ref = Arc::clone(&queue);
        let idx_ref = Arc::clone(&index);
        let results_ref = Arc::clone(&results);
        let auth_token = token.clone();
        let handle = thread::spawn(move || {
            loop {
                let idx = idx_ref.fetch_add(1, Ordering::SeqCst);
                if idx >= queue_ref.len() {
                    break;
                }
                if let Some(row) = relay_probe_host(&queue_ref[idx], port, timeout_ms, &auth_token) {
                    if let Ok(mut guard) = results_ref.lock() {
                        guard.push(row);
                    }
                }
            }
        });
        handles.push(handle);
    }
    for handle in handles {
        let _ = handle.join();
    }
    let mut hosts = results.lock().map(|rows| rows.clone()).unwrap_or_default();
    hosts.sort_by(|a, b| {
        let la = a.get("latencyMs").and_then(|v| v.as_i64()).unwrap_or(i64::MAX);
        let lb = b.get("latencyMs").and_then(|v| v.as_i64()).unwrap_or(i64::MAX);
        la.cmp(&lb)
    });
    json!({
        "success": true,
        "port": port,
        "scanned": candidates.len(),
        "hosts": hosts
    })
}
