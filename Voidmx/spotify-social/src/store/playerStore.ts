import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { TidalTrack } from '../types/tidal';

export const REPEAT_MODE = { OFF: 0, ALL: 1, ONE: 2 } as const;
export type RepeatMode = 0 | 1 | 2;

/** Low-level player controls populated by usePlayer. */
export interface PlayerActions {
  togglePlay: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  enableRadio: (seeds?: TidalTrack[]) => void;
  disableRadio: () => void;
  toggleShuffle: () => void;
}

// ─── Queue persistence (matches Monochrome queueManager) ──────────────────────
const QUEUE_STORAGE_KEY = 'monochrome-queue';

function saveQueueState(state: {
  queue: TidalTrack[];
  shuffledQueue: TidalTrack[];
  originalQueueBeforeShuffle: TidalTrack[];
  queueIndex: number;
  shuffleActive: boolean;
  repeatMode: RepeatMode;
}) {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function extractText(obj: any): string {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  if (obj.text) return obj.text;
  if (obj.name) return obj.name;
  if (obj.title) return extractText(obj.title);
  if (Array.isArray(obj.runs) && obj.runs[0]?.text) return obj.runs[0].text;
  return String(obj);
}

function sanitizeTrack(t: any): TidalTrack | null {
  if (!t || !t.id || t.id === 'unknown' || t.id === 'undefined') return null;
  t.title = extractText(t.title);
  if (t.artist) t.artist.name = extractText(t.artist.name);
  if (t.artists) t.artists.forEach((a: any) => a.name = extractText(a.name));
  if (t.album) t.album.title = extractText(t.album.title);
  return t as TidalTrack;
}

function loadQueueState(): {
  queue: TidalTrack[];
  shuffledQueue: TidalTrack[];
  originalQueueBeforeShuffle: TidalTrack[];
  queueIndex: number;
  shuffleActive: boolean;
  repeatMode: RepeatMode;
} | null {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.queue) parsed.queue = parsed.queue.map(sanitizeTrack).filter(Boolean);
    if (parsed.shuffledQueue) parsed.shuffledQueue = parsed.shuffledQueue.map(sanitizeTrack).filter(Boolean);
    if (parsed.originalQueueBeforeShuffle) parsed.originalQueueBeforeShuffle = parsed.originalQueueBeforeShuffle.map(sanitizeTrack).filter(Boolean);
    return parsed;
  } catch { return null; }
}

interface PlayerStore {
  player: PlayerActions | null;

  // ── Queue (Monochrome-style) ───────────────────────────────────────────────
  currentTrack: TidalTrack | null;
  queue: TidalTrack[];
  shuffledQueue: TidalTrack[];
  originalQueueBeforeShuffle: TidalTrack[];
  queueIndex: number;
  shuffleActive: boolean;

  // ── Playback ──────────────────────────────────────────────────────────────
  isPaused: boolean;
  isLoading: boolean; // Add this
  positionMs: number;
  durationMs: number;
  bufferedMs: number;
  volume: number;
  repeatMode: RepeatMode;

  // ── Radio ──────────────────────────────────────────────────────────────────
  radioEnabled: boolean;
  radioSeeds: TidalTrack[];
  isFetchingRadio: boolean;

  // ── UI ─────────────────────────────────────────────────────────────────────
  showLyrics: boolean;
  showQueue: boolean;

  // ── Actions ───────────────────────────────────────────────────────────────
  setPlayer: (p: PlayerActions | null) => void;

  /** Replace queue, start at index, disable radio. */
  setQueue: (tracks: TidalTrack[], index: number, isRadio?: boolean) => void;

  /** Add track(s) to end of queue. */
  addToQueue: (tracks: TidalTrack | TidalTrack[]) => void;

  /** Insert track(s) immediately after current position. */
  addNextToQueue: (tracks: TidalTrack | TidalTrack[]) => void;

  /** Remove track at index. Adjusts queueIndex if needed. */
  removeFromQueue: (index: number) => void;

  /** Drag-reorder. */
  moveInQueue: (from: number, to: number) => void;

  /** Keep current track, remove everything else. */
  clearQueue: () => void;

  /** Stop playback and empty queue (radio start). */
  wipeQueue: () => void;

