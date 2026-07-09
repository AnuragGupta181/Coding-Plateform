const Test = require('../models/test');
const Submission = require('../models/submission');
const { calculateScore } = require('../services/testLifecycleService');
const cache = require('../services/redisClient');

const TEST_CACHE_TTL = 600; // Cache test documents for 10 minutes

// ── GET /api/tests (Available tests for candidates) ──────────────────────────
exports.getAvailableTests = async (req, res) => {
  try {
    const cacheKey = 'tests:available';
    
    // 1. Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // 2. Cache miss — read from DB
    // .lean() skips Mongoose document overhead — returns plain JS objects (~40% faster)
    const tests = await Test.find(
      { status: { $in: ['scheduled', 'waiting', 'active'] } },
      'title description durationInMinutes status createdAt startedAt completedAt testType'
    ).lean();
    
    // 3. Store in cache for 60 seconds (short TTL since test statuses change)
    await cache.set(cacheKey, tests, 60);

    res.json(tests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET /api/test/:id ─────────────────────────────────────────────────────────
// Hot path: called by every student when the exam starts.
// Redis caches the test document so 1000 students only cause 1 DB read.
exports.getTest = async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `test:data:${id}`;

    // 1. Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // 2. Cache miss — read from DB
    const test = await Test.findById(id).lean();
    if (!test) return res.status(404).json({ message: 'Test not found' });

    // 3. Store in cache for the next 999 students
    await cache.set(cacheKey, test, TEST_CACHE_TTL);

    res.json(test);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── POST /api/test/start ──────────────────────────────────────────────────────
exports.startSubmission = async (req, res) => {
  try {
    const { candidateEmail, candidateName, testId } = req.body;

    // .lean() — we only need status field, don't need a Mongoose document
    const test = await Test.findById(testId, 'status').lean();

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    if (test.status !== 'active') {
      return res.status(403).json({ message: 'Test is not active' });
    }

    // Atomic upsert — eliminates race condition where two simultaneous
    // requests both pass the findOne check and both create a new submission.
    const submission = await Submission.findOneAndUpdate(
      { candidateEmail, testId },
      {
        $setOnInsert: {
          candidateEmail,
          candidateName,
          testId,
          status: 'active',
          answers: {},
          score: 0,
        }
      },
      { upsert: true, new: true }
    );

    if (submission.status === 'completed') {
      return res.status(403).json({ message: 'Test already submitted' });
    }

    res.status(200).json(submission);
  } catch (error) {
    // Handle the rare case of a duplicate key race at the DB index level
    if (error.code === 11000) {
      const existing = await Submission.findOne({ candidateEmail: req.body.candidateEmail, testId: req.body.testId });
      if (existing?.status === 'completed') {
        return res.status(403).json({ message: 'Test already submitted' });
      }
      return res.status(200).json(existing);
    }
    res.status(500).json({ message: error.message });
  }
};

// ── PATCH /api/submission/:submissionId/answer ────────────────────────────────
exports.saveAnswer = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { questionId, answerIndex } = req.body;

    // Atomic $set — no full document read needed. One targeted DB write.
    const result = await Submission.findOneAndUpdate(
      { _id: submissionId, status: 'active' },
      { $set: { [`answers.${questionId}`]: answerIndex } },
      { new: false } // We don't need the updated doc back, saves bandwidth
    );

    if (!result) {
      const exists = await Submission.exists({ _id: submissionId });
      if (!exists) return res.status(404).json({ message: 'Submission not found' });
      return res.status(403).json({ message: 'Test already completed' });
    }

    res.json({ message: 'Answer saved successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── DELETE /api/submission/:submissionId/answer ───────────────────────────────
exports.clearAnswer = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { questionId } = req.body;

    // Atomic $unset — removes the single answer key without reading the full document.
    const result = await Submission.findOneAndUpdate(
      { _id: submissionId, status: 'active' },
      { $unset: { [`answers.${questionId}`]: '' } },
      { new: false }
    );

    if (!result) {
      const exists = await Submission.exists({ _id: submissionId });
      if (!exists) return res.status(404).json({ message: 'Submission not found' });
      return res.status(403).json({ message: 'Test already completed' });
    }

    res.json({ message: 'Answer cleared successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── POST /api/submission/:submissionId/complete ───────────────────────────────
exports.completeSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;

    const submission = await Submission.findById(submissionId).populate('testId');
    if (!submission) return res.status(404).json({ message: 'Submission not found' });
    if (submission.status === 'completed') return res.status(403).json({ message: 'Already submitted' });

    submission.score = calculateScore(submission, submission.testId);
    submission.status = 'completed';
    await submission.save();

    res.json({ message: 'Test submitted and graded successfully', score: submission.score, submission });
  } catch (error) {
    console.error('Complete Submission Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ── POST /api/submission/:submissionId/violation ──────────────────────────────
exports.logViolation = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { type, timestamp, count } = req.body;

    // Atomic $push — appends to violations array without reading the full document.
    const result = await Submission.findOneAndUpdate(
      { _id: submissionId, status: 'active' },
      { $push: { violations: { type, timestamp: new Date(timestamp), count } } },
      { new: true, projection: { violations: { $slice: -1 } } }
    );

    if (!result) {
      const exists = await Submission.exists({ _id: submissionId });
      if (!exists) return res.status(404).json({ message: 'Submission not found' });
      return res.status(403).json({ message: 'Test already completed' });
    }

    res.json({ message: 'Violation logged' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
