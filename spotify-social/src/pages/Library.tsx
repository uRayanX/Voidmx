import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCoverUrl, getArtistPictureUrl, getHistory } from '../api/tidal';
import type { TidalTrack } from '../types/tidal';
import { usePlayerStore } from '../store/playerStore';
import { useLibraryStore } from '../store/libraryStore';
import { TrackMenu } from '../components/TrackMenu';

type Collection =
  | { type: 'liked' }
  | { type: 'history' }
  | { type: 'custom-playlist'; playlist: any }
  | { type: 'liked-artists' }
  | { type: 'liked-albums' }
  | { type: 'liked-playlists' };

function collectionName(c: Collection): string {
  if (c.type === 'liked') return 'Liked Songs';
  if (c.type === 'history') return 'Play History';
  if (c.type === 'liked-artists') return 'Liked Artists';
  if (c.type === 'liked-albums') return 'Liked Albums';
  if (c.type === 'liked-playlists') return 'Liked Playlists';
  if (c.type === 'custom-playlist') return c.playlist.name;
  return '';
}

function collectionSub(c: Collection): string {
  if (c.type === 'liked') return 'Your saved tracks';
  if (c.type === 'history') return 'Recently played';
  if (c.type === 'liked-artists') return 'Your saved artists';
  if (c.type === 'liked-albums') return 'Your saved albums';
  if (c.type === 'liked-playlists') return 'Your saved playlists';
  if (c.type === 'custom-playlist') return `${c.playlist.tracks.length} tracks`;
  return '';
}

function fmt(secs: number) {
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
}

const TrackRow: React.FC<{ track: TidalTrack; index: number; onPlay: (t: TidalTrack) => void; onRemove?: () => void }> = ({ track, index, onPlay, onRemove }) => (
  <div className="relative group w-full">
    <button
      onClick={() => onPlay(track)}
      className="w-full flex items-center gap-4 px-2 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors group/btn text-left"
    >
    <span className="w-5 text-xs text-faint text-right shrink-0 group-hover/btn:hidden">{index + 1}</span>
    <svg className="w-5 h-5 text-white/50 shrink-0 hidden group-hover/btn:block" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
    {track.album?.cover ? (
      <img src={getCoverUrl(track.album.cover, 80)} className="w-10 h-10 rounded-lg object-cover shrink-0" alt="" />
    ) : (
      <div className="w-10 h-10 rounded-lg bg-white/[0.07] shrink-0" />
    )}
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium truncate">{track.title}</p>
      <p className="text-xs text-muted truncate">{track.artists?.map(a => a.name).join(', ') ?? track.artist?.name}</p>
    </div>
    <p className="text-xs text-faint shrink-0 hidden sm:block max-w-[140px] truncate">{track.album?.title}</p>
    <span className="text-xs text-faint shrink-0 w-10 text-right pr-6">{fmt(track.duration)}</span>
    </button>
    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          title="Remove from playlist"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      )}
      <TrackMenu track={track} />
    </div>
  </div>
);

