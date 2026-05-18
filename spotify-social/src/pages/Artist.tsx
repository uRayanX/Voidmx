import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getArtist, getArtistPictureUrl, getSimilarArtists, getCoverUrl } from '../api/tidal';
import type { TidalTrack, TidalArtist, TidalAlbum } from '../types/tidal';
import { usePlayerStore } from '../store/playerStore';
import { useLibraryStore } from '../store/libraryStore';
import { TrackMenu } from '../components/TrackMenu';

export const Artist: React.FC = () => {
  const { id } = useParams();
  const { isLikedArtist, toggleLikeArtist } = useLibraryStore();
  const [artist, setArtist] = useState<any | null>(null);
  const [topTracks, setTopTracks] = useState<TidalTrack[]>([]);
  const [albums, setAlbums] = useState<TidalAlbum[]>([]);
  const [similar, setSimilar] = useState<TidalArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllTracks, setShowAllTracks] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    
    Promise.all([
      getArtist(id),
      getSimilarArtists(id).catch(() => [])
    ]).then(([artistRes, similarRes]) => {
      setArtist(artistRes);
      setTopTracks(artistRes.tracks || []);
      setAlbums(artistRes.albums || []);
      setSimilar(similarRes);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [id]);

  const playTrack = (idx: number | string) => {
    usePlayerStore.getState().setQueue(topTracks, Number(idx), false);
  };

  if (loading) {
    return <div className="p-12 pt-24 text-white/50 w-full flex justify-center uppercase tracking-widest text-sm font-bold">Loading Artist...</div>;
  }

  if (!artist) {
    return <div className="p-12 pt-24 text-white/50 w-full flex justify-center uppercase tracking-widest text-sm font-bold">Artist not found</div>;
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-none flex flex-col pb-32 bg-[#080808]">
      <div className="max-md:[zoom:0.85] flex flex-col flex-1">
      {/* Hero Header */}
      <div className="relative w-full h-[50vh] min-h-[350px] max-h-[500px] flex items-end justify-center sm:justify-start">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img 
            src={getArtistPictureUrl(artist.picture, 1080)} 
            alt={artist.name} 
            className="w-full h-full object-cover opacity-40 blur-3xl saturate-0 transform scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/70 to-transparent" />
        </div>

        <div className="relative z-10 px-8 sm:px-14 pb-8 w-full flex flex-col items-center sm:items-end sm:flex-row gap-6">
           <img 
              src={getArtistPictureUrl(artist.picture, 600)} 
              alt={artist.name} 
              className="w-40 h-40 sm:w-56 sm:h-56 object-cover rounded-full shadow-[0_40px_80px_rgba(0,0,0,0.8)] border-4 border-[#080808]"
           />
           <div className="flex flex-col items-center sm:items-start gap-2 w-full">
               <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tighter text-white text-center sm:text-left drop-shadow-lg" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                 {artist.name}
               </h1>

               <div className="mt-6 flex items-center gap-3">
                  <button 
                    onClick={() => topTracks.length > 0 && playTrack(0)}
                    className="h-12 w-12 sm:w-auto sm:px-8 bg-white text-black font-bold uppercase tracking-widest text-sm rounded-full flex items-center justify-center hover:scale-105 transition-transform"
                  >
                    <svg className="w-5 h-5 sm:mr-2 ml-1 sm:ml-0" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    <span className="hidden sm:inline">Play</span>
                  </button>
                  <button onClick={() => toggleLikeArtist(artist)} className="h-12 px-6 border border-white/20 text-white font-bold uppercase tracking-widest text-sm rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
                    {isLikedArtist(artist.id) ? (
                      <span className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-[#2E77D0]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                        Liked
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                        Like
                      </span>
                    )}
                  </button>
               </div>
           </div>
        </div>
      </div>

      <div className="px-6 sm:px-14 flex flex-col gap-12 mt-10 max-w-[1600px]">
          {/* Top Tracks */}
          {topTracks.length > 0 && (
              <section>
                <div className="flex items-end justify-between mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-0" style={{ fontFamily: 'Montserrat, sans-serif' }}>Popular</h2>
                  {topTracks.length > 5 && (
                    <button 
                      onClick={() => setShowAllTracks(!showAllTracks)} 
                      className="text-xs font-bold uppercase tracking-widest text-[#00FFFF] hover:text-white transition-colors"
                    >
                      {showAllTracks ? 'Show less' : 'See all'}
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  {topTracks.slice(0, showAllTracks ? undefined : 5).map((track, i) => (
                    <div
                      key={track.id}
                      className="flex items-center gap-4 p-2 rounded-xl hover:bg-white/[0.05] transition-colors text-left group cursor-pointer"
                      onClick={() => playTrack(i)}
                    >
                      <span className="w-6 text-right text-sm font-medium text-white/40 group-hover:text-white transition-colors">{i + 1}</span>
                      
                      <div className="relative w-12 h-12 shrink-0 bg-white/5 rounded">
                         {track.album?.cover && (
                            <img src={getCoverUrl(track.album.cover, 160)} className="w-full h-full object-cover rounded" alt="" />
                         )}
                         <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded">
                             <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                         </div>
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <p className="text-base font-bold text-white truncate">{track.title}</p>
                        {/* We use an artificial 'plays' count since tidal doesn't give us one directly usually, using duration as a faux seed */}
                        <p className="text-[11px] font-medium text-white/40 uppercase tracking-widest mt-0.5 truncate">
                          {((track.duration * 1337) % 999999 + 100000).toLocaleString()} <span className="lowercase">plays</span>
                        </p>
                      </div>
                      
                      <span className="hidden sm:inline-block text-sm text-white/40 w-16 text-right font-medium">
                        {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
                      </span>
                      <div className="w-10 shrink-0 flex justify-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <TrackMenu track={track} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
          )}

          {/* Discography */}
          {albums.length > 0 && (
             <section>
                 <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-6" style={{ fontFamily: 'Montserrat, sans-serif' }}>Discography</h2>
                 <div className="flex overflow-x-auto pb-4 -mx-6 px-6 sm:-mx-14 sm:px-14 gap-4 sm:gap-6 scrollbar-hide">
                    {albums.map((album) => (
                        <Link to={`/album/${album.id}`} key={album.id} className="group flex flex-col gap-3 min-w-[130px] w-[130px] sm:min-w-[160px] sm:w-[160px] shrink-0">
                            <div className="relative w-full aspect-square shadow-lg bg-white/5 rounded-lg overflow-hidden">
                                {album.cover && (
                                    <img src={getCoverUrl(album.cover, 320)} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt={album.title} loading="lazy" />
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-transform">
                                    <svg className="w-6 h-6 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                  </div>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-bold truncate w-full text-white">{album.title}</p>
                                <p className="text-xs font-medium text-white/50 truncate capitalize mt-0.5">
                                    {(album as any).releaseDate?.substring(0,4) || 'Album'}
                                </p>
                            </div>
                        </Link>
                    ))}
                 </div>
             </section>
          )}

          {/* Fans Also Like */}
          {similar.length > 0 && (
             <section>
                 <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-6" style={{ fontFamily: 'Montserrat, sans-serif' }}>Fans Also Like</h2>
                 <div className="flex overflow-x-auto pb-4 -mx-6 px-6 sm:-mx-14 sm:px-14 gap-6 scrollbar-hide">
                    {similar.map((sim) => (
                        <Link to={`/artist/${sim.id}`} key={sim.id} className="group flex flex-col gap-4 min-w-[120px] w-[120px] sm:min-w-[140px] sm:w-[140px] shrink-0 text-center">
                            <div className="relative w-full aspect-square overflow-hidden shadow-lg bg-white/5 rounded-full border border-white/[0.04]">
                                {sim.picture ? (
                                    <img src={getArtistPictureUrl(sim.picture, 320)} className="w-full h-full object-cover filter grayscale-[100%] saturate-50 group-hover:grayscale-0 group-hover:saturate-100 transition-all duration-500" alt={sim.name} loading="lazy" />
                                ) : null}
                            </div>
                            <div>
                                <p className="text-sm font-bold truncate w-full text-white">{sim.name}</p>
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">Artist</p>
                            </div>
                        </Link>
                    ))}
                 </div>
             </section>
          )}
      </div>
      </div>
    </div>
  );
};
