# Final Checks Report

Date: 2026-07-21

## Scope

Reviewed the end-to-end assessment flow:

- Candidate signup, OTP send, OTP verification, login
- Admin test creation, waiting room, test start, test completion
- Candidate dashboard, test join, MCQ answering, MCQ submit
- Mixed test transition from MCQ to coding questions
- Coding run, coding submit, final completion
- Redis caching, Mongo connection behavior, auto-submit lifecycle

## Final Assessment

The core architecture is still sound. The MCQ save/sync flow is correctly designed for network failure cases, including the important case where a candidate moves from MCQ questions to coding questions while a save-answer POST fails.

The frontend stores failed MCQ answer saves in `sessionStorage` as pending sync items, retries them automatically, and flushes them before navigating to the coding section. This means the selected MCQ answer is kept locally and retried instead of being silently lost.

## What Is Working Correctly

### Signup and OTP

- Signup checks required fields and password length.
- Existing verified users are blocked from duplicate signup.
- OTPs are stored in Redis with a 10 minute TTL.
- OTP values are hashed before storage.
- Failed OTP attempts are counted and the OTP is invalidated after too many failures.
- OTP request throttling exists at the Redis key level.

Important note: OTP currently depends on Redis being available. This is acceptable if Redis is a required production dependency.

### Test Listing and Test Loading

- Available tests are cached in Redis.
- Individual test documents are cached in Redis.
- Cache is invalidated when tests are created, moved to waiting, started, completed, or coding questions are added.
- This protects the hot path where many candidates load the same test at the same time.

### Submission Start

- Starting a submission uses an atomic upsert.
- The unique index on `(candidateEmail, testId)` prevents duplicate active submissions for the same candidate and test.
- If the candidate already completed the test, the backend rejects a restart.

### MCQ Answer Save

- MCQ answer saves use targeted atomic updates:

```js
$set: { [`answers.${questionId}`]: answerIndex }
```

- The backend does not read and rewrite the full submission document for every answer.
- This is good for high concurrency and avoids unnecessary Mongo load.

### Failed MCQ Save Handling

- The frontend retries failed saves with backoff.
- If all retries fail, the answer is stored locally in pending sync.
- Pending sync is retried:
  - when the test reloads
  - every 30 seconds
  - before final MCQ submit
  - before moving from MCQ to coding in mixed tests

Conclusion: the "POST failed while going to coding question" case is handled.

### Coding Flow

- Coding test room starts/reuses the same submission.
- Code submit stores scoring results in `codingAnswers`.
- Final completion calculates MCQ score plus coding score.
- On timer expiry, the coding page uses jitter before final submit to avoid all candidates hitting the backend at the same millisecond.

### Auto Submit

- Admin/manual auto-submit uses one bulk write for active submissions.
- Submission lookup for auto-submit is supported by the `(testId, status)` index.
- Score calculation is done in memory before the bulk update.

## Clarifications From Testing Report

### Mongo Pool Size

The intended setup is:

- Vercel/serverless: `MONGO_POOL_SIZE=2`
- Single long-running server: `MONGO_POOL_SIZE=50`

This is correct. On Vercel, each serverless instance should keep a very small pool because Vercel scales by creating more instances. A large per-instance pool can exhaust Atlas connections during concurrent load.

Current code allows this through the environment variable:

```js
mongoPoolSize: process.env.MONGO_POOL_SIZE
  ? parseInt(process.env.MONGO_POOL_SIZE, 10)
  : (isProduction ? 50 : 10)
```

So production is safe if Vercel has:

```txt
MONGO_POOL_SIZE=2
```

If that env var is missing, production defaults to `50`. That is fine for a single server, but risky for Vercel.

### Rate Limiters

The Express global rate limiters are currently commented out intentionally for load testing.

This is not treated as a current issue. Re-enable them when moving from load testing mode to normal production protection.

## Cron Finding

There are two auto-completion mechanisms:

1. Vercel Cron in `Backend/vercel.json`
2. Local Node `setInterval` in `Backend/index.js`

Vercel Cron is the right mechanism for serverless. A plain `setInterval` is right for a single always-running server.

The risk is that on Vercel, many serverless instances can exist at once. If each instance starts its own `setInterval`, many instances may run `completeExpiredTests()` together and create unnecessary Mongo load.

Recommended guard:

```js
if (!process.env.VERCEL && process.env.DISABLE_CRON !== 'true') {
  setInterval(async () => {
    try {
      await completeExpiredTests();
    } catch (error) {
      console.error('Failed to complete expired tests:', error.message);
    }
  }, 15000);
}
```

This keeps behavior clean:

- Vercel uses only Vercel Cron.
- Single server uses the local interval.
- `DISABLE_CRON=true` can still disable the interval manually.

## Build Verification

Commands run:

```bash
cd Backend
npm test
```

Result: passed. `node --check index.js` found no syntax error.

```bash
cd frontend
npm run build
```

Result: passed. Vite emitted only a bundle-size warning for a large JS chunk.

## Final Conclusion

No major bottleneck was found in the candidate MCQ save/sync/coding-transition architecture. That part is properly handled with retries, local pending sync, and final flush before moving forward.

The main deployment-sensitive item to keep correct is environment separation:

- Vercel must use `MONGO_POOL_SIZE=2`.
- Single server can use a larger pool such as `50`.
- Vercel should rely on Vercel Cron, while single server can use `setInterval`.

