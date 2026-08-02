const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

router.use(requireAuth);
router.use(requireAdmin);

// ── Query (Read-Only) Admin Routes ────────────────────────────────────────────
router.get('/tests/history', adminController.getTestHistory);
router.get('/tests/queues', adminController.getWaitingQueues);
router.get('/test/:id/results', adminController.getTestResults);
router.get('/test/:id/active-users', adminController.getActiveTestUsers);
router.get('/submission/:id', adminController.getSubmissionDetails);

// Export test results to excel
router.get('/test/:id/export', adminController.exportTestResults);
router.get('/submission/:id/export', adminController.exportCandidateReport);

// Dashboard data
router.get('/test/:id/dashboard', adminController.getTestDashboardData);

module.exports = router;
