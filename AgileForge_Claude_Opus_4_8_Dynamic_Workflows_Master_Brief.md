# Claude Opus 4.8 Dynamic Workflows Master Build Brief

> **Purpose:** This single Markdown file is designed to be pasted into Claude Code / VS Code and used as the master instruction pack for building, reviewing, validating, testing, and preparing a production-quality Agile software engineering management platform.
>
> **Target model/workflow:** Claude Opus 4.8 with Dynamic Workflows enabled, using 50+ parallel sub-agents where available.
>
> **Non-negotiable goal:** Build a complete, GitHub-ready, production-quality project — not a demo, not a toy app, not a placeholder UI.

---

## 0. Execution Contract For Claude Code

You are Claude Opus 4.8 running inside VS Code with access to the repository, terminal, file system, integrated browser/dev server, and project tooling. Your job is to build the complete product described in this document.

You must operate as a senior staff-level engineering organization using Dynamic Workflows and sub-agents. You must plan, implement, review, test, fix, and verify until the repository reaches a production-ready state.

### Absolute Rules

1. Do **not** produce a superficial demo.
2. Do **not** leave TODO placeholders for core functionality.
3. Do **not** skip tests because of time.
4. Do **not** claim success until you have executed the full verification checklist.
5. Do **not** ignore TypeScript, lint, test, security, accessibility, and browser validation errors.
6. Do **not** create fake passing results. If something fails, fix it.
7. Do **not** silently remove functionality to make tests pass.
8. Do **not** create a monolithic unmaintainable codebase.
9. Do **not** hard-code user-specific secrets, API keys, or credentials.
10. Do **not** push to GitHub unless explicitly instructed by the human. You may prepare the repository for GitHub.

### Required Behavior

You must:

- Create a full project plan before coding.
- Use at least **50 specialized sub-agents** if Dynamic Workflows supports it.
- Assign each sub-agent a clear responsibility.
- Have reviewer agents inspect the work of implementation agents.
- Run the app in the integrated browser and manually verify all main pages and flows.
- Run automated tests.
- Run linting and type checks.
- Run security/dependency checks where possible.
- Produce a final implementation report in `docs/FINAL_IMPLEMENTATION_REPORT.md`.
- Continue iterating until all critical and high-priority issues are fixed.

---

## 1. Product Name

**AgileForge**

A production-grade Agile project management and software engineering operations platform for companies with multiple software teams, engineering managers, product owners, scrum masters, QA engineers, designers, and stakeholders.

---

## 2. Product Vision

AgileForge helps software engineering organizations plan, execute, track, and improve Agile delivery across teams. It gives every employee clarity about:

- What projects exist.
- What sprint is active.
- What tasks they own.
- What blockers exist.
- What priorities matter.
- What engineering metrics show.
- What ceremonies are scheduled.
- What decisions were made.
- What work is at risk.

The platform should feel like a serious internal enterprise SaaS product combining ideas from Jira, Linear, Azure DevOps, Asana, Trello, and engineering analytics dashboards — but implemented as an original, clean, modern application.

---

## 3. Target Users And Roles

### 3.1 System Admin

Responsible for company-wide configuration.

Capabilities:

- Manage users.
- Manage roles and permissions.
- Manage departments and teams.
- View audit logs.
- Configure workspace settings.
- Access all projects and reports.

### 3.2 Engineering Manager

Responsible for teams, delivery health, people workload, and risks.

Capabilities:

- View team dashboards.
- Assign engineers to projects.
- Monitor sprint progress.
- Review workload distribution.
- View blockers and risks.
- Generate reports.

### 3.3 Product Owner

Responsible for product backlog and priorities.

Capabilities:

- Create epics and stories.
- Prioritize backlog.
- Define acceptance criteria.
- Review sprint scope.
- Track feature progress.

### 3.4 Scrum Master

Responsible for Agile process health.

Capabilities:

- Create and manage sprints.
- Track ceremonies.
- Monitor blockers.
- Facilitate retrospectives.
- Track sprint commitments.

### 3.5 Software Engineer

Responsible for implementing assigned work.

Capabilities:

- View personal task board.
- Update task status.
- Log blockers.
- Comment on work items.
- Attach pull request links.
- Track sprint goals.

### 3.6 QA Engineer

Responsible for testing and quality.

Capabilities:

