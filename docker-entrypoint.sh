#!/bin/sh
# OPS: container entrypoint. Applies committed Prisma migrations against the
# configured DATABASE_URL before starting the server. `migrate deploy` only
# runs already-generated migrations (never `migrate dev`), so it is safe and
# non-interactive for production.
set -e

echo "[entrypoint] Applying database migrations (prisma migrate deploy)…"
npx prisma migrate deploy

echo "[entrypoint] Starting server…"
exec "$@"
