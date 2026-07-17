import React from 'react';
import TimerDisplay from '../TimerDisplay';
import { ThemeToggle } from '../common/ThemeToggle';

interface TestRoomHeaderProps {
  candidateName?: string;
}

const TestRoomHeader: React.FC<TestRoomHeaderProps> = ({ candidateName }) => {
  return (
    <nav className="bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
        <div className="flex items-center group cursor-pointer">
          <img src="/logo.svg" alt="NextGen Logo" className="h-10 md:h-12 w-auto" />
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          <ThemeToggle />
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-tighter">Candidate</span>
            <span className="text-sm font-bold text-foreground">{candidateName}</span>
          </div>
          <div className="w-px h-8 bg-muted hidden sm:block"></div>
          <TimerDisplay />
        </div>
      </div>
    </nav>
  );
};

export default TestRoomHeader;
