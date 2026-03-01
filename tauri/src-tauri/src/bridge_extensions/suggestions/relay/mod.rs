use super::*;

mod core;
mod http;
mod network;
mod server;

pub(super) const RELAY_KEY: &str = core::RELAY_KEY;
pub(super) const RELAY_CONNECTIONS_KEY: &str = core::RELAY_CONNECTIONS_KEY;
pub(super) const RELAY_PROFILE_KEY: &str = core::RELAY_PROFILE_KEY;

pub(super) fn relay_auth_token_from_payload(payload: &Value) -> String {
    core::relay_auth_token_from_payload(payload)
}

pub(super) fn relay_host_url_from_payload(payload: &Value) -> String {
    core::relay_host_url_from_payload(payload)
}

pub(super) fn relay_enabled_for_payload(payload: &Value) -> bool {
    core::relay_enabled_for_payload(payload)
}

pub(super) fn relay_client_name() -> String {
    core::relay_client_name()
}

pub(super) fn sanitize_relay_payload(payload: &Value) -> Value {
    core::sanitize_relay_payload(payload)
}

pub(super) fn relay_status_payload(relay: &Value) -> Value {
    server::relay_status_payload(relay)
}

pub(super) fn relay_scan_network(payload: &Value) -> Value {
    network::relay_scan_network(payload)
}

pub(super) fn relay_default() -> Value {
    core::relay_default()
}

pub(super) fn relay_profile_default() -> Value {
    core::relay_profile_default()
}

pub(super) fn normalize_relay_profile(payload: &Value) -> Value {
    core::normalize_relay_profile(payload)
}

pub(super) fn normalize_relay(payload: &Value) -> Value {
    core::normalize_relay(payload)
}
