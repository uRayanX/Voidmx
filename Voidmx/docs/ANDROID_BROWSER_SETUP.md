# Running Void Radio on Android Browser (Development Mode)

This guide explains how to access your development server from an Android device's browser.

## Prerequisites

- Development machine (Linux/Mac/Windows) running the dev servers
- Android device on the same WiFi network
- Both devices connected to the same local network

## Quick Start

### Step 1: Find Your Computer's Local IP Address

#### On Linux:
```bash
# Method 1: Using hostname
hostname -I | awk '{print $1}'

# Method 2: Using ip command
ip addr show | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | cut -d/ -f1

# Method 3: Using ifconfig
ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}'
```

#### On macOS:
```bash
# Method 1: Using ipconfig
ipconfig getifaddr en0

# Method 2: Using ifconfig
ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}'
```

#### On Windows:
```cmd
ipconfig
```
Look for "IPv4 Address" under your active network adapter (usually starts with 192.168.x.x or 10.0.x.x)

**Example output**: `192.168.1.100`

### Step 2: Update Vite Configuration

Edit `spotify-social/vite.config.ts` to allow external connections:

```typescript
import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import https from 'https'
import type { IncomingMessage, ServerResponse } from 'http'

const DEV_API_TARGET = 'https://hund.qqdl.site';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'audio-proxy',
      configureServer(server) {
        server.middlewares.use('/proxy-audio', (req: IncomingMessage, res: ServerResponse) => {
          const qs = (req.url || '').split('?')[1] || '';
          const targetUrl = new URLSearchParams(qs).get('url');
          if (!targetUrl) { res.writeHead(400); res.end('Missing url param'); return; }

          let parsed: URL;
          try { parsed = new URL(targetUrl); } catch { res.writeHead(400); res.end('Invalid url'); return; }

          const options = {
            hostname: parsed.hostname,
            port: 443,
            path: parsed.pathname + parsed.search,
            method: req.method || 'GET',
            headers: {
              ...(req.headers['range'] ? { Range: req.headers['range'] } : {}),
              'User-Agent': 'Mozilla/5.0',
            },
          };

          const proxyReq = https.request(options, (proxyRes) => {
            res.writeHead(proxyRes.statusCode || 200, {
              ...proxyRes.headers,
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'Range',
              'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
            });
            proxyRes.pipe(res);
          });

          proxyReq.on('error', (err) => {
            console.error('[audio-proxy]', err.message);
            res.writeHead(502); res.end('Proxy error');
          });

          proxyReq.end();
        });
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '0.0.0.0',  // ← ADD THIS LINE (allows external connections)
    port: 8989,
    strictPort: true,
    proxy: {
      '/monochrome-api': {
        target: DEV_API_TARGET,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/monochrome-api/, ''),
        secure: false,
      },
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      }
    },
  },
})
```

**Key change**: Add `host: '0.0.0.0'` to the `server` configuration.

### Step 3: Update Backend Server (Optional but Recommended)

Edit `streaming-backend/server.js` to allow external connections:

```javascript
const express = require('express');
const cors = require('cors');
const { Innertube, UniversalCache } = require('youtubei.js');
const NodeCache = require('node-cache');

const app = express();
const port = 3001;
const host = '0.0.0.0'; // ← ADD THIS LINE

// ... rest of the code ...

// At the bottom, change:
app.listen(port, host, () => {  // ← ADD host parameter
  console.log(`Streaming proxy server running at http://${host}:${port}`);
  initYt().then(() => console.log('YouTubei initialized.'));
});
```

### Step 4: Configure Firewall

Allow incoming connections on ports 8989 and 3001:

#### Linux (ufw):
```bash
sudo ufw allow 8989/tcp
sudo ufw allow 3001/tcp
sudo ufw reload
```

#### Linux (firewalld):
```bash
sudo firewall-cmd --add-port=8989/tcp --permanent
sudo firewall-cmd --add-port=3001/tcp --permanent
sudo firewall-cmd --reload
```

#### macOS:
```bash
# macOS firewall usually allows local network by default
# If you have strict firewall rules, add exceptions in:
# System Preferences → Security & Privacy → Firewall → Firewall Options
```

#### Windows:
```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "Void Radio Frontend" -Direction Inbound -LocalPort 8989 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Void Radio Backend" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

