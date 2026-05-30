# AgileForge

> A self-hosted Agile project management & software engineering operations platform.

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

## 2026-05-29 Reconciliation Note (post-remediation)

Since this README was originally written, the `implement-production-readiness-fixes` branch has landed
real TOTP MFA via `otplib`, bcrypt cost-12, SEC-013 `sessionVersion` JWT claim,
CSP/HSTS/security headers in `next.config.ts`, `/api/health` + `/api/ready` probes, `/api/*` proxy
coverage, Zod env validation, hot-path DB indexes, transactional multi-writes,
graceful shutdown, retry helper, export hard cap, parallel awaits,
3-stage non-root Dockerfile with HEALTHCHECK, backup script + restore drill, and an RBAC
matrix test. Authoritative current state lives in
[`docs/production-readiness/11_REMEDIATION_ROADMAP.md`](docs/production-readiness/11_REMEDIATION_ROADMAP.md)
and [`docs/production-readiness/14_FINAL_PLAN_MODE_SUMMARY.md`](docs/production-readiness/14_FINAL_PLAN_MODE_SUMMARY.md).

## 2026-05-30 Reconciliation Note (remediation roadmap complete)

All 11 batches of the remediation roadmap are now complete. In addition to the items above, the
codebase now hard-blocks the destructive demo-reset in production (`ALLOW_DEMO_RESET` opt-in), runs
`npm audit` + a doc-vs-code consistency check in CI, applies `prisma migrate deploy` from the
container entrypoint, and logs server errors with a `correlationId` while returning only an opaque
reference to clients. Verified gates this run: **lint 0 · typecheck 0 · 537 unit tests (33 files,
coverage gate enforced) · 35 routes build · Playwright e2e (11 specs) green**. The remaining
`npm audit` findings are 5 moderate dev/build-only transitives with no non-breaking fix (documented
in [`DEPLOY.md`](DEPLOY.md)). The only open gate is the operator-run 19×7 browser validation matrix.
See [`docs/REQUIREMENTS_TRACEABILITY_MATRIX.md`](docs/REQUIREMENTS_TRACEABILITY_MATRIX.md) for the
row-by-row status.
