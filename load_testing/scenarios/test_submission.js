const { runLoadTest } = require('../core/runner');
const { generateCandidateToken } = require('../core/auth');
const config = require('../core/config');

function run() {
  const token = generateCandidateToken();

  // Assuming a static test ID for pure load testing
  const targetTestId = '6a4f7bec860ffe0455d2ff82';
  const targetQuestionId = '6a3b2a2e4d9c7a001c8e9f2a';
  const targetSubmissionId = '6a4f7bec860ffe0455d2ff84';

  const payload = JSON.stringify({
    testId: targetTestId,
    submissionId: targetSubmissionId,
    questionId: targetQuestionId,
    answer: "This is a simulated load testing answer."
  });

  runLoadTest({
    url: `${config.API_URL}/api/command/candidate/save-answer`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    },
    body: payload
  }, 'Save Test Answer');
}

run();
