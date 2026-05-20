# Spoti (Kiro) General Architecture

This document describes the high-level architecture of the `Spoti` project, specifically the interactions between the `spotify-social` frontend and the `streaming-backend`.

## High-Level Overview
The project is built as a complete music streaming web application, closely mimicking modern platforms like Spotify and Tidal. 
It is split into two primary domains:

1.  **Frontend (`spotify-social`)**: A React + Vite SPA using Tailwind CSS, Zustand, and React Router.
2.  **Backend (`streaming-backend`)**: A Node.js + Express JS API utilizing `youtubei.js` to scrape and stream music audio while circumventing YouTube bot protections.

## Frontend (`spotify-social`)
The `spotify-social` application is responsible for the visual user interface, state management, and playing audio.

### Key Tools:
*   **Vite**: Fast, modern build tool for frontend projects.
*   **React Router**: Handles the SPA navigation (e.g., between `/home`, `/search`, `/now`).
*   **Zustand**: A small, fast state-management library. Primarily used in `/store/playerStore.ts` to manage the audio playback state (current track, queue, volume, play/pause) globally.
*   **Tailwind CSS**: Utility-first CSS framework for rapid and responsive UI styling.
*   **React Context/Hooks**: `usePlayer.ts` synchronizes the Zustand state with an HTML5 `<audio>` HTML element.
*   **Vibrant/ExtractColors**: Generates the immersive `Grainient.tsx` background based on the artwork of the currently playing track.

### The Audio Pipeline:
The frontend interacts with the `<audio>` element by providing it a direct URL to the backend (`http://localhost:3001/api/stream?id=...`). The backend acts as a proxy, fetching the actual audio chunks from the content delivery network (CDN) and streaming them to the client browser.

## Backend (`streaming-backend`)
The backend is a standalone Node.js Express server. Its primary job is to act as an un-blockable middleman between the client's browser and YouTube/Tidal's internal APIs.

### Key Features:
*   **`youtubei.js` (Innertube API)**: The core engine. It spoofs standard YouTube Android/Web clients to fetch streaming URLs, search results, and metadata without requiring an official API key or facing scraping blocks (like `ytdl-core` often does).
*   **CORS Management**: By proxying requests through localhost:3001, the browser does not trigger Cross-Origin Resource Sharing errors when fetching raw audio.
*   **Streaming (The 302 Method)**: Instead of downloading the music to the server and re-sending it (which is slow and bandwidth-intensive), the backend retrieves the signed, expiring audio URL from YouTube and issues an `HTTP 302 Redirect`. The frontend `<audio>` tag then connects directly to Google's highly optimized CDNs.

## The Network Proxy (`vite.config.ts`)
To make development seamless, `vite.config.ts` includes proxy rules:
When the frontend app calls `/api/stream`, Vite seamlessly redirects that request internally to `http://localhost:3001`, bridging the gap between the frontend UI and the streaming engine. Vite also includes an `audio-proxy` middleware plugin to bypass strict CORS requirements or geo-blocks imposed by other streaming CDNs (like Tidal) if the user encounters them.