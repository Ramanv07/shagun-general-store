/**
 * Validates and sanitizes a redirect target URL.
 * Accepts only same-origin relative paths starting with a single '/'
 * Strictly rejects protocol-relative ('//'), backslashes ('\'), absolute URLs, and pseudo-protocols (javascript:, data:).
 */
export function sanitizeRedirectUrl(target, fallback = '/') {
  if (typeof target !== 'string') return fallback;
  const trimmed = target.trim();
  if (!trimmed) return fallback;

  // Must start with exactly one '/' and not followed by another '/' or '\'
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return fallback;
  }

  // Reject any backslashes in the path (e.g. /\evil.com, /path\evil)
  if (trimmed.includes('\\')) {
    return fallback;
  }

  // Reject explicit protocol/scheme indicators
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return fallback;
  }

  try {
    const dummyOrigin = 'http://localhost';
    const parsed = new URL(trimmed, dummyOrigin);
    // Origin must remain identical to the dummy origin
    if (parsed.origin !== dummyOrigin) {
      return fallback;
    }
    // Return relative path + search + hash
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return fallback;
  }
}

