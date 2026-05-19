import { useEffect } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { getTrackRecommendations, getSimilarArtists, getArtistTopTracks } from '../api/tidal';
import { prioritizeRadioTracks } from '../utils/radioMix';

const SESSION_KEY = 'void_radio_seeded_v2';

function getSeeded(): Set<string | number> {
  try { return new Set(JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? '[]')); }
  catch { return new Set(); }
}
function markSeeded(id: number | string) {
  try {
    const s = getSeeded();
    s.add(id);
    const arr = [...s].slice(-50);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(arr));
  } catch {}
}

let seeding = false;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Auto-queue related tracks whenever the current track changes.
 *  No token needed — uses the public TIDAL Hi-Fi proxy.
 */
export function useRadio() {
  const currentTrackId = usePlayerStore(s => s.currentTrack?.id);
  const currentTrack   = usePlayerStore(s => s.currentTrack);

  useEffect(() => {
    if (!currentTrackId || !currentTrack) return;
    if (getSeeded().has(currentTrackId)) return;
    if (seeding) return;

    seeding = true;
    markSeeded(currentTrackId);

    const primaryArtistId = currentTrack.artist?.id ?? currentTrack.artists?.[0]?.id;
    if (!primaryArtistId) { seeding = false; return; }

    (async () => {
      try {
        // 1. Get TIDAL recommendations for the current track
        const recommendations = await getTrackRecommendations(currentTrackId).catch(() => []);
        const prioritizedRecs = prioritizeRadioTracks(currentTrack, recommendations);
        // Pick up to 4 from recommendations (exclude current track)
        const fromRecs = shuffle(
          prioritizedRecs.filter(t => t.id !== currentTrackId)
        ).slice(0, 4);

        // 2. Get a similar artist and their top tracks
        let fromRelated: typeof fromRecs = [];
        const similarArtists = await getSimilarArtists(primaryArtistId).catch(() => []);
        if (similarArtists.length > 0) {
          const relArtist = similarArtists[Math.floor(Math.random() * Math.min(5, similarArtists.length))];
          const relTracks = await getArtistTopTracks(relArtist.id).catch(() => []);
          fromRelated = shuffle(relTracks.filter(t => t.id !== currentTrackId)).slice(0, 2);
        }

        const toAdd = [...fromRecs, ...fromRelated];
        for (const t of toAdd) {
          usePlayerStore.getState().appendToQueue(t);
        }
      } catch {
        // Never disrupt playback
      } finally {
        seeding = false;
      }
    })();
  }, [currentTrackId]);
}