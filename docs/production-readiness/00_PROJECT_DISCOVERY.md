# 00 — Project Discovery

## Framework & Runtime

| Attribute | Value |
|-----------|-------|
| Framework | Next.js 16.2.6 (App Router, Turbopack) |
| Runtime | Node.js 22 LTS (Docker), 20 (CI) |
| Language | TypeScript 5 (strict mode) |
| UI Library | React 19.2.4, React DOM 19.2.4 |
| CSS | Tailwind CSS 4, PostCSS |
| Package Manager | npm (package-lock.json) |
| Database | SQLite (better-sqlite3 12.10.0) via Prisma 7.8.0 |
| ORM | Prisma Client with @prisma/adapter-better-sqlite3 |
| Authentication | Custom JWT (jose 6.2.3) + bcryptjs 3.0.3 |
| MFA | TOTP via otplib 12.0.1 |
| Validation | Zod 4.4.3 |
| Charts | Recharts 3.8.1 |
| Icons | Lucide React 1.17.0 |
| Testing | Vitest 4.1.7 + Playwright 1.60.0 |
| Containerization | Docker (multi-stage, node:22-bookworm-slim) |

---

## Route Inventory

| Route | Purpose | Required Role | Data Source | Server Action/API | Tests |
|-------|---------|---------------|-------------|-------------------|-------|
| `/login` | Authentication | Public | Users table | `src/lib/auth/actions.ts` | E2E: auth.spec.ts |
| `/dashboard` | Metrics overview | Any authenticated | Multiple parallel queries | N/A (read-only) | E2E: navigation.spec.ts |
| `/my-work` | User's assigned items | Any authenticated | WorkItems by assignee | N/A (read-only) | — |
| `/projects` | Project listing | `project.view` | Projects table | `actions/projects.ts` | E2E: projects.spec.ts |
| `/projects/[id]` | Project detail | `project.view` | Project + relations | `actions/projects.ts` | E2E: projects.spec.ts |
| `/projects/[id]/reports` | Project reports | `report.view` | Metrics queries | N/A (read-only) | — |
| `/projects/[id]/roadmap` | Project roadmap | `project.view` | Epics + WorkItems | N/A (read-only) | — |
| `/projects/new` | Create project | `project.create` | N/A | `actions/projects.ts` | E2E: projects.spec.ts |
| `/work-items` | Work item listing | `work_item.view` | WorkItems table | `actions/work-items.ts` | E2E: work-items.spec.ts |
| `/work-items/[id]` | Work item detail | `work_item.view` | WorkItem + relations | `actions/work-items.ts` | E2E: work-items.spec.ts |
| `/work-items/[id]/edit` | Edit work item | `work_item.edit` | WorkItem | `actions/work-items.ts` | — |
| `/work-items/new` | Create work item | `work_item.create` | N/A | `actions/work-items.ts` | — |
| `/backlog` | Backlog management | `work_item.view` | WorkItems (unassigned sprint) | `actions/work-items.ts` | — |
| `/sprints` | Sprint listing | `sprint.view` | Sprints table | `actions/sprints.ts` | E2E: management.spec.ts |
| `/sprints/[id]` | Sprint detail | `sprint.view` | Sprint + WorkItems | `actions/sprints.ts` | — |
| `/sprints/new` | Create sprint | `sprint.create` | N/A | `actions/sprints.ts` | — |
| `/boards/scrum` | Scrum board | `work_item.view` | WorkItems by sprint+status | `actions/work-items.ts` | E2E: board-persistence.spec.ts |
| `/boards/kanban` | Kanban board | `work_item.view` | WorkItems by status | `actions/work-items.ts` | — |
| `/qa` | QA test cases | `qa.view` | TestCases + TestRuns | `actions/qa.ts` | — |
| `/qa/test-cases/[id]` | Test case detail | `qa.view` | TestCase + runs | `actions/qa.ts` | — |
| `/qa/test-cases/new` | Create test case | `qa.manage` | N/A | `actions/qa.ts` | — |
| `/reports` | Global reports | `report.view` | Aggregated metrics | N/A (read-only) | — |
| `/notifications` | User notifications | Any authenticated | Notifications table | `actions/notifications.ts` | — |
| `/teams` | Team listing | `team.view` | Teams table | `actions/teams.ts` | — |
| `/teams/[id]` | Team detail | `team.view` | Team + members | `actions/teams.ts` | — |
| `/users` | User listing | `user.view` | Users table | `actions/admin.ts` | E2E: management.spec.ts |
| `/users/[id]` | User profile | `user.view` | User record | N/A (read-only) | — |
| `/settings` | User/workspace settings | Any authenticated | UserSettings, AppSettings | `actions/settings.ts` | E2E: settings.spec.ts |
| `/admin` | Admin panel | `admin` role | Users, AuditLogs | `actions/admin.ts` | E2E: rbac-matrix.spec.ts |
| `/search` | Global search | Any authenticated | Multi-table search | N/A (read-only) | — |

