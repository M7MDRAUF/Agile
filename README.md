# AgileForge

> A production-grade Agile project management & software engineering operations platform.

AgileForge is a full-stack web application for planning, executing and shipping
Agile delivery across teams. It combines project & sprint management, work-item
tracking, Scrum and Kanban boards, a prioritized backlog, blockers, QA test
management, dashboards, charts/reports, notifications, search, role-based access
control and an admin console — in one cohesive, themeable workspace.

Built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**,
**Prisma 7 + SQLite**, **Tailwind CSS v4**, JWT auth and **Recharts**.

---

## Highlights

- **Auth & RBAC** — JWT (jose) sessions in httpOnly cookies, bcrypt password
  hashing, capability-based permissions for 8 roles, middleware route protection.
- **Projects** — health, roadmap (epics + sprint timeline) and per-project reports.
- **Work items** — epics, stories, tasks, bugs and subtasks with assignees,
  reporters, story points, acceptance criteria, comments, activity timelines and
  blockers.
- **Sprints & boards** — sprint planning with burndown charts, Scrum and Kanban
  boards with inline status changes.
- **Backlog** — priority-sorted, project-filterable list of unscheduled work.
- **My Work** — a personal cockpit (current sprint, overdue, blocked, recent).
- **QA** — test cases, test runs and automatic bug creation on failures.
- **Insights** — dashboards plus velocity, workload, bug-severity and
  blocker-aging charts.
- **Notifications, search, settings (incl. dark mode), teams & users.**
- **Admin** — user role management, activation toggles and an audit log.

See the [architecture overview](docs/ARCHITECTURE.md) for full detail.

---

## Quick start

Requirements: Node.js 20+ (built/tested on Node 24) and npm.

```bash
npm install            # installs deps and runs `prisma generate`
npm run db:push        # create the SQLite schema (dev.db)
npm run db:seed        # load realistic demo data
npm run dev            # http://localhost:3000
```

Full setup and troubleshooting: [docs/SETUP.md](docs/SETUP.md).

### Demo accounts

All demo accounts use the password `Password123!`.

| Role                | Email                    |
| ------------------- | ------------------------ |
| System Admin        | admin@novacore.dev       |
| Engineering Manager | em@novacore.dev          |
| Product Owner       | po@novacore.dev          |
| Scrum Master        | sm@novacore.dev          |
| Software Engineer   | engineer@novacore.dev    |
| QA Engineer         | qa@novacore.dev          |
| Designer            | designer@novacore.dev    |
| Stakeholder         | stakeholder@novacore.dev |

---

## Scripts

| Script              | Description                       |
| ------------------- | --------------------------------- |
| `npm run dev`       | Start the dev server (Turbopack). |
| `npm run build`     | Production build.                 |
| `npm run start`     | Run the production build.         |
| `npm run lint`      | ESLint.                           |
| `npm run typecheck` | TypeScript, no emit.              |
| `npm run test`      | Vitest unit & component tests.    |
| `npm run test:e2e`  | Playwright end-to-end tests.      |
| `npm run db:push`   | Push the Prisma schema to SQLite. |
| `npm run db:seed`   | Seed demo data.                   |
| `npm run db:studio` | Open Prisma Studio.               |
| `npm run db:reset`  | Reset the database (no seed).     |

---

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Setup](docs/SETUP.md)
- [Testing](docs/TESTING.md)
- [Security](docs/SECURITY.md)
- [Roadmap](docs/ROADMAP.md)
- [Final implementation report](docs/FINAL_IMPLEMENTATION_REPORT.md)

## License

[MIT](LICENSE)
