use super::*;
use tauri::Emitter;

const SUPPORT_STREAM_EVENT: &str = "emubro:support-stream";
const SUPPORT_PROMPT_AGENT: &str =
    include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/prompts/support/AGENT.md"));
const SUPPORT_PROMPT_CHAT_SYSTEM: &str =
    include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/prompts/support/CHAT_SYSTEM.md"));
const SUPPORT_PROMPT_TROUBLESHOOT_SYSTEM: &str =
    include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/prompts/support/TROUBLESHOOT_SYSTEM.md"));

pub(super) fn handle(channel: &str, args: &[Value]) -> Option<Result<Value, String>> {
    if let Some(result) = descriptions::handle(channel, args) {
        return Some(result);
    }
    if let Some(result) = tags::handle(channel, args) {
        return Some(result);
    }
    if let Some(result) = tool_draft::handle(channel, args) {
        return Some(result);
    }

    let result = match channel {
        "suggestions:list-ollama-models" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            if relay_enabled_for_payload(&payload) {
                let relay_response = relay_post_json(
                    &payload,
                    "/api/llm/list-ollama-models",
                    &json!({ "payload": sanitize_relay_payload(&payload) }),
                );
                match relay_response {
                    Ok(data) => {
                        if !data.get("success").and_then(|v| v.as_bool()).unwrap_or(false) {
                            return Some(Ok(json!({
                                "success": false,
                                "message": data.get("message").and_then(|v| v.as_str()).unwrap_or("Relay model-list request failed."),
                                "models": []
                            })));
                        }
                        return Some(Ok(json!({
                            "success": true,
                            "baseUrl": data.get("baseUrl").and_then(|v| v.as_str()).unwrap_or(""),
                            "models": data.get("models").cloned().unwrap_or_else(|| json!([]))
                        })));
                    }
                    Err(error) => {
                        return Some(Ok(json!({
                            "success": false,
                            "message": error,
                            "models": []
                        })));
                    }
                }
            }
            let base = payload
                .get("baseUrl")
                .and_then(|v| v.as_str())
                .unwrap_or("http://127.0.0.1:11434")
                .trim()
                .trim_end_matches('/')
                .to_string();
            match list_ollama_models_for_base(&base) {
                Ok(models) => Ok(json!({ "success": true, "baseUrl": base, "models": models })),
                Err(error) => Ok(json!({ "success": false, "message": error, "models": [] })),
            }
        }
        "suggestions:relay:sync-host-settings" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let relay = normalize_relay(&payload);
            let profile = normalize_relay_profile(&payload);
            if let Err(error) = write_state_value(RELAY_KEY, &relay) {
                return Some(Err(error));
            }
            if let Err(error) = write_state_value(RELAY_PROFILE_KEY, &profile) {
                return Some(Err(error));
            }
            Ok(json!({
                "success": true,
                "profile": profile,
                "relay": relay,
                "status": relay_status_payload(&relay)
            }))
        }
        "suggestions:relay:get-status" => {
            let relay = normalize_relay(&read_state_value_or_default(RELAY_KEY, relay_default()));
            let profile = read_state_value_or_default(RELAY_PROFILE_KEY, relay_profile_default());
            let connections = read_state_value_or_default(RELAY_CONNECTIONS_KEY, json!([]));
            Ok(json!({
                "success": true,
                "profile": profile,
                "relay": relay,
                "status": relay_status_payload(&relay),
                "connections": connections
            }))
        }
        "suggestions:relay:get-connections" => {
            let connections = read_state_value_or_default(RELAY_CONNECTIONS_KEY, json!([]));
            Ok(json!({ "success": true, "connections": connections }))
        }
        "suggestions:relay:scan-network" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            Ok(relay_scan_network(&payload))
        }
        "suggestions:recommend-games" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            if payload.get("prompt").and_then(|v| v.as_str()).unwrap_or("").trim().is_empty() {
                return Some(Ok(simple_recommendations(&payload)));
            }
            let prompt = payload.get("prompt").and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
            match request_provider_text(&payload, &prompt) {
                Ok(raw_text) => {
                    if let Some(parsed) = extract_json_from_text(&raw_text) {
                        let summary = parsed.get("summary").and_then(|v| v.as_str()).unwrap_or("Suggestions ready.");
                        let matches = parsed
                            .get("libraryMatches")
                            .and_then(|v| v.as_array())
                            .cloned()
                            .unwrap_or_default();
                        let missing = parsed
                            .get("missingSuggestions")
                            .and_then(|v| v.as_array())
                            .cloned()
                            .unwrap_or_default();
                        Ok(json!({
                            "success": true,
                            "provider": normalize_provider(payload.get("provider").and_then(|v| v.as_str()).unwrap_or("")),
                            "mode": normalize_mode(payload.get("mode").and_then(|v| v.as_str()).unwrap_or("")),
                            "summary": summary,
                            "libraryMatches": matches,
                            "missingSuggestions": missing
                        }))
                    } else {
                        Ok(simple_recommendations(&payload))
                    }
                }
                Err(_) => Ok(simple_recommendations(&payload)),
            }
        }
        "suggestions:generate-theme" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            match generate_theme_with_llm(&payload) {
                Ok(result) => Ok(result),
                Err(error) => Ok(fallback_theme_generation(&payload, Some(error))),
            }
        }
        "suggestions:translate-locale-missing" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            translate_locale_missing_with_llm(&payload)
        }
        "suggestions:emulation-support" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            handle_emulation_support(&payload, None)
        }
        _ => return None,
    };
    Some(result)
}

