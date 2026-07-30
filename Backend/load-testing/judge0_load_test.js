const axios = require('axios');
require('dotenv').config({ path: '../../.env' });

const LOCAL_JUDGE0_URL = process.env.JUDGE0_URL || 'https://judge0.cccakgec.in';


const PUBLIC_JUDGE0_URL = 'https://ce.judge0.com';

const TOTAL_JOBS = 300;
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
      const res = await axios.post(`${url}/submissions/batch?base64_encoded=false`, {
        submissions: batch
      });
      // Return the tokens
      return { success: true, tokens: res.data.map(t => t.token) };
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

async function waitForExecution(url, allTokens) {
  const pendingTokens = new Set(allTokens);
  let completed = 0;
  
  process.stdout.write(`\rProgress: Executed 0/${allTokens.length} jobs...`);
  
  while (pendingTokens.size > 0) {
    const tokensArray = Array.from(pendingTokens);
    
    // Poll in chunks of 50 to avoid URI too long errors
    for (let i = 0; i < tokensArray.length; i += 50) {
      const chunk = tokensArray.slice(i, i + 50);
      try {
        const res = await axios.get(`${url}/submissions/batch?tokens=${chunk.join(',')}&base64_encoded=false`);
        
        res.data.submissions.forEach(sub => {
          // Status 1 = In Queue, 2 = Processing. Anything >= 3 means it's done executing (Accepted, Wrong Answer, TLE, etc)
          if (sub.status.id > 2) {
            pendingTokens.delete(sub.token);
            completed++;
          }
        });
      } catch (err) {
        // If we hit a rate limit while polling, just back off slightly
        await new Promise(r => setTimeout(r, 1000));
      }
      process.stdout.write(`\rProgress: Executed ${completed}/${allTokens.length} jobs...`);
    }
    
    if (pendingTokens.size > 0) {
      await new Promise(r => setTimeout(r, 1500)); // Poll every 1.5 seconds
    }
  }
  console.log(); // Newline when done
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
  console.log(`📦 Queueing and Executing ${TOTAL_JOBS} submissions...\n`);

  let successfulQueue = 0;
  let failedQueue = 0;
  let tokens = [];

  const startTime = Date.now();

  // Phase 1: Queueing
  for (let i = 0; i < submissions.length; i += BATCH_SIZE) {
    const batch = submissions.slice(i, i + BATCH_SIZE);
    const result = await submitBatch(url, batch);
    if (result.success) {
      successfulQueue += batch.length;
      tokens.push(...result.tokens);
      process.stdout.write(`\rProgress: Queued ${successfulQueue}/${TOTAL_JOBS} jobs...`);
      await new Promise(r => setTimeout(r, 100)); // Small delay to avoid hammering the POST endpoint
    } else {
      failedQueue += batch.length;
      const status = result.error?.response?.status || 'N/A';
      const data = result.error?.response?.data ? JSON.stringify(result.error.response.data).substring(0, 200) : result.error.message;
      console.error(`\n❌ Batch [${Math.floor(i / BATCH_SIZE) + 1}]: HTTP ${status} — ${data}`);
    }
  }
  
  console.log(); // Newline after queueing

  // Phase 2: Execution Polling
  if (tokens.length > 0) {
    await waitForExecution(url, tokens);
  }

  const durationMs = Date.now() - startTime;
  const durationSec = (durationMs / 1000).toFixed(2);
  const rate = (tokens.length / durationSec).toFixed(1);

  console.log('\n--- 🏁 Results ---');
  console.log(`⏱️  Total Time (Queue + Execution): ${durationMs}ms (${durationSec}s)`);
  console.log(`✅ Successfully Executed: ${tokens.length}`);
  console.log(`❌ Failed to Queue: ${failedQueue}`);
  console.log(`⚡ True Execution Rate: ${rate} submissions/sec`);
}

async function main() {
  await runTest(LOCAL_JUDGE0_URL, 'Local Judge0 CE');
  await runTest(PUBLIC_JUDGE0_URL, 'Public Judge0 CE (ce.judge0.com)');
}

main();