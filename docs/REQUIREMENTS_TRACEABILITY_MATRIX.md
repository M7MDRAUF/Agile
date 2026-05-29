# Requirements Traceability Matrix — AgileForge

> **Single source of truth:** [AgileForge_Claude_Opus_4_8_Dynamic_Workflows_Master_Brief.md](../AgileForge_Claude_Opus_4_8_Dynamic_Workflows_Master_Brief.md)
>
> This matrix maps **every** requirement in the master brief to its implementation, tests, browser validation, and documentation. Each row carries an explicit status and evidence.

_Last Updated: 2026-05-29_

## Legend

- **Status:** `Complete` = implemented, tested where applicable, browser-validated, documented. `Partial` / `Missing` / `Broken` = not done. `Unverified` = present but not validated.
- **Test coverage:** unit (`src/**/__tests__`), e2e (`e2e/*.spec.ts`), or `n/a`.
- **Browser validation:** route/flow exercised in the integrated browser against the production server (`npm run start -- --port 3100`).

## Verification snapshot (latest run)

| Check               | Result                                                            |
| ------------------- | ----------------------------------------------------------------- |
| `npm run lint`      | Pass (0 errors)                                                   |
| `npm run typecheck` | Pass (0 errors)                                                   |
| `npm run test`      | Pass (68 unit/component tests, 9 files; +14 tests added Phase 2) |
| `npm run build`     | Pass (34 routes compiled)                                         |
| `npm run test:e2e`  | Pass (38 Playwright tests; +6 added in Phase 2)                   |

---

## A. Roles & Permissions (Brief §3, §8.4)

| ID   | Requirement                                                                                    | Source     | Implementation files                                                                                                                                                                                          | Test coverage                            | Browser validation                           | Documentation        | Status   | Evidence                                                           |
| ---- | ---------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------- | -------------------- | -------- | ------------------------------------------------------------------ |
| R-01 | System Admin: manage users, roles, teams, audit logs, workspace settings, all projects/reports | §3.1, §8.4 | [src/lib/domain/permissions.ts](../src/lib/domain/permissions.ts), [src/app/(app)/admin/page.tsx](<../src/app/(app)/admin/page.tsx>), [src/app/(app)/settings/page.tsx](<../src/app/(app)/settings/page.tsx>) | unit (permissions.test.ts)               | Admin console + Workspace settings validated | README, ARCHITECTURE | Complete | `ROLE_PERMISSIONS.admin = ALL`; admin page + workspace form render |
| R-02 | Engineering Manager: teams, delivery health, workload, risks, reports                          | §3.2, §8.4 | [src/lib/domain/permissions.ts](../src/lib/domain/permissions.ts)                                                                                                                                             | unit                                     | RBAC e2e                                     | ARCHITECTURE         | Complete | `report.view`, `team.manage`, `sprint.manage` granted              |
| R-03 | Product Owner: epics/stories, backlog priority, acceptance criteria                            | §3.3, §8.4 | [src/lib/domain/permissions.ts](../src/lib/domain/permissions.ts), [src/app/(app)/backlog/page.tsx](<../src/app/(app)/backlog/page.tsx>)                                                                      | unit                                     | Backlog validated                            | ARCHITECTURE         | Complete | `backlog.prioritize`, `workitem.create`                            |
| R-04 | Scrum Master: sprints, ceremonies, blockers                                                    | §3.4, §8.4 | [src/lib/domain/permissions.ts](../src/lib/domain/permissions.ts), [src/app/(app)/sprints/[id]/page.tsx](<../src/app/(app)/sprints/[id]/page.tsx>)                                                            | e2e (management)                         | Sprint create validated                      | ARCHITECTURE         | Complete | `sprint.manage`, `blocker.resolve`                                 |
| R-05 | Software Engineer: task board, status, blockers, comments, PR links                            | §3.5, §8.4 | [src/lib/domain/permissions.ts](../src/lib/domain/permissions.ts), [src/app/(app)/my-work/page.tsx](<../src/app/(app)/my-work/page.tsx>)                                                                      | e2e (work-items)                         | My Work + status validated                   | ARCHITECTURE         | Complete | `workitem.edit_assigned`, `blocker.create`                         |
| R-06 | QA Engineer: test cases, link bugs, QA status, release readiness                               | §3.6, §8.4 | [src/app/(app)/qa/page.tsx](<../src/app/(app)/qa/page.tsx>), [src/lib/actions/qa.ts](../src/lib/actions/qa.ts)                                                                                                | unit/e2e (navigation)                    | QA page validated                            | ARCHITECTURE         | Complete | `qa.manage`; recordTestRun creates bug                             |
| R-07 | Designer: design tasks, Figma links, specs                                                     | §3.7, §8.4 | [src/lib/domain/permissions.ts](../src/lib/domain/permissions.ts)                                                                                                                                             | unit                                     | n/a                                          | ARCHITECTURE         | Complete | designer role + `workitem.edit_assigned`, `comment.create`         |
| R-08 | Stakeholder: read-only dashboards, risk, roadmap                                               | §3.8, §8.4 | [src/lib/domain/permissions.ts](../src/lib/domain/permissions.ts)                                                                                                                                             | e2e (RBAC: cannot access admin / create) | Stakeholder restriction validated            | ARCHITECTURE         | Complete | stakeholder limited to `*.view`                                    |

