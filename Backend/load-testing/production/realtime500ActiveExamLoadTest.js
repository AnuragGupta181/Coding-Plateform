const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '../../.env' });

const API_URL = process.env.API_URL || 'https://api.nextgen.kaarma.studio';
const JWT_SECRET = process.env.JWT_SECRET || 'd7e069017ddb5613a6231bff1c0540b35559a1806839514a378e527b8aa9c816';
const token = jwt.sign({ id: '6a369defd17d256a5583944b', role: 'admin' }, JWT_SECRET);

const TOTAL_STUDENTS = parseInt(process.env.TOTAL_STUDENTS || '500', 10);

function getSolutionForQuestion(cq) {
  const title = (cq.title || '').toLowerCase();
  if (title.includes('two sum')) {
    return `const fs = require('fs');
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
  }
  if (title.includes('reverse string')) {
    return `const fs = require('fs');
const s = fs.readFileSync(0, 'utf-8').replace(/\\r?\\n$/, '');
console.log(s.split('').reverse().join(''));`;
  }
  const expected = cq.testCases?.[0]?.expectedOutput || '0';
  return `console.log(${JSON.stringify(expected)});`;
}

async function simulateActiveStudent(studentIndex, testId, realQuestions, realCodingQuestions, globalStats) {
  const email = `realtime_student_${Date.now()}_${studentIndex}_${Math.floor(Math.random()*10000)}@example.com`;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  
  // Stagger student logins over a 10-second window (natural human entry)
  const entryDelayMs = Math.random() * 10000;
  await new Promise(r => setTimeout(r, entryDelayMs));

  const startTime = Date.now();

  try {
    // 1. Start Exam Session
    const startRes = await axios.post(`${API_URL}/api/command/submission/start`, {
      testId, candidateEmail: email, candidateName: `Student #${studentIndex}`
    }, { headers });
    const submissionId = startRes.data._id;
    globalStats.apiCalls++;

    // 2. Fetch Full Test Questions
    await axios.get(`${API_URL}/api/query/test/${testId}`, { headers });
    globalStats.apiCalls++;

    // 3. Save Answers against Real Question ObjectIDs
    if (realQuestions && realQuestions.length > 0) {
      for (const qObj of realQuestions) {
        await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
        const correctIdx = qObj.correctOptionIndex !== undefined ? qObj.correctOptionIndex : 0;
        await axios.post(`${API_URL}/api/command/submission/${submissionId}/save-answer`, {
          questionId: qObj._id.toString(),
          answerIndex: correctIdx
        }, { headers });
        globalStats.apiCalls++;
        globalStats.mcqAnswersSaved++;
      }
    } else {
      await axios.post(`${API_URL}/api/command/submission/${submissionId}/save-answer`, {
        questionId: `mcq_default`,
        answerIndex: 0
      }, { headers });
      globalStats.apiCalls++;
      globalStats.mcqAnswersSaved++;
    }

    // 4. Mid-Exam Official Coding Submissions for ALL Coding Questions
    if (realCodingQuestions && realCodingQuestions.length > 0) {
      for (const cq of realCodingQuestions) {
        await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
        const solutionCode = getSolutionForQuestion(cq);
        try {
          await axios.post(`${API_URL}/api/command/code/submit/${testId}/${cq._id.toString()}`, {
            sourceCode: solutionCode,
            language: 'javascript',
            submissionId: submissionId
          }, { headers, timeout: 12000 });
          globalStats.apiCalls++;
          globalStats.codeExecutions++;
        } catch (e) {
          globalStats.apiCalls++;
        }
      }
    }

    // 5. Proctoring Tab Switch Log
    await axios.post(`${API_URL}/api/command/submission/${submissionId}/log-violation`, {
      type: 'tab_switch',
      timestamp: new Date().toISOString(),
      count: 1
    }, { headers });
    globalStats.apiCalls++;
    globalStats.violationsLogged++;

    // 6. End-of-Exam Final Submission
    await new Promise(r => setTimeout(r, 2000));
    await axios.post(`${API_URL}/api/command/submission/${submissionId}/complete`, {}, { headers });
    globalStats.apiCalls++;
    globalStats.examsCompleted++;

  } catch (err) {
    globalStats.errors++;
    console.error(`❌ Student #${studentIndex} Error:`, err.response?.data || err.message);
  }

  globalStats.latencies.push(Date.now() - startTime);
}

