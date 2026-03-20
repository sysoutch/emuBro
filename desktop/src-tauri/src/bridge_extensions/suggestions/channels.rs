use super::*;
use tauri::Emitter;

const SUPPORT_STREAM_EVENT: &str = "emubro:support-stream";

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
                "answer": answer
            }))
        }
        Err(error) => {
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
                "answer": build_emulation_support_fallback(payload),
                "debug": {
                    "fallback": true,
                    "providerError": error
                }
            }))
        }
    }
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

    if support_mode == "chat" {
        let mut system_prompt = String::from(
            "You are the emuBro chat assistant inside the user's local app.\n\
Respond with JSON only.\n\
Directly answer the latest user message instead of turning it into a troubleshooting form or a library search.\n\
Have a normal conversation first.\n\
Do not ask for emulator, platform, BIOS, renderer, logs, or other diagnostic details unless the latest message is actually about diagnosing a technical problem.\n\
Only use local library counts or names when the library lookup is explicitly active below.\n\
If the library lookup is not active, ignore empty library counts and answer the message normally.\n\
If the user asks how many matching games or emulators they have and the library lookup is active, answer with the exact provided count in the first sentence.\n\
Never turn a casual greeting or general app question into a no-matches library answer.\n",
        );

        let mut user_prompt = String::from("Latest user message:\n");
        user_prompt.push_str(&format!(
            "{}\n",
            if issue_summary.is_empty() { "Not provided" } else { issue_summary }
        ));

        if let Some(history) = payload.get("chatHistory").and_then(|v| v.as_array()) {
            if !history.is_empty() {
                user_prompt.push_str("\nConversation so far:\n");
                for entry in history {
                    let role = entry.get("role").and_then(|v| v.as_str()).unwrap_or("user").trim();
                    let text = entry.get("text").and_then(|v| v.as_str()).unwrap_or("").trim();
                    if text.is_empty() || (role == "user" && text == issue_summary) {
                        continue;
                    }
                    user_prompt.push_str(&format!("- {}: {}\n", role, text));
                }
            }
        }

        user_prompt.push_str("\nLocal library lookup:\n");
        user_prompt.push_str(&format!("- Active: {}\n", if library_active { "Yes" } else { "No" }));
        if !library_reason.is_empty() {
            user_prompt.push_str(&format!("- Reason: {}\n", library_reason));
        }
        if library_active {
            user_prompt.push_str(&format!(
                "- Match query: {}\n",
                if library_query.is_empty() { issue_summary } else { library_query }
            ));
            user_prompt.push_str(&format!("- Matching games count: {}\n", matched_game_count));
            user_prompt.push_str(&format!("- Matching emulators count: {}\n", matched_emulator_count));
            if !matched_games.is_empty() {
                let game_names = matched_games
                    .iter()
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
                    .collect::<Vec<_>>();
                if !game_names.is_empty() {
                    user_prompt.push_str(&format!("- Matching games sample: {}\n", game_names.join(", ")));
                }
            }
            if !matched_emulators.is_empty() {
                let emulator_names = matched_emulators
                    .iter()
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
                    .collect::<Vec<_>>();
                if !emulator_names.is_empty() {
                    user_prompt.push_str(&format!("- Matching emulators sample: {}\n", emulator_names.join(", ")));
                }
            }
        }

        if !platform.is_empty() || !emulator.is_empty() || !details.is_empty() {
            user_prompt.push_str("\nOptional support profile:\n");
            if !platform.is_empty() {
                user_prompt.push_str(&format!("- Platform preference: {}\n", platform));
            }
            if !emulator.is_empty() {
                user_prompt.push_str(&format!("- Emulator preference: {}\n", emulator));
            }
            if !details.is_empty() {
                user_prompt.push_str(&format!("- Extra details: {}\n", details));
            }
        }

        user_prompt.push_str("\nCurrent emuBro feature snapshot:\n");
        user_prompt.push_str(build_support_feature_snapshot());

        system_prompt.push_str(
            "\nResponse contract:\n\
- Always return exactly one minified JSON object and nothing else.\n\
- For a normal assistant response use: {\"type\":\"reply\",\"message\":\"...markdown text...\"}.\n\
- For a direct executable action use: {\"type\":\"task\",\"task\":\"FETCH_SPECS\",\"confidence\":0.92,\"reason\":\"...\",\"args\":{}}.\n\
- For a blocked response that still proposes the next action use: {\"type\":\"blocked\",\"message\":\"...\",\"confidence\":0.84,\"reason\":\"...\",\"nextAction\":{\"task\":\"FETCH_SPECS\",\"action\":\"invoke\",\"command\":\"system:get-specs\",\"args\":{}}}.\n\
- Treat local library context as optional supplemental data, not the main mode.\n\
- Only answer from the local library context first when the library lookup is active and relevant.\n\
- Only suggest troubleshooting steps when the user is actually describing a problem.\n\
- Avoid filler and avoid asking for irrelevant technical details.\n",
        );

        if support_task_protocol == "shell-v1" {
            system_prompt.push_str(
                "\nShell task protocol:\n\
- You have access to shell actions backed by the app runtime.\n\
- Local library rows and counts in the prompt come from the app's live state/database and can be trusted as current app context.\n\
- Allowed tasks are:\n\
- `FETCH_SPECS` -> command `system:get-specs`.\n\
- `RUN_GAME` -> command `launch-game`, use `args.gameId` or `args.gameKey` from the provided library rows.\n\
- `RUN_EMULATOR` -> command `launch-emulator`, use `args.emulatorId` or `args.emulatorKey` from the provided emulator rows.\n\
- `DOWNLOAD_INSTALL_EMULATOR` -> command `download-install-emulator`, use `args.emulatorId` or `args.emulatorKey` from the provided emulator rows.\n\
- Decide yourself whether the latest request belongs to the `FETCH_SPECS` task category.\n\
- Estimate your confidence for that task decision as a value from 0.00 to 1.00.\n\
- Only use a task when it is actually necessary or directly requested by the user.\n\
- If details already contain a `[PC Specs]` block, do not ask for `FETCH_SPECS` again.\n\
- Never say that you cannot access, fetch, inspect, or view the user's system specs. Use the task JSON instead.\n",
            );
        }

        return (system_prompt, user_prompt);
    }

    let mut system_prompt = String::from(
        "You are the emuBro support assistant. Help with emulator, BIOS, controller, game launch, and performance issues.\n\
Respond with JSON only.\n\
Do not invent settings, file paths, installed software, or successful fixes.\n\
If information is missing, say exactly what to verify next.\n\
Mode: troubleshoot\n\
Return a short diagnosis, likely causes, and a numbered fix checklist.\n",
    );

    let mut user_prompt = String::from("Context:\n");
    user_prompt.push_str(&format!("- Issue type: {}\n", if issue_type.is_empty() { "Not provided" } else { issue_type }));
    user_prompt.push_str(&format!("- Issue summary: {}\n", if issue_summary.is_empty() { "Not provided" } else { issue_summary }));
    user_prompt.push_str(&format!("- Platform: {}\n", if platform.is_empty() { "Not provided" } else { platform }));
    user_prompt.push_str(&format!("- Emulator: {}\n", if emulator.is_empty() { "Not provided" } else { emulator }));
    user_prompt.push_str(&format!("- Error text: {}\n", if error_text.is_empty() { "Not provided" } else { error_text }));
    user_prompt.push_str(&format!("- Extra details: {}\n", if details.is_empty() { "Not provided" } else { details }));
    user_prompt.push_str(&format!("- Auto specs fetch allowed: {}\n", if allow_auto_specs { "Yes" } else { "No" }));
    user_prompt.push_str(&format!("- Web access allowed: {}\n", if allow_web_access { "Yes" } else { "No" }));
    user_prompt.push_str("\nCurrent emuBro feature snapshot:\n");
    user_prompt.push_str(build_support_feature_snapshot());

    system_prompt.push_str(
        "\nResponse contract:\n\
- Always return exactly one minified JSON object and nothing else.\n\
- For a normal assistant response use: {\"type\":\"reply\",\"message\":\"...markdown text...\"}.\n\
- For a direct executable action use: {\"type\":\"task\",\"task\":\"FETCH_SPECS\",\"confidence\":0.92,\"reason\":\"...\",\"args\":{}}.\n\
- For a blocked response that still proposes the next action use: {\"type\":\"blocked\",\"message\":\"...\",\"confidence\":0.84,\"reason\":\"...\",\"nextAction\":{\"task\":\"FETCH_SPECS\",\"action\":\"invoke\",\"command\":\"system:get-specs\",\"args\":{}}}.\n\
- Prefer concrete emulator-oriented steps.\n\
- Mention BIOS, paths, controller mapping, graphics backend, renderer, and rescan checks only when relevant.\n\
- Keep the answer compact and avoid filler.\n",
    );

    if support_task_protocol == "shell-v1" {
        system_prompt.push_str(
            "\nShell task protocol:\n\
- You have access to shell actions backed by the app runtime.\n\
- Local library rows and counts in the prompt come from the app's live state/database and can be trusted as current app context.\n\
- Allowed tasks are:\n\
- `FETCH_SPECS` -> command `system:get-specs`.\n\
- `RUN_GAME` -> command `launch-game`, use `args.gameId` or `args.gameKey` from the provided library rows.\n\
- `RUN_EMULATOR` -> command `launch-emulator`, use `args.emulatorId` or `args.emulatorKey` from the provided emulator rows.\n\
- `DOWNLOAD_INSTALL_EMULATOR` -> command `download-install-emulator`, use `args.emulatorId` or `args.emulatorKey` from the provided emulator rows.\n\
- Decide yourself whether the latest request belongs to the `FETCH_SPECS` task category.\n\
- Estimate your confidence for that task decision as a value from 0.00 to 1.00.\n\
- Only use a task when it is actually necessary or directly requested by the user.\n\
- If details already contain a `[PC Specs]` block, do not ask for `FETCH_SPECS` again.\n\
- Never say that you cannot access, fetch, inspect, or view the user's system specs. Use the task JSON instead.\n",
        );
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
        let lower_issue = issue.to_lowercase();
        let normalized_issue = lower_issue.split_whitespace().collect::<Vec<_>>().join(" ");
        let is_count_question = lower_issue.contains("how many")
            || lower_issue.contains("count")
            || lower_issue.contains("number of");
        let is_list_question = is_count_question
            || lower_issue.contains("which")
            || lower_issue.contains("what")
            || lower_issue.contains("show")
            || lower_issue.contains("list");
        let is_greeting = normalized_issue.is_empty()
            || matches!(
                normalized_issue.as_str(),
                "hi" | "hello" | "hey" | "yo" | "sup" | "thanks" | "thank you" | "thx" | "good morning" | "good afternoon" | "good evening"
            );
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
            if is_greeting {
                return "Hi. Ask me anything about emuBro, emulator setup, troubleshooting, tools, themes, or your library.".to_string();
            }
            if issue.is_empty() {
                return "Ask me anything about emuBro, emulator setup, troubleshooting, tools, themes, or your library.".to_string();
            }
            return format!(
                "I couldn't reach the configured LLM for a full reply right now. Ask again in a moment. If you want a library lookup, mention a title or platform and ask for a count, list, or match."
            );
        }

        if game_count > 0 || emulator_count > 0 {
            let mut answer = String::new();
            if game_count > 0 && emulator_count == 0 {
                if is_count_question {
                    answer.push_str(&format!("You have **{}** matching game{} in your library.", game_count, if game_count == 1 { "" } else { "s" }));
                } else {
                    answer.push_str(&format!("I found **{}** matching game{} in your library.", game_count, if game_count == 1 { "" } else { "s" }));
                }
                let names = format_names(&games);
                if is_list_question && !names.is_empty() {
                    answer.push_str("\n\nExamples:\n");
                    for name in names {
                        answer.push_str(&format!("- {}\n", name));
                    }
                }
                return answer;
            }
            if emulator_count > 0 && game_count == 0 {
                if is_count_question {
                    answer.push_str(&format!("You have **{}** matching emulator{} in your library.", emulator_count, if emulator_count == 1 { "" } else { "s" }));
                } else {
                    answer.push_str(&format!("I found **{}** matching emulator{} in your library.", emulator_count, if emulator_count == 1 { "" } else { "s" }));
                }
                let names = format_names(&emulators);
                if is_list_question && !names.is_empty() {
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
