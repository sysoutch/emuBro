use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::Window;
use url::Url;

#[path = "bridge_extensions/mod.rs"]
mod bridge_extensions;
use bridge_extensions::*;

#[path = "app_core/invoke/mod.rs"]
mod invoke;

static START_HIDDEN_FOR_GAME_LAUNCH: AtomicBool = AtomicBool::new(false);

pub(crate) fn app_version_impl() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

pub(crate) fn set_start_hidden_for_game_launch(value: bool) {
    START_HIDDEN_FOR_GAME_LAUNCH.store(value, Ordering::SeqCst);
}

pub(crate) fn should_keep_main_window_hidden() -> bool {
    START_HIDDEN_FOR_GAME_LAUNCH.load(Ordering::SeqCst)
}

pub(crate) fn bootstrap_background_services() {
    bridge_extensions::bootstrap_background_services();
}

pub(crate) fn emubro_invoke_impl(channel: String, args: Vec<Value>, window: Window) -> Result<Value, String> {
    invoke::emubro_invoke_impl(channel, args, window)
}

fn trim_wrapping_quotes(value: &str) -> &str {
    value
        .trim()
        .trim_matches(|ch| ch == '"' || ch == '\'')
}

fn parse_game_id_text(value: &str) -> Option<i64> {
    let parsed = trim_wrapping_quotes(value).parse::<i64>().ok()?;
    if parsed > 0 {
        Some(parsed)
    } else {
        None
    }
}

