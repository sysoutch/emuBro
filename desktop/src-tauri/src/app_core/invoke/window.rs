use super::*;
use serde_json::json;
use tauri::image::Image as TauriImage;
use tauri::Manager;

const DEFAULT_ICON_PNG: &[u8] = include_bytes!("../../../icons/icon.png");
const TASKBAR_BASE_ICON_PNG: &[u8] = include_bytes!("../../../icons/taskbar-base.png");

fn parse_hex_color(value: &str) -> Option<(u8, u8, u8)> {
    let trimmed = value.trim();
    let hex = trimmed.strip_prefix('#').unwrap_or(trimmed);
    match hex.len() {
        3 => {
            let r = u8::from_str_radix(&hex[0..1].repeat(2), 16).ok()?;
            let g = u8::from_str_radix(&hex[1..2].repeat(2), 16).ok()?;
            let b = u8::from_str_radix(&hex[2..3].repeat(2), 16).ok()?;
            Some((r, g, b))
        }
        6 => {
            let r = u8::from_str_radix(&hex[0..2], 16).ok()?;
            let g = u8::from_str_radix(&hex[2..4], 16).ok()?;
            let b = u8::from_str_radix(&hex[4..6], 16).ok()?;
            Some((r, g, b))
        }
        _ => None
    }
}

fn clamp01(value: f32) -> f32 {
    value.clamp(0.0, 1.0)
}

fn smoothstep(edge0: f32, edge1: f32, x: f32) -> f32 {
    if (edge1 - edge0).abs() < f32::EPSILON {
        return if x < edge0 { 0.0 } else { 1.0 };
    }
    let t = clamp01((x - edge0) / (edge1 - edge0));
    t * t * (3.0 - 2.0 * t)
}

fn blend_over(dst: [u8; 4], src: [u8; 4]) -> [u8; 4] {
    let sa = (src[3] as f32) / 255.0;
    if sa <= 0.0 {
        return dst;
    }

    let da = (dst[3] as f32) / 255.0;
    let out_a = sa + (da * (1.0 - sa));
    if out_a <= 0.0 {
        return [0, 0, 0, 0];
    }

    let sr = (src[0] as f32) / 255.0;
    let sg = (src[1] as f32) / 255.0;
    let sb = (src[2] as f32) / 255.0;
    let dr = (dst[0] as f32) / 255.0;
    let dg = (dst[1] as f32) / 255.0;
    let db = (dst[2] as f32) / 255.0;

    let out_r = ((sr * sa) + (dr * da * (1.0 - sa))) / out_a;
    let out_g = ((sg * sa) + (dg * da * (1.0 - sa))) / out_a;
    let out_b = ((sb * sa) + (db * da * (1.0 - sa))) / out_a;

    [
        (out_r.clamp(0.0, 1.0) * 255.0).round() as u8,
        (out_g.clamp(0.0, 1.0) * 255.0).round() as u8,
        (out_b.clamp(0.0, 1.0) * 255.0).round() as u8,
        (out_a.clamp(0.0, 1.0) * 255.0).round() as u8,
    ]
}

fn load_png_icon(bytes: &[u8]) -> Result<TauriImage<'static>, String> {
    let src = image::load_from_memory(bytes).map_err(|e| e.to_string())?;
    let rgba = src.to_rgba8();
    let (width, height) = rgba.dimensions();
    Ok(TauriImage::new_owned(rgba.into_raw(), width, height))
}

