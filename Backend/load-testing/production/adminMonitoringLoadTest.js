const autocannon = require('autocannon');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '../../.env' });

const API_URL = process.env.API_URL || 'https://api.nextgen.kaarma.studio';
const JWT_SECRET = process.env.JWT_SECRET || 'd7e069017ddb5613a6231bff1c0540b35559a1806839514a378e527b8aa9c816';
const token = jwt.sign({ id: '6a369defd17d256a5583944b', role: 'admin' }, JWT_SECRET);

const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS || '50', 10);
const AMOUNT = parseInt(process.env.AMOUNT || '2000', 10);

async function runAdminMonitoringLoadTest() {
  const targetUrl = `${API_URL}/api/query/admin/tests/history`;
  console.log(`\n👑 Initializing PRODUCTION Load Test for GET /api/query/admin/tests/history...`);
  console.log(`🎯 Target API: ${targetUrl}`);
  console.log(`🔥 Sending ${AMOUNT} requests across ${CONCURRENT_USERS} connections...`);

  const instance = autocannon({
    url: targetUrl,
    connections: CONCURRENT_USERS,
    amount: AMOUNT,
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  }, (err, result) => {
    if (err) {
      console.error('\n❌ Load test failed:', err);
      return;
    }

    console.log('\n📊 --- ADMIN MONITORING LOAD TEST RESULTS ---');
    console.log(`Target:              ${targetUrl}`);
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
      console.log('\n✅ SUCCESS: Admin monitoring dashboard endpoints handled the load cleanly!');
    } else {
      console.log('\n⚠️ WARNING: Experienced timeouts or server errors under admin load.');
    }
  });

  autocannon.track(instance, { renderProgressBar: true });
}

runAdminMonitoringLoadTest();
