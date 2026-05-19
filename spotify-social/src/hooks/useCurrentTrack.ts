// This hook is no longer needed in the TIDAL version as playback state
// is managed entirely by the Zustand playerStore (updated by usePlayer).
// Keeping the file to avoid breaking any imports, but it does nothing.
export function useCurrentTrack() {
  return { state: null, loading: false, error: null, refetch: () => {} };
}
