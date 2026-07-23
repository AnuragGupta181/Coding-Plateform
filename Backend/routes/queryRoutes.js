const express = require('express');
const router = express.Router();
const testQueryRoutes = require('./testQueryRoutes');
const adminQueryRoutes = require('./adminQueryRoutes');
const eventRoutes = require('./eventRoutes');
const { requireAuth } = require('../middleware/authMiddleware');

// ── Query Service Routes (GET /api/query/...) ─────────────────────────────────
// All read-only routes. Safe to run on a read-replica or separate service.

// Public + auth-gated test reads
router.use(requireAuth, testQueryRoutes);

// Admin reads (requireAuth + requireAdmin enforced inside adminQueryRoutes)
router.use('/admin', adminQueryRoutes);

// SSE events (GET only — long-lived streams)
router.use('/events', eventRoutes);

module.exports = router;
