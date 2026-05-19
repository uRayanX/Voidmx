import React, { useEffect, useState, useCallback, useRef } from 'react';
import { LyricsPanel } from '../components/Player/LyricsPanel';
import { QueuePanel } from '../components/Player/QueuePanel';
import { Link } from "react-router-dom";
import { usePlayerStore } from '../store/playerStore';
import { useLibraryStore } from '../store/libraryStore';
import { seekAudio, getAudioElement } from '../hooks/usePlayer';
import { getCoverUrl, searchTracks, getTrackRecommendations } from '../api/tidal';
import type { TidalTrack } from '../types/tidal';
import { SongInfoModal } from '../components/SongInfoModal';

/* ─── Sleep Timer Utility ─────────────────────────────────────────────── */
let sleepTimerId: ReturnType<typeof setTimeout> | null = null;
function setSleepTimer(minutes: number, onFire: () => void) {
  if (sleepTimerId) clearTimeout(sleepTimerId);
  if (minutes <= 0) { sleepTimerId = null; return; }
  sleepTimerId = setTimeout(onFire, minutes * 60 * 1000);
}
function clearSleepTimer() {
  if (sleepTimerId) { clearTimeout(sleepTimerId); sleepTimerId = null; }
}

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const IconShuffle = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
  </svg>
);
const IconPrev = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
  </svg>
);
const IconNext = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
  </svg>
);
const IconRepeat = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
  </svg>
);
const IconRepeatOne = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"/>
  </svg>
);
const IconMic = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
  </svg>
);
const IconQueue = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
  </svg>
);

const IconClose = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
  </svg>
);

const Slider: React.FC<{
  min: number; max: number; value: number; step?: number;
  onChange: (v: number) => void;
  onCommit?: (v: number) => void;
  thin?: boolean;
}> = ({ min, max, value, step = 1, onChange, onCommit, thin }) => {
  const pct = max > 0 ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div className={`relative ${thin ? 'h-0.5' : 'h-1'} rounded-full bg-white/15 group cursor-pointer`}>
      <div className="absolute left-0 top-0 h-full rounded-full bg-white transition-none" style={{ width: `${pct}%` }} />
      <div className="absolute w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity pointer-events-none" style={{ left: `${pct}%`, top: '50%', transform: 'translate(-50%, -50%)' }} />
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        onMouseUp={onCommit ? (e => onCommit(Number((e.target as HTMLInputElement).value))) : undefined}
        onTouchEnd={onCommit ? (e => onCommit(Number((e.target as HTMLInputElement).value))) : undefined}
        className="absolute inset-0 w-full opacity-0 cursor-pointer" style={{ height: '100%' }}
      />
    </div>
  );
};

