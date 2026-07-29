/**
 * Rate Limiter Middleware
 * 
 * Pre-configured rate limiters for each route group.
 * Import and apply to routes in index.js.
 */

const rateLimit = require('express-rate-limit');

const getRateLimitKey = (req) => req.user?._id?.toString() || (req.headers['x-forwarded-for'] || req.ip);

const queryLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: getRateLimitKey,
  handler: (req, res) => {
    const key = getRateLimitKey(req);
    console.warn(`⚠️ [RATE_LIMIT_EXCEEDED] Query API | Key: "${key}" | Path: ${req.method} ${req.originalUrl} | Time: ${new Date().toISOString()}`);
    res.status(429).json({ message: 'Too many query requests, please slow down.' });
  }
});

const commandLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: getRateLimitKey,
  handler: (req, res) => {
    const key = getRateLimitKey(req);
    console.warn(`⚠️ [RATE_LIMIT_EXCEEDED] Command API | Key: "${key}" | Path: ${req.method} ${req.originalUrl} | Time: ${new Date().toISOString()}`);
    res.status(429).json({ message: 'Too many submission requests, please slow down.' });
  }
});

const sseLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: getRateLimitKey,
  handler: (req, res) => {
    const key = getRateLimitKey(req);
    console.warn(`⚠️ [RATE_LIMIT_EXCEEDED] SSE Stream | Key: "${key}" | Path: ${req.method} ${req.originalUrl} | Time: ${new Date().toISOString()}`);
    res.status(429).json({ message: 'Too many event stream connections.' });
  }
});

const getAuthRateLimitKey = (req) => {
  const ip = req.headers['x-forwarded-for'] || req.ip;
  const email = (req.body && req.body.email) ? String(req.body.email).toLowerCase().trim() : 'anonymous';
  return `${ip}_${email}`;
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: getAuthRateLimitKey,
  handler: (req, res) => {
    const key = getAuthRateLimitKey(req);
    console.warn(`⚠️ [RATE_LIMIT_EXCEEDED] Auth API | Key: "${key}" | Path: ${req.method} ${req.originalUrl} | Time: ${new Date().toISOString()}`);
    res.status(429).json({ message: 'Too many auth attempts for this email address. Please wait a few minutes.' });
  }
});

module.exports = {
  queryLimiter,
  commandLimiter,
  sseLimiter,
  authLimiter,
};
