import React from 'react';
import type { SpotifyTrack } from '../../types/spotify';
import { addToQueue } from '../../api/spotify';

interface TopTracksProps {
  tracks: SpotifyTrack[];
  token: string;
  loading?: boolean;
}

function msToMin(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export const TopTracks: React.FC<TopTracksProps> = ({ tracks, token, loading }) => {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 bg-white/5 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <ol className="space-y-1">
      {tracks.map((track, i) => (
        <li
          key={track.id}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group"
        >
          <span className="text-gray-500 text-sm w-5 text-right shrink-0">{i + 1}</span>
          <img
            src={track.album.images[2]?.url || track.album.images[0]?.url}
            alt=""
            className="w-10 h-10 rounded"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate font-medium">{track.name}</p>
            <p className="text-xs text-gray-400 truncate">{track.artists.map((a: any) => a.name).join(', ')}</p>
          </div>
          <span className="text-xs text-gray-500 shrink-0">{msToMin(track.duration_ms)}</span>
          <button
            onClick={() => addToQueue(token, track.uri).catch(console.error)}
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-[#00FFFF] transition-all text-xs"
            title="Add to queue"
          >
            +Queue
          </button>
        </li>
      ))}
    </ol>
  );
};
