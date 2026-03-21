use super::*;

#[derive(Clone, Copy)]
pub(super) struct SupportSelfTaskDoc {
    pub id: &'static str,
    pub title: &'static str,
    pub summary: &'static str,
    pub tasks: &'static [&'static str],
    pub keywords: &'static [&'static str],
    pub content: &'static str,
}

const SUPPORT_PROMPT_SELF_TASKS_INDEX: &str =
    include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/prompts/support/SELF_TASKS.md"));
const SUPPORT_DOC_SYSTEM_SPECS: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/prompts/support/self_tasks/reference/system-specs.md"
));
const SUPPORT_DOC_LAUNCH_AND_INSTALL: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/prompts/support/self_tasks/reference/launch-and-install.md"
));
const SUPPORT_DOC_LIBRARY_QUERIES: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/prompts/support/self_tasks/reference/library-queries.md"
));
const SUPPORT_DOC_TAGS_AND_METADATA: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/prompts/support/self_tasks/reference/tags-and-metadata.md"
));
const SUPPORT_DOC_HELP_DOCS: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/prompts/support/self_tasks/reference/help-docs.md"
));
const SUPPORT_DOC_PLATFORM_METADATA: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/prompts/support/self_tasks/reference/platform-metadata.md"
));
const SUPPORT_DOC_GAME_METADATA: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/prompts/support/self_tasks/reference/game-metadata.md"
));
const SUPPORT_DOC_COVERS_AND_ARTWORK: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/prompts/support/self_tasks/reference/covers-and-artwork.md"
));
const SUPPORT_DOC_LINKS_AND_PANELS: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/prompts/support/self_tasks/reference/links-and-panels.md"
));
const SUPPORT_DOC_SUPPORT_WORKSPACE_CONTROLS: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/prompts/support/self_tasks/reference/support-workspace-controls.md"
));
const SUPPORT_DOC_SHELL_PREFERENCES_AND_ASSETS: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/prompts/support/self_tasks/reference/shell-preferences-and-assets.md"
));
const SUPPORT_DOC_LIBRARY_WORKSPACE_CONTROLS: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/prompts/support/self_tasks/reference/library-workspace-controls.md"
));
const SUPPORT_DOC_LIBRARY_DETAILS: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/prompts/support/self_tasks/reference/library-details.md"
));
const SUPPORT_DOC_EMULATOR_CONFIG_OVERRIDES: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/prompts/support/self_tasks/reference/emulator-config-overrides.md"
));
const SUPPORT_DOC_FOLLOW_UP_CHAINING: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/prompts/support/self_tasks/examples/follow-up-chaining.md"
));

