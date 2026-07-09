const axios = require('axios');

async function testSingle() {
  try {
    const res = await axios.post('http://localhost:5000/api/auth/signup', {
      name: "Load Test Student",
      email: `loadteststudent_${Date.now()}@example.com`,
      password: "securepassword123"
    });
    console.log('✅ Success! Status:', res.status);
    console.log('Body:', res.data);
  } catch (error) {
    console.log('❌ Error! Status:', error.response?.status);
    console.log('Response Body:', error.response?.data || error.message);
  }
}

testSingle();
