use super::*;
use serde_json::{json, Value};
use std::collections::{HashMap, HashSet};
use std::io::Read;
use std::path::{Path, PathBuf};
use std::time::Duration;

const DEFAULT_PSX_SOURCE: &str = "https://raw.githubusercontent.com/xlenore/psx-covers/main/covers/default/${serial}.jpg";
const DEFAULT_PS2_SOURCE: &str = "https://raw.githubusercontent.com/xlenore/ps2-covers/main/covers/default/${serial}.jpg";

#[derive(Debug)]
enum CoverFetchError {
    NotFound,
    Http(u16),
    Request(String),
}

fn normalize_cover_platform(value: &str) -> String {
    let raw = normalize_platform_short_name(value);
    match raw.as_str() {
        "psx" | "ps2" => raw,
        "ps1" | "ps" | "playstation" | "playstation-1" | "sony-playstation" => "psx".to_string(),
        "playstation2" | "playstation-2" | "sony-playstation-2" => "ps2".to_string(),
        _ => String::new(),
    }
}

fn normalize_source_template(template: &str) -> String {
    let text = template.trim();
    if text.is_empty() {
        return String::new();
    }
    let lower = text.to_lowercase();
    if !(lower.starts_with("http://") || lower.starts_with("https://")) {
        return String::new();
    }
    if !text.contains("${serial}") {
        return String::new();
    }
    text.to_string()
}

fn dedupe_templates(rows: Vec<String>) -> Vec<String> {
    let mut out = Vec::<String>::new();
    let mut seen = HashSet::<String>::new();
    for row in rows {
        let normalized = normalize_source_template(&row);
        if normalized.is_empty() {
            continue;
        }
        let key = normalized.to_lowercase();
        if seen.insert(key) {
            out.push(normalized);
        }
    }
    out
}

fn default_source_for_platform(platform: &str) -> String {
    match platform {
        "psx" => DEFAULT_PSX_SOURCE.to_string(),
        "ps2" => DEFAULT_PS2_SOURCE.to_string(),
        _ => String::new(),
    }
}

fn parse_source_override_map(payload: &Value) -> HashMap<String, Vec<String>> {
    let mut out = HashMap::<String, Vec<String>>::new();
    let source_overrides = payload.get("sourceOverrides").cloned().unwrap_or_else(|| json!({}));
    for platform in ["psx", "ps2"] {
        let entries = source_overrides
            .get(platform)
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default()
            .into_iter()
            .filter_map(|v| v.as_str().map(|s| s.to_string()))
            .collect::<Vec<String>>();
        out.insert(platform.to_string(), dedupe_templates(entries));
    }
    out
}

fn get_config_source_templates_by_platform() -> HashMap<String, Vec<String>> {
    let mut out = HashMap::<String, Vec<String>>::new();
    for platform in ["psx", "ps2"] {
        out.insert(platform.to_string(), Vec::new());
    }

    let platforms = load_platform_configs();
    for row in platforms {
        let platform = normalize_cover_platform(
            row.get("shortName")
                .and_then(|v| v.as_str())
                .or_else(|| row.get("platform").and_then(|v| v.as_str()))
                .or_else(|| row.get("name").and_then(|v| v.as_str()))
                .unwrap_or(""),
        );
        if platform.is_empty() {
            continue;
        }
        let entries = row
            .get("coverDownloadSources")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default()
            .into_iter()
            .filter_map(|v| v.as_str().map(|s| s.to_string()))
            .collect::<Vec<String>>();
        let merged = {
            let current = out.get(&platform).cloned().unwrap_or_default();
            let mut combined = current;
            combined.extend(entries);
            dedupe_templates(combined)
        };
        out.insert(platform, merged);
    }

    out
}

fn get_source_templates_for_platform(
    platform: &str,
    source_overrides: &HashMap<String, Vec<String>>,
    config_source_templates: &HashMap<String, Vec<String>>,
) -> Vec<String> {
    let mut combined = Vec::<String>::new();
    let default = default_source_for_platform(platform);
    if !default.is_empty() {
        combined.push(default);
    }
    combined.extend(
        config_source_templates
            .get(platform)
            .cloned()
            .unwrap_or_default(),
    );
    combined.extend(source_overrides.get(platform).cloned().unwrap_or_default());
    dedupe_templates(combined)
}

