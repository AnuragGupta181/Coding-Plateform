require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const autocannon = require('autocannon');

// Configuration - Reads from .env or defaults to VERCEL PRODUCTION URL
const TARGET_URL = process.env.PROD_API_URL || 'https://your-production-api.vercel.app/api/some-route-here'; 
const DURATION = 10; // Test duration in seconds
const CONCURRENT_USERS = 100; // Concurrent connections

async function run() {
  console.log(`🚀 Starting PRODUCTION HTTP load test on ${TARGET_URL}...`);
  console.log(`👥 Simulating ${CONCURRENT_USERS} concurrent users for ${DURATION} seconds.\n`);
  console.log(`⚠️ REMINDER: Open your VERCEL DASHBOARD > Logs to monitor for Timeouts and Rate Limits! ⚠️\n`);

  // Run Autocannon without local pidusage/mongostat (since the server is in the cloud)
  const instance = autocannon({
    url: TARGET_URL,
    connections: CONCURRENT_USERS,
    duration: DURATION,
  }, (err, result) => {
    
    if (err) {
      console.error('❌ Autocannon error:', err);
      return;
    }

    console.log('\n--- PRODUCTION LOAD TEST COMPLETE ---');
    console.log(`Total Requests Sent: ${result.requests.total}`);
    console.log(`Average Requests/Sec: ${result.requests.average}`);
    console.log(`Average Latency: ${result.latency.average} ms`);
    console.log(`Errors (Timeouts/5xx): ${result.errors}`);
    
    if (result.errors > 0) {
      console.log('\n⚠️ WARNING: Vercel dropped requests. Check Vercel logs for "Function Timeout" or Rate Limiting.');
    } else {
       console.log('\n✅ SUCCESS: No requests were dropped by Vercel.');
    }
  });

  autocannon.track(instance, { renderProgressBar: true });
}

run();
