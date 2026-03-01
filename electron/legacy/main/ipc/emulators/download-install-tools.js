function createDownloadInstallTools(deps = {}) {
  const {
    path,
    fsSync,
    Readable,
    pipeline,
    fetchFn,
    normalizeDownloadOsKey
  } = deps;

  if (!path) throw new Error("createDownloadInstallTools requires path");
  if (!fsSync) throw new Error("createDownloadInstallTools requires fsSync");
  if (!Readable) throw new Error("createDownloadInstallTools requires Readable");
  if (typeof pipeline !== "function") throw new Error("createDownloadInstallTools requires pipeline");
  if (typeof fetchFn !== "function") throw new Error("createDownloadInstallTools requires fetchFn");
  if (typeof normalizeDownloadOsKey !== "function") throw new Error("createDownloadInstallTools requires normalizeDownloadOsKey");

  function compileRegexOrNull(pattern) {
    const source = String(pattern || "").trim();
    if (!source) return null;
    try {
      return new RegExp(source, "i");
    } catch (_e) {
      return null;
    }
  }

  function extractFilenameFromContentDisposition(value) {
    const header = String(value || "").trim();
    if (!header) return "";
    const utf8 = header.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8 && utf8[1]) {
      try {
        return decodeURIComponent(utf8[1]).trim();
      } catch (_e) {}
    }
    const plain = header.match(/filename=\"?([^\";]+)\"?/i);
    if (plain && plain[1]) return String(plain[1]).trim();
    return "";
  }

  async function downloadUrlToFile(url, targetPath) {
    const res = await fetchFn(url, {
      headers: {
        Accept: "*/*",
        "User-Agent": "emuBro"
      },
      redirect: "follow"
    });

    if (!res.ok) throw new Error(`Download failed (${res.status})`);
    if (!res.body) throw new Error("Download returned empty response");

    fsSync.mkdirSync(path.dirname(targetPath), { recursive: true });
    await pipeline(Readable.fromWeb(res.body), fsSync.createWriteStream(targetPath));

    return {
      contentType: String(res.headers.get("content-type") || "").trim(),
      fileNameFromHeader: extractFilenameFromContentDisposition(res.headers.get("content-disposition"))
    };
  }

  function findEmulatorBinaryInFolder(rootDir, searchString, osKey) {
    const root = String(rootDir || "").trim();
    if (!root || !fsSync.existsSync(root)) return "";

    const matcher = compileRegexOrNull(searchString);
    const normalizedOs = normalizeDownloadOsKey(osKey);
    const fallbackCandidates = [];
    const queue = [root];
    let visitedDirs = 0;

    while (queue.length > 0 && visitedDirs < 10000) {
      const current = queue.shift();
      visitedDirs += 1;

      let entries = [];
      try {
        entries = fsSync.readdirSync(current, { withFileTypes: true });
      } catch (_e) {
        continue;
      }

      for (const entry of entries) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          if (normalizedOs === "mac" && entry.name.toLowerCase().endsWith(".app")) {
            if (!matcher || matcher.test(entry.name)) return full;
            fallbackCandidates.push(full);
            continue;
          }
          queue.push(full);
          continue;
        }

        if (!entry.isFile()) continue;
        const filename = entry.name;
        const lowerName = filename.toLowerCase();
        if (matcher && (matcher.test(filename) || matcher.test(full))) return full;

        if (normalizedOs === "windows" && lowerName.endsWith(".exe")) {
          fallbackCandidates.push(full);
        } else if (normalizedOs === "linux" && (lowerName.endsWith(".appimage") || !path.extname(lowerName))) {
          fallbackCandidates.push(full);
        } else if (normalizedOs === "mac" && lowerName.endsWith(".app")) {
          fallbackCandidates.push(full);
        }
      }
    }

    return fallbackCandidates[0] || "";
  }

  return {
    downloadUrlToFile,
    findEmulatorBinaryInFolder
  };
}

module.exports = {
  createDownloadInstallTools
};
