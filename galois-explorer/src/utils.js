export const buildInputs = fields =>
  Object.fromEntries(fields.map(f => [f.key, f.type === "select" ? (f.default ?? f.options[0]) : (f.default ?? "")]));

export const resolveUrl = (base, op, inputs) => {
  const path = op.path.replace(/:(\w+)/g, (_, k) => encodeURIComponent(inputs[k] ?? ""));
  return base.replace(/\/$/, "") + path;
};

export const buildBody = (op, inputs) => {
  if (op.method === "GET") return null;
  const raw = {};
  op.fields.forEach(f => { const v = (inputs[f.key] ?? "").trim(); if (v) raw[f.key] = v; });
  return JSON.stringify(raw);
};

export const parseApiError = json =>
  Array.isArray(json.detail)
    ? json.detail.map(e => `${e.loc?.slice(1).join(".")} — ${e.msg}`).join("\n")
    : (json.detail ?? JSON.stringify(json));

// ── NEW: Execution Control & Network Resiliency ──

/**
 * Prevents a function from being called too frequently.
 * Great for keyboard shortcuts or auto-saving.
 */
export const debounce = (func, wait = 300) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * A fetch wrapper that automatically aborts the request if it exceeds the timeout.
 * Prevents the UI from hanging infinitely if the backend is down/sleeping.
 */
export const fetchWithTimeout = async (url, options = {}, timeoutMs = 360000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000} seconds. The server might be sleeping.`);
    }
    throw error; // Re-throw network or CORS errors
  }
};