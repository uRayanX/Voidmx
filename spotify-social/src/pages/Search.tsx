import { Link } from "react-router-dom";
import React, { useEffect, useRef, useState } from 'react';
import { searchTracks, searchArtists, searchAlbums, searchPlaylists, getCoverUrl, getArtistPictureUrl, getTrackRecommendations } from '../api/tidal';
import type { TidalTrack, TidalArtist, TidalAlbum, TidalPlaylist } from '../types/tidal';
import { usePlayerStore } from '../store/playerStore';
import { useSearchStore, pushRecentSearchTrack, loadRecentSearchTracks, clearRecentSearchTracks } from '../store/searchStore';
import type { SearchTab } from '../store/searchStore';
import { TrackMenu } from '../components/TrackMenu';
import { prioritizeRadioTracks } from '../utils/radioMix';

function fmt(secs: number) {
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
}

const TrackRow: React.FC<{
  track: TidalTrack;
  index: number;
  onPlay: (track: TidalTrack) => void;
}> = ({ track, index, onPlay }) => (
  <div className="flex items-center gap-4 px-2 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors group relative [&:has(button[aria-expanded='true'])]:z-[9999]">
    <button
      onClick={() => onPlay(track)}
      className="flex items-center gap-4 flex-1 min-w-0 text-left"
    >
      <span className="w-5 text-xs text-faint text-right shrink-0 group-hover:hidden">{index + 1}</span>
      <svg className="w-5 h-5 text-white/50 shrink-0 hidden group-hover:block" fill="currentColor" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z"/>
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
    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
      <TrackMenu track={track} />
    </div>
  </div>
);

const SkeletonRows = ({ n = 6 }: { n?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: n }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 px-2 py-2.5">
        <div className="w-5" />
        <div className="w-10 h-10 rounded-lg bg-white/[0.04] animate-pulse shrink-0" />
        <div className="flex-1">
          <div className="h-3 w-40 bg-white/[0.04] rounded animate-pulse mb-1.5" />
          <div className="h-2.5 w-24 bg-white/[0.04] rounded animate-pulse" />
        </div>
      </div>
    ))}
  </div>
);

const MAX_HISTORY = 8;
const HISTORY_KEY = 'void-search-history';

function loadSearchHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}
function saveSearchHistory(items: string[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX_HISTORY))); } catch {}
}
function pushSearchHistory(q: string) {
  const h = loadSearchHistory().filter(x => x !== q);
  saveSearchHistory([q, ...h]);
}

