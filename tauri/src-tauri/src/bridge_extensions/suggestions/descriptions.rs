use super::*;
use std::collections::HashMap;

fn sanitize_generated_description(raw: &str, max_chars: usize) -> String {
    let mut text = raw.trim().to_string();
    if text.is_empty() {
        return String::new();
    }

    if let Some(parsed) = super::extract_json_from_text(&text) {
        if let Some(desc) = parsed
            .get("description")
            .or_else(|| parsed.get("text"))
            .and_then(|v| v.as_str())
        {
            text = desc.trim().to_string();
        }
    }

    let mut cleaned = text
        .replace("```json", "")
        .replace("```", "")
        .replace('\r', "\n")
        .trim()
        .trim_matches('"')
        .trim()
        .to_string();

    if let Some(stripped) = cleaned.strip_prefix("Description:") {
        cleaned = stripped.trim().to_string();
    }
    cleaned = cleaned
        .split_whitespace()
        .collect::<Vec<&str>>()
        .join(" ")
        .trim()
        .to_string();

    if cleaned.len() > max_chars {
        let mut truncated = cleaned.chars().take(max_chars).collect::<String>();
        if let Some(last_space) = truncated.rfind(' ') {
            truncated.truncate(last_space);
        }
        cleaned = truncated.trim().to_string();
    }
    cleaned
}

