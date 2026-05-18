import React from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { getCoverUrl } from '../../api/tidal';
import { TrackMenu } from '../TrackMenu';

function fmt(secs: number) {
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
}

export const QueuePanel: React.FC = () => {
  const queue         = usePlayerStore(s => s.queue);
  const queueIndex    = usePlayerStore(s => s.queueIndex);
  const currentTrack  = usePlayerStore(s => s.currentTrack);
  const setQueue      = usePlayerStore(s => s.setQueue);
  const removeFromQueue = usePlayerStore(s => s.removeFromQueue);
  const clearQueue      = usePlayerStore(s => s.clearQueue);

  const upNext = queue.slice(queueIndex + 1, queueIndex + 51); // Show next 50 tracks

  const playTrack = (index: number) => setQueue(queue, index);

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      {/* Current Track */}
      {currentTrack && (
        <div className="px-4 pt-4 pb-3 border-b border-white/[0.06]">
          <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2 font-medium">Now Playing</p>
          <div className="flex items-center gap-3">
            {currentTrack.album?.cover ? (
              <img
                src={getCoverUrl(currentTrack.album.cover, 80)}
                alt=""
                className="w-12 h-12 rounded-lg object-cover shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-white/[0.07] shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{currentTrack.title}</p>
              <p className="text-xs text-white/40 truncate">
                {currentTrack.artists?.map(a => a.name).join(', ') ?? currentTrack.artist?.name}
              </p>
            </div>
            <span className="text-xs text-white/25 shrink-0">{fmt(currentTrack.duration)}</span>
          </div>
        </div>
      )}

      {/* Up Next */}
      {upNext.length > 0 ? (
        <div className="py-3">
          <div className="flex items-center justify-between px-4 mb-2">
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-medium">
              Up Next ({upNext.length})
            </p>
            <button
              onClick={clearQueue}
              className="text-[10px] text-white/40 hover:text-white uppercase tracking-widest font-medium transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="space-y-0.5">
            {upNext.map((track, i) => {
              const globalIdx = queueIndex + 1 + i;
              return (
                <div
                  key={`${track.id}-${i}`}
                  className="group flex items-center gap-3 px-4 py-2 hover:bg-white/[0.03] transition-colors"
                >
                  <button
                    onClick={() => playTrack(globalIdx)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    {track.album?.cover ? (
                      <img
                        src={getCoverUrl(track.album.cover, 80)}
                        alt=""
                        className="w-10 h-10 rounded object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-white/[0.05] shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{track.title}</p>
                      <p className="text-xs text-white/35 truncate">
                        {track.artists?.map(a => a.name).join(', ') ?? track.artist?.name}
                      </p>
                    </div>
                    <span className="text-xs text-white/20 shrink-0 tabular-nums">{fmt(track.duration)}</span>
                  </button>
                  <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 flex items-center shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromQueue(globalIdx);
                      }}
                      className="p-1.5 hover:bg-white/[0.08] rounded transition-all"
                      title="Remove from queue"
                    >
                      <svg className="w-4 h-4 text-white/40 hover:text-white/70" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <TrackMenu track={track} menuDirection="left" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-12">
          <p className="text-xs text-white/25">Queue is empty</p>
        </div>
      )}
    </div>
  );
};
