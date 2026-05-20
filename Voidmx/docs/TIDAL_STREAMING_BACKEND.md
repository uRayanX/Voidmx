# Tidal Streaming Backend Documentation

## Overview

The Tidal streaming backend is a distributed system of public Hi-Fi API instances (Monochrome and HiFi-API) that provide lossless audio streaming and music metadata. Unlike the YouTube Music backend, this is not a single server but a network of community-maintained instances that the frontend connects to directly.

## Architecture

### Instance Types

#### 1. Monochrome Instances
Community-maintained instances of the Monochrome API:

```javascript
const DEFAULT_MONOCHROME_INSTANCES = [
  'https://monochrome-api.samidy.com',  // ✅ Primary (verified working)
  'https://hifi.geeked.wtf',            // Token issues but kept as fallback
  'https://eu-central.monochrome.tf',   // EU region
  'https://us-west.monochrome.tf',      // US region
  'https://maus.qqdl.site',             // qqdl network
  'https://vogel.qqdl.site',
  'https://katze.qqdl.site',
  'https://hund.qqdl.site',
]
```

#### 2. HiFi-API Instances
Alternative API implementation with similar functionality:

```javascript
const DEFAULT_HIFI_INSTANCES = [
  'https://monochrome-api.samidy.com',
  'https://hifi.geeked.wtf',
  'https://maus.qqdl.site',
  'https://vogel.qqdl.site',
  'https://katze.qqdl.site',
  'https://hund.qqdl.site',
  'https://wolf.qqdl.site',
]
```

### Dynamic Instance Discovery

The frontend automatically fetches the latest working instances:

```javascript
fetch('https://raw.githubusercontent.com/monochrome-music/monochrome/main/public/instances.json')
  .then(res => res.json())
  .then(data => {
    const fetched = [];
    if (data?.api) fetched.push(...data.api);
    if (data?.streaming) fetched.push(...data.streaming);
    
    MONOCHROME_LIVE_INSTANCES = uniqueStrings(
      MONOCHROME_LIVE_INSTANCES.concat(fetched)
    );
  });
```

## Request Routing

### Environment-Specific Behavior

#### Development (localhost:8989)
```
Frontend → Vite Proxy → Monochrome Instance
```

**Vite Configuration**:
```typescript
server: {
  proxy: {
    '/monochrome-api': {
      target: 'https://hund.qqdl.site',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/monochrome-api/, ''),
    }
  }
}
```

**Frontend Request**:
```javascript
fetch('/monochrome-api/search/?q=daft+punk')
// Proxied to: https://hund.qqdl.site/search/?q=daft+punk
```

#### Production Web (voidradio.me, void-cyz.pages.dev)
```
Frontend → Cloudflare Pages Function → Monochrome Instance
```

**Proxy Endpoints**:
- `/proxy-api`: Monochrome instance proxy (search, albums, etc.)
- `/proxy-tidal`: Official Tidal API proxy (authenticated streaming)
- `/proxy-audio`: Tidal CDN audio proxy (CORS bypass)

**Request Flow**:
```javascript
// Track streaming (authenticated)
const res = await fetch(`${PROXY_BASE}/proxy-tidal?path=/track/${id}`, {
  headers: { Authorization: `Bearer ${accessToken}` }
});

// Search, albums, etc. (Monochrome)
const res = await fetch(`${PROXY_BASE}/proxy-api?path=/search/?q=${query}`);

// Audio streaming (CDN proxy)
const audioUrl = `${PROXY_BASE}/proxy-audio?url=${encodeURIComponent(tidalCdnUrl)}`;
```

#### Native Android (Capacitor)
```
Frontend → Direct to Monochrome Instance (no CORS)
```

**No proxy needed**: Native apps don't have CORS restrictions.

### Instance Racing Strategy

The frontend queries multiple instances simultaneously and uses the first successful response:

