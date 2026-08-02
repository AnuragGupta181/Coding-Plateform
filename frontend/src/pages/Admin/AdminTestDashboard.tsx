import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { testService } from '../../utils/apiService';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';

const AdminTestDashboard: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [analyzingOverall, setAnalyzingOverall] = useState(false);
  const [analyzingIssues, setAnalyzingIssues] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        if (!testId) return;
        const res = await testService.getTestDashboardData(testId);
        setData(res.data);
      } catch (error) {
        console.error('Failed to load dashboard data', error);
        toast.error('Failed to load test dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [testId]);

  const handleAnalyzeOverall = async () => {
    if (!testId) return;
    setAnalyzingOverall(true);
    try {
      const res = await testService.analyzeOverallExperience(testId);
      setAiAnalysis(res.data.analysis);
      toast.success('Overall analysis generated');
    } catch (error) {
      toast.error('Failed to generate analysis');
    } finally {
      setAnalyzingOverall(false);
    }
  };

  const handleAnalyzeQuestionIssues = async (questionId: string) => {
    if (!testId) return;
    setAnalyzingIssues(prev => ({ ...prev, [questionId]: true }));
    try {
      const res = await testService.analyzeQuestionIssues(testId, questionId);
      setData((prev: any) => ({
        ...prev,
        reportedProblems: prev.reportedProblems.map((p: any) =>
          p.questionId === questionId ? { ...p, aiEvaluation: res.data.aiEvaluation } : p
        )
      }));
      toast.success('Question issues analyzed collectively by AI');
    } catch (error) {
      toast.error('Failed to analyze issues');
    } finally {
      setAnalyzingIssues(prev => ({ ...prev, [questionId]: false }));
    }
  };

  // Group reported problems by questionId
  const issuesByQuestion: Record<string, {
    questionDetails: any,
    issues: any[],
    aiEvaluation?: any
  }> = {};

  if (data?.reportedProblems) {
    data.reportedProblems.forEach((rp: any) => {
      const qId = rp.questionId || 'unknown';
      if (!issuesByQuestion[qId]) {
        issuesByQuestion[qId] = {
          questionDetails: rp.questionDetails,
          issues: [],
          aiEvaluation: rp.aiEvaluation
        };
      }
      issuesByQuestion[qId].issues.push(rp);
      
      if (rp.aiEvaluation && !issuesByQuestion[qId].aiEvaluation) {
        issuesByQuestion[qId].aiEvaluation = rp.aiEvaluation;
      }
    });
  }

  if (loading) {
    return <div className="p-10 text-center animate-pulse">Loading dashboard...</div>;
  }

  if (!data) {
    return <div className="p-10 text-center text-red-500">Failed to load data.</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <Link to={`/admin/results/${testId}`} className="text-xs font-bold uppercase tracking-widest hover:text-primary transition-colors">
          &larr; Back to Results
        </Link>
        
        <div>
          <h1 className="text-3xl font-bold mb-2">Test Intelligence Dashboard</h1>
          <p className="text-muted-foreground">Insights, feedback, and AI analysis for test experience.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-6 border-primary/30">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">Overall Feedback</h3>
            <div className="flex items-end gap-4 mb-6">
              <div className="text-5xl font-bold text-primary">{data.averageRating || '-'}</div>
              <div className="text-sm text-muted-foreground mb-1">/ 5.0 Average ({data.totalFeedback} reviews)</div>
            </div>
            <div className="space-y-4 max-h-60 overflow-y-auto custom-scrollbar pr-2">
              {data.feedbacks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No feedback submitted yet.</p>
              ) : (
                data.feedbacks.map((f: any, i: number) => (
                  <div key={i} className="text-sm border-b border-border pb-3 last:border-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-foreground">{f.candidateName || f.candidateEmail}</span>
                      <span className="text-amber-500">{'★'.repeat(f.rating)}</span>
                    </div>
                    {f.comment && <p className="text-muted-foreground italic">&ldquo;{f.comment}&rdquo;</p>}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">AI Experience Analysis</h3>
              <button onClick={handleAnalyzeOverall} disabled={analyzingOverall || data.totalFeedback === 0} className="btn-primary text-xs py-1 px-3">
                {analyzingOverall ? 'Analyzing...' : 'Generate AI Report'}
              </button>
            </div>
            
            {aiAnalysis ? (
              <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-foreground bg-muted/10 p-4 rounded-md border border-primary/20">
                <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-10 bg-muted/20 rounded border border-dashed border-border">
                Click 'Generate AI Report' to summarize candidate experience and find areas of improvement.
              </div>
            )}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-6">Reported Issues Tracker</h3>
          <div className="space-y-4">
            {Object.keys(issuesByQuestion).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No issues reported during this test.</p>
            ) : (
              Object.entries(issuesByQuestion).map(([qId, group]) => (
                <div key={qId} className="border border-border p-4 rounded-lg bg-muted/10 space-y-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold text-foreground flex-1">
                      Target Question: {group.questionDetails ? (group.questionDetails.type === 'mcq' ? group.questionDetails.text : group.questionDetails.title) : 'Unknown Question'}
                    </div>
                    {!group.aiEvaluation && (
                      <button 
                        onClick={() => handleAnalyzeQuestionIssues(qId)}
                        disabled={analyzingIssues[qId]}
                        className="btn-secondary text-[10px] uppercase py-1 px-2 whitespace-nowrap ml-4"
                      >
                        {analyzingIssues[qId] ? 'Analyzing...' : 'AI Verify Question'}
                      </button>
                    )}
                  </div>

                  {group.questionDetails && group.questionDetails.type === 'mcq' && group.questionDetails.options && (
                    <ol className="list-decimal list-inside pl-2 text-xs text-muted-foreground mb-4">
                      {group.questionDetails.options.map((opt: string, idx: number) => (
                        <li key={idx} className="truncate">{opt}</li>
                      ))}
                    </ol>
                  )}

                  <div className="space-y-3 mt-4 border-t border-border/50 pt-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Candidate Reports ({group.issues.length})</h4>
                    {group.issues.map((rp: any) => (
                      <div key={rp._id} className="bg-background/50 p-3 rounded border border-border">
                        <div className="mb-1 flex items-center gap-2">
                          <Link 
                            to={`/admin/submission/${rp.submissionId}`}
                            className="font-bold text-xs text-foreground hover:text-primary hover:underline transition-colors"
                          >
                            {rp.candidateEmail}
                          </Link>
                          <span className="text-[10px] text-muted-foreground">reported:</span>
                        </div>
                        <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">"{rp.description}"</p>
                      </div>
                    ))}
                  </div>

                  {group.aiEvaluation && (
                    <div className={`mt-4 p-4 rounded-md text-sm border ${group.aiEvaluation.isCandidateCorrect ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'}`}>
                      <div className="font-bold mb-2 flex items-center gap-2">
                        <span>{group.aiEvaluation.isCandidateCorrect ? '✓ Valid Issue' : '✗ Invalid Issue'}</span>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-background/50 px-2 py-0.5 rounded">AI Verified (Collective)</span>
                      </div>
                      <p className="opacity-90 leading-relaxed text-sm">{group.aiEvaluation.analysis}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTestDashboard;
