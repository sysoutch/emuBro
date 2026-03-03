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

fn main() {
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