```javascript
async function fetchWithRetry(relativePath, timeout = 7000) {
  const maxAttempts = 3;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Pick 5 random instances
    const sample = [...INSTANCES]
      .sort(() => 0.5 - Math.random())
      .slice(0, 5);
    
    const controllers = sample.map(() => new AbortController());
    
    try {
      const res = await new Promise((resolve, reject) => {
        let failedCount = 0;
        
        sample.forEach((instance, idx) => {
          const controller = controllers[idx];
          const timer = setTimeout(() => controller.abort(), timeout);
          const url = `${instance}${relativePath}`;
          
          fetch(url, { signal: controller.signal })
            .then(res => {
              clearTimeout(timer);
              if (res.ok) {
                // Abort all other requests
                controllers.forEach((c, j) => {
                  if (idx !== j) c.abort();
                });
                resolve(res);
              } else {
                throw new Error(`HTTP ${res.status}`);
              }
            })
            .catch(() => {
              clearTimeout(timer);
              failedCount++;
              if (failedCount === sample.length) {
                reject(new Error('Batch failed'));
              }
            });
        });
      });
      
      return res;
    } catch (e) {
      // Wait before next attempt
      await delay(200);
    }
  }
  
  throw new Error('All API instances failed');
}
```

**Benefits**:
- Fastest instance wins
- Automatic failover
- Reduced latency
- Resilient to instance downtime

## API Endpoints

### Track Streaming

#### GET /track/{id}

**Purpose**: Get track stream URL and metadata.

**Response Format**:
```json
[
  {
    "duration": 180,
    "id": 123456789,
    "trackId": 123456789
  },
  {
    "manifest": "base64_encoded_dash_manifest",
    "audioQuality": "HI_RES_LOSSLESS",
    "codec": "FLAC",
    "sampleRate": 96000,
    "bitDepth": 24
  }
]
```

**Stream URL Extraction**:
```javascript
function extractStreamUrlFromManifest(manifest) {
  // 1. Decode base64
  const decoded = atob(manifest);
  
  // 2. Try JSON parse
  try {
    const parsed = JSON.parse(decoded);
    if (parsed.urls) return parsed.urls[0];
  } catch {}
  
  // 3. Parse DASH/MPD XML
  if (decoded.includes('<MPD')) {
    return parseFlacUrlFromMpd(decoded);
  }
  
  // 4. Regex fallback
  const match = decoded.match(/https?:\/\/[^\s]+/);
  return match ? match[0] : null;
}
```

### Search

#### GET /search/?q={query}&type={type}

**Query Parameters**:
- `q`: Search query
- `type`: `tracks`, `albums`, `artists`, `playlists`

**Response Format**:
```json
{
  "tracks": {
    "items": [
      {
        "id": 123456789,
        "title": "Track Title",
        "artist": {
          "id": 987654,
          "name": "Artist Name"
        },
        "album": {
          "id": 456789,
          "title": "Album Title",
          "cover": "uuid-string"
        },
        "duration": 180,
        "audioQuality": "LOSSLESS",
        "isrc": "USRC12345678"
      }
    ]
  }
}
```

### Album

#### GET /album/{id}

**Response Format**:
```json
{
  "id": 123456,
  "title": "Album Title",
  "artist": {
    "id": 987654,
    "name": "Artist Name"
  },
  "releaseDate": "2024-01-01",
  "numberOfTracks": 12,
  "duration": 2400,
  "cover": "uuid-string",
  "tracks": [
    {
      "id": 123456789,
      "title": "Track 1",
      "trackNumber": 1,
      "duration": 180
    }
  ]
}
```

### Artist

#### GET /artist/{id}

**Response Format**:
```json
{
  "id": 987654,
  "name": "Artist Name",
  "picture": "uuid-string",
  "bio": "Artist biography...",
  "topTracks": [...],
  "albums": [...],
  "relatedArtists": [...]
}
```

### Playlist

#### GET /playlist/{uuid}

**Response Format**:
```json
{
  "uuid": "playlist-uuid",
  "title": "Playlist Title",
  "description": "Description...",
  "numberOfTracks": 50,
  "image": "uuid-string",
  "tracks": [...]
}
```

### Recommendations

#### GET /recommendations/?id={trackId}&limit={limit}

**Purpose**: Get similar tracks for radio mode.

**Response Format**:
```json
{
  "tracks": [
    {
      "id": 123456789,
      "title": "Similar Track",
      "artist": {...},
      "album": {...}
    }
  ]
}
```

