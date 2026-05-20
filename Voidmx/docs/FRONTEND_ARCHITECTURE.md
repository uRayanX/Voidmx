# Frontend Architecture Documentation

## Overview

The Void Radio frontend is a React 19 + TypeScript single-page application (SPA) built with Vite 5, featuring a minimalist monochrome design and advanced audio streaming capabilities. The application provides a high-fidelity music player with intelligent recommendations, queue management, and synchronized lyrics.

## Technology Stack

### Core Framework
- **React 19**: Latest React version with concurrent features
- **TypeScript**: Full type safety across the codebase
- **Vite 5**: Lightning-fast build tool and dev server
- **React Router v6**: Client-side routing and navigation

### State Management
- **Zustand v5**: Lightweight state management with middleware support
- **subscribeWithSelector**: Zustand middleware for granular subscriptions
- **localStorage**: Persistent queue and settings storage

### Styling & UI
- **Tailwind CSS**: Utility-first CSS framework
- **Custom Components**: Monochrome-inspired dark-mode UI
- **Grainient**: Dynamic gradient backgrounds based on album artwork
- **Vibrant/ExtractColors**: Color extraction from album covers

### Audio & Media
- **HTML5 Audio API**: Core playback engine
- **YouTubeAudioAdapter**: Custom adapter for YouTube Music streaming
- **MediaSession API**: Lock screen and hardware key integration
- **Capacitor**: Native mobile app capabilities (Android)

### Network & APIs
- **Axios 1.13.6**: HTTP client (CRITICAL: Never update to 1.14.1+)
- **Tidal API**: Music metadata and streaming
- **Monochrome Instances**: Public Hi-Fi API endpoints
- **YouTube Music**: Alternative streaming backend

## Project Structure

```
spotify-social/
├── src/
│   ├── api/              # API clients and integrations
│   │   ├── lrclib.ts     # Lyrics provider integration
│   │   ├── spotify.ts    # Spotify OAuth and API
│   │   ├── tidal.ts      # Tidal API client (main music source)
│   │   └── tidalAuth.ts  # Tidal authentication
│   │
│   ├── auth/             # Authentication logic
│   │   ├── SpotifyAuth.ts
│   │   └── useAuth.ts
│   │
│   ├── components/       # React components
│   │   ├── Discover/     # Discovery and recommendation UI
│   │   ├── Feed/         # Home feed components
│   │   ├── Player/       # Playback controls and UI
│   │   ├── Profile/      # User profile components
│   │   ├── ui/           # Reusable UI primitives
│   │   ├── EqBars.tsx    # Audio visualizer
│   │   ├── ErrorBoundary.tsx
│   │   ├── Grainient.tsx # Dynamic gradient background
│   │   ├── SongInfoModal.tsx
│   │   └── TrackMenu.tsx
│   │
│   ├── hooks/            # Custom React hooks
│   │   ├── useCurrentTrack.ts
│   │   ├── useGlobalShortcuts.ts
│   │   ├── useLyrics.ts
│   │   ├── usePlayer.ts  # Main player engine hook
│   │   ├── useRadio.ts   # Infinite radio logic
│   │   ├── useRecommendations.ts
│   │   └── YouTubeAudioAdapter.ts
│   │
│   ├── lib/              # Utility libraries
│   │   ├── genres.ts     # Genre definitions
│   │   └── utils.ts      # Helper functions
│   │
│   ├── pages/            # Route pages
│   │   ├── Album.tsx     # Album detail view
│   │   ├── Artist.tsx    # Artist profile
│   │   ├── Features.tsx  # Featured content
│   │   ├── Friends.tsx   # Social features
│   │   ├── Genre.tsx     # Genre browsing
│   │   ├── Home.tsx      # Landing page
│   │   ├── Library.tsx   # User's collection
│   │   ├── Login.tsx     # Authentication
│   │   ├── NowPlaying.tsx # Full-screen player
│   │   ├── Playlist.tsx  # Playlist view
│   │   ├── Profile.tsx   # User profile
│   │   ├── Search.tsx    # Search interface
│   │   ├── Settings.tsx  # App configuration
│   │   └── Welcome.tsx   # Onboarding
│   │
│   ├── store/            # Zustand stores
│   │   ├── libraryStore.ts  # User library state
│   │   ├── playerStore.ts   # Playback state (main store)
│   │   └── searchStore.ts   # Search state
│   │
│   ├── types/            # TypeScript definitions
│   │   ├── spotify.ts
│   │   └── tidal.ts
│   │
│   ├── utils/            # Utility functions
│   │   ├── cors-bypass.ts   # CORS workarounds
│   │   ├── extractColor.ts  # Color extraction
│   │   ├── favicon.ts       # Dynamic favicon
│   │   └── radioMix.ts      # Radio algorithm
│   │
│   ├── App.tsx           # Root component
│   ├── main.tsx          # Entry point
│   └── index.css         # Global styles
│
├── public/               # Static assets
├── vite.config.ts        # Vite configuration
├── package.json
└── tsconfig.json
```

