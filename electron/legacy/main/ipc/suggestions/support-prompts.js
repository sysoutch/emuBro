function createSupportPrompts(deps = {}) {
  const normalizeText = typeof deps.normalizeText === "function"
    ? deps.normalizeText
    : ((value, fallback = "") => {
      const text = String(value ?? "").trim();
      return text || fallback;
    });
  const normalizeSupportMode = typeof deps.normalizeSupportMode === "function"
    ? deps.normalizeSupportMode
    : ((mode) => String(mode || "").trim().toLowerCase() === "chat" ? "chat" : "troubleshoot");
  const normalizeSupportChatHistory = typeof deps.normalizeSupportChatHistory === "function"
    ? deps.normalizeSupportChatHistory
    : ((rows) => Array.isArray(rows) ? rows : []);
  const formatSupportLookupPlanForPrompt = typeof deps.formatSupportLookupPlanForPrompt === "function"
    ? deps.formatSupportLookupPlanForPrompt
    : (() => "lookups=none; searchTerms=none; reason=n/a");

  function buildSupportTroubleshootPrompt(payload = {}) {
    const issueTypeLabel = normalizeText(payload.issueTypeLabel, "Emulation issue");
    const issueSummary = normalizeText(payload.issueSummary, "No summary provided.");
    const platform = normalizeText(payload.platform, "Not specified");
    const emulator = normalizeText(payload.emulator, "Not specified");
    const errorText = normalizeText(payload.errorText, "No explicit error message.");
    const details = normalizeText(payload.details, "No additional details.");
    const webAccess = payload?.allowWebAccess ? "enabled" : "disabled";
    const retrievalPlanSummary = formatSupportLookupPlanForPrompt(payload?.retrievalPlan || {});

    return [
      "You are emuBro's emulation troubleshooting assistant.",
      "Give practical, safe, legal troubleshooting advice for emulator issues.",
      "Do not suggest piracy, cracked BIOS, or illegal downloads.",
      "Use the local emuBro context below as primary truth when available.",
      "",
      "Issue context:",
      `- Type: ${issueTypeLabel}`,
      `- Summary: ${issueSummary}`,
      `- Platform: ${platform}`,
      `- Emulator: ${emulator}`,
      `- Error message: ${errorText}`,
      `- Extra details: ${details}`,
      `- Web access: ${webAccess}`,
      `- Retrieval plan: ${retrievalPlanSummary}`,
      "",
      "Local emuBro context:",
      normalizeText(payload.groundingContext, "No local context available."),
      "",
      "Output format rules:",
      "- Keep it concise but actionable.",
      "- Use these exact sections with plain text headings:",
      "  1) Likely Cause",
      "  2) Fix Steps",
      "  3) If Still Broken",
      "- In Fix Steps, provide numbered steps and mention where settings are usually found.",
      "- If information is missing, list short follow-up checks under If Still Broken."
    ].join("\n");
  }

  function buildSupportChatPrompt(payload = {}) {
    const issueSummary = normalizeText(payload.issueSummary, "No message provided.");
    const platform = normalizeText(payload.platform, "Not specified");
    const emulator = normalizeText(payload.emulator, "Not specified");
    const details = normalizeText(payload.details, "No extra details.");
    const errorText = normalizeText(payload.errorText, "No explicit error message.");
    const webAccess = payload?.allowWebAccess ? "enabled" : "disabled";
    const retrievalPlanSummary = formatSupportLookupPlanForPrompt(payload?.retrievalPlan || {});
    const chatHistory = normalizeSupportChatHistory(payload.chatHistory, 20);
    const chatLines = chatHistory.length
      ? chatHistory.map((entry) => `${entry.role === "assistant" ? "Assistant" : "User"}: ${entry.text}`)
      : ["(no previous messages)"];

    return [
      "You are emuBro's support assistant for both emulator troubleshooting and emuBro app usage.",
      "You can answer questions about app features, settings, library management, tools, imports, launchers, updates, and emulator setup.",
      "Use local emuBro context below as primary truth when available.",
      "Do not suggest piracy, cracked BIOS, or illegal downloads.",
      "",
      "Current message:",
      `- User: ${issueSummary}`,
      `- Platform hint: ${platform}`,
      `- Emulator hint: ${emulator}`,
      `- Error hint: ${errorText}`,
      `- Additional details: ${details}`,
      `- Web access: ${webAccess}`,
      `- Retrieval plan: ${retrievalPlanSummary}`,
      "",
      "Conversation so far:",
      ...chatLines,
      "",
      "Local emuBro context:",
      normalizeText(payload.groundingContext, "No local context available."),
      "",
      "Reply rules:",
      "- Be conversational and concise.",
      "- If critical info is missing, ask up to 3 focused follow-up questions.",
      "- If this is a troubleshooting issue, provide concrete steps.",
      "- If this is a general app question, explain the exact emuBro feature/flow to use."
    ].join("\n");
  }

  function buildSupportPrompt(payload = {}) {
    if (normalizeSupportMode(payload.supportMode) === "chat") {
      return buildSupportChatPrompt(payload);
    }
    return buildSupportTroubleshootPrompt(payload);
  }

  return {
    buildSupportPrompt
  };
}

module.exports = {
  createSupportPrompts
};
