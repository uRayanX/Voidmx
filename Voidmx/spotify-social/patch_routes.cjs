const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('TidalCallback')) {
  code = "import { TidalCallback } from './auth/TidalCallback';\n" + code;
  code = code.replace('<Route path="/settings" element={<Settings />} />', 
    '<Route path="/settings" element={<Settings />} />\n          <Route path="/callback" element={<TidalCallback />} />');
  fs.writeFileSync('src/App.tsx', code);
}
