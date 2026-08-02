import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import testService from '../../utils/apiService';

interface SubmissionSummary {
  _id: string;
  candidateName: string;
  candidateEmail: string;
  score: number;
  updatedAt: string;
  status: string;
  violations?: { type: string; timestamp: string; count: number }[];
  reportedProblems?: { description: string; timestamp: string }[];
}

type SortOption = 'rank' | 'latest' | 'name';

const ResultsList: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const [results, setResults] = useState<SubmissionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('rank');

  useEffect(() => {
    const fetchResults = async () => {
      if (!testId) return;
      try {
        const res = await testService.getTestResults(testId);
        setResults(res.data);
      } catch (err) {
        console.error('Failed to fetch results', err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [testId]);

  const sortedResults = [...results].sort((a, b) => {
    if (sortBy === 'latest') {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }

    if (sortBy === 'name') {
      return a.candidateName.localeCompare(b.candidateName);
    }

    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
  });

  return (
    <div className="min-h-screen bg-background font-sans text-foreground pb-20">
      <nav className="bg-background border-b border-border mb-6 md:mb-10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="flex items-center gap-3">
              <img src="/logo.svg" alt="NextGen Logo" className="h-10 md:h-12 w-auto" />
              <span className="text-xs uppercase font-bold tracking-[0.2em] text-muted-foreground border-l border-border pl-3 hidden sm:inline">Admin</span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <button 
          onClick={() => navigate('/admin?tab=history')}
          className="group flex items-center gap-2 text-[10px] md:text-xs uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground-bold transition-all whitespace-nowrap mb-8"
        >
          <span className="group-hover:-translate-x-1 transition-transform">&larr;</span>
          Back to Dashboard
        </button>
      </div>

      <header className="max-w-6xl mx-auto px-4 md:px-6 mb-8 md:mb-12 flex flex-col gap-6 md:flex-row md:justify-between md:items-end">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground mb-2 flex flex-wrap items-center gap-4">
            Performance Analytics
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  try {
                    const res = await testService.exportTestResults(testId || '');
                    const url = window.URL.createObjectURL(new Blob([res.data]));
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', `test_${testId}_results.xlsx`);
                    document.body.appendChild(link);
                    link.click();
                    link.parentNode?.removeChild(link);
                    window.URL.revokeObjectURL(url);
                  } catch (err) {
                    console.error('Failed to export', err);
                  }
                }}
                className="btn-secondary py-1 px-3 text-[9px] tracking-widest flex items-center gap-1.5"
              >
                Export Excel &darr;
              </button>
              <button
                onClick={() => navigate(`/admin/test/${testId}/dashboard`)}
                className="btn-primary py-1 px-3 text-[9px] tracking-widest flex items-center gap-1.5"
              >
                Intelligence Dashboard &rarr;
              </button>
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-sans text-foreground-bold">Assessment Results</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-2 font-light italic">Detailed performance overview for all registered participants.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 md:gap-4">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">Sort Metrics</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-background border border-border rounded-sm px-3 md:px-4 py-2 text-[10px] md:text-xs font-bold uppercase tracking-wide text-foreground focus:outline-none focus:border-cream-900 transition-colors flex-1"
          >
            <option value="rank">By Rank</option>
            <option value="latest">By Date</option>
            <option value="name">By Name</option>
          </select>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6">
        {loading ? (
          <div className="flex flex-col items-center py-32">
            <div className="w-10 h-10 border-2 border-border border-t-cream-900 rounded-full animate-spin"></div>
            <p className="mt-6 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Retrieving Data...</p>
          </div>
        ) : sortedResults.length === 0 ? (
          <div className="bg-background border border-dashed border-border-hover rounded-sm p-12 md:p-24 text-center shadow-sm">
            <p className="text-muted-foreground font-light italic text-sm md:text-base">No completed submissions recorded for this assessment.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {sortedResults.map((sub, index) => {
              const totalViolations = sub.violations?.reduce((sum, v) => sum + (v.count || 1), 0) || 0;
              return (
              <div
                key={sub._id}
                onClick={() => navigate(`/admin/submission/${sub._id}`)}
                className="group cursor-pointer bg-background border border-border p-5 md:p-8 rounded-sm shadow-sm hover:shadow-premium transition-all"
              >
                <div className="flex items-start justify-between mb-6 md:mb-8 gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Candidate</div>
                    <h2 className="text-lg md:text-xl font-sans text-foreground-bold group-hover:text-cream-700 transition-colors truncate">{sub.candidateName}</h2>
                    <p className="text-[10px] md:text-xs text-muted-foreground font-light truncate">{sub.candidateEmail}</p>
                  </div>
                  <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold border transition-colors shrink-0 ${
                    index === 0 && sortBy === 'rank' ? 'bg-primary border-cream-900 text-primary-foreground' : 'bg-background border-cream-100 text-muted-foreground'
                  }`}>
                    {index + 1}
                  </div>
                </div>

                <div className="flex flex-wrap items-start justify-between gap-4 md:gap-6 mb-6 md:mb-8 pt-6 md:pt-8 border-t border-cream-50">
                  <div>
                    <div className="text-[8px] sm:text-[9px] uppercase tracking-wider sm:tracking-widest text-muted-foreground font-bold mb-1">Score</div>
                    <div className="text-2xl md:text-3xl font-sans text-foreground-bold">{sub.score}</div>
                  </div>
                  <div>
                    <div className="text-[8px] sm:text-[9px] uppercase tracking-wider sm:tracking-widest text-muted-foreground font-bold mb-1">Status</div>
                    <div className={`text-[9px] md:text-[10px] font-bold mt-2 uppercase tracking-tighter ${sub.status === 'active' ? 'text-amber-500' : 'text-foreground'}`}>
                      {sub.status === 'active' ? 'In Progress' : 'Completed'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[8px] sm:text-[9px] uppercase tracking-wider sm:tracking-widest text-muted-foreground font-bold mb-1">Violations</div>
                    <div className={`text-2xl md:text-3xl font-sans ${totalViolations > 0 ? 'text-red-700' : 'text-cream-300'}`}>
                      {totalViolations}
                    </div>
                  </div>
                  <div>
                    <div className="text-[8px] sm:text-[9px] uppercase tracking-wider sm:tracking-widest text-muted-foreground font-bold mb-1">Issues</div>
                    <div className={`text-2xl md:text-3xl font-sans ${(sub.reportedProblems?.length || 0) > 0 ? 'text-amber-500' : 'text-cream-300'}`}>
                      {sub.reportedProblems?.length || 0}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 md:pt-6 border-t border-cream-50">
                  <span className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                    {new Date(sub.updatedAt).toLocaleDateString()}
                  </span>
                  <span className="text-[9px] md:text-[10px] font-bold text-foreground-bold uppercase tracking-widest group-hover:underline underline-offset-4">
                    Review File &rarr;
                  </span>
                </div>
              </div>
            )})}
          </div>
        )}
      </main>
    </div>
  );
};

export default ResultsList;
