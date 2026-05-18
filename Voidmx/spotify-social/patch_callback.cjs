const fs = require('fs');
let code = fs.readFileSync('src/auth/TidalCallback.tsx', 'utf8');

// Replace expires_in: 0 with expires_in: 604800 (7 days) or some large value so the UI is happy
code = code.replace(/expires_in:\s*0,/, 'expires_in: 604800, // Tell UI it is valid for 7 days (SDK handles actual refresh)');

fs.writeFileSync('src/auth/TidalCallback.tsx', code);
