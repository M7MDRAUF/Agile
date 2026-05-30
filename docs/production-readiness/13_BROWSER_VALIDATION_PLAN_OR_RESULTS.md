# 13 — Browser Validation Plan

## Status: NOT VERIFIED

Browser automation was not executed in this audit session. This document provides a detailed validation plan for future execution.

---

## Test Environment Requirements

| Requirement   | Value                                |
| ------------- | ------------------------------------ |
| Browser       | Chromium (via Playwright)            |
| Server        | `npm run start` on port 3100         |
| Database      | Seeded with `npm run db:seed`        |
| Auth Secret   | CI test secret (32+ chars)           |
| Demo accounts | See `prisma/seed.ts` for credentials |

---

## Route Validation Plan

### 1. `/login` (Public)

| Check                    | Expected                         | Role             | Status       |
| ------------------------ | -------------------------------- | ---------------- | ------------ |
| Page loads without error | Login form visible               | Public           | Not Verified |
| Invalid credentials      | Error message displayed          | Public           | Not Verified |
| Valid credentials        | Redirect to /dashboard           | Any user         | Not Verified |
| MFA challenge            | TOTP input shown for MFA users   | MFA-enabled user | Not Verified |
| Rate limiting            | Lockout after 10 failed attempts | Public           | Not Verified |

### 2. `/dashboard` (Any authenticated)

| Check             | Expected                             | Role | Status       |
| ----------------- | ------------------------------------ | ---- | ------------ |
| Page loads        | Stats cards, charts, recent activity | Any  | Not Verified |
| No console errors | Clean console                        | Any  | Not Verified |
| Responsive layout | Cards stack on mobile                | Any  | Not Verified |
| Metrics accurate  | Numbers match DB counts              | Any  | Not Verified |

### 3. `/my-work` (Any authenticated)

| Check       | Expected                            | Role     | Status       |
| ----------- | ----------------------------------- | -------- | ------------ |
| Page loads  | Assigned work items listed          | Any      | Not Verified |
| Empty state | Message when no assignments         | New user | Not Verified |
| Links work  | Click navigates to work item detail | Any      | Not Verified |

### 4. `/projects` (project.view)

| Check                 | Expected                               | Role        | Status       |
| --------------------- | -------------------------------------- | ----------- | ------------ |
| Page loads            | Project cards/list displayed           | Developer+  | Not Verified |
| Create button visible | Only for project.create permission     | PM+         | Not Verified |
| Create button hidden  | Stakeholder cannot see create          | Stakeholder | Not Verified |
| RBAC enforcement      | Stakeholder blocked from /projects/new | Stakeholder | Not Verified |

### 5. `/projects/[id]` (project.view)

| Check              | Expected                           | Role       | Status       |
| ------------------ | ---------------------------------- | ---------- | ------------ |
| Page loads         | Project details, work items, risks | Developer+ | Not Verified |
| Risk creation form | Visible for project.edit role      | PM+        | Not Verified |
| Risk status toggle | Updates and persists               | PM+        | Not Verified |
| Archive button     | Visible for project.edit           | PM+        | Not Verified |

### 6. `/work-items` (work_item.view)

| Check         | Expected                     | Role       | Status       |
| ------------- | ---------------------------- | ---------- | ------------ |
| Page loads    | Work item table with filters | Developer+ | Not Verified |
| Create button | Visible for work_item.create | Developer+ | Not Verified |
| Pagination    | Works for large datasets     | Any        | Not Verified |

### 7. `/work-items/[id]` (work_item.view)

| Check           | Expected                      | Role       | Status       |
| --------------- | ----------------------------- | ---------- | ------------ |
| Page loads      | Detail view with all sections | Developer+ | Not Verified |
| Status dropdown | Changes persist on reload     | Editor     | Not Verified |
| Comment form    | Submits and displays          | Commenter  | Not Verified |
| Blocker form    | Creates and displays          | Editor     | Not Verified |
| Link form       | Adds and displays link        | Editor     | Not Verified |

### 8. `/backlog` (work_item.view)

| Check      | Expected                        | Role       | Status       |
| ---------- | ------------------------------- | ---------- | ------------ |
| Page loads | Unassigned items listed         | Developer+ | Not Verified |
| Reorder    | Drag changes rank (or fallback) | Editor     | Not Verified |

### 9. `/sprints` (sprint.view)

| Check         | Expected              | Role          | Status       |
| ------------- | --------------------- | ------------- | ------------ |
| Page loads    | Sprint list displayed | Developer+    | Not Verified |
| Create sprint | Form works, persists  | sprint.create | Not Verified |

