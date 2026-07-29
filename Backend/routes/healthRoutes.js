/**
 * Health Check Route
 * 
 * Returns system metrics: CPU, RAM, MongoDB, Redis, SSE, Judge0 stats.
 * Auth-protected in production to prevent infrastructure reconnaissance.
 */

const os = require('os');
const mongoose = require('mongoose');
const config = require('../config');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');
const { getHttpTelemetry } = require('../middleware/telemetryMiddleware');
const { getRedisMetrics } = require('../services/redisClient');
const eventController = require('../controllers/eventController');

let prevCpuTimes = null;

function getCpuUsagePercent(cpus) {
  let user = 0, sys = 0, idle = 0;
  for (const cpu of cpus) {
    user += cpu.times.user;
    sys += cpu.times.sys;
    idle += cpu.times.idle;
  }
  const total = user + sys + idle;

  if (!prevCpuTimes) {
    prevCpuTimes = { user, sys, idle, total };
    const active = user + sys;
    return total === 0 ? 0 : Math.round((active / total) * 100);
  }

  const userDiff = user - prevCpuTimes.user;
  const sysDiff = sys - prevCpuTimes.sys;
  const totalDiff = total - prevCpuTimes.total;

  prevCpuTimes = { user, sys, idle, total };

  if (totalDiff <= 0) return 0;
  const activeDiff = userDiff + sysDiff;
  return Math.min(100, Math.max(0, Math.round((activeDiff / totalDiff) * 100)));
}

function mountHealthCheck(app) {
  // In production, require admin auth to prevent infrastructure reconnaissance.
  // In development, allow unauthenticated access for local debugging convenience.
  const middleware = config.isProduction
    ? [requireAuth, requireAdmin]
    : [];

  app.get('/health', ...middleware, async (_req, res) => {
    const redisStats = await getRedisMetrics();
    const cpus = os.cpus();
    const load = os.loadavg()[0];
    const cpuPercent = getCpuUsagePercent(cpus);

    const mongoState = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const mongoDbName = mongoose.connection.name || 'N/A';
    const mongoHost = mongoose.connection.host || 'N/A';

    const { getCodeExecutionStats } = require('../services/codeExecutionQueue');
    const sseTopology = eventController.getSseTopology ? eventController.getSseTopology() : { activeConnections: 0, activeChannels: 0 };
    const judge0Stats = getCodeExecutionStats ? getCodeExecutionStats() : { total: 0, acceptedPct: 0, wrongAnswerPct: 0, timeLimitPct: 0, runtimeErrorPct: 0 };

    res.json({
      status: 'ok',
      environment: config.env,
      serviceMode: process.env.SERVICE_MODE || 'both',
      uptime: Math.round(process.uptime()),
      httpPerformance: getHttpTelemetry(),
      judge0Outcomes: judge0Stats,
      sseTopology,
      cpu: {
        cores: cpus.length,
        model: cpus[0]?.model || 'System CPU',
        usagePercent: cpuPercent,
        loadAverage: load.toFixed(2)
      },
      serverRamUsage: {
        heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        totalSystemRamGb: (os.totalmem() / 1024 / 1024 / 1024).toFixed(1),
        freeSystemRamGb: (os.freemem() / 1024 / 1024 / 1024).toFixed(1)
      },
      mongodb: {
        status: mongoState,
        databaseName: mongoDbName,
        host: mongoHost,
        maxPoolSize: 50
      },
      redisRamUsage: redisStats
    });
  });
}

module.exports = { mountHealthCheck };
