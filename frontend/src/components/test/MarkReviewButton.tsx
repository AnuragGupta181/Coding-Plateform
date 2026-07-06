import React from 'react';

interface MarkReviewButtonProps {
  isMarked: boolean;
  onClick: () => void;
}

const MarkReviewButton: React.FC<MarkReviewButtonProps> = ({ isMarked, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 border rounded-sm text-[10px] font-black uppercase tracking-widest transition-all ${
        isMarked
          ? 'bg-amber-500 border-amber-600 text-white'
          : 'bg-white border-border text-muted-foreground hover:border-amber-500 hover:text-amber-700'
      }`}
    >
      {isMarked ? 'Unmark Review' : 'Mark for Review'}
    </button>
  );
};

export default MarkReviewButton;
