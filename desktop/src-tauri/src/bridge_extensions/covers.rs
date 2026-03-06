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

fn read_response_text(response: ureq::Response) -> Result<String, String> {
    let mut reader = response.into_reader();
    let mut data = String::new();
    reader
        .read_to_string(&mut data)
        .map_err(|error| error.to_string())?;
    Ok(data)
}

fn extract_between(haystack: &str, start: &str, end: char) -> Option<String> {
    let start_idx = haystack.find(start)?;
    let rest = &haystack[(start_idx + start.len())..];
    let end_idx = rest.find(end)?;
    Some(rest[..end_idx].to_string())
}

fn extract_duckduckgo_vqd(html: &str) -> Option<String> {
    extract_between(html, "vqd='", '\'')
        .or_else(|| extract_between(html, "vqd=\"", '"'))
        .map(|token| token.trim().to_string())
        .filter(|token| !token.is_empty())
}

fn is_http_url(value: &str) -> bool {
    let lower = value.trim().to_lowercase();
    lower.starts_with("http://") || lower.starts_with("https://")
}

fn build_cover_search_payload(provider: &str, query: &str, results: Vec<Value>) -> Value {
    json!({
        "success": true,
        "provider": provider,
        "query": query,
        "results": Value::Array(results)
    })
}

fn extract_url_domain(url: &str) -> String {
    let parsed = url::Url::parse(url).ok();
    parsed
        .and_then(|value| value.host_str().map(|host| host.to_string()))
        .unwrap_or_default()
}

fn html_unescape_basic(value: &str) -> String {
    value
        .replace("&quot;", "\"")
        .replace("&#34;", "\"")
        .replace("&amp;", "&")
        .replace("&#38;", "&")
        .replace("&lt;", "<")
        .replace("&#60;", "<")
        .replace("&gt;", ">")
        .replace("&#62;", ">")
        .replace("&#39;", "'")
        .replace("&apos;", "'")
}

fn normalize_spacing(value: &str) -> String {
    value
        .split_whitespace()
        .filter(|segment| !segment.trim().is_empty())
        .collect::<Vec<&str>>()
        .join(" ")
}

fn strip_bracketed_fragments(value: &str) -> String {
    let mut out = String::new();
    let mut depth_round = 0usize;
    let mut depth_square = 0usize;
    let mut depth_curly = 0usize;

    for ch in value.chars() {
        match ch {
            '(' => {
                depth_round += 1;
            }
            ')' => {
                depth_round = depth_round.saturating_sub(1);
            }
            '[' => {
                depth_square += 1;
            }
            ']' => {
                depth_square = depth_square.saturating_sub(1);
            }
            '{' => {
                depth_curly += 1;
            }
            '}' => {
                depth_curly = depth_curly.saturating_sub(1);
            }
            _ => {
                if depth_round == 0 && depth_square == 0 && depth_curly == 0 {
                    out.push(ch);
                }
            }
        }
    }

    normalize_spacing(&out)
}

fn normalize_trailing_article(value: &str) -> String {
    let text = normalize_spacing(value);
    if text.is_empty() {
        return String::new();
    }

    let Some((left, right)) = text.split_once(',') else {
        return text;
    };
    let right_trimmed = right.trim_start();
    let right_lower = right_trimmed.to_lowercase();
    if !right_lower.starts_with("the") {
        return text;
    }

    let suffix = right_trimmed.get(3..).unwrap_or("").trim_start();
    normalize_spacing(&format!(
        "The {}{}",
        left.trim(),
        if suffix.is_empty() {
            String::new()
        } else {
            format!(" {}", suffix)
        }
    ))
}

fn build_cover_search_query_candidates(query: &str) -> Vec<String> {
    let mut out = Vec::<String>::new();
    let mut seen = HashSet::<String>::new();
    let push = |rows: &mut Vec<String>, set: &mut HashSet<String>, candidate: String| {
        let normalized = normalize_spacing(&candidate);
        if normalized.is_empty() {
            return;
        }
        let key = normalized.to_lowercase();
        if set.insert(key) {
            rows.push(normalized);
        }
    };

    let original = normalize_spacing(query);
    let no_brackets = strip_bracketed_fragments(&original);
    let reordered = normalize_trailing_article(&no_brackets);

    push(&mut out, &mut seen, original.clone());
    push(&mut out, &mut seen, reordered.clone());

    let lowered_tokens = reordered
        .split_whitespace()
        .map(|segment| segment.trim().to_string())
        .filter(|segment| !segment.is_empty())
        .filter(|segment| {
            let token = segment.to_lowercase();
            token != "cover" && token != "box" && token != "art"
        })
        .collect::<Vec<String>>();
    let base = normalize_spacing(&lowered_tokens.join(" "));

    push(&mut out, &mut seen, base.clone());
    push(&mut out, &mut seen, format!("{} cover", base));
    push(&mut out, &mut seen, format!("{} box art", base));

    out.into_iter().take(4).collect::<Vec<String>>()
}