fn cover_relative_path(platform: &str, serial: &str) -> String {
    format!("emubro-resources/platforms/{}/covers/{}.jpg", platform, serial)
}

fn cover_absolute_path(platform: &str, serial: &str) -> Option<PathBuf> {
    let platforms_dir = find_platforms_dir()?;
    Some(platforms_dir.join(platform).join("covers").join(format!("{}.jpg", serial)))
}

fn has_assigned_cover(game: &Value, platform: &str) -> bool {
    let image = game
        .get("image")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    if image.is_empty() {
        return false;
    }
    let lower = image.to_lowercase();
    if lower.contains("/default.jpg") || lower.contains("/default.jpeg") || lower.contains("/default.png") || lower.contains("/default.webp") {
        return false;
    }
    let marker = format!("emubro-resources/platforms/{}/covers/", platform).to_lowercase();
    if lower.contains(&marker) {
        return true;
    }
    true
}

fn normalize_serial(seed: &str) -> String {
    let mut cleaned = String::new();
    for ch in seed.trim().to_uppercase().chars() {
        if ch.is_ascii_alphanumeric() {
            cleaned.push(ch);
        } else if ch == '.' || ch == '_' || ch == '-' || ch.is_ascii_whitespace() {
            cleaned.push('-');
        }
    }
    if cleaned.is_empty() {
        return String::new();
    }

    while cleaned.contains("--") {
        cleaned = cleaned.replace("--", "-");
    }
    let cleaned = cleaned.trim_matches('-').to_string();
    if cleaned.is_empty() {
        return String::new();
    }

    let compact = cleaned.replace('-', "");
    if compact.len() >= 7 && compact.len() <= 11 {
        let prefix = &compact[0..4];
        let suffix = &compact[4..];
        if prefix.chars().all(|c| c.is_ascii_uppercase()) && suffix.chars().all(|c| c.is_ascii_digit()) {
            return format!("{}-{}", prefix, suffix);
        }
    }

    cleaned
}

fn push_serial_candidate(out: &mut Vec<String>, seen: &mut HashSet<String>, seed: &str) {
    let normalized = normalize_serial(seed);
    if normalized.is_empty() {
        return;
    }
    if seen.insert(normalized.clone()) {
        out.push(normalized.clone());
    }
    let compact = normalized.replace('-', "");
    if !compact.is_empty() && seen.insert(compact.clone()) {
        out.push(compact);
    }
}

fn extract_serial_tokens(text: &str) -> Vec<String> {
    let mut tokens = Vec::<String>::new();
    let mut current = String::new();
    for ch in text.to_uppercase().chars() {
        if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' || ch == '.' {
            current.push(ch);
            continue;
        }
        if !current.is_empty() {
            tokens.push(current.clone());
            current.clear();
        }
    }
    if !current.is_empty() {
        tokens.push(current);
    }
    tokens
}

fn serial_candidates_from_game(game: &Value) -> Vec<String> {
    let mut out = Vec::<String>::new();
    let mut seen = HashSet::<String>::new();

    for key in ["code", "productCode", "serial", "gameCode"] {
        let seed = game.get(key).and_then(|v| v.as_str()).unwrap_or("");
        push_serial_candidate(&mut out, &mut seen, seed);
    }

    let mut haystacks = Vec::<String>::new();
    haystacks.push(game.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string());
    let file_path = game.get("filePath").and_then(|v| v.as_str()).unwrap_or("").to_string();
    haystacks.push(file_path.clone());
    let file_name = Path::new(&file_path)
        .file_name()
        .and_then(|v| v.to_str())
        .unwrap_or("")
        .to_string();
    haystacks.push(file_name);

    for hay in haystacks {
        let tokens = extract_serial_tokens(&hay);
        for token in &tokens {
            push_serial_candidate(&mut out, &mut seen, token);
        }
        if tokens.len() >= 2 {
            for idx in 0..(tokens.len() - 1) {
                let combined = format!("{}-{}", tokens[idx], tokens[idx + 1]);
                push_serial_candidate(&mut out, &mut seen, &combined);
            }
        }
    }

    out
}

