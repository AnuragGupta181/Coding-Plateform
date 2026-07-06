const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config');

const testRoutes = require('./routes/testRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const eventRoutes = require('./routes/eventRoutes');
const codeRoutes = require('./routes/codeRoutes');
const { completeExpiredTests } = require('./services/testLifecycleService');
const { broadcastEvent } = require('./controllers/eventController');

const app = express();

// ── Security Headers (helmet) ─────────────────────────────────────────────────
// Adds ~14 security-related HTTP headers in one line.
// Protects against XSS, clickjacking, MIME-type sniffing, and more.
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' } // Allow CDN/font loading
}));

// ── Gzip Compression ──────────────────────────────────────────────────────────
// Compresses all API responses by 60-70%. Critical for large test documents.
// Skip compression for SSE streams (they must stay uncompressed).
app.use(compression({
  filter: (req, res) => {
    if (req.headers['accept'] === 'text/event-stream') return false;
    return compression.filter(req, res);
  }
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
const corsOptions = config.isProduction
  ? {
      origin: config.corsOrigins.length > 0 ? config.corsOrigins : false,
      credentials: true
    }
  : {
      origin: config.corsOrigins.length > 0 ? config.corsOrigins : true,
      credentials: true
    };

app.set('trust proxy', 1);
app.use(cors(corsOptions));
app.use(morgan(config.isProduction ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));

// ── Request Timeout ───────────────────────────────────────────────────────────
// If any DB query or async operation hangs for >15s, fail fast instead of
// holding a connection slot indefinitely.
app.use((req, res, next) => {
  // Don't apply timeout to SSE connections — they are intentionally long-lived
  if (req.path.startsWith('/api/events')) return next();

  res.setTimeout(15000, () => {
    if (!res.headersSent) {
      res.status(503).json({ message: 'Request timed out. Please try again.' });
    }
  });
  next();
});

// ── Rate Limiting ─────────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please slow down.' }
});

// Stricter limiter for auth endpoints to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Please try again later.' }
});

// Loose limiter for SSE connections (long-lived, not high-frequency)
const sseLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many event stream connections.' }
});

app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);
app.use('/api/events/', sseLimiter);

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    environment: config.env,
    uptime: Math.round(process.uptime()),
    memory: {
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`
    }
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api', testRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/code', codeRoutes);

// ── MongoDB Connection ────────────────────────────────────────────────────────
// Increased connection pool from default 5 → 50 to handle concurrent bursts.
mongoose.connect(config.mongoUri, {
  maxPoolSize: 50,
  minPoolSize: 5,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
})
  .then(() => console.log('✅ Connected to MongoDB (pool: 50)'))
  .catch(err => console.error('❌ Could not connect to MongoDB', err));

// ── Expired Test Cleanup (every 15 seconds) ───────────────────────────────────
// Set DISABLE_CRON=true on all-but-one instance when horizontally scaling.
if (process.env.DISABLE_CRON !== 'true') {
  setInterval(async () => {
    try {
      await completeExpiredTests();
    } catch (error) {
      console.error('Failed to complete expired tests:', error.message);
    }
  }, 15000);
}

// ── Start Server ──────────────────────────────────────────────────────────────
const server = app.listen(config.port, () => {
  console.log(`🚀 Server running on port ${config.port}`);
});

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
// When the server is restarted or crashes, warn all connected students via SSE
// so they know to refresh — instead of silently dropping their connections.
async function gracefulShutdown(signal) {
  console.log(`\n⚠️  ${signal} received. Shutting down gracefully...`);

  // 1. Broadcast warning to all connected SSE clients (waiting room students)
  try {
    broadcastEvent('*', {
      type: 'SERVER_RESTART',
      message: 'Server is restarting. Please refresh the page in a few seconds.'
    });
  } catch { /* non-critical */ }

  // 2. Stop accepting new connections
  server.close(async () => {
    console.log('🔌 HTTP server closed.');

    // 3. Close DB connection cleanly
    try {
      await mongoose.connection.close();
      console.log('🗄️  MongoDB connection closed.');
    } catch { /* non-critical */ }

    process.exit(0);
  });

  // Force-exit after 10 seconds if graceful shutdown hangs
  setTimeout(() => {
    console.error('⏰ Forced exit after 10s timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
