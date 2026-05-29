# Architecture

_Last Updated: 2026-05-28_

## Stack

| Layer      | Technology                                                   |
| ---------- | ------------------------------------------------------------ |
| Framework  | Next.js 16.2 (App Router, Server Components, Server Actions) |
| UI runtime | React 19.2                                                   |
| Language   | TypeScript (strict)                                          |
| Styling    | Tailwind CSS v4 (`@theme inline` tokens, light + dark)       |
| Data       | Prisma 7 ORM + SQLite (better-sqlite3 adapter)               |
| Auth       | jose (JWT, HS256) in an httpOnly cookie, bcryptjs hashing    |
| Charts     | Recharts                                                     |
| Icons      | lucide-react                                                 |
| Dates      | date-fns                                                     |
| Validation | zod                                                          |
| Unit tests | Vitest + Testing Library + jsdom                             |
| E2E tests  | Playwright                                                   |

## Directory layout

```
prisma/
  schema.prisma        # data model
  seed.ts              # realistic demo data
src/
  middleware.ts        # route protection (auth gate; edge-safe — uses jose only, never Prisma)
  app/
    login/             # public sign-in
    (app)/             # authenticated route group (layout = sidebar + topbar)
      dashboard/  my-work/  projects/  work-items/  backlog/
      sprints/  boards/  qa/  reports/  teams/  users/
      notifications/  settings/  admin/  search/
  components/
    ui/                # primitives (button, card, badge, input, select, table…)
    layout/            # Sidebar, Topbar, nav-config
    work-item/  board/  admin/  qa/  notifications/  settings/
    charts.tsx  status-badge.tsx  page-header.tsx  stat-card.tsx  empty-state.tsx
  lib/
    auth/              # session, password, guards (requireUser/requirePermission), actions
    actions/           # server actions (projects, work-items, admin, qa, notifications, …)
    domain/            # pure logic: constants, permissions (RBAC), metrics
    db.ts  utils.ts
  generated/prisma/    # generated Prisma client (prisma-client generator)
```

## Request & rendering model

- **Server Components by default.** Pages query Prisma directly on the server and
  pass plain data to small client components only where interactivity is needed.
- **Server Actions** (`"use server"`) handle all mutations (create/update work
  items, comments, blockers, role changes, test runs, notifications, projects). They run
  the relevant permission guard, write via Prisma, create activity/audit/
  notification rows where appropriate, and call `revalidatePath`.
- **`params` / `searchParams` are Promises** (Next 16) and are awaited in pages.
- **Route protection** is layered: `src/middleware.ts` redirects unauthenticated
  requests to `/login`, and server-side `requireUser()` / `requirePermission()`
  guards enforce authorization per page/action (unauthorized users are redirected
  to `/dashboard`).

## Edge middleware constraint

`src/middleware.ts` runs in the Edge runtime and is intentionally kept edge-safe: it
imports only `jose` for JWT verification and `next/server`. It **never imports Prisma**,
which would break because the Prisma client and `better-sqlite3` cannot run in the Edge
runtime. Per-page authorization (database lookups, fine-grained RBAC) is handled by
`requireUser()` / `requirePermission()` in Node.js Server Components and Server Actions.

## Authentication & RBAC

- Passwords are hashed with bcrypt. Sign-in verifies the hash and issues a signed
  JWT stored in an httpOnly, SameSite cookie.
- Authorization is **capability-based**. `src/lib/domain/permissions.ts` defines a
  flat list of permissions and a `ROLE_PERMISSIONS` map for 8 roles
  (admin, engineering_manager, product_owner, scrum_master, engineer, qa,
  designer, stakeholder). The pure `can(role, permission)` helper is shared by
  server guards and client UI (to hide/disable actions).
- `canEditWorkItem` adds row-level rules so contributors with only
  `workitem.edit_assigned` can edit items they are assigned to or reported.

## Security headers

HTTP security headers are applied to all routes via the `headers()` function in
`next.config.ts` (added in Phase 2). Headers served on every response include
`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `X-XSS-Protection`,
and `Permissions-Policy`. See [SECURITY.md](./SECURITY.md) for the full list and
remaining gaps (CSP not yet configured).

## Project server actions

Project mutations (`createProject`, `updateProject`, `archiveProject`) live in
`src/lib/actions/projects.ts`. Each action calls `requireUser()` and checks the
`project.create` / `project.edit` permission before writing to the database.
Audit entries are written to `AuditLog` (not `ActivityLog`, which requires a
`workItemId` foreign key). The `/projects/new` route (`src/app/(app)/projects/new/`)
renders a form backed by `createProject` and is gated by `requirePermission("project.create")`.

## Domain logic

`src/lib/domain/metrics.ts` contains pure, unit-tested functions:
`sprintProgress`, `burndown`, `velocity`, `cycleTimeDays`, `projectHealth`,
`countBy`, `blockerAgeDays`. Keeping them pure makes them trivially testable and
reusable across dashboards, reports and badges.

## Data model (Prisma)

Core entities: `User`, `Team`, `TeamMember`, `Project`, `Epic`, `Sprint`,
`WorkItem` (self-referential parent/subtasks), `Label`/`WorkItemLabel`,
`Comment`, `ActivityLog`, `Blocker`, `Risk`, `TestCase`, `TestRun`,
`Notification`, `AuditLog`. Relationships, statuses and enumerations are
centralized in `src/lib/domain/constants.ts`.

## Theming

Design tokens live in `globals.css` via Tailwind v4 `@theme inline`, with a
`.dark` variant. A small client `ThemeToggle` persists the choice in
`localStorage` and toggles the `dark` class on `<html>`.
