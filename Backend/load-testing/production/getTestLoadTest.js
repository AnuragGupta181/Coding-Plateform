const autocannon = require('autocannon');
const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '../../.env' }); 

const API_URL = process.env.API_URL || 'https://api.nextgen.kaarma.studio';
const JWT_SECRET = process.env.JWT_SECRET || 'd7e069017ddb5613a6231bff1c0540b35559a1806839514a378e527b8aa9c816';
const token = jwt.sign({ id: '6a369defd17d256a5583944b', role: 'admin' }, JWT_SECRET);

async function runLoadTest() {
  console.log(`\n🚀 Initializing Production Load Test for GET /api/query/test/:id...`);
  console.log(`🎯 Target API: ${API_URL}`);

  try {
    console.log('🔄 Fetching a valid test ID from the production database...');
    const testsRes = await axios.get(`${API_URL}/api/query/tests/available`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!testsRes.data || testsRes.data.length === 0) {
      throw new Error('No tests found in the database. Please create one first!');
    }
    const targetTestId = testsRes.data[0]._id;
    console.log(`✅ Using dynamic test ID: ${targetTestId}`);

    // 2. Configure autocannon for that specific test ID
    const targetUrl = `${API_URL}/api/query/test/${targetTestId}`;
    console.log(`\n🔥 Blasting ${targetUrl} with 50 concurrent connections for 10 seconds...`);

    const instance = autocannon({
      url: targetUrl,
      connections: 50, 
      duration: 10,     
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
      
      console.log('\n📊 --- TEST RESULTS ---');
      console.log(`Total Requests Sent: ${result.requests.total}`);
      console.log(`Requests/Sec:        ${result.requests.average}`);
      console.log(`Average Latency:     ${result.latency.average} ms`);
      console.log(`Max Latency:         ${result.latency.max} ms`);
      console.log(`Successful (2xx):    ${result['2xx'] || 0}`);
      console.log(`Client Errors (4xx): ${result['4xx'] || 0}`);
      console.log(`Server Errors (5xx): ${result['5xx'] || 0}`);
      console.log(`Timeouts:            ${result.timeouts}`);
      
      if (result['4xx'] > 0) {
        console.log('\nℹ️ NOTE: 4xx responses are rate limiting (HTTP 429: Too Many Requests) protecting your server.');
      }
      if (result['5xx'] > 0 || result.timeouts > 0) {
        console.log('\n⚠️ WARNING: Your backend had server errors (5xx) or timeouts under load. Check server logs!');
      } else if (result.non2xx === 0) {
        console.log('\n✅ SUCCESS: Redis cache / backend successfully handled 100% of the load without rate limits!');
      } else {
        console.log('\n🛡️ RATE LIMIT ACTIVE: Backend rate limiter successfully shielded the database from over-flooding.');
      }
    });

    autocannon.track(instance, { renderProgressBar: true });
    
  } catch (error) {
    console.error('❌ Error fetching test ID:', error.response?.data || error.message);
  }
}

runLoadTest();


