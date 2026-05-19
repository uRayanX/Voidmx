const http = require('http');

const CLIENT_ID = "SnXphZybGTJqmmEV";
const CLIENT_SECRET = "sKuK4Bwng3VA6ao6adyzRVsgPqHZaUkPaZnnxNqvHHI=";

async function authorize() {
  console.log("\n======================================================");
  console.log("Attempting Client Credentials fallback (app-only token)...");
  
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
      grant_type: 'client_credentials'
    }).toString()
  });

  const tokenData = await tokenRes.json();
  if (tokenRes.ok) {
    console.log('\n✅ SUCCESS! Client Credentials token generated:\n');
    console.log(tokenData.access_token);
    console.log('\nTesting stream access with this token...');
    
    // Quick test against the stream API
    const testRes = await fetch('https://api.tidal.com/v1/tracks/77550461/playbackinfopostpaywall?audioquality=LOSSLESS&playbackmode=OFFLINE&assetpresentation=FULL&countryCode=MX', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });
    
    console.log(`Stream API Response: ${testRes.status}`);
  } else {
    console.error('\nError exchanging token:', tokenData);
  }
}

authorize();
