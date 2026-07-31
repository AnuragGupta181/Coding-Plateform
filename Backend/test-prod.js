const axios = require('axios');

async function testProd() {
  try {
    const res = await axios.get('https://coding-plateform-5gvy.vercel.app/api/query/tests/available');
    console.log('Status:', res.status);
    console.log('Data:', res.data);
  } catch (error) {
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error Data:', error.response.data);
    } else {
      console.log('Error:', error.message);
    }
  }
}

testProd();

