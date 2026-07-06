import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export const ErrorView: React.FC = () => (
  <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
    <div className="max-w-md">
      <h2 className="text-2xl font-sans text-red-800 mb-4">Initialization Error</h2>
      <p className="text-muted-foreground mb-8 font-light">The assessment environment could not be established. Please contact your administrator.</p>
      <Link to="/dashboard" className="btn-primary">Return to Dashboard</Link>
    </div>
  </div>
);

export const LoadingView: React.FC = () => (
  <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
    <div className="w-12 h-12 border-2 border-border border-t-cream-900 rounded-full animate-spin"></div>
    <p className="mt-6 text-sm text-muted-foreground uppercase tracking-widest font-bold">Establishing Secure Session...</p>
  </div>
);

export const CompletedView: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 border-2 border-cream-950 flex items-center justify-center text-foreground-bold font-sans font-bold text-3xl mb-8">
        N
      </div>
      <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground mb-2">Protocol Finished</div>
      <h2 className="text-4xl font-sans text-foreground-bold mb-4">Submission Confirmed</h2>
      <p className="text-muted-foreground mb-12 max-w-md font-light italic">Your responses have been securely persisted. You may now exit the assessment environment.</p>
      <button onClick={() => navigate('/')} className="btn-primary">Return to Home</button>
    </div>
  );
};
