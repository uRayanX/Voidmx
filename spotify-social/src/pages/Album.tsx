import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAlbum, getCoverUrl, getArtistPictureUrl } from '../api/tidal';
import type { TidalAlbum, TidalTrack } from '../types/tidal';
import { usePlayerStore } from '../store/playerStore';
import { useLibraryStore } from '../store/libraryStore';
import { TrackMenu } from '../components/TrackMenu';

export const Album: React.FC = () => {
  const { id } = useParams();
  const { isLikedAlbum, toggleLikeAlbum } = useLibraryStore();
  const [album, setAlbum] = useState<TidalAlbum | null>(null);
  const [tracks, setTracks] = useState<TidalTrack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getAlbum(id).then(res => {
      setAlbum(res.album);
      setTracks(res.tracks);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [id]);




  const playTrack = (idx: number | string) => {
    usePlayerStore.getState().setQueue(tracks, Number(idx), false);
  };

  if (loading) {
    return <div className="p-12 pt-24 text-white/50 w-full flex justify-center uppercase tracking-widest text-sm font-bold">Loading Album...</div>;
  }

  if (!album) {
    return <div className="p-12 pt-24 text-white/50 w-full flex justify-center uppercase tracking-widest text-sm font-bold">Album not found</div>;
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-none flex flex-col pb-32 bg-[#080808]">
      <div className="max-md:[zoom:0.85] flex flex-col flex-1">
      {/* Hero Header */}
      <div className="relative w-full flex items-end pt-12 sm:pt-24 pb-8">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img 
            src={getCoverUrl(album.cover, 1080)} 
            alt={album.title} 
            className="w-full h-full object-cover opacity-40 blur-3xl saturate-0 transform scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/70 to-transparent" />
        </div>

        <div className="relative z-10 px-6 sm:px-14 w-full flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-8">
           <img 
              src={getCoverUrl(album.cover, 600)} 
              alt={album.title} 
              className="w-52 h-52 sm:w-60 sm:h-60 object-cover shadow-[0_40px_80px_rgba(0,0,0,0.8)] rounded-lg border border-white/5"
           />
           <div className="flex flex-col items-center sm:items-start gap-3 w-full text-center sm:text-left">
               <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 hidden sm:block">Album</span>
               <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tighter text-white mb-2 drop-shadow-lg line-clamp-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                 {album.title}
               </h1>
               
               <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-[11px] sm:text-sm text-white/60 font-medium tracking-wide w-full">
                 {/* First artist with image */}
                 {(album.artists && album.artists.length > 0) && (
                   <Link to={`/artist/${album.artists[0].id}`} className="hover:text-white transition-colors flex items-center gap-2 group mr-1">
                     <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full overflow-hidden bg-white/10 shrink-0">
                       {album.artists[0].picture ? (
                         <img src={getArtistPictureUrl(album.artists[0].picture, 160)} className="w-full h-full object-cover grayscale-[100%] group-hover:grayscale-0 transition-all" alt="" />
                       ) : null}
                     </div>
                     <span className="font-bold text-white/90 group-hover:text-white">{album.artists[0].name}</span>
                   </Link>
                 )}
                 {album.artists?.slice(1).map((a) => (
                   <React.Fragment key={a.id}>
                     <span className="text-white/30">•</span>
                     <Link to={`/artist/${a.id}`} className="hover:text-white transition-colors font-bold text-white/90">{a.name}</Link>
                   </React.Fragment>
                 ))}
                 
                 <span className="text-white/30 ml-1">•</span>
                 <span className="font-bold">{(album as any).releaseDate?.substring(0,4) || 'Album'}</span>
                 <span className="text-white/30 mx-1">•</span>
                 <span className="font-bold">{album.numberOfTracks} tracks</span>
               </div>

               <div className="mt-4 flex items-center gap-3">
                  <button 
                    onClick={() => tracks.length > 0 && playTrack(0)}
                    className="h-12 w-12 sm:w-auto sm:px-8 bg-white text-black font-bold uppercase tracking-widest text-sm rounded-full flex items-center justify-center hover:scale-105 transition-transform"
                  >
                    <svg className="w-5 h-5 sm:mr-2 ml-1 sm:ml-0" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    <span className="hidden sm:inline">Play</span>
                  </button>
                  <button onClick={() => toggleLikeAlbum(album)} className="h-12 w-12 border border-white/20 text-white rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
                    {isLikedAlbum(album.id) ? (
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
        {/* Header removed to match Spotify's minimal table rows */}
        <div className="flex flex-col gap-1">
          {tracks.map((track, i) => (
            <div
              key={track.id}
              onClick={() => playTrack(i)}
              className="flex items-center gap-4 p-2 rounded-xl hover:bg-white/[0.05] transition-colors text-left group cursor-pointer"
            >
              <span className="w-6 sm:w-8 text-right text-sm font-medium text-white/40 group-hover:text-white transition-colors">{i + 1}</span>
              
              <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
                <p className="text-base font-bold text-white truncate">{track.title}</p>
                <p className="text-[12px] font-medium text-white/40 truncate mt-0.5">
                  {track.artists?.map(a => a.name).join(', ') ?? track.artist?.name}
                </p>
              </div>

              <span className="text-sm text-white/40 w-12 sm:w-16 text-right font-medium mr-2">
                {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
              </span>
              <div className="w-8 shrink-0 flex justify-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <TrackMenu track={track} />
              </div>
            </div>
          ))}
        </div>
        
        {/* Footer info block */}
        <div className="mt-8 pt-6 border-t border-white/[0.04]">
            <p className="text-xs font-bold text-white/30 uppercase tracking-widest">
               {(album as any).releaseDate 
                  ? new Date((album as any).releaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                  : ''}
            </p>
        </div>
      </div>
      </div>
    </div>
  );
};
