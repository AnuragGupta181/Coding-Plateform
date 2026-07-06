import React from 'react';
import  type { CandidateQuestionState } from './CandidateQuestionPanel';
import CandidateQuestionPanel from './CandidateQuestionPanel';

interface MobileQuestionDrawerProps {
  showMobilePanel: boolean;
  setShowMobilePanel: (val: boolean) => void;
  questions: any[];
  currentQuestionIndex: number;
  isSaving: boolean;
  answeredCount: number;
  markedCount: number;
  viewedCount: number;
  notViewedCount: number;
  getCandidateQuestionState: (id: string) => CandidateQuestionState;
  goToQuestion: (index: number) => void;
}

export const MobileQuestionDrawer: React.FC<MobileQuestionDrawerProps> = ({
  showMobilePanel,
  setShowMobilePanel,
  questions,
  currentQuestionIndex,
  isSaving,
  answeredCount,
  markedCount,
  viewedCount,
  notViewedCount,
  getCandidateQuestionState,
  goToQuestion
}) => {
  if (!showMobilePanel) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-primary/50 backdrop-blur-sm" onClick={() => setShowMobilePanel(false)} />
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-border rounded-t-2xl max-h-[75vh] overflow-y-auto animate-slide-up p-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Question Panel</div>
          <button
            onClick={() => setShowMobilePanel(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-cream-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <CandidateQuestionPanel
          questions={questions}
          currentQuestionIndex={currentQuestionIndex}
          isSaving={isSaving}
          counts={{
            answered: answeredCount,
            marked: markedCount,
            viewed: viewedCount,
            notViewed: notViewedCount
          }}
          getQuestionState={getCandidateQuestionState}
          onQuestionSelect={goToQuestion}
        />
      </div>
    </div>
  );
};
