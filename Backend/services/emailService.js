/**
 * emailService.js — Nodemailer with a persistent, pooled transporter
 *
 * The transporter is created ONCE at module load time and reused for all
 * emails. This avoids creating a new TCP connection to Gmail on every
 * OTP request — critical when many students register simultaneously.
 */

const nodemailer = require('nodemailer');
const config = require('../config');

// ── Create transporter once at startup (connection pool reused for all sends) ─
function buildTransporter() {
  if (!config.email.user || !config.email.pass) {
    console.warn('⚠️  Email credentials not configured. OTP emails will fail.');
    return null;
  }

  if (config.email.host) {
    return nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port || 587,
      secure: config.email.secure,
      pool: true,         // Enable connection pooling
      maxConnections: 5,  // Up to 5 simultaneous SMTP connections
      auth: {
        user: config.email.user,
        pass: config.email.pass
      }
    });
  }

  return nodemailer.createTransport({
    service: config.email.service,
    pool: true,
    maxConnections: 5,
    auth: {
      user: config.email.user,
      pass: config.email.pass
    }
  });
}

// Single shared transporter instance for the lifetime of the process
const transporter = buildTransporter();

/**
 * Internal send helper — handles null transporter gracefully.
 * @param {object} mailOptions
 */
async function sendMail(mailOptions) {
  if (!transporter) {
    throw new Error('Email service is not configured. Set EMAIL_USER and EMAIL_PASS.');
  }
  return transporter.sendMail(mailOptions);
}

exports.sendOTP = async (email, otp) => {
  return sendMail({
    from: config.email.from,
    to: email,
    subject: 'Verification OTP for Coding Platform',
    text: `Your OTP for verification is: ${otp}. It will expire in 10 minutes.`,
  });
};

exports.sendPasswordResetOTP = async (email, otp) => {
  return sendMail({
    from: config.email.from,
    to: email,
    subject: 'Password Reset OTP for Coding Platform',
    text: `Your password reset OTP is: ${otp}. It will expire in 10 minutes.`,
  });
};
