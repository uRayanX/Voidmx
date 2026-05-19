const CLIENT_ID = "SnXphZybGTJqmmEV";
const CLIENT_SECRET = "sKuK4Bwng3VA6ao6adyzRVsgPqHZaUkPaZnnxNqvHHI=";

async function authorize() {
  const auth = 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  console.log("Starting Device Auth...");
  
  const initRes = await fetch('https://auth.tidal.com/v1/oauth2/device_authorization', {
    method: 'POST',
    headers: {
      'Authorization': auth,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      scope: 'r_usr+w_usr+w_sub'
    }).toString(),
  });

  const initData = await initRes.json();
  if (!initRes.ok) {
    console.error('Init failed:', initData);
    return;
  }

  console.log(`\n======================================================`);
  console.log(`ACTION REQUIRED: Please log in to Tidal and authorize!`);
  console.log(`Open this link in your browser:\n`);
  console.log(`👉 https://${initData.verificationUriComplete || 'link.tidal.com/' + initData.userCode}`);
  console.log(`======================================================\n`);

  process.stdout.write('Waiting for authorization (Polling every 5 seconds)');

  const interval = initData.interval || 5;
  while (true) {
    await new Promise(r => setTimeout(r, interval * 1000));
    process.stdout.write('.');
    
    const tokenRes = await fetch('https://auth.tidal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        device_code: initData.deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        scope: 'r_usr+w_usr+w_sub'
      }).toString()
    });
    
    const tokenData = await tokenRes.json();
    if (tokenRes.status === 200) {
      console.log('\n\n✅ SUCCESS! Copy your new fully-authorized token:\n');
      console.log('──────────────────────────────────────────────────────');
      console.log(tokenData.access_token);
      console.log('──────────────────────────────────────────────────────\n');
      console.log(`Refresh Token: ${tokenData.refresh_token}`);
      console.log(`Expires in: ${tokenData.expires_in} seconds`);
      break;
    } else if (tokenData.error !== 'authorization_pending') {
      console.error('\nError:', tokenData);
      break;
    }
  }
}

authorize();