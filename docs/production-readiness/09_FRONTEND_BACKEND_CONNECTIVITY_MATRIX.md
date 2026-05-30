# 09 — Frontend-Backend Connectivity Matrix

## Auditing Agents

- **frontend-engineer** (primary)
- **backend-engineer** (supporting)
- **qa-engineer** (supporting)

---

## Legend

| Classification      | Definition                                                 |
| ------------------- | ---------------------------------------------------------- |
| Fully functional    | UI control → server action → DB → revalidation → UI update |
| Read-only by design | Server component renders DB data, no mutations needed      |
| Missing DnD         | Feature works via fallback but lacks expected UX pattern   |
| Not verified        | Cannot confirm without browser testing                     |

---

## Connectivity Matrix

| #   | Page                     | Control                    | Server Action                                 | Validation   | DB Model               | Permission                  | Test Coverage                  | Classification              |
| --- | ------------------------ | -------------------------- | --------------------------------------------- | ------------ | ---------------------- | --------------------------- | ------------------------------ | --------------------------- |
| 1   | `/login`                 | Login form                 | `auth/actions.ts:login`                       | Zod          | User, UserSession      | Public                      | E2E: auth.spec.ts              | Fully functional            |
| 2   | `/login`                 | MFA code input             | `auth/actions.ts:verifyMfa`                   | Zod          | User (mfaSecret)       | Public (post-login)         | E2E: mfa.spec.ts               | Fully functional            |
| 3   | `/dashboard`             | Stats display              | N/A (server read)                             | —            | Multiple tables        | Any auth                    | E2E: navigation.spec.ts        | Read-only by design         |
| 4   | `/my-work`               | Work items list            | N/A (server read)                             | —            | WorkItem               | Any auth                    | —                              | Read-only by design         |
| 5   | `/projects`              | Project list               | N/A (server read)                             | —            | Project                | `project.view`              | E2E: projects.spec.ts          | Read-only by design         |
| 6   | `/projects/new`          | Create project form        | `actions/projects.ts:createProject`           | Zod          | Project                | `project.create`            | E2E: projects.spec.ts          | Fully functional            |
| 7   | `/projects/[id]`         | Project detail + risk form | `actions/projects.ts:createRisk`              | Zod          | ProjectRisk            | `project.edit`              | **No tests**                   | Fully functional (untested) |
| 8   | `/projects/[id]`         | Risk status toggle         | `actions/projects.ts:updateRiskStatus`        | Zod          | ProjectRisk            | `project.edit`              | **No tests**                   | Fully functional (untested) |
| 9   | `/projects/[id]`         | Archive button             | `actions/projects.ts:archiveProject`          | —            | Project                | `project.edit`              | Unit test                      | Fully functional            |
| 10  | `/projects/[id]/reports` | Charts display             | N/A (server read)                             | —            | WorkItem, Sprint       | `report.view`               | —                              | Read-only by design         |
| 11  | `/projects/[id]/roadmap` | Roadmap display            | N/A (server read)                             | —            | Epic, WorkItem         | `project.view`              | —                              | Read-only by design         |
| 12  | `/work-items`            | Work item list             | N/A (server read)                             | —            | WorkItem               | `work_item.view`            | E2E: work-items.spec.ts        | Read-only by design         |
| 13  | `/work-items/new`        | Create form                | `actions/work-items.ts:createWorkItem`        | Zod          | WorkItem               | `work_item.create`          | Unit test                      | Fully functional            |
| 14  | `/work-items/[id]`       | Status dropdown            | `actions/work-items.ts:updateWorkItemStatus`  | Zod          | WorkItem, ActivityLog  | `work_item.edit`            | Unit + E2E                     | Fully functional            |
| 15  | `/work-items/[id]`       | Assignee dropdown          | `actions/work-items.ts:assignWorkItem`        | Zod          | WorkItem, Notification | `work_item.assign`          | Unit test                      | Fully functional            |
| 16  | `/work-items/[id]`       | Comment form               | `actions/work-items.ts:addComment`            | Zod          | Comment, Notification  | `work_item.comment`         | Unit test                      | Fully functional            |
| 17  | `/work-items/[id]`       | Blocker form               | `actions/work-items.ts:createBlocker`         | Zod          | Blocker, ActivityLog   | `work_item.edit`            | Unit test                      | Fully functional            |
| 18  | `/work-items/[id]`       | Resolve blocker            | `actions/work-items.ts:resolveBlocker`        | —            | Blocker                | `work_item.edit`            | Unit test                      | Fully functional            |
| 19  | `/work-items/[id]`       | Add link form              | `actions/work-items.ts:addWorkItemLink`       | Zod          | WorkItemLink           | `work_item.edit`            | **No tests**                   | Fully functional (untested) |
| 20  | `/work-items/[id]`       | Remove link button         | `actions/work-items.ts:removeWorkItemLink`    | —            | WorkItemLink           | `work_item.edit`            | **No tests**                   | Fully functional (untested) |
| 21  | `/work-items/[id]/edit`  | Edit form                  | `actions/work-items.ts:updateWorkItem`        | Zod          | WorkItem               | `work_item.edit`            | Unit test                      | Fully functional            |
| 22  | `/backlog`               | Reorder drag               | `actions/work-items.ts:reorderBacklog`        | Zod          | WorkItem (rank)        | `work_item.edit`            | Unit test                      | Fully functional            |
| 23  | `/sprints`               | Sprint list                | N/A (server read)                             | —            | Sprint                 | `sprint.view`               | —                              | Read-only by design         |
| 24  | `/sprints/new`           | Create sprint form         | `actions/sprints.ts:createSprint`             | Zod          | Sprint                 | `sprint.create`             | Unit + E2E                     | Fully functional            |
| 25  | `/sprints/[id]`          | Start sprint button        | `actions/sprints.ts:startSprint`              | —            | Sprint                 | `sprint.manage`             | Unit test                      | Fully functional            |
| 26  | `/sprints/[id]`          | Complete sprint button     | `actions/sprints.ts:completeSprint`           | —            | Sprint, WorkItem       | `sprint.manage`             | Unit test                      | Fully functional            |
| 27  | `/boards/scrum`          | Status columns display     | N/A (server read)                             | —            | WorkItem               | `work_item.view`            | E2E: board-persistence.spec.ts | Read-only by design         |
| 28  | `/boards/scrum`          | Status dropdown (per card) | `actions/work-items.ts:updateWorkItemStatus`  | Zod          | WorkItem               | `work_item.edit`            | E2E: board-persistence.spec.ts | Fully functional            |
| 29  | `/boards/kanban`         | Kanban columns display     | N/A (server read)                             | —            | WorkItem               | `work_item.view`            | —                              | **Missing DnD**             |
| 30  | `/boards/kanban`         | Status dropdown (per card) | `actions/work-items.ts:updateWorkItemStatus`  | Zod          | WorkItem               | `work_item.edit`            | —                              | Fully functional            |
| 31  | `/qa`                    | Test case list             | N/A (server read)                             | —            | TestCase               | `qa.view`                   | —                              | Read-only by design         |
| 32  | `/qa/test-cases/new`     | Create test case form      | `actions/qa.ts:createTestCase`                | Zod          | TestCase               | `qa.manage`                 | Unit test                      | Fully functional            |
| 33  | `/qa/test-cases/[id]`    | Run test button            | `actions/qa.ts:runTestCase`                   | Zod          | TestRun                | `qa.run`                    | Unit test                      | Fully functional            |
| 34  | `/reports`               | Charts display             | N/A (server read)                             | —            | Multiple tables        | `report.view`               | —                              | Read-only by design         |
| 35  | `/notifications`         | Mark read button           | `actions/notifications.ts:markRead`           | —            | Notification           | Ownership                   | Unit test                      | Fully functional            |
| 36  | `/notifications`         | Mark all read              | `actions/notifications.ts:markAllRead`        | —            | Notification           | Ownership                   | Unit test                      | Fully functional            |
| 37  | `/notifications`         | Clear all                  | `actions/notifications.ts:clearAll`           | —            | Notification           | Ownership                   | Unit test                      | Fully functional            |
| 38  | `/teams`                 | Team list                  | N/A (server read)                             | —            | Team                   | `team.view`                 | —                              | Read-only by design         |
| 39  | `/teams`                 | Create team form           | `actions/teams.ts:createTeam`                 | Zod          | Team                   | `team.create`               | Unit + E2E                     | Fully functional            |
| 40  | `/teams/[id]`            | Add member                 | `actions/teams.ts:addMember`                  | Zod          | TeamMember             | `team.manage`               | Unit test                      | Fully functional            |
| 41  | `/teams/[id]`            | Remove member              | `actions/teams.ts:removeMember`               | —            | TeamMember             | `team.manage`               | Unit test                      | Fully functional            |
| 42  | `/users`                 | User list                  | N/A (server read)                             | —            | User                   | `user.view`                 | —                              | Read-only by design         |
| 43  | `/users`                 | Create user form           | `actions/admin.ts:createUser`                 | Zod          | User                   | Admin only                  | Unit + E2E                     | Fully functional            |
| 44  | `/settings`              | Profile form               | `actions/settings.ts:updateProfile`           | Zod          | User                   | Any auth                    | E2E: settings.spec.ts          | Fully functional            |
| 45  | `/settings`              | Password form              | `actions/settings.ts:updatePassword`          | Zod          | User                   | Any auth                    | E2E: settings.spec.ts          | Fully functional            |
| 46  | `/settings`              | Workspace settings         | `actions/settings.ts:updateWorkspaceSettings` | Zod          | AppSetting             | `settings.manage_workspace` | Unit + E2E                     | Fully functional            |
| 47  | `/settings`              | Appearance                 | `actions/settings.ts:updateAppearance`        | Zod          | UserSetting            | Any auth                    | Unit test                      | Fully functional            |
| 48  | `/settings`              | MFA setup                  | `actions/security.ts:beginMfaSetup`           | —            | User (mfaSecret)       | Any auth                    | Unit test                      | Fully functional            |
| 49  | `/settings`              | MFA disable                | `actions/security.ts:disableMfa`              | Password     | User                   | Any auth                    | Unit test                      | Fully functional            |
| 50  | `/settings`              | Session revoke             | `actions/security.ts:revokeSession`           | —            | UserSession            | Ownership                   | Unit test                      | Fully functional            |
| 51  | `/settings`              | API token create           | `actions/api-tokens.ts:createApiToken`        | Zod          | ApiToken               | Any auth                    | Unit test                      | Fully functional            |
| 52  | `/settings`              | API token revoke           | `actions/api-tokens.ts:revokeApiToken`        | —            | ApiToken               | Ownership                   | Unit test                      | Fully functional            |
| 53  | `/settings`              | Integrations connect       | `actions/integrations.ts:connectIntegration`  | Zod          | Integration            | `settings.manage_workspace` | Unit test                      | Fully functional            |
| 54  | `/admin`                 | User role change           | `actions/admin.ts:updateUserRole`             | Zod          | User, AuditLog         | Admin only                  | Unit test                      | Fully functional            |
| 55  | `/admin`                 | Reset password             | `actions/admin.ts:resetUserPassword`          | —            | User                   | Admin only                  | Unit test                      | Fully functional            |
| 56  | `/admin`                 | Export data                | `actions/danger.ts:exportData`                | Confirmation | Multiple               | Admin only                  | Unit test                      | Fully functional            |
| 57  | `/admin`                 | Delete all data            | `actions/danger.ts:deleteAllData`             | Confirmation | All tables             | Admin only                  | Unit test                      | Fully functional            |
| 58  | `/admin`                 | Reset demo                 | `actions/danger.ts:resetDemo`                 | Confirmation | All tables             | Admin + flag                | Unit test                      | Fully functional            |
| 59  | `/search`                | Search input               | N/A (server read)                             | —            | Multiple tables        | Any auth                    | —                              | Read-only by design         |

---

## Summary

| Classification              | Count | Percentage |
| --------------------------- | ----- | ---------- |
| Fully functional            | 40    | 68%        |
| Fully functional (untested) | 4     | 7%         |
| Read-only by design         | 14    | 24%        |
| Missing DnD                 | 1     | 1%         |
| Placeholder                 | 0     | 0%         |
| Broken                      | 0     | 0%         |
| Missing persistence         | 0     | 0%         |
| Missing validation          | 0     | 0%         |
| Missing permission check    | 0     | 0%         |

**Key Finding**: Zero broken, placeholder, or missing-persistence controls. The one "Missing DnD" (Kanban) functions via dropdown fallback. Four untested functions need test coverage.
