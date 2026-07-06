const express = require('express');
const router = express.Router();
const authController = require('../controllers/authControllerRedis');

router.post('/signup', authController.signup);
router.post('/verify', authController.verifyOTP);
router.post('/resend-otp', authController.resendOTP);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
