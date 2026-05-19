import React from 'react';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { usePlayer } from './hooks/usePlayer';
import { Home } from "./pages/Home";
import { Album } from "./pages/Album";
import { Artist } from "./pages/Artist";
import { Genre } from "./pages/Genre";
import { Playlist } from "./pages/Playlist";
import { NowPlaying } from './pages/NowPlaying';
import { Library } from './pages/Library';
import { Settings } from './pages/Settings';
import { Search } from './pages/Search';
import { useLyricsPrewarm } from './components/Player/LyricsPanel';
import { usePlayerStore } from './store/playerStore';
import { updateFaviconAndTitle } from './utils/favicon';
import { Welcome } from './pages/Welcome';
import Grainient from './components/Grainient';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { Capacitor } from '@capacitor/core';

// Helper to safely darken hex values to maintain the "darkish" aesthetic
import { extractVibrantColor } from './utils/extractColor';

function adjustHex(hex: string, factor: number): string {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) return '#000000';
  const r = Math.min(255, Math.floor(parseInt(match[1], 16) * factor));
  const g = Math.min(255, Math.floor(parseInt(match[2], 16) * factor));
  const b = Math.min(255, Math.floor(parseInt(match[3], 16) * factor));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const IconNow = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 3v9.28A4 4 0 1014 16V7h4V3h-6zm-2 15a2 2 0 110-4 2 2 0 010 4z"/>
  </svg>
);
const IconHome = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
  </svg>
);
const IconSearch = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
  </svg>
);
const IconSettings = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
  </svg>
);
const IconUsers = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>
);

const IconPrev = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
  </svg>
);

const IconNext = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
  </svg>
);

const IconPlay = () => (
  <svg className="w-5 h-5 translate-x-[1px]" fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z"/>
  </svg>
);

const IconPause = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
  </svg>
);

import { useLocation } from 'react-router-dom';

