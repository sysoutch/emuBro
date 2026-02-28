#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::{params, Connection, OptionalExtension};
use serde_json::{json, Value};
use std::collections::hash_map::DefaultHasher;
use std::fs;
use std::hash::{Hash, Hasher};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::Window;
use walkdir::WalkDir;
use zip::ZipArchive;

#[tauri::command]
fn app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

fn find_locales_dir() -> Option<PathBuf> {
    let cwd = std::env::current_dir().ok()?;
    let candidates = [
        cwd.join("locales"),
        cwd.join("../locales"),
        cwd.join("../../locales"),
        cwd.join("../../../../locales"),
    ];
    candidates
        .into_iter()
        .find(|path| path.exists() && path.is_dir())
}

fn find_platforms_dir() -> Option<PathBuf> {
    let cwd = std::env::current_dir().ok()?;
    let candidates = [
        cwd.join("emubro-resources").join("platforms"),
        cwd.join("../emubro-resources").join("platforms"),
        cwd.join("../../emubro-resources").join("platforms"),
        cwd.join("../../../../emubro-resources").join("platforms"),
    ];
    candidates
        .into_iter()
        .find(|path| path.exists() && path.is_dir())
}

fn locale_file_path(base: &Path, file_name: &str) -> Option<PathBuf> {
    let name = String::from(file_name).trim().to_string();
    if name.is_empty() {
        return None;
    }
    if name.contains("..") || name.contains('/') || name.contains('\\') {
        return None;
    }
    Some(base.join(name))
}

fn read_all_translations_from_disk() -> Value {
    let Some(locales_dir) = find_locales_dir() else {
        return json!({});
    };

    let mut out = serde_json::Map::new();
    let Ok(entries) = fs::read_dir(locales_dir) else {
        return json!({});
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        if path.extension().and_then(|s| s.to_str()).unwrap_or("") != "json" {
            continue;
        }
        let stem = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if stem.is_empty() {
            continue;
        }

        let Ok(contents) = fs::read_to_string(&path) else {
            continue;
        };
        let Ok(parsed) = serde_json::from_str::<Value>(&contents) else {
            continue;
        };
        out.insert(stem, parsed);
    }

    Value::Object(out)
}

fn state_db_path() -> PathBuf {
    std::env::current_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join(".emubro-tauri-state.db")
}

fn legacy_json_state_path() -> PathBuf {
    std::env::current_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join(".emubro-tauri-state.json")
}

fn read_legacy_state_json() -> serde_json::Map<String, Value> {
    let path = legacy_json_state_path();
    let Ok(raw) = fs::read_to_string(path) else {
        return serde_json::Map::new();
    };
    match serde_json::from_str::<Value>(&raw) {
        Ok(Value::Object(map)) => map,
        _ => serde_json::Map::new(),
    }
}

fn legacy_library_db_candidate_paths() -> Vec<PathBuf> {
    let mut out = Vec::<PathBuf>::new();
    let mut seen = std::collections::HashSet::<String>::new();
    let push = |rows: &mut Vec<PathBuf>,
                used: &mut std::collections::HashSet<String>,
                path: PathBuf| {
        let key = path.to_string_lossy().to_lowercase();
        if used.insert(key) {
            rows.push(path);
        }
    };

    if let Ok(cwd) = std::env::current_dir() {
        push(&mut out, &mut seen, cwd.join("library.db"));
        push(&mut out, &mut seen, cwd.join("../library.db"));
        push(&mut out, &mut seen, cwd.join("../../library.db"));
    }

    let roaming_roots = [
        "emuBro",
        "emubro",
        "emuBro-Reloaded",
        "emubro-reloaded",
        "emuBro Reloaded",
    ];
    if let Ok(appdata) = std::env::var("APPDATA") {
        let base = PathBuf::from(appdata);
        for root in roaming_roots {
            push(&mut out, &mut seen, base.join(root).join("library.db"));
        }
    }
    if let Ok(local_appdata) = std::env::var("LOCALAPPDATA") {
        let base = PathBuf::from(local_appdata);
        for root in roaming_roots {
            push(&mut out, &mut seen, base.join(root).join("library.db"));
        }
    }

    out
}

fn sqlite_table_exists(conn: &Connection, table_name: &str) -> Result<bool, String> {
    let count = conn
        .query_row(
            "SELECT COUNT(1) FROM sqlite_master WHERE type='table' AND name = ?1",
            params![table_name],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|e| e.to_string())?;
    Ok(count > 0)
}

