import React from 'react';

interface CameraPermissionGateProps {
  cameraStatus: 'idle' | 'loading' | 'active' | 'denied' | 'error';
  onRetry: () => void;
}

const CameraPermissionGate: React.FC<CameraPermissionGateProps> = ({ cameraStatus, onRetry }) => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-card border border-border shadow-2xl p-8 rounded-lg animate-in fade-in zoom-in-95">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        
        <h2 className="text-2xl font-bold text-foreground mb-4">Camera Permission Required</h2>
        
        {cameraStatus === 'loading' || cameraStatus === 'idle' ? (
          <div>
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground text-sm font-medium">
              Please allow camera access in your browser to proceed with the assessment.
            </p>
          </div>
        ) : (
          <div>
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md mb-6">
              <p className="text-destructive font-bold mb-2 text-sm uppercase tracking-wider">
                Access Denied
              </p>
              <p className="text-muted-foreground text-sm">
                This assessment requires active camera monitoring. Please enable camera access in your browser settings (click the lock icon in the URL bar), then click retry.
              </p>
            </div>
            <button
              onClick={onRetry}
              className="px-6 py-2.5 bg-primary text-primary-foreground font-bold text-sm uppercase tracking-widest rounded hover:brightness-110 transition-all shadow-sm hover:shadow-md"
            >
              Retry Camera Access
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraPermissionGate;
