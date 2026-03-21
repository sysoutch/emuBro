use super::*;
use serde_json::json;
#[cfg(target_os = "windows")]
use std::collections::HashMap;
use std::fs::{self, OpenOptions};
use std::io::Write;
#[cfg(target_os = "windows")]
use std::sync::{Mutex, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::image::Image as TauriImage;
use tauri::Manager;
use tauri::{Position, Size};

const DEFAULT_ICON_PNG: &[u8] = include_bytes!("../../../icons/icon.png");
const TASKBAR_BASE_ICON_PNG: &[u8] = include_bytes!("../../../icons/taskbar-base.png");
type IconImageData = (Vec<u8>, u32, u32);

#[cfg(target_os = "windows")]
#[allow(dead_code)]
#[derive(Clone, Copy)]
struct WindowIconHandles {
    big: isize,
    small: isize,
}

#[cfg(target_os = "windows")]
#[allow(dead_code)]
static WINDOW_ICON_HANDLES: OnceLock<Mutex<HashMap<isize, WindowIconHandles>>> = OnceLock::new();

pub(crate) fn append_window_debug_log(window: &Window, log_name: &str, message: &str) {
    let app = window.app_handle();
    let app_data_dir = match app.path().app_data_dir() {
        Ok(path) => path,
        Err(_) => return,
    };
    let log_dir = app_data_dir.join("logs");
    if fs::create_dir_all(&log_dir).is_err() {
        return;
    }
    let safe_log_name = {
        let raw = String::from(log_name);
        let trimmed = raw.trim();
        if trimmed.is_empty() {
            "window-startup.log".to_string()
        } else {
            trimmed
                .chars()
                .map(|char| {
                    if char.is_ascii_alphanumeric() || char == '-' || char == '_' || char == '.' {
                        char
                    } else {
                        '_'
                    }
                })
                .collect::<String>()
        }
    };
    let log_path = log_dir.join(safe_log_name);
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(log_path) {
        let _ = writeln!(file, "[{}] {}", ts, message);
    }
}

#[cfg(target_os = "windows")]
fn append_taskbar_debug_log(window: &Window, message: &str) {
    append_window_debug_log(window, "taskbar-icon.log", message);
}

#[cfg(not(target_os = "windows"))]
fn append_taskbar_debug_log(_window: &Window, _message: &str) {}

#[cfg(target_os = "windows")]
#[allow(dead_code)]
fn window_icon_handles() -> &'static Mutex<HashMap<isize, WindowIconHandles>> {
    WINDOW_ICON_HANDLES.get_or_init(|| Mutex::new(HashMap::new()))
}

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

fn load_png_icon_data(bytes: &[u8]) -> Result<IconImageData, String> {
    let src = image::load_from_memory(bytes).map_err(|e| e.to_string())?;
    let rgba = src.to_rgba8();
    let (width, height) = rgba.dimensions();
    Ok((rgba.into_raw(), width, height))
}

fn icon_data_to_tauri_image((rgba, width, height): IconImageData) -> TauriImage<'static> {
    TauriImage::new_owned(rgba, width, height)
}

fn build_tinted_icon_data(color: (u8, u8, u8)) -> Result<IconImageData, String> {
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

    Ok((rgba, width, height))
}

#[cfg(target_os = "windows")]
#[allow(dead_code)]
fn create_hicon_from_rgba(rgba: &[u8], width: u32, height: u32) -> Result<isize, String> {
    use windows::Win32::UI::WindowsAndMessaging::{CreateIcon, HICON};

    if rgba.len() != (width as usize) * (height as usize) * 4 {
        return Err("Invalid RGBA size for icon".into());
    }

    let mut bgra = rgba.to_vec();
    let pixel_count = bgra.len() / 4;
    let mut and_mask = Vec::with_capacity(pixel_count);
    for pixel in bgra.chunks_exact_mut(4) {
        and_mask.push(pixel[3].wrapping_sub(u8::MAX));
        pixel.swap(0, 2);
    }

    let handle: HICON = unsafe {
        CreateIcon(
            None,
            width as i32,
            height as i32,
            1,
            32,
            and_mask.as_ptr(),
            bgra.as_ptr(),
        )
        .map_err(|error| error.to_string())?
    };

    Ok(handle.0 as isize)
}

