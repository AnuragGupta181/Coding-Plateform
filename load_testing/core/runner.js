const autocannon = require('autocannon');
const config = require('./config');

/**
 * Runs an autocannon load test with unified configuration and error handling.
 * 
 * @param {Object} options - Autocannon configuration object (url, method, headers, etc)
 * @param {string} scenarioName - Name of the test scenario for logging
 */
function runLoadTest(options, scenarioName = 'Load Test') {
  console.log(`\n🚀 Initializing ${config.ENV.toUpperCase()} Load Test: ${scenarioName}`);
  console.log(`🎯 Target API: ${config.API_URL}`);
  console.log(`👥 Concurrent Users: ${config.CONCURRENT_USERS}`);
  
  if (config.DURATION > 0) console.log(`⏱️  Duration: ${config.DURATION}s`);
  if (config.AMOUNT > 0) console.log(`📦 Amount of Requests: ${config.AMOUNT}`);
  if (config.RATE > 0) console.log(`📈 Rate Limit: ${config.RATE} req/sec`);

  const acOptions = {
    connections: config.CONCURRENT_USERS,
    ...options
  };

  // Only apply duration if it's > 0 (autocannon defaults to 10s if duration not set, but if we use amount we might omit duration)
  if (config.DURATION > 0) acOptions.duration = config.DURATION;
  if (config.AMOUNT > 0) acOptions.amount = config.AMOUNT;
  if (config.RATE > 0) acOptions.overallRate = config.RATE;

  // Add default headers if not provided
  if (!acOptions.headers) {
    acOptions.headers = {};
  }
  acOptions.headers['User-Agent'] = acOptions.headers['User-Agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  acOptions.headers['Accept'] = acOptions.headers['Accept'] || 'application/json';

  const instance = autocannon(acOptions, (err, result) => {
    if (err) {
      console.error(`\n❌ Error during ${scenarioName}:`, err);
      process.exit(1);
    }
  });

  autocannon.track(instance, { renderProgressBar: true });

  instance.on('done', (result) => {
    console.log(`\n✅ ${scenarioName} Completed!`);
    console.log('--- RESULTS ---');
    console.log(`Requests: ${result.requests.total} Total, ${result.requests.average}/sec`);
    console.log(`Latency: P99 ${result.latency.p99}ms | Avg ${result.latency.average}ms`);
    console.log(`Errors: ${result.errors}`);
    console.log(`Timeouts: ${result.timeouts}`);
    console.log('----------------');
  });

  return instance;
}

module.exports = { runLoadTest };
