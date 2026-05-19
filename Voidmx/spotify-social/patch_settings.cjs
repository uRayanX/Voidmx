const fs = require('fs');
let code = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

if (!code.includes('handleTidalOAuthLogin')) {
  // Add necessary imports
  code = "import * as auth from '@tidal-music/auth';\n" + code;
  
  // Add oauth function inside Settings
  const loginFunction = `const handleTidalOAuthLogin = async () => {
    try {
      const redirectUri = window.location.origin + '/callback';
      const loginUrl = await auth.initializeLogin({ redirectUri });
      window.location.href = loginUrl;
    } catch (e) {
      console.error(e);
      setTidalError('OAuth Init failed: ' + (e as Error).message);
    }
  };`;

  code = code.replace('const handleManualToken = useCallback', loginFunction + '\n\n  const handleManualToken = useCallback');

  // Replace the rendering: Add a new button
  const oauthBtn = `
                {/* Official OAuth Login */}
                <div className="flex flex-col gap-2 rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 mb-4">
                  <p className="text-sm text-blue-100 font-medium">Connect TIDAL via OAuth</p>
                  <p className="text-xs text-blue-300/60 mb-2">Securely sign in without copying tokens manually.</p>
                  <button 
                    onClick={handleTidalOAuthLogin}
                    className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-colors text-sm"
                  >
                    Log in with TIDAL
                  </button>
                </div>
  `;
  
  code = code.replace('{/* Manual token input (shown when not connected, or when token is expired) */}', oauthBtn + '\n{/* Manual token input (shown when not connected, or when token is expired) */}');
  
  fs.writeFileSync('src/pages/Settings.tsx', code);
  console.log("Patched Settings");
}
