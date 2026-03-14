#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod app_core;
mod overlay_sidecar;
mod single_instance;

use serde_json::{json, Value};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::time::Duration;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{Manager, Window};

#[tauri::command]
fn app_version() -> String {
    app_core::app_version_impl()
}

#[tauri::command]
fn emubro_invoke(channel: String, args: Vec<Value>, window: Window) -> Result<Value, String> {
    app_core::emubro_invoke_impl(channel, args, window)
}

fn parse_startup_launch_game_arg() -> Option<i64> {
    let mut args = std::env::args().skip(1).peekable();
    while let Some(arg) = args.next() {
        let trimmed = arg.trim().trim_matches(|ch| ch == '"' || ch == '\'');
        if let Some(game_id) = app_core::resolve_launch_game_id_from_arg(trimmed) {
            return Some(game_id);
        }

        if trimmed.eq_ignore_ascii_case("--launch-game") {
            if let Some(next) = args.peek() {
                if let Some(game_id) = app_core::resolve_launch_game_id_from_arg(next.trim()) {
                    return Some(game_id);
                }
            }
        }
    }
    None
}

#[cfg(target_os = "linux")]
fn log_linux_graphics_env() {
    const KEYS: [&str; 10] = [
        "DISPLAY",
        "WAYLAND_DISPLAY",
        "XDG_SESSION_TYPE",
        "XDG_CURRENT_DESKTOP",
        "DESKTOP_SESSION",
        "GDK_BACKEND",
        "WEBKIT_DISABLE_COMPOSITING_MODE",
        "WEBKIT_DISABLE_DMABUF_RENDERER",
        "LIBGL_ALWAYS_SOFTWARE",
        "MESA_LOADER_DRIVER_OVERRIDE",
    ];

    for key in KEYS {
        match std::env::var(key) {
            Ok(value) if !value.trim().is_empty() => {
                eprintln!("[linux-graphics] env {}={}", key, value);
            }
            _ => {
                eprintln!("[linux-graphics] env {}=<unset>", key);
            }
        }
    }
}

#[cfg(target_os = "linux")]
fn configure_linux_webkit_env() {
    let has_x11_display = std::env::var_os("DISPLAY").is_some();
    let has_wayland_display = std::env::var_os("WAYLAND_DISPLAY").is_some();

    log_linux_graphics_env();

    if has_x11_display && std::env::var_os("GDK_BACKEND").is_none() {
        std::env::set_var("GDK_BACKEND", "x11");
        eprintln!(
            "[linux-graphics] GDK_BACKEND=x11 (prefer X11/XWayland on Linux when EGL display creation fails)"
        );
    }

    const DEFAULTS: [(&str, &str, &str); 2] = [
        (
            "WEBKIT_DISABLE_COMPOSITING_MODE",
            "1",
            "disable accelerated compositing to avoid EGL initialization failures",
        ),
        (
            "WEBKIT_DISABLE_DMABUF_RENDERER",
            "1",
            "disable DMA-BUF renderer on Linux drivers that fail during WebKit startup",
        ),
    ];

    for (key, value, reason) in DEFAULTS {
        if std::env::var_os(key).is_some() {
            continue;
        }
        std::env::set_var(key, value);
        eprintln!("[linux-graphics] {}={} ({})", key, value, reason);
    }

    // On some handheld Linux environments (Wayland/Gamescope + AMD/Mesa),
    // WebKitGTK still fails EGL initialization even after compositing is disabled.
    if has_wayland_display && std::env::var_os("LIBGL_ALWAYS_SOFTWARE").is_none() {
        std::env::set_var("LIBGL_ALWAYS_SOFTWARE", "1");
        eprintln!(
            "[linux-graphics] LIBGL_ALWAYS_SOFTWARE=1 (force software GL fallback for EGL startup failures on Wayland/XWayland)"
        );
    }
}

#[cfg(not(target_os = "linux"))]
fn configure_linux_webkit_env() {}

fn should_force_decorated_window() -> bool {
    let env_flag = std::env::var("EMUBRO_DEBUG_DECORATED")
        .ok()
        .map(|value| matches!(value.trim().to_lowercase().as_str(), "1" | "true" | "yes" | "on"))
        .unwrap_or(false);
    if env_flag {
        return true;
    }

    std::env::args().any(|arg| {
        let trimmed = arg.trim().to_lowercase();
        trimmed == "--debug-decorated-window" || trimmed == "--decorated-window"
    })
}

fn should_show_main_window_early() -> bool {
    let env_flag = std::env::var("EMUBRO_DEBUG_SHOW_MAIN_EARLY")
        .ok()
        .map(|value| matches!(value.trim().to_lowercase().as_str(), "1" | "true" | "yes" | "on"))
        .unwrap_or(false);
    if env_flag {
        return true;
    }

    std::env::args().any(|arg| {
        let trimmed = arg.trim().to_lowercase();
        trimmed == "--debug-show-main-early" || trimmed == "--show-main-early"
    })
}

