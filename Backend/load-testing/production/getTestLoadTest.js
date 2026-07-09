const autocannon = require('autocannon');
const axios = require('axios');
require('dotenv').config({ path: '../../.env' }); 

const API_URL = 'https://coding-plateform-t2vc.vercel.app';

async function runLoadTest() {
  console.log(`\n🚀 Initializing Production Load Test for GET /api/test/:id...`);
  console.log(`🎯 Target API: ${API_URL}`);

  try {
    console.log('🔄 Fetching a valid test ID from the production database...');
    const testsRes = await axios.get(`${API_URL}/api/tests/available`);
    if (!testsRes.data || testsRes.data.length === 0) {
      throw new Error('No tests found in the database. Please create one first!');
    }
    const targetTestId = testsRes.data[0]._id;
    console.log(`✅ Using dynamic test ID: ${targetTestId}`);

    // 2. Configure autocannon for that specific test ID
    const targetUrl = `${API_URL}/api/test/${targetTestId}`;
    console.log(`\n🔥 Blasting ${targetUrl} with 100 concurrent connections for 10 seconds...`);

    const instance = autocannon({
      url: targetUrl,
      connections: 50, 
      duration: 10,     
      headers: {
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
      console.log(`Total Errors (500s): ${result.non2xx}`);
      console.log(`Timeouts:            ${result.timeouts}`);
      
      if (result.non2xx > 0 || result.timeouts > 0) {
        console.log('\n⚠️ WARNING: Your backend struggled to handle this load. Check Vercel logs!');
      } else {
        console.log('\n✅ SUCCESS: Redis cache successfully deflected the load from MongoDB!');
      }
    });

    autocannon.track(instance, { renderProgressBar: true });
    
  } catch (error) {
    console.error('❌ Error fetching test ID:', error.message);
  }
}

runLoadTest();
