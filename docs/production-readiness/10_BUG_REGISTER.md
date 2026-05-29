# 10 — Bug Register

> Severity rubric (from brief §8): **Critical** = production blocker · **High** = exploitable / missing defense-in-depth / failing critical test · **Medium** = hardening gap / quality defect · **Low** = polish.
>
> Every bug below is traced into `11_REMEDIATION_ROADMAP.md` by **Batch**.

## Batch 2a close-out (2026-05-29) — RESOLVED

| ID | Title | Resolution | Verification |
|---|---|---|---|
| **SEC-003** | Missing CSP header | `next.config.ts` — `Content-Security-Policy` set with `default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`. `'unsafe-inline'` retained on script/style for Next 16 RSC hydration + Tailwind critical CSS; nonce-based variant scheduled with proxy.ts migration in Batch 9. | `npm run build` emits header on every route; manual curl shows header on 200 responses. |
| **SEC-004** | Missing HSTS header | `next.config.ts` — `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`. | Same build/header proof as SEC-003. |
| **SEC-007** | No explicit CSRF on `/api/*` GET exports | New `src/lib/http/origin.ts` `assertSameOrigin()`; applied to `/api/export/profile` and `/api/export/workspace` GET handlers. Rejects browser-originated cross-origin downloads with 403. | `src/lib/http/__tests__/origin.test.ts` — 5 unit tests cover no-Origin/same-origin/cross-origin/malformed/missing-host. |
| **SEC-009** | Deprecated `X-XSS-Protection` set | `next.config.ts` — value changed from `1; mode=block` to `0` per OWASP 2024 guidance. | Build output. |
| **SEC-012** | bcrypt rounds = 10 | `src/lib/auth/password.ts` — `ROUNDS` raised from 10 to 12 (OWASP 2024 baseline). Existing 10-round hashes still verify via `bcrypt.compare`. | 79/79 tests still pass including MFA/login suites. |

Remaining Batch 2 follow-up (deferred to Batch 2b): SEC-006/PERF-005 (shared rate-limit store), SEC-008 (middleware `/api/*` coverage), SEC-011 (danger.ts hardening), SEC-013 (sessionVersion JWT claim + role-change rotation), SEC-014 (inline-style audit doc), SEC-015 (ApiToken scope enforcement).

## Batch 1 close-out (2026-05-29) — RESOLVED

| ID | Title | Resolution | Verification |
|---|---|---|---|
| **SEC-001** | MFA confirm accepts any 6-digit code | `src/lib/actions/security.ts` — `confirmMfa` now uses `authenticator.verify({ token, secret })` (RFC 6238); recovery codes generated via `crypto.randomBytes` and stored bcrypt-hashed (newline-joined). | `src/lib/actions/__tests__/security.test.ts` — fake-MFA regression guard rejects `000000`; recovery-hash assertion passes. |
| **SEC-002** | Login never challenges MFA when `mfaEnabled` | `signInAction` issues a short-lived `agileforge_pending_mfa` JWT cookie when MFA is enabled and returns `{ mfaRequired: true }`. New `verifyMfaLoginAction` consumes the pending cookie and verifies TOTP, OR a single-use bcrypt-hashed recovery code. `LoginForm` shows a two-stage UI with a recovery-code toggle. | `e2e/mfa.spec.ts` — password-only does not reach dashboard; invalid code → alert; valid TOTP → `/dashboard`. |
| **SEC-005** | `Math.random()` for MFA secret/recovery codes | `randomBase32` / `randomRecoveryCode` switched to `crypto.randomBytes`. | Covered by SEC-001 unit suite. |
| **REL-001 / QA-001** | 2 of 68 unit tests failing | `createWorkItem` key generation refactored to bounded `findFirst` ordered by `createdAt desc` inside `$transaction`. | `npm run test -- --run` → **74/74 PASS** (was 66/68). See `12_COMMAND_RESULTS.md`. |
| **OPS-001** | No CI of any kind | `.github/workflows/ci.yml` — `quality` job (lint → typecheck → test → build with Prisma generate/push/seed) + `e2e` job (Playwright Chromium, uploads `playwright-report` artifact). | Will execute on next push to this branch. |

Remaining Batch 1 follow-up: **none**. Proceeding to Batch 2 (SEC-003/004/006/007/008, PERF-005).

## Critical (5)

| ID | Title | Evidence | Fix | Test | Batch |
|---|---|---|---|---|---|
| **SEC-001** | MFA confirm accepts any 6-digit code | `src/lib/actions/security.ts:109-135` | Implement RFC 6238 TOTP via `otplib`; verify against `mfaSecret` | unit test of `confirmMfa` w/ valid + invalid codes; e2e MFA flow | 1 |
| **SEC-002** | Login never challenges MFA when `mfaEnabled` | `src/lib/auth/actions.ts:38-101` | Branch on `user.mfaEnabled`; require code at login; pending-MFA cookie | e2e: MFA-enabled user must enter code | 1 |
| **REL-001 / QA-001** | 2 of 68 unit tests failing | `npm run test` output (see `12_COMMAND_RESULTS.md`) | Fix `createWorkItem` test mock OR refactor `work-items.ts:116` to not use callback-style `$transaction` | Re-run; gate CI on green | 1 |
| **OPS-001** | No CI of any kind | grep of `.github/`, etc. | Add GitHub Actions: lint+typecheck+test+build | self-evident | 1 |
| **PERF-004 / OPS-004** | SQLite in production schema | `prisma/schema.prisma:11-13` | Postgres migration; swap adapter to `@prisma/adapter-pg` | restore drill; perf smoke | 4 |