fn set_game_cover_metadata(game_id: i64, serial: &str, relative_path: &str) -> Result<(), String> {
    let mut games = read_state_array("games");
    let mut updated = false;
    for game in games.iter_mut() {
        if game.get("id").and_then(|v| v.as_i64()).unwrap_or(0) != game_id {
            continue;
        }
        if let Some(obj) = game.as_object_mut() {
            obj.insert("image".to_string(), Value::String(relative_path.to_string()));
            let current_code = obj
                .get("code")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if current_code.is_empty() {
                obj.insert("code".to_string(), Value::String(serial.to_string()));
            }
            updated = true;
        }
        break;
    }
    if !updated {
        return Err("Game not found".to_string());
    }
    write_state_array("games", games)
}

fn fetch_cover_bytes(source_url: &str) -> Result<Vec<u8>, CoverFetchError> {
    let agent = ureq::builder()
        .timeout(Duration::from_secs(20))
        .build();

    match agent.get(source_url).call() {
        Ok(response) => {
            let mut reader = response.into_reader();
            let mut data = Vec::<u8>::new();
            reader
                .read_to_end(&mut data)
                .map_err(|e| CoverFetchError::Request(e.to_string()))?;
            if data.is_empty() {
                return Err(CoverFetchError::Request("Cover response was empty.".to_string()));
            }
            Ok(data)
        }
        Err(ureq::Error::Status(code, _)) => {
            if code == 404 {
                Err(CoverFetchError::NotFound)
            } else {
                Err(CoverFetchError::Http(code))
            }
        }
        Err(ureq::Error::Transport(err)) => Err(CoverFetchError::Request(err.to_string())),
    }
}