### Step 5: Start the Servers

```bash
# From project root
./start.sh

# Or manually:
# Terminal 1 - Backend
cd streaming-backend
node server.js

# Terminal 2 - Frontend
cd spotify-social
npm run dev
```

You should see output like:
```
  ╔═══════════════════════════════════╗
  ║            Spoti Dev Start        ║
  ╚═══════════════════════════════════╝

[Backend] Starting streaming server on :3001...
[Backend] Streaming proxy server running at http://0.0.0.0:3001
[Backend] YouTubei initialized.
[Frontend] Starting Vite dev server on :8989...
[Frontend] 
[Frontend]   VITE v5.x.x  ready in xxx ms
[Frontend] 
[Frontend]   ➜  Local:   http://localhost:8989/
[Frontend]   ➜  Network: http://192.168.1.100:8989/  ← USE THIS URL
```

### Step 6: Access from Android

1. **Open Chrome/Firefox on your Android device**
2. **Navigate to**: `http://YOUR_IP:8989`
   - Example: `http://192.168.1.100:8989`
3. **The app should load!**

## Troubleshooting

### Issue: "This site can't be reached"

**Causes & Solutions**:

1. **Wrong IP address**
   ```bash
   # Verify your IP again
   hostname -I | awk '{print $1}'
   ```

2. **Firewall blocking**
   ```bash
   # Test if port is accessible
   # On your computer:
   nc -l 8989
   
   # On Android, use a port checker app or browser:
   http://YOUR_IP:8989
   ```

3. **Different WiFi networks**
   - Ensure both devices are on the same WiFi
   - Some public WiFi networks block device-to-device communication
   - Try using a mobile hotspot from your phone

4. **Vite not binding to 0.0.0.0**
   ```bash
   # Check if Vite is listening on all interfaces
   netstat -tuln | grep 8989
   # Should show: 0.0.0.0:8989 (not 127.0.0.1:8989)
   ```

### Issue: Frontend loads but API calls fail

**Solution**: Update the backend proxy target in `vite.config.ts`:

```typescript
proxy: {
  '/api': {
    target: 'http://YOUR_IP:3001',  // ← Change from localhost
    changeOrigin: true,
    secure: false,
  }
}
```

Or better, make it dynamic:

```typescript
import os from 'os';

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const LOCAL_IP = getLocalIP();

export default defineConfig({
  // ...
  server: {
    host: '0.0.0.0',
    port: 8989,
    proxy: {
      '/api': {
        target: `http://${LOCAL_IP}:3001`,
        changeOrigin: true,
        secure: false,
      }
    },
  },
})
```

### Issue: Audio won't play

**Causes & Solutions**:

1. **CORS issues with Tidal CDN**
   - The audio proxy should handle this
   - Check browser console for errors

2. **HTTPS required for some features**
   - Some browsers require HTTPS for audio playback
   - See "HTTPS Setup" section below

3. **Network bandwidth**
   - Streaming over WiFi may be slower
   - Try lower quality settings in the app

### Issue: Slow loading

**Solutions**:

1. **Use 5GHz WiFi** instead of 2.4GHz
2. **Reduce distance** between devices
3. **Check network congestion**:
   ```bash
   # On your computer
   iftop  # Monitor network traffic
   ```

## HTTPS Setup (Optional but Recommended)

Some browser features (like MediaSession API) require HTTPS. Here's how to set it up:

### Step 1: Generate Self-Signed Certificate

```bash
cd spotify-social

# Generate certificate
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj "/CN=192.168.1.100" \
  -addext "subjectAltName=IP:192.168.1.100"
