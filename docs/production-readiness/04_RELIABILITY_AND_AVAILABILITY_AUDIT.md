# 04 — Reliability and Availability Audit

## Auditing Agents
- **system-architect** (primary)
- **backend-engineer** (supporting)
- **database-engineer** (supporting)

---

## 1. Fault Tolerance

| Aspect | Implementation | Status | Evidence |
|--------|---------------|--------|----------|
| Error boundaries | Global `error.tsx` + `global-error.tsx` | ✅ | `src/app/(app)/error.tsx`, `src/app/global-error.tsx` |
| Not-found handling | Custom `not-found.tsx` | ✅ | `src/app/(app)/not-found.tsx` |
| Loading states | Global `loading.tsx` | ✅ | `src/app/(app)/loading.tsx` |
| Database retry | Retry with exponential backoff | ✅ | `src/lib/db-retry.ts` (8 unit tests) |
| Graceful degradation | Error pages with recovery actions | ✅ | Error boundary has retry button |
| Circuit breaker | ❌ Not implemented | N/A | No external service calls currently |

---

## 2. Error Handling

| Layer | Pattern | Status |
|-------|---------|--------|
| Server actions | Try/catch → structured error response | ✅ |
| API routes | Try/catch → JSON error with status code | ✅ |
| Database | Retry wrapper with backoff (`db-retry.ts`) | ✅ |
| Client forms | `useActionState` with error display | ✅ |
| Unhandled errors | Global error boundary catches | ✅ |
| Error correlation | UUID-based correlation IDs for server errors | ✅ |
| Error leakage | Stack traces never sent to client | ✅ |

---

## 3. Graceful Degradation

| Scenario | Behavior | Status |
|----------|----------|--------|
| Database unavailable | `/api/ready` returns 503; `/api/health` still 200 | ✅ |
| Auth secret invalid | App fails to start (fail-fast) | ✅ |
| Invalid session | Redirect to login | ✅ |
| Permission denied | 403 page or hidden UI elements | ✅ |
| Empty data | Empty state component displayed | ✅ |
| Invalid form input | Field-level error messages | ✅ |

---

## 4. Transaction Safety

| Operation | Transactional? | Evidence |
|-----------|---------------|----------|
| Work item status change + activity log | ✅ Yes | `actions/work-items.ts` — `prisma.$transaction` |
| Sprint completion + item updates | ✅ Yes | `actions/sprints.ts` |
| User creation + team assignment | ✅ Yes | `actions/admin.ts` |
| Project deletion (cascade) | ✅ Yes | Database cascade handles atomically |
| Demo reset | ✅ Yes | `actions/danger.ts` — transactional wipe |
| Notification bulk operations | ⚠️ Not verified | `actions/notifications.ts` — `updateMany` is atomic |

---

## 5. Data Integrity

| Aspect | Implementation | Status |
|--------|---------------|--------|
| Unique constraints | Email, project key, team key, work item key | ✅ |
| Foreign key constraints | All relations have proper FK references | ✅ |
| Cascade deletes | Proper cascade on parent deletion | ✅ |
| Orphan prevention | SetNull on optional FKs (TestRun.bugId) | ✅ |
| Concurrent writes | ❌ SQLite single-writer lock (sequential) | ⚠️ Not tested |
| Optimistic locking | ❌ Not implemented | ⚠️ Last-write-wins on concurrent edits |
| Idempotency keys | ❌ Not implemented | ⚠️ Duplicate submissions possible |

---

## 6. Availability Architecture

| Aspect | Status | Evidence |
|--------|--------|----------|
| Health check (liveness) | ✅ | `/api/health` — no DB dependency |
| Readiness check | ✅ | `/api/ready` — DB connectivity test |
| Docker HEALTHCHECK | ✅ | `Dockerfile:82-83` — 30s interval, 3 retries |
| Zero-downtime deploy | ⚠️ Partial | `migrate deploy` runs before start (brief downtime window) |
| Rollback readiness | ✅ | Prisma migrations are forward-only but schema is additive |
| Auto-restart | ✅ | Docker restart policy + health check |
| Multi-instance | ❌ Blocked | SQLite file lock prevents multiple instances |

---

## 7. Startup Failure Behavior

| Failure Mode | Behavior | Status |
|--------------|----------|--------|
| Missing AUTH_SECRET | Throws with descriptive error, app won't start | ✅ Fail-fast |
| Weak AUTH_SECRET (production) | Throws with guidance message | ✅ Fail-fast |
| Missing DATABASE_URL | Prisma throws, app won't start | ✅ Fail-fast |
| Database file missing | `migrate deploy` creates it | ✅ |
| Migration failure | Entrypoint exits with error, container restarts | ✅ |
| Port already in use | Node.js throws EADDRINUSE | ✅ Standard |

---

## 8. Retry Safety

| Operation | Retry-safe? | Notes |
|-----------|-------------|-------|
| Login attempt | ✅ | Idempotent — same credentials → same result |
| Work item creation | ⚠️ | No idempotency key — duplicate items possible |
| Status change | ✅ | Transitions validated — repeated calls are no-op |
| Comment creation | ⚠️ | No deduplication — repeated submits create duplicates |
| Sprint completion | ✅ | Status check prevents re-completion |
| Notification mark-read | ✅ | Idempotent (already-read stays read) |

---

## 9. Reliability Findings

| ID | Finding | Severity | Category |
|----|---------|----------|----------|
| REL-01 | No optimistic locking — concurrent edits → last-write-wins | High | Data Integrity |
| REL-02 | No idempotency keys on create operations | High | Retry Safety |
| REL-03 | SQLite single-writer prevents concurrent write availability | **Critical** | Availability |
| REL-04 | Migration runs at startup (brief unavailability window) | Medium | Zero-Downtime |
| REL-05 | No graceful shutdown handler for in-flight requests | Medium | Availability |
| REL-06 | Duplicate comment submissions possible | Medium | Data Integrity |
| REL-07 | No circuit breaker (acceptable — no external services) | Low | Fault Tolerance |

---

## 10. Reliability Score

**Overall: 72/100**

| Category | Score |
|----------|-------|
| Error Handling | 92/100 |
| Fault Tolerance | 85/100 |
| Transaction Safety | 85/100 |
| Data Integrity | 70/100 |
| Availability | 50/100 (SQLite blocks multi-instance) |
| Retry Safety | 55/100 |
| Zero-Downtime | 60/100 |