## Core Architecture Patterns

### 1. State Management (Zustand)

The application uses Zustand for global state management with three main stores:

#### playerStore.ts (Primary Store)
```typescript
interface PlayerStore {
  // Queue Management
  currentTrack: TidalTrack | null
  queue: TidalTrack[]
  shuffledQueue: TidalTrack[]
  originalQueueBeforeShuffle: TidalTrack[]
  queueIndex: number
  shuffleActive: boolean
  
  // Playback State
  isPaused: boolean
  isLoading: boolean
  positionMs: number
  durationMs: number
  bufferedMs: number
  volume: number
  repeatMode: RepeatMode
  
  // Radio Mode
  radioEnabled: boolean
  radioSeeds: TidalTrack[]
  isFetchingRadio: boolean
  
  // UI State
  showLyrics: boolean
  showQueue: boolean
  
  // Actions
  setQueue: (tracks, index, isRadio?) => void
  addToQueue: (tracks) => void
  addNextToQueue: (tracks) => void
  removeFromQueue: (index) => void
  moveInQueue: (from, to) => void
  clearQueue: () => void
  persistQueue: () => void
  restoreQueue: () => boolean
}
```

**Key Features:**
- **Queue Persistence**: Automatically saves queue state to localStorage
- **Shuffle Management**: Maintains both shuffled and original queue states
- **Radio Mode**: Infinite playback with intelligent recommendations
- **Middleware**: Uses `subscribeWithSelector` for granular reactivity

#### libraryStore.ts
Manages user's saved tracks, albums, and playlists.

#### searchStore.ts
Handles search state and recent searches.

### 2. Audio Playback Engine (usePlayer.ts)

The `usePlayer` hook is the heart of the audio system, implementing:

#### Quality Fallback Chain
```
HI_RES_LOSSLESS → LOSSLESS → HIGH → LOW
```

Automatically falls back to lower quality if higher quality fails.

#### Preloading Strategy
- Preloads next 2 tracks in queue for gapless playback
- Caches stream URLs to avoid redundant API calls
- Prunes cache when it exceeds 50 entries

#### Infinite Radio
```typescript
async function fetchRadioRecommendations() {
  // Auto-triggers when ≤3 tracks remain in queue
  // Uses play history + favorites as seeds
  // Enforces artist spacing to prevent fatigue
  // Adds 20 new tracks per fetch
}
```

#### MediaSession Integration
- Lock screen controls (play/pause/skip)
- Hardware key support (headphone buttons)
- Now playing metadata display
- Position state synchronization

#### Track Skip Logic
- Automatically skips unavailable/blocked tracks
- Handles streaming errors gracefully
- Implements retry logic with quality fallback

### 3. API Integration (tidal.ts)

The Tidal API client handles all music data and streaming:

#### Instance Management
```typescript
const DEFAULT_MONOCHROME_INSTANCES = [
  'https://monochrome-api.samidy.com',  // ✅ Primary
  'https://hifi.geeked.wtf',
  'https://eu-central.monochrome.tf',
  'https://us-west.monochrome.tf',
  // ... more instances
]
```

**Racing Strategy**: Queries 5 random instances simultaneously, uses first successful response.

#### Environment-Specific Routing

