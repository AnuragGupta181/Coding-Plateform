const axios = require('axios');

async function testSingle() {
  try {
    const res = await axios.get('https://coding-plateform-t2vc.vercel.app/api/test/6a4f7bec860ffe0455d2ff82', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
      }
    });
    console.log('✅ Success! Status:', res.status);
    console.log('Body length:', JSON.stringify(res.data).length);
  } catch (error) {
    console.log('❌ Error! Status:', error.response?.status);
    console.log('Response Body:', error.response?.data || error.message);
  }
}

testSingle();
