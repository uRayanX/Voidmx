const fs = require('fs');

['.env', '.env.example'].forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes('VITE_TIDAL_CLIENT_ID')) {
      content += '\n# Grab your client ID from the Tidal Developer Dashboard\nVITE_TIDAL_CLIENT_ID=SnXphZybGTJqmmEV\n';
      fs.writeFileSync(file, content);
    }
  }
});
