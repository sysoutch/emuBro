use super::*;

pub(crate) fn open_state_db() -> Result<Connection, String> {
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

pub(crate) fn db_get_state_value(conn: &Connection, key: &str) -> Result<Option<Value>, String> {
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

pub(crate) fn db_set_state_value(conn: &Connection, key: &str, value: &Value) -> Result<(), String> {
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

pub(crate) fn read_state_array(key: &str) -> Vec<Value> {
    let Ok(conn) = open_state_db() else {
        return Vec::new();
    };
    match db_get_state_value(&conn, key) {
        Ok(Some(Value::Array(rows))) => rows,
        _ => Vec::new(),
    }
}

pub(crate) fn write_state_array(key: &str, rows: Vec<Value>) -> Result<(), String> {
    let conn = open_state_db()?;
    db_set_state_value(&conn, key, &Value::Array(rows))
}

pub(crate) fn read_state_value_or_default(key: &str, fallback: Value) -> Value {
    let Ok(conn) = open_state_db() else {
        return fallback;
    };
    match db_get_state_value(&conn, key) {
        Ok(Some(value)) => value,
        _ => fallback,
    }
}

pub(crate) fn write_state_value(key: &str, value: &Value) -> Result<(), String> {
    let conn = open_state_db()?;
    db_set_state_value(&conn, key, value)
}