- Create test cases.
- Link bugs to stories.
- Update QA status.
- View release readiness.

### 3.7 Designer

Responsible for UX/UI assets and design tasks.

Capabilities:

- Manage design tasks.
- Attach Figma links.
- Collaborate on feature specs.

### 3.8 Executive / Stakeholder

Responsible for high-level visibility.

Capabilities:

- View read-only dashboards.
- View delivery health.
- View project risk summaries.
- View roadmap progress.

---

## 4. Product Requirements Document PRD

### 4.1 Core Objectives

Build a complete Agile management platform with:

1. Authentication and role-based access control.
2. Company workspace management.
3. Team and employee management.
4. Project management.
5. Epic, story, task, bug, and subtask management.
6. Sprint planning and sprint execution.
7. Kanban and Scrum boards.
8. Personal task dashboard for employees.
9. Backlog management.
10. Blocker tracking.
11. Comments, activity feed, and audit history.
12. Engineering metrics dashboards.
13. Calendar/ceremony tracking.
14. QA/test case tracking.
15. Notifications center.
16. Search and filters.
17. Responsive UI.
18. Accessibility baseline.
19. End-to-end validation through browser testing.
20. GitHub-ready repository structure.

### 4.2 MVP But Production-Quality Scope

This is not a toy MVP. It is a complete v1 with production-quality architecture. It may use a local/dev database by default but must be structured so it can be deployed and extended.

Required v1 modules:

- Auth module.
- Dashboard module.
- Workspace/company module.
- User/team module.
- Project module.
- Agile work item module.
- Sprint module.
- Board module.
- Backlog module.
- Reporting module.
- QA module.
- Notification module.
- Settings module.

### 4.3 Out Of Scope For v1

Do not implement unless all required features are complete:

- Real payment billing.
- Real email sending through third-party provider.
- Native mobile apps.
- Deep Jira import/export.
- Real SSO integration.
- Real-time multiplayer editing through WebSockets.

However, design the architecture so these can be added later.

---

## 5. Functional Requirements

### 5.1 Authentication

Implement secure authentication suitable for local development and future production.

Required:

- Sign in page.
- Sign up or seed users for local testing.
- Logout.
- Session handling.
- Protected routes.
- Role-based UI and route restrictions.
- Seeded demo accounts for each role.

Acceptance criteria:

- Unauthenticated users cannot access app pages.
- Users see only features permitted by their role.
- Logout clears session.
- Invalid login shows clear validation error.

### 5.2 Dashboard

The dashboard must adapt by role.

Required dashboard widgets:

- Active sprint progress.
- My tasks.
- Team workload.
- Open blockers.
- Overdue work.
- Project health.
- Velocity trend.
- Bug count.
- Upcoming ceremonies.
- Recent activity.

Acceptance criteria:

- Dashboard loads with realistic seeded data.
- Charts are meaningful, not decorative.
- Empty/loading/error states exist.
- Layout is responsive.

### 5.3 User And Team Management

Required:

- User list.
- User profile page.
- Role assignment UI for admins.
- Team list.
- Team detail page.
- Assign users to teams.
- Filter users by role/team/status.

Acceptance criteria:

- Admin can create, edit, deactivate users.
- Engineering manager can view team members.
- Engineers can view teammates but not admin controls.

### 5.4 Project Management

Required:

- Project list.
- Project detail page.
- Project health status.
- Owner, team, deadline, status.
- Roadmap timeline.
- Project risks.
- Linked epics and sprints.

Acceptance criteria:

- Users can create/edit projects if permitted.
- Project detail shows all related work.
- Project health updates based on sprint progress, blockers, overdue tasks, and bug severity.

### 5.5 Work Items

Support these work item types:

- Epic.
- Story.
- Task.
- Bug.
- Subtask.

Required fields:

- Title.
- Description.
- Type.
- Status.
- Priority.
- Assignee.
- Reporter.
- Project.
- Epic link.
- Sprint link.
- Story points.
- Labels.
- Due date.
- Acceptance criteria.
- Comments.
- Attachments/links.
- Activity history.

Statuses:

- Backlog.
- Ready.
- In Progress.
- In Review.
- QA.
- Blocked.
- Done.
- Canceled.

Acceptance criteria:

- Work items can be created, edited, filtered, assigned, moved between statuses.
- Required fields are validated.
- Status changes create activity records.
- Engineers can update their tasks.
- Product owners can prioritize backlog.

