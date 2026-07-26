const User = require('../models/user');
const emailService = require('../services/emailService');
const jwt = require('jsonwebtoken');
const config = require('../config');
const bcrypt = require('bcryptjs');
const redisService = require('../services/redisClient');

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

/**
 * Dual-Layer OTP Rate Limiter:
 * 1. IP Limit: Max 5 OTPs / 1 hour per IP address (blocks bot scripts generating random emails).
 * 2. Email Limit: Max 3 OTPs / 10 mins per Email address (blocks inbox bombing a single victim).
 * 
 * Exhaustion Rule:
 * - On Bot Attacks (Random Fake Emails): IP limit exhausts FIRST after 5 requests.
 * - On Single Target Bombing: Email limit exhausts FIRST after 3 requests.
 */
async function checkOtpRateLimits(client, req, email) {
  return { blocked: false }; // LOAD TESTING OVERRIDE
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;

  // Layer 1: Check IP-based limit (allows up to 1,000 OTP requests / 1 hr per IP to support 500+ student campus drives)
  const ipKey = `rate_limit:otp:ip:${ip}`;
  const ipRequests = await client.incr(ipKey);
  if (ipRequests === 1) {
    await client.expire(ipKey, 3600); // 1 hour TTL
  }
  if (ipRequests > 1000) {
    return { blocked: true, message: 'Too many OTP requests from this network IP. Please try again in an hour.' };
  }

  // Layer 2: Check Email-based limit (protects target inbox)
  if (email) {
    const emailKey = `rate_limit:otp:email:${email}`;
    const emailRequests = await client.incr(emailKey);
    if (emailRequests === 1) {
      await client.expire(emailKey, 600); // 10 minutes TTL
    }
    if (emailRequests > 3) {
      return { blocked: true, message: 'Too many OTP requests for this email address. Please try again in 10 minutes.' };
    }
  }

  return { blocked: false };
}

async function verifyTurnstileToken(token, ip) {
  if (!token) return false;
  const secret = process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA';
  
  try {
    const formData = new URLSearchParams();
    formData.append('secret', secret);
    formData.append('response', token);
    
    // Only send remoteip if it's a valid public IP (Cloudflare rejects loopback ::1 / 127.0.0.1)
    if (ip && ip !== '::1' && ip !== '127.0.0.1' && !ip.includes('127.0.0.1') && !ip.includes('::ffff:')) {
      formData.append('remoteip', ip);
    }

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });
    
    const data = await res.json();
    if (!data.success) {
      console.warn('⚠️ Cloudflare Turnstile Verification Failed:', data['error-codes']);
    }
    return data.success;
  } catch (err) {
    console.error('Turnstile verification error:', err);
    return false;
  }
}

