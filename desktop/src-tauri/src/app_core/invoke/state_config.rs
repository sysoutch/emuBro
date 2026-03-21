use super::*;
use serde_json::json;

pub(super) fn handle(ch: &str, args: &[Value], _window: &Window) -> Result<Value, String> {
    match ch {
        "get-games" => Ok(Value::Array(read_state_array("games"))),
        "get-emulators" => Ok(Value::Array(list_emulators_for_library())),
        "support:query-library" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            Ok(query_support_library(&payload))
        }
        "tags:list" => Ok(json!({ "tags": read_state_array("tags") })),
        "get-library-stats" => Ok(json!({
            "totalGames": read_state_array("games").len(),
            "totalPlayTime": "0h"
        })),
        "get-user-info" => Ok(json!({
            "username": "Guest",
            "displayName": "Guest",
            "id": "local",
            "avatarUrl": ""
        })),
        "settings:get-library-paths" => Ok(json!({
            "success": true,
            "settings": read_library_path_settings()
        })),
        "settings:set-library-paths" => {
            let normalized = write_library_path_settings(args.get(0))?;
            Ok(json!({
                "success": true,
                "settings": normalized
            }))
        }
        "settings:get-runtime-data-rules" => Ok(json!({
            "success": true,
            "rules": {
                "directoryNames": [],
                "fileExtensions": [],
                "fileNameIncludes": []
            }
        })),
        "settings:set-runtime-data-rules" => Ok(json!({
            "success": true,
            "rules": {
                "directoryNames": [],
                "fileExtensions": [],
                "fileNameIncludes": []
            }
        })),
        "settings:get-splash-theme" => Ok(json!({
            "success": true,
            "theme": read_splash_theme_settings()
        })),
        "settings:set-splash-theme" => {
            let theme = write_splash_theme_settings(args.get(0))?;
            Ok(json!({ "success": true, "theme": theme }))
        }
        "shell-state:get" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let key = payload
                .get("key")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if key.is_empty() {
                return Ok(json!({
                    "success": false,
                    "message": "Missing shell state key.",
                    "value": payload.get("fallback").cloned().unwrap_or(Value::Null)
                }));
            }
            let fallback = payload.get("fallback").cloned().unwrap_or(Value::Null);
            Ok(json!({
                "success": true,
                "key": key,
                "value": read_shell_state_value(&key, fallback)
            }))
        }
        "shell-state:set" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let key = payload
                .get("key")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if key.is_empty() {
                return Ok(json!({
                    "success": false,
                    "message": "Missing shell state key."
                }));
            }
            let value = payload.get("value").cloned().unwrap_or(Value::Null);
            let stored = write_shell_state_value(&key, &value)?;
            Ok(json!({
                "success": true,
                "key": key,
                "value": stored
            }))
        }
        "shell-state:delete" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let key = payload
                .get("key")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if key.is_empty() {
                return Ok(json!({
                    "success": false,
                    "message": "Missing shell state key."
                }));
            }
            delete_shell_state_value(&key)?;
            Ok(json!({
                "success": true,
                "key": key
            }))
        }
        "get-all-translations" => Ok(read_all_translations_from_disk()),
        "locales:list" => {
            let translations = read_all_translations_from_disk();
            let obj = match translations.as_object() {
                Some(m) => m,
                None => return Ok(json!([])),
            };
            let mut rows = Vec::<Value>::new();
            for (code, data) in obj {
                let mut wrapped = serde_json::Map::new();
                wrapped.insert(code.clone(), data.clone());
                rows.push(json!({
                    "code": code,
                    "source": "app",
                    "canRename": false,
                    "canDelete": false,
                    "data": Value::Object(wrapped)
                }));
            }
            Ok(Value::Array(rows))
        }
        "locales:read" => {
            let file_name = args.get(0).and_then(|v| v.as_str()).unwrap_or("").to_string();
            let Some(locales_dir) = find_locales_dir() else {
                return Ok(json!({}));
            };
            let Some(path) = locale_file_path(&locales_dir, &file_name) else {
                return Ok(json!({}));
            };
            let text = fs::read_to_string(path).unwrap_or_else(|_| "{}".to_string());
            let parsed: Value = serde_json::from_str(&text).unwrap_or_else(|_| json!({}));
            Ok(parsed)
        }
        "locales:exists" => {
            let file_name = args.get(0).and_then(|v| v.as_str()).unwrap_or("").to_string();
            let Some(locales_dir) = find_locales_dir() else {
                return Ok(json!(false));
            };
            let exists = locale_file_path(&locales_dir, &file_name)
                .map(|p| p.exists() && p.is_file())
                .unwrap_or(false);
            Ok(json!(exists))
        }
        "get-platforms" => Ok(Value::Array(load_platform_configs())),
        "get-platforms-for-extension" => {
            let ext = args
                .get(0)
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_lowercase();
            if ext.is_empty() {
                return Ok(Value::Array(Vec::new()));
            }
            let rows = load_platform_configs()
                .into_iter()
                .filter(|row| platform_matches_extension(row, &ext))
                .collect::<Vec<Value>>();
            Ok(Value::Array(rows))
        }
        "check-path-type" => {
            let target_path = args
                .get(0)
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if target_path.is_empty() {
                return Ok(json!({ "path": "", "exists": false, "isDirectory": false, "isFile": false }));
            }
            let p = PathBuf::from(target_path.clone());
            let meta = fs::metadata(&p).ok();
            let is_dir = meta.as_ref().map(|m| m.is_dir()).unwrap_or(false);
            let is_file = meta.as_ref().map(|m| m.is_file()).unwrap_or(false);
            Ok(json!({
                "path": target_path,
                "exists": meta.is_some(),
                "isDirectory": is_dir,
                "isFile": is_file
            }))
        }
        "check-path-write-access" => {
            let target_path = args
                .get(0)
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            Ok(check_path_write_access(&target_path))
        }

        "prompt-scan-subfolders" => Ok(json!({ "canceled": false, "recursive": true })),
        "open-file-dialog" => {
            let options = args.get(0).cloned().unwrap_or_else(|| json!({}));
            Ok(resolve_open_file_dialog(&options))
        }
        "save-file-dialog" => {
            let options = args.get(0).cloned().unwrap_or_else(|| json!({}));
            Ok(resolve_save_file_dialog(&options))
        }

        "get-file-icon-data-url" => {
            let raw_path = args.get(0).and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
            if raw_path.is_empty() {
                return Ok(json!({ "success": false, "message": "Missing path", "dataUrl": "" }));
            }
            let path = PathBuf::from(&raw_path);
            if !path.exists() {
                return Ok(json!({ "success": false, "message": "Path not found", "dataUrl": "" }));
            }
            Ok(json!({
                "success": true,
                "dataUrl": build_file_icon_data_url(&path)
            }))
        }
        "tools:plugin:create-files" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            create_tool_plugin_files(&payload)
        }
        "tools:plugin:read-files" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            read_tool_plugin_files(&payload)
        }
        _ => Ok(json!({ "success": false, "message": format!("Unsupported state_config channel: {}", ch) })),
    }
}