### 10. `/sprints/[id]` (sprint.view)

| Check           | Expected                   | Role          | Status       |
| --------------- | -------------------------- | ------------- | ------------ |
| Page loads      | Sprint detail with items   | Developer+    | Not Verified |
| Start button    | Transitions to active      | sprint.manage | Not Verified |
| Complete button | Closes sprint, moves items | sprint.manage | Not Verified |

### 11. `/boards/scrum` (work_item.view)

| Check         | Expected                          | Role       | Status       |
| ------------- | --------------------------------- | ---------- | ------------ |
| Page loads    | Columns by status                 | Developer+ | Not Verified |
| Status change | Dropdown updates, persists reload | Editor     | Not Verified |

### 12. `/boards/kanban` (work_item.view)

| Check            | Expected                     | Role       | Status       |
| ---------------- | ---------------------------- | ---------- | ------------ |
| Page loads       | Columns by status            | Developer+ | Not Verified |
| Status change    | Dropdown works (DnD missing) | Editor     | Not Verified |
| No drag-and-drop | Confirmed: only dropdown     | Any        | Not Verified |

### 13. `/qa` (qa.view)

| Check            | Expected                        | Role      | Status       |
| ---------------- | ------------------------------- | --------- | ------------ |
| Page loads       | Test case list, pass/fail stats | QA+       | Not Verified |
| Create test case | Form works                      | qa.manage | Not Verified |
| Run test         | Status updates                  | qa.run    | Not Verified |

### 14. `/reports` (report.view)

| Check             | Expected                 | Role     | Status       |
| ----------------- | ------------------------ | -------- | ------------ |
| Page loads        | Charts render (Recharts) | Manager+ | Not Verified |
| No console errors | SVG renders clean        | Any      | Not Verified |

### 15. `/notifications` (Any authenticated)

| Check         | Expected                      | Role | Status       |
| ------------- | ----------------------------- | ---- | ------------ |
| Page loads    | Notification list             | Any  | Not Verified |
| Mark read     | Updates immediately           | Any  | Not Verified |
| Mark all read | Batch update                  | Any  | Not Verified |
| Empty state   | Message when no notifications | Any  | Not Verified |

### 16. `/teams` (team.view)

| Check             | Expected            | Role        | Status       |
| ----------------- | ------------------- | ----------- | ------------ |
| Page loads        | Team cards/list     | Developer+  | Not Verified |
| Create team       | Form works          | team.create | Not Verified |
| Add/remove member | Updates team roster | team.manage | Not Verified |

### 17. `/users` (user.view)

| Check       | Expected                | Role     | Status       |
| ----------- | ----------------------- | -------- | ------------ |
| Page loads  | User list               | Manager+ | Not Verified |
| Create user | Form works (admin only) | Admin    | Not Verified |

### 18. `/settings` (Any authenticated)

| Check           | Expected                  | Role               | Status       |
| --------------- | ------------------------- | ------------------ | ------------ |
| Page loads      | Tab interface             | Any                | Not Verified |
| Profile update  | Name change persists      | Any                | Not Verified |
| Password change | Requires current password | Any                | Not Verified |
| MFA setup       | QR code → verify → enable | Any                | Not Verified |
| API tokens      | Create/revoke works       | Any                | Not Verified |
| Workspace tab   | Visible only for managers | workspace_manager+ | Not Verified |

### 19. `/admin` (Admin only)

| Check                       | Expected              | Role      | Status       |
| --------------------------- | --------------------- | --------- | ------------ |
| Page loads                  | Admin panel           | Admin     | Not Verified |
| Role change                 | Updates user role     | Admin     | Not Verified |
| RBAC: blocked for non-admin | Redirect or 403       | Developer | Not Verified |
| Danger zone                 | Confirmation required | Admin     | Not Verified |

### 20. `/search` (Any authenticated)

| Check         | Expected            | Role | Status       |
| ------------- | ------------------- | ---- | ------------ |
| Page loads    | Search input        | Any  | Not Verified |
| Search query  | Results displayed   | Any  | Not Verified |
| Empty results | Empty state message | Any  | Not Verified |

---

## Summary

| Total Routes | Verified | Not Verified |
| ------------ | -------- | ------------ |
| 20           | 0        | 20           |

**Browser validation was NOT performed in this audit session.** All routes are marked "Not Verified". The E2E test suite (11 specs, ~37 tests) provides partial automated coverage for auth, navigation, projects, boards, settings, RBAC, MFA, and accessibility.

**Recommendation**: Execute `npm run test:e2e` in a clean environment to validate all automated E2E tests pass. Then perform manual validation for routes without E2E coverage.
