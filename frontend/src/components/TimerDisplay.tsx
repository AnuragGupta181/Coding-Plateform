import React from 'react';
import { useCountdownTimer } from '../hooks/useCountdownTimer';

const TimerDisplay: React.FC = () => {
  const { timeFormatted, timeRemaining } = useCountdownTimer();
  
  const isUrgent = timeRemaining < 300; // Less than 5 minutes
  const isCritical = timeRemaining < 60;  // Less than 1 minute

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border transition-all ${
      isCritical
        ? 'bg-red-500/15 border-red-500/50 text-red-700 dark:text-red-400 animate-pulse'
        : isUrgent
          ? 'bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-400'
          : 'bg-muted/70 border-border text-foreground'
    }`}>
      <svg className={`w-4 h-4 shrink-0 ${isCritical ? 'text-red-500' : isUrgent ? 'text-amber-500' : 'text-muted-foreground'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div className="flex items-center gap-1.5 font-mono">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-sans">
          Time
        </span>
        <span className="text-sm font-black tracking-widest text-foreground-bold">
          {timeFormatted}
        </span>
      </div>
    </div>
  );
};

export default TimerDisplay;
