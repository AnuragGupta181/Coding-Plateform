/**
 * useProctorSocket.ts
 *
 * Socket.IO client hook for WebRTC signaling and student presence registration.
 * Used by both student (test room) and admin (monitoring page).
 *
 * The socket is lazily connected and automatically cleaned up on unmount.
 */

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = (() => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  let base = import.meta.env.VITE_API_BASE_URL || '';
  if (base === '/api' && import.meta.env.DEV) {
    return 'http://localhost:5000';
  }
  // Strip /api suffix if present — Socket.IO connects to the server root
  return base.replace(/\/api\/?$/, '');
})();

interface UseProctorSocketOptions {
  role: 'student' | 'admin';
  testId: string | undefined;
  // Student-only props
  userId?: string;
  name?: string;
  email?: string;
  submissionId?: string | null;
  enabled?: boolean;
}

interface UseProctorSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
}

export default function useProctorSocket({
  role,
  testId,
  userId,
  name,
  email,
  submissionId,
  enabled = true,
}: UseProctorSocketOptions): UseProctorSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!testId || !enabled) return;

    const token = localStorage.getItem('token');

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);

      if (role === 'student' && userId) {
        socket.emit('student:register', { userId, testId, name, email, submissionId });
      } else if (role === 'admin') {
        socket.emit('admin:register', { testId });
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('Proctor socket connect error:', err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [testId, role, userId, name, email, submissionId, enabled]);

  return {
    socket: socketRef.current,
    isConnected,
  };
}
