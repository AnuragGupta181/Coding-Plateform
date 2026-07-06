import React from 'react';

interface FullscreenGateProps {
  onEnterFullscreen: () => Promise<void>;
  testTitle?: string;
}

/**
 * Blocking overlay shown before the assessment.
 * The candidate MUST click "Start Test" → which triggers requestFullscreen().
 * The test UI underneath is not rendered until the gate is dismissed.
 */
const FullscreenGate: React.FC<FullscreenGateProps> = ({
  onEnterFullscreen,
  testTitle,
}) => {
  const [isRequesting, setIsRequesting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleStart = async () => {
    setIsRequesting(true);
    setError(null);
    try {
      await onEnterFullscreen();
    } catch {
      setError(
        'Fullscreen could not be activated. Please ensure your browser allows fullscreen and try again.'
      );
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-9999 bg-primary/95 backdrop-blur-md flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center">
        {/* Brand mark */}
        <div className="w-14 h-14 mx-auto mb-8 border-2 border-border-hover flex items-center justify-center text-cream-200 font-sans font-bold text-2xl">
          N
        </div>

        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground mb-3">
          Secure Assessment Protocol
        </div>

        <h1 className="text-3xl sm:text-4xl font-sans text-cream-100 mb-4">
          {testTitle ?? 'Assessment Ready'}
        </h1>

        <p className="text-muted-foreground font-light leading-relaxed mb-10 max-w-sm mx-auto">
          This assessment requires <span className="text-cream-200 font-medium">fullscreen mode</span>.
          Once activated, your session will be monitored for security compliance.
          Switching tabs or exiting fullscreen will be recorded.
        </p>

        <div className="space-y-4">
          <button
            onClick={handleStart}
            disabled={isRequesting}
            className="w-full sm:w-auto px-12 py-4 bg-emerald-700 text-white text-[11px] font-black uppercase tracking-widest rounded-sm border border-emerald-600 transition-all hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRequesting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Activating…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                Start Test
              </span>
            )}
          </button>

          {error && (
            <p className="text-red-400 text-xs font-medium">{error}</p>
          )}
        </div>

        <p className="mt-10 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
          Encrypted Environment &bull; NextGen Protocol 4.0
        </p>
      </div>
    </div>
  );
};

export default FullscreenGate;
