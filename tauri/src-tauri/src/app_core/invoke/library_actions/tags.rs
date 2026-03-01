use super::*;
use serde_json::json;

pub(super) fn handle(ch: &str, args: &[Value], _window: &Window) -> Result<Value, String> {
    match ch {
        "tags:rename" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let old_tag = normalize_tag_id(payload.get("oldTagId").and_then(|v| v.as_str()).unwrap_or(""));
            let new_label = payload
                .get("newTagName")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if old_tag.is_empty() || new_label.is_empty() {
                return Ok(json!({ "success": false, "message": "Invalid tag payload" }));
            }
            let new_tag = normalize_tag_id(&new_label);
            if new_tag.is_empty() {
                return Ok(json!({ "success": false, "message": "Invalid tag name" }));
            }

            let mut tags = read_state_array("tags");
            let existing_new = tags.iter().any(|row| {
                row.get("id")
                    .and_then(|v| v.as_str())
                    .map(|s| s.eq_ignore_ascii_case(&new_tag))
                    .unwrap_or(false)
            });
            let mut found_old = false;
            for row in &mut tags {
                if row
                    .get("id")
                    .and_then(|v| v.as_str())
                    .map(|s| s.eq_ignore_ascii_case(&old_tag))
                    .unwrap_or(false)
                {
                    found_old = true;
                    if let Some(obj) = row.as_object_mut() {
                        obj.insert("id".to_string(), Value::String(new_tag.clone()));
                        obj.insert("label".to_string(), Value::String(new_label.clone()));
                    }
                }
            }
            if !found_old {
                return Ok(json!({ "success": false, "message": "Tag not found" }));
            }
            if existing_new {
                tags.retain(|row| {
                    row.get("id")
                        .and_then(|v| v.as_str())
                        .map(|s| !s.eq_ignore_ascii_case(&old_tag))
                        .unwrap_or(true)
                });
            }

            let mut games = read_state_array("games");
            for game in &mut games {
                if let Some(obj) = game.as_object_mut() {
                    let tags_arr = obj
                        .get("tags")
                        .and_then(|v| v.as_array())
                        .cloned()
                        .unwrap_or_default();
                    let mut out = Vec::<Value>::new();
                    for tag in tags_arr {
                        let text = normalize_tag_id(tag.as_str().unwrap_or(""));
                        if text.is_empty() {
                            continue;
                        }
                        if text == old_tag {
                            out.push(Value::String(new_tag.clone()));
                        } else {
                            out.push(Value::String(text));
                        }
                    }
                    obj.insert("tags".to_string(), Value::Array(out));
                }
            }

            write_state_array("tags", tags)?;
            write_state_array("games", games)?;
            Ok(json!({
                "success": true,
                "newTagId": new_tag,
                "newLabel": new_label,
                "merged": existing_new
            }))
        }
        "tags:delete" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let tag_id = normalize_tag_id(payload.get("tagId").and_then(|v| v.as_str()).unwrap_or(""));
            if tag_id.is_empty() {
                return Ok(json!({ "success": false, "message": "Invalid tag id" }));
            }

            let mut tags = read_state_array("tags");
            let before = tags.len();
            tags.retain(|row| {
                row.get("id")
                    .and_then(|v| v.as_str())
                    .map(|s| !s.eq_ignore_ascii_case(&tag_id))
                    .unwrap_or(true)
            });
            if tags.len() == before {
                return Ok(json!({ "success": false, "message": "Tag not found" }));
            }

            let mut games = read_state_array("games");
            for game in &mut games {
                if let Some(obj) = game.as_object_mut() {
                    let tags_arr = obj
                        .get("tags")
                        .and_then(|v| v.as_array())
                        .cloned()
                        .unwrap_or_default();
                    let out: Vec<Value> = tags_arr
                        .into_iter()
                        .filter(|tag| !normalize_tag_id(tag.as_str().unwrap_or("")).eq_ignore_ascii_case(&tag_id))
                        .collect();
                    obj.insert("tags".to_string(), Value::Array(out));
                }
            }

            write_state_array("tags", tags)?;
            write_state_array("games", games)?;
            Ok(json!({ "success": true }))
        }
        _ => Ok(json!({ "success": false, "message": format!("Unsupported tags channel: {}", ch) })),
    }
}