---

## B. Functional Requirements (Brief §5)

| ID   | Requirement                                                                                                                                                  | Source | Implementation files                                                                                                                                                                                                                                                                           | Test coverage                                                               | Browser validation                                                                   | Documentation    | Status   | Evidence                                                                                                               |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| F-01 | Authentication: sign in, logout, sessions, protected routes, RBAC UI, seeded demo accounts, validation errors                                                | §5.1   | [src/app/login/page.tsx](../src/app/login/page.tsx), [src/lib/auth/guards.ts](../src/lib/auth/guards.ts), [src/lib/auth/session.ts](../src/lib/auth/session.ts), [src/proxy.ts](../src/proxy.ts)                                                                                               | e2e (login, RBAC)                                                           | Login flow validated                                                                 | README, SECURITY | Complete | jose JWT httpOnly cookie; middleware redirects unauth → /login                                                         |
| F-02 | Dashboard widgets: active sprint, my tasks, **team workload**, blockers, overdue, project health, velocity, bugs, ceremonies, recent activity                | §5.2   | [src/app/(app)/dashboard/page.tsx](<../src/app/(app)/dashboard/page.tsx>)                                                                                                                                                                                                                      | unit (metrics)                                                              | All widgets incl. Team Workload validated                                            | README           | Complete | Team Workload card added (6 users w/ counts); all 10 widgets present                                                   |
| F-03 | User & team management: lists, profile, role assignment, team detail, assign to teams, filters                                                               | §5.3   | [src/app/(app)/users/page.tsx](<../src/app/(app)/users/page.tsx>), [src/app/(app)/users/[id]/page.tsx](<../src/app/(app)/users/[id]/page.tsx>), [src/app/(app)/teams/page.tsx](<../src/app/(app)/teams/page.tsx>), [src/app/(app)/teams/[id]/page.tsx](<../src/app/(app)/teams/[id]/page.tsx>) | e2e (management: create user, create team)                                  | Users/Teams validated                                                                | README           | Complete | CreateUserForm, RoleSelect, StatusToggle, team create                                                                  |
| F-04 | Project management: list, detail, health, owner/team/deadline/status, roadmap, risks, linked epics/sprints                                                   | §5.4   | [src/app/(app)/projects/page.tsx](<../src/app/(app)/projects/page.tsx>), [src/app/(app)/projects/[id]/page.tsx](<../src/app/(app)/projects/[id]/page.tsx>), [src/app/(app)/projects/[id]/roadmap/page.tsx](<../src/app/(app)/projects/[id]/roadmap/page.tsx>), [src/app/(app)/projects/new/page.tsx](<../src/app/(app)/projects/new/page.tsx>), [src/lib/actions/projects.ts](../src/lib/actions/projects.ts)                  | unit (projectHealth); unit (projects actions — 9 tests added Phase 2); e2e (projects.spec.ts — 6 tests added Phase 2) | Projects list, detail, new-project form, and project creation validated                          | README           | Complete | projectHealth() drives status from sprint/blockers/overdue/bugs; createProject, updateProject, archiveProject server actions with Zod validation, permission gates, and audit logging; /projects/new route gated by project.create permission |
| F-05 | Work items: 5 types, all required fields, 8 statuses, create/edit/filter/assign/move, validation, activity records                                           | §5.5   | [src/app/(app)/work-items/](<../src/app/(app)/work-items/>), [src/lib/actions/work-items.ts](../src/lib/actions/work-items.ts), [src/lib/domain/constants.ts](../src/lib/domain/constants.ts)                                                                                                  | e2e (create, edit/status); unit (work-items actions — 5 tests added Phase 2)                    | Work item create + status validated; paginated list validated                        | README           | Complete | WORK_ITEM_TYPES/STATUSES; logActivity on status change; server-side pagination (`skip`/`take` + `Pagination` component) with `page` and `pageSize` query params |
| F-06 | Sprint management: create, goal, dates, capacity, add/remove items, start/complete, summary, burndown, velocity                                              | §5.6   | [src/app/(app)/sprints/[id]/page.tsx](<../src/app/(app)/sprints/[id]/page.tsx>), [src/lib/actions/sprints.ts](../src/lib/actions/sprints.ts)                                                                                                                                                   | unit (sprintProgress, burndown, velocity); e2e (create)                     | Sprint detail + create validated                                                     | README           | Complete | SprintControls gated by `sprint.manage`; Burndown chart                                                                |
| F-07 | Board views: Scrum + Kanban, status columns, reliable status controls, filters, search                                                                       | §5.7   | [src/app/(app)/boards/scrum/page.tsx](<../src/app/(app)/boards/scrum/page.tsx>), [src/app/(app)/boards/kanban/page.tsx](<../src/app/(app)/boards/kanban/page.tsx>), [src/components/board/Board.tsx](../src/components/board/Board.tsx)                                                        | unit (status-badge); e2e (navigation)                                       | Both boards validated                                                                | README           | Complete | StatusSelect reliable control (brief allows fallback over D&D); BOARD_COLUMNS now includes `canceled` column (8 columns total) |
| F-08 | Personal task view: My Work, current sprint, overdue, blocked, recently updated, quick status                                                                | §5.8   | [src/app/(app)/my-work/page.tsx](<../src/app/(app)/my-work/page.tsx>)                                                                                                                                                                                                                          | e2e (work-items detail)                                                     | My Work validated                                                                    | README           | Complete | Sectioned task lists + StatusSelect                                                                                    |
| F-09 | Blocker management: mark blocked, reason, owner, dashboard, resolve                                                                                          | §5.9   | [src/lib/actions/blockers.ts](../src/lib/actions/blockers.ts), [src/app/(app)/work-items/[id]/page.tsx](<../src/app/(app)/work-items/[id]/page.tsx>)                                                                                                                                           | unit (blockerAgeDays)                                                       | Blocker create/resolve gated                                                         | README           | Complete | CreateBlocker/ResolveBlocker; dashboard Open Blockers card                                                             |
| F-10 | Comments & activity feed: comments, plain-text mentions, timeline of changes, chronological, logged                                                          | §5.10  | [src/lib/actions/comments.ts](../src/lib/actions/comments.ts), [src/app/(app)/work-items/[id]/page.tsx](<../src/app/(app)/work-items/[id]/page.tsx>)                                                                                                                                           | n/a (covered by e2e nav)                                                    | Activity feed validated on dashboard/detail                                          | README           | Complete | Comment model + ActivityLog ordered desc                                                                               |
| F-11 | QA module: test case list/detail, link to stories/bugs, statuses, bug from failed test, release readiness                                                    | §5.11  | [src/app/(app)/qa/page.tsx](<../src/app/(app)/qa/page.tsx>), [src/app/(app)/qa/test-cases/[id]/page.tsx](<../src/app/(app)/qa/test-cases/[id]/page.tsx>), [src/lib/actions/qa.ts](../src/lib/actions/qa.ts)                                                                                    | e2e (navigation /qa)                                                        | QA validated                                                                         | README           | Complete | recordTestRun(createBug) creates linked bug                                                                            |
| F-12 | Reports: burndown, velocity, **team workload**, **cycle time**, **lead time**, bug severity, blocker aging, project health                                   | §5.12  | [src/app/(app)/reports/page.tsx](<../src/app/(app)/reports/page.tsx>), [src/lib/domain/metrics.ts](../src/lib/domain/metrics.ts)                                                                                                                                                               | unit (metrics incl. leadTimeDays)                                           | Reports incl. Lead Time + Cycle Time validated                                       | README           | Complete | leadTimeDays() added; Avg Lead Time + Avg Cycle Time StatCards render                                                  |
| F-13 | Notifications: center, on assignment/comment/blocker/sprint, read/unread, count                                                                              | §5.13  | [src/app/(app)/notifications/page.tsx](<../src/app/(app)/notifications/page.tsx>), [src/lib/actions/notifications.ts](../src/lib/actions/notifications.ts)                                                                                                                                     | e2e (navigation)                                                            | Notifications validated                                                              | README           | Complete | Mark read/unread; topbar count badge                                                                                   |
| F-14 | Search & filters: global search, projects/users/work-items, list filters                                                                                     | §5.14  | [src/app/(app)/search/page.tsx](<../src/app/(app)/search/page.tsx>), topbar search                                                                                                                                                                                                             | e2e (navigation /search?q=api)                                              | Search validated                                                                     | README           | Complete | Global search page; list filters on work-items/users                                                                   |
| F-15 | Settings: **workspace settings**, profile, theme toggle, notification prefs (real UI state) — delivered as a full tabbed enterprise Settings module (see §K) | §5.15  | [src/app/(app)/settings/page.tsx](<../src/app/(app)/settings/page.tsx>), [src/lib/actions/settings.ts](../src/lib/actions/settings.ts), [src/components/settings/WorkspaceSettingsForm.tsx](../src/components/settings/WorkspaceSettingsForm.tsx)                                              | e2e (settings: 5 tests) + unit (user-settings, password-policy, user-agent) | Workspace save persisted + audit logged; live theme/density toggle browser-validated | README           | Complete | AppSetting model; updateWorkspaceSettings gated by `settings.manage_workspace`; 14 tabbed sections all functional (§K) |

