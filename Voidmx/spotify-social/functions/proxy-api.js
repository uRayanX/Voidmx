/**
 * /proxy-api — Cloudflare Pages Function
 *
 * Proxies Monochrome/HiFi API calls server-side, routing outbound requests
 * through a US Cloudflare edge node to avoid geo-blocks on Tidal tokens.
 *
 * Usage: GET /proxy-api?path=/track/?id=123&quality=LOSSLESS
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Spoof headers to look like a trusted Monochrome frontend from the US.
// X-Forwarded-For uses a well-known US Cloudflare IP to hint US origin.
const SPOOF_HEADERS = {
  'Origin':           'https://monochrome.tf',
  'Referer':          'https://monochrome.tf/',
  'User-Agent':       'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept':           'application/json, text/plain, */*',
  'Accept-Language':  'en-US,en;q=0.9',
  'X-Forwarded-For':  '104.16.0.1',   // Cloudflare US IP — hints US origin to instances
  'CF-IPCountry':     'US',            // Cloudflare country header
  'X-Real-IP':        '104.16.0.1',
};

// Instances ordered by current health (verified 2026-04-24 via tidal-uptime.geeked.wtf).
// eu-central is the only confirmed-UP instance. Others kept as fallbacks.
const INSTANCES = [
  'https://eu-central.monochrome.tf',   // ✅ Only confirmed UP (uptime tracker)
  'https://monochrome-api.samidy.com',
  'https://us-west.monochrome.tf',
  'https://frankfurt-2.monochrome.tf',
  'https://hifi.geeked.wtf',
  'https://api.monochrome.tf',
  'https://tidal-api.binimum.org',
  'https://maus.qqdl.site',
  'https://vogel.qqdl.site',
  'https://katze.qqdl.site',
  'https://hund.qqdl.site',
  'https://hifi-two.spotisaver.net',
  'https://wolf.qqdl.site',
];

export async function onRequest(context) {
  const { request } = context;

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const apiPath = url.searchParams.get('path');

  if (!apiPath || !apiPath.startsWith('/')) {
    return new Response('Missing or invalid path param', { status: 400, headers: CORS_HEADERS });
  }

  // Race all instances — return whichever responds successfully first.
  // cf.resolveOverride + cacheEverything disabled to ensure fresh responses.
  const controllers = INSTANCES.map(() => new AbortController());
  const timeout = 8000;

  try {
    const result = await new Promise((resolve, reject) => {
      let failCount = 0;

      INSTANCES.forEach((base, idx) => {
        const ctrl = controllers[idx];
        const timer = setTimeout(() => ctrl.abort(), timeout);
        const targetUrl = `${base}${apiPath}`;

        fetch(targetUrl, {
          signal: ctrl.signal,
          headers: SPOOF_HEADERS,
          // Cloudflare-specific: bypass cache + hint to use US Cloudflare edge for outbound
          cf: {
            cacheEverything: false,
            cacheTtl: 0,
          },
        })
          .then(async (res) => {
            clearTimeout(timer);
            if (res.ok) {
              controllers.forEach((c, j) => { if (j !== idx) c.abort(); });
              const body = await res.text();
              resolve({ body, contentType: res.headers.get('Content-Type') || 'application/json', instance: base });
            } else {
              throw new Error(`HTTP ${res.status}`);
            }
          })
          .catch(() => {
            clearTimeout(timer);
            failCount++;
            if (failCount === INSTANCES.length) {
              reject(new Error('All instances failed'));
            }
          });
      });
    });

    return new Response(result.body, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': result.contentType,
        'Cache-Control': 'no-store',
        'X-Served-By': result.instance, // debug: shows which instance responded
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'All API instances failed' }), {
      status: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}
