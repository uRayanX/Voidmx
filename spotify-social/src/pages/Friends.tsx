import React, { useState } from 'react';
import type { FriendActivity } from '../types/spotify';

// Mock friend data - Spotify deprecated their social graph API
const MOCK_FRIENDS: (FriendActivity & { topArtists: string[] })[] = [
  {
    userId: 'mock_1',
    displayName: 'Alex Chen',
    avatarUrl: 'https://i.pravatar.cc/80?img=7',
    timestamp: Date.now() - 2 * 60000,
    topArtists: ['The Weeknd', 'Drake', 'Post Malone'],
    track: null,
  },
  {
    userId: 'mock_2',
    displayName: 'Priya Sharma',
    avatarUrl: 'https://i.pravatar.cc/80?img=5',
    timestamp: Date.now() - 8 * 60000,
    topArtists: ['Harry Styles', 'Taylor Swift', 'Olivia Rodrigo'],
    track: null,
  },
  {
    userId: 'mock_3',
    displayName: 'Marcus Webb',
    avatarUrl: 'https://i.pravatar.cc/80?img=11',
    timestamp: Date.now() - 25 * 60000,
    topArtists: ['Travis Scott', 'Kanye West', 'Kendrick Lamar'],
    track: null,
  },
  {
    userId: 'mock_4',
    displayName: 'Sofia Rossi',
    avatarUrl: 'https://i.pravatar.cc/80?img=9',
    timestamp: Date.now() - 90 * 60000,
    topArtists: ['Dua Lipa', 'BLACKPINK', 'Billie Eilish'],
    track: null,
  },
];

interface FriendsProps {
  token: string;
}

export const Friends: React.FC<FriendsProps> = () => {
  const [query, setQuery] = useState('');
  const [following, setFollowing] = useState<Set<string>>(new Set(['mock_1', 'mock_2']));

  const filtered = MOCK_FRIENDS.filter(f =>
    f.displayName.toLowerCase().includes(query.toLowerCase())
  );

  const toggleFollow = (id: string) => {
    setFollowing(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Active now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ago`;
  };

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold text-white mb-2">Friends</h1>
      <p className="text-gray-400 text-sm mb-6">Connect with people and see their musical taste.</p>

      <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-xs text-yellow-400">
        ⚠️ Spotify's friend graph API was deprecated. These are demo users to illustrate the feature.
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
        <input
          type="text"
          placeholder="Search users..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full bg-[#1a1a1a] text-white placeholder-gray-500 pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#00FFFF] text-sm"
        />
      </div>

      {/* Follow lists */}
      <div className="mb-4">
        <div className="flex gap-4 text-sm font-medium mb-4">
          <span className="text-[#00FFFF]">
            {following.size} Following
          </span>
          <span className="text-gray-400">
            {MOCK_FRIENDS.length} Users
          </span>
        </div>
      </div>

      {/* Friend cards */}
      <div className="space-y-3">
        {filtered.map(friend => (
          <div key={friend.userId} className="bg-[#141414] rounded-xl p-4 flex items-center gap-4">
            <div className="relative">
              <img src={friend.avatarUrl} alt={friend.displayName} className="w-12 h-12 rounded-full object-cover" />
              <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#141414] ${
                Date.now() - friend.timestamp < 10 * 60000 ? 'bg-[#00FFFF]' : 'bg-gray-500'
              }`} />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">{friend.displayName}</p>
              <p className="text-xs text-gray-400 mt-0.5">{timeAgo(friend.timestamp)}</p>
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {friend.topArtists.slice(0, 3).map( (a: any) => (
                  <span key={a} className="text-xs bg-white/10 text-gray-300 px-2 py-0.5 rounded-full">
                    {a}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={() => toggleFollow(friend.userId)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all shrink-0 ${
                following.has(friend.userId)
                  ? 'bg-white/10 text-white hover:bg-red-500/20 hover:text-red-400'
                  : 'bg-[#00FFFF] text-black hover:bg-[#17a34a]'
              }`}
            >
              {following.has(friend.userId) ? 'Following' : 'Follow'}
            </button>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No users found for "{query}"
        </div>
      )}
    </div>
  );
};