## Audio Quality Levels

### Quality Hierarchy
```
HI_RES_LOSSLESS (96kHz/24-bit FLAC) → Best
LOSSLESS (44.1kHz/16-bit FLAC)      → High
HIGH (320kbps AAC)                  → Medium
LOW (96kbps AAC)                    → Low
```

### Quality Fallback Chain

```javascript
async function getTrackStreamUrl(trackOrId, quality = 'HI_RES_LOSSLESS') {
  try {
    // Try preferred quality
    return await fetchStreamUrl(trackOrId, quality);
  } catch (err) {
    // Fallback chain
    for (const fallbackQuality of ['LOSSLESS', 'HIGH', 'LOW']) {
      try {
        return await fetchStreamUrl(trackOrId, fallbackQuality);
      } catch {}
    }
    throw new Error('All quality levels failed');
  }
}
```

## Image URLs

### Album Covers
```javascript
function getCoverUrl(uuid, size = 320) {
  const formatted = uuid.replace(/-/g, '/');
  const validSizes = [80, 160, 320, 640, 1080, 1280];
  const safeSize = validSizes.find(s => s >= size) || 1280;
  
  return `https://resources.tidal.com/images/${formatted}/${safeSize}x${safeSize}.jpg`;
}
```

**Example**:
```
UUID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
URL:  https://resources.tidal.com/images/a1b2c3d4/e5f6/7890/abcd/ef1234567890/640x640.jpg
```

### Artist Pictures
```javascript
function getArtistPictureUrl(uuid, size = 320) {
  const formatted = uuid.replace(/-/g, '/');
  const safeSize = size > 320 ? 750 : 320;
  
  return `https://resources.tidal.com/images/${formatted}/${safeSize}x${safeSize}.jpg`;
}
```

## CORS Handling

### The CORS Problem

**Issue**: Tidal CDN blocks cross-origin requests from browser.

**Error**:
```
Access to audio at 'https://sp-fa.audio.tidal.com/...' from origin 
'https://voidradio.me' has been blocked by CORS policy
```

### Solution 1: Browser Extension

The Chrome extension rewrites request headers:

```javascript
// inject.js
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    const headers = details.requestHeaders;
    
    // Rewrite Origin header
    const originIdx = headers.findIndex(h => h.name.toLowerCase() === 'origin');
    if (originIdx >= 0) {
      headers[originIdx].value = 'https://listen.tidal.com';
    }
    
    // Rewrite Referer header
    const refererIdx = headers.findIndex(h => h.name.toLowerCase() === 'referer');
    if (refererIdx >= 0) {
      headers[refererIdx].value = 'https://listen.tidal.com/';
    }
    
    return { requestHeaders: headers };
  },
  { urls: ['*://*.tidal.com/*'] },
  ['blocking', 'requestHeaders']
);
```

**Detection**:
```javascript
function hasExtension() {
  return typeof window !== 'undefined' && 
         !!(window as any).__tidalOriginExtension;
}
```

### Solution 2: Server-Side Proxy

When extension is not installed, route through Cloudflare Pages Function:

```javascript
function wrapWithAudioProxy(url) {
  // Don't wrap if:
  if (Capacitor.isNativePlatform()) return url;  // Native app
  if (hasExtension()) return url;                // Extension installed
  if (IS_DEV_LOCALHOST) return url;              // Localhost
  if (!url.includes('tidal.com')) return url;    // Not Tidal CDN
  
  // Wrap with proxy
  return `${PROXY_BASE}/proxy-audio?url=${encodeURIComponent(url)}`;
}
```

**Cloudflare Pages Function** (`functions/proxy-audio.ts`):
```typescript
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const targetUrl = url.searchParams.get('url');
  
  const response = await fetch(targetUrl, {
    headers: {
      'Origin': 'https://listen.tidal.com',
      'Referer': 'https://listen.tidal.com/',
      'User-Agent': 'Mozilla/5.0...'
    }
  });
  
  const newHeaders = new Headers(response.headers);
  newHeaders.set('Access-Control-Allow-Origin', '*');
  newHeaders.set('Access-Control-Allow-Headers', 'Range');
  
  return new Response(response.body, {
    status: response.status,
    headers: newHeaders
  });
}
```

## Caching Strategy

### In-Memory Cache
```javascript
const _cache = new Map();

function cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    _cache.delete(key);
    return undefined;
  }
  return entry.data;
}

function cacheSet(key, data, ttlMs = 30 * 60_000) {
  _cache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs
  });
}
```

### Cache Keys
- `stream_${trackId}_${quality}`: Stream URLs (1 hour)
- `meta_${trackId}`: Track metadata (5 minutes)
- `search_${query}_${type}`: Search results (30 minutes)
- `album_${albumId}`: Album data (1 hour)
- `artist_${artistId}`: Artist data (1 hour)

### Offline Caching (Native Android)

```javascript
async function getOfflineAudioUrl(url, trackId, overrideCache = false) {
  if (!Capacitor.isNativePlatform()) {
    return wrapWithAudioProxy(url);
  }
  
  const fileName = `void-track-${trackId}.flac`;
  const MIN_VALID_BYTES = 500_000; // 500 KB minimum
  
  try {
    if (!overrideCache) {
      const stat = await Filesystem.stat({
        directory: Directory.Cache,
        path: fileName
      });
      
      if (stat.size >= MIN_VALID_BYTES) {
        // Use cached file
        const { uri } = await Filesystem.getUri({
          directory: Directory.Cache,
          path: fileName
        });
        return Capacitor.convertFileSrc(uri);
      } else {
        // Corrupted cache, delete
        await Filesystem.deleteFile({
          directory: Directory.Cache,
          path: fileName
        });
      }
    }
  } catch {
    // File doesn't exist, proceed to download
  }
  
  // Non-blocking background download
  Filesystem.getUri({
    directory: Directory.Cache,
    path: fileName
  }).then(({ uri }) => {
    FileTransfer.downloadFile({ url, path: uri });
  });
  
  // Return streaming URL immediately
  return url;
}
```

## Data Normalization

### Track Normalization
```javascript
function normalizeTrack(raw) {
  // Ensure artist exists
  if (!raw.artist && raw.artists?.length > 0) {
    raw.artist = raw.artists[0];
  }
  
  return {
    id: raw.id ?? 0,
    title: raw.title ?? 'Unknown',
    duration: raw.duration ?? 0,
    artist: normalizeArtist(raw.artist ?? {}),
    artists: (raw.artists ?? []).map(normalizeArtist),
    album: normalizeAlbum(raw.album ?? {}),
    trackNumber: raw.trackNumber,
    volumeNumber: raw.volumeNumber ?? 1,
    popularity: raw.popularity ?? 0,
    explicit: raw.explicit ?? false,
    audioQuality: raw.audioQuality ?? 'LOSSLESS',
    allowStreaming: raw.allowStreaming ?? true,
    isrc: raw.isrc,
    country: raw.country ?? raw.isrc?.substring(0, 2),
    language: raw.language ?? raw.audioLanguage,
    mixes: raw.mixes ?? {}
  };
}
```

### Search Response Normalization

Monochrome instances return inconsistent response structures. The frontend recursively searches for the `items` array:

```javascript
function findSearchSection(source, key, visited) {
  if (!source || typeof source !== 'object') return undefined;
  if (visited.has(source)) return undefined;
  visited.add(source);
  
  // Check if this object has items
  if (Array.isArray(source.items)) {
    return source;
  }
  
  // Prefer keyed property
  if (key in source) {
    const found = findSearchSection(source[key], key, visited);
    if (found) return found;
  }
  
  // Search all properties
  for (const value of Object.values(source)) {
    const found = findSearchSection(value, key, visited);
    if (found) return found;
  }
  
  return undefined;
}
```

## Recommendation Algorithm

### ISRC & Language Prioritization

```javascript
async function getRecommendedTracksForPlaylist(seeds, limit, options) {
  const { knownTrackIds, existingQueue } = options;
  
  // Extract seed characteristics
  const seedCountries = seeds.map(t => t.country).filter(Boolean);
  const seedLanguages = seeds.map(t => t.language).filter(Boolean);
  
  // Fetch recommendations from multiple seeds
  const allRecs = [];
  for (const seed of seeds) {
    const recs = await fetchRecommendations(seed.id, limit);
    allRecs.push(...recs);
  }
  
  // Score and filter
  const scored = allRecs
    .filter(t => !knownTrackIds.has(t.id))
    .map(track => {
      let score = 0;
      
      // Prefer same country/language
      if (seedCountries.includes(track.country)) score += 10;
      if (seedLanguages.includes(track.language)) score += 5;
      
      // Penalize generic distributors
      if (track.isrc?.startsWith('QM')) score -= 20; // Generic
      
      // Popularity bonus
      score += Math.log(track.popularity + 1);
      
      return { track, score };
    })
    .sort((a, b) => b.score - a.score);
  
  // Enforce artist spacing
  const result = [];
  const recentArtists = new Set();
  
  for (const { track } of scored) {
    const artistId = track.artist.id;
    
    if (!recentArtists.has(artistId)) {
      result.push(track);
      recentArtists.add(artistId);
      
      // Clear artist from recent after 5 tracks
      if (result.length % 5 === 0) {
        recentArtists.clear();
      }
    }
    
    if (result.length >= limit) break;
  }
  
  return result;
}
```

### Artist Spacing

Prevents the same artist from appearing too frequently:

```javascript
const ARTIST_SPACING_WINDOW = 5; // Minimum tracks between same artist