**Development (localhost)**:
```
Frontend → Vite Proxy → Monochrome Instance
```

**Production Web (voidradio.me)**:
```
Frontend → Cloudflare Pages Function → Monochrome Instance
```

**Native Android (Capacitor)**:
```
Frontend → Direct to Monochrome Instance (no CORS)
```

#### Stream URL Extraction
```typescript
async function getTrackStreamUrl(trackOrId, quality) {
  // 1. Check cache
  // 2. Fetch track metadata
  // 3. Extract manifest
  // 4. Parse DASH/MPD XML or JSON
  // 5. Return highest quality URL
  // 6. Wrap with proxy if needed
}
```

#### Audio Proxy Logic
```typescript
function wrapWithAudioProxy(url: string): string {
  // Only proxy when:
  // - Running in browser (not native)
  // - Extension NOT installed
  // - Not on localhost
  // - URL is Tidal CDN
  return `${PROXY_BASE}/proxy-audio?url=${encodeURIComponent(url)}`
}
```

### 4. Routing (React Router)

```typescript
const routes = [
  { path: '/', element: <Welcome /> },
  { path: '/login', element: <Login /> },
  { path: '/home', element: <Home /> },
  { path: '/search', element: <Search /> },
  { path: '/now', element: <NowPlaying /> },
  { path: '/library', element: <Library /> },
  { path: '/album/:id', element: <Album /> },
  { path: '/artist/:id', element: <Artist /> },
  { path: '/playlist/:id', element: <Playlist /> },
  { path: '/genre/:id', element: <Genre /> },
  { path: '/profile', element: <Profile /> },
  { path: '/friends', element: <Friends /> },
  { path: '/settings', element: <Settings /> },
]
```

### 5. Component Architecture

#### Grainient Component
Generates immersive gradient backgrounds from album artwork:
```typescript
// Extracts dominant colors from album cover
// Creates animated gradient background
// Updates on track change
```

#### Player Components
- **MiniPlayer**: Floating bottom bar with basic controls
- **NowPlaying**: Full-screen immersive player
- **QueuePanel**: Drag-to-reorder queue management
- **LyricsPanel**: Synchronized scrolling lyrics

#### Feed Components
- **HomeCarousel**: Algorithmic recommendations
- **QuickPicks**: Personalized suggestions
- **GenreGrid**: Browse by genre

## Data Flow

### Track Playback Flow
```
1. User clicks track
   ↓
2. playerStore.setQueue(tracks, index)
   ↓
3. usePlayer.playTrackFromQueue()
   ↓
4. tidal.getTrackStreamUrl(track, quality)
   ↓
5. Set audio.src = streamUrl
   ↓
6. audio.play()
   ↓
7. Update MediaSession metadata
   ↓
8. Preload next 2 tracks
   ↓
9. Check if radio refill needed
```

### Radio Mode Flow
```
1. User enables radio
   ↓
2. pickRadioSeeds() from history + favorites
   ↓
3. Shuffle seeds, create initial queue
   ↓
4. Start playback
   ↓
5. fetchRadioRecommendations() when ≤3 tracks left
   ↓
6. getRecommendedTracksForPlaylist(seeds, 40)
   ↓
7. Filter duplicates + enforce artist spacing
   ↓
8. addToQueue(newTracks)
   ↓
9. Repeat step 5 infinitely
```

### Search Flow
```
1. User types query
   ↓
2. searchStore.setQuery(query)
   ↓
3. tidal.search(query, type)
   ↓
4. fetchWithRetry() races 5 instances
   ↓
5. normalizeSearchResponse(data)
   ↓
6. Render results grid
```

## Performance Optimizations

### 1. Caching Strategy
- **Stream URLs**: 1 hour TTL, max 50 entries
- **Track Metadata**: 5 minute TTL
- **Search Results**: 30 minute TTL
- **Queue State**: Persisted to localStorage on every change

### 2. Preloading
- Next 2 tracks preloaded during playback
- Album artwork preloaded on hover
- Route components lazy-loaded

### 3. Instance Racing
- Queries 5 random instances simultaneously
- Uses first successful response
- Aborts slower requests to save bandwidth

