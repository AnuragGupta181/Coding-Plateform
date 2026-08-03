/**
 * socketService.js — Socket.IO Signaling & Presence Registry
 *
 * Responsibilities:
 *  1. WebRTC signaling relay (offer/answer/ICE) between student ↔ admin
 *  2. In-memory registry of connected students per test (for Admin monitoring grid)
 *  3. Admin socket management (multiple admins supported)
 *
 * Server load: ~1KB/s per student (signaling only). Video never passes through here.
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const config = require('../config');

// ── In-Memory Registries ──────────────────────────────────────────────────────
// Students currently connected in a test (for Admin monitoring grid)
// Map: testId → Map(userId → studentInfo)
const studentsByTest = new Map();

// Map: socketId → { userId, testId, name, email, submissionId, connectedAt }
const socketToStudent = new Map();

// Map: socketId → { testId, role: 'admin' }
const adminSockets = new Map();

// ── Exported Helpers ──────────────────────────────────────────────────────────
/**
 * Returns the list of currently-connected students for a given testId.
 * Used by proctorController to serve the admin monitoring grid.
 */
function getStudentsInTest(testId) {
  const map = studentsByTest.get(testId);
  if (!map) return [];
  return Array.from(map.values());
}

exports.getStudentsInTest = getStudentsInTest;

function isAdminSocketForTest(socketId, testId) {
  const admin = adminSockets.get(socketId);
  return !!admin && admin.role === 'admin' && admin.testId === testId;
}

exports.isAdminSocketForTest = isAdminSocketForTest;

// ── Socket.IO Init ────────────────────────────────────────────────────────────
/**
 * Call this once after the Express server starts.
 * @param {import('http').Server} httpServer
 * @param {string[]} corsOrigins
 */
exports.init = (httpServer, corsOrigins) => {
  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigins.length > 0 ? corsOrigins : true,
      credentials: true,
    },
    // Prefer WebSocket, fall back to polling — works through most proxies
    transports: ['websocket', 'polling'],
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, config.jwtSecret);
      const user = await User.findById(decoded.id).select('name email role');
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {

    // ── Student Registration ───────────────────────────────────────────────
    // Student sends this immediately after connecting to the test room
    socket.on('student:register', ({ userId, testId, name, email, submissionId }) => {
      if (!testId || !userId) return;
      if (socket.user?.role !== 'candidate') return;
      if (email && socket.user.email && email.toLowerCase() !== socket.user.email.toLowerCase()) return;

      const info = {
        userId,
        testId,
        name: name || 'Candidate',
        email: email || '',
        submissionId: submissionId || null,
        socketId: socket.id,
        connectedAt: new Date().toISOString(),
        cameraActive: false,
      };

      socketToStudent.set(socket.id, info);

      if (!studentsByTest.has(testId)) {
        studentsByTest.set(testId, new Map());
      }
      studentsByTest.get(testId).set(userId, info);

      socket.join(`test:${testId}`);
      console.log(`📷 Student registered for proctoring: ${name} (test: ${testId})`);
    });

    // ── Student: camera is now active ─────────────────────────────────────
    socket.on('student:camera-ready', ({ testId, userId }) => {
      const info = socketToStudent.get(socket.id);
      if (!info || info.testId !== testId || info.userId !== userId) return;

      const testMap = studentsByTest.get(testId);
      if (testMap && testMap.has(userId)) {
        testMap.get(userId).cameraActive = true;
      }
      if (info) info.cameraActive = true;
    });

    // ── Admin Registration ─────────────────────────────────────────────────
    socket.on('admin:register', ({ testId }) => {
      if (!testId) return;
      if (socket.user?.role !== 'admin') return;
      adminSockets.set(socket.id, { testId, role: 'admin' });
      socket.join(`admin:${testId}`);
      console.log(`👀 Admin monitoring socket registered (test: ${testId})`);
    });

    // ── WebRTC Signaling ───────────────────────────────────────────────────
    // Admin requests feed from a specific student
    socket.on('admin:request-feed', ({ targetUserId, testId }) => {
      if (!isAdminSocketForTest(socket.id, testId)) return;

      const testMap = studentsByTest.get(testId);
      if (!testMap) return;

      const student = testMap.get(targetUserId);
      if (!student) return;

      // Forward request to the specific student's socket
      io.to(student.socketId).emit('proctor:request-feed', {
        adminSocketId: socket.id,
      });
    });

    // Student sends WebRTC offer → relay to admin
    socket.on('webrtc:offer', ({ adminSocketId, offer }) => {
      const student = socketToStudent.get(socket.id);
      if (!student || !isAdminSocketForTest(adminSocketId, student.testId)) return;

      io.to(adminSocketId).emit('webrtc:offer', {
        studentSocketId: socket.id,
        offer,
      });
    });

    // Admin sends WebRTC answer → relay to student
    socket.on('webrtc:answer', ({ studentSocketId, answer }) => {
      const student = socketToStudent.get(studentSocketId);
      if (!student || !isAdminSocketForTest(socket.id, student.testId)) return;

      io.to(studentSocketId).emit('webrtc:answer', { answer });
    });

    // ICE candidate relay (both directions)
    socket.on('webrtc:ice-candidate', ({ targetSocketId, candidate }) => {
      const senderStudent = socketToStudent.get(socket.id);
      const targetStudent = socketToStudent.get(targetSocketId);

      if (senderStudent && !isAdminSocketForTest(targetSocketId, senderStudent.testId)) return;
      if (targetStudent && !isAdminSocketForTest(socket.id, targetStudent.testId)) return;
      if (!senderStudent && !targetStudent) return;

      io.to(targetSocketId).emit('webrtc:ice-candidate', { candidate });
    });

    // Admin ends the feed
    socket.on('admin:end-feed', ({ studentSocketId }) => {
      const student = socketToStudent.get(studentSocketId);
      if (!student || !isAdminSocketForTest(socket.id, student.testId)) return;

      io.to(studentSocketId).emit('proctor:end-feed');
    });

    // ── Disconnect ─────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const studentInfo = socketToStudent.get(socket.id);
      if (studentInfo) {
        const { testId, userId } = studentInfo;
        const testMap = studentsByTest.get(testId);
        if (testMap) {
          testMap.delete(userId);
          if (testMap.size === 0) studentsByTest.delete(testId);
        }
        socketToStudent.delete(socket.id);
        console.log(`📷 Student disconnected from proctoring: ${studentInfo.name}`);
      }

      if (adminSockets.has(socket.id)) {
        adminSockets.delete(socket.id);
      }
    });
  });

  console.log('✅ Socket.IO proctoring service initialized');
  return io;
};
