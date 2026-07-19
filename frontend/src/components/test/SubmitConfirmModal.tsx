import React from 'react';

interface SubmitSummary {
  total: number;
  answered: number;
  notAnswered: number;
  marked: number;
  notViewed: number;
}

interface SubmitConfirmModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  summary: SubmitSummary;
  testType?: 'mcq' | 'coding' | 'mixed';
  onConfirm: () => void;
  onCancel: () => void;
}

const summaryRows = (summary: SubmitSummary) => [
  { label: 'Total Questions', value: summary.total, className: 'text-foreground-bold', dot: 'bg-cream-400' },
  { label: 'Answered', value: summary.answered, className: 'text-emerald-800', dot: 'bg-emerald-500' },
  { label: 'Not Answered', value: summary.notAnswered, className: 'text-red-800', dot: 'bg-red-500' },
  { label: 'Marked for Review', value: summary.marked, className: 'text-amber-800', dot: 'bg-amber-500' },
  { label: 'Not Visited', value: summary.notViewed, className: 'text-slate-700', dot: 'bg-slate-400' },
];

const SubmitConfirmModal: React.FC<SubmitConfirmModalProps> = ({
  isOpen,
  isSubmitting,
  summary,
  testType,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-primary/60 backdrop-blur-sm"
        onClick={isSubmitting ? undefined : onCancel}
      />

      {/* Modal */}
      <div className="relative bg-background border border-border rounded-sm shadow-2xl w-full max-w-md animate-in">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-border">
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground mb-2">Assessment Review</div>
          <h3 className="text-2xl font-sans text-foreground-bold">
            {testType === 'mixed' ? 'Proceed to Coding' : 'Confirm Submission'}
          </h3>
          <p className="text-sm text-muted-foreground mt-2 font-light">
            {testType === 'mixed'
              ? 'Please review your MCQ progress. Once you proceed to the coding section, you cannot return here.'
              : 'Please review your progress before submitting. This action cannot be undone.'}
          </p>
        </div>

        {/* Summary */}
        <div className="px-8 py-6 space-y-4">
          {summaryRows(summary).map((row) => (
            <div key={row.label} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full ${row.dot}`} />
                <span className="text-sm text-foreground">{row.label}</span>
              </div>
              <span className={`text-xl font-sans font-bold ${row.className}`}>
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {/* Warning */}
        {summary.notAnswered > 0 && (
          <div className="mx-8 mb-6 p-4 bg-red-950/20 border border-red-900/50 rounded-sm">
            <p className="text-xs text-red-500 font-medium flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.27 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              You have {summary.notAnswered} unanswered question{summary.notAnswered !== 1 ? 's' : ''}.
              Once you {testType === 'mixed' ? 'proceed' : 'submit'}, you cannot change your responses.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="px-8 pb-8 flex items-center justify-end gap-4">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="btn-secondary disabled:opacity-40"
          >
            Go Back
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="btn-primary flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {testType === 'mixed' ? 'Proceeding...' : 'Submitting...'}
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {testType === 'mixed' ? 'Proceed to Coding' : 'Submit Assessment'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubmitConfirmModal;
