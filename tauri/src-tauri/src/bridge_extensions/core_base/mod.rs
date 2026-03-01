#![allow(dead_code)]

use rusqlite::{params, Connection, OptionalExtension};
use serde_json::{json, Value};
use std::collections::hash_map::DefaultHasher;
use std::fs;
use std::hash::{Hash, Hasher};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};
use walkdir::WalkDir;
use zip::ZipArchive;

mod basics;
mod state;
mod platforms;
mod dialogs_scan;
mod files;
mod launch;

pub(crate) use basics::*;
pub(crate) use state::*;
pub(crate) use platforms::*;
pub(crate) use dialogs_scan::*;
#[allow(unused_imports)]
pub(crate) use files::*;
#[allow(unused_imports)]
pub(crate) use launch::*;
