use super::*;
use serde_json::json;
use std::collections::HashSet;
use std::time::Duration;
use tauri::Manager;
#[cfg(target_os = "windows")]
use std::process::Command;

const COMMUNITY_BROWSER_USER_AGENT: &str =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 emuBro/desktop";
const COMMUNITY_BROWSER_BACKGROUND: tauri::utils::config::Color =
    tauri::utils::config::Color(16, 26, 44, 255);
const COMMUNITY_FEED_LIMIT_MAX: usize = 10;
const COMMUNITY_BLUESKY_HANDLE: &str = "emubro.bsky.social";
const COMMUNITY_REDDIT_SUBREDDIT: &str = "emuBro";
const COMMUNITY_YOUTUBE_CHANNEL_ID: &str = "UC9zQuEiPjnRv2LXVqR57K1Q";

pub(crate) fn close_community_windows(app_handle: &tauri::AppHandle) -> i64 {
    let mut closed = 0i64;
    for (label, webview_window) in app_handle.webview_windows() {
        if label == "community-browser" || label.starts_with("community-") {
            if webview_window.close().is_ok() {
                closed += 1;
            }
        }
    }
    closed
}

fn should_force_external_community_host(url: &url::Url) -> bool {
    let host = url.host_str().unwrap_or("").trim().to_ascii_lowercase();
    matches!(
        host.as_str(),
        "discord.com"
            | "www.discord.com"
            | "x.com"
            | "www.x.com"
            | "twitter.com"
            | "www.twitter.com"
            | "bsky.app"
            | "www.bsky.app"
            | "reddit.com"
            | "www.reddit.com"
            | "youtube.com"
            | "www.youtube.com"
            | "m.youtube.com"
            | "youtu.be"
    )
}

fn community_http_text(url: &str) -> Result<String, String> {
    let agent = ureq::AgentBuilder::new()
        .timeout(Duration::from_secs(12))
        .build();
    let response = match agent
        .get(url)
        .set("user-agent", COMMUNITY_BROWSER_USER_AGENT)
        .set("accept-language", "en-US,en;q=0.9")
        .call()
    {
        Ok(response) => response,
        Err(ureq::Error::Status(code, response)) => {
            let body = response.into_string().unwrap_or_default();
            let detail = body.lines().next().unwrap_or_default().trim().to_string();
            let message = if detail.is_empty() {
                format!("Request failed with status {}.", code)
            } else {
                format!("Request failed with status {}: {}", code, detail)
            };
            return Err(message);
        }
        Err(ureq::Error::Transport(error)) => return Err(error.to_string()),
    };
    response.into_string().map_err(|error| error.to_string())
}

fn community_http_json(url: &str) -> Result<Value, String> {
    let text = community_http_text(url)?;
    serde_json::from_str::<Value>(&text).map_err(|error| error.to_string())
}

fn decode_html_entities(text: &str) -> String {
    text.replace("&amp;", "&")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("\\u0026", "&")
}

fn trim_excerpt(text: &str, max_chars: usize) -> String {
    let normalized = text
        .split_whitespace()
        .collect::<Vec<&str>>()
        .join(" ")
        .trim()
        .to_string();
    if normalized.chars().count() <= max_chars {
        return normalized;
    }
    let trimmed = normalized.chars().take(max_chars.saturating_sub(1)).collect::<String>();
    format!("{}...", trimmed.trim())
}

fn title_from_text(text: &str, fallback: &str) -> String {
    let normalized = trim_excerpt(text, 88);
    if normalized.is_empty() {
        fallback.to_string()
    } else {
        normalized
    }
}

fn stat_pill(value: i64, label: &str) -> Option<String> {
    if value <= 0 {
        return None;
    }
    Some(format!("{} {}", value, label))
}

fn parse_bsky_post_url(handle: &str, uri: &str) -> String {
    let rkey = uri.rsplit('/').next().unwrap_or("").trim();
    if handle.is_empty() || rkey.is_empty() {
        return format!("https://bsky.app/profile/{}", handle);
    }
    format!("https://bsky.app/profile/{}/post/{}", handle, rkey)
}