const SUPPORT_SELF_TASK_DOCS: &[SupportSelfTaskDoc] = &[
    SupportSelfTaskDoc {
        id: "system-specs",
        title: "System Specs",
        summary: "Hardware/spec inspection and FETCH_SPECS behavior.",
        tasks: &["FETCH_SPECS"],
        keywords: &["specs", "system", "hardware", "cpu", "gpu", "ram", "wmic", "regedit"],
        content: SUPPORT_DOC_SYSTEM_SPECS,
    },
    SupportSelfTaskDoc {
        id: "launch-and-install",
        title: "Launch And Install",
        summary: "Game launch, emulator launch, and emulator install actions.",
        tasks: &["RUN_GAME", "RUN_EMULATOR", "DOWNLOAD_INSTALL_EMULATOR"],
        keywords: &["run", "launch", "play", "open", "install", "download", "emulator"],
        content: SUPPORT_DOC_LAUNCH_AND_INSTALL,
    },
    SupportSelfTaskDoc {
        id: "library-queries",
        title: "Library Queries",
        summary: "Whole-library totals, title matching, installed emulator checks, and refreshes.",
        tasks: &["READ_LIBRARY", "REFRESH_LIBRARY"],
        keywords: &["library", "catalog", "collection", "games", "emulators", "installed", "count", "list", "query", "path"],
        content: SUPPORT_DOC_LIBRARY_QUERIES,
    },
    SupportSelfTaskDoc {
        id: "tags-and-metadata",
        title: "Tags And Metadata",
        summary: "Tag catalog inspection and tag edits for matched games.",
        tasks: &["LIST_TAGS", "ADD_TAGS", "REMOVE_TAGS"],
        keywords: &["tag", "tags", "metadata", "favorite", "genre", "label"],
        content: SUPPORT_DOC_TAGS_AND_METADATA,
    },
    SupportSelfTaskDoc {
        id: "help-docs",
        title: "Help Docs",
        summary: "Searching and opening local help documentation.",
        tasks: &["LIST_HELP_DOCS", "READ_HELP_DOC"],
        keywords: &["help", "doc", "docs", "manual", "guide", "article", "bios", "controller"],
        content: SUPPORT_DOC_HELP_DOCS,
    },
    SupportSelfTaskDoc {
        id: "platform-metadata",
        title: "Platform Metadata",
        summary: "Reading platform metadata like release dates from local emubro-resources config.",
        tasks: &["RELEASE_DATE"],
        keywords: &["release date", "released", "launch date", "console launch", "platform date", "year"],
        content: SUPPORT_DOC_PLATFORM_METADATA,
    },
    SupportSelfTaskDoc {
        id: "game-metadata",
        title: "Game Metadata",
        summary: "Resolving a specific game first and reading any locally recorded game release date before fallback reasoning.",
        tasks: &["GAME_RELEASE_DATE"],
        keywords: &["game release date", "release date", "came out", "release year", "launched", "game date"],
        content: SUPPORT_DOC_GAME_METADATA,
    },
    SupportSelfTaskDoc {
        id: "covers-and-artwork",
        title: "Covers And Artwork",
        summary: "Showing or fetching game cover artwork inline in the support conversation.",
        tasks: &["FETCH_GAME_COVER", "ADD_GAME_COVER"],
        keywords: &["cover", "covers", "artwork", "box art", "boxart", "poster", "image", "thumbnail", "apply cover", "save cover"],
        content: SUPPORT_DOC_COVERS_AND_ARTWORK,
    },
    SupportSelfTaskDoc {
        id: "links-and-panels",
        title: "Links And Panels",
        summary: "Opening local app panels, URLs, and YouTube previews.",
        tasks: &["OPEN_SETTINGS_PANEL", "OPEN_EXTERNAL_URL", "OPEN_YOUTUBE_PREVIEW"],
        keywords: &["settings", "theme", "language", "panel", "url", "website", "youtube", "community", "tools"],
        content: SUPPORT_DOC_LINKS_AND_PANELS,
    },
    SupportSelfTaskDoc {
        id: "support-workspace-controls",
        title: "Support Workspace Controls",
        summary: "Changing support modes, fields, session state, and support toggles directly.",
        tasks: &[
            "CHANGE_SUPPORT_MODE",
            "CHANGE_PLATFORM",
            "CHANGE_EMULATOR",
            "CHANGE_ISSUE_TYPE",
            "CHANGE_ISSUE_SUMMARY",
            "APPEND_DETAILS",
            "CLEAR_SUPPORT_FIELD",
            "CLEAR_SUPPORT_SESSION",
            "TOGGLE_AUTO_SPECS",
            "TOGGLE_WEB_ACCESS",
            "TOGGLE_DEBUG_CONTEXT",
        ],
        keywords: &[
            "mode",
            "chat",
            "troubleshoot",
            "help",
            "platform",
            "emulator",
            "issue type",
            "summary",
            "details",
            "clear",
            "reset",
            "auto specs",
            "web access",
            "debug context",
            "toggle",
        ],
        content: SUPPORT_DOC_SUPPORT_WORKSPACE_CONTROLS,
    },
    SupportSelfTaskDoc {
        id: "shell-preferences-and-assets",
        title: "Shell Preferences And Assets",
        summary: "Changing theme/language and running library-wide cover downloads.",
        tasks: &["CHANGE_THEME", "CHANGE_LANGUAGE", "DOWNLOAD_LIBRARY_COVERS"],
        keywords: &["theme", "light", "dark", "language", "locale", "covers", "cover download", "artwork", "bulk"],
        content: SUPPORT_DOC_SHELL_PREFERENCES_AND_ASSETS,
    },
    SupportSelfTaskDoc {
        id: "library-workspace-controls",
        title: "Library Workspace Controls",
        summary: "Switching library sections/views and changing visible library filters.",
        tasks: &[
            "CHANGE_LIBRARY_SECTION",
            "CHANGE_LIBRARY_VIEW",
            "CHANGE_LIBRARY_SEARCH",
            "CHANGE_LIBRARY_PLATFORM_FILTER",
            "CHANGE_LIBRARY_SORT",
            "CHANGE_LIBRARY_EMULATOR_TYPE",
            "CLEAR_LIBRARY_FILTERS",
        ],
        keywords: &[
            "library section",
            "library view",
            "search library",
            "platform filter",
            "sort library",
            "emulator type",
            "clear library filters",
            "show emulators",
            "list view",
            "cover view",
        ],
        content: SUPPORT_DOC_LIBRARY_WORKSPACE_CONTROLS,
    },
    SupportSelfTaskDoc {
        id: "library-details",
        title: "Library Details",
        summary: "Opening game and emulator detail surfaces from support/chat.",
        tasks: &["OPEN_GAME_DETAILS", "OPEN_EMULATOR_DETAILS"],
        keywords: &[
            "details",
            "open details",
            "show details",
            "inspect game",
            "inspect emulator",
            "edit game",
            "edit emulator",
        ],
        content: SUPPORT_DOC_LIBRARY_DETAILS,
    },
    SupportSelfTaskDoc {
        id: "emulator-config-overrides",
        title: "Emulator Config Overrides",
        summary: "Changing stored emulator website, args, working directory, config path, and pre-launch overrides.",
        tasks: &[
            "CHANGE_EMULATOR_WEBSITE",
            "CHANGE_EMULATOR_LAUNCH_ARGS",
            "CHANGE_EMULATOR_WORKING_DIRECTORY",
            "CHANGE_EMULATOR_CONFIG_PATH",
            "CHANGE_EMULATOR_RUN_COMMANDS_BEFORE",
            "CLEAR_EMULATOR_OVERRIDE_FIELDS",
        ],
        keywords: &[
            "website",
            "launch args",
            "working directory",
            "config path",
            "config file",
            "pre-launch",
            "run commands before",
            "override",
            "emulator config",
        ],
        content: SUPPORT_DOC_EMULATOR_CONFIG_OVERRIDES,
    },
    SupportSelfTaskDoc {
        id: "follow-up-chaining",
        title: "Follow-up Chaining",
        summary: "Reply plus follow-up-task patterns and self-task-doc lookup behavior.",
        tasks: &["READ_LIBRARY", "LIST_SELF_TASK_DOCS", "READ_SELF_TASK_DOC"],
        keywords: &["follow up", "follow-up", "chain", "compound", "recommend", "then", "after", "check if", "docs"],
        content: SUPPORT_DOC_FOLLOW_UP_CHAINING,
    },
];

