import React from 'react';
import type { Question } from '../types';

interface QuestionCardProps {
  question: Question;
  selectedOption: number | undefined;
  onSelect: (index: number) => void;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, selectedOption, onSelect }) => {
  return (
    <div className="w-full bg-white p-10 rounded-sm border border-border shadow-sm">
      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4">Assessment Item</div>
      <h2 className="text-3xl font-sans text-foreground-bold mb-10 leading-tight">
        {question.questionText}
      </h2>
      
      <div className="space-y-4">
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => onSelect(index)}
            className={`w-full text-left p-5 rounded-sm border transition-all flex items-center gap-6 ${
              selectedOption === index
                ? 'border-cream-900 bg-background text-foreground-bold'
                : 'border-cream-100 hover:border-border-hover text-cream-700'
            }`}
          >
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${
              selectedOption === index 
                ? 'border-cream-900 bg-primary text-primary-foreground' 
                : 'border-border bg-muted text-muted-foreground'
            }`}>
              {String.fromCharCode(65 + index)}
            </span>
            <span className={`text-base ${selectedOption === index ? 'font-medium' : 'font-light'}`}>
              {option}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuestionCard;
