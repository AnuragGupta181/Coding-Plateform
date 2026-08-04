<div align="center">

<img src="./assets/logo.svg" alt="NextGen Logo" width="333" />

# NextGen

**A robust, full-stack hybrid coding and MCQ assessment platform built for online recruitment, technical evaluations, and real-time proctoring.**

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white)
![BullMQ](https://img.shields.io/badge/BullMQ-%23CC292B.svg?style=for-the-badge&logo=redis&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![Groq AI](https://img.shields.io/badge/Groq_AI-%23F05023.svg?style=for-the-badge&logo=openai&logoColor=white)

</div>

## 📌 Overview

This platform provides a comprehensive environment for conducting technical assessments, featuring both **Multiple Choice Questions (MCQ)** and **Coding Challenges**. Built with a focus on reliability, extreme performance under 500+ candidate concurrency, and security, it ensures a seamless candidate experience while providing administrators with powerful tools for test management, real-time WebRTC camera feeds, BullMQ queue execution board, and result auditing.

## ✨ Key Features

### 🛡️ Secure Proctoring & Real-Time Camera Sync
- **WebRTC Camera Streaming:** Low-latency peer-to-peer live camera sync allowing admins to request and view candidate webcams directly from the dashboard via Socket.IO signaling.
- **On-Device AI Vision Proctoring:** Client-side face detection using `face-api.js` for instant integrity alerts (multiple faces, missing candidate, out-of-frame detection).
- **Per-Assessment Proctoring Config:** Toggle Camera Monitoring on/off per test. When disabled, WebSockets, camera access, and AI model downloads are completely bypassed.
- **Independent Auto-Removal:** Option to automatically submit and evict candidates when total violations (tab switches, window blurs, camera blocks) exceed a custom admin-set threshold.
- **Violation Tracking:** Intelligent tab-switching, window blur, and fullscreen exit detection.
- **Auto-Submission:** Global countdown timer that strictly enforces assessment duration and auto-submits tests when time expires.

### 📝 Hybrid Testing Modules
- **Coding Arena:** Integrated `Monaco Editor` for a rich, IDE-like code writing experience.
- **MCQ Interface:** Optimized "Save on Next Button" HTTP architecture, avoiding heavy WebSocket overhead for better scalability.
- **Seamless Navigation:** Bidirectional flow between MCQ and Coding sections for hybrid tests.

### 📊 Admin Dashboard & Assessment Repository
- **Live Monitor:** Real-time WebRTC camera feed viewer and candidate status board.
- **BullMQ Execution Board:** Embedded Queue Board to inspect active worker jobs, code submission queues, and failure traces in real-time.
- **Assessment Management:** Edit test parameters on-the-fly (title, description, duration, proctoring violation limits) with live SSE candidate clock & limit sync.
- **Single & Bulk Deletion:** Delete individual tests or select multiple tests in the Assessment Repository with automated cascaded deletion of candidate submissions.
- **Groq AI Assistance:** Integrated AI assistant & experience analyzer with user-provided API key support.
- **Batch Uploading:** Bulk import questions using Excel (`.xlsx`) files.
- **Result Auditing:** Cohesive, mobile-first result cards providing a detailed candidate performance view.
- **Interactive Walkthrough:** Onboarding tour built with `react-joyride` guiding new admins through the platform.

---

## 🛠️ Technology Stack

### Frontend
- **Framework:** React 19 (Vite)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **State Management:** Redux Toolkit (`@reduxjs/toolkit`)
- **Code Editor:** Monaco Editor (`@monaco-editor/react`)
- **Real-Time & Video:** Socket.IO Client, WebRTC (`RTCPeerConnection`), `face-api.js`
- **Touring:** `react-joyride`

### Backend
- **Framework:** Node.js with Express.js
- **Queue & Async Job Processing:** BullMQ & Redis (`ioredis`)
- **Real-Time Signaling:** Socket.IO (`socketService.js`) & Server-Sent Events (SSE)
- **AI Integration:** Groq AI API (`@groq/sdk`)
- **Database:** MongoDB (Mongoose)
- **Authentication:** JSON Web Tokens (JWT) & bcryptjs
- **Execution Engine:** Judge0 (`docker-compose.judge0.prod.yml` / `docker-compose.judge0.dev.yml`)

---

## ⚙️ Local Development Setup

### Prerequisites
- Node.js (v18+)
- MongoDB (Local instance or MongoDB Atlas)
- Redis (Local instance or Upstash/Redis Cloud)
- pnpm / npm

### 1. Clone the repository
```bash
git clone <repository-url>
cd coding-platform
```

### 2. Backend Setup
```bash
cd Backend
pnpm install
cp .env.example .env
```
Update `Backend/.env` with your credentials:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_jwt_key
REDIS_URL=redis://localhost:6379
```
Start backend dev server:
```bash
pnpm run dev
```

### 3. Frontend Setup
```bash
cd frontend
pnpm install
pnpm run dev
```

---

## 🐳 Docker Orchestration Setup

We use a central `Makefile` to effortlessly orchestrate the NextGen Application and the Judge0 Execution Engine across different environments.

### 1. Prerequisites
Ensure Docker, Docker Compose, and `make` are installed.

### 2. Available Make Commands

Run `make help` in the root directory to see all available commands.

#### Full Environments (App + Judge0)
- **`make dev-up`**: Boots up the complete development stack (NextGen App + Judge0 Dev via `docker-compose.judge0.dev.yml`).
- **`make dev-down`**: Safely stops the development stack.
- **`make prod-up`**: Boots up the complete production stack (NextGen App + Judge0 Prod via `docker-compose.judge0.prod.yml`).
- **`make prod-down`**: Safely stops the production stack.

#### Individual Components
- **Main Application**: `make app-up` / `make app-down`
- **Judge0 Dev Environment**: `make judge0-dev-up` / `make judge0-dev-down`
- **Judge0 Prod Environment**: `make judge0-prod-up` / `make judge0-prod-down`

#### ⚡ Load Testing Suites
- **`make loadtest-500realtime`**: Launch 500 simultaneous concurrent candidates in an active exam simulation.
- **`make loadtest-500batch`**: Run a 500 candidate batch simulation.
- **`make loadtest-full`**: Execute the end-to-end full exam simulation scenario.
- **`make loadtest-realtime`**: Test realtime admin dashboard synchronization load.

#### Maintenance & Logs
- **View Logs (Real-time):** `make logs`
- **Wipe All Data (Destructive):** `make clean-all`