### 5.6 Sprint Management

Required:

- Create sprint.
- Sprint goal.
- Start/end dates.
- Sprint capacity.
- Add/remove work items.
- Start sprint.
- Complete sprint.
- Sprint summary.
- Burndown chart.
- Velocity chart.

Acceptance criteria:

- Only authorized roles can start/complete sprints.
- Completed sprints generate summary metrics.
- Active sprint board updates when work item statuses change.

### 5.7 Board Views

Required board types:

- Scrum board for active sprint.
- Kanban board for project/team.

Required:

- Columns by status.
- Drag-and-drop movement if feasible.
- If drag-and-drop is unstable, provide reliable status update controls.
- Filters by assignee, priority, type, label.
- Search.

Acceptance criteria:

- Moving a card updates status.
- Board persists changes.
- Browser validation confirms movement works.

### 5.8 Personal Task View

Required:

- “My Work” page.
- Current sprint tasks.
- Overdue tasks.
- Blocked tasks.
- Recently updated tasks.
- Quick status update.

Acceptance criteria:

- Each seeded engineer has realistic assignments.
- Page clearly answers: “What should I work on today?”

### 5.9 Blocker Management

Required:

- Mark work item as blocked.
- Add blocker reason.
- Assign blocker owner.
- Blocker dashboard.
- Resolve blocker.

Acceptance criteria:

- Blocked items are visible on dashboards.
- Blocker resolution updates activity feed.

### 5.10 Comments And Activity Feed

Required:

- Add comments to work items.
- Mention-like UI using plain text is acceptable.
- Activity timeline for status changes, assignment changes, comments, sprint changes.

Acceptance criteria:

- Comments persist.
- Activity feed is chronologically ordered.
- Important changes are logged.

### 5.11 QA Module

Required:

- Test case list.
- Test case detail.
- Link test cases to stories/bugs.
- Test status: Not Run, Passed, Failed, Blocked.
- Bug creation from failed test.
- Release readiness summary.

Acceptance criteria:

- QA engineer can create/update test cases.
- Failed test can create or link bug.
- Project detail shows QA readiness.

### 5.12 Reports And Metrics

Required reports:

- Sprint burndown.
- Velocity trend.
- Team workload.
- Cycle time.
- Lead time.
- Bug severity distribution.
- Blocker aging.
- Project health.

Acceptance criteria:

- Reports use real seeded data from the app data layer.
- Charts have labels, legends, empty states, and responsive sizing.

### 5.13 Notifications

Required:

- In-app notification center.
- Notify on assignment.
- Notify on comment.
- Notify on blocker.
- Notify on sprint change.
- Mark as read/unread.

Acceptance criteria:

- Notifications are role/user specific.
- Notification count updates.

### 5.14 Search And Filters

Required:

- Global search page or command-like search bar.
- Search projects, users, work items.
- Filters on list pages.

Acceptance criteria:

- Search returns relevant results.
- Filters combine predictably.

### 5.15 Settings

Required:

- Workspace settings.
- User profile settings.
- Theme toggle if feasible.
- Notification preferences placeholder implemented as real UI state.

Acceptance criteria:

- Settings pages do not look unfinished.
- Changes persist locally/database where applicable.

---

## 6. Non-Functional Requirements

### 6.1 Quality

- Type-safe code.
- Clean architecture.
- Reusable components.
- Consistent error handling.
- No dead routes.
- No broken navigation.
- No console errors in browser.

### 6.2 Performance

- Main pages should load quickly in dev.
- Avoid unnecessary re-renders.
- Use pagination or reasonable list limits.
- Avoid giant client bundles where possible.

### 6.3 Security

- No secrets committed.
- Validate inputs.
- Protect routes by role.
- Avoid unsafe HTML injection.
- Use environment variables where appropriate.

### 6.4 Accessibility

- Keyboard navigable forms.
- Labels for inputs.
- Sufficient color contrast.
- Semantic headings.
- ARIA attributes for complex UI where appropriate.

### 6.5 Maintainability

- Clear folder structure.
- Document setup and architecture.
- Modular domain boundaries.
- Tests for critical logic.

---

## 7. Recommended Tech Stack

Claude may adjust only if it justifies the change before implementation.

### 7.1 Frontend / Full Stack

