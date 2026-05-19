import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { TidalTrack, TidalArtist, TidalAlbum, TidalPlaylist } from '../types/tidal';
import { usePlayerStore } from '../store/playerStore';
import {
  getCoverUrl, getHistory, getArtistPictureUrl, getTrackRecommendations, searchPlaylists, searchAlbums, getSimilarArtists
} from '../api/tidal';
import { EqBars } from '../components/EqBars';
import { GENRES } from '../lib/genres';
import { prioritizeRadioTracks } from '../utils/radioMix';



const SectionTitle = ({ children, sub }: { children: React.ReactNode, sub?: React.ReactNode }) => (
  <div className="flex flex-col items-start justify-center mb-6">
    <h2 className="text-2xl font-bold tracking-tight text-white capitalize break-words w-full" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      {children}
    </h2>
    {sub && <p className="text-sm text-gray-400 mt-1">{sub}</p>}
  </div>
);

export const Home = () => {
  const setQueue = usePlayerStore(state => state.setQueue);
  const currentTrack = usePlayerStore(state => state.currentTrack);
  const isPaused = usePlayerStore(state => state.isPaused);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const [recentTracks] = useState<TidalTrack[]>(() => {
     const history = getHistory(50);
     const deduped: TidalTrack[] = [];
     const seen = new Set();
     for (const t of history) {
         if (!seen.has(t.id)) {
             seen.add(t.id);
             deduped.push(t);
         }
         if (deduped.length >= 10) break;
     }
     return deduped;
  });

  // State objects for our algorithmic discovery
      const [recommendedByTrack, setRecommendedByTrack] = useState<{ track: TidalTrack | null, recs: TidalTrack[] }>({ track: null, recs: [] });
  const [publicPlaylists, setPublicPlaylists] = useState<TidalPlaylist[]>([]);
  const [genrePlaylists, setGenrePlaylists] = useState<TidalPlaylist[]>([]);
  const [albumMix, setAlbumMix] = useState<TidalAlbum[]>([]);
  const [simArtists, setSimArtists] = useState<TidalArtist[]>([]);

  useEffect(() => {
     const history = getHistory(50);
     if (history.length === 0) return;

     // 1. Analyze play history
     const artistCounts = new Map<string | number, { data: TidalArtist, count: number }>();
     
     history.forEach(t => {
         const art = t.artists?.[0] || t.artist;
         if (art) {
             const existing = artistCounts.get(art.id) || { data: art, count: 0 };
             existing.count += 1;
             artistCounts.set(art.id, existing);
         }
         
     });

     // Sort to find the most heavily listened artist and album
     const sortedArtists = Array.from(artistCounts.values()).sort((a,b) => b.count - a.count);
     
     const bestArtist = sortedArtists[0]?.data || null;
     
          
     // 2. Fetch specific recommendations based on extracted info
     if (bestArtist) {
         searchPlaylists(bestArtist.name, 10).then(p => setPublicPlaylists(p.slice(0, 8))).catch(() => {});
         const secondArtist = sortedArtists[1]?.data || bestArtist;
         if (secondArtist) {
             searchPlaylists(secondArtist.name + " mix", 10).then(p => setGenrePlaylists(p.slice(0, 6))).catch(() => {});
         }
         searchAlbums(bestArtist.name, 10).then(a => setAlbumMix(a.slice(0, 8))).catch(() => {});
         getSimilarArtists(bestArtist.id).then(a => setSimArtists(a.slice(0, 8))).catch(() => {});
     }

     const seedTrack = history[Math.floor(Math.random() * Math.min(10, history.length))] || history[0];
     if (seedTrack) {
         getTrackRecommendations(seedTrack.id).then(recs => {
             setRecommendedByTrack({ track: seedTrack, recs: prioritizeRadioTracks(seedTrack, recs).slice(0, 10) });
         }).catch(() => {});
     }
  }, []);

  return (
    <div className="h-full overflow-y-auto scrollbar-none pb-32">
      <div className="px-6 md:px-10 lg:px-12 max-w-[2000px] pt-12 pb-10 max-md:[zoom:0.85]">
        
        <div className="mb-10">
           <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
             {greeting}
           </h1>
        </div>

        {recentTracks.length === 0 ? (
           <div className="flex flex-col items-center justify-center mt-32 text-center">
             <div className="w-16 h-16 rounded-full bg-white/[0.05] flex items-center justify-center mb-6">
               <svg className="w-6 h-6 text-white/20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v9.28A4 4 0 1014 16V7h4V3h-6z"/></svg>
             </div>
             <h2 className="text-2xl font-bold mb-2">Welcome to VOID</h2>
             <p className="text-white/50 max-w-sm">Start searching and exploring. Your personalized mixes, genres, and algorithm recommendations will appear here.</p>
           </div>
        ) : (
           <div className="flex flex-col gap-y-12">
             
             {/* 1. Jump Back In (History) */}
             <section>
               <SectionTitle>Jump Back In</SectionTitle>
               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                 {recentTracks.slice(0, 8).map(track => {
                    const isPlaying = currentTrack?.id === track.id && !isPaused;
                    return (
                        <div key={track.id} onClick={() => {
                             setQueue([track], 0, true);
                             getTrackRecommendations(track.id).then(r => setQueue([track, ...prioritizeRadioTracks(track, r)], 0, true)).catch(() => {});
                        }} className="group relative flex items-center gap-3 bg-white/[0.04] hover:bg-white/[0.1] transition-colors rounded-lg p-2 pr-4 cursor-pointer overflow-hidden">
                          {track.album?.cover ? (
                            <img src={getCoverUrl(track.album?.cover, 80) || ''} className="w-14 h-14 object-cover rounded shadow" alt="" loading="lazy" />
                          ) : (
                            <div className="w-14 h-14 bg-white/5 rounded" />
                          )}
                          <p className="font-bold text-sm text-white truncate flex-1">{track.title}</p>
                          {isPlaying && <div className="absolute right-3"><EqBars paused={false} /></div>}
                        </div>
                    );
                 })}
               </div>
             </section>

             {/* 2. Custom Track Recommender (Song Radio seed) */}
             {recommendedByTrack.recs.length > 0 && (
               <section>
                 <SectionTitle sub="An endless stream based on your listening">Smart Radio</SectionTitle>
                 <div className="flex overflow-x-auto gap-5 pb-4 no-scrollbar">
                   {recommendedByTrack.recs.map(t => (
                      <div key={t.id} className="group relative flex-none w-[140px] md:w-[160px] cursor-pointer" onClick={() => {
                           setQueue([t], 0, true);
                           getTrackRecommendations(t.id).then(r => setQueue([t, ...prioritizeRadioTracks(t, r)], 0, true)).catch(() => {});
                      }}>
                         <div className="relative aspect-square w-full mb-3 rounded-lg overflow-hidden bg-white/[0.04]">
                           {t.album?.cover && <img src={getCoverUrl(t.album.cover, 320) || ''} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />}
                           <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                             <div className="w-12 h-12 rounded-full bg-[#00FFFF] text-black flex items-center justify-center shadow-2xl hover:scale-105 transition-transform">
                                <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                             </div>
                           </div>
                         </div>
                         <p className="text-sm font-bold text-white truncate w-full">{t.title}</p>
                         <p className="text-xs text-white/50 truncate w-full mt-1">{t.artists?.map(a => a.name).join(", ") ?? t.artist?.name}</p>
                      </div>
                   ))}
                 </div>
               </section>
             )}

             {/* 3. Thematic Playlists (Extracted from Top Artist) */}
             {publicPlaylists.length > 0 && (
               <section>
                 <SectionTitle sub="Handpicked collections for you">Curated Playlists</SectionTitle>
                 <div className="flex overflow-x-auto gap-5 pb-4 no-scrollbar">
                   {publicPlaylists.map(p => (
                      <Link to={`/playlist/${p.uuid}`} key={p.uuid} className="group relative flex-none w-[140px] md:w-[160px]">
                         <div className="relative aspect-square w-full mb-3 rounded-lg overflow-hidden bg-white/[0.04]">
                           {p.squareImage && <img src={getCoverUrl(p.squareImage, 320) || ''} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />}
                         </div>
                         <p className="text-sm font-bold text-white truncate w-full">{p.title}</p>
                         <p className="text-xs text-white/50 truncate w-full mt-1">{p.numberOfTracks} Tracks</p>
                      </Link>
                   ))}
                 </div>
               </section>
             )}

             {/* 4. Album Mixes (Extracted from Top Artist/Album) */}
             {albumMix.length > 0 && (
               <section>
                 <SectionTitle sub="Discover something new to love">Recommended Albums</SectionTitle>
                 <div className="flex overflow-x-auto gap-5 pb-4 no-scrollbar">
                   {albumMix.map(a => (
                      <Link to={`/album/${a.id}`} key={a.id} className="group relative flex-none w-[140px] md:w-[160px]">
                         <div className="relative aspect-square w-full mb-3 rounded-lg overflow-hidden bg-white/[0.04]">
                           {a.cover && <img src={getCoverUrl(a.cover, 320) || ''} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />}
                         </div>
                         <p className="text-sm font-bold text-white truncate w-full">{a.title}</p>
                         <p className="text-xs text-white/50 truncate w-full mt-1">{a.artists?.map(art => art.name).join(", ")}</p>
                      </Link>
                   ))}
                 </div>
               </section>
             )}

             {/* 5. Similar Artists */}
             {simArtists.length > 0 && (
               <section>
                 <SectionTitle sub="Expand your musical horizons">Artists You Might Like</SectionTitle>
                 <div className="flex overflow-x-auto gap-5 pb-4 no-scrollbar">
                   {simArtists.map(a => (
                      <Link to={`/artist/${a.id}`} key={a.id} className="group relative flex-none w-[140px] md:w-[160px]">
                         <div className="relative aspect-square w-full mb-3 rounded-full overflow-hidden bg-white/[0.04]">
                           {a.picture && <img src={getArtistPictureUrl(a.picture, 320) || ''} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />}
                         </div>
                         <p className="text-sm font-bold text-white text-center truncate w-full">{a.name}</p>
                         <p className="text-xs text-white/50 text-center truncate w-full mt-1">Artist</p>
                      </Link>
                   ))}
                 </div>
               </section>
             )}

             {/* 6. Your Genre Mixes */}
             {genrePlaylists.length > 0 && (
               <section>
                 <SectionTitle sub="Based on your listening patterns">Your Genre Mixes</SectionTitle>
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                   {genrePlaylists.map(p => (
                     <Link key={p.uuid} to={`/playlist/${p.uuid}`} className="aspect-square rounded-lg font-bold text-white overflow-hidden relative group shadow-lg">
                       {p.squareImage ? (
                         <img src={getCoverUrl(p.squareImage, 320) || ''} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                       ) : (
                         <div className="w-full h-full bg-white/5" />
                       )}
                       <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90 transition-opacity" />
                       <div className="absolute bottom-3 left-3 right-3 text-sm truncate z-10">{p.title}</div>
                     </Link>
                   ))}
                 </div>
               </section>
             )}

             {/* 7. Most Popular Genres */}
             <section>
               <SectionTitle sub="Top genres worldwide">Most Popular Genres</SectionTitle>
               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                 {GENRES.filter(g => ['pop', 'kpop', 'indierock', 'latin', 'jazz', 'metal'].includes(g.id)).map(g => (
                   <Link key={g.id} to={`/genre/${g.id}`} className="aspect-[2/1] rounded-lg p-4 font-bold text-white overflow-hidden relative group shadow-lg" style={{ background: `linear-gradient(135deg, ${getRandomColor(g.id)} 0%, #111 100%)` }}>
                     <span className="relative z-10">{g.name}</span>
                     <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                   </Link>
                 ))}
               </div>
             </section>

           </div>
        )}

      </div>
    </div>
  );
};



function getRandomColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
}
