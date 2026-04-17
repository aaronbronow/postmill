import * as wmill from 'windmill-client';

async function exchangeToken() {
  console.log("🔄 Threads Token Exchange Utility");

  let accessToken = process.env.THREADS_ACCESS_TOKEN;
  try {
    if (!accessToken || accessToken === 'your-threads-access-token') {
      accessToken = await wmill.getVariable('u/aaron/THREADS_ACCESS_TOKEN');
    }
  } catch (e) {}

  if (!accessToken) {
    console.error("❌ No THREADS_ACCESS_TOKEN found in .env or Windmill variables.");
    process.exit(1);
  }

  const appSecret = process.env.THREADS_APP_SECRET;
  if (!appSecret) {
    console.error("❌ THREADS_APP_SECRET not found in environment.");
    console.log("\nTo use this script:");
    console.log("THREADS_APP_SECRET=your_secret_here bun exchange_threads_token.ts");
    process.exit(1);
  }

  console.log(`Using token starting with: ${accessToken.substring(0, 10)}...`);
  
  const url = `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${appSecret}&access_token=${accessToken}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error("❌ Exchange failed:", JSON.stringify(data.error, null, 2));
    } else {
      console.log("\n✅ SUCCESS! Long-lived token acquired.");
      console.log("-----------------------------------------");
      console.log(`Token: ${data.access_token}`);
      console.log(`Expires in: ${Math.round(data.expires_in / 86400)} days`);
      console.log("-----------------------------------------");
      console.log("\nAction required:");
      console.log("1. Update THREADS_ACCESS_TOKEN in your .env file.");
      console.log("2. Update u/aaron/THREADS_ACCESS_TOKEN in Windmill.");
    }
  } catch (error) {
    console.error("❌ Request failed:", error);
  }
}

exchangeToken();
