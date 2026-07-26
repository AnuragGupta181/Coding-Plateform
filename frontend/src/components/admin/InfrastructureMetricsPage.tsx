import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface SystemMetrics {
  status: string;
  environment: string;
  serviceMode: string;
  uptime: number;
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

  if (loading && !metrics) {
    return (
      <div className="p-12 text-center border border-dashed border-border rounded-sm bg-muted/5 animate-pulse">
        <p className="text-sm font-mono text-muted-foreground">Connecting to Backend Health Telemetry...</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-12 text-center border border-red-500/20 bg-red-500/5 rounded-sm">
        <p className="text-red-500 font-bold">Failed to load backend metrics telemetry.</p>
      </div>
    );
  }

  const formatUptime = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return `${hrs > 0 ? `${hrs}h ` : ''}${mins}m ${secs}s`;
  };

  return (
    <div className="animate-fade-in space-y-8">
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 pb-6 border-b border-border">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-500 mb-1 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Real-time Telemetry Dashboard
          </div>
          <h2 className="text-3xl lg:text-4xl font-sans text-foreground-bold">System Infrastructure & Hardware</h2>
          <p className="text-sm text-muted-foreground font-light italic mt-1">
            Live CPU, Node.js Memory, MongoDB connection pool, and Redis storage distribution.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="text-right font-mono">
            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Last Update</div>
            <div className="text-xs font-bold text-foreground-bold">{lastUpdated || 'Just now'}</div>
          </div>
          <button 
            onClick={fetchMetrics}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
          >
            🔄 Refresh
          </button>
        </div>
      </header>

      {/* Service Mode & System Status Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-background border border-border rounded-sm">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Backend Status</div>
          <div className="text-base font-bold text-emerald-500 uppercase flex items-center gap-1.5">
            <span>●</span> {metrics.status}
          </div>
        </div>

        <div className="p-4 bg-background border border-border rounded-sm">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">CQRS Service Mode</div>
          <div className="text-base font-bold text-indigo-500 uppercase font-mono">
            {metrics.serviceMode} Mode
          </div>
        </div>

        <div className="p-4 bg-background border border-border rounded-sm">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Environment</div>
          <div className="text-base font-bold text-foreground-bold font-mono uppercase">
            {metrics.environment}
          </div>
        </div>

        <div className="p-4 bg-background border border-border rounded-sm">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Server Uptime</div>
          <div className="text-base font-bold text-foreground-bold font-mono">
            {formatUptime(metrics.uptime)}
          </div>
        </div>
      </div>

      {/* Main Hardware Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* Card 1: CPU Workload */}
        <div className="p-6 bg-background border border-border rounded-sm shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">CPU Workload</span>
              <span className="text-xs font-mono font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded">
                {metrics.cpu.cores} Cores
              </span>
            </div>
            <div className="text-4xl font-black font-mono text-foreground-bold mb-2">
              {metrics.cpu.usagePercent}%
            </div>
            <div className="text-xs text-muted-foreground font-mono mb-4 truncate" title={metrics.cpu.model}>
              {metrics.cpu.model}
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[11px] text-muted-foreground font-mono mb-1">
              <span>1-Min Load Avg</span>
              <span>{metrics.cpu.loadAverage}</span>
            </div>
            <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  metrics.cpu.usagePercent > 80 ? 'bg-red-500' : metrics.cpu.usagePercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(5, metrics.cpu.usagePercent))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Server RAM (Node.js) */}
        <div className="p-6 bg-background border border-border rounded-sm shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Server Memory (Node)</span>
              <span className="text-xs font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                Heap Active
              </span>
            </div>
            <div className="text-4xl font-black font-mono text-foreground-bold mb-2">
              {metrics.serverRamUsage.heapUsedMb} <span className="text-lg font-normal text-muted-foreground">MB</span>
            </div>
            <div className="text-xs text-muted-foreground font-mono mb-4">
              Allocated Heap: {metrics.serverRamUsage.heapTotalMb} MB
            </div>
          </div>
          <div className="space-y-1.5 text-xs font-mono pt-3 border-t border-border">
            <div className="flex justify-between text-muted-foreground">
              <span>RSS Memory:</span>
              <span className="font-bold text-foreground">{metrics.serverRamUsage.rssMb} MB</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>System RAM:</span>
              <span className="font-bold text-foreground">{metrics.serverRamUsage.freeSystemRamGb} / {metrics.serverRamUsage.totalSystemRamGb} GB Free</span>
            </div>
          </div>
        </div>

        {/* Card 3: MongoDB Instance */}
        <div className="p-6 bg-background border border-border rounded-sm shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">MongoDB Database</span>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                metrics.mongodb.status === 'connected' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
              }`}>
                {metrics.mongodb.status}
              </span>
            </div>
            <div className="text-2xl font-black font-sans text-foreground-bold mb-2 truncate">
              {metrics.mongodb.databaseName}
            </div>
            <div className="text-xs text-muted-foreground font-mono mb-4 truncate" title={metrics.mongodb.host}>
              Host: {metrics.mongodb.host}
            </div>
          </div>
          <div className="space-y-1.5 text-xs font-mono pt-3 border-t border-border">
            <div className="flex justify-between text-muted-foreground">
              <span>Max Pool Size:</span>
              <span className="font-bold text-emerald-500">{metrics.mongodb.maxPoolSize} Pool Slots</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>DB Connection:</span>
              <span className="font-bold text-foreground">Active Primary</span>
            </div>
          </div>
        </div>

        {/* Card 4: Redis RAM & Storage */}
        <div className="p-6 bg-background border border-border rounded-sm shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Redis Memory</span>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                metrics.redisRamUsage.connected ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
              }`}>
                {metrics.redisRamUsage.connected ? 'Connected' : 'Offline'}
              </span>
            </div>
            <div className="text-4xl font-black font-mono text-emerald-500 mb-2">
              {metrics.redisRamUsage.usedMemory || '0 MB'}
            </div>
            <div className="text-xs text-muted-foreground font-mono mb-4">
              Peak RAM: {metrics.redisRamUsage.peakMemory || 'N/A'}
            </div>
          </div>
          <div className="space-y-1.5 text-xs font-mono pt-3 border-t border-border">
            <div className="flex justify-between text-muted-foreground">
              <span>Total Active Keys:</span>
              <span className="font-bold text-foreground">{metrics.redisRamUsage.totalKeys || 0} Keys</span>
            </div>
          </div>
        </div>

      </div>

      {/* Redis Storage Allocation Breakdown Panel */}
      <div className="bg-background border border-border rounded-sm p-6 shadow-sm">
        <div className="mb-4 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-sans font-bold text-foreground-bold">Redis Key Allocation & Feature Storage</h3>
            <p className="text-xs text-muted-foreground font-light italic">Exact distribution of cached data across application modules.</p>
          </div>
          <span className="text-xs font-mono text-muted-foreground bg-muted/30 px-3 py-1 rounded">
            {metrics.redisRamUsage.totalKeys || 0} Total Redis Keys
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-border">
          {/* Module 1: BullMQ Queues */}
          <div className="p-4 bg-muted/10 border border-border rounded-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-foreground-bold">BullMQ Background Queues</span>
              <span className="text-xs font-mono font-bold text-emerald-500">
                {metrics.redisRamUsage.breakdown?.bullMqQueues || 0} Keys
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
              Holds code run/submit payloads, waiting lists, active workers, and job execution logs.
            </p>
            <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full transition-all" 
                style={{ 
                  width: `${Math.min(100, (((metrics.redisRamUsage.breakdown?.bullMqQueues || 0) / Math.max(1, metrics.redisRamUsage.totalKeys || 1)) * 100))}%` 
                }} 
              />
            </div>
          </div>

          {/* Module 2: OTP & Auth Limits */}
          <div className="p-4 bg-muted/10 border border-border rounded-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-foreground-bold">OTP & Auth Rate Limits</span>
              <span className="text-xs font-mono font-bold text-indigo-500">
                {metrics.redisRamUsage.breakdown?.otpAndAuthRateLimits || 0} Keys
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
              Stores hashed registration OTPs, attempt counters, and IP rate-limit blocks.
            </p>
            <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-500 h-full transition-all" 
                style={{ 
                  width: `${Math.min(100, (((metrics.redisRamUsage.breakdown?.otpAndAuthRateLimits || 0) / Math.max(1, metrics.redisRamUsage.totalKeys || 1)) * 100))}%` 
                }} 
              />
            </div>
          </div>

          {/* Module 3: Test & Question Caching */}
          <div className="p-4 bg-muted/10 border border-border rounded-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-foreground-bold">Test & Question Cache</span>
              <span className="text-xs font-mono font-bold text-amber-500">
                {metrics.redisRamUsage.breakdown?.testQuestionCache || 0} Keys
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
              Caches test objects and question lists to reduce database query load during exam drives.
            </p>
            <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-amber-500 h-full transition-all" 
                style={{ 
                  width: `${Math.min(100, (((metrics.redisRamUsage.breakdown?.testQuestionCache || 0) / Math.max(1, metrics.redisRamUsage.totalKeys || 1)) * 100))}%` 
                }} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
