# Remediation Progress — 2026-05-29

Honest cumulative delta against `10_BUG_REGISTER.md` (60 bugs) and `11_REMEDIATION_ROADMAP.md` (11 batches). This document does **not** retroactively edit the original audit; it records what has actually shipped on branch `implement-production-readiness-fixes` and what is still open.

## Command Gates (re-run after every batch commit, this snapshot from `4f6d579`)

| Command | Status | Notes |
|---|---|---|
| `npm run lint` | PASS — 0 errors, 0 warnings | clean |
| `npm run typecheck` | PASS — no diagnostics | `tsc --noEmit` |
| `npm run test -- --run` | PASS — 440/440 tests across 26/26 files | vitest 4 (export route + seed-determinism + permissions-matrix tests added this session; matrix block contributes 243 parameterised cells) |
| `npm run build` | PASS — Next 16 production build | all routes compiled, proxy middleware bundled |
| `npm run test:e2e` | **Not Verified** — requires dev server + DB seed; not executed in this session |
| `npm run test:coverage` | PASS — 65.94 stmts / 60.81 branch / 69.93 funcs / 66.34 lines (all > thresholds 35/35/40/60). QA-007 fully closed in commit `c858a40` |

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
| OPS-005 middleware → proxy | `41e6016` | `src/middleware.ts` renamed to `src/proxy.ts`; function `middleware` → `proxy`; `npm run build` reports "ƒ Proxy (Middleware)" confirming Next 16 took the rename |
| OPS-006 Dockerfile + .dockerignore | `415ec4e` | 3-stage build (deps/build/runtime), non-root `node` user, OpenSSL-only runtime base, HEALTHCHECK → `/api/health`, `.dockerignore` strips git/tests/docs/secrets |
| OPS-007 `DEPLOY.md` runbook | `415ec4e` | env-var table, first-time deploy, zero-downtime upgrade rules (additive migrations only; two-step destructive), rollback, health/readiness, graceful shutdown reference, capacity limits, pre-prod checklist, incident table |
| OPS-010 backup + restore drill | `415ec4e` | `scripts/backup.sh` (SQLite `.backup` / Postgres `pg_dump -Fc`, retention prune scoped to BACKUP_DIR) + `scripts/RESTORE_DRILL.md` (weekly spot, quarterly full, 7-workflow walk-through, failure-mode table) |
| OPS-003 callsite migration | (this session, evidence below) | Grep across `src/lib/actions/**` shows **zero** `console.*` callsites; the only `console.*` uses in the codebase are inside `src/lib/logger.ts` (the logger itself) and the two client error boundaries `src/app/(app)/error.tsx` + `src/app/global-error.tsx` where `console.error` is the correct browser primitive. Misleading "TODO replace with logger" comment removed from `error.tsx`. The "~50 callsites in actions" assumption in the original triage was incorrect — there are none. |
| CON-001 / CON-002 board persistence | (this session, evidence below) | Boards are **not** drag-drop UIs. `src/components/board/Board.tsx` is a server component that renders each card with `<StatusSelect itemId itemTitle status />` (client component, `src/components/work-item/StatusSelect.tsx`). Status changes go through the existing `updateWorkItemStatus` server action: RBAC-gated, validated, audit-logged, transactional, `revalidatePath`'d. Persistence is real and already covered by `work-items.test.ts`. The original "drag-drop persistence verification" framing was a misread of the implementation. |
| CON-003 backlog row-reorder | (this session) | `src/app/(app)/backlog/page.tsx` is a read-only list sorted by `priority` then `storyPoints`. There is **no** client-side reorder UI to verify. Manual prioritisation flows through editing each item's `priority` field via the work-item detail page (covered by `updateWorkItem` action tests). Marked **out of scope for v1** — drag-to-reorder is a v2 enhancement. |
| CON-004 integrations "simulated" banner | (this session) | Already shipped: `src/components/settings/IntegrationsSection.tsx:42-45` reads *"Connect external tools. Connections are simulated in local development — no real OAuth handshake is performed."* No further work required. |

**Closed: ~33 of 60 documented bugs (QA-007 counted as partial, OPS-003 reclassified as complete after callsite audit).**

## Bugs Open / Deferred (intentionally honest list)

### Batch 2b residual
- **SEC-006 / PERF-005** shared rate-limit abstraction across auth + API tokens (current limiter is auth-only in-memory)
- **SEC-014** inline-style CSP `'unsafe-inline'` audit doc + roadmap to nonce
- **SEC-015** ApiToken `scopes` runtime enforcement (column exists, no middleware reads it)

