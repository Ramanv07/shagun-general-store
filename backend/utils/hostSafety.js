/**
 * Host Safety & Checkout Status Utilities
 */

export function isLiveHost(urlOrHost) {
  if (!urlOrHost) return false;
  const normalized = String(urlOrHost).toLowerCase().trim();
  if (/vercel\.app|shagunmart\.com|mongodb\.net/i.test(normalized)) {
    return true;
  }
  try {
    const parsed = normalized.includes('://') ? new URL(normalized) : new URL(`http://${normalized}`);
    const hostname = parsed.hostname;
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      return false;
    }
    return true;
  } catch {
    return /vercel\.app|shagunmart\.com/i.test(normalized);
  }
}

export function getDisplayHost(urlOrHost) {
  try {
    const parsed = String(urlOrHost).includes('://') ? new URL(String(urlOrHost)) : new URL(`http://${String(urlOrHost)}`);
    return parsed.host;
  } catch {
    return String(urlOrHost) || 'localhost:5000';
  }
}

export function isLiveHostBlocked(isDev, urlOrHost) {
  if (!isDev) {
    return false; // Production and Preview builds are NEVER blocked from communicating with their server
  }
  return isLiveHost(urlOrHost);
}

export function getCheckoutUpiStatusMessage(res, fetchError) {
  if (fetchError || !res) {
    return 'Could not reach the server';
  }
  if (!res.enabled) {
    return 'UPI is not set up';
  }
  return null;
}

