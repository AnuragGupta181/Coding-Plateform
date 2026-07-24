const Test = require('../models/test');
const eventController = require('../controllers/eventController');
const cache = require('./redisClient');

/**
 * Checks for scheduled tests that are within 5 minutes of their start time
 * and automatically opens the waiting room (status -> 'waiting').
 */
async function checkScheduledTests() {
  try {
    const now = new Date();
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    
    // 1. Find all tests that are scheduled and scheduledFor <= 5 minutes from now
    const upcomingTests = await Test.find({
      status: 'scheduled',
      scheduledFor: { $ne: null, $lte: fiveMinutesFromNow }
    });

    for (const test of upcomingTests) {
      test.status = 'waiting';
      await test.save();
      
      await cache.del('tests:available');
      await cache.del(`test:data:${test._id}`);

      // Broadcast to waiting room candidates (though there shouldn't be any yet, it signals clients if they were polling)
      eventController.broadcastEvent(String(test._id), {
        type: 'ALLOW_ENTRY',
        testId: String(test._id),
        message: 'Waiting room is now open for candidates.'
      });
      
      console.log(`⏰ Auto-opened waiting room for test: ${test.title} (${test._id})`);
    }

    // 2. Find all tests that are waiting (or scheduled) and scheduledFor <= now
    const readyToStartTests = await Test.find({
      status: { $in: ['scheduled', 'waiting'] },
      scheduledFor: { $ne: null, $lte: now }
    });

    for (const test of readyToStartTests) {
      test.status = 'active';
      test.startedAt = now;
      await test.save();

      await cache.del('tests:available');
      await cache.del(`test:data:${test._id}`);

      eventController.broadcastEvent(String(test._id), {
        type: 'START',
        testId: String(test._id),
        startedAt: test.startedAt
      });

      console.log(`🚀 Auto-started scheduled test: ${test.title} (${test._id})`);
    }
  } catch (err) {
    console.error('Error checking scheduled tests:', err.message);
  }
}

function startScheduleWatcher() {
  // Run immediately on boot, then every 30 seconds
  checkScheduledTests();
  setInterval(checkScheduledTests, 30000);
}

module.exports = { startScheduleWatcher, checkScheduledTests };
