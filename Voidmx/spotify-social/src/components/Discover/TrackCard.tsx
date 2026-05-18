import React, { useState } from 'react';
import type { TidalTrack } from '../../types/tidal';
import { getCoverUrl } from '../../api/tidal';
import { usePlayerStore } from '../../store/playerStore';

interface TrackCardProps {
  track: TidalTrack;
  index?: number;
}

function secsToMin(secs: number): string {
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
}

export const TrackCard: React.FC<TrackCardProps> = ({ track, index }) => {
  const [queued, setQueued] = useState(false);

  const handlePlay = () => {
    usePlayerStore.getState().setQueue([track], 0);
  };

  const handleQueue = (e: React.MouseEvent) => {
    e.stopPropagation();
    usePlayerStore.getState().appendToQueue(track);
    setQueued(true);
    setTimeout(() => setQueued(false), 2000);
  };

  const art = track.album?.cover ? getCoverUrl(track.album.cover, 80) : null;

  return (
    <button
      onClick={handlePlay}
      className="w-full flex items-center gap-4 px-2 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors group text-left"
    >
      <span className="w-5 text-xs text-faint text-right shrink-0 group-hover:hidden">
        {index !== undefined ? index + 1 : ''}
      </span>
      <svg className="hidden group-hover:block w-5 h-5 text-white/60 shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z"/>
      </svg>

      {art ? (
        <img src={art} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-white/[0.07] shrink-0" />
      )}

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{track.title}</p>
        <p className="text-xs text-muted truncate">{track.artists?.map(a => a.name).join(', ') ?? track.artist?.name}</p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={handleQueue}
          title="Add to queue"
          className={`opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all ${
            queued ? 'bg-white text-black' : 'bg-white/8 text-white/50 hover:bg-white/15 hover:text-white'
          }`}
        >
          {queued ? '✓' : '+'}
        </button>
        <span className="text-xs text-faint w-10 text-right">{secsToMin(track.duration)}</span>
      </div>
    </button>
  );
};
