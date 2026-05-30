# 11 — Remediation Roadmap

## Auditing Agents

- **All agents** (orchestrated)

---

## Batch 1 — Critical Blockers

| ID     | Severity | Description                               | Root Cause                          | Files to Change                                                         | Agent                                | Fix Strategy                                                                 | Required Tests                                        | Risk   | Dependencies                        | Definition of Done                                       |
| ------ | -------- | ----------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------- | ----------------------------------------------------- | ------ | ----------------------------------- | -------------------------------------------------------- |
| REM-01 | Critical | Migrate from SQLite to PostgreSQL         | Dev-only DB used                    | `prisma/schema.prisma`, `src/lib/db.ts`, `package.json`, `.env.example` | database-engineer                    | Change datasource to `postgresql`, add `@prisma/adapter-pg`, update env vars | Integration tests pass with PG, CI uses PG            | High   | None                                | `npm run test` + `npm run build` pass with PG            |
| REM-02 | Critical | Implement distributed rate limiting       | In-memory Map per-process           | `src/lib/auth/rate-limit.ts`, `package.json`                            | backend-engineer + security-reviewer | Add Redis dependency, implement `RedisRateLimitStore` class                  | Unit tests with mock Redis, E2E brute-force test      | Medium | REM-01 (Redis infra)                | Rate limit survives app restart, shared across instances |
| REM-03 | Critical | Add tests for createRisk/updateRiskStatus | Functions shipped untested          | `src/lib/actions/__tests__/projects.test.ts`                            | qa-engineer                          | Add test describe blocks matching existing pattern                           | 10-15 new tests covering RBAC, validation, edge cases | Low    | None                                | All new tests pass, coverage threshold met               |
| REM-04 | Critical | Fix Google Fonts CDN build dependency     | `next/font/google` requires network | `src/app/layout.tsx`                                                    | frontend-engineer                    | Replace with `next/font/local` using bundled font files                      | Build passes in air-gapped environment                | Low    | Font files added to `public/fonts/` | `npm run build` passes offline                           |

**Batch 1 Stop Condition**: All 4 critical bugs resolved. `npm run test`, `npm run build` pass. No regressions.

**Approval Gate**: security-reviewer + database-engineer sign off on REM-01 and REM-02.

---

## Batch 2 — High Security and RBAC Issues

| ID     | Severity | Description                     | Files to Change                  | Agent                                | Fix Strategy                                                             | Required Tests                                       | Definition of Done                                  |
| ------ | -------- | ------------------------------- | -------------------------------- | ------------------------------------ | ------------------------------------------------------------------------ | ---------------------------------------------------- | --------------------------------------------------- |
| REM-05 | High     | Add centralized auth middleware | `src/middleware.ts` (new)        | security-reviewer + backend-engineer | Create Next.js middleware with JWT verification for all protected routes | E2E: direct API access returns 401 without session   | Middleware active, all routes still work            |
| REM-06 | High     | Migrate CSP to nonce-based      | `next.config.ts`, `src/proxy.ts` | security-reviewer                    | Use Next 16 proxy.ts for per-request nonce injection                     | Security scan shows no `unsafe-inline` in production | CSP header uses nonces, no functionality regression |
| REM-07 | High     | Fix SECURITY.md contradictions  | `docs/SECURITY.md`               | final-reviewer                       | Update lines 64, 96, 113 to reflect actual CSP implementation            | `npm run check:docs` passes                          | Doc matches code reality                            |

**Batch 2 Stop Condition**: Middleware deployed, CSP uses nonces, docs accurate.

**Approval Gate**: security-reviewer approves all changes.

---

## Batch 3 — Core Feature Completeness

| ID     | Severity | Description                    | Files to Change                                                                       | Agent                                      | Fix Strategy                                                 | Required Tests                                          | Definition of Done                                   |
| ------ | -------- | ------------------------------ | ------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------- | ---------------------------------------------------- |
| REM-08 | High     | Implement Kanban drag-and-drop | `src/components/board/Board.tsx`, `package.json`                                      | frontend-engineer + accessibility-reviewer | Install `@dnd-kit/core`, implement DnD with keyboard support | E2E: drag card changes status; a11y: keyboard DnD works | Cards draggable, keyboard accessible, persists to DB |
| REM-09 | High     | Add work item link tests       | `src/lib/actions/__tests__/work-items.test.ts`                                        | qa-engineer                                | Add describe blocks for addWorkItemLink, removeWorkItemLink  | 8-10 tests covering RBAC, validation, duplicates        | All tests pass                                       |
| REM-10 | High     | Expand E2E for untested routes | `e2e/qa.spec.ts` (new), `e2e/notifications.spec.ts` (new), `e2e/search.spec.ts` (new) | qa-engineer + browser-tester               | Create E2E specs for QA, notifications, search, reports      | 15-20 new E2E tests                                     | All specs pass in CI                                 |