fn download_cover_for_game_row(
    game: &Value,
    overwrite: bool,
    only_missing: bool,
    source_overrides: &HashMap<String, Vec<String>>,
    config_source_templates: &HashMap<String, Vec<String>>,
) -> Value {
    let game_id = game.get("id").and_then(|v| v.as_i64()).unwrap_or(0);
    if game_id <= 0 {
        return json!({ "success": false, "status": "invalid_game", "message": "Invalid game." });
    }

    let platform = normalize_cover_platform(
        game.get("platformShortName")
            .and_then(|v| v.as_str())
            .or_else(|| game.get("platform").and_then(|v| v.as_str()))
            .unwrap_or(""),
    );
    if platform.is_empty() {
        return json!({
            "success": false,
            "status": "unsupported_platform",
            "message": "Only PS1/PS2 are supported.",
            "gameId": game_id
        });
    }

    if only_missing && has_assigned_cover(game, &platform) {
        return json!({
            "success": true,
            "status": "skipped_existing_cover",
            "downloaded": false,
            "gameId": game_id
        });
    }

    let serial_candidates = serial_candidates_from_game(game);
    if serial_candidates.is_empty() {
        return json!({
            "success": false,
            "status": "missing_serial",
            "message": "No game serial/code detected.",
            "gameId": game_id
        });
    }

    let source_templates = get_source_templates_for_platform(
        &platform,
        source_overrides,
        config_source_templates,
    );
    if source_templates.is_empty() {
        return json!({
            "success": false,
            "status": "missing_sources",
            "message": "No valid cover source URLs configured.",
            "gameId": game_id
        });
    }

    let mut last_http_status = 0u16;
    for serial in serial_candidates {
        let relative = cover_relative_path(&platform, &serial);
        let Some(absolute) = cover_absolute_path(&platform, &serial) else {
            continue;
        };

        if absolute.exists() && !overwrite {
            if let Err(error) = set_game_cover_metadata(game_id, &serial, &relative) {
                return json!({
                    "success": false,
                    "status": "metadata_update_failed",
                    "message": error,
                    "serial": serial,
                    "gameId": game_id
                });
            }
            return json!({
                "success": true,
                "status": "reused_existing_file",
                "downloaded": false,
                "serial": serial,
                "image": relative,
                "gameId": game_id
            });
        }

        for source_template in &source_templates {
            let source_url = source_template.replace("${serial}", &urlencoding::encode(&serial));
            match fetch_cover_bytes(&source_url) {
                Ok(bytes) => {
                    if let Some(parent) = absolute.parent() {
                        if let Err(error) = fs::create_dir_all(parent) {
                            return json!({
                                "success": false,
                                "status": "write_failed",
                                "message": error.to_string(),
                                "serial": serial,
                                "sourceUrl": source_url,
                                "sourceTemplate": source_template,
                                "gameId": game_id
                            });
                        }
                    }
                    if let Err(error) = fs::write(&absolute, &bytes) {
                        return json!({
                            "success": false,
                            "status": "write_failed",
                            "message": error.to_string(),
                            "serial": serial,
                            "sourceUrl": source_url,
                            "sourceTemplate": source_template,
                            "gameId": game_id
                        });
                    }
                    if let Err(error) = set_game_cover_metadata(game_id, &serial, &relative) {
                        return json!({
                            "success": false,
                            "status": "metadata_update_failed",
                            "message": error,
                            "serial": serial,
                            "sourceUrl": source_url,
                            "sourceTemplate": source_template,
                            "gameId": game_id
                        });
                    }
                    return json!({
                        "success": true,
                        "status": "downloaded",
                        "downloaded": true,
                        "serial": serial,
                        "image": relative,
                        "sourceUrl": source_url,
                        "sourceTemplate": source_template,
                        "gameId": game_id
                    });
                }
                Err(CoverFetchError::NotFound) => {
                    last_http_status = 404;
                    continue;
                }
                Err(CoverFetchError::Http(status)) => {
                    return json!({
                        "success": false,
                        "status": "http_error",
                        "message": format!("Cover request failed ({}).", status),
                        "httpStatus": status,
                        "serial": serial,
                        "sourceUrl": source_url,
                        "sourceTemplate": source_template,
                        "gameId": game_id
                    });
                }
                Err(CoverFetchError::Request(message)) => {
                    return json!({
                        "success": false,
                        "status": "request_failed",
                        "message": message,
                        "serial": serial,
                        "sourceUrl": source_url,
                        "sourceTemplate": source_template,
                        "gameId": game_id
                    });
                }
            }
        }
    }

    json!({
        "success": false,
        "status": "not_found",
        "message": "No cover was found for this serial.",
        "httpStatus": if last_http_status > 0 { last_http_status } else { 404 },
        "gameId": game_id
    })
}

fn parse_game_ids(payload: &Value) -> HashSet<i64> {
    payload
        .get("gameIds")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .filter_map(|v| v.as_i64())
        .filter(|id| *id > 0)
        .collect::<HashSet<i64>>()
}

fn get_game_by_id(game_id: i64) -> Option<Value> {
    if game_id <= 0 {
        return None;
    }
    read_state_array("games")
        .into_iter()
        .find(|row| row.get("id").and_then(|v| v.as_i64()).unwrap_or(0) == game_id)
}

