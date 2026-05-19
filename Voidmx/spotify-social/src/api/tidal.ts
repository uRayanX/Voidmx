/**
 * src/api/tidal.ts
 *
 * TIDAL API client modelled directly on the Monochrome source code:
 * https://github.com/monochrome-music/monochrome/blob/main/js/api.js
 *
 * Endpoint patterns, response-normalization logic, and stream-URL extraction
 * are all lifted verbatim from the Monochrome LosslessAPI class.
 */
import { FileTransfer } from '@capacitor/file-transfer';
import { Filesystem, Directory } from '@capacitor/filesystem';

import { Capacitor } from '@capacitor/core';
import type {
  TidalTrack,
  TidalArtist,
  TidalAlbum,
  TidalPlaylist,
} from '../types/tidal';

// ─── Public Hi-Fi API instances ────────────────────────────────────────────
// ─── Instance lists (verified 2026-04-24) ─────────────────────────────────────
// monochrome-api.samidy.com — only instance returning valid data in health check
// qqdl.site nodes — alive but block voidradio.me origin; usable from Android/extension
// monochrome.tf nodes — 401 (Tidal token expired) but kept as fallbacks
export const DEFAULT_MONOCHROME_INSTANCES = [
  'https://monochrome-api.samidy.com',  // ✅ working
  'https://hifi.geeked.wtf',            // token issues but kept as fallback
  'https://eu-central.monochrome.tf',
  'https://us-west.monochrome.tf',
  'https://maus.qqdl.site',
  'https://vogel.qqdl.site',
  'https://katze.qqdl.site',
  'https://hund.qqdl.site',
];

export const DEFAULT_HIFI_INSTANCES = [
  'https://monochrome-api.samidy.com',  // ✅ working
  'https://hifi.geeked.wtf',
  'https://maus.qqdl.site',
  'https://vogel.qqdl.site',
  'https://katze.qqdl.site',
  'https://hund.qqdl.site',
  'https://wolf.qqdl.site',
];

export const DEFAULT_INSTANCES = DEFAULT_MONOCHROME_INSTANCES.concat(DEFAULT_HIFI_INSTANCES);

function uniqueStrings(items: string[]): string[] {
  const map: Record<string, boolean> = {};
  items.forEach(i => { map[i] = true; });
  return Object.keys(map);
}

export function getCustomInstances(): string[] {
  const saved = localStorage.getItem('CUSTOM_INSTANCES');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {}
  }
  return [];
}

export function saveCustomInstances(instances: string[]) {
  localStorage.setItem('CUSTOM_INSTANCES', JSON.stringify(instances));
  updateInstances();
}

export function getApiSystem(): 'monochrome' | 'hifi' {
  return (localStorage.getItem('API_SYSTEM') as 'monochrome' | 'hifi') || 'monochrome';
}

export function setApiSystem(system: 'monochrome' | 'hifi') {
  localStorage.setItem('API_SYSTEM', system);
  updateInstances();
}

let MONOCHROME_LIVE_INSTANCES = [...DEFAULT_MONOCHROME_INSTANCES];
let HIFI_LIVE_INSTANCES = [...DEFAULT_HIFI_INSTANCES];
let INSTANCES: string[] = [];

function updateInstances() {
  const system = getApiSystem();
  const base = system === 'hifi' ? HIFI_LIVE_INSTANCES : MONOCHROME_LIVE_INSTANCES;
  INSTANCES = uniqueStrings(base.concat(getCustomInstances()));
}

updateInstances();

// Asynchronously fetch current working instances from the community list
fetch('https://raw.githubusercontent.com/monochrome-music/monochrome/main/public/instances.json')
  .then(res => res.json())
  .then(data => {
    const fetched: string[] = [];
    if (data && Array.isArray(data.api)) fetched.push(...data.api);
    if (data && Array.isArray(data.streaming)) fetched.push(...data.streaming);
    
    if (fetched.length > 0) {
      const clean = fetched.map(url => url.endsWith('/') ? url.slice(0, -1) : url);
      MONOCHROME_LIVE_INSTANCES = uniqueStrings(MONOCHROME_LIVE_INSTANCES.concat(clean));
      updateInstances();
    }
  })
  .catch(err => console.warn('Failed to update Monochrome instances', err));

// ─── Simple in-memory cache ──────────────────────────────────────────────────
const _cache = new Map<string, { data: unknown; expiresAt: number }>();

function cacheGet<T>(key: string): T | undefined {
  const entry = _cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) { _cache.delete(key); return undefined; }
  return entry.data as T;
}

