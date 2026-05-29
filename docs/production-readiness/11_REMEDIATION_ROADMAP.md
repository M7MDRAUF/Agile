# 11 — Remediation Roadmap

> 11 batches per brief §9. Each batch lists agents, files likely to change, commands to re-run, browser validation, stop condition, and approval gate.

## Batch 1 — Critical blockers

**Bug IDs:** SEC-001, SEC-002, SEC-005, REL-001/QA-001, OPS-001.

- **Agents:** security-reviewer, backend-engineer, qa-engineer, system-architect (CI design).
- **Files likely to change:**
  - `src/lib/actions/security.ts` (TOTP via `otplib`, crypto-safe randoms)
  - `src/lib/auth/actions.ts` (MFA branch at login, pending-MFA cookie)
  - `src/lib/actions/work-items.ts` *or* `src/lib/actions/__tests__/work-items.test.ts` (fix QA-001)
  - `package.json` (`otplib`)
  - new: `.github/workflows/ci.yml` (lint+typecheck+test+build)
- **Commands after fix:** `npm run lint && npm run typecheck && npm run test -- --run && npm run build` → all green; CI dry-run in PR.
- **Browser validation:** MFA-enabled user must enter TOTP at login to succeed.
- **Stop condition:** any of (test fails, MFA bypassable, CI red) ⇒ rework.
- **Approval gate:** security-reviewer + qa-engineer sign-off.

## Batch 2 — High security & RBAC

**Bug IDs:** SEC-003, SEC-004, SEC-006, SEC-007, SEC-008, SEC-009, SEC-011, SEC-012, SEC-013, SEC-014, SEC-015, PERF-005.

- **Agents:** security-reviewer, system-architect.
- **Files:**
  - `next.config.ts` (CSP, HSTS; remove `X-XSS-Protection`)
  - `src/middleware.ts` or new `src/proxy.ts` (include `/api/*`; add nonce; reject unauthenticated)
  - `src/lib/auth/actions.ts` (rate-limit via Redis/Upstash; bump bcrypt to 12)
  - `src/lib/auth/session.ts` (rotate `sid` on role change)
  - `src/lib/actions/admin.ts` (bump JWT generation on role change)
  - `src/lib/api/auth.ts` (NEW — `Authorization: Bearer` middleware for API tokens; enforce scopes)
  - `src/lib/actions/danger.ts` (add inline comment: "never accept user-controlled args")
- **Commands:** lint/typecheck/test/build. New tests for token-scope enforcement and rate-limit.
- **Browser validation:** CSP report-only headers visible; HSTS visible on HTTPS deploy; brute-force attempt blocked across replicas.
- **Stop condition:** any header missing, scope check absent, JWT survives role change ⇒ rework.
- **Approval gate:** security-reviewer.

## Batch 3 — Core feature completeness

**Bug IDs:** CON-001, CON-002, CON-003, CON-004.

- **Agents:** frontend-engineer, backend-engineer, browser-tester.
- **Files:**
  - `src/components/board/*` (verify drag → server-action wiring)
  - `src/app/(app)/backlog/*` (reorder action; persistence)
  - `src/app/(app)/search/*` (query path)
  - `src/components/settings/integrations-*` (banner: "simulated for now")
- **Commands:** lint/typecheck/test/build/test:e2e (NEW e2e for board persistence).
- **Browser validation:** drag a card; reload; verify card stays in new column.
- **Stop condition:** any drag does not persist ⇒ rework.
- **Approval gate:** browser-tester signs Passed evidence.

## Batch 4 — Data integrity & DB safety

**Bug IDs:** PERF-001/DB-001, PERF-002, PERF-003/REL-004, PERF-004/OPS-004, REL-003.

- **Agents:** database-engineer, backend-engineer.
- **Files:**
  - `prisma/schema.prisma` — add indexes on `WorkItem(projectId, sprintId, assigneeId, status, parentId, epicId)`, `Notification(userId, read)`, `AuditLog(actorId, createdAt)`, `ActivityLog(workItemId)`, etc.
  - `prisma/migrations/*` (NEW)
  - `prisma/schema.prisma` — switch provider to `postgresql`; `DATABASE_URL` doc
  - `src/lib/db.ts` — swap adapter to `@prisma/adapter-pg`
  - `src/lib/actions/work-items.ts` — replace `findMany`-to-compute-key with `Counter` table or `INSERT … RETURNING` pattern; wrap multi-writes in `$transaction`
  - `src/app/api/export/workspace/route.ts` — paginate / stream
  - `src/lib/actions/security.ts`, `src/lib/actions/sprints.ts` — wrap in `$transaction`
- **Commands:** `npm run db:migrate` (in CI-style ephemeral DB); EXPLAIN ANALYZE on hot queries; load smoke at 50 RPS.
- **Browser validation:** Concurrent WI create from two sessions both succeed with distinct keys.
- **Stop condition:** any concurrent test fails or query plan shows seq-scan on indexed column.
- **Approval gate:** database-engineer + backend-engineer.

## Batch 5 — Performance & scalability

**Bug IDs:** PERF-006, PERF-007, PERF-008, PERF-010, REL-008, REL-009.

- **Agents:** frontend-engineer, backend-engineer, system-architect.
- **Files:**
  - Add `@next/bundle-analyzer` to `next.config.ts`
  - `next/dynamic` on chart-heavy components
  - Replace `Promise.all(map(prisma.notification.create))` with `prisma.notification.createMany`
  - `completeSprint` → single `updateMany`
  - Add `unstable_cache` + `revalidateTag` on dashboard rollups