**Batch 3 Stop Condition**: Kanban DnD works, all action functions tested, E2E covers critical flows.

---

## Batch 4 — Data Integrity and Database Safety

| ID     | Severity | Description                               | Files to Change                             | Agent                                | Fix Strategy                                                             | Required Tests                                   | Definition of Done                     |
| ------ | -------- | ----------------------------------------- | ------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------ | -------------------------------------- |
| REM-11 | High     | Implement optimistic locking              | All server action update functions          | backend-engineer                     | Add `updatedAt` version check before writes; return conflict error       | Unit test: concurrent update returns conflict    | Concurrent edits detected and reported |
| REM-12 | Medium   | Add missing database indexes              | `prisma/schema.prisma`                      | database-engineer                    | Add `@@index([ownerId])` to Project, `@@index([reporterId])` to WorkItem | Query plan analysis shows index usage            | Migration created and deployed         |
| REM-13 | Medium   | Add idempotency keys to create operations | Server action create functions              | backend-engineer                     | Accept optional idempotency key; check before insert                     | Unit test: duplicate key returns existing record | Double-submit produces single record   |
| REM-14 | Medium   | Add request context to audit logs         | `prisma/schema.prisma`, audit logging calls | database-engineer + backend-engineer | Add requestId, ipAddress, userAgent columns to AuditLog                  | Query audit logs by IP/request                   | Migration applied, context captured    |

**Batch 4 Stop Condition**: No data loss scenarios in concurrent operations; audit trail complete.

---

## Batch 5 — Performance and Scalability

| ID     | Severity | Description             | Files to Change                         | Agent                               | Fix Strategy                                     | Required Tests                           | Definition of Done                               |
| ------ | -------- | ----------------------- | --------------------------------------- | ----------------------------------- | ------------------------------------------------ | ---------------------------------------- | ------------------------------------------------ |
| REM-15 | Medium   | Stream large exports    | `src/app/api/export/workspace/route.ts` | backend-engineer                    | Use TransformStream for chunked CSV              | Load test: export 50k rows without OOM   | Memory stays bounded during export               |
| REM-16 | Medium   | Add Redis caching layer | New `src/lib/cache.ts`                  | system-architect + backend-engineer | Implement cache-aside pattern for hot queries    | Cache hit tests, invalidation tests      | Measurable latency improvement on repeat queries |
| REM-17 | Low      | Add Suspense boundaries | Dashboard, detail pages                 | frontend-engineer                   | Wrap sections in Suspense with loading fallbacks | Visual test: sections load independently | No layout shift, progressive loading             |

**Batch 5 Stop Condition**: Export handles large data; cache reduces DB load.

---

## Batch 6 — Reliability and Error Handling

| ID     | Severity | Description                      | Files to Change                 | Agent            | Fix Strategy                                                | Required Tests                                  | Definition of Done                  |
| ------ | -------- | -------------------------------- | ------------------------------- | ---------------- | ----------------------------------------------------------- | ----------------------------------------------- | ----------------------------------- |
| REM-18 | Medium   | Add graceful shutdown handler    | `src/lib/db.ts` or server entry | backend-engineer | Handle SIGTERM: stop accepting, drain in-flight, then exit  | Load test during shutdown: no 502s              | Zero dropped requests during deploy |
| REM-19 | Medium   | Add duplicate comment prevention | `src/lib/actions/work-items.ts` | backend-engineer | Client debounce + server-side content+timestamp dedup check | E2E: rapid double-submit creates single comment | No duplicates possible              |

**Batch 6 Stop Condition**: Graceful shutdown verified, duplicate prevention active.

---

## Batch 7 — Test Coverage Expansion

| ID     | Severity | Description                                 | Files to Change                         | Agent                                | Fix Strategy                                                         | Required Tests                                 | Definition of Done                     |
| ------ | -------- | ------------------------------------------- | --------------------------------------- | ------------------------------------ | -------------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------- |
| REM-20 | High     | Expand accessibility tests to all 23 routes | `e2e/accessibility.spec.ts`             | accessibility-reviewer + qa-engineer | Add remaining 15 routes to axe-core coverage                         | All routes pass axe with no serious violations | 23/23 routes tested                    |
| REM-21 | Medium   | Add component tests                         | `src/components/__tests__/` (new files) | qa-engineer + frontend-engineer      | Test critical interactive components (Board, WorkItemForm, Settings) | 20+ component tests                            | Coverage threshold maintained/improved |
| REM-22 | Medium   | Add security scanning to CI                 | `.github/workflows/ci.yml`              | security-reviewer                    | Add CodeQL or Snyk step                                              | CI fails on high-severity findings             | Security gate in CI                    |

**Batch 7 Stop Condition**: Full accessibility coverage, component tests, security scanning active.

---

## Batch 8 — Accessibility and Usability

