# Streaming Backend Documentation

## Overview

The streaming backend is a Node.js + Express server that acts as an intelligent proxy between the frontend and YouTube Music's internal APIs. It uses `youtubei.js` (Innertube) to bypass YouTube's bot protections and provide seamless audio streaming without requiring official API keys.

## Technology Stack

- **Node.js**: JavaScript runtime
- **Express**: Web framework
- **youtubei.js**: YouTube Innertube API client
- **yt-dlp**: YouTube downloader (fallback)
- **node-cache**: In-memory caching
- **cors**: Cross-origin resource sharing

## Architecture

### Server Location
```
streaming-backend/
├── server.js           # Main Express server
├── package.json        # Dependencies
├── backend.log         # Server logs
└── node_modules/       # Dependencies
```

### Port Configuration
- **Development**: `http://localhost:3001`
- **Production**: Set via environment variable or reverse proxy

## Core Functionality

### 1. YouTube Innertube Integration

The backend initializes a persistent Innertube client that spoofs standard YouTube clients:

```javascript
const { Innertube, UniversalCache } = require('youtubei.js');

let yt;
async function initYt() {
  if (!yt) {
    yt = await Innertube.create({ 
      generate_session_locally: true, 
      cache: new UniversalCache(false) 
    });
  }
  return yt;
}
```

**Key Features**:
- Generates session locally (no external dependencies)
- Bypasses YouTube bot detection
- Maintains persistent session across requests
- No API key required

### 2. Caching Strategy

```javascript
const streamCache = new NodeCache({ stdTTL: 3600 }); // 1 hour TTL
```

- Stream URLs cached for 1 hour
- Reduces API calls to YouTube
- Improves response times
- Automatic expiration

## API Endpoints

### 🎵 GET /api/stream

**Purpose**: Streams audio directly from YouTube Music.

**Query Parameters**:
- `videoId` (optional): YouTube video ID
- `track` (optional): Track name
- `artist` (optional): Artist name

**Behavior**:
```javascript
// If videoId provided:
https://www.youtube.com/watch?v={videoId}

// If track + artist provided:
ytsearch1:{track} {artist} audio
```

