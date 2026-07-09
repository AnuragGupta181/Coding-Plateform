require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const autocannon = require('autocannon');

// Production Test Configuration for GET /api/tests/available
// Ensure PROD_API_URL in your .env is set to your actual Vercel domain, e.g.:
// PROD_API_URL=https://my-app.vercel.app/api/tests/available
const TARGET_URL = process.env.PROD_API_URL || 'https://your-production-api.vercel.app/api/tests/available'; 
const DURATION = 10; 
const CONCURRENT_USERS = 100; // Simulating 100 users for production

async function run() {
  console.log(`🚀 Starting PRODUCTION HTTP load test on ${TARGET_URL}...`);
  console.log(`👥 Simulating ${CONCURRENT_USERS} concurrent users for ${DURATION} seconds.\n`);
  console.log(`⚠️ REMINDER: Open your VERCEL DASHBOARD > Logs to monitor for Timeouts and Rate Limits! ⚠️\n`);

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
    console.log(`Target: ${TARGET_URL}`);
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