**Total Routes**: 30 dynamic routes (all rendering successfully per build output)

---

## Server Action Inventory

| File | Functions | Auth | RBAC | Validation | Tests |
|------|-----------|------|------|------------|-------|
| `actions/projects.ts` | createProject, updateProject, deleteProject, archiveProject, createRisk, updateRiskStatus | ✓ | ✓ | Zod | 9 unit (risk functions untested) |
| `actions/work-items.ts` | updateWorkItemStatus, createWorkItem, updateWorkItem, assignWorkItem, addComment, createBlocker, resolveBlocker, reorderBacklog, addWorkItemLink, removeWorkItemLink | ✓ | ✓ | Zod | 23 unit (links partially untested) |
| `actions/sprints.ts` | createSprint, updateSprint, completeSprint, startSprint | ✓ | ✓ | Zod | 17 unit |
| `actions/teams.ts` | createTeam, updateTeam, addMember, removeMember | ✓ | ✓ | Zod | 12 unit |
| `actions/admin.ts` | createUser, updateUserRole, resetUserPassword | ✓ | ✓ (admin) | Zod | 7 unit |
| `actions/qa.ts` | createTestCase, runTestCase, updateTestCase | ✓ | ✓ | Zod | 13 unit |
| `actions/settings.ts` | updateProfile, updatePassword, updateWorkspaceSettings, updateAppearance, saveUserSetting | ✓ | ✓ | Zod | 14 unit |
| `actions/notifications.ts` | markRead, markAllRead, deleteNotification, clearAll | ✓ | ✓ (ownership) | — | 4 unit |
| `actions/security.ts` | beginMfaSetup, confirmMfa, disableMfa, revokeSession, revokeOtherSessions, changePassword | ✓ | ✓ | Zod | 6 unit |
| `actions/api-tokens.ts` | createApiToken, revokeApiToken | ✓ | ✓ (ownership) | Zod | 5 unit |
| `actions/integrations.ts` | connectIntegration, disconnectIntegration, updateIntegrationConfig | ✓ | ✓ | Zod | 4 unit |
| `actions/danger.ts` | exportData, deleteAllData, resetDemo | ✓ | ✓ (admin) | Confirmation | 11 unit |

---

## Database Model Inventory

