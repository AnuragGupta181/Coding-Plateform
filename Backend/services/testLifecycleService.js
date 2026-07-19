const Test = require('../models/test');
const Submission = require('../models/submission');
const eventController = require('../controllers/eventController');

function getAnswerValue(answers, questionId) {
  if (!answers) return undefined;
  if (answers instanceof Map) {
    return answers.get(questionId);
  }
  if (typeof answers.get === 'function') {
    return answers.get(questionId);
  }
  return answers[questionId];
}

function calculateScore(submission, test) {
  let totalScore = 0;

  test.questions.forEach((question) => {
    const candidateAnswer = getAnswerValue(submission.answers, question._id.toString());
    // Ensure both are numbers for comparison
    if (candidateAnswer !== undefined && Number(candidateAnswer) === Number(question.correctOptionIndex)) {
      totalScore += question.points || 1;
    }
  });

  if (submission.codingAnswers) {
    let codingScore = 0;
    if (submission.codingAnswers instanceof Map) {
      submission.codingAnswers.forEach((ans) => {
        codingScore += ans.score || 0;
      });
    } else {
      // Plain object
      Object.values(submission.codingAnswers).forEach((ans) => {
        codingScore += ans.score || 0;
      });
    }
    totalScore += codingScore;
  }

  return totalScore;
}

function isTestExpired(test) {
  if (!test || test.status !== 'active' || !test.startedAt) {
    return false;
  }

  const endTime = new Date(test.startedAt).getTime() + (test.durationInMinutes * 60 * 1000);
  return Date.now() >= endTime;
}

async function completeTestAndAutoSubmit(testId, reason = 'manual') {
  const test = await Test.findById(testId);
  if (!test) {
    return { found: false, alreadyCompleted: false, autoSubmittedCount: 0, test: null };
  }

  // Find ALL active submissions for this test
  const activeSubmissions = await Submission.find({ testId, status: 'active' });

  if (activeSubmissions.length > 0) {
    // Calculate scores in-memory (no DB hit per submission)
    const bulkOps = activeSubmissions.map((submission) => ({
      updateOne: {
        filter: { _id: submission._id },
        update: {
          $set: {
            score: calculateScore(submission, test),
            status: 'completed',
            completedAt: new Date()
          }
        }
      }
    }));

    // Single bulk write — replaces N individual save() calls
    await Submission.bulkWrite(bulkOps, { ordered: false });
  }

  const wasAlreadyCompleted = test.status === 'completed';

  test.status = 'completed';
  if (!test.completedAt) {
    test.completedAt = new Date();
  }
  await test.save();

  eventController.broadcastEvent(String(testId), {
    type: 'AUTO_SUBMIT',
    testId: String(testId),
    reason,
    completedAt: test.completedAt.toISOString()
  });

  return {
    found: true,
    alreadyCompleted: wasAlreadyCompleted,
    autoSubmittedCount: activeSubmissions.length,
    test
  };
}

async function completeExpiredTests() {
  const activeTests = await Test.find({ status: 'active', startedAt: { $ne: null } });

  // Filter expired tests first (in-memory, no DB call)
  const expiredTests = activeTests.filter(isTestExpired);

  if (expiredTests.length === 0) return [];

  // Process all expired tests concurrently instead of sequentially
  const results = await Promise.all(
    expiredTests.map((test) => completeTestAndAutoSubmit(test._id, 'duration_expired'))
  );

  return results;
}

module.exports = {
  calculateScore,
  isTestExpired,
  completeTestAndAutoSubmit,
  completeExpiredTests
};
