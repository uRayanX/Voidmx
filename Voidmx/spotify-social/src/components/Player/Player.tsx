// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { getCoverUrl } from "../../api/tidal";
import { seekAudio, setAudioVolume } from '../../hooks/usePlayer';
import { LyricsPanel } from './LyricsPanel';
import { QueuePanel } from './QueuePanel';

interface PlayerProps {}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export const Player: React.FC<PlayerProps> = () => {
  const {
    currentTrack,
    isPaused,
    isLoading,
    positionMs,
    durationMs,
    bufferedMs,
    volume,
    showLyrics,
    showQueue,
    player,
    shuffleActive,
    repeatMode,
    setVolume,
    toggleLyrics,
    toggleQueue,
    setPositionMs,
  } = usePlayerStore();

  const [seekValue, setSeekValue] = useState<number | null>(null);
  const progressRef = useRef<number>(positionMs);
  const rafRef = useRef<number>(0);

  // Smooth progress with RAF
  useEffect(() => {
    progressRef.current = positionMs;
  }, [positionMs]);

  useEffect(() => {
    if (isPaused || isLoading) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    const start = performance.now();
    const startPos = progressRef.current;

    const tick = (now: number) => {
      const elapsed = now - start;
      const newPos = Math.min(startPos + elapsed, durationMs);
      setPositionMs(newPos);
      if (newPos < durationMs) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPaused, isLoading, positionMs, durationMs, setPositionMs]);

  const handlePlayPause = async () => {
    if (!player) return;
    await player.togglePlay();
  };

  const handlePrev = async () => {
    if (!player) return;
    if (positionMs > 3000) seekAudio(0);
    else await player.previousTrack();
  };

  const handleNext = async () => player?.nextTrack();

  const handleShuffle = () => {
    player?.toggleShuffle();
  };

  const handleRepeat = () => {
    const nextMode = ((repeatMode + 1) % 3) as 0 | 1 | 2;
    usePlayerStore.setState({ repeatMode: nextMode });
    // In Monochrome, setting the mode triggers the internal player behavior based on its getter
  };


  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSeekValue(Number(e.target.value));
  };

  const handleSeekCommit = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    seekAudio(val);
    setPositionMs(val);
    setSeekValue(null);
  };

  const handleVolume = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setAudioVolume(val);
  };

  const displayPos = seekValue !== null ? seekValue : positionMs;
  const progress = durationMs > 0 ? (displayPos / durationMs) * 100 : 0;
  const bufferedProgress = durationMs > 0 ? (bufferedMs / durationMs) * 100 : 0;

  if (!currentTrack) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        Nothing playing
      </div>
    );
  }

  const albumArt = currentTrack.album?.cover ? getCoverUrl(currentTrack.album.cover, 500) : null;

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Lyrics / Queue Panel */}
      {showLyrics && <LyricsPanel />}
      {showQueue && <QueuePanel />}

      {/* Main Player Bar */}
      <div className="flex items-center gap-4 px-4 py-3 border-t border-white/10 bg-[#0a0a0a]">

        {/* Track Info */}
        <div className="flex items-center gap-3 w-64 min-w-0">
                    <img
            src={albumArt}
            alt={currentTrack.album?.title}
            className="w-12 h-12 rounded object-cover shadow-lg shadow-black/60"
            style={{ boxShadow: albumArt ? `0 0 20px 4px rgba(29,185,84,0.2)` : undefined }}
          />
          <div className="min-w-0 pr-2">
            <p className="text-sm font-medium text-white truncate">{currentTrack.title}</p>
            <p className="text-xs text-gray-400 truncate">
              {currentTrack.artists.map(a => a.name).join(', ')}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex-1 flex flex-col items-center gap-1">
                    <div className="flex items-center gap-6">
            <button onClick={handleShuffle} className={`transition-colors ${shuffleActive ? 'text-[#00FFFF]' : 'text-gray-400 hover:text-white'}`} title="Shuffle">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/>
                <path d="m18 2 4 4-4 4"/>
                <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/>
                <path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/>
                <path d="m18 14 4 4-4 4"/>
              </svg>
            </button>

            <button onClick={handlePrev} className="text-gray-400 hover:text-white transition-colors" title="Previous">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/>
              </svg>
            </button>

            <button
              onClick={handlePlayPause}
              className="bg-white text-black rounded-full w-9 h-9 flex items-center justify-center hover:scale-105 transition-transform"
            >
              {isPaused ? (
                <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
              )}
            </button>

            <button onClick={handleNext} className="text-gray-400 hover:text-white transition-colors" title="Next">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zm2.5-6 5.5 3.9V8.1L8.5 12zM16 6h2v12h-2z"/>
              </svg>
            </button>
            
            <button onClick={handleRepeat} className={`transition-colors ${repeatMode !== 0 ? 'text-[#00FFFF]' : 'text-gray-400 hover:text-white'}`} title={repeatMode === 2 ? 'Repeat One' : 'Repeat'}>
              {repeatMode === 2 ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/><path d="M11 10h1v4"/></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>
              )}
            </button>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-2 w-full max-w-md">
            <span className="text-xs text-gray-400 w-8 text-right">{formatTime(displayPos)}</span>
            <div className="relative flex-1 h-1 group">
              <div className="absolute inset-0 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-white/30 transition-all pointer-events-none"
                  style={{ width: `${bufferedProgress}%` }}
                />
                <div
                  className={`absolute top-0 left-0 h-full bg-[#00FFFF] transition-all ${isLoading ? 'progress-loading' : ''}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={durationMs}
                value={displayPos}
                onChange={handleSeekChange}
                onMouseUp={handleSeekCommit as unknown as React.MouseEventHandler}
                onTouchEnd={handleSeekCommit as unknown as React.TouchEventHandler}
                className="absolute inset-0 w-full opacity-0 cursor-pointer h-1"
              />
            </div>
            <span className="text-xs text-gray-400 w-8">{formatTime(durationMs)}</span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3 w-48 justify-end">
          <button
            onClick={toggleLyrics}
            className={`text-sm px-2 py-1 rounded transition-colors ${showLyrics ? 'text-[#00FFFF]' : 'text-gray-400 hover:text-white'}`}
            title="Lyrics"
          >
            Lyrics
          </button>
          <button
            onClick={toggleQueue}
            className={`transition-colors ${showQueue ? 'text-[#00FFFF]' : 'text-gray-400 hover:text-white'}`}
            title="Queue"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 10h11v2H3zm0-4h11v2H3zm0 8h7v2H3zm13-1v8l6-4z"/>
            </svg>
          </button>

          {/* Volume */}
          <div className="flex items-center gap-1">
            <button onClick={() => setAudioVolume(volume === 0 ? 1 : 0)} className="text-gray-400 hover:text-white transition-colors">
              {volume === 0 ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={handleVolume}
              className="w-20 accent-[#00FFFF]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
