const express = require('express');
const router = express.Router();
const testCommandRoutes = require('./testCommandRoutes');
const adminCommandRoutes = require('./adminCommandRoutes');
const codeRoutes = require('./codeRoutes');
const { requireAuth } = require('../middleware/authMiddleware');

// ── Command Service Routes (POST /api/command/...) ────────────────────────────
// All write routes. Safe to scale independently from the query service.

// Test submissions (requireAuth enforced inside testCommandRoutes or here)
router.use(requireAuth, testCommandRoutes);

// Admin commands (requireAuth + requireAdmin enforced inside adminCommandRoutes)
router.use('/admin', adminCommandRoutes);

// Code execution (requireAuth enforced inside codeRoutes)
router.use('/code', codeRoutes);

module.exports = router;
