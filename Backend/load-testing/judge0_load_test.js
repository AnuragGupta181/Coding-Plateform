const axios = require('axios');
require('dotenv').config({ path: '../../.env' });

const LOCAL_JUDGE0_URL = process.env.JUDGE0_URL || 'http://localhost:2358';
const PUBLIC_JUDGE0_URL = 'https://ce.judge0.com';
const TOTAL_JOBS = 1000;
const BATCH_SIZE = 20;

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

const LANGUAGE_ID = 63;

async function submitBatch(url, batch, retries = 6) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await axios.post(`${url}/submissions/batch?base64_encoded=false`, {
        submissions: batch
      });
      return { success: true };
    } catch (error) {
      const status = error.response?.status;
      const data = error.response?.data;
      if (status === 503 && data?.error === 'queue is full' && attempt < retries - 1) {
        const delay = Math.min(Math.pow(2, attempt) * 500, 8000);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      return { success: false, error };
    }
  }
  return { success: false, error: new Error('Max retries exceeded') };
}

async function runTest(url, label) {
  const submissions = [];
  for (let i = 0; i < TOTAL_JOBS; i++) {
    submissions.push({
      source_code: sourceCode,
      language_id: LANGUAGE_ID,
      stdin: '10\n',
      expected_output: '3628800',
    });
  }

  console.log(`\n🚀 ${label} — ${url}`);
  console.log(`📦 Queueing ${TOTAL_JOBS} submissions in batches of ${BATCH_SIZE}\n`);

  let successful = 0;
  let failed = 0;

  const startTime = Date.now();

  for (let i = 0; i < submissions.length; i += BATCH_SIZE) {
    const batch = submissions.slice(i, i + BATCH_SIZE);
    const result = await submitBatch(url, batch);
    if (result.success) {
      successful += batch.length;
      process.stdout.write(`\rProgress: Queued ${successful}/${TOTAL_JOBS} jobs...`);
      await new Promise(r => setTimeout(r, 100));
    } else {
      failed += batch.length;
      const status = result.error?.response?.status || 'N/A';
      const data = result.error?.response?.data ? JSON.stringify(result.error.response.data).substring(0, 200) : result.error.message;
      console.error(`\n❌ Batch [${Math.floor(i / BATCH_SIZE) + 1}]: HTTP ${status} — ${data}`);
    }
  }

  const durationMs = Date.now() - startTime;
  const durationSec = (durationMs / 1000).toFixed(2);
  const rate = (successful / durationSec).toFixed(1);

  console.log('\n\n--- 🏁 Results ---');
  console.log(`⏱️  Time taken: ${durationMs}ms (${durationSec}s)`);
  console.log(`✅ Successfully queued: ${successful}`);
  console.log(`❌ Failed to queue: ${failed}`);
  console.log(`⚡ Submission rate: ${rate} submissions/sec`);
}

async function main() {
  await runTest(LOCAL_JUDGE0_URL, 'Local Judge0 CE');
  await runTest(PUBLIC_JUDGE0_URL, 'Public Judge0 CE (ce.judge0.com)');
}

main();