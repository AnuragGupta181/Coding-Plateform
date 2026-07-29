const jwt = require('jsonwebtoken');
const User = require('../models/user');
const config = require('../config');

exports.requireAuth = async (req, res, next) => {
  try {
    let token = req.headers.authorization?.split(' ')[1];
    
    // Fallback to query parameter for EventSource (SSE) which cannot send headers
    if (!token && req.query.token) {
      token = req.query.token;
    }
    
    if (!token) return res.status(401).json({ message: 'Authentication required' });

    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = await User.findById(decoded.id);
    
    if (!req.user) return res.status(401).json({ message: 'User not found' });
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    // Any other error (e.g. cold-start Mongo timeout) must NOT return 401,
    // otherwise the frontend response interceptor wipes the token (false logout).
    console.error('requireAuth non-auth error:', error.message);
    return res.status(503).json({ message: 'Service temporarily unavailable' });
  }
};

exports.requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Admin access denied' });
  }
};
