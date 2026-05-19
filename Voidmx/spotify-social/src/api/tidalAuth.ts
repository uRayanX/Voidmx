/**
 * Tidal OAuth token management — client side.
 *
 * Storage strategy (most → least reliable):
 *   1. localStorage  — fast, survives refresh, cleared by browser occasionally
 *   2. cookie        — survives iOS Safari ITP localStorage clearing (7-day wipe)
 *
 * Tokens are never sent to git or third-party servers.
 * The access token is only used as an Authorization header to our own proxy.
 */

const KEYS = {
  ACCESS:   'TIDAL_ACCESS_TOKEN',
  REFRESH:  'TIDAL_REFRESH_TOKEN',
  EXPIRES:  'TIDAL_TOKEN_EXPIRES',  // unix ms
  COUNTRY:  'TIDAL_COUNTRY_CODE',
  USERNAME: 'TIDAL_USERNAME',
};

const PROXY_BASE = 'https://void-cyz.pages.dev';

export interface TidalTokenData {
  accessToken:  string;
  refreshToken: string;
  expiresAt:    number;  // unix ms
  countryCode:  string;
  username:     string;
}

// ── Cookie helpers ─────────────────────────────────────────────────────────────

function setCookie(name: string, value: string, maxAgeSec: number) {
  try {
    document.cookie =
      `${name}=${encodeURIComponent(value)}; max-age=${maxAgeSec}; path=/; SameSite=Strict`;
  } catch {}
}

function getCookie(name: string): string | null {
  try {
    const entry = document.cookie
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith(`${name}=`));
    return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null;
  } catch { return null; }
}

