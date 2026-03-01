use super::*;

pub(super) fn handle(channel: &str, args: &[Value]) -> Option<Result<Value, String>> {
    if let Some(result) = descriptions::handle(channel, args) {
        return Some(result);
    }
    if let Some(result) = tags::handle(channel, args) {
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
            let mood = payload.get("mood").and_then(|v| v.as_str()).unwrap_or("balanced");
            let accent = color_for_mood(mood).to_string();
            let result = json!({
                "success": true,
                "provider": normalize_provider(payload.get("provider").and_then(|v| v.as_str()).unwrap_or("")),
                "summary": format!("Theme generated for mood '{}'.", mood),
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
                }
            });
            Ok(result)
        }
        "suggestions:translate-locale-missing" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let entries = payload
                .get("entries")
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default();
            let mut translations = serde_json::Map::new();
            for entry in entries {
                let key = entry.get("key").and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
                let text = entry.get("text").and_then(|v| v.as_str()).unwrap_or("").to_string();
                if !key.is_empty() {
                    translations.insert(key, Value::String(text));
                }
            }
            Ok(json!({
                "success": true,
                "provider": normalize_provider(payload.get("provider").and_then(|v| v.as_str()).unwrap_or("")),
                "mode": payload.get("mode").and_then(|v| v.as_str()).unwrap_or("one-by-one"),
                "translations": Value::Object(translations),
                "localeJsonMinified": ""
            }))
        }
        "suggestions:emulation-support" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let issue = payload.get("issueSummary").and_then(|v| v.as_str()).unwrap_or("").trim();
            let platform = payload.get("platform").and_then(|v| v.as_str()).unwrap_or("").trim();
            let emulator = payload.get("emulator").and_then(|v| v.as_str()).unwrap_or("").trim();
            let answer = format!(
                "## Quick Troubleshooting\n- Verify ROM path and emulator path are valid.\n- Check platform mapping in Settings.\n- Confirm required BIOS files exist.\n- Re-scan games/emulators after changes.\n\nIssue: {}\nPlatform: {}\nEmulator: {}\n",
                if issue.is_empty() { "Not provided" } else { issue },
                if platform.is_empty() { "Not provided" } else { platform },
                if emulator.is_empty() { "Not provided" } else { emulator }
            );
            Ok(json!({
                "success": true,
                "provider": normalize_provider(payload.get("provider").and_then(|v| v.as_str()).unwrap_or("")),
                "answer": answer
            }))
        }
        _ => return None,
    };
    Some(result)
}
