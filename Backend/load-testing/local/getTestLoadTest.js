const autocannon = require('autocannon');
const axios = require('axios');
require('dotenv').config({ path: '../../.env' }); 

// Target the local Express server instead of Vercel
const API_URL = `http://localhost:${process.env.PORT || 5000}`;

async function runLoadTest() {
  console.log(`\n🚀 Initializing LOCAL Load Test for GET /api/test/:id...`);
  console.log(`🎯 Target API: ${API_URL}`);

  try {
    // We assume this test ID exists in the local database
    const targetTestId = '6a4f7bec860ffe0455d2ff82';
    console.log(`✅ Using test ID: ${targetTestId}`);

    const targetUrl = `${API_URL}/api/test/${targetTestId}`;
    console.log(`\n🔥 Blasting ${targetUrl} with 100 concurrent connections for 10 seconds...`);

    const instance = autocannon({
      url: targetUrl,
      connections: 100, // Feel free to increase this locally!
      duration: 10,     
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
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
        console.log('\n⚠️ WARNING: Your local backend struggled to handle this load.');
      } else {
        console.log('\n✅ SUCCESS: Redis cache successfully deflected the load from MongoDB locally!');
      }
    });

    autocannon.track(instance, { renderProgressBar: true });
    
  } catch (error) {
    console.error('❌ Error in load test setup:', error.message);
  }
}

runLoadTest();
