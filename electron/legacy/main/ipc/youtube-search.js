function registerYouTubeSearchIpc(deps = {}) {
  const ipcMain = deps.ipcMain;
  const log = deps.log || console;
  const fetchImpl = deps.fetchImpl || fetch;

  if (!ipcMain || typeof ipcMain.handle !== "function") {
    throw new Error("registerYouTubeSearchIpc requires ipcMain");
  }
  if (typeof fetchImpl !== "function") {
    throw new Error("registerYouTubeSearchIpc requires fetch implementation");
  }

  function extractYouTubeInitialData(html) {
    const source = String(html || "");
    const marker = "var ytInitialData = ";
    const markerIndex = source.indexOf(marker);
    if (markerIndex < 0) return null;

    const start = markerIndex + marker.length;
    const endMarker = ";</script>";
    let end = source.indexOf(endMarker, start);
    if (end < 0) {
      end = source.indexOf(";\n", start);
    }
    if (end < 0) return null;

    const raw = source.slice(start, end).trim();
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch (_error) {
      return null;
    }
  }

  function readRendererText(node) {
    if (!node || typeof node !== "object") return "";
    if (typeof node.simpleText === "string") return node.simpleText.trim();
    if (Array.isArray(node.runs)) {
      return node.runs
        .map((part) => String(part?.text || "").trim())
        .filter(Boolean)
        .join("");
    }
    return "";
  }

  function collectYouTubeVideoEntries(initialData, limit = 8) {
    const max = Math.max(1, Math.min(20, Number(limit) || 8));
    const entries = [];
    const seen = new Set();

    const visit = (node) => {
      if (!node || entries.length >= max) return;

      if (Array.isArray(node)) {
        for (const item of node) {
          visit(item);
          if (entries.length >= max) break;
        }
        return;
      }

      if (typeof node !== "object") return;

      const renderer = node.videoRenderer;
      if (renderer && entries.length < max) {
        const id = String(renderer.videoId || "").trim();
        if (id && !seen.has(id)) {
          seen.add(id);
          const title = readRendererText(renderer.title) || "YouTube Result";
          const channel = readRendererText(renderer.ownerText) || readRendererText(renderer.longBylineText) || "";
          const thumb = renderer?.thumbnail?.thumbnails;
          const thumbnail = Array.isArray(thumb) && thumb.length
            ? String(thumb[thumb.length - 1]?.url || "").trim()
            : `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

          entries.push({
            videoId: id,
            title,
            channel,
            url: `https://www.youtube.com/watch?v=${id}`,
            embedUrl: `https://www.youtube.com/embed/${id}`,
            thumbnail
          });
        }
      }

      for (const value of Object.values(node)) {
        visit(value);
        if (entries.length >= max) break;
      }
    };

    visit(initialData);
    return entries;
  }

  ipcMain.handle("youtube:search-videos", async (_event, payload = {}) => {
    try {
      const query = String(payload?.query || "").trim();
      const limit = Math.max(1, Math.min(12, Number(payload?.limit) || 8));
      if (!query) return { success: false, message: "Missing YouTube search query", results: [] };

      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      const response = await fetchImpl(searchUrl, {
        method: "GET",
        headers: {
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
          "accept-language": "en-US,en;q=0.9"
        }
      });

      if (!response.ok) {
        return {
          success: false,
          message: `YouTube search failed with status ${response.status}`,
          query,
          searchUrl,
          results: []
        };
      }

      const html = await response.text();
      const initialData = extractYouTubeInitialData(html);
      let results = collectYouTubeVideoEntries(initialData, limit);

      if (!results.length) {
        const fallbackMatches = [...html.matchAll(/"videoId":"([A-Za-z0-9_-]{11})"/g)];
        const seen = new Set();
        results = fallbackMatches
          .map((match) => String(match?.[1] || "").trim())
          .filter((id) => id && !seen.has(id) && seen.add(id))
          .slice(0, limit)
          .map((id) => ({
            videoId: id,
            title: "YouTube Result",
            channel: "",
            url: `https://www.youtube.com/watch?v=${id}`,
            embedUrl: `https://www.youtube.com/embed/${id}`,
            thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
          }));
      }

      return {
        success: true,
        query,
        searchUrl,
        results
      };
    } catch (error) {
      log.error("youtube:search-videos failed:", error);
      return {
        success: false,
        message: error.message || "Failed to search YouTube",
        results: []
      };
    }
  });
}

module.exports = {
  registerYouTubeSearchIpc
};