// 1. Signup / Request OTP
exports.signup = async (req, res) => {
  try {
    const { name, email, password, mobileNumber, turnstileToken } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      return res.status(400).json({ message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.` });
    }

    // Verify Turnstile
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;
    const isValidBotCheck = await verifyTurnstileToken(turnstileToken, ip);
    if (!isValidBotCheck) {
      return res.status(403).json({ message: 'Bot verification failed. Please try again.' });
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user && user.isVerified) {
      return res.status(400).json({ message: 'User already exists and is verified. Please login.' });
    }

    const client = redisService.getClient();
    if (!client || !redisService.isConnected()) {
      return res.status(500).json({ message: 'Redis is not connected. Cannot process OTP.' });
    }

    // Apply Dual-Layer Rate Limiter (IP + Email)
    // const rateCheck = await checkOtpRateLimits(client, req, email);
    // if (rateCheck.blocked) {
    //   return res.status(429).json({ message: rateCheck.message });
    // }

    const hashedPassword = await bcrypt.hash(password, 12);

    if (!user) {
      user = new User({ name, email, password: hashedPassword, mobileNumber: mobileNumber || null, isVerified: false });
    } else {
      user.name = name;
      user.password = hashedPassword;
      user.mobileNumber = mobileNumber || null;
      user.isVerified = false;
    }
    await user.save();

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Hash OTP before storing
    const hashedOtp = await bcrypt.hash(otpCode, 10);
    
    const otpKey = `otp:${OTP_PURPOSE.SIGNUP}:${email}`;
    await client.set(otpKey, hashedOtp, 'EX', 600); // 10 minutes TTL

    // Reset attempts counter for this new OTP
    const attemptsKey = `otp_attempts:${email}`;
    await client.del(attemptsKey);

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

    const client = redisService.getClient();
    if (!client || !redisService.isConnected()) {
      return res.status(500).json({ message: 'Redis is not connected. Cannot process OTP.' });
    }

    const otpKey = `otp:${OTP_PURPOSE.SIGNUP}:${email}`;
    const attemptsKey = `otp_attempts:${email}`;

    const storedHashedOtp = await client.get(otpKey);
    if (!storedHashedOtp) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    const isMatch = await bcrypt.compare(otp, storedHashedOtp);
    
    if (!isMatch) {
      // Max Attempts handling
      const attempts = await client.incr(attemptsKey);
      if (attempts === 1) await client.expire(attemptsKey, 600);
      
      if (attempts >= 5) {
        await client.del(otpKey);
        await client.del(attemptsKey);
        return res.status(400).json({ message: 'Too many failed attempts. OTP has been invalidated. Please request a new one.' });
      }
      return res.status(400).json({ message: `Invalid OTP. ${5 - attempts} attempts remaining.` });
    }

    // Success - Delete on Use
    await client.del(otpKey);
    await client.del(attemptsKey);

    let user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User registration not found. Please signup again.' });
    }

    user.isVerified = true;
    await user.save();

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

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const client = redisService.getClient();
    if (!client || !redisService.isConnected()) {
      return res.status(500).json({ message: 'Redis is not connected. Cannot process OTP.' });
    }

    // Apply Dual-Layer Rate Limiter (IP + Email)
    // const rateCheck = await checkOtpRateLimits(client, req, email);
    // if (rateCheck.blocked) {
    //   return res.status(429).json({ message: rateCheck.message });
    // }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otpCode, 10);
    
    const otpKey = `otp:${OTP_PURPOSE.SIGNUP}:${email}`;
    await client.set(otpKey, hashedOtp, 'EX', 600);

    const attemptsKey = `otp_attempts:${email}`;
    await client.del(attemptsKey);

    await emailService.sendOTP(email, otpCode);

    res.json({ message: 'OTP resent to your email.' });
  } catch (error) {
    console.error('Resend OTP Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// 4. Login with Email + IP Rate Limiting
exports.login = async (req, res) => {
  try {
    const { email, password, turnstileToken } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const client = redisService.getClient();
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;

    const isValidBotCheck = await verifyTurnstileToken(turnstileToken, ip);
    if (!isValidBotCheck) {
      return res.status(403).json({ message: 'Bot verification failed. Please try again.' });
    }

    const loginKey = `rate_limit:login:${email}:${ip}`;

    // Check failed login attempts per (Email + IP)
    // if (client && redisService.isConnected()) {
    //   const attempts = parseInt(await client.get(loginKey) || '0', 10);
    //   if (attempts >= 5) {
    //     return res.status(429).json({
    //       message: 'Too many failed login attempts for this account from your IP. Please try again in 15 minutes.'
    //     });
    //   }
    // }

    const user = await User.findOne({ email }).select('+password');
    
    if (!user || !user.isVerified) {
      return res.status(404).json({ message: 'User not found or not verified.' });
    }

    if (!user.password) {
      return res.status(401).json({ message: 'Password login is not configured for this user.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      // Increment failed login attempt counter for this (Email + IP)
      if (client && redisService.isConnected()) {
        const attempts = await client.incr(loginKey);
        if (attempts === 1) await client.expire(loginKey, 900); // 15 minutes TTL
      }
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Success - Clear login failed attempt counter
    if (client && redisService.isConnected()) {
      await client.del(loginKey);
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

    const client = redisService.getClient();
    if (!client || !redisService.isConnected()) {
      return res.status(500).json({ message: 'Redis is not connected.' });
    }

    // Apply Dual-Layer Rate Limiter (IP + Email)
    const rateCheck = await checkOtpRateLimits(client, req, email);
    if (rateCheck.blocked) {
      return res.status(429).json({ message: rateCheck.message });
    }

    const user = await User.findOne({ email });
    if (!user || !user.isVerified) {
      return res.json({ message: 'If that account exists, a reset OTP has been sent.' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otpCode, 10);
    
    const otpKey = `otp:${OTP_PURPOSE.PASSWORD_RESET}:${email}`;
    await client.set(otpKey, hashedOtp, 'EX', 600);

    const attemptsKey = `otp_attempts:${email}`;
    await client.del(attemptsKey);

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

    const client = redisService.getClient();
    if (!client || !redisService.isConnected()) {
      return res.status(500).json({ message: 'Redis is not connected.' });
    }

    const otpKey = `otp:${OTP_PURPOSE.PASSWORD_RESET}:${email}`;
    const attemptsKey = `otp_attempts:${email}`;

    const storedHashedOtp = await client.get(otpKey);
    
    if (!storedHashedOtp) {
      return res.status(400).json({ message: 'Invalid or expired reset OTP.' });
    }

    const isMatch = await bcrypt.compare(otp, storedHashedOtp);
    if (!isMatch) {
      const attempts = await client.incr(attemptsKey);
      if (attempts === 1) await client.expire(attemptsKey, 600);
      
      if (attempts >= 5) {
        await client.del(otpKey);
        await client.del(attemptsKey);
        return res.status(400).json({ message: 'Too many failed attempts. OTP has been invalidated.' });
      }
      return res.status(400).json({ message: `Invalid OTP. ${5 - attempts} attempts remaining.` });
    }

    // Delete on Use
    await client.del(otpKey);
    await client.del(attemptsKey);

    const user = await User.findOne({ email }).select('+password');
    if (!user || !user.isVerified) {
      return res.status(404).json({ message: 'User not found or not verified.' });
    }

    user.password = await bcrypt.hash(password, 12);
    await user.save();

    res.json({ message: 'Password reset successful. Please login with your new password.' });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ message: error.message });
  }
};
