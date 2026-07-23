const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');

// ── Command (Write) Test Routes ───────────────────────────────────────────────
router.post('/submission/start', testController.startSubmission);
router.post('/submission/:submissionId/save-answer', testController.saveAnswer);
router.post('/submission/:submissionId/clear-answer', testController.clearAnswer);
router.post('/submission/:submissionId/complete', testController.completeSubmission);
router.post('/submission/:submissionId/log-violation', testController.logViolation);

module.exports = router;
