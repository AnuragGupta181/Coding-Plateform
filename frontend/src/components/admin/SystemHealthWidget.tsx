import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface SystemHealthData {
  status: string;
  uptime: number;
  cpu?: {
    cores: number;
    model: string;
    usagePercent: number;
  };
  serverRamUsage?: {
    heapUsed: string;
    rss: string;
    totalSystemRam: string;
    freeSystemRam: string;
  };
  redisRamUsage?: {
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
    message?: string;
  };
}

export const SystemHealthWidget: React.FC = () => {
  const [data, setData] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      const res = await axios.get('/health');
      setData(res.data);
    } catch {
      try {
        const fallbackRes = await axios.get('https://api.kaarma.studio/health');
        setData(fallbackRes.data);
      } catch (err) {
        console.error('Failed to fetch health metrics:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 3000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="p-4 border border-border bg-card/40 rounded-sm mb-6 animate-pulse text-xs text-muted-foreground">
        Loading System Health & RAM Metrics...
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mb-8 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          System RAM & Hardware Monitor
        </div>
        <div className="text-[10px] font-mono text-muted-foreground">
          Uptime: {Math.floor(data.uptime / 60)}m {data.uptime % 60}s
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* 1. CPU Usage Card */}
        <div className="p-4 bg-background border border-border rounded-sm shadow-sm hover:border-primary/30 transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">CPU Usage</span>
            <span className="text-xs font-mono font-bold text-foreground-bold">
              {data.cpu?.cores || 1} Cores
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-foreground-bold mb-2">
            {data.cpu?.usagePercent || 0}%
          </div>
          <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                (data.cpu?.usagePercent || 0) > 80 ? 'bg-red-500' : (data.cpu?.usagePercent || 0) > 50 ? 'bg-amber-500' : 'bg-emerald-500'
              }`} 
              style={{ width: `${Math.min(100, Math.max(5, data.cpu?.usagePercent || 0))}%` }}
            />
          </div>
        </div>

        {/* 2. Node.js Server RAM */}
        <div className="p-4 bg-background border border-border rounded-sm shadow-sm hover:border-primary/30 transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Server RAM (Node.js)</span>
            <span className="text-[10px] font-mono text-emerald-500">Active Heap</span>
          </div>
          <div className="text-2xl font-black font-mono text-foreground-bold mb-1">
            {data.serverRamUsage?.heapUsed || '0 MB'}
          </div>
          <div className="text-[10px] text-muted-foreground font-mono flex justify-between">
            <span>RSS: {data.serverRamUsage?.rss || 'N/A'}</span>
            <span>Total: {data.serverRamUsage?.totalSystemRam || 'N/A'}</span>
          </div>
        </div>

        {/* 3. Redis RAM Usage */}
        <div className="p-4 bg-background border border-border rounded-sm shadow-sm hover:border-primary/30 transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Redis Memory</span>
            <span className={`text-[10px] font-mono font-bold ${data.redisRamUsage?.connected ? 'text-emerald-500' : 'text-amber-500'}`}>
              {data.redisRamUsage?.connected ? 'Connected' : 'Offline'}
            </span>
          </div>
          <div className="text-2xl font-black font-mono font-bold text-emerald-500 mb-1">
            {data.redisRamUsage?.usedMemory || '0 MB'}
          </div>
          <div className="text-[10px] text-muted-foreground font-mono flex justify-between">
            <span>Peak: {data.redisRamUsage?.peakMemory || 'N/A'}</span>
            <span>Keys: {data.redisRamUsage?.totalKeys || 0}</span>
          </div>
        </div>

        {/* 4. Redis Key Breakdown */}
        <div className="p-4 bg-background border border-border rounded-sm shadow-sm hover:border-primary/30 transition-all">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Redis Storage Allocation
          </div>
          <div className="space-y-1 text-[11px] font-mono">
            <div className="flex justify-between text-muted-foreground">
              <span>BullMQ Queue Jobs:</span>
              <span className="font-bold text-foreground-bold">{data.redisRamUsage?.breakdown?.bullMqQueues || 0}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>OTP & Auth Limits:</span>
              <span className="font-bold text-foreground-bold">{data.redisRamUsage?.breakdown?.otpAndAuthRateLimits || 0}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Test/Question Cache:</span>
              <span className="font-bold text-foreground-bold">{data.redisRamUsage?.breakdown?.testQuestionCache || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
