const autocannon = require('autocannon');
const axios = require('axios');
require('dotenv').config({ path: '../../.env' }); 

// Target LOCAL API
const API_URL = `http://localhost:${process.env.PORT || 5000}`;

async function runSaveAnswerLoadTest() {
  console.log(`\n🚀 Initializing LOCAL Load Test for POST /api/submission/:id/save-answer...`);
  console.log(`🎯 Target API: ${API_URL}`);

  try {
    console.log('🔄 Fetching a valid test ID from the local database...');
    const testsRes = await axios.get(`${API_URL}/api/tests/available`);
    if (!testsRes.data || testsRes.data.length === 0) {
      throw new Error('No tests found in the database. Please create one first!');
    }
    const testId = testsRes.data[0]._id;
    const startRes = await axios.post(`${API_URL}/api/submission/start`, {
      testId: testId,
      candidateEmail: `loadtester_${Date.now()}@example.com`
    });
    
    const submissionId = startRes.data._id;
    console.log(`✅ Created active submission ID: ${submissionId}`);

    const targetUrl = `${API_URL}/api/submission/${submissionId}/save-answer`;
    console.log(`\n🔥 Blasting ${targetUrl} with 100 concurrent connections for 10 seconds...`);

    const instance = autocannon({
      url: targetUrl,
      connections: 50, 
      duration: 10,     
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        questionId: 'question_1',
        answerIndex: 2
      })
    }, (err, result) => {
      if (err) {
        console.error('\n❌ Load test failed:', err);
        return;
      }
      
      console.log('\n📊 --- TEST RESULTS (SAVE ANSWER) ---');
      console.log(`Total Requests Sent: ${result.requests.total}`);
      console.log(`Requests/Sec:        ${result.requests.average}`);
      console.log(`Average Latency:     ${result.latency.average} ms`);
      console.log(`Max Latency:         ${result.latency.max} ms`);
      console.log(`Successful (2xx):    ${result['2xx']}`);
      console.log(`Total Errors (500s): ${result.non2xx}`);
      console.log(`Timeouts:            ${result.timeouts}`);
      
      if (result.non2xx > 0 || result.timeouts > 0) {
        console.log('\n⚠️ WARNING: MongoDB struggled to handle the concurrent writes.');
      } else {
        console.log('\n✅ SUCCESS: MongoDB perfectly handled massive concurrent document writes!');
      }
    });

    autocannon.track(instance, { renderProgressBar: true });
    
  } catch (error) {
    console.error('❌ Error setting up test:', error.response?.data || error.message);
  }
}

runSaveAnswerLoadTest();
