import axios from 'axios';

let serverOffsetMs = 0;
let isSyncing = false;
let hasSynced = false;

const DEFAULT_BASE = (
  import.meta.env.VITE_QUERY_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api')
).replace(/\/+$/, '');

/**
 * Synchronizes client clock with the backend server clock.
 * Measures Network Round-Trip Time (RTT) to compute accurate offset.
 */
export async function syncServerTime(): Promise<number> {
  if (isSyncing) return serverOffsetMs;
  isSyncing = true;

  try {
    const t0 = Date.now();
    const response = await axios.get(`${DEFAULT_BASE}/query/time`, {
      timeout: 5000,
    });
    const t1 = Date.now();

    const serverTime = response.data?.serverTime || Date.now();
    const rtt = t1 - t0;
    const estimatedServerTime = serverTime + Math.floor(rtt / 2);
    serverOffsetMs = estimatedServerTime - t1;
    hasSynced = true;

    if (import.meta.env.DEV) {
      console.debug('Global Server Time Synced:', {
        rttMs: rtt,
        serverOffsetMs,
        serverTimeISO: new Date(estimatedServerTime).toISOString(),
        clientTimeISO: new Date(t1).toISOString(),
      });
    }
  } catch (err) {
    console.warn('Failed to sync server time, falling back to local clock:', err);
  } finally {
    isSyncing = false;
  }

  return serverOffsetMs;
}

/**
 * Returns the current time in milliseconds aligned with global Server Time.
 * Immune to candidate device clock misconfigurations or manual changes.
 */
export function getServerTime(): number {
  if (!hasSynced && !isSyncing) {
    // Fire background sync if not synced yet
    syncServerTime().catch(() => {});
  }
  return Date.now() + serverOffsetMs;
}

/**
 * Helper to get current Date object aligned with Server Time.
 */
export function getServerDate(): Date {
  return new Date(getServerTime());
}

// Initial background sync on module load
syncServerTime().catch(() => {});

// Re-sync every 60 seconds to prevent timer drift
if (typeof window !== 'undefined') {
  setInterval(() => {
    syncServerTime().catch(() => {});
  }, 60000);
}
