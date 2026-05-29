# 02 — Performance & Scalability Audit

## Summary

The application is functional under a demo workload but has multiple unbounded queries, missing indexes, in-process state, and a single-writer database that disqualify it from multi-tenant or multi-instance production use without remediation.

## Findings

### PERF-001 [High] — No `@@index` declarations anywhere in `schema.prisma`
- **Evidence:** `prisma/schema.prisma` 1–346. The only DB indexes are the auto-generated unique constraints (`User.email`, `Project.key`, `WorkItem.key`, `Label.name`, `@@unique` composites). No `@@index([projectId])`, `[assigneeId]`, `[sprintId]`, `[status]`, `[workItemId]`, etc.
- **Why it matters:** Boards, backlog, dashboard, and my-work all filter by `projectId`, `sprintId`, `assigneeId`, and `status`. Each list view will degrade from O(log n) to O(n) on Postgres at any non-trivial scale, and SQLite will full-scan immediately.
- **Hot paths affected:**
  - `WorkItem` lookups by `projectId`, `assigneeId`, `reporterId`, `sprintId`, `epicId`, `status`, `parentId`.
  - `ActivityLog`, `Comment`, `Blocker`, `TestRun` by `workItemId`.
  - `Notification` by `userId, read`.
  - `UserSession`, `ApiToken` by `userId, revokedAt`.
  - `AuditLog` by `actorId, entityType, createdAt`.

### PERF-002 [High] — Unbounded `findMany` calls
- `src/app/api/export/workspace/route.ts:33-47` selects every `WorkItem` in the database with no `take`/cursor — memory-bound on growth.
- `src/lib/actions/work-items.ts:116-124` (`createWorkItem`) fetches every key in the project to compute the next number — quadratic write cost.
- `src/lib/actions/integrations.ts:10` reads all integration rows on every settings page render.
- Multiple `findMany` calls without pagination across `projects.ts`, `sprints.ts`, `qa.ts` (read confirmed; full audit recommended in remediation batch 5).

### PERF-003 [High] — Non-atomic key generation race
- `src/lib/actions/work-items.ts:117-125`: within a transaction, reads max key by parsing strings, then writes `WorkItem` with `${project.key}-${maxNum+1}`. Two concurrent transactions can read the same max and both attempt to insert the same key. The schema's `WorkItem.key @unique` will reject one, returning a 500 to a user who legitimately tried to create an item.
- **Fix direction:** dedicated `Counter` row per project with `INSERT … RETURNING` semantics or `UPDATE … SET value = value + 1 RETURNING`, or compute via `SELECT max() FOR UPDATE` on Postgres.

### PERF-004 [High] — SQLite single-writer
- `prisma/schema.prisma:11-13` sets `provider = "sqlite"`. SQLite is single-writer (even in WAL mode writes serialize). Any non-trivial concurrent write workload will block.
- **Production path:** migrate to Postgres before launch. The driver-adapter design in `src/lib/db.ts` will need to swap to `@prisma/adapter-pg` or similar — not a free change, but unblocks scaling.

### PERF-005 [High] — In-process rate limit & sessions
- `src/lib/auth/actions.ts:15-27`: `Map`-based login throttle scoped to one Node.js process. Will not survive cold starts, will not coordinate across replicas, and gives no fairness on shared NAT egress.
- Replace with Redis/Upstash, IP+account bucket, or platform-level WAF rules.

### PERF-006 [Medium] — No HTTP-level caching strategy
- No `Cache-Control` headers; no `revalidateTag`; only `revalidatePath` after mutations. Dashboard, reports, and listing pages will re-fetch on every request to the RSC layer.
- Consider `unstable_cache` (Next 16) with tags for the dashboard rollups and reports.

### PERF-007 [Medium] — Sequential awaits where parallel is possible
- `src/lib/actions/work-items.ts:54-64`: status update → activity log → notification → 5 × `revalidatePath`. Activity log and notification are independent; `Promise.all` would reduce latency. Same pattern repeats in other actions.

### PERF-008 [Medium] — Large client bundle risk
- `recharts` 3.8.1 + `lucide-react` 1.17.0 + 61 components. No `next/dynamic` was found on chart-heavy or dialog-heavy components. Bundle analyzer should be added (`@next/bundle-analyzer`).

### PERF-009 [Medium] — `bcrypt` rounds = 10
- `src/lib/auth/password.ts:3`: ROUNDS = 10. Acceptable for current hardware but 12 is the modern OWASP recommendation. Login is rate-limited but not CPU-bounded.

### PERF-010 [Medium] — `sprint.completeSprint` sequential transaction list
- `src/lib/actions/sprints.ts:118-127`: builds an array of `prisma.workItem.update(...)` inside `$transaction([...])`. For sprints with many incomplete items this grows the round-trip count; `updateMany` with `set sprintId = null` would be one statement.

## Scalability classification

| Dimension | Status | Notes |
|---|---|---|
| Horizontal scale-out | ❌ | In-process rate limit, in-process Prisma singleton OK but stateful auth attempts break |
| Database scale | ❌ | SQLite single-writer; no Postgres readiness |
| Stateless app servers | ⚠️ | JWT in cookie OK; rate-limit Map is the offender |
| Caching layer | ❌ | None |
| Background work | N/A | No queue; demo reset spawns child shell synchronously (see REL-005) |

## Recommended performance-batch tests after fixes

1. `npm run test -- --run` must pass.
2. `EXPLAIN QUERY PLAN` (or Postgres `EXPLAIN ANALYZE`) on top 10 read queries.
3. k6 / autocannon smoke at 50 RPS on `/dashboard`, `/work-items`, `/boards/scrum`.
