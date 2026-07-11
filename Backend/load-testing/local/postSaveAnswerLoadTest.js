const autocannon = require('autocannon');
const axios = require('axios');
require('dotenv').config({ path: '../../.env' }); 

// Target LOCAL API (or override via API_URL)
const API_URL = process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`;

async function runSaveAnswerLoadTest() {
  console.log(`\n🚀 Initializing REALISTIC Load Test for POST /api/submission/:id/save-answer...`);
  console.log(`🎯 Target API: ${API_URL}`);

  try {
    console.log('🔄 Fetching a valid test ID from the local database...');
    const testsRes = await axios.get(`${API_URL}/api/tests/available`);
    if (!testsRes.data || testsRes.data.length === 0) {
      throw new Error('No tests found in the database. Please create one first!');
    }
    const testId = testsRes.data[0]._id;
    
    const NUM_STUDENTS = 400;
    console.log(`\n🔄 Generating ${NUM_STUDENTS} unique student submissions to prevent MongoDB document locks...`);
    
    // Create students in batches so we don't overwhelm the DB before the test starts
    const submissionIds = [];
    for (let i = 0; i < NUM_STUDENTS; i++) {
      const startRes = await axios.post(`${API_URL}/api/submission/start`, {
        testId: testId,
        candidateEmail: `loadtester_${Date.now()}_${i}@example.com`
      });
      submissionIds.push(startRes.data._id);
      process.stdout.write(`\rCreated: ${i + 1}/${NUM_STUDENTS}`);
    }
    console.log(`\n✅ Successfully generated ${submissionIds.length} unique submission documents.`);

    console.log(`\n🔥 Blasting API with 100 concurrent students saving answers independently for 10 seconds...`);

    // Map each submission to its own unique API endpoint
    const distinctRequests = submissionIds.map(id => ({
      method: 'POST',
      path: `/api/submission/${id}/save-answer`,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        questionId: 'question_1',
        answerIndex: Math.floor(Math.random() * 4) // Pick random answer
      })
    }));

    const instance = autocannon({
      url: API_URL, // Base URL
      connections: 50, 
      duration: 10,
      requests: distinctRequests // Autocannon will round-robin cycle through these 100 unique endpoints!
    }, (err, result) => {
      if (err) {
        console.error('\n❌ Load test failed:', err);
        return;
      }
      
      console.log('\n📊 --- TEST RESULTS (REALISTIC SAVE ANSWER) ---');
      console.log(`Total Requests Sent: ${result.requests.total}`);
      console.log(`Requests/Sec:        ${result.requests.average}`);
      console.log(`Average Latency:     ${result.latency.average} ms`);
      console.log(`Max Latency:         ${result.latency.max} ms`);
      console.log(`Successful (2xx):    ${result['2xx']}`);
      console.log(`Total Errors (500s): ${result.non2xx}`);
      console.log(`Timeouts:            ${result.timeouts}`);
      
      if (result.non2xx > 0 || result.timeouts > 0) {
        console.log('\n⚠️ WARNING: Some requests still failed. Your DB limits might be maxed out.');
      } else {
        console.log('\n✅ SUCCESS: MongoDB perfectly handled massive concurrent document writes across different documents without any locking errors!');
      }
    });

    autocannon.track(instance, { renderProgressBar: true });
    
  } catch (error) {
    console.error('\n❌ Error setting up test:', error.response?.data || error.message);
  }
}

runSaveAnswerLoadTest();