fn support_self_task_doc_to_value(doc: &SupportSelfTaskDoc, include_text: bool) -> Value {
    let mut value = json!({
        "id": doc.id,
        "title": doc.title,
        "summary": doc.summary,
        "tasks": doc.tasks,
        "keywords": doc.keywords
    });
    if include_text {
        if let Some(obj) = value.as_object_mut() {
            obj.insert("text".to_string(), json!(doc.content.trim()));
        }
    }
    value
}

fn normalize_support_self_task_doc_query(raw: &str) -> String {
    raw.trim().to_lowercase()
}

fn support_self_task_doc_matches_query(doc: &SupportSelfTaskDoc, query: &str) -> bool {
    let search = normalize_support_self_task_doc_query(query);
    if search.is_empty() {
        return true;
    }
    let haystack = format!(
        "{} {} {} {} {}",
        doc.id,
        doc.title,
        doc.summary,
        doc.tasks.join(" "),
        doc.keywords.join(" ")
    )
    .to_lowercase();
    haystack.contains(&search)
}

fn support_self_task_prompt_signal_text(
    payload: &Value,
    issue_summary: &str,
    details: &str,
    platform: &str,
    emulator: &str,
) -> String {
    let mut rows = vec![
        issue_summary.trim().to_string(),
        details.trim().to_string(),
        platform.trim().to_string(),
        emulator.trim().to_string(),
    ];
    if let Some(history) = payload.get("chatHistory").and_then(|value| value.as_array()) {
        for entry in history.iter().rev().take(6) {
            let text = entry
                .get("text")
                .and_then(|value| value.as_str())
                .unwrap_or("")
                .trim();
            if !text.is_empty() {
                rows.push(text.to_string());
            }
        }
    }
    rows.join(" ").to_lowercase()
}