**Implementation**:
```javascript
app.get('/api/stream', async (req, res) => {
  const { track, artist, videoId } = req.query;
  
  // Build search query
  const extractQuery = videoId 
    ? `https://www.youtube.com/watch?v=${videoId}`
    : `ytsearch1:${track} ${artist} audio`;
  
  // Set streaming headers
  res.writeHead(200, {
    'Content-Type': 'audio/webm',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Range',
    'Transfer-Encoding': 'chunked'
  });
  
  // Spawn yt-dlp process
  const ytDlp = spawn('/path/to/yt-dlp', [
    '--js-runtimes', 'node',
    '--remote-components', 'ejs:github',
    '-f', 'bestaudio',
    '-o', '-',
    extractQuery
  ]);
  
  // Pipe audio directly to response
  ytDlp.stdout.pipe(res);
  
  // Handle errors
  ytDlp.stderr.on('data', (data) => {
    console.error(`[yt-dlp err] ${data}`);
  });
  
  // Cleanup on client disconnect
  req.on('close', () => ytDlp.kill());
});
```

**Response**:
- **Content-Type**: `audio/webm` (Opus codec)
- **Streaming**: Chunked transfer encoding
- **CORS**: Enabled for all origins
- **Range Requests**: Supported for seeking

**Error Handling**:
- 400: Missing required parameters
- 500: Failed to retrieve audio stream
- Automatic cleanup on client disconnect

### 🔍 GET /api/search

**Purpose**: Search for music content on YouTube Music.

**Query Parameters**:
- `q` (required): Search query string
- `type` (optional): Content type filter
  - `song` (default)
  - `album`
  - `playlist`
  - `artist`

**Implementation**:
```javascript
app.get('/api/search', async (req, res) => {
  const { q, type = 'song' } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing query' });
  
  const youtube = await initYt();
  const results = await youtube.music.search(q, { type });
  
  // Extract items based on type
  let items = [];
  if (type === 'song') items = results.songs?.contents || [];
  else if (type === 'album') items = results.albums?.contents || [];
  else if (type === 'playlist') items = results.playlists?.contents || [];
  else if (type === 'artist') items = results.artists?.contents || [];
  
  return res.json({ items });
});
```

**Response Format**:
```json
{
  "items": [
    {
      "id": "video_id",
      "title": "Track Title",
      "artist": { "name": "Artist Name" },
      "album": { "title": "Album Title" },
      "duration": 180,
      "thumbnail": "https://..."
    }
  ]
}
```

### 🏠 GET /api/home

**Purpose**: Fetch personalized home feed recommendations.

**Implementation**:
```javascript
app.get('/api/home', async (req, res) => {
  const youtube = await initYt();
  const home = await youtube.music.getHomeFeed();
  return res.json({ sections: home.sections || [] });
});
```

**Response Format**:
```json
{
  "sections": [
    {
      "title": "Quick Picks",
      "contents": [...]
    },
    {
      "title": "Recommended Albums",
      "contents": [...]
    }
  ]
}
```

### ⏭️ GET /api/queue

**Purpose**: Fetch "Up Next" / "Radio" tracks for continuous playback.

**Query Parameters**:
- `videoId` (required): Seed track ID

**Implementation**:
```javascript
app.get('/api/queue', async (req, res) => {
  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: 'Missing videoId' });
  
  const youtube = await initYt();
  const upNext = await youtube.music.getUpNext(videoId);
  return res.json({ items: upNext.contents || [] });
});
```

**Use Case**: Powers the infinite radio feature by providing similar tracks.

### 💿 GET /api/album

**Purpose**: Fetch album metadata and tracklist.

**Query Parameters**:
- `id` (required): Album browse ID

**Implementation**:
```javascript
app.get('/api/album', async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id' });
  
  const youtube = await initYt();
  const album = await youtube.music.getAlbum(id);
  return res.json(album);
});
```

**Response Format**:
```json
{
  "id": "album_id",
  "title": "Album Title",
  "artist": { "name": "Artist Name" },
  "year": 2024,
  "tracks": [
    {
      "id": "track_id",
      "title": "Track Title",
      "duration": 180
    }
  ]
}
```

### 🎤 GET /api/artist

**Purpose**: Fetch artist profile and discography.

**Query Parameters**:
- `id` (required): Artist channel/browse ID

**Implementation**:
```javascript
app.get('/api/artist', async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id' });
  
  const youtube = await initYt();
  const artist = await youtube.music.getArtist(id);
  return res.json(artist);
});
```

**Response Format**:
```json
{
  "id": "artist_id",
  "name": "Artist Name",
  "description": "Bio...",
  "thumbnails": [...],
  "topSongs": [...],
  "albums": [...],
  "relatedArtists": [...]
}
```

### 📋 GET /api/playlist

**Purpose**: Fetch playlist metadata and tracks.

**Query Parameters**:
- `id` (required): Playlist ID

**Implementation**:
```javascript
app.get('/api/playlist', async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id' });
  
  const youtube = await initYt();
  const playlist = await youtube.music.getPlaylist(id);
  return res.json(playlist);
});
```

## Streaming Strategy

### The 302 Redirect Method (Disabled)

Originally, the backend used HTTP 302 redirects to send the frontend directly to YouTube's CDN:

```javascript
// Original approach (not currently used)
const streamUrl = await getStreamUrl(videoId);
res.redirect(302, streamUrl);
```

**Advantages**:
- Minimal server bandwidth usage
- Leverages YouTube's CDN
- Fast and efficient

**Why Disabled**:
- YouTube's signed URLs expire quickly
- CORS issues with direct CDN access
- Bot detection on repeated requests

### Current Piping Method

The current implementation pipes audio through the server:

```javascript
const ytDlp = spawn('yt-dlp', [...args]);
ytDlp.stdout.pipe(res);
```

**Advantages**:
- Bypasses CORS restrictions
- Handles YouTube bot protection
- Supports range requests (seeking)
- Automatic cleanup on disconnect

**Disadvantages**:
- Uses server bandwidth
- Slight latency increase

## yt-dlp Integration

### Installation
```bash
# Linux
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o ~/.local/bin/yt-dlp
chmod +x ~/.local/bin/yt-dlp

# macOS
brew install yt-dlp

