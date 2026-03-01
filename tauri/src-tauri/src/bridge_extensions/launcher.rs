use super::*;

pub(crate) fn handle(channel: &str, args: &[Value]) -> Option<Result<Value, String>> {
    let result = match channel {
        "launcher:scan-games" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let store_request = payload.get("stores").cloned().unwrap_or_else(|| json!({}));
            let steam_enabled = store_request
                .get("steam")
                .and_then(|v| v.as_bool())
                .unwrap_or(true);
            let epic_enabled = store_request
                .get("epic")
                .and_then(|v| v.as_bool())
                .unwrap_or(true);
            let gog_enabled = store_request
                .get("gog")
                .and_then(|v| v.as_bool())
                .unwrap_or(true);

            let steam_rows = if steam_enabled {
                scan_steam_manifests(&launcher_manifest_dirs_for_store("steam"))
            } else {
                Vec::new()
            };
            let epic_rows = if epic_enabled {
                scan_epic_manifests(&launcher_manifest_dirs_for_store("epic"))
            } else {
                Vec::new()
            };
            let gog_rows = if gog_enabled {
                scan_gog_galaxy(&launcher_manifest_dirs_for_store("gog"))
            } else {
                Vec::new()
            };
            Ok(json!({
                "success": true,
                "stores": {
                    "steam": steam_rows,
                    "epic": epic_rows,
                    "gog": gog_rows
                },
                "errors": []
            }))
        }
        "launcher:import-games" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            import_launcher_games(&payload)
        }
        _ => return None,
    };
    Some(result)
}