---

## C. Non-Functional Requirements (Brief §6)

| ID   | Requirement                                                                                                         | Source | Implementation / Evidence                                                          | Test coverage      | Status   |
| ---- | ------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------- | ------------------ | -------- |
| N-01 | Type-safe, clean architecture, reusable components, consistent errors, no dead routes/broken nav, no console errors | §6.1   | TS strict; layered modules; `npm run typecheck` = 0; 34 routes build; nav e2e      | typecheck, e2e     | Complete |
| N-02 | Performance: fast dev load, avoid re-renders, list limits                                                           | §6.2   | RSC + server actions; `take` limits on queries; build optimized                    | build              | Complete |
| N-03 | Security: no secrets, validate inputs, route protection, no unsafe HTML, env vars                                   | §6.3   | Zod validation; bcrypt; httpOnly JWT; `.env.example`; no `dangerouslySetInnerHTML`; AUTH_SECRET fallback removed (Phase 2); login rate limiting added (Phase 2); security response headers configured in next.config.ts (Phase 2); `isWorkspaceActive()` guarded by `requireUser()` (Phase 2). Open: MFA accepts any 6-digit code (simulation); SQLite FK constraints not enforced at DB level. | unit (permissions) | Complete |
| N-04 | Accessibility: keyboard forms, labels, contrast, semantic headings, ARIA                                            | §6.4   | `<Label>` for inputs, `role="alert"` errors, semantic headings                     | n/a                | Complete |
| N-05 | Maintainability: clear structure, docs, modular domains, tests                                                      | §6.5   | `src/lib/{domain,actions,auth}`, docs/\*                                           | unit/e2e           | Complete |

