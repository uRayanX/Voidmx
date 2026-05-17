import { useState, useCallback, useRef } from 'react';
import { searchTracks } from '../api/tidal';
import type { TidalTrack } from '../types/tidal';

export function useRecommendations() {
  const [tracks, setTracks] = useState<TidalTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const offsetRef = useRef(0);

  const fetchRecs = useCallback(async (query: string, append = false) => {
    setLoading(true);
    if (!append) offsetRef.current = 0;
    try {
      const data = await searchTracks(query, 20, offsetRef.current);
      offsetRef.current += 20;
      setTracks(prev => append ? [...prev, ...data] : data);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => { setTracks([]); offsetRef.current = 0; }, []);

  return { tracks, loading, error, fetchRecs, reset };
}
