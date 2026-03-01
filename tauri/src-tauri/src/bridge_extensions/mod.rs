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
mod suggestions;
mod youtube;

pub(crate) use core::*;
pub(crate) use migration::set_game_session_from_launch;

pub(crate) fn handle_bridge_channel(channel: &str, args: &[Value]) -> Option<Result<Value, String>> {
    locales::handle(channel, args)
        .or_else(|| covers::handle(channel, args))
        .or_else(|| youtube::handle(channel, args))
        .or_else(|| suggestions::handle(channel, args))
        .or_else(|| memory_cards::handle(channel, args))
        .or_else(|| migration::handle(channel, args))
}
