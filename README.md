# AgileForge

> A self-hosted, production-grade Agile project management and software engineering operations platform.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)
![License](https://img.shields.io/badge/license-MIT-green)

AgileForge is a full-stack web application that helps software engineering organizations plan, execute, track, and improve Agile delivery across teams. It gives every member of the organization — from System Admin to Stakeholder — clarity about what is being built, by whom, and when.

Think of it as a self-hosted alternative to Jira / Linear / Azure DevOps — built as a single cohesive platform with:
- **Project & sprint management** with burndown charts and roadmaps
- **Work-item tracking** — epics, stories, tasks, bugs, subtasks, blockers
- **Scrum & Kanban boards** with inline drag-and-drop status changes
- **QA management** — test cases, test runs, automatic bug creation on failures
- **Dashboards & reports** — velocity, workload, bug-severity, blocker-aging charts
- **RBAC** — 8 roles, 40+ capability-based permissions, middleware route protection
- **Admin console** — user management, role assignment, audit log
- **Notifications, global search, dark mode, API tokens, MFA**

Built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, **Prisma 7 + SQLite**, **Tailwind CSS v4**, JWT auth (jose), and **Recharts**.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Demo Accounts](#demo-accounts)
- [Roles & Permissions](#roles--permissions)
- [Production Deployment](#production-deployment)
- [Testing](#testing)
- [Scripts](#scripts)
- [Documentation](#documentation)
- [License](#license)

---

## Features

### Core Modules

| Module | What it does |
|---|---|
| **Dashboard** | Team workload widget, sprint health, recent activity, open blockers |
| **Projects** | Create projects, view health status, epics timeline, per-project reports |
| **Work Items** | Epics · stories · tasks · bugs · subtasks — with assignees, story points, acceptance criteria, comments, activity log, and blockers |
| **Sprints** | Plan sprints, assign items, view burndown charts, complete sprints |
| **Boards** | Scrum board (by sprint) and Kanban board (by project) — drag/drop status changes |
| **Backlog** | Priority-sorted, project-filterable list of unscheduled work items |
| **My Work** | Personal cockpit: current sprint tasks, overdue, blocked, recently updated |
| **QA** | Test cases, test runs, pass/fail per case, automatic bug creation on failure |
| **Reports** | Velocity chart, team workload, bug severity distribution, blocker aging |
| **Notifications** | In-app notifications for assignments, mentions, sprint events |
| **Search** | Global full-text search across work items and projects |
| **Teams & Users** | Team management, member roster, per-user profile and preferences |
| **Settings** | Profile, password change, notification preferences, dark/light mode, API tokens, MFA |
| **Admin** | User creation, role assignment, activation toggle, full audit log |

### Security & Production-Readiness

- **MFA** — TOTP-based (compatible with Google Authenticator, Authy)
- **Session security** — httpOnly JWT cookies, session version invalidation on password change, configurable TTL
- **bcrypt** — cost factor 12 on all password hashes
- **Security headers** — CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- **Rate limiting** — on login and MFA endpoints
- **API tokens** — SHA-256 hashed; plaintext shown once on creation only
- **RBAC** — enforced server-side on every Server Action; UI gating is cosmetic only
- **Audit log** — all sensitive mutations recorded with actor, timestamp and diff
- **Health probes** — `/api/health` (liveness) and `/api/ready` (readiness)
- **Structured logging** — JSON logs with correlation IDs; errors return opaque references to clients
- **Environment validation** — startup fails fast with a descriptive error on missing/malformed config

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2 (App Router, Server Components, Server Actions) |
| UI runtime | React 19.2 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 (`@theme inline` tokens, light + dark mode) |
| ORM / DB | Prisma 7 + SQLite (`better-sqlite3` adapter) |
| Auth | `jose` (HS256 JWT) + `bcryptjs` + `otplib` (TOTP MFA) |
| Validation | `zod` (env, forms, server actions) |
| Charts | Recharts |
| Icons | lucide-react |
| Unit tests | Vitest + Testing Library + jsdom |
| E2E tests | Playwright |
| Container | Docker (multi-stage, non-root, HEALTHCHECK) |

---

## Architecture

AgileForge is a **modular monolith** — one Next.js application where:

- **Pages** are React Server Components that query Prisma directly on the server
- **Mutations** go through Server Actions (`"use server"`) — there is no REST API
- **Route protection** is layered: `src/middleware.ts` (unauthenticated → `/login`) + per-action `requirePermission()` guards (unauthorized → 403)
- **Client Components** are isolated to interactive islands (boards, forms, charts)

```
src/
├── app/
│   ├── login/               # public sign-in page
│   ├── (app)/               # authenticated route group
│   │   ├── dashboard/       my-work/    projects/   work-items/
│   │   ├── backlog/         sprints/    boards/     qa/
│   │   ├── reports/         teams/      users/      notifications/
│   │   └── settings/        admin/      search/
│   └── api/
│       ├── health/          # liveness probe
│       ├── ready/           # readiness probe
│       └── export/          # workspace data export
├── components/
│   ├── ui/                  # primitives (button, card, input, select, table…)
│   ├── layout/              # Sidebar, Topbar, MobileNav
│   └── work-item/ board/ admin/ qa/ settings/ …
└── lib/
    ├── auth/                # session, password, guards, rate-limit, MFA
    ├── actions/             # all server actions
    ├── domain/              # pure logic: RBAC permissions, metrics, constants
    └── db.ts  logger.ts  utils.ts  env.ts
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full architecture overview.

---

## Quick Start

**Requirements:** Node.js 20+ (tested on Node 24) and npm.

```bash
# 1. Install dependencies (also runs `prisma generate`)
npm install

# 2. Create the SQLite schema
npm run db:push

# 3. Load realistic demo data (24 users, 6 teams, 54 stories, sprints, QA runs…)
npm run db:seed

# 4. Start the dev server
npm run dev
# → http://localhost:3000
```

For full setup instructions, environment variables, and troubleshooting see [docs/SETUP.md](docs/SETUP.md).

---

## Demo Accounts

All demo accounts use the password **`Password123!`**.

| Role | Email |
|---|---|
| System Admin | admin@novacore.dev |
| Engineering Manager | em@novacore.dev |
| Product Owner | po@novacore.dev |
| Scrum Master | sm@novacore.dev |
| Software Engineer | engineer@novacore.dev |
| QA Engineer | qa@novacore.dev |
| Designer | designer@novacore.dev |
| Stakeholder | stakeholder@novacore.dev |

---

## Roles & Permissions

AgileForge uses capability-based RBAC with 8 roles and 40+ named permissions.

| Role | Typical capabilities |
|---|---|
| **System Admin** | Full access: user management, workspace settings, audit log, danger actions |
| **Engineering Manager** | Manage projects, sprints, teams; view all reports |
| **Product Owner** | Create/manage work items, prioritize backlog, view project reports |
| **Scrum Master** | Manage sprints, facilitate boards, view team metrics |
| **Software Engineer** | Create/update own work items, log comments and time |
| **QA Engineer** | Create test cases, execute test runs, file bugs |
| **Designer** | View all items; create design-related work items |
| **Stakeholder** | Read-only access to projects and reports |

All permissions are enforced server-side on every Server Action. See [docs/SECURITY.md](docs/SECURITY.md) for the full permissions matrix.

---

## Production Deployment

### Docker (recommended)

```bash
# Build
docker build -t agileforge:latest .

# Run
docker run -d \
  -e AUTH_SECRET="<32+ char secret>" \
  -e DATABASE_URL="file:/data/agileforge.db" \
  -e NODE_ENV=production \
  -p 3000:3000 \
  -v agileforge-data:/data \
  agileforge:latest
```

The container entrypoint automatically runs `prisma migrate deploy` before starting the server. The image runs as a non-root `node` user.

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `AUTH_SECRET` | **yes** | JWT signing key — minimum 32 characters |
| `DATABASE_URL` | **yes** | SQLite: `file:./prisma/dev.db` · Postgres: `postgresql://…` |
| `NODE_ENV` | **yes** | Set to `production` |
| `SESSION_TTL_SECONDS` | no | Session lifetime (default: 8 hours) |
| `ALLOW_DEMO_RESET` | no | Set `true` to enable the destructive "Reset demo data" admin action (blocked in production by default) |

Startup fails fast with a descriptive error if required variables are missing.

See [DEPLOY.md](DEPLOY.md) for the full operations runbook including rollback, backup, and restore procedures.

---

## Testing

```bash
# Unit tests (Vitest)
npm test

# Unit tests with coverage report
npm run test:coverage

# End-to-end tests (Playwright — requires a running server on port 3100)
npm run test:e2e
```

### What's covered

- **537 unit tests** across 33 test files — server actions, auth helpers, RBAC matrix (440 assertions), seed determinism, export route, domain logic
- **27 Playwright E2E tests** — auth flows, navigation, board persistence, RBAC by role, accessibility smoke (`axe-core`), workflow coverage
- **Coverage gate** enforced via `@vitest/coverage-v8`

See [docs/TESTING.md](docs/TESTING.md) for full testing strategy and conventions.

---

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Vitest unit & component tests |
| `npm run test:coverage` | Vitest with coverage report |
| `npm run test:e2e` | Playwright end-to-end tests |
| `npm run db:push` | Push the Prisma schema to SQLite (dev) |
| `npm run db:migrate` | Run Prisma migrations (dev) |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:reset` | Reset the database (no seed) |
| `npm run format` | Prettier — format all files |
| `npm run format:check` | Prettier — check formatting |

---

## Documentation

| Document | Description |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture, stack, request model, module map |
| [docs/SETUP.md](docs/SETUP.md) | Full setup guide, environment variables, troubleshooting |
| [docs/SECURITY.md](docs/SECURITY.md) | Security model, RBAC permissions matrix, threat mitigations |
| [docs/TESTING.md](docs/TESTING.md) | Testing strategy, conventions, coverage targets |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Feature roadmap and backlog |
| [docs/REQUIREMENTS_TRACEABILITY_MATRIX.md](docs/REQUIREMENTS_TRACEABILITY_MATRIX.md) | Requirements vs. implementation mapping |
| [docs/FINAL_IMPLEMENTATION_REPORT.md](docs/FINAL_IMPLEMENTATION_REPORT.md) | Full implementation status report |
| [DEPLOY.md](DEPLOY.md) | Operations runbook — deploy, upgrade, rollback, backup |

---

## License

[MIT](LICENSE)