fn collapse_whitespace(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn strip_bracketed_title_parts(value: &str) -> String {
    let mut out = String::new();
    let mut round_depth = 0i32;
    let mut square_depth = 0i32;
    let mut curly_depth = 0i32;

    for ch in value.chars() {
        match ch {
            '(' => round_depth += 1,
            '[' => square_depth += 1,
            '{' => curly_depth += 1,
            ')' => round_depth = (round_depth - 1).max(0),
            ']' => square_depth = (square_depth - 1).max(0),
            '}' => curly_depth = (curly_depth - 1).max(0),
            _ => {
                if round_depth == 0 && square_depth == 0 && curly_depth == 0 {
                    out.push(ch);
                }
            }
        }
    }

    collapse_whitespace(&out)
}

fn normalize_name_key(value: &str) -> String {
    let stripped = strip_bracketed_title_parts(value);
    let mut out = String::new();
    let mut previous_was_space = false;

    for ch in stripped.chars() {
        if ch.is_ascii_alphanumeric() {
            out.push(ch.to_ascii_lowercase());
            previous_was_space = false;
        } else if !previous_was_space {
            out.push(' ');
            previous_was_space = true;
        }
    }

    collapse_whitespace(&out)
}

fn normalize_game_code_key(value: &str) -> String {
    trim_wrapping_quotes(value)
        .chars()
        .filter(|ch| ch.is_ascii_alphanumeric())
        .map(|ch| ch.to_ascii_uppercase())
        .collect::<String>()
}

fn first_query_value(url: &Url, keys: &[&str]) -> String {
    for (key, value) in url.query_pairs() {
        if keys.iter().any(|candidate| key.eq_ignore_ascii_case(candidate)) {
            let text = value.trim().to_string();
            if !text.is_empty() {
                return text;
            }
        }
    }
    String::new()
}

fn deep_link_segments(url: &Url) -> Vec<String> {
    let mut segments = Vec::<String>::new();
    if let Some(host) = url.host_str() {
        let text = host.trim();
        if !text.is_empty() {
            segments.push(text.to_string());
        }
    }
    if let Some(path_segments) = url.path_segments() {
        for segment in path_segments {
            let text = segment.trim();
            if !text.is_empty() {
                segments.push(text.to_string());
            }
        }
    }
    segments
}

fn game_id_exists(rows: &[Value], game_id: i64) -> bool {
    game_id > 0
        && rows
            .iter()
            .any(|row| row.get("id").and_then(|v| v.as_i64()).unwrap_or(0) == game_id)
}

fn game_row_code_key(row: &Value) -> String {
    for key in ["code", "productCode", "serial", "gameCode"] {
        let value = row.get(key).and_then(|v| v.as_str()).unwrap_or("").trim();
        if !value.is_empty() {
            return normalize_game_code_key(value);
        }
    }
    String::new()
}

fn game_row_name_key(row: &Value) -> String {
    for key in ["name", "title", "displayName"] {
        let value = row.get(key).and_then(|v| v.as_str()).unwrap_or("").trim();
        if !value.is_empty() {
            return normalize_name_key(value);
        }
    }
    String::new()
}

fn game_row_path_key(row: &Value) -> String {
    row.get("filePath")
        .or_else(|| row.get("path"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_lowercase()
}

fn game_row_platform_key(row: &Value) -> String {
    normalize_platform_short_name(
        row.get("platformShortName")
            .or_else(|| row.get("platform"))
            .and_then(|v| v.as_str())
            .unwrap_or(""),
    )
}

pub(crate) fn resolve_launch_game_id_from_deep_link(raw_uri: &str) -> Option<i64> {
    let trimmed = trim_wrapping_quotes(raw_uri);
    if !trimmed.to_ascii_lowercase().starts_with("emubro://") {
        return None;
    }

    let url = Url::parse(trimmed).ok()?;
    let segments = deep_link_segments(&url);
    let games = read_state_array("games");

    let direct_id = first_query_value(&url, &["gameId", "gameID", "id"]);
    if let Some(game_id) = parse_game_id_text(&direct_id) {
        if game_id_exists(&games, game_id) {
            return Some(game_id);
        }
    }

    if let Some(first_segment) = segments.first() {
        if let Some(game_id) = parse_game_id_text(first_segment) {
            if game_id_exists(&games, game_id) {
                return Some(game_id);
            }
        }
    }

    if matches!(segments.first().map(|value| value.as_str()), Some("launch" | "game")) {
        if let Some(value) = segments.get(1).and_then(|segment| parse_game_id_text(segment)) {
            if game_id_exists(&games, value) {
                return Some(value);
            }
        }
    }

    let mut platform = first_query_value(&url, &["platformShortName", "platform", "system"]);
    let mut code = first_query_value(&url, &["code", "serial", "gameCode", "productCode"]);
    let mut name = first_query_value(&url, &["name", "title", "game", "gameName"]);
    let file_path = first_query_value(&url, &["filePath", "path", "targetPath"]);

    if platform.is_empty() && matches!(segments.first().map(|value| value.as_str()), Some("launch" | "game")) {
        if let Some(value) = segments.get(1) {
            if segments.len() >= 3 {
                platform = value.clone();
            } else if name.is_empty() && code.is_empty() {
                name = value.clone();
            }
        }
    }

    if code.is_empty() && matches!(segments.first().map(|value| value.as_str()), Some("launch" | "game")) {
        if let Some(value) = segments.get(2) {
            code = value.clone();
        }
    }

    let normalized_platform = normalize_platform_short_name(&platform);
    let normalized_code = normalize_game_code_key(&code);
    let normalized_name = normalize_name_key(&name);
    let normalized_path = trim_wrapping_quotes(&file_path).to_lowercase();

    let mut matches = Vec::<i64>::new();
    for row in &games {
        let game_id = row.get("id").and_then(|value| value.as_i64()).unwrap_or(0);
        if game_id <= 0 {
            continue;
        }
        if !normalized_path.is_empty() && game_row_path_key(row) != normalized_path {
            continue;
        }
        if !normalized_platform.is_empty() && game_row_platform_key(row) != normalized_platform {
            continue;
        }
        if !normalized_code.is_empty() {
            let row_code = game_row_code_key(row);
            if row_code.is_empty() || row_code != normalized_code {
                continue;
            }
        }
        if !normalized_name.is_empty() {
            let row_name = game_row_name_key(row);
            if row_name.is_empty() || row_name != normalized_name {
                continue;
            }
        }
        matches.push(game_id);
    }

    if matches.len() == 1 {
        return matches.first().copied();
    }

    None
}

pub(crate) fn resolve_launch_game_id_from_arg(raw_arg: &str) -> Option<i64> {
    let trimmed = trim_wrapping_quotes(raw_arg);
    if let Some(value) = trimmed.strip_prefix("--launch-game=") {
        return parse_game_id_text(value);
    }
    if trimmed.eq_ignore_ascii_case("--launch-game") {
        return None;
    }
    if trimmed.to_ascii_lowercase().starts_with("emubro://") {
        return resolve_launch_game_id_from_deep_link(trimmed);
    }
    None
}
