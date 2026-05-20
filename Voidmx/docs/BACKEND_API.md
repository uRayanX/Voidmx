# Backend API Documentation (`streaming-backend/server.js`)

This document outlines the responsibilities of the Express backend that acts as the core streaming intelligence for the frontend app.

## Overview
The `streaming-backend` is an Express-based Node.js server running asynchronously with the `youtubei.js` (Innertube) engine. This prevents the application from directly interacting with YouTube from the browser, which causes severe CORS constraints and anti-bot issues. The backend handles spoofing client headers, extracting streams, fetching album metadata, and keeping your radio automated.

All endpoints are built async under `/api/*`.

---

## The Endpoints

### 🎵 `GET /api/stream`
**Purpose:** Acquires a direct CDN stream URL (or pipes the audio buffer directly) given a track identifier.
**Query Parameters:**
* `videoId` (optional): The explicit YouTube Video ID.
* `track` and `artist` (optional): If no ID is passed, the backend attempts to search for the best audio match based on this combination payload.
**Response:** If configured as a 302, it seamlessly redirects the HTML5 `<audio>` tag in the frontend directly to the unblocked YouTube audio CDN, successfully bypassing bot protections.

### 🔍 `GET /api/search`
**Purpose:** Replaces the need for external API search functionalities by scraping/querying Innertube for music content.
**Query Parameters:**
* `q` (required): The search string (e.g. "Daft Punk").
* `type` (optional, default: "song"): Can filter between `song`, `artist`, `album`, `playlist`.
**Response:** JSON array mapping search result titles, thumbnails, and IDs.

### 🏠 `GET /api/home`
**Purpose:** Fetches personalized (or anonymous) algorithmic recommendations for the user's dashboard feed.
**Parameters:** Usually relies on an internal instance of Innertube being authenticated, or fetches "Trending"/"Quick Picks" anonymously.
**Response:** JSON mapping of homepage carousel shelves (e.g. "Hits of 2011", "Recommend For You").

### ⏭️ `GET /api/queue`
**Purpose:** Fetch the "Up Next" / "Radio" tracks for continuous play. 
**Query Parameters:**
* `videoId` (required): The seed ID.
**Response:** When provided a starting song, the backend scrapes the YouTube "Up Next" panel and returns an array of sequential tracks that sonically match the seed, feeding into `playerStore.ts` on the frontend.

### 💿 `GET /api/album`
**Purpose:** Fetches the full tracklist and metadata of a specific album.
**Query Parameters:**
* `id` (required): The Album browse ID.
**Response:** JSON containing the album title, author/artist, release year, artwork, and an array of sequenced songs.

### 🎤 `GET /api/artist`
**Purpose:** Fetches an artist's profile.
**Query Parameters:**
* `id` (required): The Artist channel or browse ID.
**Response:** An aggregated JSON response holding their top songs, a list of their released albums, and related artists.

### 📋 `GET /api/playlist`
**Purpose:** Extracts songs from a curated playlist.
**Query Parameters:**
* `id` (required): The Playlist list ID.
**Response:** JSON tracklist containing the playlist's title, description, cover image, and the ordered individual tracks contained within the list.
