const express = require('express');
const router = express.Router();
const codeController = require('../controllers/codeController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

// Run code with custom stdin (unscored, for "Run" button)
router.post('/run', codeController.runCode);

// Submit code against hidden test cases (scored)
router.post('/submit/:testId/:questionId', codeController.submitCode);

// Analyze code using AI (Groq)
router.post('/analyze', codeController.analyzeCode);

// Chat with AI about code (Groq)
router.post('/chat', codeController.chatWithCode);

module.exports = router;
