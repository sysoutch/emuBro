use super::*;

macro_rules! try_or_some_err {
    ($expr:expr) => {
        match $expr {
            Ok(value) => value,
            Err(error) => return Some(Err(error)),
        }
    };
}

pub(crate) fn handle(channel: &str, args: &[Value]) -> Option<Result<Value, String>> {
    let result = match channel {
        "tools:ecm:get-download-info" => Ok(json!({
            "success": true,
            "repoUrl": ECM_REPO_URL,
            "sourceZipUrl": ECM_SOURCE_ZIP_URL,
            "defaultFileName": ECM_DEFAULT_FILE_NAME,
            "license": "GPL-2.0-or-later",
            "note": "Downloaded as a separate external tool archive."
        })),
        "tools:ecm:download-source-zip" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let mut destination_path = payload
                .get("destinationPath")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if destination_path.is_empty() {
                let default_base = user_home_dir()
                    .map(|home| home.join("Downloads"))
                    .unwrap_or_else(managed_data_root);
                try_or_some_err!(ensure_directory(&default_base));
                destination_path = default_base
                    .join(ECM_DEFAULT_FILE_NAME)
                    .to_string_lossy()
                    .to_string();
            }
            if !destination_path.to_lowercase().ends_with(".zip") {
                destination_path.push_str(".zip");
            }
            let destination = PathBuf::from(&destination_path);
            match download_url_to_file(ECM_SOURCE_ZIP_URL, &destination) {
                Ok(size_bytes) => Ok(json!({
                    "success": true,
                    "canceled": false,
                    "filePath": destination_path,
                    "sizeBytes": size_bytes,
                    "sourceUrl": ECM_SOURCE_ZIP_URL,
                    "repoUrl": ECM_REPO_URL
                })),
                Err(err) => Ok(json!({
                    "success": false,
                    "canceled": false,
                    "message": err
                })),
            }
        }
        "tools:ecm:detect-build-env" => Ok(json!({
            "success": true,
            "environment": detect_ecm_build_environment()
        })),
        "tools:ecm:get-compiler-install-options" => {
            let environment = detect_ecm_build_environment();
            let options = environment
                .get("compilerInstallOptions")
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default();
            let recommended = environment
                .get("recommendedCompilerInstaller")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            Ok(json!({
                "success": true,
                "platform": environment.get("platform").and_then(|v| v.as_str()).unwrap_or(std::env::consts::OS),
                "options": options,
                "recommendedOptionId": recommended,
                "environment": environment
            }))
        }
        "tools:ecm:install-compiler" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let option_id = payload
                .get("optionId")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if option_id.is_empty() {
                return Some(Ok(json!({ "success": false, "message": "Missing compiler install option id." })));
            }
            let environment_before = detect_ecm_build_environment();
            let options = environment_before
                .get("compilerInstallOptions")
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default();
            let selected = options.into_iter().find(|row| {
                row.get("id")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .trim()
                    == option_id
            });
            let Some(selected_option) = selected else {
                return Some(Ok(json!({ "success": false, "message": "Unknown compiler install option." })));
            };
            let action = selected_option
                .get("action")
                .and_then(|v| v.as_str())
                .unwrap_or("command")
                .trim()
                .to_lowercase();
            if action != "command" {
                return Some(Ok(json!({
                    "success": false,
                    "message": "Selected option is not a direct command install.",
                    "option": selected_option
                })));
            }
            let install_command = selected_option
                .get("command")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if install_command.is_empty() {
                return Some(Ok(json!({
                    "success": false,
                    "message": "Install command missing for selected option.",
                    "option": selected_option
                })));
            }
            let result = run_shell_command_detailed(&install_command);
            let ok = result.get("ok").and_then(|v| v.as_bool()).unwrap_or(false);
            if !ok {
                let stderr = result
                    .get("stderr")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let error = result
                    .get("error")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let message = if !stderr.trim().is_empty() {
                    stderr.clone()
                } else if !error.trim().is_empty() {
                    error.clone()
                } else {
                    "Compiler install command failed.".to_string()
                };
                return Some(Ok(json!({
                    "success": false,
                    "message": message,
                    "option": selected_option,
                    "command": install_command,
                    "stdout": result.get("stdout").cloned().unwrap_or(Value::String(String::new())),
                    "stderr": if stderr.is_empty() { error } else { stderr },
                    "status": result.get("status").cloned().unwrap_or(Value::Number((-1).into())),
                    "needsManual": should_suggest_manual_terminal(&message),
                    "terminalOpened": false
                })));
            }
            let environment_after = detect_ecm_build_environment();
            let target_compiler = selected_option
                .get("compiler")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_lowercase();
            let compiler_detected = if target_compiler.is_empty() {
                !environment_after
                    .get("recommendedCompiler")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .trim()
                    .is_empty()
            } else {
                environment_after
                    .get("compilers")
                    .and_then(|v| v.as_array())
                    .cloned()
                    .unwrap_or_default()
                    .into_iter()
                    .any(|row| {
                        row.get("name")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .trim()
                            .eq_ignore_ascii_case(&target_compiler)
                            && row.get("available").and_then(|v| v.as_bool()).unwrap_or(false)
                    })
            };
            Ok(json!({
                "success": true,
                "message": if compiler_detected {
                    "Compiler installation finished and compiler was detected."
                } else {
                    "Install command finished. Compiler detection may require reopening shell/session."
                },
                "option": selected_option,
                "command": install_command,
                "stdout": result.get("stdout").cloned().unwrap_or(Value::String(String::new())),
                "stderr": result.get("stderr").cloned().unwrap_or(Value::String(String::new())),
                "status": result.get("status").cloned().unwrap_or(Value::Number(0.into())),
                "compilerDetected": compiler_detected,
                "environment": environment_after
            }))
        }
        "tools:ecm:build-binaries" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let source_path_raw = payload
                .get("sourcePath")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if source_path_raw.is_empty() {
                return Some(Ok(json!({ "success": false, "message": "Missing source path. Select a source folder or ZIP first." })));
            }
            let source_path = PathBuf::from(&source_path_raw);
            if !source_path.exists() {
                return Some(Ok(json!({ "success": false, "message": "Source path does not exist." })));
            }

            let mut extracted_from_zip = false;
            let mut extracted_dir = PathBuf::new();
            let source_dir = if source_path.is_dir() {
                find_source_dir_with_ecm_files(&source_path, 6)
            } else if source_path.is_file()
                && source_path
                    .extension()
                    .and_then(|v| v.to_str())
                    .unwrap_or("")
                    .eq_ignore_ascii_case("zip")
            {
                extracted_from_zip = true;
                extracted_dir = ecm_root_dir()
                    .join("source")
                    .join(format!("{}-{}", SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0), random_hex_token(3)));
                try_or_some_err!(ensure_directory(&extracted_dir));
                match extract_archive_to_dir(&source_path, &extracted_dir) {
                    Ok(_) => find_source_dir_with_ecm_files(&extracted_dir, 8),
                    Err(err) => {
                        return Some(Ok(json!({
                            "success": false,
                            "message": err
                        })));
                    }
                }
            } else {
                return Some(Ok(json!({ "success": false, "message": "Source path must be a folder or .zip archive." })));
            };

            let Some(source_dir) = source_dir else {
                return Some(Ok(json!({ "success": false, "message": "Could not locate ecm.c and unecm.c in source path." })));
            };

            let environment = detect_ecm_build_environment();
            let requested_compiler = payload
                .get("compiler")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            let compiler = if requested_compiler.is_empty() {
                environment
                    .get("recommendedCompiler")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .trim()
                    .to_string()
            } else {
                requested_compiler
            };
            if compiler.is_empty() {
                return Some(Ok(json!({
                    "success": false,
                    "message": "No C compiler found (gcc/clang/cc). Install a compiler and try again.",
                    "environment": environment
                })));
            }

            let output_dir_raw = payload
                .get("outputDir")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            let output_dir = if output_dir_raw.is_empty() {
                ecm_root_dir()
                    .join("bin")
                    .join(format!("{}-{}", std::env::consts::OS, std::env::consts::ARCH))
            } else {
                PathBuf::from(output_dir_raw)
            };
            try_or_some_err!(ensure_directory(&output_dir));

            let build_results = vec![
                compile_ecm_source(&compiler, &source_dir, &output_dir, "ecm"),
                compile_ecm_source(&compiler, &source_dir, &output_dir, "unecm"),
            ];
            let failed = build_results.iter().find(|row| {
                !row.get("ok").and_then(|v| v.as_bool()).unwrap_or(false)
            });
            if let Some(failure) = failed {
                let message = failure
                    .get("stderr")
                    .and_then(|v| v.as_str())
                    .filter(|v| !v.trim().is_empty())
                    .unwrap_or_else(|| {
                        failure
                            .get("error")
                            .and_then(|v| v.as_str())
                            .unwrap_or("Failed to compile ECM/UNECM binaries.")
                    })
                    .to_string();
                return Some(Ok(json!({
                    "success": false,
                    "message": message,
                    "compiler": compiler,
                    "sourceDir": source_dir.to_string_lossy().to_string(),
                    "outputDir": output_dir.to_string_lossy().to_string(),
                    "extractedFromZip": extracted_from_zip,
                    "extractedDir": extracted_dir.to_string_lossy().to_string(),
                    "buildResults": build_results
                })));
            }
            let binaries = build_results
                .iter()
                .filter_map(|row| row.get("target").and_then(|v| v.as_str()))
                .filter(|path| Path::new(path).exists())
                .map(|path| Value::String(path.to_string()))
                .collect::<Vec<Value>>();
            Ok(json!({
                "success": true,
                "compiler": compiler,
                "sourceDir": source_dir.to_string_lossy().to_string(),
                "outputDir": output_dir.to_string_lossy().to_string(),
                "extractedFromZip": extracted_from_zip,
                "extractedDir": extracted_dir.to_string_lossy().to_string(),
                "binaries": binaries,
                "buildResults": build_results,
                "environment": environment
            }))
        }
        _ => return None,
    };
    Some(result)
}