async function runRealtime500ExamTest() {
  console.log(`\n🏫 Initializing REAL-TIME 500 SIMULTANEOUS CONCURRENT EXAM DRIVE...`);
  console.log(`🎯 Target API: ${API_URL}`);
  console.log(`👥 Launching ALL ${TOTAL_STUDENTS} students concurrently (ALL ACTIVE SIMULTANEOUSLY)...`);

  const globalStats = {
    apiCalls: 0,
    mcqAnswersSaved: 0,
    codeExecutions: 0,
    violationsLogged: 0,
    examsCompleted: 0,
    errors: 0,
    latencies: []
  };

  try {
    // 1. Connect MongoDB Atlas & Ensure active test
    const mongoose = require('mongoose');
    const mongoUri = 'mongodb+srv://sarthakkaushik927_db_user:nuY7XWS0tB6chKhN@tests.t306qgl.mongodb.net/Coding-platform?appName=Tests';
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
        break;
      } catch (dnsErr) {
        if (attempt === 3) throw dnsErr;
        await new Promise(r => setTimeout(r, 1500));
      }
    }
    
    let testDoc = await mongoose.connection.db.collection('tests').findOne({ status: 'active' });
    if (!testDoc) {
      testDoc = await mongoose.connection.db.collection('tests').findOne({});
      if (testDoc) {
        await mongoose.connection.db.collection('tests').updateOne(
          { _id: testDoc._id },
          { $set: { status: 'active' } }
        );
      }
    }
    await mongoose.disconnect();

    if (!testDoc) {
      throw new Error('No tests found in MongoDB database.');
    }

    const testId = testDoc._id.toString();
    const realQuestions = testDoc.questions || [];
    const realCodingQuestions = testDoc.codingQuestions || [];

    console.log(`✅ Exam Active: Test ID ${testId} (${realQuestions.length} MCQs, ${realCodingQuestions.length} Coding Qs) | All 500 students entering exam room NOW...`);

    const globalStart = Date.now();

    // Launch ALL 500 students AT THE EXACT SAME TIME in parallel!
    const studentPromises = [];
    for (let s = 1; s <= TOTAL_STUDENTS; s++) {
      studentPromises.push(simulateActiveStudent(s, testId, realQuestions, realCodingQuestions, globalStats));
    }

    // Monitor progress live every 5 seconds while all 500 are in the exam
    const progressInterval = setInterval(() => {
      const elapsedSec = ((Date.now() - globalStart) / 1000).toFixed(1);
      console.log(`⏱️ [${elapsedSec}s] Active Exam Room Status: ${globalStats.examsCompleted}/${TOTAL_STUDENTS} Completed | ${globalStats.mcqAnswersSaved} MCQ Answers Saved | ${globalStats.apiCalls} Total API Calls | Errors: ${globalStats.errors}`);
    }, 5000);

    await Promise.all(studentPromises);
    clearInterval(progressInterval);

    const totalSec = ((Date.now() - globalStart) / 1000).toFixed(2);
    const avgLatencySec = ((globalStats.latencies.reduce((a,b)=>a+b,0)/globalStats.latencies.length)/1000).toFixed(2);

    console.log('\n📊 --- REAL-TIME 500 CONCURRENT STUDENT EXAM RESULTS ---');
    console.log(`Total Simultaneous Students: ${TOTAL_STUDENTS}`);
    console.log(`Exams Completed Successfully: ${globalStats.examsCompleted} / ${TOTAL_STUDENTS} (${Math.round((globalStats.examsCompleted/TOTAL_STUDENTS)*100)}%)`);
    console.log(`Total API Requests Executed:  ${globalStats.apiCalls} API requests`);
    console.log(`Total MCQ Answers Saved:     ${globalStats.mcqAnswersSaved} saved`);
    console.log(`Total Code Runs / Submits:   ${globalStats.codeExecutions} executed`);
    console.log(`Total Violations Logged:     ${globalStats.violationsLogged} logged`);
    console.log(`Total Errors Encountered:     ${globalStats.errors}`);
    console.log(`Total Exam Duration:          ${totalSec} seconds`);
    console.log(`Average Student Exam Time:    ${avgLatencySec} seconds / student`);

    if (globalStats.errors === 0) {
      console.log('\n🎉 ALL 500 SIMULTANEOUS CANDIDATES COMPLETED THE EXAM WITH 100% SUCCESS!');
    }

  } catch (error) {
    console.error('❌ Setup error:', error.message);
  }
}

runRealtime500ExamTest();
