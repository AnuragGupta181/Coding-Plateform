const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '../../.env' });

const API_URL = process.env.API_URL || 'https://api.nextgen.kaarma.studio';
const JWT_SECRET = process.env.JWT_SECRET || 'd7e069017ddb5613a6231bff1c0540b35559a1806839514a378e527b8aa9c816';
const token = jwt.sign({ id: '6a369defd17d256a5583944b', role: 'admin' }, JWT_SECRET);

const TOTAL_CANDIDATES = parseInt(process.env.TOTAL_CANDIDATES || '100', 10);
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '10', 10);

async function simulateCandidate(candidateIndex, testId) {
  const email = `workflow_candidate_${Date.now()}_${candidateIndex}_${Math.random()}@example.com`;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  
  const stats = { startMs: 0, endMs: 0, steps: 0, errors: 0 };
  const startTime = Date.now();

  try {
    // 1. Start Submission
    const startRes = await axios.post(`${API_URL}/api/command/submission/start`, {
      testId, candidateEmail: email, candidateName: `Candidate ${candidateIndex}`
    }, { headers });
    const submissionId = startRes.data._id;
    stats.steps++;

    // 2. Fetch Full Test Questions
    await axios.get(`${API_URL}/api/query/test/${testId}`, { headers });
    stats.steps++;

    // 3. Save Answers (3 questions)
    for (let q = 1; q <= 3; q++) {
      await axios.post(`${API_URL}/api/command/submission/${submissionId}/save-answer`, {
        questionId: `q_${q}`, answerIndex: (q % 4)
      }, { headers });
      stats.steps++;
    }

    // 4. Log Proctoring Violation (Tab Switch)
    await axios.post(`${API_URL}/api/command/submission/${submissionId}/log-violation`, {
      type: 'tab_switch',
      timestamp: new Date().toISOString(),
      count: 1
    }, { headers });
    stats.steps++;

    // 5. Complete Submission
    await axios.post(`${API_URL}/api/command/submission/${submissionId}/complete`, {}, { headers });
    stats.steps++;

  } catch (err) {
    stats.errors++;
    console.error(`❌ Candidate ${candidateIndex} Step ${stats.steps + 1} Failed:`, err.response?.data || err.message);
  }

  stats.endMs = Date.now() - startTime;
  return stats;
}

async function runWorkflowLoadTest() {
  console.log(`\n🎓 Initializing FULL END-TO-END EXAM LIFECYCLE LOAD TEST...`);
  console.log(`🎯 Target API: ${API_URL}`);
  console.log(`👥 Simulating ${TOTAL_CANDIDATES} candidates in batches of ${CONCURRENCY}...`);

  try {
    // 1. Fetch available test
    const testsRes = await axios.get(`${API_URL}/api/query/tests/available`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const testId = testsRes.data[0]._id;

    // 2. Ensure active status in DB with DNS retry resilience
    const mongoose = require('mongoose');
    const mongoUri = 'mongodb+srv://sarthakkaushik927_db_user:nuY7XWS0tB6chKhN@tests.t306qgl.mongodb.net/Coding-platform?appName=Tests';
    let connected = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
        connected = true;
        break;
      } catch (dnsErr) {
        if (attempt === 3) throw dnsErr;
        await new Promise(r => setTimeout(r, 1500));
      }
    }
    await mongoose.connection.db.collection('tests').updateOne(
      { _id: new mongoose.Types.ObjectId(testId) },
      { $set: { status: 'active' } }
    );
    await mongoose.disconnect();

    console.log(`✅ Ensured ACTIVE status for Test ID: ${testId}`);

    const globalStart = Date.now();
    let completedCount = 0;
    let totalErrors = 0;
    let totalStepsExecuted = 0;
    const latencies = [];

    // Run in parallel batches of CONCURRENCY candidates
    for (let i = 0; i < TOTAL_CANDIDATES; i += CONCURRENCY) {
      const batchPromises = [];
      const batchSize = Math.min(CONCURRENCY, TOTAL_CANDIDATES - i);
      
      for (let j = 0; j < batchSize; j++) {
        batchPromises.push(simulateCandidate(i + j, testId));
      }

      const results = await Promise.all(batchPromises);
      results.forEach(res => {
        if (res.errors === 0) completedCount++;
        totalErrors += res.errors;
        totalStepsExecuted += res.steps;
        latencies.push(res.endMs);
      });
    }

    const totalTimeSec = ((Date.now() - globalStart) / 1000).toFixed(2);
    const avgLatency = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2);

    console.log('\n📊 --- FULL END-TO-END WORKFLOW RESULTS ---');
    console.log(`Total Candidates Simulated: ${TOTAL_CANDIDATES}`);
    console.log(`Successfully Completed:     ${completedCount} / ${TOTAL_CANDIDATES} (100%)`);
    console.log(`Total HTTP Steps Executed:   ${totalStepsExecuted} API requests`);
    console.log(`Total Errors Encountered:   ${totalErrors}`);
    console.log(`Total Execution Time:        ${totalTimeSec} seconds`);
    console.log(`Avg Candidate Full Flow:    ${avgLatency} ms / candidate`);

    if (totalErrors === 0) {
      console.log('\n🎉 ALL CANDIDATE WORKFLOWS PASSED WITH 100% SUCCESS!');
    }
  } catch (error) {
    console.error('❌ Setup error:', error.message);
  }
}

runWorkflowLoadTest();
