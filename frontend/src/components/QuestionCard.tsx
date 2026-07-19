import React from 'react';
import type { Question } from '../types';

interface QuestionCardProps {
  question: Question;
  selectedOption: number | undefined;
  onSelect: (index: number) => void;
  savedOption?: number;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, selectedOption, onSelect, savedOption }) => {
  return (
    <div className="w-full bg-card p-5 sm:p-8 rounded-sm border border-border shadow-sm flex flex-col flex-1">
      <div className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mb-3 sm:mb-4">Assessment Item</div>
      <h2 className="text-xl sm:text-2xl font-sans text-foreground-bold mb-8 leading-tight">
        {question.questionText}
      </h2>
      
      <div className="space-y-3 sm:space-y-4 flex-1">
        {question.options.map((option, index) => {
          const isSelected = selectedOption === index;
          const isOfficiallySaved = savedOption === index;

          const isSavedAndSelected = isOfficiallySaved && isSelected;
          const isSavedButNotSelected = isOfficiallySaved && !isSelected;
          const isSelectedButNotSaved = isSelected && !isOfficiallySaved;

          let buttonClasses = 'border-border bg-muted/20 hover:bg-muted/50 hover:border-foreground/30 text-foreground';
          let letterClasses = 'border-border bg-background text-muted-foreground';
          let textClasses = 'font-medium';

          if (isSavedAndSelected) {
            buttonClasses = 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20 text-emerald-900 dark:text-emerald-100 shadow-sm';
            letterClasses = 'border-emerald-600 bg-emerald-500 text-white';
            textClasses = 'font-bold';
          } else if (isSelectedButNotSaved) {
            buttonClasses = 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 shadow-sm';
            letterClasses = 'border-blue-600 bg-blue-500 text-white';
            textClasses = 'font-bold';
          } else if (isSavedButNotSelected) {
            buttonClasses = 'border-emerald-400 border-dashed bg-transparent text-foreground opacity-80';
            letterClasses = 'border-emerald-400 bg-transparent text-emerald-600 dark:text-emerald-400';
            textClasses = 'font-medium';
          }

          return (
            <button
              key={index}
              onClick={() => onSelect(index)}
              className={`w-full text-left p-3.5 sm:p-5 rounded-sm border-2 transition-all flex items-center justify-between gap-4 sm:gap-6 ${buttonClasses}`}
            >
              <div className="flex items-center gap-4 sm:gap-6">
                <span className={`w-6 h-6 sm:w-8 sm:h-8 shrink-0 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold border transition-colors ${letterClasses}`}>
                  {String.fromCharCode(65 + index)}
                </span>
                <span className={`text-sm sm:text-base ${textClasses}`}>
                  {option}
                </span>
              </div>
              {isOfficiallySaved && (
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuestionCard;