fn build_game_description_prompt(game: &Value, max_chars: usize) -> String {
    let name = game.get("name").and_then(|v| v.as_str()).unwrap_or("").trim();
    let file_path = game
        .get("filePath")
        .or_else(|| game.get("path"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim();
    let platform = game
        .get("platform")
        .or_else(|| game.get("platformShortName"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim();
    let genre = game.get("genre").and_then(|v| v.as_str()).unwrap_or("").trim();
    let existing = game
        .get("description")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim();
    let tags = game
        .get("tags")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .filter_map(|v| v.as_str().map(|s| s.trim().to_string()))
        .filter(|s| !s.is_empty())
        .take(8)
        .collect::<Vec<String>>()
        .join(", ");

    format!(
        "Write a concise game description in plain text (no markdown, no bullets).\n\
         Keep it between 2 and 4 sentences and under {max_chars} characters.\n\
         Focus on what the game is, tone, and what makes it notable.\n\
         Use the absolute file path as extra context.\n\
         If the entry looks like a non-game file or unknown dump, explicitly say that the file may not be a valid game entry.\n\
         \n\
         Name: {name}\n\
         Absolute file path: {file_path}\n\
         Platform: {platform}\n\
         Genre: {genre}\n\
         Tags: {tags}\n\
         Existing description (may be empty): {existing}\n\
         \n\
         Return only the final description text."
    )
}

fn truncate_for_prompt(raw: &str, max_chars: usize) -> String {
    let text = raw.trim();
    if text.chars().count() <= max_chars {
        return text.to_string();
    }
    let mut truncated = text.chars().take(max_chars).collect::<String>();
    if let Some(idx) = truncated.rfind(' ') {
        truncated.truncate(idx);
    }
    truncated.trim().to_string()
}

fn build_game_description_batch_prompt(games: &[Value], max_chars: usize) -> String {
    let prompt_games = games
        .iter()
        .map(|game| {
            let id = game.get("id").and_then(|v| v.as_i64()).unwrap_or(0);
            let name = truncate_for_prompt(game.get("name").and_then(|v| v.as_str()).unwrap_or(""), 120);
            let file_path = truncate_for_prompt(
                game.get("filePath")
                    .or_else(|| game.get("path"))
                    .and_then(|v| v.as_str())
                    .unwrap_or(""),
                280,
            );
            let platform = truncate_for_prompt(
                game.get("platform")
                    .or_else(|| game.get("platformShortName"))
                    .and_then(|v| v.as_str())
                    .unwrap_or(""),
                64,
            );
            let genre = truncate_for_prompt(game.get("genre").and_then(|v| v.as_str()).unwrap_or(""), 64);
            let existing = truncate_for_prompt(
                game.get("description").and_then(|v| v.as_str()).unwrap_or(""),
                240,
            );
            let tags = game
                .get("tags")
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default()
                .into_iter()
                .filter_map(|v| v.as_str().map(|s| truncate_for_prompt(s, 32)))
                .filter(|s| !s.is_empty())
                .take(8)
                .collect::<Vec<String>>();
            json!({
                "gameId": id,
                "name": name,
                "absoluteFilePath": file_path,
                "platform": platform,
                "genre": genre,
                "tags": tags,
                "existingDescription": existing
            })
        })
        .collect::<Vec<Value>>();
    let games_json = serde_json::to_string_pretty(&prompt_games).unwrap_or_else(|_| "[]".to_string());

    format!(
        "You are generating game descriptions for a launcher library.\n\
         For each game, write 2 to 4 sentences in plain text under {max_chars} characters.\n\
         No markdown, no bullets, no code blocks.\n\
         Keep each description specific and useful for users browsing a game list.\n\
         Use absolute file paths as additional context to detect unknown/non-game entries.\n\
         If path/metadata suggests a non-game file, clearly state uncertainty and that this may be a wrongly added file.\n\
         \n\
         Input games JSON:\n\
         {games_json}\n\
         \n\
         Return ONLY JSON with this exact shape:\n\
         {{\"results\":[{{\"gameId\":123,\"description\":\"...\"}}]}}\n\
         Include one result per input gameId."
    )
}

fn parse_batch_generated_descriptions(raw: &str, max_chars: usize) -> HashMap<i64, String> {
    let mut out = HashMap::<i64, String>::new();
    let Some(parsed) = super::extract_json_from_text(raw) else {
        return out;
    };

    let mut consume_row = |row: &Value| {
        let game_id = row
            .get("gameId")
            .or_else(|| row.get("id"))
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        if game_id <= 0 {
            return;
        }
        let raw_desc = row
            .get("description")
            .or_else(|| row.get("text"))
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let cleaned = sanitize_generated_description(raw_desc, max_chars);
        if !cleaned.is_empty() {
            out.insert(game_id, cleaned);
        }
    };

    if let Some(rows) = parsed.get("results").and_then(|v| v.as_array()) {
        for row in rows {
            consume_row(row);
        }
    } else if let Some(rows) = parsed.as_array() {
        for row in rows {
            consume_row(row);
        }
    }

    if out.is_empty() {
        if let Some(map) = parsed.get("descriptions").and_then(|v| v.as_object()) {
            for (key, value) in map {
                let game_id = key.trim().parse::<i64>().unwrap_or(0);
                if game_id <= 0 {
                    continue;
                }
                let cleaned = sanitize_generated_description(value.as_str().unwrap_or(""), max_chars);
                if !cleaned.is_empty() {
                    out.insert(game_id, cleaned);
                }
            }
        }
    }

    if out.is_empty() {
        if let Some(map) = parsed.as_object() {
            let looks_like_direct_map = map
                .iter()
                .all(|(key, value)| key.trim().parse::<i64>().is_ok() && value.is_string());
            if looks_like_direct_map {
                for (key, value) in map {
                    let game_id = key.trim().parse::<i64>().unwrap_or(0);
                    if game_id <= 0 {
                        continue;
                    }
                    let cleaned = sanitize_generated_description(value.as_str().unwrap_or(""), max_chars);
                    if !cleaned.is_empty() {
                        out.insert(game_id, cleaned);
                    }
                }
            }
        }
    }

    out
}

fn handle_generate_description_for_game(payload: &Value) -> Result<Value, String> {
    let game = payload.get("game").cloned().unwrap_or_else(|| json!({}));
    let game_id = game.get("id").and_then(|v| v.as_i64()).unwrap_or(0);
    let game_name = game
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    if game_name.is_empty() {
        return Ok(json!({
            "success": false,
            "message": "Game name is required."
        }));
    }

    let max_chars = payload
        .get("maxChars")
        .and_then(|v| v.as_u64())
        .map(|v| v.clamp(120, 1200) as usize)
        .unwrap_or(420);
    let prompt = build_game_description_prompt(&game, max_chars);
    let raw_text = match super::request_provider_text(payload, &prompt) {
        Ok(value) => value,
        Err(error) => {
            return Ok(json!({
                "success": false,
                "provider": super::normalize_provider(payload.get("provider").and_then(|v| v.as_str()).unwrap_or("")),
                "gameId": game_id,
                "gameName": game_name,
                "description": "",
                "fallback": false,
                "reason": "Provider request failed.",
                "message": error
            }));
        }
    };
    let description = sanitize_generated_description(&raw_text, max_chars);
    if description.is_empty() {
        return Ok(json!({
            "success": false,
            "provider": super::normalize_provider(payload.get("provider").and_then(|v| v.as_str()).unwrap_or("")),
            "gameId": game_id,
            "gameName": game_name,
            "description": "",
            "fallback": false,
            "reason": "LLM response was empty after sanitization.",
            "message": "The model returned no usable description text."
        }));
    }

    Ok(json!({
        "success": true,
        "provider": super::normalize_provider(payload.get("provider").and_then(|v| v.as_str()).unwrap_or("")),
        "gameId": game_id,
        "gameName": game_name,
        "description": description,
        "fallback": false,
        "reason": "Description generated from model output.",
        "message": ""
    }))
}

fn handle_generate_descriptions_for_games_batch(payload: &Value) -> Result<Value, String> {
    let games = payload
        .get("games")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    if games.is_empty() {
        return Ok(json!({
            "success": true,
            "provider": super::normalize_provider(payload.get("provider").and_then(|v| v.as_str()).unwrap_or("")),
            "summary": "No games provided for description generation.",
            "results": []
        }));
    }

    let max_chars = payload
        .get("maxChars")
        .and_then(|v| v.as_u64())
        .map(|v| v.clamp(120, 1200))
        .unwrap_or(420);

    let prompt = build_game_description_batch_prompt(&games, max_chars as usize);
    let raw_text = match super::request_provider_text(payload, &prompt) {
        Ok(value) => value,
        Err(error) => {
            return Ok(json!({
                "success": false,
                "provider": super::normalize_provider(payload.get("provider").and_then(|v| v.as_str()).unwrap_or("")),
                "summary": "Batch description generation failed.",
                "message": error,
                "results": []
            }));
        }
    };

    let parsed_descriptions = parse_batch_generated_descriptions(&raw_text, max_chars as usize);
    let mut results = Vec::<Value>::new();
    let mut generated_count = 0usize;
    for game in games {
        let game_id = game.get("id").and_then(|v| v.as_i64()).unwrap_or(0);
        let description = parsed_descriptions.get(&game_id).cloned().unwrap_or_default();
        let success = !description.is_empty();
        if success {
            generated_count += 1;
        }
        results.push(json!({
            "gameId": game_id,
            "success": success,
            "description": description,
            "fallback": false,
            "reason": if success {
                "Description generated from batch response."
            } else {
                "No valid description returned for this game in batch output."
            },
            "message": if success { "" } else { "Missing gameId entry in LLM batch response." }
        }));
    }

    Ok(json!({
        "success": true,
        "provider": super::normalize_provider(payload.get("provider").and_then(|v| v.as_str()).unwrap_or("")),
        "summary": format!("Batch description generation completed ({} / {} games).", generated_count, results.len()),
        "generated": generated_count,
        "requested": results.len(),
        "results": results
    }))
}

pub(super) fn handle(channel: &str, args: &[Value]) -> Option<Result<Value, String>> {
    let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
    let result = match channel {
        "suggestions:generate-description-for-game" => handle_generate_description_for_game(&payload),
        "suggestions:generate-descriptions-for-games-batch" => {
            handle_generate_descriptions_for_games_batch(&payload)
        }
        _ => return None,
    };
    Some(result)
}
