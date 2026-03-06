use super::*;

mod channels;
mod descriptions;
mod provider;
mod recommendations;
mod relay;
mod tags;
mod theme;
mod tool_draft;

pub(super) const RELAY_KEY: &str = relay::RELAY_KEY;
pub(super) const RELAY_CONNECTIONS_KEY: &str = relay::RELAY_CONNECTIONS_KEY;
pub(super) const RELAY_PROFILE_KEY: &str = relay::RELAY_PROFILE_KEY;

pub(super) fn normalize_provider(value: &str) -> String {
    provider::normalize_provider(value)
}

pub(super) fn normalize_mode(value: &str) -> String {
    provider::normalize_mode(value)
}

pub(super) fn relay_auth_token_from_payload(payload: &Value) -> String {
    relay::relay_auth_token_from_payload(payload)
}

pub(super) fn relay_host_url_from_payload(payload: &Value) -> String {
    relay::relay_host_url_from_payload(payload)
}

pub(super) fn relay_enabled_for_payload(payload: &Value) -> bool {
    relay::relay_enabled_for_payload(payload)
}

pub(super) fn sanitize_relay_payload(payload: &Value) -> Value {
    relay::sanitize_relay_payload(payload)
}

pub(super) fn extract_json_from_text(raw: &str) -> Option<Value> {
    provider::extract_json_from_text(raw)
}

pub(super) fn relay_post_json(payload: &Value, path: &str, body: &Value) -> Result<Value, String> {
    provider::relay_post_json(payload, path, body)
}

pub(super) fn list_ollama_models_for_base(base_url: &str) -> Result<Vec<String>, String> {
    provider::list_ollama_models_for_base(base_url)
}

pub(super) fn request_provider_text(payload: &Value, prompt: &str) -> Result<String, String> {
    provider::request_provider_text(payload, prompt)
}

pub(super) fn relay_status_payload(relay: &Value) -> Value {
    relay::relay_status_payload(relay)
}

pub(super) fn relay_scan_network(payload: &Value) -> Value {
    relay::relay_scan_network(payload)
}

pub(super) fn simple_recommendations(payload: &Value) -> Value {
    recommendations::simple_recommendations(payload)
}

pub(super) fn relay_default() -> Value {
    relay::relay_default()
}

pub(super) fn relay_profile_default() -> Value {
    relay::relay_profile_default()
}

pub(super) fn normalize_relay_profile(payload: &Value) -> Value {
    relay::normalize_relay_profile(payload)
}

pub(super) fn normalize_relay(payload: &Value) -> Value {
    relay::normalize_relay(payload)
}

pub(super) fn color_for_mood(mood: &str) -> &'static str {
    theme::color_for_mood(mood)
}

pub(super) fn mix(hex: &str, delta: i32) -> String {
    theme::mix(hex, delta)
}

pub(crate) fn handle(channel: &str, args: &[Value]) -> Option<Result<Value, String>> {
    channels::handle(channel, args)
}
