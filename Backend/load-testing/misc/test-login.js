const axios = require('axios');

async function testLogin(url) {
  try {
    const res = await axios.post(`${url}/api/auth/login`, {
      email: 'sarthakkaushik927@gmail.com',
      password: 'wrong_password_just_to_check_if_user_exists'
    });
    console.log(`[${url}] Success:`, res.data);
  } catch (err) {
    console.log(`[${url}] Error:`, err.response?.status, err.response?.data);
  }
}

async function run() {
  await testLogin('http://localhost:5000');
  await testLogin('https://coding-plateform-t2vc.vercel.app');
}
run();
