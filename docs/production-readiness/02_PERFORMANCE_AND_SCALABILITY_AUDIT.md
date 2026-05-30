# 02 — Performance and Scalability Audit

## Auditing Agents
- **system-architect** (primary)
- **database-engineer** (supporting)
- **backend-engineer** (supporting)

---

## 1. Database Query Efficiency

### 1.1 Indexes Assessment

| Status | Finding | Evidence |
|--------|---------|----------|
| ✅ | 21 explicit indexes on hot-path queries | `prisma/schema.prisma` lines 163-170, 203, etc. |
| ✅ | Compound index `[projectId, status]` on WorkItem for board queries | Line 163 |
| ✅ | Compound index `[projectId, createdAt]` for timeline queries | Line 164 |
| ✅ | FK indexes on sprintId, assigneeId, epicId, parentId, dueDate | Lines 165-169 |
| ⚠️ | Missing index on `Project.ownerId` | Line 80 — "my projects" queries will scan |
| ⚠️ | Missing index on `WorkItem.reporterId` | Line 135 — "reported by me" queries will scan |
| ✅ | Index on `[userId, read, createdAt]` for notifications | Line 302 |

**Severity**: Medium — Impacts large-scale deployments only

### 1.2 Query Patterns

| Pattern | Status | Evidence |
|---------|--------|----------|
| Dashboard parallel queries (9+) | ✅ Good | `src/app/(app)/dashboard/page.tsx` uses Promise.all |
| Pagination | ✅ Present | `take`/`skip` pattern in list pages |
| N+1 prevention | ✅ Prisma includes | Relations loaded via `include` not separate queries |
| Unbounded queries | ⚠️ Export endpoint | `src/app/api/export/workspace/route.ts` has 50k cap |
| Streaming | ❌ Missing | Large exports buffered in memory |

### 1.3 SQLite Limitations

| Limitation | Impact | Severity |
|------------|--------|----------|
| Single writer lock | No concurrent writes; queue under load | **Critical** for production |
| No connection pooling | One connection, serialized access | **Critical** for production |
| File-based I/O | Not suitable for distributed/cloud | **Critical** for production |
| No partial indexes | Cannot optimize sparse queries | Low |
| No native enums | Application-layer validation works fine | Low |

---

## 2. Rendering Performance

| Aspect | Status | Evidence |
|--------|--------|----------|
| Server Components (default) | ✅ | All page.tsx are server components |
| Client Components (explicit) | ✅ | 45 files with `'use client'` |
| Streaming/Suspense | ⚠️ Not utilized | No `loading.tsx` per-segment streaming |
| ISR/Static | ✅ | 27 static pages pre-rendered at build |
| Dynamic rendering | ✅ | Auth-dependent pages use `ƒ (Dynamic)` |
| Bundle splitting | ✅ | Next.js automatic code splitting |
| Image optimization | ❌ | No `next/image` usage (avatars are CSS-based) |

---

## 3. Memory Usage

| Risk | Status | Evidence |
|------|--------|----------|
| Prisma client singleton | ✅ | `src/lib/db.ts` — global singleton pattern |
| Rate limit Map growth | ⚠️ | `src/lib/auth/rate-limit.ts` — Map cleaned on TTL but no max size |
| Large JSON serialization | ✅ Low risk | Server components pass minimal props |
| Export buffering | ⚠️ | Workspace export builds full CSV in memory (up to 50k rows) |
| Client state duplication | ✅ Low | `useActionState` pattern minimizes client state |

---

## 4. Scalability Assessment

### 4.1 Horizontal Scaling Readiness

| Requirement | Status | Blocker |
|-------------|--------|---------|
| Stateless app servers | ⚠️ Partial | Rate limit store is in-memory (per-process) |
| Shared session store | ✅ | JWT + DB verification (no server-side session state) |
| Distributed cache | ❌ Not implemented | No Redis/cache layer |
| Database scaling | ❌ SQLite is single-node | Must migrate to PostgreSQL |
| Load balancer ready | ✅ | Stateless request handling |
| File storage | ⚠️ | SQLite file local to container |