```

### Step 2: Update Vite Config

```typescript
import fs from 'fs';

export default defineConfig({
  // ...
  server: {
    host: '0.0.0.0',
    port: 8989,
    https: {
      key: fs.readFileSync('./key.pem'),
      cert: fs.readFileSync('./cert.pem'),
    },
    // ...
  },
})
```

### Step 3: Trust Certificate on Android

1. Navigate to `https://YOUR_IP:8989`
2. Browser will show security warning
3. Click "Advanced" → "Proceed anyway"
4. Or install certificate in Android settings:
   - Settings → Security → Install from storage
   - Select `cert.pem`

## Alternative: Using ngrok (Internet Tunnel)

If local network access doesn't work, use ngrok to create a public tunnel:

### Step 1: Install ngrok

```bash
# Download from https://ngrok.com/download
# Or use package manager:
brew install ngrok  # macOS
snap install ngrok  # Linux
```

### Step 2: Start ngrok

```bash
# Terminal 1: Start your servers normally
./start.sh

# Terminal 2: Create tunnel
ngrok http 8989
```

### Step 3: Use ngrok URL

ngrok will provide a public URL like:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:8989
```

Access this URL from your Android browser.

**Note**: Free ngrok has limitations (session timeout, random URLs). Consider paid plan for development.

## Performance Tips

### 1. Optimize Vite Dev Server

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    // ...
    hmr: {
      overlay: false,  // Disable error overlay for better mobile UX
    },
  },
  build: {
    sourcemap: false,  // Disable sourcemaps for faster loading
  },
})
```

### 2. Use Mobile-Optimized Settings

Create a `.env.local` file:
```bash
VITE_MOBILE_DEV=true
VITE_DISABLE_ANALYTICS=true
```

### 3. Reduce Network Traffic

- Disable hot module replacement (HMR) if not needed
- Use production build for testing: `npm run build && npm run preview`

## Testing Checklist

- [ ] Frontend loads on Android browser
- [ ] Search works
- [ ] Tracks play audio
- [ ] Queue management works
- [ ] Volume control works
- [ ] Seeking works
- [ ] Album/Artist pages load
- [ ] Images load correctly
- [ ] No console errors

## Security Notes

⚠️ **Important**: This setup is for development only!

- Never expose these ports to the public internet
- Use firewall rules to restrict access to local network only
- Don't use self-signed certificates in production
- Consider using VPN for remote development

## Recommended Android Browsers

1. **Chrome** (best compatibility)
2. **Firefox** (good privacy)
3. **Samsung Internet** (good performance)
4. **Brave** (privacy-focused)

Avoid:
- Opera Mini (limited JavaScript support)
- UC Browser (compatibility issues)

## Advanced: Persistent Development Setup

Create a helper script `start-mobile.sh`:

```bash
#!/bin/bash

# Get local IP
LOCAL_IP=$(hostname -I | awk '{print $1}')

echo "═══════════════════════════════════════"
echo "  Void Radio - Mobile Development Mode"
echo "═══════════════════════════════════════"
echo ""
echo "  Access from Android:"
echo "  http://${LOCAL_IP}:8989"
echo ""
echo "  Or scan this QR code:"
echo ""

# Generate QR code (requires qrencode)
if command -v qrencode &> /dev/null; then
  qrencode -t ANSIUTF8 "http://${LOCAL_IP}:8989"
else
  echo "  Install qrencode to see QR code:"
  echo "  sudo apt install qrencode"
fi

echo ""
echo "═══════════════════════════════════════"
echo ""

# Start servers
./start.sh
```

Make it executable:
```bash
chmod +x start-mobile.sh
./start-mobile.sh
```

## Resources

- [Vite Network Access Docs](https://vitejs.dev/config/server-options.html#server-host)
- [ngrok Documentation](https://ngrok.com/docs)
- [Android Chrome DevTools](https://developer.chrome.com/docs/devtools/remote-debugging/)
