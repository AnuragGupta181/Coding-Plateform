require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const autocannon = require('autocannon');
const jwt = require('jsonwebtoken');

const API_BASE = process.env.API_URL || 'https://api.nextgen.kaarma.studio';
const TARGET_URL = `${API_BASE}/api/query/tests/available`; 
const DURATION = 10; 
const CONCURRENT_USERS = 50; 

const JWT_SECRET = process.env.JWT_SECRET || 'd7e069017ddb5613a6231bff1c0540b35559a1806839514a378e527b8aa9c816';
const token = jwt.sign({ id: '6a369defd17d256a5583944b', role: 'admin' }, JWT_SECRET);

async function run() {
  console.log(`🚀 Starting PRODUCTION HTTP load test on ${TARGET_URL}...`);
  console.log(`👥 Simulating ${CONCURRENT_USERS} concurrent users for ${DURATION} seconds.\n`);

  const instance = autocannon({
    url: TARGET_URL,
    connections: CONCURRENT_USERS,
    duration: DURATION,
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive'
    }
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
    console.log(`Successful (2xx):    ${result['2xx'] || 0}`);
    console.log(`Client Errors (4xx): ${result['4xx'] || 0}`);
    console.log(`Server Errors (5xx): ${result['5xx'] || 0}`);
    console.log(`Timeouts:            ${result.timeouts}`);
    
    if (result['4xx'] > 0) {
      console.log('\nℹ️ NOTE: 4xx responses are rate limits (HTTP 429: Too Many Requests) protecting your backend.');
    }
    if (result['5xx'] > 0 || result.timeouts > 0) {
      console.log('\n⚠️ WARNING: Backend had server errors or timeouts under load.');
    } else {
       console.log('\n✅ SUCCESS: All non-rate-limited requests served smoothly.');
    }
  });

  autocannon.track(instance, { renderProgressBar: true });
}

run();

