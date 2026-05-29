# 13 — Browser Validation Plan / Results

## Status

**Not Verified.** The Playwright MCP browser was not invoked during this audit, and the project's local dev server was deliberately not booted (it would mutate `dev.db` and pollute future test runs). This file documents the exact plan to execute in Batch 1/3/6/7 of the remediation roadmap and locks in the route × role matrix to use.

## Roles to test

From `src/lib/domain/constants.ts` and `src/lib/domain/permissions.ts`:

`admin`, `manager`, `lead`, `developer`, `qa`, `designer`, `viewer`, `guest` — 8 roles. Reduce to the 4 representative buckets:

- **Admin** — full
- **Manager / Lead** — project + sprint manage
- **Member** (developer/qa/designer) — work-item edit
- **Viewer / Guest** — read-only

## Routes (19)

`/login`, `/dashboard`, `/my-work`, `/projects`, `/projects/[id]`, `/work-items`, `/work-items/[id]`, `/backlog`, `/sprints`, `/sprints/[id]`, `/boards/scrum`, `/boards/kanban`, `/qa`, `/reports`, `/notifications`, `/teams`, `/users`, `/settings`, `/admin`.

Additionally: `/projects/[id]/reports`, `/projects/[id]/roadmap`, `/qa/test-cases/[id]`, `/qa/test-cases/new`, `/sprints/new`, `/work-items/new`, `/work-items/[id]/edit`, `/admin/audit`, `/search`, `/teams/[id]`, `/users/[id]`, `/projects/new` — secondary validation set.

## Per-route checklist (per role)

1. Page loads, HTTP 200.
2. No console errors / warnings (excluding known React DevTools messages).
3. No blank screen.
4. No placeholder UI (`"TODO"`, `"Coming soon"`, lorem ipsum, empty cards).
5. All buttons & forms reachable by keyboard.
6. Submitting a form persists the change after **page reload**.
7. RBAC visibility correct: actions hidden where `can(role, action)` returns false; server-action invocation also rejected if hit directly.
8. Desktop (1440), Tablet (834), Mobile (390) viewports render usable layouts (no overflow, no clipping, no hidden touch targets).
9. axe / Lighthouse a11y: zero serious violations.

## Matrix (placeholder — fill during Batch 7)

| Route | Admin | Manager | Member | Viewer | Notes |
|---|---|---|---|---|---|
| `/login` | Not Verified | NV | NV | NV | MFA path must be exercised |
| `/dashboard` | NV | NV | NV | NV | rollups |
| `/my-work` | NV | NV | NV | NV | |
| `/projects` | NV | NV | NV | NV | |
| `/projects/[id]` | NV | NV | NV | NV | edit visibility |
| `/projects/new` | NV | NV | hidden | hidden | RBAC visibility check |
| `/projects/[id]/reports` | NV | NV | NV | NV | charts render |
| `/projects/[id]/roadmap` | NV | NV | NV | NV | |
| `/work-items` | NV | NV | NV | NV | filters persist |
| `/work-items/new` | NV | NV | NV | hidden | |
| `/work-items/[id]` | NV | NV | NV | NV | comment + blocker |
| `/work-items/[id]/edit` | NV | NV | NV | hidden | |
| `/backlog` | NV | NV | NV | NV | reorder persists |
| `/sprints` | NV | NV | NV | NV | |
| `/sprints/new` | NV | NV | hidden | hidden | |
| `/sprints/[id]` | NV | NV | NV | NV | start/complete |
| `/boards/scrum` | NV | NV | NV | NV | drag persists |
| `/boards/kanban` | NV | NV | NV | NV | drag persists |
| `/qa` | NV | NV | NV | NV | |
| `/qa/test-cases/new` | NV | NV | NV | hidden | |
| `/qa/test-cases/[id]` | NV | NV | NV | NV | record run |
| `/reports` | NV | NV | NV | NV | |
| `/notifications` | NV | NV | NV | NV | mark read |
| `/teams` | NV | NV | NV | NV | |
| `/teams/[id]` | NV | NV | NV | NV | |
| `/users` | NV | NV | hidden | hidden | |
| `/users/[id]` | NV | NV | hidden | hidden | |
| `/settings` | NV | NV | NV | NV | MFA real, API tokens |
| `/admin` | NV | hidden | hidden | hidden | demo reset |
| `/admin/audit` | NV | hidden | hidden | hidden | |
| `/search` | NV | NV | NV | NV | |

**NV** = Not Verified.

## Required artifacts when this file is updated

Each Passed row must cite:
- Playwright trace file or MCP `browser_snapshot` reference
- HTTP status of every relevant network request (mutation responses)
- Console log (must be clean)
- Reload screenshot showing persistence

## Honest verdict

Until Batch 1 + Batch 7 execute this plan, all rows are **Not Verified**. Per brief §6, the audit cannot claim the application is functional in a browser.
