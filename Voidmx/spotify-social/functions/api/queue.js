/**
 * Cloudflare Pages Function: /api/queue
 * Returns related videos for "Up Next" via Invidious.
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

  const videoId = new URL(context.request.url).searchParams.get('videoId');
  if (!videoId) return new Response(JSON.stringify({ items: [] }), { headers: CORS_HEADERS });

  for (const base of INVIDIOUS) {
    try {
      const res = await fetch(`${base}/api/v1/videos/${videoId}?fields=recommendedVideos`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const items = (data.recommendedVideos || []).filter(i => i.videoId).map(mapVideo);
      return new Response(JSON.stringify({ items }), { headers: CORS_HEADERS });
    } catch {}
  }
  return new Response(JSON.stringify({ items: [] }), { headers: CORS_HEADERS });
}