fn push_support_self_task_doc_if_needed<'a>(
    docs: &mut Vec<&'a SupportSelfTaskDoc>,
    doc: &'a SupportSelfTaskDoc,
) {
    if !docs.iter().any(|row| row.id == doc.id) {
        docs.push(doc);
    }
}

pub(super) fn support_self_task_prompt_index() -> &'static str {
    SUPPORT_PROMPT_SELF_TASKS_INDEX
}

pub(super) fn build_support_self_task_prompt_examples(
    payload: &Value,
    issue_summary: &str,
    details: &str,
    platform: &str,
    emulator: &str,
    support_mode: &str,
    library_active: bool,
) -> String {
    let signal_text =
        support_self_task_prompt_signal_text(payload, issue_summary, details, platform, emulator);
    let mut selected = Vec::<&SupportSelfTaskDoc>::new();

    if library_active
        || [
            "library",
            "catalog",
            "collection",
            "games",
            "emulators",
            "installed",
            "count",
            "list",
            "spyro",
            "bsnes",
        ]
        .iter()
        .any(|token| signal_text.contains(token))
    {
        push_support_self_task_doc_if_needed(&mut selected, &SUPPORT_SELF_TASK_DOCS[2]);
    }
    if ["tag", "tags", "favorite", "metadata"]
        .iter()
        .any(|token| signal_text.contains(token))
    {
        push_support_self_task_doc_if_needed(&mut selected, &SUPPORT_SELF_TASK_DOCS[3]);
    }
    if ["run", "launch", "play", "open", "install", "download"]
        .iter()
        .any(|token| signal_text.contains(token))
        || !platform.trim().is_empty()
        || !emulator.trim().is_empty()
    {
        push_support_self_task_doc_if_needed(&mut selected, &SUPPORT_SELF_TASK_DOCS[1]);
    }
    if ["help", "doc", "docs", "manual", "guide", "bios", "controller"]
        .iter()
        .any(|token| signal_text.contains(token))
    {
        push_support_self_task_doc_if_needed(&mut selected, &SUPPORT_SELF_TASK_DOCS[4]);
    }
    if ["cover", "covers", "artwork", "box art", "boxart", "poster", "image", "thumbnail"]
        .iter()
        .any(|token| signal_text.contains(token))
    {
        push_support_self_task_doc_if_needed(&mut selected, &SUPPORT_SELF_TASK_DOCS[7]);
    }
    if [
        "game release date",
        "when did",
        "came out",
        "release year",
        "release date",
    ]
    .iter()
    .any(|token| signal_text.contains(token))
        && ![
            "console",
            "platform",
            "handheld",
            "computer",
            "hardware",
        ]
        .iter()
        .any(|token| signal_text.contains(token))
    {
        push_support_self_task_doc_if_needed(&mut selected, &SUPPORT_SELF_TASK_DOCS[6]);
    }
    if [
        "settings",
        "theme",
        "language",
        "profile",
        "community",
        "tools",
        "youtube",
        "website",
        "url",
        "link",
        "panel",
    ]
    .iter()
    .any(|token| signal_text.contains(token))
    {
        push_support_self_task_doc_if_needed(&mut selected, &SUPPORT_SELF_TASK_DOCS[8]);
    }
    if [
        "support mode",
        "troubleshoot mode",
        "chat mode",
        "help mode",
        "platform",
        "emulator",
        "issue type",
        "summary",
        "details",
        "clear",
        "reset",
        "auto specs",
        "web access",
        "debug context",
        "toggle",
    ]
    .iter()
    .any(|token| signal_text.contains(token))
    {
        push_support_self_task_doc_if_needed(&mut selected, &SUPPORT_SELF_TASK_DOCS[9]);
    }
    if [
        "theme",
        "light theme",
        "dark theme",
        "language",
        "locale",
        "download covers",
        "cover download",
        "bulk covers",
        "redownload covers",
    ]
    .iter()
    .any(|token| signal_text.contains(token))
    {
        push_support_self_task_doc_if_needed(&mut selected, &SUPPORT_SELF_TASK_DOCS[10]);
    }
    if [
        "library section",
        "library view",
        "search library",
        "platform filter",
        "sort library",
        "clear library filters",
        "show emulators",
        "cover view",
        "list view",
    ]
    .iter()
    .any(|token| signal_text.contains(token))
    {
        push_support_self_task_doc_if_needed(&mut selected, &SUPPORT_SELF_TASK_DOCS[11]);
    }
    if [
        "details",
        "open details",
        "show details",
        "inspect",
        "edit emulator",
        "edit game",
    ]
    .iter()
    .any(|token| signal_text.contains(token))
    {
        push_support_self_task_doc_if_needed(&mut selected, &SUPPORT_SELF_TASK_DOCS[12]);
    }
    if [
        "launch args",
        "working directory",
        "config path",
        "config file",
        "pre-launch",
        "run commands before",
        "website",
        "override",
        "emulator config",
    ]
    .iter()
    .any(|token| signal_text.contains(token))
    {
        push_support_self_task_doc_if_needed(&mut selected, &SUPPORT_SELF_TASK_DOCS[13]);
    }
    if ["spec", "specs", "system", "hardware", "cpu", "gpu", "ram", "wmic", "regedit"]
        .iter()
        .any(|token| signal_text.contains(token))
    {
        push_support_self_task_doc_if_needed(&mut selected, &SUPPORT_SELF_TASK_DOCS[0]);
    }
    if support_mode.eq_ignore_ascii_case("chat")
        || [
            " and ",
            " then ",
            "check if",
            "recommend",
            "after",
            "follow up",
            "follow-up",
    ]
    .iter()
    .any(|token| signal_text.contains(token))
    {
        push_support_self_task_doc_if_needed(&mut selected, &SUPPORT_SELF_TASK_DOCS[14]);
    }

    if selected.is_empty() {
        if library_active {
            selected.push(&SUPPORT_SELF_TASK_DOCS[2]);
        } else if support_mode.eq_ignore_ascii_case("chat") {
            selected.push(&SUPPORT_SELF_TASK_DOCS[14]);
        } else {
            selected.push(&SUPPORT_SELF_TASK_DOCS[0]);
            selected.push(&SUPPORT_SELF_TASK_DOCS[1]);
        }
    }

    selected.truncate(4);
    if selected.is_empty() {
        return String::new();
    }

    let mut output = String::from("Relevant self-task reference docs for this request:\n");
    for doc in selected {
        output.push_str(&format!(
            "\n### {} ({})\n{}\n",
            doc.title,
            doc.id,
            doc.content.trim()
        ));
    }
    output
}

