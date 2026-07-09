const autocannon = require('autocannon');
const axios = require('axios');
require('dotenv').config({ path: '../../.env' }); 

const API_URL = 'https://coding-plateform-t2vc.vercel.app';

async function runProductionSaveAnswerLoadTest() {
  console.log(`\n🚀 Initializing PRODUCTION Load Test for POST /api/submission/:id/save-answer...`);
  console.log(`🎯 Target API: ${API_URL}`);

  try {
    // 1. Fetch a valid test ID
    console.log('🔄 Fetching a valid test ID from the production database...');
    const testsRes = await axios.get(`${API_URL}/api/tests/available`);
    if (!testsRes.data || testsRes.data.length === 0) {
      throw new Error('No tests found in the database. Please create one first!');
    }
    const testId = testsRes.data[0]._id;

    // 2. Create a dummy submission
    console.log('🔄 Creating a temporary test submission...');
    const startRes = await axios.post(`${API_URL}/api/submission/start`, {
      testId: testId,
      candidateEmail: `prod_loadtester_${Date.now()}@example.com`
    });
    
    const submissionId = startRes.data._id;
    console.log(`✅ Created active submission ID: ${submissionId}`);

    const targetUrl = `${API_URL}/api/submission/${submissionId}/save-answer`;
    
    // Using 30 connections to avoid instantly crashing the MongoDB Atlas free tier
    const connections = 30;
    console.log(`\n🔥 Blasting ${targetUrl} with ${connections} concurrent connections for 10 seconds...`);

    const instance = autocannon({
      url: targetUrl,
      connections: connections, 
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
      
      console.log('\n📊 --- TEST RESULTS (PROD: SAVE ANSWER) ---');
      console.log(`Total Requests Sent: ${result.requests.total}`);
      console.log(`Requests/Sec:        ${result.requests.average}`);
      console.log(`Average Latency:     ${result.latency.average} ms`);
      console.log(`Max Latency:         ${result.latency.max} ms`);
      console.log(`Successful (2xx):    ${result['2xx']}`);
      console.log(`Total Errors (500s): ${result.non2xx}`);
      console.log(`Timeouts:            ${result.timeouts}`);
      
      if (result.non2xx > 0 || result.timeouts > 0) {
        console.log('\n⚠️ WARNING: Production MongoDB struggled to handle the concurrent writes.');
      } else {
        console.log('\n✅ SUCCESS: Production MongoDB handled the writes perfectly!');
      }
    });

    autocannon.track(instance, { renderProgressBar: true });
    
  } catch (error) {
    console.error('❌ Error setting up test:', error.response?.data || error.message);
  }
}

runProductionSaveAnswerLoadTest();
