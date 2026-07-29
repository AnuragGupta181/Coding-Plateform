/**
 * Auth Input Validator Middleware
 * 
 * Route-specific validation for all 6 auth endpoints.
 * Each validator enforces:
 * - Type safety: all fields must be strings (blocks NoSQL object injection)
 * - Format validation: email, OTP, name, password, mobile via regex
 * - Length limits: prevents oversized payloads (DoS protection)
 * 
 * Usage: router.post('/login', validateLogin, authController.login);
 */

// ── Validation Helpers ────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const OTP_REGEX = /^\d{6}$/;
const NAME_REGEX = /^[a-zA-Z\s.'-]{2,100}$/;
const MOBILE_REGEX = /^\+?\d{10,15}$/;

const MAX_EMAIL_LENGTH = 254;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

/**
 * Ensures a field is a non-empty string. Returns the trimmed value or null.
 * This is the PRIMARY NoSQL injection defense — if someone sends
 * { "email": { "$gt": "" } }, typeof check catches it immediately.
 */
function requireString(value, fieldName, errors) {
  if (value === undefined || value === null) {
    errors.push(`${fieldName} is required.`);
    return null;
  }
  if (typeof value !== 'string') {
    errors.push(`${fieldName} must be a string.`);
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    errors.push(`${fieldName} is required.`);
    return null;
  }
  return trimmed;
}

/**
 * Optional string field — returns trimmed value, empty string, or null on type error.
 */
function optionalString(value, fieldName, errors) {
  if (value === undefined || value === null || value === '') {
    return '';
  }
  if (typeof value !== 'string') {
    errors.push(`${fieldName} must be a string.`);
    return null;
  }
  return value.trim();
}

function validateEmailFormat(email, errors) {
  if (email.length > MAX_EMAIL_LENGTH) {
    errors.push(`Email must not exceed ${MAX_EMAIL_LENGTH} characters.`);
    return false;
  }
  if (!EMAIL_REGEX.test(email)) {
    errors.push('Invalid email format.');
    return false;
  }
  return true;
}

function validatePasswordFormat(password, errors) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    return false;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    errors.push(`Password must not exceed ${MAX_PASSWORD_LENGTH} characters.`);
    return false;
  }
  return true;
}

// ── Route Validators ──────────────────────────────────────────────────────────

/**
 * POST /auth/signup
 * Validates: name, email, password, mobileNumber (optional), turnstileToken (optional)
 */
function validateSignup(req, res, next) {
  const errors = [];

  const name = requireString(req.body.name, 'Name', errors);
  const email = requireString(req.body.email, 'Email', errors);
  const password = requireString(req.body.password, 'Password', errors);
  const mobileNumber = optionalString(req.body.mobileNumber, 'Mobile number', errors);
  const turnstileToken = optionalString(req.body.turnstileToken, 'Turnstile token', errors);

  if (errors.length > 0) {
    return res.status(400).json({ message: errors[0], errors });
  }

  // Format validation
  if (name && !NAME_REGEX.test(name)) {
    errors.push('Name must be 2-100 characters and contain only letters, spaces, dots, apostrophes, or hyphens.');
  }

  if (email) {
    validateEmailFormat(email, errors);
  }

  if (password) {
    validatePasswordFormat(password, errors);
  }

  if (mobileNumber && !MOBILE_REGEX.test(mobileNumber)) {
    errors.push('Mobile number must be 10-15 digits, optionally prefixed with +.');
  }

  if (errors.length > 0) {
    return res.status(400).json({ message: errors[0], errors });
  }

  // Write sanitized values back to req.body
  req.body.name = name;
  req.body.email = email.toLowerCase();
  req.body.password = password;
  req.body.mobileNumber = mobileNumber || undefined;
  req.body.turnstileToken = turnstileToken || undefined;

  next();
}

/**
 * POST /auth/verify
 * Validates: email, otp (exactly 6 digits)
 */
function validateVerifyOTP(req, res, next) {
  const errors = [];

  const email = requireString(req.body.email, 'Email', errors);
  const otp = requireString(req.body.otp, 'OTP', errors);

  if (errors.length > 0) {
    return res.status(400).json({ message: errors[0], errors });
  }

  if (email) validateEmailFormat(email, errors);

  if (otp && !OTP_REGEX.test(otp)) {
    errors.push('OTP must be exactly 6 digits.');
  }

  if (errors.length > 0) {
    return res.status(400).json({ message: errors[0], errors });
  }

  req.body.email = email.toLowerCase();
  req.body.otp = otp;

  next();
}

/**
 * POST /auth/resend-otp
 * Validates: email
 */
function validateResendOTP(req, res, next) {
  const errors = [];

  const email = requireString(req.body.email, 'Email', errors);

  if (errors.length > 0) {
    return res.status(400).json({ message: errors[0], errors });
  }

  if (email) validateEmailFormat(email, errors);

  if (errors.length > 0) {
    return res.status(400).json({ message: errors[0], errors });
  }

  req.body.email = email.toLowerCase();

  next();
}

/**
 * POST /auth/login
 * Validates: email, password, turnstileToken (optional)
 */
function validateLogin(req, res, next) {
  const errors = [];

  const email = requireString(req.body.email, 'Email', errors);
  const password = requireString(req.body.password, 'Password', errors);
  const turnstileToken = optionalString(req.body.turnstileToken, 'Turnstile token', errors);

  if (errors.length > 0) {
    return res.status(400).json({ message: errors[0], errors });
  }

  if (email) validateEmailFormat(email, errors);

  if (password && password.length > MAX_PASSWORD_LENGTH) {
    errors.push(`Password must not exceed ${MAX_PASSWORD_LENGTH} characters.`);
  }

  if (errors.length > 0) {
    return res.status(400).json({ message: errors[0], errors });
  }

  req.body.email = email.toLowerCase();
  req.body.password = password;
  req.body.turnstileToken = turnstileToken || undefined;

  next();
}

/**
 * POST /auth/forgot-password
 * Validates: email
 */
function validateForgotPassword(req, res, next) {
  const errors = [];

  const email = requireString(req.body.email, 'Email', errors);

  if (errors.length > 0) {
    return res.status(400).json({ message: errors[0], errors });
  }

  if (email) validateEmailFormat(email, errors);

  if (errors.length > 0) {
    return res.status(400).json({ message: errors[0], errors });
  }

  req.body.email = email.toLowerCase();

  next();
}

/**
 * POST /auth/reset-password
 * Validates: email, otp, password
 */
function validateResetPassword(req, res, next) {
  const errors = [];

  const email = requireString(req.body.email, 'Email', errors);
  const otp = requireString(req.body.otp, 'OTP', errors);
  const password = requireString(req.body.password, 'Password', errors);

  if (errors.length > 0) {
    return res.status(400).json({ message: errors[0], errors });
  }

  if (email) validateEmailFormat(email, errors);

  if (otp && !OTP_REGEX.test(otp)) {
    errors.push('OTP must be exactly 6 digits.');
  }

  if (password) validatePasswordFormat(password, errors);

  if (errors.length > 0) {
    return res.status(400).json({ message: errors[0], errors });
  }

  req.body.email = email.toLowerCase();
  req.body.otp = otp;
  req.body.password = password;

  next();
}

module.exports = {
  validateSignup,
  validateVerifyOTP,
  validateResendOTP,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
};
