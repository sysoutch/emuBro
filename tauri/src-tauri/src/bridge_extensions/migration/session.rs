use super::*;
use std::sync::{Mutex, OnceLock};

#[derive(Clone, Debug)]
struct SessionSnapshot {
    id: String,
    game_id: i64,
    game_name: String,
    game_path: String,
    started_at: i64,
}

fn session_state() -> &'static Mutex<Option<SessionSnapshot>> {
    static STATE: OnceLock<Mutex<Option<SessionSnapshot>>> = OnceLock::new();
    STATE.get_or_init(|| Mutex::new(None))
}

pub(crate) fn set_game_session_from_launch(game_id: i64, game_name: &str, game_path: &str) {
    let normalized_game_id = if game_id > 0 {
        game_id
    } else {
        (unix_timestamp_ms() % (i64::MAX as u128)) as i64
    };
    let id = format!("{}-{}", normalized_game_id, unix_timestamp_ms());
    let snapshot = SessionSnapshot {
        id,
        game_id: normalized_game_id,
        game_name: game_name.trim().to_string(),
        game_path: game_path.trim().to_string(),
        started_at: unix_timestamp_ms() as i64,
    };
    if let Ok(mut lock) = session_state().lock() {
        *lock = Some(snapshot);
    }
}

pub(super) fn clear_game_session() {
    if let Ok(mut lock) = session_state().lock() {
        *lock = None;
    }
}

pub(super) fn game_session_status_payload() -> Value {
    let current = session_state()
        .lock()
        .ok()
        .and_then(|guard| guard.clone());
    match current {
        Some(session) => json!({
            "success": true,
            "active": true,
            "session": {
                "id": session.id,
                "gameId": session.game_id,
                "gameName": session.game_name,
                "gamePath": session.game_path,
                "startedAt": session.started_at
            }
        }),
        None => json!({
            "success": true,
            "active": false,
            "session": Value::Null
        }),
    }
}
