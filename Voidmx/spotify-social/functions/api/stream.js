/**
 * Cloudflare Pages Function: /api/stream
 * Uses Invidious API to get direct audio URLs, then proxies with CORS headers.
 */
const INVIDIOUS = [
  'https://inv.nadeko.net',
  'https://invidious.privacydev.net',
  'https://yt.cdaut.de',
  'https://invidious.nerdvpn.de',
  'https://iv.melmac.space',
];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Range',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Content-Type, Accept-Ranges',
};

async function getAudioUrl(videoId) {
  for (const base of INVIDIOUS) {
    try {
      const res = await fetch(`${base}/api/v1/videos/${videoId}?fields=adaptiveFormats`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;
      const { adaptiveFormats = [] } = await res.json();
      const audio = adaptiveFormats
        .filter(f => f.type?.startsWith('audio/'))
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
      if (audio[0]?.url) return audio[0].url;
    } catch {}
  }
  return null;
}

export async function onRequest(context) {
  const { request } = context;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const videoId = new URL(request.url).searchParams.get('videoId');
  if (!videoId) {
    return new Response(JSON.stringify({ error: 'Missing videoId' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const streamUrl = await getAudioUrl(videoId);
  if (!streamUrl) {
    return new Response(JSON.stringify({ error: 'Stream unavailable' }), {
      status: 503, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const rangeHeader = request.headers.get('Range');
  const upstream = await fetch(streamUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0', ...(rangeHeader ? { Range: rangeHeader } : {}) },
  });

  const headers = { ...CORS };
  ['content-type', 'content-length', 'content-range', 'accept-ranges'].forEach(h => {
    const v = upstream.headers.get(h);
    if (v) headers[h] = v;
  });

  return new Response(upstream.body, { status: upstream.status, headers });
}