pub(crate) fn handle_emulation_support(
    payload: &Value,
    window: Option<&tauri::Window>,
) -> Result<Value, String> {
    let (system_prompt, user_prompt) = build_emulation_support_prompts(payload);
    let provider = normalize_provider(payload.get("provider").and_then(|v| v.as_str()).unwrap_or(""));
    let stream_request_id = payload
        .get("streamRequestId")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let wants_stream = payload
        .get("streamResponse")
        .and_then(|v| v.as_bool())
        .unwrap_or(false)
        && provider == "ollama"
        && !relay_enabled_for_payload(payload)
        && !stream_request_id.is_empty();

    if wants_stream {
        if let Some(community_window) = window {
            let _ = community_window.emit(
                SUPPORT_STREAM_EVENT,
                json!({
                    "requestId": stream_request_id.as_str(),
                    "state": "start",
                    "provider": provider.as_str()
                }),
            );
        }
    }

    let response = if wants_stream {
        request_provider_chat_text_streaming(payload, &system_prompt, &user_prompt, true, |chunk| {
            if let Some(stream_window) = window {
                let _ = stream_window.emit(
                    SUPPORT_STREAM_EVENT,
                    json!({
                        "requestId": stream_request_id.as_str(),
                        "state": "chunk",
                        "provider": provider.as_str(),
                        "chunk": chunk
                    }),
                );
            }
        })
    } else {
        request_provider_chat_text(payload, &system_prompt, &user_prompt, true)
    };

    match response {
        Ok(answer) => {
            let debug_payload = build_support_debug_payload(
                payload,
                provider.as_str(),
                &system_prompt,
                &user_prompt,
                wants_stream,
                stream_request_id.as_str(),
                None,
            );
            if wants_stream {
                if let Some(stream_window) = window {
                    let _ = stream_window.emit(
                        SUPPORT_STREAM_EVENT,
                        json!({
                            "requestId": stream_request_id.as_str(),
                            "state": "done",
                            "provider": provider.as_str()
                        }),
                    );
                }
            }
            Ok(json!({
                "success": true,
                "provider": provider,
                "answer": answer,
                "debug": debug_payload
            }))
        }
        Err(error) => {
            eprintln!(
                "[support-llm] provider={} stream={} error={}",
                provider.as_str(),
                wants_stream,
                error
            );
            let debug_payload = build_support_debug_payload(
                payload,
                provider.as_str(),
                &system_prompt,
                &user_prompt,
                wants_stream,
                stream_request_id.as_str(),
                Some(error.as_str()),
            );
            if wants_stream {
                if let Some(stream_window) = window {
                    let _ = stream_window.emit(
                        SUPPORT_STREAM_EVENT,
                        json!({
                            "requestId": stream_request_id.as_str(),
                            "state": "error",
                            "provider": provider.as_str(),
                            "message": error.clone()
                        }),
                    );
                }
            }
            Ok(json!({
                "success": true,
                "provider": "local-fallback",
                "providerError": error,
                "answer": build_emulation_support_fallback(payload),
                "debug": debug_payload
            }))
        }
    }
}

fn build_support_debug_payload(
    payload: &Value,
    provider: &str,
    system_prompt: &str,
    user_prompt: &str,
    wants_stream: bool,
    stream_request_id: &str,
    provider_error: Option<&str>,
) -> Value {
    let debug_enabled = payload
        .get("debugSupport")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    if !debug_enabled && provider_error.is_none() {
        return Value::Null;
    }

    let mut debug = json!({
        "provider": provider,
        "supportMode": payload
            .get("supportMode")
            .and_then(|v| v.as_str())
            .unwrap_or("troubleshoot"),
        "taskProtocol": payload
            .get("supportTaskProtocol")
            .and_then(|v| v.as_str())
            .unwrap_or(""),
        "streaming": {
            "requested": payload
                .get("streamResponse")
                .and_then(|v| v.as_bool())
                .unwrap_or(false),
            "active": wants_stream,
            "requestId": stream_request_id
        },
        "prompts": [
            {
                "id": "system",
                "label": "System Prompt",
                "role": "system",
                "text": system_prompt
            },
            {
                "id": "user",
                "label": "User Prompt",
                "role": "user",
                "text": user_prompt
            }
        ]
    });

    if let (Some(error), Some(obj)) = (provider_error, debug.as_object_mut()) {
        obj.insert("fallback".to_string(), json!(true));
        obj.insert("providerError".to_string(), json!(error));
    }

    debug
}

fn build_support_feature_snapshot() -> &'static str {
    "- emuBro has Library, Tools, Support, Community, Settings, Theme Manager, and Language Manager surfaces.\n\
- Current AI / LLM features include provider selection (Ollama / OpenAI / Gemini), host or client relay mode, local network relay scanning, shell-native support chat/troubleshooting, LLM theme generation, locale translation, game description/tag suggestions, and custom tool draft generation.\n\
- Support can see live local library matches for games/emulators and may ask to run shell-backed tasks like fetching specs, launching a game/emulator, or downloading an emulator.\n\
- Community includes a shell-native hub plus an in-app browser window flow for Discord/Reddit/YouTube/Bluesky/X.\n\
- Library supports drag/drop import, launcher import (Steam / Epic / GOG / Heroic paths depending on availability), cover download, categories/tags, platform filters, and multiple game views including cover/list/table/slideshow/focus/random.\n\
- Tools currently include BIOS Manager, Memory Card Editor, Remote Library, Cover Downloader, CUE Maker, ECM / UNECM helper, and custom shortcut / plugin scaffolding tools.\n\
- The app also has updater flows for both the main app and emubro-resources, plus shell-managed profile/settings popups and desktop window chrome.\n"
}

fn append_prompt_section(prompt: &mut String, label: &str, body: &str) {
    let trimmed = body.trim();
    if trimmed.is_empty() {
        return;
    }
    if !prompt.trim().is_empty() {
        prompt.push_str("\n\n");
    }
    prompt.push_str(&format!("[{}]\n{}\n", label, trimmed));
}

