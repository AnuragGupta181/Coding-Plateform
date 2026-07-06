import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import testService from '../utils/apiService';
import { QueueItem } from '../components/admin/QueueItem';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { TestRepositoryTable } from '../components/admin/TestRepositoryTable';
import type { TestSummary, QueueSummary, AdminSection } from '../types/admin';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as AdminSection) || 'overview';
  
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [queues, setQueues] = useState<QueueSummary[]>([]);
  const [activeSection, setActiveSection] = useState<AdminSection>(initialTab);
  const [message, setMessage] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleTabChange = (tab: AdminSection) => {
    setActiveSection(tab);
    setSearchParams({ tab });
    setIsMobileMenuOpen(false);
  };

  const queuesRef = React.useRef<QueueSummary[]>([]);
  useEffect(() => {
    queuesRef.current = queues;
  }, [queues]);

  const fetchTests = async () => {
    try {
      const res = await testService.getTestHistory();
      setTests(res.data);
    } catch (err) {
      console.error('Failed to fetch tests:', err);
    }
  };

  const fetchQueues = async () => {
    try {
      const res = await testService.getWaitingQueues();
      setQueues(res.data);
    } catch (err) {
      console.error('Failed to fetch queues:', err);
    }
  };

  useEffect(() => {
    fetchTests();
    fetchQueues();
    let interval: ReturnType<typeof setInterval>;

    if (activeSection === 'overview' || activeSection === 'queue') {
      interval = setInterval(() => {
        if (activeSection === 'overview' && queuesRef.current.length === 0) {
          return;
        }
        
        fetchQueues();
        fetchTests();
      }, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeSection]);

  const handleOpenWaitingRoom = async (id: string) => {
    try {
      await testService.openWaitingRoom(id);
      setMessage('Waiting room is now open for candidates.');
      fetchTests();
      fetchQueues();
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('Failed to open waiting room.');
    }
  };

  const handleStartTest = async (id: string) => {
    try {
      await testService.startTest(id);
      setMessage('Test has been started for all waiting candidates.');
      fetchTests();
      fetchQueues();
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('Failed to start test.');
    }
  };

  const handleMarkCompleted = async (id: string) => {
    if (!window.confirm('Are you sure you want to force complete this test? All active candidates will be auto-submitted.')) return;
    try {
      await testService.completeTest(id);
      setMessage('Test has been manually completed.');
      fetchTests();
      fetchQueues();
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('Failed to complete test.');
    }
  };

  const queues_waiting = useMemo(() => queues.filter(q => q.status === 'waiting'), [queues]);

  return (
    <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden flex-col lg:flex-row">
      {/* Mobile Header Bar */}
      <div className="lg:hidden bg-white border-b border-border px-6 py-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border border-cream-950 flex items-center justify-center text-foreground-bold font-sans font-bold text-lg">
            N
          </div>
          <span className="text-lg font-sans font-bold text-foreground-bold tracking-wide">NextGen</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 -mr-2 text-muted-foreground hover:text-foreground-bold"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 border-r border-border flex-col h-full bg-white shrink-0">
        <AdminSidebar 
          activeSection={activeSection} 
          onTabChange={handleTabChange} 
        />
      </aside>

      {/* Mobile Drawer Sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="absolute inset-0 bg-primary/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="relative w-72 max-w-[80vw] h-full bg-white flex flex-col animate-slide-in shadow-premium">
            <AdminSidebar 
              activeSection={activeSection} 
              onTabChange={handleTabChange} 
              onCloseMobile={() => setIsMobileMenuOpen(false)}
            />
          </aside>
        </div>
      )}
      
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-16 w-full">
        <div className="max-w-5xl mx-auto pb-20">
          {message && (
            <div className="fixed top-20 lg:top-8 right-4 lg:right-8 z-50 p-4 lg:p-5 bg-white border-l-4 border-cream-900 shadow-premium text-xs font-bold uppercase tracking-widest text-foreground animate-slide-in max-w-[calc(100vw-2rem)]">
              {message}
            </div>
          )}

          {activeSection === 'overview' && (
            <div className="animate-fade-in">
              <header className="mb-8 lg:mb-16">
                <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground mb-2">Operational Overview</div>
                <h2 className="text-3xl lg:text-4xl font-sans text-foreground-bold mb-2">Live Sessions</h2>
                <p className="text-sm lg:text-base text-muted-foreground font-light italic">Monitor and orchestrate all currently active and pending assessment environments.</p>
              </header>
              <div className="space-y-4">
                {queues.length === 0 ? (
                  <div className="py-20 lg:py-32 text-center border border-dashed border-border-hover rounded-sm text-muted-foreground font-light italic px-4">
                    No active or scheduled sessions found in the current buffer.
                  </div>
                ) : (
                  queues.map(q => (
                    <QueueItem 
                      key={q.testId} 
                      queue={q} 
                      onOpenWaitingRoom={handleOpenWaitingRoom}
                      onStartTest={handleStartTest}
                      onMarkCompleted={handleMarkCompleted}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {activeSection === 'queue' && (
            <div className="animate-fade-in">
              <header className="mb-8 lg:mb-16">
                <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground mb-2">Traffic Analysis</div>
                <h2 className="text-3xl lg:text-4xl font-sans text-foreground-bold mb-2">Waiting Queues</h2>
                <p className="text-sm lg:text-base text-muted-foreground font-light italic">Detailed monitoring of candidates positioned in the secure holding area.</p>
              </header>
              <div className="space-y-4">
                {queues_waiting.length === 0 ? (
                  <div className="py-20 lg:py-32 text-center border border-dashed border-border-hover rounded-sm text-muted-foreground font-light italic px-4">
                    All queues are currently clear.
                  </div>
                ) : (
                  queues_waiting.map(q => (
                    <QueueItem 
                      key={q.testId} 
                      queue={q} 
                      onOpenWaitingRoom={handleOpenWaitingRoom}
                      onStartTest={handleStartTest}
                      onMarkCompleted={handleMarkCompleted}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {activeSection === 'history' && (
            <div className="animate-fade-in">
              <header className="mb-8 lg:mb-16 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground mb-2">Archive Retrieval</div>
                  <h2 className="text-3xl lg:text-4xl font-sans text-foreground-bold mb-2">Assessment Repository</h2>
                  <p className="text-sm lg:text-base text-muted-foreground font-light italic">Access historical session data and consolidated performance metrics.</p>
                </div>
              </header>
              <TestRepositoryTable tests={tests} />
            </div>
          )}

          {activeSection === 'create' && (
            <div className="animate-fade-in bg-white border border-border p-8 lg:p-20 rounded-sm text-center shadow-premium max-w-2xl mx-auto mt-10 lg:mt-20">
              <div className="w-12 h-12 lg:w-16 lg:h-16 border-2 border-cream-950 flex items-center justify-center text-foreground-bold font-sans font-bold text-2xl lg:text-3xl mx-auto mb-8 lg:mb-10">
                N
              </div>
              <h2 className="text-3xl lg:text-4xl font-sans text-foreground-bold mb-4 lg:mb-6">Design New Session</h2>
              <p className="text-sm lg:text-base text-muted-foreground font-light italic mb-8 lg:mb-12 leading-relaxed">
                Initialize the architectural builder to define new technical inquiries and session constraints.
              </p>
              <button 
                onClick={() => navigate('/admin/create-test')}
                className="btn-primary w-full sm:w-auto"
              >
                Launch Builder
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