#[cfg(target_os = "windows")]
#[allow(dead_code)]
fn resize_icon_rgba(rgba: &[u8], width: u32, height: u32, target_size: u32) -> Result<IconImageData, String> {
    let Some(src) = image::RgbaImage::from_raw(width, height, rgba.to_vec()) else {
        return Err("Failed to build source image for resize".into());
    };
    let resized = image::imageops::resize(
        &src,
        target_size,
        target_size,
        image::imageops::FilterType::Lanczos3,
    );
    let (next_width, next_height) = resized.dimensions();
    Ok((resized.into_raw(), next_width, next_height))
}

#[cfg(target_os = "windows")]
#[allow(dead_code)]
fn destroy_icon_handle(handle: isize) {
    use windows::Win32::UI::WindowsAndMessaging::{DestroyIcon, HICON};

    if handle == 0 {
        return;
    }

    let _ = unsafe { DestroyIcon(HICON(handle as *mut _)) };
}

#[cfg(target_os = "windows")]
#[allow(dead_code)]
fn apply_native_window_icons(window: &Window, rgba: &[u8], width: u32, height: u32) -> Result<(), String> {
    use windows::Win32::Foundation::{LPARAM, WPARAM};
    use windows::Win32::UI::WindowsAndMessaging::{
        SendMessageW, SetClassLongPtrW, GCLP_HICON, GCLP_HICONSM, ICON_BIG, ICON_SMALL, WM_SETICON,
    };

    let hwnd = window.hwnd().map_err(|error| error.to_string())?;
    let hwnd_key = hwnd.0 as isize;

    let big_handle = create_hicon_from_rgba(rgba, width, height)?;
    let (small_rgba, small_width, small_height) = resize_icon_rgba(rgba, width, height, 32)?;
    let small_handle = create_hicon_from_rgba(&small_rgba, small_width, small_height)?;

    unsafe {
        let _ = SendMessageW(
            hwnd,
            WM_SETICON,
            Some(WPARAM(ICON_BIG as usize)),
            Some(LPARAM(big_handle)),
        );
        let _ = SendMessageW(
            hwnd,
            WM_SETICON,
            Some(WPARAM(ICON_SMALL as usize)),
            Some(LPARAM(small_handle)),
        );
        let _ = SetClassLongPtrW(hwnd, GCLP_HICON, big_handle);
        let _ = SetClassLongPtrW(hwnd, GCLP_HICONSM, small_handle);
    }

    let previous = {
        let mut handles = window_icon_handles()
            .lock()
            .map_err(|_| "Taskbar icon handle map is poisoned".to_string())?;
        handles.insert(
            hwnd_key,
            WindowIconHandles {
                big: big_handle,
                small: small_handle,
            },
        )
    };

    if let Some(previous) = previous {
        if previous.big != big_handle {
            destroy_icon_handle(previous.big);
        }
        if previous.small != 0 && previous.small != small_handle && previous.small != previous.big {
            destroy_icon_handle(previous.small);
        }
    }

    Ok(())
}