fn try_search_duckduckgo_results(query: &str, limit: usize) -> Result<Value, String> {
    let normalized_query = query.trim();
    let agent = ureq::builder()
        .timeout(Duration::from_secs(20))
        .build();
    let user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

    let search_url = format!("https://duckduckgo.com/?q={}", urlencoding::encode(normalized_query));
    let html = match agent
        .get(&search_url)
        .set("User-Agent", user_agent)
        .set("Accept", "text/html,application/xhtml+xml")
        .call()
    {
        Ok(response) => read_response_text(response)?,
        Err(ureq::Error::Status(code, _)) => return Err(format!("DuckDuckGo search failed ({}).", code)),
        Err(ureq::Error::Transport(error)) => return Err(error.to_string()),
    };

    let vqd = extract_duckduckgo_vqd(&html)
        .ok_or_else(|| "Could not initialize DuckDuckGo image search token.".to_string())?;

    let api_url = format!(
        "https://duckduckgo.com/i.js?l=wt-wt&o=json&q={}&vqd={}&f=,,,&p=1",
        urlencoding::encode(normalized_query),
        urlencoding::encode(&vqd)
    );
    let response_text = match agent
        .get(&api_url)
        .set("User-Agent", user_agent)
        .set("Accept", "application/json,text/javascript,*/*;q=0.9")
        .set("Referer", &search_url)
        .set("X-Requested-With", "XMLHttpRequest")
        .call()
    {
        Ok(response) => read_response_text(response)?,
        Err(ureq::Error::Status(code, _)) => return Err(format!("DuckDuckGo image search failed ({}).", code)),
        Err(ureq::Error::Transport(error)) => return Err(error.to_string()),
    };

    let parsed: Value = serde_json::from_str(&response_text)
        .map_err(|error| format!("Could not parse DuckDuckGo image response: {}", error))?;

    let rows = parsed
        .get("results")
        .and_then(|value| value.as_array())
        .cloned()
        .unwrap_or_default();

    let max_rows = limit.max(1).min(48);
    let mut results = Vec::<Value>::new();
    let mut seen_images = HashSet::<String>::new();
    for row in rows {
        let image_url = row
            .get("image")
            .and_then(|value| value.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        let thumb_url = row
            .get("thumbnail")
            .and_then(|value| value.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        let final_image_url = if is_http_url(&image_url) {
            image_url
        } else if is_http_url(&thumb_url) {
            thumb_url.clone()
        } else {
            continue;
        };
        let dedupe_key = final_image_url.to_lowercase();
        if !seen_images.insert(dedupe_key) {
            continue;
        }

        let final_thumb_url = if is_http_url(&thumb_url) {
            thumb_url
        } else {
            final_image_url.clone()
        };
        let page_url = row
            .get("url")
            .and_then(|value| value.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        let source = row
            .get("source")
            .and_then(|value| value.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        let title = row
            .get("title")
            .and_then(|value| value.as_str())
            .unwrap_or("")
            .trim()
            .to_string();

        results.push(json!({
            "title": title,
            "source": source,
            "imageUrl": final_image_url,
            "thumbnailUrl": final_thumb_url,
            "pageUrl": if is_http_url(&page_url) { page_url } else { "".to_string() }
        }));
        if results.len() >= max_rows {
            break;
        }
    }

    Ok(build_cover_search_payload("duckduckgo", normalized_query, results))
}

fn parse_bing_image_results_from_html(html: &str, max_rows: usize) -> Vec<Value> {
    let mut results = Vec::<Value>::new();
    let mut seen_images = HashSet::<String>::new();
    let mut cursor = 0usize;

    while results.len() < max_rows {
        let Some(class_rel) = html[cursor..].find("class=\"iusc\"") else {
            break;
        };
        let class_idx = cursor + class_rel;
        let tail = &html[class_idx..];
        let Some(attr_rel) = tail.find(" m=\"") else {
            cursor = class_idx + 11;
            continue;
        };
        let attr_start = class_idx + attr_rel + 4;
        let Some(attr_end_rel) = html[attr_start..].find('"') else {
            break;
        };
        let attr_end = attr_start + attr_end_rel;
        cursor = attr_end + 1;

        let encoded_json = &html[attr_start..attr_end];
        let decoded_json = html_unescape_basic(encoded_json);
        let Ok(meta) = serde_json::from_str::<Value>(&decoded_json) else {
            continue;
        };

        let image_url = meta
            .get("murl")
            .and_then(|value| value.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if !is_http_url(&image_url) {
            continue;
        }
        let dedupe_key = image_url.to_lowercase();
        if !seen_images.insert(dedupe_key) {
            continue;
        }

        let thumb_url = meta
            .get("turl")
            .and_then(|value| value.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        let page_url = meta
            .get("purl")
            .and_then(|value| value.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        let title = meta
            .get("t")
            .and_then(|value| value.as_str())
            .unwrap_or("")
            .trim()
            .to_string();

        results.push(json!({
            "title": title,
            "source": extract_url_domain(&page_url),
            "imageUrl": image_url,
            "thumbnailUrl": if is_http_url(&thumb_url) { thumb_url } else { "".to_string() },
            "pageUrl": if is_http_url(&page_url) { page_url } else { "".to_string() }
        }));
    }

    if results.is_empty() {
        let mut fallback_cursor = 0usize;
        let marker = "\"murl\":\"";
        while results.len() < max_rows {
            let Some(rel_idx) = html[fallback_cursor..].find(marker) else {
                break;
            };
            let start = fallback_cursor + rel_idx + marker.len();
            let mut end = start;
            let bytes = html.as_bytes();
            let mut escaped = false;
            while end < html.len() {
                let ch = bytes[end] as char;
                if escaped {
                    escaped = false;
                    end += 1;
                    continue;
                }
                if ch == '\\' {
                    escaped = true;
                    end += 1;
                    continue;
                }
                if ch == '"' {
                    break;
                }
                end += 1;
            }
            if end <= start || end > html.len() {
                break;
            }
            fallback_cursor = end + 1;

            let decoded = html[start..end]
                .replace("\\/", "/")
                .replace("\\u002f", "/")
                .replace("\\u003a", ":")
                .replace("\\u0026", "&");
            let image_url = decoded.trim().to_string();
            if !is_http_url(&image_url) {
                continue;
            }
            let dedupe_key = image_url.to_lowercase();
            if !seen_images.insert(dedupe_key) {
                continue;
            }
            results.push(json!({
                "title": String::new(),
                "source": "bing",
                "imageUrl": image_url,
                "thumbnailUrl": String::new(),
                "pageUrl": String::new()
            }));
        }
    }

    results
}

fn try_search_bing_results(query: &str, limit: usize) -> Result<Value, String> {
    let normalized_query = query.trim();
    let max_rows = limit.max(1).min(48);
    let agent = ureq::builder()
        .timeout(Duration::from_secs(20))
        .build();
    let user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";
    let url = format!("https://www.bing.com/images/search?q={}", urlencoding::encode(normalized_query));

    let html = match agent
        .get(&url)
        .set("User-Agent", user_agent)
        .set("Accept", "text/html,application/xhtml+xml")
        .call()
    {
        Ok(response) => read_response_text(response)?,
        Err(ureq::Error::Status(code, _)) => return Err(format!("Bing image search failed ({}).", code)),
        Err(ureq::Error::Transport(error)) => return Err(error.to_string()),
    };

    let mut results = parse_bing_image_results_from_html(&html, max_rows);
    if results.is_empty() {
        let async_url = format!(
            "https://www.bing.com/images/async?q={}&first=0&count={}&adlt=off",
            urlencoding::encode(normalized_query),
            max_rows
        );
        let async_html = match agent
            .get(&async_url)
            .set("User-Agent", user_agent)
            .set("Accept", "text/html,application/xhtml+xml")
            .set("X-Requested-With", "XMLHttpRequest")
            .call()
        {
            Ok(response) => read_response_text(response).unwrap_or_default(),
            Err(_) => String::new(),
        };
        if !async_html.is_empty() {
            results = parse_bing_image_results_from_html(&async_html, max_rows);
        }
    }

    Ok(build_cover_search_payload("bing", normalized_query, results))
}

fn search_web_cover_results(query: &str, limit: usize) -> Result<Value, String> {
    let normalized_query = query.trim();
    if normalized_query.is_empty() {
        return Err("Missing query.".to_string());
    }

    let candidates = build_cover_search_query_candidates(normalized_query);
    let mut last_error = String::new();

    for candidate in candidates {
        match try_search_duckduckgo_results(&candidate, limit) {
            Ok(result) => {
                let count = result
                    .get("results")
                    .and_then(|value| value.as_array())
                    .map(|rows| rows.len())
                    .unwrap_or(0);
                if count > 0 {
                    return Ok(result);
                }
            }
            Err(error) => {
                last_error = error;
            }
        }

        match try_search_bing_results(&candidate, limit) {
            Ok(result) => {
                let count = result
                    .get("results")
                    .and_then(|value| value.as_array())
                    .map(|rows| rows.len())
                    .unwrap_or(0);
                if count > 0 {
                    return Ok(result);
                }
            }
            Err(error) => {
                last_error = error;
            }
        }
    }

    if last_error.is_empty() {
        Err("No image results were found for this query.".to_string())
    } else {
        Err(last_error)
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
        "covers:search-web" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let query = payload.get("query").and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
            if query.is_empty() {
                return Some(Ok(json!({ "success": false, "message": "Missing query.", "results": [] })));
            }
            let limit = payload
                .get("limit")
                .and_then(|v| v.as_u64())
                .map(|v| v as usize)
                .unwrap_or(24);
            match search_web_cover_results(&query, limit) {
                Ok(result) => Ok(result),
                Err(error) => Ok(json!({
                    "success": false,
                    "message": error,
                    "query": query,
                    "results": []
                })),
            }
        }
        _ => return None,
    };

    Some(result)
}