Use:

- Next.js latest stable App Router.
- TypeScript.
- Tailwind CSS.
- shadcn/ui or equivalent clean component system.
- React Hook Form.
- Zod validation.
- Recharts for charts.
- Lucide icons.

### 7.2 Backend / Data

Preferred:

- Next.js server actions or route handlers.
- Prisma ORM.
- SQLite for local development.
- Seed script with realistic company data.

Design so it can later move to PostgreSQL.

### 7.3 Testing

Use:

- Vitest or Jest for unit tests.
- React Testing Library for component tests.
- Playwright for E2E browser testing.
- ESLint.
- TypeScript compiler.

### 7.4 Documentation

Required docs:

- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/SETUP.md`
- `docs/TESTING.md`
- `docs/SECURITY.md`
- `docs/ROADMAP.md`
- `docs/FINAL_IMPLEMENTATION_REPORT.md`

---

## 8. Software Design Document SDD

### 8.1 Architecture Style

Use a modular monolith architecture suitable for a production SaaS v1.

Layers:

1. Presentation layer: pages, layouts, UI components.
2. Application layer: use-cases/actions.
3. Domain layer: business rules and types.
4. Data layer: Prisma repositories/services.
5. Infrastructure layer: auth/session, seed data, logging utilities.

### 8.2 Domain Modules

Create clear modules for:

- auth
- users
- teams
- projects
- work-items
- sprints
- boards
- qa
- reports
- notifications
- settings
- audit-log

### 8.3 Data Model

Implement database models for at least:

- User
- Team
- TeamMember
- Project
- Epic
- WorkItem
- Sprint
- SprintWorkItem
- Comment
- ActivityLog
- Blocker
- TestCase
- TestRun
- Notification
- Label
- WorkItemLabel
- AuditLog

### 8.4 Permission Model

Define permissions by role.

Admin:

- full access.

Engineering Manager:

- manage teams/projects/sprints/work items for assigned teams.

Product Owner:

- manage product backlog, epics, stories, priorities.

Scrum Master:

- manage sprints, blockers, ceremonies.

Software Engineer:

- view projects/team; update assigned work; comment; create blockers.

QA Engineer:

- manage test cases, bugs, QA status.

Designer:

- manage design-related tasks and comments.

Stakeholder:

- read-only dashboards and project reports.

### 8.5 Routing Structure

Required app routes:

- `/login`
- `/dashboard`
- `/my-work`
- `/projects`
- `/projects/[id]`
- `/projects/[id]/roadmap`
- `/projects/[id]/reports`
- `/teams`
- `/teams/[id]`
- `/users`
- `/users/[id]`
- `/work-items`
- `/work-items/[id]`
- `/backlog`
- `/sprints`
- `/sprints/[id]`
- `/boards/scrum`
- `/boards/kanban`
- `/qa`
- `/qa/test-cases/[id]`
- `/reports`
- `/notifications`
- `/settings`
- `/admin`

### 8.6 UI Design Requirements

The UI must be clean, modern, and professional.

Style direction:

- Enterprise SaaS dashboard.
- Clear navigation sidebar.
- Top bar with search, notifications, profile.
- Cards with useful metrics.
- Tables with filters.
- Boards with clear columns.
- Forms with validation.
- Charts with real labels.
- Light theme required; dark theme optional.

Avoid:

- Generic landing page filler.
- Empty dashboard cards.
- Placeholder lorem ipsum.
- Broken mobile layouts.

---

## 9. Seed Data Requirements

Create realistic seed data for a fictional company:

Company: **NovaCore Software Inc.**

Teams:

- Platform Engineering
- Web Experience
- Mobile Apps
- Data & AI
- QA Automation
- Product Design

Users:

Create at least 24 users across roles.

Projects:

Create at least 6 projects:

1. Customer Portal Modernization
2. Internal Developer Platform
3. AI Support Assistant
4. Mobile App Redesign
5. Billing Reliability Program
6. Analytics Insights Dashboard

Work items:

- At least 12 epics.
- At least 50 stories.
- At least 80 tasks/subtasks.
- At least 20 bugs.
- At least 15 blockers, some resolved and some open.

Sprints:

- At least 4 completed sprints.
- 1 active sprint.
- 2 planned future sprints.

QA:

- At least 40 test cases.
- Mixed test statuses.

Notifications:

- At least 30 notifications distributed across users.

Activity logs:

- Enough to make timelines realistic.

---

## 10. Dynamic Workflows Sub-Agent Plan

If Dynamic Workflows supports sub-agent creation, spawn at least **55 agents** grouped as follows.

### 10.1 Planning Agents

1. Product Requirements Agent
2. Agile Process Agent
3. UX Information Architecture Agent
4. Data Modeling Agent
5. Architecture Agent

### 10.2 Foundation Agents

6. Repository Setup Agent
7. TypeScript Configuration Agent
8. Styling System Agent
9. Component Library Agent
10. App Layout Agent

### 10.3 Backend/Data Agents

11. Prisma Schema Agent
12. Seed Data Agent
13. Auth Data Agent
14. User Repository Agent
15. Project Repository Agent
16. Work Item Repository Agent
17. Sprint Repository Agent
18. QA Repository Agent
19. Notification Repository Agent
20. Reporting Query Agent

### 10.4 Feature Implementation Agents

21. Auth UI Agent
22. Dashboard Agent
23. Sidebar Navigation Agent
24. Topbar/Search Agent
25. User Management Agent
26. Team Management Agent
27. Project List Agent
28. Project Detail Agent
29. Roadmap Agent
30. Work Item List Agent
31. Work Item Detail Agent
32. Work Item Form Agent
33. Backlog Agent
34. Sprint Planning Agent
35. Sprint Detail Agent
36. Scrum Board Agent
37. Kanban Board Agent
38. My Work Agent
39. Blocker Agent
40. Comments Agent
41. Activity Feed Agent
42. QA Test Case Agent
43. QA Bug Agent
44. Reports Agent
45. Notifications Agent
46. Settings Agent
47. Admin Agent
48. Role Permissions Agent
49. Validation/Error States Agent
50. Responsive Design Agent

### 10.5 Quality And Review Agents

51. Unit Test Agent
52. Component Test Agent
53. Playwright E2E Agent
54. Accessibility Review Agent
55. Security Review Agent
56. Performance Review Agent
57. TypeScript/Lint Review Agent
58. Browser Manual QA Agent
59. Documentation Agent
60. Final Integration Reviewer Agent

### 10.6 Agent Coordination Rules

- Each implementation agent must produce code in its assigned area only.
- Each reviewer agent must inspect relevant files and report issues.
- The Final Integration Reviewer Agent must compare final implementation against this Markdown file.
- Bugs discovered by any reviewer must be assigned back to the correct implementation agent.
- Continue cycles until all critical/high bugs are closed.

---

## 11. Development Phases

### Phase 1: Repository Initialization

Deliver:

- Next.js TypeScript app.
- Tailwind configured.
- Component system installed.
- Prisma configured.
- SQLite dev DB configured.
- Basic layout and route protection.

Verification:

- `npm install` succeeds.
- `npm run dev` starts.
- Home/login route renders.

### Phase 2: Data Model And Seed

Deliver:

- Complete Prisma schema.
- Seed script.
- Seeded users, teams, projects, sprints, work items, QA data, notifications.

Verification:

- DB migration succeeds.
- Seed succeeds.
- Data visible in app.

### Phase 3: Auth And RBAC

Deliver:

- Login/logout.
- Sessions.
- Role permissions.
- Route protection.
- Demo credentials documented.

Verification:

- Each role can log in.
- Restricted pages are blocked.
- Navigation adapts by role.

### Phase 4: Core Agile Modules

Deliver:

- Projects.
- Work items.
- Backlog.
- Sprints.
- Boards.
- My Work.
- Blockers.

Verification:

- Create/update workflows work.
- Status updates persist.
- Boards work.
- Dashboards reflect data.

### Phase 5: QA, Reports, Notifications

Deliver:

- QA module.
- Reports/charts.
- Notifications.
- Activity logs.

Verification:

- Test cases work.
- Reports show meaningful data.
- Notifications update read/unread state.

### Phase 6: Polish, Tests, Docs

Deliver:

- Full docs.
- Tests.
- Browser validation.
- Accessibility fixes.
- Security checks.
- Final report.

Verification:

- All final commands pass.

---

## 12. Required Browser Validation

You must run the app in the VS Code integrated browser or available browser automation.

Validate every route:

- `/login`
- `/dashboard`
- `/my-work`
- `/projects`
- `/projects/[id]`
- `/teams`
- `/users`
- `/work-items`
- `/backlog`
- `/sprints`
- `/boards/scrum`
- `/boards/kanban`
- `/qa`
- `/reports`
- `/notifications`
- `/settings`
- `/admin`

For each route verify:

- Page loads with no blank screen.
- No browser console errors.
- Navigation works.
- Forms validate.
- Buttons perform expected actions.
- Data appears realistic.
- Responsive layout works at desktop/tablet/mobile widths.

Required manual flows:

1. Login as Admin.
2. Create a user.
3. Edit a user role.
4. Create a project.
5. Create an epic.
6. Create a story under epic.
7. Create a task under story.
8. Assign task to engineer.
9. Login as engineer.
10. View task in My Work.
11. Move task to In Progress.
12. Mark task blocked.
13. Login as Scrum Master.
14. Resolve blocker.
15. Add task to active sprint.
16. Move card on board.
17. Complete QA test case.
18. Create bug from failed test.
19. View reports update.
20. Mark notifications as read.

---

## 13. Automated Test Requirements

Implement meaningful tests.

### 13.1 Unit Tests

Test:

- Permission logic.
- Project health calculation.
- Sprint progress calculation.
- Burndown data calculation.
- Work item validation.
- Notification creation rules.

### 13.2 Component Tests

Test:

- Work item form validation.
- Dashboard cards render data.
- Board columns render cards.
- Notification list interactions.

### 13.3 E2E Tests

Use Playwright if possible.

Test:

- Login.
- Create work item.
- Move work item status.
- My Work page.
- Sprint board.
- QA failed test creates bug.
- Role restrictions.

---

## 14. Required Commands

Create scripts in `package.json` where appropriate:

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run db:migrate
npm run db:seed
npm run db:studio
```

