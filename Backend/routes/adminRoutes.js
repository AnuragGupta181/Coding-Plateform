const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

router.use(requireAuth);
router.use(requireAdmin);

router.post('/test', adminController.createTest);
router.post('/test/:id/open-waiting-room', adminController.openWaitingRoom);
router.post('/test/:id/start', adminController.startTest);
router.post('/test/:id/complete', adminController.completeTest);
router.post('/test/:id/auto-submit', adminController.autoSubmitTest);

// Excel/CSV bulk question upload — parses file and returns questions for preview (no DB write)
router.post('/parse-questions', upload.single('file'), adminController.parseQuestionsFromExcel);

// Coding question management
router.post('/test/:id/coding-question', adminController.createCodingQuestion);

router.get('/tests/history', adminController.getTestHistory);
router.get('/tests/queues', adminController.getWaitingQueues);
router.get('/test/:id/results', adminController.getTestResults);
router.get('/submission/:id', adminController.getSubmissionDetails);

// Dashboard and AI features
router.get('/test/:id/dashboard', adminController.getTestDashboardData);
router.post('/test/:id/analyze-overall', adminController.analyzeOverallExperience);
router.post('/issue/:submissionId/:issueId/analyze', adminController.analyzeReportedIssue);

module.exports = router;

