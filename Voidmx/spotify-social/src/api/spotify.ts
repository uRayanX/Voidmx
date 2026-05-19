export const addToQueue = async (..._args: any[]) => {};
export const seek = async (..._args: any[]) => {};
export const setVolume = async (..._args: any[]) => {};
export const getQueue = async (..._args: any[]) => ({ queue: [] });
export const getTopTracks = async (..._args: any[]) => ([] as any[]);
export const getTopArtists = async (..._args: any[]) => ([] as any[]);
export const getUserPlaylists = async (..._args: any[]) => ([] as any[]);
export const getMe = async (..._args: any[]) => null;
export type TimeRange = 'short_term' | 'medium_term' | 'long_term';