fn format_support_chat_history_for_prompt(history: &[Value], latest_user_message: &str) -> String {
    let lines = history
        .iter()
        .filter_map(|entry| {
            let role = entry
                .get("role")
                .and_then(|v| v.as_str())
                .unwrap_or("user")
                .trim()
                .to_lowercase();
            let text = entry
                .get("text")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim();
            if text.is_empty() || (role == "user" && text == latest_user_message) {
                return None;
            }
            Some(format!("[{}] {}", role, text))
        })
        .collect::<Vec<String>>();
    lines.join("\n")
}

fn build_locale_translation_prompts(payload: &Value) -> (String, String) {
    let source_language_code = payload
        .get("sourceLanguageCode")
        .and_then(|v| v.as_str())
        .unwrap_or("en")
        .trim();
    let target_language_code = payload
        .get("targetLanguageCode")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim();
    let target_language_name = payload
        .get("targetLanguageName")
        .and_then(|v| v.as_str())
        .unwrap_or(target_language_code)
        .trim();
    let style_hint = payload
        .get("styleHint")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim();
    let prompt_template = payload
        .get("promptTemplate")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim();
    let include_existing_translations_in_prompt = payload
        .get("includeExistingTranslationsInPrompt")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    let retranslate_existing = payload
        .get("retranslateExisting")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let entries = payload
        .get("entries")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    let source_locale = payload.get("sourceLocaleObject").cloned().unwrap_or_else(|| json!({}));
    let target_locale = if include_existing_translations_in_prompt {
        payload.get("targetLocaleObject").cloned().unwrap_or_else(|| json!({}))
    } else {
        json!({})
    };

    let system_prompt = String::from(
        "You are emuBro's locale translation assistant.\n\
Return JSON only.\n\
Translate UI strings from the source language into the target language.\n\
Preserve the exact keys.\n\
Preserve placeholders like {{name}}, {{count}}, {name}, %s, %d, $1, HTML tags, \\n line breaks, punctuation, and spacing intent.\n\
Do not add explanations, comments, markdown fences, or extra keys.\n\
If a string should remain unchanged, return it unchanged.\n\
Keep game titles, product names, emulator names, and branded terms intact unless they have a standard localized form.\n\
Return exactly this shape: {\"translations\":{\"some.key\":\"translated text\"}}",
    );

    let default_template = [
        "Translate the following emuBro locale strings from {{sourceLanguageCode}} to {{targetLanguageCode}} ({{targetLanguageName}}).",
        "Keep the tone natural for UI text and keep it concise.",
        "{{styleHintBlock}}",
        "Preserve keys exactly.",
        "Preserve placeholders exactly, including {{name}}, {{count}}, {name}, %s, %d, $1, HTML tags, escaped newlines, and punctuation/spacing intent.",
        "If a product name, emulator name, or brand should stay unchanged, keep it unchanged.",
        "Return JSON only in this exact shape: {\"translations\":{\"some.key\":\"translated text\"}}",
        "",
        "Entries to translate:",
        "{{entriesJson}}",
        "",
        "{{sourceLocaleContextBlock}}",
        "{{targetLocaleContextBlock}}"
    ].join("\n");

    let style_hint_block = if style_hint.is_empty() {
        String::new()
    } else {
        format!("Style guidance: {}", style_hint)
    };
    let entries_json = serde_json::to_string_pretty(&entries).unwrap_or_else(|_| "[]".to_string());
    let source_locale_json = serde_json::to_string_pretty(&source_locale).unwrap_or_else(|_| "{}".to_string());
    let target_locale_json = serde_json::to_string_pretty(&target_locale).unwrap_or_else(|_| "{}".to_string());
    let source_locale_context_block = format!("Source locale context JSON:\n{}", source_locale_json);
    let target_locale_context_block = if include_existing_translations_in_prompt {
        format!("Current target locale context JSON:\n{}", target_locale_json)
    } else {
        String::new()
    };

    let mut user_prompt = if prompt_template.is_empty() {
        default_template.to_string()
    } else {
        prompt_template.to_string()
    };
    let replacements = [
        ("{{sourceLanguageCode}}", source_language_code),
        ("{{targetLanguageCode}}", if target_language_code.is_empty() { "unknown" } else { target_language_code }),
        ("{{targetLanguageName}}", if target_language_name.is_empty() { "unknown" } else { target_language_name }),
        ("{{styleHint}}", style_hint),
        ("{{styleHintBlock}}", &style_hint_block),
        ("{{retranslateExisting}}", if retranslate_existing { "yes" } else { "no" }),
        ("{{entriesJson}}", &entries_json),
        ("{{sourceLocaleJson}}", &source_locale_json),
        ("{{targetLocaleJson}}", &target_locale_json),
        ("{{sourceLocaleContextBlock}}", &source_locale_context_block),
        ("{{targetLocaleContextBlock}}", &target_locale_context_block),
    ];
    for (token, value) in replacements {
        user_prompt = user_prompt.replace(token, value);
    }

    (system_prompt, user_prompt)
}

fn extract_locale_translation_map(parsed: &Value) -> serde_json::Map<String, Value> {
    let mut out = serde_json::Map::new();
    let source_object = parsed
        .get("translations")
        .and_then(|v| v.as_object())
        .cloned()
        .or_else(|| parsed.as_object().cloned())
        .unwrap_or_default();

    for (key, value) in source_object {
        let normalized_key = key.trim().to_string();
        if normalized_key.is_empty() {
            continue;
        }
        match value {
            Value::String(text) => {
                out.insert(normalized_key, Value::String(text));
            }
            other => {
                if let Some(text) = other.as_str() {
                    out.insert(normalized_key, Value::String(text.to_string()));
                }
            }
        }
    }

    out
}

