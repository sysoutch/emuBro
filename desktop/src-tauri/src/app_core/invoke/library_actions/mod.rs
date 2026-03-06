use super::*;
use serde_json::json;

mod imports;
mod launch;
mod metadata;
mod migration;
mod relink;
mod tags;

pub(super) fn handle(ch: &str, args: &[Value], window: &Window) -> Result<Value, String> {
    match ch {
        "analyze-import-paths"
        | "stage-import-paths"
        | "detect-emulator-exe"
        | "import-exe"
        | "import-files-as-platform"
        | "import-paths"
        | "cue:inspect-bin-files"
        | "cue:generate-for-bin"
        | "import:analyze-archives"
        | "iso:detect-game-codes"
        | "browse-games-and-emus" => imports::handle(ch, args, window),

        "update-game-metadata" | "remove-game" => metadata::handle(ch, args, window),

        "tags:rename" | "tags:delete" => tags::handle(ch, args, window),

        "launch-game" | "launch-emulator" => launch::handle(ch, args, window),

        "search-missing-game-file" | "relink-game-file" => relink::handle(ch, args, window),

        "migration:import-legacy-library-db" => migration::handle(ch, args, window),

        _ => Ok(json!({ "success": false, "message": format!("Unsupported library channel: {}", ch) })),
    }
}