| Model | Fields | Indexes | Relations | Cascade |
|-------|--------|---------|-----------|---------|
| User | 14 | 1 (email unique) | 12 relations | — |
| Team | 4 | 1 (key unique) | 2 relations | — |
| TeamMember | 4 | 1 composite unique | 2 FKs | Cascade on team/user delete |
| Project | 12 | 1 (key unique) | 6 relations | — |
| ProjectRisk | 6 | 1 compound | 1 FK | Cascade on project delete |
| Epic | 7 | 1 (key unique) | 2 relations | Cascade on project delete |
| WorkItem | 18 | 8 indexes | 11 relations | Cascade on project delete |
| WorkItemLink | 6 | 1 | 2 FKs | Cascade on workitem delete |
| Sprint | 9 | 1 compound | 2 relations | Cascade on project delete |
| Comment | 5 | 1 compound | 2 FKs | Cascade on workitem delete |
| ActivityLog | 8 | 1 compound | 2 FKs | Cascade on workitem delete |
| Blocker | 7 | 1 compound | 2 FKs | Cascade on workitem delete |
| TestCase | 10 | 2 | 4 relations | Cascade on project delete |
| TestRun | 6 | 2 | 3 FKs | Cascade on testcase delete |
| Notification | 7 | 1 compound | 1 FK | Cascade on user delete |
| Label | 3 | 1 (name unique) | 1 relation | — |
| WorkItemLabel | 2 | composite PK | 2 FKs | Cascade both |
| AuditLog | 7 | 2 | 1 FK | — |
| AppSetting | 3 | PK | — | — |
| UserSetting | 5 | 1 composite unique | 1 FK | Cascade on user delete |
| UserSession | 7 | — | 1 FK | Cascade on user delete |
| ApiToken | 10 | — | 1 FK | Cascade on user delete |
| Integration | 7 | PK | — | — |

**Total Models**: 23

---

## Test Inventory

### Unit Tests (Vitest)
- **Total**: 440 tests across 26 files — ALL PASSING
- **Coverage thresholds**: 75% lines, 75% statements, 78% functions, 65% branches

### E2E Tests (Playwright)
- **Total**: ~37 tests across 11 spec files
- **Status**: Port conflict in captured output (EADDRINUSE); tests exist and run in CI

### Test Files
| Category | Files | Test Count |
|----------|-------|------------|
| Server Actions | 13 files | 137 tests |
| Domain Logic | 8 files | 311 tests |
| Auth | 4 files | ~23 tests |
| Components | 1 file | 4 tests |
| API/HTTP | 2 files | 14 tests |
| E2E | 11 files | ~37 tests |

---

## Configuration Inventory

| File | Purpose |
|------|---------|
| `next.config.ts` | Security headers (CSP, HSTS, X-Frame), Turbopack root |
| `tsconfig.json` | Strict TypeScript, path aliases |
| `eslint.config.mjs` | ESLint 9 flat config with next plugin |
| `vitest.config.ts` | Test configuration with coverage thresholds |
| `playwright.config.ts` | E2E browser config (Chromium, port 3100) |
| `postcss.config.mjs` | Tailwind CSS PostCSS plugin |
| `.prettierrc.json` | Code formatting rules |
| `prisma.config.ts` | Prisma custom output |
| `.env.example` | Environment variable template |
| `Dockerfile` | Multi-stage production container |
| `docker-entrypoint.sh` | Migration + start script |
| `.github/workflows/ci.yml` | CI pipeline (lint, typecheck, test, build, e2e) |

---

## Environment Variable Inventory

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `DATABASE_URL` | Yes | `file:./dev.db` | SQLite file path |
| `AUTH_SECRET` | Yes | `change-me-to-a-long-random-string` | JWT signing secret |
| `SEED_PASSWORD` | Dev only | `Password123!` | Demo account password |
| `NODE_ENV` | Implicit | `development` | Environment mode |
| `PORT` | Runtime | `3000` | Server port |
| `HOSTNAME` | Runtime | `0.0.0.0` | Bind address |

---

## Highest-Risk Areas

1. **SQLite in production** — No horizontal scaling, no connection pooling, single-writer lock
2. **In-memory rate limiting** — Bypassed in multi-instance deployments
3. **Missing Kanban drag-and-drop** — Core UX feature shows display-only board
4. **Risk management functions untested** — `createRisk()` and `updateRiskStatus()` have zero test coverage
5. **E2E port conflict** — Tests cannot run locally when port 3100 is occupied
6. **No centralized middleware** — Auth checks are page-level only, no defense-in-depth
7. **`unsafe-inline` in CSP** — Required for Next.js hydration but weakens XSS protection
8. **No distributed session store** — JWT-only with DB-backed revocation checks on every request