fn translate_locale_missing_with_llm(payload: &Value) -> Result<Value, String> {
    let entries = payload
        .get("entries")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    if entries.is_empty() {
        return Ok(json!({
            "success": true,
            "provider": normalize_provider(payload.get("provider").and_then(|v| v.as_str()).unwrap_or("")),
            "mode": payload.get("mode").and_then(|v| v.as_str()).unwrap_or("one-by-one"),
            "translations": {},
            "localeJsonMinified": "{}"
        }));
    }

    let (system_prompt, user_prompt) = build_locale_translation_prompts(payload);
    let raw_text = request_provider_chat_text(payload, &system_prompt, &user_prompt, true)?;
    let parsed = extract_json_from_text(&raw_text)
        .ok_or_else(|| format!("Provider returned invalid translation JSON: {}", raw_text.chars().take(320).collect::<String>()))?;
    let translations = extract_locale_translation_map(&parsed);

    if translations.is_empty() {
        return Ok(json!({
            "success": false,
            "provider": normalize_provider(payload.get("provider").and_then(|v| v.as_str()).unwrap_or("")),
            "mode": payload.get("mode").and_then(|v| v.as_str()).unwrap_or("one-by-one"),
            "message": "Provider returned an empty translation map.",
            "translations": {},
            "localeJsonMinified": ""
        }));
    }

    Ok(json!({
        "success": true,
        "provider": normalize_provider(payload.get("provider").and_then(|v| v.as_str()).unwrap_or("")),
        "mode": payload.get("mode").and_then(|v| v.as_str()).unwrap_or("one-by-one"),
        "translations": Value::Object(translations.clone()),
        "localeJsonMinified": serde_json::to_string(&json!({ "translations": Value::Object(translations) })).unwrap_or_else(|_| "{}".to_string())
    }))
}

fn fallback_theme_generation(payload: &Value, provider_error: Option<String>) -> Value {
    let mood = payload.get("mood").and_then(|v| v.as_str()).unwrap_or("balanced");
    let accent = color_for_mood(mood).to_string();
    let provider = if provider_error.is_some() {
        "local-fallback".to_string()
    } else {
        normalize_provider(payload.get("provider").and_then(|v| v.as_str()).unwrap_or(""))
    };
    let summary = if provider_error.is_some() {
        format!("AI theme fallback applied for mood '{}'.", mood)
    } else {
        format!("Theme generated for mood '{}'.", mood)
    };

    json!({
        "success": true,
        "provider": provider,
        "summary": summary,
        "colors": {
            "bgPrimary": mix(&accent, -170),
            "bgSecondary": mix(&accent, -150),
            "bgTertiary": mix(&accent, -130),
            "bgQuaternary": mix(&accent, -110),
            "textPrimary": "#f3f6ff",
            "textSecondary": "#b7c6de",
            "accentColor": accent,
            "borderColor": mix(&accent, -80),
            "bgHeader": mix(&accent, -160),
            "bgSidebar": mix(&accent, -155),
            "bgActionbar": mix(&accent, -145),
            "brandColor": mix(&accent, 10),
            "appGradientA": mix(&accent, -175),
            "appGradientB": mix(&accent, -145),
            "appGradientC": mix(&accent, -120),
            "appGradientAngle": "160deg",
            "successColor": "#4caf50",
            "dangerColor": "#f44336"
        },
        "textEffect": {
            "enabled": payload.get("preferTextEffect").and_then(|v| v.as_bool()).unwrap_or(false),
            "mode": "flowy-blood",
            "applyToLogo": payload.get("applyEffectToLogo").and_then(|v| v.as_bool()).unwrap_or(false),
            "speed": 6,
            "intensity": 65,
            "angle": 45,
            "useColor4": false,
            "customColors": {}
        },
        "debug": provider_error.map(|error| json!({ "fallback": true, "providerError": error })).unwrap_or(Value::Null)
    })
}

