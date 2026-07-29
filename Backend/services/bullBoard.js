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
      // Auth-protected: require login + admin role to access Bull Board
      app.use('/admin/queues', requireAuth, requireAdmin, serverAdapter.getRouter());
      console.log('✅ Bull Board UI mounted at /admin/queues (auth-protected)');
    }
  } catch (err) {
    console.warn('⚠️  Could not mount Bull Board UI:', err.message);
  }
}

module.exports = { mountBullBoard };
