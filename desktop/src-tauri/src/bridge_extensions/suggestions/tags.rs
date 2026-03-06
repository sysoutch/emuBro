use super::*;

fn suggest_tags_for_game(payload: &Value) -> Value {
    let game = payload.get("game").cloned().unwrap_or_else(|| json!({}));
    let available = payload
        .get("availableTags")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    let mut suggested = Vec::<Value>::new();
    let hay = format!(
        "{} {} {}",
        game.get("name").and_then(|v| v.as_str()).unwrap_or(""),
        game.get("genre").and_then(|v| v.as_str()).unwrap_or(""),
        game.get("description").and_then(|v| v.as_str()).unwrap_or("")
    )
    .to_lowercase();
    for tag in available {
        let id = tag
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_lowercase();
        let label = tag
            .get("label")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_lowercase();
        if id.is_empty() {
            continue;
        }
        if (!label.is_empty() && hay.contains(&label)) || hay.contains(&id.replace('-', " ")) {
            suggested.push(Value::String(id));
        }
        if suggested.len() >= payload.get("maxTags").and_then(|v| v.as_u64()).unwrap_or(6) as usize {
            break;
        }
    }
    if suggested.is_empty() {
        suggested = game
            .get("tags")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default()
            .into_iter()
            .filter_map(|v| v.as_str().map(|s| Value::String(s.to_lowercase())))
            .collect::<Vec<Value>>();
    }
    json!({
        "success": true,
        "provider": super::normalize_provider(payload.get("provider").and_then(|v| v.as_str()).unwrap_or("")),
        "tags": suggested,
        "reason": "Tags inferred from game metadata."
    })
}

fn suggest_tags_for_games_batch(payload: &Value) -> Value {
    let games = payload
        .get("games")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    let mut results = Vec::<Value>::new();
    for game in games {
        let single_payload = json!({
            "provider": payload.get("provider").cloned().unwrap_or_else(|| json!("ollama")),
            "game": game.clone(),
            "availableTags": payload.get("availableTags").cloned().unwrap_or_else(|| json!([])),
            "maxTags": payload.get("maxTags").cloned().unwrap_or_else(|| json!(6))
        });
        let response = suggest_tags_for_game(&single_payload);
        results.push(json!({
            "gameId": game.get("id").and_then(|v| v.as_i64()).unwrap_or(0),
            "tags": response.get("tags").cloned().unwrap_or_else(|| json!([])),
            "reason": response.get("reason").and_then(|v| v.as_str()).unwrap_or("")
        }));
    }
    json!({
        "success": true,
        "provider": super::normalize_provider(payload.get("provider").and_then(|v| v.as_str()).unwrap_or("")),
        "summary": "Batch tagging completed.",
        "results": results
    })
}

pub(super) fn handle(channel: &str, args: &[Value]) -> Option<Result<Value, String>> {
    let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
    let result = match channel {
        "suggestions:suggest-tags-for-game" => Ok(suggest_tags_for_game(&payload)),
        "suggestions:suggest-tags-for-games-batch" => Ok(suggest_tags_for_games_batch(&payload)),
        _ => return None,
    };
    Some(result)
}
