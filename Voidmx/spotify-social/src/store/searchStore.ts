import { create } from 'zustand';
import type { TidalTrack, TidalArtist, TidalAlbum, TidalPlaylist } from '../types/tidal';

export type SearchTab = 'tracks' | 'albums' | 'artists' | 'playlists';

interface SearchState {
  query: string;
  activeTab: SearchTab;
  tracks: TidalTrack[];
  artists: TidalArtist[];
  albums: TidalAlbum[];
  playlists: TidalPlaylist[];
  setQuery: (q: string) => void;
  setActiveTab: (t: SearchTab) => void;
  setResults: (t: TidalTrack[], a: TidalArtist[], al: TidalAlbum[], p: TidalPlaylist[]) => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  activeTab: 'tracks',
  tracks: [],
  artists: [],
  albums: [],
  playlists: [],
  setQuery: (q) => set({ query: q }),
  setActiveTab: (t) => set({ activeTab: t }),
  setResults: (tracks, artists, albums, playlists) => set({ tracks, artists, albums, playlists })
}));

export const RECENT_SEARCH_TRACKS_KEY = 'spotify-social-recent-search-tracks';

export function loadRecentSearchTracks(): TidalTrack[] {
  try { return JSON.parse(localStorage.getItem(RECENT_SEARCH_TRACKS_KEY) || '[]'); } catch { return []; }
}
export function pushRecentSearchTrack(track: TidalTrack) {
  const current = loadRecentSearchTracks().filter(t => t.id !== track.id);
  current.unshift(track);
  try { localStorage.setItem(RECENT_SEARCH_TRACKS_KEY, JSON.stringify(current.slice(0, 20))); } catch {}
}

export function clearRecentSearchTracks() {
  try { localStorage.removeItem(RECENT_SEARCH_TRACKS_KEY); } catch {}
}