### 4. Debouncing
- Search input debounced 300ms
- Volume slider debounced 100ms
- Position slider updates throttled to 60fps

## Mobile (Capacitor) Integration

### Native Features
- **File System**: Offline audio caching
- **MediaSession**: Native playback controls
- **Background Audio**: Continues playing when app backgrounded
- **Android Bridge**: Custom Java integration for notifications

### Offline Caching
```typescript
async function getOfflineAudioUrl(url, trackId) {
  // 1. Check if file exists in cache
  // 2. Validate file size (>500KB)
  // 3. Return cached file if valid
  // 4. Otherwise download in background
  // 5. Return streaming URL immediately
}
```

## Security & CORS Handling

### Development
- Vite proxy handles CORS for Monochrome instances
- Audio proxy middleware pipes Tidal CDN streams

### Production Web
- Cloudflare Pages Functions proxy all API requests
- `/proxy-api`: Monochrome instance proxy
- `/proxy-tidal`: Official Tidal API proxy (authenticated)
- `/proxy-audio`: Tidal CDN audio proxy

### Native Android
- No CORS restrictions
- Direct connections to all services
- Extension not needed

### Browser Extension
- Rewrites Origin/Referer headers on Tidal CDN requests
- Allows direct streaming without proxy
- Detected via `window.__tidalOriginExtension` flag

## Error Handling

### Stream Errors
1. Try preferred quality (HI_RES_LOSSLESS)
2. If fails, try LOSSLESS
3. If fails, try HIGH
4. If all fail, skip track

### API Errors
1. Race 5 instances
2. If all fail, retry with different batch
3. After 3 attempts, show error to user

### Network Errors
- Automatic retry with exponential backoff
- Fallback to cached data when available
- Graceful degradation (show placeholder images)

## Configuration

### Environment Variables
```bash
VITE_BACKEND_URL=https://api.yourserver.com  # Production backend
```

### localStorage Keys
- `monochrome-queue`: Persisted queue state
- `volume`: User volume preference
- `void-audio-quality`: Quality preference
- `radio-enabled`: Radio mode state
- `CUSTOM_INSTANCES`: User-added API instances
- `API_SYSTEM`: 'monochrome' or 'hifi'

## Build & Deployment

### Development
```bash
npm install
npm run dev  # Starts on http://localhost:8989
```

### Production Build
```bash
npm run build  # Outputs to dist/
```

### Android Build
```bash
npx cap sync android
npx cap open android
# Build APK in Android Studio
```

## Critical Dependencies

### Axios Version Lock
**CRITICAL**: Never update Axios beyond 1.13.x. Version 1.14.1+ breaks the application.

### Capacitor Plugins
- `@capacitor/core`: Core native bridge
- `@capacitor/filesystem`: File system access
- `@capgo/capacitor-media-session`: MediaSession API
- `@capacitor/file-transfer`: Background downloads

## Future Enhancements

### Planned Features
- WebSocket for real-time friend activity
- Collaborative playlists
- Crossfade between tracks
- Equalizer controls
- Podcast support
- Chromecast integration

### Performance Improvements
- Service Worker for offline support
- IndexedDB for larger cache
- Web Workers for audio processing
- Virtual scrolling for large playlists

## Troubleshooting

### Common Issues

**Audio won't play**:
- Check if extension is installed (browser)
- Verify Monochrome instances are accessible
- Check browser console for CORS errors
- Try different quality setting

**Queue not persisting**:
- Check localStorage quota
- Verify `persistQueue()` is called
- Check for JSON serialization errors

**Slow loading**:
- Check network tab for slow instances
- Verify preloading is working
- Check cache hit rate

**Android crashes**:
- Check native logs in Android Studio
- Verify Capacitor plugins are synced
- Check file system permissions

## Resources

- [Monochrome Source](https://github.com/monochrome-music/monochrome)
- [Tidal API Docs](https://github.com/yaronzz/Tidal-Media-Downloader)
- [Capacitor Docs](https://capacitorjs.com/docs)
- [Zustand Docs](https://docs.pmnd.rs/zustand)
