import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import useProtecting from '../hooks/useProtecting';
import useCameraProctor from '../hooks/useCameraProctor';
import useProctorSocket from '../hooks/useProctorSocket';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Editor from '@monaco-editor/react';
import type { RootState } from '../store';
import { startTest, completeTest } from '../store/testSlice';
import testService, { createEventSourceUrl } from '../utils/apiService';
import ProblemStatement, { type CodingQuestion, type TestCaseResult } from '../components/coding/ProblemStatement';
import OutputPanel from '../components/coding/OutputPanel';
import TestRoomHeader from '../components/test/TestRoomHeader';
import { deterministicShuffle } from '../utils/shuffle';
import CameraPermissionGate from '../components/test/CameraPermissionGate';

import { LANG_META } from '../constants/langMeta';

interface TestData {
  _id: string; title: string; status: string;
  durationInMinutes: number; startedAt: string;
  testType?: 'mcq' | 'coding' | 'mixed';
  codingQuestions: CodingQuestion[];
  proctoringConfig?: {
    cameraEnabled?: boolean;
    autoRemoveEnabled?: boolean;
    maxViolations?: number;
  };
}

const CodingTestRoom: React.FC = () => {
  const { id: testId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const existingSubmissionId = useSelector((state: RootState) => state.test.submissionId);

  const [testData, setTestData]         = useState<TestData | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(existingSubmissionId || null);
  const [loading, setLoading]           = useState(true);
  const [finished, setFinished]         = useState(false);
  const [activeQIndex, setActiveQIndex] = useState(0);
  const [language, setLanguage]         = useState('javascript');
  const [initialViolations, setInitialViolations] = useState(0);
  const [adminRequest, setAdminRequest] = useState<{ adminSocketId: string } | null>(null);
  const [editorTheme, setEditorTheme]   = useState<'vs-light' | 'vs-dark'>('vs-light');

  const [code, setCode]             = useState<Record<string, string>>(() => {
    try {
      const saved = sessionStorage.getItem(`test_code_${testId}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (testId && Object.keys(code).length > 0) {
      sessionStorage.setItem(`test_code_${testId}`, JSON.stringify(code));
    }
  }, [code, testId]);

  const [submitted, setSubmitted]   = useState<Record<string, boolean>>({});

  const [activeTab, setActiveTab]         = useState<'output' | 'submit'>('output');
  const [leftPanelWidth, setLeftPanelWidth] = useState(420);
  const [outputHeight, setOutputHeight] = useState(() => window.innerWidth < 1024 ? Math.floor(window.innerHeight * 0.4) : 280);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  const [customInputs, setCustomInputs] = useState<Record<string, string>>(() => {
    try {
      const saved = sessionStorage.getItem(`test_inputs_${testId}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (testId && Object.keys(customInputs).length > 0) {
      sessionStorage.setItem(`test_inputs_${testId}`, JSON.stringify(customInputs));
    }
  }, [customInputs, testId]);

  const [isRunning, setIsRunning]         = useState<Record<string, boolean>>({});
  const [isCodeSubmitting, setIsCodeSubmitting] = useState<Record<string, boolean>>({});
  const [isFinishingTest, setIsFinishingTest] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [runResult, setRunResult]         = useState<Record<string, { stdout: string; stderr: string; status: string }>>({});
  const [submitResult, setSubmitResult]   = useState<Record<string, { passed: number; total: number; score: number; maxScore: number; verdict: string; results: TestCaseResult[] }>>({});

  const activeQuestion = testData?.codingQuestions[activeQIndex] ?? null;
  const codeKey = activeQuestion ? `${activeQuestion._id}_${language}` : '';
  const currentCode = code[codeKey] ?? (activeQuestion?.starterCode?.[language] ?? LANG_META[language]?.defaultCode ?? '');
  const currentInput = activeQuestion ? (customInputs[activeQuestion._id] ?? '') : '';
  const allowedLangs = activeQuestion?.allowedLanguages.filter(l => LANG_META[l]) ?? [];

  const handleCustomInputChange = (val: string) => {
    if (!activeQuestion) return;
    setCustomInputs(prev => ({ ...prev, [activeQuestion._id]: val }));
  };

  useEffect(() => {
    if (!testId) return;
    const init = async () => {
      try {
        const res = await testService.getTest(testId);
        const t = res.data as TestData;
        if (t.status === 'completed') {
          setFinished(true);
          dispatch(completeTest());
          setLoading(false);
          return;
        }
        if (t.status !== 'active' || !t.codingQuestions?.length) { navigate('/dashboard'); return; }
        const email = user?.email || 'candidate@example.com';
        const name = user?.name || 'Candidate';
        const submissionRes = await testService.startSubmission(email, name, testId);
        const fetchedSubmission = submissionRes.data;
        
        if (fetchedSubmission.status === 'completed') {
          setFinished(true);
          dispatch(completeTest());
          setLoading(false);
          return;
        }

        if (t.codingQuestions?.length > 0) {
          t.codingQuestions = deterministicShuffle(t.codingQuestions, fetchedSubmission._id);
        }

        setTestData(t);

        setInitialViolations(fetchedSubmission.violations?.length || 0);
        setSubmissionId(fetchedSubmission._id);

        if (!existingSubmissionId) {
          dispatch(startTest({
            submissionId: fetchedSubmission._id,
            testId,
            duration: t.durationInMinutes,
            startedAt: t.startedAt
          }));
        }
        
        setLoading(false);
      } catch {
        navigate('/dashboard');
      }
    };
    init();
  }, [testId, navigate, dispatch, existingSubmissionId, user?.email, user?.name]);

  useEffect(() => {
    const updateTheme = () => setEditorTheme(document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs-light');
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const { status } = useSelector((state: RootState) => state.test);
  useEffect(() => {
    if (status === 'completed') {
      setFinished(true);
    }
  }, [status]);

  useEffect(() => {
    if (!testId) return;
    const es = new EventSource(createEventSourceUrl(`/events/test/${testId}`));
    es.onopen = () => console.debug('CodingTestRoom SSE connected', { testId });
    es.onerror = (error) => console.warn('CodingTestRoom SSE error', error);
    es.onmessage = e => {
      try {
        const data = JSON.parse(e.data);
        console.debug('CodingTestRoom SSE event received', data);
        if (data.type === 'AUTO_SUBMIT' || data.type === 'TEST_COMPLETED') {
          setFinished(true);
          dispatch(completeTest());
        } else if (data.type === 'FORCE_SUBMIT' && data.targetEmail === user?.email) {
          setFinished(true);
          dispatch(completeTest());
          toast.error('Your test session has been ended by the proctor.', { duration: 4000 });
          setTimeout(() => navigate(submissionId ? `/feedback/${submissionId}` : '/dashboard'), 2500);
        } else if (data.type === 'PROCTOR_MESSAGE' && data.targetEmail === user?.email) {
          toast.error(`PROCTOR MESSAGE:\n${data.message}`, {
            duration: 5000,
            style: {
              fontSize: '1.25rem',
              fontWeight: 'bold',
              padding: '20px',
              border: '4px solid #ef4444',
              backgroundColor: '#fef2f2',
              color: '#7f1d1d'
            }
          });
        } else if (data.type === 'REQUEST_CAMERA' && data.targetEmail?.toLowerCase() === user?.email?.toLowerCase()) {
          console.debug('CodingTestRoom received REQUEST_CAMERA', data);
          setAdminRequest({ adminSocketId: data.adminSocketId });
        } else if (data.type === 'STOP_CAMERA' && data.targetEmail?.toLowerCase() === user?.email?.toLowerCase()) {
          console.debug('CodingTestRoom received STOP_CAMERA', data);
          setAdminRequest(null);
        } else if (data.type === 'CODE_SUBMIT_RESULT' && data.targetEmail === user?.email) {
          setIsCodeSubmitting(prev => ({ ...prev, [data.questionId]: false }));
          setSubmitResult(prev => ({ ...prev, [data.questionId]: data.result }));
          if (data.result.passed === data.result.total) {
            setSubmitted(prev => ({ ...prev, [data.questionId]: true }));
            toast.success(`✅ Question Evaluated: ${data.result.passed}/${data.result.total} Test Cases Passed!`, { duration: 5000 });
          } else {
            toast.error(`⚠️ Question Evaluated: ${data.result.passed}/${data.result.total} Test Cases Passed.`, { duration: 5000 });
          }
        } else if (data.type === 'CODE_RUN_RESULT' && data.targetEmail === user?.email) {
          setIsRunning(prev => ({ ...prev, [data.questionId]: false }));
          setRunResult(prev => ({ ...prev, [data.questionId]: data.result }));
          toast.success('🚀 Code Execution Completed!', { duration: 3000 });
        }
      } catch (err) {}
    };
    return () => es.close();
  }, [testId, dispatch, navigate, user?.email, submissionId]);

  const MAX_VIOLATIONS = 999999;

  const handleViolation = useCallback((_count: number, type: string) => {
    const labels: Record<string, string> = {
      tab_switch: 'Tab switch detected',
      window_blur: 'Window switch detected',
      fullscreen_exit: 'Fullscreen exit detected',
    };

    toast.error(`⚠️ ${labels[type] || 'Violation detected'} — Violation recorded!`, {
      duration: 5000,
      id: 'violation-toast',
    });
  }, []);

  const handleAutoSubmit = useCallback(() => {
    if (submissionId) {
      testService.completeSubmission(submissionId)
        .then(() => setFinished(true))
        .catch(err => console.error('Auto-submit failed:', err));
    }
  }, [submissionId]);

  const cameraEnabled = status === 'active' && !!testData && testData.proctoringConfig?.cameraEnabled !== false;

  const { socket } = useProctorSocket({
    role: 'student',
    testId,
    userId: submissionId || user?.email || undefined,
    name: user?.name,
    email: user?.email,
    submissionId,
    enabled: cameraEnabled,
  });

  const { videoRef: cameraVideoRef, cameraStatus } = useCameraProctor({
    submissionId,
    testId,
    socket,
    enabled: cameraEnabled,
    adminRequest,
  });

  useProtecting({
    onViolation: handleViolation,
    onAutoSubmit: handleAutoSubmit,
    submissionId,
    maxViolations: MAX_VIOLATIONS,
    cooldownMs: 1500,
    enabled: !!testData && !finished && (!cameraEnabled || cameraStatus === 'active'),
    initialViolations,
  });

  const handleQuestionChange = (idx: number) => {
    setActiveQIndex(idx);
    setActiveTab('output');
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
  };

  const handleRun = async () => {
    if (!currentCode.trim() || !activeQuestion) return;
    
    let inputToRun = currentInput;
    if (!inputToRun.trim() && activeQuestion.examples && activeQuestion.examples.length > 0) {
      inputToRun = activeQuestion.examples[0].input;
      handleCustomInputChange(inputToRun);
    }

    const qId = activeQuestion._id;
    setIsRunning(prev => ({ ...prev, [qId]: true }));
    setActiveTab('output');
    try {
      await testService.runCode(currentCode, language, inputToRun, testId, qId, user?.email);
      toast.success('Run Code job queued...');
    } catch {
      setRunResult(prev => ({ ...prev, [qId]: { stdout: '', stderr: 'Failed to connect to execution service.', status: 'Error' } }));
      setIsRunning(prev => ({ ...prev, [qId]: false }));
    }
  };

  const handleSubmit = async () => {
    if (!testId || !activeQuestion || !submissionId) return;
    const qId = activeQuestion._id;
    setIsCodeSubmitting(prev => ({ ...prev, [qId]: true }));
    setActiveTab('submit');
    try {
      await testService.submitCode(testId, qId, currentCode, language, submissionId, user?.email);
      toast.success('Code submission queued...');
    } catch {
      setSubmitResult(prev => ({ ...prev, [qId]: { passed: 0, total: 0, score: 0, maxScore: 0, verdict: 'Submission failed', results: [] } }));
      setIsCodeSubmitting(prev => ({ ...prev, [qId]: false }));
    }
  };

  const handleFinishClick = () => {
    setShowFinishModal(true);
  };

  const handleConfirmFinish = async () => {
    if (!submissionId || !testData || !testId) return;

    setIsFinishingTest(true);
    setShowFinishModal(false);

    try {
      // Auto-submit unsubmitted code for ALL languages they might have touched
      // (For simplicity, we check the current language's code)
      const unsubmitted = testData.codingQuestions.filter(q => {
        const qCodeKey = `${q._id}_${language}`;
        const current = code[qCodeKey];
        const starter = q.starterCode?.[language] || LANG_META[language]?.defaultCode || '';
        return current && current !== starter && !submitted[q._id];
      });

      if (unsubmitted.length > 0) {
        await Promise.all(unsubmitted.map(q => {
          const qCodeKey = `${q._id}_${language}`;
          const current = code[qCodeKey];
          return testService.submitCode(testId, q._id, current || '', language, submissionId, user?.email).catch(() => {});
        }));
      }

      await testService.completeSubmission(submissionId);
      setFinished(true);
    } catch (err) {
      console.error('Failed to finish test', err);
    } finally {
      setIsFinishingTest(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 border-2 border-border border-t-cream-900 rounded-full animate-spin" />
      <p className="mt-6 text-sm text-muted-foreground uppercase tracking-widest font-bold">Establishing Secure Session...</p>
    </div>
  );

  if (finished) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <img src="/logo.svg" alt="NextGen Logo" className="h-16 md:h-20 w-auto mx-auto mb-8" />
      <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground mb-2">Protocol Finished</div>
      <h2 className="text-4xl font-sans text-foreground-bold mb-4">Submission Confirmed</h2>
      <p className="text-muted-foreground mb-12 max-w-md font-light italic">Your code has been securely persisted. You may now exit the assessment environment.</p>
      <button onClick={() => navigate(`/feedback/${submissionId}`)} className="btn-primary">Continue</button>
    </div>
  );

  if (!testData || !activeQuestion) return null;

  if (cameraEnabled && cameraStatus !== 'active') {
    return <CameraPermissionGate cameraStatus={cameraStatus} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground font-sans overflow-hidden">
      {/* Hidden camera element for proctoring — invisible to student */}
      <video ref={cameraVideoRef} muted playsInline style={{ display: 'none' }} aria-hidden="true" />
      <TestRoomHeader
        candidateName={user?.name}
        testTitle={testData?.title}
        onAction={handleFinishClick}
        actionText="Submit Assessment"
        isSaving={isFinishingTest}
        submissionId={submissionId || undefined}
        currentQuestionId={activeQuestion._id}
      />

      {isFinishingTest && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-2 border-border border-t-emerald-500 rounded-full animate-spin mb-4" />
          <p className="text-sm text-emerald-600 font-bold uppercase tracking-widest animate-pulse">Finalizing Submission...</p>
        </div>
      )}

      {showFinishModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowFinishModal(false)} />
          <div className="relative bg-card border border-border shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-bold mb-4 text-foreground">Confirm Submission</h3>
            
            {(() => {
              const unsubmitted = testData.codingQuestions.filter(q => {
                const qCodeKey = `${q._id}_${language}`;
                const current = code[qCodeKey];
                const starter = q.starterCode?.[language] || LANG_META[language]?.defaultCode || '';
                return current && current !== starter && !submitted[q._id];
              }).length;

              return unsubmitted > 0 ? (
                <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded text-amber-600 dark:text-amber-500">
                  <p className="font-bold mb-1">Unsubmitted Code Detected</p>
                  <p className="text-sm opacity-90">You have {unsubmitted} question(s) with code that hasn't been submitted yet. If you proceed, we will automatically submit and evaluate it for you.</p>
                </div>
              ) : (
                <p className="text-muted-foreground mb-6">Are you sure you want to finish the assessment? You cannot undo this action.</p>
              );
            })()}
            
            <div className="flex gap-4 justify-end mt-4">
              <button onClick={() => setShowFinishModal(false)} className="btn-secondary">Go Back</button>
              <button onClick={handleConfirmFinish} className="btn-primary flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 border-emerald-900 text-white">Complete Assessment</button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Problem Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsMobileSidebarOpen(false)} />
          <div className="relative w-4/5 max-w-sm h-full bg-card border-r border-border shadow-2xl flex flex-col animate-in slide-in-from-left-full duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Problem Description</h2>
              <button onClick={() => setIsMobileSidebarOpen(false)} className="p-1 hover:bg-muted text-muted-foreground rounded">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-background">
              <ProblemStatement
                question={activeQuestion}
                questionIndex={activeQIndex}
                totalQuestions={testData.codingQuestions.length}
              />
            </div>
          </div>
        </div>
      )}

      {/* Sub-header: test title, timer, question pills, back to mcq */}
      <div className="bg-card border-b border-border px-4 sm:px-6 py-2.5 flex items-center gap-3 shrink-0 flex-wrap">
        <button 
          className="lg:hidden p-1 -ml-2 hover:bg-muted rounded text-foreground"
          onClick={() => setIsMobileSidebarOpen(true)}
          aria-label="View Problem"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground hidden sm:block">Coding Assessment</div>
          <h1 className="text-sm sm:text-base font-sans font-bold text-foreground truncate">{testData.title}</h1>
        </div>

        <div className="flex-1" />

        {/* Question Selector Pills */}
        <div className="flex gap-1.5 flex-wrap items-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-1 hidden sm:inline">Questions:</span>
          {testData.codingQuestions.map((q, i) => (
            <button
              key={q._id}
              onClick={() => handleQuestionChange(i)}
              className={`w-7 h-7 sm:w-8 sm:h-8 text-xs font-bold rounded-sm border transition-all duration-200 cursor-pointer hover:-translate-y-0.5 active:translate-y-0 ${
                i === activeQIndex
                  ? 'border-2 border-primary ring-2 ring-primary/20 scale-105 text-primary-foreground bg-primary shadow-sm z-10'
                  : submitted[q._id]
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:border-emerald-500 hover:shadow-xs'
                    : 'bg-muted/40 text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground hover:shadow-xs'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Back to MCQ Action Button */}
        {testData.testType === 'mixed' && (
          <button
            onClick={() => navigate(`/test/${testId}`)}
            className="px-3.5 py-1.5 bg-muted hover:bg-muted/80 text-foreground text-[10px] font-bold uppercase tracking-widest rounded-sm border border-border transition-all duration-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-1.5 cursor-pointer"
          >
            <span>&larr;</span>
            <span>Back to MCQ</span>
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Desktop Problem Statement */}
        <div 
          className="hidden lg:flex shrink-0 flex-col overflow-y-auto custom-scrollbar bg-background h-full"
          style={{ width: leftPanelWidth }}
        >
          <ProblemStatement
            question={activeQuestion}
            questionIndex={activeQIndex}
            totalQuestions={testData.codingQuestions.length}
          />
        </div>

        {/* Draggable Divider (Desktop only) */}
        <div 
          className="hidden lg:flex w-2 bg-background border-r border-border hover:bg-cream-950/10 cursor-col-resize flex-col items-center justify-center group z-10 shrink-0"
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = leftPanelWidth;
            const onMouseMove = (moveEvent: MouseEvent) => {
              const newWidth = Math.max(300, Math.min(800, startWidth + (moveEvent.clientX - startX)));
              setLeftPanelWidth(newWidth);
            };
            const onMouseUp = () => {
              document.removeEventListener('mousemove', onMouseMove);
              document.removeEventListener('mouseup', onMouseUp);
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
          }}
        >
          <div className="w-0.5 h-8 bg-slate-300 group-hover:bg-cream-600 rounded-full transition-colors" />
        </div>

        <div className="flex-1 flex flex-col overflow-hidden bg-background">
          <div className="h-12 sm:h-14 bg-card border-b border-border flex items-center px-2 sm:px-4 gap-2 sm:gap-3 shrink-0 overflow-x-auto custom-scrollbar whitespace-nowrap">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hidden sm:block">Language</label>
              <select
                value={language}
                onChange={e => handleLanguageChange(e.target.value)}
                className="bg-background dark:bg-zinc-900 border border-border dark:border-zinc-700 text-foreground dark:text-zinc-100 text-xs px-3 py-1.5 rounded-sm focus:outline-none focus:border-primary font-bold uppercase tracking-wider cursor-pointer hover:border-foreground/40 transition-colors"
              >
                {allowedLangs.map(l => (
                  <option key={l} value={l} className="bg-background dark:bg-zinc-900 text-foreground dark:text-zinc-100 font-bold uppercase tracking-wider py-1">
                    {LANG_META[l]?.label ?? l}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1" />

            {/* Reset Code Button */}
            <button
              onClick={() => {
                if (!activeQuestion) return;
                const starter = activeQuestion.starterCode?.[language] || LANG_META[language]?.defaultCode || '';
                setCode(prev => ({ ...prev, [codeKey]: starter }));
              }}
              disabled={isRunning[activeQuestion._id] || isCodeSubmitting[activeQuestion._id] || isFinishingTest}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-secondary hover:bg-muted text-secondary-foreground text-[10px] font-bold uppercase tracking-widest rounded-sm border border-border transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 shadow-xs hover:shadow-md cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Reset</span>
            </button>

            {/* Distinct Run Code Button */}
            <button
              onClick={handleRun}
              disabled={isRunning[activeQuestion._id] || isCodeSubmitting[activeQuestion._id] || isFinishingTest}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 text-[10px] font-bold uppercase tracking-widest rounded-sm border border-slate-300 dark:border-slate-700 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 shadow-xs hover:shadow-md cursor-pointer"
            >
              {isRunning[activeQuestion._id] ? (
                <span className="w-3 h-3 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
              <span>Run Code</span>
            </button>

            {/* Distinct Submit Code Button */}
            <button
              onClick={handleSubmit}
              disabled={isRunning[activeQuestion._id] || isCodeSubmitting[activeQuestion._id] || isFinishingTest}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-primary hover:brightness-110 text-primary-foreground text-[10px] font-bold uppercase tracking-widest rounded-sm border border-primary-foreground/30 dark:border-emerald-400/80 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 shadow-sm hover:shadow-md cursor-pointer"
            >
              {isCodeSubmitting[activeQuestion._id] ? (
                <span className="w-3 h-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
              <span>Submit Code</span>
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language={LANG_META[language]?.monacoLang ?? language}
              value={currentCode}
              onChange={val => setCode(prev => ({ ...prev, [codeKey]: val ?? '' }))}
              theme={editorTheme}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                renderLineHighlight: 'line',
                tabSize: 2,
                wordWrap: 'on',
                fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", Consolas, monospace',
                fontLigatures: true,
                padding: { top: 12 },
                automaticLayout: true,
              }}
            />
          </div>

          {/* Draggable Divider (Vertical) */}
          <div 
            className="flex h-3 bg-background border-t border-border hover:bg-cream-950/10 cursor-row-resize flex-col items-center justify-center group z-10 shrink-0"
            onTouchStart={(e) => {
              const startY = e.touches[0].clientY;
              const startHeight = outputHeight;
              const onTouchMove = (moveEvent: TouchEvent) => {
                const newHeight = Math.max(100, Math.min(window.innerHeight * 0.8, startHeight - (moveEvent.touches[0].clientY - startY)));
                setOutputHeight(newHeight);
              };
              const onTouchEnd = () => {
                document.removeEventListener('touchmove', onTouchMove);
                document.removeEventListener('touchend', onTouchEnd);
              };
              document.addEventListener('touchmove', onTouchMove, { passive: false });
              document.addEventListener('touchend', onTouchEnd);
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              const startY = e.clientY;
              const startHeight = outputHeight;
              const onMouseMove = (moveEvent: MouseEvent) => {
                const newHeight = Math.max(100, Math.min(window.innerHeight * 0.8, startHeight - (moveEvent.clientY - startY)));
                setOutputHeight(newHeight);
              };
              const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
              };
              document.addEventListener('mousemove', onMouseMove);
              document.addEventListener('mouseup', onMouseUp);
            }}
          >
            <div className="w-8 h-0.5 bg-slate-300 group-hover:bg-cream-600 rounded-full transition-colors" />
          </div>

          <div style={{ height: outputHeight, minHeight: 120 }} className="shrink-0 flex flex-col overflow-hidden">
            <OutputPanel
              activeTab={activeTab}
              onTabChange={setActiveTab}
              customInput={currentInput}
              onCustomInputChange={handleCustomInputChange}
              isRunning={isRunning[activeQuestion._id] || false}
              runResult={runResult[activeQuestion._id] || null}
              isSubmitting={isCodeSubmitting[activeQuestion._id] || false}
              submitResult={submitResult[activeQuestion._id] || null}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodingTestRoom;
