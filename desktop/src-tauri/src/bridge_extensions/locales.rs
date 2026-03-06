use super::*;
use base64::engine::general_purpose::STANDARD as BASE64_STANDARD;
use base64::Engine as _;
use std::io::Read;

const DEFAULT_MANIFEST_URL: &str =
    "https://raw.githubusercontent.com/sysoutch/emubro-locales/master/manifest.json";
const MANIFEST_KEY: &str = "locales:repo-manifest-url:v1";

fn is_locale_code(code: &str) -> bool {
    let c = code.trim().to_lowercase();
    let len = c.len();
    (len == 2 || len == 3) && c.chars().all(|ch| ch.is_ascii_lowercase())
}

fn is_locale_filename(filename: &str) -> bool {
    let f = filename.trim().to_lowercase();
    f.ends_with(".json") && is_locale_code(f.trim_end_matches(".json"))
}

fn normalize_locale_filename(filename: &str) -> Result<String, String> {
    let f = filename.trim().to_lowercase();
    if !is_locale_filename(&f) {
        return Err(format!(
            "Invalid locale filename '{}'. Expected e.g. en.json",
            filename
        ));
    }
    Ok(f)
}

fn is_flag_code(code: &str) -> bool {
    let c = code.trim().to_lowercase();
    c.len() == 2 && c.chars().all(|ch| ch.is_ascii_lowercase())
}

fn app_locales_dir() -> Option<PathBuf> {
    find_locales_dir()
}

fn user_locales_dir() -> PathBuf {
    let dir = managed_data_root().join("locales");
    let _ = ensure_directory(&dir);
    dir
}

fn user_flags_dir() -> PathBuf {
    let dir = user_locales_dir().join("flags");
    let _ = ensure_directory(&dir);
    dir
}

fn parse_locale_json(text: &str) -> Result<Value, String> {
    let sanitized = text
        .trim_start_matches('\u{feff}')
        .trim_start_matches("\u{00EF}\u{00BB}\u{00BF}");
    serde_json::from_str::<Value>(sanitized).map_err(|e| e.to_string())
}

fn read_locale_json(path: &Path) -> Result<Value, String> {
    let text = fs::read_to_string(path).map_err(|e| e.to_string())?;
    parse_locale_json(&text)
}

fn list_locale_paths() -> Vec<(String, PathBuf, String)> {
    let mut map = HashMap::<String, (PathBuf, String)>::new();
    if let Some(dir) = app_locales_dir() {
        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if !path.is_file() {
                    continue;
                }
                let filename = path
                    .file_name()
                    .and_then(|v| v.to_str())
                    .unwrap_or("")
                    .trim()
                    .to_lowercase();
                if !is_locale_filename(&filename) {
                    continue;
                }
                map.insert(filename, (path, "app".to_string()));
            }
        }
    }
    if let Ok(entries) = fs::read_dir(user_locales_dir()) {
        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_file() {
                continue;
            }
            let filename = path
                .file_name()
                .and_then(|v| v.to_str())
                .unwrap_or("")
                .trim()
                .to_lowercase();
            if !is_locale_filename(&filename) {
                continue;
            }
            map.insert(filename, (path, "user".to_string()));
        }
    }
    let mut rows = map
        .into_iter()
        .map(|(filename, (path, source))| (filename, path, source))
        .collect::<Vec<(String, PathBuf, String)>>();
    rows.sort_by(|a, b| a.0.cmp(&b.0));
    rows
}

fn app_locale_path(filename: &str) -> Option<PathBuf> {
    let normalized = normalize_locale_filename(filename).ok()?;
    let dir = app_locales_dir()?;
    let path = dir.join(normalized);
    if path.exists() && path.is_file() {
        Some(path)
    } else {
        None
    }
}

fn embedded_english_locale() -> Option<Value> {
    parse_locale_json(include_str!("../../../../locales/en.json")).ok()
}

fn locale_code_from_data(data: &Value, filename: &str) -> String {
    data
        .as_object()
        .and_then(|obj| obj.keys().next().cloned())
        .unwrap_or_else(|| filename.trim_end_matches(".json").to_string())
}

fn read_locale_json_with_fallback(filename: &str, full_path: &Path, source: &str) -> Option<(Value, String)> {
    if let Ok(parsed) = read_locale_json(full_path) {
        return Some((parsed, source.to_string()));
    }

    if source == "user" {
        if let Some(app_path) = app_locale_path(filename) {
            if let Ok(parsed) = read_locale_json(&app_path) {
                return Some((parsed, "app".to_string()));
            }
        }
    }

    None
}

