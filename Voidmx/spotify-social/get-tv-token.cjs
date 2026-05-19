const CLIENT_ID = "OQHDMoLASO4oRUqN";
const CLIENT_SECRET = "lFGesn3CujisefBTDrKjSA==";
const auth = 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

async function authorize() {
  const initRes = await fetch("https://auth.tidal.com/v1/oauth2/device_authorization", {
    method: "POST",
    headers: {
      "Authorization": auth,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      scope: "r_usr+w_usr+w_sub"
    }).toString()
  });
  
  const data = await initRes.json();
  
  if (!initRes.ok) {
    console.error("Failed to init:", data);
    return;
  }

  // Tidal returns snake_case for this endpoint
  const userCode = data.user_code || data.userCode;
  const deviceCode = data.device_code || data.deviceCode;

  console.log(`\n======================================================`);
  console.log(`Open this link on ANY device: https://link.tidal.com/${userCode}`);
  console.log(`Waiting for you to log in...`);
  console.log(`======================================================\n`);
  
  while (true) {
    await new Promise(r => setTimeout(r, 5000));
    process.stdout.write(".");
    
    const tokenRes = await fetch("https://auth.tidal.com/v1/oauth2/token", {
      method: "POST",
      headers: {
        "Authorization": auth,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        scope: "r_usr+w_usr+w_sub"
      }).toString()
    });
    
    const tokenData = await tokenRes.json();
    
    if (tokenRes.status === 200) {
      console.log("\n\n✅ SUCCESS! Save this valid token:\n");
      console.log(tokenData.access_token);
      console.log("\n======================================================\n");
      process.exit(0);
    } else if (tokenData.error !== 'authorization_pending') {
      console.log("\nToken fetch error:", tokenData);
      process.exit(1);
    }
  }
}

authorize();
