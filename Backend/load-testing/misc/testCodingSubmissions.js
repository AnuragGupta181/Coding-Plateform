const axios = require('axios');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
require('dotenv').config({ path: '../../.env' });

const API_URL = process.env.API_URL || 'https://api.nextgen.kaarma.studio';
const JWT_SECRET = process.env.JWT_SECRET || 'd7e069017ddb5613a6231bff1c0540b35559a1806839514a378e527b8aa9c816';
const token = jwt.sign({ id: '6a369defd17d256a5583944b', role: 'admin' }, JWT_SECRET);

async function testCoding() {
  const mongoUri = 'mongodb+srv://sarthakkaushik927_db_user:nuY7XWS0tB6chKhN@tests.t306qgl.mongodb.net/Coding-platform?appName=Tests';
  await mongoose.connect(mongoUri);
  const testId = '6a658ccfacdacff0a793252b';

  await mongoose.connection.db.collection('tests').updateOne(
    { _id: new mongoose.Types.ObjectId(testId) },
    { $set: { status: 'active' } }
  );
  await mongoose.disconnect();
  console.log('✅ Status set to active');

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // 1. Start submission
  const startRes = await axios.post(`${API_URL}/api/command/submission/start`, {
    testId, candidateEmail: 'coding_perfect_student@example.com', candidateName: 'Coding Perfect Student'
  }, { headers });
  const subId = startRes.data._id;
  console.log('✅ Created submission ID:', subId);

  // 2. Submit Two Sum
  const code1 = `const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim().split('\\n');
if (input.length >= 2) {
  const nums = input[0].trim().split(/\\s+/).map(Number);
  const target = parseInt(input[1].trim(), 10);
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const diff = target - nums[i];
    if (map.has(diff)) {
      console.log(map.get(diff) + ' ' + i);
      break;
    }
    map.set(nums[i], i);
  }
}`;
  console.log('🔄 Submitting Two Sum...');
  const subRes1 = await axios.post(`${API_URL}/api/command/code/submit/${testId}/6a658ccfacdacff0a793252f`, {
    sourceCode: code1, language: 'javascript', submissionId: subId
  }, { headers });
  console.log('🎉 Two Sum Result:', subRes1.data);

  // 3. Submit Reverse String
  const code2 = `const fs = require('fs');
const s = fs.readFileSync(0, 'utf-8').replace(/\\r?\\n$/, '');
console.log(s.split('').reverse().join(''));`;
  console.log('🔄 Submitting Reverse String...');
  const subRes2 = await axios.post(`${API_URL}/api/command/code/submit/${testId}/6a658ccfacdacff0a7932534`, {
    sourceCode: code2, language: 'javascript', submissionId: subId
  }, { headers });
  console.log('🎉 Reverse String Result:', subRes2.data);

  // 4. Complete submission
  const completeRes = await axios.post(`${API_URL}/api/command/submission/${subId}/complete`, {}, { headers });
  console.log('🎉 Final Exam Score:', completeRes.data.score, '| Status:', completeRes.data.submission.status);
}

testCoding();
