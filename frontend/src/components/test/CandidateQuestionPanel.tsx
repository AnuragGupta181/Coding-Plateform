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
  answered: 'bg-green-600 border-green-700 text-white',
  marked: 'bg-orange-500 border-orange-600 text-white',
  viewed: 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/50 dark:border-blue-700 dark:text-blue-300',
  notViewed: 'bg-gray-100 border-gray-300 text-gray-500 dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-400'
};

const countCards = (counts: CandidateQuestionPanelProps['counts']): QuestionCount[] => [
  {
    label: 'Answered',
    value: counts.answered,
    className: 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800',
    valueClassName: 'text-green-800 dark:text-green-400',
    labelClassName: 'text-green-700 dark:text-green-500'
  },
  {
    label: 'Marked',
    value: counts.marked,
    className: 'bg-orange-50 border-orange-200 dark:bg-orange-900/30 dark:border-orange-800',
    valueClassName: 'text-orange-800 dark:text-orange-400',
    labelClassName: 'text-orange-700 dark:text-orange-500'
  },
  {
    label: 'Viewed',
    value: counts.viewed,
    className: 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800',
    valueClassName: 'text-blue-800 dark:text-blue-400',
    labelClassName: 'text-blue-700 dark:text-blue-500'
  },
  {
    label: 'Not Viewed',
    value: counts.notViewed,
    className: 'bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700',
    valueClassName: 'text-gray-700 dark:text-gray-400',
    labelClassName: 'text-gray-500 dark:text-gray-500'
  }
];

const legendItems: LegendItem[] = [
  { label: 'Current / Active', swatchClassName: 'bg-background border-2 border-cream-950 scale-105' },
  { label: 'Answered', swatchClassName: 'bg-green-600 border-green-700' },
  { label: 'Marked', swatchClassName: 'bg-orange-500 border-orange-600' },
  { label: 'Viewed', swatchClassName: 'bg-blue-100 border-blue-300 dark:bg-blue-900/50 dark:border-blue-700' },
  { label: 'Not Viewed', swatchClassName: 'bg-gray-100 border-gray-300 dark:bg-gray-800/50 dark:border-gray-700' }
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
    <aside className="space-y-6">
      <section className="bg-card border border-border rounded-sm shadow-sm p-6">
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

      <section className="bg-card border border-border rounded-sm shadow-sm p-5">
        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground mb-3">Instructions</div>
        <div className="space-y-2 text-[11px] text-muted-foreground leading-relaxed">
          <p>Select one option for each question.</p>
          <p>Answers are saved when you move between questions or submit.</p>
        </div>
        
        <div className="mt-4 pt-4 border-t border-border grid gap-2">
          {legendItems.map((item) => (
            <div key={item.label} className="flex items-center gap-3 text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
              <span className={`w-4 h-4 rounded-sm border shrink-0 ${item.swatchClassName}`}></span>
              {item.label}
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
};

export default CandidateQuestionPanel;
