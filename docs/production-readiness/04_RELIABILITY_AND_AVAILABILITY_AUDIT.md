# 04 — Reliability & Availability Audit

## Summary

The application has no error boundaries, no health endpoint, fragile transaction patterns, and a single-writer SQLite database. Recoverability and observability are minimal.

## Findings

### REL-001 [Critical] — Failing unit tests on `main`
- **Evidence:** `npm run test -- --run` → 2 failed / 66 passed of 68. Failures localize to `createWorkItem` tests that mock `prisma.$transaction(async tx => …)` — the inline-callback transaction pattern in `src/lib/actions/work-items.ts:116-143` is not what the test mock expects.
- **Why Critical:** main is broken. Any CI gate would block merge. Treats both the code pattern and the missing test fixture as defects (one or the other must change).
- **Fix:** see `12_COMMAND_RESULTS.md` for raw output; tracked in `10_BUG_REGISTER.md` as **QA-001**.

### REL-002 [High] — No `error.tsx` / `loading.tsx` / `not-found.tsx` anywhere
- **Evidence:** Verified — only two `layout.tsx` files exist; no Next 16 segment error boundaries or suspense fallbacks.
- **Impact:** A thrown error in any RSC bubbles to the root error UI (or Next default 500), losing the surrounding chrome and leaving the user in a dead-end. Loading states show a blank page rather than skeletons.
- **Fix:** Add per-segment `error.tsx` (with reset) and `loading.tsx` skeletons for `/dashboard`, `/work-items`, `/boards/*`, `/projects/[id]`, `/sprints/[id]`. Add a root `not-found.tsx`.

### REL-003 [High] — Many actions perform multi-step writes without transactions
- **Examples:**
  - `src/lib/actions/work-items.ts:47-71` (`updateWorkItemStatus`): updates work item, then writes activity log, then writes notification — three separate prisma calls, no `$transaction`. If notification write fails the status is already changed and activity log is already written → partial state.
  - `src/lib/actions/security.ts:56-69`: password update, then audit log write — partial-failure risk.
  - `src/lib/actions/sprints.ts:62-99`: `startSprint` updates sprint, then iterates `prisma.notification.create` via `Promise.all` — no transaction.
- **Impact:** Inconsistent audit/activity trails; missed notifications on partial failures.
- **Fix:** Wrap in `prisma.$transaction([…])` or move the side effects to a post-transaction `try/catch` with explicit failure semantics + retry.

### REL-004 [High] — Race in WorkItem key generation
- See PERF-003. Two concurrent creates can both compute key `XYZ-N+1`; one fails on unique constraint. The transaction does not lock.

### REL-005 [High] — `resetDemoData` spawns a long-lived child process inside a server action
- **File:** `src/lib/actions/danger.ts:73-78`.
- **Evidence:** `execFile("npx", ["tsx", "prisma/seed.ts"], { timeout: 120_000 })`. Tying a 120-second child process to a request lifecycle is brittle: serverless platforms (Vercel) will time out at 10s/60s/300s depending on plan; behind a load balancer the request may have been killed already.
- **Fix:** Move to an offline script or a worker; never run a seed/migration from inside the request path.

### REL-006 [Medium] — No health endpoint
- No `/api/health` or `/api/ready`. Load balancers and uptime monitors cannot probe liveness.
- **Fix:** Add `/api/health` returning `{ ok: true, db: <ping> }` and `/api/ready` that runs a trivial `SELECT 1`.

### REL-007 [Medium] — No graceful shutdown / connection management
- `src/lib/db.ts` exports a singleton Prisma client cached on `globalThis`. No `prisma.$disconnect()` registered on `process.on('beforeExit')`. Acceptable for Next.js server runtime; document the assumption.

### REL-008 [Medium] — Sprint completion uses `include` then writes per item
- `src/lib/actions/sprints.ts:106-127`: loads full `workItems` (could be many) into memory, then builds N update statements inside a transaction. A single `updateMany({ where: { sprintId, status: { not: "done" } }, data: { sprintId: null } })` would be O(1) round-trips and avoid pulling rows.

### REL-009 [Medium] — Notifications loop awaits one-by-one
- `src/lib/actions/sprints.ts:80-93`: `Promise.all(... map(prisma.notification.create))` — better than serial, but still N separate inserts. Use `prisma.notification.createMany({ data: [...] })`.

### REL-010 [Medium] — No retry policy anywhere
- All Prisma calls are single-shot. Transient errors (deadlock, busy on SQLite) bubble to the user. Add bounded retries on known transient codes (`P2034` etc.).

### REL-011 [Low] — No structured logging
- `src/lib/db.ts:14-17` sets Prisma log to `["error","warn"]` in dev, `["error"]` in prod, but writes to stdout via Prisma's logger. No request-scoped log, no trace IDs. See OPS audit for full treatment.

## Availability classification

| Property | Status | Notes |
|---|---|---|
| Per-page error boundary | ❌ | Add `error.tsx` per segment |
| Health probe | ❌ | Add `/api/health` |
| Graceful degradation | ⚠️ | RSC error falls back to root error UI |
| Multi-instance correctness | ❌ | In-process rate-limit + SQLite (see PERF/SEC) |
| Data consistency under partial failure | ⚠️ | Several non-transactional multi-writes |

## Disaster recovery

- **Backups:** None documented. `dev.db` is the only state.
- **Restore drill:** N/A — no procedure.
- **RPO/RTO:** Not defined.
- **Action:** required for production: nightly logical backups (`pg_dump`), tested monthly restore.
