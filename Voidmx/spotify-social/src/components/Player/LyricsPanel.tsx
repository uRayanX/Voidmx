import React, { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { seekAudio } from '../../hooks/usePlayer';

// ── am-lyrics web component ────────────────────────────────────────────────
const AM_LYRICS_URL = 'https://cdn.jsdelivr.net/npm/@uimaxbai/am-lyrics/dist/src/am-lyrics.min.js';

let scriptPromise: Promise<void> | null = null;

export function loadAmLyrics(): Promise<void> {
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    if (typeof customElements !== 'undefined' && customElements.get('am-lyrics')) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>('script[data-am-lyrics]');
    if (existing) {
      customElements.whenDefined?.('am-lyrics').then(() => resolve()).catch(reject);
      return;
    }

    const script = document.createElement('script');
    script.type = 'module';
    script.src = AM_LYRICS_URL;
    script.dataset.amLyrics = 'true';
    script.addEventListener('load', () => {
      customElements.whenDefined?.('am-lyrics').then(() => resolve()).catch(() => resolve());
    }, { once: true });
    script.addEventListener('error', () => {
      scriptPromise = null;
      reject(new Error('Failed to load lyrics component'));
    }, { once: true });
    document.head.append(script);
  });

  return scriptPromise;
}

// Start loading the script immediately when this module is first imported —
// so it's ready (or nearly ready) by the time the user opens the panel.
if (typeof document !== 'undefined') {
  loadAmLyrics().catch(() => {});
}

// ── Pre-warm: keeps a hidden am-lyrics element synced to currentTrack ─────────
// Triggers Apple Music lyrics fetch in the background while the panel is closed.
let prewarmEl: (HTMLElement & { currentTime: number }) | null = null;
let prewarmTrackId: string | null = null;

function updatePrewarm(
  trackId: string,
  title: string,
  artist: string,
  album: string,
  durationMs: number,
) {
  if (prewarmTrackId === trackId) return; // already warmed for this track
  prewarmTrackId = trackId;

  loadAmLyrics().then(() => {
    // Re-check in case track changed while script was loading
    if (prewarmTrackId !== trackId) return;

    if (!prewarmEl) {
      prewarmEl = document.createElement('am-lyrics') as HTMLElement & { currentTime: number };
      Object.assign(prewarmEl.style, {
        position: 'fixed',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
        opacity: '0',
        pointerEvents: 'none',
        zIndex: '-1',
      });
      document.body.append(prewarmEl);
    }

    prewarmEl.setAttribute('song-title', title);
    prewarmEl.setAttribute('song-artist', artist);
    prewarmEl.setAttribute('song-album', album);
    prewarmEl.setAttribute('song-duration', String(durationMs));
    prewarmEl.setAttribute('query', `${title} ${artist}`);
    prewarmEl.setAttribute('highlight-color', '#ffffff');
    prewarmEl.currentTime = 0;
  }).catch(() => {});
}

// ── Hook used by parent components to trigger prewarming ──────────────────────
export function useLyricsPrewarm() {
  const { currentTrack, durationMs } = usePlayerStore();

  useEffect(() => {
    if (!currentTrack) return;
    const title = currentTrack.title;
    const artist = currentTrack.artists?.map(a => a.name).join(', ') ?? currentTrack.artist?.name ?? '';
    const album = currentTrack.album?.title ?? '';
    updatePrewarm(String(currentTrack.id), title, artist, album, durationMs);
  }, [currentTrack?.id, durationMs]);
}

// ── LyricsPanel ────────────────────────────────────────────────────────────────
export const LyricsPanel: React.FC = () => {
  const { currentTrack, positionMs, durationMs, isPaused } = usePlayerStore();

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(() =>
    // If script is already loaded (from prewarm), start as ready
    typeof customElements !== 'undefined' && customElements.get('am-lyrics') ? 'ready' : 'loading'
  );
  const [errorMsg, setErrorMsg] = useState('');
  const lyricsKey = currentTrack ? String(currentTrack.id) : 'none';

  const elRef = useRef<(HTMLElement & { currentTime: number }) | null>(null);
  const rafRef = useRef<number | null>(null);
  const baseRef = useRef({ posMs: 0, nowTs: 0 });

  // Ensure script is loaded (usually already done, this is just a safety net)
  useEffect(() => {
    if (status === 'ready') return;
    loadAmLyrics()
      .then(() => setStatus('ready'))
      .catch((e: Error) => { setStatus('error'); setErrorMsg(e.message); });
  }, [status]);

  // Sync currentTime with RAF interpolation
  useEffect(() => {
    if (status !== 'ready' || !elRef.current) return;

    const el = elRef.current;
    baseRef.current = { posMs: positionMs, nowTs: performance.now() };
    el.currentTime = positionMs;

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    if (isPaused) return;

    const tick = (now: number) => {
      const elapsed = now - baseRef.current.nowTs;
      el.currentTime = baseRef.current.posMs + elapsed;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    };
  }, [status, positionMs, isPaused]);

  // line-click → seek
  useEffect(() => {
    const el = elRef.current;
    if (!el || status !== 'ready') return;

    const handler = (e: Event) => {
      const { timestamp } = (e as CustomEvent<{ timestamp: number }>).detail ?? {};
      if (typeof timestamp === 'number') {
        seekAudio(timestamp);
      }
    };
    el.addEventListener('line-click', handler);
    return () => el.removeEventListener('line-click', handler);
  }, [status, lyricsKey]);

  if (!currentTrack) {
    return (
      <div className="h-full flex items-center justify-center px-6 text-center">
        <p className="text-faint text-sm">Nothing playing</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-faint text-sm">{errorMsg || 'Lyrics unavailable'}</p>
        <button
          onClick={() => {
            scriptPromise = null;
            setStatus('loading');
            loadAmLyrics()
              .then(() => setStatus('ready'))
              .catch((e: Error) => { setStatus('error'); setErrorMsg(e.message); });
          }}
          className="text-xs text-white/40 hover:text-white transition-colors underline underline-offset-2"
        >
          Try again
        </button>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-faint text-xs uppercase tracking-widest animate-pulse">loading lyrics…</span>
      </div>
    );
  }

  const title = currentTrack.title;
  const artist = currentTrack.artists?.map(a => a.name).join(', ') ?? currentTrack.artist?.name ?? '';
  const album = currentTrack.album?.title ?? '';

  return (
    <div key={lyricsKey} className="h-full overflow-hidden">
      {React.createElement('am-lyrics', {
        ref: elRef,
        'song-title': title,
        'song-artist': artist,
        'song-album': album,
        'song-duration': durationMs,
        query: `${title} ${artist}`,
        'highlight-color': '#ffffff',
        'hover-background-color': 'rgba(255,255,255,0.07)',
        autoscroll: '',
        interpolate: '',
        style: {
          display: 'block',
          width: '100%',
          height: '100%',
          color: 'white',
          fontFamily: 'DM Sans, sans-serif',
        },
      })}
    </div>
  );
};
