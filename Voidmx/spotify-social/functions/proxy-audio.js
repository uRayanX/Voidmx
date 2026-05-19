// CORS headers — always use wildcard because:
// 1. <audio> elements do NOT send an Origin header, so origin-reflection
//    always fell back to `void-cyz.pages.dev`, breaking playback on voidradio.me.
// 2. This proxy is already security-restricted to tidal.com URLs only,
//    so `*` does not introduce any meaningful additional exposure.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Range, Content-Type',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
};

export async function onRequest(context) {
  const { request } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return new Response('Missing url param', { status: 400, headers: CORS_HEADERS });
  }

  // Security: only proxy tidal.com URLs
  let parsedTarget;
  try {
    parsedTarget = new URL(targetUrl);
  } catch {
    return new Response('Invalid url param', { status: 400, headers: CORS_HEADERS });
  }

  if (!parsedTarget.hostname.endsWith('tidal.com')) {
    return new Response('Forbidden: only tidal.com URLs are proxied', { status: 403, headers: CORS_HEADERS });
  }

  // Build new headers — spoof Origin/Referer so Tidal CDN accepts the request,
  // but forward Range so the browser can seek/resume audio streams.
  const proxyHeaders = new Headers();
  const rangeHeader = request.headers.get('Range');
  if (rangeHeader) proxyHeaders.set('Range', rangeHeader);
  proxyHeaders.set('Origin', 'https://listen.tidal.com');
  proxyHeaders.set('Referer', 'https://listen.tidal.com/');
  proxyHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

  try {
    const response = await fetch(targetUrl, {
      method: request.method === 'HEAD' ? 'HEAD' : 'GET',
      headers: proxyHeaders,
    });

    const newHeaders = new Headers(response.headers);
    // Overlay wildcard CORS headers so the browser accepts the response
    // regardless of which domain the audio element is on.
    for (const [k, v] of Object.entries(CORS_HEADERS)) {
      newHeaders.set(k, v);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  } catch (err) {
    return new Response(err.message || 'Proxy error', { status: 502, headers: CORS_HEADERS });
  }
}
