import React from 'react';

interface NavigationControlsProps {
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
  isFirst: boolean;
  isLast: boolean;
  isLoading: boolean;
}

const NavigationControls: React.FC<NavigationControlsProps> = ({ 
  onPrevious, 
  onNext, 
  onSubmit, 
  isFirst, 
  isLast,
  isLoading
}) => {
  return (
    <div className="flex justify-between items-center w-full mt-12 pt-8 border-t border-border">
      <button
        onClick={onPrevious}
        disabled={isFirst || isLoading}
        className="btn-secondary disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Previous
      </button>

      {isLast ? (
        <button
          onClick={onSubmit}
          disabled={isLoading}
          className="btn-primary"
        >
          {isLoading ? 'Submitting...' : 'Complete Assessment'}
        </button>
      ) : (
        <button
          onClick={onNext}
          disabled={isLoading}
          className="btn-primary"
        >
          {isLoading ? 'Saving...' : 'Save & Continue'}
        </button>
      )}
    </div>
  );
};

export default NavigationControls;