- **Commands:** bundle report; k6 smoke at 50 RPS / 200 RPS; p95 < 300 ms target on RSC routes.
- **Browser validation:** Lighthouse perf ≥ 85 on `/dashboard`.
- **Stop condition:** any p95 over budget; bundle main route > 250 KB gz.
- **Approval gate:** system-architect.

## Batch 6 — Reliability & error handling

**Bug IDs:** REL-002, REL-005, REL-007, REL-010.

- **Agents:** frontend-engineer, backend-engineer.
- **Files:**
  - `src/app/(app)/**/error.tsx` and `loading.tsx` per segment
  - root `src/app/not-found.tsx`
  - `src/lib/actions/danger.ts` — move seed reset to a manual script; remove `execFile`
  - retry helper for transient Prisma errors
- **Commands:** lint/typecheck/test/build.
- **Browser validation:** throw test error in RSC → see segment-scoped error UI with retry button.
- **Stop condition:** any thrown error escapes to root.
- **Approval gate:** frontend-engineer.

## Batch 7 — Test coverage expansion

**Bug IDs:** QA-002, QA-003, QA-004, QA-005, QA-006, QA-007, QA-008.

- **Agents:** qa-engineer.
- **Files:**
  - `src/lib/actions/__tests__/*.test.ts` (NEW for each action: positive, negative-RBAC, validation-fail)
  - `e2e/*.spec.ts` (expand to cover MFA, board drag, sprint lifecycle, admin)
  - `playwright.config.ts` (global setup: DB reset + seed)
  - `vitest.config.ts` (coverage thresholds ≥80% lines, ≥75% branches on `src/lib/`)
  - new e2e for `/api/export/*`
- **Commands:** full suite green; coverage report uploaded to CI artifact.
- **Stop condition:** any threshold unmet.
- **Approval gate:** qa-engineer.

## Batch 8 — Accessibility & usability

**Bug IDs:** A11Y-001 (also REL-002), A11Y-002, A11Y-003, A11Y-004, A11Y-005, A11Y-006.

- **Agents:** accessibility-reviewer, frontend-engineer.
- **Files:**
  - `@axe-core/playwright` integration; per-route axe assertion
  - Board cards: keyboard "Move" menu
  - Theme tokens: verify ≥4.5:1 contrast
- **Commands:** axe per route in light + dark.
- **Stop condition:** any "serious" or "critical" axe violation.
- **Approval gate:** accessibility-reviewer.

## Batch 9 — Deployability & CI/CD

**Bug IDs:** OPS-002, OPS-005, OPS-006, OPS-007, OPS-008, OPS-010, SEC-010.

- **Agents:** system-architect, database-engineer.
- **Files:**
  - `src/app/api/health/route.ts`, `src/app/api/ready/route.ts` (NEW)
  - rename `src/middleware.ts` → `src/proxy.ts` (Next 16)
  - `Dockerfile`, `docker-compose.yml` (or `vercel.json`)
  - `docs/DEPLOY.md` (migrations + rollback)
  - `src/env.ts` (Zod-validated env)
  - `.env.example` (bootstrap script for `AUTH_SECRET`)
  - `scripts/backup.sh`
- **Commands:** build a fresh container; spin DB; run health probe.
- **Stop condition:** health probe fails; container does not start.
- **Approval gate:** system-architect.

## Batch 10 — Observability & operability

**Bug IDs:** OPS-003.

- **Agents:** system-architect, backend-engineer.
- **Files:**
  - `src/lib/log.ts` (Pino + request-scoped child)
  - Replace `console.error` across `src/lib/actions/*`
  - Optional: `@opentelemetry/sdk-node` for traces
- **Commands:** local log inspection; trace export to console exporter.
- **Stop condition:** any action still uses raw `console.error`.
- **Approval gate:** system-architect.

## Batch 11 — Documentation & traceability

**Bug IDs:** MNT-001, MNT-002, MNT-003, MNT-004, MNT-005.

- **Agents:** product-architect, final-reviewer.
- **Files:**
  - Split `work-items.ts` and `settings.ts` per MNT-001
  - Extract `_helpers/withActivity.ts` per MNT-002
  - Reconcile `docs/MASTER_BRIEF.md` ↔ root-level brief
  - Update `docs/REQUIREMENTS_TRACEABILITY_MATRIX.md` honestly (see `RTM_UPDATE_PLAN.md`)
  - Update `docs/SECURITY.md` to match real headers
  - Update `docs/FINAL_IMPLEMENTATION_REPORT.md` to remove unsupported "complete" claims
- **Commands:** doc proofread; cross-link audit.
- **Stop condition:** any doc still claims completed state for a still-open Bug-ID.
- **Approval gate:** final-reviewer.

## Sequencing rule

Batch 1 **must** ship before any other batch begins (CI + critical-security + green tests are preconditions for safely landing further work). Batches 2–4 may run in parallel by separate engineers. Batches 5–10 sequence after 4. Batch 11 runs in parallel with batches 5–10 and gates release.

## Release gate (from brief §13)

| Gate | Pass criterion |
|---|---|
| Build | `npm run build` green |
| Test | `npm run test -- --run` 100% (≥80% line coverage) |
| E2E | `npm run test:e2e` 100% in CI |
| Lint | `npm run lint` clean |
| Typecheck | `npm run typecheck` clean |
| Security | Zero Critical/High open; CSP + HSTS active; rate-limit shared store; MFA real |
| Reliability | Per-segment error boundaries; health probe live; no failing tests |
| DB | Postgres in prod; indexes on hot FKs; transactional multi-writes |
| Ops | CI green; structured logs; documented backups + restore drill |
| Accessibility | Zero serious axe violations on every audited route |
| Docs | RTM truthful; FINAL_IMPLEMENTATION_REPORT reflects reality |

**Release only when every gate is green.**
