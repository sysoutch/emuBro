function createHelpDocsService(deps = {}) {
  const path = deps.path;
  const fsSync = deps.fsSync;
  const log = deps.log || console;
  const getResourceRoots = typeof deps.getResourceRoots === "function" ? deps.getResourceRoots : (() => []);
  const additionalHelpRoots = Array.isArray(deps.additionalHelpRoots) ? deps.additionalHelpRoots : [];

  if (!path) throw new Error("createHelpDocsService requires path");
  if (!fsSync) throw new Error("createHelpDocsService requires fsSync");

  const ALLOWED_EXT = new Set([".html", ".htm", ".md", ".markdown", ".txt"]);

  function decodeHtmlEntities(value = "") {
    return String(value || "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'");
  }

  function normalizeText(value = "") {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function htmlToPlainText(html = "") {
    const noScripts = String(html || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ");
    const noTags = noScripts.replace(/<[^>]+>/g, " ");
    return normalizeText(decodeHtmlEntities(noTags));
  }

  function sanitizeHtmlForDisplay(html = "") {
    let safe = String(html || "");
    safe = safe.replace(/<script[\s\S]*?<\/script>/gi, "");
    safe = safe.replace(/<style[\s\S]*?<\/style>/gi, "");
    safe = safe.replace(/<iframe[\s\S]*?<\/iframe>/gi, "");
    safe = safe.replace(/<object[\s\S]*?<\/object>/gi, "");
    safe = safe.replace(/<embed[\s\S]*?>/gi, "");
    safe = safe.replace(/\son\w+="[^"]*"/gi, "");
    safe = safe.replace(/\son\w+='[^']*'/gi, "");
    safe = safe.replace(/\s(href|src)\s*=\s*(['"])javascript:[\s\S]*?\2/gi, " $1=\"#\"");
    return safe;
  }

  function readFileSafe(filePath = "") {
    try {
      if (!filePath || !fsSync.existsSync(filePath)) return "";
      return String(fsSync.readFileSync(filePath, "utf8") || "");
    } catch (_error) {
      return "";
    }
  }

  function collectHelpFiles() {
    const files = [];
    const resolvedResourceRoots = typeof getResourceRoots === "function" ? getResourceRoots() : [];
    const resourceRoots = Array.isArray(resolvedResourceRoots)
      ? resolvedResourceRoots
      : (typeof resolvedResourceRoots === "string" && resolvedResourceRoots ? [resolvedResourceRoots] : []);
    const scopedRoots = [];

    additionalHelpRoots.forEach((helpRoot) => {
      const normalized = String(helpRoot || "").trim();
      if (!normalized) return;
      scopedRoots.push({ helpRoot: normalized, idPrefix: "help" });
    });

    resourceRoots.forEach((resourceRoot) => {
      const normalized = String(resourceRoot || "").trim();
      if (!normalized) return;
      scopedRoots.push({ helpRoot: path.join(normalized, "help"), idPrefix: "help" });
    });

    scopedRoots.forEach(({ helpRoot, idPrefix }) => {
      if (!fsSync.existsSync(helpRoot)) return;
      const stack = [helpRoot];
      while (stack.length > 0) {
        const current = stack.pop();
        let entries = [];
        try {
          entries = fsSync.readdirSync(current, { withFileTypes: true });
        } catch (_error) {
          continue;
        }
        entries.forEach((entry) => {
          const full = path.join(current, entry.name);
          if (entry.isDirectory()) {
            stack.push(full);
            return;
          }
          if (!entry.isFile()) return;
          const ext = String(path.extname(entry.name) || "").toLowerCase();
          if (!ALLOWED_EXT.has(ext)) return;
          const relative = path.relative(helpRoot, full).split(path.sep).join("/");
          files.push({
            id: `${idPrefix}/${relative}`,
            filePath: full,
            ext
          });
        });
      }
    });

    const dedup = new Map();
    files.forEach((row) => {
      const key = String(row.id || "").toLowerCase();
      if (!key) return;
      if (dedup.has(key)) return;
      dedup.set(key, row);
    });
    return Array.from(dedup.values()).sort((a, b) => String(a.id || "").localeCompare(String(b.id || "")));
  }

  function inferTitle(id = "", text = "", ext = "") {
    const baseName = String(id || "").split("/").pop() || "Help";
    const fallback = baseName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "Help";
    if (ext === ".md" || ext === ".markdown" || ext === ".txt") {
      const firstLine = String(text || "").split(/\r?\n/).find((line) => String(line || "").trim());
      const mdTitle = String(firstLine || "").replace(/^#+\s*/, "").trim();
      return mdTitle || fallback;
    }
    const h1Match = String(text || "").match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1Match && h1Match[1]) return normalizeText(htmlToPlainText(h1Match[1])) || fallback;
    const titleMatch = String(text || "").match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch && titleMatch[1]) return normalizeText(htmlToPlainText(titleMatch[1])) || fallback;
    return fallback;
  }

  function toDocMeta(row = {}) {
    const content = readFileSafe(row.filePath);
    const plain = row.ext === ".html" || row.ext === ".htm" ? htmlToPlainText(content) : normalizeText(content);
    const title = inferTitle(row.id, content, row.ext);
    return {
      id: row.id,
      title,
      format: row.ext,
      preview: plain.slice(0, 220)
    };
  }

  function listDocs(options = {}) {
    const query = normalizeText(options.query || "").toLowerCase();
    const limit = Math.max(1, Math.min(500, Number(options.limit) || 200));
    const files = collectHelpFiles();
    const metas = files.map((row) => toDocMeta(row));
    if (!query) return metas.slice(0, limit);
    const qTokens = query.split(/\s+/).filter(Boolean);
    const scored = metas
      .map((doc) => {
        const hay = `${String(doc.title || "")} ${String(doc.preview || "")} ${String(doc.id || "")}`.toLowerCase();
        let score = 0;
        qTokens.forEach((token) => {
          if (hay.includes(token)) score += 1;
        });
        if (score <= 0) return null;
        return { score, doc };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((row) => row.doc);
  }

  function getDocById(id = "") {
    const key = String(id || "").trim().toLowerCase();
    if (!key) return null;
    const row = collectHelpFiles().find((entry) => String(entry.id || "").trim().toLowerCase() === key);
    if (!row) return null;
    const content = readFileSafe(row.filePath);
    const title = inferTitle(row.id, content, row.ext);
    const safeHtml = row.ext === ".html" || row.ext === ".htm"
      ? sanitizeHtmlForDisplay(content)
      : "";
    const plainText = row.ext === ".html" || row.ext === ".htm"
      ? htmlToPlainText(content)
      : String(content || "");
    return {
      id: row.id,
      title,
      format: row.ext,
      html: safeHtml,
      text: plainText
    };
  }

  function searchDocs(query = "", options = {}) {
    const normalized = normalizeText(query);
    const limit = Math.max(1, Math.min(12, Number(options.limit) || 6));
    const rows = listDocs({ query: normalized, limit: Math.max(limit, 30) }).slice(0, limit);
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      snippet: row.preview
    }));
  }

  return {
    listDocs,
    getDocById,
    searchDocs
  };
}

module.exports = {
  createHelpDocsService
};
