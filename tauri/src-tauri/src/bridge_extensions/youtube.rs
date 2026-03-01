use super::*;

fn extract_initial_data(html: &str) -> Option<Value> {
    let marker = "var ytInitialData = ";
    let start_idx = html.find(marker)?;
    let start = start_idx + marker.len();
    let end = html[start..]
        .find(";</script>")
        .map(|v| start + v)
        .or_else(|| html[start..].find(";\n").map(|v| start + v))?;
    let raw = html[start..end].trim();
    if raw.is_empty() {
        return None;
    }
    serde_json::from_str::<Value>(raw).ok()
}

fn renderer_text(node: &Value) -> String {
    if let Some(text) = node.get("simpleText").and_then(|v| v.as_str()) {
        return text.trim().to_string();
    }
    node.get("runs")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .filter_map(|row| row.get("text").and_then(|v| v.as_str()).map(|v| v.trim().to_string()))
        .filter(|v| !v.is_empty())
        .collect::<Vec<String>>()
        .join("")
}

fn collect_videos(node: &Value, limit: usize, out: &mut Vec<Value>, seen: &mut HashSet<String>) {
    if out.len() >= limit {
        return;
    }
    if let Some(video) = node.get("videoRenderer").and_then(|v| v.as_object()) {
        let id = video
            .get("videoId")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if !id.is_empty() && !seen.contains(&id) {
            seen.insert(id.clone());
            let title = renderer_text(video.get("title").unwrap_or(&Value::Null));
            let channel = renderer_text(
                video
                    .get("ownerText")
                    .or_else(|| video.get("longBylineText"))
                    .unwrap_or(&Value::Null),
            );
            let thumb = video
                .get("thumbnail")
                .and_then(|v| v.get("thumbnails"))
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default();
            let thumbnail = thumb
                .last()
                .and_then(|v| v.get("url"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            out.push(json!({
                "videoId": id.clone(),
                "title": if title.is_empty() { "YouTube Result".to_string() } else { title },
                "channel": channel,
                "url": format!("https://www.youtube.com/watch?v={}", id),
                "embedUrl": format!("https://www.youtube.com/embed/{}", id),
                "thumbnail": if thumbnail.is_empty() { format!("https://i.ytimg.com/vi/{}/hqdefault.jpg", id) } else { thumbnail }
            }));
        }
    }
    match node {
        Value::Array(rows) => {
            for row in rows {
                collect_videos(row, limit, out, seen);
                if out.len() >= limit {
                    break;
                }
            }
        }
        Value::Object(map) => {
            for value in map.values() {
                collect_videos(value, limit, out, seen);
                if out.len() >= limit {
                    break;
                }
            }
        }
        _ => {}
    }
}

fn fallback_video_ids(html: &str, limit: usize) -> Vec<String> {
    let marker = "\"videoId\":\"";
    let mut out = Vec::<String>::new();
    let mut seen = HashSet::<String>::new();
    let mut cursor = 0usize;
    while let Some(pos) = html[cursor..].find(marker) {
        let start = cursor + pos + marker.len();
        let Some(rest) = html.get(start..) else {
            break;
        };
        let id = rest.chars().take(11).collect::<String>();
        if id.len() == 11 && id.chars().all(|ch| ch.is_ascii_alphanumeric() || ch == '-' || ch == '_') {
            if seen.insert(id.clone()) {
                out.push(id);
                if out.len() >= limit {
                    break;
                }
            }
        }
        cursor = start;
        if cursor >= html.len() {
            break;
        }
    }
    out
}

pub(crate) fn handle(channel: &str, args: &[Value]) -> Option<Result<Value, String>> {
    let result = match channel {
        "youtube:search-videos" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let query = payload
                .get("query")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            let limit = payload
                .get("limit")
                .and_then(|v| v.as_u64())
                .map(|v| v.clamp(1, 12) as usize)
                .unwrap_or(8);
            if query.is_empty() {
                return Some(Ok(json!({
                    "success": false,
                    "message": "Missing YouTube search query",
                    "results": []
                })));
            }
            let search_url = format!(
                "https://www.youtube.com/results?search_query={}",
                urlencoding::encode(&query)
            );
            let response = match ureq::get(&search_url)
                .set("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
                .set("accept-language", "en-US,en;q=0.9")
                .call()
            {
                Ok(res) => res,
                Err(error) => {
                    return Some(Ok(json!({
                        "success": false,
                        "message": error.to_string(),
                        "query": query,
                        "searchUrl": search_url,
                        "results": []
                    })));
                }
            };
            let html = response.into_string().unwrap_or_default();
            let mut rows = Vec::<Value>::new();
            if let Some(initial_data) = extract_initial_data(&html) {
                let mut seen = HashSet::<String>::new();
                collect_videos(&initial_data, limit, &mut rows, &mut seen);
            }
            if rows.is_empty() {
                for id in fallback_video_ids(&html, limit) {
                    rows.push(json!({
                        "videoId": id,
                        "title": "YouTube Result",
                        "channel": "",
                        "url": format!("https://www.youtube.com/watch?v={}", id),
                        "embedUrl": format!("https://www.youtube.com/embed/{}", id),
                        "thumbnail": format!("https://i.ytimg.com/vi/{}/hqdefault.jpg", id)
                    }));
                }
            }
            Ok(json!({
                "success": true,
                "query": query,
                "searchUrl": search_url,
                "results": rows
            }))
        }
        "youtube:open-video" => {
            let raw = args.get(0).and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
            if raw.is_empty() {
                return Some(Ok(json!({ "success": false, "message": "Missing URL" })));
            }
            let url = if raw.to_lowercase().starts_with("http://") || raw.to_lowercase().starts_with("https://") {
                raw
            } else {
                format!("https://{}", raw)
            };
            match open::that(&url) {
                Ok(_) => Ok(json!({ "success": true, "url": url })),
                Err(error) => Ok(json!({ "success": false, "message": error.to_string() })),
            }
        }
        _ => return None,
    };
    Some(result)
}