  // Internal setters used by usePlayer
  setIsPaused: (v: boolean) => void;
  setIsLoading: (v: boolean) => void;
  setPositionMs: (pos: number) => void;
  setDurationMs: (v: number) => void;
  setBufferedMs: (v: number) => void;
  setVolume: (vol: number) => void;
  setRepeatMode: (v: RepeatMode) => void;
  setRadioEnabled: (v: boolean) => void;
  setRadioSeeds: (seeds: TidalTrack[]) => void;
  setIsFetchingRadio: (v: boolean) => void;
  setShuffleState: (state: {
    shuffleActive: boolean;
    queue: TidalTrack[];
    shuffledQueue: TidalTrack[];
    originalQueueBeforeShuffle: TidalTrack[];
    queueIndex: number;
    currentTrack: TidalTrack | null;
  }) => void;

  toggleLyrics: () => void;
  toggleQueue: () => void;

  /** Persist queue state to localStorage. */
  persistQueue: () => void;

  /** Restore queue from localStorage. Returns true if state was restored. */
  restoreQueue: () => boolean;

  /** Helper: the active queue (shuffled or not). */
  getCurrentQueue: () => TidalTrack[];

  // Legacy compat
  shuffle: boolean; // alias for shuffleActive
  setShuffle: (v: boolean) => void;
  appendToQueue: (track: TidalTrack) => void;
  setRadioMode: (v: boolean) => void;
  radioMode: boolean;
}

const savedVolume = (() => {
  try { return parseFloat(localStorage.getItem('volume') ?? '1.0') || 1.0; }
  catch { return 1.0; }
})();

