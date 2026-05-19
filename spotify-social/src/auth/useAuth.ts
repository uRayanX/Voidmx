import { useState, useEffect, useCallback } from 'react';
import {
  getStoredToken,
  getRefreshToken,
  storeTokens,
  clearTokens,
  refreshAccessToken,
  exchangeCodeForToken,
} from './SpotifyAuth';

interface AuthState {
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    accessToken: getStoredToken(),
    isAuthenticated: !!getStoredToken(),
    isLoading: false,
    error: null,
  });

  const handleCallback = useCallback(async (code: string) => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    try {
      const tokens = await exchangeCodeForToken(code);
      storeTokens(tokens);
      setState({ accessToken: tokens.access_token, isAuthenticated: true, isLoading: false, error: null });
    } catch (e) {
      setState(s => ({ ...s, isLoading: false, error: (e as Error).message }));
    }
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setState({ accessToken: null, isAuthenticated: false, isLoading: false, error: null });
  }, []);

  // Auto-refresh token when close to expiry
  useEffect(() => {
    const interval = setInterval(async () => {
      const token = getStoredToken();
      if (!token) {
        const refresh = getRefreshToken();
        if (refresh) {
          try {
            const tokens = await refreshAccessToken(refresh);
            storeTokens(tokens);
            setState(s => ({ ...s, accessToken: tokens.access_token, isAuthenticated: true }));
          } catch {
            clearTokens();
            setState({ accessToken: null, isAuthenticated: false, isLoading: false, error: 'Session expired' });
          }
        }
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  return { ...state, handleCallback, logout };
}