fn ensure_english_translation(out: &mut serde_json::Map<String, Value>) {
    if out.contains_key("en") {
        return;
    }
    let Some(parsed) = embedded_english_locale() else {
        return;
    };
    let Some(obj) = parsed.as_object() else {
        return;
    };
    if let Some(value) = obj.get("en") {
        out.insert("en".to_string(), value.clone());
    }
}

fn get_manifest_url() -> String {
    let raw = read_state_value_or_default(MANIFEST_KEY, Value::String(DEFAULT_MANIFEST_URL.to_string()));
    let value = raw.as_str().unwrap_or(DEFAULT_MANIFEST_URL).trim();
    if value.is_empty() {
        DEFAULT_MANIFEST_URL.to_string()
    } else {
        value.to_string()
    }
}

fn set_manifest_url(url: &str) -> Result<String, String> {
    let trimmed = url.trim();
    let value = if trimmed.is_empty() {
        DEFAULT_MANIFEST_URL.to_string()
    } else {
        let lower = trimmed.to_lowercase();
        if !lower.starts_with("http://") && !lower.starts_with("https://") {
            return Err("Manifest URL must start with http:// or https://".to_string());
        }
        trimmed.to_string()
    };
    write_state_value(MANIFEST_KEY, &Value::String(value.clone()))?;
    Ok(value)
}

fn http_get_text(url: &str) -> Result<String, String> {
    let response = ureq::get(url.trim())
        .set("Cache-Control", "no-cache")
        .set("Pragma", "no-cache")
        .call()
        .map_err(|e| e.to_string())?;
    response.into_string().map_err(|e| e.to_string())
}

fn http_get_json(url: &str) -> Result<Value, String> {
    let text = http_get_text(url)?;
    serde_json::from_str::<Value>(&text).map_err(|e| e.to_string())
}

fn http_get_bytes(url: &str) -> Result<Vec<u8>, String> {
    let response = ureq::get(url.trim()).call().map_err(|e| e.to_string())?;
    let mut reader = response.into_reader();
    let mut out = Vec::<u8>::new();
    reader.read_to_end(&mut out).map_err(|e| e.to_string())?;
    Ok(out)
}

fn fetch_catalog(manifest_url: &str) -> Result<Value, String> {
    let manifest = if manifest_url.trim().is_empty() {
        get_manifest_url()
    } else {
        manifest_url.trim().to_string()
    };
    let raw = http_get_json(&manifest)?;
    let mut packages = Vec::<Value>::new();
    for entry in raw
        .get("packages")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default()
    {
        let code = entry
            .get("code")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_lowercase();
        let locale_url = entry
            .get("localeUrl")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if !is_locale_code(&code) || locale_url.is_empty() {
            continue;
        }
        packages.push(json!({
            "code": code,
            "name": entry.get("name").and_then(|v| v.as_str()).unwrap_or(""),
            "abbreviation": entry.get("abbreviation").and_then(|v| v.as_str()).unwrap_or(""),
            "flag": entry.get("flag").and_then(|v| v.as_str()).unwrap_or("us"),
            "localeUrl": locale_url,
            "flagUrl": entry.get("flagUrl").and_then(|v| v.as_str()).unwrap_or("")
        }));
    }
    Ok(json!({
        "manifestUrl": manifest,
        "name": raw.get("name").and_then(|v| v.as_str()).unwrap_or("emuBro Locales"),
        "version": raw.get("version").and_then(|v| v.as_str()).unwrap_or("1"),
        "packages": packages
    }))
}

fn read_all_translations() -> Value {
    let mut out = serde_json::Map::new();
    for (filename, full_path, source) in list_locale_paths() {
        let Some((parsed, _effective_source)) = read_locale_json_with_fallback(&filename, &full_path, &source) else {
            continue;
        };
        let Some(obj) = parsed.as_object() else {
            continue;
        };
        for (key, value) in obj {
            out.insert(key.clone(), value.clone());
        }
    }
    ensure_english_translation(&mut out);
    Value::Object(out)
}

