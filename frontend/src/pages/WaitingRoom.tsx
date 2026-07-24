import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import testService, { createEventSourceUrl } from '../utils/apiService';

const WaitingRoom: React.FC = () => {
  const { id: testId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const [statusMessage, setStatusMessage] = useState('Awaiting administrator signal to commence...');
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  const [timerText, setTimerText] = useState<string>('00:00');
  const [timerLabel, setTimerLabel] = useState<string>('Waiting Time Elapsed');
  const testTypeRef = useRef<string>('mcq');

  // Live ticking clock — strictly "Time Left Until Test Starts"
  useEffect(() => {
    if (!scheduledFor) {
      setTimerLabel('Status');
      setTimerText('Waiting for Admin to Start');
      return;
    }

    const updateTimer = () => {
      const target = new Date(scheduledFor).getTime();
      const diffSec = Math.max(0, Math.floor((target - Date.now()) / 1000));
      
      if (diffSec <= 0) {
        setTimerLabel('Status');
        setTimerText('Starting soon...');
      } else {
        setTimerLabel('Time Left Until Test Starts');
        const hours = Math.floor(diffSec / 3600);
        const mins = Math.floor((diffSec % 3600) / 60);
        const secs = diffSec % 60;
        
        const hStr = hours > 0 ? `${hours}h ` : '';
        const mStr = `${mins < 10 ? '0' : ''}${mins}m `;
        const sStr = `${secs < 10 ? '0' : ''}${secs}s`;
        setTimerText(`${hStr}${mStr}${sStr}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [scheduledFor]);

  // Fetch test metadata, connect EventSource to register in queue, and poll for status changes
  useEffect(() => {
    if (!testId) return;

    const email = user?.email || '';
    const name = user?.name || 'Candidate';

    // 1. Open EventSource connection to register candidate in live Admin Queue & listen for real-time events
    const sseUrl = `/events/test/${testId}?name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`;
    const eventSource = new EventSource(createEventSourceUrl(sseUrl), { withCredentials: true });

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'START_TEST') {
          setStatusMessage('Signal received. Initializing environment...');
          setTimeout(() => {
            const route = testTypeRef.current === 'coding'
              ? `/coding-test/${testId}`
              : `/test/${testId}`;
            navigate(route);
          }, 1000);
        }
      } catch (err) {
        console.error('SSE Error in WaitingRoom:', err);
      }
    };

    const checkTestStatus = async () => {
      try {
        const res = await testService.getTest(testId);
        testTypeRef.current = res.data.testType ?? 'mcq';
        if (res.data.scheduledFor) {
          setScheduledFor(res.data.scheduledFor);
        }
        
        if (res.data.status === 'active') {
          setStatusMessage('Signal received. Initializing environment...');
          setTimeout(() => {
            const route = testTypeRef.current === 'coding'
              ? `/coding-test/${testId}`
              : `/test/${testId}`;
            navigate(route);
          }, 1000);
        }
      } catch (err) {
        console.error('Error checking test status:', err);
      }
    };

    checkTestStatus();
    const interval = setInterval(checkTestStatus, 3000);

    return () => {
      clearInterval(interval);
      eventSource.close();
    };
  }, [testId, navigate, user?.name, user?.email]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-foreground font-sans">
      <div className="max-w-xl w-full text-center">
        <div className="mb-12">
          <img src="/logo.svg" alt="NextGen Logo" className="h-16 md:h-20 w-auto mx-auto mb-6" />
          <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground mb-2">Secure Holding Area</div>
          <h2 className="text-5xl font-sans text-foreground-bold mb-4">The Waiting Room</h2>
          <p className="text-muted-foreground italic font-light">
            Protocol initialized for candidate <span className="font-bold text-foreground">{user?.name}</span>.
          </p>
        </div>

        <div className="bg-background border border-border p-12 rounded-sm shadow-premium mb-12">
          <div className="flex flex-col items-center gap-8">
            <div className="flex gap-3">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
              <span className="w-2 h-2 bg-cream-400 rounded-full animate-pulse delay-150"></span>
              <span className="w-2 h-2 bg-cream-200 rounded-full animate-pulse delay-300"></span>
            </div>

            <p className="text-sm font-bold tracking-widest uppercase text-foreground-bold">
              {statusMessage}
            </p>

            <div className="bg-primary/10 border border-primary/20 px-6 py-4 rounded-sm animate-fade-in w-full max-w-xs">
              <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1">{timerLabel}</div>
              <div className="text-3xl font-mono font-black text-primary tracking-wider">{timerText}</div>
            </div>

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