| ID     | Severity | Description                       | Files to Change             | Agent                                      | Fix Strategy                                        | Required Tests                | Definition of Done            |
| ------ | -------- | --------------------------------- | --------------------------- | ------------------------------------------ | --------------------------------------------------- | ----------------------------- | ----------------------------- |
| REM-23 | Medium   | Add aria-expanded to collapsibles | Various components          | accessibility-reviewer                     | Audit all toggle elements, add ARIA state           | Axe passes on affected routes | No ARIA violations            |
| REM-24 | Medium   | Add chart accessibility           | `src/components/charts.tsx` | accessibility-reviewer + frontend-engineer | Add aria-label, description, data table alternative | Screen reader test            | Charts have text alternatives |

**Batch 8 Stop Condition**: WCAG 2.1 AA compliance across all routes.

---

## Batch 9 — Deployability and CI/CD

| ID     | Severity | Description                     | Files to Change            | Agent            | Fix Strategy                                   | Required Tests              | Definition of Done                  |
| ------ | -------- | ------------------------------- | -------------------------- | ---------------- | ---------------------------------------------- | --------------------------- | ----------------------------------- |
| REM-25 | High     | Align Node version (CI:20 → 22) | `.github/workflows/ci.yml` | system-architect | Update `node-version: "22"` in both jobs       | CI passes on Node 22        | CI and Docker use same Node version |
| REM-26 | Medium   | Add Docker build to CI          | `.github/workflows/ci.yml` | system-architect | Add `docker build .` step after E2E            | Docker build succeeds in CI | Image builds reliably               |
| REM-27 | Medium   | Complete .env.example           | `.env.example`             | backend-engineer | Add all production env vars with documentation | Startup validation test     | All vars documented                 |

**Batch 9 Stop Condition**: CI matches production runtime, Docker builds in CI.

---

## Batch 10 — Observability and Operability

| ID     | Severity | Description                 | Files to Change                                              | Agent                             | Fix Strategy                                                         | Required Tests                                 | Definition of Done             |
| ------ | -------- | --------------------------- | ------------------------------------------------------------ | --------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------ |
| REM-28 | High     | Add Sentry error tracking   | `package.json`, `src/app/global-error.tsx`, `next.config.ts` | system-architect                  | Install @sentry/nextjs, configure DSN                                | Errors appear in Sentry dashboard              | Production errors tracked      |
| REM-29 | Medium   | Add Prometheus metrics      | `src/app/api/metrics/route.ts` (new)                         | backend-engineer                  | Install prom-client, expose request/latency/error metrics            | `/api/metrics` returns valid Prometheus format | Grafana can scrape metrics     |
| REM-30 | Medium   | Create operational runbooks | `docs/runbooks/` (new)                                       | final-reviewer                    | Document: incident response, backup restore, DB migration, rollback  | Runbook covers all critical ops                | Team reviewed and approved     |
| REM-31 | Medium   | Define SLOs                 | `docs/SLOs.md` (new)                                         | system-architect + final-reviewer | Define latency (p99<500ms), availability (99.9%), error rate (<0.1%) | SLO dashboard configured                       | SLOs documented and measurable |

**Batch 10 Stop Condition**: Errors tracked, metrics exposed, runbooks exist, SLOs defined.

---

## Batch 11 — Documentation and Traceability

| ID     | Severity | Description                   | Files to Change                                                    | Agent             | Fix Strategy                                             | Required Tests       | Definition of Done                |
| ------ | -------- | ----------------------------- | ------------------------------------------------------------------ | ----------------- | -------------------------------------------------------- | -------------------- | --------------------------------- |
| REM-32 | Medium   | Update TESTING.md test counts | `docs/TESTING.md`                                                  | final-reviewer    | Update line 75 to reflect current counts                 | `npm run check:docs` | Counts match reality              |
| REM-33 | Low      | Add JSDoc to server actions   | `src/lib/actions/*.ts`                                             | backend-engineer  | Add function-level documentation                         | Lint rule (optional) | All exported functions documented |
| REM-34 | Low      | Split large page components   | `src/app/(app)/projects/[id]/page.tsx`, `work-items/[id]/page.tsx` | frontend-engineer | Extract sub-components (ProjectHeader, ItemDetail, etc.) | Existing tests pass  | Files under 250 lines             |

**Batch 11 Stop Condition**: All docs accurate, code well-documented.

---

## Execution Order

```
Batch 1 (Critical) ──→ Batch 2 (Security) ──→ Batch 3 (Features)
                                                      │
Batch 4 (Data) ────────────────────────────────────────┘
    │
    ├──→ Batch 5 (Performance)
    ├──→ Batch 6 (Reliability)
    └──→ Batch 7 (Testing) ──→ Batch 8 (A11y)
                                    │
Batch 9 (CI/CD) ────────────────────┘
    │
    └──→ Batch 10 (Ops) ──→ Batch 11 (Docs)
```

**Estimated Total Items**: 34 remediation items across 11 batches.
