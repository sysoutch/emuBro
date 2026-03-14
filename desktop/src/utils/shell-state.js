function getDesktopBridge() {
  if (typeof window === "undefined" || !window.emubro) {
    return null;
  }
  return window.emubro;
}

function cloneJsonValue(value) {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || typeof value !== "object") {
    return value;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_error) {
    return value;
  }
}

function normalizeKey(key) {
  return String(key || "").trim();
}

export async function readNativeShellState(key, fallback = null) {
  const normalizedKey = normalizeKey(key);
  if (!normalizedKey) {
    return cloneJsonValue(fallback);
  }

  const bridge = getDesktopBridge();
  if (!bridge?.invoke) {
    return cloneJsonValue(fallback);
  }

  try {
    const result = await bridge.invoke("shell-state:get", {
      key: normalizedKey,
      fallback: cloneJsonValue(fallback)
    });
    if (result?.success) {
      return cloneJsonValue(result.value);
    }
  } catch (_error) {}

  return cloneJsonValue(fallback);
}

export async function writeNativeShellState(key, value) {
  const normalizedKey = normalizeKey(key);
  if (!normalizedKey) {
    return cloneJsonValue(value);
  }

  const bridge = getDesktopBridge();
  if (!bridge?.invoke) {
    return cloneJsonValue(value);
  }

  try {
    const result = await bridge.invoke("shell-state:set", {
      key: normalizedKey,
      value: cloneJsonValue(value)
    });
    if (result?.success) {
      return cloneJsonValue(result.value);
    }
  } catch (_error) {}

  return cloneJsonValue(value);
}

export async function deleteNativeShellState(key) {
  const normalizedKey = normalizeKey(key);
  if (!normalizedKey) {
    return false;
  }

  const bridge = getDesktopBridge();
  if (!bridge?.invoke) {
    return false;
  }

  try {
    const result = await bridge.invoke("shell-state:delete", {
      key: normalizedKey
    });
    return !!result?.success;
  } catch (_error) {
    return false;
  }
}
