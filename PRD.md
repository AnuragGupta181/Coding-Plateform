# Product Requirements Document (PRD)

**Project Name:** NextGen Assessment Systems  
**Document Version:** 1.2  
**Primary Platform:** Web (Desktop & Mobile Responsive)  

---

## 1. Executive Summary
NextGen Assessment Systems is a highly scalable, full-stack online coding and assessment platform. It is engineered to seamlessly handle high-concurrency "thundering herd" scenarios where hundreds of students submit technical assessments simultaneously. The platform supports Multiple-Choice Questions (MCQs), live Coding Challenges, auto-grading, real-time WebRTC camera video proctoring, real-time leaderboards, and AI-assisted analysis, all wrapped in a premium, glassmorphic dark-mode UI.

---

## 2. Target Audience & Personas
- **Administrators / Technical Recruiters:** Users who draft assessments, manage student pools, upload bulk questions via Excel, watch live WebRTC candidate camera streams, and review detailed results.
- **Candidates / Students:** Users participating in technical assessments who require a robust, disruption-free, and accessible testing environment with on-device camera proctoring.

---

## 3. Key Features & Requirements

### 3.1 Authentication & Role-Based Access Control (RBAC)
- **Roles:** Admin, Candidate.
- **Flow:** Secure user registration, OTP verification via email (Nodemailer/Redis), and login.
- **Routing:** Post-login, Admins are routed to `/admin`, and Candidates to `/dashboard`.

### 3.2 Administrator Dashboard
- **Test Authoring:** GUI to draft MCQ, Coding, or Mixed assessments.
- **Real-Time Monitoring:** WebRTC peer-to-peer live camera feed request and inspection for active candidates.
- **Global Settings:** Configurable test duration, titles, descriptions, and point distribution.
- **Bulk Upload:** Excel parser to rapidly import questions into drafts.
- **Coding Question Configurator:** Define parameters, constraints, and hidden/public test cases (stdin/stdout) for automated evaluation.
- **AI Integration:** Embedded AI Chat (Groq API) for assistance in generating test cases or evaluating complex candidate logic.
- **Interactive Tour:** `react-joyride` onboarding tutorial for first-time admins.

### 3.3 Assessment Environment (Candidate Experience)
- **High-Concurrency Support:** "Jitter" timers and `saveAnswerWithRetry` logic to prevent backend overload during synchronized test ends.
- **State Recovery & Persistence:** A 'Save on Next Button' HTTP approach to persist answers frequently, combined with local storage fallbacks to prevent data loss on network failure.
- **Real-Time WebRTC Camera Sync & On-Device AI Video Proctoring:**
  - Candidate camera captured via WebRTC (`RTCPeerConnection`).
  - Socket.IO signaling relay (`webrtc:offer`, `webrtc:answer`, `webrtc:ice-candidate`) for low-latency peer-to-peer camera streaming to admins.
  - On-device client-side face detection using `face-api.js` for instant integrity alerts (multiple faces, missing candidate, out-of-frame detection).
- **Proctoring (Basic):** Detection and logging of tab-switching, window blurring, and exiting full-screen mode.
- **Integrated Code Editor:** Browser-based IDE (Monaco Editor) supporting Python, JavaScript, C++, and Java.
- **Auto-Grading Engine:** Integration with Judge0 for secure remote execution of candidate code against hidden test cases.

### 3.4 Premium User Interface
- **Design System:** Minimalist luxury aesthetic with violet/emerald gradient accents, glassmorphic containers, and full light/dark mode support.
- **Experience:** 100vh constraint for a scroll-free, app-like feel on the primary test interface.

---

## 4. Technical Architecture

