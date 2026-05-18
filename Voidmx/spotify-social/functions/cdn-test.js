export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const target = url.searchParams.get('url');
  
  if (!target) return new Response('No url param', { status: 400 });

  const results = {};

  // Try 1: No headers (CF Worker defaults)
  try {
    const r1 = await fetch(target);
    results.noHeaders = r1.status;
  } catch(e) { results.noHeaders = e.message; }

  // Try 2: Standard User-Agent only
  try {
    const r2 = await fetch(target, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36' }
    });
    results.standardUa = r2.status;
  } catch(e) { results.standardUa = e.message; }

  // Try 3: Standard User-Agent + Referer
  try {
    const r3 = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Referer': 'https://listen.tidal.com/'
      }
    });
    results.uaAndReferer = r3.status;
  } catch(e) { results.uaAndReferer = e.message; }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}
