import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';
import testService from '../utils/apiService';
import type { RootState } from '../store';
import { DashboardNavbar } from '../components/dashboard/DashboardNavbar';
import { TestCard, type TestSummary } from '../components/dashboard/TestCard';

const Dashboard: React.FC = () => {
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const res = await testService.getAvailableTests();
        setTests(res.data);
      } catch (err) {
        console.error('Failed to fetch tests:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTests();
  }, []);

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

      <main className="max-w-6xl mx-auto py-16 px-6">
        <header className="mb-16">
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground mb-2">Available Sessions</div>
          <h2 className="text-4xl text-foreground-bold mb-4">Assigned Assessments</h2>
          <p className="text-muted-foreground max-w-2xl font-light italic">
            Please select an assessment to begin. Note that you can only enter the waiting room when the administrator has authorized entry.
          </p>
        </header>

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
          NextGen Technical Assessment Protocol
        </p>
      </footer>
    </div>
  );
};

export default Dashboard;