fn build_generate_theme_prompts(payload: &Value) -> (String, String) {
    let mood = payload.get("mood").and_then(|v| v.as_str()).unwrap_or("balanced").trim();
    let style = payload.get("style").and_then(|v| v.as_str()).unwrap_or("arcade").trim();
    let energy = payload.get("energy").and_then(|v| v.as_i64()).unwrap_or(60).clamp(0, 100);
    let saturation = payload.get("saturation").and_then(|v| v.as_i64()).unwrap_or(65).clamp(0, 100);
    let notes = payload.get("notes").and_then(|v| v.as_str()).unwrap_or("").trim();
    let extra_prompt = payload.get("extraPrompt").and_then(|v| v.as_str()).unwrap_or("").trim();
    let prefer_text_effect = payload.get("preferTextEffect").and_then(|v| v.as_bool()).unwrap_or(false);
    let apply_effect_to_logo = payload.get("applyEffectToLogo").and_then(|v| v.as_bool()).unwrap_or(false);
    let variation_seed = payload.get("variationSeed").and_then(|v| v.as_str()).unwrap_or("").trim();
    let current_colors = payload.get("currentColors").cloned().unwrap_or_else(|| json!({}));

    let system_prompt = String::from(
        "You are emuBro's theme generation assistant.\n\
Return JSON only.\n\
Generate a cohesive desktop theme palette and optional logo text effect.\n\
Prefer readable, high-contrast UI colors with a clear accent and layered dark/light surfaces.\n\
Every color must be a valid #RRGGBB hex string.\n\
When the request includes a variation seed, treat it as a requirement to produce a fresh variant instead of repeating the previous palette.\n\
When a current color snapshot is provided, treat it only as reference context. Do not simply echo or lightly tweak it.\n\
Produce a visibly distinct result at a glance, especially in bgPrimary, accentColor, brandColor, and at least one app gradient color.\n\
Return exactly this shape and no extra keys outside it:\n\
{\"summary\":\"...\",\"colors\":{\"bgPrimary\":\"#...\",\"bgSecondary\":\"#...\",\"bgTertiary\":\"#...\",\"bgQuaternary\":\"#...\",\"textPrimary\":\"#...\",\"textSecondary\":\"#...\",\"accentColor\":\"#...\",\"borderColor\":\"#...\",\"bgHeader\":\"#...\",\"bgSidebar\":\"#...\",\"bgActionbar\":\"#...\",\"brandColor\":\"#...\",\"appGradientA\":\"#...\",\"appGradientB\":\"#...\",\"appGradientC\":\"#...\",\"appGradientAngle\":\"160deg\",\"successColor\":\"#...\",\"dangerColor\":\"#...\"},\"textEffect\":{\"enabled\":true,\"mode\":\"flowy-blood\",\"applyToLogo\":true,\"speed\":6,\"intensity\":65,\"angle\":45,\"useColor4\":false,\"customColors\":{}}}\n\
Use appGradientAngle as a CSS degree string like \"160deg\".\n\
If textEffect is disabled, still return the textEffect object with enabled=false.\n\
Keep textEffect.mode to one existing emuBro mode such as flowy-blood, icy, neon, glow-wave, rainbow-flow, or ember.\n\
Do not wrap the JSON in markdown fences.\n"
    );

    let mut user_prompt = String::from("Generate an emuBro desktop theme with these inputs:\n");
    user_prompt.push_str(&format!("- Mood: {}\n", if mood.is_empty() { "balanced" } else { mood }));
    user_prompt.push_str(&format!("- Style: {}\n", if style.is_empty() { "arcade" } else { style }));
    user_prompt.push_str(&format!("- Energy: {} / 100\n", energy));
    user_prompt.push_str(&format!("- Saturation: {} / 100\n", saturation));
    user_prompt.push_str(&format!("- Prefer logo/text effect: {}\n", if prefer_text_effect { "yes" } else { "no" }));
    user_prompt.push_str(&format!("- Apply text effect to logo: {}\n", if apply_effect_to_logo { "yes" } else { "no" }));
    if !notes.is_empty() {
        user_prompt.push_str(&format!("- Extra notes: {}\n", notes));
    }
    if !extra_prompt.is_empty() {
        user_prompt.push_str(&format!("- Custom prompt add-on: {}\n", extra_prompt));
    }
    if !variation_seed.is_empty() {
        user_prompt.push_str(&format!("- Variation seed: {}\n", variation_seed));
        user_prompt.push_str("- Use that seed to deliberately create a fresh alternative, not a near-duplicate of the previous result.\n");
    }
    user_prompt.push_str("- Current color snapshot (adjust or replace as needed, but keep the result coherent):\n");
    user_prompt.push_str(&serde_json::to_string_pretty(&current_colors).unwrap_or_else(|_| "{}".to_string()));
    user_prompt.push_str("\nAim for a polished gaming-app theme, not a generic website palette. Use the current colors only as context, not as a requirement to stay close to the previous result. The new result should feel materially different in mood and accent family, not just slightly shifted.");

    (system_prompt, user_prompt)
}

fn generate_theme_with_llm(payload: &Value) -> Result<Value, String> {
    let (system_prompt, user_prompt) = build_generate_theme_prompts(payload);
    let raw_text = request_provider_chat_text(payload, &system_prompt, &user_prompt, true)?;
    let parsed = extract_json_from_text(&raw_text)
        .ok_or_else(|| format!("Provider returned invalid theme JSON: {}", raw_text.chars().take(320).collect::<String>()))?;
    let colors = parsed
        .get("colors")
        .and_then(|v| v.as_object())
        .cloned()
        .ok_or_else(|| "Provider theme response did not include a colors object.".to_string())?;
    let text_effect = parsed.get("textEffect").cloned().unwrap_or_else(|| json!({
        "enabled": false,
        "mode": "flowy-blood",
        "applyToLogo": false,
        "speed": 6,
        "intensity": 65,
        "angle": 45,
        "useColor4": false,
        "customColors": {}
    }));

    Ok(json!({
        "success": true,
        "provider": normalize_provider(payload.get("provider").and_then(|v| v.as_str()).unwrap_or("")),
        "summary": parsed.get("summary").and_then(|v| v.as_str()).unwrap_or("AI theme applied."),
        "colors": Value::Object(colors),
        "textEffect": text_effect
    }))
}

