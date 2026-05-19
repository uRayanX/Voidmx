// LRCLIB public API — no auth needed

const BASE = 'https://lrclib.net/api';

export interface LrcLibTrack {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
}

export interface LyricLine {
  timeMs: number;
  text: string;
}

export async function getLyrics(
  trackName: string,
  artistName: string,
  albumName?: string,
  duration?: number
): Promise<LrcLibTrack | null> {
  const params = new URLSearchParams({ track_name: trackName, artist_name: artistName });
  if (albumName) params.set('album_name', albumName);
  if (duration) params.set('duration', String(Math.round(duration / 1000)));

  try {
    const res = await fetch(`${BASE}/get?${params}`);
    if (!res.ok) return null;
    return (await res.json()) as LrcLibTrack;
  } catch {
    return null;
  }
}

export function parseSyncedLyrics(syncedLyrics: string): LyricLine[] {
  const lines = syncedLyrics.split('\n');
  const result: LyricLine[] = [];

  for (const line of lines) {
    const match = line.match(/^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const centiseconds = parseInt(match[3].padEnd(3, '0'), 10);
      const timeMs = (minutes * 60 + seconds) * 1000 + centiseconds;
      result.push({ timeMs, text: match[4].trim() });
    }
  }

  return result.sort((a, b) => a.timeMs - b.timeMs);
}

export function getCurrentLyricIndex(lines: LyricLine[], positionMs: number): number {
  let current = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].timeMs <= positionMs) {
      current = i;
    } else {
      break;
    }
  }
  return current;
}
