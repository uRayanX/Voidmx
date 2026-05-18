/**
 * /proxy-stream — Cloudflare Pages Function
 *
 * Fetches Tidal STREAM-mode DASH segments server-side and returns them
 * as a single concatenated audio response that <audio> can play natively.
 *
 * GET /proxy-stream?trackId=123&quality=LOSSLESS&country=ES&token=BEARER
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const TIDAL_API       = 'https://api.tidal.com/v1';
const TIDAL_CLIENT_ID = 'SnXphZybGTJqmmEV';

function errJson(msg, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

// ── DASH parsing ──────────────────────────────────────────────────────────────

function parseDash(xml) {
  // Detect MIME type from codec
  let mimeType = 'audio/mp4'; // default for fMP4 containers
  if (/codecs=["']flac["']/i.test(xml))  mimeType = 'audio/mp4'; // FLAC-in-fMP4
  if (/codecs=["']alac["']/i.test(xml))  mimeType = 'audio/mp4'; // ALAC-in-fMP4
  if (/mimeType=["']audio\/flac["']/i.test(xml)) mimeType = 'audio/flac';

  // --- SegmentList format (explicit segment URLs) ---
  const segListUrls = [...xml.matchAll(/media="([^"]+)"/g)]
    .map(m => m[1].trim())
    .filter(u => u.startsWith('http'));
  const initListMatch = xml.match(/initialization="([^"]+)"/);
  const initListUrl   = initListMatch?.[1]?.startsWith('http') ? initListMatch[1] : null;

  if (segListUrls.length > 0) {
    return { mimeType, initUrl: initListUrl, urls: segListUrls };
  }

  // --- SegmentTemplate + SegmentTimeline format ---
  const baseMatch = xml.match(/<BaseURL[^>]*>([^<]+)<\/BaseURL>/);
  const base       = baseMatch ? baseMatch[1].trim() : '';

  const mediaMatch = xml.match(/\bmedia="([^"]+)"/);
  const initMatch  = xml.match(/\binitialization="([^"]+)"/);
  if (!mediaMatch) return null;

  const mediaTemplate = mediaMatch[1];
  const initTemplate  = initMatch?.[1];

  // Build segment URLs from SegmentTimeline <S> elements
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

  const initPath = initTemplate
    ? (initTemplate.startsWith('http') ? initTemplate : base + initTemplate)
    : null;

  return { mimeType, initUrl: initPath, urls };
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);

  // Token from ?token= param (so <audio src="...?token=..."> works)
  let token = url.searchParams.get('token');
  if (!token) {
    const auth = request.headers.get('Authorization') || '';
    token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  }
  if (!token) return errJson('No token', 401);

  const trackId = url.searchParams.get('trackId');
  const quality = url.searchParams.get('quality') || 'LOSSLESS';
  const country = url.searchParams.get('country') || 'ES';
  if (!trackId) return errJson('trackId required');

  const tidalHeaders = { 'Authorization': `Bearer ${token}` };

  // ── Call Tidal STREAM mode ─────────────────────────────────────────────────
  const tidalUrl = `${TIDAL_API}/tracks/${trackId}/playbackinfopostpaywall` +
    `?audioquality=${quality}&playbackmode=STREAM&assetpresentation=FULL` +
    `&countryCode=${country}&deviceType=BROWSER`;

  const tidalRes = await fetch(tidalUrl, { headers: tidalHeaders });
  if (!tidalRes.ok) {
    const err = await tidalRes.text().catch(() => '');
    return errJson(`Tidal ${tidalRes.status}: ${err.slice(0, 200)}`, tidalRes.status);
  }

  const data = await tidalRes.json();
  const raw  = data.manifest;
  if (!raw) return errJson('No manifest');

  let decoded;
  try { decoded = atob(raw); } catch { return errJson('Manifest decode failed'); }

  // ── Case A: JSON manifest with direct URL(s) ───────────────────────────────
  try {
    const mj = JSON.parse(decoded);
    if (mj.urls?.length > 0) {
      const audioRes = await fetch(mj.urls[0]);
      if (!audioRes.ok) return errJson(`CDN ${audioRes.status}`, audioRes.status);
      const mime = mj.mimeType || data.manifestMimeType || 'audio/flac';
      return new Response(audioRes.body, {
        headers: { ...CORS_HEADERS, 'Content-Type': mime, 'Cache-Control': 'no-store' },
      });
    }
  } catch {}

  // ── Case B: DASH XML manifest ──────────────────────────────────────────────
  if (!decoded.includes('<MPD') && !decoded.includes('urn:mpeg:dash')) {
    return errJson('Unknown manifest format');
  }

  const dash = parseDash(decoded);
  if (!dash || dash.urls.length === 0) {
    // Debug: return the raw manifest so we can inspect segment URL structure
    return errJson(`No segments parsed. DASH snippet: ${decoded.slice(0, 500)}`);
  }

  const { mimeType, initUrl, urls } = dash;
  const allUrls = initUrl ? [initUrl, ...urls] : urls;

  // Since Cloudflare IPs are blocked from fetching the segments (403),
  // we return the parsed URLs to the frontend so it can fetch them directly.
  return new Response(JSON.stringify({
    type: 'SEGMENTS',
    mimeType,
    urls: allUrls
  }), {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });
}
