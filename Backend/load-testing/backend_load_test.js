const axios = require('axios');

const BACKEND_URL = 'http://localhost:5000/api/command/code/run';
const TOTAL_REQUESTS = 50; // Number of concurrent requests to test local backend

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

async function testBackend() {
  console.log(`\n🚀 Testing Local Express Backend at ${BACKEND_URL}`);
  console.log(`📦 Sending ${TOTAL_REQUESTS} requests...\n`);

  const startTime = Date.now();
  let passed = 0;
  let failed = 0;

  const requests = Array.from({ length: TOTAL_REQUESTS }).map(async (_, index) => {
    try {
      const res = await axios.post(BACKEND_URL, {
        sourceCode,
        language: 'javascript',
        stdin: '10\n'
      });
      if (res.data.accepted || res.data.stdout?.trim() === '3628800' || res.data.async) {
        passed++;
      } else {
        failed++;
      }
    } catch (err) {
      failed++;
    }
  });

  await Promise.all(requests);

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('--- 🏁 Results ---');
  console.log(`⏱️  Total Time: ${durationSec}s`);
  console.log(`✅ Successful: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
}

testBackend();
