// ─── TIDAL Entity Types ──────────────────────────────────────────────────────

export interface TidalArtist {
  id: number | string;
  name: string;
  /** UUID used to construct picture URL via resources.tidal.com */
  picture: string | null;
  handle?: string | null;
  type?: string;
  popularity?: number;
  mixes?: { ARTIST_MIX?: string };
}

export interface TidalAlbum {
  id: number | string;
  title: string;
  /** UUID used to construct cover URL via resources.tidal.com */
  cover: string | null;
  vibrantColor?: string | null;
  videoCover?: string | null;
  releaseDate?: string;
  artists?: TidalArtist[];
  numberOfTracks?: number;
}

export interface TidalTrack {
  id: number | string;
  title: string;
  duration: number; // seconds
  artist: TidalArtist;
  artists: TidalArtist[];
  album: TidalAlbum;
  trackNumber?: number;
  volumeNumber?: number;
  popularity?: number;
  explicit?: boolean;
  audioQuality?: string;
  allowStreaming?: boolean;
  isrc?: string;
  country?: string;
  language?: string;
  mixes?: { TRACK_MIX?: string };
  streamInfo?: { codec?: string; sampleRate?: number; bitDepth?: number; audioQuality?: string; };
}

export interface TidalPlaylist {
  uuid: string;
  title: string;
  numberOfTracks: number;
  numberOfVideos?: number;
  description?: string;
  image?: string | null;
  squareImage?: string | null;
  type?: string;
  creator?: { id: number };
  lastUpdated?: string;
}

export interface TidalMix {
  id: string;
  title: string;
  subTitle?: string;
  images?: {
    SMALL?: { url: string };
    MEDIUM?: { url: string };
    LARGE?: { url: string };
  };
}
