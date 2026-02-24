const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);

function createSuggestionsProviderClient(deps = {}) {
  const fetchImpl = deps.fetchImpl || fetch;
  const normalizeProvider = typeof deps.normalizeProvider === "function"
    ? deps.normalizeProvider
    : ((provider) => String(provider || "").trim().toLowerCase() || "ollama");
  const normalizeText = typeof deps.normalizeText === "function"
    ? deps.normalizeText
    : ((value, fallback = "") => {
      const text = String(value ?? "").trim();
      return text || fallback;
    });
  const normalizeTemperature = typeof deps.normalizeTemperature === "function"
    ? deps.normalizeTemperature
    : ((value, fallback = 0.7) => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) return fallback;
      return Math.max(0, Math.min(2, parsed));
    });
  const buildRequestPrompt = typeof deps.buildRequestPrompt === "function"
    ? deps.buildRequestPrompt
    : ((payload) => normalizeText(payload?.prompt));

  if (typeof fetchImpl !== "function") {
    throw new Error("createSuggestionsProviderClient requires fetchImpl");
  }

  function normalizeOllamaBaseUrl(baseUrl) {
    return normalizeText(baseUrl, "http://127.0.0.1:11434").replace(/\/+$/g, "");
  }

  function getOllamaApiEndpoint(baseUrl, pathPart) {
    const normalizedBase = normalizeOllamaBaseUrl(baseUrl);
    const normalizedPath = String(pathPart || "").replace(/^\/+/, "");
    if (normalizedBase.toLowerCase().endsWith("/api")) {
      return `${normalizedBase}/${normalizedPath}`;
    }
    return `${normalizedBase}/api/${normalizedPath}`;
  }

  function getOllamaV1Endpoint(baseUrl, pathPart) {
    const normalizedBase = normalizeOllamaBaseUrl(baseUrl);
    const normalizedPath = String(pathPart || "").replace(/^\/+/, "");
    if (normalizedBase.toLowerCase().endsWith("/v1")) {
      return `${normalizedBase}/${normalizedPath}`;
    }
    return `${normalizedBase}/v1/${normalizedPath}`;
  }

  function isLocalhostHostname(hostname) {
    const value = String(hostname || "").trim().toLowerCase();
    return value === "localhost" || value === "127.0.0.1" || value === "::1";
  }

  function parseUrlSafe(rawUrl) {
    const text = String(rawUrl || "").trim();
    if (!text) return null;
    try {
      return new URL(text);
    } catch (_error) {
      try {
        return new URL(`http://${text}`);
      } catch (_error2) {
        return null;
      }
    }
  }

  function isLocalOllamaBaseUrl(baseUrl) {
    const parsed = parseUrlSafe(baseUrl);
    if (!parsed) return false;
    return isLocalhostHostname(parsed.hostname);
  }

  function getOllamaHostEnv(baseUrl) {
    const parsed = parseUrlSafe(baseUrl);
    if (!parsed) return "127.0.0.1:11434";
    const host = String(parsed.hostname || "127.0.0.1");
    const port = Number(parsed.port || 0) > 0 ? String(parsed.port) : "11434";
    return `${host}:${port}`;
  }

  function parseOllamaListOutput(stdoutText) {
    const lines = String(stdoutText || "")
      .split(/\r?\n/g)
      .map((line) => String(line || "").trim())
      .filter(Boolean);
    if (!lines.length) return [];

    const out = [];
    for (const line of lines) {
      if (/^name\s+/i.test(line)) continue;
      const parts = line.split(/\s{2,}/g).map((v) => String(v || "").trim()).filter(Boolean);
      if (!parts.length) continue;
      const modelName = parts[0];
      if (!modelName || modelName.toLowerCase() === "name") continue;
      out.push(modelName);
    }
    return out;
  }

  async function listOllamaModelsViaCli(baseUrl) {
    const env = {
      ...process.env,
      OLLAMA_HOST: getOllamaHostEnv(baseUrl)
    };
    const result = await execFileAsync("ollama", ["list"], { env, windowsHide: true, maxBuffer: 2 * 1024 * 1024 });
    return parseOllamaListOutput(result?.stdout);
  }

  async function listOllamaModels(payload = {}) {
    const baseUrl = normalizeOllamaBaseUrl(payload.baseUrl);
    const endpoints = [
      { url: getOllamaApiEndpoint(baseUrl, "tags"), type: "tags" },
      { url: getOllamaV1Endpoint(baseUrl, "models"), type: "v1" }
    ];
    const errors = [];
    const names = [];

    for (const endpoint of endpoints) {
      try {
        const response = await fetchImpl(endpoint.url, {
          method: "GET",
          headers: {
            "content-type": "application/json"
          }
        });
        if (!response.ok) {
          const text = await response.text();
          errors.push(`${endpoint.url} -> ${response.status}: ${text.slice(0, 140)}`);
          continue;
        }

        const json = await response.json();
        const rows = endpoint.type === "v1"
          ? (Array.isArray(json?.data) ? json.data : [])
          : (Array.isArray(json?.models) ? json.models : []);

        const parsed = rows
          .map((row) => normalizeText(row?.name || row?.model || row?.id))
          .filter(Boolean);

        names.push(...parsed);
      } catch (error) {
        errors.push(`${endpoint.url} -> ${error?.message || String(error)}`);
      }
    }

    if (isLocalOllamaBaseUrl(baseUrl)) {
      try {
        const cliNames = await listOllamaModelsViaCli(baseUrl);
        names.push(...cliNames);
      } catch (error) {
        errors.push(`ollama list -> ${error?.message || String(error)}`);
      }
    }

    if (names.length === 0) {
      throw new Error(`Ollama model list failed. ${errors.join(" | ")}`.trim());
    }

    const seen = new Set();
    const deduped = [];
    names.forEach((name) => {
      const key = name.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      deduped.push(name);
    });

    deduped.sort((a, b) => a.localeCompare(b));
    return {
      baseUrl,
      models: deduped
    };
  }

  async function requestOllamaJson(payload = {}) {
    const endpoint = getOllamaApiEndpoint(payload.baseUrl, "generate");
    const runWithModel = async (modelName) => {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: normalizeText(modelName, "llama3.1"),
          prompt: buildRequestPrompt(payload),
          format: "json",
          options: {
            temperature: normalizeTemperature(payload?.temperature, 0.7)
          },
          stream: false
        })
      });
      const text = await response.text();
      return { ok: response.ok, status: response.status, text };
    };

    const initialModel = normalizeText(payload.model, "llama3.1");
    let firstRun = await runWithModel(initialModel);
    if (!firstRun.ok) {
      const modelNotFound = firstRun.status === 404 || /model\s+['"]?.+?['"]?\s+not\s+found/i.test(firstRun.text);
      if (modelNotFound) {
        try {
          const listed = await listOllamaModels({ baseUrl: payload.baseUrl });
          const fallbackModel = normalizeText(listed?.models?.[0]);
          if (fallbackModel && fallbackModel.toLowerCase() !== initialModel.toLowerCase()) {
            firstRun = await runWithModel(fallbackModel);
          }
        } catch (_error) {}
      }
    }

    if (!firstRun.ok) {
      throw new Error(`Ollama request failed (${firstRun.status}): ${String(firstRun.text || "").slice(0, 180)}`);
    }

    let json = null;
    try {
      json = JSON.parse(String(firstRun.text || "{}"));
    } catch (_error) {}
    return normalizeText(json?.response, String(firstRun.text || ""));
  }

  async function requestOpenAIJson(payload = {}) {
    const baseUrl = normalizeText(payload.baseUrl, "https://api.openai.com/v1").replace(/\/+$/g, "");
    const endpoint = `${baseUrl}/chat/completions`;
    const apiKey = normalizeText(payload.apiKey);
    if (!apiKey) throw new Error("Missing API key for OpenAI provider.");

    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: normalizeText(payload.model, "gpt-4o-mini"),
        temperature: normalizeTemperature(payload?.temperature, 0.7),
        messages: [
          {
            role: "system",
            content: "Return strict JSON only. No markdown."
          },
          {
            role: "user",
            content: buildRequestPrompt(payload)
          }
        ]
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI request failed (${response.status}): ${text.slice(0, 180)}`);
    }

    const json = await response.json();
    return normalizeText(json?.choices?.[0]?.message?.content);
  }

  async function requestGeminiJson(payload = {}) {
    const apiKey = normalizeText(payload.apiKey);
    if (!apiKey) throw new Error("Missing API key for Gemini provider.");

    const model = encodeURIComponent(normalizeText(payload.model, "gemini-1.5-flash"));
    const baseUrl = normalizeText(payload.baseUrl, "https://generativelanguage.googleapis.com/v1beta").replace(/\/+$/g, "");
    const endpoint = `${baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: buildRequestPrompt(payload) }]
          }
        ],
        generationConfig: {
          temperature: normalizeTemperature(payload?.temperature, 0.7)
        }
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gemini request failed (${response.status}): ${text.slice(0, 180)}`);
    }

    const json = await response.json();
    const parts = json?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) return "";
    return parts.map((part) => normalizeText(part?.text)).filter(Boolean).join("\n");
  }

  async function requestJson(payload = {}) {
    const provider = normalizeProvider(payload?.provider);
    if (provider === "openai") return requestOpenAIJson(payload);
    if (provider === "gemini") return requestGeminiJson(payload);
    return requestOllamaJson(payload);
  }

  async function requestOllamaText(payload = {}, options = {}) {
    const promptText = normalizeText(options?.prompt, buildRequestPrompt(payload));
    const endpoint = getOllamaApiEndpoint(payload.baseUrl, "generate");
    const runWithModel = async (modelName) => {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: normalizeText(modelName, "llama3.1"),
          prompt: promptText,
          stream: false
        })
      });
      const text = await response.text();
      return { ok: response.ok, status: response.status, text };
    };

    const initialModel = normalizeText(payload.model, "llama3.1");
    let firstRun = await runWithModel(initialModel);
    if (!firstRun.ok) {
      const modelNotFound = firstRun.status === 404 || /model\s+['"]?.+?['"]?\s+not\s+found/i.test(firstRun.text);
      if (modelNotFound) {
        try {
          const listed = await listOllamaModels({ baseUrl: payload.baseUrl });
          const fallbackModel = normalizeText(listed?.models?.[0]);
          if (fallbackModel && fallbackModel.toLowerCase() !== initialModel.toLowerCase()) {
            firstRun = await runWithModel(fallbackModel);
          }
        } catch (_error) {}
      }
    }

    if (!firstRun.ok) {
      throw new Error(`Ollama request failed (${firstRun.status}): ${String(firstRun.text || "").slice(0, 180)}`);
    }

    let json = null;
    try {
      json = JSON.parse(String(firstRun.text || "{}"));
    } catch (_error) {}
    return normalizeText(json?.response, String(firstRun.text || ""));
  }

  async function requestOpenAIText(payload = {}, options = {}) {
    const promptText = normalizeText(options?.prompt, buildRequestPrompt(payload));
    const systemPrompt = normalizeText(options?.systemPrompt, "You are emuBro's support assistant for emulator troubleshooting and app usage. Return plain text.");
    const temperature = normalizeTemperature(options?.temperature, 0.3);
    const baseUrl = normalizeText(payload.baseUrl, "https://api.openai.com/v1").replace(/\/+$/g, "");
    const endpoint = `${baseUrl}/chat/completions`;
    const apiKey = normalizeText(payload.apiKey);
    if (!apiKey) throw new Error("Missing API key for OpenAI provider.");

    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: normalizeText(payload.model, "gpt-4o-mini"),
        temperature,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: promptText
          }
        ]
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI request failed (${response.status}): ${text.slice(0, 180)}`);
    }

    const json = await response.json();
    return normalizeText(json?.choices?.[0]?.message?.content);
  }

  async function requestGeminiText(payload = {}, options = {}) {
    const promptText = normalizeText(options?.prompt, buildRequestPrompt(payload));
    const temperature = normalizeTemperature(options?.temperature, 0.3);
    const apiKey = normalizeText(payload.apiKey);
    if (!apiKey) throw new Error("Missing API key for Gemini provider.");

    const model = encodeURIComponent(normalizeText(payload.model, "gemini-1.5-flash"));
    const baseUrl = normalizeText(payload.baseUrl, "https://generativelanguage.googleapis.com/v1beta").replace(/\/+$/g, "");
    const endpoint = `${baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: promptText }]
          }
        ],
        generationConfig: {
          temperature
        }
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gemini request failed (${response.status}): ${text.slice(0, 180)}`);
    }

    const json = await response.json();
    const parts = json?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) return "";
    return parts.map((part) => normalizeText(part?.text)).filter(Boolean).join("\n");
  }

  async function requestText(payload = {}, options = {}) {
    const provider = normalizeProvider(payload?.provider);
    if (provider === "openai") return requestOpenAIText(payload, options);
    if (provider === "gemini") return requestGeminiText(payload, options);
    return requestOllamaText(payload, options);
  }

  return {
    listOllamaModels,
    requestJson,
    requestText
  };
}

module.exports = {
  createSuggestionsProviderClient
};