fn sqlite_table_columns(
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

fn parse_legacy_tags(raw: &str) -> Vec<Value> {
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

fn read_legacy_games(conn: &Connection) -> Result<Vec<Value>, String> {
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

fn read_legacy_emulators(conn: &Connection) -> Result<Vec<Value>, String> {
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

fn read_legacy_tags(conn: &Connection) -> Result<Vec<Value>, String> {
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

fn derive_tags_from_games(games: &[Value]) -> Vec<Value> {
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

fn migrate_legacy_library_db_if_needed(conn: &Connection) -> Result<(), String> {
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

fn migrate_legacy_json_state_if_needed(conn: &mut Connection) -> Result<(), String> {
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

fn open_state_db() -> Result<Connection, String> {
    let db_path = state_db_path();
    let mut conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    conn.execute_batch(
        "
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS app_state (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        );
        ",
    )
    .map_err(|e| e.to_string())?;
    migrate_legacy_json_state_if_needed(&mut conn)?;
    migrate_legacy_library_db_if_needed(&conn)?;
    Ok(conn)
}

fn db_get_state_value(conn: &Connection, key: &str) -> Result<Option<Value>, String> {
    let encoded = conn
        .query_row(
            "SELECT value FROM app_state WHERE key = ?1",
            params![key],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;
    let Some(text) = encoded else {
        return Ok(None);
    };
    let parsed = serde_json::from_str::<Value>(&text).map_err(|e| e.to_string())?;
    Ok(Some(parsed))
}

fn db_set_state_value(conn: &Connection, key: &str, value: &Value) -> Result<(), String> {
    let encoded = serde_json::to_string(value).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO app_state (key, value, updatedAt)
         VALUES (?1, ?2, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET
           value = excluded.value,
           updatedAt = CURRENT_TIMESTAMP",
        params![key, encoded],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn read_state_array(key: &str) -> Vec<Value> {
    let Ok(conn) = open_state_db() else {
        return Vec::new();
    };
    match db_get_state_value(&conn, key) {
        Ok(Some(Value::Array(rows))) => rows,
        _ => Vec::new(),
    }
}

fn write_state_array(key: &str, rows: Vec<Value>) -> Result<(), String> {
    let conn = open_state_db()?;
    db_set_state_value(&conn, key, &Value::Array(rows))
}

fn normalize_path_list(input: Option<&Value>) -> Vec<Value> {
    let mut out = Vec::<Value>::new();
    if let Some(Value::Array(values)) = input {
        for item in values {
            if let Some(text) = item.as_str() {
                let trimmed = text.trim();
                if trimmed.is_empty() {
                    continue;
                }
                out.push(Value::String(trimmed.to_string()));
            }
        }
    }
    out
}

fn default_library_path_settings() -> Value {
    json!({
        "scanFolders": [],
        "gameFolders": [],
        "emulatorFolders": []
    })
}

fn normalize_library_path_settings(payload: Option<&Value>) -> Value {
    let scan_folders = normalize_path_list(payload.and_then(|v| v.get("scanFolders")));
    let game_folders = normalize_path_list(payload.and_then(|v| v.get("gameFolders")));
    let emulator_folders = normalize_path_list(payload.and_then(|v| v.get("emulatorFolders")));
    json!({
        "scanFolders": scan_folders,
        "gameFolders": game_folders,
        "emulatorFolders": emulator_folders
    })
}

fn read_library_path_settings() -> Value {
    let Ok(conn) = open_state_db() else {
        return default_library_path_settings();
    };
    match db_get_state_value(&conn, "libraryPathSettings") {
        Ok(Some(value)) => normalize_library_path_settings(Some(&value)),
        _ => default_library_path_settings(),
    }
}

fn write_library_path_settings(payload: Option<&Value>) -> Result<Value, String> {
    let normalized = normalize_library_path_settings(payload);
    let conn = open_state_db()?;
    db_set_state_value(&conn, "libraryPathSettings", &normalized)?;
    Ok(normalized)
}

fn load_platform_configs() -> Vec<Value> {
    let Some(platforms_dir) = find_platforms_dir() else {
        return Vec::new();
    };
    let Ok(entries) = fs::read_dir(platforms_dir) else {
        return Vec::new();
    };

    let mut out = Vec::<Value>::new();
    for entry in entries.flatten() {
        let dir = entry.path();
        if !dir.is_dir() {
            continue;
        }
        let platform_dir = dir
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if platform_dir.is_empty() {
            continue;
        }
        let config_path = dir.join("config.json");
        if !config_path.exists() {
            continue;
        }
        let Ok(raw) = fs::read_to_string(config_path) else {
            continue;
        };
        let Ok(mut parsed) = serde_json::from_str::<Value>(&raw) else {
            continue;
        };
        if let Some(obj) = parsed.as_object_mut() {
            obj.insert("platformDir".to_string(), Value::String(platform_dir.clone()));
            if obj.get("shortName").is_none() {
                obj.insert("shortName".to_string(), Value::String(platform_dir));
            }
        }
        out.push(parsed);
    }
    out
}

fn platform_matches_extension(platform: &Value, extension: &str) -> bool {
    let ext = extension.trim().to_lowercase();
    if ext.is_empty() {
        return false;
    }

    let check_array = |arr: Option<&Vec<Value>>| -> bool {
        arr.map(|rows| {
            rows.iter().any(|item| {
                item.as_str()
                    .map(|s| s.trim().to_lowercase() == ext)
                    .unwrap_or(false)
            })
        })
        .unwrap_or(false)
    };

    if check_array(platform.get("supportedImageTypes").and_then(|v| v.as_array())) {
        return true;
    }
    if check_array(platform.get("supportedArchiveTypes").and_then(|v| v.as_array())) {
        return true;
    }
    if let Some(emulators) = platform.get("emulators").and_then(|v| v.as_array()) {
        for emulator in emulators {
            if check_array(emulator.get("supportedFileTypes").and_then(|v| v.as_array())) {
                return true;
            }
        }
    }
    false
}

fn normalize_tag_id(input: &str) -> String {
    let mut out = String::new();
    for ch in input.trim().to_lowercase().chars() {
        if ch.is_ascii_alphanumeric() {
            out.push(ch);
        } else {
            out.push('-');
        }
    }
    out.trim_matches('-').to_string()
}

fn normalize_extension(value: &str) -> String {
    let trimmed = value.trim().to_lowercase();
    if trimmed.is_empty() {
        return String::new();
    }
    if trimmed.starts_with('.') {
        trimmed
    } else {
        format!(".{}", trimmed)
    }
}

fn next_numeric_id(rows: &[Value]) -> i64 {
    rows.iter()
        .filter_map(|row| row.get("id").and_then(|v| v.as_i64()))
        .max()
        .unwrap_or(0)
        + 1
}

fn path_key(value: &str) -> String {
    value.trim().to_lowercase()
}

fn add_unique_text(rows: &mut Vec<Value>, seen: &mut std::collections::HashSet<String>, value: &str) {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return;
    }
    let key = path_key(trimmed);
    if seen.insert(key) {
        rows.push(Value::String(trimmed.to_string()));
    }
}

fn read_string_array(input: Option<&Value>) -> std::collections::HashSet<String> {
    let mut out = std::collections::HashSet::new();
    let Some(Value::Array(values)) = input else {
        return out;
    };
    for value in values {
        let text = normalize_extension(value.as_str().unwrap_or(""));
        if text.is_empty() {
            continue;
        }
        out.insert(text);
    }
    out
}

fn extension_platform_map(platforms: &[Value]) -> std::collections::HashMap<String, Value> {
    let mut map = std::collections::HashMap::new();
    for platform in platforms {
        let short = platform
            .get("shortName")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_lowercase();
        if short.is_empty() {
            continue;
        }
        let name = platform
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or(&short)
            .trim()
            .to_string();
        let platform_row = json!({
            "shortName": short,
            "name": name
        });
        let mut supported = read_string_array(platform.get("supportedImageTypes"));
        for ext in read_string_array(platform.get("supportedArchiveTypes")) {
            supported.insert(ext);
        }
        for emulator in platform
            .get("emulators")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default()
        {
            for ext in read_string_array(emulator.get("supportedFileTypes")) {
                supported.insert(ext);
            }
        }
        for ext in supported {
            if ext == ".exe" || ext == ".bat" || ext == ".cmd" || ext == ".ps1" {
                continue;
            }
            map.entry(ext).or_insert_with(|| platform_row.clone());
        }
    }
    map
}

fn build_file_dialog(mut dialog: rfd::FileDialog, options: &Value) -> rfd::FileDialog {
    if let Some(title) = options.get("title").and_then(|v| v.as_str()) {
        let trimmed = title.trim();
        if !trimmed.is_empty() {
            dialog = dialog.set_title(trimmed);
        }
    }
    if let Some(default_path) = options.get("defaultPath").and_then(|v| v.as_str()) {
        let trimmed = default_path.trim();
        if !trimmed.is_empty() {
            let p = PathBuf::from(trimmed);
            if p.is_dir() {
                dialog = dialog.set_directory(&p);
            } else if p.is_file() {
                if let Some(parent) = p.parent() {
                    dialog = dialog.set_directory(parent);
                }
                if let Some(name) = p.file_name().and_then(|v| v.to_str()) {
                    dialog = dialog.set_file_name(name);
                }
            } else {
                dialog = dialog.set_directory(&p);
            }
        }
    }
    if let Some(filters) = options.get("filters").and_then(|v| v.as_array()) {
        for filter in filters {
            let name = filter
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("Files")
                .trim()
                .to_string();
            let mut exts = Vec::<String>::new();
            if let Some(raw_exts) = filter.get("extensions").and_then(|v| v.as_array()) {
                for entry in raw_exts {
                    let ext = entry.as_str().unwrap_or("").trim().trim_start_matches('.').to_string();
                    if ext.is_empty() {
                        continue;
                    }
                    exts.push(ext);
                }
            }
            if !exts.is_empty() {
                let refs = exts.iter().map(|v| v.as_str()).collect::<Vec<&str>>();
                dialog = dialog.add_filter(&name, &refs);
            }
        }
    }
    dialog
}

fn options_flag(options: &Value, key: &str) -> bool {
    options
        .get("properties")
        .and_then(|v| v.as_array())
        .map(|rows| {
            rows.iter().any(|entry| {
                entry
                    .as_str()
                    .map(|text| text.trim().eq_ignore_ascii_case(key))
                    .unwrap_or(false)
            })
        })
        .unwrap_or(false)
}

fn resolve_open_file_dialog(options: &Value) -> Value {
    let select_directory = options_flag(options, "openDirectory");
    let allow_multiple = options_flag(options, "multiSelections");
    let dialog = build_file_dialog(rfd::FileDialog::new(), options);

    if select_directory {
        if allow_multiple {
            let picked = dialog.pick_folders().unwrap_or_default();
            let file_paths: Vec<Value> = picked
                .into_iter()
                .map(|p| Value::String(p.to_string_lossy().to_string()))
                .collect();
            return json!({
                "canceled": file_paths.is_empty(),
                "filePaths": file_paths
            });
        }
        let picked = dialog.pick_folder();
        return match picked {
            Some(path) => json!({
                "canceled": false,
                "filePaths": [path.to_string_lossy().to_string()]
            }),
            None => json!({ "canceled": true, "filePaths": [] }),
        };
    }

    if allow_multiple {
        let picked = dialog.pick_files().unwrap_or_default();
        let file_paths: Vec<Value> = picked
            .into_iter()
            .map(|p| Value::String(p.to_string_lossy().to_string()))
            .collect();
        return json!({
            "canceled": file_paths.is_empty(),
            "filePaths": file_paths
        });
    }

    let picked = dialog.pick_file();
    match picked {
        Some(path) => json!({
            "canceled": false,
            "filePaths": [path.to_string_lossy().to_string()]
        }),
        None => json!({ "canceled": true, "filePaths": [] }),
    }
}

fn resolve_save_file_dialog(options: &Value) -> Value {
    let dialog = build_file_dialog(rfd::FileDialog::new(), options);
    match dialog.save_file() {
        Some(path) => json!({
            "canceled": false,
            "filePath": path.to_string_lossy().to_string()
        }),
        None => json!({
            "canceled": true,
            "filePath": ""
        }),
    }
}

fn scan_and_import_games_and_emulators(scan_target: &str, options: Option<&Value>) -> Result<Value, String> {
    let scope = options
        .and_then(|v| v.get("scope"))
        .and_then(|v| v.as_str())
        .unwrap_or("both")
        .trim()
        .to_lowercase();
    let scan_games = scope != "emulators";
    let scan_emulators = scope != "games";
    let recursive = options
        .and_then(|v| v.get("recursive"))
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    let max_depth = options
        .and_then(|v| v.get("maxDepth"))
        .and_then(|v| v.as_u64())
        .unwrap_or(if recursive { 20 } else { 0 }) as usize;

    let root = if scan_target.trim().is_empty() {
        std::env::current_dir().map_err(|e| e.to_string())?
    } else {
        PathBuf::from(scan_target.trim())
    };
    if !root.exists() || !root.is_dir() {
        return Ok(json!({
            "success": false,
            "message": "Scan path does not exist",
            "games": [],
            "emulators": [],
            "archives": [],
            "setupFiles": []
        }));
    }

    let platform_rows = load_platform_configs();
    let extension_map = extension_platform_map(&platform_rows);
    let archive_exts: std::collections::HashSet<String> = [".zip", ".rar", ".7z", ".iso", ".tar", ".gz"]
        .into_iter()
        .map(|v| v.to_string())
        .collect();
    let emulator_exts: std::collections::HashSet<String> = [".exe", ".bat", ".cmd", ".ps1", ".sh", ".appimage"]
        .into_iter()
        .map(|v| v.to_string())
        .collect();

    let mut games = read_state_array("games");
    let mut emulators = read_state_array("emulators");
    let mut games_seen = games
        .iter()
        .filter_map(|row| row.get("filePath").and_then(|v| v.as_str()))
        .map(path_key)
        .collect::<std::collections::HashSet<String>>();
    let mut emulators_seen = emulators
        .iter()
        .filter_map(|row| row.get("filePath").and_then(|v| v.as_str()))
        .map(path_key)
        .collect::<std::collections::HashSet<String>>();
    let mut archives_seen = std::collections::HashSet::new();
    let mut setup_seen = std::collections::HashSet::new();

    let mut found_games = Vec::<Value>::new();
    let mut found_emulators = Vec::<Value>::new();
    let mut found_archives = Vec::<Value>::new();
    let mut found_setup_files = Vec::<Value>::new();

    let mut next_game_id = next_numeric_id(&games);
    let mut next_emulator_id = next_numeric_id(&emulators);
    let max_findings = 1500usize;

    for entry in WalkDir::new(&root)
        .follow_links(false)
        .max_depth(max_depth)
        .into_iter()
        .filter_map(|row| row.ok())
    {
        if found_games.len() + found_emulators.len() >= max_findings {
            break;
        }
        if !entry.file_type().is_file() {
            continue;
        }
        let file_path = entry.path().to_string_lossy().to_string();
        if file_path.trim().is_empty() {
            continue;
        }
        let ext = normalize_extension(
            entry
                .path()
                .extension()
                .and_then(|v| v.to_str())
                .unwrap_or(""),
        );
        if ext.is_empty() {
            continue;
        }

        if archive_exts.contains(&ext) {
            add_unique_text(&mut found_archives, &mut archives_seen, &file_path);
        }
        let file_name = entry.file_name().to_string_lossy().to_lowercase();
        if file_name.contains("setup") && (ext == ".exe" || ext == ".msi" || ext == ".pkg") {
            add_unique_text(&mut found_setup_files, &mut setup_seen, &file_path);
        }

        if scan_games {
            if let Some(platform) = extension_map.get(&ext) {
                let key = path_key(&file_path);
                if games_seen.insert(key) {
                    let title = entry
                        .path()
                        .file_stem()
                        .and_then(|v| v.to_str())
                        .unwrap_or("Unknown")
                        .trim()
                        .to_string();
                    let platform_short = platform
                        .get("shortName")
                        .and_then(|v| v.as_str())
                        .unwrap_or("unknown")
                        .trim()
                        .to_lowercase();
                    let platform_name = platform
                        .get("name")
                        .and_then(|v| v.as_str())
                        .unwrap_or("Unknown")
                        .trim()
                        .to_string();
                    let row = json!({
                        "id": next_game_id,
                        "name": title,
                        "platform": platform_name,
                        "platformShortName": platform_short,
                        "filePath": file_path,
                        "code": "",
                        "image": "",
                        "progress": 0,
                        "tags": []
                    });
                    next_game_id += 1;
                    games.push(row.clone());
                    found_games.push(row);
                    continue;
                }
            }
        }

        if scan_emulators && emulator_exts.contains(&ext) {
            let key = path_key(&file_path);
            if emulators_seen.insert(key) {
                let name = entry
                    .path()
                    .file_stem()
                    .and_then(|v| v.to_str())
                    .unwrap_or("Emulator")
                    .trim()
                    .to_string();
                let row = json!({
                    "id": next_emulator_id,
                    "name": name,
                    "filePath": file_path,
                    "platformShortName": "",
                    "args": "",
                    "workingDirectory": entry.path().parent().map(|p| p.to_string_lossy().to_string()).unwrap_or_default()
                });
                next_emulator_id += 1;
                emulators.push(row.clone());
                found_emulators.push(row);
            }
        }
    }

    if !found_games.is_empty() {
        write_state_array("games", games)?;
    }
    if !found_emulators.is_empty() {
        write_state_array("emulators", emulators)?;
    }

    Ok(json!({
        "success": true,
        "games": found_games,
        "emulators": found_emulators,
        "archives": found_archives,
        "setupFiles": found_setup_files
    }))
}

fn emulator_extensions() -> std::collections::HashSet<String> {
    [".exe", ".bat", ".cmd", ".ps1", ".sh", ".appimage"]
        .into_iter()
        .map(|v| v.to_string())
        .collect()
}

fn archive_extensions() -> std::collections::HashSet<String> {
    [".zip", ".rar", ".7z", ".iso", ".ciso", ".tar", ".gz"]
        .into_iter()
        .map(|v| v.to_string())
        .collect()
}

fn normalize_platform_short_name(value: &str) -> String {
    value.trim().to_lowercase()
}

fn find_platform_name(platforms: &[Value], platform_short_name: &str) -> String {
    let psn = normalize_platform_short_name(platform_short_name);
    if psn == "pc" {
        return "PC".to_string();
    }
    for row in platforms {
        let row_short = normalize_platform_short_name(
            row.get("shortName").and_then(|v| v.as_str()).unwrap_or(""),
        );
        if row_short == psn {
            return row
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("Unknown")
                .trim()
                .to_string();
        }
    }
    "Unknown".to_string()
}

fn detect_emulator_platform(path: &str, platforms: &[Value]) -> (bool, String, String) {
    let name = Path::new(path)
        .file_name()
        .and_then(|v| v.to_str())
        .unwrap_or("")
        .to_lowercase();
    if name.is_empty() {
        return (false, String::new(), String::new());
    }

    for row in platforms {
        let psn = normalize_platform_short_name(
            row.get("shortName").and_then(|v| v.as_str()).unwrap_or(""),
        );
        if psn.is_empty() {
            continue;
        }
        let pname = row
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("Unknown")
            .trim()
            .to_string();
        let pname_key = pname.to_lowercase().replace([' ', '-', '_'], "");
        let psn_key = psn.replace([' ', '-', '_'], "");

        if name.contains(&psn_key) || (!pname_key.is_empty() && name.contains(&pname_key)) {
            return (true, psn, pname);
        }

        if let Some(emulators) = row.get("emulators").and_then(|v| v.as_array()) {
            for emu in emulators {
                let emu_name = emu
                    .get("name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .trim()
                    .to_lowercase()
                    .replace([' ', '-', '_'], "");
                if !emu_name.is_empty() && name.replace([' ', '-', '_'], "").contains(&emu_name) {
                    return (true, psn, pname);
                }
            }
        }
    }

    (false, String::new(), String::new())
}

fn make_game_row(id: i64, file_path: &str, platform_short_name: &str, platform_name: &str) -> Value {
    let title = Path::new(file_path)
        .file_stem()
        .and_then(|v| v.to_str())
        .unwrap_or("Unknown")
        .trim()
        .to_string();
    json!({
        "id": id,
        "name": title,
        "platform": platform_name,
        "platformShortName": normalize_platform_short_name(platform_short_name),
        "filePath": file_path,
        "code": "",
        "image": "",
        "progress": 0,
        "tags": []
    })
}

fn make_emulator_row(id: i64, file_path: &str, platform_short_name: &str) -> Value {
    let title = Path::new(file_path)
        .file_stem()
        .and_then(|v| v.to_str())
        .unwrap_or("Emulator")
        .trim()
        .to_string();
    json!({
        "id": id,
        "name": title,
        "filePath": file_path,
        "platformShortName": normalize_platform_short_name(platform_short_name),
        "args": "",
        "workingDirectory": Path::new(file_path).parent().map(|p| p.to_string_lossy().to_string()).unwrap_or_default()
    })
}

fn copy_path_recursive(src: &Path, dest: &Path) -> Result<(), String> {
    if src.is_dir() {
        fs::create_dir_all(dest).map_err(|e| e.to_string())?;
        for entry in fs::read_dir(src).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let source_path = entry.path();
            let target_path = dest.join(entry.file_name());
            copy_path_recursive(&source_path, &target_path)?;
        }
        return Ok(());
    }
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::copy(src, dest).map_err(|e| e.to_string())?;
    Ok(())
}

fn move_path_safe(src: &Path, dest: &Path) -> Result<(), String> {
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    match fs::rename(src, dest) {
        Ok(_) => Ok(()),
        Err(_) => {
            copy_path_recursive(src, dest)?;
            if src.is_dir() {
                fs::remove_dir_all(src).map_err(|e| e.to_string())?;
            } else if src.is_file() {
                fs::remove_file(src).map_err(|e| e.to_string())?;
            }
            Ok(())
        }
    }
}

fn ensure_unique_destination_path(target: &Path) -> PathBuf {
    if !target.exists() {
        return target.to_path_buf();
    }
    let parent = target.parent().unwrap_or_else(|| Path::new("."));
    let stem = target.file_stem().and_then(|v| v.to_str()).unwrap_or("item");
    let ext = target.extension().and_then(|v| v.to_str()).unwrap_or("");
    for index in 1..5000 {
        let name = if ext.is_empty() {
            format!("{} ({})", stem, index)
        } else {
            format!("{} ({}).{}", stem, index, ext)
        };
        let candidate = parent.join(name);
        if !candidate.exists() {
            return candidate;
        }
    }
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let fallback = if ext.is_empty() {
        format!("{} ({})", stem, stamp)
    } else {
        format!("{} ({}).{}", stem, stamp, ext)
    };
    parent.join(fallback)
}

fn classify_import_media(path: &str) -> Value {
    let trimmed = path.trim();
    let root = Path::new(trimmed)
        .components()
        .next()
        .map(|c| c.as_os_str().to_string_lossy().to_string())
        .unwrap_or_default();

    let mut category = "fixed".to_string();
    let mut label = "Filesystem".to_string();
    let lower = trimmed.to_lowercase();

    if lower.starts_with("\\\\") {
        category = "network".to_string();
        label = "Network Share".to_string();
    } else if cfg!(target_os = "windows") {
        let chars: Vec<char> = lower.chars().collect();
        if chars.len() >= 2 && chars[1] == ':' {
            let drive = chars[0];
            if drive != 'c' {
                category = "removable".to_string();
                label = "USB / Removable".to_string();
            }
        }
    }

    json!({
        "path": trimmed,
        "rootPath": root,
        "rootExists": Path::new(&root).exists(),
        "mediaCategory": category,
        "mediaLabel": label
    })
}

fn read_path_list_arg(arg: Option<&Value>) -> Vec<String> {
    match arg {
        Some(Value::Array(rows)) => rows
            .iter()
            .filter_map(|row| row.as_str())
            .map(|row| row.trim().to_string())
            .filter(|row| !row.is_empty())
            .collect(),
        Some(Value::String(text)) => {
            let trimmed = text.trim();
            if trimmed.is_empty() {
                Vec::new()
            } else {
                vec![trimmed.to_string()]
            }
        }
        _ => Vec::new(),
    }
}

fn parse_cue_referenced_bin_names(cue_path: &Path) -> Vec<String> {
    let text = match fs::read_to_string(cue_path) {
        Ok(content) => content,
        Err(_) => return Vec::new(),
    };
    let mut out = Vec::<String>::new();
    for raw_line in text.lines() {
        let line = raw_line.trim();
        if line.is_empty() {
            continue;
        }
        if !line.to_uppercase().starts_with("FILE ") {
            continue;
        }
        let mut rest = line[5..].trim().to_string();
        if rest.is_empty() {
            continue;
        }
        let file_name = if rest.starts_with('"') {
            rest.remove(0);
            match rest.find('"') {
                Some(index) => rest[..index].trim().to_string(),
                None => String::new(),
            }
        } else {
            rest.split_whitespace().next().unwrap_or("").trim().to_string()
        };
        if file_name.is_empty() {
            continue;
        }
        if Path::new(&file_name)
            .extension()
            .and_then(|v| v.to_str())
            .map(|v| v.eq_ignore_ascii_case("bin"))
            .unwrap_or(false)
        {
            out.push(
                Path::new(&file_name)
                    .file_name()
                    .and_then(|v| v.to_str())
                    .unwrap_or("")
                    .to_string(),
            );
        }
    }
    out.sort();
    out.dedup();
    out
}

fn find_cue_for_bin(bin_path: &Path) -> Option<PathBuf> {
    if !bin_path
        .extension()
        .and_then(|v| v.to_str())
        .map(|v| v.eq_ignore_ascii_case("bin"))
        .unwrap_or(false)
    {
        return None;
    }
    let parent = bin_path.parent()?;
    let stem = bin_path.file_stem().and_then(|v| v.to_str()).unwrap_or("");
    if !stem.is_empty() {
        let sibling = parent.join(format!("{}.cue", stem));
        if sibling.exists() && sibling.is_file() {
            return Some(sibling);
        }
    }

    let bin_name = bin_path
        .file_name()
        .and_then(|v| v.to_str())
        .unwrap_or("")
        .to_lowercase();
    let entries = fs::read_dir(parent).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let is_cue = path
            .extension()
            .and_then(|v| v.to_str())
            .map(|v| v.eq_ignore_ascii_case("cue"))
            .unwrap_or(false);
        if !is_cue {
            continue;
        }
        let refs = parse_cue_referenced_bin_names(&path)
            .into_iter()
            .map(|row| row.to_lowercase())
            .collect::<Vec<String>>();
        if refs.iter().any(|row| row == &bin_name) {
            return Some(path);
        }
    }
    None
}

fn build_cue_content_for_bin(bin_path: &Path) -> String {
    let file_name = bin_path
        .file_name()
        .and_then(|v| v.to_str())
        .unwrap_or("track01.bin");
    format!(
        "FILE \"{}\" BINARY\n  TRACK 01 MODE1/2352\n    INDEX 01 00:00:00\n",
        file_name
    )
}

fn archive_kind_for_extension(ext: &str) -> String {
    match ext {
        ".zip" => "zip",
        ".rar" => "rar",
        ".7z" => "7z",
        ".iso" => "iso",
        ".ciso" => "ciso",
        ".tar" => "tar",
        ".gz" => "gz",
        _ => "",
    }
    .to_string()
}

fn platform_supports_archive_extension(platform: &Value, extension: &str) -> bool {
    let ext = normalize_extension(extension);
    if ext.is_empty() {
        return false;
    }
    platform
        .get("supportedArchiveTypes")
        .and_then(|v| v.as_array())
        .map(|rows| {
            rows.iter().any(|row| {
                normalize_extension(row.as_str().unwrap_or(""))
                    .eq_ignore_ascii_case(&ext)
            })
        })
        .unwrap_or(false)
}

fn direct_archive_emulators_for_extension(platform: &Value, extension: &str) -> Vec<String> {
    let ext = normalize_extension(extension);
    if ext.is_empty() {
        return Vec::new();
    }
    let mut out = Vec::<String>::new();
    let mut seen = std::collections::HashSet::<String>::new();
    let emulators = platform
        .get("emulators")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    for emulator in emulators {
        let name = emulator
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if name.is_empty() {
            continue;
        }
        let supports = emulator
            .get("supportedFileTypes")
            .and_then(|v| v.as_array())
            .map(|rows| {
                rows.iter().any(|row| {
                    normalize_extension(row.as_str().unwrap_or(""))
                        .eq_ignore_ascii_case(&ext)
                })
            })
            .unwrap_or(false);
        if supports {
            let key = name.to_lowercase();
            if seen.insert(key) {
                out.push(name);
            }
        }
    }
    out
}

fn extract_zip_archive_to_dir(archive_path: &Path, destination_dir: &Path) -> Result<(), String> {
    let file = fs::File::open(archive_path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;
    fs::create_dir_all(destination_dir).map_err(|e| e.to_string())?;

    for index in 0..archive.len() {
        let mut entry = archive.by_index(index).map_err(|e| e.to_string())?;
        let Some(relative_path) = entry.enclosed_name().map(|p| p.to_path_buf()) else {
            continue;
        };
        let out_path = destination_dir.join(relative_path);

        if entry.is_dir() {
            fs::create_dir_all(&out_path).map_err(|e| e.to_string())?;
            continue;
        }

        if let Some(parent) = out_path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let mut out_file = fs::File::create(&out_path).map_err(|e| e.to_string())?;
        std::io::copy(&mut entry, &mut out_file).map_err(|e| e.to_string())?;
        out_file.flush().map_err(|e| e.to_string())?;
    }

    Ok(())
}

fn extract_archive_with_7z(archive_path: &Path, destination_dir: &Path) -> Result<(), String> {
    let archive = archive_path.to_string_lossy().to_string();
    let destination = destination_dir.to_string_lossy().to_string();
    let candidates = if cfg!(target_os = "windows") {
        vec![
            "7z".to_string(),
            "7za".to_string(),
            "7zr".to_string(),
            "C:\\Program Files\\7-Zip\\7z.exe".to_string(),
            "C:\\Program Files (x86)\\7-Zip\\7z.exe".to_string(),
        ]
    } else {
        vec!["7z".to_string(), "7za".to_string(), "7zr".to_string()]
    };
    let mut last_error = String::new();
    for command in candidates {
        let status = Command::new(&command)
            .arg("x")
            .arg(&archive)
            .arg(format!("-o{}", destination))
            .arg("-y")
            .status();
        match status {
            Ok(exit) if exit.success() => return Ok(()),
            Ok(exit) => {
                last_error = format!("{} exited with status {}", command, exit);
            }
            Err(err) => {
                last_error = err.to_string();
            }
        }
    }
    if last_error.is_empty() {
        last_error = "No 7z executable found".to_string();
    }
    Err(last_error)
}

fn extract_archive_with_tar(archive_path: &Path, destination_dir: &Path) -> Result<(), String> {
    let status = Command::new("tar")
        .arg("-xf")
        .arg(archive_path)
        .arg("-C")
        .arg(destination_dir)
        .status()
        .map_err(|e| e.to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err(format!("tar exited with status {}", status))
    }
}

fn extract_archive_to_dir(archive_path: &Path, destination_dir: &Path) -> Result<(), String> {
    fs::create_dir_all(destination_dir).map_err(|e| e.to_string())?;
    let ext = normalize_extension(archive_path.extension().and_then(|v| v.to_str()).unwrap_or(""));
    if ext == ".zip" {
        return extract_zip_archive_to_dir(archive_path, destination_dir);
    }
    if ext == ".tar" || ext == ".gz" || ext == ".tgz" {
        if let Ok(_) = extract_archive_with_tar(archive_path, destination_dir) {
            return Ok(());
        }
    }
    extract_archive_with_7z(archive_path, destination_dir)
}

fn build_archive_extraction_directory(archive_path: &Path) -> PathBuf {
    let parent = archive_path.parent().unwrap_or_else(|| Path::new("."));
    let stem = archive_path
        .file_stem()
        .and_then(|v| v.to_str())
        .unwrap_or("archive");
    let initial = parent.join(format!("{}_extracted", stem));
    ensure_unique_destination_path(&initial)
}

fn parse_game_id_from_payload(payload: &Value) -> i64 {
    if let Some(id) = payload.as_i64() {
        return id;
    }
    if let Some(obj) = payload.as_object() {
        if let Some(id) = obj.get("gameId").and_then(|v| v.as_i64()) {
            return id;
        }
        if let Some(id) = obj.get("id").and_then(|v| v.as_i64()) {
            return id;
        }
    }
    0
}

fn system_unix_timestamp_string() -> String {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs().to_string())
        .unwrap_or_else(|_| "0".to_string())
}

fn update_game_last_played(game_id: i64) -> Result<(), String> {
    if game_id <= 0 {
        return Ok(());
    }
    let mut games = read_state_array("games");
    let mut changed = false;
    for row in &mut games {
        if row.get("id").and_then(|v| v.as_i64()).unwrap_or(0) == game_id {
            if let Some(obj) = row.as_object_mut() {
                obj.insert(
                    "lastPlayed".to_string(),
                    Value::String(system_unix_timestamp_string()),
                );
            }
            changed = true;
            break;
        }
    }
    if changed {
        write_state_array("games", games)?;
    }
    Ok(())
}

fn percent_encode_data_url(input: &str) -> String {
    let mut out = String::with_capacity(input.len() * 2);
    for byte in input.as_bytes() {
        let c = *byte as char;
        let safe = c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.' || c == '~';
        if safe {
            out.push(c);
        } else {
            out.push('%');
            out.push_str(&format!("{:02X}", byte));
        }
    }
    out
}

fn build_file_icon_data_url(file_path: &Path) -> String {
    let ext = file_path
        .extension()
        .and_then(|v| v.to_str())
        .unwrap_or("")
        .trim()
        .to_uppercase();
    let label = if ext.is_empty() {
        "FILE".to_string()
    } else {
        ext.chars().take(4).collect::<String>()
    };

    let mut hasher = DefaultHasher::new();
    label.hash(&mut hasher);
    let hash = hasher.finish();
    let hue = (hash % 360) as i32;
    let hue2 = ((hue + 28) % 360) as i32;

    let svg = format!(
        "<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'>\
<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>\
<stop offset='0%' stop-color='hsl({} 68% 42%)'/>\
<stop offset='100%' stop-color='hsl({} 74% 34%)'/>\
</linearGradient></defs>\
<rect x='2' y='2' width='92' height='92' rx='16' fill='url(#g)'/>\
<rect x='10' y='12' width='76' height='72' rx='10' fill='rgba(6,10,18,0.35)'/>\
<text x='48' y='56' text-anchor='middle' font-family='Segoe UI,Arial,sans-serif' font-size='22' font-weight='700' fill='#F4F8FF'>{}</text>\
</svg>",
        hue, hue2, label
    );

    format!("data:image/svg+xml;utf8,{}", percent_encode_data_url(&svg))
}

fn parse_command_args(input: &str) -> Vec<String> {
    let text = input.trim();
    if text.is_empty() {
        return Vec::new();
    }
    let mut args = Vec::<String>::new();
    let mut current = String::new();
    let mut in_quotes = false;
    let mut quote_char = '\0';
    for ch in text.chars() {
        if in_quotes {
            if ch == quote_char {
                in_quotes = false;
                quote_char = '\0';
            } else {
                current.push(ch);
            }
            continue;
        }

        if ch == '"' || ch == '\'' {
            in_quotes = true;
            quote_char = ch;
            continue;
        }

        if ch.is_whitespace() {
            if !current.is_empty() {
                args.push(current.clone());
                current.clear();
            }
            continue;
        }
        current.push(ch);
    }
    if !current.is_empty() {
        args.push(current);
    }
    args
}

fn launch_game_with_emulator(emulator_path: &Path, emulator_args: &str, game_path: &Path) -> Result<(), String> {
    let mut args = parse_command_args(emulator_args);
    args.push(game_path.to_string_lossy().to_string());
    let mut command = Command::new(emulator_path);
    if !args.is_empty() {
        command.args(args);
    }
    if let Some(parent) = emulator_path.parent() {
        command.current_dir(parent);
    }
    command.spawn().map_err(|e| e.to_string())?;
    Ok(())
}

fn launch_emulator_process(
    emulator_path: &Path,
    emulator_args: &str,
    working_directory: &str,
) -> Result<(), String> {
    if !emulator_path.exists() || !emulator_path.is_file() {
        return Err("Emulator executable not found".to_string());
    }
    let args = parse_command_args(emulator_args);
    let mut command = Command::new(emulator_path);
    if !args.is_empty() {
        command.args(args);
    }

    let working_dir = working_directory.trim();
    if !working_dir.is_empty() {
        command.current_dir(PathBuf::from(working_dir));
    } else if let Some(parent) = emulator_path.parent() {
        command.current_dir(parent);
    }

    command.spawn().map_err(|e| e.to_string())?;
    Ok(())
}

fn find_file_by_name_in_tree(root_dir: &Path, file_name: &str, max_depth: usize, max_files: usize) -> Option<PathBuf> {
    if !root_dir.exists() || !root_dir.is_dir() {
        return None;
    }
    let target = file_name.trim().to_lowercase();
    if target.is_empty() {
        return None;
    }
    let mut visited_files = 0usize;
    for entry in WalkDir::new(root_dir)
        .follow_links(false)
        .max_depth(max_depth)
        .into_iter()
        .filter_map(|row| row.ok())
    {
        if !entry.file_type().is_file() {
            continue;
        }
        visited_files += 1;
        if visited_files > max_files {
            break;
        }
        let name = entry.file_name().to_string_lossy().to_lowercase();
        if name == target {
            return Some(entry.path().to_path_buf());
        }
    }
    None
}

fn launch_game_file(game_path: &Path) -> Result<(), String> {
    if cfg!(target_os = "windows") {
        let lower_ext = game_path
            .extension()
            .and_then(|v| v.to_str())
            .unwrap_or("")
            .to_lowercase();
        if lower_ext == "exe" || lower_ext == "bat" || lower_ext == "cmd" {
            let mut command = Command::new(game_path);
            if let Some(parent) = game_path.parent() {
                command.current_dir(parent);
            }
            command.spawn().map_err(|e| e.to_string())?;
            return Ok(());
        }
    }
    open::that(game_path).map_err(|e| e.to_string())
}

fn not_implemented() -> Value {
    json!({
        "success": false,
        "message": "Not implemented in Tauri migration yet"
    })
}

#[tauri::command]
fn emubro_invoke(channel: String, args: Vec<Value>, window: Window) -> Result<Value, String> {
    let ch = channel.trim().to_lowercase();

    match ch.as_str() {
        "window:minimize" => {
            window.minimize().map_err(|e| e.to_string())?;
            Ok(Value::Null)
        }
        "window:toggle-maximize" => {
            let is_max = window.is_maximized().map_err(|e| e.to_string())?;
            if is_max {
                window.unmaximize().map_err(|e| e.to_string())?;
            } else {
                window.maximize().map_err(|e| e.to_string())?;
            }
            Ok(Value::Null)
        }
        "window:close" => {
            window.close().map_err(|e| e.to_string())?;
            Ok(Value::Null)
        }
        "window:is-maximized" => {
            let is_max = window.is_maximized().map_err(|e| e.to_string())?;
            Ok(json!(is_max))
        }
        "app:renderer-ready" => Ok(json!({ "success": true })),
        "get-games" => Ok(Value::Array(read_state_array("games"))),
        "get-emulators" => Ok(Value::Array(read_state_array("emulators"))),
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
        "settings:get-splash-theme" => Ok(json!({ "success": true, "theme": Value::Null })),
        "settings:set-splash-theme" => Ok(json!({ "success": true })),
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
        "analyze-import-paths" => {
            let input_paths = args
                .get(0)
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default();
            let rows = input_paths
                .iter()
                .filter_map(|v| v.as_str())
                .map(classify_import_media)
                .collect::<Vec<Value>>();
            let requires_decision = rows.iter().any(|row| {
                let category = row
                    .get("mediaCategory")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_lowercase();
                category == "removable" || category == "network" || category == "cdrom"
            });
            Ok(json!({
                "success": true,
                "paths": rows,
                "requiresDecision": requires_decision
            }))
        }
        "stage-import-paths" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let mode = payload
                .get("mode")
                .and_then(|v| v.as_str())
                .unwrap_or("keep")
                .trim()
                .to_lowercase();
            if mode != "keep" && mode != "copy" && mode != "move" {
                return Ok(json!({ "success": false, "message": "Invalid staging mode", "paths": [], "skipped": [] }));
            }
            let input_paths = payload
                .get("paths")
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default()
                .into_iter()
                .filter_map(|v| v.as_str().map(|s| s.trim().to_string()))
                .filter(|s| !s.is_empty())
                .collect::<Vec<String>>();

            if mode == "keep" {
                return Ok(json!({
                    "success": true,
                    "mode": "keep",
                    "paths": input_paths,
                    "skipped": []
                }));
            }

            let target_dir = payload
                .get("targetDir")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if target_dir.is_empty() {
                return Ok(json!({ "success": false, "message": "Missing destination folder", "paths": [], "skipped": [] }));
            }
            let target_dir_path = PathBuf::from(&target_dir);
            fs::create_dir_all(&target_dir_path).map_err(|e| e.to_string())?;

            let mut staged = Vec::<Value>::new();
            let mut skipped = Vec::<Value>::new();
            for source in input_paths {
                let src = PathBuf::from(&source);
                if !src.exists() {
                    skipped.push(json!({ "path": source, "reason": "not_found" }));
                    continue;
                }
                let base_name = src
                    .file_name()
                    .and_then(|v| v.to_str())
                    .unwrap_or("item")
                    .to_string();
                let requested_dest = target_dir_path.join(base_name);
                let final_dest = ensure_unique_destination_path(&requested_dest);
                let move_res = if mode == "move" {
                    move_path_safe(&src, &final_dest)
                } else {
                    copy_path_recursive(&src, &final_dest)
                };
                match move_res {
                    Ok(_) => staged.push(Value::String(final_dest.to_string_lossy().to_string())),
                    Err(err) => skipped.push(json!({
                        "path": source,
                        "reason": "stage_failed",
                        "message": err
                    })),
                }
            }

            Ok(json!({
                "success": true,
                "mode": mode,
                "paths": staged,
                "skipped": skipped
            }))
        }
        "detect-emulator-exe" => {
            let input_path = args
                .get(0)
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if input_path.is_empty() {
                return Ok(json!({ "success": false, "message": "Missing path" }));
            }
            let platforms = load_platform_configs();
            let (matched, platform_short_name, platform_name) = detect_emulator_platform(&input_path, &platforms);
            let already_added = read_state_array("emulators")
                .iter()
                .filter_map(|row| row.get("filePath").and_then(|v| v.as_str()))
                .any(|row| row.eq_ignore_ascii_case(&input_path));
            Ok(json!({
                "success": true,
                "matched": matched,
                "emulatorAlreadyAdded": already_added,
                "platformShortName": platform_short_name,
                "platformName": platform_name
            }))
        }
        "import-exe" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let source_path = payload
                .get("path")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if source_path.is_empty() {
                return Ok(json!({ "success": false, "message": "Missing .exe path" }));
            }
            let source = PathBuf::from(&source_path);
            if !source.exists() || !source.is_file() {
                return Ok(json!({ "success": false, "message": "Path is not a file" }));
            }

            let add_emulator = payload.get("addEmulator").and_then(|v| v.as_bool()).unwrap_or(false);
            let add_game = payload.get("addGame").and_then(|v| v.as_bool()).unwrap_or(false);
            let requested_emu_psn = normalize_platform_short_name(
                payload
                    .get("emulatorPlatformShortName")
                    .and_then(|v| v.as_str())
                    .unwrap_or(""),
            );
            let requested_game_psn = normalize_platform_short_name(
                payload
                    .get("gamePlatformShortName")
                    .and_then(|v| v.as_str())
                    .unwrap_or("pc"),
            );

            let platforms = load_platform_configs();
            let mut games = read_state_array("games");
            let mut emulators = read_state_array("emulators");
            let mut game_seen = games
                .iter()
                .filter_map(|row| row.get("filePath").and_then(|v| v.as_str()))
                .map(path_key)
                .collect::<std::collections::HashSet<String>>();
            let mut emu_seen = emulators
                .iter()
                .filter_map(|row| row.get("filePath").and_then(|v| v.as_str()))
                .map(path_key)
                .collect::<std::collections::HashSet<String>>();
            let next_game_id = next_numeric_id(&games);
            let next_emu_id = next_numeric_id(&emulators);

            let mut added_emulator = Value::Null;
            let mut added_game = Value::Null;
            let mut skipped = Vec::<Value>::new();
            let mut errors = Vec::<Value>::new();
            let mut touched_games = false;
            let mut touched_emulators = false;

            if add_emulator {
                let mut psn = requested_emu_psn.clone();
                let mut pname = find_platform_name(&platforms, &psn);
                if psn.is_empty() {
                    let (matched, det_psn, det_pname) = detect_emulator_platform(&source_path, &platforms);
                    if matched {
                        psn = det_psn;
                        pname = det_pname;
                    }
                }
                if psn.is_empty() {
                    errors.push(json!({ "path": source_path, "message": "Emulator platform is required" }));
                } else {
                    let key = path_key(&source_path);
                    if emu_seen.insert(key) {
                        let row = make_emulator_row(next_emu_id, &source_path, &psn);
                        if let Some(obj) = row.as_object() {
                            let mut with_platform = obj.clone();
                            with_platform.insert("platform".to_string(), Value::String(pname));
                            let value = Value::Object(with_platform);
                            emulators.push(value.clone());
                            added_emulator = value;
                        } else {
                            emulators.push(row.clone());
                            added_emulator = row;
                        }
                        touched_emulators = true;
                    } else {
                        skipped.push(json!({ "path": source_path, "reason": "emu_exists" }));
                    }
                }
            }

            if add_game {
                let psn = if requested_game_psn.is_empty() {
                    "pc".to_string()
                } else {
                    requested_game_psn.clone()
                };
                let pname = find_platform_name(&platforms, &psn);
                let key = path_key(&source_path);
                if game_seen.insert(key) {
                    let row = make_game_row(next_game_id, &source_path, &psn, &pname);
                    games.push(row.clone());
                    added_game = row;
                    touched_games = true;
                } else {
                    skipped.push(json!({ "path": source_path, "reason": "game_exists" }));
                }
            }

            if touched_games {
                write_state_array("games", games)?;
            }
            if touched_emulators {
                write_state_array("emulators", emulators)?;
            }

            Ok(json!({
                "success": true,
                "addedEmulator": added_emulator,
                "addedGame": added_game,
                "skipped": skipped,
                "errors": errors
            }))
        }
        "import-files-as-platform" => {
            let input_paths = args
                .get(0)
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default();
            let psn = normalize_platform_short_name(
                args.get(1).and_then(|v| v.as_str()).unwrap_or(""),
            );
            if psn.is_empty() {
                return Ok(json!({ "success": false, "message": "Missing platformShortName" }));
            }
            let platforms = load_platform_configs();
            let platform_name = find_platform_name(&platforms, &psn);
            let mut games = read_state_array("games");
            let mut game_seen = games
                .iter()
                .filter_map(|row| row.get("filePath").and_then(|v| v.as_str()))
                .map(path_key)
                .collect::<std::collections::HashSet<String>>();
            let mut next_game_id = next_numeric_id(&games);
            let mut added_games = Vec::<Value>::new();
            let mut skipped = Vec::<Value>::new();
            let mut errors = Vec::<Value>::new();

            for raw in input_paths {
                let source_path = raw.as_str().unwrap_or("").trim().to_string();
                if source_path.is_empty() {
                    continue;
                }
                let source = PathBuf::from(&source_path);
                if !source.exists() || !source.is_file() {
                    skipped.push(json!({ "path": source_path, "reason": "not_a_file" }));
                    continue;
                }
                let key = path_key(&source_path);
                if !game_seen.insert(key) {
                    skipped.push(json!({ "path": source_path, "reason": "game_exists" }));
                    continue;
                }
                let row = make_game_row(next_game_id, &source_path, &psn, &platform_name);
                next_game_id += 1;
                games.push(row.clone());
                added_games.push(row);
            }

            if !added_games.is_empty() {
                if let Err(err) = write_state_array("games", games) {
                    errors.push(json!({ "message": err }));
                }
            }

            Ok(json!({
                "success": errors.is_empty(),
                "addedGames": added_games,
                "skipped": skipped,
                "errors": errors,
                "warnings": []
            }))
        }
        "import-paths" => {
            let input_paths = args
                .get(0)
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default();
            let options = args.get(1).cloned().unwrap_or_else(|| json!({}));
            let recursive = options
                .get("recursive")
                .and_then(|v| v.as_bool())
                .unwrap_or(true);
            let archive_modes = options
                .get("archiveImportModes")
                .and_then(|v| v.as_object())
                .cloned()
                .unwrap_or_default();
            let archive_modes_lookup = archive_modes
                .iter()
                .filter_map(|(k, v)| {
                    let mode = v.as_str().unwrap_or("").trim().to_lowercase();
                    if mode.is_empty() {
                        return None;
                    }
                    Some((path_key(k), mode))
                })
                .collect::<std::collections::HashMap<String, String>>();

            let platforms = load_platform_configs();
            let ext_map = extension_platform_map(&platforms);
            let emu_exts = emulator_extensions();
            let archive_exts = archive_extensions();

            let mut games = read_state_array("games");
            let mut emulators = read_state_array("emulators");
            let mut game_seen = games
                .iter()
                .filter_map(|row| row.get("filePath").and_then(|v| v.as_str()))
                .map(path_key)
                .collect::<std::collections::HashSet<String>>();
            let mut emu_seen = emulators
                .iter()
                .filter_map(|row| row.get("filePath").and_then(|v| v.as_str()))
                .map(path_key)
                .collect::<std::collections::HashSet<String>>();
            let mut next_game_id = next_numeric_id(&games);
            let mut next_emu_id = next_numeric_id(&emulators);

            let mut added_games = Vec::<Value>::new();
            let mut added_emulators = Vec::<Value>::new();
            let mut skipped = Vec::<Value>::new();
            let errors = Vec::<Value>::new();
            let mut warnings = Vec::<Value>::new();
            let mut dirty_games = false;
            let mut dirty_emulators = false;

            for raw in input_paths {
                let source_path = raw.as_str().unwrap_or("").trim().to_string();
                if source_path.is_empty() {
                    continue;
                }
                let source = PathBuf::from(&source_path);
                if !source.exists() {
                    skipped.push(json!({ "path": source_path, "reason": "not_found" }));
                    continue;
                }
                if source.is_dir() {
                    let scan_options = json!({ "scope": "both", "recursive": recursive, "maxDepth": if recursive { 20 } else { 0 } });
                    let scan_res = scan_and_import_games_and_emulators(&source_path, Some(&scan_options))?;
                    let scan_games = scan_res
                        .get("games")
                        .and_then(|v| v.as_array())
                        .cloned()
                        .unwrap_or_default();
                    let scan_emus = scan_res
                        .get("emulators")
                        .and_then(|v| v.as_array())
                        .cloned()
                        .unwrap_or_default();
                    if scan_games.is_empty() && scan_emus.is_empty() {
                        skipped.push(json!({ "path": source_path, "reason": "no_matches" }));
                    }
                    added_games.extend(scan_games);
                    added_emulators.extend(scan_emus);
                    games = read_state_array("games");
                    emulators = read_state_array("emulators");
                    game_seen = games
                        .iter()
                        .filter_map(|row| row.get("filePath").and_then(|v| v.as_str()))
                        .map(path_key)
                        .collect::<std::collections::HashSet<String>>();
                    emu_seen = emulators
                        .iter()
                        .filter_map(|row| row.get("filePath").and_then(|v| v.as_str()))
                        .map(path_key)
                        .collect::<std::collections::HashSet<String>>();
                    next_game_id = next_numeric_id(&games);
                    next_emu_id = next_numeric_id(&emulators);
                    continue;
                }
                if !source.is_file() {
                    skipped.push(json!({ "path": source_path, "reason": "not_a_file" }));
                    continue;
                }

                let ext = normalize_extension(source.extension().and_then(|v| v.to_str()).unwrap_or(""));
                if ext.is_empty() {
                    skipped.push(json!({ "path": source_path, "reason": "unmatched" }));
                    continue;
                }

                if emu_exts.contains(&ext) {
                    let (matched, psn, _pname) = detect_emulator_platform(&source_path, &platforms);
                    let key = path_key(&source_path);
                    if emu_seen.insert(key) {
                        let row = make_emulator_row(next_emu_id, &source_path, if matched { &psn } else { "" });
                        next_emu_id += 1;
                        emulators.push(row.clone());
                        added_emulators.push(row);
                        dirty_emulators = true;
                    } else {
                        skipped.push(json!({ "path": source_path, "reason": "emu_exists_or_unmatched" }));
                    }
                    continue;
                }

                if archive_exts.contains(&ext) {
                    let mode = archive_modes_lookup
                        .get(&path_key(&source_path))
                        .map(|v| v.as_str())
                        .unwrap_or("extract")
                        .trim()
                        .to_lowercase();
                    if mode == "skip" {
                        skipped.push(json!({ "path": source_path, "reason": "archive_skipped_by_user" }));
                        continue;
                    }
                    if mode == "direct" {
                        if let Some(platform) = ext_map.get(&ext) {
                            let psn = normalize_platform_short_name(
                                platform.get("shortName").and_then(|v| v.as_str()).unwrap_or(""),
                            );
                            let pname = platform.get("name").and_then(|v| v.as_str()).unwrap_or("Unknown").to_string();
                            let key = path_key(&source_path);
                            if game_seen.insert(key) {
                                let row = make_game_row(next_game_id, &source_path, &psn, &pname);
                                next_game_id += 1;
                                games.push(row.clone());
                                added_games.push(row);
                                dirty_games = true;
                            } else {
                                skipped.push(json!({ "path": source_path, "reason": "game_exists" }));
                            }
                        } else {
                            skipped.push(json!({ "path": source_path, "reason": "unmatched" }));
                        }
                        continue;
                    }
                    let destination = build_archive_extraction_directory(&source);
                    let fallback_destination = std::env::current_dir()
                        .unwrap_or_else(|_| PathBuf::from("."))
                        .join(".emubro-imports")
                        .join(format!(
                            "{}_{}",
                            source.file_stem().and_then(|v| v.to_str()).unwrap_or("archive"),
                            system_unix_timestamp_string()
                        ));
                    let mut extracted_dir = destination.clone();
                    let extraction_result = match extract_archive_to_dir(&source, &destination) {
                        Ok(_) => Ok(()),
                        Err(_) => {
                            extracted_dir = fallback_destination.clone();
                            extract_archive_to_dir(&source, &fallback_destination)
                        }
                    };
                    match extraction_result {
                        Ok(_) => {
                            let scan_options = json!({ "scope": "both", "recursive": true, "maxDepth": 30 });
                            let scan_res = scan_and_import_games_and_emulators(
                                extracted_dir.to_string_lossy().as_ref(),
                                Some(&scan_options),
                            )?;
                            let scan_games = scan_res
                                .get("games")
                                .and_then(|v| v.as_array())
                                .cloned()
                                .unwrap_or_default();
                            let scan_emus = scan_res
                                .get("emulators")
                                .and_then(|v| v.as_array())
                                .cloned()
                                .unwrap_or_default();
                            if scan_games.is_empty() && scan_emus.is_empty() {
                                skipped.push(json!({ "path": source_path, "reason": "no_matches" }));
                            } else {
                                warnings.push(json!({
                                    "path": source_path,
                                    "reason": "archive_extracted",
                                    "message": format!("Archive extracted to {}", extracted_dir.to_string_lossy())
                                }));
                            }
                            added_games.extend(scan_games);
                            added_emulators.extend(scan_emus);
                            games = read_state_array("games");
                            emulators = read_state_array("emulators");
                            game_seen = games
                                .iter()
                                .filter_map(|row| row.get("filePath").and_then(|v| v.as_str()))
                                .map(path_key)
                                .collect::<std::collections::HashSet<String>>();
                            emu_seen = emulators
                                .iter()
                                .filter_map(|row| row.get("filePath").and_then(|v| v.as_str()))
                                .map(path_key)
                                .collect::<std::collections::HashSet<String>>();
                            next_game_id = next_numeric_id(&games);
                            next_emu_id = next_numeric_id(&emulators);
                        }
                        Err(err) => {
                            skipped.push(json!({
                                "path": source_path,
                                "reason": "archive_extract_failed",
                                "message": err
                            }));
                        }
                    }
                    continue;
                }

                if let Some(platform) = ext_map.get(&ext) {
                    let psn = normalize_platform_short_name(
                        platform.get("shortName").and_then(|v| v.as_str()).unwrap_or(""),
                    );
                    let pname = platform.get("name").and_then(|v| v.as_str()).unwrap_or("Unknown").to_string();
                    let key = path_key(&source_path);
                    if game_seen.insert(key) {
                        let row = make_game_row(next_game_id, &source_path, &psn, &pname);
                        next_game_id += 1;
                        games.push(row.clone());
                        added_games.push(row);
                        dirty_games = true;
                    } else {
                        skipped.push(json!({ "path": source_path, "reason": "game_exists" }));
                    }
                } else {
                    skipped.push(json!({ "path": source_path, "reason": "unmatched" }));
                }
            }

            if dirty_games {
                write_state_array("games", games)?;
            }
            if dirty_emulators {
                write_state_array("emulators", emulators)?;
            }

            Ok(json!({
                "success": true,
                "addedGames": added_games,
                "addedEmulators": added_emulators,
                "skipped": skipped,
                "errors": errors,
                "warnings": warnings
            }))
        }
        "cue:inspect-bin-files" => {
            let input_paths = read_path_list_arg(args.get(0));
            let mut results = Vec::<Value>::new();
            for source_path in input_paths {
                let source = PathBuf::from(&source_path);
                let is_bin = source
                    .extension()
                    .and_then(|v| v.to_str())
                    .map(|v| v.eq_ignore_ascii_case("bin"))
                    .unwrap_or(false);
                if !is_bin {
                    results.push(json!({
                        "binPath": source_path,
                        "hasCue": false,
                        "cuePath": "",
                        "message": "Not a BIN file"
                    }));
                    continue;
                }
                let cue_path = find_cue_for_bin(&source);
                results.push(json!({
                    "binPath": source_path,
                    "hasCue": cue_path.is_some(),
                    "cuePath": cue_path.map(|p| p.to_string_lossy().to_string()).unwrap_or_default()
                }));
            }
            Ok(json!({
                "success": true,
                "results": results
            }))
        }
        "cue:generate-for-bin" => {
            let input_paths = read_path_list_arg(args.get(0));
            let mut generated = Vec::<Value>::new();
            let mut existing = Vec::<Value>::new();
            let mut failed = Vec::<Value>::new();

            for source_path in input_paths {
                let source = PathBuf::from(&source_path);
                if !source.exists() || !source.is_file() {
                    failed.push(json!({
                        "binPath": source_path,
                        "message": "BIN file does not exist."
                    }));
                    continue;
                }
                let is_bin = source
                    .extension()
                    .and_then(|v| v.to_str())
                    .map(|v| v.eq_ignore_ascii_case("bin"))
                    .unwrap_or(false);
                if !is_bin {
                    failed.push(json!({
                        "binPath": source_path,
                        "message": "Path is not a BIN file."
                    }));
                    continue;
                }
                if let Some(cue_path) = find_cue_for_bin(&source) {
                    existing.push(json!({
                        "binPath": source_path,
                        "cuePath": cue_path.to_string_lossy().to_string()
                    }));
                    continue;
                }

                let cue_path = source.with_extension("cue");
                let cue_content = build_cue_content_for_bin(&source);
                match fs::write(&cue_path, cue_content) {
                    Ok(_) => generated.push(json!({
                        "binPath": source_path,
                        "cuePath": cue_path.to_string_lossy().to_string()
                    })),
                    Err(err) => failed.push(json!({
                        "binPath": source_path,
                        "message": err.to_string()
                    })),
                }
            }

            Ok(json!({
                "success": true,
                "generated": generated,
                "existing": existing,
                "failed": failed
            }))
        }
        "import:analyze-archives" => {
            let input_paths = read_path_list_arg(args.get(0));
            let platform_rows = load_platform_configs();
            let mut archives = Vec::<Value>::new();
            let mut seen = std::collections::HashSet::<String>::new();
            for source_path in input_paths {
                let key = path_key(&source_path);
                if !seen.insert(key) {
                    continue;
                }
                let source = PathBuf::from(&source_path);
                let ext = normalize_extension(source.extension().and_then(|v| v.to_str()).unwrap_or(""));
                if ext.is_empty() {
                    continue;
                }
                let kind = archive_kind_for_extension(&ext);
                if kind.is_empty() {
                    continue;
                }
                let matched_platform = platform_rows
                    .iter()
                    .find(|row| platform_matches_extension(row, &ext))
                    .cloned();
                let platform_short = matched_platform
                    .as_ref()
                    .and_then(|row| row.get("shortName"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .trim()
                    .to_lowercase();
                let platform_name = matched_platform
                    .as_ref()
                    .and_then(|row| row.get("name"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .trim()
                    .to_string();
                let direct_emulators = matched_platform
                    .as_ref()
                    .map(|row| direct_archive_emulators_for_extension(row, &ext))
                    .unwrap_or_default();
                let direct_supported = matched_platform
                    .as_ref()
                    .map(|row| {
                        platform_supports_archive_extension(row, &ext)
                            && !direct_emulators.is_empty()
                    })
                    .unwrap_or(false);
                archives.push(json!({
                    "path": source_path,
                    "extension": ext,
                    "archiveKind": kind,
                    "platformShortName": platform_short,
                    "platformName": platform_name,
                    "directArchiveSupported": direct_supported,
                    "directArchiveEmulators": direct_emulators,
                    "recommendedMode": if direct_supported { "ask" } else { "extract" }
                }));
            }

            Ok(json!({
                "success": true,
                "archives": archives
            }))
        }
        "iso:detect-game-codes" => {
            let input_paths = read_path_list_arg(args.get(0));
            let mut codes_by_path = serde_json::Map::new();
            for source_path in input_paths {
                codes_by_path.insert(source_path, Value::String(String::new()));
            }
            Ok(json!({
                "success": true,
                "codesByPath": Value::Object(codes_by_path)
            }))
        }
        "update-game-metadata" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let game_id = payload.get("gameId").and_then(|v| v.as_i64()).unwrap_or(0);
            if game_id <= 0 {
                return Ok(json!({ "success": false, "message": "Invalid game id" }));
            }

            let mut games = read_state_array("games");
            let mut found_idx = None;
            for (idx, row) in games.iter().enumerate() {
                if row.get("id").and_then(|v| v.as_i64()).unwrap_or(0) == game_id {
                    found_idx = Some(idx);
                    break;
                }
            }
            let Some(idx) = found_idx else {
                return Ok(json!({ "success": false, "message": "Game not found" }));
            };

            let mut game_obj = games[idx].as_object().cloned().unwrap_or_default();
            if let Some(value) = payload.get("platformShortName").and_then(|v| v.as_str()) {
                game_obj.insert("platformShortName".to_string(), Value::String(value.trim().to_lowercase()));
            }
            if let Some(value) = payload.get("platform").and_then(|v| v.as_str()) {
                game_obj.insert("platform".to_string(), Value::String(value.trim().to_string()));
            }
            if let Some(value) = payload.get("code").and_then(|v| v.as_str()) {
                game_obj.insert("code".to_string(), Value::String(value.trim().to_string()));
            }
            if let Some(value) = payload.get("image").and_then(|v| v.as_str()) {
                game_obj.insert("image".to_string(), Value::String(value.trim().to_string()));
            }
            if let Some(value) = payload.get("filePath").and_then(|v| v.as_str()) {
                game_obj.insert("filePath".to_string(), Value::String(value.trim().to_string()));
            }
            if let Some(value) = payload.get("lastPlayed") {
                game_obj.insert("lastPlayed".to_string(), value.clone());
            }
            if let Some(value) = payload.get("progress") {
                game_obj.insert("progress".to_string(), value.clone());
            }
            if let Some(value) = payload.get("runAsMode") {
                game_obj.insert("runAsMode".to_string(), value.clone());
            }
            if let Some(value) = payload.get("runAsUser") {
                game_obj.insert("runAsUser".to_string(), value.clone());
            }
            if let Some(Value::Array(tags)) = payload.get("tags") {
                let cleaned: Vec<Value> = tags
                    .iter()
                    .filter_map(|v| v.as_str())
                    .map(normalize_tag_id)
                    .filter(|s| !s.is_empty())
                    .map(Value::String)
                    .collect();
                game_obj.insert("tags".to_string(), Value::Array(cleaned));
            }

            games[idx] = Value::Object(game_obj.clone());
            write_state_array("games", games)?;
            Ok(json!({ "success": true, "game": Value::Object(game_obj) }))
        }
        "remove-game" => {
            let target_id = args.get(0).and_then(|v| v.as_i64()).unwrap_or(0);
            if target_id <= 0 {
                return Ok(json!({ "success": false, "message": "Invalid game id" }));
            }
            let mut games = read_state_array("games");
            let before = games.len();
            games.retain(|row| row.get("id").and_then(|v| v.as_i64()).unwrap_or(0) != target_id);
            if games.len() == before {
                return Ok(json!({ "success": false, "message": "Game not found" }));
            }
            write_state_array("games", games)?;
            Ok(json!({ "success": true, "message": "Game removed from library" }))
        }
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
        "launch-game" => {
            let payload = args.get(0).cloned().unwrap_or(Value::Null);
            let game_id = parse_game_id_from_payload(&payload);
            if game_id <= 0 {
                return Ok(json!({ "success": false, "message": "Game not found" }));
            }

            let games = read_state_array("games");
            let game = games
                .iter()
                .find(|row| row.get("id").and_then(|v| v.as_i64()).unwrap_or(0) == game_id)
                .cloned();
            let Some(game_row) = game else {
                return Ok(json!({ "success": false, "message": "Game not found" }));
            };

            let game_name = game_row
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("Unknown Game")
                .to_string();
            let game_path = game_row
                .get("filePath")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if game_path.is_empty() {
                return Ok(json!({
                    "success": false,
                    "code": "GAME_FILE_MISSING",
                    "message": "Game file not found",
                    "gameId": game_id,
                    "gameName": game_name,
                    "missingPath": "",
                    "parentPath": "",
                    "parentExists": false,
                    "rootPath": "",
                    "rootExists": false,
                    "sourceMedia": "unknown"
                }));
            }

            let is_launcher_uri = game_path.starts_with("steam://")
                || game_path.starts_with("com.epicgames.launcher://")
                || game_path.starts_with("goggalaxy://")
                || game_path.starts_with("heroic://");
            if is_launcher_uri {
                return match open::that(&game_path) {
                    Ok(_) => {
                        let _ = update_game_last_played(game_id);
                        Ok(json!({
                            "success": true,
                            "message": "Launcher opened",
                            "launchMode": "launcher"
                        }))
                    }
                    Err(err) => Ok(json!({
                        "success": false,
                        "message": err.to_string()
                    })),
                };
            }

            let game_path_buf = PathBuf::from(&game_path);
            if !game_path_buf.exists() {
                let parent_path = game_path_buf
                    .parent()
                    .map(|p| p.to_string_lossy().to_string())
                    .unwrap_or_default();
                let parent_exists = game_path_buf.parent().map(|p| p.exists()).unwrap_or(false);
                let media = classify_import_media(&game_path);
                return Ok(json!({
                    "success": false,
                    "code": "GAME_FILE_MISSING",
                    "message": "Game file not found",
                    "gameId": game_id,
                    "gameName": game_name,
                    "missingPath": game_path,
                    "parentPath": parent_path,
                    "parentExists": parent_exists,
                    "rootPath": media.get("rootPath").cloned().unwrap_or_else(|| Value::String(String::new())),
                    "rootExists": media.get("rootExists").cloned().unwrap_or(Value::Bool(false)),
                    "sourceMedia": media.get("mediaCategory").cloned().unwrap_or_else(|| Value::String("unknown".to_string()))
                }));
            }

            let platform_short_name = normalize_platform_short_name(
                game_row
                    .get("platformShortName")
                    .and_then(|v| v.as_str())
                    .unwrap_or(""),
            );
            let override_emulator_path = game_row
                .get("emulatorOverridePath")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();

            let emulators = read_state_array("emulators");
            let mut selected_emulator = None::<(PathBuf, String)>;
            if !override_emulator_path.is_empty() {
                let candidate = PathBuf::from(&override_emulator_path);
                if candidate.exists() && candidate.is_file() {
                    selected_emulator = Some((candidate, String::new()));
                }
            }

            if selected_emulator.is_none() && !platform_short_name.is_empty() {
                for emulator in emulators {
                    let emulator_psn = normalize_platform_short_name(
                        emulator
                            .get("platformShortName")
                            .and_then(|v| v.as_str())
                            .unwrap_or(""),
                    );
                    if emulator_psn != platform_short_name {
                        continue;
                    }
                    let emulator_path = emulator
                        .get("filePath")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .trim()
                        .to_string();
                    if emulator_path.is_empty() {
                        continue;
                    }
                    let emulator_path_buf = PathBuf::from(&emulator_path);
                    if !emulator_path_buf.exists() || !emulator_path_buf.is_file() {
                        continue;
                    }
                    let emulator_args = emulator
                        .get("args")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .trim()
                        .to_string();
                    selected_emulator = Some((emulator_path_buf, emulator_args));
                    break;
                }
            }

            if let Some((emulator_path, emulator_args)) = selected_emulator {
                match launch_game_with_emulator(&emulator_path, &emulator_args, &game_path_buf) {
                    Ok(_) => {
                        let _ = update_game_last_played(game_id);
                        return Ok(json!({
                            "success": true,
                            "message": "Game launched",
                            "gameId": game_id,
                            "launchMode": "emulator",
                            "emulatorPath": emulator_path.to_string_lossy().to_string()
                        }));
                    }
                    Err(_) => {}
                }
            }

            match launch_game_file(&game_path_buf) {
                Ok(_) => {
                    let _ = update_game_last_played(game_id);
                    Ok(json!({
                        "success": true,
                        "message": "Game launched",
                        "gameId": game_id,
                        "launchMode": "direct"
                    }))
                }
                Err(err) => Ok(json!({
                    "success": false,
                    "message": err
                })),
            }
        }
        "launch-emulator" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let emulator_path = payload
                .get("filePath")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if emulator_path.is_empty() {
                return Ok(json!({ "success": false, "message": "Missing emulator path" }));
            }
            let emulator_args = payload
                .get("args")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let working_directory = payload
                .get("workingDirectory")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            match launch_emulator_process(
                Path::new(&emulator_path),
                &emulator_args,
                &working_directory,
            ) {
                Ok(_) => Ok(json!({ "success": true })),
                Err(err) => Ok(json!({ "success": false, "message": err })),
            }
        }
        "search-missing-game-file" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let target_id = payload
                .get("gameId")
                .and_then(|v| v.as_i64())
                .unwrap_or(0);
            let root_dir = payload
                .get("rootDir")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            let max_depth = payload
                .get("maxDepth")
                .and_then(|v| v.as_u64())
                .unwrap_or(8) as usize;

            if target_id <= 0 {
                return Ok(json!({ "success": false, "message": "Missing game ID" }));
            }
            if root_dir.is_empty() {
                return Ok(json!({ "success": false, "message": "Missing search root folder" }));
            }
            let root_path = PathBuf::from(&root_dir);
            if !root_path.exists() || !root_path.is_dir() {
                return Ok(json!({ "success": false, "message": "Search root folder not found" }));
            }

            let mut games = read_state_array("games");
            let game_index = games.iter().position(|row| {
                row.get("id").and_then(|v| v.as_i64()).unwrap_or(0) == target_id
            });
            let Some(game_index) = game_index else {
                return Ok(json!({ "success": false, "message": "Game not found" }));
            };
            let game_name = games[game_index]
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("Unknown Game")
                .to_string();
            let old_path = games[game_index]
                .get("filePath")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            let target_file_name = Path::new(&old_path)
                .file_name()
                .and_then(|v| v.to_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if target_file_name.is_empty() {
                return Ok(json!({ "success": false, "message": "Game has no file name" }));
            }

            let found_path = find_file_by_name_in_tree(&root_path, &target_file_name, max_depth, 20000);
            let Some(found) = found_path else {
                return Ok(json!({
                    "success": true,
                    "found": false,
                    "gameId": target_id,
                    "gameName": game_name,
                    "targetFileName": target_file_name
                }));
            };

            if let Some(obj) = games[game_index].as_object_mut() {
                obj.insert(
                    "filePath".to_string(),
                    Value::String(found.to_string_lossy().to_string()),
                );
            }
            write_state_array("games", games)?;
            Ok(json!({
                "success": true,
                "found": true,
                "gameId": target_id,
                "gameName": game_name,
                "newPath": found.to_string_lossy().to_string()
            }))
        }
        "relink-game-file" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let target_id = payload
                .get("gameId")
                .and_then(|v| v.as_i64())
                .unwrap_or(0);
            let selected_path = payload
                .get("filePath")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();

            if target_id <= 0 {
                return Ok(json!({ "success": false, "message": "Missing game ID" }));
            }
            if selected_path.is_empty() {
                return Ok(json!({ "success": false, "message": "Missing file path" }));
            }
            let selected = PathBuf::from(&selected_path);
            if !selected.exists() {
                return Ok(json!({ "success": false, "message": "Selected file was not found" }));
            }
            if !selected.is_file() {
                return Ok(json!({ "success": false, "message": "Selected path is not a file" }));
            }

            let mut games = read_state_array("games");
            let game_index = games.iter().position(|row| {
                row.get("id").and_then(|v| v.as_i64()).unwrap_or(0) == target_id
            });
            let Some(index) = game_index else {
                return Ok(json!({ "success": false, "message": "Game not found" }));
            };
            let game_name = games[index]
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("Unknown Game")
                .to_string();
            if let Some(obj) = games[index].as_object_mut() {
                obj.insert("filePath".to_string(), Value::String(selected_path.clone()));
            }
            write_state_array("games", games)?;
            Ok(json!({
                "success": true,
                "gameId": target_id,
                "gameName": game_name,
                "newPath": selected_path
            }))
        }
        "migration:import-legacy-library-db" => {
            let conn = open_state_db()?;
            let games_before = read_state_array("games").len();
            let emus_before = read_state_array("emulators").len();
            let tags_before = read_state_array("tags").len();
            migrate_legacy_library_db_if_needed(&conn)?;
            let games_after = read_state_array("games").len();
            let emus_after = read_state_array("emulators").len();
            let tags_after = read_state_array("tags").len();
            Ok(json!({
                "success": true,
                "before": {
                    "games": games_before,
                    "emulators": emus_before,
                    "tags": tags_before
                },
                "after": {
                    "games": games_after,
                    "emulators": emus_after,
                    "tags": tags_after
                }
            }))
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
        "show-item-in-folder" => {
            let raw_path = args.get(0).and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
            if raw_path.is_empty() {
                return Ok(json!({ "success": false, "message": "Missing path" }));
            }
            let target = PathBuf::from(&raw_path);
            if !target.exists() {
                return Ok(json!({ "success": false, "message": "Path not found" }));
            }
            #[cfg(target_os = "windows")]
            {
                let status = if target.is_file() {
                    Command::new("explorer")
                        .arg(format!("/select,{}", raw_path))
                        .status()
                } else {
                    Command::new("explorer").arg(&raw_path).status()
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
        "browse-games-and-emus" => {
            let scan_target = args.get(0).and_then(|v| v.as_str()).unwrap_or("");
            scan_and_import_games_and_emulators(scan_target, args.get(1))
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
        "update:get-state" | "resources:update:get-state" => Ok(json!({
            "available": false,
            "downloaded": false
        })),
        "update:get-config" | "resources:update:get-config" => Ok(json!({})),
        "update:set-config" | "resources:update:set-config" => Ok(json!({ "success": true })),
        "update:check"
        | "update:download"
        | "update:install"
        | "resources:update:check"
        | "resources:update:install"
        | "launcher:scan-games"
        | "launcher:import-games"
        | "locales:write"
        | "locales:delete"
        | "locales:rename"
        | "locales:flags:get-data-url"
        | "locales:flags:write-data-url"
        | "locales:flags:write-from-file"
        | "locales:repo:get-config"
        | "locales:repo:set-config"
        | "locales:repo:fetch-catalog"
        | "locales:repo:install"
        | "youtube:search-videos"
        | "youtube:open-video"
        | "covers:download-for-game"
        | "covers:download-for-library"
        | "covers:get-source-config"
        | "suggestions:recommend-games"
        | "suggestions:list-ollama-models"
        | "suggestions:relay:sync-host-settings"
        | "suggestions:relay:scan-network"
        | "suggestions:relay:get-status"
        | "suggestions:relay:get-connections"
        | "suggestions:emulation-support"
        | "suggestions:generate-theme"
        | "suggestions:translate-locale-missing"
        | "suggestions:suggest-tags-for-game"
        | "suggestions:suggest-tags-for-games-batch"
        | "tools:ecm:get-download-info"
        | "tools:ecm:download-source-zip"
        | "tools:ecm:detect-build-env"
        | "tools:ecm:build-binaries"
        | "tools:ecm:get-compiler-install-options"
        | "tools:ecm:install-compiler"
        | "bios:list"
        | "bios:add-files"
        | "bios:open-folder"
        | "read-memory-card"
        | "delete-save"
        | "undelete-save"
        | "rename-save"
        | "format-card"
        | "copy-save"
        | "export-save"
        | "import-save"
        | "memory-card:create-empty"
        | "browse-memory-cards"
        | "remote:host:get-config"
        | "remote:host:set-config"
        | "remote:host:get-status"
        | "remote:host:get-pairing"
        | "remote:host:rotate-pairing"
        | "remote:client:scan"
        | "remote:client:get-hosts"
        | "remote:client:set-hosts"
        | "remote:client:pair"
        | "remote:client:list-games"
        | "remote:client:download-file"
        | "help:docs:list"
        | "help:docs:get"
        | "help:docs:search"
        | "get-monitor-info"
        | "detect-monitors"
        | "set-monitor-orientation"
        | "toggle-monitor-orientation"
        | "set-monitor-display-state"
        | "set-primary-monitor"
        | "system:get-specs"
        | "create-game-shortcut" => Ok(not_implemented()),
        _ => Ok(json!({
            "success": false,
            "message": format!("Unsupported emubro channel in Tauri migration: {}", channel)
        })),
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![app_version, emubro_invoke])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
