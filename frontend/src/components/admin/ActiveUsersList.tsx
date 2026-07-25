import React, { useState, useEffect } from 'react';
import type { ActiveUser } from '../../types/admin';
import testService from '../../utils/apiService';

interface ActiveUsersListProps {
  testId: string;
}

export const ActiveUsersList: React.FC<ActiveUsersListProps> = ({ testId }) => {
  const [users, setUsers] = useState<ActiveUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'violations' | 'recent' | 'name'>('violations');
  const [messagingUserId, setMessagingUserId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await testService.getActiveTestUsers(testId);
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch active users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchUsers, 10000); // Auto-refresh every 10s
    return () => clearInterval(interval);
  }, [testId]);

  const handleSendMessage = async (email: string) => {
    if (!messageText.trim()) return;
    setSendingMsg(true);
    try {
      await testService.sendProctorMessage(testId, email, messageText);
      setMessageText('');
      setMessagingUserId(null);
      // Optional: show a success toast here
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setSendingMsg(false);
    }
  };

  const getElapsedTime = (startTime: string) => {
    const diff = Math.max(0, Date.now() - new Date(startTime).getTime());
    const mins = Math.floor(diff / 60000);
    return `${mins} min${mins !== 1 ? 's' : ''}`;
  };

  const sortedUsers = [...users].sort((a, b) => {
    if (sortBy === 'violations') {
      const aCount = a.violations.reduce((sum, v) => sum + v.count, 0);
      const bCount = b.violations.reduce((sum, v) => sum + v.count, 0);
      return bCount - aCount;
    }
    if (sortBy === 'recent') {
      return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
    }
    return a.name.localeCompare(b.name);
  });

  if (loading) {
    return <div className="text-sm text-muted-foreground italic py-4">Loading live candidates...</div>;
  }

  if (users.length === 0) {
    return <div className="text-sm text-muted-foreground italic py-4">No candidates are currently active.</div>;
  }

  return (
    <div className="mt-6 pt-6 border-t border-border">
      <div className="flex justify-between items-end mb-6">
        <div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Live Candidates</div>
          <div className="text-xl font-sans text-foreground-bold">{users.length} Active</div>
        </div>
        <select 
          className="bg-background border border-border text-sm px-3 py-1.5 rounded-sm outline-none focus:border-cream-300"
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value as any)}
        >
          <option value="violations">Sort by Violations</option>
          <option value="recent">Sort by Most Recent</option>
          <option value="name">Sort by Name</option>
        </select>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {sortedUsers.map(u => {
          const totalViolations = u.violations.reduce((sum, v) => sum + v.count, 0);
          const isMessaging = messagingUserId === u.id;

          return (
            <div key={u.id} className="p-4 bg-background border border-border shadow-sm rounded-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 shrink-0 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center text-sm font-bold text-primary">
                    {u.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground truncate max-w-[200px]">{u.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{u.email}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Elapsed</div>
                  <div className="text-xs font-mono font-bold">{getElapsedTime(u.startTime)}</div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="text-xs">
                  <span className="text-muted-foreground">Progress: </span>
                  <span className="font-bold">{u.answeredCount} answered</span>
                </div>
                {totalViolations > 0 ? (
                  <div className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border bg-red-50 text-red-700 border-red-200">
                    ⚠️ {totalViolations} Violations
                  </div>
                ) : (
                  <div className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border bg-green-50 text-green-700 border-green-200">
                    ✓ Clear
                  </div>
                )}
              </div>

              {isMessaging ? (
                <div className="mt-4 pt-4 border-t border-border animate-fade-in">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-2">Proctor Message</label>
                  <textarea 
                    className="w-full bg-background border border-border rounded-sm p-2 text-sm outline-none focus:border-cream-400 min-h-[60px]"
                    placeholder="E.g., Please stop switching tabs or your test will be terminated."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                  />
                  <div className="flex gap-2 mt-2 justify-end">
                    <button 
                      onClick={() => setMessagingUserId(null)}
                      className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => handleSendMessage(u.email)}
                      disabled={sendingMsg || !messageText.trim()}
                      className="btn-primary text-xs px-4 py-1.5 flex items-center gap-2"
                    >
                      {sendingMsg ? 'Sending...' : 'Send Message'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 pt-3 border-t border-border flex justify-end">
                  <button 
                    onClick={() => {
                      setMessagingUserId(u.id);
                      setMessageText('');
                    }}
                    className="text-xs font-bold uppercase tracking-widest text-indigo-500 hover:text-indigo-600 transition-colors"
                  >
                    Send Message
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
