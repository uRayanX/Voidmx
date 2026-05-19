const fs = require('fs');
let code = fs.readFileSync('src/main.tsx', 'utf8');

if (!code.includes('initializeTidalAuth')) {
  code = "import { initializeTidalAuth } from './auth/initTidal';\n" + code;
  code = code.replace('initCorsBypass();', 'initCorsBypass();\ninitializeTidalAuth();');
  fs.writeFileSync('src/main.tsx', code);
}
