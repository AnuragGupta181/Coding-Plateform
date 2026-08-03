import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getServerTime } from '../../utils/serverTime';

// Live elapsed-time hook — ticks every second
const useElapsed = (startTime: string) => {
  const [elapsed, setElapsed] = useState(0);
  const startMs = useRef(new Date(startTime).getTime());
  useEffect(() => {
    const tick = () => setElapsed(Math.max(0, Math.floor((getServerTime() - startMs.current) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};
import toast from 'react-hot-toast';
import testService from '../../utils/apiService';
import type { ActiveUser, QueueSummary } from '../../types/admin';
import useProctorSocket from '../../hooks/useProctorSocket';
import useWebRTC from '../../hooks/useWebRTC';
import { SearchBar } from '../common/SearchBar';

// ─── Level 1: Active Test Card ────────────────────────────────────────────────

interface TestCardProps {
  queue: QueueSummary;
  onClick: () => void;
}

const ActiveTestCard: React.FC<TestCardProps> = ({ queue, onClick }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!queue.startedAt || !queue.durationInMinutes) return;
    const update = () => {
      const endMs = new Date(queue.startedAt!).getTime() + queue.durationInMinutes! * 60 * 1000;
      const diffSec = Math.max(0, Math.floor((endMs - getServerTime()) / 1000));
      const m = Math.floor(diffSec / 60);
      const s = diffSec % 60;
      setTimeLeft(`${m}:${s < 10 ? '0' : ''}${s}`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [queue.startedAt, queue.durationInMinutes]);

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-background border border-border rounded-sm p-6 lg:p-8 hover:shadow-premium hover:border-primary/30 transition-all group"
    >
      <div className="flex justify-between items-start gap-4 mb-6">
        <div className="flex-1 min-w-0">
          <div className="text-[9px] font-bold uppercase tracking-widest text-green-600 mb-1">● Active</div>
          <h3 className="text-lg lg:text-xl font-sans text-foreground-bold group-hover:text-cream-700 transition-colors truncate">
            {queue.title}
          </h3>
          <div className="text-[10px] text-muted-foreground mt-1">ID: {queue.testId.slice(-6)}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Time Left</div>
          <div className="font-mono text-lg font-black text-foreground-bold">{timeLeft || '—'}</div>
        </div>
      </div>

      <div className="flex gap-6 pt-5 border-t border-border">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Live</div>
          <div className="text-2xl font-sans font-black text-foreground-bold">{queue.activeSubmissionCount}</div>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Submitted</div>
          <div className="text-2xl font-sans font-black text-foreground-bold">{queue.completedSubmissionCount}</div>
        </div>
        <div className="ml-auto flex items-end">
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary group-hover:text-primary/80 transition-colors">
            Inspect Candidates →
          </span>
        </div>
      </div>
    </button>
  );
};

// ─── Level 2: Candidate Row in the student list ────────────────────────────────

interface CandidateRowProps {
  user: ActiveUser;
  onClick: () => void;
}

const CandidateRow: React.FC<CandidateRowProps> = ({ user, onClick }) => {
  const totalViolations = user.violations.reduce((sum, v) => sum + v.count, 0);
  const elapsed = useElapsed(user.startTime);

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-4 p-4 bg-background border border-border rounded-sm hover:shadow-md hover:border-primary/30 transition-all group"
    >
      <div className="w-10 h-10 shrink-0 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-black text-primary">
        {user.name.charAt(0).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-foreground truncate">{user.name}</div>
        <div className="text-[10px] text-muted-foreground truncate">{user.email}</div>
      </div>

      <div className="hidden sm:flex items-center gap-6 shrink-0">
        <div className="text-right">
          <div className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Elapsed</div>
          <div className="text-xs font-mono font-bold">{elapsed}</div>
        </div>
        <div className="text-right">
          <div className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Answered</div>
          <div className="text-xs font-bold">{user.answeredCount}</div>
        </div>
        <div className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded border ${
          totalViolations > 0
            ? 'bg-red-500/10 text-red-500 border-red-500/30'
            : 'bg-green-500/10 text-green-500 border-green-500/30'
        }`}>
          {totalViolations > 0 ? `⚠ ${totalViolations}` : '✓ Clear'}
        </div>
      </div>

      <span className="text-[10px] font-bold text-muted-foreground group-hover:text-primary transition-colors shrink-0">→</span>
    </button>
  );
};

// ─── Level 3: Full Student Detail ─────────────────────────────────────────────

interface StudentDetailProps {
  user: ActiveUser;
  testId: string;
  onBack: () => void;
}

const StudentDetail: React.FC<StudentDetailProps> = ({ user, testId, onBack }) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [forceEnding, setForceEnding] = useState(false);
  const totalViolations = user.violations.reduce((sum, v) => sum + v.count, 0);
  const elapsed = useElapsed(user.startTime);

  const { isConnected, socket } = useProctorSocket({ role: 'admin', testId });
  const { remoteStream, endFeed } = useWebRTC({ socket });
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    if (videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await testService.sendProctorMessage(testId, user.email, message);
      toast.success('Message sent to candidate.');
      setMessage('');
    } catch {
      toast.error('Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleForceEnd = async () => {
    if (!window.confirm(`Force-end ${user.name}'s test? They will be kicked out and cannot rejoin.`)) return;
    setForceEnding(true);
    try {
      await testService.forceSubmitCandidate(user.id);
      toast.success(`${user.name}'s session has been ended.`);
      onBack();
    } catch {
      toast.error('Failed to end session.');
      setForceEnding(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground-bold mb-8 transition-colors"
      >
        ← Back to Candidates
      </button>

      {/* Identity + Force End */}
      <div className="bg-background border border-border rounded-sm p-6 lg:p-8 mb-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-2xl font-black text-primary">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-sans font-bold text-foreground-bold">{user.name}</h3>
              <div className="text-sm text-muted-foreground">{user.email}</div>
            </div>
          </div>
          <button
            onClick={handleForceEnd}
            disabled={forceEnding}
            className="shrink-0 px-4 py-2 text-xs font-black uppercase tracking-widest border border-red-300 text-red-600 rounded-sm hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {forceEnding ? 'Ending…' : '⏹ Force End Session'}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Time Elapsed', value: elapsed },
            { label: 'Answered', value: user.answeredCount },
            { label: 'Total Violations', value: totalViolations },
            { label: 'Started', value: new Date(user.startTime).toLocaleTimeString() },
          ].map(stat => (
            <div key={stat.label} className="bg-muted/30 rounded-sm p-4">
              <div className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground mb-1">{stat.label}</div>
              <div className={`text-xl font-sans font-black ${stat.label === 'Total Violations' && totalViolations > 0 ? 'text-red-600' : 'text-foreground-bold'}`}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live WebRTC Camera Feed */}
      <div className="bg-background border border-border rounded-sm p-6 lg:p-8 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Live Camera Stream</div>
          <div className="flex items-center gap-3">
            {!isConnected && <span className="text-xs text-muted-foreground italic">Connecting to socket...</span>}
            {!remoteStream && (
              <button
                onClick={async () => {
                  console.log('Admin: requestCandidateCamera clicked', { testId, email: user.email, socketId: socket?.id, isConnected, isRequesting });
                  setIsRequesting(true);
                  try {
                    const response = await testService.requestCandidateCamera(testId, user.email, socket?.id || '');
                    console.log('Admin requestCandidateCamera success', response?.data);
                  } catch (err) {
                    console.error('Admin requestCandidateCamera failed', err);
                    toast.error('Failed to request camera');
                  } finally {
                    setIsRequesting(false);
                  }
                }}
                disabled={!isConnected || isRequesting}
                className="btn-primary py-1 px-3 text-[10px] tracking-widest disabled:opacity-50"
              >
                {!isConnected ? 'Connecting to socket...' : isRequesting ? 'Waking up Candidate Camera...' : 'Request Video Feed'}
              </button>
            )}
            {remoteStream && (
              <button
                onClick={async () => {
                  try {
                    await testService.stopCandidateCamera(testId, user.email);
                    endFeed();
                    setIsRequesting(false);
                  } catch (err) {
                    toast.error('Failed to stop camera');
                  }
                }}
                className="px-3 py-1 text-[10px] font-black uppercase tracking-widest border border-red-300 text-red-600 rounded-sm hover:bg-red-50 transition-colors"
              >
                Stop Feed
              </button>
            )}
          </div>
        </div>
        
        <div className={`relative w-full rounded-sm overflow-hidden bg-black aspect-video border border-border ${remoteStream ? 'block' : 'hidden'}`}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>

        {!remoteStream && (
          <div className="w-full aspect-video bg-muted/20 border border-dashed border-border rounded-sm flex flex-col items-center justify-center text-muted-foreground">
            <svg className="w-8 h-8 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <div className="text-sm font-medium">No active video stream</div>
            <div className="text-[10px] uppercase tracking-widest mt-1 opacity-70">
              {'Click Request Video Feed to wake up the candidate\'s camera stream.'}
            </div>
          </div>
        )}
      </div>

      {/* Violations log */}
      <div className="bg-background border border-border rounded-sm p-6 lg:p-8 mb-6">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Violation Log</div>
        {user.violations.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No violations recorded.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {user.violations.map((v, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-sm">
                <div>
                  <div className="text-xs font-bold text-red-400 dark:text-red-400 capitalize">{v.type.replace(/_/g, ' ')}</div>
                  <div className="text-[10px] text-red-400/70 mt-0.5">{new Date(v.timestamp).toLocaleTimeString()}</div>
                </div>
                <div className="text-sm font-black text-red-400">×{v.count}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Proctor Message */}
      <div className="bg-background border border-border rounded-sm p-6 lg:p-8">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Send Proctor Message</div>
        <p className="text-xs text-muted-foreground italic mb-4">
          This message will appear as a large red alert on the candidate's screen for 5 seconds.
        </p>
        <textarea
          className="w-full bg-muted/30 border border-border rounded-sm p-4 text-sm outline-none focus:border-primary/50 resize-none min-h-[80px] mb-3"
          placeholder="E.g., Stop switching tabs or your test will be terminated."
          value={message}
          onChange={e => setMessage(e.target.value)}
        />
        <div className="flex justify-end">
          <button
            onClick={handleSend}
            disabled={sending || !message.trim()}
            className="btn-primary px-6 py-2 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Sending…
              </>
            ) : (
              'Send Warning'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Root: Realtime Monitoring Page ───────────────────────────────────────────

interface RealtimeMonitoringPageProps {
  queues: QueueSummary[];
}

type View =
  | { level: 'tests' }
  | { level: 'students'; testId: string; testTitle: string }
  | { level: 'detail'; testId: string; testTitle: string; user: ActiveUser };

export const RealtimeMonitoringPage: React.FC<RealtimeMonitoringPageProps> = ({ queues }) => {
  const [view, setView] = useState<View>({ level: 'tests' });
  const [students, setStudents] = useState<ActiveUser[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [sortBy, setSortBy] = useState<'violations' | 'name' | 'elapsed'>('violations');
  const [testSearchQuery, setTestSearchQuery] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  const activeQueues = queues.filter(q => q.status === 'active');
  const filteredActiveQueues = activeQueues.filter(q => {
    const query = testSearchQuery.toLowerCase().trim();
    if (!query) return true;
    return q.title?.toLowerCase().includes(query) || q.testId?.toLowerCase().includes(query);
  });

  const fetchStudents = useCallback(async (testId: string) => {
    setLoadingStudents(true);
    try {
      const res = await testService.getActiveTestUsers(testId);
      setStudents(res.data);
    } catch {
      toast.error('Failed to load candidates.');
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  useEffect(() => {
    if (view.level !== 'students') return;
    fetchStudents(view.testId);
    const interval = setInterval(() => fetchStudents(view.testId), 10000);
    return () => clearInterval(interval);
  }, [view, fetchStudents]);

  const filteredStudents = students.filter(u => {
    const query = studentSearchQuery.toLowerCase().trim();
    if (!query) return true;
    return u.name?.toLowerCase().includes(query) || u.email?.toLowerCase().includes(query);
  });

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (sortBy === 'violations') {
      return b.violations.reduce((s, v) => s + v.count, 0) - a.violations.reduce((s, v) => s + v.count, 0);
    }
    if (sortBy === 'elapsed') {
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    }
    return a.name.localeCompare(b.name);
  });

  // ── Level 3: Student Detail ────────────────────────────────────────────────
  if (view.level === 'detail') {
    return (
      <StudentDetail
        user={view.user}
        testId={view.testId}
        onBack={() => setView({ level: 'students', testId: view.testId, testTitle: view.testTitle })}
      />
    );
  }

  // ── Level 2: Student List ──────────────────────────────────────────────────
  if (view.level === 'students') {
    return (
      <div className="animate-fade-in">
        <button
          onClick={() => setView({ level: 'tests' })}
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground-bold mb-8 transition-colors"
        >
          ← Back to Tests
        </button>

        <header className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground mb-1">Live Candidates</div>
            <h2 className="text-2xl lg:text-3xl font-sans text-foreground-bold">{view.testTitle}</h2>
          </div>
          <SearchBar
            value={studentSearchQuery}
            onChange={setStudentSearchQuery}
            className="w-full sm:w-72"
            placeholder="Search candidate by name or email..."
          />
        </header>

        {loadingStudents && students.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground italic text-sm">Loading candidates…</div>
        ) : students.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-border-hover rounded-sm text-muted-foreground italic px-4">
            No active candidates found for this test.
          </div>
        ) : sortedStudents.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-border-hover rounded-sm text-muted-foreground italic px-4">
            No active candidates match your search filter.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-bold text-foreground-bold">{sortedStudents.length} candidate{sortedStudents.length !== 1 ? 's' : ''} shown</div>
              <select
                className="bg-background border border-border text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-sm outline-none focus:border-primary/50"
                value={sortBy}
                onChange={e => setSortBy(e.target.value as typeof sortBy)}
              >
                <option value="violations">Sort: Most Violations</option>
                <option value="elapsed">Sort: Earliest Start</option>
                <option value="name">Sort: Name A–Z</option>
              </select>
            </div>

            <div className="space-y-3">
              {sortedStudents.map(u => (
                <CandidateRow
                  key={u.id}
                  user={u}
                  onClick={() => setView({ level: 'detail', testId: view.testId, testTitle: view.testTitle, user: u })}
                />
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Level 1: Active Test List ──────────────────────────────────────────────
  return (
    <div className="animate-fade-in">
      <header className="mb-8 lg:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground mb-2">Realtime Insights</div>
          <h2 className="text-3xl lg:text-4xl font-sans text-foreground-bold mb-2">Live Monitoring</h2>
          <p className="text-sm lg:text-base text-muted-foreground font-light italic">
            Select an active test to drill into live candidate activity and proctoring data.
          </p>
        </div>
        <SearchBar
          value={testSearchQuery}
          onChange={setTestSearchQuery}
          className="w-full sm:w-72 shrink-0"
          placeholder="Search by Test Name or ID..."
        />
      </header>

      {activeQueues.length === 0 ? (
        <div className="py-20 lg:py-32 text-center border border-dashed border-border-hover rounded-sm text-muted-foreground font-light italic px-4">
          No tests are currently active.
        </div>
      ) : filteredActiveQueues.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border-hover rounded-sm text-muted-foreground font-light italic px-4">
          No active tests match your search filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredActiveQueues.map(q => (
            <ActiveTestCard
              key={q.testId}
              queue={q}
              onClick={() => setView({ level: 'students', testId: q.testId, testTitle: q.title })}
            />
          ))}
        </div>
      )}
    </div>
  );
};
