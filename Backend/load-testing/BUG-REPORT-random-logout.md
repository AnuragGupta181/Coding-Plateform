# Bug Report — Random Idle Logout + Mongo Timeout (500)

**Status:** Resolved (code fixes applied)
**Severity:** High (users logged out, cannot sign in during break windows)
**Environment:** MERN stack, backend deployed on Vercel (serverless functions), MongoDB Atlas.
**Date logged:** 2026-07-10

---

## 1. Summary

Users were being logged out **randomly while completely idle** (no load test, no traffic).
When the app broke it surfaced a `500` with the Mongo `findOne took longer to connect`
timeout error — the same signature seen earlier during a 500-concurrent k6 load test,
but now occurring with **zero concurrent load**.

Symptom pattern:
- App works fine.
- Suddenly logs the user out and sign-in stops working.
- Stays broken for a while.
- Randomly recovers for a few minutes.
- Breaks again.

---

## 2. Error Signature

```
500 { "message": "Operation `users.findOne()` buffering timed out after 10000ms" }
```
(or the Atlas variant `Server selection timed out after ... ms` / `findOne took longer to connect`).

This exact text appeared both during the load test AND during the idle break events.

---

## 3. Theories Investigated (with verdicts)

### Theory A — Frontend interceptor logs out on ANY error (500/429/timeout)
**VERDICT: DISPROVEN.**
`frontend/src/utils/apiService.ts` (response interceptor):
```ts
if (error.response && error.response.status === 401) {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
}
```
The token is only cleared on `401`. A 500/429/timeout does **not** trigger logout.
The interceptor is correct.

### Theory B — Short JWT expiry with no silent refresh
**VERDICT: DISPROVEN.**
`Backend/controllers/authController.js` → `signToken`:
```js
jwt.sign({ id: user._id, role: user.role }, config.jwtSecret, { expiresIn: '1d' });
```
Token TTL is **1 day**. A logout after a few idle minutes is not expiry.
No silent refresh exists, but it is irrelevant at a 1-day TTL.

### Theory C — Vercel cold start / stale Mongo connection
**VERDICT: CONFIRMED (the trigger).**
Vercel serverless functions freeze after inactivity. The connection cache in
`Backend/index.js`:
```js
if (mongoose.connection.readyState >= 1) return; // skip reconnect
```
returns "connected" (`readyState === 1`) even though Vercel froze the container and
the underlying TCP socket is dead/stale. The first query after warm-up hits the dead
socket → Mongo timeout → the reported 500.

### Theory D — Missing index on `email` causing full collection scans
**VERDICT: DISPROVEN.**
`Backend/models/user.js`:
```js
email: { type: String, required: true, unique: true }
```
`unique: true` makes Mongoose build a unique index on `email`. Login lookups are indexed.
(Still worth a manual check in Atlas → Collections → Indexes tab to confirm the index
is actually built online.)

---

## 4. Root Cause

`Backend/middleware/authMiddleware.js` `requireAuth`:
```js
req.user = await User.findById(decoded.id);   // <-- Mongo query
...
} catch (error) {
  res.status(401).json({ message: 'Invalid token' });  // <-- masks ALL errors as 401
}
```

Any protected request (e.g. Dashboard `getAvailableTests`, the WaitingRoom
`setInterval(checkTestStatus, 3000)`, or the SSE stream in TestRoom/CodingTestRoom)
hits `authMiddleware` first. When the request lands on a cold/warm Vercel instance and
`User.findById` throws a transient Mongo timeout, the **catch-all converts that DB error
into a `401 Invalid token`**. The frontend interceptor (correctly) reacts to 401 by
wiping the token and redirecting to `/login`.

That is the false logout.

### Why login sometimes "works" but still breaks
- `/auth/login` is **not** behind `requireAuth`, so it is always reachable.
- But login still queries the DB (`User.findOne({ email })` in `authController.js:146`).
  During a break window that query can also time out → login itself returns the `500`
  Mongo error you see on the login screen.
- When login happens to land while the DB briefly responds, the token is set — but the
  **next** authenticated request re-enters `authMiddleware`, hits the stale connection,
  throws, returns 401, and logs the user out again.
- This race against the warm/freeze cycle is why it feels random and intermittent.

---

## 5. Fixes Applied

### Fix 1 — Stop masking DB errors as 401 (root cause)
`Backend/middleware/authMiddleware.js`:
```js
} catch (error) {
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Invalid token' });
  }
  // Transient DB/infra errors must NOT return 401, otherwise the frontend
  // interceptor wipes the token (false logout).
  console.error('requireAuth non-auth error:', error.message);
  return res.status(503).json({ message: 'Service temporarily unavailable' });
}
```
Now only genuine JWT errors return 401. Transient Mongo/infra failures return 503,
which the interceptor already ignores (no logout, retry-friendly).

### Fix 2 — Permanent cold-start / dead-connection healing (`ensureDb`)
The original `connectDB` only checked `mongoose.connection.readyState >= 1` and skipped
reconnecting. That flag stays `1` ("connected") even on a socket Vercel silently killed
while freezing the container, so the first query after warm-up hit a dead socket.

