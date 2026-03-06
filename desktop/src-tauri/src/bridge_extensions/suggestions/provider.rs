use super::*;
use std::time::Duration;

pub(super) fn normalize_provider(value: &str) -> String {
    match value.trim().to_lowercase().as_str() {
        "openai" => "openai".to_string(),
        "gemini" => "gemini".to_string(),
        _ => "ollama".to_string(),
    }
}

pub(super) fn normalize_mode(value: &str) -> String {
    match value.trim().to_lowercase().as_str() {
        "library-only" => "library-only".to_string(),
        _ => "library-plus-missing".to_string(),
    }
}

pub(super) fn normalize_temperature(value: Option<f64>, fallback: f64) -> f64 {
    let parsed = value.unwrap_or(fallback);
    parsed.clamp(0.0, 2.0)
}
pub(super) fn extract_json_from_text(raw: &str) -> Option<Value> {
    let text = raw.trim();
    if text.is_empty() {
        return None;
    }
    if let Ok(parsed) = serde_json::from_str::<Value>(text) {
        return Some(parsed);
    }
    if let Some(start) = text.find("```") {
        if let Some(end_rel) = text[start + 3..].find("```") {
            let fenced = text[start + 3..start + 3 + end_rel]
                .trim_start_matches("json")
                .trim();
            if let Ok(parsed) = serde_json::from_str::<Value>(fenced) {
                return Some(parsed);
            }
        }
    }
    let first = text.find('{')?;
    let last = text.rfind('}')?;
    if last <= first {
        return None;
    }
    serde_json::from_str::<Value>(&text[first..=last]).ok()
}

fn extract_text_from_value(value: &Value) -> String {
    if let Some(text) = value.as_str() {
        return text.trim().to_string();
    }
    if let Some(items) = value.as_array() {
        let mut out = Vec::<String>::new();
        for item in items {
            if let Some(text) = item.as_str() {
                let trimmed = text.trim();
                if !trimmed.is_empty() {
                    out.push(trimmed.to_string());
                }
                continue;
            }
            if let Some(text) = item.get("text").and_then(|v| v.as_str()) {
                let trimmed = text.trim();
                if !trimmed.is_empty() {
                    out.push(trimmed.to_string());
                }
            }
        }
        return out.join("\n").trim().to_string();
    }
    String::new()
}

fn extract_model_text(payload: &Value) -> String {
    let parsed = if payload.is_object() || payload.is_array() {
        Some(payload.clone())
    } else {
        extract_json_from_text(payload.as_str().unwrap_or(""))
            .or_else(|| extract_json_from_text(payload.get("text").and_then(|v| v.as_str()).unwrap_or("")))
    };
    let Some(parsed) = parsed else {
        return payload
            .get("text")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
    };
    if let Some(content) = parsed
        .get("choices")
        .and_then(|v| v.as_array())
        .and_then(|rows| rows.first())
        .and_then(|row| row.get("message"))
        .and_then(|v| v.get("content"))
    {
        let text = extract_text_from_value(content);
        if !text.is_empty() {
            return text;
        }
    }
    if let Some(text) = parsed
        .get("choices")
        .and_then(|v| v.as_array())
        .and_then(|rows| rows.first())
        .and_then(|row| row.get("text"))
        .and_then(|v| v.as_str())
    {
        let trimmed = text.trim();
        if !trimmed.is_empty() {
            return trimmed.to_string();
        }
    }
    if let Some(text) = parsed.get("response").and_then(|v| v.as_str()) {
        let trimmed = text.trim();
        if !trimmed.is_empty() {
            return trimmed.to_string();
        }
    }
    if let Some(content) = parsed.get("message").and_then(|v| v.get("content")) {
        let text = extract_text_from_value(content);
        if !text.is_empty() {
            return text;
        }
    }
    if let Some(text) = parsed
        .get("candidates")
        .and_then(|v| v.as_array())
        .and_then(|rows| rows.first())
        .and_then(|row| row.get("content"))
        .and_then(|v| v.get("parts"))
        .and_then(|v| v.as_array())
        .and_then(|parts| parts.first())
        .and_then(|part| part.get("text"))
        .and_then(|v| v.as_str())
    {
        let trimmed = text.trim();
        if !trimmed.is_empty() {
            return trimmed.to_string();
        }
    }
    if let Some(text) = parsed.get("output_text").and_then(|v| v.as_str()) {
        let trimmed = text.trim();
        if !trimmed.is_empty() {
            return trimmed.to_string();
        }
    }
    if let Some(text) = parsed
        .get("generated_text")
        .or_else(|| parsed.get("completion"))
        .and_then(|v| v.as_str())
    {
        let trimmed = text.trim();
        if !trimmed.is_empty() {
            return trimmed.to_string();
        }
    }
    if let Some(text) = parsed.get("text").and_then(|v| v.as_str()) {
        let trimmed = text.trim();
        if !trimmed.is_empty() {
            return trimmed.to_string();
        }
    }
    String::new()
}