fn append_startup_debug_log(app_handle: &tauri::AppHandle, message: &str) {
    let app_data_dir = match app_handle.path().app_data_dir() {
        Ok(path) => path,
        Err(_) => return,
    };
    let log_dir = app_data_dir.join("logs");
    if fs::create_dir_all(&log_dir).is_err() {
        return;
    }
    let log_path = log_dir.join("window-startup.log");
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(log_path) {
        let _ = writeln!(file, "[{}] {}", ts, message);
    }
}

fn attach_main_window_debug_logging(main_window: Window) {
    let app_handle = main_window.app_handle().clone();
    append_startup_debug_log(&app_handle, "main-window listener attached");
    std::thread::spawn(move || {
        let mut last_position: Option<(i32, i32)> = None;
        let mut last_size: Option<(u32, u32)> = None;
        let mut last_focus: Option<bool> = None;
        let mut move_count = 0usize;
        let mut resize_count = 0usize;
        let mut focus_count = 0usize;

        for _ in 0..400 {
            if let Some(window) = app_handle.get_webview_window("main") {
                if let Ok(position) = window.outer_position() {
                    let next = (position.x, position.y);
                    if last_position != Some(next) {
                        last_position = Some(next);
                        move_count += 1;
                        if move_count <= 8 {
                            append_startup_debug_log(
                                &app_handle,
                                &format!("native moved #{} x={} y={}", move_count, next.0, next.1),
                            );
                        }
                    }
                }

                if let Ok(size) = window.outer_size() {
                    let next = (size.width, size.height);
                    if last_size != Some(next) {
                        last_size = Some(next);
                        resize_count += 1;
                        if resize_count <= 8 {
                            append_startup_debug_log(
                                &app_handle,
                                &format!("native resized #{} w={} h={}", resize_count, next.0, next.1),
                            );
                        }
                    }
                }

                if let Ok(focused) = window.is_focused() {
                    if last_focus != Some(focused) {
                        last_focus = Some(focused);
                        focus_count += 1;
                        if focus_count <= 6 {
                            append_startup_debug_log(
                                &app_handle,
                                &format!("native focused #{} focused={}", focus_count, focused),
                            );
                        }
                    }
                }
            }
            std::thread::sleep(Duration::from_millis(20));
        }
    });
}

fn main() {
    configure_linux_webkit_env();

    if overlay_sidecar::maybe_run_from_args() {
        return;
    }

    let startup_launch_game_id = parse_startup_launch_game_arg();
    if single_instance::forward_to_existing_instance(startup_launch_game_id) {
        return;
    }
    app_core::set_start_hidden_for_game_launch(startup_launch_game_id.is_some());

    tauri::Builder::default()
        .setup(move |app| {
            append_startup_debug_log(&app.handle().clone(), "setup start");
            if let Ok(resources_dir) = app.path().resource_dir() {
                if let Some(text) = resources_dir.to_str() {
                    std::env::set_var("EMUBRO_BUNDLE_RESOURCES_DIR", text);
                }
            }

            app_core::bootstrap_background_services();

            if let Some(main_window_ref) = app.get_webview_window("main") {
                let main_window: Window = main_window_ref.as_ref().window();
                attach_main_window_debug_logging(main_window.clone());
                append_startup_debug_log(&app.handle().clone(), "setup main window found");
                if should_force_decorated_window() {
                    append_startup_debug_log(&app.handle().clone(), "forcing decorated main window for debug");
                    let _ = main_window.set_decorations(true);
                }
                if should_show_main_window_early() && !app_core::should_keep_main_window_hidden() {
                    append_startup_debug_log(&app.handle().clone(), "showing main window early for debug");
                    let _ = main_window.show();
                }
                let _ = app_core::emubro_invoke_impl(
                    "window:set-taskbar-icon".to_string(),
                    vec![json!({ "color": "#2f9ec0" })],
                    main_window,
                );
            }

            if let Err(error) = single_instance::spawn_listener(app.handle().clone()) {
                eprintln!("[single-instance] {}", error);
            }

            if startup_launch_game_id.is_some() {
                if let Some(splashscreen) = app.get_webview_window("splashscreen") {
                    let _ = splashscreen.close();
                }
            }

            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                std::thread::sleep(Duration::from_secs(20));
                append_startup_debug_log(&app_handle, "watchdog wake after 20s");
                if !app_core::should_keep_main_window_hidden() {
                    if let Some(main_window) = app_handle.get_webview_window("main") {
                        match main_window.is_visible() {
                            Ok(false) => {
                                append_startup_debug_log(&app_handle, "watchdog showing main window");
                                let _ = main_window.show();
                                let _ = main_window.set_focus();
                            }
                            Ok(true) | Err(_) => {}
                        }
                    }
                }
                if let Some(splashscreen) = app_handle.get_webview_window("splashscreen") {
                    append_startup_debug_log(&app_handle, "watchdog closing splashscreen");
                    let _ = splashscreen.close();
                }
            });

            if let Some(game_id) = startup_launch_game_id {
                if let Some(window) = app.get_webview_window("main") {
                    let main_window: Window = window.as_ref().window();
                    let _ = app_core::emubro_invoke_impl(
                        "launch-game".to_string(),
                        vec![json!({ "gameId": game_id })],
                        main_window,
                    );
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![app_version, emubro_invoke])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
