# 08 — Deployability & Operability Audit

## Summary

The project has **no CI**, **no observability**, **no health endpoints**, **no metrics**, and **no documented deployment target**. SQLite is the only configured database. Operationally, the project is at a **proof-of-concept** maturity level.

## Findings

### OPS-001 [Critical] — No CI / CD pipeline of any kind
- Searched `.github/workflows/`, `azure-pipelines.yml`, `.gitlab-ci.yml`, `circle.yml`, `Jenkinsfile` — none exist.
- **Impact:** Every commit lands unverified. The currently-failing tests (QA-001) would have been caught by even a trivial `npm test` gate.
- **Fix:** GitHub Actions workflow with steps: `npm ci` → `lint` → `typecheck` → `test --run` → `build`. Block merges on failure. Add a separate `e2e` workflow that boots the dev server, seeds, runs Playwright.

### OPS-002 [High] — No `/api/health` or `/api/ready` (cross-ref REL-006)
- No platform-agnostic liveness probe. PaaS platforms (Vercel, Fly, Render) and orchestrators (Kubernetes) require these.
- **Fix:** add a route returning DB ping result.

### OPS-003 [High] — No structured logging / no observability provider
- `src/lib/db.ts:14-17` configures Prisma's built-in logger. App-level logs are `console.error` only (grep across `src/lib/actions/*` confirms ad-hoc usage). No correlation/trace IDs, no log aggregation integration (no Pino/Winston/Datadog/OpenTelemetry).
- **Fix:** add Pino with request-scoped child loggers; ship to a sink in prod via the platform's stdout pipeline; add OpenTelemetry instrumentation for traces.

### OPS-004 [High] — Database is SQLite (file-based)
- `prisma/schema.prisma:11-13`. Cannot survive multi-instance horizontal scale; no point-in-time recovery; backups = file copies of `dev.db`.
- **Fix:** Postgres before launch. Documented in PERF-004.

### OPS-005 [High] — `middleware` → `proxy` deprecation warning on build
- `npm run build` emits a deprecation warning about `middleware` (Next 16 renamed it to `proxy`). Tracking link: see Next 16 docs under `node_modules/next/dist/docs/`. The current `src/middleware.ts` will continue working but is on a deprecation timer.
- **Fix:** rename to `src/proxy.ts` per Next 16 conventions; verify matcher syntax compatibility.

### OPS-006 [Medium] — No documented deployment target
- `docs/SETUP.md` describes local dev only. No Vercel/Docker/Fly config files. No `Dockerfile`. No `vercel.json`.
- **Fix:** add `Dockerfile` (multi-stage: deps → build → run) and a deployment runbook in `docs/DEPLOY.md`.

### OPS-007 [Medium] — No migration runbook
- `npm run db:migrate` exists but there is no doc explaining when to run, how to roll back, or what blue/green looks like.
- **Fix:** document Prisma migration flow; commit a sample `prisma migrate deploy` step into the deploy script.

### OPS-008 [Medium] — No env var validation at startup
- Only `AUTH_SECRET` is read at module load (fail-fast). `DATABASE_URL`, `SEED_PASSWORD`, etc. are read on use. A typo'd var name produces a confusing runtime error.
- **Fix:** add an `src/env.ts` that uses `zod` to parse `process.env` once at startup; throws with clear messages if any required var is missing or malformed.

### OPS-009 [Medium] — Build artifacts size unknown
- `npm run build` succeeds; bundle analyzer is not configured (cross-ref PERF-008).
- **Fix:** `@next/bundle-analyzer` + budget thresholds.

### OPS-010 [Medium] — No backup strategy
- See REL "disaster recovery" section — RPO/RTO undefined.

### OPS-011 [Low] — Node version not pinned
- `package.json` `engines` field absent. `Dockerfile` (when added) should pin to Node 22 LTS (or whatever Next 16.2 supports).

## Deployment readiness checklist

| Item | Status |
|---|---|
| CI pipeline | ❌ |
| Health endpoint | ❌ |
| Structured logging | ❌ |
| Metrics endpoint | ❌ |
| Distributed tracing | ❌ |
| Migration runbook | ❌ |
| Backup + restore drill | ❌ |
| Secrets management policy | ⚠️ docs mention env vars only |
| `Dockerfile` / IaC | ❌ |
| Rollback strategy | ❌ |
| Multi-instance safe | ❌ (PERF-005, OPS-004) |

## Recommendation

OPS-001 must land **before** any other batch of fixes — otherwise fixes regress silently. Then OPS-002 (health), OPS-003 (logging), OPS-005 (Next 16 rename), then OPS-004 + OPS-007 + OPS-010 as the production-DB cutover.
