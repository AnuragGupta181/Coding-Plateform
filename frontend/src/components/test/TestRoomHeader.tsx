import React from 'react';
import TimerDisplay from '../TimerDisplay';
import { ThemeToggle } from '../common/ThemeToggle';

interface TestRoomHeaderProps {
  candidateName?: string;
  testTitle?: string;
  onAction?: () => void;
  actionText?: string;
  isSaving?: boolean;
}

const TestRoomHeader: React.FC<TestRoomHeaderProps> = ({
  candidateName,
  testTitle,
  onAction,
  actionText,
  isSaving = false,
}) => {
  return (
    <nav className="bg-background border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="flex items-center group cursor-pointer">
            <img src="/logo.svg" alt="NextGen Logo" className="h-8 sm:h-10 w-auto" />
          </div>
          {testTitle && (
            <>
              <div className="w-px h-6 bg-border hidden sm:block"></div>
              <h1 className="hidden sm:block text-base sm:text-xl font-black text-foreground tracking-tight truncate max-w-[180px] md:max-w-xs">
                {testTitle}
              </h1>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 sm:gap-4 md:gap-6">
          {onAction && actionText && (
            <button
              onClick={onAction}
              disabled={isSaving}
              className="py-2 px-3.5 sm:px-5 bg-emerald-800 hover:bg-emerald-700 dark:bg-emerald-900/90 dark:hover:bg-emerald-800 text-white text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-sm border border-emerald-600 dark:border-emerald-400/60 transition-all duration-200 shadow-md hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{actionText}</span>
            </button>
          )}
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

