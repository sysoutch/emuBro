use super::*;

pub(crate) fn handle(channel: &str, args: &[Value]) -> Option<Result<Value, String>> {
    let result = match channel {
        "system:get-specs" => Ok(json!({
            "success": true,
            "specs": build_system_specs()
        })),
        "create-game-shortcut" => {
            let game_id = parse_game_id_from_payload(args.get(0).unwrap_or(&Value::Null));
            create_shortcut_for_game(game_id)
        }
        _ => return None,
    };
    Some(result)
}
