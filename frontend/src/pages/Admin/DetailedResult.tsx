import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import testService from '../../utils/apiService';
import ReactMarkdown from 'react-markdown';

interface Question {
  _id: string;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  points?: number;
}

interface CodingAnswer {
  sourceCode: string;
  language: string;
  score: number;
  verdict: string;
  passed: number;
  total: number;
  aiAnalysis?: string;
  testCaseResults?: {
    passed: boolean;
    actualOutput?: string;
    error?: string;
  }[];
}

interface SubmissionDetail {
  _id: string;
  candidateName: string;
  candidateEmail: string;
  score: number;
  answers: Record<string, number>;
  codingAnswers?: Record<string, CodingAnswer>;
  violations?: { type: string; timestamp: string; count: number }[];
  testId: {
    _id: string;
    title: string;
    questions: Question[];
    codingQuestions?: any[];
  };
}

type QuestionReviewState = 'correct' | 'wrong' | 'unanswered';

const getQuestionState = (question: Question, answers: Record<string, number>): QuestionReviewState => {
  const candidateAnswer = answers[question._id];

  if (candidateAnswer === undefined) {
    return 'unanswered';
  }

  return candidateAnswer === question.correctOptionIndex ? 'correct' : 'wrong';
};

const questionStateStyles: Record<QuestionReviewState, string> = {
  correct: 'bg-green-600 border-green-700 text-white',
  wrong: 'bg-red-600 border-red-700 text-white',
  unanswered: 'bg-muted border-slate-300 text-slate-500'
};

const questionStateLabels: Record<QuestionReviewState, string> = {
  correct: 'Correct',
  wrong: 'Wrong',
  unanswered: 'Not Answered'
};

