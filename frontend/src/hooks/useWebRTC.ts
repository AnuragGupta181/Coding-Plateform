/**
 * useWebRTC.ts
 *
 * WebRTC hook for the ADMIN side — requests a live camera feed from a specific student.
 * The student side handling (responding to proctor:request-feed) is in useCameraProctor.ts.
 *
 * Usage:
 *   const { remoteStream, isConnected, requestFeed, endFeed } = useWebRTC({ socket });
 *
 * Flow:
 *   1. Admin calls requestFeed(targetUserId, testId)
 *   2. Server relays to student's socket
 *   3. Student creates RTCPeerConnection, sends offer via socket
 *   4. Admin receives offer, creates answer, sends it back
 *   5. ICE candidates are exchanged
 *   6. Video stream flows directly P2P (no server relay)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Socket } from 'socket.io-client';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
];

interface UseWebRTCOptions {
  socket: Socket | null;
}

interface UseWebRTCReturn {
  remoteStream: MediaStream | null;
  isConnected: boolean;
  isConnecting: boolean;
  requestFeed: (targetUserId: string, testId: string) => void;
  endFeed: () => void;
  activeStudentSocketId: string | null;
}

export default function useWebRTC({ socket }: UseWebRTCOptions): UseWebRTCReturn {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [activeStudentSocketId, setActiveStudentSocketId] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);

  const cleanup = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setRemoteStream(null);
    setIsConnected(false);
    setIsConnecting(false);
    setActiveStudentSocketId(null);
  }, []);

  const requestFeed = useCallback((targetUserId: string, testId: string) => {
    if (!socket) return;
    cleanup();
    setIsConnecting(true);
    socket.emit('admin:request-feed', { targetUserId, testId });
  }, [socket, cleanup]);

  const endFeed = useCallback(() => {
    if (socket && activeStudentSocketId) {
      socket.emit('admin:end-feed', { studentSocketId: activeStudentSocketId });
    }
    cleanup();
  }, [socket, activeStudentSocketId, cleanup]);

  useEffect(() => {
    if (!socket) return;

    // Admin receives offer from student → create answer
    const handleOffer = async ({ studentSocketId, offer }: { studentSocketId: string; offer: RTCSessionDescriptionInit }) => {
      setActiveStudentSocketId(studentSocketId);

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      pc.ontrack = (event) => {
        if (event.streams[0]) {
          setRemoteStream(event.streams[0]);
          setIsConnected(true);
          setIsConnecting(false);
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc:ice-candidate', {
            targetSocketId: studentSocketId,
            candidate: event.candidate,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          cleanup();
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('webrtc:answer', { studentSocketId, answer });
    };

    // ICE candidates from student
    const handleIceCandidate = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      if (pcRef.current && candidate) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      }
    };

    socket.on('webrtc:offer', handleOffer);
    socket.on('webrtc:ice-candidate', handleIceCandidate);

    return () => {
      socket.off('webrtc:offer', handleOffer);
      socket.off('webrtc:ice-candidate', handleIceCandidate);
    };
  }, [socket, cleanup]);

  // Cleanup on unmount
  useEffect(() => () => cleanup(), [cleanup]);

  return { remoteStream, isConnected, isConnecting, requestFeed, endFeed, activeStudentSocketId };
}
