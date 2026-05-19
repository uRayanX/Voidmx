// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { getQueue } from '../../api/spotify';
import type { SpotifyTrack } from '../../types/spotify';

interface QueueProps {
  token: string;
}

function msToMin(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export const Queue: React.FC<QueueProps> = ({ token }) => {
  const { currentTrack } = usePlayerStore();
  const [queue, setQueue] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getQueue(token)
      .then(q => setQueue(q.queue.slice(0, 20)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, currentTrack?.id]);

  return (
    <div className="absolute bottom-full left-0 right-0 h-72 bg-[#111]/95 backdrop-blur-sm border-t border-white/10 overflow-y-auto">
      <div className="px-4 py-3 border-b border-white/10">
        <h3 className="text-sm font-semibold text-white">Queue</h3>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 animate-pulse">Loading...</div>
      ) : queue.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-gray-500 text-sm">Queue is empty</div>
      ) : (
        <ul className="divide-y divide-white/5">
          {queue.map((track, i) => (
            <li key={`${track.id}-${i}`} className="flex items-center gap-3 px-4 py-2 hover:bg-white/5 transition-colors">
              <span className="text-gray-500 text-xs w-4 text-center">{i + 1}</span>
              <img src={track.album.images[2]?.url || track.album.images[0]?.url} alt="" className="w-8 h-8 rounded" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{track.name}</p>
                <p className="text-xs text-gray-400 truncate">{track.artists.map(a => a.name).join(', ')}</p>
              </div>
              <span className="text-xs text-gray-500">{msToMin(track.duration_ms)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
