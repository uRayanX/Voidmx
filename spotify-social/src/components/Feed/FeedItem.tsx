import React, { useState } from 'react';
import type { FriendActivity } from '../../types/spotify';
import { addToQueue } from '../../api/spotify';

interface FeedItemProps {
  activity: FriendActivity;
  token: string;
}

export const FeedItem: React.FC<FeedItemProps> = ({ activity, token }) => {
  const [liked, setLiked] = useState(false);
  const [queued, setQueued] = useState(false);

  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const handleQueue = async () => {
    if (!activity.track) return;
    try {
      await addToQueue(token, activity.track.uri);
      setQueued(true);
      setTimeout(() => setQueued(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  if (!activity.track) return null;

  const art = activity.track.album.images[0]?.url;

  return (
    <div className="bg-[#141414] rounded-xl p-4 flex gap-4 hover:bg-[#1a1a1a] transition-colors group">
      {/* Avatar */}
      <div className="relative">
        <img src={activity.avatarUrl} alt={activity.displayName} className="w-10 h-10 rounded-full object-cover" />
        <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-[#00FFFF] rounded-full border-2 border-[#141414]" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-sm font-medium text-white">{activity.displayName}</span>
            <span className="text-gray-400 text-sm"> is listening to</span>
          </div>
          <span className="text-xs text-gray-500 shrink-0">{timeAgo(activity.timestamp)}</span>
        </div>

        {/* Track Card */}
        <div className="mt-2 flex items-center gap-3 bg-[#0d0d0d] rounded-lg p-2">
          <img src={art} alt="" className="w-12 h-12 rounded object-cover" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{activity.track.name}</p>
            <p className="text-xs text-gray-400 truncate">{activity.track.artists.map((a: any) => a.name).join(', ')}</p>
            <p className="text-xs text-gray-500 truncate">{activity.track.album.name}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={() => setLiked(l => !l)}
            className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full transition-all ${
              liked ? 'bg-[#00FFFF]/20 text-[#00FFFF]' : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            {liked ? 'Liked' : 'Unliked'}
          </button>
          <button
            onClick={handleQueue}
            disabled={queued}
            className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full transition-all ${
              queued ? 'bg-[#00FFFF]/20 text-[#00FFFF]' : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            {queued ? '✓ Added' : '+ Play this too'}
          </button>
        </div>
      </div>
    </div>
  );
};
