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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 dark:bg-black/80 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl rounded-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.27 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Report an Issue</h2>
                <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 leading-relaxed">
                  Describe the problem you are experiencing (e.g., question is unclear, code editor not working, etc.).
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
                  Issue Description
                </label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Please provide details about the problem..."
                  className="w-full h-32 p-3.5 bg-slate-50 dark:bg-zinc-800/80 border border-slate-300 dark:border-zinc-700 rounded-lg text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all resize-none shadow-inner"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                  disabled={isReporting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReportProblem}
                  disabled={isReporting || !reportDescription.trim()}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isReporting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Submitting...
                    </>
                  ) : (
                    'Submit Report'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TestRoomHeader;

