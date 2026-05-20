const express = require('express');
const cors = require('cors');
const { Innertube, UniversalCache } = require('youtubei.js');
const NodeCache = require('node-cache');

const app = express();
const port = 3001;

// Cache setup
const streamCache = new NodeCache({ stdTTL: 3600 }); // Cache streams for 1 hour

app.use(cors());

// Initialize Innertube
let yt;
async function initYt() {
  if (!yt) {
    yt = await Innertube.create({ generate_session_locally: true, cache: new UniversalCache(false) });
  }
  return yt;
}

const { exec } = require('child_process');
const util = require('util');
const https = require('https');
const execAsync = util.promisify(exec);

app.get('/api/stream', async (req, res) => {
  try {
    const { track, artist, videoId: queryVideoId } = req.query;
    
    if (!queryVideoId && (!track || !artist)) {
      return res.status(400).json({ error: 'Missing videoId or (track + artist) parameters' });
    }

    const cacheKey = queryVideoId || `${track} - ${artist}`;
    console.log(`\n[Stream] Request: ${cacheKey}`);

    let extractQuery = queryVideoId ? `https://www.youtube.com/watch?v=${queryVideoId}` : '';

    if (track && artist) {
      extractQuery = `ytsearch1:${track} ${artist} audio`;
      console.log(`[Stream] Bypassing videoId, searching standard YT: ${extractQuery}`);
    } else if (!queryVideoId) {
      return res.status(400).json({ error: 'Missing videoId or (track + artist) parameters' });
    }

    console.log(`[Stream] Piping yt-dlp directly: ${extractQuery}`);
    
    // Set response headers for audio stream
    res.writeHead(200, {
      'Content-Type': 'audio/webm', // yt-dlp bestaudio usually streams webm/opus
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Range',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Content-Type',
      'Transfer-Encoding': 'chunked'
    });

    const { spawn } = require('child_process');
    const ytDlp = spawn('/home/urayan8/.local/bin/yt-dlp', [
      '--js-runtimes', 'node', 
      '--remote-components', 'ejs:github', 
      '-f', 'bestaudio', 
      '-o', '-', 
      extractQuery
    ]);

    ytDlp.stdout.pipe(res);

    ytDlp.stderr.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('ERROR:')) {
        console.error(`[yt-dlp err] ${msg.trim()}`);
      }
    });

    ytDlp.on('close', (code) => {
      console.log(`[Stream] yt-dlp exited with code ${code}`);
      if (!res.writableEnded) res.end();
    });

    req.on('close', () => {
      console.log(`[Stream] Client disconnected, killing yt-dlp...`);
      ytDlp.kill();
    });


  } catch (error) {
    console.error(`[Stream] Error resolving audio:`, error.message);
    return res.status(500).json({ error: 'Failed to retrieve audio stream' });
  }
});


app.get('/api/search', async (req, res) => {
  try {
    const { q, type = 'song' } = req.query;
    if (!q) return res.status(400).json({ error: 'Missing query' });
    const youtube = await initYt();
    const results = await youtube.music.search(q, { type });
    
    // Depending on the type, the results might be in different properties
    let items = [];
    if (type === 'song') items = results.songs?.contents || results.contents || [];
    else if (type === 'album') items = results.albums?.contents || results.contents || [];
    else if (type === 'playlist') items = results.playlists?.contents || results.contents || [];
    else if (type === 'artist') items = results.artists?.contents || results.contents || [];
    else items = results.contents || [];

    return res.json({ items });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/home', async (req, res) => {
  try {
    const youtube = await initYt();
    const home = await youtube.music.getHomeFeed();
    return res.json({ sections: home.sections || [] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/queue', async (req, res) => {
  try {
    const { videoId } = req.query;
    if (!videoId) return res.status(400).json({ error: 'Missing videoId' });
    const youtube = await initYt();
    const upNext = await youtube.music.getUpNext(videoId);
    return res.json({ items: upNext.contents || [] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/album', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const youtube = await initYt();
    const album = await youtube.music.getAlbum(id);
    return res.json(album);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/playlist', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const youtube = await initYt();
    const playlist = await youtube.music.getPlaylist(id);
    return res.json(playlist);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/artist', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const youtube = await initYt();
    const artist = await youtube.music.getArtist(id);
    return res.json(artist);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Streaming proxy server running at http://localhost:${port}`);
  initYt().then(() => console.log('YouTubei initialized.'));
});
