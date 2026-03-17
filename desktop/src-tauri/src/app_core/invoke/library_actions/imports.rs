use super::*;
use regex::Regex;
use serde_json::json;
use std::io::Read;

pub(super) fn handle(ch: &str, args: &[Value], _window: &Window) -> Result<Value, String> {
    match ch {
        "analyze-import-paths" => {
            let input_paths = args
                .get(0)
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default();
            let rows = input_paths
                .iter()
                .filter_map(|v| v.as_str())
                .map(classify_import_media)
                .collect::<Vec<Value>>();
            let requires_decision = rows.iter().any(|row| {
                let category = row
                    .get("mediaCategory")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_lowercase();
                category == "removable" || category == "network" || category == "cdrom"
            });
            Ok(json!({
                "success": true,
                "paths": rows,
                "requiresDecision": requires_decision
            }))
        }
        "stage-import-paths" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let mode = payload
                .get("mode")
                .and_then(|v| v.as_str())
                .unwrap_or("keep")
                .trim()
                .to_lowercase();
            if mode != "keep" && mode != "copy" && mode != "move" {
                return Ok(json!({ "success": false, "message": "Invalid staging mode", "paths": [], "skipped": [] }));
            }
            let input_paths = payload
                .get("paths")
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default()
                .into_iter()
                .filter_map(|v| v.as_str().map(|s| s.trim().to_string()))
                .filter(|s| !s.is_empty())
                .collect::<Vec<String>>();

            if mode == "keep" {
                return Ok(json!({
                    "success": true,
                    "mode": "keep",
                    "paths": input_paths,
                    "skipped": []
                }));
            }

            let target_dir = payload
                .get("targetDir")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if target_dir.is_empty() {
                return Ok(json!({ "success": false, "message": "Missing destination folder", "paths": [], "skipped": [] }));
            }
            let target_dir_path = PathBuf::from(&target_dir);
            fs::create_dir_all(&target_dir_path).map_err(|e| e.to_string())?;

            let mut staged = Vec::<Value>::new();
            let mut skipped = Vec::<Value>::new();
            for source in input_paths {
                let src = PathBuf::from(&source);
                if !src.exists() {
                    skipped.push(json!({ "path": source, "reason": "not_found" }));
                    continue;
                }
                let base_name = src
                    .file_name()
                    .and_then(|v| v.to_str())
                    .unwrap_or("item")
                    .to_string();
                let requested_dest = target_dir_path.join(base_name);
                let final_dest = ensure_unique_destination_path(&requested_dest);
                let move_res = if mode == "move" {
                    move_path_safe(&src, &final_dest)
                } else {
                    copy_path_recursive(&src, &final_dest)
                };
                match move_res {
                    Ok(_) => staged.push(Value::String(final_dest.to_string_lossy().to_string())),
                    Err(err) => skipped.push(json!({
                        "path": source,
                        "reason": "stage_failed",
                        "message": err
                    })),
                }
            }

            Ok(json!({
                "success": true,
                "mode": mode,
                "paths": staged,
                "skipped": skipped
            }))
        }
        "detect-emulator-exe" => {
            let input_path = args
                .get(0)
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if input_path.is_empty() {
                return Ok(json!({ "success": false, "message": "Missing path" }));
            }
            let platforms = load_platform_configs();
            let (matched, platform_short_name, platform_name) = detect_emulator_platform(&input_path, &platforms);
            let already_added = read_state_array("emulators")
                .iter()
                .filter_map(|row| row.get("filePath").and_then(|v| v.as_str()))
                .any(|row| row.eq_ignore_ascii_case(&input_path));
            Ok(json!({
                "success": true,
                "matched": matched,
                "emulatorAlreadyAdded": already_added,
                "platformShortName": platform_short_name,
                "platformName": platform_name
            }))
        }
        "import-exe" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let source_path = payload
                .get("path")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if source_path.is_empty() {
                return Ok(json!({ "success": false, "message": "Missing .exe path" }));
            }
            let source = PathBuf::from(&source_path);
            if !source.exists() || !source.is_file() {
                return Ok(json!({ "success": false, "message": "Path is not a file" }));
            }

            let add_emulator = payload.get("addEmulator").and_then(|v| v.as_bool()).unwrap_or(false);
            let add_game = payload.get("addGame").and_then(|v| v.as_bool()).unwrap_or(false);
            let requested_emu_psn = normalize_platform_short_name(
                payload
                    .get("emulatorPlatformShortName")
                    .and_then(|v| v.as_str())
                    .unwrap_or(""),
            );
            let requested_game_psn = normalize_platform_short_name(
                payload
                    .get("gamePlatformShortName")
                    .and_then(|v| v.as_str())
                    .unwrap_or("pc"),
            );

            let platforms = load_platform_configs();
            let mut games = read_state_array("games");
            let mut emulators = read_state_array("emulators");
            let mut game_seen = games
                .iter()
                .filter_map(|row| row.get("filePath").and_then(|v| v.as_str()))
                .map(path_key)
                .collect::<std::collections::HashSet<String>>();
            let mut emu_seen = emulators
                .iter()
                .filter_map(|row| row.get("filePath").and_then(|v| v.as_str()))
                .map(path_key)
                .collect::<std::collections::HashSet<String>>();
            let next_game_id = next_numeric_id(&games);
            let next_emu_id = next_numeric_id(&emulators);

            let mut added_emulator = Value::Null;
            let mut added_game = Value::Null;
            let mut skipped = Vec::<Value>::new();
            let mut errors = Vec::<Value>::new();
            let mut touched_games = false;
            let mut touched_emulators = false;

            if add_emulator {
                let mut psn = requested_emu_psn.clone();
                let mut pname = find_platform_name(&platforms, &psn);
                if psn.is_empty() {
                    let (matched, det_psn, det_pname) = detect_emulator_platform(&source_path, &platforms);
                    if matched {
                        psn = det_psn;
                        pname = det_pname;
                    }
                }
                if psn.is_empty() {
                    errors.push(json!({ "path": source_path, "message": "Emulator platform is required" }));
                } else {
                    let key = path_key(&source_path);
                    if emu_seen.insert(key) {
                        let row = make_emulator_row(next_emu_id, &source_path, &psn);
                        if let Some(obj) = row.as_object() {
                            let mut with_platform = obj.clone();
                            with_platform.insert("platform".to_string(), Value::String(pname));
                            let value = Value::Object(with_platform);
                            emulators.push(value.clone());
                            added_emulator = value;
                        } else {
                            emulators.push(row.clone());
                            added_emulator = row;
                        }
                        touched_emulators = true;
                    } else {
                        skipped.push(json!({ "path": source_path, "reason": "emu_exists" }));
                    }
                }
            }

            if add_game {
                let psn = if requested_game_psn.is_empty() {
                    "pc".to_string()
                } else {
                    requested_game_psn.clone()
                };
                let pname = find_platform_name(&platforms, &psn);
                let key = path_key(&source_path);
                if game_seen.insert(key) {
                    let row = make_game_row(next_game_id, &source_path, &psn, &pname);
                    games.push(row.clone());
                    added_game = row;
                    touched_games = true;
                } else {
                    skipped.push(json!({ "path": source_path, "reason": "game_exists" }));
                }
            }

            if touched_games {
                write_state_array("games", games)?;
            }
            if touched_emulators {
                write_state_array("emulators", emulators)?;
            }

            Ok(json!({
                "success": true,
                "addedEmulator": added_emulator,
                "addedGame": added_game,
                "skipped": skipped,
                "errors": errors
            }))
        }
        "import-files-as-platform" => {
            let input_paths = args
                .get(0)
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default();
            let psn = normalize_platform_short_name(
                args.get(1).and_then(|v| v.as_str()).unwrap_or(""),
            );
            if psn.is_empty() {
                return Ok(json!({ "success": false, "message": "Missing platformShortName" }));
            }
            let options = args.get(2).cloned().unwrap_or_else(|| json!({}));
            let code_overrides = options
                .get("codeOverrides")
                .and_then(|v| v.as_object())
                .cloned()
                .unwrap_or_default();
            let platforms = load_platform_configs();
            let platform_name = find_platform_name(&platforms, &psn);
            let mut games = read_state_array("games");
            let mut game_seen = games
                .iter()
                .filter_map(|row| row.get("filePath").and_then(|v| v.as_str()))
                .map(path_key)
                .collect::<std::collections::HashSet<String>>();
            let mut next_game_id = next_numeric_id(&games);
            let mut added_games = Vec::<Value>::new();
            let mut skipped = Vec::<Value>::new();
            let mut errors = Vec::<Value>::new();

            for raw in input_paths {
                let source_path = raw.as_str().unwrap_or("").trim().to_string();
                if source_path.is_empty() {
                    continue;
                }
                let source = PathBuf::from(&source_path);
                if !source.exists() || !source.is_file() {
                    skipped.push(json!({ "path": source_path, "reason": "not_a_file" }));
                    continue;
                }
                let key = path_key(&source_path);
                if !game_seen.insert(key) {
                    skipped.push(json!({ "path": source_path, "reason": "game_exists" }));
                    continue;
                }
                let mut row = make_game_row(next_game_id, &source_path, &psn, &platform_name);
                if let Some(code_value) = code_overrides.get(&source_path) {
                    if let Some(code_text) = code_value.as_str() {
                        let trimmed = code_text.trim();
                        if !trimmed.is_empty() {
                            if let Some(obj) = row.as_object_mut() {
                                obj.insert("code".to_string(), Value::String(trimmed.to_string()));
                            }
                        }
                    }
                }
                next_game_id += 1;
                games.push(row.clone());
                added_games.push(row);
            }

            if !added_games.is_empty() {
                if let Err(err) = write_state_array("games", games) {
                    errors.push(json!({ "message": err }));
                }
            }

            Ok(json!({
                "success": errors.is_empty(),
                "addedGames": added_games,
                "skipped": skipped,
                "errors": errors,
                "warnings": []
            }))
        }
        "import-paths" => {
            let input_paths = args
                .get(0)
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default();
            let options = args.get(1).cloned().unwrap_or_else(|| json!({}));
            let recursive = options
                .get("recursive")
                .and_then(|v| v.as_bool())
                .unwrap_or(true);
            let archive_modes = options
                .get("archiveImportModes")
                .and_then(|v| v.as_object())
                .cloned()
                .unwrap_or_default();
            let archive_modes_lookup = archive_modes
                .iter()
                .filter_map(|(k, v)| {
                    let mode = v.as_str().unwrap_or("").trim().to_lowercase();
                    if mode.is_empty() {
                        return None;
                    }
                    Some((path_key(k), mode))
                })
                .collect::<std::collections::HashMap<String, String>>();

            let platforms = load_platform_configs();
            let ext_map = extension_platform_map(&platforms);
            let emu_exts = emulator_extensions();
            let archive_exts = archive_extensions();

            let mut games = read_state_array("games");
            let mut emulators = read_state_array("emulators");
            let mut game_seen = games
                .iter()
                .filter_map(|row| row.get("filePath").and_then(|v| v.as_str()))
                .map(path_key)
                .collect::<std::collections::HashSet<String>>();
            let mut emu_seen = emulators
                .iter()
                .filter_map(|row| row.get("filePath").and_then(|v| v.as_str()))
                .map(path_key)
                .collect::<std::collections::HashSet<String>>();
            let mut next_game_id = next_numeric_id(&games);
            let mut next_emu_id = next_numeric_id(&emulators);

            let mut added_games = Vec::<Value>::new();
            let mut added_emulators = Vec::<Value>::new();
            let mut skipped = Vec::<Value>::new();
            let errors = Vec::<Value>::new();
            let mut warnings = Vec::<Value>::new();
            let mut dirty_games = false;
            let mut dirty_emulators = false;

            for raw in input_paths {
                let source_path = raw.as_str().unwrap_or("").trim().to_string();
                if source_path.is_empty() {
                    continue;
                }
                let source = PathBuf::from(&source_path);
                if !source.exists() {
                    skipped.push(json!({ "path": source_path, "reason": "not_found" }));
                    continue;
                }
                if source.is_dir() {
                    let scan_options = json!({ "scope": "both", "recursive": recursive, "maxDepth": if recursive { 20 } else { 0 } });
                    let scan_res = scan_and_import_games_and_emulators(&source_path, Some(&scan_options))?;
                    let scan_games = scan_res
                        .get("games")
                        .and_then(|v| v.as_array())
                        .cloned()
                        .unwrap_or_default();
                    let scan_emus = scan_res
                        .get("emulators")
                        .and_then(|v| v.as_array())
                        .cloned()
                        .unwrap_or_default();
                    if scan_games.is_empty() && scan_emus.is_empty() {
                        skipped.push(json!({ "path": source_path, "reason": "no_matches" }));
                    }
                    added_games.extend(scan_games);
                    added_emulators.extend(scan_emus);
                    games = read_state_array("games");
                    emulators = read_state_array("emulators");
                    game_seen = games
                        .iter()
                        .filter_map(|row| row.get("filePath").and_then(|v| v.as_str()))
                        .map(path_key)
                        .collect::<std::collections::HashSet<String>>();
                    emu_seen = emulators
                        .iter()
                        .filter_map(|row| row.get("filePath").and_then(|v| v.as_str()))
                        .map(path_key)
                        .collect::<std::collections::HashSet<String>>();
                    next_game_id = next_numeric_id(&games);
                    next_emu_id = next_numeric_id(&emulators);
                    continue;
                }
                if !source.is_file() {
                    skipped.push(json!({ "path": source_path, "reason": "not_a_file" }));
                    continue;
                }

                let ext = normalize_extension(source.extension().and_then(|v| v.to_str()).unwrap_or(""));
                if ext.is_empty() {
                    skipped.push(json!({ "path": source_path, "reason": "unmatched" }));
                    continue;
                }

                if emu_exts.contains(&ext) {
                    let (matched, psn, _pname) = detect_emulator_platform(&source_path, &platforms);
                    let key = path_key(&source_path);
                    if emu_seen.insert(key) {
                        let row = make_emulator_row(next_emu_id, &source_path, if matched { &psn } else { "" });
                        next_emu_id += 1;
                        emulators.push(row.clone());
                        added_emulators.push(row);
                        dirty_emulators = true;
                    } else {
                        skipped.push(json!({ "path": source_path, "reason": "emu_exists_or_unmatched" }));
                    }
                    continue;
                }

                if archive_exts.contains(&ext) {
                    let default_mode = if ext == ".iso" || ext == ".ciso" { "direct" } else { "extract" };
                    let mode = archive_modes_lookup
                        .get(&path_key(&source_path))
                        .map(|v| v.as_str())
                        .unwrap_or(default_mode)
                        .trim()
                        .to_lowercase();
                    if mode == "skip" {
                        skipped.push(json!({ "path": source_path, "reason": "archive_skipped_by_user" }));
                        continue;
                    }
                    if mode == "direct" {
                        if let Some(platform) = ext_map.get(&ext) {
                            let psn = normalize_platform_short_name(
                                platform.get("shortName").and_then(|v| v.as_str()).unwrap_or(""),
                            );
                            let pname = platform.get("name").and_then(|v| v.as_str()).unwrap_or("Unknown").to_string();
                            let key = path_key(&source_path);
                            if game_seen.insert(key) {
                                let row = make_game_row(next_game_id, &source_path, &psn, &pname);
                                next_game_id += 1;
                                games.push(row.clone());
                                added_games.push(row);
                                dirty_games = true;
                            } else {
                                skipped.push(json!({ "path": source_path, "reason": "game_exists" }));
                            }
                        } else {
                            skipped.push(json!({ "path": source_path, "reason": "unmatched" }));
                        }
                        continue;
                    }
                    let destination = build_archive_extraction_directory(&source);
                    let fallback_destination = std::env::current_dir()
                        .unwrap_or_else(|_| PathBuf::from("."))
                        .join(".emubro-imports")
                        .join(format!(
                            "{}_{}",
                            source.file_stem().and_then(|v| v.to_str()).unwrap_or("archive"),
                            system_unix_timestamp_string()
                        ));
                    let mut extracted_dir = destination.clone();
                    let extraction_result = match extract_archive_to_dir(&source, &destination) {
                        Ok(_) => Ok(()),
                        Err(_) => {
                            extracted_dir = fallback_destination.clone();
                            extract_archive_to_dir(&source, &fallback_destination)
                        }
                    };
                    match extraction_result {
                        Ok(_) => {
                            let scan_options = json!({ "scope": "both", "recursive": true, "maxDepth": 30 });
                            let scan_res = scan_and_import_games_and_emulators(
                                extracted_dir.to_string_lossy().as_ref(),
                                Some(&scan_options),
                            )?;
                            let scan_games = scan_res
                                .get("games")
                                .and_then(|v| v.as_array())
                                .cloned()
                                .unwrap_or_default();
                            let scan_emus = scan_res
                                .get("emulators")
                                .and_then(|v| v.as_array())
                                .cloned()
                                .unwrap_or_default();
                            if scan_games.is_empty() && scan_emus.is_empty() {
                                skipped.push(json!({ "path": source_path, "reason": "no_matches" }));
                            } else {
                                warnings.push(json!({
                                    "path": source_path,
                                    "reason": "archive_extracted",
                                    "message": format!("Archive extracted to {}", extracted_dir.to_string_lossy())
                                }));
                            }
                            added_games.extend(scan_games);
                            added_emulators.extend(scan_emus);
                            games = read_state_array("games");
                            emulators = read_state_array("emulators");
                            game_seen = games
                                .iter()
                                .filter_map(|row| row.get("filePath").and_then(|v| v.as_str()))
                                .map(path_key)
                                .collect::<std::collections::HashSet<String>>();
                            emu_seen = emulators
                                .iter()
                                .filter_map(|row| row.get("filePath").and_then(|v| v.as_str()))
                                .map(path_key)
                                .collect::<std::collections::HashSet<String>>();
                            next_game_id = next_numeric_id(&games);
                            next_emu_id = next_numeric_id(&emulators);
                        }
                        Err(err) => {
                            skipped.push(json!({
                                "path": source_path,
                                "reason": "archive_extract_failed",
                                "message": err
                            }));
                        }
                    }
                    continue;
                }

                if let Some(platform) = ext_map.get(&ext) {
                    let psn = normalize_platform_short_name(
                        platform.get("shortName").and_then(|v| v.as_str()).unwrap_or(""),
                    );
                    let pname = platform.get("name").and_then(|v| v.as_str()).unwrap_or("Unknown").to_string();
                    let key = path_key(&source_path);
                    if game_seen.insert(key) {
                        let row = make_game_row(next_game_id, &source_path, &psn, &pname);
                        next_game_id += 1;
                        games.push(row.clone());
                        added_games.push(row);
                        dirty_games = true;
                    } else {
                        skipped.push(json!({ "path": source_path, "reason": "game_exists" }));
                    }
                } else {
                    skipped.push(json!({ "path": source_path, "reason": "unmatched" }));
                }
            }

            if dirty_games {
                write_state_array("games", games)?;
            }
            if dirty_emulators {
                write_state_array("emulators", emulators)?;
            }

            Ok(json!({
                "success": true,
                "addedGames": added_games,
                "addedEmulators": added_emulators,
                "skipped": skipped,
                "errors": errors,
                "warnings": warnings
            }))
        }
        "cue:inspect-bin-files" => {
            let input_paths = read_path_list_arg(args.get(0));
            let mut results = Vec::<Value>::new();
            for source_path in input_paths {
                let source = PathBuf::from(&source_path);
                let is_bin = source
                    .extension()
                    .and_then(|v| v.to_str())
                    .map(|v| v.eq_ignore_ascii_case("bin"))
                    .unwrap_or(false);
                if !is_bin {
                    results.push(json!({
                        "binPath": source_path,
                        "hasCue": false,
                        "cuePath": "",
                        "message": "Not a BIN file"
                    }));
                    continue;
                }
                let cue_path = find_cue_for_bin(&source);
                results.push(json!({
                    "binPath": source_path,
                    "hasCue": cue_path.is_some(),
                    "cuePath": cue_path.map(|p| p.to_string_lossy().to_string()).unwrap_or_default()
                }));
            }
            Ok(json!({
                "success": true,
                "results": results
            }))
        }
        "cue:generate-for-bin" => {
            let input_paths = read_path_list_arg(args.get(0));
            let mut generated = Vec::<Value>::new();
            let mut existing = Vec::<Value>::new();
            let mut failed = Vec::<Value>::new();

            for source_path in input_paths {
                let source = PathBuf::from(&source_path);
                if !source.exists() || !source.is_file() {
                    failed.push(json!({
                        "binPath": source_path,
                        "message": "BIN file does not exist."
                    }));
                    continue;
                }
                let is_bin = source
                    .extension()
                    .and_then(|v| v.to_str())
                    .map(|v| v.eq_ignore_ascii_case("bin"))
                    .unwrap_or(false);
                if !is_bin {
                    failed.push(json!({
                        "binPath": source_path,
                        "message": "Path is not a BIN file."
                    }));
                    continue;
                }
                if let Some(cue_path) = find_cue_for_bin(&source) {
                    existing.push(json!({
                        "binPath": source_path,
                        "cuePath": cue_path.to_string_lossy().to_string()
                    }));
                    continue;
                }

                let cue_path = source.with_extension("cue");
                let cue_content = build_cue_content_for_bin(&source);
                match fs::write(&cue_path, cue_content) {
                    Ok(_) => generated.push(json!({
                        "binPath": source_path,
                        "cuePath": cue_path.to_string_lossy().to_string()
                    })),
                    Err(err) => failed.push(json!({
                        "binPath": source_path,
                        "message": err.to_string()
                    })),
                }
            }

            Ok(json!({
                "success": true,
                "generated": generated,
                "existing": existing,
                "failed": failed
            }))
        }
        "import:analyze-archives" => {
            let input_paths = read_path_list_arg(args.get(0));
            let platform_rows = load_platform_configs();
            let mut archives = Vec::<Value>::new();
            let mut seen = std::collections::HashSet::<String>::new();
            for source_path in input_paths {
                let key = path_key(&source_path);
                if !seen.insert(key) {
                    continue;
                }
                let source = PathBuf::from(&source_path);
                let ext = normalize_extension(source.extension().and_then(|v| v.to_str()).unwrap_or(""));
                if ext.is_empty() {
                    continue;
                }
                let kind = archive_kind_for_extension(&ext);
                if kind.is_empty() {
                    continue;
                }
                let matched_platform = platform_rows
                    .iter()
                    .find(|row| platform_matches_extension(row, &ext))
                    .cloned();
                let platform_short = matched_platform
                    .as_ref()
                    .and_then(|row| row.get("shortName"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .trim()
                    .to_lowercase();
                let platform_name = matched_platform
                    .as_ref()
                    .and_then(|row| row.get("name"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .trim()
                    .to_string();
                let direct_emulators = matched_platform
                    .as_ref()
                    .map(|row| direct_archive_emulators_for_extension(row, &ext))
                    .unwrap_or_default();
                let direct_supported = matched_platform
                    .as_ref()
                    .map(|row| {
                        platform_supports_archive_extension(row, &ext)
                            && !direct_emulators.is_empty()
                    })
                    .unwrap_or(false);
                archives.push(json!({
                    "path": source_path,
                    "extension": ext,
                    "archiveKind": kind,
                    "platformShortName": platform_short,
                    "platformName": platform_name,
                    "directArchiveSupported": direct_supported,
                    "directArchiveEmulators": direct_emulators,
                    "recommendedMode": if direct_supported { "ask" } else { "extract" }
                }));
            }

            Ok(json!({
                "success": true,
                "archives": archives
            }))
        }
        "iso:detect-game-codes" => {
            let input_paths = read_path_list_arg(args.get(0));
            let options = args.get(1).cloned().unwrap_or_else(|| json!({}));
            let read_iso = options
                .get("readIso")
                .and_then(|v| v.as_bool())
                .unwrap_or(true);
            let platform_short = normalize_platform_short_name(
                options
                    .get("platformShortName")
                    .and_then(|v| v.as_str())
                    .unwrap_or(""),
            );
            let gamelist_map = if platform_short.is_empty() {
                std::collections::HashMap::new()
            } else {
                load_gamelist_map(&platform_short)
            };
            let code_regex = Regex::new(
                r"(?i)\b([A-Z]{4})[-_ ]?(\d{3})[.\-_ ]?(\d{2})\b|\b([A-Z]{4})[-_ ]?(\d{5})\b",
            )
            .map_err(|e| e.to_string())?;
            let mut codes_by_path = serde_json::Map::new();
            for source_path in input_paths {
                let mut code = String::new();
                if let Some(found) = extract_code_from_filename(&source_path, &code_regex) {
                    code = found;
                }
                if code.is_empty() && read_iso {
                    if let Some(found) = scan_disc_image_for_code(&source_path, &code_regex) {
                        code = found;
                    }
                }
                if code.is_empty() && !gamelist_map.is_empty() {
                    if let Some(found) = lookup_gamelist_code(&source_path, &gamelist_map) {
                        code = found;
                    }
                }
                codes_by_path.insert(source_path, Value::String(code));
            }
            Ok(json!({
                "success": true,
                "codesByPath": Value::Object(codes_by_path)
            }))
        }
        "browse-games-and-emus" => {
            let scan_target = args.get(0).and_then(|v| v.as_str()).unwrap_or("");
            scan_and_import_games_and_emulators(scan_target, args.get(1))
        }
        _ => Ok(json!({ "success": false, "message": format!("Unsupported imports channel: {}", ch) })),
    }
}

fn strip_bracketed_segments(value: &str) -> String {
    let mut out = String::new();
    let mut depth = 0i32;
    for ch in value.chars() {
        match ch {
            '(' | '[' | '{' => {
                depth += 1;
            }
            ')' | ']' | '}' => {
                if depth > 0 {
                    depth -= 1;
                }
            }
            _ => {
                if depth == 0 {
                    out.push(ch);
                }
            }
        }
    }
    out
}

fn normalize_match_key(value: &str) -> String {
    let stripped = strip_bracketed_segments(value);
    let mut out = String::new();
    for ch in stripped.chars() {
        if ch.is_ascii_alphanumeric() {
            out.push(ch.to_ascii_lowercase());
        }
    }
    out
}

fn load_gamelist_map(platform_short_name: &str) -> std::collections::HashMap<String, String> {
    let mut out = std::collections::HashMap::new();
    let psn = normalize_platform_short_name(platform_short_name);
    if psn.is_empty() {
        return out;
    }
    let Some(dir) = find_gamelist_dir() else {
        return out;
    };
    let path = dir.join(format!("{}.json", psn));
    let Ok(text) = fs::read_to_string(&path) else {
        return out;
    };
    let Ok(Value::Array(entries)) = serde_json::from_str::<Value>(&text) else {
        return out;
    };
    for entry in entries {
        let name = entry
            .get("game_name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim();
        let code = entry
            .get("game_gameCode")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim();
        if name.is_empty() || code.is_empty() {
            continue;
        }
        let key = normalize_match_key(name);
        if key.is_empty() {
            continue;
        }
        out.entry(key).or_insert_with(|| code.to_string());
    }
    out
}

fn lookup_gamelist_code(
    source_path: &str,
    gamelist_map: &std::collections::HashMap<String, String>,
) -> Option<String> {
    let stem = Path::new(source_path)
        .file_stem()
        .and_then(|v| v.to_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let key = normalize_match_key(&stem);
    if key.is_empty() {
        return None;
    }
    if let Some(code) = gamelist_map.get(&key) {
        return Some(code.clone());
    }

    let mut best: Option<(usize, String)> = None;
    for (name_key, code) in gamelist_map {
        if name_key.is_empty() {
            continue;
        }
        if name_key.contains(&key) || key.contains(name_key) {
            let score = name_key.len().min(key.len());
            match &best {
                Some((best_score, _)) if *best_score >= score => {}
                _ => best = Some((score, code.clone())),
            }
        }
    }
    best.map(|(_, code)| code)
}

fn extract_code_from_text(text: &str, regex: &Regex) -> Option<String> {
    let caps = regex.captures(text)?;
    if let (Some(prefix), Some(a), Some(b)) = (caps.get(1), caps.get(2), caps.get(3)) {
        return Some(format!(
            "{}-{}{}",
            prefix.as_str().to_uppercase(),
            a.as_str(),
            b.as_str()
        ));
    }
    if let (Some(prefix), Some(num)) = (caps.get(4), caps.get(5)) {
        return Some(format!(
            "{}-{}",
            prefix.as_str().to_uppercase(),
            num.as_str()
        ));
    }
    None
}

fn extract_code_from_filename(path: &str, regex: &Regex) -> Option<String> {
    let stem = Path::new(path)
        .file_stem()
        .and_then(|v| v.to_str())
        .unwrap_or("")
        .trim();
    if stem.is_empty() {
        return None;
    }
    extract_code_from_text(stem, regex)
}

fn scan_disc_image_for_code(path: &str, regex: &Regex) -> Option<String> {
    let source = PathBuf::from(path);
    if !source.exists() || !source.is_file() {
        return None;
    }
    let ext = normalize_extension(source.extension().and_then(|v| v.to_str()).unwrap_or(""));
    if ext != ".iso" && ext != ".bin" && ext != ".ciso" {
        return None;
    }

    let file = fs::File::open(&source).ok()?;
    let mut reader = std::io::BufReader::new(file);
    let mut buffer = vec![0u8; 1024 * 1024];
    let mut tail = String::new();

    loop {
        let read = reader.read(&mut buffer).ok()?;
        if read == 0 {
            break;
        }
        let chunk = String::from_utf8_lossy(&buffer[..read]);
        let combined = if tail.is_empty() {
            chunk.to_string()
        } else {
            format!("{}{}", tail, chunk)
        };
        if let Some(code) = extract_code_from_text(&combined, regex) {
            return Some(code);
        }
        tail = combined.chars().rev().take(64).collect::<String>().chars().rev().collect();
    }

    None
}
