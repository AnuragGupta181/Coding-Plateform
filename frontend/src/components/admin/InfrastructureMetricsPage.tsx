import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { testService } from '../../utils/apiService';

interface SystemMetrics {
  status: string;
  environment: string;
  serviceMode: string;
  uptime: number;
  httpPerformance?: {
    totalRequests: number;
    rps: number;
    avgLatencyMs: number;
    status2xx: number;
    status4xx: number;
    status5xx: number;
  };
  judge0Outcomes?: {
    total: number;
    acceptedPct: number;
    wrongAnswerPct: number;
    timeLimitPct: number;
    runtimeErrorPct: number;
  };
  sseTopology?: {
    activeConnections: number;
    activeChannels: number;
    useRedis: boolean;
  };
  cpu: {
    cores: number;
    model: string;
    usagePercent: number;
    loadAverage: string;
  };
  serverRamUsage: {
    heapUsedMb: number;
    heapTotalMb: number;
    rssMb: number;
    totalSystemRamGb: string;
    freeSystemRamGb: string;
  };
  mongodb: {
    status: string;
    databaseName: string;
    host: string;
    maxPoolSize: number;
  };
  redisRamUsage: {
    connected: boolean;
    usedMemory?: string;
    peakMemory?: string;
    totalKeys?: number;
    breakdown?: {
      otpAndAuthRateLimits: number;
      testQuestionCache: number;
      bullMqQueues: number;
      otherKeys: number;
    };
  };
}

