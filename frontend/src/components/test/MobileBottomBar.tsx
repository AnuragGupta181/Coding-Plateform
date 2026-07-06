import React from 'react';

interface MobileBottomBarProps {
  currentQuestionIndex: number;
  totalQuestions: number;
  answeredCount: number;
  markedCount: number;
  notViewedCount: number;
  isSaving: boolean;
  testType?: string;
  showMobilePanel: boolean;
  setShowMobilePanel: (val: boolean) => void;
  onOpenSubmitModal: () => void;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  currentQuestionIndex,
  totalQuestions,
  answeredCount,
  markedCount,
  notViewedCount,
  isSaving,
  testType,
  showMobilePanel,
  setShowMobilePanel,
  onOpenSubmitModal
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border px-4 py-3 flex items-center justify-between gap-3 lg:hidden z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <button
        onClick={() => setShowMobilePanel(!showMobilePanel)}
        className="flex items-center gap-2 px-3 py-2.5 border border-border rounded-sm text-[10px] font-black uppercase tracking-widest text-cream-700 bg-background hover:bg-muted transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
        Q {currentQuestionIndex + 1}/{totalQuestions}
      </button>

      <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          {answeredCount}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          {markedCount}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-slate-300" />
          {notViewedCount}
        </span>
      </div>

      <button
        onClick={onOpenSubmitModal}
        disabled={isSaving}
        className="px-4 py-2.5 bg-emerald-800 text-white text-[10px] font-black uppercase tracking-widest rounded-sm border border-emerald-900 transition-all hover:bg-emerald-900 disabled:opacity-50 flex items-center gap-1.5"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        {testType === 'mixed' ? 'Next: Coding' : 'Submit'}
      </button>
    </div>
  );
};