function cacheSet(key: string, data: unknown, ttlMs = 30 * 60_000) {
  _cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// ─── Dev proxy detection ─────────────────────────────────────────────────────
// When running on localhost the Monochrome instances block requests (403/CORS).
// Vite proxies /monochrome-api/* → hund.qqdl.site so we use that instead.
const IS_DEV_LOCALHOST =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// ─── Streaming backend URL ───────────────────────────────────────────────────
// Dev:        '' (Vite proxy routes /api/* → localhost:3001 via vite.config.ts)
// Production: Set VITE_BACKEND_URL env var to your VPS URL, e.g. https://api.yourserver.com
const BACKEND_URL: string = IS_DEV_LOCALHOST
  ? ''
  : ((import.meta.env.VITE_BACKEND_URL as string) || '');


// On production web (voidradio.me, void-cyz.pages.dev) most HiFi/qqdl instances
// return 403 for our domain. Only the monochrome.tf nodes have open
// On production web, all API calls are routed through the /proxy-api Cloudflare
// Pages Function instead of hitting instances directly from the browser.
// This avoids CORS blocks (*.qqdl.site blocks voidradio.me origin) and 401s
// (monochrome.tf requires Origin: monochrome.tf which the proxy spoofs).
// The proxy races all known instances server-side and returns the first success.
const IS_PRODUCTION_WEB =
  typeof window !== 'undefined' &&
  !IS_DEV_LOCALHOST &&
  !Capacitor.isNativePlatform() &&
  (window.location.hostname === 'voidradio.me' ||
   window.location.hostname === 'void-cyz.pages.dev' ||
   window.location.hostname.endsWith('.pages.dev'));

// ─── Extension detection ──────────────────────────────────────────────────────
// inject.js (loaded by the Chrome extension content script) sets this flag.
// When the extension is active it rewrites Origin/Referer on Tidal CDN requests
// so the browser can play streams directly. Without it we route through the
// server-side /proxy-audio Cloudflare Pages Function instead.
function hasExtension(): boolean {
  return typeof window !== 'undefined' && !!(window as any).__tidalOriginExtension;
}

/**
 * Wrap a Tidal CDN audio URL through the /proxy-audio server-side proxy.
 *
 * Only applied when ALL of:
 *  - Running in a browser (not native Android via Capacitor)
 *  - The extension is NOT installed
 *  - Not on localhost (localhost uses the Vite dev-server audio-proxy middleware)
 *  - The URL is a recognised Tidal CDN URL (avoids double-wrapping blob: URLs)
 */
// The confirmed-working Cloudflare Pages proxy endpoint.
// Using an absolute URL so it works from ANY domain (voidradio.me, void-cyz.pages.dev, etc.)
// even if the custom domain has routing issues (e.g. a Worker Route intercepting traffic).
const PROXY_BASE = 'https://void-cyz.pages.dev';

function wrapWithAudioProxy(url: string): string {
  if (!url) return url;
  // Don't wrap: native Android, extension present, localhost, blob/capacitor URLs
  if (Capacitor.isNativePlatform()) return url;
  if (hasExtension()) return url;
  if (IS_DEV_LOCALHOST) return url;
  if (url.startsWith('blob:') || url.startsWith('capacitor:') || url.includes('_capacitor_file_')) return url;
  // Only proxy Tidal CDN URLs — leave everything else untouched
  if (!url.includes('tidal.com')) return url;
  // Avoid double-wrapping
  if (url.includes('/proxy-audio?url=')) return url;
  return `${PROXY_BASE}/proxy-audio?url=${encodeURIComponent(url)}`;
}

async function fetchWithRetry(relativePath: string, timeout = 7_000): Promise<Response> {
  // In local dev, bypass the instance list and go through the Vite proxy
  if (IS_DEV_LOCALHOST) {
    const proxyUrl = `/monochrome-api${relativePath}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  }

  // On production web: route through Cloudflare Pages Functions.
  // If the user has logged in with their Tidal account, /proxy-tidal handles
  // track streaming via the official Tidal API (bypasses Monochrome instances).
  // Everything else (search, albums, etc.) uses /proxy-api (Monochrome).
  if (IS_PRODUCTION_WEB) {
    const isTrackPath = relativePath.startsWith('/track/');

    if (isTrackPath) {
      const { getValidAccessToken } = await import('./tidalAuth');
      const accessToken = await getValidAccessToken();
      if (accessToken) {
        const proxyUrl = `${PROXY_BASE}/proxy-tidal?path=${encodeURIComponent(relativePath)}`;
        const ctrl  = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeout);
        try {
          const res = await fetch(proxyUrl, { signal: ctrl.signal, headers: { Authorization: `Bearer ${accessToken}` } });
          clearTimeout(timer);
          if (res.ok) return res;
          // Any failure (401, 404, etc.) → fall through to Monochrome below
          console.warn(`[Tidal] proxy-tidal ${res.status}, falling back to Monochrome`);
        } catch (err) {
          clearTimeout(timer);
          console.warn('[Tidal] proxy-tidal error, falling back to Monochrome:', (err as Error).message);
        }
      }
    }


    // Non-track paths (search, albums) OR token missing/rejected → Monochrome
    const proxyUrl = `${PROXY_BASE}/proxy-api?path=${encodeURIComponent(relativePath)}`;
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(proxyUrl, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`proxy-api HTTP ${res.status}`);
      return res;
    } catch (err) {
      clearTimeout(timer);
      throw new Error(`proxy-api failed: ${(err as Error).message}`);
    }
  }

  // Native Android / other: hit instances directly (no CORS restriction on native)
  const maxAttempts = 3;
  let lastErr: Error = new Error('All API instances failed');

  // hifi-api relies on monochrome for search 
  const system = getApiSystem();
  let allowedInstances = INSTANCES;
  
  if (system === 'hifi' && (relativePath.startsWith('/search/') || relativePath.startsWith('/lyrics/'))) {
      allowedInstances = uniqueStrings(MONOCHROME_LIVE_INSTANCES.concat(getCustomInstances()));
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Pick up to 5 random instances to race (avoids DDoSing instances and rate limits)
    // Racing requests guarantees the fastest server wins the race, speeding up loading massively.
    const sample = [...allowedInstances].sort(() => 0.5 - Math.random()).slice(0, 5);
    const controllers = sample.map(() => new AbortController());
    
    try {
      const res = await new Promise<Response>((resolve, reject) => {
        let failedCount = 0;
        
        sample.forEach((instance, idx) => {
          const controller = controllers[idx];
          const timer = setTimeout(() => controller.abort(), timeout);
          const url = `${instance}${relativePath}`;
          
          fetch(url, { signal: controller.signal })
            .then(res => {
              clearTimeout(timer);
              if (res.ok) {
                // Success! Abort all other requests to save bandwidth and connection limits
                controllers.forEach((c, j) => { if (idx !== j) c.abort(); });
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
      lastErr = e as Error;
      // Wait slightly before trying another batch
      await delay(200);
    }
  }
  throw lastErr;
}

function delay(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetchWithRetry(path);
  return res.json() as Promise<T>;
}

// ─── Image URL helpers (from Monochrome getCoverUrl / getArtistPictureUrl) ──

export function getCoverUrl(id: string | null | undefined, size: string | number = '320'): string {
  if (!id) return `https://picsum.photos/seed/${Math.random()}/${size}`;
  if (typeof id === 'string' && (id.startsWith('http') || id.startsWith('blob:') || id.startsWith('assets/'))) {
    return id;
  }
  const formatted = String(id).replace(/-/g, '/');
  const numSize = parseInt(String(size), 10);
  let safeSize = 320;
  if (numSize <= 80) safeSize = 80;
  else if (numSize <= 160) safeSize = 160;
  else if (numSize <= 320) safeSize = 320;
  else if (numSize <= 640) safeSize = 640;
  else if (numSize <= 1080) safeSize = 1080;
  else safeSize = 1280;
  return `https://resources.tidal.com/images/${formatted}/${safeSize}x${safeSize}.jpg`;
}

export function getArtistPictureUrl(id: string | null | undefined, size: string | number = '320'): string {
  if (!id) return `https://picsum.photos/seed/${Math.random()}/${size}`;
  if (typeof id === 'string' && (id.startsWith('http') || id.startsWith('blob:') || id.startsWith('assets/'))) return id;
  const numSize = parseInt(String(size), 10);
  const safeSize = numSize > 320 ? 750 : 320;
  const formatted = String(id).replace(/-/g, '/');
  return `https://resources.tidal.com/images/${formatted}/${safeSize}x${safeSize}.jpg`;
}

// ─── Data normalizers ────────────────────────────────────────────────────────

function normalizeArtist(a: Record<string, unknown>): TidalArtist {
  return {
    id: (a.id as number) ?? 0,
    name: (a.name as string) ?? 'Unknown Artist',
    picture: (a.picture as string | null) ?? null,
    handle: (a.handle as string | null) ?? null,
    type: (a.type as string) ?? 'MAIN',
    popularity: (a.popularity as number) ?? 0,
    mixes: (a.mixes as TidalArtist['mixes']) ?? {},
  };
}

function normalizeAlbum(al: Record<string, unknown>): TidalAlbum {
  return {
    id: (al.id as number) ?? 0,
    title: (al.title as string) ?? 'Unknown Album',
    cover: (al.cover as string | null) ?? null,
    vibrantColor: (al.vibrantColor as string | null) ?? null,
    releaseDate: (al.releaseDate as string) ?? undefined,
    numberOfTracks: (al.numberOfTracks as number) ?? undefined,
    artists: ((al.artists as unknown[]) ?? []).map(a => normalizeArtist(a as Record<string, unknown>)),
  };
}

function normalizeTrack(t: Record<string, unknown>): TidalTrack {
  // Monochrome prepareTrack: if no artist, pick first from artists[]
  let raw = t;
  if (!raw.artist && Array.isArray(raw.artists) && (raw.artists as unknown[]).length > 0) {
    raw = { ...raw, artist: (raw.artists as unknown[])[0] };
  }
  const rawArtist = (raw.artist as Record<string, unknown>) ?? {};
  const rawAlbum  = (raw.album  as Record<string, unknown>) ?? {};
  const rawArtists = ((raw.artists as unknown[]) ?? [])
    .map(a => normalizeArtist(a as Record<string, unknown>));

  return {
    id: (raw.id as number) ?? 0,
    title: (raw.title as string) ?? 'Unknown',
    duration: (raw.duration as number) ?? 0,
    artist: normalizeArtist(rawArtist),
    artists: rawArtists.length ? rawArtists : [normalizeArtist(rawArtist)],
    album: normalizeAlbum(rawAlbum),
    trackNumber: (raw.trackNumber as number) ?? undefined,
    volumeNumber: (raw.volumeNumber as number) ?? 1,
    popularity: (raw.popularity as number) ?? 0,
    explicit: (raw.explicit as boolean) ?? false,
    audioQuality: (raw.audioQuality as string) ?? 'LOSSLESS',
    allowStreaming: (raw.allowStreaming as boolean) ?? true,
    isrc: (raw.isrc as string) ?? undefined,
    country: (raw.country as string) ?? (raw.isrc ? (raw.isrc as string).substring(0, 2) : undefined),
    language: (raw.language as string) ?? (raw.audioLanguage as string) ?? undefined,
    mixes: (raw.mixes as TidalTrack['mixes']) ?? {},
  };
}

function normalizePlaylist(p: Record<string, unknown>): TidalPlaylist {
  return {
    uuid: (p.uuid as string) ?? '',
    title: (p.title as string) ?? 'Playlist',
    numberOfTracks: (p.numberOfTracks as number) ?? 0,
    description: (p.description as string) ?? '',
    image: (p.image as string | null) ?? null,
    squareImage: (p.squareImage as string | null) ?? null,
    type: (p.type as string) ?? 'USER',
  };
}

// ─── Search response normalization (Monochrome findSearchSection) ─────────────

/**
 * Recursively search the response tree for the sub-object that owns an
 * `items` array — exactly as Monochrome's findSearchSection() does.
 */
function findSearchSection(
  source: unknown,
  key: string,
  visited: Set<object>,
): { items: unknown[] } | undefined {
  if (!source || typeof source !== 'object') return undefined;
  if (visited.has(source as object)) return undefined;
  visited.add(source as object);

  if (Array.isArray(source)) {
    for (const e of source) {
      const f = findSearchSection(e, key, visited);
      if (f) return f;
    }
    return undefined;
  }

  const s = source as Record<string, unknown>;

  // Monochrome: if the object itself already has an `items` array → this is it
  if ('items' in s && Array.isArray(s.items)) {
    return s as { items: unknown[] };
  }

  // Prefer the keyed property first
  if (key in s) {
    const f = findSearchSection(s[key], key, visited);
    if (f) return f;
  }

  for (const v of Object.values(s)) {
    const f = findSearchSection(v, key, visited);
    if (f) return f;
  }
  return undefined;
}

function normalizeSearchResponse(data: unknown, key: string): { items: unknown[] } {
  const section = findSearchSection(data, key, new Set());
  return { items: section?.items ?? [] };
}

// ─── Stream URL extraction (Monochrome extractStreamUrlFromManifest) ─────────

const PRIORITY_KEYWORDS = ['flac', 'lossless', 'hi-res', 'high'];

function sortUrlsByQuality(urls: string[]): string[] {
  return [...urls].sort((a, b) => {
    const aL = a.toLowerCase();
    const bL = b.toLowerCase();
    const aScore = PRIORITY_KEYWORDS.findIndex(k => aL.includes(k));
    const bScore = PRIORITY_KEYWORDS.findIndex(k => bL.includes(k));
    return (aScore === -1 ? 999 : aScore) - (bScore === -1 ? 999 : bScore);
  });
}

function parseFlacUrlFromMpd(manifestText: string): string | null {
  const trimmed = manifestText.trim();
  if (!trimmed) return null;

  const isValidMediaUrl = (url: string): boolean => {
    if (!url) return false;
    const normalized = url.toLowerCase();
    if (normalized.includes('w3.org')) return false;
    if (normalized.includes('xmlschema')) return false;
    if (normalized.includes('xmlns')) return false;
    if (
      normalized.includes('.flac') ||
      normalized.includes('.mp4') ||
      normalized.includes('.m4a') ||
      normalized.includes('.aac') ||
      normalized.includes('token=') ||
      normalized.includes('/audio/')
    ) return true;
    if (/\/[^/]+\.[a-z0-9]{2,5}(\?|$)/i.test(url)) return true;
    return false;
  };

  const scoreUrl = (url: string | undefined | null): number => {
    if (!url) return -1;
    const normalized = url.toLowerCase();
    let score = 0;
    if (normalized.includes('flac')) score += 3;
    if (normalized.includes('hires')) score += 1;
    if (normalized.endsWith('.flac')) score += 4;
    if (normalized.includes('token=')) score += 1;
    return score;
  };

  const pickBest = (urls: Array<string | undefined | null>): string | null => {
    const candidates = urls
      .map((u) => (typeof u === 'string' ? u.trim() : ''))
      .filter((u) => u.length > 0 && isValidMediaUrl(u));
    if (candidates.length === 0) return null;
    return candidates.sort((a, b) => scoreUrl(b) - scoreUrl(a))[0] ?? null;
  };

  if (typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(trimmed, 'application/xml');
      const baseUrls = Array.from(doc.getElementsByTagName('BaseURL')).map(
        (n) => n.textContent?.trim() ?? ''
      );
      if (baseUrls.length > 0) {
        const best = pickBest(baseUrls);
        if (best) return best;
      }

      const reps = Array.from(doc.getElementsByTagName('Representation'));
      for (const rep of reps) {
        const codecs = rep.getAttribute('codecs')?.toLowerCase() ?? '';
        const base = Array.from(rep.getElementsByTagName('BaseURL')).map(
          (n) => n.textContent?.trim() ?? ''
        );
        if (base.length > 0 && codecs.includes('flac')) {
          const best = pickBest(base);
          if (best) return best;
        }
      }
    } catch {}
  }

  // Fallback regex
  const urlRegex = /https?:\/\/[\w\-.~:?#[\]@!$&'()*+,;=%/]+/g;
  let match: RegExpExecArray | null;
  const urls: string[] = [];
  while ((match = urlRegex.exec(trimmed)) !== null) {
    const url = match[0];
    if (url.includes('$Number$')) continue;
    if (/\/\d+\.mp4/.test(url)) continue;
    if (isValidMediaUrl(url)) urls.push(url);
  }
  return pickBest(urls);
}

function extractStreamUrlFromManifest(manifest: unknown): string | null {
  if (!manifest) return null;

  try {
    if (typeof manifest === 'string') {
      let decoded: string;
      try { decoded = atob(manifest); } catch { decoded = manifest; }

      try {
        const parsed = JSON.parse(decoded) as Record<string, unknown>;
        if (parsed?.urls && Array.isArray(parsed.urls)) {
          return sortUrlsByQuality(parsed.urls as string[])[0] ?? null;
        }
      } catch {
        // Fallback or DASH handling
        if (decoded.includes('<MPD')) {
          return parseFlacUrlFromMpd(decoded);
        }
        
        const match = decoded.match(/https?:\/\/[\w\-.~:?#[\]@!$&'()*+,;=%/]+/);
        return match ? match[0] : null;
      }
    }

    if (typeof manifest === 'object') {
      const m = manifest as Record<string, unknown>;
      if (Array.isArray(m.urls)) {
        return sortUrlsByQuality(m.urls as string[])[0] ?? null;
      }
    }
  } catch (err) {
    console.error('Failed to decode manifest:', err);
  }

  return null;
}

// ─── Track stream parsing (Monochrome normalizeTrackResponse + parseTrackLookup)

/**
 * Monochrome normalizeTrackResponse:
 *   const raw = apiResponse.data ?? apiResponse
 *   return [{duration: raw.duration, id: raw.trackId}, raw]
 */
function normalizeTrackResponse(json: unknown): unknown[] {
  const r = json as Record<string, unknown>;
  const raw = (r?.data ?? r) as Record<string, unknown>;
  return [{ duration: raw?.duration ?? 0, id: raw?.trackId ?? null }, raw];
}

interface TrackLookup {
  track: Record<string, unknown>;
  info: Record<string, unknown>;
  originalTrackUrl: string | null;
}

/**
 * Monochrome parseTrackLookup:
 *   entry with `duration`        → track
 *   entry with `manifest`        → info
 *   entry with `OriginalTrackUrl`→ direct URL
 */
function parseTrackLookup(data: unknown[]): TrackLookup {
  let track: Record<string, unknown> | undefined;
  let info: Record<string, unknown> | undefined;
  let originalTrackUrl: string | null = null;

  for (const entry of data) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    if (!track && 'duration' in e) { track = e; continue; }
    if (!info && 'manifest' in e) { info = e; continue; }
    if (!originalTrackUrl && 'OriginalTrackUrl' in e && typeof e.OriginalTrackUrl === 'string') {
      originalTrackUrl = e.OriginalTrackUrl;
    }
  }

  if (!track || !info) throw new Error('Malformed track response');
  return { track, info, originalTrackUrl };
}

// ─── DASH manifest → blob URL (Monochrome extractStreamUrlFromManifest MPD branch) ─

/**
 * When the manifest is a raw DASH/MPD XML string, try to extract a
 * direct FLAC/audio URL from the BaseURL elements.
 *
 * We intentionally do NOT fall back to a blob:application/dash+xml URL:
 * browsers cannot natively play DASH via the <audio> element, so that blob
 * would always fail — blocking the quality fallback chain (HI_RES → LOSSLESS)
 * because the URL was non-null. Returning null lets getTrackStreamUrl fall
 * back to LOSSLESS correctly.
 */
async function processDashManifest(manifestText: string): Promise<string | null> {
  return parseFlacUrlFromMpd(manifestText);
}

// ─── Stream URL (Monochrome getStreamUrl) ─────────────────────────────────────

const _streamCache = new Map<string, string>();



export async function deleteOfflineAudioCache(trackId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const fileName = `void-track-${trackId}.flac`;
  try {
    await Filesystem.deleteFile({
      directory: Directory.Cache,
      path: fileName
    });
  } catch (e) {
    // Ignore if not exists
  }
}

async function getOfflineAudioUrl(url: string, trackId: string, overrideCache = false): Promise<string> {
  if (!Capacitor.isNativePlatform()) {
    return wrapWithAudioProxy(url);
  }
  
  const fileName = `void-track-${trackId}.flac`;
  // Minimum viable size for a real audio file (500 KB).
  // DASH manifests / empty downloads are only a few KB so this catches them.
  const MIN_VALID_BYTES = 500_000;

  try {
    if (!overrideCache) {
      const stat = await Filesystem.stat({
        directory: Directory.Cache,
        path: fileName
      });
      
      if (stat.size >= MIN_VALID_BYTES) {
        // Looks like a real audio file — use the cache
        const { uri } = await Filesystem.getUri({
          directory: Directory.Cache,
          path: fileName
        });
        return Capacitor.convertFileSrc(uri);
      } else if (stat.size > 0) {
        // Too small — corrupted/manifest saved as .flac, delete and re-download
        console.warn(`[Cache] Deleting undersized cache file (${stat.size} bytes): ${fileName}`);
        await Filesystem.deleteFile({ directory: Directory.Cache, path: fileName }).catch(() => {});
      }
    } else {
      await Filesystem.deleteFile({ directory: Directory.Cache, path: fileName }).catch(() => {});
    }
  } catch (e) {
    // File doesn't exist yet — proceed to download
  }
  
  // Non-blocking background caching download
  Filesystem.getUri({
    directory: Directory.Cache,
    path: fileName
  }).then(({ uri }) => {
    FileTransfer.downloadFile({
      url,
      path: uri
    }).catch(err => console.error('Audio offline filesystem streaming cache failed:', err));
  }).catch(() => {});
  
  // Immediately return the streaming URL so the song plays instantly without waiting for download
  return url;
}

function pruneStreamCache() {
  if (_streamCache.size > 50) {
    const entries = Array.from(_streamCache.entries());
    entries.slice(0, entries.length - 50).forEach(([k]) => _streamCache.delete(k));
  }
}

// Exported type used by usePlayer.ts
export interface StreamInfoResult {
  url: string;
  streamInfo?: { audioQuality?: string; codec?: string; sampleRate?: number; bitDepth?: number; };
}

export async function getTrackStreamInfo(trackOrId: TidalTrack | number | string, quality = 'HIGH', overrideCache = false): Promise<StreamInfoResult> {
  const url = await getTrackStreamUrl(trackOrId, quality, overrideCache);
  
  // Return basic stream info since YT Music stream details are handled by the backend
  return { 
    url, 
    streamInfo: {
      audioQuality: 'HIGH',
      codec: 'mp4a',
      sampleRate: 44100,
      bitDepth: 16
    }
  };
}

export async function getTrackStreamUrl(trackOrId: TidalTrack | number | string, quality = 'HIGH', overrideCache = false): Promise<string> {
  const id = typeof trackOrId === 'object' ? trackOrId.id : trackOrId;
  const cacheKey = `yt_stream_${id}`;
  if (!overrideCache && _streamCache.has(cacheKey)) return _streamCache.get(cacheKey)!;

  try {
    // In the new YouTube IFrame API implementation, the audio player 
    // extracts the video ID directly from the URL. We return `yt:${id}` 
    // to flag it for the adapter instead of proxying through the backend.
    let streamUrl = `yt:${id}`;
    
    _streamCache.set(cacheKey, streamUrl);
    return streamUrl;

  } catch (error) {
    console.error('[YT-Stream] Error resolving track:', error);
    throw error;
  }
}

// ─── Track metadata (/info/?id=) ──────────────────────────────────────────────

export async function getTrackMetadata(id: number): Promise<TidalTrack> {
  const cacheKey = `meta_${id}`;
  const cached = cacheGet<TidalTrack>(cacheKey);
  if (cached) return cached;

  const json = await apiGet<unknown>(`/info/?id=${id}`);
  const data = ((json as Record<string, unknown>)?.data ?? json) as unknown;
  const items = Array.isArray(data) ? data as Record<string, unknown>[] : [data as Record<string, unknown>];
  const found = items.find(i => (i as Record<string, unknown>).id == id || ((i as Record<string, unknown>).item && ((i as Record<string, unknown>).item as Record<string, unknown>).id == id));

  if (!found) throw new Error(`Track metadata not found for ID ${id}`);
  const track = normalizeTrack(
    ((found as Record<string, unknown>).item as Record<string, unknown> | undefined) ?? found,
  );
  cacheSet(cacheKey, track, 5 * 60_000);
  return track;
}

// ─── Search (YouTube Music) ───────────────────────────────────────────────────

function extractText(obj: any): string {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  if (obj.text) return obj.text;
  if (obj.name) return obj.name;
  if (obj.title) return extractText(obj.title); // Handle nested title objects
  if (Array.isArray(obj.runs) && obj.runs[0]?.text) return obj.runs[0].text;
  return String(obj);
}

function extractThumb(ytSong: any): string {
  let url = '';
  
  if (Array.isArray(ytSong.thumbnail) && ytSong.thumbnail.length > 0) {
    url = ytSong.thumbnail[0]?.url || '';
  } else if (Array.isArray(ytSong.thumbnail?.contents) && ytSong.thumbnail.contents.length > 0) {
    url = ytSong.thumbnail.contents[0]?.url || '';
  } else if (Array.isArray(ytSong.thumbnails) && ytSong.thumbnails.length > 0) {
    url = ytSong.thumbnails[0]?.url || '';
  }

  if (url && url.includes('=w')) {
    // Upgrade Google image URLs to 544x544 resolution (maximum safe size, 1200 causes HTTP 429)
    url = url.replace(/=w\d+-h\d+.*$/, '=w544-h544-l90-rj');
  }
  return url;
}

function mapYTMusicToTidal(ytSong: any): TidalTrack {
  const artistsList = ytSong.artists && ytSong.artists.length > 0 ? ytSong.artists : ytSong.authors;
  const artist = artistsList?.[0] || { name: 'Unknown Artist', channel_id: 'unknown' };
  const thumbUrl = extractThumb(ytSong);
  
  return {
    id: ytSong.id || ytSong.videoId || ytSong.video_id || 'unknown',
    title: extractText(ytSong.title)
      .replace(/official\s+(m\/?v|video|audio)|music\s+video|lyric\s+(video|m\/?v)/gi, '')
      .replace(/\(\s*\)/g, '')
      .replace(/\s+/g, ' ')
      .trim(),
    duration: ytSong.duration?.seconds || 0,
    artist: {
      id: artist.channel_id || artist.id || 'unknown',
      name: extractText(artist.name || artist.title),
      picture: null
    },
    artists: (artistsList || []).map((a: any) => ({
      id: a.channel_id || a.id || 'unknown',
      name: extractText(a.name || a.title),
      picture: null
    })),
    album: {
      id: ytSong.album?.id || 'unknown',
      title: extractText(ytSong.album?.name || ytSong.album?.title) || '',
      cover: thumbUrl
    },
    audioQuality: 'HIGH'
  };
}

export async function searchTracks(query: string, _limit = 25, _offset = 0): Promise<TidalTrack[]> {
  const cacheKey = `search_tracks_${query}`;
  const cached = cacheGet<TidalTrack[]>(cacheKey);
  if (cached) return cached;

  try {
    const baseUrl = BACKEND_URL;
    const res = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Search failed');
    const data = await res.json();
    
    const items = (data.items || []).map(mapYTMusicToTidal);
    cacheSet(cacheKey, items, 3 * 60_000);
    return items;
  } catch (error) {
    console.error('[YT-Music] Search error:', error);
    return [];
  }
}

export async function searchArtists(query: string, _limit = 25): Promise<TidalArtist[]> {
  try {
    const baseUrl = BACKEND_URL;
    const res = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent(query)}&type=artist`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((ytArt: any) => ({
      id: ytArt.id || ytArt.channel_id || 'unknown',
      name: extractText(ytArt.name || ytArt.title),
      picture: extractThumb(ytArt) || null,
      type: 'ARTIST'
    }));
  } catch { return []; }
}

export async function searchAlbums(query: string, _limit = 25): Promise<TidalAlbum[]> {
  try {
    const baseUrl = BACKEND_URL;
    const res = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent(query)}&type=album`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((ytAlb: any) => ({
      id: ytAlb.id || ytAlb.browseId || 'unknown',
      title: extractText(ytAlb.title),
      cover: extractThumb(ytAlb) || null,
      artists: ytAlb.artists ? ytAlb.artists.map((a: any) => ({ id: a.channel_id || 'unknown', name: extractText(a.name), picture: null })) : []
    }));
  } catch { return []; }
}

export async function searchPlaylists(query: string, _limit = 25): Promise<TidalPlaylist[]> {
  try {
    const baseUrl = BACKEND_URL;
    const res = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent(query)}&type=playlist`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((ytPlay: any) => ({
      uuid: ytPlay.id || ytPlay.browseId || 'unknown',
      title: extractText(ytPlay.title),
      numberOfTracks: parseInt(String(ytPlay.song_count || ytPlay.trackCount || 0)) || 0,
      image: extractThumb(ytPlay) || null,
      squareImage: extractThumb(ytPlay) || null
    }));
  } catch { return []; }
}

export async function getSimilarArtists(id: number | string): Promise<TidalArtist[]> {
  try {
    const artist = await getArtist(id);
    if (!artist || !artist.name) return [];
    // Mock similar artists by searching for the artist's name or a generic "mix"
    // YT Music search with type=artist gives decent related results if we append "similar" or just use the name
    return await searchArtists(`${artist.name} related`, 10);
  } catch {
    return [];
  }
}

export async function getTrackRecommendations(id: number | string): Promise<TidalTrack[]> {
  const cacheKey = `recommendations_${id}`;
  const cached = cacheGet<TidalTrack[]>(cacheKey);
  if (cached) return cached;

  try {
    const baseUrl = BACKEND_URL;
    const res = await fetch(`${baseUrl}/api/queue?videoId=${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('Queue fetch failed');
    const data = await res.json();
    
    // The items returned from youtube.music.getUpNext are songs
    const tracks = (data.items || []).map(mapYTMusicToTidal);
    cacheSet(cacheKey, tracks, 5 * 60_000);
    return tracks;
  } catch (error) {
    console.error('[YT-Music] Queue error:', error);
    return [];
  }
}

export async function getMixTracks(mixId: string): Promise<TidalTrack[]> {
  // YT Music "Up Next" works identical to a track-mix.
  return getTrackRecommendations(mixId);
}

// ─── Artist ───────────────────────────────────────────────────────────────────

/**
 * Monochrome fetches TWO endpoints in parallel:
 *   /artist/?id=              → primary artist metadata
 *   /artist/?f=&skip_tracks=true → albums + tracks content
 */
export async function getArtist(
  id: number | string,
): Promise<TidalArtist & { albums?: TidalAlbum[]; tracks?: TidalTrack[]; playlists?: TidalPlaylist[]; similar?: TidalArtist[] }> {
  const cacheKey = `artist_${id}`;
  const cached = cacheGet<any>(cacheKey);
  if (cached) return cached;

  try {
    const baseUrl = BACKEND_URL;
    const res = await fetch(`${baseUrl}/api/artist?id=${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('Failed to fetch artist');
    const ytArtist = await res.json();

    const artistName = ytArtist.header?.title?.text || extractText(ytArtist.header?.title) || 'Unknown Artist';
    const artistPicture = extractThumb(ytArtist.header) || null;

    const artist: TidalArtist = {
      id: String(id),
      name: artistName,
      picture: artistPicture,
      type: 'ARTIST'
    };

    let albums: TidalAlbum[] = [];
    let tracks: TidalTrack[] = [];
    let playlists: TidalPlaylist[] = [];
    let similar: TidalArtist[] = [];

    (ytArtist.sections || []).forEach((section: any) => {
      if (!section || !section.contents) return;
      
      const rawTitle = section.header?.title?.text || section.title?.text || extractText(section.header?.title) || extractText(section.title) || '';
      const title = rawTitle.toLowerCase();
      
      if (title.includes('song')) {
        tracks = section.contents.map(mapYTMusicToTidal);
      } else if (title.includes('album') || title.includes('single') || title.includes('ep')) {
        const mappedAlbums = section.contents.map((ytAlb: any) => ({
          id: ytAlb.id || ytAlb.browseId || 'unknown',
          title: extractText(ytAlb.title),
          cover: extractThumb(ytAlb) || null,
          artists: [artist]
        }));
        albums = [...albums, ...mappedAlbums];
      } else if (title.includes('playlist') || title.includes('featured')) {
        const mappedPlaylists = section.contents.map((ytPlay: any) => ({
          uuid: ytPlay.id || ytPlay.browseId || 'unknown',
          title: extractText(ytPlay.title),
          numberOfTracks: parseInt(String(ytPlay.song_count || ytPlay.trackCount || 0)) || 0,
          image: extractThumb(ytPlay) || null,
          squareImage: extractThumb(ytPlay) || null
        }));
        playlists = [...playlists, ...mappedPlaylists];
      } else if (title.includes('fans might also like') || title.includes('similar')) {
        const mappedSimilar = section.contents.map((ytArt: any) => ({
          id: ytArt.id || ytArt.browseId || 'unknown',
          name: extractText(ytArt.title || ytArt.name),
          picture: extractThumb(ytArt) || null,
          type: 'ARTIST'
        }));
        similar = [...similar, ...mappedSimilar];
      }
    });

    const result = { ...artist, albums, tracks, playlists, similar };
    cacheSet(cacheKey, result, 5 * 60_000);
    return result;
  } catch (error) {
    console.error('[YT-Music] Artist error:', error);
    return { id: String(id), name: 'Unknown', picture: null, type: 'ARTIST', albums: [], tracks: [], playlists: [], similar: [] };
  }
}

export async function getArtistTopTracks(id: number | string): Promise<TidalTrack[]> {
  const artist = await getArtist(id);
  return artist.tracks ?? [];
}



// ─── Album ────────────────────────────────────────────────────────────────────

export async function getAlbum(id: number | string): Promise<{ album: TidalAlbum; tracks: TidalTrack[] }> {
  const cacheKey = `album_${id}`;
  const cached = cacheGet<{ album: TidalAlbum; tracks: TidalTrack[] }>(cacheKey);
  if (cached) return cached;

  try {
    const baseUrl = BACKEND_URL;
    const res = await fetch(`${baseUrl}/api/album?id=${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('Failed to fetch album');
    const ytAlb = await res.json();

    const thumbUrl = extractThumb(ytAlb.header) || extractThumb(ytAlb) || null;
    const albumTitle = ytAlb.header?.title?.text || extractText(ytAlb.header?.title) || extractText(ytAlb.title) || 'Unknown Album';

    const album: TidalAlbum = {
      id: ytAlb.id || id,
      title: albumTitle,
      cover: thumbUrl,
      artists: ytAlb.artists ? ytAlb.artists.map((a: any) => ({ id: a.channel_id || 'unknown', name: extractText(a.name), picture: null })) : []
    };

    const tracks = (ytAlb.contents || []).map((ytSong: any) => {
      // YT Album contents sometimes lack album info, inject it
      ytSong.album = { id: album.id, name: album.title };
      ytSong.thumbnails = ytAlb.thumbnails;
      return mapYTMusicToTidal(ytSong);
    });

    const result = { album, tracks };
    cacheSet(cacheKey, result, 5 * 60_000);
    return result;
  } catch {
    return { album: { id, title: 'Unknown Album', cover: null }, tracks: [] };
  }
}

// ─── Playlist ─────────────────────────────────────────────────────────────────

export async function getPlaylist(uuid: string): Promise<{ playlist: TidalPlaylist; tracks: TidalTrack[] }> {
  const cacheKey = `playlist_${uuid}`;
  const cached = cacheGet<{ playlist: TidalPlaylist; tracks: TidalTrack[] }>(cacheKey);
  if (cached) return cached;

  try {
    const baseUrl = BACKEND_URL;
    const res = await fetch(`${baseUrl}/api/playlist?id=${encodeURIComponent(uuid)}`);
    if (!res.ok) throw new Error('Failed to fetch playlist');
    const ytPlay = await res.json();

    const thumbUrl = extractThumb(ytPlay.header) || extractThumb(ytPlay) || null;
    const playlistTitle = ytPlay.header?.title?.text || extractText(ytPlay.header?.title) || extractText(ytPlay.title) || 'Unknown Playlist';
    
    // YouTube Music playlist track count is sometimes buried in header subtitles
    let trackCountStr = String(ytPlay.song_count || ytPlay.trackCount || 0);
    if (trackCountStr === '0' && ytPlay.header?.second_subtitle?.runs) {
      const run = ytPlay.header.second_subtitle.runs.find((r: any) => r.text && r.text.includes('song'));
      if (run) trackCountStr = run.text.replace(/[^0-9]/g, '');
    }

    const playlist: TidalPlaylist = {
      uuid: ytPlay.id || uuid,
      title: playlistTitle,
      numberOfTracks: parseInt(trackCountStr) || 0,
      image: thumbUrl,
      squareImage: thumbUrl,
    };

    const tracks = (ytPlay.items || ytPlay.contents || []).map(mapYTMusicToTidal);

    const result = { playlist, tracks };
    cacheSet(cacheKey, result, 5 * 60_000);
    return result;
  } catch {
    return { playlist: { uuid, title: 'Unknown Playlist', numberOfTracks: 0 }, tracks: [] };
  }
}

// ─── Lyrics ───────────────────────────────────────────────────────────────────

export async function getTidalLyrics(
  id: number,
): Promise<{ lyrics: string; subtitles: string | null } | null> {
  const cacheKey = `lyrics_${id}`;
  const cached = cacheGet<{ lyrics: string; subtitles: string | null } | null>(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const data = await apiGet<{
      data?: { lyrics?: string; subtitles?: string | null };
      lyrics?: string;
      subtitles?: string | null;
    }>(`/lyrics/?id=${id}`);

    const inner = data?.data ?? data;
    if (!inner?.lyrics) { cacheSet(cacheKey, null, 60_000); return null; }

    const result = { lyrics: inner.lyrics, subtitles: inner.subtitles ?? null };
    cacheSet(cacheKey, result, 10 * 60_000);
    return result;
  } catch {
    cacheSet(cacheKey, null, 60_000);
    return null;
  }
}

// ─── Local playback history ───────────────────────────────────────────────────
const HISTORY_KEY = 'tidal_play_history_v1';
const HISTORY_MAX = 50;

export function addToHistory(track: TidalTrack): void {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const history: TidalTrack[] = raw ? JSON.parse(raw) : [];
    const filtered = history.filter(t => t.id !== track.id);
    filtered.unshift(track);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered.slice(0, HISTORY_MAX)));
  } catch { /* storage full or SSR */ }
}

export function getHistory(limit = 20): TidalTrack[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TidalTrack[];
    return parsed.map(t => {
      if (!t || !t.id || t.id === 'unknown' || t.id === 'undefined') return null;
      t.title = extractText(t.title);
      if (t.artist) t.artist.name = extractText(t.artist.name);
      if (t.artists) t.artists.forEach(a => a.name = extractText(a.name));
      if (t.album) t.album.title = extractText(t.album.title);
      return t;
    }).filter(Boolean) as TidalTrack[];
  } catch { return []; }
}