pub(super) fn build_loaded_support_self_task_docs_context(payload: &Value) -> String {
    let source = payload.get("selfTaskDocs").and_then(|value| value.as_object());
    let Some(source) = source else {
        return String::new();
    };
    let active = source
        .get("active")
        .and_then(|value| value.as_bool())
        .unwrap_or(false);
    if !active {
        return String::new();
    }

    let query = source
        .get("query")
        .and_then(|value| value.as_str())
        .unwrap_or("")
        .trim();
    let action = source
        .get("action")
        .and_then(|value| value.as_str())
        .unwrap_or("read")
        .trim();
    let docs = source
        .get("docs")
        .and_then(|value| value.as_array())
        .cloned()
        .unwrap_or_default();

    let mut output = String::from("\nLoaded self-task docs from the local runtime:\n");
    output.push_str(&format!(
        "- Action: {}\n",
        if action.is_empty() { "read" } else { action }
    ));
    if !query.is_empty() {
        output.push_str(&format!("- Query: {}\n", query));
    }
    output.push_str(&format!("- Matching doc count: {}\n", docs.len()));
    if !docs.is_empty() {
        output.push_str("- Matching self-task docs JSON:\n");
        output.push_str(&format!(
            "{}\n",
            serde_json::to_string(&docs).unwrap_or_else(|_| "[]".to_string())
        ));
        let text_docs = docs
            .iter()
            .filter(|doc| {
                doc.get("text")
                    .and_then(|value| value.as_str())
                    .map(|value| !value.trim().is_empty())
                    .unwrap_or(false)
            })
            .cloned()
            .collect::<Vec<Value>>();
        if !text_docs.is_empty() {
            output.push_str("- Loaded self-task doc texts:\n");
            for doc in text_docs {
                let title = doc
                    .get("title")
                    .and_then(|value| value.as_str())
                    .unwrap_or("Self Task Doc")
                    .trim();
                let doc_id = doc
                    .get("id")
                    .and_then(|value| value.as_str())
                    .unwrap_or("")
                    .trim();
                let text = doc
                    .get("text")
                    .and_then(|value| value.as_str())
                    .unwrap_or("")
                    .trim();
                if text.is_empty() {
                    continue;
                }
                output.push_str(&format!(
                    "\n### {} ({})\n{}\n",
                    title,
                    if doc_id.is_empty() {
                        "self-task-doc"
                    } else {
                        doc_id
                    },
                    text
                ));
            }
        }
    }
    output
}

