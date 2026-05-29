# Testing

_Last Updated: 2026-05-28_

AgileForge ships with three layers of automated checks plus manual browser validation.

## Test pyramid

| Layer            | Tool                          | Scope                                         | Command             |
| ---------------- | ----------------------------- | --------------------------------------------- | ------------------- |
| Static           | TypeScript                    | Type safety across the whole codebase         | `npm run typecheck` |
| Static           | ESLint (next/core-web-vitals) | Lint + a11y + React rules                     | `npm run lint`      |
| Unit / Component | Vitest + Testing Library      | Pure domain logic and isolated UI components  | `npm run test`      |
| End-to-end       | Playwright (Chromium)         | Real browser flows against a production build | `npm run test:e2e`  |

## Unit & component tests

Configured in [vitest.config.ts](../vitest.config.ts) with a `jsdom` environment and
global setup in [vitest.setup.ts](../vitest.setup.ts) (registers `@testing-library/jest-dom`
matchers and runs `cleanup()` after every test). The `@/*` alias mirrors the app.

Current suites:

- `src/lib/domain/__tests__/permissions.test.ts` — RBAC matrix (`can`, `permissionsFor`, `canEditWorkItem`).
- `src/lib/domain/__tests__/metrics.test.ts` — sprint progress, burndown, velocity, cycle time, project health, blocker age.
- `src/lib/__tests__/utils.test.ts` — `cn`, `initials`, `humanize` helpers.
- `src/components/__tests__/status-badge.test.tsx` — status / priority / health / test-status badges.
- `src/lib/actions/__tests__/projects.test.ts` — server-action unit tests for `createProject`, `updateProject`, and `archiveProject` (9 tests covering permission gates, Zod validation, duplicate-key detection, and success paths). Added in Phase 2.
- `src/lib/actions/__tests__/work-items.test.ts` — server-action unit tests for `createWorkItem` and `updateWorkItem` (5 tests covering key-generation logic, activity-log type correctness, and error paths). Added in Phase 2.

Run a single file or watch mode:

```bash
npx vitest run src/lib/domain/__tests__/metrics.test.ts
npm run test:watch
```

## End-to-end tests

Configured in [playwright.config.ts](../playwright.config.ts). Playwright builds is **not**
run automatically — you must have a production build available. The config starts the app
with `npm run start -- --port 3100` and reuses an already-running server when not in CI.

Run them:

```bash
npm run build      # required once; E2E hits the production server
npm run test:e2e
```

Suites under `e2e/`:

- `auth.spec.ts` — anonymous users are redirected to `/login`, invalid credentials raise an alert, and an admin can sign in.
- `navigation.spec.ts` — all 16 primary routes render a heading (not an error state) with the Primary navigation present, plus RBAC checks that a stakeholder cannot reach `/admin` or `/work-items/new`.
- `work-items.spec.ts` — an engineer can create a work item through the form and open a work-item detail page.
- `management.spec.ts` — admin sprint creation, work-item title editing, admin user creation, and team creation. Fragile CSS-selector-based selectors were replaced with role-based and scoped selectors in Phase 2 (e.g. `getByRole("table").getByRole("link").first()` instead of a brittle nth-child query).
- `settings.spec.ts` — full settings shell render, display-name persistence, weak-password rejection, workspace-slug validation, and engineer-vs-admin section visibility.
- `projects.spec.ts` — role-based visibility of the New Project button (admin sees it, engineer does not), navigation to `/projects/new`, happy-path project creation with redirect to the detail page, and server-side validation errors for an empty name and an invalid key format (6 tests total). Added in Phase 2.

Helpers live in `e2e/helpers.ts` (shared `login()` plus the demo password).

### Why E2E uses a production build

The most important runtime guarantee — that Server Components never pass non-serializable
props (such as icon components) into Client Components — only fails under `next build`/`next start`.
Running E2E against the production server is therefore deliberate and catches a class of bugs
the dev server hides.

## Manual browser validation

For exploratory checks, run `npm run dev`, sign in with any
[demo account](./SETUP.md#4-sign-in), and walk the core flows (dashboard, boards, backlog,
sprints, QA, reports, admin). Watch the browser console for errors.

## 2026-05-29 Reconciliation Note (post-remediation)

On branch `implement-production-readiness-fixes`, the test surface has grown materially:

- **Unit/integration:** 440/440 tests passing across 26 files (was significantly smaller when this
  doc was written). New suites include the QA-005 243-cell RBAC role x permission matrix and the
  QA-006 seed determinism contract.
- **Coverage:** `@vitest/coverage-v8` is installed and thresholds are enforced at
  35/35/40/60 (statements/branches/functions/lines); current results are 65.94/60.81/69.93/66.34 —
  comfortably above the floor.
- **CI gates:** lint, typecheck, build, and the Playwright e2e job are wired into `ci.yml` and pass.

Authoritative current state:
[`production-readiness/REMEDIATION_PROGRESS_2026-05-29.md`](production-readiness/REMEDIATION_PROGRESS_2026-05-29.md)
and [`production-readiness/POST_REMEDIATION_FINAL_VERDICT_2026-05-29.md`](production-readiness/POST_REMEDIATION_FINAL_VERDICT_2026-05-29.md).
**Verdict: CONDITIONAL APPROVAL.** Open testing-adjacent gaps: the full 19-route × 7-browser
manual validation matrix has not yet been walked, and the A11Y batch 8 WCAG 2.1 AA pass
(A11Y-001..006) is still outstanding.
