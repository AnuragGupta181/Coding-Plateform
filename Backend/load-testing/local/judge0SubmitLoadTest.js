const autocannon = require('autocannon');
const axios = require('axios');
require('dotenv').config({ path: '../../.env' }); 

// Target LOCAL API
const API_URL = `http://localhost:${process.env.PORT || 5000}`;

async function runJudge0SubmitLoadTest() {
  console.log(`\n🚀 Initializing LOCAL Load Test for POST /api/code/submit/:testId/:questionId...`);
  console.log(`🎯 Target API: ${API_URL}`);

  try {
    console.log('🔄 Fetching a user from the database to generate a token...');
    // Directly fetch a user and generate a token
    const mongoose = require('mongoose');
    const jwt = require('jsonwebtoken');
    const config = require('../../config');
    
    await mongoose.connect(config.mongoUri, {
      maxPoolSize: 2,
    });
    
    const db = mongoose.connection.db;
    const user = await db.collection('users').findOne({});
    if (!user) {
      throw new Error('No users found in database. Please register at least one user.');
    }
    
    const token = jwt.sign({ id: user._id.toString() }, config.jwtSecret, { expiresIn: '1h' });
    // We keep the DB connected here since we need to fetch a test directly.
    console.log(`✅ Logged in successfully. Token acquired.`);

    console.log('🔄 Fetching an active test with a coding question directly from MongoDB...');
    const tests = await db.collection('tests').find({ status: 'active' }).toArray();
    
    let test = null;
    for (const t of tests) {
      if (t.codingQuestions && t.codingQuestions.length > 0) {
        test = t;
        break;
      }
    }

    if (!test) {
      await mongoose.disconnect();
      throw new Error('None of the active tests in the database have any coding questions! Add a coding question to an active test to proceed.');
    }

    const testId = test._id.toString();
    const questionId = test.codingQuestions[0]._id.toString();
    
    // Now we can safely disconnect
    await mongoose.disconnect();

    console.log('🔄 Creating a test submission...');
    const startRes = await axios.post(`${API_URL}/api/submission/start`, {
      testId: testId,
      candidateEmail: `judge0_tester_${Date.now()}@example.com`
    });
    
    const submissionId = startRes.data._id;
    console.log(`✅ Created active submission ID: ${submissionId}`);

    const targetUrl = `${API_URL}/api/code/submit/${testId}/${questionId}`;
    console.log(`\n🔥 EXTREME TEST: Blasting ${targetUrl} with 300 students submitting exactly at the same time...`);
    
    // A simple JS submission
    const sourceCode = `console.log("Hello from submission");`;
    const language = `javascript`;

    const instance = autocannon({
      url: targetUrl,
      connections: 300, 
      amount: 300, 
      timeout: 90, // Give Judge0 and the Node event loop up to 90 seconds to process the queue without aborting
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        sourceCode: sourceCode,
        language: language,
        submissionId: submissionId
      })
    }, (err, result) => {
      if (err) {
        console.error('\n❌ Load test failed:', err);
        return;
      }
      
      console.log('\n📊 --- TEST RESULTS (JUDGE0 SUBMIT) ---');
      console.log(`Total Requests Sent: ${result.requests.total}`);
      console.log(`Requests/Sec:        ${result.requests.average}`);
      console.log(`Average Latency:     ${result.latency.average} ms`);
      console.log(`Max Latency:         ${result.latency.max} ms`);
      console.log(`Successful (2xx):    ${result['2xx']}`);
      console.log(`Total Errors (500s): ${result.non2xx}`);
      console.log(`Timeouts:            ${result.timeouts}`);
      
      if (result.non2xx > 0 || result.timeouts > 0) {
        console.log('\n⚠️ WARNING: Judge0 code submission struggled. Check logs for details.');
      } else {
        console.log('\n✅ SUCCESS: Perfectly handled Judge0 concurrent code submissions!');
      }
    });

    autocannon.track(instance, { renderProgressBar: true });
    
  } catch (error) {
    console.error('❌ Error setting up test:', error.message);
  }
}

runJudge0SubmitLoadTest();
