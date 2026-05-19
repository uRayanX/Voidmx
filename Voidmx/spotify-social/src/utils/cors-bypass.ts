import { Capacitor } from '@capacitor/core';

const IS_DEV_LOCALHOST =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Absolute proxy base — must match PROXY_BASE in tidal.ts.
// Using absolute URL so it works from ANY domain (voidradio.me, void-cyz.pages.dev)
const PROXY_BASE = 'https://void-cyz.pages.dev';

/** Returns true for any Tidal CDN audio URL that needs proxying */
function isTidalAudioUrl(url: string): boolean {
  return url.includes('tidal.com') && !url.includes(PROXY_BASE);
}

export function initCorsBypass() {
  const originalFetch = window.fetch;

  const hasGM = typeof (window as any).GM_xmlhttpRequest !== 'undefined';
  const isNative = Capacitor.isNativePlatform();

  function extractRealUrl(src: string | null): string | null {
    if (!src || !src.includes('/proxy-audio?url=')) return null;
    try {
      const match = src.match(/url=([^&]+)/);
      return match ? decodeURIComponent(match[1]) : null;
    } catch (e) {
      return null;
    }
  }

  function gmFetch(url: string, options: any = {}): Promise<Response> {
    return new Promise((resolve, reject) => {
      (window as any).GM_xmlhttpRequest({
        method: options.method || 'GET',
        url: url,
        headers: options.headers || {},
        data: options.body || null,
        responseType: 'arraybuffer',
        timeout: 30000,
        onload: function (response: any) {
          const headers = new Headers();
          if (response.responseHeaders) {
            response.responseHeaders.split(/\r?\n/).forEach((line: string) => {
              const index = line.indexOf(':');
              if (index > 0) {
                try { headers.append(line.slice(0, index).trim(), line.slice(index + 1).trim()); } catch (e) {}
              }
            });
          }
          resolve(new Response(response.response || response.responseText, {
            status: response.status,
            statusText: response.statusText,
            headers
          }));
        },
        onerror: () => reject(new TypeError('Network request failed')),
        ontimeout: () => reject(new TypeError('Request timeout'))
      });
    });
  }

  window.fetch = async (...args) => {
    const resource = args[0];
    const urlStr = typeof resource === 'string' ? resource : ((resource as any)?.url || '');
    const origin = window.location.origin;

    const realUrl = extractRealUrl(urlStr);
    if (realUrl) {
      try {
        if (hasGM) return await gmFetch(realUrl, args[1]);
        if (isNative) return await originalFetch(realUrl, args[1]);
      } catch (e) {
        console.error('Proxy-audio bypass failed:', e);
      }
    }

    if (urlStr.startsWith('http') && !urlStr.startsWith(origin)) {
      try {
        if (hasGM) return await gmFetch(urlStr, args[1]);
      } catch (e) {
        console.error('CORS bypass failed:', e);
      }
    }

    return originalFetch(...args);
  };

  const originalSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');

  Object.defineProperty(HTMLMediaElement.prototype, 'src', {
    set(value: string) {
      // In dev or on Cloudflare Pages, route TIDAL CDN audio through the internal /proxy-audio function to avoid CORS blocks
      if (value && isTidalAudioUrl(value) && !value.includes('/proxy-audio')) {
        const hasExtension = !!(window as any).__tidalOriginExtension;
      if (IS_DEV_LOCALHOST || (!hasExtension && !hasGM && !isNative)) {
          // Use absolute URL so voidradio.me doesn't hit the Tomcat server
          const proxied = IS_DEV_LOCALHOST
            ? `/proxy-audio?url=${encodeURIComponent(value)}`
            : `${PROXY_BASE}/proxy-audio?url=${encodeURIComponent(value)}`;
          if (originalSrcDescriptor?.set) {
            originalSrcDescriptor.set.call(this, proxied);
          } else {
            this.setAttribute('src', proxied);
          }
          return;
        }
      }

      const realUrl = extractRealUrl(value);

      // No GM and not native — set src directly (browser handles it)
      if (!realUrl || (!hasGM && !isNative)) {
        if (originalSrcDescriptor?.set) {
          originalSrcDescriptor.set.call(this, value);
        } else {
          this.setAttribute('src', value);
        }
        return;
      }

      // GM or native: fetch as blob to bypass CORS
      const fetcher = hasGM ? gmFetch(realUrl) : originalFetch(realUrl);
      fetcher
        .then(response => {
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          return response.blob();
        })
        .then(blob => {
          const objectUrl = URL.createObjectURL(blob);
          if (originalSrcDescriptor?.set) {
            originalSrcDescriptor.set.call(this, objectUrl);
          } else {
            this.setAttribute('src', objectUrl);
          }
        })
        .catch(err => {
          console.error('Failed to bypass media src:', err);
          if (originalSrcDescriptor?.set) {
            originalSrcDescriptor.set.call(this, value);
          } else {
            this.setAttribute('src', value);
          }
        });
    },
    get() {
      if (originalSrcDescriptor?.get) {
        return originalSrcDescriptor.get.call(this);
      }
      return this.getAttribute('src') || '';
    }
  });

  console.log("Tidal CORS Bypass loaded (Web/GM/Capacitor Supported)");
}
