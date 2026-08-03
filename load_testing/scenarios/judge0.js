const { runLoadTest } = require('../core/runner');
const { generateCandidateToken } = require('../core/auth');
const config = require('../core/config');

function run() {
  const token = generateCandidateToken();

  const payload = JSON.stringify({
    language_id: 71,
    source_code: "def hello():\n    print('Hello World')\n\nhello()",
    stdin: ""
  });

  runLoadTest({
    url: `${config.API_URL}/api/command/code/run`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    },
    body: payload
  }, 'Judge0 Code Run (Queued)');
}

run();
