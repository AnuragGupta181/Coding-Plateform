/**
 * telemetryMiddleware.js — HTTP Request Performance Telemetry
 * Tracks RPS, Latency, and Status Code Distributions (2xx, 4xx, 5xx) in-memory
 */

const httpTelemetry = {
  totalRequests: 0,
  recentRequests: 0,
  totalLatencyMs: 0,
  status2xx: 0,
  status4xx: 0,
  status5xx: 0
};

// Reset 60s rolling window counter for RPS calculation
setInterval(() => {
  httpTelemetry.recentRequests = 0;
}, 60000);

const telemetryMiddleware = (req, res, next) => {
  const start = Date.now();
  httpTelemetry.totalRequests += 1;
  httpTelemetry.recentRequests += 1;

  res.on('finish', () => {
    const duration = Date.now() - start;
    httpTelemetry.totalLatencyMs += duration;
    const status = res.statusCode;
    if (status >= 200 && status < 400) httpTelemetry.status2xx += 1;
    else if (status >= 400 && status < 500) httpTelemetry.status4xx += 1;
    else if (status >= 500) httpTelemetry.status5xx += 1;
  });

  next();
};

const getHttpTelemetry = () => {
  const avgLatency = httpTelemetry.totalRequests > 0 
    ? Math.round(httpTelemetry.totalLatencyMs / httpTelemetry.totalRequests) 
    : 0;

  return {
    totalRequests: httpTelemetry.totalRequests,
    rps: Math.round(httpTelemetry.recentRequests / 60),
    avgLatencyMs: avgLatency,
    status2xx: httpTelemetry.status2xx,
    status4xx: httpTelemetry.status4xx,
    status5xx: httpTelemetry.status5xx
  };
};

module.exports = {
  telemetryMiddleware,
  getHttpTelemetry
};
