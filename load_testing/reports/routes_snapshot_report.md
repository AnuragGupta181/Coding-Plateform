# Baseline Route Snapshot & Command/Query Architecture Report

**Date:** 2026-07-23  
**Location:** `Backend/load-testing/routes_snapshot_report.md`  
**Purpose:** Pre-merge snapshot analysis of all backend and frontend routes, documenting current GET (Query) vs POST (Command) behavior, route inventory, state management, and ALB separation readiness.

---

## 1. Executive Summary & Architectural Context

### Purpose of this Report
This document provides a pre-merge baseline analysis of all application routes across both the backend and frontend. The user's team is deploying an **AWS Application Load Balancer (ALB)** to separate read operations (**Query routes / GET requests**) from write/mutation operations (**Command routes / POST, PUT, DELETE requests**).

Before merging the pull request, this snapshot documents:
1. Complete inventory of all existing backend API routes categorized as **Query** (GET) or **Command** (POST).
2. Frontend page routes and API service integration patterns (`apiService.ts`, headers, auth interceptors).
3. SSE (Server-Sent Events) streaming routes and long-running execution handlers.
4. Specific architectural considerations, risks, and verification steps required after merging the PR.

---

## 2. Backend Route Inventory & Command/Query Classification

### A. Auth Routes (`/api/auth`)
*Base Path:* `/api/auth`  
*Controller:* `authControllerRedis.js`

| Route Path | HTTP Method | Type | Auth Required | Cache / DB Operation | Description |
|---|---|---|---|---|---|
| `/api/auth/signup` | `POST` | **Command** | Public | Redis (OTP creation, 10m TTL), Mongo (User check) | Validates user details, hashes password candidate, generates and caches OTP in Redis. |
| `/api/auth/verify` | `POST` | **Command** | Public | Redis (OTP verify), Mongo (User creation) | Verifies OTP against Redis hash; creates and saves new verified User document in Mongo. |
| `/api/auth/resend-otp` | `POST` | **Command** | Public | Redis (OTP rate limit check) | Throttles and generates a new OTP, updating Redis. |
| `/api/auth/login` | `POST` | **Command** | Public | Mongo (User lookup) | Validates credentials, issues JWT token and user info. |
| `/api/auth/forgot-password` | `POST` | **Command** | Public | Redis (Reset OTP) | Generates reset OTP and caches in Redis. |
| `/api/auth/reset-password` | `POST` | **Command** | Public | Redis (Verify OTP), Mongo (Update password) | Verifies OTP and updates user's hashed password in Mongo. |

---

### B. Student Test & Submission Routes (`/api`)
*Base Path:* `/api`  
*Controller:* `testController.js`

| Route Path | HTTP Method | Type | Auth Required | Cache / DB Operation | Description |
|---|---|---|---|---|---|
| `/api/tests/available` | `GET` | **Query** | Optional/Public | **Redis Cached** (`tests:available`) | Returns list of currently active and upcoming tests. Cached in Redis for performance under heavy candidate traffic. |
| `/api/test/:id` | `GET` | **Query** | Optional/Public | **Redis Cached** (`test:<id>`) | Returns full test structure (MCQ questions, options, instructions). Cached in Redis. |
| `/api/submissions/me` | `GET` | **Query** | Candidate Token | Mongo Query | Retrieves active or completed submission state for the logged-in candidate. Uses `?email=` & timestamp query params. |
| `/api/submission/start` | `POST` | **Command** | Candidate Token | Mongo Atomic Upsert | Starts candidate submission atomically using compound index `(candidateEmail, testId)` to prevent duplicate submissions. |
| `/api/submission/:submissionId/save-answer` | `POST` | **Command** | Candidate Token | Mongo Atomic `$set` | Saves candidate's answer for an MCQ question atomically (`answers.<questionId>`). Highly optimized for concurrency. |
| `/api/submission/:submissionId/clear-answer` | `POST` | **Command** | Candidate Token | Mongo Atomic `$unset` | Removes candidate answer choice for an MCQ question. |
| `/api/submission/:submissionId/complete` | `POST` | **Command** | Candidate Token | Mongo Score Calculation & Status Update | Finalizes MCQ submission, computes score, marks status as `COMPLETED`. |
| `/api/submission/:submissionId/log-violation` | `POST` | **Command** | Candidate Token | Mongo `$push` | Appends anti-cheating violations (tab switch, window blur, full-screen exit) to submission record. |

---

### C. Admin Management Routes (`/api/admin`)
*Base Path:* `/api/admin`  
*Middlewares:* `requireAuth`, `requireAdmin`  
*Controller:* `adminController.js`

