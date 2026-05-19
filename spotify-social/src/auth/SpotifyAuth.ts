export const getStoredToken = () => null;
export const getRefreshToken = () => null;
export const storeTokens = (_tokens: any) => {};
export const clearTokens = () => {};
export const refreshAccessToken = async (_refresh: any) => ({ access_token: 'dummy' });
export const exchangeCodeForToken = async (_code: any) => ({ access_token: 'dummy' });
