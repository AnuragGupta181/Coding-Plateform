require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const autocannon = require('autocannon');
const { spawn, execSync } = require('child_process');
const pidusage = require('pidusage');

// Configuration - Reads from .env or defaults to localhost
const TARGET_URL = process.env.LOCAL_API_URL || 'http://localhost:5000/api/tests/available'; 
const DURATION = 10; // Test duration in seconds
const CONCURRENT_USERS = 500; // Concurrent connections

async function run() {
  console.log(`🚀 Starting local HTTP load test on ${TARGET_URL}...`);
  console.log(`👥 Simulating ${CONCURRENT_USERS} concurrent users for ${DURATION} seconds.\n`);

  let serverPid;
  try {
    const output = execSync("pgrep -f 'node'").toString().trim().split('\n');
    serverPid = parseInt(output[0]); 
  } catch (e) {
    console.warn("⚠️ Could not find a running Node server via pgrep. Hardware monitoring for Node will be skipped.");
  }

  // Start Mongostat in the background
  console.log('📊 Starting mongostat monitor...');
  let mongoProcess;
  try {
     mongoProcess = spawn('mongostat', ['--rowcount', DURATION, '--host', 'localhost:27017']);
     mongoProcess.stdout.on('data', (data) => {
       const output = data.toString().trim();
       if(output) console.log(`[MongoDB] \n${output}`);
     });
     mongoProcess.stderr.on('data', () => {});
  } catch (err) {
      console.warn("⚠️ mongostat command failed to start.");
  }

  // Monitor Node.js Memory & CPU every second (if we found the PID)
  let memoryInterval;
  if (serverPid) {
    memoryInterval = setInterval(async () => {
      try {
        const stats = await pidusage(serverPid);
        const ramMB = (stats.memory / 1024 / 1024).toFixed(2);
        console.log(`[Node Server PID ${serverPid}] CPU: ${stats.cpu.toFixed(1)}% | RAM: ${ramMB} MB`);
      } catch (e) {}
    }, 1000);
  }

  // Run Autocannon
  const instance = autocannon({
    url: TARGET_URL,
    connections: CONCURRENT_USERS,
    duration: DURATION,
  }, (err, result) => {
    
    if (memoryInterval) clearInterval(memoryInterval);
    if (mongoProcess) mongoProcess.kill();

    if (err) {
      console.error('❌ Autocannon error:', err);
      return;
    }

    console.log('\n--- LOCAL LOAD TEST COMPLETE ---');
    console.log(`Total Requests Sent: ${result.requests.total}`);
    console.log(`Average Requests/Sec: ${result.requests.average}`);
    console.log(`Average Latency: ${result.latency.average} ms`);
    console.log(`Errors (Timeouts/5xx): ${result.errors}`);
  });

  autocannon.track(instance, { renderProgressBar: true });
}

run();
