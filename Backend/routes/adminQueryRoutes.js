const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const proctorController = require('../controllers/proctorController');
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

// ── Camera Proctoring (Real-Time Monitoring) ──────────────────────────────────
// Active students currently connected via Socket.IO (in-memory, no DB)
router.get('/test/:id/proctor/students', proctorController.getActiveProctorStudents);
// Camera violation summary per candidate for a test (from DB)
router.get('/test/:id/proctor/violations', proctorController.getCameraViolationSummary);

module.exports = router;