pub(crate) fn handle(channel: &str, args: &[Value]) -> Option<Result<Value, String>> {
    let result = match channel {
        "covers:download-for-game" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let game_id = payload
                .get("gameId")
                .and_then(|v| v.as_i64())
                .or_else(|| payload.as_i64())
                .unwrap_or(0);
            if game_id <= 0 {
                return Some(Ok(json!({ "success": false, "message": "Missing game ID" })));
            }

            let Some(game) = get_game_by_id(game_id) else {
                return Some(Ok(json!({ "success": false, "message": "Game not found" })));
            };

            let source_overrides = parse_source_override_map(&payload);
            let config_source_templates = get_config_source_templates_by_platform();
            let overwrite = payload.get("overwrite").and_then(|v| v.as_bool()).unwrap_or(true);
            let only_missing = payload.get("onlyMissing").and_then(|v| v.as_bool()).unwrap_or(false);

            let result = download_cover_for_game_row(
                &game,
                overwrite,
                only_missing,
                &source_overrides,
                &config_source_templates,
            );
            Ok(result)
        }
        "covers:download-for-library" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let source_overrides = parse_source_override_map(&payload);
            let config_source_templates = get_config_source_templates_by_platform();
            let overwrite = payload.get("overwrite").and_then(|v| v.as_bool()).unwrap_or(false);
            let only_missing = payload.get("onlyMissing").and_then(|v| v.as_bool()).unwrap_or(true);
            let wanted_ids = parse_game_ids(&payload);

            let mut games = read_state_array("games");
            if !wanted_ids.is_empty() {
                games.retain(|row| wanted_ids.contains(&row.get("id").and_then(|v| v.as_i64()).unwrap_or(0)));
            }

            let supported_games = games
                .into_iter()
                .filter(|row| {
                    let platform = normalize_cover_platform(
                        row.get("platformShortName")
                            .and_then(|v| v.as_str())
                            .or_else(|| row.get("platform").and_then(|v| v.as_str()))
                            .unwrap_or(""),
                    );
                    !platform.is_empty()
                })
                .collect::<Vec<Value>>();

            let mut results = Vec::<Value>::new();
            let mut downloaded = 0usize;
            let mut skipped = 0usize;
            let mut failed = 0usize;

            for game in &supported_games {
                let row_result = download_cover_for_game_row(
                    game,
                    overwrite,
                    only_missing,
                    &source_overrides,
                    &config_source_templates,
                );

                let success = row_result.get("success").and_then(|v| v.as_bool()).unwrap_or(false);
                let was_downloaded = row_result.get("downloaded").and_then(|v| v.as_bool()).unwrap_or(false);
                if was_downloaded {
                    downloaded += 1;
                } else if success {
                    skipped += 1;
                } else {
                    failed += 1;
                }

                let mut merged = row_result.as_object().cloned().unwrap_or_default();
                merged.insert(
                    "gameId".to_string(),
                    Value::Number(game.get("id").and_then(|v| v.as_i64()).unwrap_or(0).into()),
                );
                merged.insert(
                    "name".to_string(),
                    Value::String(game.get("name").and_then(|v| v.as_str()).unwrap_or("").trim().to_string()),
                );
                merged.insert(
                    "platformShortName".to_string(),
                    Value::String(
                        normalize_cover_platform(
                            game.get("platformShortName")
                                .and_then(|v| v.as_str())
                                .or_else(|| game.get("platform").and_then(|v| v.as_str()))
                                .unwrap_or(""),
                        ),
                    ),
                );
                results.push(Value::Object(merged));
            }

            let psx_sources = get_source_templates_for_platform("psx", &source_overrides, &config_source_templates)
                .into_iter()
                .map(Value::String)
                .collect::<Vec<Value>>();
            let ps2_sources = get_source_templates_for_platform("ps2", &source_overrides, &config_source_templates)
                .into_iter()
                .map(Value::String)
                .collect::<Vec<Value>>();

            Ok(json!({
                "success": true,
                "total": supported_games.len(),
                "downloaded": downloaded,
                "skipped": skipped,
                "failed": failed,
                "results": Value::Array(results),
                "sourceTemplates": {
                    "psx": Value::Array(psx_sources),
                    "ps2": Value::Array(ps2_sources)
                }
            }))
        }
        "covers:get-source-config" => {
            let config_source_templates = get_config_source_templates_by_platform();
            let empty_overrides = HashMap::<String, Vec<String>>::new();

            let psx_sources = get_source_templates_for_platform("psx", &empty_overrides, &config_source_templates)
                .into_iter()
                .map(Value::String)
                .collect::<Vec<Value>>();
            let ps2_sources = get_source_templates_for_platform("ps2", &empty_overrides, &config_source_templates)
                .into_iter()
                .map(Value::String)
                .collect::<Vec<Value>>();

            Ok(json!({
                "success": true,
                "sources": {
                    "psx": Value::Array(psx_sources),
                    "ps2": Value::Array(ps2_sources)
                }
            }))
        }
        _ => return None,
    };

    Some(result)
}