| Route Path | HTTP Method | Type | Auth Required | Cache / DB Operation | Description |
|---|---|---|---|---|---|
| `/api/admin/tests/history` | `GET` | **Query** | Admin | Mongo Query | Lists past and current tests with aggregated submission counts. |
| `/api/admin/tests/queues` | `GET` | **Query** | Admin | Mongo Query | Retrieves waiting room counts and queue states across active tests. |
| `/api/admin/test/:id/results` | `GET` | **Query** | Admin | Mongo Query / Aggregation | Fetches detailed results breakdown for all candidates in a specific test. |
| `/api/admin/submission/:id` | `GET` | **Query** | Admin | Mongo Lookup | Fetches full candidate response log, violation history, and score details. |
| `/api/admin/test` | `POST` | **Command** | Admin | Mongo Write + **Redis Invalidation** | Creates new test document. Clears `tests:available` Redis cache. |
| `/api/admin/test/:id/open-waiting-room` | `POST` | **Command** | Admin | Mongo Update + **Redis Invalidation** | Changes test state to WAITING_ROOM. Invalidate test cache. |
| `/api/admin/test/:id/start` | `POST` | **Command** | Admin | Mongo Update + **Redis Invalidation** | Starts test execution. Invalidate test cache. |
| `/api/admin/test/:id/complete` | `POST` | **Command** | Admin | Mongo Update + **Redis Invalidation** | Force-completes test for all active candidates. |
| `/api/admin/test/:id/auto-submit` | `POST` | **Command** | Admin | Mongo Bulk Write | Triggered auto-submit for all unsubmitted candidate tests. |
| `/api/admin/parse-questions` | `POST` | **Command** | Admin | File Stream / In-Memory Parse | Parses uploaded Excel/CSV question files (no DB write, returns parsed array for frontend preview). |
| `/api/admin/test/:id/coding-question` | `POST` | **Command** | Admin | Mongo `$push` + **Redis Invalidation** | Adds coding problem definition and test cases to an existing test. |

---

### D. Code Execution & AI Routes (`/api/code`)
*Base Path:* `/api/code`  
*Middleware:* `requireAuth`  
*Controller:* `codeController.js`

| Route Path | HTTP Method | Type | Auth Required | Execution / DB Operation | Description |
|---|---|---|---|---|---|
| `/api/code/run` | `POST` | **Command** | Auth User | External Executor (Piston API / Docker) | Executes candidate code against custom stdin input. Unscored playground execution. |
| `/api/code/submit/:testId/:questionId` | `POST` | **Command** | Auth User | External Executor + Mongo Update | Evaluates candidate code against hidden test cases. Saves score to `codingAnswers`. |
| `/api/code/analyze` | `POST` | **Command** | Auth User | AI Service (Groq API) | Analyzes candidate code for time/space complexity and logic flaws. |
| `/api/code/chat` | `POST` | **Command** | Auth User | AI Service (Groq API) | Interactive AI coding assistant for problem clarification during tests. |

---

### E. Event Stream & Real-time Routes (`/api/events`)
*Base Path:* `/api/events`  
*Controller:* `eventController.js`

| Route Path | HTTP Method | Type | Special Considerations | Description |
|---|---|---|---|---|
| `/api/events/test/:testId` | `GET` | **Query (SSE)** | Long-lived HTTP Stream (`text/event-stream`), Compression disabled, Rate limited | Real-time Server-Sent Events stream for waiting room status updates and test start notifications. |

---

### F. System & Infrastructure Routes

| Route Path | HTTP Method | Type | Handler | Description |
|---|---|---|---|---|
| `/health` | `GET` | **Query** | Inline Express Handler | Server health check (returns status, uptime, heap usage, memory RSS). |
| `/api/cron/complete-expired-tests` | `GET` | **Query/Command** | Cron Handler | Triggered by Vercel Cron to process expired tests. Uses `CRON_SECRET` authorization header. |

---

## 3. Frontend Route & Service Integration Architecture

### A. Client Page Routes (`src/App.tsx`)

| React Route | Access Level | Component | Backend Operations Triggered |
|---|---|---|---|
| `/` | Public | `Home.tsx` | None |
| `/signup` | Public | `Signup.tsx` | `POST /api/auth/signup` |
| `/verify` | Public | `VerifyOTP.tsx` | `POST /api/auth/verify`, `POST /api/auth/resend-otp` |
| `/login` | Public | `Login.tsx` | `POST /api/auth/login` |
| `/forgot-password` | Public | `ForgotPassword.tsx` | `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` |
| `/dashboard` | Protected (Candidate) | `Dashboard.tsx` | `GET /api/tests/available`, `GET /api/submissions/me` |
| `/test/wait/:id` | Protected (Candidate) | `WaitingRoom.tsx` | `GET /api/test/:id`, `GET /api/events/test/:id` (SSE) |
| `/test/:id` | Protected (Candidate) | `TestRoom.tsx` | `POST /api/submission/start`, `POST /api/submission/:id/save-answer`, `POST /api/submission/:id/complete` |
| `/coding-test/:id` | Protected (Candidate) | `CodingTestRoom.tsx` | `POST /api/code/run`, `POST /api/code/submit/...`, `POST /api/code/analyze` |
| `/admin` | Admin Only | `AdminDashboard.tsx` | `GET /api/admin/tests/history`, `GET /api/admin/tests/queues` |
| `/admin/create-test` | Admin Only | `CreateTest.tsx` | `POST /api/admin/test`, `POST /api/admin/parse-questions` |
| `/admin/test/:testId/coding-questions` | Admin Only | `CreateCodingQuestion.tsx` | `POST /api/admin/test/:testId/coding-question` |
| `/admin/results/:testId` | Admin Only | `ResultsList.tsx` | `GET /api/admin/test/:testId/results` |
| `/admin/submission/:subId` | Admin Only | `DetailedResult.tsx` | `GET /api/admin/submission/:subId` |

