/**
 * /proxy-tidal — Cloudflare Pages Function
 *
 * Proxies Tidal API streaming calls using the user's personal access token.
 * Geo-bypass: Cloudflare edge makes the request, not the user's browser.
 *
 * Key behaviours:
 * - Uses ONLY the Bearer token (no X-Tidal-Token) — web tokens are self-sufficient
 * - Forces countryCode=US so Tidal serves FLAC for lossless tiers
 * - Decodes DASH manifests server-side → returns direct audio URL
 * - Includes ?debug=1&trackId=123 endpoint to inspect raw Tidal responses
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const TIDAL_API    = 'https://api.tidal.com/v1';
// Developer app credentials (OpenTidal developer portal)
const TIDAL_CLIENT_ID = 'SnXphZybGTJqmmEV';

const QUALITY_FALLBACK = {
  HI_RES_LOSSLESS: ['HI_RES_LOSSLESS', 'LOSSLESS', 'HIGH'],
  LOSSLESS:        ['LOSSLESS', 'HIGH'],
  HIGH:            ['HIGH'],
  LOW:             ['LOW'],
};

// ── DASH parsing ──────────────────────────────────────────────────────────────
function parseDash(xml) {
  let mimeType = 'audio/mp4';
  if (/codecs=["']flac["']/i.test(xml)) mimeType = 'audio/mp4';
  if (/codecs=["']alac["']/i.test(xml)) mimeType = 'audio/mp4';
  if (/mimeType=["']audio\/flac["']/i.test(xml)) mimeType = 'audio/flac';

  const segListUrls = [...xml.matchAll(/media="([^"]+)"/g)]
    .map(m => m[1].trim())
    .filter(u => u.startsWith('http'));
  const initListMatch = xml.match(/initialization="([^"]+)"/);
  const initListUrl   = initListMatch?.[1]?.startsWith('http') ? initListMatch[1] : null;

  if (segListUrls.length > 0) return { mimeType, initUrl: initListUrl, urls: segListUrls };

  const baseMatch = xml.match(/<BaseURL[^>]*>([^<]+)<\/BaseURL>/);
  const base      = baseMatch ? baseMatch[1].trim() : '';

  const mediaMatch = xml.match(/\bmedia="([^"]+)"/);
  const initMatch  = xml.match(/\binitialization="([^"]+)"/);
  if (!mediaMatch) return null;

  const mediaTemplate = mediaMatch[1];
  const urls = [];
  let segNum = 0;
  for (const s of xml.matchAll(/<S\b[^>]+>/g)) {
    const rAttr = s[0].match(/\br="(\d+)"/);
    const count = rAttr ? parseInt(rAttr[1]) + 1 : 1;
    for (let i = 0; i < count; i++) {
      const path = mediaTemplate.replace(/\$Number%?\d*d?\$/g, String(segNum));
      urls.push((path.startsWith('http') ? '' : base) + path);
      segNum++;
    }
  }

  const initTemplate = initMatch?.[1];
  const initPath = initTemplate ? (initTemplate.startsWith('http') ? initTemplate : base + initTemplate) : null;

  return { mimeType, initUrl: initPath, urls };
}

// ── Country code cache ───────────────────────────────────────────────────────
// We need the account's REAL country (e.g. ES for Spain) not a hardcoded US,
// because Tidal checks subscription coverage against countryCode.
const _countryCache = new Map();

async function getCountryCode(token) {
  const key = token.slice(-16);
  if (_countryCache.has(key)) return _countryCache.get(key);
  try {
    const res = await fetch(`${TIDAL_API}/sessions`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      const cc = data.countryCode || 'ES';
      _countryCache.set(key, cc);
      return cc;
    }
  } catch {}
  return 'ES'; // Spain default (user confirmed account is ES)
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

// ── DASH manifest → direct URL ────────────────────────────────────────────────

function extractUrlsFromDash(xml) {
  const urls = [];
  const baseUrlRegex = /<BaseURL[^>]*>([^<]+)<\/BaseURL>/g;
  let m;
  while ((m = baseUrlRegex.exec(xml)) !== null) {
    const url = m[1].trim();
    if (url.startsWith('http')) urls.push(url);
  }
  if (urls.length === 0) {
    const baseMatch = xml.match(/<BaseURL[^>]*>([^<]*)<\/BaseURL>/);
    const tmplMatch = xml.match(/media="([^"]+)"/);
    if (baseMatch && tmplMatch) {
      const base    = baseMatch[1].trim();
      const segment = tmplMatch[1].replace('$Number$', '0').replace('$Number%', '0');
      const full    = base + segment;
      if (full.startsWith('http')) urls.push(full);
    }
  }
  return urls;
}

function normalizeMimeType(dashXml, fallback) {
  if (dashXml.includes('codecs="flac"') || dashXml.includes("codecs='flac'") || dashXml.includes('.flac'))
    return 'audio/flac';
  if (dashXml.includes('mp4a') || dashXml.includes('.mp4') || dashXml.includes('.m4a'))
    return 'audio/mp4';
  return fallback || 'audio/flac';
}

function repackageManifest(data) {
  const raw = data.manifest;
  if (!raw) return data;

  let decoded;
  try { decoded = atob(raw); } catch { return data; }

  // Already JSON with urls array
  try {
    const parsed = JSON.parse(decoded);
    if (parsed.urls && Array.isArray(parsed.urls) && parsed.urls.length > 0) return data;
  } catch {}

  // DASH XML — extract direct audio URL
  if (decoded.includes('<MPD') || decoded.includes('urn:mpeg:dash')) {
    const urls = extractUrlsFromDash(decoded);
    if (urls.length === 0) return null;
    const mimeType = normalizeMimeType(decoded, data.manifestMimeType);
    return {
      ...data,
      manifestMimeType: mimeType,
      manifest: btoa(JSON.stringify({ mimeType, urls })),
    };
  }

  return data;
}

// ── Fetch stream info ─────────────────────────────────────────────────────────

// Base URL of this Cloudflare Pages deployment (used to build proxy-stream URLs)
const SELF_BASE = 'https://void-cyz.pages.dev';

async function fetchStreamInfo(token, trackId, quality, countryCode, clientIp) {
  const qualities = QUALITY_FALLBACK[quality] || [quality];
  const errors    = [];

  for (const q of qualities) {
    // ── 1. Try OFFLINE mode first (returns direct URL, no DASH complications) ──
    const offlineUrl = `${TIDAL_API}/tracks/${trackId}/playbackinfopostpaywall` +
      `?audioquality=${q}&playbackmode=OFFLINE&assetpresentation=FULL&countryCode=${countryCode}&deviceType=BROWSER`;

    const offRes = await fetch(offlineUrl, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'X-Forwarded-For': clientIp || '',
        'True-Client-IP': clientIp || ''
      },
    });

    if (offRes.ok) {
      let data;
      try { data = await offRes.json(); } catch { errors.push(`${q}:offline_json_parse`); }
      if (data) {
        const repackaged = repackageManifest(data);
        if (repackaged) return { ok: true, data: repackaged, quality: q };
        errors.push(`${q}:offline_dash_not_resolvable`);
      }
    } else {
      const errText = await offRes.text().catch(() => '');
      errors.push(`${q}:offline_${offRes.status}:${errText.slice(0, 100)}`);

      // 401 with subStatus 4005 = "Asset not ready for playback" (streaming-only license)
      // Hard 401/403 auth failure = stop trying
      if (offRes.status === 401 || offRes.status === 403) {
        let isAssetNotReady = false;
        try { isAssetNotReady = JSON.parse(errText)?.subStatus === 4005; } catch {}
        if (!isAssetNotReady) {
          return { ok: false, status: offRes.status, error: errors.at(-1), errors };
        }
        // subStatus 4005: fall through to STREAM mode below
      }
    }

    // ── 2. OFFLINE unavailable → use STREAM mode ──────────────
    // Cloudflare Workers are blocked by Tidal's media CDN (403), so we parse the
    // DASH segments server-side and return the array of CDN URLs to the frontend.
    // The frontend browser will fetch and concatenate them (bypassing the IP block).
    const streamUrl = `${TIDAL_API}/tracks/${trackId}/playbackinfopostpaywall` +
      `?audioquality=${q}&playbackmode=STREAM&assetpresentation=FULL&countryCode=${countryCode}&deviceType=BROWSER`;

    const streamRes = await fetch(streamUrl, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'X-Forwarded-For': clientIp || '',
        'True-Client-IP': clientIp || ''
      },
    });

    if (streamRes.ok) {
      const streamData = await streamRes.json();
      const rawManifest = streamData.manifest;
      if (rawManifest) {
        let decoded = '';
        try { decoded = atob(rawManifest); } catch {}
        
        // If JSON manifest (direct url)
        try {
          const mj = JSON.parse(decoded);
          if (mj.urls?.length > 0) {
            return {
              ok: true,
              data: {
                audioQuality: q,
                manifestMimeType: mj.mimeType || streamData.manifestMimeType || 'audio/flac',
                manifest: btoa(JSON.stringify({ urls: mj.urls }))
              },
              quality: q
            };
          }
        } catch {}

        // If DASH manifest
        if (decoded.includes('<MPD') || decoded.includes('urn:mpeg:dash')) {
          const dash = parseDash(decoded);
          if (dash && dash.urls.length > 0) {
            const allUrls = dash.initUrl ? [dash.initUrl, ...dash.urls] : dash.urls;
            // Clean &amp; in URLs
            const cleanUrls = allUrls.map(u => u.replace(/&amp;/g, '&'));
            return {
              ok: true,
              data: {
                audioQuality: q,
                manifestMimeType: dash.mimeType,
                manifest: btoa(JSON.stringify({ type: 'SEGMENTS', urls: cleanUrls }))
              },
              quality: q
            };
          }
        }
      }
    }

    const streamErr = await streamRes.text().catch(() => '');
    errors.push(`${q}:stream_${streamRes.status}:${streamErr.slice(0, 100)}`);
    if (streamRes.status === 401 || streamRes.status === 403) {
      return { ok: false, status: streamRes.status, error: errors.at(-1), errors };
    }
  }

  return { ok: false, status: 404, error: 'No streamable quality available', errors };
}


// ── Main handler ──────────────────────────────────────────────────────────────

export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return json({ error: 'No Tidal token' }, 401);
  }
  const accessToken = authHeader.slice(7);

  const url     = new URL(request.url);
  const apiPath = url.searchParams.get('path') || '';

  // ── /track/?id=123&quality=LOSSLESS ────────────────────────────────────────
  const trackMatch = apiPath.match(/\/track\/\?id=(\d+)(?:.*quality=([A-Z_]+))?/);
  if (trackMatch) {
    const trackId = trackMatch[1];
    const quality = trackMatch[2] || 'LOSSLESS';
    const countryCode = await getCountryCode(accessToken);
    const clientIp = request.headers.get('CF-Connecting-IP') || '';
    const result  = await fetchStreamInfo(accessToken, trackId, quality, countryCode, clientIp);

    if (!result.ok) {
      return json(
        { error: result.error, errors: result.errors, fallback: true },
        result.status === 401 ? 401 : 404
      );
    }
    return json(result.data);
  }

  // ── Debug endpoint: GET /proxy-tidal?debug=1&trackId=123[&quality=LOSSLESS] ─
  // Returns the raw Tidal API response so you can see exactly what Tidal says.
  if (url.searchParams.get('debug') === '1') {
    const trackId = url.searchParams.get('trackId');
    const quality = url.searchParams.get('quality') || 'LOSSLESS';
    if (!trackId) return json({ error: 'debug requires trackId param' }, 400);

    const cc = await getCountryCode(accessToken);
    const base = `${TIDAL_API}/tracks/${trackId}/playbackinfopostpaywall` +
      `?audioquality=${quality}&assetpresentation=FULL&countryCode=${cc}&deviceType=BROWSER`;

    const [offRes, strRes] = await Promise.all([
      fetch(`${base}&playbackmode=OFFLINE`, { headers: { 'Authorization': `Bearer ${accessToken}` } }),
      fetch(`${base}&playbackmode=STREAM`,  { headers: { 'Authorization': `Bearer ${accessToken}` } }),
    ]);
    const offBody = await offRes.text().catch(() => '');
    const strBody = await strRes.text().catch(() => '');

    // Decode manifests so we can read them directly
    const decode = (b) => { try { const j = JSON.parse(b); if (j.manifest) return atob(j.manifest); } catch {} return b; };

    return new Response(
      JSON.stringify({
        countryCode: cc,
        offline: { status: offRes.status, decoded: decode(offBody), raw: offBody.slice(0, 300) },
        stream:  { status: strRes.status, decoded: decode(strBody), raw: strBody.slice(0, 300) },
      }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  return json({ error: 'Path not handled by proxy-tidal', fallback: true }, 404);
}