fn build_emulation_support_prompts(payload: &Value) -> (String, String) {
    let issue_type = payload
        .get("issueTypeLabel")
        .and_then(|v| v.as_str())
        .unwrap_or("Other emulation issue")
        .trim();
    let issue_summary = payload
        .get("issueSummary")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim();
    let platform = payload.get("platform").and_then(|v| v.as_str()).unwrap_or("").trim();
    let emulator = payload.get("emulator").and_then(|v| v.as_str()).unwrap_or("").trim();
    let error_text = payload.get("errorText").and_then(|v| v.as_str()).unwrap_or("").trim();
    let details = payload.get("details").and_then(|v| v.as_str()).unwrap_or("").trim();
    let support_mode = payload
        .get("supportMode")
        .and_then(|v| v.as_str())
        .unwrap_or("troubleshoot")
        .trim()
        .to_lowercase();
    let support_task_protocol = payload
        .get("supportTaskProtocol")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_lowercase();
    let allow_auto_specs = payload
        .get("allowAutoSpecsFetch")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let allow_web_access = payload
        .get("allowWebAccess")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let library_matches = payload.get("libraryMatches").cloned().unwrap_or_else(|| json!({}));
    let library_active = library_matches
        .get("active")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let library_reason = library_matches
        .get("reason")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim();
    let library_query = library_matches
        .get("query")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim();
    let library_queries = library_matches
        .get("queries")
        .cloned()
        .unwrap_or_else(|| json!([]));
    let library_batch_query = library_matches
        .get("batchQuery")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let library_query_results = library_matches
        .get("queryResults")
        .cloned()
        .unwrap_or_else(|| json!([]));
    let matched_game_count = library_matches
        .get("gameCount")
        .and_then(|v| v.as_u64())
        .unwrap_or(0);
    let matched_emulator_count = library_matches
        .get("emulatorCount")
        .and_then(|v| v.as_u64())
        .unwrap_or(0);
    let matched_games = library_matches
        .get("games")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    let matched_emulators = library_matches
        .get("emulators")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    let matched_game_rows_returned = library_matches
        .get("gameRowsReturned")
        .and_then(|v| v.as_u64())
        .unwrap_or(matched_games.len() as u64);
    let matched_emulator_rows_returned = library_matches
        .get("emulatorRowsReturned")
        .and_then(|v| v.as_u64())
        .unwrap_or(matched_emulators.len() as u64);
    let matched_game_rows_truncated = library_matches
        .get("gameRowsTruncated")
        .and_then(|v| v.as_bool())
        .unwrap_or(matched_game_count > matched_games.len() as u64);
    let matched_emulator_rows_truncated = library_matches
        .get("emulatorRowsTruncated")
        .and_then(|v| v.as_bool())
        .unwrap_or(matched_emulator_count > matched_emulators.len() as u64);
    let library_catalog = library_matches.get("catalog").cloned().unwrap_or_else(|| json!({}));
    let catalog_game_total = library_catalog
        .get("gameTotal")
        .and_then(|v| v.as_u64())
        .unwrap_or(0);
    let catalog_emulator_total = library_catalog
        .get("emulatorTotal")
        .and_then(|v| v.as_u64())
        .unwrap_or(0);
    let catalog_game_platforms = library_catalog
        .get("gamePlatforms")
        .cloned()
        .unwrap_or_else(|| json!([]));
    let catalog_emulator_platforms = library_catalog
        .get("emulatorPlatforms")
        .cloned()
        .unwrap_or_else(|| json!([]));
    let catalog_games = library_catalog
        .get("games")
        .cloned()
        .unwrap_or_else(|| json!([]));
    let catalog_emulators = library_catalog
        .get("emulators")
        .cloned()
        .unwrap_or_else(|| json!([]));
    let last_task_result = payload
        .get("lastTaskResult")
        .cloned()
        .unwrap_or_else(|| json!({}));
    let last_task_result_active = last_task_result
        .get("active")
        .and_then(|value| value.as_bool())
        .unwrap_or(false);

    if support_mode == "chat" {
        let mut system_prompt = String::new();
        system_prompt.push_str(SUPPORT_PROMPT_AGENT.trim());
        system_prompt.push_str("\n\n");
        system_prompt.push_str(SUPPORT_PROMPT_CHAT_SYSTEM.trim());

        let mut user_prompt = String::new();
        append_prompt_section(
            &mut user_prompt,
            "NEW_PROMPT",
            if issue_summary.is_empty() { "Not provided" } else { issue_summary }
        );

        if let Some(history) = payload.get("chatHistory").and_then(|v| v.as_array()) {
            let history_block = format_support_chat_history_for_prompt(history, issue_summary);
            append_prompt_section(&mut user_prompt, "PAST_MESSAGES", &history_block);
        }

        let mut library_context = String::new();
        library_context.push_str(&format!("- Active: {}\n", if library_active { "Yes" } else { "No" }));
        if !library_reason.is_empty() {
            library_context.push_str(&format!("- Reason: {}\n", library_reason));
        }
        if library_active {
            library_context.push_str(&format!(
                "- Match query: {}\n",
                if library_query.is_empty() { issue_summary } else { library_query }
            ));
            library_context.push_str(&format!("- Batch query: {}\n", if library_batch_query { "Yes" } else { "No" }));
            library_context.push_str(&format!("- Matching games count: {}\n", matched_game_count));
            library_context.push_str(&format!("- Matching emulators count: {}\n", matched_emulator_count));
            library_context.push_str(&format!("- Matching games rows returned: {}\n", matched_game_rows_returned));
            library_context.push_str(&format!("- Matching emulators rows returned: {}\n", matched_emulator_rows_returned));
            library_context.push_str(&format!("- Matching games rows truncated: {}\n", if matched_game_rows_truncated { "Yes" } else { "No" }));
            library_context.push_str(&format!("- Matching emulators rows truncated: {}\n", if matched_emulator_rows_truncated { "Yes" } else { "No" }));
            if library_batch_query {
                library_context.push_str("- Requested library queries JSON:\n");
                library_context.push_str(&format!(
                    "{}\n",
                    serde_json::to_string(&library_queries).unwrap_or_else(|_| "[]".to_string())
                ));
                library_context.push_str("- Per-query library results JSON:\n");
                library_context.push_str(&format!(
                    "{}\n",
                    serde_json::to_string(&library_query_results).unwrap_or_else(|_| "[]".to_string())
                ));
            }
            if !matched_games.is_empty() {
                library_context.push_str("- Matching games rows JSON:\n");
                library_context.push_str(&format!(
                    "{}\n",
                    serde_json::to_string(&matched_games).unwrap_or_else(|_| "[]".to_string())
                ));
            }
            if !matched_emulators.is_empty() {
                library_context.push_str("- Matching emulators rows JSON:\n");
                library_context.push_str(&format!(
                    "{}\n",
                    serde_json::to_string(&matched_emulators).unwrap_or_else(|_| "[]".to_string())
                ));
                library_context.push_str("- Emulator row hint: matching emulator rows may contain `isInstalled`, `filePath`, and `filePaths`. If the user asks for installed emulator locations, answer directly from those fields when they are present.\n");
            }
            library_context.push_str(&format!("- Catalog game total: {}\n", catalog_game_total));
            library_context.push_str(&format!("- Catalog emulator total: {}\n", catalog_emulator_total));
            library_context.push_str("- Catalog platforms (games):\n");
            library_context.push_str(&format!(
                "{}\n",
                serde_json::to_string(&catalog_game_platforms).unwrap_or_else(|_| "[]".to_string())
            ));
            library_context.push_str("- Catalog platforms (emulators):\n");
            library_context.push_str(&format!(
                "{}\n",
                serde_json::to_string(&catalog_emulator_platforms).unwrap_or_else(|_| "[]".to_string())
            ));
            library_context.push_str("- Catalog rows (games):\n");
            library_context.push_str(&format!(
                "{}\n",
                serde_json::to_string(&catalog_games).unwrap_or_else(|_| "[]".to_string())
            ));
            library_context.push_str("- Catalog rows (emulators):\n");
            library_context.push_str(&format!(
                "{}\n",
                serde_json::to_string(&catalog_emulators).unwrap_or_else(|_| "[]".to_string())
            ));
            library_context.push_str("- Emulator catalog hint: catalog emulator rows may include `isInstalled`, `filePath`, and `filePaths` as recorded local emulator data.\n");
        }
        append_prompt_section(&mut user_prompt, "LIBRARY_CONTEXT", &library_context);

        if !platform.is_empty() || !emulator.is_empty() || !details.is_empty() {
            let mut support_profile = String::new();
            if !platform.is_empty() {
                support_profile.push_str(&format!("- Platform preference: {}\n", platform));
            }
            if !emulator.is_empty() {
                support_profile.push_str(&format!("- Emulator preference: {}\n", emulator));
            }
            if !details.is_empty() {
                support_profile.push_str(&format!("- Extra details: {}\n", details));
            }
            append_prompt_section(&mut user_prompt, "SUPPORT_PROFILE", &support_profile);
        }

        if last_task_result_active {
            let mut last_task_context = String::new();
            last_task_context.push_str(&format!(
                "{}\n",
                serde_json::to_string(&last_task_result).unwrap_or_else(|_| "{}".to_string())
            ));
            last_task_context.push_str("- The runtime already executed that self task successfully. Acknowledge the completed action to the user and do not repeat the same task unless a new additional task is still required.\n");
            append_prompt_section(&mut user_prompt, "LAST_TASK_RESULT", &last_task_context);
        }

        append_prompt_section(&mut user_prompt, "FEATURE_SNAPSHOT", build_support_feature_snapshot());

        if support_task_protocol == "shell-v1" {
            system_prompt.push_str("\n\n");
            system_prompt.push_str(support_self_task_prompt_index().trim());
            let selected_self_task_docs = build_support_self_task_prompt_examples(
                payload,
                issue_summary,
                details,
                platform,
                emulator,
                "chat",
                library_active,
            );
            if !selected_self_task_docs.trim().is_empty() {
                system_prompt.push_str("\n\n");
                system_prompt.push_str(selected_self_task_docs.trim());
            }
        }

        let loaded_self_task_docs_context = build_loaded_support_self_task_docs_context(payload);
        if !loaded_self_task_docs_context.trim().is_empty() {
            append_prompt_section(&mut user_prompt, "LOADED_SELF_TASK_DOCS", &loaded_self_task_docs_context);
        }

        return (system_prompt, user_prompt);
    }

    let mut system_prompt = String::new();
    system_prompt.push_str(SUPPORT_PROMPT_AGENT.trim());
    system_prompt.push_str("\n\n");
    system_prompt.push_str(SUPPORT_PROMPT_TROUBLESHOOT_SYSTEM.trim());

    let mut user_prompt = String::new();
    let mut troubleshoot_context = String::new();
    troubleshoot_context.push_str(&format!("- Issue type: {}\n", if issue_type.is_empty() { "Not provided" } else { issue_type }));
    troubleshoot_context.push_str(&format!("- Issue summary: {}\n", if issue_summary.is_empty() { "Not provided" } else { issue_summary }));
    troubleshoot_context.push_str(&format!("- Platform: {}\n", if platform.is_empty() { "Not provided" } else { platform }));
    troubleshoot_context.push_str(&format!("- Emulator: {}\n", if emulator.is_empty() { "Not provided" } else { emulator }));
    troubleshoot_context.push_str(&format!("- Error text: {}\n", if error_text.is_empty() { "Not provided" } else { error_text }));
    troubleshoot_context.push_str(&format!("- Extra details: {}\n", if details.is_empty() { "Not provided" } else { details }));
    troubleshoot_context.push_str(&format!("- Auto specs fetch allowed: {}\n", if allow_auto_specs { "Yes" } else { "No" }));
    troubleshoot_context.push_str(&format!("- Web access allowed: {}\n", if allow_web_access { "Yes" } else { "No" }));
    append_prompt_section(&mut user_prompt, "NEW_PROMPT", issue_summary);
    append_prompt_section(&mut user_prompt, "CONTEXT", &troubleshoot_context);
    if last_task_result_active {
        let mut last_task_context = String::new();
        last_task_context.push_str("- Recent completed self task result JSON:\n");
        last_task_context.push_str(&format!(
            "{}\n",
            serde_json::to_string(&last_task_result).unwrap_or_else(|_| "{}".to_string())
        ));
        last_task_context.push_str("- The runtime already executed that self task successfully. Acknowledge the completed action and do not repeat the same task unless a new additional task is still required.\n");
        append_prompt_section(&mut user_prompt, "LAST_TASK_RESULT", &last_task_context);
    }
    append_prompt_section(&mut user_prompt, "FEATURE_SNAPSHOT", build_support_feature_snapshot());

    if support_task_protocol == "shell-v1" {
        system_prompt.push_str("\n\n");
        system_prompt.push_str(support_self_task_prompt_index().trim());
        let selected_self_task_docs = build_support_self_task_prompt_examples(
            payload,
            issue_summary,
            details,
            platform,
            emulator,
            "troubleshoot",
            library_active,
        );
        if !selected_self_task_docs.trim().is_empty() {
            system_prompt.push_str("\n\n");
            system_prompt.push_str(selected_self_task_docs.trim());
        }
    }

    let loaded_self_task_docs_context = build_loaded_support_self_task_docs_context(payload);
    if !loaded_self_task_docs_context.trim().is_empty() {
        append_prompt_section(&mut user_prompt, "LOADED_SELF_TASK_DOCS", &loaded_self_task_docs_context);
    }

    (system_prompt, user_prompt)
}

