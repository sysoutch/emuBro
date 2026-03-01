use super::*;

const WEB_EMULATOR_ANALYZE_LIMIT: usize = 8;

fn normalize_source_input(payload: &Value) -> String {
    payload
        .get("source")
        .or_else(|| payload.get("path"))
        .or_else(|| payload.get("url"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string()
}

fn is_http_url(value: &str) -> bool {
    let lower = value.trim().to_lowercase();
    lower.starts_with("http://") || lower.starts_with("https://")
}

fn decode_file_url(value: &str) -> String {
    let raw = value.trim();
    if !raw.to_lowercase().starts_with("file://") {
        return raw.to_string();
    }
    let mut path_part = raw.trim_start_matches("file://").to_string();
    if cfg!(target_os = "windows") && path_part.starts_with('/') && path_part.chars().nth(2) == Some(':') {
        path_part = path_part.trim_start_matches('/').to_string();
    }
    let decoded = urlencoding::decode(&path_part)
        .map(|v| v.to_string())
        .unwrap_or(path_part);
    if cfg!(target_os = "windows") {
        decoded.replace('/', "\\")
    } else {
        decoded
    }
}

fn basename_from_source(value: &str) -> String {
    let raw = value.trim();
    if raw.is_empty() {
        return String::new();
    }
    if is_http_url(raw) {
        let base = raw.split('?').next().unwrap_or(raw);
        return base.rsplit('/').next().unwrap_or("").trim().to_string();
    }
    Path::new(raw)
        .file_name()
        .and_then(|v| v.to_str())
        .unwrap_or("")
        .trim()
        .to_string()
}

fn is_html_like_source(value: &str) -> bool {
    let base = basename_from_source(value).to_lowercase();
    if base.ends_with(".html") || base.ends_with(".htm") {
        return true;
    }
    base.is_empty() && is_http_url(value)
}

fn collect_web_emulator_candidates() -> Vec<Value> {
    let mut out = Vec::<Value>::new();
    for platform in load_platform_configs() {
        let platform_short = normalize_platform_short_name(
            platform
                .get("shortName")
                .and_then(|v| v.as_str())
                .unwrap_or(platform.get("platformDir").and_then(|v| v.as_str()).unwrap_or("unknown")),
        );
        let platform_name = platform
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or(&platform_short)
            .trim()
            .to_string();
        let emulators = platform
            .get("emulators")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default();
        for emulator in emulators {
            let emu_type = emulator
                .get("type")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_lowercase();
            let web_url = emulator
                .get("webUrl")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            let web_url_online = emulator
                .get("webUrlOnline")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if emu_type != "web" && web_url.is_empty() && web_url_online.is_empty() {
                continue;
            }
            out.push(json!({
                "name": emulator.get("name").and_then(|v| v.as_str()).unwrap_or("Web Emulator"),
                "platform": platform_name,
                "platformShortName": platform_short,
                "website": emulator.get("website").and_then(|v| v.as_str()).unwrap_or(""),
                "webUrl": web_url,
                "webUrlOnline": web_url_online,
                "startParameters": emulator.get("startParameters").and_then(|v| v.as_str()).unwrap_or("?rom=%gamepath%"),
                "supportedFileTypes": emulator.get("supportedFileTypes").cloned().unwrap_or_else(|| json!([]))
            }));
        }
    }
    out
}

fn score_web_emulator_match(source: &str, row: &Value, html_like: bool) -> i64 {
    let source_lower = source.trim().to_lowercase();
    if source_lower.is_empty() {
        return 0;
    }
    let mut score = 0i64;
    let name = row.get("name").and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
    let platform = row
        .get("platformShortName")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_lowercase();
    let website = row
        .get("website")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_lowercase();
    let web_online = row
        .get("webUrlOnline")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_lowercase();
    let web_local = row
        .get("webUrl")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_lowercase();

    if !name.is_empty() && source_lower.contains(&name) {
        score += 60;
    }
    if !platform.is_empty() && source_lower.contains(&platform) {
        score += 24;
    }
    for candidate in [website, web_online, web_local] {
        if candidate.is_empty() {
            continue;
        }
        if source_lower.contains(&candidate) {
            score += 36;
        }
    }
    if html_like {
        score += 10;
    }
    if score == 0 && html_like {
        score = 1;
    }
    score
}

pub(super) fn analyze_web_emulator_source(payload: &Value) -> Value {
    let source_raw = normalize_source_input(payload);
    if source_raw.is_empty() {
        return json!({
            "success": false,
            "message": "Missing source.",
            "source": "",
            "htmlLike": false,
            "matches": []
        });
    }

    let source = decode_file_url(&source_raw);
    let source_is_url = is_http_url(&source);
    let source_exists = !source_is_url && Path::new(&source).exists();
    let html_like = is_html_like_source(&source);
    let source_extension = normalize_extension(Path::new(&basename_from_source(&source)).extension().and_then(|v| v.to_str()).unwrap_or(""));
    let mut rows = collect_web_emulator_candidates();
    rows.sort_by(|a, b| {
        let score_a = score_web_emulator_match(&source, a, html_like);
        let score_b = score_web_emulator_match(&source, b, html_like);
        score_b.cmp(&score_a)
    });
    let matches = rows
        .into_iter()
        .map(|mut row| {
            let score = score_web_emulator_match(&source, &row, html_like);
            if let Some(obj) = row.as_object_mut() {
                obj.insert("score".to_string(), Value::Number(score.into()));
            }
            row
        })
        .filter(|row| row.get("score").and_then(|v| v.as_i64()).unwrap_or(0) > 0)
        .take(WEB_EMULATOR_ANALYZE_LIMIT)
        .collect::<Vec<Value>>();

    json!({
        "success": true,
        "source": source,
        "htmlLike": html_like,
        "sourceIsUrl": source_is_url,
        "sourceExists": source_exists,
        "sourceExtension": source_extension,
        "matches": matches
    })
}

pub(super) fn save_web_emulator_source(payload: &Value) -> Value {
    let source_raw = normalize_source_input(payload);
    if source_raw.is_empty() {
        return json!({ "success": false, "message": "Missing source." });
    }
    let source = decode_file_url(&source_raw);
    let source_is_url = is_http_url(&source);
    let action = payload
        .get("action")
        .and_then(|v| v.as_str())
        .unwrap_or("save")
        .trim()
        .to_lowercase();
    let should_download = action == "save_and_download" || action == "download";

    let match_row = payload.get("match").cloned().unwrap_or_else(|| json!({}));
    let platform_short = normalize_platform_short_name(
        payload
            .get("platformShortName")
            .and_then(|v| v.as_str())
            .unwrap_or(match_row.get("platformShortName").and_then(|v| v.as_str()).unwrap_or("")),
    );
    if platform_short.is_empty() {
        return json!({ "success": false, "message": "Missing platform for web emulator." });
    }
    let platform_name = payload
        .get("platform")
        .and_then(|v| v.as_str())
        .unwrap_or(match_row.get("platform").and_then(|v| v.as_str()).unwrap_or(&platform_short))
        .trim()
        .to_string();
    let emulator_name = payload
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or(match_row.get("name").and_then(|v| v.as_str()).unwrap_or("Web Emulator"))
        .trim()
        .to_string();
    let start_parameters = payload
        .get("startParameters")
        .and_then(|v| v.as_str())
        .unwrap_or(match_row.get("startParameters").and_then(|v| v.as_str()).unwrap_or("?rom=%gamepath%"))
        .trim()
        .to_string();
    let website = payload
        .get("website")
        .and_then(|v| v.as_str())
        .unwrap_or(match_row.get("website").and_then(|v| v.as_str()).unwrap_or(""))
        .trim()
        .to_string();

    let mut stored_path = source.clone();
    let mut downloaded_to = String::new();
    if should_download {
        let target_root = managed_data_root().join("web-emulators").join(&platform_short);
        if let Err(error) = ensure_directory(&target_root) {
            return json!({ "success": false, "message": error });
        }
        let source_base = basename_from_source(&source);
        let source_ext = normalize_extension(Path::new(&source_base).extension().and_then(|v| v.to_str()).unwrap_or(""));
        let preferred_ext = if source_ext == ".htm" { ".html" } else if source_ext.is_empty() { ".html" } else { &source_ext };
        let desired_name = super::downloads::sanitize_path_segment(&emulator_name, "web-emulator");
        let destination = ensure_unique_destination_path(&target_root.join(format!("{}{}", desired_name, preferred_ext)));

        if source_is_url {
            let text = match ureq::AgentBuilder::new()
                .timeout(std::time::Duration::from_secs(60))
                .build()
                .get(&source)
                .set("User-Agent", "emuBro-Tauri/0.1")
                .call()
            {
                Ok(response) => {
                    let mut body = String::new();
                    if let Err(error) = response.into_reader().read_to_string(&mut body) {
                        return json!({ "success": false, "message": error.to_string() });
                    }
                    body
                }
                Err(error) => {
                    return json!({ "success": false, "message": error.to_string() });
                }
            };
            if let Err(error) = fs::write(&destination, text.as_bytes()) {
                return json!({ "success": false, "message": error.to_string() });
            }
        } else {
            let source_path = PathBuf::from(&source);
            if !source_path.exists() || !source_path.is_file() {
                return json!({ "success": false, "message": "Source HTML file was not found." });
            }
            if let Err(error) = fs::copy(&source_path, &destination) {
                return json!({ "success": false, "message": error.to_string() });
            }
        }
        stored_path = destination.to_string_lossy().to_string();
        downloaded_to = stored_path.clone();
    } else if !source_is_url {
        let source_path = PathBuf::from(&source);
        if !source_path.exists() || !source_path.is_file() {
            return json!({ "success": false, "message": "Source HTML file was not found." });
        }
    }

    let emulator_row = match super::downloads::upsert_emulator_row(
        &emulator_name,
        &platform_name,
        &platform_short,
        &stored_path,
        &website,
        &start_parameters,
        "web",
    ) {
        Ok(row) => row,
        Err(error) => return json!({ "success": false, "message": error }),
    };

    json!({
        "success": true,
        "emulator": emulator_row,
        "downloadedTo": downloaded_to,
        "source": source,
        "storedPath": stored_path
    })
}
