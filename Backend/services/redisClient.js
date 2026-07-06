/**
 * redisClient.js — Shared Redis client for caching
 *
 * A single shared Redis instance for the whole application.
 * Both eventController (Pub/Sub) and cache consumers import from here.
 * Safe to use even when REDIS_URL is not configured — all methods
 * become no-ops so the app works normally without Redis in dev.
 */

const Redis = require('ioredis');

let client = null;

if (process.env.REDIS_URL) {
  client = new Redis(process.env.REDIS_URL, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
  });

  client.connect()
    .then(() => console.log('✅ Redis cache client connected'))
    .catch((err) => {
      console.warn('⚠️  Redis cache client failed to connect:', err.message);
      client = null; // Fall back to no-cache mode
    });

  client.on('error', (err) => {
    // Suppress noisy connection errors after initial failure
    if (client) console.error('Redis cache error:', err.message);
  });
} else {
  console.log('ℹ️  REDIS_URL not set — caching disabled (in-memory only)');
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

module.exports = { get, set, del, isConnected, getClient: () => client };
