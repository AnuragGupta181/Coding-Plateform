import { useState, useRef, useEffect } from 'react';
import { getServerTime } from '../utils/serverTime';

export function useCountdown(durationMin: number, startedAt: string | null, onExpire: () => void) {
  const [remaining, setRemaining] = useState(durationMin * 60);
  const fired = useRef(false);

  useEffect(() => {
    const tick = () => {
      const now = getServerTime();
      const start = startedAt ? new Date(startedAt).getTime() : now;
      const left = Math.max(0, Math.floor((start + durationMin * 60_000 - now) / 1000));
      setRemaining(left);
      if (left === 0 && !fired.current) { fired.current = true; onExpire(); }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [durationMin, startedAt, onExpire]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  return { display: `${mm}:${ss}`, isWarning: remaining < 300 };
}
