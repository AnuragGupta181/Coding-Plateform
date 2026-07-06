import React from 'react';

export interface TestSummary {
  _id: string;
  title: string;
  description: string;
  durationInMinutes: number;
  status: 'scheduled' | 'waiting' | 'active' | 'completed';
}

interface TestCardProps {
  test: TestSummary;
  onEnter: (testId: string, status: string) => void;
}

export const TestCard: React.FC<TestCardProps> = ({ test, onEnter }) => {
  return (
    <div className="bg-white border border-border p-8 rounded-sm shadow-sm hover:shadow-premium transition-all group">
      <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-sans text-foreground-bold group-hover:text-cream-700 transition-colors">{test.title}</h3>
          <span className="text-[10px] uppercase font-bold text-muted-foreground">ID: {test._id.slice(-4)}</span>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 font-light leading-relaxed mb-6">{test.description}</p>
        
        <div className="flex items-center gap-6 pt-6 border-t border-cream-50">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-tighter">Duration</span>
            <span className="text-sm font-bold text-foreground">{test.durationInMinutes} mins</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-tighter">Format</span>
            <span className="text-sm font-bold text-foreground">MCQ Only</span>
          </div>
        </div>
      </div>

      <button
        onClick={() => onEnter(test._id, test.status)}
        disabled={test.status !== 'waiting' && test.status !== 'active'}
        className={`w-full py-3.5 text-xs uppercase tracking-widest font-bold transition-all ${
          (test.status === 'waiting' || test.status === 'active')
            ? 'bg-primary text-primary-foreground hover:bg-primary shadow-lg shadow-cream-100'
            : 'bg-muted text-muted-foreground cursor-not-allowed'
        }`}
      >
        {test.status === 'waiting' ? 'Enter Waiting Room' : 
         test.status === 'active' ? 'Enter Live Session' : 
         'Awaiting Authorization'}
      </button>
    </div>
  );
};
