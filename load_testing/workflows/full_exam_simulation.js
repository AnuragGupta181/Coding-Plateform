const { runLoadTest } = require('../core/runner');
const { generateCandidateToken } = require('../core/auth');
const config = require('../core/config');
const axios = require('axios');

async function runFullExamSimulation() {
  console.log(`\n======================================================`);
  console.log(`🏁 Starting Full Exam Simulation Workload...`);
  console.log(`======================================================\n`);

  // Step 1: Login & Fetch Tests
  console.log(`[Phase 1] Simulating Candidates fetching available tests...`);
  const token = generateCandidateToken();
  
  await new Promise(resolve => {
    const inst = runLoadTest({
      url: `${config.API_URL}/api/query/tests/available`,
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    }, 'Phase 1: Fetch Available Tests');
    inst.on('done', () => resolve());
  });

  // Step 2: Simulate active answering
  console.log(`\n[Phase 2] Simulating active answer submission...`);
  const targetTestId = '6a4f7bec860ffe0455d2ff82';
  const targetSubmissionId = '6a4f7bec860ffe0455d2ff84';
  const targetQuestionId = '6a3b2a2e4d9c7a001c8e9f2a';

  const payload = JSON.stringify({
    testId: targetTestId,
    submissionId: targetSubmissionId,
    questionId: targetQuestionId,
    answer: "Simulated load testing answer."
  });

  await new Promise(resolve => {
    const inst = runLoadTest({
      url: `${config.API_URL}/api/command/candidate/save-answer`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      body: payload
    }, 'Phase 2: Save Answer');
    inst.on('done', () => resolve());
  });

  console.log(`\n🎉 Full Exam Simulation Complete!`);
}

runFullExamSimulation();