fn ureq_json_request(
    method: &str,
    url: &str,
    headers: &[(&str, &str)],
    body: Option<&Value>,
) -> Result<Value, String> {
    let agent = ureq::AgentBuilder::new().timeout(Duration::from_secs(45)).build();
    let mut req = match method {
        "POST" => agent.post(url),
        _ => agent.get(url),
    };
    for (k, v) in headers {
        req = req.set(k, v);
    }
    let response = if method == "POST" {
        req.send_json(body.cloned().unwrap_or_else(|| json!({})))
    } else {
        req.call()
    };
    let response = match response {
        Ok(value) => value,
        Err(ureq::Error::Status(code, resp)) => {
            let msg = resp.into_string().unwrap_or_default();
            return Err(format!("HTTP {}: {}", code, msg.trim()));
        }
        Err(ureq::Error::Transport(err)) => return Err(err.to_string()),
    };
    let text = response.into_string().map_err(|e| e.to_string())?;
    serde_json::from_str::<Value>(&text).map_err(|e| format!("Invalid JSON response: {}", e))
}

pub(super) fn relay_post_json(payload: &Value, path: &str, body: &Value) -> Result<Value, String> {
    let host_url = relay_host_url_from_payload(payload);
    if host_url.is_empty() {
        return Err("Set a relay host URL first in Settings -> AI / LLM.".to_string());
    }
    let url = format!(
        "{}/{}",
        host_url.trim_end_matches('/'),
        path.trim_start_matches('/')
    );
    let token = relay_auth_token_from_payload(payload);
    let client_host = super::relay::relay_client_name();
    let agent = ureq::AgentBuilder::new().timeout(Duration::from_secs(45)).build();
    let mut request = agent.post(&url).set("content-type", "application/json");
    if !token.is_empty() {
        request = request.set("x-emubro-relay-token", &token);
    }
    if !client_host.is_empty() {
        request = request.set("x-emubro-client-host", &client_host);
    }
    let response = match request.send_json(body.clone()) {
        Ok(value) => value,
        Err(ureq::Error::Status(code, resp)) => {
            let msg = resp.into_string().unwrap_or_default();
            return Err(format!("Relay HTTP {}: {}", code, msg.trim()));
        }
        Err(ureq::Error::Transport(err)) => return Err(err.to_string()),
    };
    let text = response.into_string().map_err(|e| e.to_string())?;
    serde_json::from_str::<Value>(&text).map_err(|e| format!("Invalid relay JSON response: {}", e))
}

