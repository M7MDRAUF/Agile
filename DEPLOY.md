# Deployment & Operations Runbook (OPS-007)

This document is the operator-facing guide for deploying, upgrading, and rolling back AgileForge in production. It is intentionally short and prescriptive — every step is a copy-pasteable command. For architectural detail see `docs/ARCHITECTURE.md`; for security see `docs/SECURITY.md`.

> **Status:** AgileForge is **not yet production-ready** (see `docs/production-readiness/11_REMEDIATION_ROADMAP.md`). This runbook is the target operations contract once the remaining bugs are closed.

---

## 1. Prerequisites

| Item            | Requirement                                                           |
| --------------- | --------------------------------------------------------------------- |
| Node            | 22 LTS (matches `Dockerfile` base)                                    |
| Database        | PostgreSQL 16+ in production (SQLite for local/dev only)              |
| TLS             | Terminate at the load balancer; container speaks plaintext on `:3000` |
| Reverse proxy   | Must forward `X-Forwarded-Proto`, `X-Forwarded-For`, `Origin`, `Host` |
| Secrets manager | `AUTH_SECRET` ≥ 32 bytes (any decent secrets store works)             |

---

## 2. Required Environment Variables

| Variable              | Required | Purpose                                                                                                                                                                       | Validated at startup              |
| --------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `AUTH_SECRET`         | yes      | HS256 JWT signing key. Must be ≥ 32 chars.                                                                                                                                    | yes — `src/lib/env.ts`            |
| `DATABASE_URL`        | yes      | Prisma connection string. SQLite: `file:./prisma/dev.db`. Postgres: `postgresql://user:pass@host:5432/db?schema=public`                                                       | yes                               |
| `NODE_ENV`            | yes      | `production`                                                                                                                                                                  | implicit                          |
| `PORT`                | no       | Defaults to `3000`                                                                                                                                                            | —                                 |
| `HOSTNAME`            | no       | Defaults to `0.0.0.0`                                                                                                                                                         | —                                 |
| `SESSION_TTL_SECONDS` | no       | Defaults to 8 h                                                                                                                                                               | —                                 |
| `ALLOW_DEMO_RESET`    | no       | Opt-in escape hatch for the destructive "Reset demo data" admin action. **Blocked in production unless set to `true`** (BUG-M27). Leave unset on any database you care about. | yes — `src/lib/actions/danger.ts` |

Startup will **fail fast** with a descriptive error if any required variable is missing or malformed.

---

## 3. Build & Push the Container

```bash
docker build -t ghcr.io/<org>/agileforge:$(git rev-parse --short HEAD) .
docker push   ghcr.io/<org>/agileforge:$(git rev-parse --short HEAD)
```

The image is multi-stage (deps → build → runtime), runs as non-root `node`, and ships only the artefacts required at runtime. Approximate size: ~250 MB compressed.

---

## 4. First-time Deploy

> The container **entrypoint runs `npx prisma migrate deploy` automatically** before
> `next start` (see `docker-entrypoint.sh`), so migrations are applied on every boot.
> The explicit `migrate deploy` step below is still recommended for first-time setup
> and zero-downtime upgrades so the schema lands **before** new pods receive traffic.

```bash
# 1. Provision the database
psql "$ADMIN_DATABASE_URL" -c "CREATE DATABASE agileforge;"

# 2. Run the schema migration once
docker run --rm \
  -e DATABASE_URL="$DATABASE_URL" \
  ghcr.io/<org>/agileforge:<tag> \
  npx prisma migrate deploy

# 3. (Optional) Seed canonical demo data
docker run --rm \
  -e DATABASE_URL="$DATABASE_URL" \
  ghcr.io/<org>/agileforge:<tag> \
  npx prisma db seed

# 4. Start the app
docker run -d --name agileforge \
  -p 3000:3000 \
  -e AUTH_SECRET="$AUTH_SECRET" \
  -e DATABASE_URL="$DATABASE_URL" \
  -e NODE_ENV=production \
  --restart unless-stopped \
  ghcr.io/<org>/agileforge:<tag>
```

---

## 5. Zero-Downtime Upgrade

AgileForge is a stateless Next.js app — all state lives in the database. Standard blue/green or rolling deploy works:

```bash
# 1. Pull the new image on every node
docker pull ghcr.io/<org>/agileforge:<new-tag>

# 2. Run migrations BEFORE rolling out new pods
docker run --rm \
  -e DATABASE_URL="$DATABASE_URL" \
  ghcr.io/<org>/agileforge:<new-tag> \
  npx prisma migrate deploy

# 3. Roll the deployment (Kubernetes example)
kubectl set image deployment/agileforge app=ghcr.io/<org>/agileforge:<new-tag>
kubectl rollout status deployment/agileforge --timeout=5m
```

**Migration rules** (REL-006):

- New migrations must be **backward-compatible** with the previous version of the application (additive columns, nullable defaults, no destructive renames in a single deploy).
- Destructive changes are two-step: deploy N (adds new column, dual-writes) → backfill → deploy N+1 (removes old column).
- `npx prisma migrate deploy` is idempotent — safe to re-run.

---

## 6. Rollback

