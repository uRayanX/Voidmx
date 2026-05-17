import React from 'react';
import type { SpotifyArtist } from '../../types/spotify';

interface TopArtistsProps {
  artists: SpotifyArtist[];
  loading?: boolean;
}

export const TopArtists: React.FC<TopArtistsProps> = ({ artists, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-square bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {artists.map((artist, i) => {
        const img = artist.images?.[0]?.url;
        return (
          <a
            key={artist.id}
            href={artist.external_urls.spotify}
            target="_blank"
            rel="noopener noreferrer"
            className="relative rounded-xl overflow-hidden aspect-square group cursor-pointer"
          >
            {img ? (
              <img src={img} alt={artist.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#282828] flex items-center justify-center text-4xl">🎤</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <span className="text-xs text-gray-400 font-medium">#{i + 1}</span>
              <p className="text-sm font-semibold text-white truncate group-hover:text-[#00FFFF] transition-colors">
                {artist.name}
              </p>
              {artist.genres?.length ? (
                <p className="text-xs text-gray-400 truncate">{artist.genres[0]}</p>
              ) : null}
            </div>
          </a>
        );
      })}
    </div>
  );
};