// ─── Favorites (localStorage) ─────────────────────────────────────────────────
const FAVORITES_KEY = 'tidal_favorites_v1';

export function addFavorite(track: TidalTrack): void {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    const favs: TidalTrack[] = raw ? JSON.parse(raw) : [];
    if (!favs.find(t => t.id === track.id)) {
      favs.unshift(track);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
    }
  } catch {}
}

export function removeFavorite(id: number | string): void {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    const favs: TidalTrack[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs.filter(t => t.id !== id)));
  } catch {}
}

export function getFavorites(): TidalTrack[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TidalTrack[];
    return parsed.map(t => {
      if (!t || !t.id || t.id === 'unknown' || t.id === 'undefined') return null;
      t.title = extractText(t.title);
      if (t.artist) t.artist.name = extractText(t.artist.name);
      if (t.artists) t.artists.forEach(a => a.name = extractText(a.name));
      if (t.album) t.album.title = extractText(t.album.title);
      return t;
    }).filter(Boolean) as TidalTrack[];
  } catch { return []; }
}

export function isFavorite(id: number | string): boolean {
  return getFavorites().some(t => t.id === id);
}



// ─── Recommended tracks for playlist (Monochrome getRecommendedTracksForPlaylist) ─
/**
 * Direct port of Monochrome's `getRecommendedTracksForPlaylist` from js/api.js.
 *
 * 1. Build an artist map from the seed tracks.
 * 2. If < 3 artists found, search for each track title to fetch full metadata.
 * 3. For up to 15 artists (shuffled), call getArtist(id, lightweight).
 * 4. Return up to `limit` shuffled tracks, preferring tracks not in `knownTrackIds`.
 */