export const NowPlaying: React.FC = () => {
  const {
    currentTrack, isPaused, positionMs, durationMs,
    player, shuffle, repeatMode,
    setPositionMs,
    setRepeatMode: storeRepeat,
    toggleLyrics, toggleQueue,
    showLyrics, showQueue,
  } = usePlayerStore();

  const [seekValue, setSeekValue] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<TidalTrack[]>([]);
  const { isLiked, toggleLike, playlists: customPlaylists, addTrackToPlaylist } = useLibraryStore();
  const liked = currentTrack ? isLiked(currentTrack.id) : false;

  // ── Sleep Timer ──────────────────────────────────────────────────────────
  const [sleepMinutes, setSleepMinutes] = useState(0);
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const [sleepLabel, setSleepLabel] = useState('');
  const sleepMenuRef = useRef<HTMLDivElement>(null);

  const activateSleep = (mins: number) => {
    setSleepMinutes(mins);
    setShowSleepMenu(false);
    if (mins <= 0) { clearSleepTimer(); setSleepLabel(''); return; }
    setSleepLabel(`${mins}m`);
    setSleepTimer(mins, () => { player?.togglePlay(); setSleepLabel(''); setSleepMinutes(0); });
  };

  // ── Playback Speed ───────────────────────────────────────────────────────
  const [speed, setSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const speedMenuRef = useRef<HTMLDivElement>(null);
  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

  const applySpeed = (s: number) => {
    setSpeed(s);
    setShowSpeedMenu(false);
    const audio = getAudioElement();
    if (audio) audio.playbackRate = s;
  };

  // ── Overflow / Share Menu ────────────────────────────────────────────────
  const [showOverflow, setShowOverflow] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [playlistSubOpen, setPlaylistSubOpen] = useState(false);

  const handleShare = () => {
    if (!currentTrack) return;
    const url = `https://listen.tidal.com/track/${currentTrack.id}`;
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); });
    setShowOverflow(false);
  };

  // Close menus on outside click
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (sleepMenuRef.current && !sleepMenuRef.current.contains(e.target as Node)) setShowSleepMenu(false);
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target as Node)) setShowSpeedMenu(false);
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) setShowOverflow(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const progressRef = useRef<number>(positionMs);
  const rafRef = useRef<number>(0);

  useEffect(() => { progressRef.current = positionMs; }, [positionMs]);
  useEffect(() => {
    if (isPaused) { cancelAnimationFrame(rafRef.current); return; }
    const start = performance.now();
    const startPos = progressRef.current;
    const tick = (now: number) => {
      const newPos = Math.min(startPos + (now - start), durationMs);
      setPositionMs(newPos);
      if (newPos < durationMs) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPaused, positionMs, durationMs, setPositionMs]);

  useEffect(() => {
    if (!currentTrack) {
      searchTracks('top hits 2024', 8).then(setSuggestions).catch(() => {});
    }
  }, [currentTrack]);

  const handlePlayPause = useCallback(() => player?.togglePlay(), [player]);
  const handlePrev = useCallback(() => {
    if (!player) return;
    if (positionMs > 3000) seekAudio(0);
    else player.previousTrack();
  }, [player, positionMs]);
  const handleNext = useCallback(() => player?.nextTrack(), [player]);

  const handleSeekCommit = (val: number) => {
    seekAudio(val);
    setPositionMs(val);
    setSeekValue(null);
  };


  const albumArt = currentTrack?.album?.cover ? getCoverUrl(currentTrack.album.cover, 640) : null;
  const panelOpen = showLyrics || showQueue;

  if (!currentTrack) {
    return (
      <div className="h-full flex items-center justify-center px-12">
        <div className="w-full max-w-4xl grid grid-cols-2 gap-16 items-center">
          <div className="aspect-square rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
            <svg className="w-20 h-20 text-white/10" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v9.28A4 4 0 1014 16V7h4V3h-6z"/></svg>
          </div>
          <div>
            <p className="text-xs text-white/25 uppercase tracking-widest mb-3">Nothing playing</p>
            <h2 className="font-bold mb-10 leading-tight" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.03em' }}>
              What do you<br/>want to hear?
            </h2>
            {suggestions.length > 0 && (
              <div>
                <p className="text-xs text-white/25 uppercase tracking-widest mb-3">Suggested tracks</p>
                <div className="space-y-0.5">
                  {suggestions.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => usePlayerStore.getState().setQueue([t], 0)}
                      className="w-full flex items-center gap-4 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors group text-left"
                    >
                      {t.album?.cover ? (
                        <img src={getCoverUrl(t.album.cover, 80)} className="w-10 h-10 rounded-lg object-cover opacity-70 group-hover:opacity-100 transition-opacity shrink-0" alt="" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-white/[0.07] shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{t.title}</p>
                        <p className="text-xs text-white/30 truncate">{t.artists?.map(a => a.name).join(', ') ?? t.artist?.name}</p>
                      </div>
                      <svg className="w-4 h-4 text-white/25 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      {albumArt && (
        <>
          <div className="absolute inset-0 bg-center bg-cover animate-slow-pan mix-blend-screen" style={{ backgroundImage: `url(${albumArt})`, filter: 'blur(80px) saturate(200%)' }} />
          <div className="absolute inset-0 bg-gradient-to-br from-[#080808]/90 via-[#080808]/75 to-[#080808]/95" />
        </>
      )}

      <div className={`absolute inset-y-0 right-0 z-30 w-full max-w-[420px] flex flex-col bg-black/60 backdrop-blur-2xl border-l border-white/[0.06] transition-transform duration-300 ease-out ${panelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
          <span className="text-xs text-white/25 uppercase tracking-widest">{showLyrics ? 'Lyrics' : 'Queue'}</span>
          <button onClick={() => { if (showLyrics) toggleLyrics(); else toggleQueue(); }} className="text-white/25 hover:text-white transition-colors">
            <IconClose />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          {showLyrics && <LyricsPanel />}
          {showQueue && <QueuePanel />}
        </div>
      </div>

      <div className={`relative z-10 h-[100dvh] overflow-hidden lg:overflow-visible flex flex-col lg:flex-row items-center justify-center px-6 lg:px-14 pt-[6vh] pb-[14vh] lg:py-10 transition-all duration-300 ${panelOpen ? 'lg:pr-[450px]' : ''}`}>
        <div className="w-full max-w-5xl flex flex-col lg:grid lg:grid-cols-[auto_1fr] justify-center gap-8 lg:gap-16 lg:items-center py-4 lg:py-0">

          <div className="flex flex-col gap-5 mx-auto lg:mx-0 shrink-0 w-[280px] sm:w-[350px] lg:w-[420px]">
            <div className="w-full aspect-square lg:w-[420px] lg:h-[420px] rounded-2xl overflow-hidden shrink-0 shadow-2xl" style={{ boxShadow: '0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)' }}>
              {albumArt && <img src={albumArt} alt={currentTrack.album?.title} className="w-full h-full object-cover" />}
            </div>
            <div className="flex items-center justify-between w-full">
              <p className="text-xs text-white/25 uppercase tracking-wider truncate min-w-0 flex-1 text-center lg:text-left">{currentTrack.album?.title}</p>
            </div>
          </div>

          <div className="flex flex-col gap-8 shrink-0">
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="mb-3 flex items-center gap-2">
                  {currentTrack.audioQuality && (
                    <span className="inline-flex items-center px-1.5 py-[1px] rounded-[3px] border border-white/20 text-[9px] uppercase font-bold tracking-widest text-[#00FFFF] bg-[#00FFFF]/10 shadow-[0_0_12px_rgba(29,185,84,0.15)]">
                      {currentTrack.audioQuality.replace(/_/g, ' ')}
                    </span>
                  )}
                  {currentTrack.streamInfo && (
                    <span className="text-[10px] font-medium text-white/40 uppercase tracking-widest pl-1 border-l border-white/10">
                      {(() => {
                        const { codec, sampleRate, bitDepth } = currentTrack.streamInfo;
                        const parts = [];
                        
                        let cdc = codec;
                        // Recover codec if missing but quality implies it
                        if (!cdc && currentTrack.audioQuality?.includes('LOSSLESS')) {
                            cdc = 'FLAC';
                        }
                        
                        if (cdc) {
                           if (cdc.toLowerCase() === 'm4a' || cdc.toLowerCase().includes('mp4')) cdc = 'AAC';
                           parts.push(cdc.toUpperCase());
                        }
                        
                        // Handle formatting intelligently
                        if (bitDepth) parts.push(`${bitDepth}-BIT`);
                        if (sampleRate) {
                          // Format 44100 -> 44.1kHz cleanly
                          const sr = sampleRate / 1000;
                          parts.push(`${Number.isInteger(sr) ? sr : sr.toFixed(1)}kHz`);
                        }
                        
                        // Infer approximate bitrate explicitly for Lossless tier
                        if (currentTrack.audioQuality?.includes('LOSSLESS') && bitDepth && sampleRate) {
                          parts.push(Math.round((bitDepth * sampleRate * 2) / 1000) + ' KBPS');
                        } else if (currentTrack.audioQuality === 'HIGH') {
                          parts.push('320 KBPS');
                        } else if (currentTrack.audioQuality === 'LOW') {
                          parts.push('96 KBPS');
                        }
                        return parts.join(' • ');
                      })()}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between w-full">
                  <h1 className="font-bold leading-none mb-3" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'clamp(1.75rem, 3.5vw, 3rem)', letterSpacing: '-0.03em' }} title={currentTrack.title}>
                    {currentTrack.title}
                  </h1><button onClick={() => currentTrack && toggleLike(currentTrack)} className={`p-2 shrink-0 transition-colors ${liked ? 'text-white' : 'text-white/20 hover:text-white/50'}`} title="Save to Liked Songs"><svg className="w-8 h-8" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg></button>
                </div>
                <p className="text-base text-white/50 pointer-events-auto break-words" title={currentTrack.artists?.map(a => a.name).join(', ') ?? currentTrack.artist?.name}>
                  {currentTrack.artists?.map((a, i) => (<React.Fragment key={a.id}><Link to={`/artist/${a.id}`} className="hover:text-white transition-colors cursor-pointer">{a.name}</Link>{i < (currentTrack.artists?.length || 0) - 1 && ', '}</React.Fragment>)) ?? (currentTrack.artist ? <Link to={`/artist/${currentTrack.artist.id}`} className="hover:text-white transition-colors cursor-pointer">{currentTrack.artist.name}</Link> : null)}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <Slider min={0} max={durationMs || 1} value={seekValue !== null ? seekValue : positionMs} onChange={v => setSeekValue(v)} onCommit={handleSeekCommit} />
              <div className="flex justify-between" style={{ fontSize: '0.67rem', letterSpacing: '0.06em' }}>
                <span className="text-white/25">{fmt(seekValue !== null ? seekValue : positionMs)}</span>
                <span className="text-white/20">{fmt(durationMs)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button onClick={() => player?.toggleShuffle()} className={`relative p-2.5 rounded-xl transition-all ${shuffle ? 'text-white bg-white/[0.07]' : 'text-white/30 hover:text-white/60 hover:bg-white/[0.04]'}`} title="Shuffle">
                <IconShuffle />
                {shuffle && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white" />}
              </button>
              <button onClick={handlePrev} className="p-2.5 text-white/50 hover:text-white hover:bg-white/[0.04] rounded-xl transition-all" title="Previous"><IconPrev /></button>
              <button onClick={handlePlayPause} className="w-16 h-16 rounded-full bg-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
                {isPaused
                  ? <svg className="w-7 h-7 text-black ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  : <svg className="w-7 h-7 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                }
              </button>
              <button onClick={handleNext} className="p-2.5 text-white/50 hover:text-white hover:bg-white/[0.04] rounded-xl transition-all" title="Next"><IconNext /></button>
              <button onClick={() => storeRepeat(((repeatMode + 1) % 3) as 0 | 1 | 2)} className={`relative p-2.5 rounded-xl transition-all ${repeatMode > 0 ? 'text-white bg-white/[0.07]' : 'text-white/30 hover:text-white/60 hover:bg-white/[0.04]'}`}>
                {repeatMode === 2 ? <IconRepeatOne /> : <IconRepeat />}
                {repeatMode > 0 && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white" />}
              </button>
            </div>



            <div className="flex items-center gap-2 flex-wrap">
              {/* Lyrics */}
              <button onClick={toggleLyrics} aria-label="Toggle lyrics" className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${showLyrics ? 'bg-white text-black' : 'bg-white/[0.05] text-white/40 hover:text-white hover:bg-white/[0.09]'}`}>
                <IconMic /><span>Lyrics</span>
              </button>

              {/* Queue */}
              <button onClick={toggleQueue} aria-label="Toggle queue" className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${showQueue ? 'bg-white text-black' : 'bg-white/[0.05] text-white/40 hover:text-white hover:bg-white/[0.09]'}`}>
                <IconQueue /><span>Queue</span>
              </button>



              {/* Overflow / Share */}
              <div ref={overflowRef} className="relative ml-auto overflow-visible">
                <button
                  onClick={() => {
                    setShowOverflow(v => !v);
                    setPlaylistSubOpen(false);
                  }}
                  aria-label="More options"
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-white/30 hover:text-white hover:bg-white/[0.07] transition-all"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                </button>
                {showOverflow && currentTrack && (
                  <div className="absolute bottom-full mb-2 right-0 bg-[#1a1a1a] border border-white/[0.08] rounded-xl overflow-visible shadow-2xl z-50 min-w-[180px] pb-1">
                    <div ref={speedMenuRef} className="relative w-full">
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowSpeedMenu(v => !v); setShowSleepMenu(false); }}
                        className="w-full px-4 py-2.5 text-xs flex items-center justify-between text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.38 8.57l-1.23 1.85a8 8 0 010 7.16l1.23 1.85a10 10 0 000-10.86zm-4.16 2.77a4 4 0 010 3.32l1.22 1.84a6 6 0 000-7l-1.22 1.84zM12 6a6 6 0 100 12A6 6 0 0012 6zm0 2a4 4 0 110 8 4 4 0 010-8z"/></svg>
                          Playback speed
                        </div>
                        <span className="text-white/40">{speed}×</span>
                      </button>
                      {showSpeedMenu && (
                        <div className="absolute right-full bottom-0 mr-1 bg-[#1a1a1a] border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl z-[60] min-w-[100px]">
                          {SPEEDS.map(s => (
                            <button key={s} onClick={(e) => { e.stopPropagation(); applySpeed(s); }}
                              className={`w-full px-4 py-2 text-xs text-left flex items-center justify-between gap-4 hover:bg-white/[0.06] transition-colors ${
                                speed === s ? 'text-white font-medium' : 'text-white/50'
                              }`}
                            >
                              <span>{s}×</span>
                              {speed === s && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div ref={sleepMenuRef} className="relative w-full">
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowSleepMenu(v => !v); setShowSpeedMenu(false); }}
                        className="w-full px-4 py-2.5 text-xs flex items-center justify-between text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M11 3a9 9 0 100 18A9 9 0 0011 3zm0 16A7 7 0 1111 5a7 7 0 010 14zm.5-11H10v6l5.25 3.15.75-1.23L11.5 13V8z"/></svg>
                          Sleep timer
                        </div>
                        <span className="text-white/40">{sleepLabel || 'Off'}</span>
                      </button>
                      {showSleepMenu && (
                        <div className="absolute right-full bottom-0 mr-1 bg-[#1a1a1a] border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl z-[60] min-w-[110px]">
                          {[0, 15, 30, 45, 60].map(m => (
                            <button key={m} onClick={(e) => { e.stopPropagation(); activateSleep(m); }}
                              className={`w-full px-4 py-2 text-xs text-left flex items-center justify-between gap-4 hover:bg-white/[0.06] transition-colors ${
                                sleepMinutes === m ? 'text-white font-medium' : 'text-white/50'
                              }`}
                            >
                              <span>{m === 0 ? 'Off' : `${m} min`}</span>
                              {sleepMinutes === m && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="h-px bg-white/[0.06] my-1 mx-2" />
                    <button onClick={handleShare}
                      className="w-full px-4 py-2.5 text-xs text-left flex items-center gap-3 text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>
                      {copied ? 'Copied!' : 'Copy track link'}
                    </button>
                    {currentTrack.album && (
                      <Link
                        to={`/album/${currentTrack.album.id}`}
                        onClick={() => setShowOverflow(false)}
                        className="w-full px-4 py-2.5 text-xs flex items-center gap-3 text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
                        Go to album
                      </Link>
                    )}
                    <div className="h-px bg-white/[0.06] my-1 mx-2" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowOverflow(false);
                        getTrackRecommendations(currentTrack.id).then(tracks => {
                          usePlayerStore.getState().setQueue([currentTrack, ...tracks], 0, true);
                        }).catch(() => {});
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-[#00FFFF] font-bold hover:bg-white/[0.06] transition-colors flex items-center gap-3"
                    >
                      <svg className="w-4 h-4 text-[#00FFFF]" fill="currentColor" viewBox="0 0 24 24"><path d="M3.24 6.15C2.51 6.43 2 7.17 2 8v12a2 2 0 002 2h16a2 2 0 002-2V8c0-.83-.51-1.57-1.24-1.85L15 4l-6 2-5.76-1.85zM8 7v10H4V8h4zm12 1v9h-4V8h4zM12 9v8h-2V9h2z"/></svg>
                      Song Radio
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowOverflow(false);
                        setShowInfo(true);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-3"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
                      Song Info
                    </button>

                    <div
                      className="relative"
                      onMouseEnter={() => setPlaylistSubOpen(true)}
                      onMouseLeave={() => setPlaylistSubOpen(false)}
                    >
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-left px-4 py-2.5 text-xs text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M14 10H2v2h12v-2zm0-4H2v2h12V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM2 16h8v-2H2v2z"/></svg>
                          Add to Playlist
                        </div>
                        <svg className="w-4 h-4 ml-2" fill="currentColor" viewBox="0 0 24 24"><path d="M10 17l5-5-5-5v10z"/></svg>
                      </button>

                      {playlistSubOpen && (
                        <div className="absolute right-full bottom-0 mr-1 min-w-[180px] bg-[#1a1a1a] border border-white/[0.08] rounded-xl shadow-2xl py-1 z-[60] max-h-[300px] overflow-y-auto">
                          {customPlaylists.length === 0 ? (
                            <div className="px-4 py-3 text-xs text-white/50 text-center italic">No playlists yet</div>
                          ) : (
                            customPlaylists.map(p => (
                              <button
                                key={p.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addTrackToPlaylist(p.id, currentTrack);
                                  setShowOverflow(false);
                                  setPlaylistSubOpen(false);
                                }}
                                className="w-full text-left px-4 py-2.5 text-xs text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors line-clamp-1"
                              >
                                {p.name}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>


                    <button
                      onClick={() => { usePlayerStore.getState().addNextToQueue(currentTrack); setShowOverflow(false); }}
                      className="w-full px-4 py-2.5 text-xs text-left flex items-center gap-3 text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/></svg>
                      Add to queue next
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {showInfo && currentTrack && <SongInfoModal track={currentTrack} onClose={() => setShowInfo(false)} />}
    </div>
  );
};