function deleteCookie(name: string) {
  try { document.cookie = `${name}=; max-age=0; path=/`; } catch {}
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function getTidalToken(): TidalTokenData | null {
  try {
    // Primary: localStorage
    let accessToken = localStorage.getItem(KEYS.ACCESS);

    // Fallback: cookie (iOS Safari clears localStorage after 7 days of no visit)
    if (!accessToken) {
      accessToken = getCookie(KEYS.ACCESS);
      if (accessToken) {
        // Restore full token back to localStorage from cookie
        localStorage.setItem(KEYS.ACCESS, accessToken);
        const refresh  = getCookie(KEYS.REFRESH);
        const expires  = getCookie(KEYS.EXPIRES);
        const country  = getCookie(KEYS.COUNTRY);
        const username = getCookie(KEYS.USERNAME);
        if (refresh)  localStorage.setItem(KEYS.REFRESH,  refresh);
        if (expires)  localStorage.setItem(KEYS.EXPIRES,  expires);
        if (country)  localStorage.setItem(KEYS.COUNTRY,  country);
        if (username) localStorage.setItem(KEYS.USERNAME, username);
      }
    }

    // BUG FIX: don't require refreshToken — manual pastes have refresh_token = ''
    if (!accessToken) return null;

    const refreshToken = localStorage.getItem(KEYS.REFRESH) || '';
    const expiresAt    = Number(localStorage.getItem(KEYS.EXPIRES) || 0);
    const countryCode  = localStorage.getItem(KEYS.COUNTRY) || 'US';
    const username     = localStorage.getItem(KEYS.USERNAME) || '';

    return { accessToken, refreshToken, expiresAt, countryCode, username };
  } catch { return null; }
}

export function getTidalAccessToken(): string | null {
  return localStorage.getItem(KEYS.ACCESS) || getCookie(KEYS.ACCESS);
}

export function saveTidalToken(data: {
  access_token:  string;
  refresh_token: string;
  expires_in:    number;
  countryCode?:  string;
  username?:     string;
}) {
  try {
    const expiresAt = Date.now() + data.expires_in * 1000;
    const maxAge    = data.expires_in;

    // Save to localStorage
    localStorage.setItem(KEYS.ACCESS,   data.access_token);
    localStorage.setItem(KEYS.REFRESH,  data.refresh_token);
    localStorage.setItem(KEYS.EXPIRES,  String(expiresAt));
    if (data.countryCode) localStorage.setItem(KEYS.COUNTRY,  data.countryCode);
    if (data.username)    localStorage.setItem(KEYS.USERNAME, data.username);

    // Also save to cookies as fallback persistence layer
    setCookie(KEYS.ACCESS,  data.access_token,  maxAge);
    setCookie(KEYS.REFRESH, data.refresh_token, maxAge);
    setCookie(KEYS.EXPIRES, String(expiresAt),  maxAge);
    if (data.countryCode) setCookie(KEYS.COUNTRY,  data.countryCode, maxAge);
    if (data.username)    setCookie(KEYS.USERNAME, data.username,    maxAge);
  } catch {}
}

export function clearTidalToken() {
  try {
    Object.values(KEYS).forEach(k => {
      localStorage.removeItem(k);
      deleteCookie(k);
    });
  } catch {}
}

export function isTidalTokenExpired(): boolean {
  try {
    const exp = Number(localStorage.getItem(KEYS.EXPIRES) || getCookie(KEYS.EXPIRES) || 0);
    if (!exp) return false; // no expiry set (old save) → assume valid
    return Date.now() >= exp - 60_000; // 1 min buffer
  } catch { return false; }
}

/** Refresh access token using the stored refresh token. Returns true on success. */
export async function refreshTidalToken(): Promise<boolean> {
  const token = getTidalToken();
  // Manual pastes have no refresh token — cannot refresh, user re-pastes on expiry
  if (!token?.refreshToken) return false;
  try {
    const res = await fetch(`${PROXY_BASE}/proxy-auth?action=refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: token.refreshToken }),
    });
    if (!res.ok) { clearTidalToken(); return false; }
    const data = await res.json();
    saveTidalToken({
      access_token:  data.access_token,
      refresh_token: data.refresh_token || token.refreshToken,
      expires_in:    data.expires_in || 3600,
    });
    return true;
  } catch { return false; }
}

/**
 * Returns a valid access token, auto-refreshing if expired.
 * For manually-pasted tokens (no refresh_token), returns the token as-is
 * until it expires — then returns null so the user can re-paste.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const token = getTidalToken();
  if (!token) return null;

  if (isTidalTokenExpired()) {
    if (token.refreshToken) {
      const ok = await refreshTidalToken();
      if (!ok) return null;
    } else {
      // No refresh token (manual paste) — token is genuinely expired
      return null;
    }
  }

  return localStorage.getItem(KEYS.ACCESS) || getCookie(KEYS.ACCESS);
}

// ── Device Authorization Flow (kept for future use) ──────────────────────────

export interface DeviceAuthInit {
  device_code:      string;
  user_code:        string;
  verification_uri: string;
  expires_in:       number;
  interval:         number;
}

export async function initDeviceAuth(): Promise<DeviceAuthInit> {
  const res  = await fetch(`${PROXY_BASE}/proxy-auth?action=init`);
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error || data?.tidal_raw?.error_description || 'Failed to start Tidal login';
    throw new Error(`Tidal: ${msg} (${data?.tidal_status ?? res.status})`);
  }
  return data;
}

export async function pollDeviceAuth(
  deviceCode: string,
  intervalSec: number,
  onPending?: () => void,
): Promise<void> {
  const maxAttempts = Math.ceil(600 / intervalSec);

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, intervalSec * 1000));

    const res = await fetch(
      `${PROXY_BASE}/proxy-auth?action=poll&device_code=${encodeURIComponent(deviceCode)}`,
    );

    if (res.status === 202) { onPending?.(); continue; }
    if (!res.ok) throw new Error('Tidal login failed or expired');

    const data = await res.json();
    if (data.status !== 'success') throw new Error(data.error || 'Login failed');

    saveTidalToken({
      access_token:  data.access_token,
      refresh_token: data.refresh_token,
      expires_in:    data.expires_in || 604800,
    });

    try {
      const meRes = await fetch(`${PROXY_BASE}/proxy-auth?action=me`, {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      if (meRes.ok) {
        const me = await meRes.json();
        if (me.countryCode) {
          localStorage.setItem(KEYS.COUNTRY, me.countryCode);
          setCookie(KEYS.COUNTRY, me.countryCode, 604800);
        }
        if (me.username) {
          localStorage.setItem(KEYS.USERNAME, me.username);
          setCookie(KEYS.USERNAME, me.username, 604800);
        }
      }
    } catch {}

    return;
  }

  throw new Error('Tidal login timed out');
}
