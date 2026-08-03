/**
 * useCameraProctor.ts
 *
 * Student-side camera proctoring hook. Runs silently in the background during a test.
 *
 * Responsibilities:
 *  1. Opens front camera stream (no UI indicator to student)
 *  2. Runs face-api.js every 2s via useFaceDetection
 *  3. Logs violations to the existing logViolation API:
 *       - camera_multiple_faces (2+ faces detected)
 *       - camera_no_face (0 faces for > NO_FACE_THRESHOLD_MS)
 *       - camera_blocked (permission denied)
 *  4. Listens to Socket.IO for admin WebRTC feed requests → creates WebRTC offer
 *  5. Cleans up stream on unmount
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import useFaceDetection from './useFaceDetection';
import testService from '../utils/apiService';

const NO_FACE_THRESHOLD_MS = 12000; // 12 seconds without a face = violation
const VIOLATION_COOLDOWN_MS = 30000; // 30 seconds between same-type violations

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
];

interface UseCameraProctorOptions {
  submissionId: string | null;
  testId: string | undefined;
  socket: Socket | null;
  enabled: boolean;
  adminRequest?: { adminSocketId: string } | null;
}

interface UseCameraProctorReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraStatus: 'idle' | 'loading' | 'active' | 'denied' | 'error';
  faceCount: number;
  cameraViolationCount: number;
}

export default function useCameraProctor({
  submissionId,
  testId,
  socket,
  enabled,
  adminRequest,
}: UseCameraProctorOptions): UseCameraProctorReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  const [cameraStatus, setCameraStatus] = useState<UseCameraProctorReturn['cameraStatus']>('idle');
  const [cameraViolationCount, setCameraViolationCount] = useState(0);

  // Cooldown tracking per violation type
  const lastViolationTimeRef = useRef<Record<string, number>>({});
  const noFaceStartRef = useRef<number | null>(null);

  // ── Camera Startup ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setCameraStatus('loading');

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: 320, height: 240 }, audio: false })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setCameraStatus('active');

        // Tell the server this student's camera is live
        if (socket) {
          socket.emit('student:camera-ready', {
            testId,
            userId: submissionId || '',
          });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('Camera access denied/error:', err.message);
        setCameraStatus(err.name === 'NotAllowedError' ? 'denied' : 'error');
        // Log camera_blocked violation
        reportViolation('camera_blocked');
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cleanup stream on unmount or disable ────────────────────────────────────
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      pcRef.current?.close();
      pcRef.current = null;
    };
  }, []);

  // ── Violation Reporter ──────────────────────────────────────────────────────
  const reportViolation = useCallback((type: string) => {
    const now = Date.now();
    const lastTime = lastViolationTimeRef.current[type] || 0;
    if (now - lastTime < VIOLATION_COOLDOWN_MS) return; // cooldown active
    lastViolationTimeRef.current[type] = now;

    setCameraViolationCount((c) => c + 1);

    if (submissionId) {
      testService.logViolation(submissionId, {
        type: type as any,
        timestamp: now,
        count: 1,
      }).catch(() => {});
    }
  }, [submissionId]);

  // ── Face Detection ──────────────────────────────────────────────────────────
  const handleFaceCountChange = useCallback((count: number) => {
    if (count >= 2) {
      noFaceStartRef.current = null;
      reportViolation('camera_multiple_faces');
    } else if (count === 0) {
      if (noFaceStartRef.current === null) {
        noFaceStartRef.current = Date.now();
      } else if (Date.now() - noFaceStartRef.current > NO_FACE_THRESHOLD_MS) {
        reportViolation('camera_no_face');
        noFaceStartRef.current = Date.now(); // Reset so it doesn't spam
      }
    } else {
      // Exactly 1 face — all good
      noFaceStartRef.current = null;
    }
  }, [reportViolation]);

  const { faceCount } = useFaceDetection({
    videoRef,
    enabled: enabled && cameraStatus === 'active',
    intervalMs: 2000,
    onFaceCountChange: handleFaceCountChange,
  });

  // ── WebRTC: Respond to Admin Feed Request ───────────────────────────────────
  useEffect(() => {
    console.debug('useCameraProctor adminRequest changed', adminRequest);
    if (!socket || !adminRequest) {
      pcRef.current?.close();
      pcRef.current = null;
      return;
    }

    const initFeed = async () => {
      const stream = streamRef.current;
      if (!stream) {
        console.warn('useCameraProctor cannot init feed, no stream available');
        return;
      }

      // Clean up any existing peer connection
      pcRef.current?.close();

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      // Add all camera tracks to the peer connection
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc:ice-candidate', {
            targetSocketId: adminRequest.adminSocketId,
            candidate: event.candidate,
          });
        }
      };

      console.debug('useCameraProctor creating offer for admin', adminRequest.adminSocketId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc:offer', { adminSocketId: adminRequest.adminSocketId, offer });
    };

    initFeed();

    const handleAnswer = async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      console.debug('useCameraProctor received answer');
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer)).catch(() => {});
      }
    };

    const handleIceCandidate = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      if (pcRef.current && candidate) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      }
    };

    socket.on('webrtc:answer', handleAnswer);
    socket.on('webrtc:ice-candidate', handleIceCandidate);

    return () => {
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:ice-candidate', handleIceCandidate);
    };
  }, [socket, adminRequest, cameraStatus]);

  return { videoRef, cameraStatus, faceCount, cameraViolationCount };
}
