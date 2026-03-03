use super::*;
use base64::prelude::*;
use ico::{IconDir, IconDirEntry, IconImage, ResourceType};
use image::{imageops, DynamicImage, GenericImageView, ImageBuffer, Rgba};
use std::env;
use std::io::Cursor;
use std::path::PathBuf;

fn build_system_specs() -> Value {
    json!({
        "platform": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "cpuCores": std::thread::available_parallelism().map(|n| n.get()).unwrap_or(1),
    })
}

fn sanitize_filename(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    for ch in input.chars() {
        let invalid = matches!(ch, '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*');
        if invalid || ch.is_control() {
            out.push('_');
        } else {
            out.push(ch);
        }
    }
    out.trim().trim_matches('.').to_string()
}

fn desktop_dir() -> Option<PathBuf> {
    if cfg!(target_os = "windows") {
        if let Ok(user_profile) = env::var("USERPROFILE") {
            let path = PathBuf::from(user_profile).join("Desktop");
            if path.exists() {
                return Some(path);
            }
        }
    }

    if let Ok(home) = env::var("HOME") {
        let path = PathBuf::from(home).join("Desktop");
        if path.exists() {
            return Some(path);
        }
    }

    None
}

fn escape_ps_single_quotes(text: &str) -> String {
    text.replace('\'', "''")
}

fn decode_data_url_image(raw: &str) -> Option<DynamicImage> {
    let trimmed = raw.trim();
    let header_end = trimmed.find(',')?;
    let (header, payload) = trimmed.split_at(header_end);
    if !header.to_ascii_lowercase().starts_with("data:image/") {
        return None;
    }

    let bytes = if header.to_ascii_lowercase().contains(";base64") {
        BASE64_STANDARD.decode(payload.trim_start_matches(',')).ok()?
    } else {
        urlencoding::decode_binary(payload.trim_start_matches(',').as_bytes()).into_owned()
    };

    image::load_from_memory(&bytes).ok()
}

fn load_image_from_source(raw: &str) -> Option<(DynamicImage, String)> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return None;
    }

    if trimmed.starts_with("data:") {
        let image = decode_data_url_image(trimmed)?;
        return Some((image, "embedded-cover".to_string()));
    }

    let path = resolve_existing_path(trimmed)?;
    let image = image::open(&path).ok()?;
    let source_name = path
        .file_stem()
        .and_then(|value| value.to_str())
        .map(sanitize_filename)
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "cover".to_string());
    Some((image, source_name))
}

fn compose_icon_frame(source: &DynamicImage, size: u32) -> ImageBuffer<Rgba<u8>, Vec<u8>> {
    let (width, height) = source.dimensions();
    if width == 0 || height == 0 || size == 0 {
        return ImageBuffer::from_pixel(size.max(1), size.max(1), Rgba([0, 0, 0, 0]));
    }

    let ratio = f32::min(size as f32 / width as f32, size as f32 / height as f32);
    let draw_width = ((width as f32 * ratio).round() as u32).max(1).min(size);
    let draw_height = ((height as f32 * ratio).round() as u32).max(1).min(size);
    let resized = source
        .resize_exact(draw_width, draw_height, imageops::FilterType::Lanczos3)
        .to_rgba8();

    let mut canvas = ImageBuffer::from_pixel(size, size, Rgba([0, 0, 0, 0]));
    let offset_x = ((size - draw_width) / 2) as i64;
    let offset_y = ((size - draw_height) / 2) as i64;
    imageops::overlay(&mut canvas, &resized, offset_x, offset_y);
    canvas
}

fn write_shortcut_icon(image: &DynamicImage, icon_path: &Path) -> Result<(), String> {
    let mut icon_dir = IconDir::new(ResourceType::Icon);
    for size in [16_u32, 24, 32, 48, 64, 96, 128, 256] {
        let frame = compose_icon_frame(image, size);
        let icon_image = IconImage::from_rgba_data(size, size, frame.into_raw());
        let entry = IconDirEntry::encode(&icon_image).map_err(|error| error.to_string())?;
        icon_dir.add_entry(entry);
    }

    let mut bytes = Cursor::new(Vec::<u8>::new());
    icon_dir.write(&mut bytes).map_err(|error| error.to_string())?;
    fs::write(icon_path, bytes.into_inner()).map_err(|error| error.to_string())
}

