use super::*;

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
