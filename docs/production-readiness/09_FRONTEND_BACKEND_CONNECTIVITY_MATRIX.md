# 09 — Frontend ↔ Backend Connectivity Matrix

> Per §7 of the master brief: every visible control mapped to action → schema → model → permission → persistence → test → browser. Status legend at the bottom.

## Coverage scope

19 user-facing routes × interactive controls. Source: read of `src/app/(app)/**`, `src/lib/actions/*`, `src/lib/domain/schemas.ts`, `prisma/schema.prisma`.

## Matrix

| Route | Control | Server action / route | Validation | Model | Permission | Persistence | Test | Browser | Classification |
|---|---|---|---|---|---|---|---|---|---|
| `/login` | Sign-in form | `signInAction` (`src/lib/auth/actions.ts:38`) | Zod email + min(1) password | `User`, `UserSession` | n/a (login) | `setSessionCookie` writes JWT cookie; `UserSession.create` | `e2e/auth.spec.ts` | Not Verified | **Partially functional** — MFA gate missing (SEC-002) |
| `/login` | Logout link | `signOutAction` (`src/lib/auth/actions.ts:103`) | n/a | `UserSession` | session-bound | revokes UserSession, clears cookie | indirect (e2e) | Not Verified | Fully functional |
| `/dashboard` | KPI cards | RSC read | n/a | Multiple | `requireUser` | read-only | ❌ | Not Verified | **Read-only by design** |
| `/dashboard` | Quick links | nav | n/a | n/a | `requireUser` | n/a | ❌ | Not Verified | Fully functional |
| `/my-work` | My items list | RSC read | n/a | `WorkItem` | `requireUser` | read-only | ❌ | Not Verified | Read-only by design |
| `/my-work` | Mark notification read | `markNotificationRead` (`notifications.ts:7`) | id Zod | `Notification` | ownership | `update` + revalidatePath | ❌ | Not Verified | **Missing test** |
| `/projects` | Project list | RSC read | n/a | `Project` | `projects.view` | read-only | partial (e2e `projects.spec.ts`) | Not Verified | Read-only by design |
| `/projects/new` | Create project form | `createProject` (`projects.ts:34`) | Zod name/key/desc | `Project`, `TeamMember` | `projects.create` | `prisma.project.create` + revalidate | ❌ | Not Verified | **Missing unit test** |
| `/projects/[id]` | Edit project | `updateProject` (`projects.ts`) | Zod | `Project` | `projects.edit` | update + revalidate | ❌ | Not Verified | Missing test |
| `/projects/[id]` | Archive project | `archiveProject` (`projects.ts`) | id | `Project` | `projects.archive` | update + revalidate | ❌ | Not Verified | Missing test |
| `/projects/[id]/reports` | Velocity/burndown charts | RSC read | n/a | `Sprint`, `WorkItem` | view | read-only | ❌ | Not Verified | Read-only by design |
| `/projects/[id]/roadmap` | Roadmap view | RSC read | n/a | `Epic`, `WorkItem` | view | read-only | ❌ | Not Verified | Read-only by design |
| `/work-items` | List + filters | RSC read | n/a | `WorkItem` | `requireUser` | read-only | partial (e2e) | Not Verified | Read-only by design |
| `/work-items/new` | Create WI form | `createWorkItem` (`work-items.ts:90`) | Zod schema | `WorkItem` | `workItems.create` | `$transaction` → create + ActivityLog + Notification + revalidate | **failing** (QA-001) | Not Verified | **Broken** (test) + race (PERF-003) |
| `/work-items/[id]` | View | RSC | n/a | `WorkItem`, related | `workItems.view` | read-only | partial | Not Verified | Read-only by design |
| `/work-items/[id]/edit` | Edit WI | `updateWorkItem` (`work-items.ts`) | Zod | `WorkItem` | `canEditWorkItem` | update + ActivityLog + Notification + revalidate | partial | Not Verified | **Missing transactional integrity** (REL-003) |
| `/work-items/[id]` | Add comment | `addComment` (`work-items.ts`) | Zod body | `Comment`, `ActivityLog` | view | create + revalidate | ❌ | Not Verified | Missing test |
| `/work-items/[id]` | Add blocker | `addBlocker` (`work-items.ts`) | Zod | `Blocker` | edit | create | ❌ | Not Verified | Missing test |
| `/work-items/[id]` | Change status | `updateWorkItemStatus` (`work-items.ts:47`) | Zod status | `WorkItem` + `ActivityLog` + `Notification` | edit | 3 separate writes (REL-003) | ❌ | Not Verified | **Missing transaction** |
| `/backlog` | Backlog list + reorder | RSC + (drag handler?) | unverified | `WorkItem` | edit | ⚠️ persistence path unverified | ❌ | Not Verified | **Not Verified** |
| `/sprints` | Sprint list | RSC | n/a | `Sprint` | view | read-only | ❌ | Not Verified | Read-only by design |
| `/sprints/new` | Create sprint | `createSprint` (`sprints.ts`) | Zod | `Sprint` | `sprints.manage` | create + revalidate | ❌ | Not Verified | Missing test |
| `/sprints/[id]` | Start sprint | `startSprint` (`sprints.ts:62`) | id | `Sprint` + `Notification[]` | manage | sequential writes (REL-003) | ❌ | Not Verified | **Missing transaction** |
| `/sprints/[id]` | Complete sprint | `completeSprint` (`sprints.ts:106`) | id | `Sprint`, `WorkItem` | manage | reads all items into memory (REL-008) | ❌ | Not Verified | **Inefficient persistence** |
| `/boards/scrum` | Drag card across columns | unverified action | unverified | `WorkItem` | edit | ⚠️ | ❌ | Not Verified | **Not Verified** |
| `/boards/scrum` | Click card → drawer | nav | n/a | `WorkItem` | view | n/a | ❌ | Not Verified | Read-only by design |
| `/boards/kanban` | Drag card across columns | unverified | unverified | `WorkItem` | edit | ⚠️ | ❌ | Not Verified | **Not Verified** |
| `/qa` | Test case list | RSC | n/a | `TestCase` | view | read-only | ❌ | Not Verified | Read-only by design |
| `/qa/test-cases/new` | Create test case | `createTestCase` (`qa.ts`) | Zod | `TestCase` | manage | create + revalidate | ❌ | Not Verified | Missing test |
| `/qa/test-cases/[id]` | Record test run | `createTestRun` (`qa.ts`) | Zod | `TestRun` | manage | create + revalidate | ❌ | Not Verified | Missing test |
| `/reports` | Velocity chart | RSC | n/a | `Sprint`, `WorkItem` | view | read-only | ❌ | Not Verified | Read-only by design |
| `/notifications` | Mark all read | `markNotificationRead` | id | `Notification` | ownership | update + revalidate | ❌ | Not Verified | Missing test |
| `/teams` | Team list | RSC | n/a | `Team` | view | read-only | partial | Not Verified | Read-only by design |
| `/teams/[id]` | Edit team / add member | `updateTeam`, `addMember` (`teams.ts`) | Zod | `Team`, `TeamMember` | manage | create/update + revalidate | partial | Not Verified | Missing test |
| `/users` | User list | RSC | n/a | `User` | `admin.access` | read-only | partial (management) | Not Verified | Read-only by design |
| `/users/[id]` | View user | RSC | n/a | `User` | `admin.access` | read-only | partial | Not Verified | Read-only by design |
| `/admin` | Create user | `createUser` (`admin.ts:24`) | Zod | `User` + `AuditLog` | `admin.users` | create + audit + revalidate | ❌ | Not Verified | Missing test |
| `/admin` | Change role | `changeUserRole` (`admin.ts:90`) | Zod | `User` + `AuditLog` | `admin.users` | update + audit; **JWT not rotated** (SEC-013) | ❌ | Not Verified | **Partially functional** |
| `/admin` | Toggle status | `toggleUserStatus` (`admin.ts`) | id | `User` + `AuditLog` | `admin.users` | update + audit | ❌ | Not Verified | Missing test |
| `/admin/audit` | Audit log table | RSC | n/a | `AuditLog` | `admin.access` | read-only | ❌ | Not Verified | Read-only by design |
| `/admin` | Activate/deactivate workspace | `setWorkspaceActive` (`danger.ts:27`) | bool | `AppSetting` + audit | `admin.access` | update + audit | ❌ | Not Verified | Missing test |
| `/admin` | Reset demo data | `resetDemoData` (`danger.ts:64`) | n/a | many | `admin.access` | **spawns child process** (REL-005) | ❌ | Not Verified | **Brittle in serverless** |
| `/settings` | Update profile | `updateProfile` (`settings.ts`) | Zod | `User` | self | update + revalidate | partial | Not Verified | Missing dedicated test |
| `/settings` | Change preferences | `updatePreferences` (`settings.ts`) | Zod | `UserSetting` | self | upsert + revalidate | ❌ | Not Verified | Missing test |
| `/settings` | Change password | `updatePassword` (`security.ts:32`) | Zod policy | `User` + `AuditLog` | self | update + audit (REL-003 partial-fail) | ❌ | Not Verified | Missing test |
| `/settings` | Enable MFA | `enableMfa` (`security.ts:78`) | n/a | `User` (mfaSecret) | self | **stores Math.random secret** (SEC-005) | ❌ | Not Verified | **Fake control** |
| `/settings` | Confirm MFA | `confirmMfa` (`security.ts:109`) | Zod 6-digit | `User.mfaEnabled` | self | **accepts ANY code** (SEC-001) | ❌ | Not Verified | **Critical fake control** |
| `/settings` | Revoke other sessions | `revokeOtherSessions` (`security.ts`) | n/a | `UserSession` | self | updateMany + audit | ❌ | Not Verified | Missing test |
| `/settings` | Create API token | `createApiToken` (`api-tokens.ts:24`) | Zod name/scopes | `ApiToken` | self | create + audit | ❌ | Not Verified | **Token scopes not enforced** (SEC-015) |
| `/settings` | Revoke API token | `revokeApiToken` (`api-tokens.ts`) | id | `ApiToken` | self | update + audit | ❌ | Not Verified | Missing test |
| `/settings` | Connect integration | `connectIntegration` (`integrations.ts`) | Zod provider | `Integration` | self | upsert + audit | ❌ | Not Verified | **Simulated only** |
| `/settings` | Export profile | `GET /api/export/profile` | n/a | many | `requireUser` | streams JSON/CSV | ❌ | Not Verified | Missing test |
| `/admin` | Export workspace | `GET /api/export/workspace` | n/a | many | `admin.access` | **unbounded findMany** (PERF-002) | ❌ | Not Verified | **Memory risk** |
| `/search` | Global search | RSC + query | unverified | many | `requireUser` | read-only | ❌ | Not Verified | Not Verified |

## Status legend

- **Fully functional** — Persists, validated, permission-checked, tested.
- **Partially functional** — One of: incomplete persistence, missing audit, missing rotation, fake gate.
- **Read-only by design** — No write path expected.
- **Broken** — Currently fails (test/runtime).
- **Placeholder** — UI present, action absent or stubbed.
- **Missing persistence / validation / permission check** — gap as named.
- **Not Verified** — Browser proof absent.

## Auto-generated bug IDs

Every row whose Classification is not "Fully functional" or "Read-only by design" produces an entry in `10_BUG_REGISTER.md`. The bug IDs are: SEC-001/002/005/013/015, REL-003/004/005/008, PERF-002/003, QA-001, plus **NEW**:
- **CON-001** [High] — Backlog reorder persistence not verified
- **CON-002** [High] — Scrum/Kanban drag persistence not verified
- **CON-003** [High] — `/search` query path not verified
- **CON-004** [Medium] — Integrations are simulated; UI does not disclose this clearly