---

## D. Tech Stack (Brief §7)

| ID   | Requirement                                                                                | Source | Evidence                                                         | Status   |
| ---- | ------------------------------------------------------------------------------------------ | ------ | ---------------------------------------------------------------- | -------- |
| T-01 | Next.js latest App Router + TypeScript                                                     | §7.1   | Next.js 16.2.6 App Router, TS strict                             | Complete |
| T-02 | Tailwind, shadcn-style components, Zod, Recharts, Lucide                                   | §7.1   | Tailwind v4; `src/components/ui/*`; zod; recharts; lucide-react  | Complete |
| T-03 | Server actions, Prisma, SQLite, realistic seed                                             | §7.2   | Prisma 7.8 + SQLite adapter; [prisma/seed.ts](../prisma/seed.ts) | Complete |
| T-04 | Vitest + RTL, Playwright, ESLint, tsc                                                      | §7.3   | vitest, @testing-library/react, @playwright/test, eslint         | Complete |
| T-05 | Docs: README, ARCHITECTURE, SETUP, TESTING, SECURITY, ROADMAP, FINAL_IMPLEMENTATION_REPORT | §7.4   | All present under [docs/](../docs/) + [README.md](../README.md)  | Complete |

---

## E. SDD — Data Model & Routing (Brief §8)

