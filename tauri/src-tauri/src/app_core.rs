use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::Window;

#[path = "bridge_extensions/mod.rs"]
mod bridge_extensions;
use bridge_extensions::*;

#[path = "app_core/invoke/mod.rs"]
mod invoke;

pub(crate) fn app_version_impl() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

pub(crate) fn emubro_invoke_impl(channel: String, args: Vec<Value>, window: Window) -> Result<Value, String> {
    invoke::emubro_invoke_impl(channel, args, window)
}