fn check_path_write_access(target_path: &str) -> Value {
    let raw = target_path.trim();
    if raw.is_empty() {
        return json!({
            "success": false,
            "exists": false,
            "writable": false,
            "targetPath": "",
            "resolvedDirectory": "",
            "message": "Missing path"
        });
    }

    let input = PathBuf::from(raw);
    let metadata = match fs::metadata(&input) {
        Ok(meta) => meta,
        Err(err) => {
            return json!({
                "success": false,
                "exists": false,
                "writable": false,
                "targetPath": raw,
                "resolvedDirectory": "",
                "message": err.to_string()
            });
        }
    };

    let resolved_directory = if metadata.is_dir() {
        input.clone()
    } else {
        input.parent().map(Path::to_path_buf).unwrap_or_else(PathBuf::new)
    };

    if resolved_directory.as_os_str().is_empty() || !resolved_directory.exists() || !resolved_directory.is_dir() {
        return json!({
            "success": true,
            "exists": true,
            "writable": false,
            "targetPath": raw,
            "resolvedDirectory": resolved_directory.to_string_lossy().to_string(),
            "message": "Resolved directory not found"
        });
    }

    let nonce = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|v| v.as_nanos())
        .unwrap_or(0);
    let probe_path = resolved_directory.join(format!(".emubro-write-check-{}-{}.tmp", std::process::id(), nonce));
    let writable = match fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&probe_path)
    {
        Ok(_) => {
            let _ = fs::remove_file(&probe_path);
            true
        }
        Err(_) => false
    };

    json!({
        "success": true,
        "exists": true,
        "writable": writable,
        "targetPath": raw,
        "resolvedDirectory": resolved_directory.to_string_lossy().to_string(),
        "message": if writable {
            String::new()
        } else {
            "Directory is not writable".to_string()
        }
    })
}

