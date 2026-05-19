/**
 * Cloudflare Pages Function: /api/search
 * Searches YouTube via Invidious and returns results in the format the app expects.
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
    id: item.videoId,
    video_id: item.videoId,
    title: { text: item.title || '' },
    artists: [{ name: item.author || 'Unknown Artist', channel_id: item.authorId || '' }],
    album: { name: '', id: '' },
    duration: { seconds: item.lengthSeconds || 0, text: '' },
    thumbnail: { contents: (item.videoThumbnails || []).map(t => ({ url: t.url, width: t.width, height: t.height })) },
    type: 'MusicResponsiveListItem',
    item_type: 'song',
  };
}

function mapChannel(item) {
  return {
    id: item.authorId,
    title: { text: item.author || '' },
    name: item.author || '',
    thumbnail: { contents: (item.authorThumbnails || []).map(t => ({ url: t.url })) },
    type: 'MusicResponsiveListItem',
    item_type: 'artist',
  };
}

function mapPlaylist(item) {
  return {
    id: item.playlistId,
    uuid: item.playlistId,
    title: { text: item.title || '' },
    thumbnail: { contents: (item.videoThumbnails || item.playlistThumbnail ? [{ url: item.playlistThumbnail }] : []) },
    type: 'MusicResponsiveListItem',
    item_type: 'playlist',
  };
}

export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });

  const url = new URL(context.request.url);
  const q = url.searchParams.get('q');
  const type = url.searchParams.get('type') || 'song';

  if (!q) return new Response(JSON.stringify({ items: [] }), { headers: CORS_HEADERS });

  // Map app type → Invidious type
  const invType = type === 'artist' ? 'channel' : (type === 'album' || type === 'playlist') ? 'playlist' : 'video';
  const query = invType === 'video' ? `${q} music` : q;

  for (const base of INVIDIOUS) {
    try {
      const res = await fetch(`${base}/api/v1/search?q=${encodeURIComponent(query)}&type=${invType}&page=1`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) continue;

      let items;
      if (invType === 'channel') items = data.filter(i => i.authorId).map(mapChannel);
      else if (invType === 'playlist') items = data.filter(i => i.playlistId).map(mapPlaylist);
      else items = data.filter(i => i.videoId).map(mapVideo);

      return new Response(JSON.stringify({ items }), { headers: CORS_HEADERS });
    } catch {}
  }
  return new Response(JSON.stringify({ items: [] }), { headers: CORS_HEADERS });
}
