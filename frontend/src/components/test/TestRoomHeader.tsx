import React, { useState } from 'react';
import TimerDisplay from '../TimerDisplay';
import { ThemeToggle } from '../common/ThemeToggle';
import testService from '../../utils/apiService';
import toast from 'react-hot-toast';

interface TestRoomHeaderProps {
  candidateName?: string;
  testTitle?: string;
  onAction?: () => void;
  actionText?: string;
  isSaving?: boolean;
  submissionId?: string;
  currentQuestionId?: string;
}

const TestRoomHeader: React.FC<TestRoomHeaderProps> = ({
  candidateName,
  testTitle,
  onAction,
  actionText,
  isSaving = false,
  submissionId,
  currentQuestionId,
}) => {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportDescription, setReportDescription] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  const handleReportProblem = async () => {
    if (!submissionId) {
      toast.error('Submission ID not found.');
      return;
    }
    if (!reportDescription.trim()) {
      toast.error('Please enter a description of the problem.');
      return;
    }

    setIsReporting(true);
    try {
      await testService.reportProblem(submissionId, reportDescription, currentQuestionId);
      toast.success('Problem reported successfully.');
      setIsReportModalOpen(false);
      setReportDescription('');
    } catch (error) {
      toast.error('Failed to report problem. Please try again.');
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <>
      <nav className="bg-background border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="flex items-center group cursor-pointer">
              <img src="/logo.svg" alt="NextGen Logo" className="h-8 sm:h-10 w-auto" />
            </div>
            {testTitle && (
              <>
                <div className="w-px h-6 bg-border hidden sm:block"></div>
                <h1 className="hidden sm:block text-base sm:text-xl font-black text-foreground tracking-tight truncate max-w-[180px] md:max-w-xs">
                  {testTitle}
                </h1>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 sm:gap-4 md:gap-6">
            {submissionId && (
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="hidden sm:flex py-1.5 px-3 bg-red-900/10 hover:bg-red-900/20 text-red-600 dark:text-red-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest rounded-sm border border-red-600/30 transition-all items-center gap-1.5"
                title="Report a Problem"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
                <span>Report Issue</span>
              </button>
            )}
            {onAction && actionText && (
              <button
                onClick={onAction}
                disabled={isSaving}
                className="py-2 px-3.5 sm:px-5 bg-emerald-800 hover:bg-emerald-700 dark:bg-emerald-900/90 dark:hover:bg-emerald-800 text-white text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-sm border border-emerald-600 dark:border-emerald-400/60 transition-all duration-200 shadow-md hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{actionText}</span>
              </button>
            )}
            <ThemeToggle />
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-tighter">Candidate</span>
              <span className="text-sm font-bold text-foreground">{candidateName}</span>
            </div>
            <div className="w-px h-8 bg-muted hidden sm:block"></div>
            <TimerDisplay />
          </div>
        </div>
      </nav>

      {isReportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-background border border-border shadow-2xl rounded-md max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-foreground mb-4">Report an Issue</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Describe the problem you are experiencing (e.g., question is unclear, code editor not working, etc.).
            </p>
            <textarea
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
              placeholder="Please provide details..."
              className="w-full h-32 p-3 bg-muted/50 border border-border rounded-sm text-sm focus:outline-none focus:border-red-500/50 resize-none mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                disabled={isReporting}
              >
                Cancel
              </button>
              <button
                onClick={handleReportProblem}
                disabled={isReporting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-widest rounded-sm transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isReporting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TestRoomHeader;