pub(super) fn list_ollama_models_for_base(base_url: &str) -> Result<Vec<String>, String> {
    let base = base_url.trim().trim_end_matches('/').to_string();
    let url_tags = format!("{}/api/tags", base);
    let url_v1 = format!("{}/v1/models", base);
    let mut models = Vec::<String>::new();
    let mut errors = Vec::<String>::new();

    match ureq_json_request("GET", &url_tags, &[], None) {
        Ok(data) => {
            for row in data
                .get("models")
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default()
            {
                if let Some(name) = row
                    .get("name")
                    .or_else(|| row.get("model"))
                    .and_then(|v| v.as_str())
                    .map(|s| s.trim().to_string())
                {
                    if !name.is_empty() {
                        models.push(name);
                    }
                }
            }
        }
        Err(error) => errors.push(error),
    }
    match ureq_json_request("GET", &url_v1, &[], None) {
        Ok(data) => {
            for row in data
                .get("data")
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default()
            {
                if let Some(name) = row
                    .get("id")
                    .or_else(|| row.get("name"))
                    .and_then(|v| v.as_str())
                    .map(|s| s.trim().to_string())
                {
                    if !name.is_empty() {
                        models.push(name);
                    }
                }
            }
        }
        Err(error) => errors.push(error),
    }
    models.sort();
    models.dedup();
    if models.is_empty() {
        return Err(errors.join(" | "));
    }
    Ok(models)
}

pub(super) fn request_provider_text(payload: &Value, prompt: &str) -> Result<String, String> {
    if relay_enabled_for_payload(payload) {
        let body = json!({
            "payload": sanitize_relay_payload(payload),
            "options": {
                "prompt": prompt,
                "temperature": normalize_temperature(payload.get("temperature").and_then(|v| v.as_f64()), 0.8)
            }
        });
        let response = relay_post_json(payload, "/api/llm/request-text", &body)?;
        if !response.get("success").and_then(|v| v.as_bool()).unwrap_or(false) {
            return Err(
                response
                    .get("message")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Relay request failed.")
                    .to_string(),
            );
        }
        let text = response
            .get("text")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if text.is_empty() {
            return Err("Relay returned an empty response.".to_string());
        }
        return Ok(text);
    }

    let provider = normalize_provider(payload.get("provider").and_then(|v| v.as_str()).unwrap_or(""));
    let model = payload
        .get("model")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let base_url = payload
        .get("baseUrl")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let api_key = payload
        .get("apiKey")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let temperature = normalize_temperature(payload.get("temperature").and_then(|v| v.as_f64()), 0.8);

    if model.is_empty() {
        return Err("Model is required.".to_string());
    }
    if base_url.is_empty() {
        return Err("Provider base URL is required.".to_string());
    }

    let response = match provider.as_str() {
        "openai" => {
            if api_key.is_empty() {
                return Err("API key is required for OpenAI.".to_string());
            }
            let url = format!("{}/chat/completions", base_url.trim_end_matches('/'));
            let auth = format!("Bearer {}", api_key);
            let body = json!({
                "model": model,
                "temperature": temperature,
                "messages": [{ "role": "user", "content": prompt }]
            });
            ureq_json_request("POST", &url, &[("Authorization", &auth)], Some(&body))?
        }
        "gemini" => {
            if api_key.is_empty() {
                return Err("API key is required for Gemini.".to_string());
            }
            let root = base_url.trim_end_matches('/');
            let model_path = model.trim_start_matches("models/");
            let url = format!("{}/models/{}:generateContent?key={}", root, model_path, api_key);
            let body = json!({
                "contents": [{ "parts": [{ "text": prompt }] }],
                "generationConfig": { "temperature": temperature }
            });
            ureq_json_request("POST", &url, &[], Some(&body))?
        }
        _ => {
            let url = format!("{}/api/generate", base_url.trim_end_matches('/'));
            let body = json!({
                "model": model,
                "prompt": prompt,
                "stream": false,
                "options": { "temperature": temperature }
            });
            ureq_json_request("POST", &url, &[], Some(&body))?
        }
    };

    let text = extract_model_text(&response);
    if text.is_empty() {
        let response_preview = response.to_string();
        let clipped = response_preview.chars().take(320).collect::<String>();
        return Err(format!(
            "Provider returned an empty response. Raw preview: {}",
            clipped
        ));
    }
    Ok(text)
}
