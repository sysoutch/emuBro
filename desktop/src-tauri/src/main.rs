#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod app_core;
mod overlay_sidecar;
mod single_instance;

use serde_json::{json, Value};
use std::time::Duration;
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
        let trimmed = arg.trim();
        if let Some(value) = trimmed.strip_prefix("--launch-game=") {
            if let Ok(game_id) = value.trim().parse::<i64>() {
                if game_id > 0 {
                    return Some(game_id);
                }
            }
            continue;
        }

        if trimmed == "--launch-game" {
            if let Some(next) = args.peek() {
                if let Ok(game_id) = next.trim().parse::<i64>() {
                    if game_id > 0 {
                        return Some(game_id);
                    }
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
            if let Ok(resources_dir) = app.path().resource_dir() {
                if let Some(text) = resources_dir.to_str() {
                    std::env::set_var("EMUBRO_BUNDLE_RESOURCES_DIR", text);
                }
            }

            app_core::bootstrap_background_services();

            if let Some(main_window_ref) = app.get_webview_window("main") {
                let main_window: Window = main_window_ref.as_ref().window();
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
                if !app_core::should_keep_main_window_hidden() {
                    if let Some(main_window) = app_handle.get_webview_window("main") {
                        match main_window.is_visible() {
                            Ok(false) => {
                                let _ = main_window.show();
                                let _ = main_window.set_focus();
                            }
                            Ok(true) | Err(_) => {}
                        }
                    }
                }
                if let Some(splashscreen) = app_handle.get_webview_window("splashscreen") {
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
