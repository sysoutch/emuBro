use super::*;

macro_rules! try_or_some_err {
    ($expr:expr) => {
        match $expr {
            Ok(value) => value,
            Err(error) => return Some(Err(error)),
        }
    };
}

pub(crate) fn handle(channel: &str, args: &[Value]) -> Option<Result<Value, String>> {
    let result = match channel {
        "bios:list" => list_bios_platforms(),
        "bios:add-files" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            add_bios_files(&payload)
        }
        "bios:open-folder" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let short_name = normalize_platform_folder_name(
                payload
                    .get("platformShortName")
                    .or_else(|| payload.get("platform"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("shared"),
            );
            let target = bios_root_dir().join(short_name);
            try_or_some_err!(ensure_directory(&target));
            match open::that(&target) {
                Ok(_) => Ok(json!({
                    "success": true,
                    "path": target.to_string_lossy().to_string()
                })),
                Err(err) => Ok(json!({
                    "success": false,
                    "message": err.to_string(),
                    "path": target.to_string_lossy().to_string()
                })),
            }
        }
        _ => return None,
    };
    Some(result)
}
