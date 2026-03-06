use super::*;

pub(crate) fn sqlite_table_exists(conn: &Connection, table_name: &str) -> Result<bool, String> {
    let count = conn
        .query_row(
            "SELECT COUNT(1) FROM sqlite_master WHERE type='table' AND name = ?1",
            params![table_name],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|e| e.to_string())?;
    Ok(count > 0)
}

pub(crate) fn sqlite_table_columns(
    conn: &Connection,
    table_name: &str,
) -> Result<std::collections::HashSet<String>, String> {
    let mut out = std::collections::HashSet::new();
    let sql = format!("PRAGMA table_info({})", table_name);
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|e| e.to_string())?;
    for value in rows {
        let column = value.map_err(|e| e.to_string())?;
        out.insert(column.trim().to_lowercase());
    }
    Ok(out)
}

pub(crate) fn parse_legacy_tags(raw: &str) -> Vec<Value> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Vec::new();
    }
    if let Ok(Value::Array(rows)) = serde_json::from_str::<Value>(trimmed) {
        let mut out = Vec::<Value>::new();
        let mut seen = std::collections::HashSet::<String>::new();
        for row in rows {
            let tag = normalize_tag_id(row.as_str().unwrap_or(""));
            if tag.is_empty() {
                continue;
            }
            if seen.insert(tag.clone()) {
                out.push(Value::String(tag));
            }
        }
        return out;
    }

    let mut out = Vec::<Value>::new();
    let mut seen = std::collections::HashSet::<String>::new();
    for entry in trimmed.split([',', ';']) {
        let tag = normalize_tag_id(entry);
        if tag.is_empty() {
            continue;
        }
        if seen.insert(tag.clone()) {
            out.push(Value::String(tag));
        }
    }
    out
}

pub(crate) fn read_legacy_games(conn: &Connection) -> Result<Vec<Value>, String> {
    if !sqlite_table_exists(conn, "games")? {
        return Ok(Vec::new());
    }
    let columns = sqlite_table_columns(conn, "games")?;
    let select_or_default = |col: &str, fallback: &str| -> String {
        if columns.contains(&col.to_lowercase()) {
            col.to_string()
        } else {
            format!("{} AS {}", fallback, col)
        }
    };

    let sql = format!(
        "SELECT
            {id},
            {name},
            {platform},
            {platform_short},
            {file_path},
            {code},
            {image},
            {progress},
            {last_played},
            {run_as_mode},
            {run_as_user},
            {emu_override},
            {tags}
         FROM games
         ORDER BY COALESCE(name, '') COLLATE NOCASE",
        id = select_or_default("id", "NULL"),
        name = select_or_default("name", "''"),
        platform = select_or_default("platform", "''"),
        platform_short = select_or_default("platformShortName", "''"),
        file_path = select_or_default("filePath", "''"),
        code = select_or_default("code", "''"),
        image = select_or_default("image", "''"),
        progress = select_or_default("progress", "0"),
        last_played = select_or_default("lastPlayed", "NULL"),
        run_as_mode = select_or_default("runAsMode", "''"),
        run_as_user = select_or_default("runAsUser", "''"),
        emu_override = select_or_default("emulatorOverridePath", "''"),
        tags = select_or_default("tags", "''")
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            let id = row.get::<_, Option<i64>>(0)?.unwrap_or(0);
            let name = row.get::<_, Option<String>>(1)?.unwrap_or_default();
            let platform = row.get::<_, Option<String>>(2)?.unwrap_or_default();
            let platform_short = row.get::<_, Option<String>>(3)?.unwrap_or_default();
            let file_path = row.get::<_, Option<String>>(4)?.unwrap_or_default();
            let code = row.get::<_, Option<String>>(5)?.unwrap_or_default();
            let image = row.get::<_, Option<String>>(6)?.unwrap_or_default();
            let progress = row.get::<_, Option<i64>>(7)?.unwrap_or(0);
            let last_played = row.get::<_, Option<String>>(8)?;
            let run_as_mode = row.get::<_, Option<String>>(9)?.unwrap_or_default();
            let run_as_user = row.get::<_, Option<String>>(10)?.unwrap_or_default();
            let emulator_override = row.get::<_, Option<String>>(11)?.unwrap_or_default();
            let tags_text = row.get::<_, Option<String>>(12)?.unwrap_or_default();
            let tags = parse_legacy_tags(&tags_text);

            let mut out = serde_json::Map::new();
            out.insert("id".to_string(), Value::Number(id.into()));
            out.insert("name".to_string(), Value::String(name.trim().to_string()));
            out.insert("platform".to_string(), Value::String(platform.trim().to_string()));
            out.insert(
                "platformShortName".to_string(),
                Value::String(normalize_platform_short_name(&platform_short)),
            );
            out.insert(
                "filePath".to_string(),
                Value::String(file_path.trim().to_string()),
            );
            out.insert("code".to_string(), Value::String(code.trim().to_string()));
            out.insert("image".to_string(), Value::String(image.trim().to_string()));
            out.insert("progress".to_string(), Value::Number(progress.into()));
            out.insert(
                "lastPlayed".to_string(),
                last_played
                    .map(|v| Value::String(v.trim().to_string()))
                    .unwrap_or(Value::Null),
            );
            out.insert("runAsMode".to_string(), Value::String(run_as_mode.trim().to_string()));
            out.insert("runAsUser".to_string(), Value::String(run_as_user.trim().to_string()));
            out.insert(
                "emulatorOverridePath".to_string(),
                Value::String(emulator_override.trim().to_string()),
            );
            out.insert("tags".to_string(), Value::Array(tags));
            Ok(Value::Object(out))
        })
        .map_err(|e| e.to_string())?;

    let mut out = Vec::<Value>::new();
    let mut next_id = 1i64;
    let mut seen_path = std::collections::HashSet::<String>::new();
    for row in rows {
        let mut value = row.map_err(|e| e.to_string())?;
        if let Some(obj) = value.as_object_mut() {
            let file_path = obj
                .get("filePath")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if file_path.is_empty() {
                continue;
            }
            let path_key = file_path.to_lowercase();
            if !seen_path.insert(path_key) {
                continue;
            }
            if obj
                .get("id")
                .and_then(|v| v.as_i64())
                .unwrap_or(0)
                <= 0
            {
                obj.insert("id".to_string(), Value::Number(next_id.into()));
                next_id += 1;
            } else {
                let current = obj.get("id").and_then(|v| v.as_i64()).unwrap_or(0);
                if current >= next_id {
                    next_id = current + 1;
                }
            }
            if obj
                .get("platformShortName")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .is_empty()
            {
                let fallback = normalize_platform_short_name(
                    obj.get("platform")
                        .and_then(|v| v.as_str())
                        .unwrap_or("unknown"),
                );
                obj.insert("platformShortName".to_string(), Value::String(fallback));
            }
        }
        out.push(value);
    }

    Ok(out)
}

