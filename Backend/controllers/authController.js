const User = require('../models/user');
const RegistrationUser = require('../models/registrationUser');
const OTP = require('../models/otp');
const emailService = require('../services/emailService');
const jwt = require('jsonwebtoken');
const config = require('../config');
const bcrypt = require('bcryptjs');

const PASSWORD_MIN_LENGTH = 8;
const OTP_PURPOSE = {
  SIGNUP: 'signup',
  PASSWORD_RESET: 'password_reset'
};

function sanitizeUser(user) {
  const userObject = user.toObject();
  delete userObject.password;
  return userObject;
}

function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    config.jwtSecret,
    { expiresIn: '1d' }
  );
}

// 1. Signup - Sends OTP
exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      return res.status(400).json({ message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.` });
    }

    const emailRegex = /^[a-zA-Z]+25\d{4,7}@akgec\.ac\.in$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format. Example: namestudentno@akgec.ac.in (student no must start with 25)' });
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user && user.isVerified) {
      return res.status(400).json({ message: 'User already exists and is verified. Please login.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    if (!user) {
      user = new User({ name, email, password: hashedPassword, isVerified: false });
    } else {
      user.name = name;
      user.password = hashedPassword;
      user.isVerified = false;
    }
    await user.save();

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in DB (upsert if exists)
    await OTP.findOneAndUpdate(
      { email, purpose: OTP_PURPOSE.SIGNUP },
      { otp: otpCode, purpose: OTP_PURPOSE.SIGNUP, createdAt: Date.now() },
      { upsert: true, returnDocument: 'after' }
    );

    // Send Email
    await emailService.sendOTP(email, otpCode);

    res.json({ message: 'OTP sent to your email.' });
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// 2. Verify OTP and Finish Registration
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const otpRecord = await OTP.findOne({ email, otp, purpose: OTP_PURPOSE.SIGNUP });
    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    let user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User registration not found. Please signup again.' });
    }

    user.isVerified = true;
    await user.save();

    // Delete OTP after verification
    await OTP.deleteOne({ email, purpose: OTP_PURPOSE.SIGNUP });

    // Generate JWT
    const token = signToken(user);

    res.json({ message: 'Verification successful', token, user: sanitizeUser(user) });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// 3. Resend OTP
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user exists (should exist if they are on verify page)
    const otpRecord = await OTP.findOne({ email, purpose: OTP_PURPOSE.SIGNUP });
    if (!otpRecord) {
      return res.status(404).json({ message: 'No active verification session found. Please signup again.' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Update OTP in DB
    otpRecord.otp = otpCode;
    otpRecord.createdAt = Date.now(); // Reset expiry timer
    await otpRecord.save();

    // Send Email
    await emailService.sendOTP(email, otpCode);

    res.json({ message: 'OTP resent to your email.' });
  } catch (error) {
    console.error('Resend OTP Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// 4. Login - Simple OTP-based login (can be expanded)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    let user = await User.findOne({ email }).select('+password');
    
    if (!user || !user.isVerified) {
      // Check Registration DB
      const regUser = await RegistrationUser.findOne({ email });
      if (!regUser || !regUser.isVerified) {
        return res.status(404).json({ message: 'User not found or not verified.' });
      }

      // Check if the provided password matches the phone number in registration DB
      if (password !== regUser.phone) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }

      // Import user to primary DB
      const hashedPassword = await bcrypt.hash(password, 12);
      
      if (!user) {
         user = new User({
            name: regUser.name,
            email: regUser.email,
            password: hashedPassword,
            mobileNumber: regUser.phone,
            isVerified: true
         });
      } else {
         // User exists but not verified in primary DB, so update and verify them
         user.name = regUser.name;
         user.password = hashedPassword;
         user.mobileNumber = regUser.phone;
         user.isVerified = true;
      }
      
      await user.save();
    } else {
      if (!user.password) {
        return res.status(401).json({ message: 'Password login is not configured for this user.' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }
    }

    const token = signToken(user);

    res.json({ token, user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const user = await User.findOne({ email });
    if (!user || !user.isVerified) {
      return res.json({ message: 'If that account exists, a reset OTP has been sent.' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.findOneAndUpdate(
      { email, purpose: OTP_PURPOSE.PASSWORD_RESET },
      { otp: otpCode, purpose: OTP_PURPOSE.PASSWORD_RESET, createdAt: Date.now() },
      { upsert: true, returnDocument: 'after' }
    );

    await emailService.sendPasswordResetOTP(email, otpCode);

    res.json({ message: 'If that account exists, a reset OTP has been sent.' });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    if (!email || !otp || !password) {
      return res.status(400).json({ message: 'Email, OTP, and password are required.' });
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      return res.status(400).json({ message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.` });
    }

    const otpRecord = await OTP.findOne({
      email,
      otp,
      purpose: OTP_PURPOSE.PASSWORD_RESET
    });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired reset OTP.' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !user.isVerified) {
      return res.status(404).json({ message: 'User not found or not verified.' });
    }

    user.password = await bcrypt.hash(password, 12);
    await user.save();
    await OTP.deleteOne({ email, purpose: OTP_PURPOSE.PASSWORD_RESET });

    res.json({ message: 'Password reset successful. Please login with your new password.' });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ message: error.message });
  }
};
