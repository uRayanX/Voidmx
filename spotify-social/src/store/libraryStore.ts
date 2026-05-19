import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TidalTrack, TidalArtist, TidalAlbum, TidalPlaylist } from '../types/tidal';

export interface Playlist {
  id: string;
  name: string;
  tracks: TidalTrack[];
}

interface LibraryState {
  likedTracks: TidalTrack[];
  playlists: Playlist[];
  likedArtists: TidalArtist[];
  likedAlbums: TidalAlbum[];
  likedPlaylists: TidalPlaylist[];

  toggleLike: (track: TidalTrack) => void;
  isLiked: (trackId: number | string) => boolean;

  toggleLikeArtist: (artist: TidalArtist) => void;
  isLikedArtist: (artistId: number | string) => boolean;

  toggleLikeAlbum: (album: TidalAlbum) => void;
  isLikedAlbum: (albumId: number | string) => boolean;

  toggleLikePlaylist: (playlist: TidalPlaylist) => void;
  isLikedPlaylist: (playlistUuid: string) => boolean;

  createPlaylist: (name: string) => void;
  deletePlaylist: (id: string) => void;
  renamePlaylist: (id: string, name: string) => void;
  addTrackToPlaylist: (playlistId: string, track: TidalTrack) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: number | string) => void;
  
  sortPreference: 'date-desc' | 'date-asc' | 'alpha-asc' | 'alpha-desc';
  setSortPreference: (pref: 'date-desc' | 'date-asc' | 'alpha-asc' | 'alpha-desc') => void;
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      likedTracks: [],
      playlists: [],
      likedArtists: [],
      likedAlbums: [],
      likedPlaylists: [],

      sortPreference: 'date-desc',
      setSortPreference: (pref) => set({ sortPreference: pref }),

      toggleLike: (track) => {
        set((state) => {
          const exists = state.likedTracks.some(t => t.id === track.id);
          if (exists) {
            return { likedTracks: state.likedTracks.filter(t => t.id !== track.id) };
          }
          return { likedTracks: [...state.likedTracks, track] };
        });
      },
      isLiked: (trackId) => get().likedTracks.some(t => t.id === trackId),

      toggleLikeArtist: (artist) => {
        set((state) => {
          const exists = state.likedArtists.some(a => a.id === artist.id);
          if (exists) {
            return { likedArtists: state.likedArtists.filter(a => a.id !== artist.id) };
          }
          return { likedArtists: [...state.likedArtists, artist] };
        });
      },
      isLikedArtist: (artistId) => get().likedArtists.some(a => a.id === artistId),

      toggleLikeAlbum: (album) => {
        set((state) => {
          const exists = state.likedAlbums.some(a => a.id === album.id);
          if (exists) {
            return { likedAlbums: state.likedAlbums.filter(a => a.id !== album.id) };
          }
          return { likedAlbums: [...state.likedAlbums, album] };
        });
      },
      isLikedAlbum: (albumId) => get().likedAlbums.some(a => a.id === albumId),

      toggleLikePlaylist: (playlist) => {
        set((state) => {
          const exists = state.likedPlaylists.some(p => p.uuid === playlist.uuid);
          if (exists) {
            return { likedPlaylists: state.likedPlaylists.filter(p => p.uuid !== playlist.uuid) };
          }
          return { likedPlaylists: [...state.likedPlaylists, playlist] };
        });
      },
      isLikedPlaylist: (playlistUuid) => get().likedPlaylists.some(p => p.uuid === playlistUuid),

      createPlaylist: (name) => set(state => ({
        playlists: [...state.playlists, { id: Date.now().toString(), name, tracks: [] }]
      })),
      renamePlaylist: (id, name) => set(state => ({
        playlists: state.playlists.map(p => p.id === id ? { ...p, name } : p)
      })),
      deletePlaylist: (id) => set(state => ({
        playlists: state.playlists.filter(p => p.id !== id)
      })),
      addTrackToPlaylist: (playlistId, track) => set(state => ({
        playlists: state.playlists.map(p => {
          if (p.id !== playlistId) return p;
          if (p.tracks.some(t => t.id === track.id)) return p;
          return { ...p, tracks: [...p.tracks, track] };
        })
      })),
      removeTrackFromPlaylist: (playlistId, trackId) => set(state => ({
        playlists: state.playlists.map(p => {
          if (p.id !== playlistId) return p;
          return { ...p, tracks: p.tracks.filter(t => t.id !== trackId) };
        })
      }))
    }),
    {
      name: 'void-library',
    }
  )
);