function enforceArtistSpacing(tracks, existingQueue) {
  const result = [];
  const recentArtists = new Map(); // artistId -> lastIndex
  
  // Seed with existing queue
  existingQueue.slice(-10).forEach((track, idx) => {
    recentArtists.set(track.artist.id, idx);
  });
  
  for (const track of tracks) {
    const artistId = track.artist.id;
    const lastIndex = recentArtists.get(artistId);
    
    if (lastIndex === undefined || 
        result.length - lastIndex >= ARTIST_SPACING_WINDOW) {
      result.push(track);
      recentArtists.set(artistId, result.length - 1);
    }
  }
  
  return result;
}
```

## Error Handling

### Instance Failures
```javascript
// Automatic retry with different instances
for (let attempt = 0; attempt < 3; attempt++) {
  try {
    return await fetchWithRetry(path);
  } catch (err) {
    if (attempt === 2) throw err;
    await delay(200);
  }
}
```

### Stream Failures
```javascript
// Quality fallback
try {
  return await getStreamUrl(track, 'HI_RES_LOSSLESS');
} catch {
  try {
    return await getStreamUrl(track, 'LOSSLESS');
  } catch {
    return await getStreamUrl(track, 'HIGH');
  }
}
```

### CORS Failures
```javascript
// Automatic proxy wrapping
if (response.status === 0 || response.type === 'opaque') {
  // CORS error, wrap with proxy
  return wrapWithAudioProxy(url);
}
```

## Monitoring & Health Checks

### Instance Health Check
```javascript
async function checkInstanceHealth(instance) {
  try {
    const res = await fetch(`${instance}/health`, { 
      signal: AbortSignal.timeout(5000) 
    });
    return res.ok;
  } catch {
    return false;
  }
}
```

### Automatic Instance Rotation
```javascript
// Remove dead instances
INSTANCES = INSTANCES.filter(async (instance) => {
  const healthy = await checkInstanceHealth(instance);
  if (!healthy) {
    console.warn(`Instance ${instance} is unhealthy, removing`);
  }
  return healthy;
});
```

## Configuration

### User Settings
```javascript
// API System Selection
localStorage.setItem('API_SYSTEM', 'monochrome'); // or 'hifi'

// Custom Instances
localStorage.setItem('CUSTOM_INSTANCES', JSON.stringify([
  'https://my-instance.example.com'
]));

// Audio Quality
localStorage.setItem('void-audio-quality', 'HI_RES_LOSSLESS');
```

## Resources

- [Monochrome GitHub](https://github.com/monochrome-music/monochrome)
- [Monochrome Instances List](https://github.com/monochrome-music/monochrome/blob/main/public/instances.json)
- [Tidal API Documentation](https://github.com/yaronzz/Tidal-Media-Downloader)
- [HiFi-API](https://github.com/uhwot/hifi-api)