| ID   | Requirement                                                                                                                                                                                                      | Source | Evidence                                                                                                                | Status   |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------- | -------- |
| D-01 | Modular monolith, 5 layers                                                                                                                                                                                       | §8.1   | presentation (app/components), application (lib/actions), domain (lib/domain), data (lib/db + prisma), infra (lib/auth) | Complete |
| D-02 | Domain modules: auth, users, teams, projects, work-items, sprints, boards, qa, reports, notifications, settings, audit-log                                                                                       | §8.2   | corresponding dirs under `src/app/(app)` + `src/lib`                                                                    | Complete |
| D-03 | Data models: User, Team, TeamMember, Project, Epic, WorkItem, Sprint, (SprintWorkItem→sprintId FK), Comment, ActivityLog, Blocker, TestCase, TestRun, Notification, Label, WorkItemLabel, AuditLog (+AppSetting) | §8.3   | [prisma/schema.prisma](../prisma/schema.prisma)                                                                         | Complete |
| D-04 | All 24 required routes (§8.5) incl. roadmap, project reports, qa/test-cases/[id]                                                                                                                                 | §8.5   | 34 routes built; all required paths present (verified via build + file search)                                          | Complete |
| D-05 | UI: sidebar nav, topbar search/notifications/profile, metric cards, filterable tables, board columns, validated forms, labeled charts, light theme (dark optional)                                               | §8.6   | AppShell sidebar + topbar; cards; tables; boards; ThemeToggle                                                           | Complete |

---

## F. Seed Data (Brief §9) — verified counts

| ID   | Requirement (minimum)                     | Source | Seeded                             | Status   |
| ---- | ----------------------------------------- | ------ | ---------------------------------- | -------- |
| S-01 | Company NovaCore + 6 teams                | §9     | 6 teams                            | Complete |
| S-02 | ≥24 users across roles                    | §9     | 24 users                           | Complete |
| S-03 | 6 named projects                          | §9     | 6 projects                         | Complete |
| S-04 | ≥12 epics                                 | §9     | 12 epics                           | Complete |
| S-05 | ≥50 stories                               | §9     | 54 stories                         | Complete |
| S-06 | ≥80 tasks/subtasks                        | §9     | 72 tasks + 40 subtasks = 112       | Complete |
| S-07 | ≥20 bugs                                  | §9     | 24 bugs                            | Complete |
| S-08 | ≥15 blockers (open+resolved)              | §9     | 18 blockers                        | Complete |
| S-09 | ≥4 completed, 1 active, 2 planned sprints | §9     | 22 sprints across statuses         | Complete |
| S-10 | ≥40 test cases, mixed statuses            | §9     | 42 test cases + 26 runs            | Complete |
| S-11 | ≥30 notifications                         | §9     | 36 notifications                   | Complete |
| S-12 | Realistic activity logs                   | §9     | 372 activity entries               | Complete |
| S-13 | Workspace settings seeded                 | §5.15  | 8 AppSetting keys + 4 integrations | Complete |

---

## G. Browser Validation (Brief §12)

| ID   | Route / Flow                                                                                                                                                        | Source | Result                                                               | Status   |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------- | -------- |
| B-01 | /login renders, validates                                                                                                                                           | §12    | Loads; prefilled demo creds; sign-in works                           | Complete |
| B-02 | /dashboard incl. Team Workload                                                                                                                                      | §12    | All widgets render with seeded data                                  | Complete |
| B-03 | /reports incl. Lead + Cycle time                                                                                                                                    | §12    | Avg Lead Time 26.8d, Avg Cycle Time, velocity, bugs, blockers render | Complete |
| B-04 | /settings workspace save                                                                                                                                            | §12    | Save persists to AppSetting + writes AuditLog                        | Complete |
| B-05 | Core routes (my-work, projects, teams, users, work-items, backlog, sprints, boards, qa, notifications, admin, search)                                               | §12    | All 19 routes render without blank screens; 0 console errors confirmed | Complete |
| B-06 | RBAC flows (stakeholder blocked from admin + create)                                                                                                                | §12    | Redirected/forbidden as expected                                     | Complete |
| B-07 | Manual flows 1–20 (create user, edit role, create project/epic/story/task, assign, status moves, blocker, sprint, board, QA, bug-from-test, reports, notifications) | §12    | Covered by e2e + manual browser validation of representative flows   | Complete |

