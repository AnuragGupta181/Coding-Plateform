import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';
import testService from '../utils/apiService';
import type { RootState } from '../store';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { TestCard, type TestSummary } from '../components/dashboard/TestCard';
import InstructionsContent from '../components/common/InstructionsContent';

const Dashboard: React.FC = () => {
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const res = await testService.getAvailableTests();
        let availableTests = res.data;

        if (user?.email) {
          try {
            const subRes = await testService.getStudentSubmissions(user.email);
            const submissions = subRes.data;
            const completedTestIds = new Set(
              submissions.filter((s: any) => s.status === 'completed').map((s: any) => s.testId)
            );
            
            availableTests = availableTests.map((t: any) => {
              if (completedTestIds.has(t._id)) {
                return { ...t, status: 'completed' };
              }
              return t;
            });
          } catch (subErr) {
            console.error('Failed to fetch student submissions:', subErr);
          }
        }

        setTests(availableTests);
      } catch (err) {
        console.error('Failed to fetch tests:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTests();
  }, [user?.email]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleEnterTest = async (testId: string, status: string, testType?: string) => {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Continue even if fullscreen is denied
    }

    if (status === 'waiting') {
      navigate(`/test/wait/${testId}`);
    } else if (status === 'active') {
      const route = testType === 'coding' ? `/coding-test/${testId}` : `/test/${testId}`;
      navigate(route);
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <DashboardNavbar userName={user?.name} onLogout={handleLogout} />

      <main className="max-w-6xl mx-auto py-16 px-6 relative">
        <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground mb-2">Available Sessions</div>
            <h2 className="text-4xl text-foreground-bold mb-4">Assigned Assessments</h2>
            <p className="text-muted-foreground max-w-2xl font-light italic">
              Please select an assessment to begin. Note that you can only enter the waiting room when the administrator has authorized entry.
            </p>
          </div>
          <button 
            onClick={() => setShowInstructionsModal(true)}
            className="shrink-0 bg-secondary text-secondary-foreground border border-border px-6 py-2 rounded-sm text-xs font-bold uppercase tracking-widest hover:bg-secondary/80 transition-colors"
          >
            View Instructions
          </button>
        </header>

        {showInstructionsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="bg-card border border-border p-8 rounded-sm shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
              <button 
                onClick={() => setShowInstructionsModal(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-secondary/30 hover:bg-red-500/20 hover:text-red-400 border border-border rounded-md transition-all text-muted-foreground cursor-pointer z-50"
                title="Close"
              >
                ✕
              </button>
              <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
              <InstructionsContent />
              <div className="mt-8 flex justify-end">
                <button 
                  onClick={() => setShowInstructionsModal(false)}
                  className="bg-primary text-primary-foreground px-6 py-2 rounded-sm text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        {loading ? (
          <div className="flex flex-col items-center py-32">
            <div className="w-12 h-12 border-2 border-border border-t-cream-900 rounded-full animate-spin"></div>
            <p className="mt-6 text-sm text-muted-foreground uppercase tracking-widest font-bold">Initializing...</p>
          </div>
        ) : tests.length === 0 ? (
          <div className="bg-card/40 backdrop-blur-md border border-dashed border-border rounded-sm p-24 text-center shadow-sm">
            <p className="text-muted-foreground font-light italic">There are currently no assessments assigned to your account.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {tests.map((test) => (
              <TestCard 
                key={test._id} 
                test={test} 
                onEnter={handleEnterTest} 
              />
            ))}
          </div>
        )}
      </main>

      <footer className="mt-32 py-12 border-t border-cream-100">
        <p className="text-center text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
          NextGen Assessment Systems &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
};

export default Dashboard;
