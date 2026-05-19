// @ts-nocheck
import React, { useState, useMemo } from 'react';

/* ─────────────────────────── data ─────────────────────────── */

const CATEGORIES = [
  {
    id: 'playback',
    label: 'Playback controls',
    gradient: 'linear-gradient(135deg, #3B6D11, #7cbf43)',
    icon: (
      <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
        <path d="M8 5v14l11-7z" />
      </svg>
    ),
    features: [
      'Play / pause toggle with animated icon transition',
      'Previous track / next track skip buttons',
      'Seek / scrub bar with hover preview timestamp',
      'Elapsed and remaining time counters',
      'Shuffle toggle (on / off / smart shuffle)',
      'Repeat toggle — off, repeat-all, repeat-one',
      'Crossfade slider between tracks (settings)',
      'Gapless playback (no silence between tracks)',
      'Volume slider with mute/unmute icon',
      'Scroll wheel volume control (desktop)',
      'Playback speed selector (podcasts & audiobooks)',
      'Sleep timer — auto-stop after N minutes',
      'Car View mode (large-touch simplified UI, mobile)',
      'Keyboard shortcut bindings for all playback actions',
    ],
  },
  {
    id: 'nowplaying',
    label: 'Now Playing',
    gradient: 'linear-gradient(135deg, #185FA5, #4da6ff)',
    icon: (
      <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
        <path d="M12 3v9.28A4 4 0 1014 16V7h4V3h-6zm-2 15a2 2 0 110-4 2 2 0 010 4z" />
      </svg>
    ),
    features: [
      'Expanded Now Playing full-screen view',
      'Album art display with dynamic color extraction',
      'Dynamic background color theme from artwork',
      'Canvas — looping video or animation behind art',
      'Synced lyrics panel with line-by-line highlighting',
      'Scroll-to-current-line in lyrics view',
      'Queue panel — upcoming tracks and play history',
      'Drag-to-reorder items in the queue',
      'Credits panel — songwriters, producers, label',
      'Behind the Lyrics (Genius integration)',
      'Heart / save-to-liked action on current track',
      'Three-dot overflow menu from Now Playing',
      'Share current track from Now Playing view',
      'Minimized mini-player bar (persistent bottom bar)',
      'Swipe up to expand / swipe down to minimize (mobile)',
    ],
  },
  {
    id: 'library',
    label: 'Library & collection',
    gradient: 'linear-gradient(135deg, #534AB7, #a09cf5)',
    icon: (
      <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
        <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2z" />
      </svg>
    ),
    features: [
      'Your Library sidebar with all saved content',
      'Filter library by type: playlists, albums, artists, podcasts',
      'Sort library by recently played, alphabetical, recently added, creator',
      'List view, grid view, and compact view toggles',
      'Pin items to top of sidebar',
      'Search within your library',
      'Liked Songs auto-playlist',
      'Liked Episodes for podcasts',
      'Saved albums shelf',
      'Followed artists and podcasts',
      'Followed playlists from other users',
      'Download for offline (Premium) with progress indicator',
      'Offline indicator badge on downloaded items',
      'Create new playlist from library UI',
      'Create new folder and drag playlists into it',
      'Playlist folder nesting',
      'Recently played shelf (quick access)',
      'Continue listening row',
    ],
  },
  {
    id: 'playlists',
    label: 'Playlists',
    gradient: 'linear-gradient(135deg, #854F0B, #f5a623)',
    icon: (
      <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
        <path d="M3 18h13v-2H3v2zm0-5h10v-2H3v2zm0-7v2h13V6H3zm18 9.59L17.42 12 21 8.41 19.59 7l-5 5 5 5L21 15.59z" />
      </svg>
    ),
    features: [
      'Create playlist with custom name and description',
      'Upload custom playlist cover image',
      'Add tracks via search within playlist editor',
      'Drag-and-drop track reordering',
      'Remove tracks from playlist',
      'Duplicate a playlist',
      'Make playlist public / private toggle',
      'Collaborative playlist mode (invite others to edit)',
      'Add collaborators to a playlist',
      'Sort playlist tracks by title, artist, album, date added, duration',
      'Filter tracks by search within playlist',
      'Playlist total duration and track count display',
      'Recommended tracks to add (at bottom of playlist)',
      'Copy playlist link / share sheet',
      'Merge two playlists',
      'Export playlist (third-party integrations only)',
    ],
  },
  {
    id: 'search',
    label: 'Search & discovery',
    gradient: 'linear-gradient(135deg, #993C1D, #ff6b3d)',
    icon: (
      <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
        <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
      </svg>
    ),
    features: [
      'Global search bar with live instant results',
      'Results categorized: songs, artists, albums, playlists, podcasts, audiobooks, profiles',
      'Recent searches history',
      'Browse by genre and mood cards',
      'Browse by category: charts, new releases, concerts',
      'Top result card with auto-play option',
      'Artist, album, playlist, user profile pages',
      'Verified artist badges',
      'Follow / unfollow buttons on artist pages',
      'Artist discography with filter tabs (albums, singles, compilations)',
      'Artist appears-on section',
      'Fans also like / related artists row',
      'Album tracklist with play count per track',
      'Search within a specific genre or category page',
    ],
  },
  {
    id: 'home',
    label: 'Home feed',
    gradient: 'linear-gradient(135deg, #0F6E56, #1db97f)',
    icon: (
      <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
      </svg>
    ),
    features: [
      'Personalized greeting with time-of-day messaging',
      'Shortcuts shelf — recently played quick-launch tiles',
      'Horizontally scrollable content carousels',
      'Daily Mixes (up to 6 personalized genre blends)',
      'Discover Weekly playlist (new every Monday)',
      'Release Radar playlist (new releases from followed artists)',
      'Made For You editorial personalized playlists',
      'On Repeat and Repeat Rewind playlists',
      'Recommended albums and new releases',
      'Podcast / show recommendations',
      'Jump back in — resume listening row',
      'Similar to recently played recommendations',
      'Concert / event discovery (Spotify Concerts)',
      'Seasonal and editorial curated content rows',
      'Mood and activity contextual recommendations',
    ],
  },
  {
    id: 'social',
    label: 'Social & sharing',
    gradient: 'linear-gradient(135deg, #993556, #e85d8e)',
    icon: (
      <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
      </svg>
    ),
    features: [
      'Friend Activity sidebar (desktop) — real-time listening feed',
      'Follow / unfollow other users',
      'Public profile page with listening activity (if enabled)',
      'Share track, album, playlist, artist via link',
      'Share to social platforms (Instagram Stories, WhatsApp, etc.)',
      'Copy embed code for external websites',
      'Blend playlist — merge listening tastes with a friend',
      'Collaborative playlists with shared edit access',
      'Spotify Wrapped — annual personalized listening recap',
      'Jam — real-time collaborative listening session',
      'Share Now Playing card (visual share image)',
      'Activity privacy settings (hide listening history)',
    ],
  },
  {
    id: 'podcast',
    label: 'Podcasts & audiobooks',
    gradient: 'linear-gradient(135deg, #5F5E5A, #aaa89e)',
    icon: (
      <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
        <path d="M12 1a9 9 0 00-9 9v3a3 3 0 003 3h.5a.5.5 0 00.5-.5v-5a.5.5 0 00-.5-.5H6a7 7 0 0114 0h-.5a.5.5 0 00-.5.5v5a.5.5 0 00.5.5H20a3 3 0 003-3v-3a9 9 0 00-9-9zm-1 14v5h2v-5h-2z" />
      </svg>
    ),
    features: [
      'Podcast show page with episode list',
      'Episode filter: all, unplayed, downloaded, saved',
      'Chapter markers on seek bar',
      'Skip intro / skip silence buttons',
      'Playback speed: 0.5x to 3.5x in increments',
      'Download episode for offline listening',
      'Mark as played / unplayed',
      'Episode save / bookmark (Your Episodes)',
      'Auto-download new episodes toggle',
      'Episode queue with auto-advance',
      'Audiobook chapter navigation',
      'Audiobook bookmark placement',
      'Narration speed control for audiobooks',
      'Reading progress tracking (audiobooks)',
      'Preview first chapter for free',
      'Podcast follow / unfollow with notification options',
    ],
  },
  {
    id: 'visual',
    label: 'Visual & UI design',
    gradient: 'linear-gradient(135deg, #3B6D11, #7cbf43)',
    icon: (
      <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
      </svg>
    ),
    features: [
      'Dark mode as default across all surfaces',
      'Dynamic color theming — UI adapts to album art palette',
      'Skeleton loading states on all content carousels',
      'Animated equalizer bars on currently playing track',
      'Smooth page transitions and fade-ins',
      'Micro-interaction feedback on button presses',
      'Full-bleed artwork backgrounds in expanded views',
      'Responsive grid layout adapting to window width',
      'Compact / default / large list item size modes',
      'Custom scrollbars styled to theme',
      'High-DPI / Retina-ready assets',
      'Consistent icon library across all surfaces',
    ],
  },
  {
    id: 'connect',
    label: 'Devices & Connect',
    gradient: 'linear-gradient(135deg, #185FA5, #4da6ff)',
    icon: (
      <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
        <path d="M17 1H7C5.9 1 5 1.9 5 3v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm0 18H7V5h10v14zm-5 2c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
      </svg>
    ),
    features: [
      'Spotify Connect — switch playback between devices seamlessly',
      'Device picker overlay (phone, desktop, TV, speaker, console)',
      'Remote control another device from current device',
      'Volume control of remote device',
      'AirPlay support (iOS / macOS)',
      'Chromecast support',
      'Bluetooth output device selection (desktop)',
      'Smart TV app (Samsung, LG, Android TV, Fire TV)',
      'PlayStation / Xbox app',
      'Sonos / smart speaker integration',
      'Wake on listen for smart speakers',
    ],
  },
  {
    id: 'settings',
    label: 'Settings & preferences',
    gradient: 'linear-gradient(135deg, #854F0B, #f5a623)',
    icon: (
      <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
        <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
      </svg>
    ),
    features: [
      'Audio quality selector (Low / Normal / High / Very High / Lossless on HiFi)',
      'Normalize volume level toggle',
      'Equalizer with preset and custom curve (mobile)',
      'Crossfade duration slider',
      'Automix toggle for DJ-style transitions',
      'Autoplay when queue ends toggle',
      'Download quality selector',
      'Download on Wi-Fi only toggle',
      'Storage location for downloads',
      'Explicit content filter toggle',
      'Language and region preferences',
      'Data saver mode',
      'Canvas video toggle (disable looping art)',
      'Show local audio files from device',
      'Startup behavior — launch on login, minimized, etc.',
      'Shortcut / hotkey customization (desktop)',
      'Push notification preferences (mobile)',
      'Privacy settings — listening activity, ads personalization',
      'Connect third-party apps (Last.fm scrobbling, etc.)',
    ],
  },
  {
    id: 'accessibility',
    label: 'Accessibility',
    gradient: 'linear-gradient(135deg, #0F6E56, #1db97f)',
    icon: (
      <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
        <path d="M12 2a2 2 0 110 4 2 2 0 010-4zm10 7h-6v13h-2v-6h-4v6H8V9H2V7h20v2z" />
      </svg>
    ),
    features: [
      'Full keyboard navigation support (desktop)',
      'Screen reader compatibility (ARIA labels throughout)',
      'Focus ring indicators on interactive elements',
      'High-contrast mode compatibility (OS-level)',
      'Adjustable text size (follows OS / browser setting)',
      'Closed captions for video podcasts',
      'Lyrics available for screen reader playback',
      'Reduced motion support (respects OS preference)',
      'Touch target sizing meets mobile accessibility guidelines',
    ],
  },
  {
    id: 'nav',
    label: 'Navigation & layout',
    gradient: 'linear-gradient(135deg, #993C1D, #ff6b3d)',
    icon: (
      <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
        <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
      </svg>
    ),
    features: [
      'Persistent left sidebar with library and navigation',
      'Resizable sidebar width (desktop)',
      'Collapse sidebar to icon-only rail (desktop)',
      'Top navigation bar with back / forward buttons',
      'Breadcrumb-style contextual header titles',
      'Sticky Now Playing mini-bar at bottom',
      'Right panel — Queue, Friend Activity, or Now Playing info',
      'Collapsible right panel toggle',
      'Bottom tab bar (mobile: Home, Search, Library)',
      'Swipe-based navigation between main tabs (mobile)',
      'Floating action button for quick add (mobile)',
      'Deep link support — open specific content from URL',
      'In-app notification tray',
    ],
  },
];

