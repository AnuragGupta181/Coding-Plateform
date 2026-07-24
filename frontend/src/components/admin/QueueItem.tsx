import React, { useState, useEffect } from 'react';
import type { QueueSummary } from '../../types/admin';

const Spinner = ({ red }: { red?: boolean }) => (
  <svg className={`animate-spin h-3 w-3 ${red ? 'text-red-700' : 'text-current'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

interface QueueItemProps {
  queue: QueueSummary;
  onOpenWaitingRoom: (id: string) => void;
  onStartTest: (id: string) => void;
  onMarkCompleted: (id: string) => void;
}

const ActiveQueueTimer: React.FC<{ startedAt: string; durationInMinutes: number }> = ({ startedAt, durationInMinutes }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState<boolean>(false);

  useEffect(() => {
    const update = () => {
      const startMs = new Date(startedAt).getTime();
      const endMs = startMs + durationInMinutes * 60 * 1000;
      const diffSec = Math.floor(Math.max(0, endMs - Date.now()) / 1000);

      if (diffSec <= 0) {
        setTimeLeft('00:00');
        setIsExpired(true);
      } else {
        const mins = Math.floor(diffSec / 60);
        const secs = diffSec % 60;
        setTimeLeft(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
        setIsExpired(false);
      }
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [startedAt, durationInMinutes]);

  return (
    <div className={`flex items-center gap-2.5 px-4 py-2 rounded-sm border transition-colors ${
      isExpired 
        ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400' 
        : 'bg-muted/70 border-border text-foreground'
    }`}>
      <svg className="w-4 h-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div>
        <div className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground font-sans">Time Remaining</div>
        <div className="font-mono text-base font-black tracking-widest">{timeLeft}</div>
      </div>
    </div>
  );
};

export const QueueItem: React.FC<QueueItemProps> = ({
  queue,
  onOpenWaitingRoom,
  onStartTest,
  onMarkCompleted,
}) => {
  const isWaiting = queue.status === 'waiting';
  const isActive = queue.status === 'active';
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  return (
    <div className="bg-background border border-border p-6 lg:p-10 rounded-sm shadow-sm mb-6 lg:mb-8 transition-all hover:shadow-premium group">
      <div className="flex flex-col lg:flex-row justify-between items-start mb-8 lg:mb-10 gap-4">
        <div>
          <h3 className="text-xl lg:text-2xl font-sans text-foreground-bold mb-2 group-hover:text-cream-700 transition-colors">{queue.title}</h3>
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`text-[9px] uppercase font-black tracking-widest px-3 py-1 rounded-full border ${
              isActive ? 'bg-green-50 border-green-100 text-green-700' : 'bg-background border-border text-muted-foreground'
            }`}>
              {queue.status}
            </span>
            <span className="text-[10px] text-cream-300 font-bold uppercase tracking-widest">ID: {queue.testId.slice(-6)}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          {queue.status === 'scheduled' && (
            <button 
              disabled={loadingAction === 'allow_entry'}
              onClick={async () => {
                setLoadingAction('allow_entry');
                await onOpenWaitingRoom(queue.testId);
                setLoadingAction(null);
              }}
              className={`btn-primary py-2 px-6 flex-1 lg:flex-none text-center justify-center flex items-center gap-2 ${loadingAction === 'allow_entry' ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loadingAction === 'allow_entry' && <Spinner />} Allow Entry
            </button>
          )}
          {isWaiting && (
            <button 
              disabled={loadingAction === 'start_test'}
              onClick={async () => {
                setLoadingAction('start_test');
                await onStartTest(queue.testId);
                setLoadingAction(null);
              }}
              className={`btn-primary py-2 px-6 flex-1 lg:flex-none text-center justify-center flex items-center gap-2 ${loadingAction === 'start_test' ? 'opacity-70 cursor-not-allowed' : 'bg-primary animate-pulse'}`}
            >
              {loadingAction === 'start_test' && <Spinner />} Commence Test
            </button>
          )}
          {isActive && (
            <button 
              disabled={loadingAction === 'force_complete'}
              onClick={async () => {
                setLoadingAction('force_complete');
                await onMarkCompleted(queue.testId);
                setLoadingAction(null);
              }}
              className={`btn-secondary py-2 px-6 border-red-200 text-red-700 flex-1 lg:flex-none text-center justify-center flex items-center gap-2 ${loadingAction === 'force_complete' ? 'opacity-70 cursor-not-allowed' : 'hover:bg-red-50'}`}
            >
              {loadingAction === 'force_complete' && <Spinner red />} Force Complete
            </button>
          )}
        </div>
      </div>

      {isWaiting && (
        <div className="pt-6 lg:pt-8 border-t border-cream-50">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 lg:mb-6 flex justify-between">
            <span>Candidates in Queue</span>
            <span className="text-foreground-bold">{queue.waitingUsers.length}</span>
          </div>
          {queue.waitingUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground italic font-light">The holding area is currently empty.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
              {queue.waitingUsers.map(u => (
                <div key={u.id} className="p-3 lg:p-4 bg-background/50 border border-cream-100 flex items-center gap-3 lg:gap-4 rounded-sm">
                  <div className="w-8 h-8 shrink-0 bg-background border border-border rounded-full flex items-center justify-center text-[10px] font-bold text-foreground-bold">
                    {u.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-foreground truncate uppercase tracking-tight">{u.name}</div>
                    <div className="text-[9px] text-muted-foreground truncate">{u.email}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isActive && (
        <div className="flex gap-8 lg:gap-16 pt-6 lg:pt-8 border-t border-cream-50 items-center justify-between flex-wrap">
          <div className="flex gap-8 lg:gap-16">
            <div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Live Sessions</div>
              <div className="text-3xl lg:text-4xl font-sans text-foreground-bold">{queue.activeSubmissionCount}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Audit Files</div>
              <div className="text-3xl lg:text-4xl font-sans text-foreground-bold">{queue.completedSubmissionCount}</div>
            </div>
          </div>

          <ActiveQueueTimer startedAt={queue.startedAt || new Date().toISOString()} durationInMinutes={queue.durationInMinutes || 60} />
        </div>
      )}
    </div>
  );
};