export const InfrastructureMetricsPage: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchMetrics = async () => {
    try {
      let res;
      try {
        res = await axios.get('/health');
      } catch {
        res = await axios.get('http://localhost:5000/health');
      }
      setMetrics(res.data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to fetch infrastructure metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleClearCache = async () => {
    setActionLoading(true);
    try {
      const res = await testService.clearTestCache();
      toast.success(res.data?.message || 'Test cache cleared successfully!');
      fetchMetrics();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to clear cache.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePurgeQueues = async () => {
    if (!window.confirm('Are you sure you want to purge completed job queues?')) return;
    setActionLoading(true);
    try {
      const res = await testService.clearQueues();
      toast.success(res.data?.message || 'Background queues cleared successfully!');
      fetchMetrics();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to clear queues.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs uppercase font-mono tracking-widest text-muted-foreground">Gathering Telemetry...</p>
        </div>
      </div>
    );
  }

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const totalRedisKeys = metrics?.redisRamUsage.totalKeys || 1;
  const bullMqKeys = metrics?.redisRamUsage.breakdown?.bullMqQueues || 0;
  const otpKeys = metrics?.redisRamUsage.breakdown?.otpAndAuthRateLimits || 0;
  const cacheKeys = metrics?.redisRamUsage.breakdown?.testQuestionCache || 0;

  return (
    <div className="space-y-8 p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-emerald-400 font-bold">
              REAL-TIME TELEMETRY DASHBOARD
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-sans font-bold text-foreground-bold mt-1">
            System Infrastructure & Hardware
          </h1>
          <p className="text-xs text-muted-foreground font-light">
            Live CPU, Node.js Memory, MongoDB connection pool, Redis storage, and HTTP performance telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono uppercase text-muted-foreground">
            LAST UPDATE: <span className="text-foreground font-bold">{lastUpdated}</span>
          </span>
          <button
            onClick={fetchMetrics}
            className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider border border-border rounded-sm hover:border-primary transition-colors flex items-center gap-2 bg-muted/30"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Top Banner Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-background border border-border p-4 rounded-sm shadow-sm">
          <div className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">BACKEND STATUS</div>
          <div className="text-lg font-mono font-bold text-emerald-400 mt-1 flex items-center gap-2">
            <span>●</span> {metrics?.status?.toUpperCase() || 'OK'}
          </div>
        </div>

        <div className="bg-background border border-border p-4 rounded-sm shadow-sm">
          <div className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">CQRS SERVICE MODE</div>
          <div className="text-lg font-mono font-bold text-indigo-400 mt-1">
            {metrics?.serviceMode?.toUpperCase()} MODE
          </div>
        </div>

        <div className="bg-background border border-border p-4 rounded-sm shadow-sm">
          <div className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">ENVIRONMENT</div>
          <div className="text-lg font-mono font-bold text-foreground-bold mt-1">
            {metrics?.environment?.toUpperCase()}
          </div>
        </div>

        <div className="bg-background border border-border p-4 rounded-sm shadow-sm">
          <div className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">SERVER UPTIME</div>
          <div className="text-lg font-mono font-bold text-cream-100 mt-1">
            {metrics?.uptime ? formatUptime(metrics.uptime) : '0s'}
          </div>
        </div>
      </div>

      {/* Admin Quick Action Controls Bar */}
      <div className="bg-background border border-border p-5 rounded-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Admin Quick Actions</h3>
          <p className="text-xs text-muted-foreground">Instantly purge cache or clear finished BullMQ execution queues.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleClearCache}
            disabled={actionLoading}
            className="flex-1 md:flex-none px-4 py-2 text-xs font-bold uppercase tracking-widest border border-amber-500/40 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            🧹 Clear Test Cache
          </button>
          <button
            onClick={handlePurgeQueues}
            disabled={actionLoading}
            className="flex-1 md:flex-none px-4 py-2 text-xs font-bold uppercase tracking-widest border border-rose-500/40 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 rounded-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            ⚡ Purge BullMQ History
          </button>
        </div>
      </div>

      {/* Primary Hardware Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {/* CPU Workload */}
        <div className="bg-background border border-border p-5 rounded-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-mono font-bold uppercase text-muted-foreground tracking-widest">CPU WORKLOAD</span>
              <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-xs">
                {metrics?.cpu.cores || 1} Cores
              </span>
            </div>
            <div className="text-3xl font-mono font-bold text-foreground-bold mb-1">
              {metrics?.cpu.usagePercent}%
            </div>
            <div className="text-xs text-muted-foreground truncate mb-4">
              {metrics?.cpu.model}
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-muted-foreground">1-Min Load Avg</span>
              <span className="text-foreground">{metrics?.cpu.loadAverage}</span>
            </div>
            <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${Math.min(100, (metrics?.cpu.usagePercent || 0))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Server Memory (Node.js RAM) */}
        <div className="bg-background border border-border p-5 rounded-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-mono font-bold uppercase text-muted-foreground tracking-widest">SERVER MEMORY</span>
              <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-xs">
                Heap Active
              </span>
            </div>
            <div className="text-3xl font-mono font-bold text-foreground-bold mb-1">
              {metrics?.serverRamUsage.heapUsedMb || 0} MB
            </div>
            <div className="text-xs text-muted-foreground mb-4">
              Allocated Heap: {metrics?.serverRamUsage.heapTotalMb || 0} MB
            </div>
          </div>
          <div className="space-y-1.5 text-xs font-mono border-t border-border pt-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">RSS Memory</span>
              <span className="text-foreground font-bold">{metrics?.serverRamUsage.rssMb || 0} MB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Free System RAM</span>
              <span className="text-emerald-400 font-bold">{metrics?.serverRamUsage.freeSystemRamGb || 0} / {metrics?.serverRamUsage.totalSystemRamGb || 0} GB</span>
            </div>
          </div>
        </div>

        {/* HTTP Performance & Network */}
        <div className="bg-background border border-border p-5 rounded-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-mono font-bold uppercase text-muted-foreground tracking-widest">HTTP NETWORK</span>
              <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-xs">
                {metrics?.httpPerformance?.rps || 0} RPS
              </span>
            </div>
            <div className="text-3xl font-mono font-bold text-foreground-bold mb-1">
              {metrics?.httpPerformance?.avgLatencyMs || 0} ms
            </div>
            <div className="text-xs text-muted-foreground mb-4">
              Average HTTP Response Time
            </div>
          </div>
          <div className="space-y-1.5 text-xs font-mono border-t border-border pt-3">
            <div className="flex justify-between">
              <span className="text-emerald-400">2xx Success</span>
              <span>{metrics?.httpPerformance?.status2xx || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-amber-400">4xx Client Errors</span>
              <span>{metrics?.httpPerformance?.status4xx || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-rose-400">5xx Server Errors</span>
              <span>{metrics?.httpPerformance?.status5xx || 0}</span>
            </div>
          </div>
        </div>

        {/* Judge0 Execution Stats */}
        <div className="bg-background border border-border p-5 rounded-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-mono font-bold uppercase text-muted-foreground tracking-widest">JUDGE0 OUTCOMES</span>
              <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-xs">
                {metrics?.judge0Outcomes?.total || 0} Total
              </span>
            </div>
            <div className="text-3xl font-mono font-bold text-emerald-400 mb-1">
              {metrics?.judge0Outcomes?.acceptedPct || 0}%
            </div>
            <div className="text-xs text-muted-foreground mb-4">Accepted Submissions</div>
          </div>
          <div className="space-y-1.5 text-xs font-mono border-t border-border pt-3">
            <div className="flex justify-between">
              <span className="text-rose-400">Wrong Answer</span>
              <span>{metrics?.judge0Outcomes?.wrongAnswerPct || 0}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-amber-400">Time Limit Exceeded</span>
              <span>{metrics?.judge0Outcomes?.timeLimitPct || 0}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-400">Runtime / Compile Err</span>
              <span>{metrics?.judge0Outcomes?.runtimeErrorPct || 0}%</span>
            </div>
          </div>
        </div>

        {/* SSE Stream Topology */}
        <div className="bg-background border border-border p-5 rounded-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-mono font-bold uppercase text-muted-foreground tracking-widest">SSE TOPOLOGY</span>
              <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-xs">
                {metrics?.sseTopology?.useRedis ? 'Redis PubSub' : 'In-Memory'}
              </span>
            </div>
            <div className="text-3xl font-mono font-bold text-indigo-400 mb-1">
              {metrics?.sseTopology?.activeConnections || 0}
            </div>
            <div className="text-xs text-muted-foreground mb-4">Connected Active Candidates</div>
          </div>
          <div className="space-y-1.5 text-xs font-mono border-t border-border pt-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active Exam Channels</span>
              <span className="text-foreground">{metrics?.sseTopology?.activeChannels || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pub/Sub Transport</span>
              <span className="text-emerald-400">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Databases Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MongoDB Status */}
        <div className="bg-background border border-border p-5 rounded-sm space-y-4">
          <div className="flex justify-between items-start border-b border-border pb-3">
            <div>
              <span className="text-xs font-mono font-bold uppercase text-muted-foreground tracking-widest">MONGODB DATABASE</span>
              <h4 className="text-lg font-bold font-sans text-foreground-bold mt-1">{metrics?.mongodb.databaseName}</h4>
            </div>
            <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-xs ${
              metrics?.mongodb.status === 'connected' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
            }`}>
              {metrics?.mongodb.status}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <div className="text-muted-foreground">Host</div>
              <div className="text-foreground truncate">{metrics?.mongodb.host}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Max Pool Size</div>
              <div className="text-emerald-400 font-bold">{metrics?.mongodb.maxPoolSize} Pool Slots</div>
            </div>
          </div>
        </div>

        {/* Redis Memory Status */}
        <div className="bg-background border border-border p-5 rounded-sm space-y-4">
          <div className="flex justify-between items-start border-b border-border pb-3">
            <div>
              <span className="text-xs font-mono font-bold uppercase text-muted-foreground tracking-widest">REDIS CACHE & STORAGE</span>
              <h4 className="text-lg font-bold font-sans text-emerald-400 mt-1">{metrics?.redisRamUsage.usedMemory || 'N/A'}</h4>
            </div>
            <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-xs ${
              metrics?.redisRamUsage.connected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
            }`}>
              {metrics?.redisRamUsage.connected ? 'Connected' : 'Offline'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-xs font-mono">
            <div>
              <div className="text-muted-foreground">Peak Memory</div>
              <div className="text-foreground">{metrics?.redisRamUsage.peakMemory || 'N/A'}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Total Active Keys</div>
              <div className="text-foreground font-bold">{metrics?.redisRamUsage.totalKeys || 0} Keys</div>
            </div>
            <div>
              <div className="text-muted-foreground">BullMQ Queue Keys</div>
              <div className="text-indigo-400 font-bold">{metrics?.redisRamUsage.breakdown?.bullMqQueues || 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Redis Key Allocation & Feature Storage Detailed Breakdown */}
      <div className="bg-background border border-border p-5 rounded-sm space-y-5">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Redis Key Allocation & Feature Storage</h3>
            <p className="text-xs text-muted-foreground">Exact distribution of cached data across application modules.</p>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400">{metrics?.redisRamUsage.totalKeys || 0} Total Redis Keys</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-border/70 p-4 rounded-sm bg-muted/20 space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="font-bold text-foreground">BullMQ Background Queues</span>
              <span className="text-indigo-400 font-bold">{bullMqKeys} Keys</span>
            </div>
            <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
              <div className="bg-indigo-500 h-full transition-all" style={{ width: `${Math.round((bullMqKeys / totalRedisKeys) * 100)}%` }} />
            </div>
            <div className="text-[10px] font-mono text-muted-foreground text-right">{Math.round((bullMqKeys / totalRedisKeys) * 100)}% of Redis storage</div>
          </div>

          <div className="border border-border/70 p-4 rounded-sm bg-muted/20 space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="font-bold text-foreground">OTP & Auth Rate Limits</span>
              <span className="text-amber-400 font-bold">{otpKeys} Keys</span>
            </div>
            <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full transition-all" style={{ width: `${Math.round((otpKeys / totalRedisKeys) * 100)}%` }} />
            </div>
            <div className="text-[10px] font-mono text-muted-foreground text-right">{Math.round((otpKeys / totalRedisKeys) * 100)}% of Redis storage</div>
          </div>

          <div className="border border-border/70 p-4 rounded-sm bg-muted/20 space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="font-bold text-foreground">Test & Question Cache</span>
              <span className="text-emerald-400 font-bold">{cacheKeys} Keys</span>
            </div>
            <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full transition-all" style={{ width: `${Math.round((cacheKeys / totalRedisKeys) * 100)}%` }} />
            </div>
            <div className="text-[10px] font-mono text-muted-foreground text-right">{Math.round((cacheKeys / totalRedisKeys) * 100)}% of Redis storage</div>
          </div>
        </div>
      </div>
    </div>
  );
};