export const Search: React.FC = () => {
  const { query, activeTab, tracks, artists, albums, playlists, setQuery, setActiveTab, setResults } = useSearchStore();

  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [history, setHistory] = useState<string[]>(loadSearchHistory);
  const [recentTracks, setRecentTracks] = useState<TidalTrack[]>(loadRecentSearchTracks);
  
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) { 
        setResults([], [], [], []); 
        setLoading(false); 
        return; 
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const [t, a, al, p] = await Promise.all([
          searchTracks(q, 50).catch(() => [] as TidalTrack[]),
          searchArtists(q, 50).catch(() => [] as TidalArtist[]),
          searchAlbums(q, 50).catch(() => [] as TidalAlbum[]),
          searchPlaylists(q, 50).catch(() => [] as TidalPlaylist[]),
        ]);
        setResults(t, a, al, p);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const q = query.trim();
      if (q) {
        pushSearchHistory(q);
        setHistory(loadSearchHistory());
        inputRef.current?.blur();
      }
    }
  };

  const playTrack = (track: TidalTrack) => {
    pushRecentSearchTrack(track);
    setRecentTracks(loadRecentSearchTracks());

    usePlayerStore.getState().setQueue([track], 0, true);
    getTrackRecommendations(track.id).then(recommended => {
        usePlayerStore.getState().setQueue([track, ...prioritizeRadioTracks(track, recommended)], 0, true);
    }).catch(() => {});
  };

  useEffect(() => { 
    // Wait slightly to prevent visual jump, and don't auto-focus if there's already a query
    if (!query) inputRef.current?.focus(); 
  }, []);

  const hasResults = tracks.length > 0 || artists.length > 0 || albums.length > 0 || playlists.length > 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 pt-8 pb-28">

        <div className="mb-6">
          <p className="text-xs text-faint uppercase tracking-widest mb-1">Find anything</p>
          <h1 className="text-4xl font-bold mb-6" style={{ fontFamily: 'Montserrat, sans-serif' }}>Search</h1>

          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-faint pointer-events-none"
              fill="currentColor" viewBox="0 0 24 24"
            >
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 150)}
              placeholder="Tracks, artists, albums..."
              className="w-full bg-white/[0.05] border border-white/[0.07] rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-white/20 focus:bg-white/[0.07] transition-all"
              aria-label="Search"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-faint hover:text-white transition-colors"
                aria-label="Clear search"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            )}
          </div>

          {/* Recent searches — shown when focused + no active query */}
          {focused && !query && history.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-white/30 uppercase tracking-widest">Recent searches</p>
                <button
                  onClick={() => { saveSearchHistory([]); setHistory([]); }}
                  className="text-[11px] text-white/25 hover:text-white/60 transition-colors"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {history.map(h => (
                  <div key={h} className="flex items-center gap-1">
                    <button
                      onClick={() => setQuery(h)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.07] rounded-full text-xs text-white/60 hover:text-white transition-all"
                    >
                      <svg className="w-3 h-3 text-white/30" fill="currentColor" viewBox="0 0 24 24"><path d="M13 3a9 9 0 00-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0013 21a9 9 0 000-18zm-1 5v5l4.25 3.15.75-1.21L13 13V8h-1z"/></svg>
                      {h}
                    </button>
                    <button
                      onClick={() => { const next = history.filter(x => x !== h); saveSearchHistory(next); setHistory(next); }}
                      className="text-white/20 hover:text-white/60 transition-colors"
                      aria-label={`Remove ${h} from history`}
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {loading && <SkeletonRows />}

        {!loading && !query && (
          <>
            {recentTracks.length > 0 ? (
              <div className="mt-8 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs text-white/30 uppercase tracking-widest">Recently Played</p>
                  <button
                    onClick={() => { clearRecentSearchTracks(); setRecentTracks([]); }}
                    className="text-[11px] text-white/25 hover:text-white/60 transition-colors"
                  >
                    Clear all
                  </button>
                </div>
                <div className="space-y-0.5">
                  {recentTracks.map((t, i) => (
                    <TrackRow key={String(t.id) + i} track={t} index={i} onPlay={playTrack} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-16 text-center">
                <p className="text-faint text-sm">Start typing to search</p>
              </div>
            )}
          </>
        )}

        {!loading && query && !hasResults && (
          <div className="mt-16 text-center">
            <p className="text-white/30 text-sm">No results for <span className="text-white/50">"{query}"</span></p>
          </div>
        )}

        {query && !loading && hasResults && (
          <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-2 pt-2">
            {(['tracks', 'albums', 'artists', 'playlists'] as SearchTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors whitespace-nowrap border border-white/5 hover:border-white/20 ${
                  activeTab === tab 
                    ? 'bg-white text-black' 
                    : 'bg-white/[0.05] text-white/70 hover:bg-white/[0.1] hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}

        {!loading && activeTab === 'artists' && artists.length > 0 && (
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {artists.map(a => (
              <Link
                to={`/artist/${a.id}`}
                key={a.id}
                className="flex flex-col items-center gap-2 p-2 rounded-2xl hover:bg-white/[0.04] transition-colors cursor-pointer text-center"
              >
                {a.picture ? (
                  <img src={getArtistPictureUrl(a.picture, 320)} className="w-full aspect-square rounded-xl object-cover" alt={a.name} />
                ) : (
                  <div className="w-full aspect-square rounded-xl bg-white/[0.06]" />
                )}
                <p className="text-xs font-medium truncate w-full mt-1">{a.name}</p>
              </Link>
            ))}
          </div>
        )}

        {!loading && activeTab === 'albums' && albums.length > 0 && (
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {albums.map(a => (
              <Link
                to={`/album/${a.id}`}
                key={a.id}
                className="flex flex-col items-center gap-2 p-2 rounded-2xl hover:bg-white/[0.04] transition-colors cursor-pointer text-center"
              >
                {a.cover ? (
                  <img src={getCoverUrl(a.cover, 320)} className="w-full aspect-square rounded-xl object-cover" alt={a.title} />
                ) : (
                  <div className="w-full aspect-square rounded-xl bg-white/[0.06]" />
                )}
                <div className="w-full text-left mt-1">
                  <p className="text-xs font-medium truncate">{a.title}</p>
                  <p className="text-[10px] text-faint truncate">{a.artists?.map(x => x.name).join(', ') || 'Unknown Artist'}</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && activeTab === 'playlists' && playlists.length > 0 && (
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {playlists.map(p => (
              <Link
                to={`/playlist/${p.uuid}`}
                key={p.uuid}
                className="flex flex-col items-center gap-2 p-2 rounded-2xl hover:bg-white/[0.04] transition-colors cursor-pointer text-center"
              >
                {p.squareImage ? (
                  <img src={getCoverUrl(p.squareImage, 320)} className="w-full aspect-square rounded-xl object-cover" alt={p.title} />
                ) : (
                  <div className="w-full aspect-square rounded-xl bg-white/[0.06]" />
                )}
                <div className="w-full text-left mt-1">
                  <p className="text-xs font-medium truncate">{p.title}</p>
                  <p className="text-[10px] text-faint truncate">{p.numberOfTracks + ' tracks'}</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && activeTab === 'tracks' && tracks.length > 0 && (
          <div className="space-y-0.5">
            {tracks.map((t, i) => (
              <TrackRow key={t.id} track={t} index={i} onPlay={playTrack} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
};
