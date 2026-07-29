/**
 * Database Connection Service
 * 
 * Manages MongoDB connection with Vercel serverless cold-start safety.
 * Exports: connectDB(), ensureDb()
 * 
 * Safety mechanisms:
 *  1. Caches the connection promise on globalThis so warm containers reuse it.
 *  2. On 'error'/'disconnected', invalidates the cache so the next request
 *     reconnects instead of reusing a dead (frozen) socket.
 *  3. ensureDb() probes the connection before each request and reconnects ONCE
 *     if it is stale, so a request never runs a query on a dead connection.
 */

const mongoose = require('mongoose');
const config = require('../config');

const MONGODB_URI = config.mongoUri;

const mongoCache =
  global._mongoCache ||
  (global._mongoCache = { conn: null, promise: null, lastOk: 0 });

const isConnected = () => mongoose.connection.readyState === 1;

// Invalidate cache on connection errors so the next request triggers a fresh connect
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

/**
 * Connect to MongoDB (or return cached connection).
 */
async function connectDB() {
  if (mongoCache.conn && isConnected()) return mongoCache.conn;

  if (!mongoCache.promise) {
    const poolSize = config.mongoPoolSize;
    mongoCache.promise = mongoose
      .connect(MONGODB_URI, {
        maxPoolSize: poolSize,
        minPoolSize: 1,
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        maxIdleTimeMS: 60000,
        heartbeatFrequencyMS: 10000,
        family: 4,
      })
      .then((m) => {
        console.log(`✅ Connected to MongoDB (pool: ${poolSize})`);
        return m;
      })
      .catch((err) => {
        console.error('❌ Could not connect to MongoDB', err.message);
        mongoCache.promise = null;
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
}

/**
 * Heal a frozen/stale connection BEFORE any query runs.
 * Throttled to one health probe per 15s; on a failed probe we
 * drop the cache and reconnect once.
 */
async function ensureDb() {
  await connectDB();

  // On cold starts, readyState may still be transitioning after connect() resolves.
  // Wait briefly (up to 5s) for it to reach "connected" (1).
  if (!isConnected()) {
    await new Promise((resolve) => {
      const timeout = setTimeout(resolve, 5000);
      const check = () => {
        if (isConnected()) { clearTimeout(timeout); resolve(); }
      };
      mongoose.connection.once('connected', () => { clearTimeout(timeout); resolve(); });
      check();
    });
    if (!isConnected()) throw new Error('MongoDB not connected');
  }

  if (Date.now() - mongoCache.lastOk > 15000) {
    try {
      await mongoose.connection.db.command({ ping: 1 });
      mongoCache.lastOk = Date.now();
    } catch (pingErr) {
      console.warn('⚠️ DB ping failed (stale socket), reconnecting:', pingErr.message);
      try { await mongoose.connection.close(); } catch { /* already closed */ }
      mongoCache.conn = null;
      mongoCache.promise = null;
      await connectDB();
      mongoCache.lastOk = Date.now();
    }
  }
}

module.exports = { connectDB, ensureDb };
