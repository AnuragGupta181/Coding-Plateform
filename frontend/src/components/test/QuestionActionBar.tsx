import React from 'react';

interface QuestionActionBarProps {
  isMarked: boolean;
  hasAnswer: boolean;
  isSaving: boolean;
  onToggleMark: () => void;
  onClearResponse: () => void;
  onSaveAndNext: () => void;
  onSave: () => void;
  onPrevious: () => void;
  isFirst: boolean;
  isLast: boolean;
}

const QuestionActionBar: React.FC<QuestionActionBarProps> = ({
  isMarked,
  hasAnswer,
  isSaving,
  onToggleMark,
  onClearResponse,
  onSaveAndNext,
  onSave,
  onPrevious,
  isFirst,
  isLast
}) => {
  return (
    <div className="mt-8 pt-6 border-t border-border">
      {/* Action Buttons Row */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-6">
        <button
          type="button"
          onClick={onToggleMark}
          disabled={isSaving}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 border rounded-sm text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 ${
            isMarked
              ? 'bg-amber-500 border-amber-600 text-white hover:bg-amber-600'
              : 'bg-white border-border text-muted-foreground hover:border-amber-400 hover:text-amber-700'
          }`}
        >
          <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          {isMarked ? 'Unmark' : 'Mark Review'}
        </button>

        <button
          type="button"
          onClick={onClearResponse}
          disabled={isSaving || !hasAnswer}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 border border-border rounded-sm text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-all hover:border-red-300 hover:text-red-700 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:text-muted-foreground disabled:hover:bg-white"
        >
          <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Clear
        </button>
      </div>

      {/* Navigation Row */}
      <div className="flex justify-between items-center gap-3">
        <button
          onClick={onPrevious}
          disabled={isFirst || isSaving}
          className="btn-secondary disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs"
        >
          <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </button>

        {isLast ? (
          <button
            onClick={onSave}
            disabled={isSaving || !hasAnswer}
            className="btn-primary flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <span className="w-3 h-3 border-2 border-cream-50 border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Save Answer
              </>
            )}
          </button>
        ) : (
          <button
            onClick={onSaveAndNext}
            disabled={isSaving}
            className="btn-primary flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs"
          >
            {isSaving ? (
              <>
                <span className="w-3 h-3 border-2 border-cream-50 border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Save & Next
                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default QuestionActionBar;
