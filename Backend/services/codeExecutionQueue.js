const { Queue, Worker } = require('bullmq');
const { executeCode, runAgainstTestCases } = require('./judge0Service');
const Test = require('../models/test');
const Submission = require('../models/submission');
const eventController = require('../controllers/eventController');
const { getClient } = require('./redisClient');

const REDIS_URL = process.env.REDIS_URL;

// Re-use the existing redis client if possible, or create a standard connection object for BullMQ
let connection = null;
if (REDIS_URL) {
  try {
    const IORedis = require('ioredis');
    connection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false
    });
  } catch (err) {
    console.error('Failed to initialize BullMQ Redis connection:', err);
  }
}

let codeRunQueue = null;
let codeSubmitQueue = null;

if (connection) {
  // 1. Initialize Queues
  codeRunQueue = new Queue('code-run-queue', { connection });
  codeSubmitQueue = new Queue('code-submit-queue', { connection });

  // 2. Worker for 'Run Code' (Custom Input, No scoring)
  const codeRunWorker = new Worker(
    'code-run-queue',
    async (job) => {
      const { sourceCode, language, stdin, testId, userEmail, questionId } = job.data;
      try {
        const result = await executeCode({ sourceCode, language, stdin });
        
        // Broadcast success to SSE
        if (testId && userEmail) {
          eventController.broadcastEvent(testId, {
            type: 'CODE_RUN_RESULT',
            targetEmail: userEmail,
            questionId,
            result
          });
        }
        return result;
      } catch (error) {
        // Broadcast error to SSE
        if (testId && userEmail) {
          eventController.broadcastEvent(testId, {
            type: 'CODE_RUN_RESULT',
            targetEmail: userEmail,
            questionId,
            result: { stdout: '', stderr: error.message || 'Execution failed', status: 'Error' }
          });
        }
        throw error;
      }
    },
    { connection, concurrency: 10 }
  );

  // 3. Worker for 'Submit Code' (Official Hidden Test Cases + Scoring)
  const codeSubmitWorker = new Worker(
    'code-submit-queue',
    async (job) => {
      const { testId, questionId, sourceCode, language, submissionId, userEmail } = job.data;
      
      try {
        const test = await Test.findById(testId);
        if (!test) throw new Error('Test not found');
        
        const question = test.codingQuestions.id(questionId);
        if (!question) throw new Error('Question not found');
        
        const submission = await Submission.findById(submissionId);
        if (!submission) throw new Error('Submission not found');

        // Evaluate against Judge0
        const { results, passed, total } = await runAgainstTestCases({
          sourceCode,
          language,
          testCases: question.testCases,
        });

        const score = total > 0 ? Math.round((passed / total) * question.points) : 0;
        const verdict = passed === total ? 'Accepted' : `${passed}/${total} Test Cases Passed`;

        const finalResult = {
          passed,
          total,
          score,
          maxScore: question.points,
          verdict,
          results
        };

        // Save result safely to DB
        submission.codingAnswers.set(questionId, {
          sourceCode,
          language,
          score,
          verdict,
          passed,
          total,
          testCaseResults: results.map(r => ({
            passed: r.passed,
            actualOutput: r.actualOutput,
            error: r.error
          }))
        });
        await submission.save();

        // Broadcast success to SSE
        if (testId && userEmail) {
          eventController.broadcastEvent(testId, {
            type: 'CODE_SUBMIT_RESULT',
            targetEmail: userEmail,
            questionId,
            result: finalResult
          });
        }

        return finalResult;
      } catch (error) {
        console.error(`Code submit worker error for submission ${submissionId}:`, error.message);
        
        if (testId && userEmail) {
          eventController.broadcastEvent(testId, {
            type: 'CODE_SUBMIT_RESULT',
            targetEmail: userEmail,
            questionId,
            result: {
              passed: 0, total: 0, score: 0, maxScore: 0,
              verdict: 'Submission failed (Internal Error)',
              results: []
            }
          });
        }
        throw error;
      }
    },
    { connection, concurrency: 20 }
  );

  codeRunWorker.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed in code-run-queue: ${err.message}`);
  });

  codeSubmitWorker.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed in code-submit-queue: ${err.message}`);
  });
  
  console.log('✅ BullMQ initialized: code-run-queue and code-submit-queue active');
} else {
  console.warn('⚠️  REDIS_URL not set — BullMQ queues disabled');
}

/**
 * Push a run code job to the queue
 */
async function enqueueRunCode(data) {
  if (!codeRunQueue) throw new Error('Queue not initialized (Requires Redis)');
  const job = await codeRunQueue.add('run-code', data, {
    removeOnComplete: { count: 500 }, // Keep last 500 completed jobs for Bull Board monitoring
    removeOnFail: { count: 1000 }      // Keep last 1000 failed jobs for debugging
  });
  return job.id;
}

/**
 * Push a submit code job to the queue
 */
async function enqueueSubmitCode(data) {
  if (!codeSubmitQueue) throw new Error('Queue not initialized (Requires Redis)');
  const job = await codeSubmitQueue.add('submit-code', data, {
    removeOnComplete: { count: 500 }, // Keep last 500 completed jobs for Bull Board monitoring
    removeOnFail: { count: 1000 }      // Keep last 1000 failed jobs for debugging
  });
  return job.id;
}

/**
 * Obliterate and clear all jobs in BullMQ queues
 */
async function clearAllQueues() {
  if (codeRunQueue) {
    await codeRunQueue.obliterate({ force: true });
  }
  if (codeSubmitQueue) {
    await codeSubmitQueue.obliterate({ force: true });
  }
}

module.exports = {
  enqueueRunCode,
  enqueueSubmitCode,
  clearAllQueues,
  codeRunQueue,
  codeSubmitQueue
};
