# NextGen Assessment Systems Architecture

This document provides a high-level overview of the architecture and technical design of the NextGen Assessment Systems platform.

## 1. System Overview

NextGen Assessment Systems is a full-stack, scalable online coding and assessment platform. It is built to support high-concurrency "thundering herd" scenarios, enabling hundreds of students to submit assessments simultaneously with zero downtime.

The system uses a client-server architecture with a separate frontend SPA and a backend RESTful API.

## 2. Technology Stack

### Frontend (Client)
- **Framework:** React 19
- **Build Tool:** Vite
- **Styling:** Tailwind CSS v4
- **State Management:** Redux Toolkit
- **Animations:** Framer Motion
- **Code Editor:** Monaco Editor (Browser-based IDE)
- **Real-Time & Media:** Socket.IO Client, WebRTC (`RTCPeerConnection`), `face-api.js` (Client-side AI vision)

### Backend (Server)
- **Runtime:** Node.js
- **Framework:** Express.js
- **Real-Time Signaling:** Socket.IO (`socketService.js`)
- **Database:** MongoDB with Mongoose ODM
- **Caching & Rate Limiting:** ioredis (Redis)
- **Authentication:** JWT (JSON Web Tokens)

### External Services
- **Code Execution:** Judge0 (Secure remote execution for hidden test cases)
- **AI Analysis:** Groq API (AI assistance for test cases and logic evaluation)
- **Email:** SMTP (Nodemailer for OTP verification)

## 3. High-Level Architecture Diagram

### Flow Diagram
![Flow Diagram](./assets/flow_digram.png)

### CQRS Deployment Architecture
![CQRS Deployment Architecture](./assets/cqrs_deployment_architecture.png)

## 4. Key Architectural Patterns

### 4.1 Route Segregation & CQRS-like Pattern
The backend structure separates routes logically, adopting a CQRS (Command Query Responsibility Segregation) style for better maintainability:
- **Command Routes:** Handle state-changing operations (e.g., `adminCommandRoutes.js`, `testCommandRoutes.js`).
- **Query Routes:** Handle data fetching operations (e.g., `adminQueryRoutes.js`, `testQueryRoutes.js`).
- **Event Routes:** Handle event-driven architecture requirements (e.g., `eventRoutes.js`).

### 4.2 High-Concurrency Handling
To manage sudden spikes in traffic (especially when a timed test ends for all candidates simultaneously):
- **Jitter Timers:** The frontend introduces a randomized delay (jitter) between 0-15 seconds for final test auto-submissions to distribute backend load.
- **Save with Retry Logic:** `saveAnswerWithRetry` logic is implemented on the frontend to ensure temporary network blips do not cause data loss. Answers are frequently persisted on "Save & Next" operations.

### 4.3 State Recovery
- **Local Storage Fallbacks:** Along with API syncing, answers are stored in local storage to prevent data loss in the event of severe network failure.

### 4.4 Data Models
- **User / RegistrationUser:** Identity and verification lifecycle management.
- **Test:** Assessment configurations, questions, and constraints.
- **Submission:** Tracks candidate progress, code execution verdicts, and scores.
- **OTP:** Short-lived tokens for email verification.

### 4.5 Real-Time Camera Sync & WebRTC Proctoring Architecture
The platform incorporates peer-to-peer real-time video surveillance and candidate state sync:

1. **Client Camera Capture & AI Proctoring (`useCameraProctor`):**
   - The candidate's browser captures media streams via `navigator.mediaDevices.getUserMedia`.
   - On-device AI processing (`face-api.js`) periodically evaluates frames for head pose, missing candidate, or multiple faces without streaming video frames to the database, minimizing server CPU load.

2. **WebRTC Peer-to-Peer Video Stream (`useWebRTC` & `socketService`):**
   - When an Admin selects a student in the **Realtime Monitoring** panel to view their live feed:
     - The Admin emits a request via Socket.IO: `webrtc:request-feed`.
     - The target Candidate client receives the event and creates an `RTCPeerConnection`, generating an SDP **Offer**.
     - The Candidate sends `webrtc:offer` to the server, which relays it directly to the Admin's socket ID.
     - The Admin client sets the remote description and emits a `webrtc:answer`.
     - Both clients exchange ICE candidates via `webrtc:ice-candidate` to negotiate NAT traversal.
   - Once negotiated, the high-resolution camera feed streams **peer-to-peer directly between candidate and admin**, bypassing Node.js backend bandwidth bottlenecks.

3. **Resource-Optimized Scoping (`proctoringConfig`):**
   - All WebRTC socket signaling (`useProctorSocket`), media device capture (`getUserMedia`), and local AI model loading (`face-api.js`) are conditionally scoped to `proctoringConfig.cameraEnabled === true`.
   - If Camera Monitoring is disabled by an admin during test creation, candidates run standard non-video proctoring (`useProtecting`) with zero WebSocket or webcam overhead.

![WebRTC Real-Time Video Streaming Architecture](./assets/vedio_streaming.png)
