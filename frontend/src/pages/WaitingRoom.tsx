import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import testService, { createEventSourceUrl } from '../utils/apiService';
import InstructionsContent from '../components/common/InstructionsContent';
import { MinimalFooter } from '../components/common/MinimalFooter';
import CameraPermissionGate from '../components/CameraPermissionGate';

const WaitingRoom: React.FC = () => {
  const { id: testId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const [statusMessage, setStatusMessage] = useState('Awaiting administrator signal to commence...');
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  const [timerText, setTimerText] = useState<string>('00:00');
  const [timerLabel, setTimerLabel] = useState<string>('Waiting Time Elapsed');
  const [showLatePopup, setShowLatePopup] = useState(false);
  // Camera gate: show once per test session
  const cameraGateDoneKey = `camera_gate_done_${testId}`;
  const [cameraGateDone, setCameraGateDone] = useState<boolean>(
    () => sessionStorage.getItem(cameraGateDoneKey) === 'true'
  );

  const handleCameraGranted = () => {
    sessionStorage.setItem(cameraGateDoneKey, 'true');
    setCameraGateDone(true);
  };

  const handleCameraSkip = () => {
    sessionStorage.setItem(cameraGateDoneKey, 'true');
    setCameraGateDone(true);
  };
  
  const testTypeRef = useRef<string>('mcq');
  const hasWaitedRef = useRef<boolean>(false);

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

  const handleStartTest = () => {
    const route = testTypeRef.current === 'coding'
      ? `/coding-test/${testId}`
      : `/test/${testId}`;
    navigate(route);
  };

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
          hasWaitedRef.current = true;
          setTimeout(handleStartTest, 1000);
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
        
        // Skip camera gate if camera monitoring is disabled for this test
        if (res.data.proctoringConfig && res.data.proctoringConfig.cameraEnabled === false) {
          setCameraGateDone(true);
          sessionStorage.setItem(cameraGateDoneKey, 'true');
        }
        
        if (res.data.status === 'active') {
          setStatusMessage('Signal received. Initializing environment...');
          if (!hasWaitedRef.current) {
            // Late joiner! Show popup instead of redirecting instantly.
            setShowLatePopup(true);
          } else {
            setTimeout(handleStartTest, 1000);
          }
        } else {
          // If we see it's waiting/inactive, they have legitimately waited.
          hasWaitedRef.current = true;
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
    <>
      {/* Camera permission gate — shown once before the waiting room */}
      {!cameraGateDone && (
        <CameraPermissionGate
          onPermissionGranted={handleCameraGranted}
          onSkip={handleCameraSkip}
        />
      )}

      {/* Main waiting room content (rendered but hidden until camera gate passes) */}
      <div className="min-h-screen bg-background flex flex-col p-4 md:p-8 text-foreground font-sans"
           style={{ display: cameraGateDone ? undefined : 'none' }}>
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-7xl mx-auto py-6">
          <div className="w-full flex flex-col md:flex-row gap-8 lg:gap-12 items-start">
            
            {/* Left Side: Header & Timer */}
            <div className="w-full md:w-[40%] flex flex-col sticky top-8 space-y-6">
              <div>
                <img src="/logo.svg" alt="NextGen Logo" className="h-10 md:h-12 w-auto mb-4" />
                <div className="text-[10px] font-mono font-bold uppercase tracking-[0.4em] text-muted-foreground mb-1">
                  Secure Holding Area
                </div>
                <h2 className="text-3xl md:text-4xl font-sans font-bold text-foreground-bold mb-3 tracking-tight">
                  The Waiting Room
                </h2>
                <p className="text-muted-foreground italic font-light text-xs leading-relaxed">
                  Protocol initialized for candidate <span className="font-bold text-foreground font-sans">{user?.name}</span>.
                </p>
              </div>

              {/* Timer & Status Box */}
              <div className="bg-card/50 backdrop-blur-xl border border-border/80 p-6 rounded-lg shadow-2xl relative overflow-hidden group">
                <div className="flex flex-col items-center gap-5 text-center">
                  <div className="flex gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                    <span className="w-2 h-2 bg-primary/60 rounded-full animate-pulse delay-150"></span>
                    <span className="w-2 h-2 bg-primary/30 rounded-full animate-pulse delay-300"></span>
                  </div>

                  <p className="text-xs font-bold tracking-wider uppercase text-foreground-bold">
                    {statusMessage}
                  </p>

                  <div className="bg-background/80 border border-border/80 px-6 py-5 rounded-md shadow-inner w-full">
                    <div className="text-[9px] font-mono uppercase font-bold tracking-widest text-muted-foreground mb-2">
                      {timerLabel}
                    </div>
                    <div className="text-3xl md:text-4xl font-mono font-black text-primary tracking-widest">
                      {timerText}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side: Instructions */}
            <div className="w-full md:w-[60%] max-h-[65vh] overflow-y-auto custom-scrollbar pr-1">
              <InstructionsContent />
            </div>
          </div>
        </div>

        <div className="w-full mt-auto pt-4">
          <MinimalFooter />
        </div>

        {/* Late Joiner Popup */}
        {showLatePopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="bg-card border border-border p-8 rounded-sm shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
              <h2 className="text-3xl font-sans text-foreground-bold mb-4">The test has already started!</h2>
              <p className="text-muted-foreground mb-6">
                You are joining late. Please review the instructions carefully before entering the assessment.
              </p>
              
              <InstructionsContent />

              <div className="mt-8 flex justify-end">
                <button 
                  onClick={handleStartTest}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-3.5 rounded-md border border-emerald-400/30 shadow-lg shadow-emerald-900/40 hover:shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer text-xs md:text-sm uppercase tracking-widest"
                >
                  <span>Acknowledge & Start Test</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default WaitingRoom;