const DetailedResult: React.FC = () => {
  const { subId } = useParams<{ subId: string }>();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, { loading: boolean, result?: string, error?: string }>>({});

  const handleAnalyzeCode = async (questionId: string, sourceCode: string, language: string, title: string, description: string, testCases: any[]) => {
    setAiAnalysis(prev => ({ ...prev, [questionId]: { loading: true, result: undefined, error: undefined } }));
    try {
      const res = await testService.analyzeCode(sourceCode, language, title, subId, questionId, description, testCases);
      
      // Update local submission state to reflect the permanently saved analysis
      if (submission && submission.codingAnswers && submission.codingAnswers[questionId]) {
        const updatedSubmission = { ...submission };
        if (updatedSubmission.codingAnswers) {
          updatedSubmission.codingAnswers[questionId] = {
            ...updatedSubmission.codingAnswers[questionId],
            aiAnalysis: res.data.analysis
          };
          setSubmission(updatedSubmission);
        }
      }
      
      setAiAnalysis(prev => ({ ...prev, [questionId]: { loading: false, result: res.data.analysis } }));
    } catch (err: any) {
      setAiAnalysis(prev => ({ ...prev, [questionId]: { loading: false, error: err.response?.data?.message || 'Failed to analyze code' } }));
    }
  };

  useEffect(() => {
    const fetchDetails = async () => {
      if (!subId) return;
      try {
        const res = await testService.getSubmissionDetails(subId);
        setSubmission(res.data);
      } catch (err) {
        console.error('Failed to fetch details', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [subId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-2 border-border border-t-cream-900 rounded-full animate-spin"></div>
        <p className="mt-6 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Loading Audit File...</p>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-sans text-red-800 mb-4">Record Not Found</h2>
        <button onClick={() => navigate(-1)} className="btn-primary">Return</button>
      </div>
    );
  }

  const questionStates = submission.testId.questions.map((question) => getQuestionState(question, submission.answers));
  const correctCount = questionStates.filter((state) => state === 'correct').length;
  const wrongCount = questionStates.filter((state) => state === 'wrong').length;
  const unansweredCount = questionStates.filter((state) => state === 'unanswered').length;

  return (
    <div className="min-h-screen bg-background font-sans text-foreground pb-32">
      <nav className="bg-background border-b border-border mb-6 md:mb-10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="flex items-center gap-3">
              <img src="/logo.svg" alt="NextGen Logo" className="h-10 md:h-12 w-auto" />
              <span className="text-xs uppercase font-bold tracking-[0.2em] text-muted-foreground border-l border-border pl-3 hidden sm:inline">Audit</span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 md:px-6">
        <button 
          onClick={() => navigate(submission?.testId?._id ? `/admin/results/${submission.testId._id}` : '/admin')}
          className="group flex items-center gap-2 text-[10px] md:text-xs uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground-bold transition-all whitespace-nowrap mb-8"
        >
          <span className="group-hover:-translate-x-1 transition-transform">&larr;</span>
          Back to Results
        </button>
      </div>

      <header className="max-w-4xl mx-auto px-4 md:px-6 mb-8 md:mb-16">
        <div className="flex flex-col gap-6 md:flex-row md:justify-between md:items-end border-b border-border pb-8 md:pb-12">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground mb-2">Candidate File</div>
            <h1 className="text-3xl md:text-5xl font-sans text-foreground-bold mb-2">{submission.candidateName}</h1>
            <p className="text-muted-foreground font-light italic text-base md:text-lg mb-4 md:mb-6">{submission.candidateEmail}</p>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-muted border border-border rounded-full">
              <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-foreground">{submission.testId.title}</span>
            </div>
          </div>
          <div className="text-left md:text-right">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Final Score</div>
            <div className="text-5xl md:text-7xl font-sans text-foreground">{submission.score}</div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex flex-col lg:grid lg:grid-cols-[280px_1fr] gap-8 lg:gap-10 items-start">
          <aside className="w-full lg:sticky lg:top-8 space-y-6">
            <section className="bg-background border border-border rounded-sm shadow-sm p-4 md:p-6">
              <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground mb-4">Question Board</div>
              {/* Horizontally scrollable on mobile, grid on desktop */}
              <div className="flex overflow-x-auto custom-scrollbar pb-2 lg:pb-0 lg:grid lg:grid-cols-5 gap-2 md:gap-3">
                {submission.testId.questions.map((question, index) => {
                  const state = questionStates[index];

                  return (
                    <a
                      key={question._id}
                      href={`#question-${question._id}`}
                      title={`Question ${index + 1}: ${questionStateLabels[state]}`}
                      className={`h-10 w-10 shrink-0 border rounded-sm flex items-center justify-center text-xs font-black transition-transform hover:-translate-y-0.5 ${questionStateStyles[state]}`}
                    >
                      {index + 1}
                    </a>
                  );
                })}
              </div>

              <div className="grid grid-cols-3 gap-2 md:gap-3 mt-6 text-center">
                <div className="bg-green-50 border border-green-100 p-2 md:p-3 rounded-sm">
                  <div className="text-lg md:text-xl font-sans text-green-800">{correctCount}</div>
                  <div className="text-[7px] md:text-[8px] uppercase tracking-widest font-black text-green-700">Correct</div>
                </div>
                <div className="bg-red-50 border border-red-100 p-2 md:p-3 rounded-sm">
                  <div className="text-lg md:text-xl font-sans text-red-800">{wrongCount}</div>
                  <div className="text-[7px] md:text-[8px] uppercase tracking-widest font-black text-red-700">Wrong</div>
                </div>
                <div className="bg-muted border border-border p-2 md:p-3 rounded-sm">
                  <div className="text-lg md:text-xl font-sans text-foreground">{unansweredCount}</div>
                  <div className="text-[7px] md:text-[8px] uppercase tracking-widest font-black text-slate-500">Blank</div>
                </div>
              </div>
            </section>

            <section className="bg-background border border-border rounded-sm shadow-sm p-4 md:p-6">
              <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground mb-4">Instructions</div>
              <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                <p>Use the numbered board to jump directly to any question.</p>
                <p><span className="font-bold text-green-700">Green</span> means the selected answer is correct.</p>
                <p><span className="font-bold text-red-700">Red</span> means the selected answer is wrong.</p>
                <p><span className="font-bold text-muted-foreground">Grey</span> means no answer was submitted.</p>
              </div>

              <div className="mt-6 pt-6 border-t border-cream-100 space-y-3">
                <div className="flex items-center gap-3 text-[9px] md:text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                  <span className="w-4 h-4 bg-green-600 border border-green-700 rounded-sm shrink-0"></span>
                  Marked / Viewed
                </div>
                <div className="flex items-center gap-3 text-[9px] md:text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                  <span className="w-4 h-4 bg-muted border border-slate-300 rounded-sm shrink-0"></span>
                  Unmarked / Not Viewed
                </div>
              </div>

              <div className="mt-6 text-[10px] text-muted-foreground leading-relaxed">
                Viewed and marked status is inferred from saved answers because the test currently stores final responses only.
              </div>
            </section>

            {submission.violations && submission.violations.length > 0 && (
              <section className="bg-background border border-red-200 rounded-sm shadow-sm p-4 md:p-6">
                <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-red-500 mb-4">Proctoring Log</div>
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-red-50">
                  <div className="text-3xl font-sans text-red-700">{submission.violations.length}</div>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-red-400">
                    Violation{submission.violations.length !== 1 ? 's' : ''} Detected
                  </div>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                  {submission.violations.map((v, i) => {
                    const labelMap: Record<string, string> = {
                      tab_switch: 'Tab Switch',
                      window_blur: 'Window Switch',
                      fullscreen_exit: 'Fullscreen Exit',
                    };
                    return (
                      <div key={i} className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                          <span className="font-bold text-foreground">{labelMap[v.type] || v.type}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(v.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </aside>

          <section className="space-y-8 md:space-y-12">
            {submission.testId.questions.map((q, index) => {
              const candidateAns = submission.answers[q._id];
              const isAnswered = candidateAns !== undefined;
              const isCorrect = candidateAns === q.correctOptionIndex;
              const candidateAnswerText = isAnswered ? q.options[candidateAns] : 'No answer submitted';
              const correctAnswerText = q.options[q.correctOptionIndex];

              return (
                <div
                  id={`question-${q._id}`}
                  key={q._id}
                  className="bg-background p-6 md:p-10 rounded-sm border border-border shadow-sm scroll-mt-24 md:scroll-mt-8"
                >
                  <div className="flex flex-col md:flex-row justify-between items-start mb-6 md:mb-8 gap-4 md:gap-6">
                    <h3 className="text-xl md:text-2xl font-sans flex gap-4 md:gap-6">
                      <span className="text-cream-300 font-sans font-bold text-base md:text-lg pt-1 md:pt-0">Q{index + 1}</span>
                      <span className="text-foreground-bold">{q.questionText}</span>
                    </h3>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="bg-muted px-3 py-1 text-[10px] md:text-xs font-bold font-mono rounded text-cream-700">
                        Score: {isCorrect ? (q.points || 1) : 0} / {q.points || 1}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest border shrink-0 ${
                        !isAnswered
                          ? 'bg-muted border-border text-muted-foreground'
                          : isCorrect
                            ? 'bg-green-50 border-green-100 text-green-700'
                            : 'bg-red-50 border-red-100 text-red-700'
                      }`}>
                        {!isAnswered ? 'Not Answered' : isCorrect ? 'Passed' : 'Failed'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div className={`p-4 md:p-5 rounded-sm border-2 ${
                      isCorrect ? 'bg-green-50 border-green-600' : isAnswered ? 'bg-red-50 border-red-600' : 'bg-muted border-slate-300'
                    }`}>
                      <div className="text-[8px] md:text-[9px] uppercase tracking-[0.25em] font-black mb-2 text-muted-foreground">Candidate Chose</div>
                      <div className={`text-sm font-bold ${isCorrect ? 'text-green-800' : isAnswered ? 'text-red-800' : 'text-muted-foreground'}`}>
                        {candidateAnswerText}
                      </div>
                    </div>

                    <div className="p-4 md:p-5 rounded-sm border-2 bg-green-50 border-green-600">
                      <div className="text-[8px] md:text-[9px] uppercase tracking-[0.25em] font-black mb-2 text-muted-foreground">Correct Answer</div>
                      <div className="text-sm font-bold text-green-800">{correctAnswerText}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    {q.options.map((opt, oIndex) => {
                      const isCandidateChoice = candidateAns === oIndex;
                      const isCorrectChoice = q.correctOptionIndex === oIndex;

                      let style = 'bg-background border-cream-100 text-muted-foreground';
                      if (isCorrectChoice) style = 'bg-background border-green-600 text-green-700 ring-1 ring-green-600 ring-offset-2';
                      if (isCandidateChoice && !isCorrect) style = 'bg-background border-red-600 text-red-700 ring-1 ring-red-600 ring-offset-2';

                      return (
                        <div key={oIndex} className={`p-3 md:p-4 rounded-sm border flex items-center justify-between gap-3 md:gap-4 text-xs md:text-sm transition-all ${style}`}>
                          <span className={isCorrectChoice || isCandidateChoice ? 'font-bold' : 'font-light'}>{opt}</span>
                          <div className="flex flex-wrap justify-end gap-1.5 md:gap-2">
                            {isCandidateChoice && (
                              <span className={`text-[7px] md:text-[8px] uppercase font-black tracking-widest px-2 py-1 rounded-full ${
                                isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                Candidate Pick
                              </span>
                            )}
                            {isCorrectChoice && (
                              <span className="text-[7px] md:text-[8px] uppercase font-black tracking-widest px-2 py-1 rounded-full bg-green-100 text-green-800">
                                Correct
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </section>
        </div>

        {/* ── Coding Answers Section ── */}
        {submission.testId.codingQuestions && submission.testId.codingQuestions.length > 0 && (
          <div className="mt-12 md:mt-16">
            <h2 className="text-2xl md:text-3xl font-sans text-foreground-bold mb-6 md:mb-8 border-b border-border pb-4">Coding Submissions</h2>
            <div className="space-y-8 md:space-y-12">
              {submission.testId.codingQuestions.map((cq, index) => {
                const codingAns = submission.codingAnswers?.[cq._id];
                const isAnswered = !!codingAns;
                const isPerfect = codingAns && codingAns.passed === codingAns.total && codingAns.total > 0;

                return (
                  <div key={cq._id} className="bg-background p-6 md:p-8 rounded-sm shadow-sm border border-border text-foreground">
                    <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                      <div>
                        <h3 className="text-xl md:text-2xl font-sans flex gap-4 text-foreground-bold">
                          <span className="font-sans font-bold text-base md:text-lg text-cream-300 pt-1 md:pt-0">Q{index + 1}</span>
                          {cq.title}
                        </h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="bg-muted px-3 py-1 text-[10px] md:text-xs font-bold font-mono rounded text-cream-700">
                          Score: {codingAns ? codingAns.score : 0} / {cq.points}
                        </span>
                        <span className={`px-3 py-1 text-[8px] md:text-[9px] font-black uppercase tracking-widest rounded-full border ${
                          !isAnswered ? 'bg-muted border-border text-muted-foreground' :
                          isPerfect ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'
                        }`}>
                          {!isAnswered ? 'Not Attempted' : codingAns.verdict}
                        </span>
                      </div>
                    </div>

                    {isAnswered ? (
                        <div className="space-y-4">
                          <details className="mb-4 p-4 md:p-5 rounded-sm border bg-muted border-border group">
                            <summary className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3 flex items-center justify-between cursor-pointer list-none">
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">📝 Problem Description & Test Cases</span>
                              </div>
                              <div className="text-slate-400 transform transition-transform group-open:rotate-180">
                                ▼
                              </div>
                            </summary>
                            
                            <div className="pt-2 border-t border-border/60 mt-2 text-sm text-foreground prose prose-sm max-w-none">
                              <ReactMarkdown>{cq.description || 'No description available.'}</ReactMarkdown>
                              
                              {cq.testCases && cq.testCases.length > 0 && (
                                <div className="mt-6">
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 border-b border-border pb-2">Test Cases</h4>
                                  <div className="space-y-3">
                                    {cq.testCases.map((tc: any, i: number) => {
                                      const tcResult = codingAns?.testCaseResults?.[i];
                                      return (
                                      <div key={i} className={`bg-background p-3 rounded border font-mono text-xs ${tcResult ? (tcResult.passed ? 'border-green-500/50 bg-green-50/10' : 'border-red-500/50 bg-red-50/10') : 'border-border'}`}>
                                        <div className="flex justify-between items-center mb-3">
                                          <div className="text-slate-500 font-bold font-sans uppercase tracking-widest text-[9px]">Test Case {i + 1}</div>
                                          {tcResult && (
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${tcResult.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                              {tcResult.passed ? 'Passed' : 'Failed'}
                                            </span>
                                          )}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div>
                                            <div className="text-slate-400 mb-1">Input:</div>
                                            <pre className="whitespace-pre-wrap">{tc.input}</pre>
                                          </div>
                                          <div>
                                            <div className="text-slate-400 mb-1">Expected Output:</div>
                                            <pre className="whitespace-pre-wrap">{tc.expectedOutput}</pre>
                                          </div>
                                        </div>
                                        {tcResult && !tcResult.passed && tcResult.actualOutput && (
                                          <div className="mt-4 pt-3 border-t border-border/50">
                                            <div className="text-red-400 mb-1 font-bold">Actual Output:</div>
                                            <pre className="whitespace-pre-wrap text-red-600 dark:text-red-400">{tcResult.actualOutput}</pre>
                                          </div>
                                        )}
                                        {tcResult && tcResult.error && (
                                          <div className="mt-4 pt-3 border-t border-border/50">
                                            <div className="text-red-400 mb-1 font-bold">Error:</div>
                                            <pre className="whitespace-pre-wrap text-red-600 dark:text-red-400">{tcResult.error}</pre>
                                          </div>
                                        )}
                                      </div>
                                    )})}
                                  </div>
                                </div>
                              )}
                            </div>
                          </details>

                          <div className="bg-background rounded-sm border border-border overflow-hidden">
                          <div className="bg-background px-4 py-3 flex items-center justify-between text-[10px] md:text-xs font-mono border-b border-border">
                            <span className="text-muted-foreground font-sans uppercase tracking-widest font-bold">Language: <span className="text-emerald-700 ml-2">{codingAns.language}</span></span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  const chatContext = `I have a question about this coding problem and the student's submission.\n\nProblem Title: ${cq.title}\nDescription:\n${cq.description}\n\nStudent's Language: ${codingAns.language}\nStudent's Code:\n${codingAns.sourceCode}`;
                                  localStorage.setItem('pendingAiChat', chatContext);
                                  navigate('/admin?tab=aichat');
                                }}
                                className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-xs font-bold font-sans transition-colors flex items-center gap-2"
                              >
                                💬 Chat About Code
                              </button>
                              <button
                                onClick={() => handleAnalyzeCode(cq._id, codingAns.sourceCode, codingAns.language, cq.title, cq.description, cq.testCases)}
                                disabled={aiAnalysis[cq._id]?.loading}
                                className="px-3 py-1 bg-cream-50 hover:bg-cream-100 text-cream-700 border border-cream-200 rounded text-xs font-bold font-sans transition-colors disabled:opacity-50 flex items-center gap-2"
                              >
                                {aiAnalysis[cq._id]?.loading ? (
                                  <>
                                    <div className="w-3 h-3 border-2 border-cream-700 border-t-transparent rounded-full animate-spin"></div>
                                    Analyzing...
                                  </>
                                ) : (
                                  <>{codingAns.aiAnalysis ? 'Regenerate AI 🔄' : 'Ask AI 🤖'}</>
                                )}
                              </button>
                            </div>
                          </div>
                          <pre className="p-4 md:p-6 overflow-x-auto text-sm font-mono text-foreground custom-scrollbar">
                            <code>{codingAns.sourceCode}</code>
                          </pre>
                        </div>
                        
                        {(codingAns.aiAnalysis || aiAnalysis[cq._id]) && (
                          <details className={`mt-4 p-4 md:p-5 rounded-sm border group ${aiAnalysis[cq._id]?.error ? 'bg-red-50 border-red-200' : 'bg-muted border-border'}`}>
                            <summary className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3 flex items-center justify-between cursor-pointer list-none">
                              <div className="flex items-center gap-2">
                                {aiAnalysis[cq._id]?.error ? (
                                  <span className="text-red-500">Analysis Failed</span>
                                ) : (
                                  <span className="text-indigo-600">✨ AI Feedback (Saved)</span>
                                )}
                              </div>
                              <div className="text-indigo-600 transform transition-transform group-open:rotate-180">
                                ▼
                              </div>
                            </summary>
                            
                            <div className="pt-2 border-t border-border/60 mt-2">
                              {aiAnalysis[cq._id]?.loading ? (
                                <div className="text-sm text-slate-500 italic">Thinking...</div>
                              ) : aiAnalysis[cq._id]?.error ? (
                                <div className="text-sm text-red-600">{aiAnalysis[cq._id].error}</div>
                              ) : (
                                <div className="text-sm text-foreground prose prose-sm max-w-none prose-headings:font-sans prose-headings:text-indigo-900 prose-headings:mt-4 prose-headings:mb-2 prose-a:text-indigo-600">
                                  <ReactMarkdown>{codingAns.aiAnalysis || aiAnalysis[cq._id]?.result || ''}</ReactMarkdown>
                                </div>
                              )}
                            </div>
                          </details>
                        )}
                      </div>
                    ) : (
                      <div className="bg-muted border border-border p-6 text-center rounded-sm text-sm text-slate-500 italic">
                        No code was submitted for this question.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default DetailedResult;
