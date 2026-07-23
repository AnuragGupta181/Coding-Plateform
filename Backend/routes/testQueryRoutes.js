const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');

// ── Query (Read-Only) Test Routes ─────────────────────────────────────────────
router.get('/tests/available', testController.getAvailableTests);
router.get('/test/:id', testController.getTest);
router.get('/submissions/me', testController.getStudentSubmissions);

module.exports = router;