### 4.1 Technology Stack
- **Frontend:** React 19, Vite, Tailwind CSS v4, Redux Toolkit, Framer Motion, Monaco Editor, Socket.IO Client, WebRTC, `face-api.js`, `react-joyride`.
- **Backend:** Node.js, Express.js, MongoDB (Mongoose), Socket.IO (`socketService.js`), ioredis, JWT.
- **External Services:** Judge0 (Code Execution via `docker-compose.judge0.prod.yml` / `docker-compose.judge0.dev.yml`), Groq API (AI Analysis), SMTP (Email OTPs).
- **Infrastructure & Orchestration:** Centralized `Makefile`, Docker Compose, CI/CD via GitHub Actions.

### 4.2 Core Data Models
- **User:** Manages identities, roles, and verification status.
- **RegistrationUser:** Temporary storage for users during the registration and OTP verification process.
- **Test:** Stores assessment metadata, MCQs, Coding Questions, and nested Test Cases.
- **Submission:** Tracks candidate answers, coding execution verdicts, total scores, and violation logs.
- **OTP:** Temporary storage for email verification.

---

## 5. Folder Structure
The repository is structured as a monorepo containing frontend, backend, docker configurations, and a consolidated root load-testing framework.

```text
/
├── Backend/
│   ├── config.js               # Environment variables and core config
│   ├── index.js                # Express app entry point
│   ├── controllers/            # Route business logic (auth, admin, code, event, etc.)
│   ├── middleware/             # Auth checks (JWT) and file upload handling
│   ├── models/                 # Mongoose schemas (User, RegistrationUser, Test, Submission, OTP)
│   ├── routes/                 # Express route definitions (CQRS pattern: command/query routes, eventRoutes)
│   └── services/               # External integrations (Judge0, Email, Excel, Redis, SocketService)
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx             # Main router and global layout
│   │   ├── index.css           # Tailwind configuration and CSS variables
│   │   ├── components/         # Reusable UI elements (common, auth, coding, admin, AdminTour)
│   │   ├── hooks/              # Custom React hooks (useCountdownTimer, useProctoring, useWebRTC, useCameraProctor)
│   │   ├── pages/              # Route components (Admin/, Auth/, Login, CreateTest, TestRoom, etc.)
│   │   └── utils/              # API interceptors and retry logic
│   ├── package.json
│   └── vite.config.ts
│
├── load_testing/               # Root load testing framework (SOLID architecture & scenarios)
│   ├── core/                   # Shared auth, config, and runner utilities
│   ├── scenarios/              # Individual test scenarios (auth, fetch, submit, judge0, realtime)
│   ├── workflows/              # 500 active candidate & batch simulation scripts
│   └── package.json
│
├── docker-compose.judge0.dev.yml   # Judge0 dev environment setup
├── docker-compose.judge0.prod.yml  # Judge0 prod environment setup
├── docker-compose.yml              # Main application compose configuration
└── Makefile                        # Central orchestration & load testing commands
```

---

## 6. Testing Scenarios & QA Guidance
Core flows to validate:

**Auth & Access:**
1. Verify that candidates cannot access `/admin` routes.
2. Verify that expired JWT tokens automatically log the user out.

**Admin Flows:**
3. Verify that uploading a malformed Excel file throws a graceful error.
4. Verify that adding a coding question requires at least one test case.
5. Verify that new admins see the `react-joyride` onboarding tour upon visiting `/admin`.

**Real-Time WebRTC Camera Sync & Proctoring:**
6. Verify that an admin requesting a student live feed initiates Socket.IO WebRTC offer/answer negotiation.
7. Verify that the video stream flows P2P directly to the admin live monitoring panel.

**Candidate Test Experience:**
8. Verify that answers are persisted when clicking "Next" (check Network tab).
9. Verify the "Jitter" auto-submit: when the timer hits zero, the UI should lock instantly, but the network request should delay randomly between 0-15 seconds.
10. Verify Proctoring: switching tabs should increment the violation count and auto-submit the test if the maximum threshold is reached.

**Code Execution:**
11. Verify that infinite loops submitted in the code editor time out gracefully (Judge0 timeout).
12. Verify that a candidate receives points only if their code passes all hidden test cases.