### 4.2 Vertical Scaling Readiness

| Requirement | Status | Notes |
|-------------|--------|-------|
| CPU-bound operations | ✅ Low | bcrypt is most expensive (12 rounds) |
| Memory-bound | ✅ Low | Small dataset, bounded queries |
| I/O-bound | ⚠️ | SQLite single-writer can bottleneck |
| Connection management | N/A | SQLite doesn't use connection pool |

### 4.3 Caching Strategy (Recommended)

| Data | Cache Type | TTL | Invalidation | Priority |
|------|-----------|-----|--------------|----------|
| Permission matrix | In-memory (static) | Infinite | App restart | Low (already fast) |
| User sessions | Redis | 8h (matches JWT) | On revoke | High |
| Project lists | Redis | 60s | `revalidatePath` | Medium |
| Dashboard metrics | Redis | 30s | On mutation | Medium |
| Rate limit counters | Redis | 15min | TTL | **Critical** |

---

## 5. Connection Pooling

| Aspect | Current State | Production Need |
|--------|--------------|-----------------|
| Database connections | SQLite: single in-process connection | PostgreSQL: PgBouncer or Prisma Accelerate |
| Connection reuse | Prisma singleton (good) | Continue pattern with pool config |
| Pool exhaustion | N/A for SQLite | Configure `connection_limit` in Prisma |
| Idle timeout | N/A | Set `pool_timeout` in production |

---

## 6. Load Balancing Readiness

| Aspect | Status | Notes |
|--------|--------|-------|
| Session affinity needed | No | JWT is self-contained |
| WebSocket dependencies | No | No real-time features |
| Health check endpoint | ✅ | `/api/health` (liveness), `/api/ready` (readiness) |
| Graceful shutdown | ⚠️ Not verified | No explicit shutdown handler found |

---

## 7. Performance Findings Summary

| ID | Finding | Severity | Category |
|----|---------|----------|----------|
| PERF-01 | SQLite single-writer lock blocks concurrent writes | **Critical** | Database |
| PERF-02 | No connection pooling (SQLite limitation) | **Critical** | Database |
| PERF-03 | In-memory rate limiter not scalable | **Critical** | Scalability |
| PERF-04 | Export endpoint buffers full CSV in memory | Medium | Memory |
| PERF-05 | Missing indexes on Project.ownerId, WorkItem.reporterId | Medium | Database |
| PERF-06 | No caching layer (Redis/Memcached) | Medium | Scalability |
| PERF-07 | No streaming for large exports | Medium | I/O |
| PERF-08 | No Suspense boundaries for per-segment loading | Low | Rendering |
| PERF-09 | Dashboard runs 9+ queries per request | Low | Database (parallel, so OK) |

---

## 8. Recommendations

### Immediate (Pre-Production)
1. **Migrate to PostgreSQL** — Replace SQLite with PostgreSQL for concurrent writes, connection pooling
2. **Add Redis** — For rate limiting, session caching, and revalidation coordination
3. **Add missing indexes** — `Project.ownerId`, `WorkItem.reporterId`

### Short-Term (Post-Launch)
4. **Stream exports** — Replace buffer-and-send with streaming CSV response
5. **Add Suspense boundaries** — Per-section loading for dashboard and detail pages
6. **Configure connection pool** — `connection_limit`, `pool_timeout` in Prisma URL

### Long-Term
7. **CDN for static assets** — Offload public/ and .next/static to CDN
8. **Read replicas** — For report/analytics queries when scale demands it
9. **Background jobs** — Move heavy operations (export, notifications) to queue

---

## 9. Performance Score

**Overall: 65/100**

| Category | Score | Blocker? |
|----------|-------|----------|
| Query Efficiency | 80/100 | No |
| Indexing | 85/100 | No |
| Memory Management | 75/100 | No |
| Database Scalability | 30/100 | **Yes** (SQLite) |
| Horizontal Scalability | 40/100 | **Yes** (rate limit) |
| Rendering Performance | 85/100 | No |
| Caching | 20/100 | No (enhancement) |
| Connection Management | N/A | Blocked by SQLite |