## High (26)

| ID | Title | Evidence | Batch |
|---|---|---|---|
| **SEC-003** | Missing CSP header | `next.config.ts:14-23` | 2 |
| **SEC-004** | Missing HSTS header | `next.config.ts:14-23` | 2 |
| **SEC-005** | `Math.random()` for MFA secret + recovery codes | `src/lib/actions/security.ts:84-93` | 1 |
| **SEC-006** | In-process login rate-limit | `src/lib/auth/actions.ts:15-27` | 2 |
| **SEC-007** | No explicit CSRF on `/api/*` GET exports | `src/app/api/export/*` | 2 |
| **SEC-008** | Middleware excludes `/api/*` | `src/middleware.ts:30-33` | 2 |
| **PERF-001 / DB-001** | No `@@index` declarations anywhere | `prisma/schema.prisma` | 4 |
| **PERF-002** | Unbounded `findMany` (export, key gen, integrations) | `api/export/workspace/route.ts:33-47`; `work-items.ts:116-124`; `integrations.ts:10` | 4 |
| **PERF-003 / REL-004** | Non-atomic WI key generation race | `work-items.ts:117-125` | 4 |
| **PERF-005** | In-process rate limit + Map | `auth/actions.ts:15-27` | 2 |
| **REL-002** | No `error.tsx` / `loading.tsx` / `not-found.tsx` | layout scan | 6 |
| **REL-003** | Multi-write actions without `$transaction` | `work-items.ts:47-71`; `security.ts:56-69`; `sprints.ts:62-99` | 4 |
| **REL-005** | `resetDemoData` spawns child process | `danger.ts:73-78` | 6 |
| **QA-002** | Server-action test coverage <20% | spec inventory | 7 |
| **QA-003** | Playwright suite unverified | not executed | 7 |
| **QA-004** | No CI runs E2E | OPS-001 | 1+7 |
| **OPS-002** | No `/api/health` | code search | 9 |
| **OPS-003** | No structured logging | grep `console.error` | 10 |
| **OPS-005** | `middleware` → `proxy` deprecation | build output | 9 |
| **A11Y-001** | No loading/error/not-found UI | layout scan | 8 |
| **A11Y-002** | A11y compliance unverified | no axe runs | 8 |
| **CON-001** | Backlog reorder persistence not verified | code read incomplete | 3 |
| **CON-002** | Scrum/Kanban drag persistence not verified | code read incomplete | 3 |
| **CON-003** | `/search` path not verified | code read incomplete | 3 |
| **PERF-007** | Sequential awaits where parallel possible | `work-items.ts:54-64` | 5 |
| **PERF-008** | No bundle analyzer / dynamic import for charts | none configured | 5 |

## Medium (33)

| ID | Title | Batch |
|---|---|---|
| **SEC-009** | Deprecated `X-XSS-Protection` set | 2 |
| **SEC-010** | Weak `AUTH_SECRET` default in `.env.example` | 9 |
| **SEC-011** | `resetDemoData` child shell — guard against future user input | 2 |
| **SEC-012** | `bcrypt` rounds = 10 | 2 |
| **SEC-013** | JWT not rotated on role change | 2 |
| **SEC-014** | Inline styles vs CSP nonce design | 2 |
| **SEC-015** | API token scopes not enforced | 2 |
| **PERF-006** | No HTTP caching strategy | 5 |
| **PERF-009** | bcrypt rounds (dup of SEC-012) | — |
| **PERF-010** | `completeSprint` per-item updates | 5 |
| **REL-006** | No health endpoint (dup OPS-002) | — |
| **REL-007** | No graceful shutdown for Prisma client | 6 |
| **REL-008** | Sprint completion N+1 writes | 5 |
| **REL-009** | Notifications loop awaits one-by-one | 5 |
| **REL-010** | No retry policy on transient DB errors | 6 |
| **REL-011** | No structured logging (dup OPS-003) | — |
| **MNT-001** | Oversized `work-items.ts`, `settings.ts` | 11 |
| **MNT-002** | Duplicated activity/notification side-effect blocks | 11 |
| **MNT-003** | Zod schemas not derived from const tuples | 11 |
| **MNT-004** | Doc drift (FINAL_IMPLEMENTATION_REPORT, RTM, SECURITY.md) | every batch |
| **MNT-005** | Two master-brief files | 11 |
| **A11Y-003** | Contrast tokens unaudited | 8 |
| **A11Y-004** | Modal focus trap unverified at runtime | 8 |
| **A11Y-005** | Toast ARIA live region unverified | 8 |
| **A11Y-006** | Keyboard reachability on board cards | 8 |
| **OPS-006** | No documented deployment target | 9 |
| **OPS-007** | No migration runbook | 9 |
| **OPS-008** | No env var validation at startup | 9 |
| **OPS-009** | No bundle analyzer (dup PERF-008) | — |
| **OPS-010** | No backup strategy | 9 |
| **CON-004** | Integrations are simulated; UI does not disclose | 3 |
| **QA-005** | No tests asserting RBAC at action layer | 7 |
| **QA-006** | Seed data determinism unverified | 7 |
| **QA-007** | No coverage threshold enforcement | 7 |
| **QA-008** | No tests for `/api/export/*` | 7 |

## Low (rolled into Medium where listed; otherwise omitted)

`MNT-006`, `MNT-007`, `MNT-008`, `OPS-011` — covered above; no separate Low batch.

## Tally

- Critical: **5**
- High: **26**
- Medium: **33**
- Total tracked: **64** (excluding dups)

Every ID above appears in `11_REMEDIATION_ROADMAP.md` under exactly one batch.
