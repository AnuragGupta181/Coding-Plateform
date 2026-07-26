const autocannon = require('autocannon');
require('dotenv').config({ path: '../../.env' });

const API_URL = process.env.API_URL || 'https://api.nextgen.kaarma.studio';
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS || '50', 10);
const AMOUNT = parseInt(process.env.AMOUNT || '2000', 10);

async function runAuthLoadTest() {
  console.log(`\n🔑 Initializing PRODUCTION Load Test for POST /api/auth/login...`);
  console.log(`🎯 Target API: ${API_URL}/api/auth/login`);
  console.log(`🔥 Sending ${AMOUNT} requests across ${CONCURRENT_USERS} connections...`);

  const instance = autocannon({
    url: `${API_URL}/api/auth/login`,
    connections: CONCURRENT_USERS,
    amount: AMOUNT,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    body: JSON.stringify({
      email: 'sarthakkaushik927@gmail.com',
      password: 'password123'
    })
  }, (err, result) => {
    if (err) {
      console.error('\n❌ Load test failed:', err);
      return;
    }

    console.log('\n📊 --- AUTHENTICATION LOAD TEST RESULTS ---');
    console.log(`Target:              ${API_URL}/api/auth/login`);
    console.log(`Total Requests Sent: ${result.requests.total}`);
    console.log(`Requests/Sec:        ${result.requests.average}`);
    console.log(`Average Latency:     ${result.latency.average} ms`);
    console.log(`50th Percentile:     ${result.latency.p50} ms`);
    console.log(`99th Percentile:     ${result.latency.p99} ms`);
    console.log(`Successful (2xx):    ${result['2xx'] || 0}`);
    console.log(`Client Errors (4xx): ${result['4xx'] || 0}`);
    console.log(`Server Errors (5xx): ${result['5xx'] || 0}`);
    console.log(`Timeouts:            ${result.timeouts}`);

    if (result['5xx'] === 0 && result.timeouts === 0) {
      console.log('\n✅ SUCCESS: Auth login endpoint handled the load with zero crashes!');
    } else {
      console.log('\n⚠️ WARNING: Auth endpoint experienced timeouts or server errors.');
    }
  });

  autocannon.track(instance, { renderProgressBar: true });
}

runAuthLoadTest();
