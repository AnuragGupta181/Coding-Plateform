// ── Dependencies ──────────────────────────────────────────────────────────────
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const helmet = require('helmet');
const config = require('./config');

// ── Middleware ─────────────────────────────────────────────────────────────────
const { sanitizeInput } = require('./middleware/inputSanitizer');
const { telemetryMiddleware } = require('./middleware/telemetryMiddleware');

// ── Routes ────────────────────────────────────────────────────────────────────
const authRoutes = require('./routes/authRoutes');
const queryRoutes = require('./routes/queryRoutes');
const commandRoutes = require('./routes/commandRoutes');

// ── Services ──────────────────────────────────────────────────────────────────
const { connectDB, ensureDb } = require('./services/database');
const { completeExpiredTests } = require('./services/testLifecycleService');
const { startScheduleWatcher } = require('./services/scheduleWatcher');
const { broadcastEvent } = require('./controllers/eventController');
const { mountBullBoard } = require('./services/bullBoard');
const { mountHealthCheck } = require('./routes/healthRoutes');

// ── CQRS Service Mode ─────────────────────────────────────────────────────────
const SERVICE_MODE = (process.env.SERVICE_MODE || 'both').toLowerCase();
if (!['query', 'command', 'both'].includes(SERVICE_MODE)) {
  console.error(`❌ Invalid SERVICE_MODE "${SERVICE_MODE}". Must be "query", "command", or "both". Exiting.`);
  process.exit(1);
}

// Initialize BullMQ Queues and Workers (command service only)
if (SERVICE_MODE === 'both' || SERVICE_MODE === 'command') {
  require('./services/codeExecutionQueue');
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPRESS APP SETUP
// ══════════════════════════════════════════════════════════════════════════════

const app = express();

// ── Security & Compression ────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression({
  filter: (req, res) => {
    if (req.headers['accept'] === 'text/event-stream') return false;
    return compression.filter(req, res);
  }
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
app.set('trust proxy', 1);
app.use(cors(config.isProduction
  ? { origin: config.corsOrigins.length > 0 ? config.corsOrigins : false, credentials: true }
  : { origin: config.corsOrigins.length > 0 ? config.corsOrigins : true, credentials: true }
));

// ── Parsing, Sanitization & Telemetry ─────────────────────────────────────────
app.use(morgan(config.isProduction ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(sanitizeInput);
app.use(telemetryMiddleware);

// ── Request Timeout ───────────────────────────────────────────────────────────
app.use((req, res, next) => {
  if (req.path.startsWith('/api/query/events')) return next();
  res.setTimeout(20000, () => {
    if (!res.headersSent) {
      res.status(503).json({ message: 'Request timed out. Please try again.' });
    }
  });
  next();
});

// ── Rate Limiting ─────────────────────────────────────────────────────────────
// Rate limiting enabled for production:
const { authLimiter, queryLimiter, commandLimiter, sseLimiter } = require('./middleware/rateLimiters');
app.use('/api/auth', authLimiter);
app.use('/api/query/events', sseLimiter);
app.use('/api/query', queryLimiter);
app.use('/api/command', commandLimiter);

// ══════════════════════════════════════════════════════════════════════════════
// MOUNT FEATURES
// ══════════════════════════════════════════════════════════════════════════════

mountBullBoard(app);
mountHealthCheck(app);

// ── DB Connection Guard ───────────────────────────────────────────────────────
app.use(async (req, res, next) => {
  try {
    await ensureDb();
    next();
  } catch (err) {
    console.error('ensureDb failed:', err.message);
    if (!res.headersSent) {
      res.status(503).json({ message: 'Database temporarily unavailable' });
    }
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

app.use('/api/auth', authRoutes);

if (SERVICE_MODE === 'query' || SERVICE_MODE === 'both') {
  app.use('/api/query', queryRoutes);
  console.log('📖 Query routes registered at /api/query/...');
}

if (SERVICE_MODE === 'command' || SERVICE_MODE === 'both') {
  app.use('/api/command', commandRoutes);
  console.log('✏️  Command routes registered at /api/command/...');
}

// ── Vercel Cron ───────────────────────────────────────────────────────────────
app.get('/api/cron/complete-expired-tests', async (req, res) => {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.warn('⚠️ CRON_SECRET is not configured! Blocking cron request.');
      return res.status(500).json({ message: 'Server configuration error' });
    }
    if (req.headers.authorization !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    await completeExpiredTests();
    res.status(200).json({ message: 'Expired tests processed successfully' });
  } catch (error) {
    console.error('Failed to complete expired tests via cron:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err.message, err.stack);
  if (res.headersSent) return;
  const statusCode = err.statusCode || err.status || 500;
  const message = config.isProduction
    ? 'An unexpected error occurred. Please try again.'
    : err.message;
  res.status(statusCode).json({ message });
});

// ══════════════════════════════════════════════════════════════════════════════
// START SERVER
// ══════════════════════════════════════════════════════════════════════════════

connectDB().catch(() => { });

// Background tasks
if (process.env.DISABLE_CRON !== 'true') {
  startScheduleWatcher();
  setInterval(async () => {
    try { await completeExpiredTests(); }
    catch (error) { console.error('Failed to complete expired tests:', error.message); }
  }, 15000);
}

const server = app.listen(config.port, () => {
  console.log(`🚀 Server running on port ${config.port} [SERVICE_MODE=${SERVICE_MODE}]`);
});

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
async function gracefulShutdown(signal) {
  console.log(`\n⚠️  ${signal} received. Shutting down gracefully...`);
  try {
    broadcastEvent('*', { type: 'SERVER_RESTART', message: 'Server is restarting. Please refresh the page in a few seconds.' });
  } catch { /* non-critical */ }

  server.close(async () => {
    console.log('🔌 HTTP server closed.');
    try { await mongoose.connection.close(); console.log('🗄️  MongoDB connection closed.'); }
    catch { /* non-critical */ }
    process.exit(0);
  });

  setTimeout(() => { console.error('⏰ Forced exit after 10s timeout.'); process.exit(1); }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
