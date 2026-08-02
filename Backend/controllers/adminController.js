const Submission = require('../models/submission');
const Test = require('../models/test');
const eventController = require('./eventController');
const { completeTestAndAutoSubmit } = require('../services/testLifecycleService');
const { parseQuestionsFromBuffer } = require('../services/excelParserService');
const cache = require('../services/redisClient');

/**
 * POST /api/admin/parse-questions
 * Accepts an Excel/CSV file upload and returns parsed questions for client-side preview.
 * Does NOT write to the database — the admin reviews and then submits the full test.
 */
exports.parseQuestionsFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const { mcqQuestions, codingQuestions, errors, testType } = parseQuestionsFromBuffer(
      req.file.buffer,
      req.file.originalname
    );

    const totalValid = mcqQuestions.length + codingQuestions.length;

    if (totalValid === 0 && errors.length > 0) {
      return res.status(422).json({ message: 'No valid questions found in file.', errors });
    }

    res.json({
      message: `Parsed ${mcqQuestions.length} MCQ + ${codingQuestions.length} coding question(s).`,
      mcqQuestions,
      codingQuestions,
      testType,
      errors,
      totalRows: totalValid + errors.length,
    });
  } catch (error) {
    res.status(400).json({ message: 'Failed to parse uploaded file. Please check the format.' });
  }
};