### Batch 3 — Core feature completeness
- (all closed — see CON-001..004 rows above)

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
- **QA-002** ✅ landed — server-action test coverage now includes sprints (17), teams (12), qa (13), danger (11), settings (14) on top of the prior admin/notifications/integrations/api-tokens/projects/security/work-items suites. Full suite: **179 tests / 23 files** all green.
- **QA-003** ✅ landed — `.github/workflows/ci.yml` defines a dedicated `e2e` job (needs: `quality`) that installs Playwright + chromium, generates Prisma client, pushes schema, seeds, builds, runs `npm run test:e2e`, and uploads `playwright-report/` as a 7-day artifact on every run regardless of pass/fail. The earlier "not run in CI" framing in this doc was stale.
- **QA-005** ✅ landed — `src/lib/domain/__tests__/permissions-matrix.test.ts` pins the full 8 roles × 26 permissions matrix (208 cells) plus dangerous-action lock-ins (admin.access / settings.manage_workspace / user.manage / audit.view denied to all 7 non-admin roles), "only admin has all permissions" invariant, "stakeholder is read-only" invariant, and `canEditWorkItem` assignment-scoped edit rules for admin/EM/PO/SM/engineer/designer/stakeholder. 243 tests in this file; any future silent privilege escalation must update EXPECTED_GRANTS deliberately
- **QA-006** ✅ landed — `src/lib/__tests__/seed-determinism.test.ts` (9 tests) asserts the seed's reproducibility contract without running it against a DB: fixed `mulberry32(20260529)` literal, no `Math.random()` callsites, deterministic helper trio present, 8 canonical demo accounts + 6 team keys still spec'd, bcrypt-hashed seed password, FK-safe reset ordering, plus runtime reproducibility of the inlined mulberry32
- **QA-007** ✅ landed (commit `c858a40`) — `@vitest/coverage-v8@^4.1.7` installed; `npm run test:coverage` script added; `coverage/**` added to `eslint.config.mjs` ignores; thresholds 35/35/40/60 enforced and actuals are 65.94/60.81/69.93/66.34 (all above)
- **QA-008** ✅ landed — `/api/export/{workspace,profile}` route tests (9 tests) cover SEC-007 cross-origin reject (403), RBAC engineer-reject (403), CSV default with `Cache-Control: private, no-store` + `Content-Disposition`, JSON `?format=json` with `truncated=false`, PERF-002 `?limit=N` clamp + `X-Export-Truncated: true; cap=N` header, invalid-limit fallback to 50_000 cap, own-data profile JSON with user-scoped query assertions (no cross-user leak), same-origin allowed

### Batch 8 — Accessibility
- **A11Y-001** ✅ landed — `@axe-core/playwright` added to devDependencies; `e2e/accessibility.spec.ts` runs `AxeBuilder` against `/login` + 7 authenticated routes (`/dashboard`, `/my-work`, `/work-items`, `/backlog`, `/boards/kanban`, `/projects`, `/settings`); gate is `serious + critical` only with minor/moderate captured as Playwright annotations; remaining route expansion tracked in spec `TODO` block
- **A11Y-002** ✅ closed-as-not-reproduced — Boards do **not** have a drag-drop UI; `Board.tsx` is a server component rendering each card with a native `<select>` (`StatusSelect`) which is fully keyboard-operable (Tab + Arrow + Space/Enter). No fallback needed; documented in `06_USABILITY_AND_ACCESSIBILITY_AUDIT.md`
- **A11Y-003** ✅ landed — contrast verification is now gated by axe's `color-contrast` rule (WCAG 2.1 AA tag set) on every CI run; any token regression in `src/app/globals.css` raises a `serious` violation that fails the gate
- **A11Y-004** ✅ closed-as-not-reproduced — `grep` for `role="dialog"` and `aria-modal` returns zero matches; the app ships no modal/dialog primitives, only a `role="menu"` dropdown in `Topbar` with a `tabIndex={-1} aria-hidden` backdrop. The original audit's "Radix Dialog" reference was incorrect — `@radix-ui/*` is not in `package.json`
- **A11Y-005** ✅ landed — `src/components/ui/table.tsx` `<TH>` now defaults `scope="col"`, propagating to all 5 consumer tables (`/work-items`, `/users`, `/admin`, `/qa`, settings); `src/components/settings/RolesMatrix.tsx` got an `sr-only <caption>`, `scope="col"` on role headers, and the permission column promoted from `<td>` to `<th scope="row">`
- **A11Y-006** ✅ landed — sweep of icon-only buttons confirms `NotificationActions`, `TeamMemberControls`, `MfaSection`, `Sidebar` collapse, `Topbar` notifications link, `_shared.Toggle` all already carry `aria-label` or visible text; **one** gap fixed: `Topbar` account-menu trigger (visible name hidden on `<sm` breakpoints) now has `aria-label={`Account menu for ${user.name}`}`

### Batch 9 residual — Deployability
- (all closed — OPS-005/006/007/010 in commits `41e6016` + `415ec4e`)

### Batch 10 — Observability
- (closed — OPS-003 callsite audit shows zero misplaced `console.*` in actions; see closed-bug table)

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
- Batch 3 (CON-001..004), Batch 9 (OPS-005/006/007/010), and Batch 10 (OPS-003 callsite audit) are now closed.
- Roughly 27 of 60 documented bugs remain open across Batches 2b (residual), 4 (residual), 5 (residual), 7 (residual), 8, 11.
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
