const fs = require('fs');
let code = fs.readFileSync('src/api/tidalAuth.ts', 'utf8');

// Update getValidAccessToken to use the official SDK as the fallback
code = code.replace(
  /export async function getValidAccessToken\(\): Promise<string \| null> \{[\s\S]*?return localStorage\.getItem\(KEYS\.ACCESS\) \|\| getCookie\(KEYS\.ACCESS\);\n\}/,
  `export async function getValidAccessToken(): Promise<string | null> {
  try {
    const { credentialsProvider } = await import('@tidal-music/auth');
    const creds = await credentialsProvider.getCredentials();
    if (creds && creds.token) {
      return creds.token;
    }
  } catch (e) {
    // Falls through to classic token system below if SDK errors out
  }

  const token = getTidalToken();
  if (!token) return null;

  if (isTidalTokenExpired()) {
    if (token.refreshToken) {
      const ok = await refreshTidalToken();
      if (!ok) return null;
    } else {
      // No refresh token (manual paste) — token is genuinely expired
      return null;
    }
  }

  return localStorage.getItem(KEYS.ACCESS) || getCookie(KEYS.ACCESS);
}`
);

fs.writeFileSync('src/api/tidalAuth.ts', code);
