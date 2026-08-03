const { runLoadTest } = require('../core/runner');
const config = require('../core/config');

function run() {
  const payload = JSON.stringify({
    email: 'test@example.com',
    password: 'password123'
  });

  runLoadTest({
    url: `${config.API_URL}/api/command/auth/login`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    },
    body: payload
  }, 'Auth Login Simulation');
}

run();
