#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod app_core;

use serde_json::Value;
use tauri::Window;

#[tauri::command]
fn app_version() -> String {
    app_core::app_version_impl()
}

#[tauri::command]
fn emubro_invoke(channel: String, args: Vec<Value>, window: Window) -> Result<Value, String> {
    app_core::emubro_invoke_impl(channel, args, window)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![app_version, emubro_invoke])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
