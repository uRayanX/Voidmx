import React, { useState, useEffect, useCallback } from 'react';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { Capacitor } from '@capacitor/core';
import { usePlayerStore } from '../store/playerStore';
import { useLibraryStore } from '../store/libraryStore';
import { setAudioVolume } from '../hooks/usePlayer';
import { getCustomInstances, saveCustomInstances, DEFAULT_INSTANCES, getApiSystem, setApiSystem } from '../api/tidal';
import { getTidalToken, clearTidalToken } from '../api/tidalAuth';

/* ─── Reusable row components ─── */

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-8">
    <p className="text-[11px] text-white/25 uppercase tracking-[0.2em] mb-3">{title}</p>
    <div className="rounded-2xl border border-white/[0.07] overflow-hidden divide-y divide-white/[0.05]">
      {children}
    </div>
  </div>
);

const Row: React.FC<{ label: string; sub?: string; children: React.ReactNode }> = ({ label, sub, children }) => (
  <div className="flex items-center justify-between px-5 py-3.5 bg-white/[0.02] hover:bg-white/[0.035] transition-colors">
    <div className="min-w-0 flex-1 pr-4">
      <p className="text-sm text-white/80">{label}</p>
      {sub && <p className="text-xs text-white/30 mt-0.5">{sub}</p>}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

const Toggle: React.FC<{ value: boolean; onChange: (v: boolean) => void; id: string }> = ({ value, onChange, id }) => (
  <button
    id={id}
    role="switch"
    aria-checked={value}
    onClick={() => onChange(!value)}
    className={`relative w-10 h-[22px] rounded-full transition-colors ${value ? 'bg-white' : 'bg-white/20'}`}
  >
    <span
      className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-black transition-transform ${value ? 'translate-x-[18px]' : 'translate-x-0'}`}
    />
  </button>
);

const Select: React.FC<{ value: string; options: { label: string; value: string }[]; onChange: (v: string) => void; id: string }> = ({ value, options, onChange, id }) => (
  <select
    id={id}
    value={value}
    onChange={e => onChange(e.target.value)}
    className="bg-white/[0.07] border border-white/[0.1] text-white text-xs rounded-xl px-3 py-2 outline-none focus:border-white/25 transition-colors cursor-pointer"
  >
    {options.map(o => (
      <option key={o.value} value={o.value} className="bg-[#111] text-white">
        {o.label}
      </option>
    ))}
  </select>
);

/* ─── Main Settings page ─── */

const QUALITY_KEY = 'void-audio-quality';
const AUTOPLAY_KEY = 'void-autoplay';
const NORMALIZE_KEY = 'void-normalize';
const CANVAS_KEY = 'void-canvas';
const PRIVACY_KEY = 'void-privacy';

function getBool(key: string, def: boolean): boolean {
  try { const v = localStorage.getItem(key); return v === null ? def : v === 'true'; } catch { return def; }
}
function setBool(key: string, v: boolean) {
  try { localStorage.setItem(key, v ? 'true' : 'false'); } catch {}
}

export const Settings: React.FC = () => {
  const volume = usePlayerStore(s => s.volume);
  const setVolume = usePlayerStore(s => s.setVolume);
  const likedCount = useLibraryStore(s => s.likedTracks.length);

  const [quality, setQuality] = useState(() => localStorage.getItem(QUALITY_KEY) || 'HI_RES_LOSSLESS');
  const [autoplay, setAutoplay] = useState(() => getBool(AUTOPLAY_KEY, true));
  const [normalize, setNormalize] = useState(() => getBool(NORMALIZE_KEY, false));
  const [canvas, setCanvas] = useState(() => getBool(CANVAS_KEY, true));
  const [privacy, setPrivacy] = useState(() => getBool(PRIVACY_KEY, false));

  const [cleared, setCleared] = useState(false);
  
  const [instances, setInstances] = useState<string[]>([]);
  const [newInstance, setNewInstance] = useState('');
  const [apiSystem, setSystem] = useState(() => getApiSystem());

  // ── Tidal account state ─────────────────────────────────────────────────────
  const [tidalUser, setTidalUser]        = useState(() => getTidalToken());
  const [tidalLoginState, setLoginState] = useState<'idle' | 'success' | 'error'>(() =>
    getTidalToken() ? 'success' : 'idle'
  );
  const [tidalError, setTidalError]      = useState('');

  const handleTidalLogout = useCallback(() => {
    clearTidalToken();
    setTidalUser(null);
    setLoginState('idle');
    setTidalError('');
    setTokenTimeLeft('');
  }, []);

  // Token validity countdown
  const [tokenTimeLeft, setTokenTimeLeft] = useState('');

  const computeTimeLeft = useCallback(() => {
    try {
      const exp = Number(localStorage.getItem('TIDAL_TOKEN_EXPIRES') || 0);
      if (!exp) { setTokenTimeLeft(''); return; }
      const diffMs = exp - Date.now();
      if (diffMs <= 0) { setTokenTimeLeft('expired'); return; }
      const days  = Math.floor(diffMs / 86_400_000);
      const hours = Math.floor((diffMs % 86_400_000) / 3_600_000);
      const mins  = Math.floor((diffMs % 3_600_000)  / 60_000);
      if (days > 0)  setTokenTimeLeft(`${days}d ${hours}h`);
      else if (hours > 0) setTokenTimeLeft(`${hours}h ${mins}m`);
      else setTokenTimeLeft(`${mins}m`);
    } catch { setTokenTimeLeft(''); }
  }, []);

  useEffect(() => {
    computeTimeLeft();
    const id = setInterval(computeTimeLeft, 60_000);
    return () => clearInterval(id);
  }, [computeTimeLeft, tidalUser]);

  // Manual token paste
  const [manualToken, setManualToken] = useState('');
  const [manualSaving, setManualSaving] = useState(false);

  const handleManualToken = useCallback(async () => {
    const token = manualToken.replace(/^Bearer\s+/i, '').trim();
    if (!token) return;
    setManualSaving(true);
    try {
      // Verify token + fetch profile
      const PROXY_BASE = 'https://void-cyz.pages.dev';
      const meRes = await fetch(`${PROXY_BASE}/proxy-auth?action=me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const me = meRes.ok ? await meRes.json() : {};
      const { saveTidalToken } = await import('../api/tidalAuth');
      saveTidalToken({
        access_token:  token,
        refresh_token: '',       // no refresh token when pasted manually
        expires_in:    604800,   // assume 7 days
        countryCode:   me.countryCode,
        username:      me.username || me.email,
      });
      setTidalUser(getTidalToken());
      setLoginState('success');
      setManualToken('');
    } catch (e: any) {
      setTidalError('Could not verify token — check it is correct');
      setLoginState('error');
    } finally {
      setManualSaving(false);
    }
  }, [manualToken]);
  // ────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    setInstances(getCustomInstances());
  }, []);

  const handleApiSystem = (v: string) => {
    const sys = v as 'monochrome' | 'hifi';
    setSystem(sys);
    setApiSystem(sys);
  };

  const handleAddInstance = () => {
    if (!newInstance.trim()) return;
    let url = newInstance.trim();
    if (!url.startsWith('http')) url = 'https://' + url;
    if (url.endsWith('/')) url = url.slice(0, -1);
    
    if (!instances.includes(url) && !DEFAULT_INSTANCES.includes(url)) {
      const newArr = [...instances, url];
      setInstances(newArr);
      saveCustomInstances(newArr);
    }
    setNewInstance('');
  };

  const handleRemoveInstance = (url: string) => {
    const newArr = instances.filter(i => i !== url);
    setInstances(newArr);
    saveCustomInstances(newArr);
  };

  const handleQuality = (v: string) => {
    setQuality(v);
    try { localStorage.setItem(QUALITY_KEY, v); } catch {}
  };

  const handleNormalize = (v: boolean) => {
    setNormalize(v);
    setBool(NORMALIZE_KEY, v);
  };

  const handleAutoplay = (v: boolean) => {
    setAutoplay(v);
    setBool(AUTOPLAY_KEY, v);
  };

  const handleCanvas = (v: boolean) => {
    setCanvas(v);
    setBool(CANVAS_KEY, v);
  };

  const handlePrivacy = (v: boolean) => {
    setPrivacy(v);
    setBool(PRIVACY_KEY, v);
  };

  const handleClearHistory = () => {
    try { localStorage.removeItem('monochrome-history'); } catch {}
    setCleared(true);
    setTimeout(() => setCleared(false), 2000);
  };

  const handleClearLiked = () => {
    useLibraryStore.setState({ likedTracks: [] });
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value) / 100;
    setVolume(v);
    setAudioVolume(v);
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-none">
      <div className="max-w-xl mx-auto px-5 pt-20 pb-28">

        {/* Heading */}
        <div className="mb-8">
          <p className="text-xs text-white/25 uppercase tracking-widest mb-1">Preferences</p>
          <h1 className="text-4xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>Settings</h1>
        </div>

        {/* Audio */}
        <Section title="Audio">
          <Row label="Audio quality" sub="Preferred streaming quality">
            <Select
              id="audio-quality"
              value={quality}
              onChange={handleQuality}
              options={[
                { label: 'Hi-Res lossless', value: 'HI_RES_LOSSLESS' },
                { label: 'Lossless (FLAC)', value: 'LOSSLESS' },
                { label: 'High (320 kbps)', value: 'HIGH' },
                { label: 'Low (96 kbps)', value: 'LOW' },
              ]}
            />
          </Row>
          <Row label="Volume" sub={`${Math.round(volume * 100)}%`}>
            <input
              id="volume-slider"
              type="range"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              onChange={handleVolumeChange}
              className="volume w-28 accent-white cursor-pointer"
              aria-label="Volume"
            />
          </Row>
          <Row label="Normalize volume" sub="Keeps loudness consistent across tracks">
            <Toggle id="normalize-toggle" value={normalize} onChange={handleNormalize} />
          </Row>
        </Section>

        {/* Playback */}
        <Section title="Playback">
          <Row label="Autoplay when queue ends" sub="Automatically plays similar tracks">
            <Toggle id="autoplay-toggle" value={autoplay} onChange={handleAutoplay} />
          </Row>
          <Row label="Canvas animations" sub="Show looping visuals behind album art">
            <Toggle id="canvas-toggle" value={canvas} onChange={handleCanvas} />
          </Row>
        </Section>

        {/* API Instances */}
        <Section title="API Instances">
          <Row label="API System" sub="Choose your preferred streaming provider">
            <Select
              id="api-system"
              value={apiSystem}
              onChange={handleApiSystem}
              options={[
                { label: 'Monochrome (Default)', value: 'monochrome' },
                { label: 'Hifi-API (Github Repo)', value: 'hifi' },
              ]}
            />
          </Row>

          
          {/* ── Tidal Account [DEPRECATED] ── */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-4 opacity-50 relative overflow-hidden mt-8">
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
               <span className="bg-red-500/20 text-red-500 font-bold px-3 py-1 rounded border border-red-500/30">TIDAL DEPRECATED - MIGRATING TO SPOTIFY</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/80">Tidal Account</p>
                <p className="text-xs text-white/50">Deprecated API</p>
              </div>
              <button disabled className="px-3 py-1.5 text-xs font-semibold bg-red-500/10 text-red-400 rounded-lg opacity-50 cursor-not-allowed">
                Inactive
              </button>
            </div>
          </div>
        </Section>

        {/* Privacy */}
        <Section title="Privacy">
          <Row label="Hide listening history" sub="Don't record what you play">
            <Toggle id="privacy-toggle" value={privacy} onChange={handlePrivacy} />
          </Row>
          <Row label="Clear play history" sub="Removes all recently played tracks">
            <button
              id="clear-history-btn"
              onClick={handleClearHistory}
              className="px-4 py-1.5 text-xs rounded-xl border border-white/[0.12] text-white/50 hover:text-white hover:border-white/30 transition-all"
            >
              {cleared ? '✓ Cleared' : 'Clear'}
            </button>
          </Row>
          <Row label={`Clear liked songs (${likedCount})`} sub="Remove all saved tracks">
            <button
              id="clear-liked-btn"
              onClick={handleClearLiked}
              disabled={likedCount === 0}
              className="px-4 py-1.5 text-xs rounded-xl border border-white/[0.12] text-white/50 hover:text-white hover:border-white/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Clear
            </button>
          </Row>
        </Section>

        {/* About */}
        <Section title="About">
          <Row label="Version" sub="Void Radio client">
            <span className="text-xs text-white/25 font-mono">Caramel 1.1</span>
          </Row>
          <Row label="Powered by" sub="Hi-Fi API">
            <span className="text-xs text-white/25">Cartel</span>
          </Row>
          {Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android' && (
            <Row label="OTA Updates" sub="Check for Capgo updates">
              <button
                onClick={() => {
                  CapacitorUpdater.getLatest().then((latest: any) => {
                      if (latest.version && latest.url) {
                          alert(`Capgo found: ${latest.version}\nAttempting force download...`);
                          CapacitorUpdater.download({ url: latest.url, version: latest.version }).then((res: any) => {
                              alert(`Downloaded. Applying ${res.version}...`);
                              CapacitorUpdater.set({ id: res.id });
                          }).catch((err: any) => alert(`Download failed: ${err.message || String(err)}`));
                      } else {
                          alert("Capgo says NO updates available on your channel.");
                      }
                  }).catch((e: any) => alert(`getLatest failed: ${e.message || String(e)}`));
                }}
                className="px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/10"
              >
                Check
              </button>
            </Row>
          )}
        </Section>

      </div>
    </div>
  );
};
