import React, { useEffect, useState } from 'react';
import { TopTracks } from '../components/Profile/TopTracks';
import { TopArtists } from '../components/Profile/TopArtists';
import { getTopTracks, getTopArtists, getUserPlaylists, getMe, type TimeRange } from '../api/spotify';
import type { SpotifyTrack, SpotifyArtist, SpotifyUser, SpotifyPlaylist } from '../types/spotify';

interface ProfileProps {
  token: string;
}

const TIME_RANGES: { id: TimeRange; label: string }[] = [
  { id: 'short_term', label: '4 Weeks' },
  { id: 'medium_term', label: '6 Months' },
  { id: 'long_term', label: 'All Time' },
];

type Tab = 'tracks' | 'artists' | 'playlists';

export const Profile: React.FC<ProfileProps> = ({ token }) => {
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [artists, setArtists] = useState<SpotifyArtist[]>([]);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('medium_term');
  const [tab, setTab] = useState<Tab>('tracks');
  const [loading, setLoading] = useState(false);

  // Fetch user profile once
  useEffect(() => {
    getMe(token).then(setUser).catch(console.error);
    getUserPlaylists(token).then(setPlaylists).catch(console.error);
  }, [token]);

  // Fetch top items when timeRange changes
  useEffect(() => {
    setLoading(true);
    Promise.all([
      getTopTracks(token, timeRange, 50),
      getTopArtists(token, timeRange, 18),
    ])
      .then(([t, a]) => { setTracks(t); setArtists(a); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, timeRange]);

  const favouriteGenre = artists[0]?.genres?.[0] ?? 'Unknown';
  const avgPopularity = tracks.length
    ? Math.round(tracks.reduce((a, t) => a + t.popularity, 0) / tracks.length)
    : 0;

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      {/* Header */}
      {user && (
        <div className="flex items-center gap-5 mb-8">
          <img
            src={user.images[0]?.url ?? `https://i.pravatar.cc/96?u=${user.id}`}
            alt={user.display_name}
            className="w-24 h-24 rounded-full object-cover shadow-xl"
          />
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest">Profile</p>
            <h1 className="text-3xl font-bold text-white mt-1">{user.display_name}</h1>
            <p className="text-gray-400 text-sm mt-1">{(user.followers?.total ?? 0).toLocaleString()} followers</p>
            <span className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
              user.product === 'premium' ? 'bg-[#00FFFF]/20 text-[#00FFFF]' : 'bg-gray-700 text-gray-300'
            }`}>
              {user.product === 'premium' ? '✓ Premium' : 'Free'}
            </span>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Top genre', value: favouriteGenre },
          { label: 'Saved tracks', value: `${tracks.length}+` },
          { label: 'Avg popularity', value: `${avgPopularity}%` },
        ].map(s => (
          <div key={s.label} className="bg-[#141414] rounded-xl p-4 text-center">
            <p className="text-xl font-bold text-white truncate">{s.value}</p>
            <p className="text-xs text-gray-400 mt-1 capitalize">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Time range selector */}
      <div className="flex gap-2 mb-6">
        {TIME_RANGES.map(r => (
          <button
            key={r.id}
            onClick={() => setTimeRange(r.id)}
            className={`px-4 py-1.5 rounded-full text-sm transition-all ${
              timeRange === r.id
                ? 'bg-white text-black font-semibold'
                : 'bg-white/10 text-gray-400 hover:bg-white/20'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-white/10">
        {(['tracks', 'artists', 'playlists'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t ? 'text-white border-[#00FFFF]' : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'tracks' && <TopTracks tracks={tracks} token={token} loading={loading} />}
      {tab === 'artists' && <TopArtists artists={artists} loading={loading} />}
      {tab === 'playlists' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {playlists.map(pl => (
            <a
              key={pl.id}
              href={pl.external_urls.spotify}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#141414] rounded-xl p-3 hover:bg-[#1a1a1a] transition-colors group"
            >
              <img
                src={pl.images[0]?.url ?? 'https://via.placeholder.com/160'}
                alt={pl.name}
                className="w-full aspect-square rounded-lg object-cover mb-3"
              />
              <p className="text-sm font-medium text-white truncate group-hover:text-[#00FFFF] transition-colors">
                {pl.name}
              </p>
              <p className="text-xs text-gray-400">
                {pl.tracks?.total ? `${pl.tracks.total} tracks` : pl.owner?.display_name ?? 'playlist'}
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};
