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

// app.use('/api/', generalLimiter);
// app.use('/api/auth/', authLimiter);
// app.use('/api/events/', sseLimiter);

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

// ── Ensure DB connection before handling requests ────────────────────────────
// Heals dead/frozen connections so a request never runs on a killed socket
// (the root cause of the old "findOne took longer to connect" / 401 logout bug).
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

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api', testRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/code', codeRoutes);

// ── MongoDB Connection (Optimized for Vercel serverless) ──────────────────────
// PERMANENT cold-start / frozen-container safety:
//  1. Cache the connection promise on globalThis so warm containers reuse it.
//  2. On 'error'/'disconnected', invalidate the cache so the next request
//     reconnects instead of reusing a dead (frozen) socket.
//  3. ensureDb() probes the connection before each request and reconnects ONCE
//     if it is stale, so a request never runs a query on a dead connection —
//     even if every instance died between requests.
const MONGODB_URI = config.mongoUri;

const mongoCache =
  global._mongoCache ||
  (global._mongoCache = { conn: null, promise: null, lastOk: 0 });

const isConnected = () => mongoose.connection.readyState === 1;

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err.message);
  mongoCache.conn = null;
  mongoCache.promise = null;
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected — clearing cache for next reconnect');
  mongoCache.conn = null;
  mongoCache.promise = null;
});

const connectDB = async () => {
  if (mongoCache.conn && isConnected()) return mongoCache.conn;

  if (!mongoCache.promise) {
    const poolSize = config.mongoPoolSize;
    mongoCache.promise = mongoose
      .connect(MONGODB_URI, {
        maxPoolSize: poolSize,
        minPoolSize: 1,
        // Raised from 5000 -> 15000. On Vercel the function freezes after
        // inactivity; when it warms, the kept-alive socket may be stale and a
        // fresh server selection is needed. The old 5s budget was too tight for
        // a frozen -> warm Mongo reconnect.
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        maxIdleTimeMS: 60000, // Closes connections before Atlas silently drops them
        heartbeatFrequencyMS: 10000, // Detect dead sockets faster while warm
        family: 4, // Force IPv4 to prevent Vercel DNS resolution hangs
      })
      .then((m) => {
        console.log(`✅ Connected to MongoDB (pool: ${poolSize})`);
        return m;
      })
      .catch((err) => {
        console.error('❌ Could not connect to MongoDB', err.message);
        mongoCache.promise = null; // allow retry on next invocation
        throw err;
      });
  }

  try {
    mongoCache.conn = await mongoCache.promise;
  } catch (err) {
    mongoCache.promise = null;
    throw err;
  }
  return mongoCache.conn;
};

// Heal a frozen/stale connection BEFORE any query runs. Throttled to one
// health probe per 15s; on a failed probe we drop the cache and reconnect once.
async function ensureDb() {
  await connectDB();
  if (!isConnected()) throw new Error('MongoDB not connected');

  if (Date.now() - mongoCache.lastOk > 15000) {
    try {
      await mongoose.connection.db.command({ ping: 1 });
      mongoCache.lastOk = Date.now();
    } catch (pingErr) {
      console.warn('⚠️ DB ping failed (stale socket), reconnecting:', pingErr.message);
      // Close the stale socket first so connect() opens a genuinely fresh one
      // (mongoose.connect() on an already-"connected" singleton can otherwise
      // return the same dead socket).
      try { await mongoose.connection.close(); } catch { /* already closed */ }
      mongoCache.conn = null;
      mongoCache.promise = null;
      await connectDB(); // reconnect on a fresh socket
      mongoCache.lastOk = Date.now();
    }
  }
}

connectDB().catch(() => {});

// ── Vercel Cron Endpoint ──────────────────────────────────────────────────────
// Vercel will automatically hit this endpoint every minute based on vercel.json
app.get('/api/cron/complete-expired-tests', async (req, res) => {
  try {
    // Optional: Add basic security header check so only Vercel can trigger this
    if (process.env.VERCEL && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await completeExpiredTests();
    res.status(200).json({ message: 'Expired tests processed successfully' });
  } catch (error) {
    console.error('Failed to complete expired tests via cron:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// ── Expired Test Cleanup (every 15 seconds) ───────────────────────────────────
// Set DISABLE_CRON=true on all-but-one instance when horizontally scaling.
// Standard Node.js background timers (Ideal for EC2/VPS deployments)
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
