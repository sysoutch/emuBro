use super::*;

fn help_docs_roots() -> Vec<PathBuf> {
    let mut roots = Vec::<PathBuf>::new();
    let managed = managed_data_root().join("emubro-resources").join("help");
    if managed.exists() && managed.is_dir() {
        roots.push(managed);
    }

    if let Ok(current_dir) = std::env::current_dir() {
        let resources_help = current_dir.join("emubro-resources").join("help");
        if resources_help.exists() && resources_help.is_dir() {
            roots.push(resources_help);
        }
        let docs_help = current_dir.join("docs").join("help");
        if docs_help.exists() && docs_help.is_dir() {
            roots.push(docs_help);
        }
    }

    let mut unique = Vec::<PathBuf>::new();
    let mut seen = HashSet::<String>::new();
    for root in roots {
        let key = root.to_string_lossy().to_string();
        if seen.insert(key) {
            unique.push(root);
        }
    }
    unique
}

fn doc_id_from_path(path: &Path) -> String {
    path.file_stem()
        .and_then(|v| v.to_str())
        .unwrap_or("")
        .trim()
        .to_lowercase()
}

fn title_case_words(raw: &str) -> String {
    raw.split_whitespace()
        .map(|part| {
            let trimmed = part.trim();
            if trimmed.is_empty() {
                return String::new();
            }
            let mut chars = trimmed.chars();
            let head = chars
                .next()
                .map(|ch| ch.to_uppercase().collect::<String>())
                .unwrap_or_default();
            let tail = chars.as_str().to_lowercase();
            format!("{}{}", head, tail)
        })
        .filter(|value| !value.is_empty())
        .collect::<Vec<String>>()
        .join(" ")
}

fn title_from_doc_id(doc_id: &str) -> String {
    let normalized = doc_id.replace(['-', '_'], " ");
    let title = title_case_words(&normalized);
    if title.is_empty() {
        "Help Doc".to_string()
    } else {
        title
    }
}

fn strip_html_tags(input: &str) -> String {
    let mut output = String::with_capacity(input.len());
    let mut inside_tag = false;

    for ch in input.chars() {
        match ch {
            '<' => inside_tag = true,
            '>' => inside_tag = false,
            _ if !inside_tag => output.push(ch),
            _ => {}
        }
    }

    output
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
}

fn normalize_text_preview(input: &str, max_len: usize) -> String {
    let cleaned = input
        .lines()
        .map(|line| line.trim())
        .filter(|line| !line.is_empty())
        .collect::<Vec<&str>>()
        .join(" ");

    if cleaned.chars().count() <= max_len {
        return cleaned;
    }
    cleaned.chars().take(max_len).collect::<String>().trim().to_string() + "..."
}

fn parse_doc_file(path: &Path) -> Option<Value> {
    let raw = fs::read_to_string(path).ok()?;
    let id = doc_id_from_path(path);
    if id.is_empty() {
        return None;
    }

    let extension = path
        .extension()
        .and_then(|v| v.to_str())
        .unwrap_or("")
        .trim()
        .to_lowercase();

    let title = title_from_doc_id(&id);
    let category = id.split('-').next().unwrap_or("help").trim().to_string();

    if extension == "html" || extension == "htm" {
        let text = strip_html_tags(&raw);
        return Some(json!({
            "id": id,
            "title": title,
            "category": category,
            "format": ".html",
            "html": raw,
            "text": text,
            "preview": normalize_text_preview(&text, 160),
            "path": path.to_string_lossy().to_string()
        }));
    }

    let text = raw.clone();
    let format_value = if extension.is_empty() {
        ".txt".to_string()
    } else {
        format!(".{}", extension)
    };
    Some(json!({
        "id": id,
        "title": title,
        "category": category,
        "format": format_value,
        "text": text,
        "preview": normalize_text_preview(&raw, 160),
        "path": path.to_string_lossy().to_string()
    }))
}

fn collect_help_docs() -> Vec<Value> {
    let mut docs = Vec::<Value>::new();
    let mut seen = HashSet::<String>::new();

    for root in help_docs_roots() {
        for entry in WalkDir::new(root)
            .into_iter()
            .filter_map(|row| row.ok())
            .filter(|row| row.file_type().is_file())
        {
            let path = entry.path().to_path_buf();
            let ext = path
                .extension()
                .and_then(|v| v.to_str())
                .unwrap_or("")
                .trim()
                .to_lowercase();
            if ext != "md" && ext != "html" && ext != "htm" && ext != "txt" {
                continue;
            }

            let id = doc_id_from_path(&path);
            if id.is_empty() || !seen.insert(id.clone()) {
                continue;
            }

            if let Some(doc) = parse_doc_file(&path) {
                docs.push(doc);
            }
        }
    }

    docs.sort_by(|a, b| {
        let at = a.get("title").and_then(|v| v.as_str()).unwrap_or("");
        let bt = b.get("title").and_then(|v| v.as_str()).unwrap_or("");
        at.cmp(bt)
    });
    docs
}

fn list_help_docs(query: &str, limit: usize) -> Vec<Value> {
    let search = query.trim().to_lowercase();
    let max_items = limit.max(1);

    collect_help_docs()
        .into_iter()
        .filter(|doc| {
            if search.is_empty() {
                return true;
            }
            let haystack = format!(
                "{} {} {} {}",
                doc.get("id").and_then(|v| v.as_str()).unwrap_or(""),
                doc.get("title").and_then(|v| v.as_str()).unwrap_or(""),
                doc.get("category").and_then(|v| v.as_str()).unwrap_or(""),
                doc.get("preview").and_then(|v| v.as_str()).unwrap_or("")
            )
            .to_lowercase();
            haystack.contains(&search)
        })
        .take(max_items)
        .collect()
}

fn get_help_doc_by_id(id: &str) -> Option<Value> {
    let target = id.trim().to_lowercase();
    if target.is_empty() {
        return None;
    }
    collect_help_docs()
        .into_iter()
        .find(|doc| doc.get("id").and_then(|v| v.as_str()).unwrap_or("").trim().eq_ignore_ascii_case(&target))
}

pub(crate) fn handle(channel: &str, args: &[Value]) -> Option<Result<Value, String>> {
    let result = match channel {
        "help:docs:list" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let query = payload
                .get("query")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            let limit = payload
                .get("limit")
                .and_then(|v| v.as_u64())
                .unwrap_or(200) as usize;
            Ok(json!({
                "success": true,
                "docs": list_help_docs(&query, limit)
            }))
        }
        "help:docs:get" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let id = payload
                .get("id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if id.is_empty() {
                return Some(Ok(json!({ "success": false, "message": "Doc id is required." })));
            }
            let Some(doc) = get_help_doc_by_id(&id) else {
                return Some(Ok(json!({ "success": false, "message": "Doc not found." })));
            };
            Ok(json!({ "success": true, "doc": doc }))
        }
        "help:docs:search" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let query = payload
                .get("query")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            let limit = payload
                .get("limit")
                .and_then(|v| v.as_u64())
                .unwrap_or(6) as usize;
            let rows = list_help_docs(&query, limit.clamp(1, 12))
                .into_iter()
                .map(|row| {
                    json!({
                        "id": row.get("id").and_then(|v| v.as_str()).unwrap_or(""),
                        "title": row.get("title").and_then(|v| v.as_str()).unwrap_or(""),
                        "snippet": row.get("preview").and_then(|v| v.as_str()).unwrap_or("")
                    })
                })
                .collect::<Vec<Value>>();
            Ok(json!({ "success": true, "rows": rows }))
        }
        _ => return None,
    };
    Some(result)
}
