import React, { useCallback, useEffect, useRef, useState } from 'react';
import useFaceDetection from '../hooks/useFaceDetection';

interface CameraPermissionGateProps {
  onPermissionGranted: () => void;
  onSkip: () => void;
}

type PermissionState = 'checking' | 'requesting' | 'granted' | 'denied' | 'error';

const CameraPermissionGate: React.FC<CameraPermissionGateProps> = ({
  onPermissionGranted,
  onSkip,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [permissionState, setPermissionState] = useState<PermissionState>('checking');
  const [showSkipWarning, setShowSkipWarning] = useState(false);

  const { faceCount, isModelLoaded } = useFaceDetection({
    videoRef,
    enabled: permissionState === 'granted',
    intervalMs: 1000,
  });

  const requestCamera = useCallback(async () => {
    setPermissionState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 320, height: 240 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPermissionState('granted');
    } catch (err: any) {
      console.warn('Camera permission error:', err.message);
      setPermissionState(err.name === 'NotAllowedError' ? 'denied' : 'error');
    }
  }, []);

  // Auto-request on mount
  useEffect(() => {
    requestCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [requestCamera]);

  const handleProceed = () => {
    // Stop the preview stream — the test room's useCameraProctor will open its own stream
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    onPermissionGranted();
  };

  const handleSkipConfirm = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    onSkip();
  };

  const faceStatusColor = faceCount === 1 ? '#22c55e' : faceCount > 1 ? '#f59e0b' : '#ef4444';
  const faceStatusText =
    faceCount === -1 ? 'Loading AI model...' :
    faceCount === 1 ? '✓ Face detected' :
    faceCount === 0 ? '✗ No face detected — please position yourself in frame' :
    `⚠ ${faceCount} faces detected — only one person allowed`;

  const canProceed = permissionState === 'granted' && faceCount === 1;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'var(--background)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'var(--font-sans, sans-serif)',
      }}
    >
      {/* Ambient glow */}
      <div style={{
        position: 'fixed', top: '-5%', left: '-10%', width: '50vw', height: '500px',
        borderRadius: '50%', background: 'rgba(var(--primary-rgb, 99,102,241),0.15)',
        filter: 'blur(120px)', pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: '480px', width: '100%', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <img src="/logo.svg" alt="NextGen Logo" style={{ height: '36px', marginBottom: '20px' }} />
          <div style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.3em',
            textTransform: 'uppercase', color: 'var(--muted-foreground)', marginBottom: '8px',
          }}>
            Camera Verification Required
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--foreground)', margin: 0, lineHeight: 1.2 }}>
            Enable Your Camera
          </h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '13px', marginTop: '8px', lineHeight: 1.6 }}>
            This test requires camera access for identity verification. Your camera will be used for proctoring only.
          </p>
        </div>

        {/* Camera Preview Card */}
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}>
          {/* Video Preview */}
          <div style={{
            position: 'relative',
            background: '#0a0a0a',
            borderRadius: '8px',
            overflow: 'hidden',
            aspectRatio: '4/3',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {permissionState === 'granted' ? (
              <video
                ref={videoRef}
                muted
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
              />
            ) : (
              <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                {permissionState === 'requesting' && (
                  <>
                    <div style={{
                      width: '48px', height: '48px', border: '3px solid rgba(99,102,241,0.3)',
                      borderTop: '3px solid #6366f1', borderRadius: '50%',
                      animation: 'spin 1s linear infinite', margin: '0 auto 12px',
                    }} />
                    <p style={{ fontSize: '13px', margin: 0 }}>Requesting camera access...</p>
                  </>
                )}
                {permissionState === 'denied' && (
                  <>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>🚫</div>
                    <p style={{ fontSize: '13px', color: '#ef4444', margin: 0 }}>Camera access denied</p>
                  </>
                )}
                {permissionState === 'error' && (
                  <>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
                    <p style={{ fontSize: '13px', color: '#f59e0b', margin: 0 }}>Camera error. Please check your device.</p>
                  </>
                )}
              </div>
            )}

            {/* Face Detection Overlay Badge */}
            {permissionState === 'granted' && (
              <div style={{
                position: 'absolute', bottom: '10px', left: '10px', right: '10px',
                background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)',
                borderRadius: '6px', padding: '8px 12px',
                color: faceStatusColor, fontSize: '12px', fontWeight: 600,
                transition: 'color 0.3s ease',
              }}>
                {!isModelLoaded ? (
                  <span style={{ color: '#9ca3af' }}>⏳ Loading face detection AI...</span>
                ) : (
                  faceStatusText
                )}
              </div>
            )}
          </div>

          {/* Status indicators */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { label: 'Camera Access', ok: permissionState === 'granted' },
              { label: 'Face Detected', ok: faceCount === 1 },
              { label: 'Single Person', ok: faceCount === 1 },
            ].map(({ label, ok }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                  background: ok ? '#22c55e' : 'var(--muted-foreground)',
                  boxShadow: ok ? '0 0 8px rgba(34,197,94,0.5)' : 'none',
                  transition: 'all 0.3s ease',
                }} />
                <span style={{ fontSize: '13px', color: ok ? 'var(--foreground)' : 'var(--muted-foreground)' }}>
                  {label}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: ok ? '#22c55e' : 'var(--muted-foreground)' }}>
                  {ok ? '✓' : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        {permissionState === 'denied' || permissionState === 'error' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={requestCamera}
              style={{
                width: '100%', padding: '14px', borderRadius: '8px', border: 'none',
                background: 'var(--primary)', color: 'white',
                fontSize: '13px', fontWeight: 700, letterSpacing: '0.05em',
                cursor: 'pointer', textTransform: 'uppercase',
              }}
            >
              Retry Camera Access
            </button>
            <button
              onClick={() => setShowSkipWarning(true)}
              style={{
                width: '100%', padding: '12px', borderRadius: '8px',
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--muted-foreground)', fontSize: '12px', cursor: 'pointer',
              }}
            >
              Proceed without camera (violations will be flagged)
            </button>
          </div>
        ) : (
          <button
            onClick={handleProceed}
            disabled={!canProceed}
            style={{
              width: '100%', padding: '15px', borderRadius: '8px', border: 'none',
              background: canProceed ? 'var(--primary)' : 'var(--muted)',
              color: canProceed ? 'white' : 'var(--muted-foreground)',
              fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em',
              cursor: canProceed ? 'pointer' : 'not-allowed',
              textTransform: 'uppercase', transition: 'all 0.2s ease',
              boxShadow: canProceed ? '0 4px 24px rgba(var(--primary-rgb,99,102,241),0.35)' : 'none',
            }}
          >
            {canProceed ? "I'm Ready — Enter Test →" : 'Waiting for face detection...'}
          </button>
        )}

        <p style={{
          textAlign: 'center', marginTop: '16px', fontSize: '11px',
          color: 'var(--muted-foreground)', lineHeight: 1.5,
        }}>
          Your camera feed is used only for proctoring. No video is stored or recorded.
        </p>
      </div>

      {/* Skip Warning Modal */}
      {showSkipWarning && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }}>
          <div style={{
            background: 'var(--card)', border: '1px solid #ef4444',
            borderRadius: '12px', padding: '28px', maxWidth: '400px', width: '100%',
          }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>⚠️</div>
            <h3 style={{ margin: '0 0 12px', color: 'var(--foreground)', fontSize: '18px', fontWeight: 700 }}>
              Proceed Without Camera?
            </h3>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '13px', lineHeight: 1.6, margin: '0 0 24px' }}>
              A <strong style={{ color: '#ef4444' }}>camera_blocked</strong> violation will be recorded on your submission and the administrator will be notified. Your test will still proceed normally.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowSkipWarning(false)}
                style={{
                  flex: 1, padding: '12px', borderRadius: '8px',
                  border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--foreground)', fontSize: '13px', cursor: 'pointer', fontWeight: 600,
                }}
              >
                Go Back
              </button>
              <button
                onClick={handleSkipConfirm}
                style={{
                  flex: 1, padding: '12px', borderRadius: '8px', border: 'none',
                  background: '#ef4444', color: 'white',
                  fontSize: '13px', cursor: 'pointer', fontWeight: 700,
                }}
              >
                Proceed Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default CameraPermissionGate;
