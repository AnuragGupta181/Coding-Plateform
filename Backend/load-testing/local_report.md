# 💻 Local Environment Load Testing Report

*This document tracks all performance testing, bottlenecks discovered, and architectural optimizations applied on the local environment.*

## 📊 Test Results Log

| Test Phase | Target Endpoint | Concurrency | Requests Sent | Req/Sec | Avg Latency | Errors | Bottlenecks Discovered | Action Taken |
|---|---|---|---|---|---|---|---|---|
| **Phase 1: Initial Baseline** | `GET /api/tests/available` | 500 | N/A | N/A | N/A | 100% | The Express `express-rate-limit` middleware identified 500 requests coming from a single local IP and returned `429 Too Many Requests`. | Temporarily commented out the global rate limiters in `index.js` to simulate distributed IPs. |
| **Phase 2: Raw Performance** | `GET /api/tests/available` | 500 | 10,795 | 1,079 | 452 ms | 0 | None. The local environment survived the barrage flawlessly without dropping any requests. | Proved that underlying Node.js application is extremely efficient and non-blocking. |

---

*Note: Append future local test results to the table above to maintain an ongoing history of performance.*
