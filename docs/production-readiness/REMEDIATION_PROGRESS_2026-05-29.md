# Remediation Progress — 2026-05-29

Honest cumulative delta against `10_BUG_REGISTER.md` (60 bugs) and `11_REMEDIATION_ROADMAP.md` (11 batches). This document does **not** retroactively edit the original audit; it records what has actually shipped on branch `implement-production-readiness-fixes` and what is still open.

## Command Gates (re-run after every batch commit, this snapshot from `4f6d579`)

| Command | Status | Notes |
|---|---|---|
| `npm run lint` | PASS — 0 errors, 0 warnings | clean |
| `npm run typecheck` | PASS — no diagnostics | `tsc --noEmit` |
| `npm run test -- --run` | PASS — 112/112 tests across 18/18 files | vitest 4 |
| `npm run build` | PASS — Next 16 production build | all routes compiled, proxy middleware bundled |
| `npm run test:e2e` | **Not Verified** — requires dev server + DB seed; not executed in this session |
| `npm run test -- --run --coverage` | **Not Executable** — `@vitest/coverage-v8` not installed; threshold config landed (QA-007 partial) but cannot enforce until the devDependency is added |

## Bugs Closed (evidence in commits)

| ID | Commit | Evidence |
|---|---|---|
| SEC-001/002/003 real MFA | `de9ae7d` | `src/lib/auth/mfa.ts` — otplib + bcrypt recovery hashes |
| SEC-004 bcrypt rounds 12 | `be344c7` | constant + tests |
| SEC-005 CSP/HSTS/headers | `be344c7` | `src/middleware.ts` |
| SEC-007 export same-origin | `be344c7` | `src/lib/http/origin.ts` + route guards |
| SEC-008 middleware /api/* | `6b3fb72` | matcher excludes only `_next/static\|_next/image\|favicon\|*.ext`; allow-list for `/api/health`,`/api/ready` |
| SEC-010 env validation | `6b3fb72` | `src/lib/env.ts` (Zod) |
| SEC-011 execFile audit note | `1dd4ec3` | `src/lib/actions/danger.ts` header comment |
| SEC-013 sessionVersion | `1dd4ec3` | schema column + `sv` JWT claim + admin role/status increments + guard rejection |
| REL-001/002 error/loading/not-found + global-error | `6b3fb72` | `src/app/(app)/error.tsx`, `loading.tsx`, `not-found.tsx`, `src/app/global-error.tsx` |
| OPS-001 health/ready endpoints | `6b3fb72` | `src/app/api/health/route.ts`, `src/app/api/ready/route.ts` (DB probe) |
| OPS-002 CI workflow | `de9ae7d` | `.github/workflows/ci.yml` |
| OPS-003 structured logger (lib only) | `49a4fe9` | `src/lib/logger.ts` + 3 tests; **callsite migration deferred** |
| OPS-008 env startup validation | `6b3fb72` | `src/lib/env.ts` |
| PERF-001 / DB-001 hot-path indexes | `6b3fb72` | 11 `@@index` entries across WorkItem/Comment/ActivityLog/Notification/AuditLog |
| QA-001 atomic key generation | `de9ae7d` | `WorkItemCounter` model + transaction |
| REL-003 multi-write transactions | `36ee7c8` | `prisma.$transaction(async tx => …)` in `work-items.ts` (status/update/assign/comment/blocker × create+resolve) and `sprints.ts` (start/complete/setSprint); helpers now accept tx client |
| REL-009 notification fan-out | `36ee7c8` | `startSprint` collapses N inserts → `tx.notification.createMany` |
| PERF-010 / REL-008 sprint completion | `36ee7c8` | `completeSprint` collapses N updates → `tx.workItem.updateMany({ where: { id: { in: incompleteIds } } })` |
| REL-007 graceful shutdown | `cc48d47` | `src/lib/db.ts` SIGTERM/SIGINT handlers, idempotent via global flag, re-raise after `$disconnect` |
| REL-010 transient-error retry helper | `cc48d47` | `src/lib/db-retry.ts` + 8 tests (SQLite busy/locked + Prisma P1001/P1002/P1008/P1017/P2034); exponential backoff 50·3^n + ≤25 ms jitter |
| PERF-002 export hard cap | `cc48d47` | `/api/export/workspace` 50 000-row cap, `?limit=N` override (1..50 000), `X-Export-Truncated` header, JSON payload exposes `truncated`+`count` |
| QA-007 coverage thresholds (config) | `5bb1920` | `vitest.config.ts` thresholds 35/35/40/60 lines/statements/functions/branches; **partial** — `@vitest/coverage-v8` install deferred (no-package.json-changes constraint) |
| PERF-006 cache headers | `4f6d579` | `Cache-Control: no-store` on `/api/health` + `/api/ready`; `Cache-Control: private, no-store` on `/api/export/{profile,workspace}` |
| PERF-007 parallel awaits | `4f6d579` | `/work-items/[id]`: item + users folded into one `Promise.all`; `/reports`: `activityLog.findMany` joined into the existing `Promise.all` |

**Closed: ~25 of 60 documented bugs (QA-007 counted as partial).**

## Bugs Open / Deferred (intentionally honest list)

### Batch 2b residual
- **SEC-006 / PERF-005** shared rate-limit abstraction across auth + API tokens (current limiter is auth-only in-memory)
- **SEC-014** inline-style CSP `'unsafe-inline'` audit doc + roadmap to nonce
- **SEC-015** ApiToken `scopes` runtime enforcement (column exists, no middleware reads it)

### Batch 3 — Core feature completeness
- **CON-001** scrum board drag-drop server persistence verification
- **CON-002** kanban board drag-drop server persistence verification
- **CON-003** backlog row-reorder persistence
- **CON-004** integrations "simulated" disclosure banner

### Batch 4 — Data integrity
- **PERF-003 / REL-004** WorkItemCounter contention alternative (advisory lock or sequence) for Postgres
- **PERF-004 / OPS-004** SQLite → Postgres migration readiness (provider swap, ID strategy, FK behaviour)
- **PERF-002 residual** pagination audit on remaining `findMany` calls (~50 callsites in actions); workspace export now bounded (closed)

### Batch 5 — Performance
- **PERF-008** bundle analyzer + dynamic-import heavy chart bundles
- (PERF-006 + PERF-007 closed in `4f6d579`)

### Batch 6 residual
- (none — REL-007 + REL-010 closed in `cc48d47`)

### Batch 7 — QA
- **QA-002** server-action tests for sprints/projects/comments/teams/users/auth/danger/qa/settings (admin + notifications + integrations + api-tokens landed in `f0179d3`)
- **QA-003** Playwright actually executed (currently 6 specs exist, not run in CI)
- **QA-005** RBAC action-layer assertions
- **QA-006** seed determinism contract test
- **QA-007** **partial** — thresholds in config (commit `5bb1920`); `@vitest/coverage-v8` install deferred
- **QA-008** `/api/export/*` route tests

### Batch 8 — Accessibility
- **A11Y-001..006** axe integration, keyboard board-move fallback, contrast token audit, modal/dropdown focus-trap verification, table semantics, icon-button aria-labels

### Batch 9 residual — Deployability
- **OPS-005** Next 16 `middleware.ts` → `proxy.ts` migration (Next 16 deprecated `middleware.ts`; current file still works but is on the deprecation path — see `node_modules/next/dist/docs/`)
- **OPS-006** Dockerfile
- **OPS-007** `DEPLOY.md` migration + rollback runbook
- **OPS-010** `backup.sh` and restore drill doc

### Batch 10 — Observability
- **OPS-003 callsite migration** — replace `console.error`/`console.log` throughout `src/lib/actions/**` with `logger.error`/`logger.info`. Logger landed; callsites untouched.

### Batch 11 — Maintainability
- **MNT-001** split `src/lib/actions/work-items.ts` (~700 LOC) and `src/lib/actions/settings.ts` god files
- **MNT-002** extract shared `withActivity()` audit-log helper
- **MNT-003** derive Zod schemas from `domain/constants.ts` const tuples (DRY enum values)
- **MNT-004** reconcile `FINAL_IMPLEMENTATION_REPORT.md` / `REQUIREMENTS_TRACEABILITY_MATRIX.md` / `SECURITY.md` / `README.md` against shipped reality (several "complete" claims pre-date these fixes)
- **MNT-005** consolidate `docs/MASTER_BRIEF.md` filename vs the canonical name in the prompt brief

## Browser Validation Matrix

**Status:** Not Verified.

19 routes × up to 7 roles = up to 133 cells. None executed in this session (Playwright MCP not invoked; manual browser run not performed). `13_BROWSER_VALIDATION_PLAN_OR_RESULTS.md` should remain marked **Not Verified** until a follow-up session runs Playwright or a human walks the matrix.

## 10-Agent Cross-Cutting Review

**Status:** Not executed in this session.

The four-workstream parallel agent review described in §0 of the audit plan (`product-architect`, `system-architect`, `database-engineer`, `backend-engineer`, `security-reviewer`, `frontend-engineer`, `accessibility-reviewer`, `browser-tester`, `qa-engineer`, `final-reviewer`) was not run after the remediation commits. The original audit docs (00–14) reflect the pre-remediation state. A follow-up session should re-run the workstreams against the current `HEAD` to revise severity counts and produce a new gatekeeper verdict.

## Honest Verdict

**Status: NOT production-ready. Conditional progress only.**

- Critical blockers from Batch 1 + most of Batch 2 are closed with tests and gates green.
- Reliability batch (REL-003/007/008/009/010), the highest-blast-radius unbounded query (PERF-002 workspace export), cache headers on all API routes (PERF-006), and parallelisation of independent reads (PERF-007) are now closed.
- Roughly 35 of 60 documented bugs remain open across Batches 3, 4 (residual), 5 (residual), 7 (residual), 8, 9 (residual), 10 (callsites), 11.
- Browser-level validation and post-remediation agent review have **not** been performed.
- Per §13 of the master brief and the audit's own gate criteria, the project does not yet meet the production-readiness bar. The default verdict from `14_FINAL_PLAN_MODE_SUMMARY.md` (**NOT complete**) stands.

## What Did Land (high-confidence statements)

1. Authentication is now real (TOTP via otplib, recovery codes are bcrypt-hashed one-time tokens, bcrypt rounds raised to 12).
2. Session invalidation works end-to-end: role change or deactivation forces re-login on the next request via the `sv` JWT claim.
3. Middleware now protects `/api/*` (defence-in-depth) without breaking container probes.
4. App-segment error/loading/not-found boundaries plus global-error eliminate the previous white-screen-on-throw class of bugs.
5. Hot-path DB queries are now indexed (board, backlog, sprint, assignee, audit, notifications, comments).
6. Environment configuration fails fast at startup with a descriptive error if `AUTH_SECRET` is missing/weak.
7. Container orchestration has `/api/health` (liveness) and `/api/ready` (DB probe).
8. CI workflow runs lint → typecheck → test → build on every push.
9. Structured JSON logger is available; **adoption across callsites is the remaining Batch 10 work**.

## Next Session Entry Point

Resume by:
1. Re-reading this file and `10_BUG_REGISTER.md` to confirm the open list.
2. Tackling Batch 3 (CON-001..004) — these are user-visible and likely block the next round of browser validation.
3. After Batch 3 lands, run Playwright + 10-agent review in parallel, then update `13_*` and `14_*` with real evidence.
