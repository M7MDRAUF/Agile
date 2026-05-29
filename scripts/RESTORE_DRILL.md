# Restore Drill (OPS-010)

A backup that has never been restored is not a backup. This document is the operator-facing procedure for verifying that `scripts/backup.sh` output can be brought back online, and the cadence at which the verification must happen.

> Cadence: **weekly** spot restore, **quarterly** full bring-up. Record results in your team's incident-runbook tracker.

---

## 1. Prerequisites

| Backend | Required tools |
|---|---|
| SQLite | `sqlite3` 3.40+, `gzip` |
| PostgreSQL | `pg_restore` from libpq 16+, a throwaway target DB (`agileforge_restore_drill`) |

The drill must run against a **throwaway** database — never the production one.

---

## 2. SQLite Restore Drill

```bash
# 1. Identify the latest backup file.
LATEST="$(ls -t backups/agileforge-sqlite-*.db.gz | head -n1)"
echo "Restoring from ${LATEST}"

# 2. Decompress into a throwaway location.
TMP="$(mktemp -t agileforge-drill-XXXXXX.db)"
gunzip -c "${LATEST}" > "${TMP}"

# 3. Sanity-check the schema + row counts.
sqlite3 "${TMP}" <<'SQL'
.headers on
SELECT 'integrity' AS check, integrity_check FROM pragma_integrity_check();
SELECT 'users'      AS table_name, COUNT(*) AS rows FROM User;
SELECT 'workitems'  AS table_name, COUNT(*) AS rows FROM WorkItem;
SELECT 'audit_log'  AS table_name, COUNT(*) AS rows FROM AuditLog;
SELECT 'sessions'   AS table_name, COUNT(*) AS rows FROM UserSession;
SQL

# 4. Spin the app at the restored DB and hit the readiness endpoint.
DATABASE_URL="file:${TMP}" AUTH_SECRET="$(openssl rand -hex 32)" \
  npm run start &
APP_PID=$!
sleep 5
curl -fsS http://127.0.0.1:3000/api/ready
kill "${APP_PID}"

# 5. Clean up.
rm -f "${TMP}"
```

**Pass criteria:** `integrity_check = ok`, every row count > 0 (or equal to the production count for the same point in time), `/api/ready` returns 200 with `{"status":"ready"}`.

---

## 3. PostgreSQL Restore Drill

```bash
# 1. Identify the latest backup file.
LATEST="$(ls -t backups/agileforge-pg-*.dump | head -n1)"

# 2. Create the throwaway DB.
psql "${ADMIN_DATABASE_URL}" -c "DROP DATABASE IF EXISTS agileforge_restore_drill;"
psql "${ADMIN_DATABASE_URL}" -c "CREATE DATABASE agileforge_restore_drill;"

# 3. Restore.
pg_restore \
  --no-owner --no-privileges \
  --dbname="postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:5432/agileforge_restore_drill" \
  "${LATEST}"

# 4. Sanity-check row counts against the production source-of-truth.
psql "postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:5432/agileforge_restore_drill" <<'SQL'
SELECT 'users'     AS table_name, COUNT(*) AS rows FROM "User";
SELECT 'workitems' AS table_name, COUNT(*) AS rows FROM "WorkItem";
SELECT 'audit_log' AS table_name, COUNT(*) AS rows FROM "AuditLog";
SELECT 'sessions'  AS table_name, COUNT(*) AS rows FROM "UserSession";
SQL

# 5. Spin the app at the restored DB and hit /api/ready.
DATABASE_URL="postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:5432/agileforge_restore_drill" \
AUTH_SECRET="$(openssl rand -hex 32)" \
npm run start &
APP_PID=$!
sleep 5
curl -fsS http://127.0.0.1:3000/api/ready
kill "${APP_PID}"

# 6. Drop the throwaway DB.
psql "${ADMIN_DATABASE_URL}" -c "DROP DATABASE agileforge_restore_drill;"
```

**Pass criteria:** restore exits 0, row counts match the production snapshot ± expected churn, `/api/ready` returns 200.

---

## 4. Quarterly Full Bring-Up

Once per quarter, restore the latest backup into a fully isolated staging environment (separate VPC / cluster / namespace), point a synthetic test user at the restored stack, and walk the seven critical workflows from `13_BROWSER_VALIDATION_PLAN_OR_RESULTS.md`:

1. Login + MFA challenge
2. Create work item → assign → status change → resolve
3. Start sprint → complete sprint
4. Export workspace report (CSV + JSON)
5. Admin role change → confirm forced logout on subsequent request (SEC-013)
6. Health + readiness probes return 200
7. Audit log contains the actions taken during the drill

If any step fails, file a P1 incident and stop shipping until backups are demonstrably recoverable.

---

## 5. Failure Modes & Recovery

| Failure | Likely cause | Recovery |
|---|---|---|
| `pg_restore: error: could not execute query: ERROR: role "..." does not exist` | Backup taken with `--owner` set, restored into a DB without that role | Re-run backup with `--no-owner --no-privileges` (already the script default) |
| `sqlite3: integrity_check` reports anything other than `ok` | Source DB was corrupted before snapshot | Use the previous night's snapshot; investigate the prod DB |
| `/api/ready` returns 503 after restore | Prisma client out of sync with restored schema | Run `npx prisma migrate deploy` against the restored DB before serving traffic |
| Backup file is 0 bytes | Disk full at snapshot time, or `pg_dump` was killed | Check the cron host's disk + memory; re-run; investigate retention pruning |