fn fetch_bluesky_feed(limit: usize) -> Result<Value, String> {
    let url = format!(
        "https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor={}&limit={}",
        urlencoding::encode(COMMUNITY_BLUESKY_HANDLE),
        limit
    );
    let payload = community_http_json(&url)?;
    let items = payload
        .get("feed")
        .and_then(|value| value.as_array())
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .filter_map(|row| {
            let post = row.get("post")?;
            let record = post.get("record").unwrap_or(&Value::Null);
            let text = record
                .get("text")
                .and_then(|value| value.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            let handle = post
                .get("author")
                .and_then(|value| value.get("handle"))
                .and_then(|value| value.as_str())
                .unwrap_or(COMMUNITY_BLUESKY_HANDLE)
                .trim()
                .to_string();
            let uri = post
                .get("uri")
                .and_then(|value| value.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            let thumbnail = row
                .get("post")
                .and_then(|value| value.get("embed"))
                .and_then(|value| value.get("images"))
                .and_then(|value| value.as_array())
                .and_then(|value| value.first())
                .and_then(|value| value.get("thumb"))
                .and_then(|value| value.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            let reply_count = post.get("replyCount").and_then(|value| value.as_i64()).unwrap_or(0);
            let repost_count = post.get("repostCount").and_then(|value| value.as_i64()).unwrap_or(0);
            let like_count = post.get("likeCount").and_then(|value| value.as_i64()).unwrap_or(0);
            let stats = [
                stat_pill(reply_count, "replies"),
                stat_pill(repost_count, "reposts"),
                stat_pill(like_count, "likes"),
            ]
            .into_iter()
            .flatten()
            .collect::<Vec<String>>();

            Some(json!({
                "id": post.get("cid").and_then(|value| value.as_str()).unwrap_or(&uri),
                "title": title_from_text(&text, "Bluesky post"),
                "excerpt": trim_excerpt(&text, 220),
                "url": parse_bsky_post_url(&handle, &uri),
                "publishedAt": record.get("createdAt").and_then(|value| value.as_str()).unwrap_or(""),
                "author": format!("@{}", handle),
                "thumbnail": thumbnail,
                "badge": "Post",
                "stats": stats
            }))
        })
        .collect::<Vec<Value>>();

    Ok(json!({
        "success": true,
        "platform": "bluesky",
        "mode": "feed",
        "fetchedAt": "",
        "items": items
    }))
}

fn fetch_reddit_feed(limit: usize) -> Result<Value, String> {
    let url = format!(
        "https://www.reddit.com/r/{}/new.json?limit={}",
        COMMUNITY_REDDIT_SUBREDDIT,
        limit
    );
    let payload = community_http_json(&url)?;
    let items = payload
        .get("data")
        .and_then(|value| value.get("children"))
        .and_then(|value| value.as_array())
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .filter_map(|row| {
            let data = row.get("data")?;
            let title = data.get("title").and_then(|value| value.as_str()).unwrap_or("").trim().to_string();
            let excerpt = data
                .get("selftext")
                .and_then(|value| value.as_str())
                .map(|value| trim_excerpt(value, 220))
                .filter(|value| !value.is_empty())
                .unwrap_or_else(|| {
                    let domain = data.get("domain").and_then(|value| value.as_str()).unwrap_or("").trim();
                    if domain.is_empty() {
                        "Open the Reddit thread for the full discussion.".to_string()
                    } else {
                        format!("Linked from {}.", domain)
                    }
                });
            let permalink = data.get("permalink").and_then(|value| value.as_str()).unwrap_or("").trim();
            let thumbnail = data
                .get("preview")
                .and_then(|value| value.get("images"))
                .and_then(|value| value.as_array())
                .and_then(|value| value.first())
                .and_then(|value| value.get("source"))
                .and_then(|value| value.get("url"))
                .and_then(|value| value.as_str())
                .map(decode_html_entities)
                .unwrap_or_default();
            let stats = [
                stat_pill(data.get("ups").and_then(|value| value.as_i64()).unwrap_or(0), "upvotes"),
                stat_pill(
                    data.get("num_comments").and_then(|value| value.as_i64()).unwrap_or(0),
                    "comments",
                ),
            ]
            .into_iter()
            .flatten()
            .collect::<Vec<String>>();
            Some(json!({
                "id": data.get("name").and_then(|value| value.as_str()).unwrap_or(""),
                "title": if title.is_empty() { "Reddit thread".to_string() } else { title },
                "excerpt": excerpt,
                "url": format!("https://www.reddit.com{}", permalink),
                "publishedAt": data.get("created_utc").and_then(|value| value.as_f64()).unwrap_or(0.0) * 1000.0,
                "author": format!("u/{}", data.get("author").and_then(|value| value.as_str()).unwrap_or("unknown")),
                "thumbnail": thumbnail,
                "badge": data.get("link_flair_text").and_then(|value| value.as_str()).unwrap_or("Thread"),
                "stats": stats
            }))
        })
        .collect::<Vec<Value>>();

    Ok(json!({
        "success": true,
        "platform": "reddit",
        "mode": "feed",
        "fetchedAt": "",
        "items": items
    }))
}

fn extract_youtube_initial_data(html: &str) -> Option<Value> {
    let marker = "var ytInitialData = ";
    let start_idx = html.find(marker)?;
    let start = start_idx + marker.len();
    let end = html[start..]
        .find(";</script>")
        .map(|value| start + value)
        .or_else(|| html[start..].find(";\n").map(|value| start + value))?;
    let raw = html[start..end].trim();
    if raw.is_empty() {
        return None;
    }
    serde_json::from_str::<Value>(raw).ok()
}

fn youtube_renderer_text(node: &Value) -> String {
    if let Some(text) = node.get("simpleText").and_then(|value| value.as_str()) {
        return text.trim().to_string();
    }
    node.get("runs")
        .and_then(|value| value.as_array())
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .filter_map(|row| row.get("text").and_then(|value| value.as_str()).map(|value| value.trim().to_string()))
        .filter(|value| !value.is_empty())
        .collect::<Vec<String>>()
        .join("")
}

fn collect_youtube_videos(node: &Value, limit: usize, out: &mut Vec<Value>, seen: &mut HashSet<String>) {
    if out.len() >= limit {
        return;
    }
    if let Some(video) = node.get("videoRenderer").and_then(|value| value.as_object()) {
        let id = video
            .get("videoId")
            .and_then(|value| value.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if !id.is_empty() && seen.insert(id.clone()) {
            let title = youtube_renderer_text(video.get("title").unwrap_or(&Value::Null));
            let channel = youtube_renderer_text(
                video
                    .get("ownerText")
                    .or_else(|| video.get("longBylineText"))
                    .unwrap_or(&Value::Null),
            );
            let published = youtube_renderer_text(video.get("publishedTimeText").unwrap_or(&Value::Null));
            let views = youtube_renderer_text(video.get("viewCountText").unwrap_or(&Value::Null));
            let thumbnail = video
                .get("thumbnail")
                .and_then(|value| value.get("thumbnails"))
                .and_then(|value| value.as_array())
                .and_then(|value| value.last())
                .and_then(|value| value.get("url"))
                .and_then(|value| value.as_str())
                .map(decode_html_entities)
                .unwrap_or_else(|| format!("https://i.ytimg.com/vi/{}/hqdefault.jpg", id));
            let stats = [published.clone(), views]
                .into_iter()
                .filter(|value| !value.trim().is_empty())
                .collect::<Vec<String>>();
            out.push(json!({
                "id": id.clone(),
                "title": if title.is_empty() { "YouTube upload".to_string() } else { title },
                "excerpt": if published.is_empty() {
                    "Latest upload from the emuBro channel.".to_string()
                } else {
                    published.clone()
                },
                "url": format!("https://www.youtube.com/watch?v={}", id),
                "publishedAt": "",
                "author": channel,
                "thumbnail": thumbnail,
                "badge": "Video",
                "stats": stats
            }));
        }
    }
    match node {
        Value::Array(rows) => {
            for row in rows {
                collect_youtube_videos(row, limit, out, seen);
                if out.len() >= limit {
                    break;
                }
            }
        }
        Value::Object(map) => {
            for value in map.values() {
                collect_youtube_videos(value, limit, out, seen);
                if out.len() >= limit {
                    break;
                }
            }
        }
        _ => {}
    }
}

fn fallback_youtube_video_ids(html: &str, limit: usize) -> Vec<String> {
    let marker = "\"videoId\":\"";
    let mut out = Vec::<String>::new();
    let mut seen = HashSet::<String>::new();
    let mut cursor = 0usize;
    while let Some(position) = html[cursor..].find(marker) {
        let start = cursor + position + marker.len();
        let Some(rest) = html.get(start..) else {
            break;
        };
        let id = rest.chars().take(11).collect::<String>();
        if id.len() == 11
            && id
                .chars()
                .all(|ch| ch.is_ascii_alphanumeric() || ch == '-' || ch == '_')
            && seen.insert(id.clone())
        {
            out.push(id);
            if out.len() >= limit {
                break;
            }
        }
        cursor = start;
        if cursor >= html.len() {
            break;
        }
    }
    out
}

fn fetch_youtube_feed(limit: usize) -> Result<Value, String> {
    let channel_url = format!(
        "https://www.youtube.com/channel/{}/videos",
        COMMUNITY_YOUTUBE_CHANNEL_ID
    );
    let html = community_http_text(&channel_url)?;
    let mut items = Vec::<Value>::new();
    if let Some(initial_data) = extract_youtube_initial_data(&html) {
        let mut seen = HashSet::<String>::new();
        collect_youtube_videos(&initial_data, limit, &mut items, &mut seen);
    }
    if items.is_empty() {
        for id in fallback_youtube_video_ids(&html, limit) {
            items.push(json!({
                "id": id,
                "title": "YouTube upload",
                "excerpt": "Latest upload from the emuBro channel.",
                "url": format!("https://www.youtube.com/watch?v={}", id),
                "publishedAt": "",
                "author": "emuBro",
                "thumbnail": format!("https://i.ytimg.com/vi/{}/hqdefault.jpg", id),
                "badge": "Video",
                "stats": []
            }));
        }
    }
    Ok(json!({
        "success": true,
        "platform": "youtube",
        "mode": "feed",
        "fetchedAt": "",
        "items": items
    }))
}

fn build_static_platform_view(platform: &str) -> Value {
    match platform {
        "discord" => json!({
            "success": true,
            "platform": "discord",
            "mode": "guide",
            "fetchedAt": "",
            "items": [],
            "message": "Discord works best as the live chat room for setup help, screenshots, and quick back-and-forth while the public shell view keeps the launch actions nearby."
        }),
        "twitter" | "x" => json!({
            "success": true,
            "platform": "twitter",
            "mode": "limited",
            "fetchedAt": "",
            "items": [],
            "message": "Live X timeline loading stays limited here because the public X profile feed is not reliable without authenticated API access."
        }),
        _ => json!({
            "success": false,
            "platform": platform,
            "mode": "unknown",
            "items": [],
            "message": format!("Unsupported community platform: {}", platform)
        }),
    }
}

fn fetch_platform_feed(platform: &str, limit: usize) -> Result<Value, String> {
    match platform {
        "bluesky" => fetch_bluesky_feed(limit),
        "reddit" => fetch_reddit_feed(limit),
        "youtube" => fetch_youtube_feed(limit),
        "discord" | "twitter" | "x" => Ok(build_static_platform_view(platform)),
        _ => Ok(build_static_platform_view(platform)),
    }
}

pub(super) fn handle(ch: &str, args: &[Value], window: &Window) -> Result<Value, String> {
    match ch {
        "open-external-url" => {
            let raw_url = args.get(0).and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
            if raw_url.is_empty() {
                return Ok(json!({ "success": false, "message": "Missing URL" }));
            }
            let normalized = if raw_url.to_lowercase().starts_with("http://")
                || raw_url.to_lowercase().starts_with("https://")
            {
                raw_url
            } else {
                format!("https://{}", raw_url)
            };
            match open::that(&normalized) {
                Ok(_) => Ok(json!({ "success": true, "url": normalized })),
                Err(err) => Ok(json!({ "success": false, "message": err.to_string() })),
            }
        }
        "community:get-platform-feed" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let platform = payload
                .get("platform")
                .and_then(|value| value.as_str())
                .unwrap_or("")
                .trim()
                .to_ascii_lowercase();
            let limit = payload
                .get("limit")
                .and_then(|value| value.as_u64())
                .map(|value| value.clamp(1, COMMUNITY_FEED_LIMIT_MAX as u64) as usize)
                .unwrap_or(6);
            if platform.is_empty() {
                return Ok(json!({ "success": false, "message": "Missing community platform." }));
            }
            match fetch_platform_feed(&platform, limit) {
                Ok(result) => Ok(result),
                Err(error) => Ok(json!({
                    "success": false,
                    "platform": platform,
                    "message": error,
                    "items": []
                })),
            }
        }
        "community:open-in-app-window" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let raw_url = payload
                .get("url")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if raw_url.is_empty() {
                return Ok(json!({ "success": false, "message": "Missing URL" }));
            }
            let normalized = if raw_url.to_lowercase().starts_with("http://")
                || raw_url.to_lowercase().starts_with("https://")
            {
                raw_url
            } else {
                format!("https://{}", raw_url)
            };

            let parsed_url = match url::Url::parse(&normalized) {
                Ok(value) => value,
                Err(error) => {
                    return Ok(json!({ "success": false, "message": error.to_string() }));
                }
            };
            if parsed_url.scheme() != "http" && parsed_url.scheme() != "https" {
                return Ok(json!({ "success": false, "message": "Only http(s) community URLs are supported." }));
            }

            if should_force_external_community_host(&parsed_url) {
                eprintln!(
                    "[community] forcing external fallback for host {} due to blank WebView behavior",
                    parsed_url.host_str().unwrap_or("")
                );
                return match open::that(&normalized) {
                    Ok(_) => Ok(json!({
                        "success": true,
                        "label": "",
                        "url": normalized,
                        "fallback": "external-browser",
                        "message": "Opened in your browser because this community site currently renders blank inside the Tauri webview."
                    })),
                    Err(error) => Ok(json!({ "success": false, "message": error.to_string() })),
                };
            }

            let title = payload
                .get("title")
                .and_then(|v| v.as_str())
                .unwrap_or("emuBro Community")
                .trim()
                .to_string();
            let app_handle = window.app_handle().clone();
            let label = "community-browser".to_string();

            let open_external_fallback = |url: &str| -> Result<Value, String> {
                match open::that(url) {
                    Ok(_) => Ok(json!({
                        "success": true,
                        "label": "",
                        "url": url,
                        "fallback": "external-browser"
                    })),
                    Err(error) => Ok(json!({ "success": false, "message": error.to_string() })),
                }
            };

            if let Some(existing_window) = app_handle.get_webview_window(&label) {
                let _ = existing_window.set_title(&title);
                let navigate_result = existing_window.navigate(parsed_url.clone());
                if navigate_result.is_ok() {
                    let _ = existing_window.show();
                    let _ = existing_window.set_focus();
                    return Ok(json!({ "success": true, "label": label, "url": normalized, "reused": true }));
                }
                let _ = existing_window.close();
            }
            for (existing_label, existing_window) in app_handle.webview_windows() {
                if existing_label.starts_with("community-") && existing_label != label {
                    let _ = existing_window.close();
                }
            }

            let page_title = title.clone();
            let builder = tauri::WebviewWindowBuilder::new(
                &app_handle,
                label.clone(),
                tauri::WebviewUrl::External(parsed_url),
            )
            .title(title.clone())
            .inner_size(1360.0, 900.0)
            .min_inner_size(900.0, 620.0)
            .resizable(true)
            .visible(true)
            .closable(true)
            .decorations(true)
            .always_on_top(false)
            .background_color(COMMUNITY_BROWSER_BACKGROUND)
            .incognito(true)
            .user_agent(COMMUNITY_BROWSER_USER_AGENT)
            .on_navigation(|_url| true)
            .on_page_load(move |community_window, payload| {
                eprintln!(
                    "[community] page {:?} {}",
                    payload.event(),
                    payload.url().as_str()
                );
                if matches!(payload.event(), tauri::webview::PageLoadEvent::Finished) {
                    let _ = community_window.set_title(&page_title);
                }
            })
            .initialization_script(
                r#"
                    window.addEventListener('keydown', (event) => {
                        if (event.key !== 'Escape' && !(event.ctrlKey && (event.key === 'w' || event.key === 'W'))) return;
                        try { window.close(); } catch (_e) {}
                    });
                "#,
            )
            .center();

            match builder.build() {
                Ok(new_window) => {
                    eprintln!("[community] created in-app window for {}", normalized);
                    let _ = new_window.set_decorations(true);
                    let _ = new_window.set_resizable(true);
                    let _ = new_window.show();
                    let _ = new_window.set_focus();
                    Ok(json!({ "success": true, "label": label, "url": normalized }))
                }
                Err(error) => {
                    eprintln!("[community] failed to create in-app window: {}", error);
                    open_external_fallback(&normalized)
                }
            }
        }
        "community:close-in-app-windows" => {
            let app_handle = window.app_handle().clone();
            let closed = close_community_windows(&app_handle);
            Ok(json!({ "success": true, "closed": closed }))
        }
        "show-item-in-folder" => {
            let raw_path = args.get(0).and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
            if raw_path.is_empty() {
                return Ok(json!({ "success": false, "message": "Missing path" }));
            }
            let normalized_input = if cfg!(target_os = "windows") {
                raw_path.replace('/', "\\")
            } else {
                raw_path.clone()
            };
            let target = PathBuf::from(&normalized_input);
            if !target.exists() {
                return Ok(json!({ "success": false, "message": "Path not found" }));
            }
            #[cfg(target_os = "windows")]
            {
                let explorer_target = std::fs::canonicalize(&target)
                    .unwrap_or_else(|_| target.clone())
                    .to_string_lossy()
                    .replace('/', "\\");
                let explorer_target = explorer_target
                    .strip_prefix(r"\\?\")
                    .map(str::to_string)
                    .unwrap_or(explorer_target);

                let status = if target.is_file() {
                    Command::new("explorer")
                        .arg(format!("/select,\"{}\"", explorer_target))
                        .status()
                } else {
                    Command::new("explorer").arg(&explorer_target).status()
                };
                match status {
                    Ok(_) => return Ok(json!({ "success": true })),
                    Err(err) => return Ok(json!({ "success": false, "message": err.to_string() })),
                }
            }
            #[cfg(not(target_os = "windows"))]
            {
                let open_target = if target.is_file() {
                    target.parent().unwrap_or(&target).to_path_buf()
                } else {
                    target.clone()
                };
                match open::that(open_target) {
                    Ok(_) => Ok(json!({ "success": true })),
                    Err(err) => Ok(json!({ "success": false, "message": err.to_string() })),
                }
            }
        }
        _ => Ok(json!({ "success": false, "message": format!("Unsupported community channel: {}", ch) })),
    }
}
