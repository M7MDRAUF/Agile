# 07 — Testability Audit

## Summary

Test infrastructure is in place (Vitest 4.1.7 + Playwright 1.60). Real coverage is concentrated on **pure domain helpers** (permissions, password policy, metrics). Coverage of **server actions** is shallow — and the one server-action spec that exists (`work-items.test.ts`) is currently **failing** because the production code shape diverged from the mock.

## Findings

### QA-001 [Critical] — 2 of 68 unit tests failing on `main`
- **Command:** `npm run test -- --run`
- **Failures:**
  - `src/lib/actions/__tests__/work-items.test.ts > createWorkItem > generates key as PROJECT_KEY-{max+1} when items already exist`
  - `src/lib/actions/__tests__/work-items.test.ts > createWorkItem > generates key as PROJECT_KEY-1 when no items exist yet`
- **Cause:** `TypeError: tx.workItem.findMany is not a function`. The mock in the test passes a fake `prisma` whose `$transaction(callback)` invokes the callback with `prisma` itself; the test sets `prisma.workItem.findMany = vi.fn(...)`. But `src/lib/actions/work-items.ts:116` calls `prisma.$transaction(async (tx) => { tx.workItem.findMany(...) })`. The mocked `$transaction` does not forward the model functions to the inner `tx` object correctly.
- **Two valid fixes:**
  1. **Test fix** — mock `$transaction` to pass `prisma` (the same mocked object) as `tx`.
  2. **Code fix** — refactor `createWorkItem` to compute the next key **before** opening the transaction, or use `prisma` directly (no callback flavor). Either fix should be accompanied by a regression test that covers the race (PERF-003 / REL-004).

### QA-002 [High] — Server-action test coverage <20%
- Specs present (read confirmed):
  - `src/lib/actions/__tests__/work-items.test.ts` (failing) — only `createWorkItem`
  - `src/lib/domain/__tests__/permissions.test.ts`
  - `src/lib/domain/__tests__/password.test.ts` (likely)
  - `src/lib/domain/__tests__/policies.test.ts`
  - `src/lib/domain/__tests__/metrics.test.ts`
  - `src/lib/auth/__tests__/session.test.ts` (read confirms)
  - … 9 spec files total, ~68 tests, **8 passed files** of 9.
- **Missing server-action coverage:** `admin.ts`, `api-tokens.ts`, `danger.ts`, `integrations.ts`, `projects.ts`, `qa.ts`, `security.ts`, `settings.ts`, `sprints.ts`, `notifications.ts`, `teams.ts`, and the rest of `work-items.ts`.
- **Fix:** require ≥80% statement coverage on `src/lib/actions/` before any production release. Add coverage report to CI.

### QA-003 [High] — Playwright suite shape
- Files: `e2e/auth.spec.ts`, `e2e/navigation.spec.ts`, `e2e/work-items.spec.ts`, `e2e/settings.spec.ts`, `e2e/management.spec.ts`, `e2e/projects.spec.ts` — **6 specs**.
- **Not executed** during this audit (dev server start would mutate state).
- **Risk:** unknown pass rate; selectors may be fragile.

### QA-004 [High] — No `npm test:e2e` evidence + no CI runs them
- See `08_DEPLOYABILITY_AND_OPERABILITY_AUDIT.md` — there are no CI workflows. Even passing local E2E provides zero ongoing guarantee.

### QA-005 [Medium] — No tests for RBAC enforcement at the action layer
- `permissions.test.ts` covers the `can()` decision matrix, but no test asserts that a **non-permitted user calling a server action gets rejected**. Without this, a refactor that accidentally drops the `requirePermission` call in any action goes undetected.
- **Fix:** for every action, one positive and one negative RBAC test.

### QA-006 [Medium] — Seed data determinism unverified
- `prisma/seed.ts` exists; no automated check that running it twice yields the same record IDs or that tests reset the DB before each Playwright spec.
- **Fix:** in `playwright.config.ts`, register a `globalSetup` that resets the DB to seed state.

### QA-007 [Medium] — `vitest.config.ts` does not enable coverage by default
- Coverage thresholds are not enforced. Adding `coverage: { thresholds: { lines: 80, … } }` would surface gaps automatically.

### QA-008 [Medium] — No tests for `/api/export/*` route handlers
- These are the only public API surfaces today. They must be tested for: auth required, large-export bounded (PERF-002), correct CSV/JSON shape.

## Coverage map (by area)

| Area | Unit | E2E | Verdict |
|---|---|---|---|
| Domain helpers | ✅ Good | n/a | Strong |
| Permissions | ✅ | ❓ | Need negative-path E2E |
| Auth (password, session) | ✅ | ✅ (login spec) | Acceptable |
| MFA | ❌ | ❌ | Critical gap (compounds SEC-001) |
| Work items | ⚠️ (failing) | ✅ (CRUD) | Below bar |
| Projects/Sprints/Teams/QA | ❌ | partial | Below bar |
| Admin (user mgmt) | ❌ | partial | Below bar |
| Integrations/API tokens | ❌ | ❌ | Below bar |
| `/api/export/*` | ❌ | ❌ | Below bar |
| Accessibility (axe) | ❌ | ❌ | Missing |

## Recommendation

QA-001 is a **release blocker** (Critical). QA-002, QA-003, QA-005 are **High**. Until coverage on server actions is enforced in CI, any refactor can silently regress persistence or RBAC.