pub(crate) fn read_legacy_emulators(conn: &Connection) -> Result<Vec<Value>, String> {
    if !sqlite_table_exists(conn, "emulators")? {
        return Ok(Vec::new());
    }
    let columns = sqlite_table_columns(conn, "emulators")?;
    let select_or_default = |col: &str, fallback: &str| -> String {
        if columns.contains(&col.to_lowercase()) {
            col.to_string()
        } else {
            format!("{} AS {}", fallback, col)
        }
    };

    let sql = format!(
        "SELECT
            {id},
            {name},
            {platform},
            {platform_short},
            {file_path}
         FROM emulators
         ORDER BY COALESCE(name, '') COLLATE NOCASE",
        id = select_or_default("id", "NULL"),
        name = select_or_default("name", "''"),
        platform = select_or_default("platform", "''"),
        platform_short = select_or_default("platformShortName", "''"),
        file_path = select_or_default("filePath", "''"),
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            let id = row.get::<_, Option<i64>>(0)?.unwrap_or(0);
            let name = row.get::<_, Option<String>>(1)?.unwrap_or_default();
            let platform = row.get::<_, Option<String>>(2)?.unwrap_or_default();
            let platform_short = row.get::<_, Option<String>>(3)?.unwrap_or_default();
            let file_path = row.get::<_, Option<String>>(4)?.unwrap_or_default();
            Ok(json!({
                "id": id,
                "name": name.trim(),
                "platform": platform.trim(),
                "platformShortName": normalize_platform_short_name(&platform_short),
                "filePath": file_path.trim(),
                "args": "",
                "workingDirectory": Path::new(file_path.trim()).parent().map(|p| p.to_string_lossy().to_string()).unwrap_or_default()
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut out = Vec::<Value>::new();
    let mut next_id = 1i64;
    let mut seen_path = std::collections::HashSet::<String>::new();
    for row in rows {
        let mut value = row.map_err(|e| e.to_string())?;
        if let Some(obj) = value.as_object_mut() {
            let file_path = obj
                .get("filePath")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if file_path.is_empty() {
                continue;
            }
            let path_key = file_path.to_lowercase();
            if !seen_path.insert(path_key) {
                continue;
            }
            if obj
                .get("id")
                .and_then(|v| v.as_i64())
                .unwrap_or(0)
                <= 0
            {
                obj.insert("id".to_string(), Value::Number(next_id.into()));
                next_id += 1;
            } else {
                let current = obj.get("id").and_then(|v| v.as_i64()).unwrap_or(0);
                if current >= next_id {
                    next_id = current + 1;
                }
            }
        }
        out.push(value);
    }
    Ok(out)
}

pub(crate) fn read_legacy_tags(conn: &Connection) -> Result<Vec<Value>, String> {
    if !sqlite_table_exists(conn, "tags")? {
        return Ok(Vec::new());
    }
    let columns = sqlite_table_columns(conn, "tags")?;
    let select_or_default = |col: &str, fallback: &str| -> String {
        if columns.contains(&col.to_lowercase()) {
            col.to_string()
        } else {
            format!("{} AS {}", fallback, col)
        }
    };

    let sql = format!(
        "SELECT
            {id},
            {label},
            {source}
         FROM tags
         ORDER BY COALESCE(label, id) COLLATE NOCASE",
        id = select_or_default("id", "''"),
        label = select_or_default("label", "''"),
        source = select_or_default("source", "'db'")
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            let id = row.get::<_, Option<String>>(0)?.unwrap_or_default();
            let label = row.get::<_, Option<String>>(1)?.unwrap_or_default();
            let source = row.get::<_, Option<String>>(2)?.unwrap_or_else(|| "db".to_string());
            let normalized_id = normalize_tag_id(&id);
            Ok(json!({
                "id": normalized_id,
                "label": if label.trim().is_empty() { id.trim().to_string() } else { label.trim().to_string() },
                "source": if source.trim().is_empty() { "db".to_string() } else { source.trim().to_string() }
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut out = Vec::<Value>::new();
    let mut seen = std::collections::HashSet::<String>::new();
    for row in rows {
        let value = row.map_err(|e| e.to_string())?;
        let id = value
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if id.is_empty() {
            continue;
        }
        if seen.insert(id.to_lowercase()) {
            out.push(value);
        }
    }
    Ok(out)
}

pub(crate) fn derive_tags_from_games(games: &[Value]) -> Vec<Value> {
    let mut out = Vec::<Value>::new();
    let mut seen = std::collections::HashSet::<String>::new();
    for game in games {
        let tags = game
            .get("tags")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default();
        for tag in tags {
            let id = normalize_tag_id(tag.as_str().unwrap_or(""));
            if id.is_empty() {
                continue;
            }
            if seen.insert(id.clone()) {
                out.push(json!({
                    "id": id.clone(),
                    "label": id.replace('-', " ").trim().to_string(),
                    "source": "db"
                }));
            }
        }
    }
    out
}

pub(crate) fn migrate_legacy_library_db_if_needed(conn: &Connection) -> Result<(), String> {
    let current_games = match db_get_state_value(conn, "games") {
        Ok(Some(Value::Array(rows))) => rows,
        _ => Vec::new(),
    };
    let current_emulators = match db_get_state_value(conn, "emulators") {
        Ok(Some(Value::Array(rows))) => rows,
        _ => Vec::new(),
    };
    let current_tags = match db_get_state_value(conn, "tags") {
        Ok(Some(Value::Array(rows))) => rows,
        _ => Vec::new(),
    };

    if !current_games.is_empty() && !current_emulators.is_empty() {
        return Ok(());
    }

    let mut imported_games = Vec::<Value>::new();
    let mut imported_emulators = Vec::<Value>::new();
    let mut imported_tags = Vec::<Value>::new();

    for candidate in legacy_library_db_candidate_paths() {
        if !candidate.exists() || !candidate.is_file() {
            continue;
        }
        let legacy_conn = match Connection::open(&candidate) {
            Ok(conn) => conn,
            Err(_) => continue,
        };
        imported_games = read_legacy_games(&legacy_conn)?;
        imported_emulators = read_legacy_emulators(&legacy_conn)?;
        imported_tags = read_legacy_tags(&legacy_conn)?;

        if imported_tags.is_empty() && !imported_games.is_empty() {
            imported_tags = derive_tags_from_games(&imported_games);
        }
        if !imported_games.is_empty() || !imported_emulators.is_empty() || !imported_tags.is_empty() {
            break;
        }
    }

    if current_games.is_empty() && !imported_games.is_empty() {
        db_set_state_value(conn, "games", &Value::Array(imported_games))?;
    }
    if current_emulators.is_empty() && !imported_emulators.is_empty() {
        db_set_state_value(conn, "emulators", &Value::Array(imported_emulators))?;
    }
    if current_tags.is_empty() && !imported_tags.is_empty() {
        db_set_state_value(conn, "tags", &Value::Array(imported_tags))?;
    }

    Ok(())
}

pub(crate) fn migrate_legacy_json_state_if_needed(conn: &mut Connection) -> Result<(), String> {
    let current_count = conn
        .query_row("SELECT COUNT(1) FROM app_state", [], |row| row.get::<_, i64>(0))
        .map_err(|e| e.to_string())?;
    if current_count > 0 {
        return Ok(());
    }

    let legacy_state = read_legacy_state_json();
    if legacy_state.is_empty() {
        return Ok(());
    }

    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let mut stmt = tx
        .prepare(
            "INSERT OR REPLACE INTO app_state (key, value, updatedAt) VALUES (?1, ?2, CURRENT_TIMESTAMP)",
        )
        .map_err(|e| e.to_string())?;
    for (key, value) in legacy_state {
        let encoded = serde_json::to_string(&value).map_err(|e| e.to_string())?;
        stmt.execute(params![key, encoded]).map_err(|e| e.to_string())?;
    }
    drop(stmt);
    tx.commit().map_err(|e| e.to_string())
}
