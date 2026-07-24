const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

router.use(requireAuth);
router.use(requireAdmin);

// ── Command (Write) Admin Routes ──────────────────────────────────────────────
router.post('/test', adminController.createTest);
router.post('/test/:id/open-waiting-room', adminController.openWaitingRoom);
router.post('/test/:id/start', adminController.startTest);
router.post('/test/:id/complete', adminController.completeTest);
router.post('/test/:id/auto-submit', adminController.autoSubmitTest);

// Excel/CSV bulk question upload — parses file and returns questions for preview (no DB write)
router.post('/parse-questions', upload.single('file'), adminController.parseQuestionsFromExcel);

// Coding question management
router.post('/test/:id/coding-question', adminController.createCodingQuestion);

// Proctor communication
router.post('/test/:id/message', adminController.sendProctorMessage);

// Force-submit a single candidate's submission
router.post('/submission/:id/force-submit', adminController.forceSubmitCandidate);

module.exports = router;