fn resolve_existing_path(raw: &str) -> Option<PathBuf> {
    let trimmed = raw.trim();
    if trimmed.is_empty() || trimmed.starts_with("data:") {
        return None;
    }

    let normalized_input = trimmed
        .strip_prefix("file:///")
        .or_else(|| trimmed.strip_prefix("file://"))
        .map(|value| value.replace('/', "\\"))
        .unwrap_or_else(|| trimmed.to_string());

    let direct = PathBuf::from(&normalized_input);
    if direct.exists() {
        return Some(direct);
    }

    let mut candidates = Vec::<PathBuf>::new();
    if let Ok(cwd) = env::current_dir() {
        candidates.push(cwd.join(&normalized_input));
        candidates.push(cwd.join("bundle-resources").join(&normalized_input));
        candidates.push(cwd.join("resources").join(&normalized_input));
        candidates.push(cwd.join("resources").join("bundle-resources").join(&normalized_input));
        candidates.push(cwd.join("legacy").join(&normalized_input));
    }
    candidates.push(managed_data_root().join(&normalized_input));
    if let Ok(exe) = env::current_exe() {
        if let Some(parent) = exe.parent() {
            candidates.push(parent.join(&normalized_input));
            candidates.push(parent.join("bundle-resources").join(&normalized_input));
            candidates.push(parent.join("resources").join(&normalized_input));
            candidates.push(parent.join("resources").join("bundle-resources").join(&normalized_input));
            candidates.push(parent.join("legacy").join(&normalized_input));
            if let Some(parent_parent) = parent.parent() {
                candidates.push(parent_parent.join(&normalized_input));
                candidates.push(parent_parent.join("bundle-resources").join(&normalized_input));
                candidates.push(parent_parent.join("resources").join(&normalized_input));
                candidates.push(parent_parent.join("resources").join("bundle-resources").join(&normalized_input));
                candidates.push(parent_parent.join("legacy").join(&normalized_input));
            }
        }
    }

    candidates.into_iter().find(|path| path.exists())
}

fn resolve_shortcut_image_source(game_row: &Value) -> Option<PathBuf> {
    if let Some(cover_path) = game_row.get("coverImage").and_then(|v| v.as_str()) {
        if let Some(path) = resolve_existing_path(cover_path) {
            return Some(path);
        }
    }

    let platform_short = game_row
        .get("platformShortName")
        .and_then(|v| v.as_str())
        .or_else(|| game_row.get("platform").and_then(|v| v.as_str()))
        .unwrap_or("")
        .trim()
        .to_lowercase();
    if platform_short.is_empty() {
        return None;
    }

    if let Some(platforms_dir) = find_platforms_dir() {
        let platform_dir = platforms_dir.join(&platform_short);
        let cover_candidates = [
            platform_dir.join("covers").join("default.png"),
            platform_dir.join("covers").join("default.jpg"),
            platform_dir.join("covers").join("default.jpeg"),
            platform_dir.join("covers").join("default.webp"),
            platform_dir.join("logos").join("default.png"),
        ];
        for candidate in cover_candidates {
            if candidate.exists() && candidate.is_file() {
                return Some(candidate);
            }
        }
    }

    let platform_cover_candidates = [
        format!("emubro-resources/platforms/{}/covers/default.png", platform_short),
        format!("emubro-resources/platforms/{}/covers/default.jpg", platform_short),
        format!("emubro-resources/platforms/{}/covers/default.jpeg", platform_short),
        format!("emubro-resources/platforms/{}/covers/default.webp", platform_short),
        format!("emubro-resources/platforms/{}/logos/default.png", platform_short),
    ];

    for candidate in platform_cover_candidates {
        if let Some(path) = resolve_existing_path(&candidate) {
            return Some(path);
        }
    }

    None
}

fn resolve_shortcut_image_path(game_row: &Value) -> Option<PathBuf> {
    for key in ["image", "coverImage"] {
        if let Some(raw) = game_row.get(key).and_then(|value| value.as_str()) {
            if let Some(path) = resolve_existing_path(raw) {
                return Some(path);
            }
        }
    }
    resolve_shortcut_image_source(game_row)
}

fn resolve_shortcut_image_content(game_row: &Value) -> Option<(DynamicImage, String)> {
    for key in ["image", "coverImage"] {
        if let Some(raw) = game_row.get(key).and_then(|value| value.as_str()) {
            if let Some(result) = load_image_from_source(raw) {
                return Some(result);
            }
        }
    }

    let fallback_path = resolve_shortcut_image_source(game_row)?;
    let image = image::open(&fallback_path).ok()?;
    let source_name = fallback_path
        .file_stem()
        .and_then(|value| value.to_str())
        .map(sanitize_filename)
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "cover".to_string());
    Some((image, source_name))
}

fn resolve_shortcut_icon_file(game_id: i64, game_row: &Value) -> Option<PathBuf> {
    let (source_image, source_name) = resolve_shortcut_image_content(game_row)?;
    let icon_dir = managed_data_root().join("shortcut-icons");
    if ensure_directory(&icon_dir).is_err() {
        return None;
    }
    let metadata_suffix = if let Some(path) = resolve_shortcut_image_path(game_row) {
        fs::metadata(&path)
            .ok()
            .and_then(|meta| meta.modified().ok())
            .and_then(|ts| ts.duration_since(UNIX_EPOCH).ok())
            .map(|dur| dur.as_secs())
            .unwrap_or(0)
    } else {
        unix_timestamp_ms() as u64
    };
    let icon_path = icon_dir.join(format!("game-{}-{}-{}.ico", game_id, source_name, metadata_suffix));

    if write_shortcut_icon(&source_image, &icon_path).is_err() || !icon_path.exists() {
        return None;
    }

    Some(icon_path)
}

