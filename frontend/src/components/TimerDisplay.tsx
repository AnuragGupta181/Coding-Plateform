import React from 'react';
import { useCountdownTimer } from '../hooks/useCountdownTimer';

const TimerDisplay: React.FC = () => {
  const { timeFormatted, timeRemaining } = useCountdownTimer();
  
  const isUrgent = timeRemaining < 300; // Less than 5 minutes

  return (
    <div className={`flex flex-col items-end`}>
      <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground mb-1">Time Remaining</span>
      <div className={`font-mono text-2xl font-bold ${
        isUrgent ? 'text-red-800' : 'text-foreground-bold'
      }`}>
        {timeFormatted}
      </div>
    </div>
  );
};

export default TimerDisplay;
