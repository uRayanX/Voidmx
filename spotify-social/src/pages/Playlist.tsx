import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { getPlaylist, getCoverUrl } from '../api/tidal';
import type { TidalPlaylist, TidalTrack } from '../types/tidal';
import { usePlayerStore } from '../store/playerStore';
import { useLibraryStore } from '../store/libraryStore';
import { TrackMenu } from '../components/TrackMenu';

export const Playlist: React.FC = () => {
  const { id } = useParams();
  const { isLikedPlaylist, toggleLikePlaylist } = useLibraryStore();
  const [playlist, setPlaylist] = useState<TidalPlaylist | null>(null);
  const [tracks, setTracks] = useState<TidalTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'default' | 'newest' | 'title' | 'artist' | 'album' | 'duration'>('default');

  useEffect(() => {
    setSortBy('default');
    if (!id) return;
    setLoading(true);
    getPlaylist(id).then(res => {
      setPlaylist(res.playlist);
      setTracks(res.tracks);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [id]);

  const sortedTracks = useMemo(() => {
    if (sortBy === 'default') return tracks;
    const list = [...tracks];
    if (sortBy === 'newest') {
      list.reverse();
    } else if (sortBy === 'title') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'artist') {
      list.sort((a, b) => {
        const aName = a.artists?.[0]?.name || a.artist?.name || '';
        const bName = b.artists?.[0]?.name || b.artist?.name || '';
        return aName.localeCompare(bName);
      });
    } else if (sortBy === 'album') {
      list.sort((a, b) => {
        const aName = a.album?.title || '';
        const bName = b.album?.title || '';
        return aName.localeCompare(bName);
      });
    } else if (sortBy === 'duration') {
      list.sort((a, b) => Number(a.duration || 0) - Number(b.duration || 0));
    }
    return list;
  }, [tracks, sortBy]);
  
  const playTrack = (trackId: number | string) => { 
    const track = sortedTracks.find(t => t.id === trackId);
    if (!track) return;
    usePlayerStore.getState().setQueue(sortedTracks, sortedTracks.findIndex(t => t.id === track.id) >= 0 ? sortedTracks.findIndex(t => t.id === track.id) : 0, false);
  };

  if (loading) {
    return <div className="p-12 pt-24 text-white/50 w-full flex justify-center uppercase tracking-widest text-sm font-bold">Loading Playlist...</div>;
  }

  if (!playlist) {
    return <div className="p-12 pt-24 text-white/50 w-full flex justify-center uppercase tracking-widest text-sm font-bold">Playlist not found</div>;
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-none flex flex-col pb-32 bg-[#080808]">
      <div className="max-md:[zoom:0.85] flex flex-col flex-1">
      {/* Hero Header */}
      <div className="relative w-full flex items-end pt-12 sm:pt-24 pb-8">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img 
            src={getCoverUrl(playlist.squareImage || playlist.image, 1080)} 
            alt={playlist.title} 
            className="w-full h-full object-cover opacity-40 blur-3xl saturate-0 transform scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/70 to-transparent" />
        </div>

        <div className="relative z-10 px-6 sm:px-14 w-full flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-8">
           <img 
              src={getCoverUrl(playlist.squareImage || playlist.image, 600)} 
              alt={playlist.title} 
              className="w-52 h-52 sm:w-60 sm:h-60 object-cover shadow-[0_40px_80px_rgba(0,0,0,0.8)] rounded-lg border border-white/5"
           />
           <div className="flex flex-col items-center sm:items-start gap-3 w-full text-center sm:text-left">
               <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 hidden sm:block">Playlist</span>
               <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tighter text-white mb-1 drop-shadow-lg line-clamp-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                 {playlist.title}
               </h1>
               
               {playlist.description && (
                 <p className="text-xs sm:text-sm text-white/70 max-w-2xl font-medium mt-1 line-clamp-2">
                   {playlist.description}
                 </p>
               )}

               <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-[11px] sm:text-sm text-white/60 font-medium tracking-wide w-full mt-1">
                 {playlist.creator && (playlist.creator as any).name && (
                   <span className="font-bold text-white/90">{(playlist.creator as any).name}</span>
                 )}
                 {playlist.creator && (playlist.creator as any).name && <span className="text-white/30 ml-1">•</span>}
                 <span className="font-bold">{tracks.length} songs</span>
                 {((playlist as any).duration || 0) && (
                   <>
                     <span className="text-white/30 mx-1">•</span>
                     <span className="font-bold">{Math.floor(((playlist as any).duration || 0) / 60)} min</span>
                   </>
                 )}
                 <span className="text-white/30 mx-1">•</span>
                 <span className="font-bold">Playlist</span>
               </div>

               <div className="mt-4 flex items-center gap-3">
                  <button 
                    onClick={() => sortedTracks.length > 0 && playTrack(sortedTracks[0].id)}
                    className="h-12 w-12 sm:w-auto sm:px-8 bg-white text-black font-bold uppercase tracking-widest text-sm rounded-full flex items-center justify-center hover:scale-105 transition-transform"
                  >
                    <svg className="w-5 h-5 sm:mr-2 ml-1 sm:ml-0" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    <span className="hidden sm:inline">Play</span>
                  </button>
                  <button onClick={() => toggleLikePlaylist(playlist)} className="h-12 w-12 border border-white/20 text-white rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
                    {isLikedPlaylist(playlist.uuid) ? (
                      <svg className="w-5 h-5 text-[#2E77D0]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                    )}
                  </button>
               </div>
           </div>
        </div>
      </div>

      {/* Tracks */}
      <div className="px-6 sm:px-14 flex flex-col gap-2 mt-6 max-w-[1600px]">
        <div className="flex items-center justify-end mb-4 px-2">
            <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs font-bold uppercase tracking-widest text-white/50 hover:text-white border-0 focus:outline-none transition-colors cursor-pointer text-right appearance-none"
            >
                <option value="default" className="bg-[#1a1a1a]">Sort by: Custom</option>
                <option value="newest" className="bg-[#1a1a1a]">Sort by: Newest Added</option>
                <option value="title" className="bg-[#1a1a1a]">Sort by: Title</option>
                <option value="artist" className="bg-[#1a1a1a]">Sort by: Artist</option>
                <option value="album" className="bg-[#1a1a1a]">Sort by: Album</option>
            </select>
        </div>
        
        {/* Tracklist styling mapped to minimalistic view */}
        <div className="flex flex-col gap-1">
          {sortedTracks.map((track, i) => (
            <div
              key={track.id}
              onClick={() => playTrack(track.id)}
              className="flex items-center gap-4 p-2 rounded-xl hover:bg-white/[0.05] transition-colors text-left group cursor-pointer"
            >
              <span className="w-6 sm:w-8 text-right text-sm font-medium text-white/40 group-hover:text-white transition-colors">
                {i + 1}
              </span>
              
              <div className="flex-1 min-w-0 flex items-center gap-3">
                <div className="relative w-10 h-10 sm:w-12 sm:h-12 shrink-0 bg-white/5 rounded">
                   {track.album?.cover && (
                      <img src={getCoverUrl(track.album.cover, 160)} className="w-full h-full object-cover rounded" alt="" />
                   )}
                   <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded">
                       <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                   </div>
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
                  <p className="text-base font-bold text-white truncate">{track.title}</p>
                  <p className="text-[12px] font-medium text-white/40 truncate mt-0.5">
                    {track.artists?.map(a => a.name).join(', ') ?? track.artist?.name}
                  </p>
                </div>
              </div>

              {/* Album column kept for playlists but made minimal */}
              <div className="hidden md:block w-48 lg:w-64 text-[13px] font-medium text-white/40 hover:text-white/70 transition-colors truncate">
                 {track.album?.title}
              </div>

              <span className="hidden sm:inline-block text-sm text-white/40 w-12 sm:w-16 text-right font-medium mr-2">
                {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
              </span>
              <div className="w-10 shrink-0 flex justify-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <TrackMenu track={track} />
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
};