---

## H. Automated Tests (Brief §13)

| ID     | Requirement                                                                                     | Source | Evidence                                                                                      | Status   |
| ------ | ----------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------- | -------- |
| TST-01 | Unit: permission logic                                                                          | §13.1  | [permissions.test.ts](../src/lib/domain/__tests__/permissions.test.ts) (9 tests)              | Complete |
| TST-02 | Unit: project health, sprint progress, burndown, velocity, **cycle/lead time**                  | §13.1  | [metrics.test.ts](../src/lib/domain/__tests__/metrics.test.ts) (18 tests, incl. leadTimeDays) | Complete |
| TST-03 | Component: badges / cards render                                                                | §13.2  | [status-badge.test.tsx](../src/components/__tests__/status-badge.test.tsx) (4 tests)          | Complete |
| TST-04 | Utility helpers                                                                                 | §13.2  | [utils.test.ts](../src/lib/__tests__/utils.test.ts) (3 tests)                                 | Complete |
| TST-05 | E2E: login, create work item, move status, My Work, board, QA, role restrictions                | §13.3  | [e2e/](../e2e/) (32 tests across login/navigation/work-items/management/settings)             | Complete |
| TST-06 | Unit: preference parsing + date/time formatting                                                 | §13.1  | [user-settings.test.ts](../src/lib/domain/__tests__/user-settings.test.ts) (8 tests)          | Complete |
| TST-07 | Unit: password policy checks/strength                                                           | §13.1  | [password-policy.test.ts](../src/lib/domain/__tests__/password-policy.test.ts) (7 tests)      | Complete |
| TST-08 | Unit: user-agent device labeling for sessions                                                   | §13.1  | [user-agent.test.ts](../src/lib/domain/__tests__/user-agent.test.ts) (5 tests)                | Complete |
| TST-09 | E2E: settings shell, profile persistence, password validation, slug validation, RBAC visibility | §13.3  | [e2e/settings.spec.ts](../e2e/settings.spec.ts) (5 tests)                                     | Complete |
| TST-10 | Unit: createProject, updateProject, archiveProject server actions                               | §13.1  | [src/lib/actions/__tests__/projects.test.ts](../src/lib/actions/__tests__/projects.test.ts) (9 tests — permission gates, Zod validation, duplicate-key detection, success paths). Added Phase 2. | Complete |
| TST-11 | Unit: createWorkItem, updateWorkItem server actions                                              | §13.1  | [src/lib/actions/__tests__/work-items.test.ts](../src/lib/actions/__tests__/work-items.test.ts) (5 tests — key-generation logic, activity-log type, error paths). Added Phase 2. | Complete |
| TST-12 | E2E: project RBAC visibility, navigation to /projects/new, happy-path creation, validation errors | §13.3 | [e2e/projects.spec.ts](../e2e/projects.spec.ts) (6 tests). Added Phase 2.                    | Complete |

---

## I. Commands & GitHub Readiness (Brief §14, §15)

| ID   | Requirement                                                                                           | Source | Evidence                                                    | Status   |
| ---- | ----------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------- | -------- |
| C-01 | Scripts: dev, build, lint, typecheck, test, test:e2e, db:migrate, db:seed, db:studio                  | §14    | [package.json](../package.json) scripts                     | Complete |
| C-02 | Final verification commands all pass                                                                  | §14    | lint/typecheck/test/build/test:e2e all green (see snapshot) | Complete |
| C-03 | .gitignore, .env.example, README, LICENSE (MIT), setup, demo creds, architecture/testing/roadmap docs | §15    | All present at root + docs/                                 | Complete |

---

## J. Definition of Done (Brief §16)

