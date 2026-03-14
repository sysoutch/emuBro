export function escapeSupportHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInlineMarkdown(input) {
  let html = escapeSupportHtml(input);
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi, (_match, label, url) => {
    const safeLabel = escapeSupportHtml(label);
    const safeUrl = escapeSupportHtml(url);
    return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeLabel}</a>`;
  });
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return html;
}

export function renderSupportMarkdown(input) {
  const source = String(input || "").replace(/\r\n?/g, "\n");
  if (!source.trim()) {
    return `<p>${escapeSupportHtml("No content available.")}</p>`;
  }

  const lines = source.split("\n");
  const output = [];
  let inCodeBlock = false;
  let codeBuffer = [];
  let paragraphBuffer = [];
  let listType = null;
  let listItems = [];

  const flushParagraph = () => {
    if (!paragraphBuffer.length) return;
    const paragraph = paragraphBuffer.join(" ").trim();
    if (paragraph) {
      output.push(`<p>${renderInlineMarkdown(paragraph)}</p>`);
    }
    paragraphBuffer = [];
  };

  const flushList = () => {
    if (!listType || !listItems.length) {
      listType = null;
      listItems = [];
      return;
    }
    output.push(
      `<${listType}>${listItems.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</${listType}>`
    );
    listType = null;
    listItems = [];
  };

  lines.forEach((rawLine) => {
    const line = String(rawLine || "");
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      flushParagraph();
      flushList();
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBuffer = [];
      } else {
        output.push(`<pre><code>${escapeSupportHtml(codeBuffer.join("\n"))}</code></pre>`);
        codeBuffer = [];
        inCodeBlock = false;
      }
      return;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      return;
    }

    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = Math.min(headingMatch[1].length + 1, 4);
      output.push(`<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`);
      return;
    }

    const bulletMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      flushParagraph();
      if (listType !== "ul") {
        flushList();
        listType = "ul";
      }
      listItems.push(bulletMatch[1]);
      return;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph();
      if (listType !== "ol") {
        flushList();
        listType = "ol";
      }
      listItems.push(orderedMatch[1]);
      return;
    }

    flushList();
    paragraphBuffer.push(trimmed);
  });

  if (inCodeBlock) {
    output.push(`<pre><code>${escapeSupportHtml(codeBuffer.join("\n"))}</code></pre>`);
  }

  flushParagraph();
  flushList();

  return output.join("");
}

export function renderSupportDoc(doc, emptyFallback = "Select a help topic to read it here.") {
  if (!doc || typeof doc !== "object") {
    return renderSupportMarkdown(emptyFallback);
  }

  const format = String(doc.format || "").trim().toLowerCase();
  const html = String(doc.html || "").trim();
  const text = String(doc.text || doc.content || doc.body || "").trim();

  if ((format === ".html" || format === ".htm") && html) {
    return html;
  }

  return renderSupportMarkdown(text || emptyFallback);
}