export const Library: React.FC = () => {
  const [open, setOpen] = useState<Collection | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  
  const { 
    likedTracks, playlists, likedArtists, likedAlbums, likedPlaylists,
    createPlaylist, deletePlaylist, renamePlaylist, sortPreference, setSortPreference
  } = useLibraryStore();

  const [detailTracks, setDetailTracks] = useState<TidalTrack[]>([]);
  
  useEffect(() => {
    if (!open) return;
    let tracks: TidalTrack[] = [];
    if (open.type === 'liked') tracks = [...likedTracks];
    else if (open.type === 'history') tracks = getHistory(50) as TidalTrack[];
    else if (open.type === 'custom-playlist') {
        const p = playlists.find(x => x.id === open.playlist.id) || open.playlist;
        tracks = [...p.tracks];
    }
    
    // Apply sorting for Liked Songs and Custom Playlists
    if (open.type === 'liked' || open.type === 'custom-playlist') {
      if (sortPreference === 'date-asc') {
        // Already date-desc as inserted, so reverse for oldest first
        tracks.reverse();
      } else if (sortPreference === 'alpha-asc') {
        tracks.sort((a, b) => a.title.localeCompare(b.title));
      } else if (sortPreference === 'alpha-desc') {
        tracks.sort((a, b) => b.title.localeCompare(a.title));
      }
    }
    
    setDetailTracks(tracks);
  }, [open, likedTracks, playlists, sortPreference]);

  const playTrack = (track: TidalTrack) => {
    const idx = detailTracks.findIndex(t => t.id === track.id);
    usePlayerStore.getState().setQueue(detailTracks, idx >= 0 ? idx : 0, false);
  };

  const handleEditNameSubmit = () => {
    if (open && open.type === 'custom-playlist' && editNameValue.trim()) {
      renamePlaylist(open.playlist.id, editNameValue.trim());
      setOpen({ type: 'custom-playlist', playlist: { ...open.playlist, name: editNameValue.trim() } });
    }
    setIsEditingName(false);
  };

  if (open) {
    const isArtists = open.type === 'liked-artists';
    const isAlbums = open.type === 'liked-albums';
    const isPlaylists = open.type === 'liked-playlists';

    return (
      <div className="h-full overflow-y-auto relative">
        <div className="max-w-6xl mx-auto px-6 md:px-8 pt-8 md:pt-12 pb-28 relative">
          <button
            onClick={() => setOpen(null)}
            className="flex items-center gap-2 text-faint hover:text-white transition-colors text-sm mb-6 md:mb-8"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
            Back to library
          </button>

            <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 mb-8 md:mb-12">
            <div className="w-48 h-48 md:w-64 md:h-64 rounded-2xl md:rounded-3xl shrink-0 overflow-hidden shadow-2xl bg-white/10 flex items-center justify-center">
              <svg className="w-16 h-16 md:w-24 md:h-24 text-white/50" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v9.28A4 4 0 1014 16V7h4V3h-6z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1 pt-2 flex flex-col justify-center md:justify-end h-auto w-full md:w-auto text-center md:text-left">
              <p className="text-xs md:text-sm text-faint uppercase font-bold tracking-widest mb-2 opacity-80">Collection</p>
              
              <div className="flex items-center justify-center md:justify-start gap-3 mb-3 md:mb-4 group/title w-full">
                {isEditingName && open.type === 'custom-playlist' ? (
                  <input
                    autoFocus
                    className="bg-transparent text-4xl md:text-6xl lg:text-7xl font-black rounded px-1 w-full outline-none border-b border-white/20 text-center md:text-left"
                    value={editNameValue}
                    onChange={(e) => setEditNameValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleEditNameSubmit(); if (e.key === 'Escape') setIsEditingName(false); }}
                    onBlur={handleEditNameSubmit}
                  />
                ) : (
                  <h1 className="text-4xl md:text-6xl lg:text-7xl font-black truncate tracking-tighter" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    {collectionName(open)}
                  </h1>
                )}
                
                {!isEditingName && open.type === 'custom-playlist' && (
                  <button onClick={() => { setEditNameValue(open.playlist.name); setIsEditingName(true); }} className="opacity-0 group-hover/title:opacity-100 p-3 hover:bg-white/10 rounded-full transition-all shrink-0">
                    <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
                  </button>
                )}
              </div>
              
              <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between w-full">
              <div className="flex items-center justify-between md:justify-start gap-4">
                <p className="text-sm md:text-base text-muted font-medium">{collectionSub(open)}</p>
                {open.type === 'custom-playlist' && (
                  <button
                    onClick={() => {
                      if (confirm('Delete this playlist?')) {
                        deletePlaylist(open.playlist.id);
                        setOpen(null);
                      }
                    }}
                    className="text-xs md:text-sm font-semibold px-4 py-2 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    Delete Playlist
                  </button>
                )}
              </div>
              
              {(open.type === 'liked' || open.type === 'custom-playlist') && (
                <div className="flex items-center justify-center md:justify-end gap-3 mt-2 md:mt-0">
                  <span className="text-xs text-muted font-medium uppercase tracking-widest hidden md:inline-block">Sort By</span>
                  <select
                    className="bg-white/5 md:bg-transparent text-xs md:text-sm text-white/90 border border-white/10 md:border-none outline-none cursor-pointer px-3 py-2 md:p-0 rounded-lg md:rounded-none hover:text-white transition-opacity"
                    value={sortPreference}
                    onChange={(e) => setSortPreference(e.target.value as any)}
                  >
                    <option className="bg-[#121212] text-white" value="date-desc">Oldest First</option>
                    <option className="bg-[#121212] text-white" value="date-asc">Newest First</option>
                    <option className="bg-[#121212] text-white" value="alpha-asc">Alphabetical (A-Z)</option>
                    <option className="bg-[#121212] text-white" value="alpha-desc">Alphabetical (Z-A)</option>
                  </select>
                </div>
              )}
              </div>
            </div>
          </div>

          {isArtists ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4 md:gap-6 mt-12">
              {likedArtists.length === 0 && <p className="col-span-full text-white/25 text-sm text-center py-16">No artists found.</p>}
              {likedArtists.map(a => (
                <Link to={`/artist/${a.id}`} key={a.id} className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] transition-all hover:-translate-y-1 text-center cursor-pointer">
                  {a.picture ? (
                    <img src={getArtistPictureUrl(a.picture, 320)} className="w-full aspect-square rounded-full object-cover shadow-lg" alt={a.name} />
                  ) : <div className="w-full aspect-square rounded-full bg-white/[0.07] shadow-lg" />}
                  <p className="text-sm font-semibold truncate w-full">{a.name}</p>
                </Link>
              ))}
            </div>
          ) : isAlbums ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 mt-12">
              {likedAlbums.length === 0 && <p className="col-span-full text-white/25 text-sm text-center py-16">No albums found.</p>}
              {likedAlbums.map(a => (
                <Link to={`/album/${a.id}`} key={a.id} className="flex flex-col items-start gap-3 p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] transition-all hover:-translate-y-1 cursor-pointer">
                  {a.cover ? (
                    <img src={getCoverUrl(a.cover, 320)} className="w-full aspect-square rounded-xl object-cover shadow-lg" alt={a.title} />
                  ) : <div className="w-full aspect-square rounded-xl bg-white/[0.07] shadow-lg" />}
                  <div className="w-full">
                    <p className="text-base font-semibold truncate w-full">{a.title}</p>
                    <p className="text-sm text-muted font-medium truncate w-full mt-0.5">{a.artists?.[0]?.name}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : isPlaylists ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 mt-12">
              {likedPlaylists.length === 0 && <p className="col-span-full text-white/25 text-sm text-center py-16">No playlists found.</p>}
              {likedPlaylists.map(p => (
                <Link to={`/playlist/${p.uuid}`} key={p.uuid} className="flex flex-col items-start gap-3 p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] transition-all hover:-translate-y-1 cursor-pointer">
                  {p.squareImage || p.image ? (
                    <img 
                      src={getCoverUrl(p.squareImage || p.image, 320)} 
                      className="w-full aspect-square rounded-xl object-cover shadow-lg bg-white/10" 
                      alt={p.title}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.title)}&background=111&color=fff&size=320`;
                      }}
                    />
                  ) : <div className="w-full aspect-square rounded-xl bg-white/[0.07] shadow-lg" />}
                  <p className="text-base font-semibold truncate w-full mt-1">{p.title}</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="space-y-1 mt-8">
              {detailTracks.length === 0 && (
                <p className="text-white/25 text-base font-medium text-center py-20 mt-10 border border-white/5 rounded-2xl bg-white/[0.02]">
                  {open.type === 'history' ? 'No play history yet. Start listening!' : 'No tracks found.'}
                </p>
              )}
              {detailTracks.map((t, i) => (
                <TrackRow key={`${String(t.id)}-${i}`} track={t} index={i} onPlay={playTrack} onRemove={open.type === 'custom-playlist' ? () => useLibraryStore.getState().removeTrackFromPlaylist(String(open.playlist.id), String(t.id)) : undefined} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const ListCard = ({ title, subtitle, icon, onClick }: { title: string, subtitle: string, icon: React.ReactNode, onClick: () => void }) => (
    <button onClick={onClick} className="flex items-center gap-4 md:gap-5 bg-white/[0.03] hover:bg-white/[0.08] rounded-xl md:rounded-2xl p-4 md:p-6 transition-all hover:-translate-y-1 shadow-sm hover:shadow-xl text-left w-full border border-white/[0.02]">
      <div className="w-12 h-12 md:w-16 md:h-16 rounded-lg md:rounded-xl bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center shrink-0 shadow-inner">
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="font-bold text-base md:text-lg lg:text-xl truncate text-white">{title}</h3>
        <p className="text-xs md:text-sm text-faint font-medium truncate mt-0.5">{subtitle}</p>
      </div>
    </button>
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 md:px-8 xl:px-10 pt-8 md:pt-12 pb-28">

        <div className="mb-10 md:mb-14">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>Library</h1>
        </div>

        <div className="flex items-center justify-between mb-5 md:mb-6">
          <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">Activity</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mb-10 md:mb-14">
          <ListCard 
            title="Liked Songs" 
            subtitle={`${likedTracks.length} tracks`}
            onClick={() => setOpen({ type: 'liked' })}
            icon={<svg className="w-6 h-6 md:w-8 md:h-8 text-white drop-shadow-md" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>}
          />
          <ListCard 
            title="Play History" 
            subtitle="Recently played"
            onClick={() => setOpen({ type: 'history' })}
            icon={<svg className="w-6 h-6 md:w-8 md:h-8 text-white drop-shadow-md" fill="currentColor" viewBox="0 0 24 24"><path d="M13 3a9 9 0 00-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0013 21a9 9 0 000-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" /></svg>}
          />
        </div>

        <div className="flex items-center justify-between mb-5 md:mb-6">
          <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">Your Playlists</h2>
          <button onClick={() => setIsCreateModalOpen(true)} className="p-2.5 bg-white/5 hover:bg-white/10 text-white rounded-full transition-colors group">
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>
        <div className="flex gap-4 md:gap-6 overflow-x-auto pb-6 snap-x snap-mandatory hide-scrollbar mb-8 md:mb-12 cursor-grab active:cursor-grabbing">
          {playlists.length === 0 && <p className="text-sm text-faint">No custom playlists created yet.</p>}
          {playlists.map(p => (
            <div key={p.id} className="snap-start shrink-0 w-36 md:w-48 lg:w-56 flex flex-col">
               <button onClick={() => setOpen({ type: 'custom-playlist', playlist: p })} className="bg-white/[0.02] hover:bg-white/[0.06] p-4 text-left transition-all hover:-translate-y-1 rounded-2xl w-full border border-white/[0.02]">
                <div className="w-full aspect-square bg-gradient-to-br from-white/10 to-white/5 rounded-xl flex items-center justify-center mb-4 shadow-inner">
                  <svg className="w-10 h-10 md:w-16 md:h-16 text-white/30" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v9.28A4 4 0 1014 16V7h4V3h-6z"/></svg>
                </div>
                <p className="font-bold text-sm md:text-base lg:text-lg truncate block text-white">{p.name}</p>
                <p className="text-xs md:text-sm font-medium text-faint truncate mt-1 block">{p.tracks.length} tracks</p>
              </button>
            </div>
          ))}
        </div>

        <div className="mb-8 md:mb-12">
          <h2 className="text-xl md:text-2xl font-extrabold tracking-tight mb-5 md:mb-6 cursor-pointer hover:text-white/80 transition-colors inline-block" onClick={() => setOpen({ type: 'liked-artists' })}>Saved Artists <span className="text-faint text-sm ml-2">&rarr;</span></h2>
          <div className="flex gap-4 md:gap-6 overflow-x-auto pb-6 snap-x snap-mandatory hide-scrollbar">
            {likedArtists.length === 0 && <p className="text-sm text-faint">No saved artists.</p>}
            {likedArtists.slice(0, 15).map(a => (
              <Link to={`/artist/${a.id}`} key={a.id} className="snap-start shrink-0 w-28 md:w-36 lg:w-44 flex flex-col items-center hover:opacity-80 transition-opacity">
                {a.picture ? (
                  <img src={getArtistPictureUrl(a.picture, 320)} className="w-28 h-28 md:w-36 md:h-36 lg:w-44 lg:h-44 rounded-full object-cover mb-3 md:mb-4 shadow-xl pointer-events-none" />
                ) : <div className="w-28 h-28 md:w-36 md:h-36 lg:w-44 lg:h-44 rounded-full bg-white/10 mb-3 md:mb-4 shadow-xl" />}
                <p className="text-xs md:text-sm font-bold truncate w-full text-center">{a.name}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="mb-8 md:mb-12">
          <h2 className="text-xl md:text-2xl font-extrabold tracking-tight mb-5 md:mb-6 cursor-pointer hover:text-white/80 transition-colors inline-block" onClick={() => setOpen({ type: 'liked-albums' })}>Saved Albums <span className="text-faint text-sm ml-2">&rarr;</span></h2>
          <div className="flex gap-4 md:gap-6 overflow-x-auto pb-6 snap-x snap-mandatory hide-scrollbar">
            {likedAlbums.length === 0 && <p className="text-sm text-faint">No saved albums.</p>}
            {likedAlbums.slice(0, 15).map(a => (
              <Link to={`/album/${a.id}`} key={a.id} className="snap-start shrink-0 w-36 md:w-48 lg:w-56 flex flex-col hover:opacity-80 transition-opacity">
                {a.cover ? (
                  <img src={getCoverUrl(a.cover, 320)} className="w-36 h-36 md:w-48 md:h-48 lg:w-56 lg:h-56 rounded-2xl object-cover mb-3 md:mb-4 shadow-xl pointer-events-none" />
                ) : <div className="w-36 h-36 md:w-48 md:h-48 lg:w-56 lg:h-56 rounded-2xl bg-white/10 mb-3 md:mb-4 shadow-xl" />}
                <p className="text-sm md:text-base font-bold truncate w-full">{a.title}</p>
                <p className="text-xs md:text-sm font-medium text-faint truncate w-full mt-1">{a.artists?.[0]?.name}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="mb-8 md:mb-12">
          <h2 className="text-xl md:text-2xl font-extrabold tracking-tight mb-5 md:mb-6 cursor-pointer hover:text-white/80 transition-colors inline-block" onClick={() => setOpen({ type: 'liked-playlists' })}>Saved Playlists <span className="text-faint text-sm ml-2">&rarr;</span></h2>
          <div className="flex gap-4 md:gap-6 overflow-x-auto pb-6 snap-x snap-mandatory hide-scrollbar">
            {likedPlaylists.length === 0 && <p className="text-sm text-faint">No saved playlists.</p>}
            {likedPlaylists.slice(0, 15).map(p => (
              <Link to={`/playlist/${p.uuid}`} key={p.uuid} className="snap-start shrink-0 w-36 md:w-48 lg:w-56 flex flex-col hover:opacity-80 transition-opacity">
                {p.squareImage || p.image ? (
                  <img 
                    src={getCoverUrl(p.squareImage || p.image, 320)} 
                    className="w-36 h-36 md:w-48 md:h-48 lg:w-56 lg:h-56 rounded-2xl object-cover mb-3 md:mb-4 pointer-events-none bg-white/10 shadow-xl" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.title)}&background=111&color=fff&size=320`;
                    }}
                  />
                ) : <div className="w-36 h-36 md:w-48 md:h-48 lg:w-56 lg:h-56 rounded-2xl bg-white/10 mb-3 md:mb-4 shadow-xl" />}
                <p className="text-sm md:text-base font-bold truncate w-full">{p.title}</p>
              </Link>
            ))}
          </div>
        </div>

      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-scale-in">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Create Playlist</h2>
              <input 
                type="text" 
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Enter playlist name"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors mb-6"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newPlaylistName.trim()) {
                    createPlaylist(newPlaylistName.trim());
                    setNewPlaylistName('');
                    setIsCreateModalOpen(false);
                  }
                }}
              />
              <div className="flex items-center justify-end gap-3">
                <button 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-full text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    if (newPlaylistName.trim()) {
                      createPlaylist(newPlaylistName.trim());
                      setNewPlaylistName('');
                      setIsCreateModalOpen(false);
                    }
                  }}
                  className="px-6 py-2 rounded-full text-sm font-medium bg-white text-black hover:scale-105 active:scale-95 transition-transform"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