Final verification must run:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

If a command fails, fix the root cause and rerun.

---

## 15. GitHub Repository Requirements

Prepare repository as if it will be published.

Required:

- Clean commit-ready file structure.
- `.gitignore`
- `.env.example`
- `README.md`
- License file using MIT unless human says otherwise.
- Screenshots folder placeholder or generated screenshots if possible.
- Clear setup instructions.
- Demo credentials.
- Architecture documentation.
- Testing documentation.
- Roadmap.

README must include:

- Project overview.
- Feature list.
- Tech stack.
- Screenshots section.
- Local setup.
- Environment variables.
- Database setup.
- Demo accounts.
- Test commands.
- Deployment notes.

---

## 16. Definition Of Done

The project is only done when all are true:

- App installs cleanly.
- App runs locally.
- All primary pages exist.
- All required core features work.
- Seed data is realistic.
- Role-based access works.
- Forms validate.
- Boards update statuses.
- Reports render charts.
- Notifications work.
- QA module works.
- Browser validation completed.
- No console errors on main flows.
- Lint passes.
- Typecheck passes.
- Unit tests pass.
- Build passes.
- E2E tests either pass or have documented environment-specific reason and fallback manual validation.
- Documentation complete.
- Final implementation report created.

---

## 17. Final Implementation Report Template

Create `docs/FINAL_IMPLEMENTATION_REPORT.md` with:

```markdown
# Final Implementation Report

## Summary

## Features Implemented

## Architecture Overview

## Sub-Agent Execution Summary

## Browser Validation Results

## Automated Test Results

## Known Limitations

## Security Notes

## Accessibility Notes

## Performance Notes

## Setup Instructions

## Demo Accounts

## Final Verification Checklist

- [ ] npm run lint passed
- [ ] npm run typecheck passed
- [ ] npm run test passed
- [ ] npm run build passed
- [ ] npm run test:e2e passed or documented
- [ ] Browser validation completed
- [ ] No critical bugs remain
- [ ] No high-priority bugs remain
```

---

## 18. Final Instruction To Claude

Begin now.

First, create a short implementation strategy and sub-agent assignment plan.

Then implement the system in phases.

After each major phase, run relevant checks.

After implementation, run the full verification checklist.

Use the integrated browser to inspect the application manually.

If bugs are found, fix them.

Repeat review and validation until the application is production-quality and ready for GitHub.

Do not stop at a demo.
Do not stop at a partially working UI.
Do not stop with failing checks.
Do not declare completion until the Definition Of Done is satisfied.
