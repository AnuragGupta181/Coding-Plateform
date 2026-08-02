# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack assessment platform for online coding and MCQ tests. Candidates take timed, proctored tests; admins create tests, manage waiting rooms via SSE, and audit results.

## Development Commands

### Backend (`Backend/`)
```bash
pnpm install          # install deps
pnpm run dev          # start with nodemon (hot reload)
pnpm start            # production start (node index.js)
pnpm test             # syntax check only (node --check index.js)
```

### Frontend (`frontend/`)
```bash
pnpm install          # install deps
pnpm run dev          # vite dev server (localhost:5173)
pnpm run build        # tsc -b && vite build
pnpm run lint         # eslint
```

### Load testing (`Backend/load-testing/`)
```bash
node Backend/load-testing/local/combinedLoadTest.js   # autocannon-based
```

### Utility scripts
```bash
node Backend/seed.js              # seed DB with sample data
node Backend/makeAdmin.js         # promote a user to admin
node Backend/generateSampleExcel.js  # generate sample .xlsx for bulk question upload
```

## Architecture

### Backend — Express (CommonJS, `Backend/`)

Single Express server with layered architecture:

- **`index.js`** — entry point; MongoDB connection with reconnection/healing logic (designed for Vercel serverless cold starts), rate limiters, request timeouts, graceful shutdown with SSE broadcast, and a 15s cron for expired-test cleanup.
- **`config.js`** — centralized env config; validates required vars in production.
- **Routes → Controllers → Services** — standard MVC split.
- **Models** — Mongoose schemas: `User`, `RegistrationUser`, `Test` (embeds `questions[]` for MCQ and `codingQuestions[]` with test cases), `Submission`, `OTP`.

Key subsystems:
- **SSE + Redis Pub/Sub** (`controllers/eventController.js`) — waiting-room real-time updates. Each test gets a Redis channel `test:<testId>`. Falls back to in-memory broadcast when `REDIS_URL` is unset. Admin polls `getWaitingQueueSnapshot()` for head-count.
- **Judge0 code execution** (`services/judge0Service.js`) — three-tier fallback: self-hosted → public CE → RapidAPI. Submits code, polls for result (up to 120s).
- **Excel bulk import** (`services/excelParserService.js`) — parses `.xlsx` uploads via Multer + SheetJS.
- **Test lifecycle** (`services/testLifecycleService.js`) — manages test states: `scheduled → waiting → active → completed`. Auto-completes expired tests.
- **Auth** — JWT-based with OTP email verification (Nodemailer). `authMiddleware.js` guards routes; admin role checked separately.

API route groups:
| Prefix | Purpose |
|---|---|
| `/api/auth` | signup, login, OTP, password reset |
| `/api/command` | write operations (e.g., test creation, submission) |
| `/api/query` | read operations (e.g., fetching test data, results) |
| `/api/query/events` | SSE streams (e.g., waiting room) |

### Frontend — React 19 + TypeScript + Vite (`frontend/`)

- **State**: Redux Toolkit with two slices — `authSlice` (token/user in localStorage) and `testSlice` (active test state).
- **API layer**: `utils/apiService.ts` — Axios instance with JWT interceptor and auto-logout on 401. All API calls exported as `testService.*`.
- **Routing** (`App.tsx`): `ProtectedRoute` (logged-in), `AdminRoute` (role=admin), `PublicRoute` (redirects if already logged in). `AuthStorageSync` watches `localStorage` across tabs.
- **Key pages**: `TestRoom` (MCQ), `CodingTestRoom` (Monaco editor), `WaitingRoom` (SSE-connected), `AdminDashboard`, `CreateTest`.
- **Hooks**: `useCountdownTimer` / `useCountdown` (global test timer with auto-submit), `useProtecting` (tab-switch/blur violation tracking).
- **Styling**: Tailwind CSS v4 via `@tailwindcss/vite` plugin. CSS variables for theming (dark/light).

### CI/CD (`.github/workflows/ci.yml`)

Single workflow triggered on push/PR to `main`. Two jobs:
- **`frontend`** — installs deps and runs `pnpm run build` (working dir: `frontend/`)
- **`backend`** — installs deps and runs `pnpm test` (working dir: `Backend/`)

Both jobs use pnpm 9 + Node 20.x and reference `pnpm-lock.yaml` for caching. The local project also uses pnpm, keeping local and CI environments in sync.

## Environment Variables

Backend requires: `MONGODB_URI`, `JWT_SECRET`, `EMAIL_USER`, `EMAIL_PASS`, `CORS_ORIGIN`, `REDIS_URL`. See `Backend/.env.example`.

Frontend requires: `VITE_API_BASE_URL`. See `frontend/.env.example`. Falls back to `http://localhost:5000/api` in dev.

## Conventions

- Backend is CommonJS (`require`/`module.exports`); frontend is ESM TypeScript.
- Mongoose models use embedded subdocuments (questions inside tests, not separate collections).
- SSE connections require `Content-Type: text/event-stream`; compression is explicitly skipped for SSE paths.
- The `DISABLE_CRON=true` env var prevents the expired-test interval on secondary instances when scaling horizontally.
