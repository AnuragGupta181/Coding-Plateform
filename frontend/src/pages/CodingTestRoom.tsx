import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import useProtecting from '../hooks/useProtecting';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Editor from '@monaco-editor/react';
import type { RootState } from '../store';
import { startTest } from '../store/testSlice';
import testService, { createEventSourceUrl } from '../utils/apiService';
import ProblemStatement, { type CodingQuestion, type TestCaseResult } from '../components/coding/ProblemStatement';
import OutputPanel from '../components/coding/OutputPanel';
import TestRoomHeader from '../components/test/TestRoomHeader';

import { LANG_META } from '../constants/langMeta';
import { useCountdown } from '../hooks/useCountdown';

interface TestData {
  _id: string; title: string; status: string;
  durationInMinutes: number; startedAt: string;
  testType?: 'mcq' | 'coding' | 'mixed';
  codingQuestions: CodingQuestion[];
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
  const [editorTheme, setEditorTheme]   = useState<'vs-light' | 'vs-dark'>('vs-light');

  const [code, setCode]             = useState<Record<string, string>>({});
  const [submitted, setSubmitted]   = useState<Record<string, boolean>>({});

  const [activeTab, setActiveTab]         = useState<'output' | 'submit'>('output');
  const [customInput, setCustomInput]     = useState('');
  const [isRunning, setIsRunning]         = useState(false);
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [runResult, setRunResult]         = useState<{ stdout: string; stderr: string; status: string } | null>(null);
  const [submitResult, setSubmitResult]   = useState<{ passed: number; total: number; score: number; maxScore: number; verdict: string; results: TestCaseResult[] } | null>(null);

  const activeQuestion = testData?.codingQuestions[activeQIndex] ?? null;
  const codeKey = activeQuestion ? `${activeQuestion._id}_${language}` : '';
  const currentCode = code[codeKey] ?? (activeQuestion?.starterCode?.[language] ?? LANG_META[language]?.defaultCode ?? '');
  const allowedLangs = activeQuestion?.allowedLanguages.filter(l => LANG_META[l]) ?? [];