# Windows
winget install yt-dlp
```

### Configuration
```javascript
const ytDlp = spawn('/home/urayan8/.local/bin/yt-dlp', [
  '--js-runtimes', 'node',           // Use Node.js for JS execution
  '--remote-components', 'ejs:github', // Fetch components from GitHub
  '-f', 'bestaudio',                 // Select best audio quality
  '-o', '-',                         // Output to stdout
  extractQuery                       // URL or search query
]);
```

### Output Format
- **Container**: WebM
- **Codec**: Opus (typically)
- **Quality**: Best available audio stream
- **Bitrate**: Variable (usually 128-160 kbps)

## CORS Configuration

```javascript
app.use(cors());
```

**Headers Set**:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Headers: Range`
- `Access-Control-Expose-Headers: Content-Length, Content-Range, Content-Type`

**Why Needed**:
- Frontend runs on different port (8989)
- Browser enforces same-origin policy
- Range requests need explicit CORS headers

## Error Handling

### Stream Errors
```javascript
ytDlp.stderr.on('data', (data) => {
  const msg = data.toString();
  if (msg.includes('ERROR:')) {
    console.error(`[yt-dlp err] ${msg.trim()}`);
  }
});
```

### Process Cleanup
```javascript
req.on('close', () => {
  console.log('[Stream] Client disconnected, killing yt-dlp...');
  ytDlp.kill();
});
```

### API Errors
```javascript
try {
  // API call
} catch (error) {
  return res.status(500).json({ error: error.message });
}
```

## Performance Optimizations

### 1. Persistent Innertube Client
- Single instance shared across requests
- Avoids repeated initialization overhead
- Maintains session state

### 2. Stream Caching
- Cache stream URLs for 1 hour
- Reduces YouTube API calls
- Faster response times

### 3. Process Management
- Spawn yt-dlp only when needed
- Kill process on client disconnect
- Prevent zombie processes

### 4. Chunked Transfer
- Stream audio in chunks
- Start playback before full download
- Reduce memory usage

## Deployment

### Development
```bash
cd streaming-backend
npm install
node server.js
```

### Production (PM2)
```bash
npm install -g pm2
pm2 start server.js --name streaming-backend
pm2 save
pm2 startup
```

### Production (systemd)
```ini
[Unit]
Description=Streaming Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/streaming-backend
ExecStart=/usr/bin/node server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

### Reverse Proxy (nginx)
```nginx
location /api/ {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    
    # Important for streaming
    proxy_buffering off;
    proxy_request_buffering off;
}
```

## Monitoring

### Logs
```bash
# View logs
tail -f streaming-backend/backend.log

# PM2 logs
pm2 logs streaming-backend
```

### Health Check
```bash
curl http://localhost:3001/api/search?q=test
```

### Metrics to Monitor
- Request rate
- Error rate
- Response times
- Active yt-dlp processes
- Memory usage
- Cache hit rate

## Security Considerations

### Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### Input Validation
```javascript
if (!videoId && (!track || !artist)) {
  return res.status(400).json({ error: 'Invalid parameters' });
}
```

### Process Isolation
- yt-dlp runs in separate process
- Automatic cleanup on errors
- No shell injection vulnerabilities

## Troubleshooting

### yt-dlp Not Found
```bash
# Check installation
which yt-dlp

# Update path in server.js
const ytDlp = spawn('/usr/local/bin/yt-dlp', [...]);
```

### YouTube Blocking
- Update yt-dlp: `yt-dlp -U`
- Use `--cookies` flag with authenticated cookies
- Rotate user agents

### High Memory Usage
- Check for zombie yt-dlp processes
- Implement process pooling
- Add memory limits

### Slow Streaming
- Check network bandwidth
- Verify yt-dlp is using best format
- Consider CDN caching

## Future Enhancements

### Planned Features
- WebSocket for real-time updates
- Redis caching for distributed systems
- Load balancing across multiple instances
- Metrics dashboard
- Automatic failover

### Performance Improvements
- HTTP/2 support
- Brotli compression
- Connection pooling
- CDN integration

## Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "youtubei.js": "^9.0.0",
    "node-cache": "^5.1.2"
  }
}
```

## Resources

- [youtubei.js Documentation](https://github.com/LuanRT/YouTube.js)
- [yt-dlp Documentation](https://github.com/yt-dlp/yt-dlp)
- [Express Documentation](https://expressjs.com/)
- [YouTube Innertube API](https://github.com/iv-org/invidious/blob/master/docs/api.md)
