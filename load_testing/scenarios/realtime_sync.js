const { runLoadTest } = require('../core/runner');
const { generateAdminToken } = require('../core/auth');
const config = require('../core/config');

function run() {
  const token = generateAdminToken();
  const testId = '6a4f7bec860ffe0455d2ff82';

  runLoadTest({
    url: `${config.API_URL}/api/query/admin/test/${testId}/dashboard`,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  }, 'Admin Realtime Dashboard Poll');
}

run();