/* ─────────────────────────── helpers ─────────────────────────── */

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-white/20 text-white rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function downloadBlob(filename: string, content: string, mime: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type: mime }));
  a.download = filename;
  a.click();
}

/* ─────────────────────────── sub-components ─────────────────────── */

const FeatureCard: React.FC<{
  category: typeof CATEGORIES[0];
  query: string;
}> = ({ category, query }) => {
  const filtered = query
    ? category.features.filter(f => f.toLowerCase().includes(query.toLowerCase()))
    : category.features;

  if (filtered.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/[0.07] overflow-hidden bg-white/[0.025] backdrop-blur-sm flex flex-col">
      {/* card header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
        <div
          className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-white/90"
          style={{ background: category.gradient }}
        >
          {category.icon}
        </div>
        <span className="text-sm font-medium text-white/90 flex-1 leading-tight">{category.label}</span>
        <span className="text-xs text-white/25 font-mono shrink-0">{filtered.length}</span>
      </div>

      {/* feature list */}
      <ul className="py-1.5 flex-1">
        {filtered.map((f, i) => (
          <li key={i} className="flex items-start gap-2.5 px-4 py-[5px] hover:bg-white/[0.035] transition-colors">
            <span className="w-1 h-1 rounded-full bg-white/20 shrink-0 mt-[7px]" />
            <span className="text-[12.5px] text-white/55 leading-relaxed">
              {highlight(f, query)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/* ─────────────────────────── main page ─────────────────────────── */

export const Features: React.FC = () => {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');

  const tabs = useMemo(() => [
    { id: 'all', label: 'All' },
    ...CATEGORIES.map(c => ({ id: c.id, label: c.label })),
  ], []);

  const visible = useMemo(() => {
    const cats = activeTab === 'all' ? CATEGORIES : CATEGORIES.filter(c => c.id === activeTab);
    return cats.filter(cat =>
      !query || cat.features.some(f => f.toLowerCase().includes(query.toLowerCase()))
    );
  }, [activeTab, query]);

  const totalFeatures = CATEGORIES.reduce((a, c) => a + c.features.length, 0);
  const shownFeatures = useMemo(() =>
    visible.reduce((a, cat) => {
      const feats = query
        ? cat.features.filter(f => f.toLowerCase().includes(query.toLowerCase()))
        : cat.features;
      return a + feats.length;
    }, 0),
    [visible, query],
  );

  function exportCSV() {
    const rows = [['Category', 'Feature']];
    CATEGORIES.forEach(cat => cat.features.forEach(f => rows.push([cat.label, f])));
    const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
    downloadBlob('features.csv', csv, 'text/csv');
  }

  function exportJSON() {
    const out = CATEGORIES.map(c => ({ category: c.label, features: c.features }));
    downloadBlob('features.json', JSON.stringify(out, null, 2), 'application/json');
  }

  function exportMarkdown() {
    const lines = ['# Spotify Frontend Features\n'];
    CATEGORIES.forEach(cat => {
      lines.push(`## ${cat.label}\n`);
      cat.features.forEach(f => lines.push(`- ${f}`));
      lines.push('');
    });
    downloadBlob('features.md', lines.join('\n'), 'text/markdown');
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-none">
      <div className="max-w-5xl mx-auto px-5 pt-20 pb-28">

        {/* ── page heading ── */}
        <div className="mb-7">
          <p className="text-xs text-white/25 uppercase tracking-widest mb-1">Reference</p>
          <h1 className="text-4xl font-bold leading-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Feature Stack
          </h1>
          <p className="text-sm text-white/35 mt-1.5">
            Complete breakdown of platform features across all categories
          </p>
        </div>

        {/* ── stats row ── */}
        <div className="flex gap-3 mb-6">
          {[
            { label: 'Total features', value: totalFeatures },
            { label: 'Categories', value: CATEGORIES.length },
            { label: 'Shown', value: shownFeatures },
          ].map(s => (
            <div key={s.label} className="flex-1 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 text-center">
              <div className="text-2xl font-semibold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {s.value}
              </div>
              <div className="text-[11px] text-white/30 mt-0.5 uppercase tracking-wide">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── search + export ── */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-2 flex-1 bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2">
            <svg className="w-4 h-4 text-white/30 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setActiveTab('all'); }}
              placeholder="Filter features…"
              className="bg-transparent border-none outline-none text-sm text-white/80 placeholder:text-white/25 flex-1 min-w-0"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="text-white/25 hover:text-white/60 transition-colors text-lg leading-none"
              >
                ×
              </button>
            )}
          </div>

          {/* export buttons */}
          <div className="flex items-center gap-1.5">
            {[
              { label: 'CSV', fn: exportCSV },
              { label: 'JSON', fn: exportJSON },
              { label: 'MD', fn: exportMarkdown },
            ].map(btn => (
              <button
                key={btn.label}
                onClick={btn.fn}
                className="px-3 py-2 text-xs font-medium text-white/50 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] rounded-xl transition-colors"
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── category tabs ── */}
        <div className="flex flex-wrap gap-1.5 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 text-xs rounded-full border transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-black border-white font-medium'
                  : 'bg-transparent text-white/45 border-white/[0.1] hover:text-white hover:border-white/25'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── grid ── */}
        {visible.length === 0 ? (
          <div className="text-center py-20 text-white/25 text-sm">
            No features match <span className="text-white/50">"{query}"</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visible.map(cat => (
              <FeatureCard key={cat.id} category={cat} query={query} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
