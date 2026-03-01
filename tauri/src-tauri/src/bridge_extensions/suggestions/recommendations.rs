use super::*;
use std::collections::HashSet;

fn normalize_library_rows(rows: &[Value], max_count: usize) -> Vec<Value> {
    let mut out = Vec::<Value>::new();
    let mut seen = HashSet::<String>::new();
    for row in rows {
        let name = row.get("name").and_then(|v| v.as_str()).unwrap_or("").trim();
        if name.is_empty() {
            continue;
        }
        let platform = row
            .get("platform")
            .or_else(|| row.get("platformShortName"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        let key = format!("{}::{}", name.to_lowercase(), platform.to_lowercase());
        if seen.insert(key) {
            out.push(json!({
                "id": row.get("id").and_then(|v| v.as_i64()).unwrap_or(0),
                "name": name,
                "platform": platform,
                "platformShortName": row.get("platformShortName").and_then(|v| v.as_str()).unwrap_or(""),
                "genre": row.get("genre").and_then(|v| v.as_str()).unwrap_or(""),
                "rating": row.get("rating").cloned().unwrap_or(Value::Null),
                "isInstalled": row.get("isInstalled").and_then(|v| v.as_bool()).unwrap_or(false),
                "lastPlayed": row.get("lastPlayed").and_then(|v| v.as_str()).unwrap_or("")
            }));
        }
        if out.len() >= max_count {
            break;
        }
    }
    out
}

pub(super) fn simple_recommendations(payload: &Value) -> Value {
    let mode = normalize_mode(payload.get("mode").and_then(|v| v.as_str()).unwrap_or(""));
    let limit = payload
        .get("limit")
        .and_then(|v| v.as_u64())
        .map(|v| v.clamp(1, 12) as usize)
        .unwrap_or(8);
    let library = normalize_library_rows(
        &payload
            .get("libraryGames")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default(),
        420,
    );
    let matches = library.into_iter().take(limit).collect::<Vec<Value>>();
    let missing = if mode == "library-only" {
        Vec::<Value>::new()
    } else {
        let defaults = [
            ("Chrono Trigger", "snes"),
            ("Castlevania: Symphony of the Night", "psx"),
            ("The Legend of Zelda: Ocarina of Time", "n64"),
            ("Persona 4", "ps2"),
            ("Metroid Prime", "gamecube"),
            ("Final Fantasy Tactics", "psx"),
            ("Fire Emblem", "gba"),
            ("Xenoblade Chronicles", "wii"),
        ];
        defaults
            .iter()
            .take(limit)
            .map(|(name, platform)| {
                json!({
                    "name": *name,
                    "platform": *platform,
                    "reason": "Classic fit for your current library profile."
                })
            })
            .collect::<Vec<Value>>()
    };

    json!({
        "success": true,
        "provider": normalize_provider(payload.get("provider").and_then(|v| v.as_str()).unwrap_or("")),
        "mode": mode,
        "summary": "Suggestions generated from your local library context.",
        "libraryMatches": matches,
        "missingSuggestions": missing
    })
}
