import type { TidalTrack } from '../types/tidal';

export function updateFaviconAndTitle(track: TidalTrack | null) {
  if (!track) {
    document.title = 'Void';
    return;
  }
  document.title = `${track.title} - ${track.artists[0]?.name || 'Unknown Artist'}`;
}
