use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::Window;

#[path = "bridge_extensions/mod.rs"]
mod bridge_extensions;
use bridge_extensions::*;

#[path = "app_core/invoke/mod.rs"]
mod invoke;

static START_HIDDEN_FOR_GAME_LAUNCH: AtomicBool = AtomicBool::new(false);

pub(crate) fn app_version_impl() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

pub(crate) fn set_start_hidden_for_game_launch(value: bool) {
    START_HIDDEN_FOR_GAME_LAUNCH.store(value, Ordering::SeqCst);
}

pub(crate) fn should_keep_main_window_hidden() -> bool {
    START_HIDDEN_FOR_GAME_LAUNCH.load(Ordering::SeqCst)
}

pub(crate) fn bootstrap_background_services() {
    bridge_extensions::bootstrap_background_services();
}

pub(crate) fn emubro_invoke_impl(channel: String, args: Vec<Value>, window: Window) -> Result<Value, String> {
    invoke::emubro_invoke_impl(channel, args, window)
}
