#!/usr/bin/env bash
# OPS-010: AgileForge database backup script.
#
# Supports both backends used by this repo:
#   - SQLite (dev/local):    DATABASE_URL=file:./prisma/dev.db
#   - PostgreSQL (prod):     DATABASE_URL=postgresql://user:pass@host:5432/db
#
# Strict mode: fail on any error, undefined variable, or failed pipe segment.
set -Eeuo pipefail

# ----------------------------------------------------------------------------
# Config — override via env, otherwise sensible defaults.
# ----------------------------------------------------------------------------
: "${DATABASE_URL:?DATABASE_URL must be set}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"

mkdir -p "${BACKUP_DIR}"

log() { printf '[backup %s] %s\n' "$(date -u +%H:%M:%S)" "$*" >&2; }

# ----------------------------------------------------------------------------
# Dispatch on the database backend.
# ----------------------------------------------------------------------------
if [[ "${DATABASE_URL}" == file:* ]]; then
  # SQLite path: rip out the file:// prefix, then snapshot atomically via
  # the .backup command (live-safe — uses the SQLite online backup API).
  SQLITE_PATH="${DATABASE_URL#file:}"
  OUT="${BACKUP_DIR}/agileforge-sqlite-${TS}.db"
  log "SQLite snapshot: ${SQLITE_PATH} -> ${OUT}"
  sqlite3 "${SQLITE_PATH}" ".backup '${OUT}'"
  gzip -9 "${OUT}"
  log "wrote ${OUT}.gz ($(du -h "${OUT}.gz" | cut -f1))"

elif [[ "${DATABASE_URL}" == postgres* || "${DATABASE_URL}" == postgresql* ]]; then
  # Postgres path: pg_dump in custom format (-Fc) so pg_restore can do partial
  # restores. Compression is built in.
  OUT="${BACKUP_DIR}/agileforge-pg-${TS}.dump"
  log "Postgres dump -> ${OUT}"
  pg_dump --format=custom --no-owner --no-privileges \
    --dbname="${DATABASE_URL}" \
    --file="${OUT}"
  log "wrote ${OUT} ($(du -h "${OUT}" | cut -f1))"

else
  log "ERROR: unsupported DATABASE_URL scheme: ${DATABASE_URL%%:*}"
  exit 2
fi

# ----------------------------------------------------------------------------
# Retention — delete backups older than RETENTION_DAYS.
# Operates on BACKUP_DIR only, so it cannot wander outside.
# ----------------------------------------------------------------------------
log "pruning backups older than ${RETENTION_DAYS} days under ${BACKUP_DIR}"
find "${BACKUP_DIR}" -maxdepth 1 -type f \
  \( -name 'agileforge-sqlite-*.db.gz' -o -name 'agileforge-pg-*.dump' \) \
  -mtime "+${RETENTION_DAYS}" -print -delete

log "done"
