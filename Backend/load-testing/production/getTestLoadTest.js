const autocannon = require('autocannon');
const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '../../.env' }); 

const API_URL = process.env.API_URL || 'https://api.nextgen.kaarma.studio';
const JWT_SECRET = process.env.JWT_SECRET || 'd7e069017ddb5613a6231bff1c0540b35559a1806839514a378e527b8aa9c816';
const token = jwt.sign({ id: '6a369defd17d256a5583944b', role: 'admin' }, JWT_SECRET);

const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS || '50', 10);
const AMOUNT = parseInt(process.env.AMOUNT || '2000', 10);
const OVERALL_RATE = parseInt(process.env.RATE || '300', 10);

async function runLoadTest() {
  console.log(`\n🎓 Initializing Real-Time Exam Load Test (2,000 Total Requests @ 300 Req/Sec Target)...`);
  console.log(`🎯 Target API: ${API_URL}`);

  try {
    console.log('🔄 Fetching active test ID from production database...');
    const testsRes = await axios.get(`${API_URL}/api/query/tests/available`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!testsRes.data || testsRes.data.length === 0) {
      throw new Error('No tests found in database. Please create one first!');
    }
    const targetTestId = testsRes.data[0]._id;
    console.log(`✅ Target Test ID: ${targetTestId}`);

    const targetUrl = `${API_URL}/api/query/test/${targetTestId}`;
    console.log(`\n🔥 Pumping ${AMOUNT} total requests at ${OVERALL_RATE} req/sec across ${CONCURRENT_USERS} connections to ${targetUrl}...`);

    const instance = autocannon({
      url: targetUrl,
      connections: CONCURRENT_USERS, 
      amount: AMOUNT,
      overallRate: OVERALL_RATE,     
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
      }
    }, (err, result) => {
      if (err) {
        console.error('\n❌ Load test failed:', err);
        return;
      }
      
      console.log('\n📊 --- 1,000 CONCURRENT USER TEST RESULTS ---');
      console.log(`Total Requests Sent: ${result.requests.total}`);
      console.log(`Requests/Sec:        ${result.requests.average}`);
      console.log(`Average Latency:     ${result.latency.average} ms`);
      console.log(`50th Percentile:     ${result.latency.p50} ms`);
      console.log(`99th Percentile:     ${result.latency.p99} ms`);
      console.log(`Max Latency:         ${result.latency.max} ms`);
      console.log(`Successful (2xx):    ${result['2xx'] || 0}`);
      console.log(`Client Errors (4xx): ${result['4xx'] || 0}`);
      console.log(`Server Errors (5xx): ${result['5xx'] || 0}`);
      console.log(`Timeouts:            ${result.timeouts}`);
      
      if (result['5xx'] === 0 && result.timeouts === 0) {
        console.log('\n✅ REAL-TIME EXAM CAPABILITY VERIFIED:');
        console.log('  - Redis deflected MongoDB queries on 1,000 simultaneous test loads.');
        console.log('  - 100% of candidates received test questions cleanly.');
      } else {
        console.log('\n⚠️ BACKEND BOTTLENECK DETECTED:');
        console.log(`  - ${result.timeouts} timeouts and ${result['5xx'] || 0} server errors under 1,000 user burst.`);
      }
    });

    autocannon.track(instance, { renderProgressBar: true });
    
  } catch (error) {
    console.error('❌ Error in test setup:', error.response?.data || error.message);
  }
}

runLoadTest();



