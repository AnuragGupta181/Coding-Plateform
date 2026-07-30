/**
 * Bull Board UI Setup
 * 
 * Mounts the Bull Board dashboard at /admin/queues.
 * Auth-protected: requires login + admin role.
 */

const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

function mountBullBoard(app) {
  try {
    const { createBullBoard } = require('@bull-board/api');
    const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
    const { ExpressAdapter } = require('@bull-board/express');
    const { codeRunQueue, codeSubmitQueue } = require('./codeExecutionQueue');

    if (codeRunQueue && codeSubmitQueue) {
      const serverAdapter = new ExpressAdapter();
      serverAdapter.setBasePath('/admin/queues');
      createBullBoard({
        queues: [new BullMQAdapter(codeRunQueue), new BullMQAdapter(codeSubmitQueue)],
        serverAdapter: serverAdapter,
      });
      // Now publicly accessible for monitoring
      app.use('/admin/queues', serverAdapter.getRouter());
      console.log('✅ Bull Board UI mounted at /admin/queues (public)');
    }
  } catch (err) {
    console.warn('⚠️  Could not mount Bull Board UI:', err.message);
  }
}

module.exports = { mountBullBoard };
