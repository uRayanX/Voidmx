/**
 * /proxy-auth — Tidal OAuth 2.0 Device Authorization Flow
 *
 * GET  /proxy-auth?action=init                  → start device auth
 * GET  /proxy-auth?action=poll&device_code=...  → poll for token
 * POST /proxy-auth?action=refresh               → body: {refresh_token}
 * GET  /proxy-auth?action=me                    → get user profile (needs Authorization header)
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Tidal Android TV client credentials — supports device_authorization grant type
// These are reverse-engineered public values used by multiple open-source clients.
const CLIENT_ID     = 'OQHDMoLASO4oRUqN';
const CLIENT_SECRET = 'lFGesn3CujisefBTDrKjSA==';
const AUTH_BASE     = 'https://auth.tidal.com/v1/oauth2';
const API_BASE      = 'https://api.tidal.com/v1';

function basicAuth() {
  return 'Basic ' + btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url    = new URL(request.url);
  const action = url.searchParams.get('action');

  // ── 1. Init device authorization ──────────────────────────────────────────
  if (action === 'init') {
    const res = await fetch(`${AUTH_BASE}/device_authorization`, {
      method: 'POST',
      headers: {
        'Authorization': basicAuth(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        scope: 'r_usr+w_usr+w_sub',
      }).toString(),
    });

    const data = await res.json();
    // Pass the raw Tidal error back so the UI can show it for debugging
    if (!res.ok) return json({
      error: data.error_description || data.error || 'Device auth init failed',
      tidal_status: res.status,
      tidal_raw: data,
    }, 400);

    return json({
      device_code:      data.device_code,
      user_code:        data.userCode || data.user_code,
      verification_uri: data.verificationUriComplete || `https://link.tidal.com/${data.userCode || data.user_code}`,
      expires_in:       data.expiresIn  || data.expires_in,
      interval:         data.interval   || 5,
    });
  }

  // ── 2. Poll for token ──────────────────────────────────────────────────────
  if (action === 'poll') {
    const device_code = url.searchParams.get('device_code');
    if (!device_code) return json({ error: 'Missing device_code' }, 400);

    const res = await fetch(`${AUTH_BASE}/token`, {
      method: 'POST',
      headers: {
        'Authorization': basicAuth(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id:   CLIENT_ID,
        device_code,
        grant_type:  'urn:ietf:params:oauth:grant-type:device_code',
        scope:       'r_usr+w_usr+w_sub',
      }).toString(),
    });

    const data = await res.json();

    if (res.status === 400 && data.error === 'authorization_pending') {
      return json({ status: 'pending' }, 202);
    }
    if (!res.ok) return json({ error: data.error || 'Poll failed', status: 'error' }, res.status);

    return json({
      status:        'success',
      access_token:  data.access_token,
      refresh_token: data.refresh_token,
      expires_in:    data.expires_in,
    });
  }

  // ── 3. Refresh access token ────────────────────────────────────────────────
  if (action === 'refresh' && request.method === 'POST') {
    let refresh_token;
    try { ({ refresh_token } = await request.json()); } catch {}
    if (!refresh_token) return json({ error: 'Missing refresh_token' }, 400);

    const res = await fetch(`${AUTH_BASE}/token`, {
      method: 'POST',
      headers: {
        'Authorization': basicAuth(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token,
        grant_type:    'refresh_token',
      }).toString(),
    });

    const data = await res.json();
    if (!res.ok) return json({ error: data.error || 'Refresh failed' }, res.status);

    return json({
      access_token:  data.access_token,
      refresh_token: data.refresh_token || refresh_token,
      expires_in:    data.expires_in,
    });
  }

  // ── 4. Get user profile ────────────────────────────────────────────────────
  if (action === 'me') {
    const auth = request.headers.get('Authorization');
    if (!auth) return json({ error: 'No token' }, 401);

    const res = await fetch(`${API_BASE}/sessions`, {
      headers: {
        'Authorization': auth,
        'X-Tidal-Token': CLIENT_ID,
      },
    });
    const data = await res.json();
    if (!res.ok) return json({ error: 'Failed to fetch profile' }, res.status);

    return json({
      userId:      data.userId,
      email:       data.email,
      countryCode: data.countryCode,
      username:    data.username || data.email,
    });
  }

  return json({ error: 'Unknown action' }, 400);
}
