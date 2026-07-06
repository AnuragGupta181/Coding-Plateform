import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import testService from '../utils/apiService';

const WaitingRoom: React.FC = () => {
  const { id: testId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const [statusMessage, setStatusMessage] = useState('Awaiting administrator signal to commence...');
  const testTypeRef = useRef<string>('mcq');

  // Fetch test metadata and poll for status changes
  useEffect(() => {
    if (!testId) return;

    const checkTestStatus = async () => {
      try {
        const res = await testService.getTest(testId);
        testTypeRef.current = res.data.testType ?? 'mcq';
        
        if (res.data.status === 'active') {
          setStatusMessage('Signal received. Initializing environment...');
          setTimeout(() => {
            // Route to the correct test room based on testType
            const route = testTypeRef.current === 'coding'
              ? `/coding-test/${testId}`
              : `/test/${testId}`;
            navigate(route);
          }, 1500);
        }
      } catch (err) {
        console.error('Error checking test status:', err);
      }
    };

    // Initial check
    checkTestStatus();

    // Poll every 3 seconds (Vercel serverless friendly)
    const interval = setInterval(checkTestStatus, 3000);

    return () => clearInterval(interval);
  }, [testId, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-foreground font-sans">
      <div className="max-w-xl w-full text-center">
        <div className="mb-12">
          <div className="w-12 h-12 border-2 border-cream-950 flex items-center justify-center text-foreground-bold font-sans font-bold text-2xl mx-auto mb-6">
            N
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground mb-2">Secure Holding Area</div>
          <h2 className="text-5xl font-sans text-foreground-bold mb-4">The Waiting Room</h2>
          <p className="text-muted-foreground italic font-light">
            Protocol initialized for candidate <span className="font-bold text-foreground">{user?.name}</span>.
          </p>
        </div>

        <div className="bg-white border border-border p-12 rounded-sm shadow-premium mb-12">
          <div className="flex flex-col items-center gap-8">
            <div className="flex gap-3">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
              <span className="w-2 h-2 bg-cream-400 rounded-full animate-pulse delay-150"></span>
              <span className="w-2 h-2 bg-cream-200 rounded-full animate-pulse delay-300"></span>
            </div>

            <p className="text-sm font-bold tracking-widest uppercase text-foreground-bold">
              {statusMessage}
            </p>

            <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
              Please maintain focus. The assessment environment will synchronize automatically across all participants.
            </p>
          </div>
        </div>

        <div className="space-y-4 opacity-50 text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
          <p>Connectivity: Stable</p>
          <p>Encryption: Active</p>
        </div>
      </div>

      <div className="fixed bottom-12 text-[10px] text-cream-300 uppercase tracking-widest font-bold">
        NextGen Technical Assessment Protocol
      </div>
    </div>
  );
};

export default WaitingRoom;
