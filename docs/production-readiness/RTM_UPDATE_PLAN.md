# RTM Update Plan

> Per audit guardrails, this file does **not** modify `docs/REQUIREMENTS_TRACEABILITY_MATRIX.md` or `docs/FINAL_IMPLEMENTATION_REPORT.md` in place. It records the corrections that the remediation-batch owners must apply during Batch 11.

## Why a correction plan is needed

`docs/FINAL_IMPLEMENTATION_REPORT.md` and `docs/REQUIREMENTS_TRACEABILITY_MATRIX.md` describe several capabilities as **complete** that this audit found to be either **fake**, **partially functional**, or **unverified**. Shipping the codebase with these claims intact would itself be a release blocker — the master brief §13 forbids unsupported "complete" claims.

## Corrections required

Each row below identifies a claim that must be reworded with reference to the audit finding that contradicts it.

| Claim in RTM / FINAL_IMPLEMENTATION_REPORT | Reality | Source | Replacement language |
|---|---|---|---|
| "MFA is enabled and required for sensitive operations" | MFA confirm accepts any 6-digit string; login does not challenge MFA at all | SEC-001 (`security.ts:109`), SEC-002 (`auth/actions.ts:38`) | "MFA UI is present; runtime TOTP verification and login-time challenge are **not implemented** (tracked: SEC-001, SEC-002)" |
| "CSP and HSTS headers are configured" | `next.config.ts` sets neither | SEC-003, SEC-004 | "Security headers configured: X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy. **CSP and HSTS are not configured** (tracked: SEC-003, SEC-004)" |
| "Rate limiting protects login" | In-process `Map` only; resets on cold start; not multi-instance safe | SEC-006, PERF-005 | "Login is rate-limited per process; **not distributed** and bypassable by restart or replica spread (tracked: SEC-006)" |
| "API tokens grant scoped access" | No middleware honors scopes; tokens grant nothing | SEC-015 | "API tokens can be created and revoked; **scope enforcement is not implemented** anywhere in the request pipeline (tracked: SEC-015)" |
| "All work-item mutations are transactional" | `updateWorkItemStatus` performs 3 non-transactional writes | REL-003 | "Single-write mutations are atomic. **Multi-step mutations (status change → ActivityLog → Notification) are not wrapped in `$transaction`** (tracked: REL-003)" |
| "Database schema is production-grade" | SQLite; no indexes on hot FKs | PERF-001/DB-001, PERF-004/OPS-004 | "Database is SQLite (dev only) with no explicit indexes. Postgres migration and index work are **outstanding** (tracked: PERF-001, PERF-004)" |
| "Unit tests pass on main" | 2 of 68 fail | QA-001 / REL-001 | "Unit tests fail on main (2 of 68): see `12_COMMAND_RESULTS.md` (tracked: QA-001)" |
| "Continuous integration runs on every PR" | No CI present | OPS-001 | "**No CI is configured** — `.github/workflows/` does not exist (tracked: OPS-001)" |
| "Integrations with GitHub / Slack / Calendar / Figma" | All simulated; no external calls | CON-004 | "Integration **UI** is present and persists connect/disconnect state; **no external API calls are implemented** (tracked: CON-004)" |
| "Demo reset is safe in any environment" | Spawns a 120-second child process inside a request | REL-005, SEC-011 | "Demo reset spawns a Node child process and is **not suitable for serverless deployments**; admin-only access prevents abuse but the architecture is brittle (tracked: REL-005)" |
| "Accessibility audited to WCAG 2.1 AA" | No axe runs; no automated checks; contrast unverified | A11Y-001, A11Y-002, A11Y-003 | "Accessibility primitives (Radix) are used. **Automated WCAG audit is not performed** and per-route contrast / focus / screen-reader behavior is unverified (tracked: A11Y-002)" |

## Process for applying these corrections (Batch 11)

1. For each row, locate the corresponding bullet/line in RTM and FINAL_IMPLEMENTATION_REPORT.
2. Replace the claim with the **Replacement language**, keeping the bug-ID reference.
3. Add an "Outstanding Bugs" section at the end of both documents listing every Critical + High bug ID still open.
4. Update `docs/SECURITY.md` so it no longer claims CSP/HSTS are active.
5. After the relevant batch ships the fix that resolves a bug, revisit RTM / FINAL_IMPLEMENTATION_REPORT and reword the claim back to its positive form, citing the resolving commit SHA.

## Rule

**No claim in RTM or FINAL_IMPLEMENTATION_REPORT may stand without a passing test, a green release-gate row in `11_REMEDIATION_ROADMAP.md`, and (where the claim is user-facing) a Passed row in `13_BROWSER_VALIDATION_PLAN_OR_RESULTS.md`.** Until those three exist, the corrected hedged language above must be in the document.