`Backend/index.js` now uses a cached, self-healing connection:
```js
// Cache the connection promise on globalThis so warm containers reuse it.
const mongoCache =
  global._mongoCache || (global._mongoCache = { conn: null, promise: null, lastOk: 0 });

// Invalidate the cache on error/disconnect so the next request reconnects
// instead of reusing a dead (frozen) socket.
mongoose.connection.on('error',     (e) => { mongoCache.conn = null; mongoCache.promise = null; });
mongoose.connection.on('disconnected', () => { mongoCache.conn = null; mongoCache.promise = null; });

async function connectDB() {
  if (mongoCache.conn && isConnected()) return mongoCache.conn;
  if (!mongoCache.promise) {                       // single-flight guard
    mongoCache.promise = mongoose.connect(MONGODB_URI, {
      maxPoolSize: config.isProduction ? 2 : 50,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 15000,             // was 5000 — too tight for frozen->warm
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxIdleTimeMS: 60000,
      heartbeatFrequencyMS: 10000,                 // detect dead sockets faster while warm
      family: 4,
    }).catch((err) => { mongoCache.promise = null; throw err; });  // allow retry
  }
  mongoCache.conn = await mongoCache.promise;
  return mongoCache.conn;
}

// Heal a frozen/stale connection BEFORE any query runs. Throttled to one health
// probe per 15s; on a failed probe we close the stale socket and reconnect ONCE.
async function ensureDb() {
  await connectDB();
  if (!isConnected()) throw new Error('MongoDB not connected');
  if (Date.now() - mongoCache.lastOk > 15000) {
    try {
      await mongoose.connection.db.command({ ping: 1 });
      mongoCache.lastOk = Date.now();
    } catch (pingErr) {
      console.warn('⚠️ DB ping failed (stale socket), reconnecting:', pingErr.message);
      try { await mongoose.connection.close(); } catch { /* already closed */ }
      mongoCache.conn = null;
      mongoCache.promise = null;
      await connectDB();           // opens a genuinely fresh socket
      mongoCache.lastOk = Date.now();
    }
  }
}
```
A `ensureDb()` middleware runs **before every request** (except SSE):
```js
app.use(async (req, res, next) => {
  try { await ensureDb(); next(); }
  catch (err) {
    console.error('ensureDb failed:', err.message);
    if (!res.headersSent) res.status(503).json({ message: 'Database temporarily unavailable' });
  }
});
```

**Why this is permanent (even if every instance dies):**
The first request after a freeze runs `ensureDb()`, pings the connection, finds the dead
socket, closes it, and reconnects on a fresh socket — all within that same request, so the
user gets a successful response instead of a 500/401. `on('error')`/`on('disconnected')`
listeners and the `connectDB` promise guard (single-flight) keep this safe under concurrency.

**Does this open more connections than required? — NO.**
- There is exactly **one** Mongoose connection per Vercel instance (singleton), capped by
  `maxPoolSize: 2`. `ensureDb` never creates a second connection object.
- The `if (!mongoCache.promise)` single-flight guard means even if N requests hit a dead
  socket at once, only **one** reconnect is attempted; the rest await the same promise.
- The stale-socket heal explicitly `close()`s the old socket before `connect()`, so it
  cannot accumulate dead sockets. Atlas limits stay safe (2 connections/instance).

---

## 6. Remaining Recommendations (hardening, not required for logout fix)

1. **Keep the function warm.** A frequent Vercel cron hit (the existing
   `/api/cron/complete-expired-tests` endpoint in `index.js`) prevents the freeze that
   triggers the cold-start path. Ensure the schedule is aggressive enough.
2. **Add retry on transient 5xx in `apiService.ts`.** The interceptor already ignores
   non-401, so a small retry (e.g. once on 503/network error) lets cold-start failures
   self-heal without surfacing to the user.
3. **Verify the Atlas index** on `users.email` is built and online (Atlas → Collections →
   Indexes), independent of this bug.
4. **Atlas Metrics:** during a break event, confirm Atlas tier (M0 free vs paid) and
   watch CPU%, IOPS, and active connections. Cold starts should no longer spike
   connections (maxPoolSize: 2 already in place).

---

## 7. Reproduction / Verification

- Idle the app for several minutes (let Vercel freeze the function).
- Resume and observe the next authenticated request **and** a fresh login.
- **Expected after fix:**
  - The first request after a freeze may take slightly longer (ping + reconnect on a
    fresh socket), but it **succeeds** — never an automatic logout.
  - Login works even on the first request after a long freeze (the dead socket is healed
    by `ensureDb()` before `User.findOne` runs).
  - A genuine DB outage (Atlas truly down) returns 503, not a false 401 logout.
- Confirm in backend logs: no `401 Invalid token` from `authMiddleware` for non-JWT
  errors, and `⚠️ DB ping failed (stale socket), reconnecting:` appears (and recovers)
  during cold-start windows.

---

## 8. Files Changed

| File | Change |
|------|--------|
| `Backend/middleware/authMiddleware.js` | Distinguish JWT errors (401) from transient DB errors (503). |
| `Backend/index.js` | Cached self-healing Mongo connection (`ensureDb` + single-flight `connectDB` + error/disconnect listeners); `serverSelectionTimeoutMS` 5000 → 15000; added `heartbeatFrequencyMS`. |