export const usePlayerStore = create<PlayerStore>()(subscribeWithSelector((set, get) => ({
  player: null,

  currentTrack: null,
  queue: [],
  shuffledQueue: [],
  originalQueueBeforeShuffle: [],
  queueIndex: -1,
  shuffleActive: false,

  isPaused: true,
  isLoading: false,
  positionMs: 0,
  durationMs: 0,
  bufferedMs: 0,
  volume: savedVolume,
  repeatMode: 0,

  radioEnabled: false,
  radioSeeds: [],
  isFetchingRadio: false,

  showLyrics: false,
  showQueue: false,

  // legacy aliases
  get shuffle() { return get().shuffleActive; },
  get radioMode() { return get().radioEnabled; },

  setPlayer: (player) => set({ player }),

  setQueue: (tracks, index, isRadio = false) => {
    const newState: Partial<PlayerStore> = {
      queue: tracks,
      queueIndex: index,
      currentTrack: tracks[index] ?? null,
      positionMs: 0,
      shuffleActive: false,
      shuffledQueue: [],
      originalQueueBeforeShuffle: [],
    };
    if (!isRadio) newState.radioEnabled = false; else newState.radioEnabled = true;
    set(newState as Partial<PlayerStore>);
    get().persistQueue();
  },

  addToQueue: (tracksIn) => {
    const tracks = Array.isArray(tracksIn) ? tracksIn : [tracksIn];
    set(s => {
      const queue = [...s.queue, ...tracks];
      const shuffledQueue = s.shuffleActive ? [...s.shuffledQueue, ...tracks] : s.shuffledQueue;
      const originalQueueBeforeShuffle = s.shuffleActive
        ? [...s.originalQueueBeforeShuffle, ...tracks]
        : s.originalQueueBeforeShuffle;
      return { queue, shuffledQueue, originalQueueBeforeShuffle };
    });
    get().persistQueue();
  },

  addNextToQueue: (tracksIn) => {
    const tracks = Array.isArray(tracksIn) ? tracksIn : [tracksIn];
    set(s => {
      const currentQueue = s.shuffleActive ? [...s.shuffledQueue] : [...s.queue];
      const insertAt = s.queueIndex + 1;
      currentQueue.splice(insertAt, 0, ...tracks);
      const originalQueueBeforeShuffle = s.shuffleActive
        ? [...s.originalQueueBeforeShuffle, ...tracks]
        : s.originalQueueBeforeShuffle;
      return s.shuffleActive
        ? { shuffledQueue: currentQueue, originalQueueBeforeShuffle }
        : { queue: currentQueue, originalQueueBeforeShuffle };
    });
    get().persistQueue();
  },

  removeFromQueue: (index) => {
    set(s => {
      const currentQueue = s.shuffleActive ? [...s.shuffledQueue] : [...s.queue];
      let queueIndex = s.queueIndex;
      if (index < queueIndex) queueIndex--;
      currentQueue.splice(index, 1);
      const updates: Partial<PlayerStore> = { queueIndex };
      if (s.shuffleActive) {
        updates.shuffledQueue = currentQueue;
      } else {
        updates.queue = currentQueue;
      }
      return updates as Partial<PlayerStore>;
    });
    get().persistQueue();
  },

  moveInQueue: (from, to) => {
    set(s => {
      const currentQueue = s.shuffleActive ? [...s.shuffledQueue] : [...s.queue];
      if (from < 0 || from >= currentQueue.length || to < 0 || to >= currentQueue.length) return {};
      const [track] = currentQueue.splice(from, 1);
      currentQueue.splice(to, 0, track);
      let queueIndex = s.queueIndex;
      if (s.queueIndex === from) queueIndex = to;
      else if (from < s.queueIndex && to >= s.queueIndex) queueIndex--;
      else if (from > s.queueIndex && to <= s.queueIndex) queueIndex++;
      const updates: Partial<PlayerStore> = { queueIndex };
      if (s.shuffleActive) updates.shuffledQueue = currentQueue;
      else updates.queue = currentQueue;
      return updates as Partial<PlayerStore>;
    });
    get().persistQueue();
  },

  clearQueue: () => {
    set(s => {
      const current = s.currentTrack;
      if (!current) return { queue: [], shuffledQueue: [], originalQueueBeforeShuffle: [], queueIndex: -1 };
      return {
        queue: [current],
        shuffledQueue: s.shuffleActive ? [current] : [],
        originalQueueBeforeShuffle: s.shuffleActive ? [current] : [],
        queueIndex: 0,
      };
    });
    get().persistQueue();
  },

  wipeQueue: () => {
    set({
      currentTrack: null,
      queue: [],
      shuffledQueue: [],
      originalQueueBeforeShuffle: [],
      queueIndex: -1,
      isPaused: true,
      isLoading: false,
    });
    get().persistQueue();
  },

  setIsPaused: (isPaused) => set({ isPaused }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setPositionMs: (positionMs) => set({ positionMs }),
  setDurationMs: (durationMs) => set({ durationMs }),
  setBufferedMs: (bufferedMs) => set({ bufferedMs }),
  setVolume: (volume) => {
    set({ volume });
    try { localStorage.setItem('volume', String(volume)); } catch {}
  },
  setRepeatMode: (repeatMode) => {
    set({ repeatMode });
    get().persistQueue();
  },
  setRadioEnabled: (radioEnabled) => {
    set({ radioEnabled });
    try { localStorage.setItem('radio-enabled', radioEnabled ? 'true' : 'false'); } catch {}
  },
  setRadioSeeds: (radioSeeds) => set({ radioSeeds }),
  setIsFetchingRadio: (isFetchingRadio) => set({ isFetchingRadio }),

  setShuffleState: (state) => {
    set(state as Partial<PlayerStore>);
    get().persistQueue();
  },

  toggleLyrics: () => set(s => ({ showLyrics: !s.showLyrics, showQueue: false })),
  toggleQueue: () => set(s => ({ showQueue: !s.showQueue, showLyrics: false })),

  persistQueue: () => {
    const s = get();
    saveQueueState({
      queue: s.queue,
      shuffledQueue: s.shuffledQueue,
      originalQueueBeforeShuffle: s.originalQueueBeforeShuffle,
      queueIndex: s.queueIndex,
      shuffleActive: s.shuffleActive,
      repeatMode: s.repeatMode,
    });
  },

  restoreQueue: () => {
    const saved = loadQueueState();
    if (!saved) return false;
    const currentQueue = saved.shuffleActive ? saved.shuffledQueue : saved.queue;
    const currentTrack = (saved.queueIndex >= 0 && saved.queueIndex < currentQueue.length)
      ? currentQueue[saved.queueIndex]
      : null;
    
    // Restore radio enabled state
    const savedRadioEnabled = (() => {
      try { return localStorage.getItem('radio-enabled') === 'true'; }
      catch { return false; }
    })();

    set({
      queue: saved.queue,
      shuffledQueue: saved.shuffledQueue,
      originalQueueBeforeShuffle: saved.originalQueueBeforeShuffle,
      queueIndex: saved.queueIndex,
      shuffleActive: saved.shuffleActive,
      repeatMode: saved.repeatMode,
      radioEnabled: savedRadioEnabled,
      currentTrack,
    });
    return !!currentTrack;
  },

  getCurrentQueue: () => {
    const s = get();
    return s.shuffleActive ? s.shuffledQueue : s.queue;
  },

  // Legacy compat
  setShuffle: (v) => {
    // Handled by the player engine via setShuffleState; this is a no-op shim
    void v;
  },
  appendToQueue: (track) => get().addToQueue(track),
  setRadioMode: (v) => get().setRadioEnabled(v),
})));
