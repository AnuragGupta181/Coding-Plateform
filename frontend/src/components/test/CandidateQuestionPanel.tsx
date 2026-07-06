import React from 'react';
import type { Question } from '../../types';

export type CandidateQuestionState = 'answered' | 'marked' | 'viewed' | 'notViewed';

interface QuestionCount {
  label: string;
  value: number;
  className: string;
  valueClassName: string;
  labelClassName: string;
}

interface LegendItem {
  label: string;
  swatchClassName: string;
}

interface CandidateQuestionPanelProps {
  questions: Question[];
  currentQuestionIndex: number;
  isSaving: boolean;
  counts: {
    answered: number;
    marked: number;
    viewed: number;
    notViewed: number;
  };
  getQuestionState: (questionId: string) => CandidateQuestionState;
  onQuestionSelect: (index: number) => void;
}

const boardStyles: Record<CandidateQuestionState, string> = {
  answered: 'bg-emerald-600 border-emerald-700 text-white',
  marked: 'bg-amber-500 border-amber-600 text-white',
  viewed: 'bg-sky-100 border-sky-300 text-sky-800',
  notViewed: 'bg-slate-100 border-slate-300 text-slate-500'
};

const countCards = (counts: CandidateQuestionPanelProps['counts']): QuestionCount[] => [
  {
    label: 'Answered',
    value: counts.answered,
    className: 'bg-emerald-50 border-emerald-100',
    valueClassName: 'text-emerald-800',
    labelClassName: 'text-emerald-700'
  },
  {
    label: 'Marked',
    value: counts.marked,
    className: 'bg-amber-50 border-amber-100',
    valueClassName: 'text-amber-800',
    labelClassName: 'text-amber-700'
  },
  {
    label: 'Viewed',
    value: counts.viewed,
    className: 'bg-sky-50 border-sky-100',
    valueClassName: 'text-sky-800',
    labelClassName: 'text-sky-700'
  },
  {
    label: 'Not Viewed',
    value: counts.notViewed,
    className: 'bg-slate-50 border-slate-200',
    valueClassName: 'text-slate-700',
    labelClassName: 'text-slate-500'
  }
];

const legendItems: LegendItem[] = [
  { label: 'Answered', swatchClassName: 'bg-emerald-600 border-emerald-700' },
  { label: 'Marked', swatchClassName: 'bg-amber-500 border-amber-600' },
  { label: 'Viewed', swatchClassName: 'bg-sky-100 border-sky-300' },
  { label: 'Not Viewed', swatchClassName: 'bg-slate-100 border-slate-300' }
];

const CandidateQuestionPanel: React.FC<CandidateQuestionPanelProps> = ({
  questions,
  currentQuestionIndex,
  isSaving,
  counts,
  getQuestionState,
  onQuestionSelect
}) => {
  return (
    <aside className="lg:sticky lg:top-8 space-y-6">
      <section className="bg-white border border-border rounded-sm shadow-sm p-6">
        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground mb-4">Question Panel</div>
        <div className="grid grid-cols-5 gap-3">
          {questions.map((question, index) => {
            const state = getQuestionState(question._id);
            const isActive = index === currentQuestionIndex;

            return (
              <button
                key={question._id}
                type="button"
                onClick={() => onQuestionSelect(index)}
                disabled={isSaving}
                className={`h-10 w-10 border rounded-sm flex items-center justify-center text-xs font-black transition-all disabled:opacity-60 ${
                  boardStyles[state]
                } ${isActive ? 'ring-2 ring-cream-950 ring-offset-2 scale-105' : 'hover:-translate-y-0.5'}`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6 text-center">
          {countCards(counts).map((count) => (
            <div key={count.label} className={`${count.className} border p-3 rounded-sm`}>
              <div className={`text-xl font-sans ${count.valueClassName}`}>{count.value}</div>
              <div className={`text-[8px] uppercase tracking-widest font-black ${count.labelClassName}`}>{count.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border border-border rounded-sm shadow-sm p-6">
        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground mb-4">Instructions</div>
        <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
          <p>Select one option for each question.</p>
          <p>Use <span className="font-bold text-amber-700">Mark for Review</span> when you want to revisit a question.</p>
          <p>Click any number in the panel to jump to that question.</p>
          <p>Answers are saved when you move between questions or submit.</p>
        </div>

        <div className="mt-6 pt-6 border-t border-cream-100 space-y-3">
          {legendItems.map((item) => (
            <div key={item.label} className="flex items-center gap-3 text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
              <span className={`w-4 h-4 border rounded-sm ${item.swatchClassName}`}></span>
              {item.label}
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
};

export default CandidateQuestionPanel;