fn build_emulation_support_fallback(payload: &Value) -> String {
    let support_mode = payload
        .get("supportMode")
        .and_then(|v| v.as_str())
        .unwrap_or("troubleshoot")
        .trim()
        .to_lowercase();
    let issue = payload.get("issueSummary").and_then(|v| v.as_str()).unwrap_or("").trim();
    let platform = payload.get("platform").and_then(|v| v.as_str()).unwrap_or("").trim();
    let emulator = payload.get("emulator").and_then(|v| v.as_str()).unwrap_or("").trim();
    let error_text = payload.get("errorText").and_then(|v| v.as_str()).unwrap_or("").trim();
    let library_matches = payload.get("libraryMatches").cloned().unwrap_or_else(|| json!({}));
    let library_active = library_matches
        .get("active")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    if support_mode == "chat" {
        let game_count = library_matches
            .get("gameCount")
            .and_then(|v| v.as_u64())
            .unwrap_or(0);
        let emulator_count = library_matches
            .get("emulatorCount")
            .and_then(|v| v.as_u64())
            .unwrap_or(0);
        let games = library_matches
            .get("games")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default();
        let emulators = library_matches
            .get("emulators")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default();

        let format_names = |rows: &[Value]| -> Vec<String> {
            rows.iter()
                .filter_map(|row| {
                    let name = row.get("name").and_then(|v| v.as_str()).unwrap_or("").trim();
                    let platform = row.get("platform").and_then(|v| v.as_str()).unwrap_or("").trim();
                    if name.is_empty() {
                        None
                    } else if platform.is_empty() {
                        Some(name.to_string())
                    } else {
                        Some(format!("{} ({})", name, platform))
                    }
                })
                .take(6)
                .collect()
        };

        if !library_active {
            return format!(
                "I couldn't reach the configured LLM for a full reply right now. Ask again in a moment."
            );
        }

        if game_count > 0 || emulator_count > 0 {
            let mut answer = String::new();
            if game_count > 0 && emulator_count == 0 {
                answer.push_str(&format!("I found **{}** matching game{} in your library.", game_count, if game_count == 1 { "" } else { "s" }));
                let names = format_names(&games);
                if !names.is_empty() {
                    answer.push_str("\n\nExamples:\n");
                    for name in names {
                        answer.push_str(&format!("- {}\n", name));
                    }
                }
                return answer;
            }
            if emulator_count > 0 && game_count == 0 {
                answer.push_str(&format!("I found **{}** matching emulator{} in your library.", emulator_count, if emulator_count == 1 { "" } else { "s" }));
                let names = format_names(&emulators);
                if !names.is_empty() {
                    answer.push_str("\n\nExamples:\n");
                    for name in names {
                        answer.push_str(&format!("- {}\n", name));
                    }
                }
                return answer;
            }

            answer.push_str(&format!(
                "I found **{}** matching game{} and **{}** matching emulator{} in your library.",
                game_count,
                if game_count == 1 { "" } else { "s" },
                emulator_count,
                if emulator_count == 1 { "" } else { "s" }
            ));
            let game_names = format_names(&games);
            if !game_names.is_empty() {
                answer.push_str("\n\nGames:\n");
                for name in game_names {
                    answer.push_str(&format!("- {}\n", name));
                }
            }
            let emulator_names = format_names(&emulators);
            if !emulator_names.is_empty() {
                answer.push_str("\nEmulators:\n");
                for name in emulator_names {
                    answer.push_str(&format!("- {}\n", name));
                }
            }
            return answer;
        }

        return format!(
            "I couldn't find matching games or emulators in your local library for `{}`. Try a more specific title or platform if you want me to narrow it down.",
            if issue.is_empty() { "your question" } else { issue }
        );
    }

    let mut answer = String::from(
        "## Quick Troubleshooting\n\
1. Verify the game path and emulator path are still valid.\n\
2. Confirm platform mapping and default emulator selection in Settings.\n\
3. Check whether required BIOS files exist and are in the expected folder.\n\
4. Re-scan games and emulators after changing paths, BIOS files, or metadata.\n",
    );

    if !error_text.is_empty() {
        answer.push_str(&format!("5. Reproduce the issue and compare it against this error text: `{}`\n", error_text));
    }

    answer.push_str("\nDetails:\n");
    answer.push_str(&format!("- Issue: {}\n", if issue.is_empty() { "Not provided" } else { issue }));
    answer.push_str(&format!("- Platform: {}\n", if platform.is_empty() { "Not provided" } else { platform }));
    answer.push_str(&format!("- Emulator: {}\n", if emulator.is_empty() { "Not provided" } else { emulator }));

    answer
}
