const crypto = require('crypto');
const http = require('http');
const url = require('url');

const CLIENT_ID = "SnXphZybGTJqmmEV";
const CLIENT_SECRET = "sKuK4Bwng3VA6ao6adyzRVsgPqHZaUkPaZnnxNqvHHI=";
const redirectUri = 'http://localhost:8989/callback';
const state = crypto.randomBytes(16).toString('base64url');

// Standard Authorization Code Flow (No PKCE)
const authUrl = `https://login.tidal.com/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=r_usr%20w_usr%20w_sub&state=${state}`;

console.log("\n======================================================");
console.log("ACTION REQUIRED: Log in to Tidal to authorize your app");
console.log("Open this link in your browser:\n");
console.log("👉 " + authUrl);
console.log("======================================================\n");
console.log("Waiting for callback on localhost:8989...");

const server = http.createServer(async (req, res) => {
  const reqUrl = url.parse(req.url, true);
  
  if (reqUrl.pathname === '/callback') {
    const code = reqUrl.query.code;
    const returnedState = reqUrl.query.state;

    if (returnedState !== state) {
      res.writeHead(400);
      res.end('State mismatch');
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>Success!</h1><p>You can close this window and return to VS Code.</p><script>window.close()</script>');
    
    server.close();

    const auth = 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    
    const tokenRes = await fetch('https://auth.tidal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      }).toString()
    });

    const tokenData = await tokenRes.json();
    if (tokenRes.ok) {
      console.log('\n\n✅ SUCCESS! Copy your new fully-authorized token:\n');
      console.log('──────────────────────────────────────────────────────');
      console.log(tokenData.access_token);
      console.log('──────────────────────────────────────────────────────\n');
      console.log(`Refresh Token: ${tokenData.refresh_token}`);
      console.log(`Expires in: ${tokenData.expires_in} seconds`);
    } else {
      console.error('\nError exchanging token:', tokenData);
    }
    process.exit(0);
  }
});

server.listen(8989, () => {
  // waiting
});
