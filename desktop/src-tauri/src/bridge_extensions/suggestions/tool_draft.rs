use super::*;
use serde_json::json;

fn sanitize_field(value: Option<&Value>, max_len: usize) -> String {
    let raw = value.and_then(|v| v.as_str()).unwrap_or("").trim();
    raw.chars().take(max_len).collect::<String>()
}

fn normalize_tool_draft(value: &Value) -> Value {
    let draft_obj = if value.get("draft").and_then(|v| v.as_object()).is_some() {
        value.get("draft").unwrap_or(value)
    } else {
        value
    };

    json!({
        "name": sanitize_field(draft_obj.get("name"), 120),
        "description": sanitize_field(draft_obj.get("description"), 240),
        "commandPath": sanitize_field(draft_obj.get("commandPath"), 500),
        "args": sanitize_field(draft_obj.get("args"), 800),
        "workingDirectory": sanitize_field(draft_obj.get("workingDirectory"), 500),
        "notes": sanitize_field(draft_obj.get("notes"), 1200)
    })
}

fn build_tool_draft_prompt(user_prompt: &str) -> String {
    format!(
        r#"You are generating a desktop tool launcher draft for emuBro.

Return ONLY JSON (no markdown, no prose) with this exact shape:
{{
  "name": "...",
  "description": "...",
  "commandPath": "...",
  "args": "...",
  "workingDirectory": "...",
  "notes": "..."
}}

Rules:
- Keep fields concise and practical.
- Use absolute Windows-style paths when relevant.
- If uncertain, leave unknown fields as empty string instead of guessing.
- Do not include keys outside the required shape.

User request:
{}
"#,
        user_prompt
    )
}

pub(super) fn handle(channel: &str, args: &[Value]) -> Option<Result<Value, String>> {
    if channel != "suggestions:generate-tool-draft" {
        return None;
    }

    let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
    let prompt = payload
        .get("prompt")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();

    if prompt.is_empty() {
        return Some(Ok(json!({
            "success": false,
            "message": "Prompt is required.",
            "draft": null
        })));
    }

    let full_prompt = build_tool_draft_prompt(&prompt);
    let provider = normalize_provider(payload.get("provider").and_then(|v| v.as_str()).unwrap_or(""));
    let mode = normalize_mode(payload.get("llmMode").and_then(|v| v.as_str()).unwrap_or(""));

    let result = match request_provider_text(&payload, &full_prompt) {
        Ok(raw_text) => {
            if let Some(parsed) = extract_json_from_text(&raw_text) {
                let draft = normalize_tool_draft(&parsed);
                Ok(json!({
                    "success": true,
                    "provider": provider,
                    "mode": mode,
                    "message": "Draft generated.",
                    "draft": draft
                }))
            } else {
                Ok(json!({
                    "success": false,
                    "provider": provider,
                    "mode": mode,
                    "message": "Provider returned a non-JSON response.",
                    "draft": null
                }))
            }
        }
        Err(error) => Ok(json!({
            "success": false,
            "provider": provider,
            "mode": mode,
            "message": error,
            "draft": null
        })),
    };

    Some(result)
}