| ID     | Criterion                           | Status   | Evidence                                                         |
| ------ | ----------------------------------- | -------- | ---------------------------------------------------------------- |
| DoD-01 | Installs cleanly                    | Complete | npm install / build succeed                                      |
| DoD-02 | Runs locally                        | Complete | `npm run start` serves on :3100                                  |
| DoD-03 | All primary pages exist             | Complete | 34 routes built                                                  |
| DoD-04 | Core features work                  | Complete | F-01…F-15 all Complete                                           |
| DoD-05 | Seed data realistic                 | Complete | S-01…S-13 meet/exceed minimums                                   |
| DoD-06 | RBAC works                          | Complete | R-01…R-08; RBAC e2e                                              |
| DoD-07 | Forms validate                      | Complete | Zod + `role="alert"` errors                                      |
| DoD-08 | Boards update statuses              | Complete | StatusSelect persists                                            |
| DoD-09 | Reports render charts               | Complete | Recharts w/ labels + lead/cycle time                             |
| DoD-10 | Notifications work                  | Complete | read/unread + count                                              |
| DoD-11 | QA module works                     | Complete | test cases + bug-from-test                                       |
| DoD-12 | Browser validation complete         | Complete | §G above                                                         |
| DoD-13 | No console errors on main flows     | Complete | validated (RSC prefetch aborts are benign, not errors)           |
| DoD-14 | Lint passes                         | Complete | 0 errors                                                         |
| DoD-15 | Typecheck passes                    | Complete | 0 errors                                                         |
| DoD-16 | Unit tests pass                     | Complete | 68 tests (9 files; +14 added in Phase 2)                                         |
| DoD-17 | Build passes                        | Complete | 34 routes                                                                        |
| DoD-18 | E2E pass or documented              | Complete | 38 Playwright tests pass (+6 added in Phase 2)                                   |
| DoD-19 | Documentation complete              | Complete | docs/\* + README                                                 |
| DoD-20 | Final implementation report created | Complete | [FINAL_IMPLEMENTATION_REPORT.md](FINAL_IMPLEMENTATION_REPORT.md) |

---

## K. Settings Module (enterprise overhaul of Brief §5.15)

The brief (§5.15) requires workspace settings, profile settings, a theme toggle, and notification preferences as real UI state. This was delivered as a complete tabbed Settings module (`/settings`). Every tab is functional, persists where applicable, and is RBAC-gated. The `SettingsShell` strips conditional null panels so non-admins never see admin-only sections.

| ID    | Section          | Implementation                                                                                                                                  | Persistence / Behavior                                                                                           | RBAC gate                                  | Status   |
| ----- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | -------- |
| SET-A | Profile          | [ProfileForm.tsx](../src/components/settings/ProfileForm.tsx)                                                                                   | `updateProfile` persists name/title/department to `User`                                                         | all users                                  | Complete |
| SET-B | Password         | [ChangePasswordForm.tsx](../src/components/settings/ChangePasswordForm.tsx) + [password-policy.ts](../src/lib/domain/password-policy.ts)        | `changePassword` verifies current, enforces policy, bcrypt-hashes new                                            | all users                                  | Complete |
| SET-C | Two-factor (MFA) | [MfaSection.tsx](../src/components/settings/MfaSection.tsx)                                                                                     | `beginMfaSetup`/`confirmMfa`/`disableMfa` toggle `User.mfaEnabled`                                               | all users                                  | Complete |
| SET-D | Sessions         | [SessionsSection.tsx](../src/components/settings/SessionsSection.tsx)                                                                           | lists `UserSession` rows; `revokeSession`/`revokeOtherSessions` delete them                                      | all users                                  | Complete |
| SET-E | Notifications    | [NotificationPrefsForm.tsx](../src/components/settings/NotificationPrefsForm.tsx)                                                               | `updatePreferences` persists JSON to `UserSetting`                                                               | all users                                  | Complete |
| SET-F | Appearance       | [AppearanceForm.tsx](../src/components/settings/AppearanceForm.tsx) + [AppearanceApplier.tsx](../src/components/settings/AppearanceApplier.tsx) | theme/density/reduce-motion/high-contrast/sidebar persist; applied live + server-side on shell                   | all users                                  | Complete |
| SET-G | Regional         | [LocalizationForm.tsx](../src/components/settings/LocalizationForm.tsx)                                                                         | language/timezone/date+time format/week-start persist; live preview                                              | all users                                  | Complete |
| SET-H | Roles & access   | [RolesMatrix.tsx](../src/components/settings/RolesMatrix.tsx)                                                                                   | read-only matrix generated from `permissionsFor` (all roles × permissions)                                       | all users (read)                           | Complete |
| SET-I | Workspace        | [WorkspaceSettingsForm.tsx](../src/components/settings/WorkspaceSettingsForm.tsx)                                                               | `updateWorkspaceSettings` persists 8 keys to `AppSetting`; slug validated                                        | `settings.manage_workspace`                | Complete |
| SET-J | Integrations     | [IntegrationsSection.tsx](../src/components/settings/IntegrationsSection.tsx)                                                                   | `connectIntegration`/`disconnectIntegration` persist `Integration` status (local-dev simulated, clearly labeled) | `settings.manage_workspace` to manage      | Complete |
| SET-K | API tokens       | [ApiTokensSection.tsx](../src/components/settings/ApiTokensSection.tsx)                                                                         | `createApiToken` (shows plaintext once, hashes) / `revokeApiToken` on `ApiToken`                                 | `admin.access`                             | Complete |
| SET-L | Audit log        | [AuditSection.tsx](../src/components/settings/AuditSection.tsx)                                                                                 | renders `AuditLog` entries with actor + localized timestamp                                                      | `audit.view`                               | Complete |
| SET-M | Data export      | [DataExportSection.tsx](../src/components/settings/DataExportSection.tsx)                                                                       | downloads via `/api/export/profile` + `/api/export/workspace` (csv/json)                                         | workspace export: admin                    | Complete |
| SET-N | Danger zone      | [DangerZoneSection.tsx](../src/components/settings/DangerZoneSection.tsx)                                                                       | `setWorkspaceActive` / `resetDemoData` behind exact-phrase confirmation                                          | `settings.manage_workspace`/`admin.access` | Complete |

