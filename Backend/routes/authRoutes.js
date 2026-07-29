const express = require('express');
const router = express.Router();
const authController = require('../controllers/authControllerRedis');
const {
  validateSignup,
  validateVerifyOTP,
  validateResendOTP,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
} = require('../middleware/authValidator');

router.post('/signup', validateSignup, authController.signup);
router.post('/verify', validateVerifyOTP, authController.verifyOTP);
router.post('/resend-otp', validateResendOTP, authController.resendOTP);
router.post('/login', validateLogin, authController.login);
router.post('/forgot-password', validateForgotPassword, authController.forgotPassword);
router.post('/reset-password', validateResetPassword, authController.resetPassword);

module.exports = router;
