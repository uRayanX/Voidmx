# Frontend Pages (`spotify-social/src/pages/`)

This document outlines the purpose of each page in the `spotify-social` React application and how they interact with their respective backend infrastructure.

## 🏠 Home (`Home.tsx`)
**Purpose:** Serves as the landing page for the user after logging in or opening the app. It displays a "Home Feed" containing recommended tracks, quick picks, and curated content.
**Backend Dependency:** Makes requests to `/api/home` to fetch the algorithmic music feed directly from the YouTube streaming backend.

## 🔍 Search (`Search.tsx`)
**Purpose:** Allows the user to search for songs, artists, albums, or playlists. Displays filtered results across different media types. 
**Backend Dependency:** Relies on `/api/search?q={query}&type={type}` which uses `youtubei.js` to parse search results matching the user's string.

## 🎶 Now Playing (`NowPlaying.tsx`)
**Purpose:** The immersive, full-screen playback view. This page displays the currently playing track's artwork, an animated gradient background (`Grainient`), lyrics (`LyricsPanel`), and the next-up queue.
**Backend Dependency:** 
* Audio stream is requested from `/api/stream?videoId=xyz` or `/api/stream?track=xyz&artist=abc`.
* The "up next" queue is populated by `/api/queue?videoId=xyz` (auto-mapping the radio feature).

## 🗂️ Library (`Library.tsx`)
**Purpose:** The user's personal collection. Displays saved songs, liked albums, and custom playlists. 
**Backend Dependency:** Primarily relies on local index/state (`libraryStore.ts`) and possibly external OAuth APIs (like Spotify OAuth) to sync the user's actual Spotify/Tidal library.

## 💿 Album (`Album.tsx`)
**Purpose:** Shows details for a specific album, including the cover art, overall length, release date, and the list of tracks contained within it.
**Backend Dependency:** Fetches metadata and the tracklist from `/api/album?id={albumId}`.

## 🎤 Artist (`Artist.tsx`)
**Purpose:** A dedicated page for a musical artist, showcasing their top tracks, latest releases, discography (albums/singles), and related artists.
**Backend Dependency:** Fetches the artist's profile data through `/api/artist?id={artistId}`.

## 📋 Playlist (`Playlist.tsx`)
**Purpose:** Renders the contents of a specific playlist, allowing the user to queue the entire list or start playing from a specific track.
**Backend Dependency:** Fetches playlist metadata and included tracks via `/api/playlist?id={playlistId}`.

## ⚙️ Settings (`Settings.tsx`)
**Purpose:** Configuration menu where users can adjust application preferences (audio quality, UI theme, caching, linked accounts, etc.).
**Backend Dependency:** Generally operates solely on local state (Zustand/localStorage) rather than a remote backend.

## 🎨 Genre (`Genre.tsx`) & Features (`Features.tsx`)
**Purpose:** Discovery pages that allow users to browse music by specific categories, moods, or curated thematic playlists.
**Backend Dependency:** May be routed through the `/api/search` proxy or a dedicated discovery endpoint.

## 👤 Profile (`Profile.tsx`) & Friends (`Friends.tsx`)
**Purpose:** Social features (as the folder name `spotify-social` implies) displaying user stats, listening history, and friend activity.
**Backend Dependency:** Connected to an external database/API (or mock state) handling the social networking logic.

## 🚪 Welcome (`Welcome.tsx`) & Login (`Login.tsx`)
**Purpose:** Authentication flow and onboarding screens for unauthenticated users. Usually involves completing Spotify/Tidal/Google OAuth handshakes before redirecting to `/Home`.
