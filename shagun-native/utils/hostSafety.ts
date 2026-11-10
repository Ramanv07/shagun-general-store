/**
 * Host Safety & Checkout Status Utilities (shagun-native)
 */

export function isLocalOrPrivateHost(urlOrHost: string | null | undefined): boolean {
  if (!urlOrHost) return false;
  const raw = String(urlOrHost).trim();
  try {
    const parsed = raw.includes('://') ? new URL(raw) : new URL(`http://${raw}`);
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '10.0.2.2' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function isLiveHost(urlOrHost: string | null | undefined): boolean {
  if (!urlOrHost) return false;
  return !isLocalOrPrivateHost(urlOrHost);
}

export function getDisplayHost(urlOrHost: string | null | undefined): string {
  try {
    const parsed = String(urlOrHost).includes('://') ? new URL(String(urlOrHost)) : new URL(`http://${String(urlOrHost)}`);
    return parsed.host;
  } catch {
    return String(urlOrHost) || 'localhost:5000';
  }
}

export function isHostBlocked(
  appEnv: 'development' | 'preview' | 'production' | string | undefined,
  urlOrHost: string | null | undefined,
  productionApiHost?: string | null
): boolean {
  const env = (appEnv || 'development').toLowerCase();
  if (env === 'production') {
    return false;
  }
  if (env === 'preview') {
    if (!productionApiHost || !urlOrHost) return false;
    const currentHost = getDisplayHost(urlOrHost).toLowerCase();
    const prodHost = getDisplayHost(productionApiHost).toLowerCase();
    return Boolean(currentHost && prodHost && currentHost === prodHost);
  }
  return isLiveHost(urlOrHost);
}

export function isLiveHostBlocked(isDev: boolean, urlOrHost: string | null | undefined): boolean {
  if (!isDev) {
    return false;
  }
  return isLiveHost(urlOrHost);
}

export function validateProductionApiUrl(url: string | null | undefined): { valid: boolean; error?: string } {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return { valid: false, error: 'API URL is required for production builds' };
  }
  const trimmed = url.trim();
  if (trimmed.includes('<') || trimmed.includes('>')) {
    return { valid: false, error: 'API URL cannot contain "<" or ">" placeholders' };
  }
  if (trimmed.includes('YOUR')) {
    return { valid: false, error: 'API URL cannot contain "YOUR" placeholders' };
  }
  if (/^http:\/\//i.test(trimmed)) {
    return { valid: false, error: 'Production API URL must use HTTPS, not HTTP' };
  }
  if (!/^https:\/\//i.test(trimmed) && trimmed.startsWith('/')) {
    return { valid: true };
  }
  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '10.0.2.2' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      return { valid: false, error: `Production API URL cannot use localhost or private IP (${hostname})` };
    }
  } catch {
    return { valid: false, error: 'Invalid API URL format' };
  }
  return { valid: true };
}

export function getCheckoutUpiStatusMessage(
  res: { enabled?: boolean } | null | undefined,
  fetchError?: Error | string | null
): string | null {
  if (fetchError || !res) {
    return 'Could not reach the server';
  }
  if (!res.enabled) {
    return 'UPI is not set up';
  }
  return null;
}

