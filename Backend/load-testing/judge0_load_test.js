const axios = require('axios');

const JUDGE0_URL = process.env.JUDGE0_URL || 'http://localhost:2358';
const TOTAL_SUBMISSIONS = 1000;
const TEST_CASES = [
  { stdin: '1\n', expected_output: '1' },
  { stdin: '2\n', expected_output: '2' },
  { stdin: '5\n', expected_output: '120' },
  { stdin: '7\n', expected_output: '5040' },
  { stdin: '10\n', expected_output: '3628800' },
  { stdin: '12\n', expected_output: '479001600' }
];

// Decent code: Calculate factorial
const sourceCode = `
const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim();
const n = parseInt(input, 10);
let result = 1;
for (let i = 2; i <= n; i++) {
  result *= i;
}
console.log(result);
`;

const LANGUAGE_ID = 93; // JavaScript (Node.js 18.15.0) in standard Judge0 CE

async function runLoadTest() {
  console.log(`\n🚀 Starting Judge0 Local Load Test against ${JUDGE0_URL}`);
  console.log(`📦 Simulating ${TOTAL_SUBMISSIONS} code submissions`);
  console.log(`🧪 Each submission runs ${TEST_CASES.length} test cases`);
  
  const submissions = [];
  for (let i = 0; i < TOTAL_SUBMISSIONS; i++) {
    for (const tc of TEST_CASES) {
      submissions.push({
        source_code: sourceCode,
        language_id: LANGUAGE_ID,
        stdin: tc.stdin,
        expected_output: tc.expected_output,
      });
    }
  }

  console.log(`📊 Total individual Judge0 execution requests to queue: ${submissions.length}\n`);

  // Send in batches to avoid network congestion and HTTP payload limits
  const BATCH_SIZE = 100;
  let successful = 0;
  let failed = 0;

  const startTime = Date.now();

  for (let i = 0; i < submissions.length; i += BATCH_SIZE) {
    const batch = submissions.slice(i, i + BATCH_SIZE);
    try {
      await axios.post(`${JUDGE0_URL}/submissions/batch?base64_encoded=false`, {
        submissions: batch
      });
      successful += batch.length;
      process.stdout.write(`\rProgress: Queued ${successful}/${submissions.length} jobs to Judge0...`);
    } catch (error) {
      failed += batch.length;
      console.error(`\n❌ Batch failed:`, error.message);
    }
  }

  const durationMs = Date.now() - startTime;
  console.log('\n\n--- 🏁 Load Test Complete ---');
  console.log(`⏱️  Time taken to queue: ${durationMs}ms`);
  console.log(`✅ Successfully queued: ${successful}`);
  console.log(`❌ Failed to queue: ${failed}`);
  console.log('\nNote: This script queues the jobs instantly using the /submissions/batch endpoint.');
  console.log('You can monitor your local Judge0 docker workers to see how long it takes them to actually execute all 6000 jobs in the background.');
}

runLoadTest();
