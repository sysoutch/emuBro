use super::*;
use std::sync::mpsc;
use std::thread;
use std::time::Duration;
use tiny_http::Server;

pub(super) fn relay_status_payload(relay: &Value) -> Value {
    match relay_start_or_update_server(relay) {
        Ok(status) => status,
        Err(error) => {
            let port = relay
                .get("port")
                .and_then(|v| v.as_i64())
                .map(|v| v.clamp(1, 65535))
                .unwrap_or(super::core::RELAY_DEFAULT_PORT);
            json!({
                "running": false,
                "port": port,
                "urls": [],
                "error": error
            })
        }
    }
}

pub(super) fn relay_start_or_update_server(relay: &Value) -> Result<Value, String> {
    let enabled = relay.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false);
    let port = relay
        .get("port")
        .and_then(|v| v.as_i64())
        .map(|v| v.clamp(1, 65535))
        .unwrap_or(super::core::RELAY_DEFAULT_PORT);
    let slot = super::core::relay_runtime_slot();
    let mut guard = slot.lock().map_err(|_| "Relay runtime lock failed".to_string())?;

    if !enabled {
        super::core::relay_stop_runtime(&mut guard);
        return Ok(json!({
            "running": false,
            "port": port,
            "urls": []
        }));
    }

    if let Some(current) = guard.as_ref() {
        if current.port == port {
            return Ok(json!({
                "running": true,
                "port": port,
                "urls": super::network::relay_local_urls(port)
            }));
        }
    }

    super::core::relay_stop_runtime(&mut guard);

    let bind_port = port as u16;
    let server = Server::http(("0.0.0.0", bind_port)).map_err(|e| e.to_string())?;
    let (stop_tx, stop_rx) = mpsc::channel::<()>();
    let handle = thread::spawn(move || {
        loop {
            if stop_rx.try_recv().is_ok() {
                break;
            }
            match server.recv_timeout(Duration::from_millis(200)) {
                Ok(Some(request)) => super::http::relay_handle_request(request, port),
                Ok(None) => {}
                Err(_) => {}
            }
        }
    });
    *guard = Some(super::core::RelayRuntime {
        port,
        stop_tx,
        join_handle: Some(handle),
    });

    Ok(json!({
        "running": true,
        "port": port,
        "urls": super::network::relay_local_urls(port)
    }))
}