```bash
# 1. Re-deploy the previous image tag (the app is stateless)
kubectl set image deployment/agileforge app=ghcr.io/<org>/agileforge:<previous-tag>
kubectl rollout status deployment/agileforge

# 2. If a destructive migration shipped between versions, restore the DB
#    from the latest snapshot — see scripts/backup.sh for the restore drill.
```

A rollback **without** a schema rollback is only safe if Step 5's migration rules were followed. If they were not, restore the DB from backup.

---

## 7. Health & Readiness

| Endpoint          | Auth | Purpose                                  | Notes                                             |
| ----------------- | ---- | ---------------------------------------- | ------------------------------------------------- |
| `GET /api/health` | no   | Liveness — process is up                 | `Cache-Control: no-store`. Never hits the DB.     |
| `GET /api/ready`  | no   | Readiness — DB is reachable (`SELECT 1`) | Returns 503 when the DB is down so the LB drains. |

Wire `/api/health` to the orchestrator's liveness probe (kill on failure) and `/api/ready` to readiness (stop sending traffic on failure).

---

## 8. Graceful Shutdown

The Node process traps `SIGTERM` and `SIGINT`, calls `prisma.$disconnect()` once (idempotent — guarded by a global flag), then re-raises the signal so the process exits naturally. Kubernetes' default 30 s `terminationGracePeriodSeconds` is more than enough. See `src/lib/db.ts` (REL-007).

---

## 9. Observability

| Concern         | Where                                                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Structured logs | `src/lib/logger.ts` emits one JSON line per event with `level`, `msg`, `ts`, and arbitrary structured fields. Pipe stdout to your log aggregator. |
| Error pages     | `src/app/(app)/error.tsx`, `loading.tsx`, `not-found.tsx`, plus `src/app/global-error.tsx`.                                                       |
| Audit log       | `AuditLog` Prisma model — written by every privileged mutation. Surface in your SIEM.                                                             |
| Sessions        | `UserSession` model. Force-invalidation works via the `sv` JWT claim (SEC-013).                                                                   |

> **Server error correlation (BUG-L02):** server-side failures are logged via
> `logErrorWithId()` (`src/lib/logger.ts`), which emits the full error under a
> generated `correlationId` and returns only that opaque reference to the
> client — raw error messages/stacks never reach the browser. React error
> boundaries surface Next.js's `error.digest` as the user-facing reference.
> `src/lib/actions/**` no longer uses `console.*`; the only `console.error`
> callsites left are the two client error boundaries (the correct primitive
> there) and the logger's own sink.---

## 10. Backups & Restore Drill

See `scripts/backup.sh` (OPS-010). The expected cadence is:

- **Daily** full `pg_dump` to encrypted object storage with 30-day retention.
- **Weekly** restore drill into a throwaway database; verify row counts for `User`, `WorkItem`, `AuditLog`.
- **Quarterly** end-to-end restore-and-bring-up exercise into a staging environment.

A backup that has never been restored is not a backup.

---

## 11. Capacity & Limits

| Limit                 | Where                                   | Default                               |
| --------------------- | --------------------------------------- | ------------------------------------- |
| Workspace export rows | `src/app/api/export/workspace/route.ts` | 50 000 (override `?limit=N`)          |
| Login rate limit      | `src/lib/auth/rate-limit.ts`            | 5 attempts / 15 min / identity        |
| JWT TTL               | `src/lib/auth/session.ts`               | 8 h                                   |
| Session invalidation  | `User.sessionVersion` increment         | immediate on role change/deactivation |

---

## 12. Pre-Production Gate Checklist

Do **not** declare a deploy production-ready until every box is checked:

- [ ] `npm run lint` — 0 errors / 0 warnings
- [ ] `npm run typecheck` — 0 diagnostics
- [ ] `npm run test -- --run` — 100 % pass
- [ ] `npm run test -- --run --coverage` — meets configured thresholds (requires `@vitest/coverage-v8`)
- [ ] `npm run build` — succeeds, no warnings about Edge runtime, dynamic APIs, or deprecated middleware
- [ ] `npm run test:e2e` — green against a freshly seeded DB
- [ ] Browser validation matrix (`docs/production-readiness/13_BROWSER_VALIDATION_PLAN_OR_RESULTS.md`) — every cell `Passed`
- [ ] Open issues in `docs/production-readiness/10_BUG_REGISTER.md` reconciled to closed or accepted-risk
- [ ] Restore drill against last night's backup completed within the last 7 days
- [ ] Secrets rotated, `AUTH_SECRET` ≥ 32 bytes, no plaintext secrets in env files committed to git

---

## 13. Incident Response Quick Reference

| Symptom                                     | First action                                                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `/api/ready` returns 503                    | Check DB connectivity from the pod. `prisma.$queryRaw\`SELECT 1\`` is the probe.                                   |
| 5xx spike with no recent deploy             | Look for slow queries / missing indexes; check `PERF-001` index list in `02_PERFORMANCE_AND_SCALABILITY_AUDIT.md`. |
| Auth users report "logged out unexpectedly" | Check `User.sessionVersion` audit log entries — was a role change pushed?                                          |
| Export request OOMs                         | Confirm `?limit=` is honoured; cap is 50 000 rows. If the cap was overridden, revert.                              |
| Suspected secret leak                       | Rotate `AUTH_SECRET`. Every active session becomes invalid immediately.                                            |