pub(crate) fn handle(channel: &str, args: &[Value]) -> Option<Result<Value, String>> {
    let result = match channel {
        "get-all-translations" => Ok(read_all_translations()),
        "locales:list" => {
            let mut rows = Vec::<Value>::new();
            for (filename, full_path, source) in list_locale_paths() {
                let Some((data, effective_source)) =
                    read_locale_json_with_fallback(&filename, &full_path, &source)
                else {
                    continue;
                };
                let code = locale_code_from_data(&data, &filename);
                rows.push(json!({
                    "filename": filename,
                    "code": code,
                    "data": data,
                    "source": effective_source,
                    "canDelete": effective_source == "user",
                    "canRename": effective_source == "user"
                }));
            }
            let has_english = rows.iter().any(|row| {
                row.get("code")
                    .and_then(|v| v.as_str())
                    .map(|s| s.trim().eq_ignore_ascii_case("en"))
                    .unwrap_or(false)
            });
            if !has_english {
                if let Some(data) = embedded_english_locale() {
                    rows.push(json!({
                        "filename": "en.json",
                        "code": locale_code_from_data(&data, "en.json"),
                        "data": data,
                        "source": "app",
                        "canDelete": false,
                        "canRename": false
                    }));
                }
            }
            Ok(Value::Array(rows))
        }
        "locales:read" => {
            let filename = args.get(0).and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
            let normalized = match normalize_locale_filename(&filename) {
                Ok(value) => value,
                Err(_) => return Some(Ok(json!({}))),
            };
            let user_path = user_locales_dir().join(&normalized);
            if user_path.exists() && user_path.is_file() {
                return Some(Ok(read_locale_json(&user_path).unwrap_or_else(|_| json!({}))));
            }
            if let Some(dir) = app_locales_dir() {
                let app_path = dir.join(&normalized);
                if app_path.exists() && app_path.is_file() {
                    return Some(Ok(read_locale_json(&app_path).unwrap_or_else(|_| json!({}))));
                }
            }
            Ok(json!({}))
        }
        "locales:exists" => {
            let filename = args.get(0).and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
            let normalized = match normalize_locale_filename(&filename) {
                Ok(value) => value,
                Err(_) => return Some(Ok(json!(false))),
            };
            let user_exists = user_locales_dir().join(&normalized).exists();
            let app_exists = app_locales_dir()
                .map(|dir| dir.join(&normalized).exists())
                .unwrap_or(false);
            Ok(json!(user_exists || app_exists))
        }
        "locales:write" => {
            let filename = args.get(0).and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
            let payload = args.get(1).cloned().unwrap_or_else(|| json!({}));
            let normalized = match normalize_locale_filename(&filename) {
                Ok(value) => value,
                Err(error) => return Some(Err(error)),
            };
            if !payload.is_object() {
                return Some(Err("Invalid locale payload (expected object)".to_string()));
            }
            let text = match serde_json::to_string_pretty(&payload) {
                Ok(value) => value,
                Err(error) => return Some(Err(error.to_string())),
            };
            if let Err(error) = fs::write(user_locales_dir().join(normalized), text) {
                return Some(Err(error.to_string()));
            }
            Ok(json!({ "success": true }))
        }
        "locales:delete" => {
            let filename = args.get(0).and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
            let normalized = match normalize_locale_filename(&filename) {
                Ok(value) => value,
                Err(error) => return Some(Ok(json!({ "success": false, "message": error }))),
            };
            if normalized == "en.json" {
                return Some(Ok(json!({ "success": false, "message": "English locale cannot be deleted." })));
            }
            let path = user_locales_dir().join(&normalized);
            if !path.exists() || !path.is_file() {
                return Some(Ok(json!({
                    "success": false,
                    "message": "Only user-installed locales can be deleted."
                })));
            }
            match fs::remove_file(path) {
                Ok(_) => Ok(json!({ "success": true })),
                Err(error) => Ok(json!({ "success": false, "message": error.to_string() })),
            }
        }
        "locales:rename" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let old_filename = payload
                .get("oldFilename")
                .or_else(|| payload.get("filename"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            let old_normalized = match normalize_locale_filename(&old_filename) {
                Ok(value) => value,
                Err(error) => return Some(Ok(json!({ "success": false, "message": error }))),
            };
            if old_normalized == "en.json" {
                return Some(Ok(json!({ "success": false, "message": "English locale cannot be renamed." })));
            }
            let old_path = user_locales_dir().join(&old_normalized);
            if !old_path.exists() || !old_path.is_file() {
                return Some(Ok(json!({ "success": false, "message": "Only user-installed locales can be renamed." })));
            }

            let next_code = payload
                .get("newCode")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_lowercase();
            if !is_locale_code(&next_code) {
                return Some(Ok(json!({ "success": false, "message": "Invalid language code. Use 2-3 letters." })));
            }
            let next_filename = format!("{}.json", next_code);
            let next_path = user_locales_dir().join(&next_filename);
            if next_path != old_path && next_path.exists() {
                return Some(Ok(json!({ "success": false, "message": format!("Locale '{}' already exists.", next_filename) })));
            }

            let old_json = read_locale_json(&old_path).unwrap_or_else(|_| json!({}));
            let mut old_lang = old_json
                .as_object()
                .and_then(|obj| obj.values().next().cloned())
                .unwrap_or_else(|| json!({}));
            if !old_lang.is_object() {
                old_lang = json!({});
            }
            let next_name = payload
                .get("newName")
                .and_then(|v| v.as_str())
                .unwrap_or(&next_code)
                .trim()
                .to_string();
            let next_abbrev = payload
                .get("newAbbreviation")
                .and_then(|v| v.as_str())
                .unwrap_or(&next_code.to_uppercase())
                .trim()
                .to_string();
            let next_flag = payload
                .get("newFlag")
                .and_then(|v| v.as_str())
                .unwrap_or("us")
                .trim()
                .to_lowercase();
            let final_flag = if is_flag_code(&next_flag) { next_flag } else { "us".to_string() };
            if let Some(obj) = old_lang.as_object_mut() {
                let mut language = obj.remove("language").unwrap_or_else(|| json!({}));
                if !language.is_object() {
                    language = json!({});
                }
                if let Some(lang_obj) = language.as_object_mut() {
                    lang_obj.insert("name".to_string(), Value::String(next_name));
                    lang_obj.insert("abbreviation".to_string(), Value::String(next_abbrev));
                    lang_obj.insert("flag".to_string(), Value::String(final_flag));
                }
                obj.insert("language".to_string(), language);
            }
            let next_json = json!({ next_code.clone(): old_lang });
            let text = match serde_json::to_string_pretty(&next_json) {
                Ok(value) => value,
                Err(error) => return Some(Err(error.to_string())),
            };
            if let Err(error) = fs::write(&next_path, text) {
                return Some(Err(error.to_string()));
            }
            if next_path != old_path {
                let _ = fs::remove_file(old_path);
            }
            Ok(json!({ "success": true, "filename": next_filename, "code": next_code, "data": next_json }))
        }
        "locales:flags:get-data-url" => {
            let flag = args.get(0).and_then(|v| v.as_str()).unwrap_or("").trim().to_lowercase();
            if !is_flag_code(&flag) {
                return Some(Ok(json!({ "success": false, "message": "Invalid flag code", "dataUrl": "" })));
            }
            let path = user_flags_dir().join(format!("{}.svg", flag));
            if !path.exists() || !path.is_file() {
                return Some(Ok(json!({ "success": false, "message": "Flag not found", "dataUrl": "" })));
            }
            match fs::read(path) {
                Ok(bytes) => Ok(json!({ "success": true, "dataUrl": format!("data:image/svg+xml;base64,{}", BASE64_STANDARD.encode(bytes)) })),
                Err(error) => Ok(json!({ "success": false, "message": error.to_string(), "dataUrl": "" })),
            }
        }
        "locales:flags:write-data-url" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let flag = payload.get("flagCode").and_then(|v| v.as_str()).unwrap_or("").trim().to_lowercase();
            let data_url = payload.get("dataUrl").and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
            if !is_flag_code(&flag) {
                return Some(Ok(json!({ "success": false, "message": "Invalid flag code" })));
            }
            let prefix = "data:image/svg+xml;base64,";
            if !data_url.to_lowercase().starts_with(prefix) {
                return Some(Ok(json!({ "success": false, "message": "Only SVG data URLs are supported." })));
            }
            let decoded = match BASE64_STANDARD.decode(&data_url[prefix.len()..]) {
                Ok(value) => value,
                Err(error) => return Some(Ok(json!({ "success": false, "message": error.to_string() }))),
            };
            match fs::write(user_flags_dir().join(format!("{}.svg", flag)), decoded) {
                Ok(_) => Ok(json!({ "success": true })),
                Err(error) => Ok(json!({ "success": false, "message": error.to_string() })),
            }
        }
        "locales:flags:write-from-file" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let flag = payload.get("flagCode").and_then(|v| v.as_str()).unwrap_or("").trim().to_lowercase();
            let source_path = payload.get("filePath").and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
            if !is_flag_code(&flag) {
                return Some(Ok(json!({ "success": false, "message": "Invalid flag code" })));
            }
            let source = PathBuf::from(&source_path);
            if !source.exists() || !source.is_file() {
                return Some(Ok(json!({ "success": false, "message": "Source file not found." })));
            }
            if source.extension().and_then(|v| v.to_str()).unwrap_or("").to_lowercase() != "svg" {
                return Some(Ok(json!({ "success": false, "message": "Only SVG files are supported." })));
            }
            match fs::read(&source) {
                Ok(bytes) => match fs::write(user_flags_dir().join(format!("{}.svg", flag)), bytes) {
                    Ok(_) => Ok(json!({ "success": true })),
                    Err(error) => Ok(json!({ "success": false, "message": error.to_string() })),
                },
                Err(error) => Ok(json!({ "success": false, "message": error.to_string() })),
            }
        }
        "locales:repo:get-config" => Ok(json!({ "success": true, "manifestUrl": get_manifest_url() })),
        "locales:repo:set-config" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let next = payload
                .get("manifestUrl")
                .or_else(|| payload.get("url"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            match set_manifest_url(next) {
                Ok(url) => Ok(json!({ "success": true, "manifestUrl": url })),
                Err(error) => Ok(json!({ "success": false, "message": error })),
            }
        }
        "locales:repo:fetch-catalog" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let requested = payload
                .get("manifestUrl")
                .or_else(|| payload.get("url"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            match fetch_catalog(requested) {
                Ok(catalog) => {
                    let mut obj = serde_json::Map::new();
                    obj.insert("success".to_string(), Value::Bool(true));
                    if let Some(cat_obj) = catalog.as_object() {
                        for (k, v) in cat_obj {
                            obj.insert(k.clone(), v.clone());
                        }
                    }
                    Ok(Value::Object(obj))
                }
                Err(error) => Ok(json!({ "success": false, "message": error, "manifestUrl": requested })),
            }
        }
        "locales:repo:install" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let requested = payload
                .get("manifestUrl")
                .or_else(|| payload.get("url"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let catalog = match fetch_catalog(requested) {
                Ok(value) => value,
                Err(error) => return Some(Ok(json!({ "success": false, "message": error, "installed": [], "failed": [] }))),
            };
            let requested_codes = payload
                .get("codes")
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default()
                .into_iter()
                .filter_map(|v| v.as_str().map(|s| s.trim().to_lowercase()))
                .filter(|code| is_locale_code(code))
                .collect::<HashSet<String>>();
            let mut installed = Vec::<Value>::new();
            let mut failed = Vec::<Value>::new();
            let packages = catalog
                .get("packages")
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default();
            for pkg in packages {
                let code = pkg.get("code").and_then(|v| v.as_str()).unwrap_or("").trim().to_lowercase();
                if !requested_codes.is_empty() && !requested_codes.contains(&code) {
                    continue;
                }
                let locale_url = pkg.get("localeUrl").and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
                if !is_locale_code(&code) || locale_url.is_empty() {
                    failed.push(json!({ "code": code, "message": "Invalid catalog entry." }));
                    continue;
                }
                let locale_json = match http_get_json(&locale_url) {
                    Ok(value) => value,
                    Err(error) => {
                        failed.push(json!({ "code": code, "message": error }));
                        continue;
                    }
                };
                let locale_payload = if locale_json.get(&code).is_some() {
                    locale_json
                } else {
                    json!({ code.clone(): locale_json })
                };
                let locale_path = user_locales_dir().join(format!("{}.json", code));
                let text = match serde_json::to_string_pretty(&locale_payload) {
                    Ok(value) => value,
                    Err(error) => {
                        failed.push(json!({ "code": code, "message": error.to_string() }));
                        continue;
                    }
                };
                if let Err(error) = fs::write(&locale_path, text) {
                    failed.push(json!({ "code": code, "message": error.to_string() }));
                    continue;
                }

                let flag = pkg.get("flag").and_then(|v| v.as_str()).unwrap_or("us").trim().to_lowercase();
                let flag_url = pkg.get("flagUrl").and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
                if is_flag_code(&flag) && !flag_url.is_empty() {
                    if let Ok(flag_bytes) = http_get_bytes(&flag_url) {
                        let _ = fs::write(user_flags_dir().join(format!("{}.svg", flag)), flag_bytes);
                    }
                }
                installed.push(json!({ "code": code, "localePath": locale_path.to_string_lossy().to_string() }));
            }
            if installed.is_empty() && failed.is_empty() {
                return Some(Ok(json!({
                    "success": false,
                    "message": "No locale packages selected for installation.",
                    "installed": [],
                    "failed": []
                })));
            }
            Ok(json!({
                "success": !installed.is_empty(),
                "manifestUrl": catalog.get("manifestUrl").cloned().unwrap_or_else(|| Value::String(String::new())),
                "installed": installed,
                "failed": failed
            }))
        }
        _ => return None,
    };
    Some(result)
}