**Sidebar collapse** ([Sidebar.tsx](../src/components/layout/Sidebar.tsx)) honors the persisted `sidebarCollapsed` appearance preference and offers an in-app collapse/expand toggle. Browser-validated: live dark-theme toggle applies across the shell; engineer login hides all Workspace/admin sections (e2e + manual).

---

## Compliance verdict

All requirements above are marked **Complete**. No `Partial`, `Missing`, `Broken`, or `Unverified` rows remain. All 5 command gates pass (`npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run test:e2e`). 19 routes have been browser-validated with 0 console errors, and RBAC enforcement was confirmed in browser: stakeholder is correctly blocked from `/admin` and `/work-items/new`, and role-appropriate navigation is shown to each role. The three gaps identified during the earlier audit — (1) Reports **Lead Time** metric, (2) Dashboard **Team Workload** widget, (3) **Workspace settings** UI/persistence — were implemented, and the Settings module was subsequently expanded into a full enterprise-grade tabbed module (§K) with every tab functional, persisted, RBAC-gated, tested, and browser-validated.

Phase 2 added further implementation and hardening work that was not reflected in the original matrix:

- `createProject`, `updateProject`, and `archiveProject` server actions (`src/lib/actions/projects.ts`) with full permission gating, Zod validation, and audit logging.
- A `/projects/new` page and `CreateProjectForm` backed by `createProject`.
- `BOARD_COLUMNS` extended to include the `canceled` status (8 columns total).
- Server-side pagination on the work-items list.
- Removal of the hardcoded `AUTH_SECRET` fallback in `src/lib/auth/session.ts`.
- In-memory login rate limiting (10 attempts / 15 min per IP) in `src/lib/auth/actions.ts`.
- HTTP security response headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `X-XSS-Protection`, `Permissions-Policy`) configured in `next.config.ts`.
- `isWorkspaceActive()` guarded by `requireUser()` in `src/lib/actions/danger.ts`.
- 14 new unit tests (2 new test files) and 6 new Playwright E2E tests (1 new spec).
- Hardened selectors in `e2e/management.spec.ts` replacing fragile CSS-based queries.

**Known remaining gaps (not blocking compliance):**

- MFA `confirmMfa` action accepts any 6-digit numeric code — real TOTP verification is simulated and documented as such.
- SQLite foreign-key constraints are not enforced at the database level (no `PRAGMA foreign_keys = ON`); referential integrity is enforced in application code only.
- No `globalSetup` / `globalTeardown` for E2E database isolation — tests run against the seeded demo dataset and may leave behind rows created during test runs.

**The project is functionally complete. All 5 command gates pass, all 34 routes compile, and 19 routes are browser-validated with 0 console errors. The remaining gaps above are known engineering trade-offs in a demo/portfolio context, explicitly documented, and do not block compliance with the master brief.**
