const autocannon = require('autocannon');
const axios = require('axios');
require('dotenv').config({ path: '../../.env' }); 

// Target LOCAL API
const API_URL = `http://localhost:${process.env.PORT || 5000}`;

async function runJudge0LoadTest() {
  console.log(`\n🚀 Initializing LOCAL Load Test for POST /api/code/run...`);
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
    await mongoose.disconnect();
    console.log(`✅ Logged in successfully. Token acquired.`);

    const targetUrl = `${API_URL}/api/code/run`;
    console.log(`\n🔥 Blasting ${targetUrl} with 100 students clicking "Run Code" at the exact same time...`);
    
    // Using a simple Python code to test Judge0 execution
    const sourceCode = `print("Hello from Load Test")`;
    const language = `python`;

    const instance = autocannon({
      url: targetUrl,
      connections: 100, 
      amount: 100, // 100 total run requests     
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        sourceCode: sourceCode,
        language: language,
        stdin: ''
      })
    }, (err, result) => {
      if (err) {
        console.error('\n❌ Load test failed:', err);
        return;
      }
      
      console.log('\n📊 --- TEST RESULTS (JUDGE0 RUN) ---');
      console.log(`Total Requests Sent: ${result.requests.total}`);
      console.log(`Requests/Sec:        ${result.requests.average}`);
      console.log(`Average Latency:     ${result.latency.average} ms`);
      console.log(`Max Latency:         ${result.latency.max} ms`);
      console.log(`Successful (2xx):    ${result['2xx']}`);
      console.log(`Total Errors (500s): ${result.non2xx}`);
      console.log(`Timeouts:            ${result.timeouts}`);
      
      if (result.non2xx > 0 || result.timeouts > 0) {
        console.log('\n⚠️ WARNING: Judge0 or the backend struggled to handle the concurrent requests.');
      } else {
        console.log('\n✅ SUCCESS: Perfectly handled Judge0 concurrent code executions!');
      }
    });

    autocannon.track(instance, { renderProgressBar: true });
    
  } catch (error) {
    console.error('❌ Error setting up test:', error.message);
  }
}

runJudge0LoadTest();
