/**
 * Cloudflare Pages Function: /api/home
 * Returns trending music from Invidious as homepage sections.
 */
const INVIDIOUS = [
  'https://inv.nadeko.net',
  'https://invidious.privacydev.net',
  'https://yt.cdaut.de',
  'https://invidious.nerdvpn.de',
];

const CORS_HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

function mapVideo(item) {
  return {
    id: item.videoId, video_id: item.videoId,
    title: { text: item.title || '' },
    artists: [{ name: item.author || 'Unknown', channel_id: item.authorId || '' }],
    album: { name: '' }, duration: { seconds: item.lengthSeconds || 0 },
    thumbnail: { contents: (item.videoThumbnails || []).map(t => ({ url: t.url })) },
    item_type: 'song',
  };
}

export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });

  for (const base of INVIDIOUS) {
    try {
      const res = await fetch(`${base}/api/v1/trending?type=music`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) continue;
      const items = await res.json();
      if (!Array.isArray(items) || items.length === 0) continue;
      const mapped = items.filter(i => i.videoId).map(mapVideo);
      return new Response(JSON.stringify({
        sections: [{ title: 'Trending Music', contents: mapped.slice(0, 30) }]
      }), { headers: CORS_HEADERS });
    } catch {}
  }
  return new Response(JSON.stringify({ sections: [] }), { headers: CORS_HEADERS });
}