fn create_shortcut_for_game(game_id: i64) -> Result<Value, String> {
    if game_id <= 0 {
        return Ok(json!({ "success": false, "message": "Game not found" }));
    }

    let games = read_state_array("games");
    let game = games.iter().find(|row| row.get("id").and_then(|v| v.as_i64()).unwrap_or(0) == game_id);
    let Some(game_row) = game else {
        return Ok(json!({ "success": false, "message": "Game not found" }));
    };

    let game_name = game_row.get("name").and_then(|v| v.as_str()).unwrap_or("Unknown Game");
    let platform_name = game_row
        .get("platformShortName")
        .and_then(|v| v.as_str())
        .or_else(|| game_row.get("platform").and_then(|v| v.as_str()))
        .unwrap_or("unknown");

    let desktop = match desktop_dir() {
        Some(path) => path,
        None => {
            return Ok(json!({ "success": false, "message": "Desktop path not found" }));
        }
    };

    if !cfg!(target_os = "windows") {
        return Ok(json!({
            "success": false,
            "message": "Desktop shortcut creation is currently supported on Windows only"
        }));
    }

    let exe_path = std::env::current_exe().map_err(|error| error.to_string())?;
    let working_dir = exe_path
        .parent()
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|| desktop.clone());

    let shortcut_name_raw = format!("{} ({})", game_name, platform_name);
    let shortcut_name = sanitize_filename(&shortcut_name_raw);
    let shortcut_file = if shortcut_name.is_empty() {
        format!("emuBro Game {}.lnk", game_id)
    } else {
        format!("{}.lnk", shortcut_name)
    };
    let shortcut_path = desktop.join(shortcut_file);

    let target = escape_ps_single_quotes(&exe_path.to_string_lossy());
    let output = escape_ps_single_quotes(&shortcut_path.to_string_lossy());
    let workdir = escape_ps_single_quotes(&working_dir.to_string_lossy());
    let description = escape_ps_single_quotes(&format!("Launch {} in emuBro", game_name));
    let args = format!("--launch-game={}", game_id);
    let args_escaped = escape_ps_single_quotes(&args);
    let shortcut_icon = resolve_shortcut_icon_file(game_id, game_row)
        .or_else(|| resolve_existing_path("icons/icon.ico"))
        .or_else(|| {
            env::current_exe()
                .ok()
                .and_then(|exe| {
                    let alongside = exe.with_file_name("icon.ico");
                    if alongside.exists() { Some(alongside) } else { None }
                })
        });
    let icon_line = shortcut_icon
        .as_ref()
        .map(|path| format!("$s.IconLocation = '{},0'; ", escape_ps_single_quotes(&path.to_string_lossy())))
        .unwrap_or_default();

    let _ = fs::remove_file(&shortcut_path);

    let script = format!(
        "$w = New-Object -ComObject WScript.Shell; \
$s = $w.CreateShortcut('{output}'); \
$s.TargetPath = '{target}'; \
$s.Arguments = '{args}'; \
$s.WorkingDirectory = '{workdir}'; \
$s.Description = '{description}'; \
{icon_line}\
$s.Save();",
        output = output,
        target = target,
        args = args_escaped,
        workdir = workdir,
        description = description,
        icon_line = icon_line,
    );

    let powershell_output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            script.as_str(),
        ])
        .output()
        .map_err(|error| error.to_string())?;

    if !powershell_output.status.success() {
        let stderr = String::from_utf8_lossy(&powershell_output.stderr).trim().to_string();
        let stdout = String::from_utf8_lossy(&powershell_output.stdout).trim().to_string();
        let message = if !stderr.is_empty() {
            stderr
        } else if !stdout.is_empty() {
            stdout
        } else {
            "Failed to create shortcut".to_string()
        };
        return Ok(json!({ "success": false, "message": message }));
    }

    if !shortcut_path.exists() {
        return Ok(json!({ "success": false, "message": "Failed to create shortcut" }));
    }

    std::thread::spawn(|| {
        let _ = Command::new("ie4uinit.exe")
            .args(["-show"])
            .spawn();
    });

    Ok(json!({
        "success": true,
        "path": shortcut_path.to_string_lossy().to_string(),
        "args": args,
        "iconPath": shortcut_icon.map(|p| p.to_string_lossy().to_string()).unwrap_or_default()
    }))
}

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
