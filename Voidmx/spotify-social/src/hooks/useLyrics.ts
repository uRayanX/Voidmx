import { useState, useEffect } from 'react';
import { getLyrics, parseSyncedLyrics, getCurrentLyricIndex, type LyricLine } from '../api/lrclib';
import type { TidalTrack } from '../types/tidal';

interface LyricsState {
  lines: LyricLine[];
  plainLyrics: string | null;
  currentIndex: number;
  loading: boolean;
  error: string | null;
  instrumental: boolean;
}

export function useLyrics(track: TidalTrack | null, positionMs: number) {
  const [state, setState] = useState<LyricsState>({
    lines: [],
    plainLyrics: null,
    currentIndex: 0,
    loading: false,
    error: null,
    instrumental: false,
  });

  // Fetch lyrics when track changes
  useEffect(() => {
    if (!track) {
      setState(s => ({ ...s, lines: [], plainLyrics: null, instrumental: false }));
      return;
    }

    let cancelled = false;
    setState(s => ({ ...s, loading: true, error: null }));

    (async () => {
      const result = await getLyrics(
        track.title,
        track.artist?.name ?? track.artists?.[0]?.name ?? '',
        track.album.title,
      );

      if (cancelled) return;

      if (!result) {
        setState(s => ({ ...s, loading: false, lines: [], plainLyrics: null, error: null }));
        return;
      }

      const lines = result.syncedLyrics ? parseSyncedLyrics(result.syncedLyrics) : [];
      setState({
        lines,
        plainLyrics: result.plainLyrics,
        currentIndex: 0,
        loading: false,
        error: null,
        instrumental: result.instrumental,
      });
    })();

    return () => { cancelled = true; };
  }, [track?.id]);


  // Update current line index based on playback position
  useEffect(() => {
    if (!state.lines.length) return;
    const idx = getCurrentLyricIndex(state.lines, positionMs);
    setState(s => s.currentIndex !== idx ? { ...s, currentIndex: idx } : s);
  }, [positionMs, state.lines]);

  return state;
}
