use super::*;
use std::collections::HashSet;
use std::sync::{Mutex, OnceLock};

#[derive(Clone, Debug)]
struct SessionSnapshot {
    id: String,
    game_id: i64,
    game_name: String,
    game_path: String,
    process_id: Option<u32>,
    started_at: i64,
}

fn session_state() -> &'static Mutex<Vec<SessionSnapshot>> {
    static STATE: OnceLock<Mutex<Vec<SessionSnapshot>>> = OnceLock::new();
    STATE.get_or_init(|| Mutex::new(Vec::new()))
}

pub(crate) fn set_game_session_from_launch(
    game_id: i64,
    game_name: &str,
    game_path: &str,
    process_id: Option<u32>,
) {
    let normalized_game_id = if game_id > 0 {
        game_id
    } else {
        (unix_timestamp_ms() % (i64::MAX as u128)) as i64
    };
    let started_at = unix_timestamp_ms() as i64;
    let id = format!("{}-{}", normalized_game_id, started_at);
    let snapshot = SessionSnapshot {
        id,
        game_id: normalized_game_id,
        game_name: game_name.trim().to_string(),
        game_path: game_path.trim().to_string(),
        process_id,
        started_at,
    };

    if let Ok(mut lock) = session_state().lock() {
        if let Some(pid) = process_id {
            if let Some(existing) = lock.iter_mut().find(|row| row.process_id == Some(pid)) {
                *existing = snapshot;
                return;
            }
        }
        lock.push(snapshot);
    }
}

pub(crate) fn clear_game_session() {
    if let Ok(mut lock) = session_state().lock() {
        lock.clear();
    }
}

pub(crate) fn clear_game_session_process(process_id: u32) -> bool {
    if process_id == 0 {
        return false;
    }
    let Ok(mut lock) = session_state().lock() else {
        return false;
    };
    let before = lock.len();
    lock.retain(|row| row.process_id != Some(process_id));
    before != lock.len()
}

pub(crate) fn game_session_status_payload() -> Value {
    let sessions = session_state()
        .lock()
        .ok()
        .map(|guard| guard.clone())
        .unwrap_or_default();

    if let Some(session) = sessions.last() {
        return json!({
            "success": true,
            "active": true,
            "sessionCount": sessions.len(),
            "session": {
                "id": session.id,
                "gameId": session.game_id,
                "gameName": session.game_name,
                "gamePath": session.game_path,
                "processId": session.process_id,
                "startedAt": session.started_at
            }
        });
    }

    json!({
        "success": true,
        "active": false,
        "sessionCount": 0,
        "session": Value::Null
    })
}

pub(crate) fn game_session_process_id() -> Option<u32> {
    session_state()
        .lock()
        .ok()
        .and_then(|guard| guard.iter().rev().find_map(|row| row.process_id))
}

pub(crate) fn game_session_process_ids() -> Vec<u32> {
    let sessions = session_state()
        .lock()
        .ok()
        .map(|guard| guard.clone())
        .unwrap_or_default();
    let mut seen = HashSet::<u32>::new();
    let mut result = Vec::<u32>::new();
    for row in sessions {
        if let Some(pid) = row.process_id {
            if pid > 0 && seen.insert(pid) {
                result.push(pid);
            }
        }
    }
    result
}

pub(crate) fn has_active_game_session() -> bool {
    session_state()
        .lock()
        .map(|guard| !guard.is_empty())
        .unwrap_or(false)
}
