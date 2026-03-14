export function normalizeTagId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeTagIds(values) {
  const seen = new Set();
  return (Array.isArray(values) ? values : [])
    .map((value) => normalizeTagId(value))
    .filter(Boolean)
    .filter((value) => {
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
}

export function formatTagLabel(tagId) {
  const key = normalizeTagId(tagId);
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase()) || "Unknown";
}

export function dedupeTagRows(rows) {
  const seen = new Set();
  return (Array.isArray(rows) ? rows : [])
    .map((row) => {
      const id = normalizeTagId(row?.id);
      if (!id || id === "all") {
        return null;
      }
      const label = String(row?.label || row?.name || row?.id || "").trim() || formatTagLabel(id);
      return { id, label };
    })
    .filter(Boolean)
    .filter((row) => {
      if (seen.has(row.id)) {
        return false;
      }
      seen.add(row.id);
      return true;
    });
}
