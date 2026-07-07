import React from 'react';
import type { QueueSummary } from '../../types/admin';

interface QueueItemProps {
  queue: QueueSummary;
  onOpenWaitingRoom: (id: string) => void;
  onStartTest: (id: string) => void;
  onMarkCompleted: (id: string) => void;
}

export const QueueItem: React.FC<QueueItemProps> = ({
  queue,
  onOpenWaitingRoom,
  onStartTest,
  onMarkCompleted,
}) => {
  const isWaiting = queue.status === 'waiting';
  const isActive = queue.status === 'active';

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
              onClick={() => onOpenWaitingRoom(queue.testId)}
              className="btn-primary py-2 px-6 flex-1 lg:flex-none text-center justify-center"
            >
              Allow Entry
            </button>
          )}
          {isWaiting && (
            <button 
              onClick={() => onStartTest(queue.testId)}
              className="btn-primary py-2 px-6 bg-primary animate-pulse flex-1 lg:flex-none text-center justify-center"
            >
              Commence Test
            </button>
          )}
          {isActive && (
            <button 
              onClick={() => onMarkCompleted(queue.testId)}
              className="btn-secondary py-2 px-6 border-red-200 text-red-700 hover:bg-red-50 flex-1 lg:flex-none text-center justify-center"
            >
              Force Complete
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
        <div className="flex gap-8 lg:gap-16 pt-6 lg:pt-8 border-t border-cream-50">
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Live Sessions</div>
            <div className="text-3xl lg:text-4xl font-sans text-foreground-bold">{queue.activeSubmissionCount}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Audit Files</div>
            <div className="text-3xl lg:text-4xl font-sans text-foreground-bold">{queue.completedSubmissionCount}</div>
          </div>
        </div>
      )}
    </div>
  );
};
