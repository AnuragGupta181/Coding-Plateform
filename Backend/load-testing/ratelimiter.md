# Platform Rate Limiting Architecture & Failure Diagnostic Guide

This document contains full details on how rate-limiting is implemented across the platform, including rate-limiting layers, key generation algorithms, failure modes, root cause analysis, and troubleshooting steps.

---

## 1. Overview of Architecture

The platform uses a **Dual-Shield Rate Limiting Strategy**:

| Shield Layer | Location | Key Generator | Quota / Threshold | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Shield 1: HTTP Gateway** | `Backend/index.js` (`authLimiter`) | `${ip}_${email}` | 15 attempts / 15 mins | Prevents brute-force login, password guessing, and rapid button mashing before `bcrypt` runs. |
| **Shield 2: OTP Redis Controller** | `Backend/controllers/authControllerRedis.js` | IP & Email keys | 1,000/hr (IP), 3/10min (Email) | Protects email service quota & inbox spamming while supporting 500+ student lab drives. |
| **Shield 3: Active Candidate Query** | `Backend/index.js` (`queryLimiter`) | `req.user._id` (JWT) | 300 reqs / 1 min | Protects database read path during live test navigation. |
| **Shield 4: Candidate Commands** | `Backend/index.js` (`commandLimiter`) | `req.user._id` (JWT) | 120 reqs / 1 min | Protects answer save and submit endpoints during active exams. |
| **Shield 5: Real-Time SSE** | `Backend/index.js` (`sseLimiter`) | `req.user._id` (JWT) | 20 connections / 1 min | Prevents SSE connection floods. |

---

## 2. Key Generation Logic

### Auth Key Generator (`getAuthRateLimitKey`)
```javascript
const getAuthRateLimitKey = (req) => {
  const ip = req.headers['x-forwarded-for'] || req.ip;
  const email = (req.body && req.body.email) ? String(req.body.email).toLowerCase().trim() : 'anonymous';
  return `${ip}_${email}`;
};
```
- **Why `IP + Email`?**
  - In a college computer lab, 500 candidates share the same public IP address (NAT).
  - If rate limiting was based purely on IP address, 1 student spamming signups would block all 500 students in the lab.
  - By combining `IP + Email`, `192.168.1.1_studentA@gmail.com` and `192.168.1.1_studentB@gmail.com` have completely isolated quotas.

### Candidate Key Generator (`getRateLimitKey`)
```javascript
const getRateLimitKey = (req) => req.user?._id?.toString() || (req.headers['x-forwarded-for'] || req.ip);
```
- **Why Candidate User ID?**
  - Authenticated candidates possess a valid JWT token with `req.user._id`.
  - Every candidate in an exam room gets their own personal rate limit bucket regardless of shared lab Wi-Fi/Ethernet IP.

---

## 3. Failure Diagnostic Guide (What Could Fail and When?)

### Scenario A: Load Balancer / Reverse Proxy IP Misconfiguration
- **When it fails:** Deployed behind Nginx, Cloudflare, or AWS ALB without `app.set('trust proxy', 1)`.
- **Symptom:** `req.ip` resolves to `127.0.0.1` or the Nginx internal gateway IP for ALL users worldwide. All lab candidates get locked out under a single bucket.
- **Verification:** Check `Backend/index.js` for `app.set('trust proxy', 1)` (must be enabled).

### Scenario B: Multi-Instance Cluster Memory Drift
- **When it fails:** Running multiple Node.js server instances (e.g. PM2 cluster mode or 4 Docker replicas) using the default in-memory store.
- **Symptom:** Each PM2 worker tracks requests independently. A limit of 15 attempts effectively becomes `15 × 4 = 60` attempts across workers.
- **Fix:** Upgrade `express-rate-limit` to use `rate-limit-redis` store when scaling horizontally across multi-server environments.

### Scenario C: Malformed Request Payload Attack
- **When it fails:** Attacker sends HTTP POST requests with missing or non-JSON bodies.
- **Symptom:** `req.body.email` is `undefined`.
- **Mitigation:** The key generator safely falls back to `${ip}_anonymous` using optional chaining (`req.body?.email`).

### Scenario D: SSE Reconnection Storm
- **When it fails:** Network flickers in a 500-candidate examination center, causing 500 browser tabs to reconnect SSE at the exact same millisecond.
- **Symptom:** `sseLimiter` (20 connections/min) temporarily rejects rapid reconnect attempts.
- **Fix:** Frontend clients use exponential backoff + random jitter when reconnecting EventSource streams.

---

## 4. Failure Warning Logs

When any rate limit is triggered, a diagnostic log is output to server stdout:

```text
⚠️ [RATE_LIMIT_EXCEEDED] Auth API | Key: "192.168.1.1_test@example.com" | Path: POST /api/auth/login | Time: 2026-07-24T12:00:00.000Z
```

This log provides the exact Key (`IP_Email` or `User_ID`), Path, and Timestamp for rapid debugging during live drives.