fn build_tinted_icon(color: (u8, u8, u8)) -> Result<TauriImage<'static>, String> {
    let src = image::load_from_memory(TASKBAR_BASE_ICON_PNG).map_err(|e| e.to_string())?;
    let emu = src.to_rgba8();
    let (width, height) = emu.dimensions();
    let mut rgba = vec![0u8; (width as usize) * (height as usize) * 4];
    let (target_r, target_g, target_b) = color;

    let min_side = width.min(height) as f32;
    let center_x = (width as f32) * 0.5;
    let center_y = (height as f32) * 0.5;
    let radius = min_side * 0.46;
    let feather = (min_side * 0.016).max(1.0);
    let glow_inner = radius + (feather * 0.35);
    let glow_outer = radius + (min_side * 0.16);

    for y in 0..height {
        for x in 0..width {
            let dx = (x as f32 + 0.5) - center_x;
            let dy = (y as f32 + 0.5) - center_y;
            let distance = (dx * dx + dy * dy).sqrt();
            let alpha_mask = 1.0 - smoothstep(radius - feather, radius + feather, distance);
            let glow_mask = 1.0 - smoothstep(glow_inner, glow_outer, distance);
            if alpha_mask <= 0.0 && glow_mask <= 0.0 {
                continue;
            }

            let radial = clamp01(distance / radius);
            let vertical = if height > 1 {
                (y as f32) / ((height - 1) as f32)
            } else {
                0.5
            };
            let highlight_dx = dx + (radius * 0.24);
            let highlight_dy = dy + (radius * 0.28);
            let highlight_dist = (highlight_dx * highlight_dx + highlight_dy * highlight_dy).sqrt();
            let highlight = clamp01(1.0 - (highlight_dist / (radius * 0.95))).powf(1.9) * 0.14;
            let vertical_light = 1.12 - (vertical * 0.32);
            let body_shade = clamp01(((1.04 - (radial * 0.35)) + highlight) * vertical_light);
            let glow_shade = clamp01((0.9 + ((1.0 - radial) * 0.24)) * (1.03 - (vertical * 0.18)));

            let body = [
                ((target_r as f32) * body_shade).clamp(0.0, 255.0).round() as u8,
                ((target_g as f32) * body_shade).clamp(0.0, 255.0).round() as u8,
                ((target_b as f32) * body_shade).clamp(0.0, 255.0).round() as u8,
                (255.0 * alpha_mask).round().clamp(0.0, 255.0) as u8,
            ];
            let glow = [
                ((target_r as f32) * glow_shade).clamp(0.0, 255.0).round() as u8,
                ((target_g as f32) * glow_shade).clamp(0.0, 255.0).round() as u8,
                ((target_b as f32) * glow_shade).clamp(0.0, 255.0).round() as u8,
                (255.0 * glow_mask * 0.28).round().clamp(0.0, 255.0) as u8,
            ];

            let mut bg = [0u8, 0u8, 0u8, 0u8];
            if glow[3] > 0 {
                bg = blend_over(bg, glow);
            }
            if body[3] > 0 {
                bg = blend_over(bg, body);
            }
            let idx = ((y as usize) * (width as usize) + (x as usize)) * 4;
            rgba[idx] = bg[0];
            rgba[idx + 1] = bg[1];
            rgba[idx + 2] = bg[2];
            rgba[idx + 3] = bg[3];
        }
    }

    let icon_side = width.min(height);
    let emu_side = ((icon_side as f32) * 0.72).round().max(8.0) as u32;
    let emu_scaled = image::imageops::resize(
        &emu,
        emu_side,
        emu_side,
        image::imageops::FilterType::Lanczos3,
    );
    let emu_offset_x = ((width as i64) - (emu_side as i64)) / 2;
    let emu_offset_y = ((height as i64) - (emu_side as i64)) / 2;

    for y in 0..emu_side {
        for x in 0..emu_side {
            let src_px = emu_scaled.get_pixel(x, y).0;
            if src_px[3] == 0 {
                continue;
            }

            let lum = ((0.2126 * src_px[0] as f32) + (0.7152 * src_px[1] as f32) + (0.0722 * src_px[2] as f32)) / 255.0;
            let emu_white = (226.0 + (lum * 29.0)).clamp(220.0, 255.0).round() as u8;
            let src = [emu_white, emu_white, emu_white, src_px[3]];

            let dst_x = x as i64 + emu_offset_x;
            let dst_y = y as i64 + emu_offset_y;
            if dst_x < 0 || dst_y < 0 || dst_x >= width as i64 || dst_y >= height as i64 {
                continue;
            }

            let idx = ((dst_y as usize) * (width as usize) + (dst_x as usize)) * 4;
            let dst = [rgba[idx], rgba[idx + 1], rgba[idx + 2], rgba[idx + 3]];
            let blended = blend_over(dst, src);
            rgba[idx] = blended[0];
            rgba[idx + 1] = blended[1];
            rgba[idx + 2] = blended[2];
            rgba[idx + 3] = blended[3];
        }
    }

    Ok(TauriImage::new_owned(rgba, width, height))
}

fn set_taskbar_icon(args: &[Value], window: &Window) -> Result<Value, String> {
    let color_raw = args
        .first()
        .and_then(|value| value.get("color"))
        .and_then(|value| value.as_str())
        .unwrap_or("")
        .trim()
        .to_string();

    let icon = match parse_hex_color(&color_raw) {
        Some(parsed_color) => build_tinted_icon(parsed_color)
            .or_else(|_| load_png_icon(DEFAULT_ICON_PNG))?,
        None => load_png_icon(DEFAULT_ICON_PNG)?,
    };
    window.set_icon(icon).map_err(|error| error.to_string())?;

    Ok(json!({
        "success": true
    }))
}

pub(super) fn handle(ch: &str, args: &[Value], window: &Window) -> Result<Value, String> {
    match ch {
        "window:minimize" => {
            window.minimize().map_err(|e| e.to_string())?;
            Ok(Value::Null)
        }
        "window:start-dragging" | "window:start-drag" => {
            match window.start_dragging() {
                Ok(_) => Ok(Value::Null),
                Err(error) => {
                    eprintln!("[window] start_dragging failed: {}", error);
                    Err(error.to_string())
                }
            }
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
        "window:set-taskbar-icon" => set_taskbar_icon(args, window),
        "app:renderer-ready" => {
            let app = window.app_handle();
            if let Some(splashscreen) = app.get_webview_window("splashscreen") {
                let _ = splashscreen.close();
            }
            if !should_keep_main_window_hidden() {
                if let Some(main_window) = app.get_webview_window("main") {
                    let _ = main_window.show();
                    let _ = main_window.set_focus();
                }
            }
            Ok(json!({
                "success": true,
                "hiddenLaunch": should_keep_main_window_hidden()
            }))
        }
        _ => Ok(json!({ "success": false, "message": format!("Unsupported window channel: {}", ch) })),
    }
}
