const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');

// Test routes
router.get('/tests/available', testController.getAvailableTests);
router.get('/test/:id', testController.getTest);
router.get('/submissions/me', testController.getStudentSubmissions);

// Submission routes
router.post('/submission/start', testController.startSubmission);
router.post('/submission/:submissionId/save-answer', testController.saveAnswer);
router.post('/submission/:submissionId/clear-answer', testController.clearAnswer);
router.post('/submission/:submissionId/complete', testController.completeSubmission);
router.post('/submission/:submissionId/log-violation', testController.logViolation);

module.exports = router;

