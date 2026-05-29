# 00 — Project Discovery

> Audit date: **2026-05-29** · Branch: `dynamic-workflows-agileforge-test` · Auditor: Dynamic-Workflow orchestrator (read-only)

## 1. Stack & runtime

| Layer | Choice | Source |
|---|---|---|
| Framework | Next.js **16.2.6** (App Router, Turbopack root pinned) | `package.json:37`, `next.config.ts:7-9` |
| React | **19.2.4** | `package.json:38` |
| ORM | Prisma **7.8.0** w/ `@prisma/adapter-better-sqlite3` 7.8.0 | `package.json:28-31`, `src/lib/db.ts:1-18` |
| DB | SQLite via `better-sqlite3` 12.10.0 (file `dev.db`) | `prisma/schema.prisma:11-13`, `src/lib/db.ts:12` |
| Auth | JWT (HS256) via `jose` 6.2.3, bcryptjs 3.0.3, simulated TOTP MFA | `src/lib/auth/session.ts`, `src/lib/auth/password.ts`, `src/lib/actions/security.ts` |
| Validation | Zod 4.4.3 + react-hook-form 7.76.1 | `package.json:27,43-44` |
| Styling | Tailwind 4 + `class-variance-authority` + `tailwind-merge` | `package.json:32,42,62` |
| Charts | recharts 3.8.1 | `package.json:41` |
| Tests | Vitest 4.1.7 (jsdom), Playwright 1.60 | `package.json:46,55,59,65` |
| Lint/format | ESLint 9 + `eslint-config-next` 16.2.6, Prettier 3.8.3 | `package.json:57-61` |

## 2. Routes inventory (33 pages)

Authenticated app routes under `src/app/(app)/`:

`/admin`, `/admin/audit`, `/backlog`, `/boards/kanban`, `/boards/scrum`, `/dashboard`, `/my-work`, `/notifications`, `/projects`, `/projects/[id]`, `/projects/[id]/reports`, `/projects/[id]/roadmap`, `/projects/new`, `/qa`, `/qa/test-cases/[id]`, `/qa/test-cases/new`, `/reports`, `/search`, `/settings`, `/sprints`, `/sprints/[id]`, `/sprints/new`, `/teams`, `/teams/[id]`, `/users`, `/users/[id]`, `/work-items`, `/work-items/[id]`, `/work-items/[id]/edit`, `/work-items/new`.

Auth: `/login`. Routed at top level.

API routes: `/api/export/profile`, `/api/export/workspace` (CSV/JSON download).

Layouts: 2 only (`src/app/layout.tsx`, `src/app/(app)/layout.tsx`). **No `error.tsx`, `loading.tsx`, or `not-found.tsx` files anywhere** → no per-segment error boundaries or suspense fallbacks.

## 3. Data model — 22 Prisma models

`User, Team, TeamMember, Project, ProjectRisk, Epic, WorkItem, Sprint, Comment, ActivityLog, Blocker, TestCase, TestRun, Notification, Label, WorkItemLabel, AuditLog, AppSetting, UserSetting, UserSession, ApiToken, Integration`.

`src/lib/domain/constants.ts` carries the enum-like unions (SQLite has no native enums).

**Indexes:** Only implicit unique constraints (`User.email`, `Team.key`, `Project.key`, `Epic.key`, `WorkItem.key`, `Label.name`, `@@unique([teamId,userId])`, `@@unique([userId,key])`). **No explicit `@@index([…])` declared on any model** — see Bug **DB-001**.

## 4. Server actions (12 files, all under `src/lib/actions/`)

| File | LOC | Domain |
|---|---|---|
| `admin.ts` | 138 | user CRUD, role change, status |
| `api-tokens.ts` | 88 | create/revoke developer tokens |
| `danger.ts` | 96 | workspace activate/deactivate, demo reset (spawns `npx tsx prisma/seed.ts`) |
| `integrations.ts` | 94 | simulated GitHub/Slack/Calendar/Figma |
| `notifications.ts` | 26 | mark read |
| `projects.ts` | 166 | create/update/archive projects |
| `qa.ts` | 155 | test cases, runs |
| `security.ts` | 196 | password, MFA, session revoke |
| `settings.ts` | 224 | profile, preferences |
| `sprints.ts` | 161 | create/start/complete sprint |
| `teams.ts` | 85 | team CRUD |
| `work-items.ts` | 321 | full WI lifecycle, comments, blockers |

