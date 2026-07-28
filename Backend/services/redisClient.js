/**
 * redisClient.js — Shared Redis client for caching
 *
 * A single shared Redis instance for the whole application.
 * Both eventController (Pub/Sub) and cache consumers import from here.
 * Safe to use even when REDIS_URL is not configured — all methods
 * become no-ops so the app works normally without Redis in dev.
 *
 * Uses a cached connection promise so that Vercel serverless cold-starts
 * can `await ensureConnected()` before using the client.
 */

const Redis = require('ioredis');

let client = null;
let connectPromise = null; // cached promise — awaited by ensureConnected()

if (process.env.REDIS_URL) {
  const redisUrl = process.env.REDIS_URL;
  // Upstash ALWAYS requires TLS. Detect it from either:
  //   1. rediss:// protocol (explicit TLS)
  //   2. .upstash.io hostname (Upstash always needs TLS, even with redis://)
  const useTls = redisUrl.startsWith('rediss://') || redisUrl.includes('.upstash.io');
  console.log(`🔍 Redis init: useTls=${useTls}, host=${redisUrl.replace(/\/\/.*@/, '//***@')}`);

  client = new Redis(redisUrl, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 3,
    connectTimeout: 10000, // 10s timeout for Upstash TLS handshake
    ...(useTls && { tls: { rejectUnauthorized: false } }),
    retryStrategy: (times) => {
      if (times > 3) {
        console.warn('⚠️  Redis retry attempts exhausted, giving up');
        return null;
      }
      const delay = Math.min(times * 100, 3000);
      return delay;
    },
  });

  // Store the connection promise so requests can await it
  connectPromise = client.connect()
    .then(() => {
      console.log('✅ Redis cache client connected, status:', client.status);
      return true;
    })
    .catch((err) => {
      console.warn('⚠️  Redis cache client failed to connect:', err.message, '| Code:', err.code);
      try { client.disconnect(); } catch {}
      client = null; // Fall back to no-cache mode
      return false;
    });

  client.on('error', (err) => {
    // Suppress noisy connection errors after initial failure
    if (client) console.error('Redis cache error:', err.message, '| Code:', err.code);
  });

  client.on('close', () => {
    console.warn('⚠️  Redis connection closed');
  });

  client.on('reconnecting', () => {
    console.log('🔄 Redis reconnecting...');
  });
} else {
  console.log('ℹ️  REDIS_URL not set — caching disabled (in-memory only)');
}

/**
 * Wait for the initial Redis connection to settle.
 * Returns true if connected, false otherwise.
 * Safe to call multiple times — the promise is cached.
 */
async function ensureConnected() {
  if (!connectPromise) {
    console.warn('🔍 ensureConnected: no connectPromise (REDIS_URL not set?)');
    return false;
  }
  const result = await connectPromise;
  const status = client ? client.status : 'client=null';
  console.log(`🔍 ensureConnected: result=${result}, clientStatus=${status}`);
  return client !== null && client.status === 'ready';
}

/**
 * Get a cached value. Returns null if not found or Redis unavailable.
 * @param {string} key
 * @returns {Promise<any|null>}
 */
async function get(key) {
  if (!client) return null;
  try {
    const val = await client.get(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

/**
 * Set a cached value with a TTL in seconds.
 * Silently fails if Redis is unavailable.
 * @param {string} key
 * @param {any} value
 * @param {number} ttlSeconds
 */
async function set(key, value, ttlSeconds = 300) {
  if (!client) return;
  try {
    await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // Cache write failure is non-critical — app continues without caching
  }
}

/**
 * Delete one or more cache keys.
 * @param {...string} keys
 */
async function del(...keys) {
  if (!client) return;
  try {
    await client.del(...keys);
  } catch {
    // Non-critical
  }
}

/**
 * Check if the Redis client is currently connected.
 * @returns {boolean}
 */
function isConnected() {
  return client !== null && client.status === 'ready';
}

/**
 * Get detailed Redis RAM usage and key breakdown
 */
async function getRedisMetrics() {
  if (!client || client.status !== 'ready') {
    return { connected: false, message: 'Redis not connected' };
  }
  try {
    const infoMemory = await client.info('memory');
    const dbSize = await client.dbsize();

    const parseInfo = (section, key) => {
      const match = section.match(new RegExp(`${key}:(.*)`));
      return match ? match[1].trim() : 'N/A';
    };

    const usedMemory = parseInfo(infoMemory, 'used_memory_human');
    const peakMemory = parseInfo(infoMemory, 'used_memory_peak_human');

    // Count key categories safely
    const otpKeys = (await client.keys('otp*')).length + (await client.keys('rate_limit:otp*')).length;
    const testCacheKeys = (await client.keys('test:*')).length;
    const bullMqKeys = (await client.keys('bull:*')).length;

    return {
      connected: true,
      usedMemory,
      peakMemory,
      totalKeys: dbSize,
      breakdown: {
        otpAndAuthRateLimits: otpKeys,
        testQuestionCache: testCacheKeys,
        bullMqQueues: bullMqKeys,
        otherKeys: Math.max(0, dbSize - (otpKeys + testCacheKeys + bullMqKeys))
      }
    };
  } catch (err) {
    return { connected: false, error: err.message };
  }
}

module.exports = { get, set, del, isConnected, ensureConnected, getRedisMetrics, getClient: () => client };
