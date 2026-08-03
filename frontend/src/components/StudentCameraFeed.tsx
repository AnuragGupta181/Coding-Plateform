import React, { useEffect, useRef } from 'react';
import useFaceDetection from '../hooks/useFaceDetection';

interface StudentCameraFeedProps {
  stream: MediaStream | null;
  isConnecting: boolean;
  studentName: string;
  studentEmail: string;
  onClose: () => void;
}

const StudentCameraFeed: React.FC<StudentCameraFeedProps> = ({
  stream,
  isConnecting,
  studentName,
  studentEmail,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  const { faceCount, isModelLoaded } = useFaceDetection({
    videoRef,
    enabled: !!stream,
    intervalMs: 1500,
  });

  const isMultipleFaces = faceCount > 1;
  const isNoFace = faceCount === 0 && isModelLoaded;

  const borderColor = isMultipleFaces
    ? '#ef4444'
    : isNoFace
    ? '#f59e0b'
    : faceCount === 1
    ? '#22c55e'
    : 'var(--border)';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
    }}>
      <div style={{
        background: 'var(--card)', borderRadius: '16px',
        border: `2px solid ${borderColor}`,
        overflow: 'hidden', maxWidth: '640px', width: '100%',
        boxShadow: `0 0 60px rgba(0,0,0,0.5), 0 0 0 1px ${borderColor}40`,
        transition: 'border-color 0.4s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--card)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: stream ? '#22c55e' : '#6b7280',
                boxShadow: stream ? '0 0 8px rgba(34,197,94,0.6)' : 'none',
                animation: stream ? 'pulse 2s ease-in-out infinite' : 'none',
              }} />
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>
                Live Feed
              </span>
            </div>
            <div style={{ fontWeight: 700, color: 'var(--foreground)', fontSize: '15px', marginTop: '2px' }}>
              {studentName}
            </div>
            <div style={{ color: 'var(--muted-foreground)', fontSize: '12px' }}>{studentEmail}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: '8px',
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--foreground)', cursor: 'pointer',
              fontSize: '12px', fontWeight: 600,
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* Video */}
        <div style={{
          position: 'relative', background: '#000', aspectRatio: '4/3',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isConnecting && (
            <div style={{ textAlign: 'center', color: '#9ca3af', position: 'absolute', zIndex: 2 }}>
              <div style={{
                width: '48px', height: '48px', border: '3px solid rgba(99,102,241,0.3)',
                borderTop: '3px solid #6366f1', borderRadius: '50%',
                animation: 'spin 1s linear infinite', margin: '0 auto 12px',
              }} />
              <div style={{ fontSize: '13px', fontWeight: 600 }}>Establishing P2P connection...</div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                This may take a few seconds
              </div>
            </div>
          )}
          <video
            ref={videoRef}
            muted
            playsInline
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              opacity: stream && !isConnecting ? 1 : 0.1,
              transition: 'opacity 0.5s ease',
            }}
          />

          {/* Face Detection Status Overlay */}
          {stream && !isConnecting && (
            <>
              {isMultipleFaces && (
                <div style={{
                  position: 'absolute', top: '12px', left: '12px',
                  background: 'rgba(239,68,68,0.9)', backdropFilter: 'blur(8px)',
                  borderRadius: '8px', padding: '8px 14px',
                  color: 'white', fontSize: '13px', fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: '6px',
                  animation: 'pulse 1s ease-in-out infinite',
                }}>
                  ⚠ {faceCount} FACES DETECTED
                </div>
              )}
              {isNoFace && (
                <div style={{
                  position: 'absolute', top: '12px', left: '12px',
                  background: 'rgba(245,158,11,0.9)', backdropFilter: 'blur(8px)',
                  borderRadius: '8px', padding: '8px 14px',
                  color: 'white', fontSize: '13px', fontWeight: 700,
                }}>
                  ⚠ NO FACE IN FRAME
                </div>
              )}
              <div style={{
                position: 'absolute', bottom: '12px', right: '12px',
                background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
                borderRadius: '6px', padding: '6px 10px',
                color: '#9ca3af', fontSize: '11px',
              }}>
                {isModelLoaded ? `${faceCount} face${faceCount !== 1 ? 's' : ''}` : 'Loading AI...'}
              </div>
            </>
          )}
        </div>

        {/* Status Bar */}
        <div style={{
          padding: '12px 20px',
          background: isMultipleFaces ? 'rgba(239,68,68,0.08)' : isNoFace ? 'rgba(245,158,11,0.08)' : 'transparent',
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: '8px',
          transition: 'background 0.4s ease',
        }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
            background: isMultipleFaces ? '#ef4444' : isNoFace ? '#f59e0b' : faceCount === 1 ? '#22c55e' : '#6b7280',
          }} />
          <span style={{ fontSize: '12px', color: 'var(--muted-foreground)', fontWeight: 500 }}>
            {!isModelLoaded ? 'Loading face detection model...' :
             isConnecting ? 'Connecting...' :
             isMultipleFaces ? `⚠ Multiple faces detected (${faceCount}) — violation logged` :
             isNoFace ? '⚠ No face in frame — may log violation' :
             faceCount === 1 ? '✓ One face detected — normal' :
             'Analyzing...'}
          </span>
        </div>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
      `}</style>
    </div>
  );
};

export default StudentCameraFeed;
