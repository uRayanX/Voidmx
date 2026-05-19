/**
 * Cloudflare Pages Function: /api/album
 * Fetches YouTube playlist (YT Music albums are playlists) via Invidious.
 */
const INVIDIOUS = [
  'https://inv.nadeko.net',
  'https://invidious.privacydev.net',
  'https://yt.cdaut.de',
  'https://invidious.nerdvpn.de',
];

const CORS_HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });

  const id = new URL(context.request.url).searchParams.get('id');
  if (!id) return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400, headers: CORS_HEADERS });

  for (const base of INVIDIOUS) {
    try {
      const res = await fetch(`${base}/api/v1/playlists/${id}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const contents = (data.videos || []).filter(v => v.videoId).map(v => ({
        id: v.videoId, video_id: v.videoId,
        title: { text: v.title || '' },
        artists: [{ name: v.author || data.author || 'Unknown', channel_id: v.authorId || data.authorId || '' }],
        album: { name: data.title || '', id },
        duration: { seconds: v.lengthSeconds || 0 },
        thumbnail: { contents: (v.videoThumbnails || []).map(t => ({ url: t.url })) },
        item_type: 'song', index: v.index,
      }));
      return new Response(JSON.stringify({
        id, title: data.title, author: data.author, contents,
        thumbnail: data.playlistThumbnail ? [{ url: data.playlistThumbnail }] : [],
      }), { headers: CORS_HEADERS });
    } catch {}
  }
  return new Response(JSON.stringify({ id, title: '', contents: [] }), { headers: CORS_HEADERS });
}
