# Setup

## Prerequisites

- **Node.js 20+** (developed and validated on Node 24).
- **npm** (ships with Node).
- No external database server is required — the app uses SQLite via a local
  `dev.db` file.

## Install

```bash
npm install
```

`npm install` runs a `postinstall` hook that executes `prisma generate`, creating
the typed Prisma client under `src/generated/prisma`.

## Environment

Create a `.env` file in the project root:

```dotenv
# SQLite database location
DATABASE_URL="file:./dev.db"

# Secret used to sign session JWTs (use a long random string in production)
AUTH_SECRET="change-me-to-a-long-random-secret"
```

If `AUTH_SECRET` is not set, a development fallback is used — always set an
explicit secret outside of local development.

## Database

```bash
npm run db:push     # create the schema in dev.db
npm run db:seed     # load realistic demo data (users, projects, sprints, items…)
```

Useful extras:

```bash
npm run db:studio   # browse data in Prisma Studio
npm run db:reset    # drop & recreate the schema (no seed)
```

## Run

```bash
npm run dev         # development (Turbopack) → http://localhost:3000
```

Production:

```bash
npm run build
npm run start       # serves the optimized build
```

## Sign in

Use any [demo account](../README.md#demo-accounts); all use the password
`Password123!`. Start with `admin@novacore.dev` to see every feature.

## Troubleshooting

- **`PrismaClient` import errors** — ensure `prisma generate` has run (it runs on
  install; otherwise `npx prisma generate`).
- **Empty pages / no data** — run `npm run db:seed`.
- **Auth redirect loop** — confirm `AUTH_SECRET` is set and cookies are enabled.
- **Port already in use** — start on another port: `npm run dev -- --port 3001`.

## 2026-05-29 Reconciliation Note (post-remediation)

Setup has gained a few moving parts since this doc was written
(branch `implement-production-readiness-fixes`):

- Environment variables are now validated via Zod at boot — missing or malformed values fail fast
  instead of producing runtime surprises. Consult the schema in `src/lib/env.ts` for the
  authoritative list.
- New operational endpoints: `/api/health` (liveness) and `/api/ready` (DB-reachable readiness).
- Container path: a 3-stage Dockerfile with a non-root runtime user and HEALTHCHECK directive is
  available; deployment guidance lives in `docs/DEPLOY.md`. A backup script and restore drill ship
  under `scripts/` (OPS-010).
- MFA enrolment now uses real TOTP (`otplib`); demo accounts can scan the QR with any authenticator.

Authoritative current state:
[`production-readiness/REMEDIATION_PROGRESS_2026-05-29.md`](production-readiness/REMEDIATION_PROGRESS_2026-05-29.md)
and [`production-readiness/POST_REMEDIATION_FINAL_VERDICT_2026-05-29.md`](production-readiness/POST_REMEDIATION_FINAL_VERDICT_2026-05-29.md).
**Verdict: CONDITIONAL APPROVAL.** Open gaps: 19×7 browser matrix walk and A11Y batch 8
(WCAG 2.1 AA, A11Y-001..006) remain outstanding before unconditional production sign-off.
