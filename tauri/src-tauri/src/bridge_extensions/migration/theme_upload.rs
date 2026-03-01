use super::*;
use base64::Engine as _;

fn parse_data_url_payload(raw: &str) -> Option<(Vec<u8>, String, String)> {
    let value = raw.trim();
    if value.is_empty() {
        return None;
    }

    if value.contains(";base64,") {
        let mut parts = value.splitn(2, ";base64,");
        let mime_part = parts.next().unwrap_or("data:image/png");
        let data_part = parts.next().unwrap_or("");
        let mime = mime_part
            .trim()
            .trim_start_matches("data:")
            .trim()
            .to_string();
        let decoded = base64::engine::general_purpose::STANDARD
            .decode(data_part.trim())
            .ok()?;
        let ext = mime
            .split('/')
            .nth(1)
            .unwrap_or("png")
            .split(';')
            .next()
            .unwrap_or("png")
            .to_string();
        return Some((decoded, mime, ext));
    }

    let decoded = base64::engine::general_purpose::STANDARD
        .decode(value.as_bytes())
        .ok()?;
    Some((decoded, "image/gif".to_string(), "gif".to_string()))
}

fn append_multipart_text(body: &mut Vec<u8>, boundary: &str, name: &str, value: &str) {
    body.extend_from_slice(format!("--{}\r\n", boundary).as_bytes());
    body.extend_from_slice(
        format!("Content-Disposition: form-data; name=\"{}\"\r\n\r\n", name).as_bytes(),
    );
    body.extend_from_slice(value.as_bytes());
    body.extend_from_slice(b"\r\n");
}

fn append_multipart_file(
    body: &mut Vec<u8>,
    boundary: &str,
    field: &str,
    file_name: &str,
    content_type: &str,
    bytes: &[u8],
) {
    body.extend_from_slice(format!("--{}\r\n", boundary).as_bytes());
    body.extend_from_slice(
        format!(
            "Content-Disposition: form-data; name=\"{}\"; filename=\"{}\"\r\n",
            field, file_name
        )
        .as_bytes(),
    );
    body.extend_from_slice(format!("Content-Type: {}\r\n\r\n", content_type).as_bytes());
    body.extend_from_slice(bytes);
    body.extend_from_slice(b"\r\n");
}

pub(super) fn upload_theme_webhook(payload: &Value) -> bool {
    let webhook_url = super::downloads::ensure_http_url(
        payload
            .get("webhookUrl")
            .and_then(|v| v.as_str())
            .unwrap_or(""),
    );
    if webhook_url.is_empty() {
        return false;
    }
    let author = payload
        .get("author")
        .and_then(|v| v.as_str())
        .unwrap_or("Guest")
        .trim()
        .to_string();
    let name = payload
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("Unnamed Theme")
        .trim()
        .to_string();
    let mut theme_object = payload
        .get("themeObject")
        .cloned()
        .unwrap_or_else(|| json!({}));
    if let Some(obj) = theme_object.as_object_mut() {
        obj.insert("author".to_string(), Value::String(author.clone()));
    }
    let payload_json = json!({
        "content": format!("New theme submission: **{}** by user **{}**", name, author),
        "thread_name": name
    });

    let boundary = format!("----emubro-{}", unix_timestamp_ms());
    let mut body = Vec::<u8>::new();
    append_multipart_text(&mut body, &boundary, "payload_json", &payload_json.to_string());
    let theme_bytes = serde_json::to_vec_pretty(&theme_object).unwrap_or_else(|_| b"{}".to_vec());
    append_multipart_file(
        &mut body,
        &boundary,
        "files[0]",
        "theme.json",
        "application/json",
        &theme_bytes,
    );

    if let Some((bytes, mime, ext)) = payload
        .get("base64Image")
        .and_then(|v| v.as_str())
        .and_then(parse_data_url_payload)
    {
        let filename = theme_object
            .get("background")
            .and_then(|v| v.get("image"))
            .and_then(|v| v.as_str())
            .filter(|v| !v.trim().is_empty())
            .map(|v| v.trim().to_string())
            .unwrap_or_else(|| format!("preview.{}", ext));
        append_multipart_file(&mut body, &boundary, "files[1]", &filename, &mime, &bytes);
    }

    if let Some((bytes, mime, ext)) = payload
        .get("topBase64Image")
        .and_then(|v| v.as_str())
        .and_then(parse_data_url_payload)
    {
        let filename = theme_object
            .get("background")
            .and_then(|v| v.get("topImage"))
            .and_then(|v| v.as_str())
            .filter(|v| !v.trim().is_empty())
            .map(|v| v.trim().to_string())
            .unwrap_or_else(|| format!("top-preview.{}", ext));
        append_multipart_file(&mut body, &boundary, "files[2]", &filename, &mime, &bytes);
    }

    body.extend_from_slice(format!("--{}--\r\n", boundary).as_bytes());
    let content_type = format!("multipart/form-data; boundary={}", boundary);
    let client = ureq::AgentBuilder::new()
        .timeout(std::time::Duration::from_secs(45))
        .build();
    match client
        .post(&webhook_url)
        .set("Content-Type", &content_type)
        .set("User-Agent", "emuBro-Tauri/0.1")
        .send_bytes(&body)
    {
        Ok(response) => response.status() >= 200 && response.status() < 300,
        Err(_) => false,
    }
}
