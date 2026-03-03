#![allow(unused_imports)]

use rusqlite::{params, Connection, OptionalExtension};
use serde_json::{json, Value};
use std::collections::hash_map::DefaultHasher;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::hash::{Hash, Hasher};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};
use walkdir::WalkDir;
use zip::ZipArchive;

mod core;
mod covers;
mod locales;
mod migration;
mod memory_cards;
mod monitor;
mod remote;
mod suggestions;
mod system_tools;
mod youtube;

pub(crate) use core::*;
pub(crate) use migration::{
    clear_game_session_process,
    clear_game_session,
    game_session_process_ids,
    game_session_process_id,
    game_session_status_payload,
    has_active_game_session,
    set_game_session_from_launch,
};

pub(crate) fn handle_bridge_channel(channel: &str, args: &[Value]) -> Option<Result<Value, String>> {
    locales::handle(channel, args)
        .or_else(|| covers::handle(channel, args))
        .or_else(|| youtube::handle(channel, args))
        .or_else(|| monitor::handle(channel, args))
        .or_else(|| system_tools::handle(channel, args))
        .or_else(|| remote::handle(channel, args))
        .or_else(|| suggestions::handle(channel, args))
        .or_else(|| memory_cards::handle(channel, args))
        .or_else(|| migration::handle(channel, args))
}