const NavPill: React.FC = () => {
  const currentTrack = usePlayerStore(state => state.currentTrack);
  const isPaused = usePlayerStore(state => state.isPaused);
  const player = usePlayerStore(state => state.player);
  const location = useLocation();

  const links = [
    { to: '/home', icon: <IconHome />, label: 'Home' },
    { to: '/now', icon: <IconNow />, label: 'Now Playing' },
    { to: '/search', icon: <IconSearch />, label: 'Search' },
    { to: '/library', icon: <IconUsers />, label: 'Library' },
  ];

  const isNowPage = location.pathname.startsWith('/now');
  const hasTrack = !!currentTrack;
  //gg
  // The controls should be visible if we are NOT on the /now page AND we have a track
  const showControls = !isNowPage && hasTrack;
  const showOnlyPlay = showControls && isPaused;
  const showAllControls = showControls && !isPaused;

  return (
    <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 rounded-2xl flex items-center justify-center overflow-hidden`}>
      <div className={`w-full h-full rounded-2xl relative z-10 transition-all duration-500`}>
        <nav
          style={{
            '--vibrant-color': currentTrack?.album?.vibrantColor || '#555',
            backgroundColor: currentTrack && !isPaused ? 'transparent' : 'rgba(0,0,0,0.85)',
            borderColor: currentTrack && !isPaused ? 'var(--vibrant-color)' : 'rgba(255,255,255,0.07)'
          } as React.CSSProperties}
          className={`flex items-center gap-1 backdrop-blur-2xl border transition-all duration-500 pointer-events-auto rounded-2xl p-1 shadow-[0_8px_40px_rgba(0,0,0,0.6)] border-solid border-[2px] relative overflow-hidden`}
        >
          {currentTrack && !isPaused && (
            <Grainient
              color1={adjustHex(currentTrack?.album?.vibrantColor || '#555555', 1.8)}
              color2={adjustHex(currentTrack?.album?.vibrantColor || '#555555', 1.3)}
              color3="#050505"
              timeSpeed={0.65}
              colorBalance={-0.2}
              warpStrength={3.0}
              warpFrequency={2.5}
              warpSpeed={1.95}
              blendSoftness={0.6}
              noiseScale={1.5}
              className="visible mix-blend-screen opacity-100"
              zoom={1.2}
            />
          )}

          {links.map((link, i) => {
            const isMiddle = i === 2; // Right before 'Search' (/search), between 'Now' and 'Search'
            return (
              <React.Fragment key={link.to}>
                {isMiddle && (
                  <div className={`flex items-center gap-1 transition-all duration-500 relative z-10 overflow-hidden mix-blend-difference  ${
                    showControls ? 'opacity-100 px-1' : 'w-0 opacity-0 px-0 pointer-events-none'
                  }`}>
                    {/* Prev Button */}
                    <button
                      onClick={() => player?.previousTrack()}
                      className={`flex items-center justify-center rounded-xl transition-all duration-500 text-white hover:text-white hover:bg-white/[0.06] overflow-hidden  ${
                        showAllControls ? 'w-9 h-9 opacity-100' : 'w-0 h-9 opacity-0 pointer-events-none'
                      }`}
                      title="Previous"
                    >
                      <div className="flex-shrink-0">
                        <IconPrev />
                      </div>
                    </button>

                    {/* Play/Pause Button */}
                    <button
                      onClick={() => player?.togglePlay()}
                      className="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-500 text-white hover:text-white hover:bg-white/[0.06] bg-white/[0.04] "
                      title={isPaused ? "Play" : "Pause"}
                    >
                      <div className="flex-shrink-0">
                        {isPaused ? <IconPlay /> : <IconPause />}
                      </div>
                    </button>

                    {/* Next Button */}
                    <button
                      onClick={() => player?.nextTrack()}
                      className={`flex items-center justify-center rounded-xl transition-all duration-500 text-white hover:text-white hover:bg-white/[0.06] overflow-hidden  ${
                        showAllControls ? 'w-9 h-9 opacity-100' : 'w-0 h-9 opacity-0 pointer-events-none'
                      }`}
                      title="Next"
                    >
                      <div className="flex-shrink-0">
                        <IconNext />
                      </div>
                    </button>
                  </div>
                )}
                
                <NavLink
                  to={link.to}
                  title={link.label}
                  onClick={() => {
                    if (link.to === '/now' && window.location.pathname === '/now') {
                      const state = usePlayerStore.getState();
                      if (state.showLyrics || state.showQueue) {
                        usePlayerStore.setState({ showLyrics: false, showQueue: false });
                      }
                    }
                  }}
                  className={({ isActive }) =>
                    `w-9 h-9 flex items-center justify-center rounded-xl transition-all relative z-10 mix-blend-difference  ${
                      isActive ? 'bg-white text-black' : 'text-white hover:bg-white/[0.1]'
                    }`
                  }
                >
                  {link.icon}
                </NavLink>
              </React.Fragment>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

const AppLayout: React.FC = () => {
  usePlayer();
  useGlobalShortcuts();
  useLyricsPrewarm();
  
  const currentTrack = usePlayerStore(state => state.currentTrack);
  React.useEffect(() => {
    updateFaviconAndTitle(currentTrack);

    if (currentTrack?.album?.cover && !currentTrack.album.vibrantColor) {
      // The API uses max 1280x1280. For color extraction, the thumbnail is better.
      // Easiest is to use the existing cover string directly.
      const picUrl = currentTrack.album.cover.startsWith('http') 
        ? currentTrack.album.cover 
        : `https://resources.tidal.com/images/${currentTrack.album.cover.replace(/-/g, '/')}/320x320.jpg`;
        
      extractVibrantColor(picUrl).then(color => {
        if (!color) return;
        usePlayerStore.setState(state => {
          if (state.currentTrack?.id === currentTrack.id && state.currentTrack?.album) {
            return {
              currentTrack: {
                ...state.currentTrack,
                album: {
                  ...state.currentTrack.album,
                  vibrantColor: color
                }
              }
            };
          }
          return state;
        });
      });
    }
  }, [currentTrack]);

  return (
    <div className="relative h-screen w-screen bg-[#080808] overflow-hidden">
      <NavPill />
      <div className="h-full w-full">
        <Routes>
          <Route path="/home" element={<Home />} />
          <Route path="/album/:id" element={<Album />} />
          <Route path="/artist/:id" element={<Artist />} /> 
          <Route path="/genre/:id" element={<Genre />} />
          <Route path="/playlist/:id" element={<Playlist />} />
          <Route path="/now" element={<NowPlaying />} />
          <Route path="/search" element={<Search />} />
          <Route path="/library" element={<Library />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </div>
    </div>
  );
};

function App() {
  React.useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      CapacitorUpdater.notifyAppReady();
    }
  }, []);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/*" element={<AppLayout />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
