const { runLoadTest } = require('../core/runner');
const { generateCandidateToken } = require('../core/auth');
const config = require('../core/config');
const axios = require('axios');

async function run() {
  const token = generateCandidateToken();

  // Option 1: Just fetch available tests
  runLoadTest({
    url: `${config.API_URL}/api/query/tests/available`,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  }, 'Fetch Available Tests');

  // If you want to fetch a specific test, you can resolve the ID first:
  /*
  try {
    const res = await axios.get(`${config.API_URL}/api/query/tests/available`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const testId = res.data[0]?._id;
    
    if (testId) {
      runLoadTest({
        url: `${config.API_URL}/api/query/test/${testId}`,
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      }, 'Fetch Specific Test');
    }
  } catch (error) {
    console.error('Failed to resolve test ID', error.message);
  }
  */
}

run();
