const autocannon = require('autocannon');
require('dotenv').config({ path: '../../.env' }); 

const API_URL = `http://localhost:${process.env.PORT || 5000}`;

async function runSignupLoadTest() {
  console.log(`\n🚀 Initializing LOCAL Load Test for POST /api/auth/signup...`);
  console.log(`🎯 Target API: ${API_URL}`);

  // Generate a random email for each request to avoid "User already exists" errors
  let requestCounter = 0;
  
  const instance = autocannon({
    url: `${API_URL}/api/auth/signup`,
    connections: 50,
    duration: 10,     
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    setupClient: (client) => {
      // Modify the request body for every single request
      client.setBody(JSON.stringify({
        name: `Load Test Student`,
        email: `loadteststudent_${Date.now()}_${Math.random()}@example.com`,
        password: 'securepassword123'
      }));
    }
  }, (err, result) => {
    if (err) {
      console.error('\n❌ Load test failed:', err);
      return;
    }
    
    console.log('\n📊 --- TEST RESULTS (SIGNUP) ---');
    console.log(`Total Requests Sent: ${result.requests.total}`);
    console.log(`Requests/Sec:        ${result.requests.average}`);
    console.log(`Average Latency:     ${result.latency.average} ms`);
    console.log(`Max Latency:         ${result.latency.max} ms`);
    console.log(`Total Errors (500s): ${result.non2xx}`);
  });

  autocannon.track(instance, { renderProgressBar: true });
}

runSignupLoadTest();
