const express = require('express');
const router = express.Router();
const testQueryRoutes = require('./testQueryRoutes');
const adminQueryRoutes = require('./adminQueryRoutes');
const eventRoutes = require('./eventRoutes');
const { requireAuth } = require('../middleware/authMiddleware');

// ── Query Service Routes (GET /api/query/...) ─────────────────────────────────
// All read-only routes. Safe to run on a read-replica or separate service.

// SSE events (GET only — long-lived streams)
// Uses requireAuth (which now supports ?token=... query param for EventSource)
router.use('/events', requireAuth, eventRoutes);

// Public + auth-gated test reads
// Note: router.use(middleware, subRouter) applies middleware to EVERYTHING defined after it if path is omitted,
// so /events must be defined above this line!
router.use(requireAuth, testQueryRoutes);

// Admin reads (requireAuth + requireAdmin enforced inside adminQueryRoutes)
router.use('/admin', adminQueryRoutes);

module.exports = router;