  useEffect(() => {
    if (!testId) return;
    const init = async () => {
      try {
        const res = await testService.getTest(testId);
        const t = res.data as TestData;
        if (t.status !== 'active' || !t.codingQuestions?.length) { navigate('/dashboard'); return; }
        setTestData(t);

        const email = user?.email || 'candidate@example.com';
        const name = user?.name || 'Candidate';
        const submissionRes = await testService.startSubmission(email, name, testId);
        const fetchedSubmission = submissionRes.data;
        
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

  useEffect(() => {
    if (!testId) return;
    const es = new EventSource(createEventSourceUrl(`/events/test/${testId}`));
    es.onmessage = e => {
      if (JSON.parse(e.data).type === 'AUTO_SUBMIT') setFinished(true);
    };
    return () => es.close();
  }, [testId]);

  const MAX_VIOLATIONS = 3;

  const handleViolation = useCallback((count: number, type: string) => {
    const labels: Record<string, string> = {
      tab_switch: 'Tab switch detected',
      window_blur: 'Window switch detected',
      fullscreen_exit: 'Fullscreen exit detected',
    };
    const remaining = MAX_VIOLATIONS - count;

    if (remaining > 0) {
      toast.error(`⚠️ ${labels[type] || 'Violation detected'} — ${remaining} warning${remaining !== 1 ? 's' : ''} left before auto-submit`, {
        duration: 5000,
        id: 'violation-toast',
      });
    } else {
      toast.error('🚫 Max violations reached — auto-submitting your test', {
        duration: 6000,
        id: 'violation-toast',
      });
    }
  }, []);

  const handleAutoSubmit = useCallback(() => {
    if (submissionId) {
      testService.completeSubmission(submissionId)
        .then(() => setFinished(true))
        .catch(err => console.error('Auto-submit failed:', err));
    }
  }, [submissionId]);

  useProtecting({
    onViolation: handleViolation,
    onAutoSubmit: handleAutoSubmit,
    submissionId,
    maxViolations: MAX_VIOLATIONS,
    cooldownMs: 1500,
    enabled: !!testData && !finished,
    initialViolations,
  });

  const { display: timerDisplay, isWarning } = useCountdown(
    testData?.durationInMinutes ?? 60,
    testData?.startedAt ?? null,
    () => setFinished(true)
  );

  const handleQuestionChange = (idx: number) => {
    setActiveQIndex(idx);
    setRunResult(null);
    setSubmitResult(null);
    setActiveTab('output');
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setRunResult(null);
    setSubmitResult(null);
  };

  const handleRun = async () => {
    if (!currentCode.trim()) return;
    setIsRunning(true);
    setActiveTab('output');
    setRunResult(null);
    try {
      const res = await testService.runCode(currentCode, language, customInput);
      setRunResult(res.data);
    } catch {
      setRunResult({ stdout: '', stderr: 'Failed to connect to execution service.', status: 'Error' });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!testId || !activeQuestion || !submissionId) return;
    setIsSubmitting(true);
    setActiveTab('submit');
    setSubmitResult(null);
    try {
      const res = await testService.submitCode(testId, activeQuestion._id, currentCode, language, submissionId);
      setSubmitResult(res.data);
      if (res.data.passed === res.data.total) {
        setSubmitted(prev => ({ ...prev, [activeQuestion._id]: true }));
      }
    } catch {
      setSubmitResult({ passed: 0, total: 0, score: 0, maxScore: 0, verdict: 'Submission failed', results: [] });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishTest = async () => {
    if (!submissionId) return;
    setIsSubmitting(true);
    try {
      await testService.completeSubmission(submissionId);
      setFinished(true);
    } catch (err) {
      console.error('Failed to finish test', err);
    } finally {
      setIsSubmitting(false);
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
      <div className="w-16 h-16 border-2 border-cream-950 flex items-center justify-center text-foreground-bold font-sans font-bold text-3xl mb-8">
        N
      </div>
      <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground mb-2">Protocol Finished</div>
      <h2 className="text-4xl font-sans text-foreground-bold mb-4">Submission Confirmed</h2>
      <p className="text-muted-foreground mb-12 max-w-md font-light italic">Your code has been securely persisted. You may now exit the assessment environment.</p>
      <button onClick={() => navigate('/')} className="btn-primary">Return to Home</button>
    </div>
  );

  if (!testData || !activeQuestion) return null;

  return (
    <div className="h-screen flex flex-col bg-background text-foreground font-sans overflow-hidden">
      <TestRoomHeader candidateName={user?.name} />

      {/* Sub-header: test title, timer, question pills, finish */}
      <div className="bg-white border-b border-border px-4 sm:px-6 py-3 flex items-center gap-3 shrink-0 flex-wrap">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Coding Assessment</div>
          <h1 className="text-sm sm:text-base font-sans text-foreground-bold truncate">{testData.title}</h1>
        </div>

        <div className="flex-1" />

        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-mono font-bold border ${
          isWarning ? 'text-red-800 border-red-200 bg-red-50 animate-pulse' : 'text-foreground-bold border-border bg-background'
        }`}>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-sans">Time</span>
          {timerDisplay}
        </div>

        <div className="flex gap-1 flex-wrap">
          {testData.codingQuestions.map((q, i) => (
            <button
              key={q._id}
              onClick={() => handleQuestionChange(i)}
              className={`w-8 h-8 text-xs font-bold rounded-sm border transition-all ${
                i === activeQIndex
                  ? 'bg-primary text-primary-foreground border-cream-900'
                  : submitted[q._id]
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-white text-muted-foreground border-border hover:border-cream-400 hover:text-foreground'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {testData.testType === 'mixed' && (
          <button
            onClick={() => navigate(`/test/${testId}`)}
            className="px-4 py-2 bg-white text-foreground text-[10px] font-black uppercase tracking-widest rounded-sm border border-border transition-all hover:bg-background"
          >
            Back to MCQ
          </button>
        )}

        <button
          onClick={handleFinishTest}
          disabled={isSubmitting}
          className="px-4 py-2 bg-emerald-800 text-white text-[10px] font-black uppercase tracking-widest rounded-sm border border-emerald-900 transition-all hover:bg-emerald-900 disabled:opacity-50"
        >
          Finish Test
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="w-full lg:w-[420px] shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r border-border overflow-y-auto custom-scrollbar bg-white max-h-[35vh] lg:max-h-full">
          <ProblemStatement
            question={activeQuestion}
            questionIndex={activeQIndex}
            totalQuestions={testData.codingQuestions.length}
          />
        </div>

        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <div className="h-11 bg-background border-b border-border flex items-center px-3 gap-3 shrink-0">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hidden sm:block">Language</label>
            <select
              value={language}
              onChange={e => handleLanguageChange(e.target.value)}
              className="bg-white border border-border text-foreground text-xs px-3 py-1.5 rounded-sm focus:outline-none focus:border-cream-400 font-bold uppercase tracking-wider"
            >
              {allowedLangs.map(l => (
                <option key={l} value={l}>{LANG_META[l]?.label ?? l}</option>
              ))}
            </select>

            <div className="flex-1" />

            <button
              onClick={handleRun}
              disabled={isRunning || isSubmitting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-background border border-border text-foreground text-[10px] font-black uppercase tracking-widest rounded-sm transition-all disabled:opacity-40"
            >
              {isRunning
                ? <span className="w-3 h-3 border border-border-hover border-t-cream-900 rounded-full animate-spin" />
                : null
              }
              Run
            </button>

            <button
              onClick={handleSubmit}
              disabled={isRunning || isSubmitting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest rounded-sm transition-all disabled:opacity-40"
            >
              {isSubmitting
                ? <span className="w-3 h-3 border border-border border-t-transparent rounded-full animate-spin" />
                : null
              }
              Submit
            </button>
          </div>

          <div className="flex-1 overflow-hidden border-b border-border">
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

          <OutputPanel
            activeTab={activeTab}
            onTabChange={setActiveTab}
            customInput={customInput}
            onCustomInputChange={setCustomInput}
            isRunning={isRunning}
            runResult={runResult}
            isSubmitting={isSubmitting}
            submitResult={submitResult}
          />
        </div>
      </div>
    </div>
  );
};

export default CodingTestRoom;
