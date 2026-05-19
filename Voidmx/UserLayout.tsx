import React from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string; // Optional property
}

interface UserProfileProps {
  user: User;
}

export const UserProfile: React.FC<UserProfileProps> = ({ user }) => {
  return (
    <div className="profile-card">
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt={`${user.name}'s avatar`} className="avatar" />
      ) : (
        <div className="avatar-placeholder">No Image</div>
      )}
      <h2>{user.name}</h2>
      <p>Contact: {user.email}</p>
    </div>
  );
};