All files begin with `"use server"`. Mutations call `revalidatePath` per touched route.

## 5. Tests

- **Vitest specs (9):** under `src/lib/**/__tests__/` and adjacent. Coverage focused on domain helpers (permissions, password policy, metrics) and selected server actions.
- **Playwright specs (6):** `e2e/auth.spec.ts`, `navigation.spec.ts`, `work-items.spec.ts`, `settings.spec.ts`, `management.spec.ts`, `projects.spec.ts`.
- **Coverage gaps:** see file `07_TESTABILITY_AUDIT.md`.

## 6. Components

61 `.tsx` files under `src/components/` plus per-route components. UI primitives, form widgets, board, table.

## 7. Environment

`.env.example` documents:

```
AUTH_SECRET="change-me-to-a-long-random-string"
DATABASE_URL="file:./dev.db"
SEED_PASSWORD="Password123!"
```

`AUTH_SECRET` is read at module load (`src/lib/auth/session.ts:20-23`) and throws if missing — fail-fast is correct.

## 8. CI

**Not present.** No `.github/workflows/`, no `azure-pipelines.yml`, no `.gitlab-ci.yml`. There is no automated lint/test/build gate in the repo. See file `08_DEPLOYABILITY_AND_OPERABILITY_AUDIT.md`.

## 9. Documentation present

`docs/MASTER_BRIEF.md` (source-of-truth), `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/SETUP.md`, `docs/TESTING.md`, `docs/ROADMAP.md`, `docs/REQUIREMENTS_TRACEABILITY_MATRIX.md`, `docs/FINAL_IMPLEMENTATION_REPORT.md`.

> **Naming mismatch:** the brief at repo root is `AgileForge_Claude_Opus_4_8_Dynamic_Workflows_Master_Brief.md`. The in-tree version `docs/MASTER_BRIEF.md` is treated as canonical. Both should be reconciled.

## 10. Highest-risk areas (preview — full evidence in 03/04/05)

1. **Fake MFA** — `src/lib/actions/security.ts:114` accepts any 6-digit string.
2. **No DB indexes** on hot foreign keys (`projectId`, `assigneeId`, `sprintId`, `status`).
3. **In-process rate limit** for login (`src/lib/auth/actions.ts:15-27`) — does not survive horizontal scale.
4. **`Math.random()`** used for MFA secret + recovery codes (`security.ts:84-93`) — not cryptographically secure.
5. **SQLite single-writer** — unsuitable for multi-user production load.
6. **Missing security headers**: no CSP, no HSTS (`next.config.ts:14-23`).
7. **API routes bypass middleware** — middleware matcher excludes `/api/*` (`src/middleware.ts:31-33`); the export routes are only protected via `requireUser()` inside the handler — acceptable but easy to forget.
8. **Demo reset action spawns shell** (`src/lib/actions/danger.ts:73-78`) — `execFile` with constant args, but the pattern is dangerous to template later.
9. **Non-atomic WI key generation** (`work-items.ts:117-125`) — read-then-write inside a transaction can collide under concurrent writes against SQLite WAL.
10. **No CI**, no observability, no health endpoint.

## 11. Safe-command summary (full output in `12_COMMAND_RESULTS.md`)

| Command | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run test -- --run` | **FAIL** (2 failed / 66 passed of 68) — see Bug **QA-001** |
| `npm run build` | PASS (with `middleware` → `proxy` deprecation warning) |
| `npm run test:e2e` | **Not Verified** — requires running dev server; not executed in this audit |

## 12. Verdict (preview)

**NOT production-ready.** Blockers in Security (fake MFA, missing headers), Reliability (failing tests, race in key generation), and Operability (no CI, no observability) gate release. Full verdict in `14_FINAL_PLAN_MODE_SUMMARY.md`.
