# OPS-006: Production container for AgileForge (Next 16 + Prisma 7 +
# better-sqlite3). Multi-stage to keep the runtime image small and free of
# build-only toolchains. Pin a specific Node 22 LTS digest in your registry
# before shipping; the bare `node:22-bookworm-slim` tag here is a starting
# point — replace with `node:22-bookworm-slim@sha256:...` in your CI.
#
# The image runs as a non-root user (`node`, uid 1000) which is already
# present in the base image.

# ---- Stage 1: deps -----------------------------------------------------------
# Install dependencies in isolation so the layer can be cached on subsequent
# builds when only application code changes.
FROM node:22-bookworm-slim AS deps
WORKDIR /app

# Build tools required by better-sqlite3's native compile step. Removed from
# the final image since this stage is discarded.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates openssl \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
# `npm ci` rebuilds better-sqlite3 against the container's libstdc++.
RUN npm ci --no-audit --no-fund

# ---- Stage 2: build ----------------------------------------------------------
FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Re-install deps + native tools so `prisma generate` + `next build` succeed.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates openssl \
 && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client (custom output path `src/generated/prisma/client`).
RUN npx prisma generate
RUN npm run build

# Strip dev dependencies for the runtime image. Native modules remain rebuilt.
RUN npm prune --omit=dev

# ---- Stage 3: runtime --------------------------------------------------------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

# OpenSSL only — required by Prisma's runtime. No compiler toolchain.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates openssl \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Copy only what the runtime needs. Source files (e.g. tests, e2e/, docs/)
# are excluded via .dockerignore.
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/src/generated ./src/generated
COPY --chown=node:node docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Writable directory for SQLite (dev). Production should mount a volume here
# or switch DATABASE_URL to Postgres — see DEPLOY.md.
RUN mkdir -p /app/data && chown -R node:node /app/data

USER node
EXPOSE 3000

# OPS-001/002: container orchestrator probes `/api/health` (liveness) and
# `/api/ready` (readiness, DB-probe). Both bypass auth.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# `migrate deploy` applies committed migrations before `next start` boots.
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "node_modules/next/dist/bin/next", "start"]
