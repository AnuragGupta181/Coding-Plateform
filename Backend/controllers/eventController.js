/**
 * eventController.js — Scalable SSE with Redis Pub/Sub
 *
 * Architecture:
 *   - Each student's SSE connection subscribes to a dedicated Redis channel: "test:<testId>"
 *   - Broadcasts publish to that Redis channel — works across multiple server instances
 *   - In-memory clients[] is ONLY used for the admin's waiting-room head-count (no broadcast)
 *   - Falls back to in-memory broadcast if Redis is unavailable (dev environments)
 */

const url = require('url');
const Redis = require('ioredis');

// ── Redis Setup ──────────────────────────────────────────────────────────────
// Separate publisher and subscriber clients are REQUIRED by Redis protocol.
let redisPublisher = null;
let redisSubscriber = null;
let useRedis = false;

const REDIS_URL = process.env.REDIS_URL;

if (REDIS_URL) {
  try {
    redisPublisher = new Redis(REDIS_URL, { lazyConnect: true, enableOfflineQueue: false });
    redisSubscriber = new Redis(REDIS_URL, { lazyConnect: true, enableOfflineQueue: false });

    Promise.all([redisPublisher.connect(), redisSubscriber.connect()])
      .then(() => {
        useRedis = true;
        console.log('✅ Redis connected — SSE using Pub/Sub mode');
      })
      .catch((err) => {
        useRedis = false;
        console.warn('⚠️  Redis connection failed, falling back to in-memory SSE:', err.message);
      });

    redisPublisher.on('error', (err) => console.error('Redis Publisher Error:', err.message));
    redisSubscriber.on('error', (err) => console.error('Redis Subscriber Error:', err.message));
  } catch (err) {
    console.warn('⚠️  Redis init failed, using in-memory SSE:', err.message);
  }
} else {
  console.log('ℹ️  REDIS_URL not set — SSE using in-memory mode (single-instance only)');
}

// ── In-Memory Client Registry ────────────────────────────────────────────────
// Only used for: (1) head-count in waiting room, (2) fallback broadcast without Redis.
// Keyed by clientId for O(1) removal on disconnect.
const clientMap = new Map(); // clientId -> { id, testId, name, email, joinedAt, res, redisChannel }

// ── Redis Subscription Registry ─────────────────────────────────────────────
// Tracks how many clients are subscribed to each channel so we only
// subscribe/unsubscribe from Redis once per channel (not once per client).
const channelRefCount = new Map(); // channel -> count of active subscribers

function getChannel(testId) {
  return `test:${testId}`;
}

async function subscribeToChannel(channel) {
  const count = channelRefCount.get(channel) || 0;
  channelRefCount.set(channel, count + 1);

  if (count === 0 && useRedis) {
    // First subscriber for this channel — subscribe to Redis
    await redisSubscriber.subscribe(channel);
  }
}

async function unsubscribeFromChannel(channel) {
  const count = channelRefCount.get(channel) || 0;
  const newCount = Math.max(0, count - 1);
  channelRefCount.set(channel, newCount);

  if (newCount === 0 && useRedis) {
    // Last subscriber left — unsubscribe from Redis to free resources
    await redisSubscriber.unsubscribe(channel).catch(() => {});
    channelRefCount.delete(channel);
  }
}

// Route incoming Redis messages to the correct SSE connections
if (redisSubscriber) {
  redisSubscriber.on('message', (channel, message) => {
    // Fan out to all local clients subscribed to this channel
    clientMap.forEach((client) => {
      if (client.redisChannel === channel) {
        try {
          client.res.write(`data: ${message}\n\n`);
          if (typeof client.res.flush === 'function') client.res.flush();
        } catch {
          // Client already disconnected, will be cleaned up by req.on('close')
        }
      }
    });
  });
}

// ── Exported Helpers for Admin Queue View ────────────────────────────────────
function getWaitingUsersByTest(testId) {
  const result = [];
  clientMap.forEach((client) => {
    if (client.testId === testId) {
      result.push({ id: client.id, name: client.name, email: client.email, joinedAt: client.joinedAt });
    }
  });
  return result;
}

function getWaitingQueueSnapshot() {
  const grouped = new Map();
  clientMap.forEach((client) => {
    if (!grouped.has(client.testId)) grouped.set(client.testId, []);
    grouped.get(client.testId).push({
      id: client.id, name: client.name, email: client.email, joinedAt: client.joinedAt
    });
  });
  return Array.from(grouped.entries()).map(([testId, waitingUsers]) => ({ testId, waitingUsers }));
}

exports.getWaitingUsersByTest = getWaitingUsersByTest;
exports.getWaitingQueueSnapshot = getWaitingQueueSnapshot;

// ── SSE Connection Handler ────────────────────────────────────────────────────
exports.getEvents = async (req, res) => {
  const { testId } = req.params;
  const { query } = url.parse(req.url, true);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const clientId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const channel = getChannel(testId);

  const client = {
    id: clientId,
    testId,
    name: query.name || 'Candidate',
    email: query.email || '',
    joinedAt: new Date().toISOString(),
    res,
    redisChannel: channel
  };

  clientMap.set(clientId, client);
  await subscribeToChannel(channel);

  res.write(`data: ${JSON.stringify({ message: 'Connected to waiting room', type: 'CONNECTED', testId })}\n\n`);

  // Keep-alive ping every 25 seconds (prevents proxy timeouts)
  const pingInterval = setInterval(() => {
    try {
      res.write(`data: ${JSON.stringify({ type: 'PING' })}\n\n`);
      if (typeof res.flush === 'function') res.flush();
    } catch {
      clearInterval(pingInterval);
    }
  }, 25000);

  req.on('close', async () => {
    clearInterval(pingInterval);
    clientMap.delete(clientId);
    await unsubscribeFromChannel(channel);
  });
};

// ── Broadcast Event ───────────────────────────────────────────────────────────
exports.broadcastEvent = (testId, data) => {
  const message = JSON.stringify(data);
  const channel = getChannel(testId);

  if (useRedis && redisPublisher) {
    // Publish to Redis — reaches clients on ALL server instances
    redisPublisher.publish(channel, message).catch((err) => {
      console.error('Redis publish error, falling back to in-memory:', err.message);
      _inMemoryBroadcast(channel, message);
    });
  } else {
    // Fallback: direct in-memory broadcast (single instance only)
    _inMemoryBroadcast(channel, message);
  }
};

function _inMemoryBroadcast(channel, message) {
  clientMap.forEach((client) => {
    if (client.redisChannel === channel) {
      try {
        client.res.write(`data: ${message}\n\n`);
        if (typeof client.res.flush === 'function') client.res.flush();
      } catch {
        // Stale connection — will be cleaned up on req.close
      }
    }
  });
}
