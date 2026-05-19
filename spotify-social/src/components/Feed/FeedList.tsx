import React from 'react';
import { FeedItem } from './FeedItem';
import type { FriendActivity } from '../../types/spotify';

interface FeedListProps {
  activities: FriendActivity[];
  token: string;
}

export const FeedList: React.FC<FeedListProps> = ({ activities, token }) => {
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-4xl mb-4"></p>
        <p className="text-gray-400 text-lg">No activity yet</p>
        <p className="text-gray-500 text-sm mt-1">Follow friends to see what they're listening to</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map(a => (
        <FeedItem key={a.userId} activity={a} token={token} />
      ))}
    </div>
  );
};