/**
 * Genre-first recommendation algorithm:
 * - Detects genre from seed tracks (Korean chars → kpop, etc.)
 * - Discovers via curated genre artist pools (NOT keyword searches like "IVE kpop")
 * - Validates same-artist results with exact artist name matching (prevents "IVE" → "Bon Iver")
 * - Artist spacing (no repeats within 8 tracks)
 */
export async function getRecommendedTracksForPlaylist(
  tracks: TidalTrack[],
  limit = 20,
  options: { knownTrackIds?: Set<string | number>; refresh?: boolean; existingQueue?: TidalTrack[] } = {},
): Promise<TidalTrack[]> {
  const seedIds = new Set(tracks.map(t => t.id));
  const seenIds = new Set<string | number>(seedIds);

  // Track recent artists for spacing
  const recentArtists: string[] = [];
  if (options.existingQueue) {
    options.existingQueue.slice(-8).forEach(t => {
      const a = t.artists?.[0]?.name ?? t.artist?.name;
      if (a) recentArtists.push(a.toLowerCase());
    });
  }

  // ── 1. Extract Seed IDs and Artists ─────────────────────────────────────
  const seedTracks = tracks.slice(0, 5);
  const seedTrackIds = seedTracks.map(t => t.id);
  const artistIds = [...new Set(seedTracks.flatMap(t => {
    const ids = [];
    if (t.artist?.id) ids.push(t.artist.id);
    if (t.artists) t.artists.forEach(a => { if (a.id) ids.push(a.id); });
    return ids;
  }))].slice(0, 3); // top 3 seed artists

  if (seedTrackIds.length === 0) return [];

  // ── 2. Fetch Similar Artists ──────────────────────────────────────────────
  const similarArtistsResults = await Promise.all(
    artistIds.map(id => getSimilarArtists(id).catch(() => []))
  );
  // Pick top 5 similar artists
  const similarArtistIds = [...new Set(similarArtistsResults.flat().map(a => a.id))].filter(id => Boolean(id)).slice(0, 5);

  // ── 3. Parallel Fetches: Mood/Genre, Similar Tracks, Exact Catalog ─────────
  const [moodResults, similarTrackResults, exactArtistResults] = await Promise.all([
    // 1. Mood & Genre Primarily (Tidal's algorithmic track recommendations)
    Promise.all(seedTrackIds.map(id => getTrackRecommendations(id).catch(() => []))),
    
    // 2. Similar Artist Discovery Tracks
    Promise.all(similarArtistIds.map(id => getArtistTopTracks(id).catch(() => []))),
    
    // 3. Exact Same Artist Catalog
    Promise.all(artistIds.map(id => getArtistTopTracks(id).catch(() => [])))
  ]);

  // ── Compilation / karaoke filter ──────────────────────────────────────────
  const isJunk = (track: TidalTrack): boolean => {
    const t = track.title.toLowerCase();
    return (
      t.includes('karaoke') || t.includes('tribute') ||
      t.includes('cover version') || t.includes('instrumental') ||
      t.includes('compilation') || t.includes('best of') ||
      (t.includes('music') && t.includes('hits'))
    );
  };

  const canUse = (track: TidalTrack): boolean => {
    if (seenIds.has(track.id) || options.knownTrackIds?.has(track.id)) return false;
    if (isJunk(track)) return false;
    return true;
  };

  const moodPool = moodResults.flat().filter(canUse);
  const similarPool = similarTrackResults.flat().filter(canUse);
  const exactPool = exactArtistResults.flat().filter(canUse);

  // ── Selection with artist spacing ─────────────────────────────────────────
  const selected: TidalTrack[] = [];
  const artistSpacing = 8;
  const window = [...recentArtists];

  const mark = (name: string) => {
    window.push(name.toLowerCase());
    if (window.length > artistSpacing) window.shift();
  };

  const addFrom = (pool: TidalTrack[], maxCount: number, spacingOverrides: 'strict' | 'relaxed' | 'none' = 'strict') => {
    // Shuffle pool to ensure variety
    for (const track of [...pool].sort(() => Math.random() - 0.5)) {
      if (selected.length >= maxCount) break;
      const artist = track.artists?.[0]?.name ?? track.artist?.name;
      if (!artist) continue;

      let blocked = false;
      if (spacingOverrides !== 'none') {
        const checkWindow = spacingOverrides === 'relaxed' ? window.slice(-3) : window;
        blocked = checkWindow.includes(artist.toLowerCase());
      }
      
      if (blocked) continue;
      selected.push(track);
      seenIds.add(track.id);
      if (spacingOverrides !== 'none') mark(artist);
    }
  };

  // Distribution: ~60% mood/genre, ~25% similar artist, ~15% exact artist
  addFrom(moodPool, Math.ceil(limit * 0.60), 'strict');
  addFrom(similarPool, Math.ceil(limit * 0.85), 'strict');
  addFrom(exactPool, limit, 'strict');
  
  // Fallbacks: Relax constraints if we haven't reached the limit
  if (selected.length < limit) {
    const combinedPool = [...moodPool, ...similarPool, ...exactPool].filter(t => !seenIds.has(t.id));
    addFrom(combinedPool, limit, 'relaxed');
  }

  if (selected.length < limit) {
    const combinedPool = [...moodPool, ...similarPool, ...exactPool].filter(t => !seenIds.has(t.id));
    addFrom(combinedPool, limit, 'none');
  }

  return selected;
}