exports.createTest = async (req, res) => {
  try {
    const { title, description, durationInMinutes, questions, codingQuestions, testType, scheduledFor } = req.body;

    const testScheduledDate = scheduledFor ? new Date(scheduledFor) : null;
    const isImmediate = !testScheduledDate;

    const newTest = new Test({
      title,
      description,
      durationInMinutes,
      testType: testType || 'mcq',
      questions: questions || [],
      codingQuestions: codingQuestions || [],
      scheduledFor: testScheduledDate,
      status: isImmediate ? 'waiting' : 'scheduled'
    });

    await newTest.save();
    
    // Invalidate the available tests cache so candidates see this immediately
    await cache.del('tests:available');

    res.status(201).json({ message: 'Test created successfully', test: newTest });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /api/admin/test/:id/coding-question
 * Add a single coding question to an existing test.
 */
exports.createCodingQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, constraints, examples, testCases, allowedLanguages, starterCode, points, difficulty } = req.body;

    const test = await Test.findById(id);
    if (!test) return res.status(404).json({ message: 'Test not found.' });

    const newQuestion = {
      title,
      description,
      constraints: constraints || '',
      examples: examples || [],
      testCases: testCases || [],
      allowedLanguages: allowedLanguages || ['javascript', 'python', 'cpp', 'java', 'c'],
      starterCode: starterCode || {},
      points: points || 10,
      difficulty: difficulty || 'medium',
      order: test.codingQuestions.length
    };

    test.codingQuestions.push(newQuestion);
    if (test.codingQuestions.length > 0 && test.questions.length === 0) {
      test.testType = 'coding';
    } else if (test.codingQuestions.length > 0 && test.questions.length > 0) {
      test.testType = 'mixed';
    }

    await test.save();

    // Invalidate test cache so students get the updated question list
    await cache.del(`test:data:${id}`);

    res.status(201).json({
      message: 'Coding question added.',
      question: test.codingQuestions[test.codingQuestions.length - 1]
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.startTest = async (req, res) => {
  try {
    const { id } = req.params;

    const test = await Test.findByIdAndUpdate(
      id,
      { status: 'active', startedAt: new Date(), completedAt: null },
      { new: true }
    );

    if (!test) return res.status(404).json({ message: 'Test not found' });

    // Invalidate cache — test status has changed to 'active'
    await cache.del(`test:data:${id}`);
    await cache.del('tests:available');

    eventController.broadcastEvent(id, { type: 'START', testId: id, startedAt: test.startedAt });

    res.json({ message: 'Test started successfully', test });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.openWaitingRoom = async (req, res) => {
  try {
    const { id } = req.params;

    const test = await Test.findByIdAndUpdate(
      id,
      { status: 'waiting' },
      { new: true }
    );

    if (!test) return res.status(404).json({ message: 'Test not found' });

    // Invalidate cache — test status changed
    await cache.del(`test:data:${id}`);
    await cache.del('tests:available');

    res.json({ message: 'Waiting room opened', test });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.completeTest = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await completeTestAndAutoSubmit(id, 'admin_mark_completed');

    if (!result.found) {
      return res.status(404).json({ message: 'Test not found' });
    }

    // Invalidate cache — test is now completed
    await cache.del(`test:data:${id}`);

    res.json({
      message: result.alreadyCompleted ? 'Test already completed' : 'Test marked as completed',
      autoSubmittedCount: result.autoSubmittedCount,
      test: result.test
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.autoSubmitTest = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await completeTestAndAutoSubmit(id, 'admin_auto_submit');

    if (!result.found) {
      return res.status(404).json({ message: 'Test not found' });
    }

    // Invalidate cache
    await cache.del(`test:data:${id}`);
    await cache.del('tests:available');

    res.json({
      message: 'Active submissions auto-submitted and test completed',
      autoSubmittedCount: result.autoSubmittedCount,
      test: result.test
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getTestHistory = async (req, res) => {
  try {
    // .lean() — admin reads this list, doesn't mutate documents
    const tests = await Test.find().sort({ createdAt: -1 }).lean();
    res.json(tests);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getWaitingQueues = async (req, res) => {
  try {
    const queueSnapshot = eventController.getWaitingQueueSnapshot();

    // Run all 3 DB queries in PARALLEL instead of sequentially (~3x faster)
    const [tests, activeSubmissions, completedSubmissions] = await Promise.all([
      Test.find({ status: { $ne: 'completed' } }, 'title status durationInMinutes startedAt scheduledFor').lean(),
      Submission.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$testId', count: { $sum: 1 } } }
      ]),
      Submission.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: '$testId', count: { $sum: 1 } } }
      ]),
    ]);

    const activeMap = new Map(activeSubmissions.map((item) => [String(item._id), item.count]));
    const completedMap = new Map(completedSubmissions.map((item) => [String(item._id), item.count]));
    const queueMap = new Map(queueSnapshot.map((item) => [item.testId, item.waitingUsers]));

    const response = tests.map((test) => ({
      testId: String(test._id),
      title: test.title,
      status: test.status,
      durationInMinutes: test.durationInMinutes,
      startedAt: test.startedAt || (test.status === 'active' ? test.createdAt : null),
      scheduledFor: test.scheduledFor,
      activeSubmissionCount: activeMap.get(String(test._id)) || 0,
      completedSubmissionCount: completedMap.get(String(test._id)) || 0,
      waitingUsers: queueMap.get(String(test._id)) || []
    }));

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getTestResults = async (req, res) => {
  try {
    const { id } = req.params;
    const { full } = req.query;
    const mongoose = require('mongoose');

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid test ID format' });
    }

    // Step 1: Deduplicate candidate emails using lightweight projection (runs in ~30ms, <50KB RAM)
    const topSubmissions = await Submission.aggregate([
      { $match: { testId: new mongoose.Types.ObjectId(id) } },
      {
        $project: {
          _id: 1,
          candidateEmail: 1,
          candidateName: 1,
          score: 1,
          status: 1,
          updatedAt: 1,
          createdAt: 1,
          violations: 1,
          reportedProblems: 1
        }
      },
      { $sort: { score: -1, updatedAt: 1 } },
      {
        $group: {
          _id: '$candidateEmail',
          doc: { $first: '$$ROOT' }
        }
      },
      { $replaceRoot: { newRoot: '$doc' } },
      { $sort: { score: -1, updatedAt: 1 } }
    ]);

    // If full detail is not requested, return the lightweight leaderboard list (~35ms response)
    if (full !== 'true') {
      return res.json(topSubmissions);
    }

    // If full=true is explicitly requested, fetch complete submission documents including code & outputs
    const targetIds = topSubmissions.map(item => item._id);
    const submissions = await Submission.find({ _id: { $in: targetIds } }).lean();

    const idOrderMap = new Map(targetIds.map((id, index) => [id.toString(), index]));
    submissions.sort((a, b) => (idOrderMap.get(a._id.toString()) ?? 0) - (idOrderMap.get(b._id.toString()) ?? 0));

    res.json(submissions);
  } catch (error) {
    console.error('getTestResults Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


exports.getSubmissionDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const mongoose = require('mongoose');

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid submission ID format' });
    }

    const submission = await Submission.findById(id).populate('testId');
    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    res.json(submission);
  } catch (error) {
    console.error('getSubmissionDetails Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getActiveTestUsers = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Fetch active submissions for this test
    const submissions = await Submission.find(
      { testId: id, status: 'active' },
      'candidateName candidateEmail startTime violations answers codingAnswers'
    ).lean();

    const users = submissions.map(sub => {
      // Safely count answers from Mongoose Map or object
      const mcqCount = sub.answers ? Object.keys(sub.answers).length : 0;
      const codingCount = sub.codingAnswers ? Object.keys(sub.codingAnswers).length : 0;
      
      return {
        id: sub._id,
        name: sub.candidateName || 'Unknown',
        email: sub.candidateEmail,
        startTime: sub.startTime,
        violations: sub.violations || [],
        answeredCount: mcqCount + codingCount
      };
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.sendProctorMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { candidateEmail, message } = req.body;

    if (!candidateEmail || !message) {
      return res.status(400).json({ message: 'Candidate email and message are required' });
    }

    eventController.broadcastEvent(id, {
      type: 'PROCTOR_MESSAGE',
      targetEmail: candidateEmail,
      message
    });

    res.json({ message: 'Proctor message sent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.forceSubmitCandidate = async (req, res) => {
  try {
    const { id } = req.params;

    const submission = await Submission.findById(id).populate('testId');
    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    if (submission.status === 'completed') {
      return res.status(400).json({ message: 'Submission already completed' });
    }

    // Run the full scoring flow — identical to what completeSubmission does
    const { calculateScore } = require('../services/testLifecycleService');
    submission.score = calculateScore(submission, submission.testId);
    submission.status = 'completed';
    submission.completedAt = new Date();
    await submission.save();

    // Targeted SSE — only this candidate's client will act on it
    eventController.broadcastEvent(String(submission.testId._id || submission.testId), {
      type: 'FORCE_SUBMIT',
      targetEmail: submission.candidateEmail
    });

    res.json({ message: 'Candidate force-submitted and graded. They cannot rejoin.' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.clearQueues = async (req, res) => {
  try {
    const { clearAllQueues } = require('../services/codeExecutionQueue');
    await clearAllQueues();
    res.json({ message: 'All BullMQ queues cleared successfully.' });
  } catch (error) {
    console.error('Clear Queues Error:', error);
    res.status(500).json({ message: 'Failed to clear queues' });
  }
};

exports.clearTestCache = async (req, res) => {
  try {
    const redisService = require('../services/redisClient');
    const client = redisService.getClient();
    if (client && redisService.isConnected()) {
      const keys = await client.keys('test:*');
      if (keys.length > 0) {
        await client.del(...keys);
      }
      res.json({ message: `Cleared ${keys.length} test cache entries.` });
    } else {
      res.json({ message: 'Redis not connected, no cache cleared.' });
    }
  } catch (error) {
    console.error('Clear Cache Error:', error);
    res.status(500).json({ message: 'Failed to clear cache' });
  }
};

exports.getTestDashboardData = async (req, res) => {
  try {
    const { id } = req.params;
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid test ID' });

    const submissions = await Submission.find({ testId: new mongoose.Types.ObjectId(id) })
      .select('candidateEmail candidateName feedback reportedProblems')
      .lean();

    const allFeedback = [];
    let totalRating = 0;
    let ratingCount = 0;
    const allReportedProblems = [];

    const testDoc = await Test.findById(id).select('questions codingQuestions').lean();

    submissions.forEach(sub => {
      if (sub.feedback && sub.feedback.rating) {
        allFeedback.push({
          candidateName: sub.candidateName,
          candidateEmail: sub.candidateEmail,
          rating: sub.feedback.rating,
          comment: sub.feedback.comment,
          timestamp: sub.feedback.timestamp
        });
        totalRating += sub.feedback.rating;
        ratingCount++;
      }
      if (sub.reportedProblems && sub.reportedProblems.length > 0) {
        sub.reportedProblems.forEach(rp => {
          let qDetails = null;
          if (rp.questionId && testDoc) {
            const mcq = testDoc.questions?.find(q => q._id.toString() === rp.questionId.toString());
            if (mcq) {
              qDetails = { type: 'mcq', text: mcq.questionText, options: mcq.options };
            } else {
              const codeQ = testDoc.codingQuestions?.find(q => q._id.toString() === rp.questionId.toString());
              if (codeQ) qDetails = { type: 'coding', title: codeQ.title, description: codeQ.description };
            }
          }
          allReportedProblems.push({
            ...rp,
            submissionId: sub._id,
            candidateName: sub.candidateName,
            candidateEmail: sub.candidateEmail,
            questionDetails: qDetails
          });
        });
      }
    });

    res.json({
      averageRating: ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : null,
      totalFeedback: ratingCount,
      feedbacks: allFeedback,
      reportedProblems: allReportedProblems
    });
  } catch (error) {
    console.error('getTestDashboardData Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.analyzeReportedIssue = async (req, res) => {
  try {
    const { submissionId, issueId } = req.params;
    const submission = await Submission.findById(submissionId).populate('testId');
    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    const issue = submission.reportedProblems.id(issueId);
    if (!issue) return res.status(404).json({ message: 'Issue not found' });

    let questionText = 'Unknown Question';
    let questionType = 'unknown';
    
    // Find question context
    const test = submission.testId;
    if (test) {
      const mcq = test.questions?.find(q => q._id.toString() === issue.questionId);
      if (mcq) { questionText = mcq.questionText; questionType = 'MCQ'; }
      const cq = test.codingQuestions?.find(q => q._id.toString() === issue.questionId);
      if (cq) { questionText = cq.title + '\\n' + cq.description; questionType = 'Coding'; }
    }

    const Groq = require("groq-sdk");
    const groqApiKey = req.headers['x-groq-api-key'] || process.env.GROQ_API_KEY;
    if (!groqApiKey) return res.status(500).json({ message: "GROQ_API_KEY is not configured. Please provide one in the AI Settings." });
    const groq = new Groq({ apiKey: groqApiKey });

    const prompt = `A candidate reported an issue with a test question.
Question Type: ${questionType}
Question Content: ${questionText}
Candidate's Report: ${issue.description}

Analyze if the candidate is correct in their report (e.g., is the question actually flawed, is the test case wrong, or is the candidate just confused?).
Respond in JSON format with two fields:
{
  "isCandidateCorrect": boolean,
  "analysis": "string detailing your reasoning"
}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" }
    });

    const resultStr = chatCompletion.choices[0]?.message?.content || '{}';
    const result = JSON.parse(resultStr);

    issue.aiEvaluation = {
      analysis: result.analysis || 'Analysis failed',
      isCandidateCorrect: !!result.isCandidateCorrect
    };

    await submission.save();

    res.json({ message: 'Issue analyzed', aiEvaluation: issue.aiEvaluation });
  } catch (error) {
    console.error('analyzeReportedIssue Error:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

exports.analyzeQuestionIssues = async (req, res) => {
  try {
    const { testId, questionId } = req.params;
    const test = await Test.findById(testId);
    if (!test) return res.status(404).json({ message: 'Test not found' });

    let questionText = 'Unknown Question';
    let questionType = 'unknown';

    const mcq = test.questions?.find(q => q._id.toString() === questionId);
    if (mcq) { questionText = mcq.questionText; questionType = 'MCQ'; }
    const cq = test.codingQuestions?.find(q => q._id.toString() === questionId);
    if (cq) { questionText = cq.title + '\\n' + cq.description; questionType = 'Coding'; }

    const submissions = await Submission.find({ testId, 'reportedProblems.questionId': questionId });
    if (!submissions || submissions.length === 0) return res.status(404).json({ message: 'No reported issues found for this question' });

    const reportedDescriptions = [];
    const issuesToUpdate = [];

    submissions.forEach(sub => {
      sub.reportedProblems.forEach(rp => {
        if (rp.questionId === questionId) {
          reportedDescriptions.push(`Candidate ${sub.candidateEmail}: ${rp.description}`);
          issuesToUpdate.push({ sub, rp });
        }
      });
    });

    const Groq = require("groq-sdk");
    const groqApiKey = req.headers['x-groq-api-key'] || process.env.GROQ_API_KEY;
    if (!groqApiKey) return res.status(500).json({ message: "GROQ_API_KEY is not configured. Please provide one in the AI Settings." });
    const groq = new Groq({ apiKey: groqApiKey });

    const prompt = `Multiple candidates reported issues with the same test question.
Question Type: ${questionType}
Question Content: ${questionText}
Candidate Reports: 
${reportedDescriptions.join('\\n')}

Analyze if the question is actually flawed based on these collective reports (e.g., is the question actually flawed, is the test case wrong, or are the candidates just confused?). 
Provide a single unified verdict that will be shown to the admin.
Respond in JSON format with two fields:
{
  "isCandidateCorrect": boolean,
  "analysis": "string detailing your reasoning"
}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" }
    });

    const resultStr = chatCompletion.choices[0]?.message?.content || '{}';
    const result = JSON.parse(resultStr);

    const aiEvaluation = {
      analysis: result.analysis || 'Analysis failed',
      isCandidateCorrect: !!result.isCandidateCorrect
    };

    // Save evaluation to all reported problems
    for (const { sub, rp } of issuesToUpdate) {
      rp.aiEvaluation = aiEvaluation;
      await sub.save();
    }

    res.json({ message: 'Issues analyzed collectively', aiEvaluation });
  } catch (error) {
    console.error('analyzeQuestionIssues Error:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

exports.analyzeOverallExperience = async (req, res) => {
  try {
    const { id } = req.params;
    const mongoose = require('mongoose');
    const submissions = await Submission.find({ testId: new mongoose.Types.ObjectId(id) })
      .select('feedback reportedProblems')
      .lean();

    const feedbacks = [];
    const issues = [];
    submissions.forEach(sub => {
      if (sub.feedback && sub.feedback.rating) feedbacks.push(sub.feedback);
      if (sub.reportedProblems && sub.reportedProblems.length > 0) issues.push(...sub.reportedProblems);
    });

    const Groq = require("groq-sdk");
    const groqApiKey = req.headers['x-groq-api-key'] || process.env.GROQ_API_KEY;
    if (!groqApiKey) return res.status(500).json({ message: "GROQ_API_KEY is not configured. Please provide one in the AI Settings." });
    const groq = new Groq({ apiKey: groqApiKey });

    const prompt = `Analyze the overall candidate experience for this test based on their feedback and reported issues.
Number of Feedback Responses: ${feedbacks.length}
Average Rating: ${feedbacks.length > 0 ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1) : 'N/A'}
Feedback Comments: ${JSON.stringify(feedbacks.map(f => f.comment).filter(Boolean))}
Reported Issues: ${JSON.stringify(issues.map(i => i.description))}

Please provide a highly concise, punchy markdown report (max 4-5 bullet points). Use emojis. Focus only on the most critical insights and 1-2 actionable steps.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
    });

    const analysis = chatCompletion.choices[0]?.message?.content || 'Analysis failed';
    res.json({ analysis });
  } catch (error) {
    console.error('analyzeOverallExperience Error:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

exports.exportTestResults = async (req, res) => {
  try {
    const { id } = req.params;
    const xlsx = require('xlsx');

    const test = await Test.findById(id).select('questions').lean();
    if (!test) return res.status(404).json({ message: 'Test not found' });

    const submissions = await Submission.find({ testId: id })
      .select('candidateEmail candidateName score status violations reportedProblems feedback answers')
      .lean();

    const data = submissions.map(sub => {
      let correct = 0;
      let attempted = 0;

      if (sub.answers && test.questions) {
        test.questions.forEach((q, idx) => {
          if (sub.answers[q._id] !== undefined) attempted++;
          if (sub.answers[q._id] === q.correctOptionIndex) correct++;
        });
      }

      const totalViolations = sub.violations ? sub.violations.reduce((sum, v) => sum + (v.count || 1), 0) : 0;
      const issues = sub.reportedProblems && sub.reportedProblems.length > 0 ? sub.reportedProblems.map(rp => rp.description).join('; ') : 'None';
      const feedbackScore = sub.feedback?.rating || 'N/A';
      const feedbackComment = sub.feedback?.comment || 'None';

      return {
        'Candidate Name': sub.candidateName || 'N/A',
        'Candidate Email': sub.candidateEmail,
        'Status': sub.status,
        'Score': sub.score || 0,
        'Attempted Questions': attempted,
        'Correct Questions': correct,
        'Violations': totalViolations,
        'Reported Issues': issues,
        'Feedback Rating': feedbackScore,
        'Feedback Comment': feedbackComment
      };
    });

    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Results");

    const excelBuffer = xlsx.write(wb, { bookType: 'xlsx', type: 'buffer' });

    res.setHeader('Content-Disposition', `attachment; filename="test_${id}_results.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(excelBuffer);

  } catch (error) {
    console.error('exportTestResults Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.exportCandidateReport = async (req, res) => {
  try {
    const { id } = req.params;
    const mongoose = require('mongoose');
    const xlsx = require('xlsx');

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid submission ID format' });
    }

    const submission = await Submission.findById(id).populate('testId').lean();
    if (!submission || !submission.testId) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    const test = submission.testId;
    const answersData = [];

    // Process MCQs
    if (test.questions) {
      test.questions.forEach((q, i) => {
        const candidateChoiceIdx = submission.answers ? submission.answers[q._id.toString()] : undefined;
        const candidateChose = candidateChoiceIdx !== undefined ? q.options[candidateChoiceIdx] : 'Unanswered';
        const correctAns = q.options[q.correctOptionIndex];
        const isCorrect = candidateChoiceIdx === q.correctOptionIndex;
        
        answersData.push({
          'Q#': `MCQ-${i + 1}`,
          'Question': q.questionText,
          'Type': 'Multiple Choice',
          'Candidate Answer': candidateChose,
          'Correct Answer': correctAns,
          'Status': isCorrect ? 'Correct' : (candidateChoiceIdx !== undefined ? 'Incorrect' : 'Blank'),
          'Points Earned': isCorrect ? (q.points || 1) : 0,
          'Max Points': q.points || 1
        });
      });
    }

    // Process Coding
    if (test.codingQuestions) {
      test.codingQuestions.forEach((q, i) => {
        const ans = submission.codingAnswers ? submission.codingAnswers[q._id.toString()] : null;
        
        answersData.push({
          'Q#': `CODE-${i + 1}`,
          'Question': q.title,
          'Type': 'Coding',
          'Candidate Answer': ans ? (ans.sourceCode ? `Code Submitted (${ans.language})` : 'Blank') : 'Blank',
          'Correct Answer': 'N/A',
          'Status': ans ? `Passed ${ans.passedCases || 0}/${q.testCases?.length || 0}` : 'Blank',
          'Points Earned': ans ? (ans.score || 0) : 0,
          'Max Points': q.points || 10
        });
      });
    }

    const summaryData = [{
      'Candidate Name': submission.candidateName || 'Unknown',
      'Candidate Email': submission.candidateEmail,
      'Test Title': test.title,
      'Final Score': submission.score || 0,
      'Status': submission.status,
      'Feedback Rating': submission.feedback?.rating || 'N/A',
      'Violations Count': submission.violations ? submission.violations.reduce((sum, v) => sum + (v.count || 1), 0) : 0,
      'Issues Reported': submission.reportedProblems ? submission.reportedProblems.length : 0
    }];

    const wb = xlsx.utils.book_new();
    
    // Add summary sheet
    const wsSummary = xlsx.utils.json_to_sheet(summaryData);
    xlsx.utils.book_append_sheet(wb, wsSummary, "Summary");
    
    // Add detailed answers sheet
    const wsDetails = xlsx.utils.json_to_sheet(answersData);
    xlsx.utils.book_append_sheet(wb, wsDetails, "Detailed Answers");

    const excelBuffer = xlsx.write(wb, { bookType: 'xlsx', type: 'buffer' });

    res.setHeader('Content-Disposition', `attachment; filename="candidate_${submission.candidateEmail}_report.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(excelBuffer);

  } catch (error) {
    console.error('exportCandidateReport Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
