use super::*;
use serde_json::json;

pub(super) fn handle(ch: &str, _args: &[Value], _window: &Window) -> Result<Value, String> {
    match ch {
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
        _ => Ok(json!({ "success": false, "message": format!("Unsupported migration channel: {}", ch) })),
    }
}