fn normalize_support_library_query_text(value: &str) -> String {
    let mut out = String::new();
    let mut previous_was_space = false;

    for ch in value.trim().chars() {
        if ch.is_ascii_alphanumeric() {
            out.push(ch.to_ascii_lowercase());
            previous_was_space = false;
        } else if !previous_was_space {
            out.push(' ');
            previous_was_space = true;
        }
    }

    out.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn tokenize_support_library_query(value: &str) -> Vec<String> {
    let normalized = normalize_support_library_query_text(value);
    let mut tokens = Vec::<String>::new();
    let mut seen = std::collections::HashSet::<String>::new();

    for token in normalized.split_whitespace() {
        let trimmed = token.trim();
        if trimmed.len() < 2 {
            continue;
        }
        if seen.insert(trimmed.to_string()) {
            tokens.push(trimmed.to_string());
        }
    }

    tokens
}

fn build_support_library_search_text(row: &Value) -> String {
    let mut parts = Vec::<String>::new();
    for key in [
        "name",
        "title",
        "displayName",
        "platform",
        "platformShortName",
        "description",
        "company",
        "genre",
        "type",
        "searchString",
        "serial",
        "code",
        "gameCode",
    ] {
        let value = row.get(key).and_then(|v| v.as_str()).unwrap_or("").trim();
        if !value.is_empty() {
            parts.push(value.to_string());
        }
    }

    if let Some(tags) = row.get("tags").and_then(|v| v.as_array()) {
        for tag in tags {
            let text = match tag {
                Value::String(value) => value.trim().to_string(),
                Value::Number(value) => value.to_string(),
                _ => String::new(),
            };
            if !text.is_empty() {
                parts.push(text);
            }
        }
    }

    normalize_support_library_query_text(&parts.join(" "))
}

fn support_library_row_name(row: &Value) -> String {
    row.get("name")
        .or_else(|| row.get("title"))
        .or_else(|| row.get("displayName"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string()
}

fn support_library_row_platform(row: &Value) -> String {
    row.get("platform")
        .or_else(|| row.get("platformShortName"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string()
}

fn build_support_tag_label_map() -> std::collections::HashMap<String, String> {
    let mut map = std::collections::HashMap::<String, String>::new();
    for row in read_state_array("tags") {
        let id = row
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if id.is_empty() {
            continue;
        }
        let key = id.to_ascii_lowercase();
        let label = row
            .get("label")
            .or_else(|| row.get("name"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        map.insert(key, if label.is_empty() { id } else { label });
    }
    map
}

fn enrich_support_game_row_tags(
    row: Value,
    tag_labels: &std::collections::HashMap<String, String>,
) -> Value {
    let mut obj = row.as_object().cloned().unwrap_or_default();
    let existing = obj
        .get("tags")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    let mut tag_ids = Vec::<Value>::new();
    let mut label_values = Vec::<Value>::new();
    let mut seen_ids = std::collections::HashSet::<String>::new();
    let mut seen_labels = std::collections::HashSet::<String>::new();

    for entry in existing {
        let text = match entry {
            Value::String(value) => value.trim().to_string(),
            Value::Number(value) => value.to_string(),
            _ => String::new(),
        };
        if text.is_empty() {
            continue;
        }
        let id_key = text.to_ascii_lowercase();
        if seen_ids.insert(id_key.clone()) {
            tag_ids.push(Value::String(text.clone()));
        }
        let label = tag_labels
            .get(&id_key)
            .cloned()
            .unwrap_or_else(|| text.clone());
        let label_key = label.to_ascii_lowercase();
        if !label.is_empty() && seen_labels.insert(label_key) {
            label_values.push(Value::String(label));
        }
    }

    obj.insert("tags".to_string(), Value::Array(tag_ids));
    obj.insert("tagLabels".to_string(), Value::Array(label_values));
    Value::Object(obj)
}

fn enrich_support_game_rows_with_tags(
    rows: Vec<Value>,
    tag_labels: &std::collections::HashMap<String, String>,
) -> Vec<Value> {
    rows.into_iter()
        .map(|row| enrich_support_game_row_tags(row, tag_labels))
        .collect::<Vec<_>>()
}

fn query_support_rows(rows: Vec<Value>, normalized_query: &str, query_tokens: &[String], limit: usize) -> (usize, Vec<Value>) {
    if normalized_query.is_empty() {
        return (0, Vec::new());
    }

    let mut ranked = rows
        .into_iter()
        .filter_map(|row| {
            let search_text = build_support_library_search_text(&row);
            if search_text.is_empty() {
                return None;
            }

            let phrase_hit = search_text.contains(normalized_query);
            let token_hits = query_tokens
                .iter()
                .filter(|token| search_text.contains(token.as_str()))
                .count();
            let matches = if phrase_hit {
                true
            } else if query_tokens.is_empty() {
                false
            } else {
                token_hits == query_tokens.len()
            };

            if !matches {
                return None;
            }

            let platform = support_library_row_platform(&row);
            let name = support_library_row_name(&row);
            Some((row, phrase_hit, token_hits, platform, name))
        })
        .collect::<Vec<_>>();

    ranked.sort_by(|a, b| {
        if a.1 != b.1 {
            return b.1.cmp(&a.1);
        }
        if a.2 != b.2 {
            return b.2.cmp(&a.2);
        }
        let platform_cmp = a.3.cmp(&b.3);
        if platform_cmp != std::cmp::Ordering::Equal {
            return platform_cmp;
        }
        a.4.cmp(&b.4)
    });

    let total = ranked.len();
    let rows = ranked
        .into_iter()
        .take(limit)
        .map(|entry| entry.0)
        .collect::<Vec<_>>();

    (total, rows)
}

fn summarize_support_catalog_rows(rows: Vec<Value>, limit: usize) -> Vec<Value> {
    let mut sorted = rows;
    sorted.sort_by(|a, b| {
        let platform_cmp = support_library_row_platform(a).cmp(&support_library_row_platform(b));
        if platform_cmp != std::cmp::Ordering::Equal {
            return platform_cmp;
        }
        support_library_row_name(a).cmp(&support_library_row_name(b))
    });
    sorted.into_iter().take(limit).collect::<Vec<_>>()
}

fn build_support_library_platform_counts(rows: &[Value]) -> Vec<Value> {
    let mut counter = std::collections::HashMap::<String, usize>::new();
    for row in rows {
        let platform = support_library_row_platform(row);
        if platform.is_empty() {
            continue;
        }
        *counter.entry(platform).or_insert(0usize) += 1;
    }

    let mut entries = counter.into_iter().collect::<Vec<_>>();
    entries.sort_by(|a, b| {
        if a.1 != b.1 {
            return b.1.cmp(&a.1);
        }
        a.0.cmp(&b.0)
    });

    entries
        .into_iter()
        .take(40)
        .map(|(platform, count)| json!({
            "platform": platform,
            "count": count
        }))
        .collect::<Vec<_>>()
}

fn normalize_support_library_kind(value: &str) -> &'static str {
    match value.trim().to_ascii_lowercase().as_str() {
        "game" | "games" | "title" | "titles" | "rom" | "roms" => "games",
        "emulator" | "emulators" => "emulators",
        _ => "all",
    }
}

fn push_support_library_query_values(value: &Value, out: &mut Vec<String>) {
    match value {
        Value::Array(rows) => {
            for entry in rows {
                push_support_library_query_values(entry, out);
            }
        }
        Value::String(text) => {
            let trimmed = text.trim();
            if !trimmed.is_empty() {
                out.push(trimmed.to_string());
            }
        }
        _ => {
            if let Some(text) = value.as_str() {
                let trimmed = text.trim();
                if !trimmed.is_empty() {
                    out.push(trimmed.to_string());
                }
            }
        }
    }
}

fn read_support_library_queries(payload: &Value) -> Vec<String> {
    let mut rows = Vec::<String>::new();

    for field in ["queries", "titles", "names", "games"] {
        if let Some(value) = payload.get(field) {
            push_support_library_query_values(value, &mut rows);
        }
    }

    if rows.is_empty() {
        if let Some(value) = payload
            .get("query")
            .or_else(|| payload.get("search"))
            .or_else(|| payload.get("searchQuery"))
            .or_else(|| payload.get("title"))
            .or_else(|| payload.get("name"))
        {
            push_support_library_query_values(value, &mut rows);
        }
    }

    let mut seen = std::collections::HashSet::<String>::new();
    rows.into_iter()
        .filter_map(|value| {
            let trimmed = value.trim().to_string();
            if trimmed.is_empty() {
                return None;
            }
            let key = trimmed.to_ascii_lowercase();
            if !seen.insert(key) {
                return None;
            }
            Some(trimmed)
        })
        .take(24)
        .collect::<Vec<_>>()
}

fn support_library_row_identity_key(row: &Value) -> String {
    if let Some(key) = row.get("key").and_then(|v| v.as_str()).map(|v| v.trim()).filter(|v| !v.is_empty()) {
        return format!("key:{key}");
    }
    if let Some(id) = row.get("id").and_then(|v| v.as_u64()) {
        return format!("id:{id}");
    }
    let name = support_library_row_name(row);
    let platform = support_library_row_platform(row);
    format!(
        "name:{}|platform:{}",
        name.trim().to_ascii_lowercase(),
        platform.trim().to_ascii_lowercase()
    )
}

fn merge_support_library_batch_rows(query_results: &[Value], field: &str, limit: usize) -> Vec<Value> {
    let mut merged = Vec::<Value>::new();
    let mut seen = std::collections::HashSet::<String>::new();

    for entry in query_results {
        let Some(rows) = entry.get(field).and_then(|v| v.as_array()) else {
            continue;
        };
        for row in rows {
            let identity = support_library_row_identity_key(row);
            if identity.is_empty() || !seen.insert(identity) {
                continue;
            }
            merged.push(row.clone());
            if merged.len() >= limit {
                return merged;
            }
        }
    }

    merged
}

fn query_support_library(payload: &Value) -> Value {
    let queries = read_support_library_queries(payload);
    let query = queries.first().cloned().unwrap_or_default();
    let batch_query = queries.len() > 1;
    let normalized_query = normalize_support_library_query_text(&query);
    let query_tokens = tokenize_support_library_query(&query);
    let kind = normalize_support_library_kind(
        payload
            .get("kind")
            .or_else(|| payload.get("target"))
            .and_then(|v| v.as_str())
            .unwrap_or("all"),
    );
    let limit = payload
        .get("limit")
        .and_then(|v| v.as_u64())
        .map(|value| value.clamp(1, 5000) as usize)
        .unwrap_or(1200);

    let support_tag_labels = build_support_tag_label_map();
    let all_games = enrich_support_game_rows_with_tags(read_state_array("games"), &support_tag_labels);
    let all_emulators = list_emulators_for_library();
    let catalog_sample_limit = limit.clamp(1, 220);
    let game_platforms = build_support_library_platform_counts(&all_games);
    let emulator_platforms = build_support_library_platform_counts(&all_emulators);
    let catalog_games = summarize_support_catalog_rows(all_games.clone(), catalog_sample_limit);
    let catalog_emulators = summarize_support_catalog_rows(all_emulators.clone(), catalog_sample_limit);
    let whole_catalog = normalized_query.is_empty();
    let reason = if whole_catalog { "task-catalog" } else { "task-query" };

    let mut query_results = Vec::<Value>::new();
    if batch_query {
        for query_value in &queries {
            let normalized_value = normalize_support_library_query_text(query_value);
            let tokens = tokenize_support_library_query(query_value);
            let (game_count, games) = if kind == "emulators" {
                (0usize, Vec::new())
            } else {
                query_support_rows(all_games.clone(), &normalized_value, &tokens, limit)
            };
            let (emulator_count, emulators) = if kind == "games" {
                (0usize, Vec::new())
            } else {
                query_support_rows(all_emulators.clone(), &normalized_value, &tokens, limit)
            };
            query_results.push(json!({
                "query": query_value,
                "gameCount": game_count,
                "emulatorCount": emulator_count,
                "gameRowsReturned": games.len(),
                "emulatorRowsReturned": emulators.len(),
                "gameRowsTruncated": game_count > games.len(),
                "emulatorRowsTruncated": emulator_count > emulators.len(),
                "games": games,
                "emulators": emulators
            }));
        }
    }

    let (game_count, games, emulator_count, emulators, game_rows_returned, emulator_rows_returned, game_rows_truncated, emulator_rows_truncated) =
        if kind == "emulators" && whole_catalog {
            (
                0usize,
                Vec::new(),
                all_emulators.len(),
                summarize_support_catalog_rows(all_emulators.clone(), limit),
                0usize,
                limit.min(all_emulators.len()),
                false,
                all_emulators.len() > limit.min(all_emulators.len()),
            )
        } else if kind == "games" && whole_catalog {
            (
                all_games.len(),
                summarize_support_catalog_rows(all_games.clone(), limit),
                0usize,
                Vec::new(),
                limit.min(all_games.len()),
                0usize,
                all_games.len() > limit.min(all_games.len()),
                false,
            )
        } else if whole_catalog {
            let games = summarize_support_catalog_rows(all_games.clone(), limit);
            let emulators = summarize_support_catalog_rows(all_emulators.clone(), limit);
            (
                all_games.len(),
                games.clone(),
                all_emulators.len(),
                emulators.clone(),
                games.len(),
                emulators.len(),
                all_games.len() > games.len(),
                all_emulators.len() > emulators.len(),
            )
        } else if batch_query {
            let merged_games = if kind == "emulators" {
                Vec::new()
            } else {
                merge_support_library_batch_rows(&query_results, "games", limit)
            };
            let merged_emulators = if kind == "games" {
                Vec::new()
            } else {
                merge_support_library_batch_rows(&query_results, "emulators", limit)
            };
            let total_games = query_results
                .iter()
                .map(|entry| entry.get("gameCount").and_then(|v| v.as_u64()).unwrap_or(0) as usize)
                .sum::<usize>();
            let total_emulators = query_results
                .iter()
                .map(|entry| entry.get("emulatorCount").and_then(|v| v.as_u64()).unwrap_or(0) as usize)
                .sum::<usize>();
            let games_truncated = query_results
                .iter()
                .any(|entry| entry.get("gameRowsTruncated").and_then(|v| v.as_bool()).unwrap_or(false));
            let emulators_truncated = query_results
                .iter()
                .any(|entry| entry.get("emulatorRowsTruncated").and_then(|v| v.as_bool()).unwrap_or(false));
            (
                total_games,
                merged_games.clone(),
                total_emulators,
                merged_emulators.clone(),
                merged_games.len(),
                merged_emulators.len(),
                games_truncated || total_games > merged_games.len(),
                emulators_truncated || total_emulators > merged_emulators.len(),
            )
        } else {
            let (game_count, games) = if kind == "emulators" {
                (0usize, Vec::new())
            } else {
                query_support_rows(all_games.clone(), &normalized_query, &query_tokens, limit)
            };
            let (emulator_count, emulators) = if kind == "games" {
                (0usize, Vec::new())
            } else {
                query_support_rows(all_emulators.clone(), &normalized_query, &query_tokens, limit)
            };
            (
                game_count,
                games.clone(),
                emulator_count,
                emulators.clone(),
                games.len(),
                emulators.len(),
                game_count > games.len(),
                emulator_count > emulators.len(),
            )
        };

    json!({
        "success": true,
        "active": true,
        "reason": reason,
        "query": query,
        "queries": queries,
        "batchQuery": batch_query,
        "kind": kind,
        "limit": limit,
        "gameCount": game_count,
        "emulatorCount": emulator_count,
        "gameRowsReturned": game_rows_returned,
        "emulatorRowsReturned": emulator_rows_returned,
        "gameRowsTruncated": game_rows_truncated,
        "emulatorRowsTruncated": emulator_rows_truncated,
        "games": games,
        "emulators": emulators,
        "queryResults": query_results,
        "catalog": {
            "gameTotal": all_games.len(),
            "emulatorTotal": all_emulators.len(),
            "gamePlatforms": game_platforms,
            "emulatorPlatforms": emulator_platforms,
            "games": catalog_games,
            "emulators": catalog_emulators
        }
    })
}

fn list_emulators_for_library() -> Vec<Value> {
    let installed = normalize_emulator_rows(read_state_array("emulators"));
    let configured = configured_emulator_rows();

    if installed.is_empty() {
        return configured;
    }
    if configured.is_empty() {
        return installed;
    }

    let mut configured_by_key = std::collections::HashMap::<String, Value>::new();
    for row in configured {
        if let Some(key) = emulator_identity_key(&row) {
            configured_by_key.insert(key, row);
        }
    }

    let mut merged = Vec::<Value>::new();
    for row in installed {
        let Some(key) = emulator_identity_key(&row) else {
            merged.push(row);
            continue;
        };
        if let Some(config_row) = configured_by_key.remove(&key) {
            merged.push(merge_emulator_rows(config_row, row));
        } else {
            merged.push(row);
        }
    }

    merged.extend(configured_by_key.into_values());
    merged.sort_by(|a, b| {
        let ap = a
            .get("platform")
            .or_else(|| a.get("platformShortName"))
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let bp = b
            .get("platform")
            .or_else(|| b.get("platformShortName"))
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let pc = ap.cmp(bp);
        if pc != std::cmp::Ordering::Equal {
            return pc;
        }
        let an = a.get("name").and_then(|v| v.as_str()).unwrap_or("");
        let bn = b.get("name").and_then(|v| v.as_str()).unwrap_or("");
        an.cmp(bn)
    });
    merged
}

fn configured_emulator_rows() -> Vec<Value> {
    let mut out = Vec::<Value>::new();
    let mut seen = std::collections::HashSet::<String>::new();

    for platform in load_platform_configs() {
        let platform_short = normalize_platform_short_name(
            platform
                .get("shortName")
                .or_else(|| platform.get("platformDir"))
                .and_then(|v| v.as_str())
                .unwrap_or(""),
        );
        if platform_short.is_empty() {
            continue;
        }
        let platform_name = platform
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or(&platform_short)
            .trim()
            .to_string();
        let Some(emulators) = platform.get("emulators").and_then(|v| v.as_array()) else {
            continue;
        };

        for emu in emulators {
            let name = emu
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if name.is_empty() {
                continue;
            }
            let name_key = normalize_emulator_name_key(&name);
            let dedupe_key = format!("{}::{}", platform_short, name_key);
            if !seen.insert(dedupe_key) {
                continue;
            }

            let row = json!({
                "id": format!("cfg:{}:{}", platform_short, if name_key.is_empty() { "emu" } else { &name_key }),
                "name": name,
                "platform": platform_name,
                "platformShortName": platform_short,
                "type": normalize_emulator_type(emu.get("type").and_then(|v| v.as_str()).unwrap_or("standalone")),
                "filePath": "",
                "filePaths": [],
                "isInstalled": false,
                "website": emu.get("website").and_then(|v| v.as_str()).unwrap_or("").trim(),
                "downloadUrl": emu.get("downloadUrl").cloned().unwrap_or(Value::Null),
                "downloadLinks": emulator_download_links(emu),
                "startParameters": emu.get("startParameters").and_then(|v| v.as_str()).unwrap_or("").trim(),
                "searchString": emu.get("searchString").and_then(|v| v.as_str()).unwrap_or("").trim(),
                "archiveFileMatchWin": emu.get("archiveFileMatchWin").and_then(|v| v.as_str()).unwrap_or("").trim(),
                "archiveFileMatchLinux": emu.get("archiveFileMatchLinux").and_then(|v| v.as_str()).unwrap_or("").trim(),
                "archiveFileMatchMac": emu.get("archiveFileMatchMac").and_then(|v| v.as_str()).unwrap_or("").trim(),
                "setupFileMatchWin": emu.get("setupFileMatchWin").and_then(|v| v.as_str()).unwrap_or("").trim(),
                "setupFileMatchLinux": emu.get("setupFileMatchLinux").and_then(|v| v.as_str()).unwrap_or("").trim(),
                "setupFileMatchMac": emu.get("setupFileMatchMac").and_then(|v| v.as_str()).unwrap_or("").trim(),
                "executableFileMatchWin": emu.get("executableFileMatchWin").and_then(|v| v.as_str()).unwrap_or("").trim(),
                "executableFileMatchLinux": emu.get("executableFileMatchLinux").and_then(|v| v.as_str()).unwrap_or("").trim(),
                "executableFileMatchMac": emu.get("executableFileMatchMac").and_then(|v| v.as_str()).unwrap_or("").trim(),
                "configFilePath": emu.get("configFilePath").and_then(|v| v.as_str()).unwrap_or("").trim(),
                "runCommandsBefore": normalized_string_array(emu.get("runCommandsBefore")),
                "installers": emu.get("installers").and_then(|v| v.as_object()).cloned().map(Value::Object).unwrap_or(Value::Null),
                "supportedFileTypes": normalized_string_array(emu.get("supportedFileTypes")),
                "biosRequired": emu.get("biosRequired").and_then(|v| v.as_bool()).unwrap_or(false),
                "autoSearchEnabled": emu.get("autoSearchEnabled").and_then(|v| v.as_bool()).unwrap_or(true),
                "iconFilename": emu.get("iconFilename").and_then(|v| v.as_str()).unwrap_or("").trim(),
                "source": "config"
            });
            out.push(row);
        }
    }

    out.sort_by(|a, b| {
        let ap = a
            .get("platform")
            .or_else(|| a.get("platformShortName"))
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let bp = b
            .get("platform")
            .or_else(|| b.get("platformShortName"))
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let pc = ap.cmp(bp);
        if pc != std::cmp::Ordering::Equal {
            return pc;
        }
        let an = a.get("name").and_then(|v| v.as_str()).unwrap_or("");
        let bn = b.get("name").and_then(|v| v.as_str()).unwrap_or("");
        an.cmp(bn)
    });

    out
}

fn normalize_emulator_rows(rows: Vec<Value>) -> Vec<Value> {
    rows.into_iter()
        .map(|row| {
            let mut obj = row.as_object().cloned().unwrap_or_default();

            let path = obj
                .get("filePath")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            let mut paths = vec![];
            let mut seen = std::collections::HashSet::<String>::new();

            if let Some(list) = obj.get("filePaths").and_then(|v| v.as_array()) {
                for item in list {
                    let text = item.as_str().unwrap_or("").trim().to_string();
                    if text.is_empty() {
                        continue;
                    }
                    let key = text.to_lowercase();
                    if seen.insert(key) {
                        paths.push(text);
                    }
                }
            }
            if !path.is_empty() {
                let key = path.to_lowercase();
                if seen.insert(key) {
                    paths.push(path.clone());
                }
            }

            let is_installed = paths
                .iter()
                .any(|entry| Path::new(entry).exists())
                || obj.get("isInstalled").and_then(|v| v.as_bool()).unwrap_or(false);

            let platform_short = normalize_platform_short_name(
                obj.get("platformShortName")
                    .or_else(|| obj.get("platform"))
                    .and_then(|v| v.as_str())
                    .unwrap_or(""),
            );
            let platform_name = obj
                .get("platform")
                .and_then(|v| v.as_str())
                .unwrap_or(&platform_short)
                .trim()
                .to_string();
            let typ = normalize_emulator_type(
                obj.get("type")
                    .or_else(|| obj.get("emulatorType"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("standalone"),
            );

            obj.insert("filePath".to_string(), Value::String(path));
            obj.insert(
                "filePaths".to_string(),
                Value::Array(paths.into_iter().map(Value::String).collect()),
            );
            obj.insert("isInstalled".to_string(), Value::Bool(is_installed));
            obj.insert("type".to_string(), Value::String(typ));
            obj.insert("platformShortName".to_string(), Value::String(platform_short));
            obj.insert("platform".to_string(), Value::String(platform_name));

            let links = emulator_download_links(&Value::Object(obj.clone()));
            obj.insert("downloadLinks".to_string(), links);
            Value::Object(obj)
        })
        .collect()
}

fn normalize_emulator_type(raw: &str) -> String {
    let value = raw.trim().to_lowercase();
    if value == "core" || value == "web" {
        return value;
    }
    "standalone".to_string()
}

fn emulator_identity_key(row: &Value) -> Option<String> {
    let platform_short = normalize_platform_short_name(
        row.get("platformShortName")
            .or_else(|| row.get("platform"))
            .and_then(|v| v.as_str())
            .unwrap_or(""),
    );
    let name = row
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let name_key = normalize_emulator_name_key(&name);
    if platform_short.is_empty() || name_key.is_empty() {
        return None;
    }
    Some(format!("{}::{}", platform_short, name_key))
}

fn merge_emulator_rows(config_row: Value, installed_row: Value) -> Value {
    let mut merged = config_row.as_object().cloned().unwrap_or_default();
    if let Some(installed) = installed_row.as_object() {
        for (key, value) in installed {
            merged.insert(key.clone(), value.clone());
        }
    }
    let mut out = Value::Object(merged);
    let links = emulator_download_links(&out);
    if let Some(obj) = out.as_object_mut() {
        obj.insert("downloadLinks".to_string(), links);
    }
    out
}

fn normalize_emulator_name_key(raw: &str) -> String {
    raw.trim()
        .to_lowercase()
        .chars()
        .filter(|ch| ch.is_ascii_alphanumeric())
        .collect::<String>()
}

fn normalized_string_array(input: Option<&Value>) -> Vec<Value> {
    input
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .filter_map(|v| v.as_str().map(|s| s.trim().to_string()))
        .filter(|s| !s.is_empty())
        .map(Value::String)
        .collect()
}

fn normalize_download_link_url(value: &str) -> String {
    let text = value.trim();
    if text.is_empty() {
        return String::new();
    }
    if text.to_lowercase().starts_with("http://") || text.to_lowercase().starts_with("https://") {
        return text.to_string();
    }
    format!("https://{}", text)
}

fn first_non_empty_url(value: Option<&Value>) -> String {
    if let Some(text) = value.and_then(|v| v.as_str()) {
        let normalized = normalize_download_link_url(text);
        if !normalized.is_empty() {
            return normalized;
        }
    }
    if let Some(arr) = value.and_then(|v| v.as_array()) {
        for item in arr {
            let normalized = normalize_download_link_url(item.as_str().unwrap_or(""));
            if !normalized.is_empty() {
                return normalized;
            }
        }
    }
    String::new()
}

fn read_download_link_for_keys(
    direct_links: Option<&serde_json::Map<String, Value>>,
    download_url: Option<&serde_json::Map<String, Value>>,
    keys: &[&str],
) -> String {
    for key in keys {
        let normalized = first_non_empty_url(direct_links.and_then(|m| m.get(*key)));
        if !normalized.is_empty() {
            return normalized;
        }
    }
    for key in keys {
        let normalized = first_non_empty_url(download_url.and_then(|m| m.get(*key)));
        if !normalized.is_empty() {
            return normalized;
        }
    }
    String::new()
}

fn emulator_download_links(row: &Value) -> Value {
    let direct_links = row.get("downloadLinks").and_then(|v| v.as_object());
    let download_url = row.get("downloadUrl").and_then(|v| v.as_object());

    let windows = read_download_link_for_keys(
        direct_links,
        download_url,
        &["windows", "win", "win32", "default", "all", "any"],
    );
    let linux = read_download_link_for_keys(
        direct_links,
        download_url,
        &["linux", "default", "all", "any"],
    );
    let mac = read_download_link_for_keys(
        direct_links,
        download_url,
        &["mac", "macos", "darwin", "osx", "default", "all", "any"],
    );

    json!({
        "windows": windows,
        "linux": linux,
        "mac": mac
    })
}

const SPLASH_THEME_STATE_KEY: &str = "splashThemeSettings";

fn default_splash_theme_settings() -> Value {
    json!({
        "id": "dark",
        "tone": "dark",
        "bgPrimary": "#0b1220",
        "bgSecondary": "#121c2f",
        "bgTertiary": "#1a263d",
        "textPrimary": "#e7edf8",
        "textSecondary": "#b9c7dc",
        "accentColor": "#5c758d",
        "accentLight": "#8498ad",
        "fontBody": "Segoe UI, Inter, sans-serif",
        "appGradientA": "#0b1220",
        "appGradientB": "#121c2f",
        "appGradientC": "#1a263d"
    })
}

fn is_hex_color(input: &str) -> bool {
    let text = input.trim();
    if !text.starts_with('#') {
        return false;
    }
    let hex = &text[1..];
    matches!(hex.len(), 3 | 4 | 6 | 8) && hex.chars().all(|ch| ch.is_ascii_hexdigit())
}

fn read_color_field(source: Option<&Value>, key: &str, fallback: &str) -> String {
    let value = source
        .and_then(|v| v.get(key))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    if is_hex_color(&value) {
        value
    } else {
        fallback.to_string()
    }
}

fn normalize_splash_theme_settings(payload: Option<&Value>) -> Value {
    let defaults = default_splash_theme_settings();
    let default_obj = defaults.as_object().cloned().unwrap_or_default();

    let id = payload
        .and_then(|v| v.get("id"))
        .and_then(|v| v.as_str())
        .unwrap_or(default_obj.get("id").and_then(|v| v.as_str()).unwrap_or("dark"))
        .trim();
    let tone_raw = payload
        .and_then(|v| v.get("tone"))
        .and_then(|v| v.as_str())
        .unwrap_or("dark")
        .trim()
        .to_lowercase();
    let tone = if tone_raw == "light" { "light" } else { "dark" };

    let default_bg_primary = default_obj
        .get("bgPrimary")
        .and_then(|v| v.as_str())
        .unwrap_or("#0b1220");
    let default_bg_secondary = default_obj
        .get("bgSecondary")
        .and_then(|v| v.as_str())
        .unwrap_or("#121c2f");
    let default_bg_tertiary = default_obj
        .get("bgTertiary")
        .and_then(|v| v.as_str())
        .unwrap_or("#1a263d");
    let default_text_primary = default_obj
        .get("textPrimary")
        .and_then(|v| v.as_str())
        .unwrap_or("#e7edf8");
    let default_text_secondary = default_obj
        .get("textSecondary")
        .and_then(|v| v.as_str())
        .unwrap_or("#b9c7dc");
    let default_accent = default_obj
        .get("accentColor")
        .and_then(|v| v.as_str())
        .unwrap_or("#5c758d");
    let default_accent_light = default_obj
        .get("accentLight")
        .and_then(|v| v.as_str())
        .unwrap_or("#8498ad");

    let bg_primary = read_color_field(payload, "bgPrimary", default_bg_primary);
    let bg_secondary = read_color_field(payload, "bgSecondary", default_bg_secondary);
    let bg_tertiary = read_color_field(payload, "bgTertiary", default_bg_tertiary);
    let text_primary = read_color_field(payload, "textPrimary", default_text_primary);
    let text_secondary = read_color_field(payload, "textSecondary", default_text_secondary);
    let accent_color = read_color_field(payload, "accentColor", default_accent);
    let accent_light = read_color_field(payload, "accentLight", default_accent_light);
    let app_gradient_a = read_color_field(payload, "appGradientA", &bg_primary);
    let app_gradient_b = read_color_field(payload, "appGradientB", &bg_secondary);
    let app_gradient_c = read_color_field(payload, "appGradientC", &bg_tertiary);
    let font_body = payload
        .and_then(|v| v.get("fontBody"))
        .and_then(|v| v.as_str())
        .unwrap_or(default_obj.get("fontBody").and_then(|v| v.as_str()).unwrap_or("Segoe UI, Inter, sans-serif"))
        .trim();

    json!({
        "id": if id.is_empty() { "dark" } else { id },
        "tone": tone,
        "bgPrimary": bg_primary,
        "bgSecondary": bg_secondary,
        "bgTertiary": bg_tertiary,
        "textPrimary": text_primary,
        "textSecondary": text_secondary,
        "accentColor": accent_color,
        "accentLight": accent_light,
        "fontBody": if font_body.is_empty() { "Segoe UI, Inter, sans-serif" } else { font_body },
        "appGradientA": app_gradient_a,
        "appGradientB": app_gradient_b,
        "appGradientC": app_gradient_c
    })
}

fn read_splash_theme_settings() -> Value {
    let Ok(conn) = open_state_db() else {
        return default_splash_theme_settings();
    };
    match db_get_state_value(&conn, SPLASH_THEME_STATE_KEY) {
        Ok(Some(value)) => normalize_splash_theme_settings(Some(&value)),
        _ => default_splash_theme_settings(),
    }
}

fn write_splash_theme_settings(payload: Option<&Value>) -> Result<Value, String> {
    let normalized = normalize_splash_theme_settings(payload);
    let conn = open_state_db()?;
    db_set_state_value(&conn, SPLASH_THEME_STATE_KEY, &normalized)?;
    Ok(normalized)
}

fn shell_state_storage_key(key: &str) -> String {
    format!("desktop:shell:{}", key.trim())
}

fn read_shell_state_value(key: &str, fallback: Value) -> Value {
    read_state_value_or_default(&shell_state_storage_key(key), fallback)
}

fn write_shell_state_value(key: &str, value: &Value) -> Result<Value, String> {
    write_state_value(&shell_state_storage_key(key), value)?;
    Ok(value.clone())
}

fn delete_shell_state_value(key: &str) -> Result<(), String> {
    let conn = open_state_db()?;
    conn.execute(
        "DELETE FROM app_state WHERE key = ?1",
        [shell_state_storage_key(key)],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn sanitize_tool_plugin_segment(input: &str) -> String {
    let normalized = input
        .trim()
        .to_lowercase()
        .chars()
        .map(|ch| if ch.is_ascii_alphanumeric() { ch } else { '-' })
        .collect::<String>();
    let collapsed = normalized
        .split('-')
        .filter(|part| !part.trim().is_empty())
        .collect::<Vec<_>>()
        .join("-");
    if collapsed.is_empty() {
        "tool-plugin".to_string()
    } else {
        collapsed
    }
}

fn tool_plugins_root_dir() -> PathBuf {
    managed_data_root().join("tool-plugins")
}

fn default_tool_plugin_html(name: &str) -> String {
    format!(
        "<div class=\"tool-plugin-root\">\n  <h1>{}</h1>\n  <p>This web plugin is running inside emuBro.</p>\n  <button id=\"tool-plugin-btn\" type=\"button\">Click me</button>\n  <p id=\"tool-plugin-status\"></p>\n</div>\n",
        name
    )
}

fn default_tool_plugin_css() -> String {
    r#":root {
  color-scheme: dark;
}

body {
  margin: 0;
  padding: 16px;
  font-family: "Segoe UI", Arial, sans-serif;
  background: #0f1728;
  color: #d6e6ff;
}

.tool-plugin-root {
  border: 1px solid rgba(120, 170, 255, 0.28);
  border-radius: 12px;
  padding: 14px;
  background: linear-gradient(165deg, rgba(18, 34, 60, 0.94), rgba(12, 24, 44, 0.94));
}

h1 {
  margin: 0 0 8px;
  font-size: 1.2rem;
}

button {
  border: 1px solid rgba(120, 170, 255, 0.35);
  background: #1f3b68;
  color: #e8f2ff;
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
}
"#
    .to_string()
}

fn default_tool_plugin_js() -> String {
    r#"const button = document.getElementById('tool-plugin-btn');
const status = document.getElementById('tool-plugin-status');

if (button && status) {
  button.addEventListener('click', () => {
    status.textContent = `Clicked at ${new Date().toLocaleTimeString()}`;
  });
}"#
    .to_string()
}

fn path_is_within_root(root: &Path, candidate: &Path) -> bool {
    let canonical_root = fs::canonicalize(root).unwrap_or_else(|_| root.to_path_buf());
    let canonical_candidate = match fs::canonicalize(candidate) {
        Ok(path) => path,
        Err(_) => return false,
    };
    canonical_candidate.starts_with(&canonical_root)
}

fn create_tool_plugin_files(payload: &Value) -> Result<Value, String> {
    let name = payload
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("Custom Tool Plugin")
        .trim()
        .to_string();
    let requested_id = payload
        .get("pluginId")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();

    let id_seed = if requested_id.is_empty() { name.clone() } else { requested_id };
    let folder_slug = sanitize_tool_plugin_segment(&id_seed);
    let plugins_root = tool_plugins_root_dir();
    ensure_directory(&plugins_root)?;

    let plugin_dir = plugins_root.join(folder_slug);
    ensure_directory(&plugin_dir)?;

    let html_path = plugin_dir.join("index.html");
    let css_path = plugin_dir.join("style.css");
    let js_path = plugin_dir.join("script.js");

    if !html_path.exists() {
        fs::write(&html_path, default_tool_plugin_html(&name)).map_err(|e| e.to_string())?;
    }
    if !css_path.exists() {
        fs::write(&css_path, default_tool_plugin_css()).map_err(|e| e.to_string())?;
    }
    if !js_path.exists() {
        fs::write(&js_path, default_tool_plugin_js()).map_err(|e| e.to_string())?;
    }

    Ok(json!({
        "success": true,
        "pluginDir": plugin_dir.to_string_lossy().to_string(),
        "htmlFilePath": html_path.to_string_lossy().to_string(),
        "cssFilePath": css_path.to_string_lossy().to_string(),
        "jsFilePath": js_path.to_string_lossy().to_string()
    }))
}

fn read_tool_plugin_files(payload: &Value) -> Result<Value, String> {
    let html_path = PathBuf::from(
        payload
            .get("htmlFilePath")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim(),
    );
    let css_path = PathBuf::from(
        payload
            .get("cssFilePath")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim(),
    );
    let js_path = PathBuf::from(
        payload
            .get("jsFilePath")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim(),
    );

    if html_path.as_os_str().is_empty() || css_path.as_os_str().is_empty() || js_path.as_os_str().is_empty() {
        return Ok(json!({
            "success": false,
            "message": "Missing plugin file path(s)."
        }));
    }

    let plugins_root = tool_plugins_root_dir();
    if !path_is_within_root(&plugins_root, &html_path)
        || !path_is_within_root(&plugins_root, &css_path)
        || !path_is_within_root(&plugins_root, &js_path)
    {
        return Ok(json!({
            "success": false,
            "message": "Plugin files must be inside the managed tool-plugins directory."
        }));
    }

    let html = fs::read_to_string(&html_path).map_err(|e| e.to_string())?;
    let css = fs::read_to_string(&css_path).map_err(|e| e.to_string())?;
    let js = fs::read_to_string(&js_path).map_err(|e| e.to_string())?;

    Ok(json!({
        "success": true,
        "html": html,
        "css": css,
        "js": js
    }))
}