fn set_taskbar_icon(args: &[Value], window: &Window) -> Result<Value, String> {
    let color_raw = args
        .first()
        .and_then(|value| value.get("color"))
        .and_then(|value| value.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    append_taskbar_debug_log(
        window,
        &format!("set_taskbar_icon requested color='{}'", color_raw),
    );

    let icon_data = match parse_hex_color(&color_raw) {
        Some(parsed_color) => build_tinted_icon_data(parsed_color)
            .or_else(|_| load_png_icon_data(DEFAULT_ICON_PNG))?,
        None => load_png_icon_data(DEFAULT_ICON_PNG)?,
    };

    if let Err(error) = window.set_icon(icon_data_to_tauri_image(icon_data)) {
        append_taskbar_debug_log(
            window,
            &format!("set_taskbar_icon failed: {}", error),
        );
        return Err(error.to_string());
    }
    append_taskbar_debug_log(window, "set_taskbar_icon success");

    Ok(json!({
        "success": true
    }))
}

fn parse_corner_radius_arg(args: &[Value]) -> i32 {
    let payload = args.first().cloned().unwrap_or(Value::Null);
    let raw_radius = payload
        .get("radius")
        .and_then(Value::as_f64)
        .or_else(|| payload.as_f64())
        .unwrap_or(0.0);
    raw_radius.round().clamp(0.0, 256.0) as i32
}

#[cfg(target_os = "windows")]
fn set_corner_radius(args: &[Value], window: &Window) -> Result<Value, String> {
    use windows::Win32::Graphics::Dwm::{
        DwmSetWindowAttribute, DWMWA_WINDOW_CORNER_PREFERENCE, DWMWCP_DONOTROUND,
        DWMWCP_ROUND, DWMWCP_ROUNDSMALL, DWM_WINDOW_CORNER_PREFERENCE,
    };

    let requested_radius = parse_corner_radius_arg(args);
    let is_maximized = window.is_maximized().map_err(|error| error.to_string())?;
    let hwnd = window.hwnd().map_err(|error| error.to_string())?;
    let preference: DWM_WINDOW_CORNER_PREFERENCE = if is_maximized || requested_radius <= 0 {
        DWMWCP_DONOTROUND
    } else if requested_radius <= 12 {
        DWMWCP_ROUNDSMALL
    } else {
        DWMWCP_ROUND
    };

    let native_applied = unsafe {
        DwmSetWindowAttribute(
            hwnd,
            DWMWA_WINDOW_CORNER_PREFERENCE,
            &preference as *const _ as *const _,
            std::mem::size_of::<DWM_WINDOW_CORNER_PREFERENCE>() as u32,
        )
    }
    .is_ok();

    Ok(json!({
        "success": true,
        "radius": requested_radius,
        "effectiveRadius": if is_maximized || requested_radius <= 0 { 0 } else { requested_radius },
        "maximized": is_maximized,
        "nativeApplied": native_applied
    }))
}

#[cfg(not(target_os = "windows"))]
fn set_corner_radius(args: &[Value], _window: &Window) -> Result<Value, String> {
    let requested_radius = parse_corner_radius_arg(args);
    Ok(json!({
        "success": true,
        "radius": requested_radius,
        "effectiveRadius": requested_radius,
        "maximized": false
    }))
}

fn debug_log(args: &[Value], window: &Window) -> Result<Value, String> {
    let payload = args.first().cloned().unwrap_or(Value::Null);
    let log_name = payload
        .get("log")
        .and_then(Value::as_str)
        .unwrap_or("window-startup.log");
    let message = payload
        .get("message")
        .and_then(Value::as_str)
        .unwrap_or("");
    if !message.trim().is_empty() {
        append_window_debug_log(window, log_name, message.trim());
    }
    Ok(json!({ "success": true }))
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
            if window.label() == "main" {
                let app_handle = window.app_handle();
                if crate::app_core::is_app_shutdown_requested() {
                    return Ok(json!({ "success": true, "closeRequested": true, "alreadyClosing": true }));
                }
                let _ = crate::app_core::invoke::community::close_community_windows(&app_handle);
                crate::app_core::request_app_shutdown(&app_handle);
                return Ok(json!({ "success": true, "closeRequested": true }));
            }
            window.close().map_err(|e| e.to_string())?;
            Ok(Value::Null)
        }
        "window:is-maximized" => {
            let is_max = window.is_maximized().map_err(|e| e.to_string())?;
            Ok(json!(is_max))
        }
        "window:set-corner-radius" => set_corner_radius(args, window),
        "window:debug-log" => debug_log(args, window),
        "window:set-taskbar-icon" => set_taskbar_icon(args, window),
        "app:renderer-ready" => {
            let _ = args;
            append_taskbar_debug_log(window, "app:renderer-ready");
            let app = window.app_handle();
            if let Some(splashscreen) = app.get_webview_window("splashscreen") {
                let _ = splashscreen.close();
            }
            if !should_keep_main_window_hidden() {
                if let Some(main_window_ref) = app.get_webview_window("main") {
                    let main_window: Window = main_window_ref.as_ref().window();
                    if let Ok(position) = main_window.outer_position() {
                        let _ = main_window.set_position(Position::Physical(position));
                    }
                    if let Ok(size) = main_window.outer_size() {
                        let _ = main_window.set_size(Size::Physical(size));
                    }
                    let _ = main_window.show();
                    let _ = main_window.set_focus();
                    let _ = main_window.is_maximized();
                    let _ = main_window.inner_size();
                    let _ = main_window.outer_size();
                    let _ = main_window.outer_position();
                } else {
                    append_taskbar_debug_log(window, "app:renderer-ready main window not found");
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
