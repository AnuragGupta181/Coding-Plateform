const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  purpose: {
    type: String,
    enum: ['signup', 'password_reset'],
    default: 'signup',
    required: true
  },
  createdAt: { type: Date, default: Date.now, expires: 600 } // OTP expires in 10 minutes
});

// Compound index: fast OTP lookup by email+purpose (hot path on every login & signup)
otpSchema.index({ email: 1, purpose: 1 });

module.exports = mongoose.model('OTP', otpSchema);