pub(super) fn list_support_self_task_docs(query: &str, limit: usize) -> Vec<Value> {
    let max_items = limit.clamp(1, 50);
    SUPPORT_SELF_TASK_DOCS
        .iter()
        .filter(|doc| support_self_task_doc_matches_query(doc, query))
        .take(max_items)
        .map(|doc| support_self_task_doc_to_value(doc, false))
        .collect()
}

pub(super) fn get_support_self_task_doc_by_id(id: &str) -> Option<Value> {
    let target = id.trim().to_lowercase();
    if target.is_empty() {
        return None;
    }
    SUPPORT_SELF_TASK_DOCS
        .iter()
        .find(|doc| doc.id.eq_ignore_ascii_case(&target))
        .map(|doc| support_self_task_doc_to_value(doc, true))
}

pub(super) fn handle(channel: &str, args: &[Value]) -> Option<Result<Value, String>> {
    let result = match channel {
        "support:self-task-docs:list" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let query = payload
                .get("query")
                .and_then(|value| value.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            let limit = payload
                .get("limit")
                .and_then(|value| value.as_u64())
                .unwrap_or(20) as usize;
            Ok(json!({
                "success": true,
                "docs": list_support_self_task_docs(&query, limit)
            }))
        }
        "support:self-task-docs:get" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let id = payload
                .get("id")
                .or_else(|| payload.get("docId"))
                .and_then(|value| value.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if id.is_empty() {
                return Some(Ok(json!({
                    "success": false,
                    "message": "Self-task doc id is required."
                })));
            }
            let Some(doc) = get_support_self_task_doc_by_id(&id) else {
                return Some(Ok(json!({
                    "success": false,
                    "message": "Self-task doc not found."
                })));
            };
            Ok(json!({
                "success": true,
                "doc": doc
            }))
        }
        _ => return None,
    };
    Some(result)
}