---

### B. Frontend Network & Sync Safeguards (`src/utils`)
1. **API Service (`apiService.ts`):** Single Axios instance with `VITE_API_BASE_URL` base configuration and JWT Bearer token request interceptor.
2. **Failed Answer Retries (`saveAnswerWithRetry.ts`):** Automatically retries failed `POST /save-answer` requests using exponential backoff.
3. **Session Storage Fallback (`testSessionStorage.ts`):** If network calls fail repeatedly, MCQ answers are stored in browser `sessionStorage` under `pendingSync`. The frontend automatically flushes pending answers before navigating to coding questions or submitting the test.

---

## 4. ALB Command/Query Architecture Analysis & Pre-Merge Evaluation

### AWS ALB HTTP Method Routing Concept
When deploying an AWS Application Load Balancer in front of backend servers, routing can be configured using:
1. **HTTP Method Listener Rules:**
   - Rule 1: `HTTP Method is GET` $\rightarrow$ Target Group 1 (**Query Backend Instances**)
   - Rule 2: `HTTP Method is POST, PUT, DELETE, PATCH` $\rightarrow$ Target Group 2 (**Command Backend Instances**)
2. **Path-Based Routing:**
   - Rules based on `/api/tests/*` vs `/api/submission/*` vs `/api/auth/*`.

### Crucial Technical Verification Items for PR Merge

When inspecting the friend's pull request in Phase 2, the following technical critical points MUST be verified:

#### 1. CORS & HTTP OPTIONS Requests (Preflight)
* **Risk:** Browsers send an HTTP `OPTIONS` preflight request before non-simple `POST` requests or requests with custom headers (`Authorization: Bearer <token>`).
* **Requirement:** If ALB routes strictly by HTTP Method, `OPTIONS` requests will fail unless ALB either:
  * Routes `OPTIONS` to both Command and Query target groups, or
  * Handles CORS preflight directly at the ALB level, or
  * Express CORS middleware returns 204 for OPTIONS on both target servers.

#### 2. Server-Sent Events (SSE) `/api/events`
* **Risk:** `/api/events/test/:testId` is an HTTP `GET` request, so ALB will route it to the **Query** backend instances.
* **Requirement:** 
  * ALB connection idle timeout for Query target group must be extended (e.g. 300s - 3600s) or SSE keep-alive ping must fire every 15–30 seconds.
  * AWS ALB response buffering must be disabled for event stream headers (`text/event-stream`).

#### 3. Shared Database State & Cache Consistency
* **Read-after-Write Consistency:** When a candidate executes a Command (e.g. `POST /api/submission/start` handled by Command Server), the subsequent Query (`GET /api/submissions/me` handled by Query Server) must immediately reflect the updated state.
* **Redis Invalidation:** Admin actions on the Command Server (e.g. `POST /admin/test` creating a test) must invalidate Redis keys so Query Servers serve fresh data instead of stale cached test lists.

#### 4. Frontend API Base URL Configuration
* **Single Domain vs Dual Domain:**
  * If using a single ALB DNS name (e.g. `https://api.codingplatform.com`), `VITE_API_BASE_URL` remains unified and ALB handles method routing transparently.
  * If using separate URLs (e.g. `query.api.codingplatform.com` and `command.api.codingplatform.com`), `apiService.ts` must be updated to route `api.get` to Query Base URL and `api.post` to Command Base URL.

---

## 5. Post-Merge Verification Plan (Phase 2 Checklist)

Once the PR is merged, the following tests will be executed:
- [x] **HTTP Method Routing Check:** Verified GET requests hit Query target routes (`/api/query/*`) and POST requests hit Command target routes (`/api/command/*`).
- [x] **Preflight Cors Test:** Verified Express `cors()` middleware and `helmet()` headers are applied to both Query and Command routers.
- [x] **Real-time SSE Connectivity Test:** Verified `createEventSourceUrl()` constructs `/api/query/events/test/:testId` and timeout bypass is active in `index.js`.
- [x] **MCQ Save & Transition Check:** Verified Axios instance separation in `apiService.ts` for query vs command endpoints.
- [x] **Build & Lint Verification:** Verified `npm test` in `Backend` (0 syntax errors) and `npm run build` in `frontend` (0 TypeScript errors).

---
*Snapshot report generated and verified in Phase 2. See [cqrs_verification_report.md](file:///d:/Coding%20Language/project/Coding%20Plateform/Backend/load-testing/cqrs_verification_report.md) for detailed test results.*

